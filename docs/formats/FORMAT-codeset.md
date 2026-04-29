# FORMAT-codeset

## Purpose

`codeset` defines a code set, enum, classification, or selectable value list.

Typical targets:

- screen select/radio/checkbox values
- status codes
- tax types
- currency codes
- department codes
- permission levels
- external integration code values
- allowed values referenced by rules

A `codeset` is the simplest rule-like design asset: it defines which values are allowed and what they mean.

## Core policy

- A `codeset` file has `type: codeset`.
- One file defines one code system.
- `Values` is managed as a Markdown table.
- `Values.code` is unique within the file.
- Screen, app_process, rule, and mapping may refer to codesets.
- The viewer should show table data and diagnostics, not a diagram.

## Frontmatter

Required:

- `type`
- `id`
- `name`

Optional:

- `kind`
- `tags`

Expected `kind` values:

- `enum`
- `status`
- `master_code`
- `system_code`
- `external_code`
- `ui_options`
- `other`

Example:

```yaml
---
type: codeset
id: CODE-ORDER-STATUS
name: Order Status
kind: status
tags:
  - CodeSet
---
```

## Recommended structure

```text
# <codeset name>

## Summary

## Values

## Notes
```

## Values

Columns:

- `code`
- `label`
- `sort_order`
- `active`
- `notes`

Example:

```markdown
## Values

| code | label | sort_order | active | notes |
|---|---|---:|---|---|
| draft | Draft | 10 | Y | before confirmation |
| confirmed | Confirmed | 20 | Y | may be invoiced |
| shipped | Shipped | 30 | Y | shipping completed |
| cancelled | Cancelled | 90 | Y | normally excluded |
```

## Qualified Ref / Member Ref

`Values.code` is the member candidate.

Examples:

```markdown
[[codeset/CODE-ORDER-STATUS|Order Status]].confirmed
[[codeset/CODE-TAX-TYPE|Tax Type]].taxable
```

## Relationships

- Screen `Fields.ref` may refer to a codeset for select/radio/checkbox choices.
- Rule conditions may refer to codeset members.
- Mapping rules may refer to codeset members.

## Validation candidates

Error candidates:

- missing `id`
- missing `name`
- empty `Values.code`
- duplicate `Values.code`

Warning candidates:

- empty `Values.label`
- empty `active`
- duplicate `sort_order`
- referenced codeset does not exist
- referenced `Values.code` does not exist

## Not required in V0.7

- hierarchical codes
- parent-child codes
- effective dates
- multilingual labels
- external code conversion tables
- conditional choices
- codeset diagrams
