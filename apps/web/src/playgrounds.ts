import type {KernelId} from '../../../packages/contracts/src/index.ts';
import {createImportedViews} from '../../../packages/notebook-core/src/v2/ipynb.ts';
import type {RootBlock,RootNotebook} from './notebook';
import {sourceKey} from './notebook';
import type {WorkspacePresentation} from './workspacePresentation';

export type PlaygroundId='ducklake'|'fabric'|'free'|'motherduck';

export interface PlaygroundPreset {
 id:PlaygroundId;
 label:string;
 eyebrow:string;
 description:string;
 truth:string;
 presentation:WorkspacePresentation;
 skin:NonNullable<RootNotebook['skin']>;
 initialView:'notebook'|'split'|'free';
}

export const playgroundPresets:readonly PlaygroundPreset[]=[
 {
  id:'ducklake',
  label:'DuckLake / DuckDB lab',
  eyebrow:'REAL LOCAL SQL',
  description:'Explore the seeded lakehouse with real DuckDB SQL. When Datapass starts in DuckLake mode, table data is backed by Parquet with DuckLake metadata.',
  truth:'Uses the local storage engine reported by the runtime; there is no hidden cloud fallback.',
  presentation:'studio',
  skin:'neutral',
  initialView:'split',
 },
 {
  id:'fabric',
  label:'Fabric-style Python + SparkLab',
  eyebrow:'NOTEBOOK',
  description:'Use a Microsoft Fabric-inspired notebook shell with Python cells and the SparkLab PySpark subset on the same local catalog.',
  truth:'Python is real trusted-local CPython when enabled. SparkLab executes supported semantics locally and simulates distributed Spark behavior.',
  presentation:'fabric',
  skin:'fabric',
  initialView:'notebook',
 },
 {
  id:'free',
  label:'Free coding canvas',
  eyebrow:'DRAG + RESIZE',
  description:'SQL, Python, Polars, SparkLab and notes share one notebook while you freely arrange the blocks.',
  truth:'Layout changes presentation only; notebook cell identity, source and execution order stay canonical.',
  presentation:'studio',
  skin:'neutral',
  initialView:'free',
 },
 {
  id:'motherduck',
  label:'MotherDuck-ready SQL',
  eyebrow:'OPTIONAL CLOUD',
  description:'Start with the same SQL notebook locally. A future MotherDuck adapter can reuse the notebook without changing its code or layout.',
  truth:'V1 intentionally stays local unless the runtime explicitly reports a MotherDuck connection.',
  presentation:'studio',
  skin:'neutral',
  initialView:'split',
 },
] as const;

export function playgroundPreset(id:PlaygroundId):PlaygroundPreset {
 const preset=playgroundPresets.find(item=>item.id===id);
 if(!preset)throw new Error(`Unknown playground preset: ${id}`);
 return preset;
}

type StarterBlock={id:string;title:string;kernel?:KernelId;source:string;role?:RootBlock['role']};

function starterBlock(item:StarterBlock,index:number):RootBlock {
 if(!item.kernel){
  return {id:item.id,type:'markdown',title:item.title,role:item.role??'note',starterSource:item.source,notebook:{source:'ipynb',cellId:item.id,cellType:'markdown',originalIndex:index}};
 }
 const type=item.kernel==='sql'||item.kernel==='dbt'?'sql':item.kernel==='polars'?'polars':'python';
 return {id:item.id,type,title:item.title,kernel:item.kernel,role:'code',starterSource:item.source,notebook:{source:'ipynb',cellId:item.id,cellType:'code',originalIndex:index,language:type,cellMetadata:{datapass:{kernel:item.kernel}}}};
}

const duckSql=`SELECT
  customer_id,
  COUNT(*) AS orders,
  ROUND(SUM(net_amount), 2) AS revenue
FROM source.orders
WHERE net_amount > 0
GROUP BY customer_id
ORDER BY revenue DESC`;

const pythonSource=`rows = query("""
SELECT customer_id, net_amount
FROM source.orders
WHERE net_amount > 0
ORDER BY net_amount DESC
""")
display(rows[:8])`;

const sparkSource=`from pyspark.sql import functions as F

orders = spark.table("source.orders").filter(F.col("net_amount") > 0)
result = orders.groupBy("customer_id").agg(
    F.sum("net_amount").alias("revenue"),
    F.count("order_id").alias("orders")
)`;

const polarsSource=`import polars as pl

orders = pl.DataFrame(query("SELECT * FROM source.orders"))
result = (
    orders
    .filter(pl.col("net_amount") > 0)
    .group_by("customer_id")
    .agg(
        pl.col("net_amount").sum().alias("revenue"),
        pl.len().alias("orders"),
    )
    .sort("revenue", descending=True)
)
display(result)`;

function starters(id:PlaygroundId):StarterBlock[] {
 if(id==='ducklake')return [
  {id:'welcome',title:'Local lakehouse',source:'This notebook uses the workspace catalog. Start Datapass with DuckLake for DuckDB compute + DuckLake metadata + Parquet, or DuckDB for the lighter compatibility profile.'},
  {id:'sql-orders',title:'Explore orders with SQL',kernel:'sql',source:duckSql},
  {id:'sql-detail',title:'Inspect the seeded source',kernel:'sql',source:'SELECT * FROM source.orders ORDER BY loaded_at, order_id LIMIT 50'},
 ];
 if(id==='fabric')return [
  {id:'fabric-intro',title:'Fabric-style notebook',source:'The shell is presentation only. SparkLab and Python read the same Datapass catalog. SparkLab is the safe local PySpark subset; Python requires the trusted-local switch.'},
  {id:'spark-orders',title:'PySpark / SparkLab',kernel:'sparklab',source:sparkSource},
  {id:'python-orders',title:'Python',kernel:'python',source:pythonSource},
  {id:'sql-orders',title:'SQL companion cell',kernel:'sql',source:duckSql},
 ];
 if(id==='motherduck')return [
  {id:'motherduck-intro',title:'Local first, cloud optional',source:'This V1 runs locally against DuckDB or DuckLake. The runtime status bar tells the truth. MotherDuck remains an explicit optional adapter; this notebook does not silently send data to the network.'},
  {id:'sql-orders',title:'Portable analytical SQL',kernel:'sql',source:duckSql},
  {id:'sql-detail',title:'Small result preview',kernel:'sql',source:'SELECT order_id, customer_id, net_amount FROM source.orders WHERE net_amount > 0 ORDER BY net_amount DESC LIMIT 20'},
 ];
 return [
  {id:'canvas-note',title:'Free canvas',source:'Drag and resize every block. Switch between Notebook, Two-page, Code + explanation, Dashboard and Free canvas without cloning the notebook.'},
  {id:'sql-orders',title:'SQL',kernel:'sql',source:duckSql},
  {id:'spark-orders',title:'SparkLab',kernel:'sparklab',source:sparkSource},
  {id:'python-orders',title:'Python',kernel:'python',source:pythonSource},
  {id:'polars-orders',title:'Polars',kernel:'polars',source:polarsSource},
 ];
}

export function createPlaygroundNotebook(id:PlaygroundId):RootNotebook {
 const preset=playgroundPreset(id);
 const items=starters(id);
 const blocks=items.map(starterBlock);
 const blockState:Record<string,unknown>={};
 for(const [index,block] of blocks.entries())blockState[sourceKey(block)]=items[index].source;
 const sourceById=new Map(blocks.map(block=>[block.id,String(blockState[sourceKey(block)]??'')]));
 return {
  schemaVersion:1,
  id:`playground-${id}`,
  title:preset.label,
  blocks,
  views:createImportedViews(blocks,sourceById),
  blockState,
  info:null,
  executions:{},
  executedSource:{},
  presentation:preset.presentation,
  skin:preset.skin,
 };
}
