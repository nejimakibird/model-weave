# FORMAT-dfd_diagram

Japanese Version: [日本語版](../ja/formats/FORMAT-dfd_diagram.md)

## What this is for

`dfd_diagram` defines a DFD / flow-oriented overview diagram.

Use this format when you want to describe:

* data flow between systems
* data flow between processes and stores
* context diagrams
* high-level system interaction diagrams
* external system integration diagrams
* lightweight business data flow
* process-to-data-store relationships
* flow views that connect reusable `dfd_object` definitions

A `dfd_diagram` is for the diagram-level view.

Use `dfd_object` when you want to define a reusable object in detail.
Use `data_object` when you want to define the structure of data carried by a flow.
Use `app_process` when you want to define detailed processing logic behind a process node.

## Important concept: Mermaid-first DFD

`dfd_diagram` is Mermaid-first.

This means:

* DFD diagrams are rendered primarily through Mermaid.
* The legacy custom DFD renderer is not the main runtime path.
* The Markdown format remains Model Weave Markdown.
* Mermaid, SVG, and PNG are generated views.

`render_mode` does not change the Markdown source format.

Use `dfd_diagram` as a text-first source, and let Model Weave generate the Mermaid-based view.

## Important concept: diagram vs reusable object

`dfd_diagram` and `dfd_object` have different roles.

Use `dfd_object` to define what an object is.

Use `dfd_diagram` to define how objects are connected by flows.

For example:

* `dfd_object`: defines "Warehouse User"
* `dfd_object`: defines "Inventory Search Process"
* `dfd_object`: defines "Inventory Data Store"
* `dfd_diagram`: connects those objects with flows such as "Search Condition" and "Search Result"

A `dfd_diagram` may use reusable `dfd_object` files, but it may also define local diagram objects when a lightweight diagram is enough.

## Important concept: Objects and Flows

A `dfd_diagram` mainly has two structured sections:

* `## Objects`: nodes included in the diagram
* `## Flows`: directed flows between those nodes

`Objects.id` defines the node ID used inside the diagram.

`Flows.from` and `Flows.to` reference `Objects.id`.

This is different from `class_diagram` and `er_diagram`, where relations may be collected from referenced object files.

In a `dfd_diagram`, diagram-level flows are normally written directly in the diagram file.

## Minimal example

```markdown
---
type: dfd_diagram
id: DFD-INVENTORY-SEARCH-L0
name: Inventory Search DFD
render_mode: mermaid
tags:
  - DFD
---

# Inventory Search DFD

## Summary

High-level data flow for inventory search.

## Objects

| id | label | kind | ref | notes |
|---|---|---|---|---|
| user | Warehouse User | external_entity |  | User searching inventory |
| process | Inventory Search Process | process | [[DFD-PROC-INVENTORY-SEARCH]] | Search process |
| store | Inventory Data Store | datastore | [[DFD-STORE-INVENTORY]] | Inventory data |

## Flows

| from | to | label | data | notes |
|---|---|---|---|---|
| user | process | Search condition | [[DATA-INVENTORY-SEARCH-CONDITION]] | User enters search condition |
| process | store | Inventory query |  | Query inventory |
| store | process | Inventory rows | [[DATA-INVENTORY-SEARCH-RESULT]] | Search result rows |
| process | user | Search result | [[DATA-INVENTORY-SEARCH-RESULT]] | Show result |
```

## Full example

```markdown
---
type: dfd_diagram
id: DFD-WMS-L0
name: WMS Level 0 DFD
render_mode: mermaid
tags:
  - DFD
  - WMS
---

# WMS Level 0 DFD

## Summary

Level 0 data flow overview for warehouse management.

## Objects

| id | label | kind | ref | notes |
|---|---|---|---|---|
| warehouse_user | Warehouse User | external_entity |  | User operating warehouse screens |
| inventory_search | Inventory Search Process | process | [[DFD-PROC-INVENTORY-SEARCH]] | Search inventory |
| inventory_reserve | Inventory Reserve Process | process | [[DFD-PROC-INVENTORY-RESERVE]] | Reserve inventory |
| inventory_store | Inventory Data Store | datastore | [[DFD-STORE-INVENTORY]] | Inventory persistence |
| order_system | Order System | external_entity | [[DFD-EXT-ORDER-SYSTEM]] | External order source |

## Flows

| from | to | label | data | notes |
|---|---|---|---|---|
| warehouse_user | inventory_search | Search condition | [[DATA-INVENTORY-SEARCH-CONDITION]] | Search request |
| inventory_search | inventory_store | Inventory query |  | Query inventory data |
| inventory_store | inventory_search | Inventory result | [[DATA-INVENTORY-SEARCH-RESULT]] | Search result |
| inventory_search | warehouse_user | Search result | [[DATA-INVENTORY-SEARCH-RESULT]] | Display result |
| order_system | inventory_reserve | Reservation request | [[DATA-INVENTORY-RESERVE-REQUEST]] | External reservation |
| inventory_reserve | inventory_store | Reserve inventory | [[DATA-INVENTORY-RESERVE-COMMAND]] | Update inventory |
| inventory_store | inventory_reserve | Reservation result | [[DATA-INVENTORY-RESERVE-RESULT]] | Reservation result |
| inventory_reserve | order_system | Reservation response | [[DATA-INVENTORY-RESERVE-RESULT]] | Return result |

## Source Links

| path | notes |
|---|---|
| docs/architecture/wms-context.md | Architecture note |
| src/inventory/ | Inventory implementation |

## Notes

- This diagram focuses on high-level data flow.
- Detailed process logic is modeled in `app_process`.
- Data carried by flows is modeled in `data_object`.
```

## Frontmatter

Required fields:

| field  | required | notes                        |
| ------ | -------- | ---------------------------- |
| `type` | yes      | Must be `dfd_diagram`.       |
| `id`   | yes      | Unique DFD diagram model ID. |
| `name` | yes      | Display name of the diagram. |

Optional fields:

| field         | notes                                                           |
| ------------- | --------------------------------------------------------------- |
| `render_mode` | Optional. Supported value is `mermaid`. DFD is Mermaid-first.   |
| `tags`        | Obsidian / Markdown tags.                                       |
| `level`       | Optional DFD level, such as `context`, `L0`, `L1`, or `detail`. |
| `scope`       | Optional system, domain, module, or feature scope.              |

Example:

```yaml
---
type: dfd_diagram
id: DFD-WMS-L0
name: WMS Level 0 DFD
render_mode: mermaid
tags:
  - DFD
  - WMS
---
```

## Render mode

`dfd_diagram` is Mermaid-first.

Allowed values:

* `mermaid`

`custom` should not be treated as the primary DFD runtime path.

Interpretation:

| value     | meaning                                         |
| --------- | ----------------------------------------------- |
| `mermaid` | Render the DFD as a Mermaid-based flow diagram. |

If `render_mode` is omitted, the format-specific default render mode from settings is used.

Deprecated or unsupported values such as `auto` should produce a warning and fall back to the format-specific default.

Notes:

* `render_mode` does not change the Markdown format.
* Mermaid output is a generated view.
* PNG export is derived from the rendered view.
* The legacy custom DFD renderer should not be documented as the recommended path.

## Sections

Recommended structure:

```text
# <diagram name>

## Summary

## Objects

## Flows

## Source Links

## Notes
```

### Summary

Use `## Summary` to describe the diagram purpose, scope, DFD level, and review intent.

This section is free text.

### Objects

Use `## Objects` to define nodes included in the DFD diagram.

Expected header:

```markdown
| id | label | kind | ref | notes |
|---|---|---|---|---|
```

Columns:

| column  | meaning                                                                                                         |
| ------- | --------------------------------------------------------------------------------------------------------------- |
| `id`    | Diagram-local object ID. Used by `Flows.from` and `Flows.to`.                                                   |
| `label` | Display label shown in the diagram.                                                                             |
| `kind`  | Object kind, such as `external_entity`, `process`, `datastore`, `system`, `subsystem`, `actor`, or `interface`. |
| `ref`   | Optional reference to a `dfd_object` or related model.                                                          |
| `notes` | Optional explanation.                                                                                           |

Example:

```markdown
## Objects

| id | label | kind | ref | notes |
|---|---|---|---|---|
| user | Warehouse User | external_entity |  | User searching inventory |
| process | Inventory Search Process | process | [[DFD-PROC-INVENTORY-SEARCH]] | Search process |
| store | Inventory Data Store | datastore | [[DFD-STORE-INVENTORY]] | Inventory data |
```

Notes:

* `id` should be stable within the diagram.
* `Flows.from` and `Flows.to` must reference `Objects.id`.
* Use `ref` when the object has a reusable `dfd_object` definition.
* `ref` may also point to related `app_process`, `screen`, `er_entity`, or system notes when useful.
* Use `label` for display text.

### Flows

Use `## Flows` to define directed data flows between objects.

Expected header:

```markdown
| from | to | label | data | notes |
|---|---|---|---|---|
```

Columns:

| column  | meaning                                                                               |
| ------- | ------------------------------------------------------------------------------------- |
| `from`  | Source object ID. Must match an `Objects.id`.                                         |
| `to`    | Target object ID. Must match an `Objects.id`.                                         |
| `label` | Flow label shown in the diagram.                                                      |
| `data`  | Optional data object, file, payload, message, or model reference carried by the flow. |
| `notes` | Optional explanation.                                                                 |

Example:

```markdown
## Flows

| from | to | label | data | notes |
|---|---|---|---|---|
| user | process | Search condition | [[DATA-INVENTORY-SEARCH-CONDITION]] | User input |
| process | store | Inventory query |  | Query inventory |
| store | process | Inventory result | [[DATA-INVENTORY-SEARCH-RESULT]] | Query result |
```

Rules:

* `from` and `to` are diagram-local object IDs.
* Do not put Wikilinks directly in `from` or `to`.
* Use `data` to reference the data carried by the flow.
* If a flow carries structured data, define it as `data_object`.
* Keep flow labels short and readable.

### Source Links

`## Source Links` is optional.

Use it to connect the DFD diagram to architecture documents, interface specifications, implementation folders, diagrams, source files, or test data.

Expected header:

```markdown
| path | notes |
|---|---|
```

Example:

```markdown
## Source Links

| path | notes |
|---|---|
| docs/architecture/wms-context.md | Architecture note |
| src/inventory/ | Inventory implementation |
```

For details, see [FORMAT-common-sections](FORMAT-common-sections.md).

### Notes

Use `## Notes` for free-form design notes.

Do not add unsupported columns to structured tables just to store extra information. Put extra information in `notes`, `## Notes`, or `## Source Links`.

## Tables

### Objects table

```markdown
| id | label | kind | ref | notes |
|---|---|---|---|---|
```

### Flows table

```markdown
| from | to | label | data | notes |
|---|---|---|---|---|
```

### Source Links table

```markdown
| path | notes |
|---|---|
```

## Object kinds

Typical `kind` values:

| kind              | meaning                                                                |
| ----------------- | ---------------------------------------------------------------------- |
| `external_entity` | External actor, organization, outside system, or external participant. |
| `process`         | Process or transformation node.                                        |
| `datastore`       | Data store, database, queue, file store, or persistent storage.        |
| `system`          | System-level object.                                                   |
| `subsystem`       | Subsystem or module.                                                   |
| `actor`           | Human or role actor.                                                   |
| `interface`       | API, endpoint, queue, file exchange, or external interface.            |

Use consistent values within the vault.

## Object kind rendering

The Mermaid DFD preview uses `Objects.kind` to choose a node shape.
Exact appearance may vary slightly by Obsidian / Mermaid version, but the current generated notation follows this behavior:

| kind | meaning | visual shape | notes |
|---|---|---|---|
| `external` | External actor, organization, outside system, or external participant. | External/default rectangle | Current supported external node kind. |
| `external_entity` | External actor, organization, outside system, or external participant. | Fallback/other rectangle | Current diagram parser treats this as an unknown diagram kind. |
| `actor` | Human or role actor. | Fallback/other rectangle | Current diagram parser treats this as an unknown diagram kind. |
| `process` | Process or transformation node. | Process rectangle | Main transformation/process shape. |
| `datastore` | Data store, database, queue, file store, or persistent storage. | Datastore/cylindrical shape | Rendered with Mermaid datastore-like notation. |
| `system` | System-level object. | Fallback/other rectangle | Current diagram parser treats this as an unknown diagram kind. |
| `subsystem` | Subsystem or module. | Fallback/other rectangle | Current diagram parser treats this as an unknown diagram kind. |
| `interface` | API, endpoint, queue, file exchange, or external interface. | Fallback/other rectangle | Current diagram parser treats this as an unknown diagram kind. |
| blank / unknown | Unspecified or unsupported object kind. | Fallback/other rectangle | Unknown values warn but should not break rendering. |

## Relationship with dfd_object

A `dfd_diagram` may reference reusable `dfd_object` files through `Objects.ref`.

The diagram defines the local diagram node and flows.
The `dfd_object` defines reusable object details.

This means:

* use `dfd_diagram.Objects` for diagram nodes
* use `dfd_diagram.Flows` for diagram-level data flows
* use `dfd_object` for reusable object descriptions
* use `Objects.ref` to connect the diagram node to the reusable object

## Relationship with data_object

A DFD flow often carries data.

Use `data_object` to define the structure of data carried by a flow.

Use `Flows.data` to reference that data object.

Example:

```markdown
## Flows

| from | to | label | data | notes |
|---|---|---|---|---|
| user | process | Search condition | [[DATA-INVENTORY-SEARCH-CONDITION]] | Search input |
```

## Relationship with app_process

A DFD process node may represent a high-level process.

If you need detailed processing behavior, create an `app_process` and reference it from either:

* `Objects.ref`
* `Objects.notes`
* related `dfd_object.Details`
* `Notes`

Use `dfd_diagram` for high-level data flow.
Use `app_process` for detailed Business Flow and process logic.

## Relationship with er_entity

A datastore node may correspond to one or more ER entities.

Use `er_entity` to define table and column details.

Reference related entities through:

* `Objects.ref` when the node maps directly to one entity
* `Objects.notes`
* related `dfd_object.Details`
* `Notes`

## Qualified Ref / Member Ref

`dfd_diagram` is primarily referenced as a whole diagram.

Examples:

```markdown
[[DFD-WMS-L0]]
[[DFD-INVENTORY-SEARCH-L0]]
```

`Objects.id` and `Flows` endpoints are diagram-local IDs.
They should not usually be treated as stable global member references.

If another model needs to reference a reusable process, data store, or external system, prefer referencing the related `dfd_object`, `app_process`, `data_object`, or `er_entity` directly.

## Reference handling

Structured fields that may carry useful references include:

* `Objects.ref`
* `Flows.data`
* `Source Links.path`
* prose references in `Summary` or `Notes`

Analyzers should prefer structured fields when available.

## Common mistakes

### Putting Wikilinks in Flow endpoints

`Flows.from` and `Flows.to` must reference `Objects.id`.

Avoid:

```markdown
| from | to | label | data | notes |
|---|---|---|---|---|
| [[DFD-USER]] | [[DFD-PROC-INVENTORY-SEARCH]] | Search | [[DATA-SEARCH]] | wrong endpoint form |
```

Prefer:

```markdown
| from | to | label | data | notes |
|---|---|---|---|---|
| user | process | Search | [[DATA-SEARCH]] | correct endpoint form |
```

### Defining reusable object details only in the diagram

If an object is reused across diagrams, create a `dfd_object`.

Keep diagram-local details in `dfd_diagram`, and reusable details in `dfd_object`.

### Defining data structures in Flows.data

Do not put full data field definitions in `Flows.data`.

Use `data_object` to define data structures, and reference it from `Flows.data`.

### Treating dfd_diagram as app_process

Do not model detailed process steps, decisions, subflows, or transitions in `dfd_diagram`.

Use `app_process` for detailed process behavior.

### Treating DFD as ER

DFD flows are not ER relationships.

Use DFD to describe movement of data between objects.
Use ER to describe table/entity relationships.

### Adding unsupported columns

Do not add columns such as `source`, `target`, `condition`, `rule`, `type`, or `description` unless the FORMAT explicitly defines them.

Use existing columns, `notes`, `## Notes`, or related model files.

### Unsafe table syntax

Avoid raw `|` characters inside table cells.

Avoid Wikilink aliases such as `[[DATA-SEARCH|Search Data]]` inside tables. Use `[[DATA-SEARCH]]` and put display meaning in `label` or `notes`.

## AI generation notes

When generating `dfd_diagram` files with AI:

* Use `type: dfd_diagram`.
* Preserve exact table headers.
* Do not add unsupported columns.
* Use `## Objects` to define diagram-local nodes.
* Use `## Flows` to define directed flows between nodes.
* Make sure every `Flows.from` and `Flows.to` value exists in `Objects.id`.
* Do not put Wikilinks in `Flows.from` or `Flows.to`.
* Use `Objects.ref` to reference reusable `dfd_object` files.
* Use `Flows.data` to reference `data_object` files.
* Use `dfd_object` for reusable object details.
* Use `data_object` for data structures carried by flows.
* Use `app_process` for detailed process behavior.
* Keep flow labels short and readable.
* Treat DFD as Mermaid-first.
* Put extra explanation in `notes` or `## Notes`.
* Use `## Source Links` for architecture docs, interface specs, implementation folders, source files, and test data.

If AI creates a DFD from source code, architecture notes, or interface specs, verify:

* object IDs
* object kinds
* flow endpoints
* flow direction
* flow labels
* data object references
* reusable object references
* Source Links

## Related samples

* [DFD basic samples](../../samples/dfd/basic/)
* [DFD local object samples](../../samples/dfd/local-objects/)
* [DFD samples index](../../samples/dfd/README.md)

## Related formats

* [dfd_object](FORMAT-dfd_object.md)
* [data_object](FORMAT-data_object.md)
* [app_process](FORMAT-app_process.md)
* [er_entity](FORMAT-er_entity.md)
* [er_diagram](FORMAT-er_diagram.md)
* [Common sections](FORMAT-common-sections.md)
