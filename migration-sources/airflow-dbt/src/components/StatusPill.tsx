export function StatusPill({state}:{state:string}){return <span className={`status-pill state-${state}`}>{state.replace('_',' ')}</span>;}
