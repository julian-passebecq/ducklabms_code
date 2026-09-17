import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { cases, type CaseStudy, type Mission } from './data'
import { runtimePreview } from './runtimePreview'
import { getRuntimeCapabilities, getRuntimeHealth, runPySparkNotebook, runSqlNotebook, type NotebookRunResponse, type RuntimeCapabilities } from './api'
import './styles.css'

type RuntimeMode = 'PySpark Training' | 'SQL (DuckDB)' | 'Polars' | 'MotherDuck SQL'
type ClusterProfile = 'Fabric-like F64' | 'Databricks-like Jobs' | 'Local 8x8'
type WorkbenchView = 'Notebook' | 'Overview' | 'Pipeline' | 'Lakehouse' | 'Spark UI' | 'Consumer' | 'Missions'
type InspectorTab = 'Spark UI' | 'Compare' | 'Lakehouse' | 'Quality' | 'Cost' | 'Hints'
type ExplorerTab = 'Data items' | 'Resources'
type OutputTab = 'Result' | 'Plan' | 'Grade'
type ExecStatus = 'idle' | 'running' | 'preview' | 'success' | 'error'
type UiStage = { id:number; name:string; tasks:number; workers:number; slots:number; duration_s:number; spill_gb:number; max_task_s:number; p50_task_s:number; max_partition_mb:number; notes:string[] }

type ExecutionState = {
  status: ExecStatus
  source?: 'backend' | 'reference'
  report?: NotebookRunResponse
  error?: string
  elapsedMs?: number
  count: number
}

const sqlByCase: Record<CaseStudy['id'], string> = {
  mobility:`-- Real SQL result path: DuckDB / MotherDuck against DuckLake\nWITH ranked AS (\n  SELECT *,\n    row_number() OVER (\n      PARTITION BY trip_id\n      ORDER BY loaded_at DESC\n    ) AS rn\n  FROM bronze.trips\n  WHERE trip_date = DATE '2026-09-17'\n)\nSELECT * EXCLUDE (rn)\nFROM ranked\nWHERE rn = 1;`,
  retail:`-- Profile the skewed customer key on real values\nSELECT\n  customer_id,\n  count(*) AS orders,\n  sum(net_amount) AS revenue\nFROM silver.orders\nWHERE net_amount > 0\nGROUP BY customer_id\nORDER BY orders DESC\nLIMIT 20;`,
  energy:`-- Real Parquet scan with partition pruning\nSELECT\n  turbine_id,\n  date_trunc('hour', event_ts) AS hour,\n  avg(power_mw) AS avg_power\nFROM silver.telemetry\nWHERE event_date = DATE '2026-09-17'\nGROUP BY ALL;`,
  finance:`-- Ordered account window on real transaction values\nSELECT\n  account_id, transaction_ts, amount,\n  lag(amount) OVER (\n    PARTITION BY account_id\n    ORDER BY transaction_ts\n  ) AS previous_amount,\n  sum(amount) OVER (\n    PARTITION BY account_id\n    ORDER BY transaction_ts\n    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\n  ) AS running_net\nFROM silver.transactions;`
}

const pyByCase: Record<CaseStudy['id'], string> = {
  mobility:`from pyspark.sql import functions as F\nfrom pyspark.sql.window import Window\n\nw = (Window\n    .partitionBy("trip_id")\n    .orderBy(F.col("loaded_at").desc()))\n\nclean = (spark.table("bronze.trips")\n    .filter(F.col("trip_date") == "2026-09-17")\n    .withColumn("rn", F.row_number().over(w))\n    .filter(F.col("rn") == 1)\n    .drop("rn"))`,
  retail:`from pyspark.sql import functions as F\n\norders = spark.table("silver.orders")\nsegments = spark.table("silver.dim_customer_segment")\n\nresult = (orders\n    .filter(F.col("net_amount") > 0)\n    .join(F.broadcast(segments), "segment_id")\n    .groupBy("customer_id")\n    .agg(\n        F.sum("net_amount").alias("revenue"),\n        F.count("*").alias("orders")\n    ))`,
  energy:`from pyspark.sql import functions as F\nfrom pyspark.sql.window import Window\n\nsensors = spark.table("silver.dim_sensor")\ntelemetry = spark.table("silver.telemetry")\n\nw = (Window\n    .partitionBy("turbine_id")\n    .orderBy("event_ts")\n    .rowsBetween(-59, 0))\n\nresult = (telemetry\n    .join(F.broadcast(sensors), "sensor_id")\n    .withColumn("rolling_power", F.avg("power_mw").over(w)))`,
  finance:`from pyspark.sql import functions as F\nfrom pyspark.sql.window import Window\n\nw = (Window\n    .partitionBy("account_id")\n    .orderBy("transaction_ts"))\n\nresult = (spark.table("silver.transactions")\n    .withColumn("previous_amount", F.lag("amount").over(w))\n    .withColumn("running_net", F.sum("amount").over(w)))`
}


const pyByMission: Partial<Record<string,string>> = {
  'retail:join':`from pyspark.sql import functions as F

orders = spark.table("silver.orders")
segments = spark.table("silver.dim_customer_segment")

# Baseline: correct result, inefficient physical plan in this truth pack.
# Diagnose the join, then decide whether an explicit broadcast is justified.
result = (orders
    .filter(F.col("net_amount") > 0)
    .join(segments, "segment_id")
    .groupBy("customer_id")
    .agg(
        F.sum("net_amount").alias("revenue"),
        F.count("*").alias("orders")
    ))`,
  'retail:skew':`from pyspark.sql import functions as F

orders = spark.table("silver.orders")

# The semantic result is simple; the learning target is the physical skew.
result = (orders
    .filter(F.col("net_amount") > 0)
    .groupBy("customer_id")
    .agg(
        F.sum("net_amount").alias("revenue"),
        F.count("*").alias("orders")
    ))`,
  'finance:window':`from pyspark.sql import functions as F
from pyspark.sql.window import Window

lag_w = (Window
    .partitionBy("account_id")
    .orderBy("transaction_ts"))

running_w = (Window
    .partitionBy("account_id")
    .orderBy("transaction_ts")
    .rowsBetween(Window.unboundedPreceding, Window.currentRow))

result = (spark.table("silver.transactions")
    .withColumn("previous_amount", F.lag("amount").over(lag_w))
    .withColumn("running_net", F.sum("amount").over(running_w)))`
}

const polarsByCase: Record<CaseStudy['id'], string> = {
  mobility:`import polars as pl\n\ntrips = pl.scan_parquet("landing/trips/*.parquet")\nclean = (\n    trips\n    .filter(pl.col("trip_date") == pl.date(2026, 9, 17))\n    .sort(["trip_id", "loaded_at"], descending=[False, True])\n    .unique(subset=["trip_id"], keep="first")\n)`,
  retail:`import polars as pl\n\norders = pl.scan_parquet("silver/orders/*.parquet")\nresult = (\n    orders\n    .filter(pl.col("net_amount") > 0)\n    .group_by("customer_id")\n    .agg(\n        pl.col("net_amount").sum().alias("revenue"),\n        pl.len().alias("orders")\n    )\n)`,
  energy:`import polars as pl\n\ntelemetry = pl.scan_parquet("silver/telemetry/event_date=2026-09-17/*.parquet")\nresult = (\n    telemetry\n    .group_by_dynamic("event_ts", every="1h", group_by="turbine_id")\n    .agg(pl.col("power_mw").mean().alias("avg_power"))\n)`,
  finance:`import polars as pl\n\ntx = pl.scan_parquet("silver/transactions/*.parquet")\nresult = (\n    tx.sort(["account_id", "transaction_ts"])\n      .with_columns(\n          pl.col("amount").shift(1).over("account_id").alias("previous_amount"),\n          pl.col("amount").cum_sum().over("account_id").alias("running_net")\n      )\n)`
}

const tableModel: Record<CaseStudy['id'], Array<{name:string; fields:Array<[string,string]>}>> = {
  mobility:[
    {name:'bronze.trips',fields:[['trip_id','string'],['pickup_datetime','timestamp'],['pickup_zone_id','int'],['fare_amount','decimal'],['loaded_at','timestamp']]},
    {name:'silver.trips',fields:[['trip_id','string'],['trip_date','date'],['pickup_zone_id','int'],['fare_amount','decimal']]},
    {name:'gold.daily_zone_metrics',fields:[['trip_date','date'],['pickup_zone_id','int'],['trips','bigint'],['revenue','decimal']]}
  ],
  retail:[
    {name:'bronze.orders',fields:[['order_id','string'],['customer_id','string'],['segment_id','int'],['net_amount','decimal'],['loaded_at','timestamp']]},
    {name:'silver.orders',fields:[['order_id','string'],['customer_id','string'],['segment_id','int'],['net_amount','decimal']]},
    {name:'silver.dim_customer_segment',fields:[['segment_id','int'],['segment_name','string']]},
    {name:'gold.customer_revenue',fields:[['customer_id','string'],['revenue','decimal'],['orders','bigint']]}
  ],
  energy:[
    {name:'bronze.telemetry',fields:[['sensor_id','string'],['turbine_id','string'],['event_ts','timestamp'],['power_mw','double'],['temperature_c','double']]},
    {name:'silver.telemetry',fields:[['sensor_id','string'],['turbine_id','string'],['event_date','date'],['event_ts','timestamp'],['power_mw','double']]},
    {name:'silver.dim_sensor',fields:[['sensor_id','string'],['sensor_type','string'],['turbine_id','string']]},
    {name:'gold.hourly_turbine',fields:[['turbine_id','string'],['hour','timestamp'],['avg_power','double']]}
  ],
  finance:[
    {name:'bronze.transactions',fields:[['transaction_id','string'],['account_id','string'],['transaction_ts','timestamp'],['amount','decimal'],['booking_date','date']]},
    {name:'silver.transactions',fields:[['transaction_id','string'],['account_id','string'],['transaction_ts','timestamp'],['amount','decimal'],['balance','decimal'],['loaded_at','timestamp']]},
    {name:'gold.daily_ledger',fields:[['account_id','string'],['booking_date','date'],['net_flow','decimal'],['transactions','bigint']]}
  ]
}

const fileModel: Record<CaseStudy['id'], string[]> = {
  mobility:['landing/trips/2026/09/17/','landing/zones/','checkpoints/'],
  retail:['landing/orders/2026/09/','landing/customer_segments/','backfills/'],
  energy:['landing/telemetry/event_date=2026-09-17/','landing/sensors/','quarantine/'],
  finance:['landing/transactions/2026/','landing/accounts/','recovery/']
}

const sampleRows: Record<CaseStudy['id'], Array<Record<string,string>>> = {
  mobility:[
    {trip_id:'T-891204',trip_date:'2026-09-17',pickup_zone_id:'161',fare_amount:'$18.40'},
    {trip_id:'T-891205',trip_date:'2026-09-17',pickup_zone_id:'132',fare_amount:'$26.10'},
    {trip_id:'T-891206',trip_date:'2026-09-17',pickup_zone_id:'237',fare_amount:'$14.75'}
  ],
  retail:[
    {customer_id:'C-10482',revenue:'$42,913.18',orders:'2,384'},
    {customer_id:'C-72190',revenue:'$38,177.44',orders:'2,091'},
    {customer_id:'CORPORATE_ACCOUNT_01',revenue:'$351,020.83',orders:'33,917,521'}
  ],
  energy:[
    {turbine_id:'T-014',hour:'2026-09-17 12:00',avg_power:'71.84 MW'},
    {turbine_id:'T-021',hour:'2026-09-17 12:00',avg_power:'66.31 MW'},
    {turbine_id:'T-033',hour:'2026-09-17 12:00',avg_power:'69.92 MW'}
  ],
  finance:[
    {account_id:'A-01924',transaction_ts:'2026-09-17 09:41',previous_amount:'-125.00',running_net:'2,841.18'},
    {account_id:'A-01924',transaction_ts:'2026-09-17 10:12',previous_amount:'86.10',running_net:'2,927.28'},
    {account_id:'A-88401',transaction_ts:'2026-09-17 10:16',previous_amount:'1,250.00',running_net:'9,402.66'}
  ]
}

function runtimeCode(runtime:RuntimeMode, caseId:CaseStudy['id'], missionId?:string){
  if(runtime==='PySpark Training') return pyByMission[`${caseId}:${missionId ?? ''}`] ?? pyByCase[caseId]
  if(runtime==='Polars') return polarsByCase[caseId]
  return sqlByCase[caseId]
}

function runtimeLanguage(runtime:RuntimeMode){
  if(runtime==='PySpark Training') return 'PySpark (Python)'
  if(runtime==='Polars') return 'Python (Polars)'
  return 'SQL'
}

function runtimeTruth(runtime:RuntimeMode){
  if(runtime==='PySpark Training') return 'Relational semantics + virtual distributed Spark'
  if(runtime==='MotherDuck SQL') return 'Cloud SQL adapter when connected'
  if(runtime==='Polars') return 'Lazy DataFrame reference path'
  return 'Bounded SQL execution; DuckDB preferred with explicit fallback provenance'
}

function initialMission(caseStudy:CaseStudy){
  return caseStudy.missions.find(m=>m.layer==='Spark') ?? caseStudy.missions[0]
}

function clusterProfileId(cluster:ClusterProfile){
  if(cluster==='Fabric-like F64') return 'fabric_f64_like'
  if(cluster==='Databricks-like Jobs') return 'databricks_jobs_like'
  return 'generic_8x8'
}

function missionTargetView(m:Mission):WorkbenchView{
  if(m.layer==='Airflow') return 'Pipeline'
  if(m.layer==='Lakehouse') return 'Lakehouse'
  if(m.layer==='Incident') return 'Consumer'
  return 'Notebook'
}

function App(){
  const [caseId,setCaseId]=useState<CaseStudy['id']>('retail')
  const [missionId,setMissionId]=useState('join')
  const [runtime,setRuntime]=useState<RuntimeMode>('PySpark Training')
  const [cluster,setCluster]=useState<ClusterProfile>('Fabric-like F64')
  const [view,setView]=useState<WorkbenchView>('Notebook')
  const [inspectorTab,setInspectorTab]=useState<InspectorTab>('Spark UI')
  const [explorerTab,setExplorerTab]=useState<ExplorerTab>('Data items')
  const [saved,setSaved]=useState(true)
  const [backendOnline,setBackendOnline]=useState(false)
  const [capabilities,setCapabilities]=useState<RuntimeCapabilities|null>(null)
  const [selectedTable,setSelectedTable]=useState('silver.orders')
  const [completed,setCompleted]=useState<Record<string,string[]>>({})
  const [execution,setExecution]=useState<ExecutionState>({status:'idle',count:0})
  const runController=useRef<AbortController|null>(null)
  const activeCase=cases.find(c=>c.id===caseId)!
  const mission=activeCase.missions.find(m=>m.id===missionId) ?? initialMission(activeCase)
  const [code,setCode]=useState(runtimeCode(runtime,caseId,missionId))

  useEffect(()=>{
    const controller=new AbortController()
    const timeout=window.setTimeout(()=>controller.abort(),1600)
    Promise.all([getRuntimeHealth(controller.signal),getRuntimeCapabilities(controller.signal)])
      .then(([,caps])=>{setBackendOnline(true);setCapabilities(caps)})
      .catch(()=>{setBackendOnline(false);setCapabilities(null)})
      .finally(()=>window.clearTimeout(timeout))
    return ()=>{controller.abort();window.clearTimeout(timeout)}
  },[])

  const resetExecution=()=>{
    runController.current?.abort()
    runController.current=null
    setExecution(prev=>({status:'idle',count:prev.count}))
  }

  const changeCase=(id:CaseStudy['id'])=>{
    const c=cases.find(x=>x.id===id)!
    const next=initialMission(c)
    setCaseId(id)
    setMissionId(next.id)
    setCode(runtimeCode(runtime,id,next.id))
    setSelectedTable(tableModel[id][1]?.name ?? tableModel[id][0].name)
    resetExecution()
    setSaved(true)
  }

  const changeRuntime=(next:RuntimeMode)=>{
    setRuntime(next)
    setCode(runtimeCode(next,caseId,missionId))
    if(next==='PySpark Training') setInspectorTab('Spark UI')
    else if(next==='SQL (DuckDB)'||next==='MotherDuck SQL') setInspectorTab('Lakehouse')
    else setInspectorTab('Hints')
    resetExecution()
    setSaved(true)
  }

  const selectMission=(m:Mission)=>{
    setMissionId(m.id)
    setView(missionTargetView(m))
    setCode(runtimeCode(runtime,caseId,m.id))
    if(m.layer==='Spark') setInspectorTab('Spark UI')
    else if(m.layer==='Incident') setInspectorTab('Quality')
    else if(m.layer==='Lakehouse') setInspectorTab('Lakehouse')
    else setInspectorTab('Hints')
    resetExecution()
    setSaved(true)
  }

  const markCompleted=(m:Mission)=>{
    setCompleted(prev=>{
      const existing=prev[caseId] ?? []
      if(existing.includes(m.id)) return prev
      return {...prev,[caseId]:[...existing,m.id]}
    })
  }

  const run=async()=>{
    const started=performance.now()
    runController.current?.abort()
    const controller=new AbortController()
    runController.current=controller
    setExecution(prev=>({status:'running',count:prev.count}))
    setSaved(true)
    if(runtime==='PySpark Training') setInspectorTab('Spark UI')

    if(runtime==='Polars'||runtime==='MotherDuck SQL'){
      window.setTimeout(()=>{
        if(controller.signal.aborted) return
        setExecution(prev=>({status:'preview',source:'reference',elapsedMs:Math.round(performance.now()-started),count:prev.count+1}))
        runController.current=null
      },180)
      return
    }

    try{
      const report=runtime==='SQL (DuckDB)'
        ? await runSqlNotebook({sql:code,caseId,signal:controller.signal})
        : await runPySparkNotebook({code,caseId,missionId:mission.id,clusterProfile:clusterProfileId(cluster),signal:controller.signal})
      if(controller.signal.aborted) return
      setBackendOnline(true)
      const calibrated=report.status==='succeeded' && !!report.simulation
      const semanticExecuted=report.semantic_execution?.status==='executed'
      setExecution(prev=>({status:calibrated||semanticExecuted?'success':'preview',source:'backend',report,elapsedMs:Math.round(performance.now()-started),count:prev.count+1}))
      if(report.grade?.pass) markCompleted(mission)
    }catch(err){
      if(controller.signal.aborted){
        setExecution(prev=>({status:'idle',count:prev.count}))
        return
      }
      const message=err instanceof Error?err.message:'Unknown SparkLab error'
      const network=/fetch|network|failed to fetch/i.test(message)
      if(network){
        setBackendOnline(false)
        setExecution(prev=>({status:'preview',source:'reference',elapsedMs:Math.round(performance.now()-started),count:prev.count+1}))
      }else{
        setExecution(prev=>({status:'error',error:message,elapsedMs:Math.round(performance.now()-started),count:prev.count+1}))
      }
    }finally{
      if(runController.current===controller) runController.current=null
    }
  }

  const stopRun=()=>{
    runController.current?.abort()
    runController.current=null
    setExecution(prev=>({status:'idle',count:prev.count}))
  }

  const changeCluster=(next:ClusterProfile)=>{
    setCluster(next)
    resetExecution()
  }

  return <div className="fabric-shell">
    <TopHeader saved={saved} mission={mission} backendOnline={backendOnline}/>
    <Ribbon runtime={runtime} setRuntime={changeRuntime} cluster={cluster} setCluster={changeCluster} activeCase={activeCase} run={run} stopRun={stopRun} execution={execution} capabilities={capabilities}/>
    <div className="workbench">
      <GlobalRail view={view} setView={setView}/>
      <Explorer activeCase={activeCase} caseId={caseId} changeCase={changeCase} tab={explorerTab} setTab={setExplorerTab} mission={mission} selectMission={selectMission} completed={completed[caseId] ?? []} selectedTable={selectedTable} setSelectedTable={(name)=>{setSelectedTable(name);setInspectorTab('Lakehouse')}}/>
      <main className="workspace-main">
        {view==='Notebook'&&<NotebookCanvas activeCase={activeCase} mission={mission} runtime={runtime} cluster={cluster} code={code} setCode={(v)=>{setCode(v);setSaved(false);resetExecution()}} execution={execution} run={run}/>} 
        {view==='Overview'&&<Overview activeCase={activeCase}/>} 
        {view==='Pipeline'&&<Pipeline activeCase={activeCase}/>} 
        {view==='Lakehouse'&&<Lakehouse activeCase={activeCase} ran={execution.status==='success'&&execution.source==='backend'&&!!execution.report?.grade?.pass}/>} 
        {view==='Spark UI'&&<SparkWorkspace activeCase={activeCase} mission={mission} cluster={cluster} execution={execution}/>} 
        {view==='Consumer'&&<Consumer activeCase={activeCase} ran={execution.status==='success'&&execution.source==='backend'&&!!execution.report?.grade?.pass}/>} 
        {view==='Missions'&&<MissionWorkspace activeCase={activeCase} mission={mission} selectMission={selectMission} completed={completed[caseId] ?? []}/>} 
      </main>
      <aside className="diagnostic-panel">
        <Inspector activeCase={activeCase} mission={mission} runtime={runtime} cluster={cluster} execution={execution} tab={inspectorTab} setTab={setInspectorTab} selectedTable={selectedTable}/>
      </aside>
    </div>
    <StatusBar activeCase={activeCase} runtime={runtime} cluster={cluster} execution={execution} backendOnline={backendOnline} capabilities={capabilities}/>
  </div>
}

function TopHeader({saved,mission,backendOnline}:{saved:boolean;mission:Mission;backendOnline:boolean}){
  return <header className="app-header">
    <button className="waffle" aria-label="App launcher"><span/><span/><span/><span/><span/><span/><span/><span/><span/></button>
    <div className="product-wordmark">ducklake</div>
    <div className="header-divider"/>
    <div className="notebook-name">{mission.title}</div>
    <div className="save-state"><i className={saved?'saved':'dirty'}/>{saved?'Saved':'Unsaved changes'} <span>v</span></div>
    <div className="header-spacer"/>
    <div className={`runtime-health ${backendOnline?'online':'offline'}`}>{backendOnline?'SparkLab API':'Standalone fallback'}</div>
    <div className="truth-pill">TRAINING WORKBENCH</div>
    <div className="user-avatar">DE</div>
  </header>
}

function Ribbon({runtime,setRuntime,cluster,setCluster,activeCase,run,stopRun,execution,capabilities}:{runtime:RuntimeMode;setRuntime:(v:RuntimeMode)=>void;cluster:ClusterProfile;setCluster:(v:ClusterProfile)=>void;activeCase:CaseStudy;run:()=>void;stopRun:()=>void;execution:ExecutionState;capabilities:RuntimeCapabilities|null}){
  return <section className="ribbon-wrap">
    <div className="ribbon-tabs"><button className="active">Home</button><button>Edit</button><button>AI tools</button><button>Run</button><button>View</button></div>
    <div className="command-bar">
      <div className="command-group icon-only"><button title="Edit notebook">Edit</button><button title="Download">Save</button><button title="Settings">Cfg</button></div>
      <div className="command-separator"/>
      <button className="run-all" onClick={run} disabled={execution.status==='running'}><span>{execution.status==='running'?'...':'>'}</span> {execution.status==='running'?'Running':'Run all'} <b>v</b></button>
      <div className="session-state"><i className={`session-dot ${execution.status==='running'?'busy':''}`}/><div><strong>{cluster}</strong><small>{execution.status==='running'?'Executing':execution.status==='success'?(execution.report?.simulation?'Calibrated Spark':'Executed'):execution.status==='preview'?'Preview / compile':'Ready'}</small></div><span>v</span></div>
      <button className="stop-button" title="Stop current request" onClick={stopRun} disabled={execution.status!=='running'}>[]</button>
      <label className="toolbar-select runtime-select"><span>Runtime · {runtime==='SQL (DuckDB)'&&capabilities?capabilities.auto_selection==='duckdb'?'DuckDB ready':'SQLite oracle fallback':'select'}</span><select value={runtime} onChange={(e:ChangeEvent<HTMLSelectElement>)=>setRuntime(e.target.value as RuntimeMode)}><option>PySpark Training</option><option>SQL (DuckDB)</option><option>Polars</option><option>MotherDuck SQL</option></select></label>
      <label className="toolbar-select"><span>Environment</span><select value={cluster} onChange={(e:ChangeEvent<HTMLSelectElement>)=>setCluster(e.target.value as ClusterProfile)}><option>Fabric-like F64</option><option>Databricks-like Jobs</option><option>Local 8x8</option></select></label>
      <label className="toolbar-select lake-select"><span>Lakehouse</span><select value={activeCase.lake} disabled><option>{activeCase.lake}</option></select></label>
    </div>
  </section>
}

function GlobalRail({view,setView}:{view:WorkbenchView;setView:(v:WorkbenchView)=>void}){
  const entries:Array<[WorkbenchView,string,string]>=[
    ['Overview','H','Home'],['Notebook','<>','Notebook'],['Lakehouse','DB','Lakehouse'],['Pipeline','P','Pipeline'],['Spark UI','S','Spark UI'],['Consumer','BI','Consumer'],['Missions','OK','Missions']
  ]
  return <nav className="global-rail">{entries.map(([v,icon,label])=><button key={v} className={view===v?'active':''} onClick={()=>setView(v)}><span className="rail-icon">{icon}</span><small>{label}</small></button>)}<div className="rail-bottom"><button><span className="rail-icon">...</span></button></div></nav>
}

function Explorer({activeCase,caseId,changeCase,tab,setTab,mission,selectMission,completed,selectedTable,setSelectedTable}:{activeCase:CaseStudy;caseId:CaseStudy['id'];changeCase:(id:CaseStudy['id'])=>void;tab:ExplorerTab;setTab:(t:ExplorerTab)=>void;mission:Mission;selectMission:(m:Mission)=>void;completed:string[];selectedTable:string;setSelectedTable:(name:string)=>void}){
  return <aside className="explorer-panel">
    <div className="explorer-title"><strong>Explorer</strong><button>&lt;&lt;</button></div>
    <div className="explorer-tabs"><button className={tab==='Data items'?'active':''} onClick={()=>setTab('Data items')}>Data items</button><button className={tab==='Resources'?'active':''} onClick={()=>setTab('Resources')}>Resources</button></div>
    {tab==='Data items'?<>
      <div className="explorer-actions"><button>+ Add data items</button><button>Find</button></div>
      <label className="case-inline"><span>Case study</span><select value={caseId} onChange={(e:ChangeEvent<HTMLSelectElement>)=>changeCase(e.target.value as CaseStudy['id'])}>{cases.map(c=><option key={c.id} value={c.id}>{c.shortName}</option>)}</select></label>
      <div className="tree-section"><div className="tree-root"><span>v</span><b className="lake-icon">DB</b><strong>{activeCase.shortName}Lakehouse</strong><em>pin</em></div>
        <div className="tree-level"><div className="tree-folder"><span>v</span><b>[]</b><strong>Tables</strong></div>
          {tableModel[activeCase.id].map((t,i)=><details key={t.name} className={`tree-table ${selectedTable===t.name?'selected':''}`} open={i===1}><summary onClick={()=>setSelectedTable(t.name)}><span>T</span>{t.name}</summary><div className="field-list">{t.fields.map(([name,type])=><div key={name}><span className="type-icon">{type==='decimal'||type==='double'?'1.2':type==='int'||type==='bigint'?'123':'abc'}</span><span>{name}</span><em>{type}</em></div>)}</div></details>)}
          <details className="tree-files"><summary><span>[]</span>Files</summary>{fileModel[activeCase.id].map(f=><div key={f} className="file-item">- {f}</div>)}</details>
        </div>
      </div>
    </>:<div className="resource-list">
      <div className="resource-heading">CURRENT MISSION</div>
      <div className="current-mission"><b>{mission.number}</b><div><strong>{mission.title}</strong><span>{mission.subtitle}</span></div></div>
      <div className="resource-heading">MISSIONS</div>
      {activeCase.missions.map(m=><button key={m.id} className={mission.id===m.id?'active':''} onClick={()=>selectMission(m)}><b>{completed.includes(m.id)?'OK':m.number}</b><div><strong>{m.title}</strong><span>{m.layer} - {m.minutes} min</span></div></button>)}
      <div className="resource-heading">REFERENCE</div><a>Case architecture</a><a>Spark truth pack</a><a>Expected output contract</a>
    </div>}
  </aside>
}

function NotebookCanvas({activeCase,mission,runtime,cluster,code,setCode,execution,run}:{activeCase:CaseStudy;mission:Mission;runtime:RuntimeMode;cluster:ClusterProfile;code:string;setCode:(v:string)=>void;execution:ExecutionState;run:()=>void}){
  const [outputTab,setOutputTab]=useState<OutputTab>('Result')
  const report=execution.report
  const grade=report?.grade
  const plan=report?.compile
  const semantic=report?.semantic_execution
  const hasOutput=execution.status==='success'||execution.status==='preview'
  const calibrated=execution.status==='success'&&execution.source==='backend'&&!!report?.simulation
  const semanticExecuted=execution.source==='backend'&&semantic?.status==='executed'
  const semanticVerified=semanticExecuted&&semantic?.verified===true
  const semanticMismatch=semanticExecuted&&semantic?.verified===false
  const fallbackRows=sampleRows[activeCase.id]
  const resultRows=semanticExecuted?semantic.rows:fallbackRows
  const resultCols=semanticExecuted?semantic.columns:Object.keys(fallbackRows[0])
  const statusText=execution.status==='running'?'Running':execution.status==='error'?'Failed':execution.status==='success'?'Succeeded':execution.status==='preview'?'Preview':'Not run'
  const sourceText=execution.source==='backend'?(calibrated?'SparkLab calibrated':semanticExecuted?'bounded SQL execution':'backend compile only'):execution.source==='reference'?'reference fallback':'not executed'
  return <div className="notebook-canvas">
    <div className="notebook-heading"><div className="blue-rule"/><div><h1>{activeCase.shortName} Notebook</h1><p>{activeCase.dataset}</p></div><div className="heading-badges"><span>{runtime}</span><span>{cluster}</span></div></div>
    <div className="notebook-meta"><span>Mission {mission.number}</span><strong>{mission.title}</strong><i>-</i><span>{mission.difficulty}</span><i>-</i><span>{mission.minutes} min</span></div>
    <div className="notebook-cell markdown-cell"><div className="cell-gutter"><span>MD</span></div><div className="markdown-content"><span className="mission-label">MISSION</span><h2>{mission.title}</h2><p>{mission.subtitle}. Work against the known <b>{activeCase.rows}</b>-row case-study dataset. Produce the required result and inspect the physical Spark consequences separately.</p><div className="mission-contract"><div><b>Semantic target</b><span>Correct grain, schema and values</span></div><div><b>Engineering target</b><span>{activeCase.sparkFocus.slice(0,2).join(' / ')}</span></div><div><b>Truth boundary</b><span>{runtimeTruth(runtime)}</span></div></div></div></div>
    <div className={`notebook-cell code-cell ${execution.status}`}><div className="cell-gutter"><button className="cell-run" onClick={run} disabled={execution.status==='running'}>{execution.status==='running'?'...':'>'}</button><span>[{execution.count||' '}]</span></div><div className="code-content"><div className="cell-toolbar"><strong>{runtimeLanguage(runtime)}</strong><span>{statusText}</span><em>{sourceText}</em></div><textarea spellCheck={false} value={code} onChange={(e:ChangeEvent<HTMLTextAreaElement>)=>setCode(e.target.value)}/>{execution.status==='error'&&<div className="execution-error"><b>Compile/runtime error</b><span>{execution.error}</span></div>}</div></div>
    {hasOutput?<div className="cell-output"><div className="output-tabs">{(['Result','Plan','Grade'] as OutputTab[]).map(t=><button key={t} className={outputTab===t?'active':''} onClick={()=>setOutputTab(t)}>{t}</button>)}<span>{execution.elapsedMs} ms control-plane time</span></div>{outputTab==='Result'&&<>{semanticExecuted?<><div className={`result-banner ${semanticVerified?'verified':semanticMismatch?'mismatch':'preview'}`}><b>{semanticVerified?'Bounded semantic execution verified':semanticMismatch?'Bounded semantic execution differs from truth pack':'Bounded semantic execution complete'}</b><span>{semantic?.engine} executed the relational SQL over the {semantic?.dataset_scope}. {semantic?.message} The full {activeCase.rows}-row DuckLake/MotherDuck dataset was not scanned.</span></div><div className="semantic-evidence"><span>REAL EXECUTION</span><b>{semantic?.row_count} rows</b><small>{semantic?.engine} · {semantic?.elapsed_ms ?? 0} ms · {semantic?.verification_complete?'full oracle':'preview-only oracle'}</small><small>query {semantic?.query_sha256?.slice(0,10)} · full {semantic?.result_sha256?.slice(0,10) ?? 'preview-only'} · preview {semantic?.preview_sha256?.slice(0,10)}</small></div><div className="expected-output"><span>EXECUTED BOUNDED RESULT</span><div className="result-table"><div className="result-row head">{resultCols.map(c=><span key={c}>{c}</span>)}</div>{resultRows.map((r,i)=><div className="result-row" key={i}>{resultCols.map(c=><span key={c}>{String(r[c] ?? '')}</span>)}</div>)}</div></div></>:<><div className={`result-banner ${calibrated?'verified':'preview'}`}><b>{calibrated?'Compiled + calibrated Spark simulation':execution.source==='backend'?'Semantic compile only':'Reference preview only'}</b><span>{calibrated?'Spark behavior is calibrated, but this mission has no bounded executable semantic fixture yet.':execution.source==='backend'?'Your PySpark subset compiled, but this mission has no validated distributed/result truth pack yet.':'No code execution occurred. Start the FastAPI runtime for compilation and calibrated evidence.'}</span></div>{execution.source==='reference'?<div className="expected-output"><span>REFERENCE SAMPLE — NOT EXECUTED</span><div className="result-table"><div className="result-row head">{resultCols.map(c=><span key={c}>{c}</span>)}</div>{resultRows.map((r,i)=><div className="result-row" key={i}>{resultCols.map(c=><span key={c}>{String(r[c] ?? '')}</span>)}</div>)}</div></div>:<div className="result-withheld"><strong>No executed result rows shown</strong><span>This path has not executed against a bounded semantic fixture or a full DuckDB/MotherDuck dataset.</span></div>}</>}</>}{outputTab==='Plan'&&<div className="plan-output"><div><span>COMPILED TARGET</span><strong>{plan?.target ?? 'reference_only'}</strong></div><pre>{plan?.sql ?? runtimeCode(runtime,activeCase.id,mission.id)}</pre>{plan?.training_plan&&<pre className="training-plan">{JSON.stringify(plan.training_plan,null,2)}</pre>}</div>}{outputTab==='Grade'&&<GradeOutput grade={grade ?? null} runtime={runtime}/>}</div>:<div className="empty-output"><span>Run the cell to reveal semantic execution, compile evidence, calibrated Spark diagnostics and grading where available.</span></div>}
    <div className="insert-row bottom"><button>+ Code</button><button>+ Markdown</button><span>V0.12 adds live bounded SQL execution plus calibrated Retail + Finance PySpark semantics; full DuckLake/MotherDuck case-data execution remains a separate adapter.</span></div>
  </div>
}

function GradeOutput({grade,runtime}:{grade:NotebookRunResponse['grade'];runtime:RuntimeMode}){
  if(runtime!=='PySpark Training') return <div className="grade-empty"><strong>Reference path only</strong><p>Truth-pack grading is currently applied to calibrated PySpark Training missions.</p></div>
  if(!grade) return <div className="grade-empty"><strong>Compiled successfully</strong><p>This mission has no calibrated exercise grader yet. It is not marked complete.</p></div>
  return <div className="grade-output"><div className={`grade-score ${grade.pass?'pass':'fail'}`}><span>OVERALL</span><strong>{grade.overall}</strong><small>{grade.pass?'PASS':'REVIEW'}</small></div><div className="grade-breakdown">{Object.entries(grade.scores).map(([k,v])=><div key={k}><span>{k}</span><b>{v}</b><i><em style={{width:`${v}%`}}/></i></div>)}</div><div className="grade-checks"><strong>Engineering checks</strong>{Object.entries(grade.checks).map(([k,v])=><span key={k} className={v?'ok':'bad'}>{v?'PASS':'MISS'} - {k.replaceAll('_',' ')}</span>)}{grade.anti_patterns.map(x=><span className="bad" key={x}>ANTI - {x}</span>)}</div><div className="grade-feedback"><strong>Why</strong>{grade.feedback.map(x=><span key={x}>{x}</span>)}</div></div>
}

function Overview({activeCase}:{activeCase:CaseStudy}){
  return <div className="workspace-page"><div className="page-title"><span>Architecture</span><h1>DuckLake Data Engineering Lab</h1><p>One real lakehouse, several notebook runtimes, and a virtual Spark control plane. The learner practices the workflow of Fabric-style notebooks without requiring paid distributed compute.</p></div><div className="arch-row"><Arch title="Parquet case data" sub={`${activeCase.rows} rows / ${activeCase.size}`}/><Arrow/><Arch title="DuckDB / MotherDuck" sub="Real analytical execution path"/><Arrow/><Arch title="DuckLake" sub="Bronze / Silver / Gold / snapshots" strong/><Arrow/><Arch title="Notebook runtime" sub="SQL / Polars / PySpark Training"/><Arrow/><Arch title="SparkLab" sub="stages / AQE / cost" warn/></div><div className="truth-cards"><Truth title="REAL" text="Safe PySpark parsing, compiled relational SQL, bounded reference-fixture execution, case data model and known dataset statistics." tone="real"/><Truth title="MODELED" text="Virtual executors, stages, shuffle, skew, AQE, memory pressure and cost usage." tone="sim"/><Truth title="NOT CLAIMED" text="Exact Fabric/Databricks runtime, JVM GC telemetry, real network traffic or vendor invoice." tone="no"/></div><div className="case-overview-grid">{cases.map(c=><div key={c.id} className={c.id===activeCase.id?'active':''}><span>{c.shortName}</span><strong>{c.rows}</strong><small>{c.sparkFocus.join(' / ')}</small></div>)}</div></div>
}

function Pipeline({activeCase}:{activeCase:CaseStudy}){return <div className="workspace-page"><div className="page-title"><span>Pipeline</span><h1>{activeCase.shortName} orchestration</h1><p>Airflow-style orchestration coordinates source detection, idempotent ingestion, quality gates, transformation and publishing.</p></div><div className="pipeline-line">{['detect_batch','ingest_bronze','quality_gate','build_silver','dbt_gold','publish_consumer'].map((x,i)=><div key={x}><div className={i<3?'done':i===3?'active':'idle'}><span>{i<3?'OK':i===3?'RUN':'WAIT'}</span><strong>{x}</strong><small>{i===3?'current learning task':i<3?'success':'waiting'}</small></div>{i<5&&<i>-&gt;</i>}</div>)}</div><div className="three-panel"><InfoCard title="Idempotency" text="Re-running the same input cannot duplicate business rows."/><InfoCard title="Backfills" text="Recompute only the impacted business/event partitions."/><InfoCard title="Evidence" text="Pipeline run -> DuckLake snapshot -> consumer KPI."/></div></div>}

function Lakehouse({activeCase,ran}:{activeCase:CaseStudy;ran:boolean}){return <div className="workspace-page"><div className="page-title"><span>Lakehouse</span><h1>{activeCase.lake}</h1><p>Canonical Parquet-backed DuckLake state used by every notebook runtime.</p></div><div className="lake-columns"><InfoCard title="Bronze" text="Immutable source fidelity, batch id, source filename and loaded_at."/><InfoCard title="Silver" text="Typed, deduplicated, conformed and quality checked."/><InfoCard title="Gold" text="Facts, dimensions, aggregates and consumer contracts."/></div><div className="snapshot-timeline">{[activeCase.snapshot-2,activeCase.snapshot-1,activeCase.snapshot,activeCase.snapshot+1].map(n=><div className={(ran&&n===activeCase.snapshot+1)||(!ran&&n===activeCase.snapshot)?'current':''} key={n}><span>#{n}</span><strong>{n===activeCase.snapshot+1?'Notebook commit':n===activeCase.snapshot?'Baseline':'Prior snapshot'}</strong></div>)}</div></div>}

function SparkWorkspace({activeCase,mission,cluster,execution}:{activeCase:CaseStudy;mission:Mission;cluster:ClusterProfile;execution:ExecutionState}){
  return <div className="workspace-page"><div className="page-title"><span>Spark UI</span><h1>{activeCase.shortName} virtual job diagnostics</h1><p>Distributed behavior is simulated only when the selected mission has a calibrated truth pack. Otherwise this page shows pre-engineered reference evidence.</p></div><SparkPanel activeCase={activeCase} mission={mission} cluster={cluster} execution={execution}/></div>
}

function Consumer({activeCase,ran}:{activeCase:CaseStudy;ran:boolean}){return <div className="workspace-page"><div className="page-title"><span>Consumer</span><h1>Evidence KPI verification</h1><p>A thin BI layer proves that Gold is usable and makes upstream incidents visible.</p></div><div className="consumer-kpis">{activeCase.businessKpis.map(([k,v],i)=>{const anomaly=!ran&&activeCase.id==='mobility'&&i===0;return <div key={k}><span>{k}</span><strong>{anomaly?'$4.12M':v}</strong><small className={anomaly?'bad':ran?'good':'reference'}>{anomaly?'anomaly':ran?'verified Gold':'case reference'}</small></div>})}</div><div className="fake-chart"><div className="chart-axis">Gold KPI trend</div>{[34,47,43,58,66,61,79,74,88,83,94,90].map((h,i)=><i style={{height:`${h}%`}} key={i}/>)}</div></div>}

function MissionWorkspace({activeCase,mission,selectMission,completed}:{activeCase:CaseStudy;mission:Mission;selectMission:(m:Mission)=>void;completed:string[]}){return <div className="workspace-page"><div className="page-title"><span>Learning path</span><h1>{activeCase.name}</h1><p>{activeCase.description}</p></div><div className="mission-grid">{activeCase.missions.map(m=><button key={m.id} className={m.id===mission.id?'active':''} onClick={()=>selectMission(m)}><b>{completed.includes(m.id)?'DONE':m.number}</b><span>{m.layer}</span><strong>{m.title}</strong><small>{m.subtitle}</small><em>{m.difficulty} - {m.minutes} min</em></button>)}</div></div>}

function Inspector({activeCase,mission,runtime,cluster,execution,tab,setTab,selectedTable}:{activeCase:CaseStudy;mission:Mission;runtime:RuntimeMode;cluster:ClusterProfile;execution:ExecutionState;tab:InspectorTab;setTab:(v:InspectorTab)=>void;selectedTable:string}){
  return <><div className="diagnostic-tabs">{(['Spark UI','Compare','Lakehouse','Quality','Cost','Hints'] as InspectorTab[]).map(t=><button key={t} className={tab===t?'active':''} onClick={()=>setTab(t)}>{t}</button>)}</div><div className="diagnostic-scroll">{tab==='Spark UI'&&<SparkPanel activeCase={activeCase} mission={mission} cluster={cluster} execution={execution} compact/>}{tab==='Compare'&&<CompareInspector activeCase={activeCase} mission={mission} cluster={cluster} execution={execution}/>} {tab==='Lakehouse'&&<LakehouseInspector activeCase={activeCase} ran={execution.status==='success'&&execution.source==='backend'&&!!execution.report?.grade?.pass} selectedTable={selectedTable}/>} {tab==='Quality'&&<QualityInspector execution={execution}/>} {tab==='Cost'&&<CostInspector mission={mission} cluster={cluster} execution={execution}/>} {tab==='Hints'&&<Hints mission={mission} runtime={runtime}/>}</div></>
}

function referenceRun(activeCase:CaseStudy,mission:Mission,cluster:ClusterProfile){
  const runtime=runtimeForCluster(cluster)
  if(activeCase.id!=='retail'||!runtime) return null
  if(mission.id==='join') return runtime.baseline
  if(mission.id==='skew') return runtime.skew
  return null
}

function liveStages(activeCase:CaseStudy,mission:Mission,cluster:ClusterProfile,execution:ExecutionState):UiStage[]{
  if(execution.report?.simulation?.stages) return execution.report.simulation.stages.map(stage=>({id:stage.stage_id,name:stage.name,tasks:stage.tasks.length,workers:stage.workers,slots:stage.slots,duration_s:stage.duration_s,spill_gb:stage.spill_gb,max_task_s:stage.max_task_s,p50_task_s:stage.p50_task_s,max_partition_mb:stage.max_partition_mb,notes:stage.notes}))
  const reference=referenceRun(activeCase,mission,cluster)
  if(reference) return reference.stages.map(stage=>({...stage,notes:[...(stage.notes ?? [])]}))
  return activeCase.spark.stages.map(stage=>({id:stage.id,name:stage.title,tasks:stage.tasks,workers:Math.min(8,Math.max(2,Math.ceil(stage.tasks/32))),slots:Math.min(64,stage.tasks),duration_s:Number((stage.tasks/70).toFixed(2)),spill_gb:0,max_task_s:Number((activeCase.spark.skewRatio/4).toFixed(2)),p50_task_s:0.8,max_partition_mb:activeCase.spark.largestPartitionMb,notes:[`Reference model: ${stage.detail}`]}))
}

function SparkPanel({activeCase,mission,cluster,execution,compact=false}:{activeCase:CaseStudy;mission:Mission;cluster:ClusterProfile;execution:ExecutionState;compact?:boolean}){
  const stages=liveStages(activeCase,mission,cluster,execution)
  const simulation=execution.report?.simulation
  const reference=referenceRun(activeCase,mission,cluster)
  const shuffle=simulation?.shuffle_gb ?? reference?.shuffle_gb ?? activeCase.spark.shuffleGb
  const spill=simulation?.spill_gb ?? 0
  const state=execution.status==='running'?'RUNNING':execution.status==='error'?'FAILED':execution.status==='success'?'SUCCEEDED':execution.status==='preview'?(execution.source==='backend'?'COMPILED':'REFERENCE'):'NOT RUN'
  const calibrated=execution.status==='success'&&!!simulation
  const planDecision=simulation?.plan_decision
  const scanTasks=stages[0]?.tasks ?? activeCase.spark.partitions
  const finalTasks=stages.at(-1)?.tasks ?? activeCase.spark.partitions
  return <div className={`spark-panel ${compact?'compact':''}`}><div className="spark-summary-grid"><Metric label="Input" value={activeCase.spark.inputBytes}/><Metric label="Tasks" value={`${scanTasks}→${finalTasks}`}/><Metric label="Shuffle" value={`~${shuffle} GB`}/><Metric label="Skew" value={`${activeCase.spark.skewRatio}x`}/></div><div className="job-status"><div><span>{calibrated?`JOB ${execution.count}`:'REFERENCE MODEL'}</span><strong>{mission.title}</strong></div><em className={execution.status==='error'?'failed':execution.status==='preview'||execution.status==='idle'?'reference':''}>{state}</em></div><div className="stage-list">{stages.map(stage=><div key={stage.id}><b>Stage {stage.id}</b><div><strong>{stage.name}</strong><small>{stage.tasks} tasks - {stage.workers} workers - {stage.duration_s}s</small></div><span>{stage.spill_gb?`${stage.spill_gb} GB spill`:`max ${stage.max_partition_mb.toFixed(0)} MB`}</span></div>)}</div>{activeCase.id==='retail'&&mission.id==='join'&&<div className="aqe-note"><b>JOIN DECISION</b><span>{planDecision?`${String(planDecision.final_join)} - ${String(planDecision.reason)}`:'Starter code is calibrated as SortMergeJoin because catalog size statistics are withheld. Add an explicit broadcast only after inspecting the 6.4 MB dimension.'}</span></div>}{activeCase.id==='retail'&&mission.id==='skew'&&<div className="aqe-note"><b>AQE / SKEW</b><span>Median shuffle partition is 91 MB; the known 1,656 MB hot partition is an AQE skew candidate. Repartitioning by the same customer_id key does not remove the hot key.</span></div>}{activeCase.id==='finance'&&mission.id==='window'&&<div className="aqe-note"><b>ORDERED WINDOW</b><span>{planDecision?`${String(planDecision.reason)}`:'Rows must exchange by account_id and sort by transaction_ts. A hot account remains co-located; AQE cannot split one account across independent window tasks without changing lag/running-sum semantics.'}</span></div>}{spill>0&&<div className="aqe-note danger"><b>MEMORY PRESSURE</b><span>{spill.toFixed(2)} GB modeled spill. Check partition size, task concurrency and executor memory.</span></div>}<div className="spark-truth"><b>Truth level</b><span>Compiled PySpark semantics: safe parser / relational plan</span><span>Distributed metrics: {calibrated?'submitted-code simulation':'pre-engineered reference model'}</span><span>Result rows: real bounded fixture when available; full case-study dataset is not claimed</span></div></div>
}

function CompareInspector({activeCase,mission,cluster,execution}:{activeCase:CaseStudy;mission:Mission;cluster:ClusterProfile;execution:ExecutionState}){
  const runtime=runtimeForCluster(cluster)
  if(activeCase.id==='finance'&&mission.id==='window'){
    const live=execution.report?.simulation
    const finalStage=live?.stages.at(-1)
    return <div className="compare-panel"><div className="compare-head"><span>WINDOW DIAGNOSIS</span><strong>Correct semantics constrain the physical optimization</strong></div><CompareRow label="Partition key" before="none / global" after="account_id" good={!!live?.plan_decision?.window_partitioned}/><CompareRow label="Order" before="undefined" after="transaction_ts" good={!!live?.plan_decision?.window_ordered}/><CompareRow label="Shuffle" before="single global task" after={`${live?.shuffle_gb ?? 9.7} GB`}/><CompareRow label="Largest key partition" before="global dataset" after={`${finalStage?.max_partition_mb.toFixed(0) ?? 278} MB`} good={!!live}/><div className="compare-note">Unlike a skewed join, one account's ordered window cannot be split across independent tasks without changing lag/running-sum semantics. The correct optimization is partition-aware design, not fake AQE splitting.</div></div>
  }
  if(activeCase.id!=='retail'||!runtime) return <div className="compare-empty"><strong>Comparison not calibrated yet</strong><p>This case keeps reference evidence until a truth pack is validated.</p></div>
  if(mission.id==='skew'){
    const current=execution.report?.simulation ?? runtime.skew
    return <div className="compare-panel"><div className="compare-head"><span>SKEW DIAGNOSIS</span><strong>Known distribution before changing cluster size</strong></div><CompareRow label="Median" before="91 MB" after="91 MB"/><CompareRow label="Largest" before="1,656 MB" after={`${current.stages.at(-1)?.max_partition_mb.toFixed(0) ?? 'n/a'} MB`} good={!!execution.report?.simulation}/><CompareRow label="Shuffle" before="26.4 GB" after={`${current.shuffle_gb} GB`}/><div className="compare-note">AQE splits the known hot post-shuffle partition. More executors improve parallel capacity, but they do not remove a hot customer key.</div></div>
  }
  if(mission.id!=='join') return <div className="compare-empty"><strong>No calibrated before/after pair</strong><p>Select Retail mission 03 or 04 for a validated physical comparison.</p></div>
  const baseline=runtime.baseline
  const live=execution.report?.simulation
  const current=live ?? baseline
  const currentCost=execution.report?.cost?.sparklab?.scc ?? baseline.cost.sparklab.scc
  const duration=live ? live.total_duration_s : baseline.duration_s
  const improved=current.shuffle_gb < baseline.shuffle_gb
  return <div className="compare-panel"><div className="compare-head"><span>BASELINE VS CURRENT</span><strong>Same semantic target, physical plan driven by your submitted code</strong></div><CompareRow label="Join" before="SortMerge" after={String(current.plan_decision?.final_join ?? 'SortMergeJoin')} good={improved}/><CompareRow label="Shuffle" before={`${baseline.shuffle_gb} GB`} after={`${current.shuffle_gb} GB`} good={improved}/><CompareRow label="Duration" before={`${baseline.duration_s}s`} after={`${duration}s`} good={duration<baseline.duration_s}/><CompareRow label="SparkLab cost" before={`${baseline.cost.sparklab.scc} SCC`} after={`${currentCost} SCC`} good={currentCost<baseline.cost.sparklab.scc}/><div className="compare-note">The starter solution is deliberately correct but inefficient. An explicit broadcast should remove only the join shuffle; customer aggregation still exchanges data.</div></div>
}

function CompareRow({label,before,after,good}:{label:string;before:string;after:string;good?:boolean}){return <div className="compare-row"><span>{label}</span><b>{before}</b><i>-&gt;</i><strong className={good?'good':''}>{after}</strong></div>}

function LakehouseInspector({activeCase,ran,selectedTable}:{activeCase:CaseStudy;ran:boolean;selectedTable:string}){
  const table=tableModel[activeCase.id].find(t=>t.name===selectedTable) ?? tableModel[activeCase.id][0]
  return <div className="inspector-stack"><InspectorBlock label="Attached item" value={activeCase.lake} sub="DuckLake - Parquet-backed"/><InspectorBlock label="Selected table" value={table.name} sub={`${table.fields.length} visible fields`}/><InspectorBlock label="Snapshot" value={`#${activeCase.snapshot+(ran?1:0)}`} sub={ran?'verified mission commit':'case baseline'}/><div className="inspector-table"><span>SCHEMA</span>{table.fields.map(([name,type])=><div key={name}><b>{name}</b><strong>{type}</strong></div>)}</div><div className="inspector-table"><span>PHYSICAL STATE</span><div><b>Rows</b><strong>{activeCase.rows}</strong></div><div><b>Files</b><strong>{activeCase.files}</strong></div><div><b>Size</b><strong>{activeCase.size}</strong></div></div><div className="medallion-mini"><div>Bronze</div><i>-&gt;</i><div>Silver</div><i>-&gt;</i><div>Gold</div></div></div>
}

function QualityInspector({execution}:{execution:ExecutionState}){
  const grade=execution.report?.grade
  const compiled=!!execution.report?.compile
  const calibrated=!!execution.report?.simulation
  const verified=execution.status==='success'&&execution.source==='backend'&&!!grade?.pass
  const checks:Array<[string,'pass'|'warning'|'blocked']>=[
    ['safe_compile',compiled?'pass':'blocked'],
    ['semantic_target',grade?grade.scores.semantic===100?'pass':'warning':'blocked'],
    ['engineering_target',grade?grade.scores.engineering>=75?'pass':'warning':'blocked'],
    ['calibrated_truth_pack',calibrated?'pass':'blocked'],
    ['mission_complete',verified?'pass':'blocked'],
  ]
  return <div className="quality-stack">{checks.map(([name,state])=><div key={name}><span className={state}>{state==='pass'?'OK':state==='blocked'?'-':'!'}</span><strong>{name}</strong><small>{state}</small></div>)}{grade&&<div className="quality-grade"><span>{grade.pass?'PASS':'CHECK'}</span><strong>Truth-pack grade {grade.overall}/100</strong><small>semantic / engineering / performance / cost</small></div>}</div>
}

function CostInspector({mission,cluster,execution}:{mission:Mission;cluster:ClusterProfile;execution:ExecutionState}){
  const runtime=runtimeForCluster(cluster)
  const reference=mission.id==='join'?runtime?.baseline:mission.id==='skew'?runtime?.skew:null
  const run=execution.report?.simulation
  const cost=execution.report?.cost
  const scc=cost?.sparklab?.scc ?? reference?.cost.sparklab.scc
  const eur=cost?.sparklab?.estimated_eur ?? reference?.cost.sparklab.estimated_eur
  const core=run?.core_hours ?? reference?.core_hours
  const utilization=run?.cluster_utilization_pct ?? reference?.cluster_utilization_pct
  const driver=run?.driver_core_hours ?? reference?.driver_core_hours
  const source=run?'submitted-code model':reference?'mission baseline reference':'not calibrated'
  return <div className="cost-stack"><InspectorBlock label="Model source" value={source} sub="never a vendor invoice"/><InspectorBlock label="SparkLab" value={scc?`${scc} SCC`:'n/a'} sub={eur!=null?`EUR ${eur} training price`:'normalized training cost'}/><InspectorBlock label="Allocated compute" value={core?`${core} core-hours`:'n/a'} sub="workers + driver; includes idle tail"/><InspectorBlock label="Slot utilization" value={utilization!=null?`${utilization}%`:'n/a'} sub="task core-time / allocated worker core-time"/><InspectorBlock label="Driver" value={driver!=null?`${driver} core-hours`:'n/a'} sub="included in modeled compute cost"/>{cluster==='Fabric-like F64'&&<InspectorBlock label="Fabric-like" value={cost?.fabric_like?.cu_hours?`${cost.fabric_like.cu_hours} CUh`:reference?.cost.fabric_like.cu_hours?`${reference.cost.fabric_like.cu_hours} CUh`:'usage only'} sub="not an Azure invoice"/>}{cluster==='Databricks-like Jobs'&&<InspectorBlock label="Databricks-like" value={cost?.databricks_like?.dbu_equivalent?`${cost.databricks_like.dbu_equivalent} DBU-eq`:reference?.cost.databricks_like.dbu_equivalent?`${reference.cost.databricks_like.dbu_equivalent} DBU-eq`:'usage only'} sub="requires dated DBU price"/>}<div className="cost-callout">Optimize <b>shuffle, active compute and utilization</b>. Driver time and cold start are now part of the usage model; the fake currency remains only a training signal.</div></div>
}

function Hints({mission,runtime}:{mission:Mission;runtime:RuntimeMode}){return <div className="hint-stack"><span>MISSION HINTS</span><strong>{mission.title}</strong><p>{runtime==='PySpark Training'?'Inspect join cardinality and partition boundaries before changing cluster size.':'Keep the semantic transformation correct first; compare the physical Spark model separately.'}</p><div><b>1</b> Verify the expected grain.</div><div><b>2</b> Check whether an operation is narrow or wide.</div><div><b>3</b> Use case statistics before optimizing.</div></div>}

function runtimeForCluster(cluster:ClusterProfile){
  if(cluster==='Fabric-like F64') return runtimePreview.profiles.fabric_f64_like
  if(cluster==='Databricks-like Jobs') return runtimePreview.profiles.databricks_jobs_like
  return runtimePreview.profiles.generic_8x8
}

function StatusBar({activeCase,runtime,cluster,execution,backendOnline,capabilities}:{activeCase:CaseStudy;runtime:RuntimeMode;cluster:ClusterProfile;execution:ExecutionState;backendOnline:boolean;capabilities:RuntimeCapabilities|null}){return <footer className="status-bar"><span><i className={`status-dot ${execution.status==='running'?'busy':''}`}/> {execution.status==='running'?'Running':execution.status==='error'?'Error':execution.status==='success'?'Executed':execution.status==='preview'?'Preview / compile':'Ready'}</span><span>{runtime}</span><span>{cluster}</span><span>{activeCase.lake}</span><span className="status-spacer"/><span>{backendOnline?'API CONNECTED':'REFERENCE FALLBACK'}</span><span>SQL oracle: {capabilities?.auto_selection ?? 'offline'}</span><span>REAL: parser + bounded semantics</span><span>SIMULATED: distributed Spark</span><b>V0.12</b></footer>}
function Arch({title,sub,strong,warn}:{title:string;sub:string;strong?:boolean;warn?:boolean}){return <div className={`arch-box ${strong?'strong':''} ${warn?'warn':''}`}><strong>{title}</strong><span>{sub}</span></div>}
function Arrow(){return <i className="arch-arrow">-&gt;</i>}
function Truth({title,text,tone}:{title:string;text:string;tone:string}){return <div className={`truth-card ${tone}`}><strong>{title}</strong><p>{text}</p></div>}
function InfoCard({title,text}:{title:string;text:string}){return <div className="info-card"><strong>{title}</strong><p>{text}</p></div>}
function Metric({label,value}:{label:string;value:string}){return <div className="metric-card"><span>{label}</span><strong>{value}</strong></div>}
function InspectorBlock({label,value,sub}:{label:string;value:string;sub:string}){return <div className="inspector-block"><span>{label}</span><strong>{value}</strong><small>{sub}</small></div>}

export default App
