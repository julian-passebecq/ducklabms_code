// Exercise the production YAML exporter, not a separately authored facsimile.
const {loadTs}=require('./analytics-m2-load-ts.cjs');
const {boardYaml,sampleBoard}=loadTs('apps/web/src/studio/analytics/charts.ts');
console.log(JSON.stringify(Object.fromEntries(['bar','line','kpi','table'].map(chartType=>[chartType,
  boardYaml({...sampleBoard(),chartType,x:'id',y:'doubled',query:'SELECT * FROM warehouse.smoke_model ORDER BY id'})]))));
