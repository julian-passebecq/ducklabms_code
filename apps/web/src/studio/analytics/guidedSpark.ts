/** Protocol preparation only. No network, source execution, or grading is performed here. */
import {array, record, string} from './validation.ts';
export const GUIDED_SPARK_LESSON = {
  id: 'retail-filter-v1', version: '1.0.0', runtime: 'fastapispark-0.1.0', fixtureVersion: 'retail-v1',
  title: 'Filter valid orders, then select the business columns',
  sourceTable: 'orders', allowedOperations: ['filter', 'select', 'order_by', 'limit'],
  starter: 'df = spark.table("orders")\ndf = df.filter("net_amount > 0")\ndf = df.select("order_id", "customer_id", "net_amount")',
  rows: [{order_id:1,customer_id:101,net_amount:420},{order_id:2,customer_id:102,net_amount:275},{order_id:3,customer_id:101,net_amount:-10}],
  expectedColumns: ['order_id','customer_id','net_amount'],
  expectedRows: [{order_id:1,customer_id:101,net_amount:420},{order_id:2,customer_id:102,net_amount:275}],
  truth: 'DuckDB result semantics; distributed metrics are simulated. This lesson is not yet runtime-qualified.',
} as const;
export function validateCompiledLesson(value: unknown) {
  const v=record(value,'compile response');
  if(v.source_table!==GUIDED_SPARK_LESSON.sourceTable)throw new Error('The compiled source is not this lesson fixture.');
  const operations=array(v.operations,'operations',20).map(raw=>{const operation=record(raw);const op=string(operation.op,'operation',40);if(!(GUIDED_SPARK_LESSON.allowedOperations as readonly string[]).includes(op))throw new Error(`Operation ${op} is outside this lesson contract.`);return {op,args:record(operation.args,'operation args')};});
  const warnings=array(v.warnings??[],'compiler warnings',50).map(w=>string(w,'warning',2000));
  // A compiler that ignores unsupported statements must not silently pass a lesson.
  if(warnings.length)throw new Error('Compiler emitted warnings. This lesson requires a clean supported compile.');
  return {source_table:GUIDED_SPARK_LESSON.sourceTable,operations};
}
export function prepareLessonRequest(compiled: unknown, consent: boolean) {
  if(!consent)throw new Error('Explicit consent is required before preparing fixture data for a remote service.');
  const plan=validateCompiledLesson(compiled);
  return {...plan,runtime_id:'datapass-free',tables:[{name:GUIDED_SPARK_LESSON.sourceTable,rows:GUIDED_SPARK_LESSON.rows}],collect_limit:100,hints:{}};
}
