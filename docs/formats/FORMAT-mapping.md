# FORMAT-mapping

## Purpose

`mapping` defines field-level correspondence between different design elements.

Typical targets:

- screen field -> data_object field
- data_object field -> er_entity column
- app_process input/output -> data_object
- external API payload -> internal data_object
- data_object -> data_object conversion
- ER entity / DTO correspondence
- transformation rules, fixed values, calculations, exclusions

`mapping` is a cross-cutting design asset that connects screens, processes, data objects, ER entities, classes, and rules.

## Core policy

- A `mapping` file has `type: mapping`.
- One file defines one mapping set.
- Source and target should be described in frontmatter or `Scope`.
- `Mappings` is managed as a Markdown table.
- `source_ref` / `target_ref` should use qualified references where possible.
- Transformation logic may be natural language.
- Complex conditions should be moved to `rule`.
- One row should generally map to one `target_ref`.
- If a mapping becomes many-to-many, split the mapping or introduce intermediate data_object/app_process/rule.

## Frontmatter

Required:

- `type`
- `id`
- `name`

Optional:

- `kind`
- `source`
- `target`
- `tags`

Expected `kind` values:

- `screen_to_data`
- `data_to_er`
- `er_to_data`
- `data_to_data`
- `api_to_data`
- `data_to_api`
- `process_io`
- `other`

Example:

```yaml
---
type: mapping
id: MAP-INVOICE-CANDIDATE-SAVE
name: Invoice Candidate Save Mapping
kind: data_to_er
source: [[data/DATA-INVOICE-CANDIDATE|Invoice Candidate Data]]
target: [[er/ENT-INVOICE-CANDIDATE|Invoice Candidate]]
tags:
  - Mapping
  - Invoice
---
```

## Recommended structure

```text
# <mapping name>

## Summary

## Scope

## Mappings

## Rules

## Notes
```

Minimum:

- `Summary`
- `Mappings`

## Scope

Columns:

- `role`
- `ref`
- `notes`

Expected `role` values:

- `source`
- `target`
- `intermediate`
- `reference`
- `rule`
- `process`

Example:

```markdown
## Scope

| role | ref | notes |
|---|---|---|
| source | [[data/DATA-INVOICE-CANDIDATE|Invoice Candidate Data]] | input data |
| target | [[er/ENT-INVOICE-CANDIDATE|Invoice Candidate]] | save target |
| rule | [[rule/RULE-INVOICE-AMOUNT-CALC|Invoice Amount Calculation]] | amount rule |
```

## Mappings

Columns:

- `source_ref`
- `target_ref`
- `transform`
- `rule`
- `required`
- `notes`

Meanings:

- `source_ref`: source field; may be blank for fixed/system values
- `target_ref`: target field; should be one target per row
- `transform`: transformation explanation
- `rule`: related rule reference
- `required`: required flag
- `notes`: notes

Example:

```markdown
## Mappings

| source_ref | target_ref | transform | rule | required | notes |
|---|---|---|---|---|---|
| [[data/DATA-INVOICE-CANDIDATE|Invoice Candidate Data]].customer_id | [[er/ENT-INVOICE-CANDIDATE|Invoice Candidate]].customer_id | set as-is |  | Y | customer id |
| [[data/DATA-INVOICE-CANDIDATE|Invoice Candidate Data]].total_amount | [[er/ENT-INVOICE-CANDIDATE|Invoice Candidate]].total_amount | set tax-included amount | [[rule/RULE-INVOICE-AMOUNT-CALC|Amount Calculation]] | Y | amount |
|  | [[er/ENT-INVOICE-CANDIDATE|Invoice Candidate]].created_at | system timestamp |  | Y | created at |
```

## Mapping granularity

Guidelines:

- one row maps to one `target_ref`
- one-to-one is one row
- one-to-many should be multiple rows with the same `source_ref`
- many-to-one should use a representative `source_ref` and explain the other inputs in `transform`, `notes`, or `rule`
- many-to-many should be split or modeled through intermediate objects
- fixed/system/generated values may leave `source_ref` blank
- complex transformation should refer to `rule` or `app_process`

## Rules

`Rules` is free text or a list. Use it for mapping-wide rule notes. Move strict reusable rules to `rule` files.

## Qualified Ref / Member Ref

`mapping` does not require member candidates in V0.7, but it heavily uses qualified references in `source_ref` and `target_ref`.

Examples:

```markdown
[[screen/SCR-INVOICE-CLOSE-ENTRY|Invoice Close Entry]].close_date
[[data/DATA-INVOICE-CLOSE-CONDITION|Invoice Close Condition]].close_date
[[er/ENT-INVOICE-CANDIDATE|Invoice Candidate]].invoice_candidate_id
[[process/PROC-INVOICE-CREATE|Invoice Create Process]].IN-CLOSE-CONDITION
```

## Relationships

- Screen `Fields.ref` can act as a lightweight mapping.
- app_process `Inputs` and `Outputs` can be mapping sources/targets.
- data_object and er_entity fields are common mapping endpoints.
- rule can be used for transformation or validation logic.

## Validation candidates

Error candidates:

- missing `id`
- missing `name`
- empty `Mappings.target_ref`
- unresolved `source_ref` / `target_ref`
- unresolved qualified member

Warning candidates:

- `source_ref` empty and `transform` empty
- complex transform without `rule`
- empty `required`
- `Scope.source` inconsistent with `source_ref`
- `Scope.target` inconsistent with `target_ref`
- repeated `target_ref`

## Not required in V0.7

- executable transformations
- expression evaluation
- ETL-level detail
- bidirectional mapping
- delta mapping
- mapping diagram
- complete coverage validation
