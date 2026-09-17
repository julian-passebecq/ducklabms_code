import type { DbtSnapshotDefinition } from '../types.js';

type Scalar = string | number | boolean | null;
export interface SnapshotHistoryRow extends Record<string, Scalar> {
  dbt_valid_from: string;
  dbt_valid_to: string | null;
  snapshot_change: 'unchanged' | 'changed-old' | 'changed-new' | 'inserted';
}

export interface SnapshotSimulation {
  history: SnapshotHistoryRow[];
  changedKeys: string[];
  insertedKeys: string[];
  unchangedKeys: string[];
  ignoredDeletes: string[];
}

const keyOf=(row:Record<string,Scalar>,column:string)=>String(row[column] ?? '');
const fallbackInitial='2026-09-17T00:00:00Z';
const fallbackNext='2026-09-18T00:00:00Z';

function changed(snapshot:DbtSnapshotDefinition,before:Record<string,Scalar>,after:Record<string,Scalar>):boolean{
  if(snapshot.strategy==='timestamp'){
    if(!snapshot.updatedAt) return false;
    return String(before[snapshot.updatedAt]??'')!==String(after[snapshot.updatedAt]??'');
  }
  const cols=snapshot.checkCols?.length?snapshot.checkCols:Object.keys(after).filter((column)=>column!==snapshot.uniqueKey);
  return cols.some((column)=>before[column]!==after[column]);
}

function versionTime(snapshot:DbtSnapshotDefinition,row:Record<string,Scalar>,fallback:string):string{
  if(snapshot.updatedAt&&row[snapshot.updatedAt]!=null) return String(row[snapshot.updatedAt]);
  return fallback;
}

export function simulateSnapshot(snapshot:DbtSnapshotDefinition):SnapshotSimulation{
  const beforeByKey=new Map(snapshot.before.map((row)=>[keyOf(row,snapshot.uniqueKey),row]));
  const afterByKey=new Map(snapshot.after.map((row)=>[keyOf(row,snapshot.uniqueKey),row]));
  const history:SnapshotHistoryRow[]=[]; const changedKeys:string[]=[]; const insertedKeys:string[]=[]; const unchangedKeys:string[]=[]; const ignoredDeletes:string[]=[];

  for(const [key,before] of beforeByKey){
    const after=afterByKey.get(key);
    const initialFrom=versionTime(snapshot,before,fallbackInitial);
    if(!after){
      ignoredDeletes.push(key);
      history.push({...before,dbt_valid_from:initialFrom,dbt_valid_to:null,snapshot_change:'unchanged'});
      continue;
    }
    if(changed(snapshot,before,after)){
      const changedAt=versionTime(snapshot,after,fallbackNext);
      changedKeys.push(key);
      history.push({...before,dbt_valid_from:initialFrom,dbt_valid_to:changedAt,snapshot_change:'changed-old'});
      history.push({...after,dbt_valid_from:changedAt,dbt_valid_to:null,snapshot_change:'changed-new'});
    }else{
      unchangedKeys.push(key);
      history.push({...before,dbt_valid_from:initialFrom,dbt_valid_to:null,snapshot_change:'unchanged'});
    }
  }
  for(const [key,after] of afterByKey){
    if(beforeByKey.has(key)) continue;
    insertedKeys.push(key);
    history.push({...after,dbt_valid_from:versionTime(snapshot,after,fallbackNext),dbt_valid_to:null,snapshot_change:'inserted'});
  }
  return {history,changedKeys,insertedKeys,unchangedKeys,ignoredDeletes};
}


export function snapshotDependencyId(relation:string):string|undefined{
  const source=relation.match(/^source\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)$/);
  if(source) return `source.${source[1]}.${source[2]}`;
  const ref=relation.match(/^ref\(\s*['"]([^'"]+)['"]\s*\)$/);
  return ref?.[1];
}

export function snapshotYaml(snapshot:DbtSnapshotDefinition):string{
  const lines=[
    'snapshots:',
    `  - name: ${snapshot.id}`,
    `    relation: ${snapshot.relation}`,
    `    description: ${JSON.stringify(snapshot.description)}`,
    '    config:',
    '      schema: snapshots',
    `      unique_key: ${snapshot.uniqueKey}`,
    `      strategy: ${snapshot.strategy}`,
  ];
  if(snapshot.strategy==='timestamp'&&snapshot.updatedAt) lines.push(`      updated_at: ${snapshot.updatedAt}`);
  if(snapshot.strategy==='check') lines.push('      check_cols:',...(snapshot.checkCols??[]).map((column)=>`        - ${column}`));
  return lines.join('\n');
}
