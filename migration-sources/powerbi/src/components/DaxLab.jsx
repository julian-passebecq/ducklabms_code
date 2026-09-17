import React, { useMemo, useState } from 'react';
import Icon from './Icon.jsx';
import { daxTopics } from '../data/curriculum.js';

const exercises = [
  {
    id: 'revenue',
    title: 'Create a responsive revenue measure',
    level: 'Foundation',
    prompt: 'Create a measure named Revenue that sums Sales[Sales]. The result must respond to slicers and visual context.',
    hint: 'This should be a measure, not a calculated column.',
    answer: 'Revenue = SUM ( Sales[Sales] )',
    required: ['revenue', 'sum', 'sales[sales]'],
    explain: 'SUM is evaluated in the active filter context, so the same measure automatically returns the relevant value for a year, country, product, or RLS slice.',
  },
  {
    id: 'share',
    title: 'Percent of all regions',
    level: 'Context',
    prompt: 'Create Region Share % by dividing current sales by sales with the Region table filter removed.',
    hint: 'Use CALCULATE plus REMOVEFILTERS.',
    answer: 'Region Share % =\nDIVIDE (\n    [Total Sales],\n    CALCULATE ( [Total Sales], REMOVEFILTERS ( Region ) )\n)',
    required: ['calculate', 'removefilters', 'divide'],
    explain: 'The numerator keeps current context. The denominator modifies that context by removing Region filters while preserving other filters such as date or product.',
  },
  {
    id: 'yoy',
    title: 'Year-over-year growth',
    level: 'Time intelligence',
    prompt: 'Create YoY Growth % using a prior-year value and DIVIDE. Assume a valid Date table exists.',
    hint: 'Store prior year sales in a VAR.',
    answer: "YoY Growth % =\nVAR PriorYear =\n    CALCULATE ( [Total Sales], SAMEPERIODLASTYEAR ( 'Date'[Date] ) )\nRETURN\n    DIVIDE ( [Total Sales] - PriorYear, PriorYear )",
    required: ['var', 'sameperiodlastyear', 'divide', 'return'],
    explain: 'The time-intelligence function supplies a shifted date filter. The measure still respects all other report filters unless they are explicitly changed.',
  },
  {
    id: 'rank',
    title: 'Rank products inside the current selection',
    level: 'Analytical',
    prompt: 'Rank products by Total Sales while preserving the outer report selection.',
    hint: 'RANKX + ALLSELECTED.',
    answer: 'Product Rank =\nRANKX (\n    ALLSELECTED ( Product[Product] ),\n    [Total Sales],\n    , DESC\n)',
    required: ['rankx', 'allselected', 'total sales'],
    explain: 'ALLSELECTED defines the comparison set using the user’s outer selection rather than the current product row only.',
  },
  {
    id: 'visualcalc',
    title: 'Use a visual calculation intentionally',
    level: 'Modern DAX',
    prompt: 'The calculation is used only on one trend visual. Create a 3-period moving average as a visual calculation.',
    hint: 'Keep the expression local to the visual.',
    answer: 'Rolling 3 = MOVINGAVERAGE ( [Total Sales], 3 )',
    required: ['movingaverage', 'total sales'],
    explain: 'Visual calculations operate on the aggregated visual result. They are often clearer than creating a model-wide measure for logic that is only needed by one visual.',
  },
  {
    id: 'udf',
    title: 'Centralize a reusable business rule',
    level: 'Modern DAX',
    prompt: 'Define a DAX user-defined function SafeMargin(revenue, cost) that returns margin divided by revenue.',
    hint: 'Use FUNCTION and DIVIDE.',
    answer: 'FUNCTION SafeMargin = ( revenue : NUMERIC, cost : NUMERIC ) =>\n    DIVIDE ( revenue - cost, revenue )',
    required: ['function', 'safemargin', 'divide'],
    explain: 'UDFs centralize reusable model logic. They became generally available in Power BI Desktop and the Service in June 2026.',
  },
  {
    id: 'iterator',
    title: 'Row-by-row revenue with SUMX',
    level: 'Evaluation context',
    prompt: 'Create Extended Revenue by multiplying quantity and unit price row by row, then summing the results.',
    hint: 'A simple SUM cannot multiply two columns row by row. Use an iterator.',
    answer: 'Extended Revenue =\nSUMX (\n    Sales,\n    Sales[Quantity] * Sales[Unit Price]\n)',
    required: ['sumx', 'sales[quantity]', 'sales[unit price]'],
    explain: 'SUMX creates row context over Sales, evaluates the multiplication for each row, and then aggregates those scalar results.',
  },
  {
    id: 'selectedvalue',
    title: 'Create a dynamic report title',
    level: 'Report UX',
    prompt: 'Create a title measure that displays the selected Region country, otherwise displays “All regions”.',
    hint: 'SELECTEDVALUE accepts an alternate result.',
    answer: 'Region Title =\n"Sales — " & SELECTEDVALUE ( Region[Country], "All regions" )',
    required: ['selectedvalue', 'region[country]', 'all regions'],
    explain: 'SELECTEDVALUE is clearer than manually testing HASONEVALUE for common single-selection display logic.',
  },
  {
    id: 'shipdate',
    title: 'Use an inactive relationship intentionally',
    level: 'Model-aware DAX',
    prompt: 'Create Sales by Ship Date while the active Date relationship uses Order Date.',
    hint: 'Activate the inactive relationship only inside this measure.',
    answer: "Sales by Ship Date =\nCALCULATE (\n    [Total Sales],\n    USERELATIONSHIP ( Sales[ShipDateKey], 'Date'[DateKey] )\n)",
    required: ['calculate', 'userelationship', 'shipdatekey', 'datekey'],
    explain: 'USERELATIONSHIP activates the intended relationship for the scope of CALCULATE without changing the model-wide active relationship.',
  },
  {
    id: 'virtualrel',
    title: 'Map a disconnected selection with TREATAS',
    level: 'Virtual relationships',
    prompt: 'Apply selected Scenario values from a disconnected selector table to Budget[Scenario].',
    hint: 'Use VALUES to get the selected set, then TREATAS to apply it elsewhere.',
    answer: 'Budget for Scenario =\nCALCULATE (\n    [Budget],\n    TREATAS ( VALUES ( ScenarioSelector[Scenario] ), Budget[Scenario] )\n)',
    required: ['calculate', 'treatas', 'values', 'budget[scenario]'],
    explain: 'TREATAS applies a set of values as filters to another column and is useful for deliberate virtual-filter patterns.',
  },
  {
    id: 'switch',
    title: 'Business classification with SWITCH',
    level: 'Business logic',
    prompt: 'Create a performance label: Green at or above 100%, Amber at or above 95%, otherwise Red.',
    hint: 'SWITCH(TRUE()) is a readable pattern for ordered conditions.',
    answer: 'Performance Band =\nSWITCH (\n    TRUE (),\n    [Attainment %] >= 1, "Green",\n    [Attainment %] >= 0.95, "Amber",\n    "Red"\n)',
    required: ['switch', 'true', 'attainment', 'green', 'amber', 'red'],
    explain: 'Order matters: DAX returns the first matching branch, so test the strongest threshold first.',
  },
  {
    id: 'contexttransition',
    title: 'Recognize context transition',
    level: 'Advanced context',
    prompt: 'Inside SUMX over Customer, evaluate [Total Sales] for each current customer. Write the iterator expression and identify why the measure sees the current row.',
    hint: 'A measure invocation is evaluated with CALCULATE semantics inside row context.',
    answer: 'Customer Sales Sum =\nSUMX (\n    Customer,\n    [Total Sales]\n)',
    required: ['sumx', 'customer', 'total sales'],
    explain: 'When a measure is invoked inside row context, context transition turns the current row values into filter context for the measure evaluation.',
  },

  {
    id: 'ratio-total',
    title: 'Fix a non-additive percentage total',
    level: 'Totals',
    prompt: 'Create Margin % so the total is total margin divided by total revenue, not an average of row percentages.',
    hint: 'Recalculate the ratio from additive measures in the current filter context.',
    answer: `Margin % =
DIVIDE ( [Margin], [Revenue] )`,
    required: ['margin %', 'divide', '[margin]', '[revenue]'],
    explain: 'Ratios are non-additive. A measure that divides aggregated components recalculates correctly at each visual grain and at the grand total.',
  },
  {
    id: 'keepfilters',
    title: 'Intersect a filter instead of replacing it',
    level: 'Context',
    prompt: 'Calculate High Value Sales for rows where Sales[Amount] is at least 1000 while preserving any narrower existing filter on that column.',
    hint: 'Wrap the Boolean filter with KEEPFILTERS inside CALCULATE.',
    answer: `High Value Sales =
CALCULATE (
    [Total Sales],
    KEEPFILTERS ( Sales[Amount] >= 1000 )
)`,
    required: ['calculate', 'keepfilters', 'sales[amount]', '1000'],
    explain: 'KEEPFILTERS changes CALCULATE filter semantics so the new condition is intersected with an existing filter rather than replacing it on the same column.',
  },
  {
    id: 'dax-query',
    title: 'Inspect measures with a DAX query',
    level: 'Developer workflow',
    prompt: 'Write a query that returns Country and Total Sales using SUMMARIZECOLUMNS, ordered by Total Sales descending.',
    hint: 'Queries use EVALUATE and can ORDER BY a projected measure result.',
    answer: `EVALUATE
SUMMARIZECOLUMNS (
    Region[Country],
    "Sales", [Total Sales]
)
ORDER BY [Sales] DESC`,
    required: ['evaluate', 'summarizecolumns', 'region[country]', 'total sales', 'order by'],
    explain: 'DAX Query View is useful for testing semantic results, inspecting query shape, and developing calculations without first building a visual.',
  },
  {
    id: 'directlake-column',
    title: 'Recognize Direct Lake calculated-column scope',
    level: '2026 preview',
    prompt: 'For a Direct Lake on OneLake model, define a simple Gross Margin calculated column as Sales minus Cost. The goal is to recognize the August 2026 preview capability, not to replace reusable measures.',
    hint: 'A row-level calculated column uses direct column references.',
    answer: 'Gross Margin = Sales[Sales] - Sales[Cost]',
    required: ['gross margin', 'sales[sales]', 'sales[cost]'],
    explain: 'August 2026 introduced DAX calculated columns for Direct Lake on OneLake semantic models in preview. They are evaluated at query time; feature limitations and modeling tradeoffs still matter.',
  },
];

export default function DaxLab() {
  const [topicId, setTopicId] = useState('calculate');
  const [exerciseId, setExerciseId] = useState('revenue');
  const [code, setCode] = useState('Revenue = SUM ( Sales[Sales] )');
  const [result, setResult] = useState(null);
  const [reveal, setReveal] = useState(false);
  const topic = daxTopics.find(t => t.id === topicId) || daxTopics[0];
  const exercise = exercises.find(e => e.id === exerciseId) || exercises[0];
  const groups = useMemo(() => [...new Set(daxTopics.map(t=>t.group))], []);

  const chooseExercise = (id) => {
    const ex = exercises.find(e=>e.id===id);
    setExerciseId(id); setCode(''); setResult(null); setReveal(false);
    if (ex.id === 'revenue') setCode('Revenue = ');
  };
  const validate = () => {
    const normalized = code.toLowerCase().replace(/\s+/g,' ');
    const missing = exercise.required.filter(x => !normalized.includes(x));
    setResult(missing.length ? { ok:false, text:`Not yet. The expected reasoning needs: ${missing.join(', ')}.` } : { ok:true, text:'Valid for this learning exercise. Now explain why this calculation belongs at this layer and how filter context affects it.' });
  };

  return (
    <div className="dax-lab page-pad">
      <div className="page-heading split-heading">
        <div><span className="eyebrow">DAX IS THE CORE MODELING LANGUAGE</span><h1>DAX laboratory</h1><p>Learn the evaluation model first, then syntax. Measures, context, CALCULATE, virtual tables, time intelligence, ranking, visual calculations, UDFs, and DAX queries are all connected.</p></div>
        <div className="stat-cluster"><div><b>{daxTopics.length}</b><span>concept maps</span></div><div><b>{exercises.length}</b><span>guided exercises</span></div><div><b>2026</b><span>UDF + visual calc coverage</span></div></div>
      </div>
      <div className="dax-map-layout">
        <aside className="topic-nav">
          {groups.map(group => <div key={group}><label>{group}</label>{daxTopics.filter(t=>t.group===group).map(t=><button key={t.id} className={topicId===t.id?'active':''} onClick={()=>setTopicId(t.id)}>{t.title}<Icon name="chevron" size={14}/></button>)}</div>)}
        </aside>
        <main className="topic-content">
          <div className="topic-hero"><span>{topic.group}</span><h2>{topic.title}</h2><p>{topic.core}</p></div>
          <div className="example-stack">{topic.examples.map((ex,i)=><article key={`${ex.label}-${i}`} className="code-example"><div><b>{ex.label}</b><span>{ex.note}</span></div><pre><code>{ex.code}</code></pre></article>)}</div>
          <div className="context-diagram">
            <div className="ctx source"><b>Report context</b><span>Slicer • axis • page filter • RLS</span></div><div className="ctx-arrow">→</div><div className="ctx calc"><b>DAX expression</b><span>CALCULATE can modify context</span></div><div className="ctx-arrow">→</div><div className="ctx result"><b>Result</b><span>One scalar or table per evaluation</span></div>
          </div>
        </main>
      </div>

      <section className="exercise-section">
        <div className="section-title-row"><div><span className="eyebrow">PRACTICE</span><h2>Reason, write, validate</h2></div><p>Validation checks the structural intent of the formula. It is not pretending to be the actual DAX engine.</p></div>
        <div className="exercise-layout">
          <aside className="exercise-list">{exercises.map(ex=><button key={ex.id} className={exerciseId===ex.id?'active':''} onClick={()=>chooseExercise(ex.id)}><span>{ex.level}</span><b>{ex.title}</b></button>)}</aside>
          <main className="exercise-editor">
            <div className="exercise-prompt"><span className="level-pill">{exercise.level}</span><h3>{exercise.title}</h3><p>{exercise.prompt}</p><small>Hint: {exercise.hint}</small></div>
            <div className="code-editor-lite"><div className="editor-top"><span>DAX</span><span>semantic model / visual expression</span></div><textarea value={code} onChange={e=>{setCode(e.target.value);setResult(null)}} spellCheck="false" placeholder="Write your DAX here…"/></div>
            <div className="editor-actions"><button className="primary-btn" onClick={validate}><Icon name="check" size={16}/>Validate reasoning</button><button className="secondary-btn" onClick={()=>setReveal(v=>!v)}>{reveal?'Hide':'Reveal'} solution</button></div>
            {result && <div className={`validation-result ${result.ok?'ok':'no'}`}><Icon name={result.ok?'check':'info'} size={18}/>{result.text}</div>}
            {reveal && <div className="solution-panel"><div><b>Reference solution</b><span>{exercise.explain}</span></div><pre><code>{exercise.answer}</code></pre></div>}
          </main>
        </div>
      </section>
    </div>
  );
}
