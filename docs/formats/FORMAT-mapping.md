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

## Scope

| role | ref | notes |
|---|---|---|
| source | [[DATA-ORDER-REQUEST]] | API request payload |
| target | [[ENT-ORDER]] | Order table |

## Mappings

| target_ref | source_ref | transform | rule | required | notes |
|---|---|---|---|---|---|
| [[ENT-ORDER]].order_id | [[DATA-ORDER-REQUEST]].order_id | copy |  | Y |  |
| [[ENT-ORDER]].customer_id | [[DATA-ORDER-REQUEST]].customer_id | copy |  | Y |  |
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

## Scope

| role | ref | notes |
|---|---|---|
| source | [[DATA-INVENTORY-IMPORT-FILE]] | External CSV import file |
| target | [[ENT-INVENTORY]] | Inventory table |
| target | [[ENT-STOCK-MOVEMENT]] | Movement history table |

## Mappings

| target_ref | source_ref | transform | rule | required | notes |
|---|---|---|---|---|---|
| [[ENT-INVENTORY]].shipper_id | [[DATA-INVENTORY-IMPORT-FILE]].shipper_code | lookup shipper_id by code | [[RULE-SHIPPER-LOOKUP]] | Y | External code conversion |
| [[ENT-INVENTORY]].warehouse_id | [[DATA-INVENTORY-IMPORT-FILE]].warehouse_code | lookup warehouse_id by code | [[RULE-WAREHOUSE-LOOKUP]] | Y | External code conversion |
| [[ENT-INVENTORY]].item_id | [[DATA-INVENTORY-IMPORT-FILE]].item_code | lookup item_id by code | [[RULE-ITEM-LOOKUP]] | Y | External code conversion |
| [[ENT-INVENTORY]].quantity | [[DATA-INVENTORY-IMPORT-FILE]].quantity | parse decimal |  | Y | Convert text to numeric |
| [[ENT-INVENTORY]].inventory_status | [[DATA-INVENTORY-IMPORT-FILE]].status | convert status | [[RULE-INVENTORY-STATUS-CONVERT]] | Y | Maps external status to CodeSet value |
| [[ENT-STOCK-MOVEMENT]].movement_quantity | [[DATA-INVENTORY-IMPORT-FILE]].quantity | copy when quantity is positive |  | N | Create movement row only when quantity exists |

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

## Scope

## Mappings

## Source Links

## Notes
```

### Summary

Use `## Summary` to describe the purpose, direction, trigger context, and scope of the mapping.

This section is free text.

### Scope

Use `## Scope` to list source, target, lookup, context, or external models used by the mapping.

Expected header:

```markdown
| role | ref | notes |
|---|---|---|
```

Columns:

| column  | meaning                                                                                                     |
| ------- | ----------------------------------------------------------------------------------------------------------- |
| `role`  | Role such as `source`, `target`, `input`, `output`, `lookup`, `context`, `destination`, or `external`.       |
| `ref`   | Model reference, such as a data object, ER entity, screen, process, file, external source, or raw value.     |
| `notes` | Optional explanation.                                                                                       |

Example:

```markdown
## Scope

| role | ref | notes |
|---|---|---|
| source | [[DATA-ORDER-REQUEST]] | API request |
| target | [[ENT-ORDER]] | Order table |
| context | current_user | Login user context |
```

### Mappings

Use `## Mappings` to define field-level mapping rows.

Expected header:

```markdown
| target_ref | source_ref | transform | rule | required | notes |
|---|---|---|---|---|---|
```

The legacy source-first header `source_ref | target_ref | transform | rule | required | notes` remains supported without diagnostics for existing files, but new files should use the target-first order above.

Columns:

| column       | meaning                                                                                                   |
| ------------ | --------------------------------------------------------------------------------------------------------- |
| `target_ref` | Target field, value, expression, or model reference. May point to members such as `[[DATA-ID]].fieldName`. |
| `source_ref` | Source field, value, expression, or model reference. May point to members such as `[[DATA-ID]].fieldName`. |
| `transform`  | Transformation description. Use simple text such as `copy`, `format date`, `lookup`, or `convert status`. |
| `rule`       | Optional related `rule` reference when transformation is governed by a rule model.                         |
| `required`   | Whether the mapping is mandatory. Use `Y` or `N`.                                                         |
| `notes`      | Optional explanation, including row-level applicability when needed.                                      |

Example:

```markdown
## Mappings

| target_ref | source_ref | transform | rule | required | notes |
|---|---|---|---|---|---|
| [[ENT-ORDER]].order_id | [[DATA-ORDER-REQUEST]].order_id | copy |  | Y |  |
| [[ENT-ORDER]].order_status | [[DATA-ORDER-REQUEST]].status | convert status | [[RULE-ORDER-STATUS-CONVERT]] | Y | Code conversion |
| [[ENT-ORDER]].created_by | current_user.user_id | copy |  | N | Audit field |
```

Notes:

* `source_ref` and `target_ref` should be as specific as useful.
* Prefer qualified member references when mapping model fields, such as `[[DATA-ID]].fieldName`.
* Use `rule` for complex or reusable logic.
* Use `required` to show whether a row is mandatory.
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

### Scope table

```markdown
| role | ref | notes |
|---|---|---|
```

### Mappings table

```markdown
| target_ref | source_ref | transform | rule | required | notes |
|---|---|---|---|---|---|
```

### Source Links table

```markdown
| path | notes |
|---|---|
```

## Qualified Ref / Member Ref

For `mapping`, `source_ref` and `target_ref` may use qualified member references.

Examples:

```markdown
[[DATA-INVENTORY-IMPORT-FILE]].status
[[ENT-INVENTORY]].inventory_status
```

Mapping rows do not define a separate row ID in the current parser-backed format.

## Reference handling

Structured fields that may carry useful references include:

* `Scope.ref`
* `Mappings.source_ref`
* `Mappings.target_ref`
* `Mappings.rule`

Plain prose may contain readable references, but analyzers should prefer structured fields when available.

## CodeSet value usage

CodeSet values may appear in mapping conditions or transformations.

Examples:

```markdown
[[CODE-INVENTORY-STATUS]].available
CODE-ORDER-STATUS.confirmed
```

Useful locations include:

* `Mappings.source_ref`
* `Mappings.target_ref`
* `Mappings.transform`
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

Do not add columns such as `id`, `source`, `target`, `condition`, `description`, `type`, `format`, or `message` unless the FORMAT explicitly defines them.

Use existing columns, `notes`, `## Notes`, or `## Source Links`.

### Using labels instead of stable references

Avoid using display labels as mapping endpoints.

Risky:

```markdown
| target_ref | source_ref | transform | rule | required | notes |
|---|---|---|---|---|---|
| Customer ID | Customer ID | copy |  | Y | ambiguous |
```

Prefer stable qualified references:

```markdown
| target_ref | source_ref | transform | rule | required | notes |
|---|---|---|---|---|---|
| [[ENT-ORDER]].customer_id | [[DATA-ORDER-REQUEST]].customer_id | copy |  | Y |  |
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
* Use `Scope` to declare mapping endpoints.
* Use `Mappings` for field-level rows.
* Prefer qualified member references for `source_ref` and `target_ref`.
* Use `transform` for a short readable transformation summary.
* Use `rule` for complex or reusable transformation logic.
* Use `required` to indicate whether a mapping is mandatory.
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
