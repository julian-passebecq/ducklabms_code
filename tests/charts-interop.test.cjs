const test=require('node:test'),assert=require('node:assert/strict');
const {loadTs}=require('../scripts/analytics-m2-load-ts.cjs');
const C=loadTs('apps/web/src/studio/analytics/charts.ts');
for(const chartType of ['bar','line','kpi','table'])test('dbt Charts '+chartType+' import clears evidence and retains SQL',()=>{
 const board={...C.sampleBoard(),chartType};const yaml=C.boardYaml(board);const imported=C.importBoardYaml(yaml);
 assert.equal(imported.chartType,chartType);assert.match(imported.query,/SELECT/);assert.equal(imported.snapshot.origin,'imported');assert.deepEqual(imported.snapshot.rows,[]);assert.equal(imported.snapshot.run_id,undefined);
 assert.doesNotThrow(()=>C.importBoardYaml(C.boardYaml(imported)));
});
test('unsupported or ambiguous YAML fails without silently dropping semantics',()=>{
 const yaml=C.boardYaml(C.sampleBoard());
 for(const bad of [yaml+'\nvariables: {}',yaml.replace('source: db','source: https://example.com'),yaml.replace('type: bar','type: scatter'),yaml+'\ntitle: duplicate',yaml.replace('query: analysis','query: missing'),yaml+'\nx: &x [*x]'])assert.throws(()=>C.importBoardYaml(bad));
});
