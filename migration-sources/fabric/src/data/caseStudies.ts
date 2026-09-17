import type { CaseStudy, FakeTable } from '../types/app';

const retailTables: FakeTable[] = [
  {
    schema: 'raw', name: 'sales_csv', layer: 'source', primaryKey: 'sale_id',
    columns: [
      { name: 'sale_id', type: 'BIGINT', description: 'Source transaction identifier' },
      { name: 'sale_ts', type: 'TIMESTAMP', description: 'Transaction timestamp' },
      { name: 'customer_id', type: 'VARCHAR', description: 'Customer business key' },
      { name: 'product_id', type: 'VARCHAR', description: 'Product business key' },
      { name: 'qty', type: 'INTEGER', description: 'Units sold' },
      { name: 'unit_price', type: 'DECIMAL(10,2)', description: 'Unit sales price' }
    ],
    rows: [
      { sale_id: 1001, sale_ts: '2026-09-15 08:12:00', customer_id: 'C014', product_id: 'P03', qty: 2, unit_price: 49.9 },
      { sale_id: 1002, sale_ts: '2026-09-15 08:14:00', customer_id: 'C002', product_id: 'P11', qty: 1, unit_price: 129.0 },
      { sale_id: 1003, sale_ts: '2026-09-15 08:18:00', customer_id: 'C014', product_id: 'P11', qty: 1, unit_price: 129.0 },
      { sale_id: 1004, sale_ts: '2026-09-15 08:21:00', customer_id: 'C031', product_id: 'P07', qty: 3, unit_price: 24.5 }
    ]
  },
  {
    schema: 'bronze', name: 'sales_raw', layer: 'bronze', primaryKey: 'sale_id',
    columns: [
      { name: 'sale_id', type: 'BIGINT', description: 'Unmodified source identifier' },
      { name: 'sale_ts', type: 'TIMESTAMP', description: 'Transaction timestamp' },
      { name: 'customer_id', type: 'VARCHAR', description: 'Customer business key' },
      { name: 'product_id', type: 'VARCHAR', description: 'Product business key' },
      { name: 'qty', type: 'INTEGER', description: 'Units sold' },
      { name: 'unit_price', type: 'DECIMAL(10,2)', description: 'Source price' },
      { name: '_ingested_at', type: 'TIMESTAMP', description: 'Pipeline ingestion metadata' }
    ],
    rows: [
      { sale_id: 1001, sale_ts: '2026-09-15 08:12:00', customer_id: 'C014', product_id: 'P03', qty: 2, unit_price: 49.9, _ingested_at: '2026-09-15 09:00:03' },
      { sale_id: 1002, sale_ts: '2026-09-15 08:14:00', customer_id: 'C002', product_id: 'P11', qty: 1, unit_price: 129.0, _ingested_at: '2026-09-15 09:00:03' }
    ]
  },
  {
    schema: 'silver', name: 'sales_clean', layer: 'silver', primaryKey: 'sale_id',
    columns: [
      { name: 'sale_id', type: 'BIGINT', description: 'Deduplicated transaction key' },
      { name: 'sale_date', type: 'DATE', description: 'Analytics date' },
      { name: 'customer_id', type: 'VARCHAR', description: 'Validated customer key' },
      { name: 'product_id', type: 'VARCHAR', description: 'Validated product key' },
      { name: 'quantity', type: 'INTEGER', description: 'Positive quantity' },
      { name: 'net_sales', type: 'DECIMAL(12,2)', description: 'qty × unit_price' }
    ],
    rows: [
      { sale_id: 1001, sale_date: '2026-09-15', customer_id: 'C014', product_id: 'P03', quantity: 2, net_sales: 99.8 },
      { sale_id: 1002, sale_date: '2026-09-15', customer_id: 'C002', product_id: 'P11', quantity: 1, net_sales: 129.0 }
    ]
  },
  {
    schema: 'dw', name: 'fact_sales', layer: 'warehouse', primaryKey: 'sale_key', foreignKeys: ['customer_key', 'product_key', 'date_key'],
    columns: [
      { name: 'sale_key', type: 'BIGINT', description: 'Warehouse surrogate key' },
      { name: 'customer_key', type: 'INTEGER', description: 'FK to dim_customer' },
      { name: 'product_key', type: 'INTEGER', description: 'FK to dim_product' },
      { name: 'date_key', type: 'INTEGER', description: 'FK to dim_date' },
      { name: 'quantity', type: 'INTEGER', description: 'Measure' },
      { name: 'net_sales', type: 'DECIMAL(12,2)', description: 'Measure' }
    ],
    rows: [
      { sale_key: 50001, customer_key: 14, product_key: 3, date_key: 20260915, quantity: 2, net_sales: 99.8 },
      { sale_key: 50002, customer_key: 2, product_key: 11, date_key: 20260915, quantity: 1, net_sales: 129.0 }
    ]
  }
];

const turbineTables: FakeTable[] = [
  {
    schema: 'iot', name: 'turbine_events', layer: 'stream', primaryKey: 'event_id',
    columns: [
      { name: 'event_id', type: 'UUID', description: 'Streaming event identifier' },
      { name: 'event_ts', type: 'TIMESTAMP', description: 'Sensor time' },
      { name: 'turbine_id', type: 'VARCHAR', description: 'Asset key' },
      { name: 'rpm', type: 'DOUBLE', description: 'Rotor speed' },
      { name: 'vibration_mm_s', type: 'DOUBLE', description: 'Bearing vibration' },
      { name: 'gearbox_temp_c', type: 'DOUBLE', description: 'Gearbox temperature' },
      { name: 'power_kw', type: 'DOUBLE', description: 'Generated power' }
    ],
    rows: [
      { event_id: 'e-901', event_ts: '2026-09-16 19:31:08', turbine_id: 'WT-07', rpm: 14.2, vibration_mm_s: 3.1, gearbox_temp_c: 68.2, power_kw: 1820 },
      { event_id: 'e-902', event_ts: '2026-09-16 19:31:13', turbine_id: 'WT-07', rpm: 14.4, vibration_mm_s: 8.7, gearbox_temp_c: 82.9, power_kw: 1760 },
      { event_id: 'e-903', event_ts: '2026-09-16 19:31:18', turbine_id: 'WT-03', rpm: 13.8, vibration_mm_s: 2.4, gearbox_temp_c: 64.0, power_kw: 1695 }
    ]
  },
  {
    schema: 'silver', name: 'turbine_features', layer: 'silver', primaryKey: 'event_id',
    columns: [
      { name: 'event_id', type: 'UUID', description: 'Event key' },
      { name: 'turbine_id', type: 'VARCHAR', description: 'Asset key' },
      { name: 'event_ts', type: 'TIMESTAMP', description: 'Event timestamp' },
      { name: 'vibration_zscore', type: 'DOUBLE', description: 'Standardized vibration' },
      { name: 'temperature_delta', type: 'DOUBLE', description: 'Deviation from normal temperature' },
      { name: 'risk_score', type: 'DOUBLE', description: 'Simulated anomaly risk 0–1' }
    ],
    rows: [
      { event_id: 'e-901', turbine_id: 'WT-07', event_ts: '2026-09-16 19:31:08', vibration_zscore: 0.6, temperature_delta: 3.2, risk_score: 0.18 },
      { event_id: 'e-902', turbine_id: 'WT-07', event_ts: '2026-09-16 19:31:13', vibration_zscore: 3.9, temperature_delta: 17.9, risk_score: 0.91 }
    ]
  },
  {
    schema: 'ops', name: 'maintenance_alerts', layer: 'warehouse', primaryKey: 'alert_id', foreignKeys: ['turbine_id'],
    columns: [
      { name: 'alert_id', type: 'BIGINT', description: 'Alert surrogate key' },
      { name: 'turbine_id', type: 'VARCHAR', description: 'Asset business key' },
      { name: 'opened_at', type: 'TIMESTAMP', description: 'Alert creation time' },
      { name: 'risk_score', type: 'DOUBLE', description: 'Risk when alert created' },
      { name: 'severity', type: 'VARCHAR', description: 'Operational severity' }
    ],
    rows: [
      { alert_id: 7001, turbine_id: 'WT-07', opened_at: '2026-09-16 19:31:20', risk_score: 0.91, severity: 'High' }
    ]
  }
];

const erpTables: FakeTable[] = [
  {
    schema: 'erp', name: 'sales_order', layer: 'source', primaryKey: 'order_id',
    columns: [
      { name: 'order_id', type: 'BIGINT', description: 'ERP order key' },
      { name: 'customer_id', type: 'VARCHAR', description: 'ERP customer key' },
      { name: 'order_status', type: 'VARCHAR', description: 'Current business state' },
      { name: 'amount', type: 'DECIMAL(14,2)', description: 'Order value' },
      { name: 'modified_at', type: 'TIMESTAMP', description: 'CDC watermark column' }
    ],
    rows: [
      { order_id: 81001, customer_id: 'C104', order_status: 'OPEN', amount: 4550.0, modified_at: '2026-09-16 18:55:10' },
      { order_id: 81002, customer_id: 'C221', order_status: 'SHIPPED', amount: 980.0, modified_at: '2026-09-16 18:58:32' },
      { order_id: 81003, customer_id: 'C104', order_status: 'CANCELLED', amount: 325.0, modified_at: '2026-09-16 19:01:04' }
    ]
  },
  {
    schema: 'erp', name: 'customer', layer: 'source', primaryKey: 'customer_id',
    columns: [
      { name: 'customer_id', type: 'VARCHAR', description: 'ERP customer business key' },
      { name: 'customer_name', type: 'VARCHAR', description: 'Current customer name from ERP' },
      { name: 'modified_at', type: 'TIMESTAMP', description: 'CDC watermark column' }
    ],
    rows: [
      { customer_id: 'C104', customer_name: 'Nordic Wind Group AS', modified_at: '2026-09-16 18:57:00' },
      { customer_id: 'C221', customer_name: 'Helios Retail SA', modified_at: '2026-09-16 18:20:00' },
      { customer_id: 'C305', customer_name: 'Boreal Service GmbH', modified_at: '2026-09-16 19:03:00' }
    ]
  },
  {
    schema: 'control', name: 'watermarks', layer: 'warehouse', primaryKey: 'entity_name',
    columns: [
      { name: 'entity_name', type: 'VARCHAR', description: 'Source entity' },
      { name: 'last_successful_ts', type: 'TIMESTAMP', description: 'Incremental load watermark' }
    ],
    rows: [
      { entity_name: 'sales_order', last_successful_ts: '2026-09-16 18:45:00' },
      { entity_name: 'customer', last_successful_ts: '2026-09-16 18:45:00' }
    ]
  },
  {
    schema: 'dw', name: 'dim_customer', layer: 'warehouse', primaryKey: 'customer_key',
    columns: [
      { name: 'customer_key', type: 'INTEGER', description: 'Surrogate key' },
      { name: 'customer_id', type: 'VARCHAR', description: 'Business key' },
      { name: 'customer_name', type: 'VARCHAR', description: 'SCD attribute' },
      { name: 'valid_from', type: 'TIMESTAMP', description: 'SCD2 row start' },
      { name: 'valid_to', type: 'TIMESTAMP', description: 'SCD2 row end' },
      { name: 'is_current', type: 'BOOLEAN', description: 'Current SCD2 version flag' }
    ],
    rows: [
      { customer_key: 104, customer_id: 'C104', customer_name: 'Nordic Wind AS', valid_from: '2025-04-01', valid_to: null, is_current: true },
      { customer_key: 221, customer_id: 'C221', customer_name: 'Helios Retail SA', valid_from: '2026-01-12', valid_to: null, is_current: true }
    ]
  }
];

export const caseStudies: CaseStudy[] = [
  {
    id: 'retail-medallion',
    title: 'Retail Lakehouse: batch ELT to a star schema',
    subtitle: 'Build a Bronze → Silver → Warehouse pipeline and understand keys, transformations and orchestration.',
    industry: 'Retail / BI',
    difficulty: 'Beginner',
    duration: '45–60 min',
    purpose: 'Teach the complete batch data-engineering path from source files to analytics-ready facts and dimensions.',
    scenario: 'A retailer receives hourly sales CSV files. You must land them unchanged, cleanse and enrich them, then load a warehouse fact table for Power BI.',
    learningGoals: [
      'Separate data movement from transformation',
      'Understand Bronze, Silver and serving layers',
      'Recognize business keys, surrogate keys, primary keys and foreign keys',
      'Use a Fabric notebook for code-based transformation',
      'Use Dataflow Gen2 for low-code shaping',
      'Call a stored procedure as an orchestration step',
      'Validate, debug and inspect a pipeline run'
    ],
    tools: ['Fabric Data Factory', 'Copy activity', 'Lakehouse', 'Notebook', 'Dataflow Gen2', 'Stored procedure', 'Warehouse', 'Monitor'],
    architecture: [
      { from: 'ADLS / CSV', to: 'Bronze Lakehouse', label: 'Copy activity' },
      { from: 'Bronze Lakehouse', to: 'Silver Lakehouse', label: 'Notebook / Python' },
      { from: 'Silver Lakehouse', to: 'Conformed query', label: 'Dataflow Gen2' },
      { from: 'Conformed query', to: 'Fabric Warehouse', label: 'Stored procedure MERGE' },
      { from: 'Fabric Warehouse', to: 'Power BI semantic model', label: 'Direct Lake / SQL' }
    ],
    engineeringDecision: { productionScale: 'Hourly sales batches · typically warehouse/lakehouse scale, not an automatic Spark problem', learningSample: '4 representative sales rows', preferred: 'SQL + dbt for relational modeling; Python notebook only where custom code adds value', avoid: 'Do not use Spark just to filter, aggregate or build a normal star schema', rationale: 'The workload is relational and modest. Start with the simplest engine that meets the requirement; introduce Spark only if file volume, distributed joins or scale actually demand it.' },
    brief: {
      businessProblem: 'Finance and store operations need hourly sales that reconcile to source transactions, with a replayable raw layer and a governed star-schema serving layer. The engineering team must keep the design simple enough to operate without introducing Spark where SQL/dbt or lightweight Python is sufficient.',
      stakeholders: ['Retail operations', 'Finance / controlling', 'BI analysts', 'Data platform team'],
      sourceSystems: [
        { name: 'POS / ecommerce sales files', kind: 'CSV files in landing storage', cadence: 'Hourly micro-batch', productionScale: 'Hundreds of MB to low GB per hour', simulatorSample: '4 sales rows' },
        { name: 'Customer + product reference', kind: 'Relational reference data', cadence: 'Daily / change-driven', productionScale: 'Small dimensions', simulatorSample: 'Representative keys only' }
      ],
      serviceLevels: { freshness: 'Curated sales available within 20 minutes of file arrival.', recovery: 'Replay any hourly batch from immutable Bronze; recover a failed serving load within 30 minutes.', quality: 'sale_id unique; quantity > 0; price >= 0; serving keys resolved before publish.', cost: 'Prefer SQL/dbt and low-code movement; introduce Spark only when file volume or distributed processing justifies it.' },
      dataContracts: [
        { object: 'raw.sales_csv', owner: 'Source / ingestion', rules: ['sale_id is not null and unique within a batch', 'sale_ts is parseable', 'qty > 0', 'unit_price >= 0'] },
        { object: 'silver.sales_clean', owner: 'Data engineering', rules: ['one row per sale_id', 'sale_date populated', 'net_sales >= 0'] },
        { object: 'dw.fact_sales / gold daily sales', owner: 'Analytics engineering', rules: ['serving grain is explicit', 'dimension keys are resolved', 'row counts and totals reconcile to curated input'] }
      ],
      acceptanceCriteria: [
        { id: 'retail-bronze', title: 'Replayable landing exists', description: 'A learner-created Bronze copy of the sales feed exists.', evidence: { kind: 'table', objects: ['bronze.fabric_sales_raw', 'bronze.dbx_sales_raw'], minRows: 1 } },
        { id: 'retail-silver', title: 'Curated sales exists', description: 'A learner-created Silver sales table exists.', evidence: { kind: 'table', objects: ['silver.fabric_sales_clean', 'silver.dbx_sales_clean', 'silver.df_fabric_sales_raw'], minRows: 1 } },
        { id: 'retail-serving', title: 'Serving output exists', description: 'A learner-created Gold or warehouse serving result exists.', evidence: { kind: 'table', objects: ['gold.fabric_daily_sales', 'gold.dbx_daily_sales'], minRows: 1 } },
        { id: 'retail-lineage', title: 'Lineage proves the transformation path', description: 'At least one emitted lineage edge reaches a curated or serving object.', evidence: { kind: 'lineage', objects: ['silver.fabric_sales_clean', 'silver.dbx_sales_clean', 'gold.fabric_daily_sales', 'gold.dbx_daily_sales'] } },
        { id: 'retail-recovery', title: 'Operational recovery point exists', description: 'A non-baseline checkpoint exists before or after a production-shaped run.', evidence: { kind: 'checkpoint' } }
      ],
      incident: { title: 'Duplicate and negative sales enter the hourly file', symptom: 'dbt/data-contract checks fail and the publish path is blocked.', rootCause: 'A source replay created duplicate sale_id values and one malformed line carries a negative quantity.', containment: 'Keep the bad batch in Bronze, quarantine rejected rows, and prevent Gold/warehouse promotion.', recovery: 'Correct or filter the invalid records, rerun only the affected transformation/publish path, and reconcile totals.', prevention: 'Enforce uniqueness/range checks as promotion gates and retain replayable Bronze files.' }
    },
    tables: retailTables,
    notebook: [
      { id: 'm1', language: 'markdown', source: '# Silver transformation\nRead the landed Bronze data, enforce types, remove duplicates, and calculate net sales.' },
      { id: 'p1', language: 'python', source: "bronze = table('bronze.sales_raw')\nclean = bronze.drop_duplicates(['sale_id'])\nclean = clean.filter('qty > 0 AND unit_price >= 0')\nclean['net_sales'] = clean['qty'] * clean['unit_price']\nclean['sale_date'] = to_date(clean['sale_ts'])\nwrite_table('silver.sales_clean', clean, layer='silver')", output: 'Learning runtime: 4 rows read and written to silver.sales_clean using the local pandas-style API.' },
      { id: 's1', language: 'sql', source: 'SELECT sale_date, SUM(net_sales) AS daily_sales\nFROM silver.sales_clean\nGROUP BY sale_date\nORDER BY sale_date;', output: '2026-09-15 | 302.30' }
    ],
    storedProcedureName: 'dw.usp_merge_fact_sales',
    storedProcedure: `CREATE OR ALTER PROCEDURE dw.usp_merge_fact_sales @batch_date DATE AS\nBEGIN\n  MERGE dw.fact_sales AS tgt\n  USING staging.sales_ready AS src\n  ON tgt.sale_key = src.sale_id\n  WHEN MATCHED THEN UPDATE SET\n    quantity = src.quantity,\n    net_sales = src.net_sales\n  WHEN NOT MATCHED THEN INSERT\n    (sale_key, customer_key, product_key, date_key, quantity, net_sales)\n  VALUES\n    (src.sale_id, src.customer_key, src.product_key, src.date_key, src.quantity, src.net_sales);\nEND;`,
    steps: [
      {
        id: 'r1', title: 'Land the source data',
        instruction: 'On the pipeline canvas, add a Copy data activity.',
        why: 'Ingestion should first preserve source fidelity. Landing data without business transformation makes recovery and replay easier.',
        concept: 'Data movement vs transformation', expected: 'A Copy data activity exists on the canvas.', validateKey: 'has-copy',
        hint: 'Open the Move & transform category and choose Copy data.', solutionText: 'Add a Copy activity named Copy_Sales_To_Bronze.',
        apply: { addNode: { type: 'copy', name: 'Copy_Sales_To_Bronze', x: 80, y: 150 } }
      },
      {
        id: 'r2', title: 'Configure source and sink',
        instruction: 'Select the Copy activity. Set source to ADLS /sales/*.csv and destination to Lakehouse bronze.sales_raw. Use append mode.',
        why: 'The source describes where data is read; the sink describes where it lands. In real systems, credentials live in managed connections, not in pipeline code.',
        concept: 'Connections, datasets and sinks', expected: 'Source, destination and write mode match the lab.', validateKey: 'copy-retail-config',
        hint: 'Use the Settings tab in the properties pane.', solutionText: 'Source: ADLS /sales/*.csv → Destination: Lakehouse bronze.sales_raw → Append.',
        apply: { updateNodeType: 'copy', updateConfig: { source: 'ADLS /sales/*.csv', destination: 'Lakehouse bronze.sales_raw', writeMode: 'Append' } }
      },
      {
        id: 'r3', title: 'Transform Bronze to Silver with code',
        instruction: 'Add a Notebook activity after Copy and configure it to run notebook NB_Sales_Bronze_To_Silver.',
        why: 'A notebook is suitable when transformation logic needs code, tests, reusable functions or advanced Spark operations.',
        concept: 'Code transformation in the lakehouse', expected: 'Notebook is present, configured and depends on Copy success.', validateKey: 'retail-notebook',
        hint: 'Add Notebook from Transform, then connect Copy → Notebook with Succeeded.', solutionText: 'Notebook NB_Sales_Bronze_To_Silver runs only after the Copy succeeds.',
        apply: { addNode: { type: 'notebook', name: 'Transform_Bronze_To_Silver', x: 340, y: 150, config: { notebook: 'NB_Sales_Bronze_To_Silver', workspace: 'DE_Learning' } }, connectTypes: ['copy', 'notebook'] }
      },
      {
        id: 'r4', title: 'Shape conformed data with Dataflow Gen2',
        instruction: 'Add Dataflow Gen2 after the notebook. Configure it to join sales to customer and product reference data.',
        why: 'Dataflow Gen2 gives a Power Query-style low-code transformation layer for joins, cleansing, column shaping and business-friendly transformations.',
        concept: 'Low-code transformation and conformance', expected: 'A configured Dataflow Gen2 follows the Notebook.', validateKey: 'retail-dataflow',
        hint: 'Name it DF_Conform_Sales and set query to SalesWithCustomerProduct.', solutionText: 'Notebook → Dataflow Gen2, query SalesWithCustomerProduct, output staging.sales_ready.',
        apply: { addNode: { type: 'dataflow', name: 'Conform_Sales', x: 600, y: 150, config: { dataflow: 'DF_Conform_Sales', query: 'SalesWithCustomerProduct', destination: 'staging.sales_ready' } }, connectTypes: ['notebook', 'dataflow'] }
      },
      {
        id: 'r5', title: 'Load the warehouse with a stored procedure',
        instruction: 'Add a Stored procedure activity after Dataflow Gen2. Choose dw.usp_merge_fact_sales and set @batch_date to pipeline parameter batch_date.',
        why: 'Stored procedures are useful when SQL-side transactional logic, MERGE behavior, constraints or warehouse-specific operations should execute close to the data.',
        concept: 'Warehouse-side ELT and parameters', expected: 'Stored procedure is configured and connected after Dataflow.', validateKey: 'retail-sp',
        hint: 'Select the SQL connection, procedure name, then add parameter @batch_date.', solutionText: 'Procedure: dw.usp_merge_fact_sales; @batch_date = @pipeline().parameters.batch_date.',
        apply: { addNode: { type: 'storedProcedure', name: 'Merge_Fact_Sales', x: 860, y: 150, config: { connection: 'Fabric Warehouse', procedure: 'dw.usp_merge_fact_sales', parametersJson: '[{\"name\":\"batch_date\",\"type\":\"Date\",\"value\":\"@pipeline().parameters.batch_date\",\"nullable\":false}]' } }, connectTypes: ['dataflow', 'storedProcedure'] }
      },
      {
        id: 'r6', title: 'Validate and debug',
        instruction: 'Use Validate, then Debug. Inspect the activity outputs and confirm all four stages succeed.',
        why: 'Validation catches structural problems before execution. Debug runs provide fast feedback before you publish or schedule a pipeline.',
        concept: 'Operational feedback loop', expected: 'Pipeline validates and at least one debug run succeeds.', validateKey: 'successful-run',
        hint: 'The top command bar contains Validate and Debug.', solutionText: 'A successful run should show Copy → Notebook → Dataflow → Stored procedure, all green.',
        apply: { page: 'pipeline' }
      }
    ]
  },
  {
    id: 'turbine-realtime',
    title: 'Wind turbine telemetry: streaming to maintenance alerts',
    subtitle: 'Ingest sensor events, engineer features, score anomalies and write operational alerts.',
    industry: 'Renewable energy / IoT',
    difficulty: 'Intermediate',
    duration: '55–70 min',
    purpose: 'Teach how streaming ingestion differs from batch ELT and how orchestration combines real-time and scheduled processing.',
    scenario: 'Wind turbines emit vibration, temperature, RPM and power telemetry. Operations wants near-real-time anomaly flags plus a durable history for analysis.',
    learningGoals: [
      'Understand event streams vs batch files',
      'Persist raw telemetry before feature engineering',
      'Use a notebook for time-series feature generation',
      'Route records with conditional logic',
      'Separate analytical tables from operational alerts',
      'Read run metrics such as throughput and rejected rows'
    ],
    tools: ['Fabric Real-Time Intelligence', 'Eventstream', 'Lakehouse', 'Notebook', 'If Condition', 'Stored procedure', 'Warehouse', 'Monitor'],
    architecture: [
      { from: 'IoT sensors', to: 'Fabric Eventstream', label: 'Streaming source' },
      { from: 'Fabric Eventstream', to: 'Bronze telemetry', label: 'Event destination' },
      { from: 'Bronze telemetry', to: 'Feature table', label: 'Notebook' },
      { from: 'Feature table', to: 'Risk branch', label: 'If Condition' },
      { from: 'Risk branch', to: 'Maintenance alerts', label: 'Stored procedure' }
    ],
    engineeringDecision: { productionScale: 'Production scenario: multi-TB historical telemetry plus continuous event streams', learningSample: '3 representative turbine events', preferred: 'Eventstream for ingestion; Spark is justified for very large historical feature engineering; SQL/dbt remain useful downstream', avoid: 'Do not use pandas for multi-TB production history, and do not force Spark into small alert lookups or warehouse models', rationale: 'This case deliberately separates distributed feature processing from operational branching and downstream relational modeling.' },
    brief: {
      businessProblem: 'Operations wants early warning for abnormal turbine behavior without turning every event into an alert. The platform must handle replay, schema drift, late events and large historical feature processing while keeping operational actions explainable.',
      stakeholders: ['Wind operations center', 'Maintenance planners', 'Reliability engineers', 'Data platform team'],
      sourceSystems: [
        { name: 'Turbine telemetry', kind: 'JSON / event stream', cadence: 'Continuous', productionScale: 'Several TB/day across many turbines', simulatorSample: '3 representative sensor events' },
        { name: 'Asset reference + maintenance history', kind: 'Relational / Delta reference', cadence: 'Daily and event-driven', productionScale: 'Small-to-medium reference sets', simulatorSample: 'Representative asset context' }
      ],
      serviceLevels: { freshness: 'High-risk events visible to operations within 2 minutes.', recovery: 'Replay from durable Bronze/checkpoint after consumer or schema failure.', quality: 'event_id unique; timestamps valid; critical sensors present or explicitly rescued/quarantined.', cost: 'Use continuous compute only for latency that needs it; use triggered/file-arrival patterns where minutes of latency are acceptable.' },
      dataContracts: [
        { object: 'iot.turbine_events', owner: 'IoT ingestion', rules: ['event_id unique', 'turbine_id not null', 'event_ts parseable', 'sensor values within plausible ranges or routed to rescued/quarantine data'] },
        { object: 'silver.turbine_features', owner: 'Data engineering', rules: ['deduplicated by event_id', 'feature columns derived deterministically', 'risk_score between 0 and 1'] },
        { object: 'gold turbine risk / alerts', owner: 'Operations analytics', rules: ['only validated features feed alerts', 'alert threshold is explicit', 'replayed events do not create duplicate operational actions'] }
      ],
      acceptanceCriteria: [
        { id: 'turbine-bronze', title: 'Telemetry landing exists', description: 'A learner-created Bronze telemetry table exists.', evidence: { kind: 'table', objects: ['bronze.fabric_turbine_events', 'bronze.dbx_turbine_events'], minRows: 1 } },
        { id: 'turbine-silver', title: 'Feature table exists', description: 'A learner-created Silver feature table exists.', evidence: { kind: 'table', objects: ['silver.fabric_turbine_features', 'silver.dbx_turbine_features'], minRows: 1 } },
        { id: 'turbine-serving', title: 'Operational risk output exists', description: 'A Gold risk/serving result exists.', evidence: { kind: 'table', objects: ['gold.fabric_turbine_risk', 'gold.dbx_turbine_risk'], minRows: 1 } },
        { id: 'turbine-lineage', title: 'Telemetry lineage is visible', description: 'Live lineage connects ingestion to curated/serving telemetry.', evidence: { kind: 'lineage', objects: ['silver.fabric_turbine_features', 'silver.dbx_turbine_features', 'gold.fabric_turbine_risk', 'gold.dbx_turbine_risk'] } },
        { id: 'turbine-recovery', title: 'Recovery evidence exists', description: 'A checkpoint captures a safe operational state.', evidence: { kind: 'checkpoint' } }
      ],
      incident: { title: 'Replay plus schema drift during a firmware rollout', symptom: 'Duplicate event_ids appear while firmware_version arrives unexpectedly and some gearbox temperatures are missing.', rootCause: 'A producer retry replays events and the new firmware changes the payload before the consumer contract is updated.', containment: 'Preserve raw payloads, rescue/quarantine unexpected fields, block invalid features from alerting, and avoid duplicate actions.', recovery: 'Update the accepted schema/feature logic, restart from checkpoint, deduplicate by event_id, and verify alert idempotency.', prevention: 'Use explicit schema-evolution policy, data-quality expectations, replay-safe keys and operational monitoring on rescued data.' }
    },
    tables: turbineTables,
    notebook: [
      { id: 'm1', language: 'markdown', source: '# Turbine feature engineering\nCompute rolling baselines and a simple anomaly score for each turbine.' },
      { id: 'p1', language: 'python', source: "events = spark.read.table('iot.turbine_events')\nw = Window.partitionBy('turbine_id').orderBy('event_ts').rowsBetween(-20, 0)\nfeatures = (events\n .withColumn('vib_avg', F.avg('vibration_mm_s').over(w))\n .withColumn('vibration_zscore', (F.col('vibration_mm_s') - F.col('vib_avg')) / F.lit(1.5))\n .withColumn('temperature_delta', F.col('gearbox_temp_c') - F.lit(65.0))\n .withColumn('risk_score', F.least(F.lit(1.0), F.abs('vibration_zscore') / 4 + F.greatest(F.lit(0.0), F.col('temperature_delta')) / 40)))\nfeatures.write.mode('append').saveAsTable('silver.turbine_features')", output: 'Simulated Spark micro-batch: 3 events processed, 1 risk_score > 0.80.' },
      { id: 's1', language: 'sql', source: "SELECT turbine_id, event_ts, risk_score\nFROM silver.turbine_features\nWHERE risk_score > 0.80\nORDER BY event_ts DESC;", output: 'WT-07 | 2026-09-16 19:31:13 | 0.91' }
    ],
    storedProcedureName: 'ops.usp_open_maintenance_alert',
    storedProcedure: `CREATE OR ALTER PROCEDURE ops.usp_open_maintenance_alert\n  @turbine_id VARCHAR(30), @risk_score FLOAT AS\nBEGIN\n  INSERT INTO ops.maintenance_alerts(turbine_id, opened_at, risk_score, severity)\n  VALUES(@turbine_id, SYSUTCDATETIME(), @risk_score,\n         CASE WHEN @risk_score >= 0.9 THEN 'High' ELSE 'Medium' END);\nEND;`,
    steps: [
      {
        id: 't1', title: 'Create the streaming ingress',
        instruction: 'Add an Eventstream item to the canvas and configure source = IoT telemetry, destination = Lakehouse iot.turbine_events.',
        why: 'Streaming systems ingest continuously and preserve event time. A durable landing zone lets you replay and recompute later.',
        concept: 'Streaming ingestion and event time', expected: 'Configured Eventstream node exists.', validateKey: 'turbine-eventstream',
        hint: 'Choose Real-Time > Eventstream in the activity palette.', solutionText: 'IoT telemetry → Eventstream → Lakehouse iot.turbine_events.',
        apply: { addNode: { type: 'eventstream', name: 'Ingest_Turbine_Telemetry', x: 80, y: 150, config: { source: 'IoT telemetry', destination: 'Lakehouse iot.turbine_events', mode: 'Continuous' } } }
      },
      {
        id: 't2', title: 'Engineer time-series features',
        instruction: 'Add a Notebook named Score_Turbine_Risk after the Eventstream. Configure notebook NB_Turbine_Features.',
        why: 'Raw sensor values become more useful when contextualized with rolling averages, rates of change and anomaly features.',
        concept: 'Feature engineering', expected: 'Notebook is configured and connected after Eventstream.', validateKey: 'turbine-notebook',
        hint: 'Connect with a Succeeded dependency for the simulated micro-batch.', solutionText: 'Eventstream → Notebook NB_Turbine_Features.',
        apply: { addNode: { type: 'notebook', name: 'Score_Turbine_Risk', x: 360, y: 150, config: { notebook: 'NB_Turbine_Features', output: 'silver.turbine_features' } }, connectTypes: ['eventstream', 'notebook'] }
      },
      {
        id: 't3', title: 'Route only risky assets',
        instruction: 'Add an If Condition after the notebook. Expression: @greater(activity(\'Score_Turbine_Risk\').output.maxRisk, 0.8).',
        why: 'Control-flow activities decide which path to execute. They should orchestrate business logic, not replace data transformations.',
        concept: 'Control flow vs data flow', expected: 'If Condition contains a risk threshold expression and follows Notebook.', validateKey: 'turbine-if',
        hint: 'The expression can reference an upstream activity output.', solutionText: "If @greater(activity('Score_Turbine_Risk').output.maxRisk, 0.8) then create an alert.",
        apply: { addNode: { type: 'if', name: 'Risk_Above_Threshold', x: 640, y: 150, config: { expression: "@greater(activity('Score_Turbine_Risk').output.maxRisk, 0.8)", truePath: 'Open alert', falsePath: 'No action' } }, connectTypes: ['notebook', 'if'] }
      },
      {
        id: 't4', title: 'Write an operational alert',
        instruction: 'Add Stored procedure after the If Condition. Configure ops.usp_open_maintenance_alert.',
        why: 'Operational alerts often need transactional writes into a curated operational table, while the full telemetry history remains in the lakehouse.',
        concept: 'Serving patterns for operations vs analytics', expected: 'Stored procedure is configured and downstream of the condition.', validateKey: 'turbine-sp',
        hint: 'Use @turbine_id and @risk_score parameters.', solutionText: 'Call ops.usp_open_maintenance_alert with the risky turbine and score.',
        apply: { addNode: { type: 'storedProcedure', name: 'Open_Maintenance_Alert', x: 920, y: 150, config: { connection: 'Operations Warehouse', procedure: 'ops.usp_open_maintenance_alert', parametersJson: '[{\"name\":\"turbine_id\",\"type\":\"String\",\"value\":\"@activity(\'Score_Turbine_Risk\').output.turbine_id\",\"nullable\":false},{\"name\":\"risk_score\",\"type\":\"Float\",\"value\":\"@activity(\'Score_Turbine_Risk\').output.maxRisk\",\"nullable\":false}]' } }, connectTypes: ['if', 'storedProcedure'] }
      },
      {
        id: 't5', title: 'Debug and read the run',
        instruction: 'Validate and Debug. In the run output, identify throughput, the max risk score, and the branch taken.',
        why: 'A data engineer must reason about operational behavior as well as code: latency, volume, branching, retries and failure context.',
        concept: 'Observability and run diagnostics', expected: 'A successful debug run is recorded.', validateKey: 'successful-run',
        hint: 'Run details appear in the bottom Output panel and Monitor page.', solutionText: 'The simulated run should process 3 events, max risk 0.91, take the True branch, and create one alert.',
        apply: { page: 'pipeline' }
      }
    ]
  },
  {
    id: 'erp-incremental',
    title: 'ERP incremental ingestion: watermark + SCD Type 2',
    subtitle: 'Build a reusable incremental pipeline with Lookup, ForEach, Copy Job and a warehouse MERGE.',
    industry: 'ERP / Finance',
    difficulty: 'Advanced',
    duration: '65–85 min',
    purpose: 'Teach scalable incremental ingestion, metadata-driven orchestration and slowly changing dimensions.',
    scenario: 'An ERP database changes throughout the day. Full reloads are too expensive. You must ingest only changed rows across multiple entities and preserve customer history.',
    learningGoals: [
      'Use watermarks and CDC concepts for incremental loads',
      'Use Lookup to read orchestration metadata',
      'Use ForEach to make one pipeline reusable across entities',
      'Understand Copy Job / incremental copy configuration',
      'Implement SCD Type 2 semantics in the warehouse',
      'Update a watermark only after successful processing'
    ],
    tools: ['Fabric Data Factory', 'Lookup', 'ForEach', 'Copy Job', 'dbt Job', 'Stored procedure', 'Warehouse', 'Schedule'],
    architecture: [
      { from: 'Control table', to: 'Lookup', label: 'Read watermark' },
      { from: 'Lookup', to: 'ForEach entity', label: 'Metadata-driven loop' },
      { from: 'ERP database', to: 'Lakehouse staging', label: 'Incremental Copy Job' },
      { from: 'Lakehouse staging', to: 'Conformed changes', label: 'dbt Job' },
      { from: 'Conformed changes', to: 'Warehouse dimensions/facts', label: 'SCD2 MERGE' },
      { from: 'Successful load', to: 'Control table', label: 'Advance watermark' }
    ],
    engineeringDecision: { productionScale: 'Incremental ERP changes across many relational entities', learningSample: '3 changed orders + control metadata', preferred: 'Fabric Pipeline + SQL/dbt incremental models + stored-procedure/SCD logic', avoid: 'Spark is unnecessary for metadata-driven relational CDC unless source volume and transformation complexity become genuinely distributed', rationale: 'The hard problem is safe state, idempotency, dependency management and dimensional history—not raw distributed compute.' },
    brief: {
      businessProblem: 'Finance needs fresh ERP orders and customer attributes without expensive full reloads. The platform must process only changes, preserve customer history, advance watermarks safely, and be rerunnable after partial failures.',
      stakeholders: ['Finance / controlling', 'ERP application team', 'Data warehouse team', 'Data platform operations'],
      sourceSystems: [
        { name: 'ERP sales_order', kind: 'Relational transactional table', cadence: 'Continuous changes; extract every 15 minutes', productionScale: 'Many entities with moderate relational volume', simulatorSample: '3 changed orders' },
        { name: 'ERP customer', kind: 'Relational master data', cadence: 'Change-driven', productionScale: 'Hundreds of thousands to millions of master rows', simulatorSample: '3 customer rows' },
        { name: 'control.watermarks', kind: 'Operational metadata table', cadence: 'Updated only after successful processing', productionScale: 'One row per incremental entity', simulatorSample: '2 watermark rows' }
      ],
      serviceLevels: { freshness: 'Curated ERP changes available within 30 minutes.', recovery: 'A failed entity can rerun without advancing unrelated watermarks or duplicating SCD versions.', quality: 'Business keys unique; watermark monotonic; SCD2 has exactly one current version per customer.', cost: 'Use metadata-driven incremental extraction and SQL/dbt; avoid full reloads and unnecessary distributed compute.' },
      dataContracts: [
        { object: 'control.watermarks', owner: 'Orchestration', rules: ['one row per entity', 'watermark advances only after successful downstream processing', 'reruns reuse the last successful boundary'] },
        { object: 'staging.customer_changes', owner: 'Analytics engineering', rules: ['customer_id unique per effective change', 'modified_at present', 'invalid duplicates fail promotion'] },
        { object: 'dw.dim_customer', owner: 'Warehouse team', rules: ['one current row per customer_id', 'closed versions keep valid_to', 'new versions preserve history'] }
      ],
      acceptanceCriteria: [
        { id: 'erp-ingest', title: 'Incremental staging exists', description: 'Learner-created ERP change staging/bronze tables exist.', evidence: { kind: 'table', objects: ['staging.fabric_customer_incremental', 'bronze.dbx_customer_changes', 'staging.customer_incremental'], minRows: 1 } },
        { id: 'erp-conform', title: 'Conformed customer changes exist', description: 'dbt/Lakeflow produces a curated change set.', evidence: { kind: 'table', objects: ['staging.fabric_customer_changes', 'silver.dbx_customer_cdc', 'staging.customer_changes'], minRows: 1 } },
        { id: 'erp-serving', title: 'Current customer serving result exists', description: 'A current customer dimension/serving projection exists.', evidence: { kind: 'table', objects: ['dw.fabric_dim_customer_current', 'gold.dbx_customer_current'], minRows: 1 } },
        { id: 'erp-lineage', title: 'Incremental lineage is visible', description: 'Live lineage proves a source/staging to curated/serving path.', evidence: { kind: 'lineage', objects: ['staging.fabric_customer_changes', 'silver.dbx_customer_cdc', 'dw.fabric_dim_customer_current', 'gold.dbx_customer_current'] } },
        { id: 'erp-recovery', title: 'Safe rerun point exists', description: 'A non-baseline checkpoint exists for recovery.', evidence: { kind: 'checkpoint' } }
      ],
      incident: { title: 'Watermark advanced after a partial customer-load failure', symptom: 'New customer changes are missing downstream while the control table indicates they were already processed.', rootCause: 'The watermark was advanced before the SCD2 merge and quality checks completed, and duplicate customer changes also entered staging.', containment: 'Stop watermark advancement, preserve the failed change set, quarantine duplicates, and block downstream publication.', recovery: 'Restore the safe checkpoint/watermark, repair the customer change set, rerun dbt/SCD2 idempotently, then advance state only after success.', prevention: 'Treat watermark updates as the final success action, enforce unique business-key tests, and test rerun/idempotency paths.' }
    },
    tables: erpTables,
    notebook: [
      { id: 'm1', language: 'markdown', source: '# Incremental-load audit\nUse SQL to verify that source rows changed after the stored watermark.' },
      { id: 's1', language: 'sql', source: "SELECT *\nFROM erp.sales_order\nWHERE modified_at > TIMESTAMP '2026-09-16 18:45:00'\nORDER BY modified_at;", output: '3 changed rows selected.' }
    ],
    storedProcedureName: 'dw.usp_merge_customer_scd2',
    storedProcedure: `CREATE OR ALTER PROCEDURE dw.usp_merge_customer_scd2 AS\nBEGIN\n  UPDATE d\n    SET valid_to = SYSUTCDATETIME(), is_current = 0\n  FROM dw.dim_customer d\n  JOIN staging.customer_changes s ON s.customer_id = d.customer_id\n  WHERE d.is_current = 1 AND d.customer_name <> s.customer_name;\n\n  INSERT INTO dw.dim_customer(customer_id, customer_name, valid_from, valid_to, is_current)\n  SELECT s.customer_id, s.customer_name, SYSUTCDATETIME(), NULL, 1\n  FROM staging.customer_changes s\n  LEFT JOIN dw.dim_customer d ON d.customer_id = s.customer_id AND d.is_current = 1\n  WHERE d.customer_id IS NULL OR d.customer_name <> s.customer_name;\nEND;`,
    steps: [
      {
        id: 'e1', title: 'Read the current watermark',
        instruction: 'Add Lookup and configure query: SELECT entity_name, last_successful_ts FROM control.watermarks.',
        why: 'The watermark is state. It marks the boundary between already processed and not-yet-processed source changes.',
        concept: 'Stateful incremental processing', expected: 'Lookup exists with the control query.', validateKey: 'erp-lookup',
        hint: 'Lookup is under General activities.', solutionText: 'Lookup_Watermarks reads control.watermarks.',
        apply: { addNode: { type: 'lookup', name: 'Lookup_Watermarks', x: 80, y: 150, config: { connection: 'Fabric Warehouse', query: 'SELECT entity_name, last_successful_ts FROM control.watermarks', firstRowOnly: false } } }
      },
      {
        id: 'e2', title: 'Loop through entities',
        instruction: 'Add ForEach after Lookup. Items: @activity(\'Lookup_Watermarks\').output.value. Enable sequential execution for the lab.',
        why: 'Metadata-driven orchestration lets one pattern process many tables instead of copying pipeline logic per entity.',
        concept: 'Metadata-driven pipelines', expected: 'ForEach is connected to Lookup and configured with Lookup output.', validateKey: 'erp-foreach',
        hint: 'Use the Lookup output array as ForEach items.', solutionText: "ForEach items = @activity('Lookup_Watermarks').output.value.",
        apply: { addNode: { type: 'foreach', name: 'ForEach_Entity', x: 340, y: 150, config: { items: "@activity('Lookup_Watermarks').output.value", sequential: true, batchCount: 1 } }, connectTypes: ['lookup', 'foreach'] }
      },
      {
        id: 'e3', title: 'Copy only changed rows',
        instruction: 'Add Copy Job after ForEach. Set mode = Incremental, watermark column = modified_at, destination = Lakehouse staging.',
        why: 'Incremental ingestion reduces source load, data movement and processing cost. The predicate should be derived from durable orchestration state.',
        concept: 'CDC / high-watermark ingestion', expected: 'Copy Job has incremental settings and follows ForEach.', validateKey: 'erp-copyjob',
        hint: 'Use the current ForEach entity and its last_successful_ts.', solutionText: 'Copy Job filters modified_at > last_successful_ts and lands changes to staging.',
        apply: { addNode: { type: 'copyJob', name: 'Copy_Changed_Rows', x: 600, y: 150, config: { source: 'ERP SQL', destination: 'Lakehouse staging', mode: 'Incremental', watermarkColumn: 'modified_at', watermarkValue: '@item().last_successful_ts' } }, connectTypes: ['foreach', 'copyJob'] }
      },
      {
        id: 'e4', title: 'Conform the change set with dbt',
        instruction: 'Add a dbt Job after Copy Job. Run dbt build against the training project so the staging model materializes staging.customer_changes and its tests run.',
        why: 'dbt is useful when transformations are SQL-first, dependency-aware, testable, and should be organized as versionable models rather than embedded pipeline SQL.',
        concept: 'SQL transformation projects and model tests', expected: 'A dbt Job follows Copy Job and runs dbt build.', validateKey: 'erp-dbt',
        hint: 'Choose dbt Job from Transform and leave command = dbt build.', solutionText: 'Copy Job → dbt Job. The project builds staging.customer_changes and a curated gold model, then evaluates not-null/unique tests.',
        apply: { addNode: { type: 'dbt', name: 'Build_ERP_Models', x: 850, y: 150, config: { project: 'dbt_erp_incremental', command: 'dbt build', target: 'dev', variables: '{}' } }, connectTypes: ['copyJob', 'dbt'] }
      },
      {
        id: 'e5', title: 'Preserve customer history',
        instruction: 'Add Stored procedure and configure dw.usp_merge_customer_scd2.',
        why: 'SCD Type 2 closes the old version and inserts a new row so historical facts can resolve to the dimension attributes that were valid at that time.',
        concept: 'Slowly changing dimensions', expected: 'Stored procedure follows the dbt Job and targets the SCD2 procedure.', validateKey: 'erp-sp',
        hint: 'The procedure should only run after the conformed staging data is ready.', solutionText: 'dbt Job → dw.usp_merge_customer_scd2.',
        apply: { addNode: { type: 'storedProcedure', name: 'Merge_Customer_SCD2', x: 1100, y: 150, config: { connection: 'Fabric Warehouse', procedure: 'dw.usp_merge_customer_scd2' } }, connectTypes: ['dbt', 'storedProcedure'] }
      },
      {
        id: 'e6', title: 'Prove the pipeline operationally',
        instruction: 'Validate and Debug. Confirm the run processes only rows newer than the watermark and completes all activities.',
        why: 'The design is only correct if state advances safely after success and retries do not silently duplicate or skip data.',
        concept: 'Idempotency, retries and observability', expected: 'At least one successful debug run exists.', validateKey: 'successful-run',
        hint: 'Use the Monitor page to inspect the activity sequence.', solutionText: 'A successful run should read the watermark, iterate entities, copy changes, build/test dbt models, then apply the SCD2 merge.',
        apply: { page: 'pipeline' }
      }
    ]
  }
];

export const getCaseStudy = (id: string) => caseStudies.find((c) => c.id === id) ?? caseStudies[0];
