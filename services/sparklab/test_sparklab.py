from pathlib import Path
from services.sparklab.sparklab import SparkSession, Window, functions as F

root = Path(__file__).parent
profiles = root / 'profiles.json'

# Retail: broadcast + aggregate, SQL must preserve filter and join.
spark = SparkSession.from_profile(profiles, 'retail')
orders = spark.table('silver.orders')
segments = spark.table('silver.dim_customer_segment')
q = (orders.filter(F.col('net_amount') > 0)
     .join(F.broadcast(segments), 'segment_id')
     .groupBy('customer_id')
     .agg(F.sum('net_amount').alias('revenue')))
assert 'GROUP BY "customer_id"' in q.sql
assert 'INNER JOIN' in q.sql
assert '("net_amount" > 0)' in q.sql
plan = q.explain_training()
assert plan['skew_ratio'] == 18.2
assert any(x['op'] == 'broadcast_hash_join' for x in plan['stages'])
assert plan['estimated_shuffle_gb'] == 26.4
assert plan['spill_risk'] == 'medium'

# Mobility: window expression + drop compiles to real SQL.
spark = SparkSession.from_profile(profiles, 'mobility')
w = Window.partitionBy('trip_id').orderBy(F.col('loaded_at').desc())
clean = (spark.table('bronze.trips')
         .filter(F.col('trip_date') == '2026-09-17')
         .withColumn('rn', F.row_number().over(w))
         .filter(F.col('rn') == 1)
         .drop('rn'))
assert 'ROW_NUMBER() OVER (PARTITION BY "trip_id" ORDER BY "loaded_at" DESC)' in clean.sql
assert '"rn"' not in clean.sql.split(' FROM ', 1)[0]

# Energy: rolling window and broadcast both compile.
spark = SparkSession.from_profile(profiles, 'energy')
w = Window.partitionBy('turbine_id').orderBy('event_ts').rowsBetween(-59, 0)
energy = (spark.table('silver.telemetry')
          .join(F.broadcast(spark.table('silver.dim_sensor')), 'sensor_id')
          .withColumn('rolling_power', F.avg('power_mw').over(w)))
assert 'ROWS BETWEEN 59 PRECEDING AND CURRENT ROW' in energy.sql
assert any(x['op'] == 'broadcast_hash_join' for x in energy.explain_training()['stages'])

# Finance: lag/running window API used by the UI is supported.
spark = SparkSession.from_profile(profiles, 'finance')
w = Window.partitionBy('account_id').orderBy('transaction_ts')
finance = (spark.table('silver.transactions')
           .withColumn('previous_amount', F.lag('amount').over(w))
           .withColumn('running_net', F.sum('amount').over(w)))
assert 'LAG("amount", 1) OVER' in finance.sql
assert 'SUM("amount") OVER' in finance.sql

# Relational semantics: repartition/coalesce change training estimate, not SQL result.
spark = SparkSession.from_profile(profiles, 'retail')
base = spark.table('silver.orders')
partitioned = base.repartition(400, 'customer_id').coalesce(100)
assert partitioned.sql == base.sql
assert partitioned.explain_training()['partitions'] == 100

# Dedupe compiles rather than being silently ignored.
deduped = base.dropDuplicates(['customer_id'])
assert 'ROW_NUMBER() OVER (PARTITION BY "customer_id")' in deduped.sql
assert '__sparklab_rn = 1' in deduped.sql

print('SparkLab tests: PASS (compiler + windows + estimates)')

# PySpark fidelity: no-argument dropDuplicates() is valid and means whole-row distinct.
spark = SparkSession.from_profile(profiles, 'retail')
whole_row_dedupe = spark.table('silver.orders').dropDuplicates()
assert 'SELECT DISTINCT *' in whole_row_dedupe.sql

# PySpark fidelity: replacing an existing column must not duplicate its name.
replaced = spark.table('silver.orders').withColumn('net_amount', F.col('net_amount') * 2)
assert replaced.sql.count('AS "net_amount"') == 1
assert replaced.current_columns().count('net_amount') == 1

# USING-style string-key joins expose one key plus non-key right-side columns.
joined = spark.table('silver.orders').join(spark.table('silver.dim_customer_segment'), 'segment_id')
assert 'r."segment_id"' not in joined.sql
assert 'r."segment_name"' in joined.sql
assert joined.current_columns().count('segment_id') == 1
