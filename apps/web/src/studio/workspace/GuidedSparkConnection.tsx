import {useEffect,useState,useRef} from 'react';
import type {ApiClient} from '../../api';
import type {GuidedCapabilities} from '../../../../../packages/contracts/src/index.ts';
/** Session-only consent; no network call or fixture upload happens on mount. */
export function GuidedSparkConnection({api,onApproved}:{api:ApiClient;onApproved:(approved:boolean)=>void}) {
 const alive=useRef(true);useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[]);
 const expiry=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 useEffect(()=>()=>{if(expiry.current)clearTimeout(expiry.current)},[]);
 const [cap,setCap]=useState<GuidedCapabilities>(),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let alive=true;void api.guidedCapabilities().then(c=>{if(alive)setCap(c)}).catch(e=>{if(alive)setError(String(e))});return()=>{alive=false}},[api]);
 async function qualify(){setBusy(true);setError('');onApproved(false);try{const c=await api.qualifyGuided(consent);if(alive.current){setCap(c);onApproved(consent&&c.available);if(expiry.current)clearTimeout(expiry.current);if(c.available)expiry.current=setTimeout(()=>{onApproved(false);setCap(old=>old?{...old,available:false,reason:'Qualification expired; verify again.'}:old)},600_000)}}catch(e){if(!alive.current)return;setError(String(e));setCap(c=>c?{...c,available:false}:c)}finally{if(alive.current)setBusy(false)}}
 return <section className="dp-guided-connection"><h3>Guided SparkLab connection</h3><p>This is a bounded teaching adapter, not general PySpark. Run requires service 0.1.0 and a successful semantic probe. Qualification expires after ten minutes and must then be repeated.</p><p>{cap?.privacy}</p>{cap&&!cap.available&&<p className="notice">Unavailable: {cap.reason||'Verify this session before execution.'}</p>}{cap?.available&&<p>Protocol qualified. {cap.location}; the server also rechecks version before every Run.</p>}<label><input type="checkbox" checked={consent} onChange={e=>{setConsent(e.target.checked);onApproved(false)}}/> Send this lesson source and built-in fixtures (including hidden grading inputs) to the configured service. No workspace tables or credentials are uploaded.</label><button disabled={busy||!consent||!cap?.configured} onClick={()=>void qualify()}>{busy?'Verifying contract...':'Verify and enable this lesson'}</button>{error&&<p role="alert">{error}</p>}</section>;
}
