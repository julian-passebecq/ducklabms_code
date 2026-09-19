import {useEffect,useMemo,useState} from 'react';
import {Badge,Button,Field,Input,MessageBar,MessageBarBody,Select,Spinner,Textarea} from '@fluentui/react-components';
import type {ApiClient,RustEngineQueryEvidence,RustEngineStatus,RustParquetSource} from './api';

type Props={
 api:ApiClient;
 workspaceId:string;
 disabled?:boolean;
};

const DEFAULT_SQL='SELECT x, x * 2 AS doubled FROM (VALUES (1), (2), (3)) AS t(x) ORDER BY x';

function displayCell(value:unknown){
 if(value===null||value===undefined)return 'NULL';
 if(typeof value==='object')return JSON.stringify(value);
 return String(value);
}

export function RustEngineLab({api,workspaceId,disabled=false}:Props){
 const [status,setStatus]=useState<RustEngineStatus>();
 const [sql,setSql]=useState(DEFAULT_SQL);
 const [sources,setSources]=useState<RustParquetSource[]>([]);
 const [maxRows,setMaxRows]=useState(200);
 const [partitions,setPartitions]=useState(4);
 const [result,setResult]=useState<RustEngineQueryEvidence>();
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');

 async function refresh(){
  setError('');
  try{setStatus(await api.rustEngine())}catch(e){setError(String(e))}
 }

 useEffect(()=>{setResult(undefined);void refresh()},[api,workspaceId]);

 const runnable=status?.available===true&&!busy&&!disabled;
 const columns=useMemo(()=>result?.schema.map(field=>field.name)??[],[result]);

 function updateSource(index:number,patch:Partial<RustParquetSource>){
  setSources(current=>current.map((source,i)=>i===index?{...source,...patch}:source));
 }

 async function run(){
  if(!runnable)return;
  setBusy(true);setError('');setResult(undefined);
  try{
   const usable=sources.filter(source=>source.name.trim()||source.path.trim());
   if(usable.some(source=>!source.name.trim()||!source.path.trim()))throw new Error('Each Parquet source needs both a table name and a workspace-relative path.');
   setResult(await api.rustQuery(workspaceId,{
    sql,
    sources:usable.map(source=>({name:source.name.trim(),path:source.path.trim()})),
    max_rows:maxRows,
    target_partitions:partitions,
   }));
  }catch(e){setError(String(e))}finally{setBusy(false)}
 }

 return <div className="surface-page rust-engine-lab">
  <div className="rust-engine-intro">
   <div>
    <div className="section-eyebrow">EXPERIMENTAL EXECUTION ADAPTER</div>
    <h1>Rust / DataFusion engine</h1>
    <p className="lead">Run bounded local SQL against DataFusion without changing the notebook kernel. Parquet paths are resolved only inside this workspace&apos;s data directory.</p>
   </div>
   <div className="rust-engine-status">
    <Badge appearance="tint" color={status?.available?'success':'warning'}>{status?.available?'AVAILABLE':'NOT ACTIVE'}</Badge>
    <Badge appearance="outline">DEFAULT RUNTIME UNCHANGED</Badge>
    <Button size="small" appearance="subtle" onClick={()=>void refresh()} disabled={busy}>Refresh</Button>
   </div>
  </div>

  {!status&&<Spinner size="tiny" label="Checking Rust engine"/>}
  {status?.available?<div className="rust-engine-facts">
   <div><span>Engine</span><b>{status.engine??'DataFusion'} {status.engine_version??''}</b></div>
   <div><span>Truth</span><b>{status.truth??'real_local'}</b></div>
   <div><span>Arrow</span><b>{status.arrow_major?'Arrow '+status.arrow_major:'Arrow'}</b></div>
   <div><span>Activation</span><b>{status.activation}</b></div>
  </div>:status&&<MessageBar intent="warning"><MessageBarBody><b>Rust engine is opt-in.</b> {status.reason} Build <code>datapass-engine</code>, set <code>DATAPASS_RUST_ENGINE_BIN</code> to that binary, then restart the local Datapass root. Existing DuckDB/Python/SparkLab execution remains unchanged.</MessageBarBody></MessageBar>}

  {error&&<MessageBar intent="error"><MessageBarBody>{error}</MessageBarBody></MessageBar>}

  <section className="rust-engine-panel">
   <header><div><b>Query</b><span>Real local DataFusion execution</span></div>{busy&&<Spinner size="tiny"/>}</header>
   <Field label="SQL">
    <Textarea aria-label="DataFusion SQL" resize="vertical" value={sql} onChange={(_,data)=>setSql(data.value)} disabled={busy||disabled}/>
   </Field>

   <div className="rust-engine-options">
    <Field label="Preview rows">
     <Input type="number" min={1} max={10000} value={String(maxRows)} onChange={(_,data)=>setMaxRows(Math.max(1,Math.min(10000,Number(data.value)||1)))} disabled={busy||disabled}/>
    </Field>
    <Field label="Target partitions">
     <Select value={String(partitions)} onChange={(_,data)=>setPartitions(Number(data.value))} disabled={busy||disabled}>
      {[1,2,4,8,16,32,64].map(value=><option key={value} value={value}>{value}</option>)}
     </Select>
    </Field>
   </div>

   <div className="rust-source-heading"><div><b>Parquet sources</b><span>Optional · relative to workspace/data</span></div><Button size="small" disabled={busy||disabled||sources.length>=32} onClick={()=>setSources(current=>[...current,{name:'source_'+(current.length+1),path:''}])}>Add source</Button></div>
   {sources.length===0?<p className="rust-engine-hint">No source is required for VALUES/constant SQL. Add a Parquet source to query real workspace files.</p>:<div className="rust-source-list">{sources.map((source,index)=><div className="rust-source-row" key={index}>
    <Field label="Table name"><Input value={source.name} placeholder="orders" onChange={(_,data)=>updateSource(index,{name:data.value})} disabled={busy||disabled}/></Field>
    <Field label="Relative .parquet path"><Input value={source.path} placeholder="bronze/orders.parquet" onChange={(_,data)=>updateSource(index,{path:data.value})} disabled={busy||disabled}/></Field>
    <Button appearance="subtle" disabled={busy||disabled} onClick={()=>setSources(current=>current.filter((_,i)=>i!==index))}>Remove</Button>
   </div>)}</div>}

   <div className="rust-run-row"><Button appearance="primary" disabled={!runnable||!sql.trim()} onClick={()=>void run()}>Run in DataFusion</Button><span>No Spark/DuckDB/Python runtime is replaced by this action.</span></div>
  </section>

  {result&&<section className="rust-engine-result">
   <div className="metric-row">
    <div><span>Measured local time</span><b>{result.elapsed_ms} ms</b></div>
    <div><span>Total rows</span><b>{result.row_count}</b></div>
    <div><span>Preview</span><b>{result.preview_row_count}{result.truncated?' +':''}</b></div>
    <div><span>Evidence</span><b>{result.truth}</b></div>
   </div>

   <div className="rust-result-table">
    <div className="rust-result-heading"><b>Rows</b><span>{result.engine} {result.engine_version} · protocol {result.protocol_version}</span></div>
    {columns.length&&result.rows.length?<div className="table-scroller"><table><thead><tr>{columns.map(column=><th key={column}>{column}</th>)}</tr></thead><tbody>{result.rows.map((row,index)=><tr key={index}>{columns.map(column=><td key={column} className={row[column]===null?'null':''}>{displayCell(row[column])}</td>)}</tr>)}</tbody></table></div>:<div className="empty-state compact"><p>The query returned no preview rows.</p></div>}
   </div>

   <div className="rust-plan-stack">
    <details open><summary>Logical plan</summary><pre>{result.logical_plan}</pre></details>
    <details><summary>Physical plan</summary><pre>{result.physical_plan}</pre></details>
    <details><summary>Physical plan + measured operator metrics</summary><pre>{result.physical_plan_with_metrics}</pre></details>
   </div>
  </section>}
 </div>;
}
