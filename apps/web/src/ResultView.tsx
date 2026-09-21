import {SparkInspector} from './SparkInspector';
import {Badge,Button} from '@fluentui/react-components';
import {useState} from 'react';
import type {Execution,ResultTable} from '../../../packages/contracts/src/index.ts';

export function DataTable({result}:{result:ResultTable}){
 return <div className="table-scroller"><table><thead><tr>{result.columns.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{result.rows.map((r,i)=><tr key={i}>{result.columns.map(c=><td key={c}>{r[c]===null?<span className="null">null</span>:typeof r[c]==='object'?JSON.stringify(r[c]):String(r[c]??'')}</td>)}</tr>)}</tbody></table>{!result.rows.length&&<p className="empty-caption">No result rows.</p>}<div className="table-caption">{result.truncated?`${result.rows.length} preview rows; total not counted`:`${result.total_rows??result.rows.length} rows`} &middot; Column names are preserved</div></div>;
}
export function ResultView({run,stale=false,historical=false}:{run?:Execution;stale?:boolean;historical?:boolean}){
 const [detail,setDetail]=useState(false);
 if(!run)return <div className="empty-state compact"><div className="empty-symbol">[ ]</div><h3>Your result will appear here</h3><p>Run the code above. A successful run returns real rows, a source fingerprint and explicit runtime provenance.</p></div>;
 return <div className="result-view"><div className="result-summary"><Badge color={stale||historical?'warning':run.status==='success'?'success':'danger'} appearance="tint">{historical?'Historical output':stale?'Stale output':run.status==='success'?'Current output':run.status}</Badge><span>{run.engine} &middot; {run.guided_evidence?'HTTP round trip':'measured local wall time'} {run.elapsed_ms?.toFixed(1)} ms</span>{run.check&&<Badge color={run.check.passed?'success':'warning'} appearance="outline">{run.check.passed?(stale||historical?'Previous check passed':'Check passed'):'Check not passed'}</Badge>}<Button size="small" appearance="subtle" onClick={()=>setDetail(!detail)}>{detail?'Hide details':'Execution details'}</Button></div>
 {run.error&&<pre className="error-output">{run.error.type}: {run.error.message}</pre>}
 {run.stdout&&<pre className="stdout-output">{run.stdout}</pre>}
 {run.guided_evidence&&<h3>Real bounded result</h3>}
 {run.result&&<DataTable result={run.result}/>}
 {run.guided_evidence&&<section className="dp-simulation-zone" aria-label="Simulated Spark execution model"><h3>Simulated Spark execution model</h3><p>{run.guided_evidence.metrics.disclaimer}</p><p>Modeled duration: {run.guided_evidence.metrics.total_duration_ms} ms. Fictional credits: {run.guided_evidence.metrics.simulated_credits}. These are not Spark telemetry or vendor prices.</p><div className="table-scroller"><table><caption>Simulated stages</caption><thead><tr><th>Stage</th><th>Tasks</th><th>Modeled ms</th><th>Shuffle read/write bytes</th><th>Spill bytes</th></tr></thead><tbody>{run.guided_evidence.metrics.stages.map((stage,index)=><tr key={index}><td>{stage.stage_id}</td><td>{stage.tasks}</td><td>{stage.duration_ms}</td><td>{stage.shuffle_read_bytes} / {stage.shuffle_write_bytes}</td><td>{stage.spill_bytes}</td></tr>)}</tbody></table></div><details><summary>Service / fixture identity</summary><p>Service {run.guided_evidence.service_version}; fixture {run.guided_evidence.fixture_version}; engine {run.guided_evidence.physical_engine} ({run.guided_evidence.engine_version}).</p><p>Client contract inspected at {run.guided_evidence.source_commit}. The service does not attest its deployed commit.</p><p>Provider execution: {run.guided_evidence.execution_id}</p></details></section>}
 {run.language==='sparklab'&&run.simulation&&<SparkInspector simulation={run.simulation}/>}
 {detail&&<div className="execution-details"><p><b>Execution:</b> {run.id}<br/><b>Session:</b> {run.session_generation}<br/><b>Source SHA-256:</b> {run.source_hash}</p>{run.compiled_sql&&<><h4>Executed SQL</h4><pre>{run.compiled_sql}</pre></>}{run.check&&<p>{run.check.message}</p>}

 </div>}
 </div>;
}
