/** Explicit source creation only. Opening an existing source uses openResource. */
import type {Resource} from '../../../../../packages/contracts/src/foundation.ts';
import {newId} from '../../../../../packages/contracts/src/workbench.ts';
import {starterFiles,starterModel} from '../analytics/project.ts';
import {sampleBoard} from '../analytics/charts.ts';
export const creatableResources=[['dbt-project','dbt project'],['model-design','Data model / SCD'],['chart-board','Chart board'],['pipeline','Pipeline Lab'],['exercise','Arena: retail scenario'],['figure','ConceptMotion'],['guided-spark','Guided SparkLab']] as const;
export function createStudioResource(kind:typeof creatableResources[number][0]):Resource{
 const base={schema_version:1 as const,id:newId(kind),revision:0,title:creatableResources.find(r=>r[0]===kind)![1]};
 switch(kind){
 case 'dbt-project':return {...base,kind,files:starterFiles()};
 case 'model-design':return {...base,kind,model:starterModel(),scd:{type:2,step:0,answer:''}};
 case 'chart-board':{const board=sampleBoard();const query='SELECT order_month, customer_name, revenue FROM warehouse.fct_sales ORDER BY order_month, customer_name';board.query=query;board.snapshot={...board.snapshot,query};return {...base,kind,board};}
 case 'pipeline':return {...base,kind,source:'pipeline("retail_quality", schedule="@daily")\nraw = sql("raw", "CREATE TABLE IF NOT EXISTS bronze.pipeline_orders AS SELECT * FROM source.orders")\ncheck = quality("valid_orders", "SELECT * FROM bronze.pipeline_orders WHERE order_id IS NULL")\nraw >> check\n'};
 case 'exercise':return {...base,kind,exercise_id:'retail-valid-orders',fixture_version:'1',variant:'sql'};
 case 'guided-spark':return {...base,kind:'exercise',exercise_id:'guided-retail-filter',fixture_version:'1',variant:'sparklab'};
 case 'figure':return {...base,kind,family:'join',figure_version:1,description:'Explore equality joins, duplicate keys and SQL NULL semantics.'};
 }
}
