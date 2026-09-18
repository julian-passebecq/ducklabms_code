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
 return <div className="result-view"><div className="result-summary"><Badge color={stale||historical?'warning':run.status==='success'?'success':'danger'} appearance="tint">{historical?'Historical output':stale?'Stale output':run.status==='success'?'Current output':run.status}</Badge><span>{run.engine} &middot; measured {run.elapsed_ms?.toFixed(1)} ms</span>{run.check&&<Badge color={run.check.passed?'success':'warning'} appearance="outline">{run.check.passed?(stale||historical?'Previous check passed':'Check passed'):'Check not passed'}</Badge>}<Button size="small" appearance="subtle" onClick={()=>setDetail(!detail)}>{detail?'Hide details':'Execution details'}</Button></div>
 {run.error&&<pre className="error-output">{run.error.type}: {run.error.message}</pre>}
 {run.stdout&&<pre className="stdout-output">{run.stdout}</pre>}
 {run.result&&<DataTable result={run.result}/>}
 {run.language==='sparklab'&&run.simulation&&<SparkInspector simulation={run.simulation}/>}
 {detail&&<div className="execution-details"><p><b>Execution:</b> {run.id}<br/><b>Session:</b> {run.session_generation}<br/><b>Source SHA-256:</b> {run.source_hash}</p>{run.compiled_sql&&<><h4>Executed SQL</h4><pre>{run.compiled_sql}</pre></>}{run.check&&<p>{run.check.message}</p>}

 </div>}
 </div>;
}
