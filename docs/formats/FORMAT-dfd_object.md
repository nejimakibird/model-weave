# FORMAT-dfd_object

Japanese Version: [日本語版](../ja/formats/FORMAT-dfd_object.md)

## What this is for

`dfd_object` defines one reusable object used in DFD / flow-oriented modeling.

Use this format when you want to describe:

* external entity
* process
* data store
* system
* subsystem
* actor
* interface endpoint
* reusable DFD node
* detailed notes for an object used by one or more DFD diagrams

A `dfd_object` is a reusable definition.

Use `dfd_diagram` when you want to create an actual DFD / flow overview that connects multiple objects with flows.

## Important concept: object definition vs diagram

`dfd_object` and `dfd_diagram` have different roles.

Use `dfd_object` to define what an object is.

Use `dfd_diagram` to define how objects are connected.

For example:

* `dfd_object`: defines "Inventory Search Process"
* `dfd_object`: defines "Inventory Database"
* `dfd_object`: defines "Warehouse User"
* `dfd_diagram`: connects these objects with flows such as "Search Condition" and "Search Result"

This separation makes the object reusable across multiple diagrams.

## Important concept: DFD object vs app_process

`dfd_object` and `app_process` can both describe process-like things, but they are not the same.

Use `dfd_object` when you need a node in a DFD-style overview.

Use `app_process` when you need detailed application processing logic, inputs, outputs, steps, flows, transitions, or Business Flow preview.

Typical use:

* `dfd_object`: high-level process node in a context diagram or DFD
* `app_process`: detailed processing model behind that node

A DFD process object may refer to an `app_process` when more detail is needed.

## Minimal example

```markdown
---
type: dfd_object
id: DFD-PROC-INVENTORY-SEARCH
name: Inventory Search Process
kind: process
tags:
  - DFD
---

# Inventory Search Process

## Summary

Process that receives inventory search conditions and returns inventory search results.

## Details

| key | value | notes |
|---|---|---|
| owner | Inventory module | Responsible module |
| related_process | [[PROC-INVENTORY-SEARCH]] | Detailed app process |
| related_data | [[DATA-INVENTORY-SEARCH-CONDITION]] | Input data |
```

## Full example

```markdown
---
type: dfd_object
id: DFD-STORE-INVENTORY
name: Inventory Data Store
kind: datastore
tags:
  - DFD
  - WMS
---

# Inventory Data Store

## Summary

Data store representing inventory-related persistent data.

## Details

| key | value | notes |
|---|---|---|
| owner | Inventory module | Responsible module |
| physical_store | database | Main persistence type |
| related_entity | [[ENT-INVENTORY]] | Inventory table |
| related_entity | [[ENT-STOCK-MOVEMENT]] | Stock movement history |

## Source Links

| path | notes |
|---|---|
| database/schema.sql | Database schema |
| src/inventory/InventoryRepository.ts | Repository implementation |

## Notes

- This object can be reused by multiple DFD diagrams.
- Detailed table structure is defined in ER entity files.
```

## Frontmatter

Required fields:

| field  | required | notes                           |
| ------ | -------- | ------------------------------- |
| `type` | yes      | Must be `dfd_object`.           |
| `id`   | yes      | Unique DFD object model ID.     |
| `name` | yes      | Display name of the DFD object. |

Optional fields:

| field   | notes                                                                                                           |
| ------- | --------------------------------------------------------------------------------------------------------------- |
| `kind`  | Object kind, such as `external_entity`, `process`, `datastore`, `system`, `subsystem`, `actor`, or `interface`. |
| `tags`  | Obsidian / Markdown tags.                                                                                       |
| `owner` | Optional owner, domain, module, or team.                                                                        |
| `scope` | Optional logical scope.                                                                                         |

Example:

```yaml
---
type: dfd_object
id: DFD-PROC-INVENTORY-SEARCH
name: Inventory Search Process
kind: process
tags:
  - DFD
---
```

## Sections

Recommended structure:

```text
# <dfd object name>

## Summary

## Details

## Source Links

## Notes
```

### Summary

Use `## Summary` to describe the purpose, role, boundary, and responsibility of the DFD object.

This section is free text.

### Details

Use `## Details` to describe object-level properties.

Expected header:

```markdown
| key | value | notes |
|---|---|---|
```

Columns:

| column  | meaning                            |
| ------- | ---------------------------------- |
| `key`   | Property name.                     |
| `value` | Property value or model reference. |
| `notes` | Optional explanation.              |

Example:

```markdown
## Details

| key | value | notes |
|---|---|---|
| owner | Inventory module | Responsible module |
| related_process | [[PROC-INVENTORY-SEARCH]] | Detailed app process |
| related_data | [[DATA-INVENTORY-SEARCH-CONDITION]] | Input data |
| related_entity | [[ENT-INVENTORY]] | Main table |
```

Common `key` examples:

* `owner`
* `system`
* `module`
* `boundary`
* `related_process`
* `related_data`
* `related_entity`
* `related_screen`
* `related_interface`
* `external_system`

Use `value` to point to related model files where useful.

### Source Links

`## Source Links` is optional.

Use it to connect the DFD object to implementation files, architecture documents, external interface specs, database definitions, service code, configuration, or test data.

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
| src/inventory/InventorySearchService.ts | Service implementation |
| docs/interfaces/inventory-search.md | Interface note |
```

For details, see [FORMAT-common-sections](FORMAT-common-sections.md).

### Notes

Use `## Notes` for free-form design notes.

Do not add unsupported columns to structured tables just to store extra information. Put extra information in `notes`, `## Notes`, or `## Source Links`.

## Tables

### Details table

```markdown
| key | value | notes |
|---|---|---|
```

### Source Links table

```markdown
| path | notes |
|---|---|
```

## Object kinds

`kind` describes how the object should be understood in DFD / flow-oriented diagrams.

Typical values:

| kind              | meaning                                                         |
| ----------------- | --------------------------------------------------------------- |
| `external_entity` | Actor, organization, external system, or outside participant.   |
| `process`         | Process or transformation node.                                 |
| `datastore`       | Data store, database, file store, queue, or persistent storage. |
| `system`          | System-level object.                                            |
| `subsystem`       | Subsystem or module.                                            |
| `actor`           | Human or role actor.                                            |
| `interface`       | External interface, endpoint, queue, file exchange, or API.     |

Use consistent values within the vault.

## Relationship with dfd_diagram

A `dfd_diagram` may reference `dfd_object` files in its object list.

The object definition lives in `dfd_object`.

The diagram-level flow lives in `dfd_diagram`.

This means:

* `dfd_object` defines reusable nodes
* `dfd_diagram` defines diagram scope and flows
* one `dfd_object` can appear in multiple DFD diagrams
* `dfd_diagram` should not be used as the only place to define reusable object details

## Relationship with data_object

DFD flows often carry data.

Use `data_object` to define the structure of data flowing between DFD objects.

Use `dfd_diagram` flows to reference those data objects.

Use `dfd_object` details to describe related data when it is part of the object's responsibility.

## Relationship with app_process

A DFD process object may represent a high-level process.

If you need detailed process behavior, create an `app_process` and link it from the DFD object or DFD diagram.

Example:

```markdown
## Details

| key | value | notes |
|---|---|---|
| related_process | [[PROC-INVENTORY-SEARCH]] | Detailed app process |
```

## Qualified Ref / Member Ref

`dfd_object` is primarily referenced as a whole object.

Examples:

```markdown
[[DFD-PROC-INVENTORY-SEARCH]]
[[DFD-STORE-INVENTORY]]
```

`Details.key` values are not usually treated as stable member references.

When other models need to refer to a specific reusable data structure, process, entity, or rule, reference that model directly rather than relying on `Details.key`.

## Reference handling

Structured fields that may carry useful references include:

* `Details.value`
* `Source Links.path`
* prose references in `Summary` or `Notes`

Analyzers should prefer structured fields when available.

## Common mistakes

### Using dfd_object as a diagram

Do not define a full DFD flow only inside `dfd_object`.

Use `dfd_diagram` for diagram-level flows.

### Putting detailed processing steps into dfd_object

Do not put detailed step-by-step application processing in `dfd_object`.

Use `app_process` for detailed process behavior.

### Defining data structures inside dfd_object

Do not define full payload fields or file layouts inside `dfd_object`.

Use `data_object` for data structures.

### Using inconsistent kind values

Avoid changing between similar names such as `data_store`, `datastore`, `store`, and `database` without a clear convention.

Pick a small set of kind values and use them consistently.

### Adding unsupported columns

Do not add columns such as `description`, `ref`, `type`, `source`, or `target` unless the FORMAT explicitly defines them.

Use `key`, `value`, `notes`, `## Notes`, or related model files.

### Unsafe table syntax

Avoid raw `|` characters inside table cells.

Avoid Wikilink aliases such as `[[PROC-INVENTORY|Inventory Process]]` inside tables. Use `[[PROC-INVENTORY]]` and put display meaning in `notes`.

## AI generation notes

When generating `dfd_object` files with AI:

* Use `type: dfd_object`.
* One file should define one reusable DFD object.
* Preserve exact table headers.
* Do not add unsupported columns.
* Use `kind` consistently.
* Use `## Summary` for the object role and responsibility.
* Use `## Details` for object-level properties and related model references.
* Use `dfd_diagram` for flows between objects.
* Use `data_object` for data structures carried by flows.
* Use `app_process` for detailed processing logic.
* Put extra explanation in `notes` or `## Notes`.
* Use `## Source Links` for implementation files, external specs, architecture documents, configuration, or test data.

If AI creates a DFD object from source code or architecture notes, verify:

* object kind
* object boundary
* related process references
* related data references
* related entity references
* Source Links

## Related samples

* [DFD basic samples](../../samples/dfd/basic/)
* [DFD local object samples](../../samples/dfd/local-objects/)
* [DFD samples index](../../samples/dfd/README.md)

## Related formats

* [dfd_diagram](FORMAT-dfd_diagram.md)
* [data_object](FORMAT-data_object.md)
* [app_process](FORMAT-app_process.md)
* [er_entity](FORMAT-er_entity.md)
* [Common sections](FORMAT-common-sections.md)
