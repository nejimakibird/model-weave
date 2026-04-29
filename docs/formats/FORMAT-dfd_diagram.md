# FORMAT-dfd_diagram

## Purpose

`dfd_diagram` defines a Data Flow Diagram that shows how data moves between external entities, processes, and datastores.

In a DFD, the primary question is: what data flows from where to where?

Therefore, the source of truth for data flows is the `## Flows` table inside the `dfd_diagram` file.

In V0.7, `dfd_diagram` is rendered through Mermaid `flowchart LR`. The legacy DFD custom renderer has been removed from the runtime path. DFD diagrams are treated as Mermaid-first / Mermaid-only at runtime.

## Core policy

- A `dfd_diagram` file has `type: dfd_diagram`.
- Objects included in the diagram are listed in `Objects`.
- Data flows are defined in `Flows`.
- `Objects` can contain both referenced `dfd_object` files and diagram-local objects.
- A local object without `ref` is valid.
- A non-empty unresolved `ref` is a diagnostics target.
- `Flows.from` and `Flows.to` resolve to `Objects.id` or `Objects.ref`.
- Missing nodes are not silently created from `Flows`.
- DFD Mermaid rendering does not use layout files.
- Markdown is the source of truth. Mermaid, SVG, PNG, and preview UI are derived output.

## Frontmatter

Required:

- `type`
- `id`
- `name`

Optional:

- `level`
- `render_mode`
- `tags`

Expected `level` values:

- `context`
- `0`
- `1`
- `2`
- ...

## render_mode

For compatibility with the shared rendering system, `dfd_diagram` accepts:

- `auto`
- `mermaid`
- `custom`

Interpretation:

- `auto`: resolves to Mermaid.
- `mermaid`: resolves to Mermaid.
- `custom`: does not use the legacy custom renderer; it should produce diagnostics and fall back to Mermaid.

The Viewer RenderMode selector is hidden for DFD diagrams because DFD is Mermaid-only at runtime.

Example:

```yaml
---
type: dfd_diagram
id: DFD-WMS-L0
name: WMS Level 0 DFD
level: 0
render_mode: auto
tags:
  - DFD
  - Diagram
---
```

## Recommended structure

```text
# <diagram name>

## Summary

## Objects

## Flows

## Notes
```

## Summary

Describe the scope, level, and relation to upper/lower diagrams.

## Objects

V0.7 preferred table:

```markdown
## Objects

| id | label | kind | ref | notes |
|---|---|---|---|---|
| CLIENT | Customer System | external |  | local external system |
| CONVERT | Data Conversion System | process | [[dfd/DFD-PROC-CONVERT]] | reusable dfd_object |
| WMS | Inventory Management System | process |  | local process |
| STOCK | Stock Data | datastore | [[dfd/DFD-STORE-STOCK]] | reusable datastore |
```

Columns:

- `id`
- `label`
- `kind`
- `ref`
- `notes`

### id

Diagram-local object ID. It can be referenced from `Flows.from` and `Flows.to`.

### label

Display label. This is the first priority for Mermaid node labels.

### kind

DFD object kind.

Expected values:

- `external`
- `process`
- `datastore`
- `other`

### ref

Optional reference to a reusable `dfd_object`.

- Empty `ref`: valid diagram-local object.
- Non-empty `ref`: reference to `dfd_object`; unresolved refs should produce diagnostics.

### notes

Optional notes.

## Local objects

An `Objects` row with an empty `ref` is a valid diagram-local object.

Use local objects for:

- Level 0 cross-organization diagrams
- early modeling before separate `dfd_object` files exist
- lightweight system integration sketches
- temporary or diagram-scoped nodes

An empty `ref` is not an error.

## Referenced dfd_object

If `ref` is present, the row links to a reusable `dfd_object`.

The referenced file may provide:

- `name`
- `kind`
- summary
- notes

However, `Objects.label` has priority for display labels.

## Old Objects format compatibility

Older ref-only `Objects` tables remain compatible:

```markdown
## Objects

| ref | notes |
|---|---|
| [[dfd/DFD-EXT-CUSTOMER]] | Customer |
| [[dfd/DFD-PROC-ORDER-RECEIVE]] | Order Receive |
| [[dfd/DFD-STORE-ORDER]] | Order Data |
```

For new files, templates, and samples, use the V0.7 format:

```markdown
| id | label | kind | ref | notes |
```

## Flows

Columns:

- `id`
- `from`
- `to`
- `data`
- `notes`

Meanings:

- `id`: optional flow identifier
- `from`: source object
- `to`: target object
- `data`: data being transferred; used as Mermaid edge label
- `notes`: conditions or notes

Example:

```markdown
## Flows

| id | from | to | data | notes |
|---|---|---|---|---|
| FLOW-INBOUND-PLAN | CLIENT | CONVERT | Inbound Plan Data | fixed-length |
| FLOW-INBOUND-CSV | CONVERT | WMS | Inbound Plan CSV | after conversion |
| FLOW-STOCK-REF | WMS | STOCK | Stock Inquiry | read |
```

## Flows.from / Flows.to resolution

Resolution order:

1. `Objects.id`
2. `Objects.ref` raw target / resolved target / resolved `dfd_object.id`
3. old ref-only compatibility value
4. unresolved

Example:

```markdown
## Objects

| id | label | kind | ref | notes |
|---|---|---|---|---|
| TESTNODE1 | Test Node 1 | process |  |  |
| TESTNODE2 | Test Node 2 | process |  |  |

## Flows

| id | from | to | data | notes |
|---|---|---|---|---|
| FLOW-L0-TEST | TESTNODE1 | TESTNODE2 | TESTDATA | test flow |
```

This renders an edge equivalent to:

```text
TESTNODE1 -- TESTDATA --> TESTNODE2
```

If `TESTNODE1` or `TESTNODE2` is not listed in `Objects`, Model Weave must not silently create missing nodes. It should produce diagnostics.

## Mermaid rendering

DFD diagrams are rendered with Mermaid `flowchart LR`.

Mermaid source is generated output. Users should not treat generated Mermaid source as the authoring source.

### Node ID policy

Do not use raw Model Weave IDs, wikilinks, Japanese labels, or paths directly as Mermaid node IDs.

Generate safe internal IDs such as:

```text
mw_n_0
mw_n_1
mw_n_2
```

Keep internal Mermaid node IDs separate from display labels.

### Label priority

1. `Objects.label`
2. resolved `dfd_object.name`
3. `Objects.id`
4. raw `ref`

### Edge label

Use `Flows.data`.

### kind and shape

`Objects.kind` may affect Mermaid node shape where supported.

Expected kinds:

- `external`
- `process`
- `datastore`
- `other`

## Custom renderer handling

In V0.7, the legacy DFD custom renderer has been removed from the runtime path.

- `dfd_diagram` is Mermaid-only at runtime.
- `render_mode: custom` should not activate the old custom renderer.
- It should produce diagnostics and fall back to Mermaid.
- `dfd_object` definition/detail view remains available.

`dfd_object` is a reusable single object definition. It is not the DFD diagram renderer.

## PNG export

DFD PNG export uses the currently rendered Mermaid diagram body.

Included:

- Mermaid-rendered diagram body

Excluded:

- toolbar
- diagnostics panel
- lower information panel
- resize handle

Export should fit the full diagram, not only the current zoom/pan viewport.

## Diagnostics candidates

Error candidates:

- duplicate `Objects.id`
- new-format `Objects` row with neither `id` nor `ref`
- unresolved `Flows.from`
- unresolved `Flows.to`

Warning candidates:

- non-empty unresolved `Objects.ref`
- missing `Objects.kind` that cannot be derived
- unknown `Objects.kind`
- `Flows.from` / `Flows.to` not listed in `Objects`
- `from == to`
- `external -> external`
- `external -> datastore`
- `datastore -> datastore`

Note candidates:

- empty `ref` treated as local object
- old `ref / notes` Objects format loaded in compatibility mode
- local and referenced objects mixed in the same diagram
- missing `render_mode` treated as `auto`

## Branching, merging, and loops

Branching is represented as multiple flow rows from the same source.

Merging is represented as multiple flow rows to the same target.

Loops are represented as multiple rows forming a cycle.

Self-loops (`from == to`) may be allowed but can produce a warning.

## Complete example

```markdown
---
type: dfd_diagram
id: DFD-WMS-L0
name: WMS Level 0 DFD
level: 0
render_mode: auto
tags:
  - DFD
  - Diagram
---

# WMS Level 0 DFD

## Summary

Main data flows between customer system, conversion system, inventory management system, and warehouse operation system.

## Objects

| id | label | kind | ref | notes |
|---|---|---|---|---|
| CLIENT | Customer System | external |  | fixed-length integration |
| CONVERT | Data Conversion System | process |  | fixed-length / CSV conversion |
| WMS | Inventory Management System | process |  | inventory, inbound, outbound |
| WORK | Warehouse Operation System | process |  | warehouse task execution |
| STOCK | Stock Data | datastore |  | inventory data |

## Flows

| id | from | to | data | notes |
|---|---|---|---|---|
| FLOW-INBOUND-PLAN | CLIENT | CONVERT | Inbound Plan Data | fixed-length |
| FLOW-INBOUND-CSV | CONVERT | WMS | Inbound Plan CSV | converted CSV |
| FLOW-WORK-INSTRUCTION | WMS | WORK | Work Instruction | CSV |
| FLOW-WORK-RESULT | WORK | WMS | Work Result | CSV |
| FLOW-STOCK-UPDATE | WMS | STOCK | Stock Update |  |

## Notes

- Level 0 shows major organization/system-level integrations.
- Detailed data fields should be defined with data_object / mapping.
```

## Not required in V0.7

- DFD custom renderer
- DFD layout files
- manual node coordinates
- direct editing of generated Mermaid source
- complete SVG click integration
- parent/child DFD drill-down structure
- automatic flow aggregation/splitting
- full data_object coverage validation
- automatic splitting of large DFDs
