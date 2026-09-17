/** Root v1 contracts. Specialist modules consume these, never create a second runtime. */
export type KernelId = 'sql' | 'sparklab' | 'python' | 'polars' | 'dbt';
export type TruthKind = 'real' | 'simulated' | 'unsupported';
export interface ResultTable {columns:string[]; rows:Record<string,unknown>[]; total_rows:number|null; truncated:boolean}
export interface Asset {name:string;layer:string;row_count:number;version?:string;inputs?:Record<string,string>;producer?:string;fresh:boolean}
export interface Check {status:string;passed:boolean|null;fresh?:boolean;message:string;actual?:Record<string,unknown>[];expected?:Record<string,unknown>[]}
export interface Simulation {status:string;reason?:string;truth?:string;physical_fixture_rows?:number;virtual_fact_rows?:number;profile_id?:string;metrics?:{total_duration_s:number;shuffle_gb:number;spill_gb:number;core_hours:number;stages:Array<{stage_id:number;name:string;operator:string;duration_s:number;task_count:number}>};cost?:{sparklab:{scc:number;estimated_eur:number};fabric_like:{estimated_eur:number|null};databricks_like:{estimated_usd:number|null}};grade?:{pass:boolean;overall:number;feedback:string[]}}
export interface Execution {id:string;cell_id:string;notebook_id:string;source_hash:string;input_versions?:Record<string,string|null>;session_generation:string;sequence:number;created_at:string;engine:string;language:KernelId;status:'success'|'error'|'skipped';stdout?:string;error?:{type:string;message:string};reason?:string;result?:ResultTable;compiled_sql?:string;output_asset?:string|null;simulation?:Simulation|null;check?:Check|null;elapsed_ms?:number;workspace_revision?:number;catalog?:Asset[]}
export interface CaseStep {id:string;title:string;module:string;language:KernelId;code:string;solution:string;output_asset:string|null;depends_on:string[];concept:string;task:string;hint:string;truth_pack?:string;check?:{sql:string;expected:Record<string,unknown>[]} | null}
export interface CaseStudy {schema_version:1;id:string;title:string;subtitle:string;domain:string;difficulty:string;minutes:number;description:string;physical_data:string;scale_note?:string;modules:string[];steps:CaseStep[];status:string;version:string}
export interface ModuleManifest {id:string;title:string;kind:string;persona:string;status:string;contract_version:1}
export interface Workspace<T=unknown> {id:string;case_id:string;title:string;revision:number;updated_at:string;schema_version:1;notebook:T|null;evidence:Record<string,Execution>;runs:Execution[]}
export interface Capabilities {storage:string;storage_truth:string;ducklake_active:boolean;distributed_spark:boolean;session_generation:string;kernels:Array<{id:KernelId;available:boolean;truth:string}>;motherduck:{enabled:boolean;reason:string}}
export interface Profile {id:string;name:string;min_workers:number;max_workers:number;cores_per_worker:number;max_cores:number;memory_gb_per_worker:number;truth:string}
export interface ExecuteRequest {notebook_id:string;cell_id:string;step_id?:string;language:KernelId;code:string;output_asset?:string|null;profile:string;aqe:boolean}
export interface RuntimeClient {execute(workspaceId:string,request:ExecuteRequest):Promise<Execution>;catalog(workspaceId:string):Promise<Asset[]>;restart(workspaceId:string):Promise<unknown>}
export interface WorkflowResult {status:'success'|'failed';runs:Execution[];catalog:Asset[];workspace_revision:number;scheduler_truth:string}

export function topologicalOrder(steps:Array<{id:string;depends_on:string[]}>):string[] {
 const byId=new Map(steps.map(s=>[s.id,s]));
 if(byId.size!==steps.length) throw new Error('Duplicate step IDs');
 const active=new Set<string>(),done=new Set<string>(),out:string[]=[];
 const visit=(id:string)=>{if(active.has(id))throw new Error('Dependency cycle');if(done.has(id))return;const s=byId.get(id);if(!s)throw new Error(`Unknown dependency: ${id}`);active.add(id);s.depends_on.forEach(visit);active.delete(id);done.add(id);out.push(id)};
 steps.forEach(s=>visit(s.id));return out;
}
export function requireModuleCompatibility(module:ModuleManifest):void {if(module.contract_version!==1)throw new Error(`Unsupported module contract for ${module.id}`)}

/** Saved output is evidence, not an assertion that its dependencies are still current. */
export function isExecutionFresh(run:Execution,assets:Asset[]):boolean {
 if(run.status!=='success'||!run.input_versions)return false;
 const current=new Map(assets.map(a=>[a.name,a]));
 return Object.entries(run.input_versions).every(([name,version])=>{
  const asset=current.get(name);return !!asset&&asset.fresh&&asset.version===version;
 });
}
