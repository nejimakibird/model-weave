# FORMAT-app_process

## Purpose

`app_process` represents an **application processing unit without its own UI** in Model Weave.

Examples:

- server-side processing
- API processing
- batch processing
- scheduled jobs
- event processing
- message handlers
- background tasks
- create/search/update processes invoked from screens

`app_process` is not intended to be fully normalized from the beginning. It allows natural-language `Steps` / `Errors` / `Notes`, while also allowing `Steps` / `Flows` to be written as structured tables for the experimental Business Flow preview.

---

## Principles

- Must have `type: app_process`
- Represents a processing unit without UI
- Uses `kind` to distinguish process types
- `Steps` can be prose, bullet lists, numbered lists, or structured tables
- Table-based `Steps` are used by the experimental Business Flow preview
- `Flows` optionally define edges between steps inside the current Business Flow
- `Transitions` optionally define exits from the current app_process / Business Flow
- `Triggers` / `Inputs` / `Outputs` can be added as the process is refined
- `Errors` / `Notes` are written as prose or bullet lists
- Existing prose/bullet `Steps` remain compatible and render as text
- References to rule, message, data_object, mapping, app_process, screen, etc. can be written in prose for human readability, but analyzers use structured table fields only in V0.8
- Can be invoked from `screen` actions

---

## Frontmatter

### Required

- `type`
- `id`
- `name`

### Optional

- `kind`
- `tags`

`kind` is kept as a free text string and is not enforced as a fixed enum.

Example:

~~~yaml
---
type: app_process
id: PROC-ORDER-REGISTER
name: Order Registration Process
kind: server_process
tags:
  - AppProcess
---
~~~

---

## Body structure

Recommended structure:

~~~text
# <process name>

## Summary

## Source Links

## Steps

## Flows

## Triggers

## Inputs

## Outputs

## Transitions

## Errors

## Notes
~~~

### Practical minimal structure

When starting a new process, the following sections are enough:

- `Summary`
- `Steps`

To explicitly represent branching or merging in the Business Flow preview, add:

- `Flows`

If `Flows` is missing or empty, table-based `Steps` are connected by row order.

### Sections added during refinement

Add these sections when process connections, inputs, outputs, or operational behavior need to be clarified:

- `Source Links`
- `Triggers`
- `Inputs`
- `Outputs`
- `Transitions`
- `Errors`
- `Notes`

Templates may include them as empty sections.

---

## Summary

Describe the process in prose.

---

## Source Links

Use this section to link implementation source files or related external files.

---

## Steps

Describe the processing steps.

`Steps` can be written in either form:

- prose, numbered list, or bullet list
- Markdown table for the experimental Business Flow preview

Existing prose/bullet `Steps` remain valid and are rendered as text.

### Prose Steps

Allowed forms include paragraphs, numbered lists, bullet lists, and explanations with subheadings.

### Table-based Steps

If `## Steps` contains a Markdown table, Model Weave parses it as structured steps for Business Flow.

Columns:

- `id`
- `lane`
- `label`
- `kind`
- `input`
- `output`
- `rule`
- `invoke`
- `screen`
- `notes`

`kind` is free text. You may use values such as `start`, `process`, `decision`, `screen`, or `end`, but Model Weave does not enforce a fixed enum.

Use `kind: flow` or `kind: subflow` when a step represents a child Business Flow or another app_process. If the referenced app_process is known, write its id in `invoke`. In 0.1.6, referenced flows are rendered as nodes in the current Business Flow and are not expanded inline.

Example:

~~~markdown
## Steps

| id | lane | label | kind | input | output | rule | invoke | screen | notes |
|---|---|---|---|---|---|---|---|---|---|
| step1 | User | Submit order | start | IN-ORDER |  |  |  | SCR-ORDER-ENTRY | User submits input |
| step2 | System | Validate order | decision | IN-ORDER | VALIDATED-ORDER | RULE-ORDER-VALID |  |  | Check required fields |
| step3 | System | Reserve inventory | subflow | VALIDATED-ORDER | RESERVED-ORDER |  | PROC-INVENTORY-RESERVE |  | Child Business Flow |
| step4 | Screen | Show result | end | RESERVED-ORDER | OUT-RESULT |  |  | SCR-ORDER-RESULT | Show completion result |
~~~

### Lane behavior

- `lane` is optional
- `lane` is a free text label
- Steps with the same non-empty `lane` value are grouped into the same Mermaid subgraph
- Steps with blank or missing `lane` are rendered directly outside lane subgraphs
- Missing `lane` is not a warning
- No automatic Unassigned lane is generated

---

## Flows

`Flows` is optional. It defines Business Flow edges for table-based `Steps`.

Columns:

- `from`
- `to`
- `condition`
- `label`
- `notes`

Example:

~~~markdown
## Flows

| from | to | condition | label | notes |
|---|---|---|---|---|
| step1 | step2 |  | submit |  |
| step2 | step3 | [[CODE-INVENTORY-STATUS]].available | OK | Normal path |
| step2 | step90 | [[CODE-INVENTORY-STATUS]].shortage | NG | Input error |
~~~

Flow behavior:

- If `## Flows` exists and has rows, its rows become Business Flow edges
- If `## Flows` is missing or empty, structured `Steps` are connected by table row order
- `from` / `to` reference `Steps.id`; they are internal step IDs, not external model references
- Invalid `from` / `to` references are diagnostics targets
- `condition` / `label` may be displayed as edge labels
- `condition` is a structured analysis target and may contain qualified codeset value references
- Plain text `condition` values are valid for display, but are not parsed as model references

---

## Triggers

Describe what starts the process. Optional.

Columns:

- `id`
- `kind`
- `source`
- `event`
- `notes`

---

## Inputs

Describe inputs received by the process. Add this during refinement when needed.

Columns:

- `id`
- `data`
- `source`
- `required`
- `notes`

---

## Outputs

Describe outputs, saved data, or return targets. Add this during refinement when needed.

Columns:

- `id`
- `data`
- `target`
- `notes`

---

## Transitions

`Transitions` defines control transitions exiting the current app_process / Business Flow. Optional.

`Flows` and `Transitions` represent different levels of control flow:

- `Flows` define connections between steps inside the current Business Flow
- `Transitions` define exits from the current app_process / Business Flow
- Target examples:
  - next Screen
  - next app_process
  - external control
  - flow-to-flow connection at a process boundary

Columns:

- `id`
- `event`
- `to`
- `condition`
- `notes`

Example:

~~~markdown
## Transitions

| id | event | to | condition | notes |
|---|---|---|---|---|
| TRN-SUCCESS | success | [[screen/SCR-ORDER-COMPLETE|Order Complete Screen]] |  | Normal exit |
| TRN-NEXT-PROCESS | next | [[process/PROC-SHIPPING-START|Start Shipping Process]] | order_registered | Connect to the next business flow |
| TRN-ERROR | error | [[screen/SCR-ORDER-ENTRY|Order Entry Screen]] | validation_error | Return to input screen |
~~~

---

## Errors

Describe errors and exception handling in prose.

`Errors` are **prose or bullet lists**, not structured tables.

---

## Notes

Free-form notes.

---

## Qualified Ref / Member Ref

For `app_process`, `Inputs.id` and `Outputs.id` are initially treated as member candidates for Qualified Ref.

`Steps` and `Errors` are not member candidates in 0.1.6 to preserve prose compatibility.

Member candidates:

- `Inputs.id`
- `Outputs.id`
- future: `Triggers.id`
- future: `Transitions.id`

## V0.8 structured condition and codeset value usage

Codeset value usage is detected only from explicit qualified value references in structured fields:

- `[[CODE-ID]].value`
- `[[path/CODE-ID]].value`
- `CODE-ID.value`, only when `CODE-ID` resolves to a `codeset`

Structured app_process targets include:

- `Inputs.data`
- `Outputs.data`
- `Flows.condition`
- `Transitions.condition` when used as a structured condition
- `Steps.input`
- `Steps.output`
- `Steps.rule`
- `Steps.invoke`
- `Steps.screen`

Do not infer value usage from:

- value code alone, such as `available`
- value label alone, such as `Available`
- `Summary`, prose `Steps`, `Errors`, `Notes`, or arbitrary prose
- `Flows.from` / `Flows.to`

`Flows.condition` may contain plain text for display. Plain text is not treated as a model reference unless it is a structured reference.

---

## Relationship with Screen

`screen` represents a UI design unit. `app_process` represents a processing unit without UI.

A Screen can invoke an app_process through `Actions.invoke`. Medium-sized screen-local behavior can be described in Screen `Local Processes`.

---

## Complete example: Business Flow

~~~markdown
---
type: app_process
id: PROC-ORDER-REGISTER
name: Order Registration Process
kind: server_process
tags:
  - AppProcess
---

# Order Registration Process

## Summary

Validate the order content received from the order entry screen and save it as order data.

## Steps

| id | lane | label | kind | input | output | rule | invoke | screen | notes |
|---|---|---|---|---|---|---|---|---|---|
| step1 | User | Submit order | start | IN-ORDER |  |  |  | SCR-ORDER-ENTRY | User submits input |
| step2 | System | Validate order | decision | IN-ORDER | VALIDATED-ORDER | RULE-ORDER-VALID |  |  | Branches to valid / invalid |
| step3 | System | Reserve inventory | subflow | VALIDATED-ORDER | RESERVED-ORDER |  | PROC-INVENTORY-RESERVE |  | Child Business Flow |
| step4 | System | Save order | process | RESERVED-ORDER | ORDER | RULE-ORDER-CREATE | PROC-ORDER-SAVE |  | Save order |
| step5 | Screen | Show complete screen | end | ORDER | OUT-RESULT |  |  | SCR-ORDER-COMPLETE | Normal exit |
| step90 |  | Show error | end | IN-ORDER |  | RULE-ORDER-VALID |  | SCR-ORDER-ENTRY | Example of missing lane |

## Flows

| from | to | condition | label | notes |
|---|---|---|---|---|
| step1 | step2 |  | submit |  |
| step2 | step3 | [[CODE-INVENTORY-STATUS]].available | OK | Normal path |
| step2 | step90 | [[CODE-INVENTORY-STATUS]].shortage | NG | Input error |
| step3 | step4 |  | reserved |  |
| step4 | step5 |  | registered |  |

## Inputs

| id | data | source | required | notes |
|---|---|---|---|---|
| IN-ORDER | [[data/DATA-ORDER-CONTENT|Order Content]] | [[screen/SCR-ORDER-ENTRY|Order Entry Screen]] | Y | Screen input |

## Outputs

| id | data | target | notes |
|---|---|---|---|
| OUT-RESULT | [[data/DATA-ORDER-REGISTER-RESULT|Order Registration Result]] | [[screen/SCR-ORDER-COMPLETE|Order Complete Screen]] | Return registration result |

## Transitions

| id | event | to | condition | notes |
|---|---|---|---|---|
| TRN-SUCCESS | success | [[screen/SCR-ORDER-COMPLETE|Order Complete Screen]] |  | Normal exit |
| TRN-ERROR | error | [[screen/SCR-ORDER-ENTRY|Order Entry Screen]] | validation_error | Return to input screen |

## Errors

- If input is invalid, return to the input screen and prompt for correction.
- If data update fails, roll back and terminate with an error.

## Notes

- `Steps` / `Flows` are the primary inputs for Business Flow preview.
- `Inputs` / `Outputs` / `Transitions` can be added during refinement.
~~~

---

## Complete example: Prose Steps

~~~markdown
---
type: app_process
id: PROC-ORDER-REGISTER-PROSE
name: Order Registration Process (Prose)
kind: server_process
---

# Order Registration Process (Prose)

## Summary

Validate the order content received from the order entry screen and save it as order data.

## Steps

1. Validate the input content.
   Check order id, product id, quantity, and customer information.
   Related rule: [[rule/RULE-ORDER-REGISTER|Registration Availability Rule]]

2. Save the order data.
   Save to order and order line tables.

3. Build the registration result.
   Return the result data for display on the completion screen.

## Errors

- If input is invalid, return to the input screen and prompt for correction.
- If data update fails, roll back and terminate with an error.
~~~

---

## 0.1.6 status

In 0.1.6, Business Flow preview based on table-based `Steps` / `Flows` is experimental.

- `Steps` / `Flows` are the primary inputs for Business Flow preview
- If `Flows` is missing, `Steps` are connected by row order
- `lane` is free text and is not a fixed enum
- `kind` is free text and is not a fixed enum
- `kind: flow` / `kind: subflow` is a lightweight convention for hierarchy
- `Transitions` represent exits from the current app_process / Business Flow

---

## Unsupported / future considerations

In 0.1.6, the following are not required:

- app_process diagrams beyond Business Flow
- BPMN
- manual layout
- automatic Unassigned lane
- Lane definition section
- strict Trigger / Transition validation
- detailed data-flow validation between steps
- Retry / Transaction details
- automatic app_process splitting
- AI-based automatic normalization
- required structured Step IDs
- structured Error IDs
- inline expansion of subflows
- automatic Business Flow rendering across multiple app_process files

The priority is to let users write processing logic as text and optionally visualize it as Business Flow.
