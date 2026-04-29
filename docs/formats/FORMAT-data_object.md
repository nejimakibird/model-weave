# FORMAT-data_object

## Purpose

`data_object` defines a data structure, message layout, file layout, form value, API payload, report layout, or process input/output used by Model Weave.

Typical targets:

- data flowing through a DFD flow
- screen input/output values
- app_process input/output data
- API request/response payloads
- JSON / XML / CSV / TSV / fixed-length files
- multi-record fixed-length files
- EDI-like segment structures
- Excel-like report structures
- DTOs, value objects, search conditions, and processing results

`data_object` connects screens, processes, DFD flows, ER entities, and mappings.

## Core policy

- A `data_object` file has `type: data_object`.
- One file defines one data structure, payload, file, or report.
- Fields are managed in `## Fields` as Markdown tables.
- Both ordinary data structures and file layouts are supported.
- Multi-record fixed-length files can use `Records` and `Fields.record_type`.
- Hierarchical data such as JSON/XML can use `Fields.path`.
- Position-sensitive data such as fixed-length or Excel can use `Fields.position`.
- `Fields.name` is a member candidate for qualified references.
- `data_object` is not a diagram format; it is a table/text/detail view target.

## Frontmatter

Required:

- `type`
- `id`
- `name`

Optional:

- `kind`
- `data_format`
- `encoding`
- `delimiter`
- `line_ending`
- `has_header`
- `record_length`
- `tags`

Expected `kind` values:

- `data`
- `dto`
- `request`
- `response`
- `payload`
- `file`
- `form`
- `query`
- `result`
- `report`
- `message`
- `other`

Expected `data_format` values:

- `object`
- `json`
- `xml`
- `csv`
- `tsv`
- `fixed`
- `delimited`
- `excel`
- `edi`
- `binary`
- `form`
- `query`
- `other`

Example:

```yaml
---
type: data_object
id: DATA-ORDER-REQUEST
name: Order Request
kind: request
data_format: json
tags:
  - DataObject
---
```

## Recommended structure

```text
# <data object name>

## Summary

## Format

## Records

## Fields

## Notes
```

Minimum for ordinary data:

```text
# <data object name>

## Summary

## Fields

## Notes
```

`Format` and `Records` are optional.

## kind vs data_format

`kind` describes what the data is for. `data_format` describes how it is represented.

| kind | data_format | Meaning |
|---|---|---|
| request | json | API request payload |
| response | json | API response payload |
| form | object | screen form values |
| query | object | search condition |
| file | csv | CSV file |
| file | fixed | fixed-length file |
| report | excel | Excel report |
| dto | object | internal DTO |

## Format

Use `## Format` to describe file/payload/report-level properties.

Columns:

- `key`
- `value`
- `notes`

Example:

```markdown
## Format

| key | value | notes |
|---|---|---|
| data_format | fixed | fixed-length |
| encoding | Shift_JIS | partner specification |
| line_ending | CRLF | Windows line ending |
| record_length | 120 | 120 bytes per record |
| record_type_position | 1-1 | record type position |
| padding | space | right pad strings |
| numeric_padding | zero | left pad numbers |
```

## Records

Use `## Records` for multi-record fixed-length files, header/detail/trailer structures, or EDI-like segments.

Columns:

- `record_type`
- `name`
- `occurrence`
- `notes`

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

## Fields

`## Fields` supports two families:

1. Standard Fields
2. File Layout Fields

The parser should distinguish them by table columns.

## Standard Fields

Use for DTOs, form values, search conditions, API payloads, JSON/XML, and ordinary objects.

Columns:

- `name`
- `label`
- `type`
- `length`
- `required`
- `path`
- `ref`
- `notes`

Example:

```markdown
## Fields

| name | label | type | length | required | path | ref | notes |
|---|---|---|---:|---|---|---|---|
| order_id | Order ID | string | 20 | Y | $.orderId | [[er/ENT-ORDER|Order]].order_id |  |
| customer_id | Customer ID | string | 20 | Y | $.customer.id | [[er/ENT-CUSTOMER|Customer]].customer_id |  |
| order_status | Order Status | string | 20 | N | $.status | [[codeset/CODE-ORDER-STATUS|Order Status]] |  |
```

## File Layout Fields

Use for fixed-length, CSV, TSV, delimited files, EDI, and Excel reports.

Columns:

- `record_type`
- `no`
- `name`
- `label`
- `type`
- `length`
- `required`
- `position`
- `field_format`
- `ref`
- `notes`

`field_format` is field-level format information such as:

- `yyyyMMdd`
- `zero_pad_left`
- `space_pad_right`
- `fixed:H`
- `decimal_2`
- `half_width_kana`

Example:

```markdown
## Fields

| record_type | no | name | label | type | length | required | position | field_format | ref | notes |
|---|---:|---|---|---|---:|---|---|---|---|---|
| 1 | 1 | record_type | Record Type | string | 1 | Y | 1-1 | fixed:1 |  | header |
| 1 | 2 | company_code | Company Code | string | 10 | Y | 2-11 | zero_pad_left |  |  |
| 2 | 1 | record_type | Record Type | string | 1 | Y | 1-1 | fixed:2 |  | detail |
| 2 | 2 | amount | Amount | number | 10 | Y | 16-25 | zero_pad_left | [[er/ENT-INVOICE|Invoice]].total_amount | yen |
```

## Qualified Ref / Member Ref

`Fields.name` is the member candidate.

Examples:

```markdown
[[data/DATA-ORDER-REQUEST|Order Request]].order_id
[[data/DATA-BANK-TRANSFER-FILE|Bank Transfer File]].amount
```

For multi-record files, the same `name` may appear in multiple record types. In V0.7, `Fields.name` remains the default member candidate. Duplicate names across record types may produce a warning.

Future extension may support `record_type.name` style references.

## Relationships

- Screen `Fields.ref` may refer to data_object fields.
- app_process `Inputs.data` and `Outputs.data` may refer to data_object.
- DFD `Flows.data` may refer to data_object.
- mapping `source_ref` / `target_ref` may refer to data_object fields.

## Validation candidates

Error candidates:

- missing `id`
- missing `name`
- empty `Fields.name`
- duplicate `Fields.name` where not intentionally separated by record type
- unresolved `Fields.ref`
- unresolved qualified member in `Fields.ref`
- `data_format: fixed` with missing `record_length`
- fixed layout field without `position`
- duplicate `Records.record_type`
- `Fields.record_type` not found in `Records`

Warning candidates:

- missing `data_format`
- missing `kind`
- missing `Fields.label`
- missing `Fields.type`
- `required` not `Y`/`N`
- non-numeric `length`
- duplicate `Fields.no`
- duplicate `Fields.position`
- fixed file record length mismatch
- CSV/TSV/delimited data with missing `delimiter`
- Standard and File Layout columns mixed in one table

## Not required in V0.7

- full JSON Schema compatibility
- full XML Schema compatibility
- fixed-length file generation
- actual CSV/fixed file parsing
- complete EDI standard support
- actual Excel cell reading
- `record_type.name` member reference
- complete nested object modeling
