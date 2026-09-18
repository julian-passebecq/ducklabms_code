"""Optional external PySpark oracle. Runs trusted checked-in developer fixtures.

Requires an externally installed PySpark/JVM; never invoked by the application.
Usage: python scripts/sparklab-oracle.py --fixtures services/sparklab/oracle.json
"""
import argparse
import json
from pathlib import Path
import sys
import tempfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from apps.api.datapass.execution import Engine, compare_rows


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--fixtures', type=Path, default=Path('services/sparklab/oracle.json'))
    args = parser.parse_args()
    try:
        from pyspark.sql import SparkSession, functions as F, Window
    except ImportError:
        print('DEFERRED TO EXTERNAL QA: install PySpark and a compatible JVM externally.')
        return 2
    fixtures = json.loads(args.fixtures.read_text())
    spark = SparkSession.builder.master('local[1]').appName('Datapass semantic oracle').getOrCreate()
    failures = []
    try:
        with tempfile.TemporaryDirectory() as temp:
            engine = Engine(Path(temp), mode='duckdb')
            for fixture in fixtures['fixtures']:
                for name, table in fixture['tables'].items():
                    spark.createDataFrame([tuple(row.values()) for row in table['rows']], table['spark_schema']).createOrReplaceTempView(name)
                    engine.catalog.publish_rows('silver.'+name, table['rows'], 'oracle', [])
                source = fixture['source']
                env = {'spark':spark, 'F':F, 'Window':Window}
                # Developer-authored fixture source only. This is not the safe application parser.
                exec(source, env, env)
                frame = env['result']
                if len(frame.columns) != len(set(frame.columns)):
                    raise ValueError('Oracle fixture needs explicit aliases for duplicate columns')
                expected = [row.asDict() for row in frame.collect()]
                local_source = source
                for name in fixture['tables']:
                    local_source = local_source.replace(f'spark.table("{name}")', f'spark.table("silver.{name}")')
                run = engine.execute(dict(notebook_id='oracle',cell_id=fixture['id'],language='sparklab',code=local_source))
                actual = run.get('result', {})
                matched = run['status']=='success' and not actual.get('truncated') and actual.get('columns')==frame.columns and compare_rows(actual.get('rows',[]), expected)
                if fixture.get('ordered'):
                    matched = matched and all(compare_rows([a],[b]) for a,b in zip(actual.get('rows',[]),expected))
                print(f"{fixture['id']}: {'PASS' if matched else 'FAIL'}")
                if not matched: failures.append(fixture['id'])
            engine.catalog.db.close()
    finally:
        spark.stop()
    return 1 if failures else 0


if __name__ == '__main__':
    raise SystemExit(main())
