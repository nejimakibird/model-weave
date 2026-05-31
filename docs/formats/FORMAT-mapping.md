# FORMAT-mapping

Japanese Version: [日本語版](../ja/formats/FORMAT-mapping.md)

## What this is for

`mapping` defines how data is transformed or copied from one structure to another.

Use this format when you want to describe:

* source-to-target field mapping
* API request / response transformation
* file import mapping
* file export mapping
* screen-to-process data transfer
* process-to-database data mapping
* database-to-DTO mapping
* data object to data object transformation
* ER entity to data object mapping
* CodeSet value conversion
* rule-based transformation

A `mapping` file helps make data movement explicit.

It is useful for reviewing whether fields are missing, duplicated, transformed, or conditionally mapped.

## Important concept: mapping connects existing model elements

A `mapping` should usually connect existing model elements.

Typical sources and targets include:

* `data_object` fields
* `er_entity` columns
* screen fields
* app_process inputs / outputs
* CodeSet values
* external interface fields

A mapping should not replace the source or target definitions.

Use:

* `data_object` to define payloads, files, DTOs, and process data
* `er_entity` to define database tables and columns
* `screen` to define UI fields
* `app_process` to define process inputs and outputs
* `rule` to define reusable logic
* `mapping` to define how values move between them

## Important concept: transformation vs rule

`mapping` describes field-level data movement and transformation.

`rule` describes reusable business logic.

A mapping row may reference a rule when transformation logic is complex or reused.

Examples:

* Mapping: `source.customer_id` maps to `target.customer_id`
* Mapping: `source.status` maps to `target.inventory_status`
* Rule: status conversion rule
* Rule: amount calculation rule

Do not put large business rules directly into a mapping table.
Use `rule` and reference it when needed.

## Minimal example

```markdown
---
type: mapping
id: MAP-ORDER-REQUEST-TO-ENTITY
name: Order Request to Entity Mapping
kind: transform
tags:
  - Mapping
---

# Order Request to Entity Mapping

## Summary

Maps order request fields to the order entity.

## Sources

| id | ref | role | notes |
|---|---|---|---|
| SRC-ORDER-REQUEST | [[DATA-ORDER-REQUEST]] | source | API request payload |

## Targets

| id | ref | role | notes |
|---|---|---|---|
| TGT-ORDER | [[ENT-ORDER]] | target | Order table |

## Mappings

| id | source | target | transform | rule | condition | notes |
|---|---|---|---|---|---|---|
| MAP-ORDER-ID | [[DATA-ORDER-REQUEST]].order_id | [[ENT-ORDER]].order_id | copy |  |  |  |
| MAP-CUSTOMER-ID | [[DATA-ORDER-REQUEST]].customer_id | [[ENT-ORDER]].customer_id | copy |  |  |  |
```

## Full example

```markdown
---
type: mapping
id: MAP-INVENTORY-IMPORT
name: Inventory Import Mapping
kind: import
tags:
  - Mapping
  - WMS
---

# Inventory Import Mapping

## Summary

Maps an external inventory CSV file to inventory-related database entities.

## Sources

| id | ref | role | notes |
|---|---|---|---|
| SRC-INVENTORY-CSV | [[DATA-INVENTORY-IMPORT-FILE]] | source | External CSV import file |

## Targets

| id | ref | role | notes |
|---|---|---|---|
| TGT-INVENTORY | [[ENT-INVENTORY]] | target | Inventory table |
| TGT-STOCK-MOVEMENT | [[ENT-STOCK-MOVEMENT]] | target | Movement history table |

## Mappings

| id | source | target | transform | rule | condition | notes |
|---|---|---|---|---|---|---|
| MAP-SHIPPER | [[DATA-INVENTORY-IMPORT-FILE]].shipper_code | [[ENT-INVENTORY]].shipper_id | lookup shipper_id by code | [[RULE-SHIPPER-LOOKUP]] |  | External code conversion |
| MAP-WAREHOUSE | [[DATA-INVENTORY-IMPORT-FILE]].warehouse_code | [[ENT-INVENTORY]].warehouse_id | lookup warehouse_id by code | [[RULE-WAREHOUSE-LOOKUP]] |  | External code conversion |
| MAP-ITEM | [[DATA-INVENTORY-IMPORT-FILE]].item_code | [[ENT-INVENTORY]].item_id | lookup item_id by code | [[RULE-ITEM-LOOKUP]] |  | External code conversion |
| MAP-QTY | [[DATA-INVENTORY-IMPORT-FILE]].quantity | [[ENT-INVENTORY]].quantity | parse decimal |  |  | Convert text to numeric |
| MAP-STATUS | [[DATA-INVENTORY-IMPORT-FILE]].status | [[ENT-INVENTORY]].inventory_status | convert status | [[RULE-INVENTORY-STATUS-CONVERT]] |  | Maps external status to CodeSet value |
| MAP-MOVEMENT | [[DATA-INVENTORY-IMPORT-FILE]].quantity | [[ENT-STOCK-MOVEMENT]].movement_quantity | copy |  | quantity > 0 | Create movement row only when quantity exists |

## Source Links

| path | notes |
|---|---|
| specs/inventory-import.csv.md | Import file specification |
| src/import/InventoryImportMapper.ts | Mapping implementation |
| testdata/inventory-import-sample.csv | Sample import file |

## Notes

- Code conversion rules are kept in separate `rule` files.
- The mapping describes field movement, not the whole import process.
```

## Frontmatter

Required fields:

| field  | required | notes                        |
| ------ | -------- | ---------------------------- |
| `type` | yes      | Must be `mapping`.           |
| `id`   | yes      | Unique mapping model ID.     |
| `name` | yes      | Display name of the mapping. |

Optional fields:

| field   | notes                                                                                                                                |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `kind`  | Mapping kind, such as `transform`, `import`, `export`, `copy`, `sync`, `screen_to_process`, `process_to_entity`, or `entity_to_dto`. |
| `tags`  | Obsidian / Markdown tags.                                                                                                            |
| `owner` | Optional owner, domain, module, or team.                                                                                             |

Example:

```yaml
---
type: mapping
id: MAP-INVENTORY-IMPORT
name: Inventory Import Mapping
kind: import
tags:
  - Mapping
  - WMS
---
```

## Sections

Recommended structure:

```text
# <mapping name>

## Summary

## Sources

## Targets

## Mappings

## Source Links

## Notes
```

### Summary

Use `## Summary` to describe the purpose, direction, trigger context, and scope of the mapping.

This section is free text.

### Sources

Use `## Sources` to list source models or source structures used by the mapping.

Expected header:

```markdown
| id | ref | role | notes |
|---|---|---|---|
```

Columns:

| column  | meaning                                                                                              |
| ------- | ---------------------------------------------------------------------------------------------------- |
| `id`    | Source alias used in this mapping document.                                                          |
| `ref`   | Source model reference, such as a data object, ER entity, screen, process, file, or external source. |
| `role`  | Role such as `source`, `input`, `lookup`, `context`, or `external`.                                  |
| `notes` | Optional explanation.                                                                                |

Example:

```markdown
## Sources

| id | ref | role | notes |
|---|---|---|---|
| SRC-REQUEST | [[DATA-ORDER-REQUEST]] | source | API request |
| SRC-CURRENT-USER | current_user | context | Login user context |
```

### Targets

Use `## Targets` to list target models or target structures produced by the mapping.

Expected header:

```markdown
| id | ref | role | notes |
|---|---|---|---|
```

Columns:

| column  | meaning                                                                                                   |
| ------- | --------------------------------------------------------------------------------------------------------- |
| `id`    | Target alias used in this mapping document.                                                               |
| `ref`   | Target model reference, such as a data object, ER entity, screen, process, file, or external destination. |
| `role`  | Role such as `target`, `output`, `destination`, `insert`, `update`, or `external`.                        |
| `notes` | Optional explanation.                                                                                     |

Example:

```markdown
## Targets

| id | ref | role | notes |
|---|---|---|---|
| TGT-ORDER | [[ENT-ORDER]] | target | Order table |
| TGT-RESULT | [[DATA-ORDER-RESULT]] | output | API response |
```

### Mappings

Use `## Mappings` to define field-level mapping rows.

Expected header:

```markdown
| id | source | target | transform | rule | condition | notes |
|---|---|---|---|---|---|---|
```

Columns:

| column      | meaning                                                                                                   |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| `id`        | Mapping row ID.                                                                                           |
| `source`    | Source field, value, expression, or model reference.                                                      |
| `target`    | Target field, value, expression, or model reference.                                                      |
| `transform` | Transformation description. Use simple text such as `copy`, `format date`, `lookup`, or `convert status`. |
| `rule`      | Optional related `rule` reference.                                                                        |
| `condition` | Optional condition for applying this mapping.                                                             |
| `notes`     | Optional explanation.                                                                                     |

Example:

```markdown
## Mappings

| id | source | target | transform | rule | condition | notes |
|---|---|---|---|---|---|---|
| MAP-ORDER-ID | [[DATA-ORDER-REQUEST]].order_id | [[ENT-ORDER]].order_id | copy |  |  |  |
| MAP-STATUS | [[DATA-ORDER-REQUEST]].status | [[ENT-ORDER]].order_status | convert status | [[RULE-ORDER-STATUS-CONVERT]] |  | Code conversion |
| MAP-CREATED-BY | current_user.user_id | [[ENT-ORDER]].created_by | copy |  | create | Audit field |
```

Notes:

* `source` and `target` should be as specific as useful.
* Prefer qualified member references when mapping model fields.
* Use `rule` for complex or reusable logic.
* Use `condition` for row-level applicability.
* Use `notes` for details that do not belong in structured columns.

### Source Links

`## Source Links` is optional.

Use it to connect the mapping to implementation files, interface specifications, ETL scripts, SQL, mapping spreadsheets, sample files, or test data.

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
| specs/inventory-import-mapping.xlsx | Original mapping spreadsheet |
| src/import/InventoryImportMapper.ts | Mapping implementation |
| testdata/inventory-import-sample.csv | Sample import file |
```

For details, see [FORMAT-common-sections](FORMAT-common-sections.md).

### Notes

Use `## Notes` for free-form design notes.

Do not add unsupported columns to structured tables just to store extra information. Put extra information in `notes`, `## Notes`, or `## Source Links`.

## Tables

### Sources table

```markdown
| id | ref | role | notes |
|---|---|---|---|
```

### Targets table

```markdown
| id | ref | role | notes |
|---|---|---|---|
```

### Mappings table

```markdown
| id | source | target | transform | rule | condition | notes |
|---|---|---|---|---|---|---|
```

### Source Links table

```markdown
| path | notes |
|---|---|
```

## Qualified Ref / Member Ref

For `mapping`, `Mappings.id` may be used as a member reference.

Examples:

```markdown
[[MAP-INVENTORY-IMPORT]].MAP-STATUS
[[MAP-ORDER-REQUEST-TO-ENTITY]].MAP-CUSTOMER-ID
```

Useful member candidates include:

* `Sources.id`
* `Targets.id`
* `Mappings.id`

Use stable IDs when other models need to refer to a source alias, target alias, or mapping row.

## Reference handling

Structured fields that may carry useful references include:

* `Sources.ref`
* `Targets.ref`
* `Mappings.source`
* `Mappings.target`
* `Mappings.rule`
* `Mappings.condition`

Plain prose may contain readable references, but analyzers should prefer structured fields when available.

## CodeSet value usage

CodeSet values may appear in mapping conditions or transformations.

Examples:

```markdown
[[CODE-INVENTORY-STATUS]].available
CODE-ORDER-STATUS.confirmed
```

Useful locations include:

* `Mappings.source`
* `Mappings.target`
* `Mappings.transform`
* `Mappings.condition`
* `Mappings.notes`

When a mapping converts values between CodeSets or external values, consider defining a `rule` for the conversion logic.

## Relationship with data_object

`mapping` commonly maps fields between data objects.

Examples:

* request payload to internal DTO
* screen form data to process input
* process output to response payload
* fixed-length file fields to import DTO
* export DTO to CSV file layout

Use `data_object` to define the source and target structures.
Use `mapping` to define how fields move between them.

## Relationship with er_entity

`mapping` may map data object fields to ER entity columns.

Examples:

* API request to database table
* import file to entity
* entity to response DTO
* entity to report file

Use `er_entity` to define database columns.
Use `mapping` to define data movement to or from those columns.

## Relationship with rule

Use `rule` when mapping logic is complex, reused, or important enough to review independently.

Examples:

* CodeSet conversion
* status transition logic
* amount calculation
* date normalization
* default value decision
* conditional target selection

In the mapping row, reference the rule in the `rule` column.

## Common mistakes

### Putting full business logic into transform

Avoid putting large business logic directly in `Mappings.transform`.

Use a readable summary in `transform` and reference a `rule` for detailed logic.

### Treating mapping as the source definition

Do not define all source and target fields only inside `mapping`.

Use `data_object`, `er_entity`, or `screen` to define the structures.
Use `mapping` to connect them.

### Adding unsupported columns

Do not add columns such as `description`, `type`, `format`, `source_ref`, `target_ref`, or `message` unless the FORMAT explicitly defines them.

Use existing columns, `notes`, `## Notes`, or `## Source Links`.

### Using labels instead of stable references

Avoid using display labels as mapping endpoints.

Risky:

```markdown
| id | source | target | transform | rule | condition | notes |
|---|---|---|---|---|---|---|
| MAP-1 | Customer ID | Customer ID | copy |  |  | ambiguous |
```

Prefer stable qualified references:

```markdown
| id | source | target | transform | rule | condition | notes |
|---|---|---|---|---|---|---|
| MAP-1 | [[DATA-ORDER-REQUEST]].customer_id | [[ENT-ORDER]].customer_id | copy |  |  |  |
```

### Confusing mapping with app_process

`mapping` describes data movement.

`app_process` describes processing flow.

If you need step order, branching, subflows, or process transitions, use `app_process`.

### Unsafe table syntax

Avoid raw `|` characters inside table cells.

Avoid Wikilink aliases such as `[[DATA-ORDER|Order Data]]` inside tables. Use `[[DATA-ORDER]]` and put display meaning in `notes`.

## AI generation notes

When generating `mapping` files with AI:

* Use `type: mapping`.
* One file should define one coherent mapping direction or mapping group.
* Preserve exact table headers.
* Do not add unsupported columns.
* Use `Sources` and `Targets` to declare mapping endpoints.
* Use `Mappings` for field-level rows.
* Prefer qualified member references for source and target fields.
* Use `transform` for a short readable transformation summary.
* Use `rule` for complex or reusable transformation logic.
* Use `condition` for row-level applicability.
* Do not replace data object or ER entity definitions with mapping rows.
* Put extra explanation in `notes` or `## Notes`.
* Use `## Source Links` for mapping specs, spreadsheets, ETL scripts, implementation files, sample files, and test data.

If AI creates a mapping from source code, SQL, interface specs, or spreadsheets, verify:

* source models
* target models
* source field names
* target field names
* transformation descriptions
* rule references
* conditions
* unmapped required fields
* Source Links

## Related samples

* [Inventory search mapping](../../samples/mapping/MAP-INVENTORY-SEARCH.md)
* [Mapping samples index](../../samples/mapping/README.md)

## Related formats

* [data_object](FORMAT-data_object.md)
* [er_entity](FORMAT-er_entity.md)
* [screen](FORMAT-screen.md)
* [app_process](FORMAT-app_process.md)
* [rule](FORMAT-rule.md)
* [codeset](FORMAT-codeset.md)
* [Common sections](FORMAT-common-sections.md)
