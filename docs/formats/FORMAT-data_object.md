# FORMAT-data_object

Japanese Version: [日本語版](../ja/formats/FORMAT-data_object.md)

## What this is for

`data_object` defines a logical data structure, message layout, file layout, form value, API payload, report layout, or process input/output used by Model Weave.

Use this format when you want to describe:

* data flowing through a DFD flow
* screen input / output values
* `app_process` input / output data
* API request / response payloads
* JSON / XML payloads
* CSV / TSV / delimited files
* fixed-length files
* multi-record fixed-length files
* EDI-like segment structures
* Excel-like report structures
* DTOs, value objects, search conditions, and processing results

`data_object` connects screens, processes, DFD flows, ER entities, mappings, and source code references.

It is not primarily a diagram format. It is a structured data definition used for review, reference checks, field completion, and AI-assisted modeling.

## Important concept: logical data vs physical file layout

`data_object` supports two related but different use cases.

### Logical data structure

Use this when you want to describe the meaning and shape of data.

Examples:

* API request
* API response
* form value
* search condition
* internal DTO
* interface payload
* processing result

Logical data usually uses the standard `## Fields` table.

### Physical file layout

Use this when you want to describe the physical layout of a file.

Examples:

* fixed-length file
* CSV file
* TSV file
* import / export file
* external system interface file
* EDI-like segmented file
* Excel report layout

Physical file layouts may use `## Format`, `## Records`, and the file-layout version of `## Fields`.

This distinction is important because the commands are also separated:

* `Model Weave: Insert Data Object Template` for logical data structures
* `Model Weave: Insert Data Object File Layout Template` for physical file layouts

## Minimal example: logical data

```markdown
---
type: data_object
id: DATA-ORDER-REQUEST
name: Order Request
kind: request
data_format: json
tags:
  - DataObject
---

# Order Request

## Summary

API request payload for creating an order.

## Fields

| name | label | type | length | required | path | ref | notes |
|---|---|---|---:|---|---|---|---|
| order_id | Order ID | string | 20 | Y | $.orderId | [[ENT-ORDER]].order_id |  |
| customer_id | Customer ID | string | 20 | Y | $.customer.id | [[ENT-CUSTOMER]].customer_id |  |
```

## Minimal example: file layout

```markdown
---
type: data_object
id: DATA-BANK-TRANSFER-FILE
name: Bank Transfer Fixed-Length File
kind: file
data_format: fixed
encoding: Shift_JIS
line_ending: CRLF
record_length: 120
tags:
  - DataObject
  - File
---

# Bank Transfer Fixed-Length File

## Summary

Fixed-length file for bank transfer export.

## Format

| key | value | notes |
|---|---|---|
| data_format | fixed | fixed-length file |
| encoding | Shift_JIS | partner specification |
| line_ending | CRLF | Windows line ending |
| record_length | 120 | 120 bytes per record |

## Fields

| record_type | no | name | label | type | length | required | position | field_format | ref | notes |
|---|---:|---|---|---|---:|---|---|---|---|---|
| 1 | 1 | record_type | Record Type | string | 1 | Y | 1-1 | fixed:1 |  | header |
| 1 | 2 | company_code | Company Code | string | 10 | Y | 2-11 | zero_pad_left |  |  |
```

## Frontmatter

Required fields:

| field  | required | notes                            |
| ------ | -------- | -------------------------------- |
| `type` | yes      | Must be `data_object`.           |
| `id`   | yes      | Unique data object model ID.     |
| `name` | yes      | Display name of the data object. |

Optional fields:

| field           | notes                                                                               |
| --------------- | ----------------------------------------------------------------------------------- |
| `kind`          | Purpose of the data, such as `request`, `response`, `file`, `form`, or `dto`.       |
| `data_format`   | Representation format, such as `object`, `json`, `xml`, `csv`, `fixed`, or `excel`. |
| `encoding`      | Character encoding for files, such as `UTF-8` or `Shift_JIS`.                       |
| `delimiter`     | Delimiter for CSV / TSV / delimited files.                                          |
| `line_ending`   | Line ending, such as `LF` or `CRLF`.                                                |
| `has_header`    | Whether a file has a header row.                                                    |
| `record_length` | Record length for fixed-length files.                                               |
| `render_mode`   | Usually not required; data_object is mainly a structured detail view.               |
| `tags`          | Obsidian / Markdown tags.                                                           |

### Expected `kind` values

`kind` describes what the data is for.

Typical values:

* `data`
* `dto`
* `request`
* `response`
* `payload`
* `file`
* `form`
* `query`
* `result`
* `report`
* `message`
* `other`

### Expected `data_format` values

`data_format` describes how the data is represented.

Typical values:

* `object`
* `json`
* `xml`
* `csv`
* `tsv`
* `fixed`
* `delimited`
* `excel`
* `edi`
* `binary`
* `form`
* `query`
* `other`

## kind vs data_format

`kind` and `data_format` have different roles.

| field         | meaning                      |
| ------------- | ---------------------------- |
| `kind`        | What the data is for.        |
| `data_format` | How the data is represented. |

Examples:

| kind       | data_format | Meaning              |
| ---------- | ----------- | -------------------- |
| `request`  | `json`      | API request payload  |
| `response` | `json`      | API response payload |
| `form`     | `object`    | Screen form values   |
| `query`    | `object`    | Search condition     |
| `file`     | `csv`       | CSV file             |
| `file`     | `fixed`     | Fixed-length file    |
| `report`   | `excel`     | Excel report         |
| `dto`      | `object`    | Internal DTO         |

## Sections

Recommended structure:

```text
# <data object name>

## Summary

## Format

## Records

## Fields

## Source Links

## Notes
```

Minimum structure for ordinary logical data:

```text
# <data object name>

## Summary

## Fields
```

`## Format` and `## Records` are optional and should be used only when needed.

### Summary

Use `## Summary` to describe the purpose, source, destination, and usage context of the data object.

This section is free text.

### Format

Use `## Format` to describe file-level, payload-level, message-level, or report-level properties.

Expected header:

```markdown
| key | value | notes |
|---|---|---|
```

Columns:

| column  | meaning                |
| ------- | ---------------------- |
| `key`   | Format property name.  |
| `value` | Format property value. |
| `notes` | Optional explanation.  |

Example:

```markdown
## Format

| key | value | notes |
|---|---|---|
| data_format | csv | CSV |
| encoding | UTF-8 |  |
| delimiter | , | comma-separated |
| quote | double_quote | double quote |
| has_header | true | first row is header |
| line_ending | LF |  |
```

### Records

Use `## Records` for multi-record fixed-length files, header/detail/trailer structures, or EDI-like segments.

Expected header:

```markdown
| record_type | name | occurrence | notes |
|---|---|---|---|
```

Columns:

| column        | meaning                                          |
| ------------- | ------------------------------------------------ |
| `record_type` | Record type code or segment ID.                  |
| `name`        | Record / segment name.                           |
| `occurrence`  | Occurrence rule, such as `1`, `0..1`, or `1..*`. |
| `notes`       | Optional explanation.                            |

Example:

```markdown
## Records

| record_type | name | occurrence | notes |
|---|---|---|---|
| 1 | Header Record | 1 | first record |
| 2 | Detail Record | 1..* | repeated details |
| 8 | Trailer Record | 1 | totals |
| 9 | End Record | 1 | file terminator |
```

### Fields

`## Fields` is the main section of a `data_object`.

It supports two table families:

1. Standard Fields
2. File Layout Fields

Do not mix the two header types in a single `## Fields` table.

#### Standard Fields

Use Standard Fields for DTOs, form values, search conditions, API payloads, JSON/XML payloads, and ordinary logical objects.

Expected header:

```markdown
| name | label | type | length | required | path | ref | notes |
|---|---|---|---:|---|---|---|---|
```

Columns:

| column     | meaning                                                                         |
| ---------- | ------------------------------------------------------------------------------- |
| `name`     | Field name. Also used as a member reference candidate.                          |
| `label`    | Human-readable label.                                                           |
| `type`     | Field type. Prefer simple scalar names.                                         |
| `length`   | Length / precision. Use blank if not applicable.                                |
| `required` | `Y` or `N`.                                                                     |
| `path`     | JSONPath, XML path, form path, or logical path.                                 |
| `ref`      | Optional reference to ER field, CodeSet, another data object, or model element. |
| `notes`    | Optional explanation.                                                           |

Example:

```markdown
## Fields

| name | label | type | length | required | path | ref | notes |
|---|---|---|---:|---|---|---|---|
| order_id | Order ID | string | 20 | Y | $.orderId | [[ENT-ORDER]].order_id |  |
| customer_id | Customer ID | string | 20 | Y | $.customer.id | [[ENT-CUSTOMER]].customer_id |  |
| order_status | Order Status | string | 20 | N | $.status | [[CODE-ORDER-STATUS]] |  |
```

#### File Layout Fields

Use File Layout Fields for fixed-length files, CSV, TSV, delimited files, EDI-like segments, and Excel-like reports.

Expected header:

```markdown
| record_type | no | name | label | type | length | required | position | field_format | ref | notes |
|---|---:|---|---|---|---:|---|---|---|---|---|
```

Columns:

| column         | meaning                                                                         |
| -------------- | ------------------------------------------------------------------------------- |
| `record_type`  | Record type code or segment ID.                                                 |
| `no`           | Field order number within the record.                                           |
| `name`         | Field name.                                                                     |
| `label`        | Human-readable label.                                                           |
| `type`         | Field type.                                                                     |
| `length`       | Field length.                                                                   |
| `required`     | `Y` or `N`.                                                                     |
| `position`     | Physical position, such as `1-10`, Excel cell range, or column index.           |
| `field_format` | Field-level format, padding, date pattern, fixed value, etc.                    |
| `ref`          | Optional reference to ER field, CodeSet, another data object, or model element. |
| `notes`        | Optional explanation.                                                           |

Example:

```markdown
## Fields

| record_type | no | name | label | type | length | required | position | field_format | ref | notes |
|---|---:|---|---|---|---:|---|---|---|---|---|
| 1 | 1 | record_type | Record Type | string | 1 | Y | 1-1 | fixed:1 |  | header |
| 1 | 2 | company_code | Company Code | string | 10 | Y | 2-11 | zero_pad_left |  |  |
| 2 | 1 | record_type | Record Type | string | 1 | Y | 1-1 | fixed:2 |  | detail |
| 2 | 2 | amount | Amount | number | 10 | Y | 16-25 | zero_pad_left | [[ENT-INVOICE]].total_amount | yen |
```

Typical `field_format` values:

* `yyyyMMdd`
* `zero_pad_left`
* `space_pad_right`
* `fixed:H`
* `decimal_2`
* `half_width_kana`

### Source Links

`## Source Links` is optional.

Use it to connect the data object to source code, interface specifications, schema files, sample files, CSV definitions, mapping documents, or test data.

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
| specs/order-request.json | API payload specification |
| src/order/dto/CreateOrderRequest.ts | DTO implementation |
| testdata/order-request-sample.json | Sample payload |
```

For details, see [FORMAT-common-sections](FORMAT-common-sections.md).

### Notes

Use `## Notes` for free-form design notes.

Do not add unsupported columns to structured tables just to store extra information. Put extra information in `notes`, `## Notes`, or `## Source Links`.

## Tables

### Format table

```markdown
| key | value | notes |
|---|---|---|
```

### Records table

```markdown
| record_type | name | occurrence | notes |
|---|---|---|---|
```

### Standard Fields table

```markdown
| name | label | type | length | required | path | ref | notes |
|---|---|---|---:|---|---|---|---|
```

### File Layout Fields table

```markdown
| record_type | no | name | label | type | length | required | position | field_format | ref | notes |
|---|---:|---|---|---|---:|---|---|---|---|---|
```

### Source Links table

```markdown
| path | notes |
|---|---|
```

## Qualified Ref / Member Ref

`Fields.name` is the member reference candidate.

Examples:

```markdown
[[DATA-ORDER-REQUEST]].order_id
[[DATA-BANK-TRANSFER-FILE]].amount
```

For multi-record files, the same `name` may appear in multiple record types. In the current specification, `Fields.name` remains the default member candidate.

Duplicate names across record types may produce a warning.

A future extension may support `record_type.name` style references, but new documentation should not describe it as implemented unless the implementation supports it.

## Relationships with other formats

`data_object` is commonly referenced by other formats.

Examples:

* Screen fields may refer to data object fields.
* `app_process` `Inputs.data` and `Outputs.data` may refer to data objects.
* DFD `Flows.data` may refer to data objects.
* Mapping source / target references may refer to data object fields.
* `ref` columns may point to ER fields or CodeSet values.

## Common mistakes

### Confusing Data Object with ER Entity

Use `er_entity` for database tables and physical database columns.

Use `data_object` for payloads, DTOs, form values, interface files, messages, and process input/output data.

A data object may reference ER fields, but it should not replace ER entity definitions.

### Mixing Standard Fields and File Layout Fields

Do not mix the two `## Fields` table headers in one table.

Use Standard Fields for logical data.
Use File Layout Fields for physical files and position-sensitive layouts.

### Adding unsupported columns

Do not add columns such as `description`, `source`, `target`, `rule`, or `format` unless the FORMAT explicitly defines them.

Use `notes`, `## Notes`, or `## Format` instead.

### Using unsafe type expressions

Avoid complex type expressions in `type`.

Risky examples:

* `string[]`
* `Array<string>`
* `Optional<string>`
* `string | null`

Prefer simple type names:

* `string`
* `number`
* `boolean`
* `date`
* `datetime`

Use `notes` to explain multiplicity, optionality, or special constraints.

### Using Wikilink aliases inside tables

Avoid:

```markdown
[[ENT-ORDER|Order]]
```

Prefer:

```markdown
[[ENT-ORDER]]
```

Put display meaning in `label` or `notes`.

### Using raw pipe characters inside table cells

Avoid:

```text
A | B | C
string | null
```

Prefer:

```text
A / B / C
string
```

## AI generation notes

When generating `data_object` files with AI:

* Use `type: data_object`.
* One file should define one data structure, payload, file, or report.
* Choose `kind` based on purpose.
* Choose `data_format` based on representation.
* Preserve exact table headers.
* Do not add unsupported columns.
* Do not mix Standard Fields and File Layout Fields in one table.
* Use Standard Fields for logical data structures.
* Use File Layout Fields for physical file layouts.
* Use `## Format` for file-level or payload-level metadata.
* Use `## Records` only when record types or segments are needed.
* Use simple scalar type names.
* Use `required` as `Y` or `N`.
* Use `ref` for ER fields, CodeSet values, or other model references when useful.
* Put extra explanation in `notes` or `## Notes`.
* Use `## Source Links` for interface specs, schemas, source files, sample files, or test data.

If AI creates a data object from source code, schema, or interface specification, verify:

* field names
* required flags
* paths
* physical positions
* record types
* field references
* source links

## Related samples

* [Inventory search condition](../../samples/data/DATA-INVENTORY-SEARCH-CONDITION.md)
* [Inventory search result](../../samples/data/DATA-INVENTORY-SEARCH-RESULT.md)
* [Data samples index](../../samples/data/README.md)

## Related formats

* [er_entity](FORMAT-er_entity.md)
* [app_process](FORMAT-app_process.md)
* [mapping](FORMAT-mapping.md)
* [codeset](FORMAT-codeset.md)
* [Common sections](FORMAT-common-sections.md)
