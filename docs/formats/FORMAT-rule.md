# FORMAT-rule

## Purpose

`rule` defines a condition, constraint, decision, validation, or business rule in Model Weave.

Typical targets:

- input validation
- execution condition
- display condition
- enabled/disabled condition
- branch condition
- transition condition
- extraction condition
- calculation condition
- exception decision
- authorization rule

A `rule` can externalize natural-language conditions from Screen and app_process so that they can be reused, reviewed, and checked more easily.

## Core policy

- A `rule` file has `type: rule`.
- Rules are written primarily in natural language.
- Do not force a strict DSL in V0.7.
- `Inputs`, `References`, and `Messages` may be structured as tables.
- `Conditions` is the main body and may be prose or lists.
- `codeset` can be referenced as a simple rule-like allowed-value source.
- Screen, app_process, and mapping may reference rules.
- Human and AI readability is more important than executable precision.

## Frontmatter

Required:

- `type`
- `id`
- `name`

Optional:

- `kind`
- `tags`

Expected `kind` values:

- `validation`
- `condition`
- `business_rule`
- `display_rule`
- `transition_rule`
- `calculation_rule`
- `authorization_rule`
- `extraction_rule`
- `other`

Example:

```yaml
---
type: rule
id: RULE-INVOICE-CLOSE-CONDITION
name: Invoice Close Condition Check
kind: validation
tags:
  - Rule
  - Invoice
---
```

## Recommended structure

```text
# <rule name>

## Summary

## Inputs

## References

## Conditions

## Messages

## Notes
```

Minimum:

- `Summary`
- `Conditions`

## Inputs

Columns:

- `id`
- `data`
- `source`
- `required`
- `notes`

Example:

```markdown
## Inputs

| id | data | source | required | notes |
|---|---|---|---|---|
| IN-CLOSE-DATE | [[data/DATA-INVOICE-CLOSE-CONDITION|Invoice Close Condition]].close_date | [[screen/SCR-INVOICE-CLOSE-ENTRY|Invoice Close Entry]].close_date | Y | close date |
```

## References

Columns:

- `ref`
- `usage`
- `notes`

Use references for codesets, master data, ER entities, related rules, and other supporting information.

Example:

```markdown
## References

| ref | usage | notes |
|---|---|---|
| [[codeset/CODE-ORDER-STATUS|Order Status]] | allowed_values | target statuses |
| [[er/ENT-ORDER|Order]] | source_table | extraction source |
| [[rule/RULE-INVOICE-DUPLICATE-CHECK|Duplicate Invoice Check]] | related_rule | exclude invoiced orders |
```

## Conditions

`Conditions` is the canonical rule body.

It may be written as:

- paragraphs
- bullet lists
- numbered lists
- subsections

Guidelines:

- condition IDs are not required
- split complex rules into multiple rule files when needed
- link to codeset / data_object / screen / er_entity when useful
- use AI review to find ambiguity, duplication, and missing cases

Example:

```markdown
## Conditions

- Close date is required.
  Target: [[data/DATA-INVOICE-CLOSE-CONDITION|Invoice Close Condition]].close_date

- Target start date must be earlier than or equal to target end date.

- If order status is not specified, use `confirmed` by default.
  Related code: [[codeset/CODE-ORDER-STATUS|Order Status]].confirmed
```

## Messages

Columns:

- `condition`
- `message`
- `severity`
- `notes`

Example:

```markdown
## Messages

| condition | message | severity | notes |
|---|---|---|---|
| close_date is empty | [[message/MSGSET-INVOICE|Invoice Messages]].INV-CLOSE-001 | error |  |
```

## Qualified Ref / Member Ref

In V0.7, `rule` does not require member candidates.

Possible future candidates:

- `Inputs.id`
- `Messages.condition`

`Conditions` is natural language and is not a member candidate.

## Relationships

- Screen `Fields.rule` / `Actions.rule` may reference rule files.
- app_process `Steps` / `Errors` may reference rule files in prose.
- mapping `rule` may reference rule files.

## Validation candidates

Error candidates:

- missing `id`
- missing `name`
- duplicate `Inputs.id`
- unresolved `Inputs.data`
- unresolved `References.ref`

Warning candidates:

- empty `Conditions`
- unresolved `Messages.message`
- potentially duplicate rule
- referenced from Screen/app_process but empty Summary

## Not required in V0.7

- DSL conversion
- executable condition evaluation
- rule engine
- complex truth tables
- automatic proof of rule consistency
