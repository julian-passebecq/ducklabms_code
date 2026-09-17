import {Badge,Button} from '@fluentui/react-components';
import {useState} from 'react';
import type {Execution,ResultTable} from '../../../packages/contracts/src/index.ts';

export function DataTable({result}:{result:ResultTable}){
 return <div className="table-scroller"><table><thead><tr>{result.columns.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{result.rows.map((r,i)=><tr key={i}>{result.columns.map(c=><td key={c}>{r[c]===null?<span className="null">null</span>:typeof r[c]==='object'?JSON.stringify(r[c]):String(r[c]??'')}</td>)}</tr>)}</tbody></table>{!result.rows.length&&<p className="empty-caption">No result rows.</p>}<div className="table-caption">{result.truncated?`${result.rows.length} preview rows; total not counted`:`${result.total_rows??result.rows.length} rows`} &middot; Column names are preserved</div></div>;
}
export function ResultView({run,stale=false}:{run?:Execution;stale?:boolean}){
 const [detail,setDetail]=useState(false);
 if(!run)return <div className="empty-state compact"><div className="empty-symbol">[ ]</div><h3>Your result will appear here</h3><p>Run the code above. A successful run returns real rows, a source fingerprint and explicit runtime provenance.</p></div>;
 return <div className="result-view"><div className="result-summary"><Badge color={stale?'warning':run.status==='success'?'success':'danger'} appearance="tint">{stale?'Stale / historical output':run.status}</Badge><span>{run.engine} &middot; measured {run.elapsed_ms?.toFixed(1)} ms</span>{run.check&&<Badge color={run.check.passed?'success':'warning'} appearance="outline">{run.check.passed?(stale?'Previous check passed':'Check passed'):'Check not passed'}</Badge>}<Button size="small" appearance="subtle" onClick={()=>setDetail(!detail)}>{detail?'Hide details':'Execution details'}</Button></div>
 {run.error&&<pre className="error-output">{run.error.type}: {run.error.message}</pre>}
 {run.stdout&&<pre className="stdout-output">{run.stdout}</pre>}
 {run.result&&<DataTable result={run.result}/>}
 {detail&&<div className="execution-details"><p><b>Execution:</b> {run.id}<br/><b>Session:</b> {run.session_generation}<br/><b>Source SHA-256:</b> {run.source_hash}</p>{run.compiled_sql&&<><h4>Executed SQL</h4><pre>{run.compiled_sql}</pre></>}{run.check&&<p>{run.check.message}</p>}
 {run.simulation&&<><h4>Virtual cluster model</h4><p>{run.simulation.truth??run.simulation.reason}</p>{run.simulation.metrics&&<><div className="metric-row"><div><b>{run.simulation.metrics.total_duration_s.toFixed(1)} s</b><span>Modeled duration</span></div><div><b>{run.simulation.metrics.shuffle_gb.toFixed(2)} GB</b><span>Modeled shuffle</span></div><div><b>{run.simulation.cost?.sparklab.scc.toFixed(3)}</b><span>Training credits</span></div></div><p>{run.simulation.physical_fixture_rows} physical fact rows. {run.simulation.virtual_fact_rows?.toLocaleString()} virtual fact rows. Vendor currency totals are not supplied.</p>{run.simulation.metrics.stages.map(s=><div className="stage-line" key={s.stage_id}><span>{s.name}</span><span>{s.task_count} modeled tasks &middot; {s.duration_s.toFixed(1)} s</span></div>)}</>}</>}
 </div>}
 </div>;
}
