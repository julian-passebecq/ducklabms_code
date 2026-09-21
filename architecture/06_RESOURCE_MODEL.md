# Workspace resource model — target V1

## Why this matters

The current branch already proves the correct abstraction: resources can be opened into views, tabs belong to panes, and views reference canonical source. Analytics M2 temporarily stores its project under the current notebook. The next large pass should reconcile those two models.

## Current branch foundation

Current workspace resource kinds already include:

- notebook reference;
- shared catalog;
- run evidence;
- workflow design;
- lineage design;
- data-model design.

Current view state owns presentation details such as selected graph items/positions/viewport. Resource state owns semantic content.

## Focused V1 target kinds

Do not make this an unbounded generic IDE registry. Add only data-product resources that have a V1 job:

```text
notebook
catalog / table reference
evidence / result
dbt project (+ files inside project)
pipeline / DAG
lineage
data model
chart board
figure / visual explanation
docs / lesson
exercise reference
```

## Ownership invariant

```text
Workspace resource  --canonical content-->  Resource
                                      ↓
                               one or more Views
                                      ↓
                                   Tabs
                                      ↓
                                   Panes
```

A tab is not a document copy. A pane is not a runtime. A skin is not an execution target.

## M2 migration

Current interim source:

`notebook.blockState['datapass:analytics:v1']`

Target migration requirements:

1. detect valid M2 attachment schema;
2. create workspace-owned dbt/model/chart resources once;
3. preserve original notebook identity as migration provenance, not ownership;
4. convert M2 tab/pane entries into resource-view references;
5. never create one dbt project per notebook merely because an attachment existed there;
6. preserve invalid/unknown attachment payload for recovery instead of silently resetting it;
7. mark migration version in saved workspace state;
8. ensure repeated reopen is idempotent;
9. only remove/ignore old attachment after successful workspace save;
10. add migration tests for one notebook, multiple notebooks and conflicting attachments.

## Pipeline ownership

Pipeline documents should also be workspace resources. Code view and DAG view are two views of the same pipeline resource/IR, not parallel documents.

## Figure ownership

A figure is presentation/teaching content, not execution evidence. It may bind to a lesson/exercise/resource ID but cannot claim observed runtime behavior unless fed actual evidence with an explicit truth kind.
