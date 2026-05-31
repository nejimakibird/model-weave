# FORMAT-rule

Japanese Version: [日本語版](../ja/formats/FORMAT-rule.md)

## What this is for

`rule` defines business rules, validation rules, calculation rules, decision rules, and transformation rules.

Use this format when you want to describe:

* validation logic
* business constraints
* calculation logic
* decision conditions
* branching conditions
* eligibility checks
* mapping rules
* UI enable / disable conditions
* process branching conditions
* CodeSet-based decisions

A `rule` should describe logic.

Use `codeset` to define allowed values.
Use `rule` to define how those values are evaluated or used.

## Important concept: Rule vs CodeSet

`codeset` defines values.

`rule` defines logic.

Example:

* `codeset` defines inventory statuses:

  * `available`
  * `reserved`
  * `hold`
* `rule` defines whether inventory can be allocated:

  * status must be `available`
  * quantity must be greater than zero
  * inventory must not be expired

The rule may reference CodeSet values, but the CodeSet itself should not contain the full business logic.

## Important concept: Rule vs app_process

`app_process` describes a processing flow.

`rule` describes a reusable piece of logic used by a process, screen, mapping, or validation.

Use `app_process` for:

* process steps
* flow branches
* input / output data
* process transitions
* process-level errors

Use `rule` for:

* validation condition
* calculation formula
* decision criteria
* reusable business condition
* transformation logic

An app process step may reference a rule in `Steps.rule`.

## Minimal example

```markdown
---
type: rule
id: RULE-INVENTORY-ALLOCATABLE
name: Inventory Allocatable Rule
kind: validation
tags:
  - Rule
---

# Inventory Allocatable Rule

## Summary

Determines whether inventory can be allocated.

## Inputs

| id | data | source | required | notes |
|---|---|---|---|---|
| IN-INVENTORY | [[DATA-INVENTORY]] | inventory service | Y | Inventory data |

## Conditions

| id | expression | severity | message | notes |
|---|---|---|---|---|
| COND-STATUS | [[CODE-INVENTORY-STATUS]].available | error | Inventory must be available. | Status must be available |
| COND-QTY | quantity > 0 | error | Quantity must be greater than zero. | Quantity check |

## Outputs

| id | data | target | notes |
|---|---|---|---|
| OUT-RESULT | validation_result | caller | Rule evaluation result |
```

## Full example

```markdown
---
type: rule
id: RULE-ORDER-VALID
name: Order Validation Rule
kind: validation
tags:
  - Rule
  - Order
---

# Order Validation Rule

## Summary

Validation rule used before submitting an order.

## Inputs

| id | data | source | required | notes |
|---|---|---|---|---|
| IN-ORDER-DRAFT | [[DATA-ORDER-DRAFT]] | [[SCR-ORDER-ENTRY]] | Y | Order values entered by the user |
| IN-INVENTORY | [[DATA-INVENTORY]] | [[PROC-INVENTORY-RESERVE]] | Y | Current inventory state |

## Conditions

| id | expression | severity | message | notes |
|---|---|---|---|---|
| COND-CUSTOMER | customer_id is not empty | error | Customer is required. | Required customer |
| COND-ITEM | item_id is not empty | error | Item is required. | Required item |
| COND-QTY | quantity > 0 | error | Quantity must be greater than zero. | Numeric validation |
| COND-STOCK | [[CODE-INVENTORY-STATUS]].available | error | Inventory is not available. | CodeSet-based condition |

## Calculations

| id | expression | result | notes |
|---|---|---|---|
| CALC-AMOUNT | quantity * unit_price | order_amount | Calculates order amount |

## Outputs

| id | data | target | notes |
|---|---|---|---|
| OUT-VALIDATION-RESULT | [[DATA-VALIDATION-RESULT]] | [[PROC-ORDER-ENTRY-FLOW]].VALIDATION-RESULT | Validation result |

## Source Links

| path | notes |
|---|---|
| src/order/OrderValidationRule.ts | Rule implementation |
| src/order/OrderValidationMessages.ts | Messages used by validation |

## Notes

- This rule may be referenced from `app_process.Steps.rule`.
- CodeSet values should be referenced using qualified value references.
```

## Frontmatter

Required fields:

| field  | required | notes                     |
| ------ | -------- | ------------------------- |
| `type` | yes      | Must be `rule`.           |
| `id`   | yes      | Unique rule model ID.     |
| `name` | yes      | Display name of the rule. |

Optional fields:

| field      | notes                                                                                               |
| ---------- | --------------------------------------------------------------------------------------------------- |
| `kind`     | Rule kind, such as `validation`, `business`, `calculation`, `decision`, `mapping`, or `constraint`. |
| `tags`     | Obsidian / Markdown tags.                                                                           |
| `owner`    | Optional owner, domain, module, or team.                                                            |
| `priority` | Optional priority or evaluation order.                                                              |

Example:

```yaml
---
type: rule
id: RULE-ORDER-VALID
name: Order Validation Rule
kind: validation
tags:
  - Rule
  - Order
---
```

## Sections

Recommended structure:

```text
# <rule name>

## Summary

## Inputs

## Conditions

## Calculations

## Outputs

## Source Links

## Notes
```

Not every rule needs every section.

For a simple validation rule, `Summary`, `Inputs`, and `Conditions` may be enough.

For a calculation rule, `Calculations` may be the main section.

### Summary

Use `## Summary` to describe the purpose, business meaning, scope, and usage of the rule.

This section is free text.

### Inputs

Use `## Inputs` to describe data required to evaluate the rule.

Expected header:

```markdown
| id | data | source | required | notes |
|---|---|---|---|---|
```

Columns:

| column     | meaning                                                                 |
| ---------- | ----------------------------------------------------------------------- |
| `id`       | Input ID.                                                               |
| `data`     | Input data object, ER entity, field, value, or related model reference. |
| `source`   | Source screen, process, data object, table, API, file, or system.       |
| `required` | `Y` or `N`.                                                             |
| `notes`    | Optional explanation.                                                   |

Example:

```markdown
## Inputs

| id | data | source | required | notes |
|---|---|---|---|---|
| IN-ORDER-DRAFT | [[DATA-ORDER-DRAFT]] | [[SCR-ORDER-ENTRY]] | Y | Input values |
| IN-INVENTORY | [[DATA-INVENTORY]] | inventory service | Y | Inventory state |
```

Do not add a `ref` column to `Inputs`.
Use `data`, `source`, and `notes`.

### Conditions

Use `## Conditions` to describe validations, decision criteria, and branch conditions.

Expected header:

```markdown
| id | expression | severity | message | notes |
|---|---|---|---|---|
```

Columns:

| column       | meaning                                                    |
| ------------ | ---------------------------------------------------------- |
| `id`         | Condition ID.                                              |
| `expression` | Condition expression, rule text, or model reference.       |
| `severity`   | Severity such as `info`, `warning`, `error`, or `blocker`. |
| `message`    | Message text or message model reference.                   |
| `notes`      | Optional explanation.                                      |

Example:

```markdown
## Conditions

| id | expression | severity | message | notes |
|---|---|---|---|---|
| COND-STATUS | [[CODE-INVENTORY-STATUS]].available | error | Inventory must be available. | CodeSet value condition |
| COND-QTY | quantity > 0 | error | Quantity must be greater than zero. | Numeric condition |
```

Notes:

* `expression` may contain plain text.
* `expression` may contain CodeSet value references.
* `message` may contain a plain message or a `message` model reference.
* Keep expressions readable. Do not try to encode full programming syntax if a prose expression is clearer.

### Calculations

Use `## Calculations` for formulas, derived values, and transformation calculations.

Expected header:

```markdown
| id | expression | result | notes |
|---|---|---|---|
```

Columns:

| column       | meaning                                   |
| ------------ | ----------------------------------------- |
| `id`         | Calculation ID.                           |
| `expression` | Formula or calculation expression.        |
| `result`     | Output field, data item, or result value. |
| `notes`      | Optional explanation.                     |

Example:

```markdown
## Calculations

| id | expression | result | notes |
|---|---|---|---|
| CALC-AMOUNT | quantity * unit_price | order_amount | Calculates line amount |
| CALC-TAX | order_amount * tax_rate | tax_amount | Calculates tax |
```

### Outputs

Use `## Outputs` to describe data produced by the rule.

Expected header:

```markdown
| id | data | target | notes |
|---|---|---|---|
```

Columns:

| column   | meaning                                                              |
| -------- | -------------------------------------------------------------------- |
| `id`     | Output ID.                                                           |
| `data`   | Output data object, result value, field, or related model reference. |
| `target` | Target screen, process, data object, field, or caller.               |
| `notes`  | Optional explanation.                                                |

Example:

```markdown
## Outputs

| id | data | target | notes |
|---|---|---|---|
| OUT-VALIDATION-RESULT | [[DATA-VALIDATION-RESULT]] | [[PROC-ORDER-ENTRY-FLOW]].VALIDATION-RESULT | Validation result |
```

Do not add a `ref` column to `Outputs`.

### Source Links

`## Source Links` is optional.

Use it to connect the rule to implementation files, validation code, constants, test files, SQL, configuration, specifications, or business rule documents.

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
| src/order/OrderValidationRule.ts | Rule implementation |
| tests/order/OrderValidationRule.test.ts | Rule tests |
```

For details, see [FORMAT-common-sections](FORMAT-common-sections.md).

### Notes

Use `## Notes` for free-form design notes.

Do not add unsupported columns to structured tables just to store extra information. Put extra information in `notes`, `## Notes`, or `## Source Links`.

## Tables

### Inputs table

```markdown
| id | data | source | required | notes |
|---|---|---|---|---|
```

### Conditions table

```markdown
| id | expression | severity | message | notes |
|---|---|---|---|---|
```

### Calculations table

```markdown
| id | expression | result | notes |
|---|---|---|---|
```

### Outputs table

```markdown
| id | data | target | notes |
|---|---|---|---|
```

### Source Links table

```markdown
| path | notes |
|---|---|
```

## Qualified Ref / Member Ref

For `rule`, structured IDs may be used as member references.

Examples:

```markdown
[[RULE-ORDER-VALID]].COND-QTY
[[RULE-ORDER-VALID]].CALC-AMOUNT
[[RULE-ORDER-VALID]].OUT-VALIDATION-RESULT
```

Useful member candidates include:

* `Inputs.id`
* `Conditions.id`
* `Calculations.id`
* `Outputs.id`

Use stable IDs when other models need to refer to a specific condition, calculation, input, or output.

## Reference handling

Structured fields that may carry useful references include:

* `Inputs.data`
* `Inputs.source`
* `Conditions.expression`
* `Conditions.message`
* `Calculations.expression`
* `Calculations.result`
* `Outputs.data`
* `Outputs.target`

Plain prose may contain readable references, but analyzers should prefer structured fields when available.

## CodeSet value usage

CodeSet value usage can be detected from explicit qualified value references in structured fields.

Examples:

```markdown
[[CODE-INVENTORY-STATUS]].available
CODE-INVENTORY-STATUS.hold
```

Useful locations include:

* `Conditions.expression`
* `Calculations.expression`
* `Outputs.data`
* `Notes`

Use qualified value references when a rule condition depends on a CodeSet value.

## Relationship with app_process

`app_process` may reference rules from `Steps.rule`.

Example:

```markdown
## Steps

| id | lane | label | kind | input | output | rule | invoke | screen | notes |
|---|---|---|---|---|---|---|---|---|---|
| validate | System | Validate order | decision | IN-ORDER-DRAFT | VALIDATION-RESULT | [[RULE-ORDER-VALID]] |  |  | Branch by rule result |
```

The process describes when the rule is used.
The rule describes the logic itself.

## Relationship with screen

A `screen` may reference rule-related behavior indirectly through actions, conditions, messages, or invoked app processes.

Use `screen` for UI conditions and visible behavior.

Use `rule` for reusable validation or business logic.

## Common mistakes

### Putting process flow into a rule

Do not describe multi-step processing flow in `rule`.

Use `app_process` for process flow.

### Putting UI layout into a rule

Do not define screen fields, buttons, or screen layout in `rule`.

Use `screen` for UI structure.

### Using CodeSet as a rule

Do not put business logic into `codeset`.

Use `codeset` for allowed values and `rule` for logic.

### Adding unsupported columns

Do not add columns such as `ref`, `rule`, `condition`, `source`, or `target` unless the FORMAT explicitly defines them.

Use existing structured columns, `notes`, `## Notes`, or `## Source Links`.

### Adding `ref` to Inputs or Outputs

Do not add `ref` to `Inputs` or `Outputs`.

Use the exact headers:

```markdown
| id | data | source | required | notes |
|---|---|---|---|---|
```

```markdown
| id | data | target | notes |
|---|---|---|---|
```

### Over-encoding programming syntax

Avoid writing expressions that are too implementation-specific when a readable business expression is clearer.

Risky:

```text
if (x != null && y !== undefined && z.length > 0) return true
```

Prefer:

```text
customer_id is not empty and quantity > 0
```

Use Source Links to point to implementation code when exact program logic matters.

### Unsafe table syntax

Avoid raw `|` characters inside table cells.

Avoid Wikilink aliases such as `[[RULE-ORDER|Order Rule]]` inside tables. Use `[[RULE-ORDER]]` and put display meaning in `notes`.

## AI generation notes

When generating `rule` files with AI:

* Use `type: rule`.
* One file should define one coherent rule or rule group.
* Preserve exact table headers.
* Do not add unsupported columns.
* Do not add `ref` to `Inputs` or `Outputs`.
* Use `Conditions` for validation and decision logic.
* Use `Calculations` for formulas and derived values.
* Use `Outputs` for rule results.
* Use qualified CodeSet value references when a condition depends on a CodeSet value.
* Put process flow in `app_process`, not in `rule`.
* Put UI structure in `screen`, not in `rule`.
* Put allowed values in `codeset`, not in `rule`.
* Put extra explanation in `notes` or `## Notes`.
* Use `## Source Links` for implementation files, tests, specifications, SQL, or rule documents.

If AI creates a rule from source code or design notes, verify:

* rule purpose
* inputs
* condition expressions
* message references
* calculation expressions
* outputs
* CodeSet value references
* Source Links

## Related samples

* [Inventory search rule](../../samples/rule/RULE-INVENTORY-SEARCH.md)
* [Rule samples index](../../samples/rule/README.md)

## Related formats

* [app_process](FORMAT-app_process.md)
* [screen](FORMAT-screen.md)
* [codeset](FORMAT-codeset.md)
* [message](FORMAT-message.md)
* [mapping](FORMAT-mapping.md)
* [Common sections](FORMAT-common-sections.md)
