import type { ProjectCaseStudy } from '../types'

export const projectCaseStudies: Record<string, ProjectCaseStudy> = {
  'datapass-framework': {
    challenge: 'Multiple technical products needed a shared Microsoft-style application foundation without collapsing into one generic visual product.',
    solution: 'Centralize shell, workbench, editor, lineage, diagram and playback primitives in React/TypeScript while leaving product-specific content and composition to each consumer app.',
    flow: ['Shared Fluent 2 shell', 'Reusable technical primitives', 'Product-specific composition', 'Independent deployable apps'],
    engineering: [
      'Component contracts are reusable across learning, data and visualization products.',
      'Structured diagrams and figure playback stay separate from arbitrary generated SVG markup.',
      'The framework is intentionally a foundation, not a monolithic application.',
    ],
    proofPoints: ['Public framework repository and deployed site are both cataloged.', 'The same primitive families appear across multiple consumer apps.', 'The framework remains independently deployable from those consumers.'],
    tradeoffs: ['Shared primitives reduce duplication, but product-specific UX must not be flattened into a universal shell.', 'Framework promotion requires stable contracts; experimental UX should remain in product repos first.'],
    deliverable: 'A public framework site and reusable codebase that anchors the wider Datapass product family.',
  },
  'cloud-architecture': {
    challenge: 'Cloud architecture study material is often fragmented across provider documentation and static diagrams, which makes end-to-end data movement hard to reason about.',
    solution: 'Turn architecture into an interactive source-to-serve learning model covering movement, storage, processing, modeling, serving, lineage and operational failure modes.',
    flow: ['Source systems', 'Move / ingest', 'Store', 'Process', 'Model', 'Serve / observe'],
    engineering: [
      'Medallion and star-schema concepts are represented as connected system flows.',
      'Lineage is treated as both data lineage and KPI lineage.',
      'Retry, backfill and CDC are first-class operational scenarios rather than footnotes.',
    ],
    proofPoints: ['Public deployment and repository are both recorded.', 'The product models source-to-serve flow, lineage and operational failure scenarios.', 'Provider templates are explicitly a later extension rather than hidden scope.'],
    tradeoffs: ['A provider-neutral learning model is easier to understand but cannot replace exact Azure/AWS/GCP implementation details.', 'Interactive breadth must stay bounded to avoid becoming documentation duplication.'],
    deliverable: 'A deployed architecture lab with an active cleanup and provider-template roadmap.',
  },
  'pbi-bench': {
    challenge: 'Power BI engineering spans DAX, semantic models, PBIP/TMDL, Git and report changes, but those workflows are usually split across several tools.',
    solution: 'Design a focused engineering workbench around model inspection, DAX workflows, safe automation and source-controlled Power BI/Fabric project artifacts.',
    flow: ['PBIP / TMDL project', 'Model + DAX inspection', 'Safe C# automation', 'Lineage / validation', 'Git workflow'],
    engineering: [
      'PBIP and TMDL are treated as source artifacts rather than opaque desktop files.',
      'C# / Roslyn automation is constrained around safe, inspectable changes.',
      'The roadmap separates model/DAX foundations from later report-editing automation.',
    ],
    deliverable: 'A public implementation repository plus a related deployed theme/tooling preview; the core workbench remains a planned build.',
  },
  'contoso-forge': {
    challenge: 'Portfolio data-engineering demos need repeatable business data and realistic failure scenarios without depending on expensive cloud infrastructure.',
    solution: 'Build a local-first synthetic business-data generator and staged engineering lab, then export the same scenarios toward Fabric, ADF and Databricks.',
    flow: ['Synthetic business data', 'Failure injection', 'Local pipelines', 'Transform / validate', 'Cloud-target exporters'],
    engineering: [
      'The first milestone is deliberately a small runnable C# generator before the larger lab.',
      'Docker, Spark, Airflow, dbt and DuckDB are used as local engineering surfaces.',
      'Cloud exporters are downstream integrations, not prerequisites for the local lab.',
    ],
    deliverable: 'A public source repository with a staged V1 roadmap and a clear local-first implementation boundary.',
  },

  'contoso-data-fabric': {
    challenge: 'Fabric portfolio demos are easy to make visually convincing while hiding whether the underlying dataset, workspace structure and semantic layer are actually reusable.',
    solution: 'Use Contoso as a bounded business domain and make the Fabric-facing dataset, model and workspace assumptions explicit so the demo can be repeated and compared with local-first Contoso Forge scenarios.',
    flow: ['Contoso business entities', 'Fabric ingest / lakehouse', 'SQL / transformation', 'Semantic model', 'Power BI output'],
    engineering: [
      'The Fabric experiment is kept separate from the broader local-first generator so cloud-specific assumptions remain visible.',
      'Business entities and relationships are treated as reusable assets rather than report-only sample data.',
      'The project is positioned as a prototype until the canonical Fabric workspace flow is consolidated.',
    ],
    proofPoints: ['Public source repository recorded in the catalog.', 'Microsoft Fabric and Power BI are explicit implementation targets.', 'The project is cross-linked with the broader Contoso data-engineering family.'],
    tradeoffs: ['Cloud realism is intentionally bounded; it does not claim a production Fabric estate.', 'Some scenario duplication remains until the Contoso project family is consolidated.'],
    deliverable: 'A Fabric-oriented Contoso prototype that can become the cloud-facing evidence layer for the broader Contoso engineering portfolio.',
  },
  'fluent-microsoft-suite': {
    challenge: 'Microsoft-themed portfolio apps can quickly drift into unrelated UI experiments with inconsistent interaction patterns and unclear ownership between product and framework code.',
    solution: 'Use this repository as a bounded product-incubation surface: validate Fluent 2 patterns and Microsoft data-tool interactions, then promote stable primitives into the shared framework or a focused product.',
    flow: ['Product experiment', 'Fluent 2 interaction pattern', 'Validate usefulness', 'Promote or discard', 'Focused product surface'],
    engineering: [
      'The suite is explicitly treated as an incubation layer rather than another permanent framework.',
      'Reusable patterns should graduate into Datapass / Fluent 2 instead of being copied across projects.',
      'A product experiment needs a concrete user workflow before it is considered portfolio evidence.',
    ],
    proofPoints: ['Public source repository exists.', 'The project uses the same Fluent 2 visual language as the showcase.', 'Its next milestone explicitly requires a meaningful product surface.'],
    tradeoffs: ['Breadth is useful for experimentation but weakens product identity if not pruned.', 'The repository should not become a duplicate of the shared framework.'],
    deliverable: 'An active incubation repository for Microsoft-style product surfaces, with promotion criteria for reusable components and workflows.',
  },
  drawcloud: {
    challenge: 'Architecture diagrams are visually useful but usually lose machine-readable intent; JSON models are structured but difficult to author and inspect directly.',
    solution: 'Represent architecture as semantic JSON and build a visual workbench that can round-trip between intent and diagram state without making the rendered canvas the source of truth.',
    flow: ['Semantic architecture JSON', 'Visual workbench', 'Edit nodes / relationships', 'Validate model', 'Round-trip back to JSON'],
    engineering: [
      'The semantic model is intended to remain authoritative over visual coordinates.',
      'Round-trip integrity is the key technical gate, not merely rendering a diagram.',
      'The project complements Cloud Architecture Lab: one teaches architecture, the other explores authoring it.',
    ],
    proofPoints: ['Public source repository exists.', 'The project has a defined semantic JSON direction.', 'A concrete round-trip milestone is already recorded.'],
    tradeoffs: ['A diagram editor can become complex quickly, so the first milestone stays deliberately narrow.', 'Provider-specific icon coverage should follow semantic correctness rather than lead it.'],
    deliverable: 'A prototype architecture workbench whose next proof point is a real semantic JSON ↔ diagram round-trip.',
  },
  'foil-databricks': {
    challenge: 'A physics-oriented R&D workflow needs reproducible simulation inputs, layered transformations and execution evidence before BI outputs are trustworthy.',
    solution: 'Structure the workflow around validated inputs, Databricks execution, dbt layers, governed tables and explicit verification before dashboard consumption.',
    flow: ['FastAPI preflight', 'Simulation', 'Delta / Unity Catalog', 'dbt layers', 'Verification', 'AI/BI output'],
    engineering: [
      'Physical-model and resource assumptions are versioned instead of being hidden in ad-hoc notebooks.',
      'The job flow is explicitly simulate → dbt → verify.',
      'MLflow and execution evidence support repeatability and inspection.',
    ],
    deliverable: 'A source-backed Databricks R&D workflow currently gated on the first full real-environment execution.',
  },
  codedeleet: {
    challenge: 'Data-engineering interview preparation mixes executable SQL/Python tasks with BI, pipeline and cloud questions that cannot all be executed honestly in a browser.',
    solution: 'Separate the workstation into specialized labs and only execute what is genuinely local: DuckDB-Wasm for SQL and Pyodide for Python, with explicit simulation for DAX/cloud/system reasoning.',
    flow: ['Choose lab', 'Practice / design', 'Execute where honest', 'Inspect result / reasoning', 'Persist progress'],
    engineering: [
      'Real browser execution is clearly separated from simulated reasoning surfaces.',
      'Pipeline design, DAG investigation, model rendering and systems reasoning share one workstation shell.',
      'Drafts, notes, progress and history are persisted for repeated interview practice.',
    ],
    proofPoints: ['Public deployment and source repository are available.', 'DuckDB-Wasm and Pyodide provide genuine local execution where supported.', 'The workstation separates executable labs from simulated cloud/BI reasoning.'],
    tradeoffs: ['Browser execution improves accessibility but cannot reproduce a full Spark/Fabric/Azure runtime.', 'A multi-lab workstation needs strict navigation discipline to avoid becoming a feature dump.'],
    deliverable: 'A deployed workstation with a verified V2 baseline and an active V3 architecture handoff.',
  },
  atlasnote: {
    challenge: 'Long technical PDFs, notebooks and study material are hard to read when every tool behaves like an IDE or a simple linear document viewer.',
    solution: 'Create a reading-first knowledge workspace with structured content, compare/focus modes, local persistence and a progressively richer PDF/reference model.',
    flow: ['Import / open source', 'Structured tree', 'Focus or compare reading', 'References / dependencies', 'Persistent local workspace'],
    engineering: [
      'The reader prioritizes document navigation and knowledge structure over code-editor behavior.',
      'Local backup/restore keeps browser state portable without requiring a backend.',
      'The evolving reference tree is designed to link pages, concepts and dependent material across source types.',
    ],
    proofPoints: ['Public deployment and repository are cataloged.', 'Release-gate work covers PDF behavior, backup/restore and workspace state.', 'The reader has an explicit 1.2.x evolution line rather than an undefined prototype state.'],
    tradeoffs: ['Local-first persistence avoids backend complexity but limits cross-device synchronization.', 'A richer reference graph must not compromise the reading-first interaction model.'],
    deliverable: 'A deployed reader with a released baseline and an active 1.2.x reader/PDF evolution line.',
  },
  vizlens: {
    challenge: 'Visual charts and dashboards contain authoritative facts in DOM, SVG, tables and article text, while multimodal AI can be useful but should not silently replace deterministic extraction.',
    solution: 'Keep deterministic extraction authoritative and use Gemini only for bounded semantic selection/classification before host-side validation and renderer-neutral handoff.',
    flow: ['DOM / SVG / table extraction', 'Bounded AI selection', 'Host validation', 'Visual evidence JSON', 'VizForge / D3 / BI handoff'],
    engineering: [
      'Deterministic extraction owns factual values and geometry.',
      'AI output is constrained by a validated planning/classification contract.',
      'The output model stays renderer-neutral so downstream visualization systems can choose their own renderer.',
    ],
    deliverable: 'A personal Chrome-extension prototype with core/contract tests green and browser/live-key validation still pending.',
  },
  vizforge: {
    challenge: 'Analytical storytelling needs reusable visualization grammar and choreography rather than one-off D3 scripts for every story.',
    solution: 'Build a StorySpec-driven D3/SVG engine with reusable editorial visualization families and keyed transitions, then extend it toward camera and scrollytelling choreography.',
    flow: ['StorySpec', 'Data binding', 'Reusable visual family', 'Keyed transition', 'Presentation / scrollytelling'],
    engineering: [
      'Story intent is separated from low-level renderer implementation.',
      'Keyed transitions support stable animated state changes.',
      'The visualization engine remains independent from the broader ConceptMotion system.',
    ],
    deliverable: 'A deployed visualization engine with an active choreography and branch-cleanup roadmap.',
  },

  'deepnote-interview': {
    challenge: 'Interview preparation across Python, SQL, PySpark and architecture often becomes a pile of disconnected notebooks that is difficult to navigate and expensive to host.',
    solution: 'Constrain the learning product to Deepnote free-plan limits and organize it as three projects / nine notebooks with progressive theory, runnable examples and interview-oriented explanations.',
    flow: ['Select topic', 'Read concept', 'Run bounded example', 'Practice interview reasoning', 'Review across notebooks'],
    engineering: [
      'The information architecture is designed around the hosting constraint instead of fighting it.',
      'Conceptual material and executable exercises are intentionally separated where runtime support differs.',
      'The archived validation provides a repeatable quality gate for notebook structure and content integrity.',
    ],
    proofPoints: ['Three-project / nine-notebook structure is recorded.', 'The archived suite reports 109/109 validation checks.', 'Coverage spans Python, Pandas, SQL, PySpark and architecture.'],
    tradeoffs: ['Deepnote is convenient for study but limits layout and offline ownership compared with the newer workstation projects.', 'Spark execution remains environment-dependent.'],
    deliverable: 'A validated Deepnote-native interview suite retained as a focused learning artifact and source for newer workstation content.',
  },
  'contoso-planning-studio': {
    challenge: 'Optimization demos often show a final schedule without making the baseline, constraints and feasibility evidence visible enough to trust the result.',
    solution: 'Present planning as a before/after workflow with explicit scenario inputs, optimized assignments, constraint audit output and exportable evidence.',
    flow: ['Scenario input', 'Baseline schedule', 'Optimization', 'Constraint audit', 'Before / after evidence'],
    engineering: [
      'The baseline remains visible so improvement is inspectable rather than asserted.',
      'Constraint evidence is treated as part of the result, not a hidden solver detail.',
      'The current project is intentionally local-first and does not claim a hosted production service.',
    ],
    proofPoints: ['Local source package is available.', 'The project contains baseline vs optimized views.', 'Constraint audit and scenario backup/export are part of the feature set.'],
    tradeoffs: ['Without a public deployment, runtime evidence must be captured carefully in the portfolio.', 'Optimization quality depends on scenario realism and constraint definitions.'],
    deliverable: 'A local optimization case study showing auditable before/after scheduling rather than only a solver output.',
  },
  'portfolio-main': {
    challenge: 'A technical portfolio can become a flat gallery of screenshots and buzzwords instead of showing progression, evidence and project depth.',
    solution: 'Organize the portfolio around the Analyst → BI → Cloud/Data Engineer narrative and connect project cards to source, live evidence, CV material and technical outcomes.',
    flow: ['Career narrative', 'Capability areas', 'Project evidence', 'CV / certifications', 'External source + live links'],
    engineering: [
      'Project evidence is prioritized over generic skill lists.',
      'The visual language is restrained and consistent with Microsoft/data product work.',
      'Screenshots and live links are curated as proof rather than decoration.',
    ],
    deliverable: 'The deployed primary professional portfolio at j.datapassj.com.',
  },
  'energy-kpi-studio': {
    challenge: 'Energy analytics is difficult to learn from KPI dashboards alone because the source systems, refresh patterns, relationships and engineering steps are usually hidden.',
    solution: 'Create bounded oil/gas and renewable case studies that expose the full data path from source generation through ADF movement, transformation, relationships and KPI design.',
    flow: ['Operational source data', 'ADF ingestion', 'Transform / model', 'Relationships', 'KPI lineage', 'Power BI / Fabric output'],
    engineering: [
      'Industry identity is expressed through the data model and small domain icons, not decorative scenery.',
      'Case studies start with data provenance and refresh behavior before visualization.',
      'ML/forecasting is intentionally a later layer after the engineering and KPI contracts are clear.',
    ],
    deliverable: 'A defined concept and roadmap; the first bounded ADF-to-KPI case study has not yet been released.',
  },
}

export function getProjectCaseStudy(projectId: string) {
  return projectCaseStudies[projectId]
}

export function hasProjectCaseStudy(projectId: string) {
  return Boolean(projectCaseStudies[projectId])
}
