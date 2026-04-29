# FORMAT-app_process

## Purpose

`app_process` defines an application process that does not itself have a UI.

Typical targets:

- server-side process
- API handler
- batch job
- scheduled job
- event handler
- message handler
- background task
- registration/search/update process called from a screen

An `app_process` is not expected to be perfectly normalized at the first design stage. It can combine structured connection tables with natural-language steps and errors.

## Core policy

- An `app_process` file has `type: app_process`.
- It represents a process without UI.
- `kind` indicates the process type.
- `Triggers`, `Inputs`, `Outputs`, and `Transitions` are structured tables.
- `Steps`, `Errors`, and `Notes` are natural language sections.
- `Steps` and `Errors` are not required to be tables.
- Triggers and Transitions are optional.
- Rule, message, data_object, mapping, ER, and screen references may appear in prose.
- Screen `Actions.invoke` may call an app_process.
- Screen `Local Processes` use a similar concept for screen-local logic.

## Frontmatter

Required:

- `type`
- `id`
- `name`

Optional:

- `kind`
- `tags`

Expected `kind` values:

- `server_process`
- `api`
- `batch`
- `event`
- `message_handler`
- `scheduled_job`
- `background_task`
- `manual`
- `other`

Example:

```yaml
---
type: app_process
id: PROC-ORDER-REGISTER
name: Order Registration Process
kind: server_process
tags:
  - AppProcess
---
```

## Recommended structure

```text
# <process name>

## Summary

## Triggers

## Inputs

## Outputs

## Transitions

## Steps

## Errors

## Notes
```

Minimum:

- `Summary`
- `Inputs`
- `Outputs`
- `Steps`

## Triggers

Optional.

Columns:

- `id`
- `kind`
- `source`
- `event`
- `notes`

Example:

```markdown
## Triggers

| id | kind | source | event | notes |
|---|---|---|---|---|
| TRG-REGISTER-CLICK | screen_action | [[screen/SCR-ORDER-ENTRY|Order Entry]].ACT-REGISTER | click | Register button |
```

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
| IN-ORDER | [[data/DATA-ORDER-CONTENT|Order Content]] | [[screen/SCR-ORDER-ENTRY|Order Entry]] | Y | screen input |
```

## Outputs

Columns:

- `id`
- `data`
- `target`
- `notes`

Example:

```markdown
## Outputs

| id | data | target | notes |
|---|---|---|---|
| OUT-RESULT | [[data/DATA-ORDER-REGISTER-RESULT|Order Registration Result]] | [[screen/SCR-ORDER-COMPLETE|Order Complete]] | result data |
```

## Transitions

Optional. Use when process-level control flow after execution should be explicit.

Columns:

- `id`
- `event`
- `to`
- `condition`
- `notes`

Example:

```markdown
## Transitions

| id | event | to | condition | notes |
|---|---|---|---|---|
| TRN-SUCCESS | success | [[screen/SCR-ORDER-COMPLETE|Order Complete]] |  | success |
| TRN-ERROR | error | [[screen/SCR-ORDER-ENTRY|Order Entry]] | validation_error | return to entry |
```

## Steps

`Steps` is natural language, bullet lists, or numbered lists.

Guidelines:

- step IDs are not required
- describe order enough for humans and AI review
- links to rule, mapping, data_object, er_entity, app_process, message are allowed
- later AI review can extract common processes and rules

## Errors

`Errors` is natural language, bullet lists, or numbered lists.

Describe validation errors, transaction handling, rollback, retry, messages, and continuation behavior.

## Qualified Ref / Member Ref

`Inputs.id` and `Outputs.id` are member candidates.

Examples:

```markdown
[[process/PROC-ORDER-REGISTER|Order Registration Process]].IN-ORDER
[[process/PROC-ORDER-REGISTER|Order Registration Process]].OUT-RESULT
```

Future candidates may include `Triggers.id` and `Transitions.id`.

## Relationship with Screen

- `screen` is a UI design unit.
- `app_process` is a UI-less process unit.
- Screen `Actions.invoke` can call an `app_process`.
- Screen-local logic can be written as `Local Processes` and later extracted to `app_process` if needed.

## Validation candidates

Error candidates:

- missing `id`
- missing `name`
- duplicate `Inputs.id`
- duplicate `Outputs.id`
- unresolved `Inputs.data`
- unresolved `Outputs.data`
- unresolved trigger source
- unresolved transition target

Warning candidates:

- empty `Steps`
- empty `Summary`
- `required` not `Y`/`N`
- process has no inputs and no triggers
- process has outputs but no steps
- duplicate transition event/condition pairs

## Not required in V0.7

- app_process diagram rendering
- strict trigger/transition validation
- detailed data flow validation between steps
- retry/transaction formal specification
- automatic process splitting
- AI-based automatic normalization
- structured step IDs
- structured error IDs
