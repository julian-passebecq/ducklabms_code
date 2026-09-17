export type Difficulty = 'Foundation' | 'Intermediate' | 'Advanced'
export type Layer = 'Explore' | 'Bronze' | 'Silver' | 'Gold' | 'Spark' | 'Lakehouse' | 'dbt' | 'Airflow' | 'Incident'

export type Mission = {
  id: string
  number: string
  layer: Layer
  title: string
  subtitle: string
  difficulty: Difficulty
  minutes: number
}

export type SparkProfile = {
  inputRows: string
  inputBytes: string
  partitions: number
  medianPartitionMb: number
  largestPartitionMb: number
  skewRatio: number
  shuffleGb: number
  baselineShuffleGb?: number
  outputRows: string
  broadcastCandidate?: string
  broadcastMb?: number
  stages: Array<{ id: number; title: string; detail: string; tasks: number; tone?: 'ok' | 'warn' | 'bad' }>
}

export type CaseStudy = {
  id: 'mobility' | 'retail' | 'energy' | 'finance'
  shortName: string
  name: string
  dataset: string
  description: string
  source: string
  format: 'Parquet'
  lake: string
  snapshot: number
  rows: string
  files: string
  size: string
  businessKpis: Array<[string, string]>
  sparkFocus: string[]
  missions: Mission[]
  spark: SparkProfile
}

const mobilityMissions: Mission[] = [
  { id:'grain', number:'01', layer:'Explore', title:'Discover the grain', subtitle:'Profile an unfamiliar Parquet batch', difficulty:'Foundation', minutes:20 },
  { id:'bronze', number:'02', layer:'Bronze', title:'Build immutable Bronze', subtitle:'Preserve source rows and ingestion metadata', difficulty:'Foundation', minutes:30 },
  { id:'dedupe', number:'03', layer:'Silver', title:'Duplicate ingestion', subtitle:'Repair a retry without mutating Bronze', difficulty:'Intermediate', minutes:35 },
  { id:'window', number:'04', layer:'Spark', title:'Window deduplication', subtitle:'Translate ROW_NUMBER logic into PySpark', difficulty:'Intermediate', minutes:35 },
  { id:'late', number:'05', layer:'Silver', title:'Late-arriving trips', subtitle:'Reprocess affected event-time partitions', difficulty:'Advanced', minutes:45 },
  { id:'small-files', number:'06', layer:'Spark', title:'Small-file problem', subtitle:'Reason about repartition vs coalesce before write', difficulty:'Advanced', minutes:45 },
  { id:'gold', number:'07', layer:'dbt', title:'Build mobility Gold', subtitle:'Facts, dimensions and daily operations KPIs', difficulty:'Intermediate', minutes:45 },
  { id:'retry', number:'08', layer:'Airflow', title:'Retry-safe pipeline', subtitle:'Make the daily DAG idempotent', difficulty:'Advanced', minutes:45 },
  { id:'incident', number:'09', layer:'Incident', title:'Revenue dropped 50%', subtitle:'Trace KPI → Gold → Silver → missing source batch', difficulty:'Advanced', minutes:55 },
]

const retailMissions: Mission[] = [
  { id:'profile', number:'01', layer:'Explore', title:'Profile order Parquet', subtitle:'Find grain, keys, nulls and cardinality', difficulty:'Foundation', minutes:25 },
  { id:'bronze', number:'02', layer:'Bronze', title:'Land daily orders', subtitle:'Batch id + source filename + loaded_at', difficulty:'Foundation', minutes:30 },
  { id:'join', number:'03', layer:'Spark', title:'Large fact / small dimension join', subtitle:'Detect a broadcast opportunity', difficulty:'Intermediate', minutes:40 },
  { id:'skew', number:'04', layer:'Spark', title:'Customer-key skew', subtitle:'One corporate account dominates a partition', difficulty:'Advanced', minutes:50 },
  { id:'scd2', number:'05', layer:'Gold', title:'Customer SCD Type 2', subtitle:'Maintain historical segment changes', difficulty:'Advanced', minutes:55 },
  { id:'merge', number:'06', layer:'Lakehouse', title:'Transactional MERGE', subtitle:'Apply corrections and preserve snapshots', difficulty:'Advanced', minutes:45 },
  { id:'contract', number:'07', layer:'Incident', title:'Gold contract breaks', subtitle:'Consumer expects DECIMAL but receives VARCHAR', difficulty:'Advanced', minutes:45 },
]

const energyMissions: Mission[] = [
  { id:'profile', number:'01', layer:'Explore', title:'Profile turbine telemetry', subtitle:'Sensor grain, distributions and invalid readings', difficulty:'Foundation', minutes:25 },
  { id:'polars', number:'02', layer:'Spark', title:'Polars execution path', subtitle:'Run DataFrame-style transforms on real Parquet', difficulty:'Intermediate', minutes:35 },
  { id:'broadcast', number:'03', layer:'Spark', title:'Broadcast sensor dimension', subtitle:'Avoid a needless large shuffle', difficulty:'Intermediate', minutes:40 },
  { id:'rolling', number:'04', layer:'Spark', title:'Rolling window metrics', subtitle:'Understand partition + sort requirements', difficulty:'Advanced', minutes:45 },
  { id:'late', number:'05', layer:'Silver', title:'Late telemetry', subtitle:'Correct hourly aggregates by event time', difficulty:'Advanced', minutes:45 },
  { id:'perf', number:'06', layer:'Incident', title:'Cut scanned bytes', subtitle:'Projection, filters and Parquet pruning', difficulty:'Advanced', minutes:45 },
]

const financeMissions: Mission[] = [
  { id:'grain', number:'01', layer:'Explore', title:'Transaction grain', subtitle:'Account, booking date, value date and sequence', difficulty:'Foundation', minutes:25 },
  { id:'bronze', number:'02', layer:'Bronze', title:'Immutable ledger landing', subtitle:'Preserve source ordering and lineage', difficulty:'Intermediate', minutes:35 },
  { id:'window', number:'03', layer:'Spark', title:'Account balance window', subtitle:'lag, running sum and ordered partitions', difficulty:'Intermediate', minutes:40 },
  { id:'shuffle', number:'04', layer:'Spark', title:'Wide aggregation', subtitle:'See where exchange boundaries appear', difficulty:'Advanced', minutes:45 },
  { id:'backfill', number:'05', layer:'Airflow', title:'Two-day backfill', subtitle:'Repair only impacted booking-date partitions', difficulty:'Advanced', minutes:45 },
  { id:'recovery', number:'06', layer:'Lakehouse', title:'Snapshot recovery', subtitle:'Compare pre/post correction state', difficulty:'Advanced', minutes:40 },
]

export const cases: CaseStudy[] = [
  {
    id:'mobility', shortName:'Mobility', name:'NYC Mobility Lakehouse', dataset:'Taxi trips · September 2026',
    description:'Batch mobility engineering: medallion transformations, late data, notebook windows and production incident recovery.',
    source:'Public trip Parquet on HTTP/object storage', format:'Parquet', lake:'ducklake_mobility', snapshot:183, rows:'15.71M', files:'41', size:'1.82 GB',
    businessKpis:[['Revenue','$8.31M'],['Trips','479.6K'],['Avg fare','$17.33'],['Freshness','22 min']],
    sparkFocus:['window dedupe','repartition/coalesce','late partitions','small files'], missions:mobilityMissions,
    spark:{inputRows:'15,709,991',inputBytes:'1.82 GB',partitions:41,medianPartitionMb:43,largestPartitionMb:118,skewRatio:2.74,shuffleGb:1.82,outputRows:'15,392,441',stages:[
      {id:1,title:'Parquet scan + filter',detail:'Column pruning: 11/19 columns',tasks:41,tone:'ok'},
      {id:2,title:'Exchange by trip_id',detail:'Window dedupe requires repartition',tasks:41,tone:'warn'},
      {id:3,title:'Sort + ROW_NUMBER',detail:'Keep latest ingestion record',tasks:41,tone:'ok'}
    ]}
  },
  {
    id:'retail', shortName:'Retail', name:'Contoso Retail Orders', dataset:'Orders + customers · 90 days',
    description:'Large fact + dimensions with intentionally skewed customer keys, SCD2 history and realistic join optimization exercises.',
    source:'Generated business Parquet batches', format:'Parquet', lake:'ducklake_retail', snapshot:72, rows:'184.2M', files:'286', size:'26.4 GB',
    businessKpis:[['Revenue','$42.8M'],['Orders','2.31M'],['AOV','$18.53'],['Freshness','31 min']],
    sparkFocus:['broadcast join','data skew','salting','SCD2'], missions:retailMissions,
    spark:{inputRows:'184,229,821',inputBytes:'26.4 GB',partitions:200,medianPartitionMb:91,largestPartitionMb:1656,skewRatio:18.2,shuffleGb:26.4,baselineShuffleGb:52.96,outputRows:'3,128,114',broadcastCandidate:'dim_customer_segment',broadcastMb:6.4,stages:[
      {id:1,title:'Orders scan',detail:'286 Parquet files',tasks:286,tone:'ok'},
      {id:2,title:'Exchange customer_id',detail:'18.2× skew from corporate account',tasks:200,tone:'bad'},
      {id:3,title:'SortMergeJoin',detail:'Dimension can be broadcast instead',tasks:200,tone:'warn'},
      {id:4,title:'HashAggregate',detail:'Customer revenue + order count',tasks:200,tone:'ok'}
    ]}
  },
  {
    id:'energy', shortName:'Energy', name:'Energy Telemetry Lab', dataset:'Turbine telemetry · 30 days',
    description:'High-volume sensor data for DataFrame practice, broadcast joins, rolling windows, late events and Parquet scan optimization.',
    source:'Telemetry Parquet + small sensor dimension', format:'Parquet', lake:'ducklake_energy', snapshot:116, rows:'92.4M', files:'214', size:'14.2 GB',
    businessKpis:[['Avg output','68.4 MW'],['Availability','97.2%'],['Fault rate','2.1%'],['Freshness','11 min']],
    sparkFocus:['Polars execution','broadcast join','rolling windows','partition pruning'], missions:energyMissions,
    spark:{inputRows:'92,401,184',inputBytes:'14.2 GB',partitions:128,medianPartitionMb:108,largestPartitionMb:186,skewRatio:1.72,shuffleGb:14.2,outputRows:'92,399,012',broadcastCandidate:'dim_sensor',broadcastMb:3.1,stages:[
      {id:1,title:'Telemetry scan',detail:'Predicate pushdown on event_date',tasks:214,tone:'ok'},
      {id:2,title:'Broadcast dim_sensor',detail:'3.1 MB replicated; no fact shuffle',tasks:128,tone:'ok'},
      {id:3,title:'Exchange turbine_id',detail:'Required for ordered rolling window',tasks:128,tone:'warn'},
      {id:4,title:'Window + hourly aggregate',detail:'Sort within turbine partitions',tasks:128,tone:'ok'}
    ]}
  },
  {
    id:'finance', shortName:'Finance', name:'Financial Transactions Lab', dataset:'Account transactions · 12 months',
    description:'Ordered financial events for window functions, wide aggregations, backfills and snapshot-based correction workflows.',
    source:'Partitioned transaction Parquet', format:'Parquet', lake:'ducklake_finance', snapshot:44, rows:'61.84M', files:'365', size:'9.7 GB',
    businessKpis:[['Net flow','$12.4M'],['Transactions','6.1M'],['Exceptions','0.18%'],['Freshness','19 min']],
    sparkFocus:['ordered windows','wide aggregation','backfill','snapshot recovery'], missions:financeMissions,
    spark:{inputRows:'61,840,000',inputBytes:'9.7 GB',partitions:365,medianPartitionMb:41,largestPartitionMb:278,skewRatio:6.78,shuffleGb:9.7,outputRows:'8,431,992',stages:[
      {id:1,title:'Transaction scan',detail:'Partition pruning by booking_date',tasks:365,tone:'ok'},
      {id:2,title:'Exchange account_id',detail:'Window partition boundary',tasks:365,tone:'warn'},
      {id:3,title:'Sort transaction_ts',detail:'lag + running balance',tasks:365,tone:'ok'},
      {id:4,title:'Aggregate account/day',detail:'Gold daily ledger metrics',tasks:365,tone:'ok'}
    ]}
  }
]

export const tabs = ['Overview','Notebook','Spark Lab','Pipeline','dbt','Lakehouse','Quality','Consumer','Advanced'] as const
export type Tab = typeof tabs[number]
