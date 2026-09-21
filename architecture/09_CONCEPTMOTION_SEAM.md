> Implementation update: cleanup + M2 and subsequent V1 code are already applied. This document retains design/component-delivery context. For current execution and qualification truth, read `docs/v1/RELEASE_STATUS.md` from the repository root.

# ConceptMotion integration seam

## Goal

Reuse the existing ConceptMotion semantic/figure system as a Datapass visual-explanation resource instead of building one-off animation components per lab.

Relevant donor repos already audited:

- `julian-passebecq/react_ms_fluent_2_framework`
- `julian-passebecq/Fluent2_J_VisualAlgo`

The donor framework already demonstrates semantic families for loop/algorithm state, table state, joins, collection flow, workflow/DAG state, diagrams and synchronized explanation tracks.

## V1 integration principle

Datapass owns a focused `figure`/visual-explanation resource. The figure renderer is presentation-only unless explicitly bound to real runtime evidence.

Useful first figures:

1. inner/left join pairing + NULL extension;
2. filter/group/window table transformations;
3. batching/partition concepts;
4. pipeline DAG task-state progression;
5. lineage/data-flow explanation;
6. Spark wide/narrow + shuffle/skew concepts;
7. selected Python interview patterns that directly support Arena.

## Do not

- copy the standalone visual consumer app into Datapass;
- create bespoke SVG/canvas engines per concept;
- make animation state a second execution truth;
- build a full general DSA product during V1;
- block V1 on cross-repo package publication.

## Integration sequence

1. finish workspace resource ownership;
2. establish a narrow FigureResource host contract;
3. materialize the pinned shared figure/runtime packages or vendor only the required supported boundary with attribution/license review;
4. integrate 2–3 high-value data figures first;
5. add Arena/Spark figures only after the host is proven.
