# FORMAT-app_process

Japanese Version: [日本語版](../ja/formats/FORMAT-app_process.md)

## What this is for

`app_process` represents an application processing unit without its own UI.

Use this format when you want to describe:

* server-side processing
* API processing
* batch processing
* scheduled jobs
* event processing
* message handlers
* background tasks
* business process flow
* processing invoked from screens
* processing that calls another process / subflow

`app_process` can start as prose and later be refined into structured tables.

It supports both:

* natural-language process notes
* structured Business Flow preview using table-based `Steps` and `Flows`

## Important concept: app_process vs screen

`app_process` and `screen` are related, but they model different things.

Use `screen` when you want to describe UI behavior:

* screen fields
* buttons / actions
* screen messages
* UI conditions
* screen transitions
* what the user sees or operates

Use `app_process` when you want to describe processing behavior:

* inputs
* outputs
* validation
* server-side or application logic
* batch / API / background processing
* internal process steps
* process-to-process flow
* Business Flow preview

A screen can invoke an app process.
An app process can refer back to a screen as an input source, output target, or transition destination.

However, an app process does not define the screen layout itself.
If you need to define fields, buttons, or UI actions, use `screen`.

## Important concept: prose process vs structured Business Flow

`app_process` supports two levels of detail.

### Prose process

A process can be written as prose, numbered lists, or bullet lists.

This is useful for:

* early design notes
* existing process descriptions
* lightweight documentation
* AI-generated drafts before structure is stable

Example:

```markdown
## Steps

1. Validate the search condition.
2. Query inventory rows.
3. Return matching rows to the screen.
```

Prose steps remain valid and are rendered as text.

### Structured Business Flow

If `## Steps` contains a Markdown table with the supported header, Model Weave parses it as structured steps for Business Flow preview.

Table-based `Steps` are treated as the basic order of the Business Flow.

If `## Flows` is missing or has no valid rows, Model Weave generates the flow only from the row order of `Steps`.

If `## Flows` has valid rows, the implicit flow generated from `Steps` row order is still used as the base flow. However, when a step appears in `Flows.from`, the implicit outgoing edge from that step to the next row is not generated. The explicit `Flows` rows take priority for that step.

This means you can usually write the main processing order in `Steps`, and write only the explicit connections in `Flows`, such as branches, merges, loops, exceptions, and condition labels.

Use this when you want a visual flow with domain placement, decisions, subflows, rules, screens, and step-to-step edges.

## Important concept: Flows vs Transitions

`Flows` and `Transitions` represent different levels of control flow.

| Section          | Meaning                                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------------------------- |
| `## Flows`       | Connections between steps inside the current Business Flow.                                               |
| `## Transitions` | Exits from the current app process / Business Flow to another screen, process, or external control point. |

`Flows.from` and `Flows.to` reference `Steps.id`.

They are internal step IDs.
They are not external model IDs.

`Transitions.to` may reference a screen, another process, or another destination outside the current process.

## Important concept: invoke / subflow

A table-based step can reference another process using the `invoke` column.

Typical use:

* `kind: subflow`
* `invoke: PROC-OTHER-PROCESS`

This indicates that the current step invokes or represents another app process.

In the current Business Flow preview, referenced processes are shown as nodes.
They are not expanded inline as nested diagrams unless a future implementation explicitly supports that behavior.

## Minimal example: prose process

```markdown
---
type: app_process
id: PROC-INVENTORY-SEARCH
name: Inventory Search Process
kind: server_process
flow_direction: LR
tags:
  - AppProcess
---

# Inventory Search Process

## Summary

Searches inventory records using conditions entered on the inventory search screen.

## Inputs

| id | data | source | required | notes |
|---|---|---|---|---|
| IN-CONDITION | [[DATA-INVENTORY-SEARCH-CONDITION]] | [[SCR-INVENTORY-SEARCH]] | Y | Search condition |

## Outputs

| id | data | target | notes |
|---|---|---|---|
| OUT-RESULT | [[DATA-INVENTORY-SEARCH-RESULT]] | [[SCR-INVENTORY-SEARCH]].inventory_table | Search result rows |

## Steps

1. Validate the search condition.
2. Query inventory rows.
3. Return matching rows to the screen.

## Errors

- If the condition is invalid, return a validation error message.
- If the query fails, return a common system error message.
```

## Minimal example: structured Business Flow with Steps only

```markdown
---
type: app_process
id: PROC-INVENTORY-INQUIRY
name: Inventory Inquiry Business Flow
kind: server_process
flow_direction: LR
tags:
  - AppProcess
  - BusinessFlow
---

# Inventory Inquiry Business Flow

## Summary

Processes a simple inventory inquiry.

## Steps

| id | domain | label | kind | input | output | rule | invoke | screen | notes |
|---|---|---|---|---|---|---|---|---|---|
| start | Order Center | Start inventory inquiry | start |  |  |  |  |  |  |
| open | Order Center | Open inventory screen | screen |  |  |  |  | SCR-INVENTORY-SEARCH |  |
| search | Warehouse | Search inventory | input |  |  |  |  |  |  |
| end | Order Center | End | end |  |  |  |  |  |  |
```

Because this example does not include `## Flows`, the Business Flow preview generates the following flow from `Steps` row order:

```text
start -> open -> search -> end
```

## Example: structured Business Flow with Flows

```markdown
---
type: app_process
id: PROC-ORDER-ENTRY-FLOW
name: Order Entry Business Flow
kind: server_process
flow_direction: LR
tags:
  - AppProcess
  - BusinessFlow
---

# Order Entry Business Flow

## Summary

Processes order entry submitted from the order entry screen.

## Inputs

| id | data | source | required | notes |
|---|---|---|---|---|
| IN-ORDER-DRAFT | [[DATA-ORDER-DRAFT]] | [[SCR-ORDER-ENTRY]] | Y | Order values entered by the user |

## Outputs

| id | data | target | notes |
|---|---|---|---|
| OUT-ORDER-RESULT | [[DATA-ORDER-RESULT]] | [[SCR-ORDER-COMPLETE]] | Result for completion or correction |

## Steps

| id | domain | label | kind | input | output | rule | invoke | screen | notes |
|---|---|---|---|---|---|---|---|---|---|
| start | User | Submit order | start | IN-ORDER-DRAFT |  |  |  | SCR-ORDER-ENTRY | User submits the entry form |
| validate | System | Validate order | decision | IN-ORDER-DRAFT | VALIDATION-RESULT | RULE-ORDER-VALID |  |  | Branches to valid or invalid path |
| reserve | External | Reserve inventory | subflow | IN-ORDER-DRAFT | RESERVATION-RESULT |  | PROC-INVENTORY-RESERVE |  | Child process |
| save | System | Save order | process | RESERVATION-RESULT | OUT-ORDER-RESULT |  |  |  | Persist accepted order |
| success | Screen | Show completion | end | OUT-ORDER-RESULT |  |  |  | SCR-ORDER-COMPLETE | Valid path |
| invalid | Screen | Show validation messages | end | VALIDATION-RESULT | OUT-ORDER-RESULT |  |  | SCR-ORDER-ENTRY | Invalid path |

## Flows

| from | to | condition | label | notes |
|---|---|---|---|---|
| start | validate |  | validate |  |
| validate | reserve | valid | OK | Valid order path |
| reserve | save | reserved | reserve OK | Reservation succeeded |
| save | success |  | complete |  |
| validate | invalid | invalid | NG | Invalid order path |
```

## Full example

```markdown
---
type: app_process
id: PROC-SAMPLE-ORDER-ENTRY-FLOW
name: Sample Order Entry Business Flow
kind: server_process
flow_direction: LR
tags:
  - AppProcess
  - BusinessFlow
  - Sample
---

# Sample Order Entry Business Flow

## Summary

Demonstrates table-based app_process Steps and Flows for the Business Flow preview.

## Source Links

| path | notes |
|---|---|
| src/order/OrderEntryProcess.ts | Process implementation |
| src/order/OrderValidationService.ts | Validation service |

## Triggers

| id | kind | source | event | notes |
|---|---|---|---|---|
| TRG-SUBMIT-ORDER | screen_action | [[SCR-ORDER-ENTRY]].ACT-SUBMIT | click | User submits the order entry form |

## Inputs

| id | data | source | required | notes |
|---|---|---|---|---|
| IN-ORDER-DRAFT | [[DATA-ORDER-DRAFT]] | [[SCR-ORDER-ENTRY]] | Y | Order values entered by the user |

## Outputs

| id | data | target | notes |
|---|---|---|---|
| OUT-ORDER-RESULT | [[DATA-ORDER-RESULT]] | [[SCR-ORDER-COMPLETE]] | Result for completion or correction |

## Steps

| id | domain | label | kind | input | output | rule | invoke | screen | notes |
|---|---|---|---|---|---|---|---|---|---|
| start | User | Submit order | start | IN-ORDER-DRAFT |  |  |  | SCR-ORDER-ENTRY | User submits the entry form |
| capture | Screen | Capture entered values | input | IN-ORDER-DRAFT | ORDER-CANDIDATE |  |  | SCR-ORDER-ENTRY | Read visible form values |
| validate | System | Validate order | decision | ORDER-CANDIDATE | VALIDATION-RESULT | RULE-ORDER-VALID |  |  | Branches to valid or invalid path |
| audit |  | Record validation attempt | process | VALIDATION-RESULT | AUDIT-ENTRY |  |  |  | Lane-less step |
| reserve | External | Reserve inventory | subflow | ORDER-CANDIDATE | RESERVATION-RESULT |  | PROC-INVENTORY-RESERVE |  | Child business flow |
| save | System | Save order | process | RESERVATION-RESULT | OUT-ORDER-RESULT |  |  |  | Persist accepted order |
| success | Screen | Show completion | end | OUT-ORDER-RESULT |  |  |  | SCR-ORDER-COMPLETE | Valid path |
| invalid | Screen | Show validation messages | end | VALIDATION-RESULT | OUT-ORDER-RESULT |  |  | SCR-ORDER-ENTRY | Invalid path |

## Flows

| from | to | condition | label | notes |
|---|---|---|---|---|
| start | capture |  | submit | User action |
| capture | validate |  | validate |  |
| validate | audit |  | record | Always record validation attempt |
| validate | reserve | valid | OK | Valid order path |
| reserve | save | reserved | reserve OK | Reservation succeeded |
| save | success |  | complete |  |
| validate | invalid | invalid | NG | Invalid order path |

## Transitions

| id | event | to | condition | notes |
|---|---|---|---|---|
| TRN-ORDER-COMPLETE | success | [[SCR-ORDER-COMPLETE]] | valid | Show completion screen |
| TRN-ORDER-INVALID | validation_error | [[SCR-ORDER-ENTRY]] | invalid | Return to entry screen |

## Errors

- If the order is invalid, return validation messages to the order entry screen.
- If inventory reservation fails, keep the order unsaved and show a retryable error.
- If saving fails, rollback any local transaction and show a system error.

## Notes

- The `audit` step intentionally has a blank domain.
- The `reserve` step demonstrates `invoke` as a child process reference.
```

## Frontmatter

Required fields:

| field  | required | notes                        |
| ------ | -------- | ---------------------------- |
| `type` | yes      | Must be `app_process`.       |
| `id`   | yes      | Unique process model ID.     |
| `name` | yes      | Display name of the process. |

Optional fields:

| field         | notes                                                                                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kind`        | Process kind. Free text such as `server_process`, `batch`, `api`, `job`, `event_handler`, or `business_flow`.                                           |
| `render_mode` | Optional. If specified, it overrides the initial renderer for this file. If omitted, the format-specific default render mode from the settings is used. |
| `flow_direction` | Optional Business Flow preview direction. Supported values are `LR` and `TD`. If omitted, the setting default is used. |
| `tags`        | Obsidian / Markdown tags.                                                                                                                               |

Example:

```yaml
---
type: app_process
id: PROC-ORDER-ENTRY-FLOW
name: Order Entry Business Flow
kind: server_process
flow_direction: LR
tags:
  - AppProcess
  - BusinessFlow
---
```

## Business Flow direction

`flow_direction` controls the initial Mermaid direction for the app_process Business Flow preview.

Supported values:

* `LR`: left to right.
* `TD`: top down.

Direction resolution priority:

1. Viewer toolbar override.
2. `frontmatter.flow_direction`.
3. The plugin setting default App Process Business Flow direction.
4. Built-in `LR` fallback.

Changing the toolbar direction is temporary viewer state and does not rewrite Markdown frontmatter. `flow_direction` is separate from `render_mode`.

## Sections

Recommended structure:

```text
# <process name>

## Summary

## Source Links

## Triggers

## Inputs

## Outputs

## Steps

## Flows

## Transitions

## Errors

## Notes
```

Minimum structure for a prose process:

```text
# <process name>

## Summary

## Steps
```

Minimum structure for a structured Business Flow:

```text
# <process name>

## Summary

## Steps
```

`## Flows` is optional. Add it when you need to explicitly describe branches, merges, loops, exceptions, alternate paths, or condition labels.

### Summary

Use `## Summary` to describe the process purpose, trigger context, business meaning, and processing scope.

This section is free text.

### Source Links

`## Source Links` is optional.

Use it to connect the process to implementation files, service classes, handlers, batch jobs, SQL, job definitions, workflow definitions, or process documentation.

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
| src/order/OrderEntryProcess.ts | Process implementation |
| src/order/OrderValidationService.ts | Validation service |
```

For details, see [FORMAT-common-sections](FORMAT-common-sections.md).

### Triggers

Use `## Triggers` to describe what starts the process.

Expected header:

```markdown
| id | kind | source | event | notes |
|---|---|---|---|---|
```

Columns:

| column   | meaning                                                                          |
| -------- | -------------------------------------------------------------------------------- |
| `id`     | Trigger ID.                                                                      |
| `kind`   | Trigger kind, such as `screen_action`, `api`, `schedule`, `message`, or `event`. |
| `source` | Source screen, process, system, queue, API, job, or event source.                |
| `event`  | Event name, action, schedule, message type, or trigger condition.                |
| `notes`  | Optional explanation.                                                            |

Example:

```markdown
## Triggers

| id | kind | source | event | notes |
|---|---|---|---|---|
| TRG-SEARCH-CLICK | screen_action | [[SCR-INVENTORY-SEARCH]].ACT-SEARCH | click | Search button |
```

### Inputs

Use `## Inputs` to describe data received by the process.

Expected header:

```markdown
| id | data | source | required | notes |
|---|---|---|---|---|
```

Columns:

| column     | meaning                                                                   |
| ---------- | ------------------------------------------------------------------------- |
| `id`       | Input ID.                                                                 |
| `data`     | Input data object, ER entity, message, payload, or other model reference. |
| `source`   | Source screen, process, API, file, queue, or system.                      |
| `required` | `Y` or `N`.                                                               |
| `notes`    | Optional explanation.                                                     |

Example:

```markdown
## Inputs

| id | data | source | required | notes |
|---|---|---|---|---|
| IN-CONDITION | [[DATA-INVENTORY-SEARCH-CONDITION]] | [[SCR-INVENTORY-SEARCH]] | Y | Search condition |
```

Do not add a `ref` column to `Inputs`.
Use `data`, `source`, and `notes`.

### Outputs

Use `## Outputs` to describe data produced by the process.

Expected header:

```markdown
| id | data | target | notes |
|---|---|---|---|
```

Columns:

| column   | meaning                                                                          |
| -------- | -------------------------------------------------------------------------------- |
| `id`     | Output ID.                                                                       |
| `data`   | Output data object, ER entity, message, payload, file, or other model reference. |
| `target` | Target screen, process, API, file, queue, system, or storage.                    |
| `notes`  | Optional explanation.                                                            |

Example:

```markdown
## Outputs

| id | data | target | notes |
|---|---|---|---|
| OUT-RESULT | [[DATA-INVENTORY-SEARCH-RESULT]] | [[SCR-INVENTORY-SEARCH]].inventory_table | Search result rows |
```

Do not add a `ref` column to `Outputs`.
Use `data`, `target`, and `notes`.

### Steps

Use `## Steps` to describe process steps.

`Steps` can be prose or a structured table.

#### Prose Steps

Prose steps can be paragraphs, bullet lists, or numbered lists.

They are valid and remain compatible.

Example:

```markdown
## Steps

1. Validate the search condition.
2. Query inventory rows.
3. Return matching rows to the screen.
```

#### Table-based Steps

Use table-based steps for Business Flow preview.

Expected header:

```markdown
| id | domain | label | kind | input | output | rule | invoke | screen | notes |
|---|---|---|---|---|---|---|---|---|---|
```

Columns:

| column   | meaning                                                                                    |
| -------- | ------------------------------------------------------------------------------------------ |
| `id`     | Step ID. Used by `Flows.from` and `Flows.to`.                                              |
| `domain` | Optional recommended placement group for Business Flow rendering.                           |
| `label`  | Display label for the step.                                                                |
| `kind`   | Free-text step kind. Recognized values such as `start`, `process`, `decision`, `input`, `screen`, `subflow`, `end`, `event`, `api`, `batch`, `message`, `data`, `store`, `wait`, `error`, `connector`, and `external` get specific Business Flow shapes/styles. |
| `input`  | Related input ID, data ID, or intermediate data name.                                      |
| `output` | Related output ID, data ID, or intermediate data name.                                     |
| `rule`   | Related rule ID or Wikilink.                                                               |
| `invoke` | Related app_process ID or Wikilink for a child process / subflow.                          |
| `screen` | Related screen ID or Wikilink.                                                             |
| `notes`  | Optional explanation.                                                                      |

Notes:

* `id` should be stable and simple.
* `Flows.from` / `Flows.to` reference `Steps.id`.
* `domain` is optional.
* Steps with the same non-empty `domain` may be grouped visually.
* If local `## Domains` is present and `domain` matches a local Domain `id`, Business Flow renders local Domain groups as nested containers using `Domains.parent`.
* Blank `domain` does not imply an automatic “Unassigned” group.
* `lane` is a legacy-compatible layout-only placement column. Existing `lane` tables remain valid.
* If both `domain` and `lane` are present on a step, `domain` is used and `lane` is ignored.
* With local `## Domains`, non-empty `domain` values are resolved against local Domain ids and unknown local domains produce warnings.
* Without local `## Domains` or `## Domain Sources`, `domain` values are unvalidated placement keys.
* With `## Domain Sources`, non-empty `domain` values are resolved against the referenced `domains` files and unknown domains produce warnings.
* When a local `## Domains` entry is resolved, its `kind` can color the Business Flow group using Color Scheme `target=domain`.
* Legacy `lane` groups and unresolved `domain` placement keys are not colored as Domains.
* `kind` is free text. Use consistent values within the vault.
* `invoke` references another process. It does not inline-expand the target process unless a future implementation explicitly supports it.

#### Local Domains

`## Domains` is optional. Use it when `Steps.domain` should be validated against Domain definitions in the same app_process file.

```markdown
## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| user | User | external |  | End user |
| system | System | application |  | Application system |
```

Behavior:

* If local `## Domains` is absent, `Steps.domain` still groups Business Flow steps, but Model Weave does not warn about unknown domain values unless `## Domain Sources` is present.
* If local `## Domains` is present, `Steps.domain` is resolved by local Domain `id`.
* If `## Domain Sources` is also present, external Domains are loaded first and local `## Domains` override external definitions for the same `id`.
* Resolved Domains are rendered as nested Business Flow groups using `Domains.parent`.
* Domain `name` is used as the visible group label. If `name` is empty, `id` is used.
* Domains that have no direct steps are still rendered when they are ancestors of a Domain that has steps.
* Duplicate local Domain ids produce diagnostics.
* Local Domain `parent` values must reference another resolved Domain id. With `## Domain Sources`, this may be an imported external Domain id.
* If a local Domain has an unknown parent, it is rendered as a root-level group and the parent diagnostic remains visible.
* If a local Domain overrides an external Domain `name`, `kind`, or `parent`, Model Weave reports a warning and uses the local value.
* When a Color Scheme is active, resolved Domain groups use `target=domain` and `kind=<Domains.kind>` for group colors.
* If `Steps.domain` is present but not found, Model Weave does not fall back to `Steps.lane`.
* `Steps.lane` remains legacy-compatible layout-only placement and is only used when `Steps.domain` is empty.

#### Domain Sources

`## Domain Sources` is optional. Use it when `Steps.domain` should be checked against reusable `type: domains` files.

```markdown
## Domain Sources

| ref |
|---|
| [[DOMAINS-COMPANY]] |
| [[DOMAINS-MODEL-WEAVE]] |
```

`ref` is required. `notes` is optional.

Behavior:

* If `## Domain Sources` is absent, `Steps.domain` still groups Business Flow steps, but Model Weave does not warn about unknown domain values.
* If `## Domain Sources` is present, sources are loaded in table order and merged using the same Domain Source behavior as `domain_diagram` where practical.
* If a source cannot be resolved, or resolves to a non-`domains` file, Model Weave reports a warning.
* If `Steps.domain` does not match any merged Domain id, Model Weave reports a warning.
* If local `## Domains` is also present, local rows are applied after external sources and win for the same Domain `id`.
* The merged Domain set drives Business Flow hierarchy rendering and Domain group coloring.
* If `Steps.domain` is present but unresolved, Model Weave does not fall back to `Steps.lane`.
* `Steps.lane` remains legacy-compatible layout-only placement and is only used when `Steps.domain` is empty.
* Business Flow step node colors continue to use `target=app_process` and `Steps.kind`.

#### Steps as the default flow

`Steps` defines the ordered list of process steps.

When no valid `Flows` rows are present, Model Weave connects table-based `Steps` in row order.
This lets simple sequential processes be written with only `Steps`.

Example:

```markdown
## Steps

| id | domain | label | kind | input | output | rule | invoke | screen | notes |
|---|---|---|---|---|---|---|---|---|---|
| start | User | Start | start |  |  |  |  |  |  |
| input | User | Enter condition | input |  |  |  |  |  |  |
| search | System | Search inventory | process |  |  |  |  |  |  |
| end | User | End | end |  |  |  |  |  |  |
```

Expected flow:

```text
start -> input -> search -> end
```

#### Step kind rendering

The Business Flow Mermaid preview uses `Steps.kind` to choose the node shape.
`kind` remains free text for compatibility, but recognized values get specific shapes and Color Scheme targets.
When a Color Scheme is active, Business Flow also uses `target=app_process` and `kind=<Steps.kind>` to apply colors.
Resolved local Domain groups use `target=domain` and `kind=<Domains.kind>` for group colors.
Legacy `lane` groups and unresolved domain groups remain layout-only and are not Domain-colored.
Blank or unknown `kind` values render as normal process rectangles.

| kind            | meaning                                   | visual shape            | notes                                                         |
| --------------- | ----------------------------------------- | ----------------------- | ------------------------------------------------------------- |
| `start`         | Entry point of the flow.                  | Rounded / stadium node  | Use for the first logical start point.                        |
| `end`           | Exit or terminal point of the flow.       | Rounded / stadium node  | Use for success, error, or branch endings.                    |
| `event`         | Event trigger or external occurrence.     | Rounded / stadium node  | Use for asynchronous or event-driven starts.                  |
| `error`         | Error or exceptional terminal state.      | Rounded / stadium node  | Use for failure exits or exception branches.                  |
| `process`       | Normal processing step.                   | Rectangle               | Also used when `kind` is blank or unknown.                    |
| `api`           | API call or service request.              | Rounded rectangle       | Use for application/API integration steps.                    |
| `batch`         | Batch job or scheduled processing.        | Rounded rectangle       | Use for scheduled or bulk processing.                         |
| `message`       | Message send/receive step.                | Rounded rectangle       | Use for queue, notification, or message exchange steps.       |
| `wait`          | Waiting or delayed state.                 | Rounded rectangle       | Use for timers, approvals, or asynchronous waits.             |
| `external`      | External actor or external system step.   | Rounded rectangle       | Use for interactions outside the application boundary.        |
| `decision`      | Branching or decision point.              | Diamond                 | Flow labels or conditions should explain the branches.        |
| `input`         | Input, capture, or data entry step.       | Parallelogram           | Use when the step is primarily receiving input.               |
| `screen`        | Screen interaction or screen-facing step. | Parallelogram           | Use when the step represents screen input/output interaction. |
| `subflow`       | Child process or invoked process.         | Subroutine / double-box | Often paired with `invoke`.                                   |
| `data`          | Data object or data transformation step.  | Database / cylinder     | Use when the step represents data as the main subject.        |
| `store`         | Storage or persistence step.              | Database / cylinder     | Use for reads/writes to a durable store.                      |
| `connector`     | Flow connector or continuation point.     | Circle                  | Use to keep large flows readable.                             |
| blank / unknown | Unspecified or unsupported step kind.     | Rectangle               | Unknown values should not break rendering.                    |

Color Scheme is applied to the rendered Business Flow and is preserved by PNG export where supported.

### Flows

Use `## Flows` to define step-to-step edges inside the current Business Flow.

Expected header:

```markdown
| from | to | condition | label | notes |
|---|---|---|---|---|
```

Columns:

| column      | meaning                                                               |
| ----------- | --------------------------------------------------------------------- |
| `from`      | Source `Steps.id`.                                                    |
| `to`        | Target `Steps.id`.                                                    |
| `condition` | Optional condition. Can be plain text or a qualified model reference. |
| `label`     | Optional edge label.                                                  |
| `notes`     | Optional explanation.                                                 |

Example:

```markdown
## Flows

| from | to | condition | label | notes |
|---|---|---|---|---|
| validate | reserve | [[CODE-INVENTORY-STATUS]].available | OK | Valid path |
| validate | invalid | [[CODE-INVENTORY-STATUS]].shortage | NG | Invalid path |
```

Rules:

* `from` and `to` are internal step IDs.
* Do not put external model IDs in `from` or `to`.
* If `from` or `to` does not match a `Steps.id`, it should be treated as a diagnostic target.
* The Business Flow preview uses `Steps` row order as the base flow.
* A valid explicit flow from a step suppresses that step's implicit outgoing row-order edge.
* Use explicit `Flows` for branches, merges, loops, alternate paths, exceptions, and condition labels.
* `condition` may contain a CodeSet value reference.
* Plain text `condition` values are valid for display, but they may not be parsed as model references.

#### Combining Steps row order and explicit Flows

Model Weave first creates implicit flow edges from `Steps` row order.
It then adds valid explicit `Flows` rows.

However, when a step appears in `Flows.from`, the implicit outgoing edge from that step to the next row is not generated.
Connections from that step are controlled by the explicit `Flows` rows instead.

This lets you write the main processing order in `Steps`, and write only the explicit connections in `Flows`, such as branches, merges, loops, exceptions, and condition labels.

Example:

```markdown
## Steps

| id | domain | label | kind | input | output | rule | invoke | screen | notes |
|---|---|---|---|---|---|---|---|---|---|
| start | Order Center | Start inventory inquiry | start |  |  |  |  |  |  |
| open | Order Center | Open inventory screen | screen |  |  |  |  |  |  |
| search | Warehouse | Search inventory | input |  |  |  |  |  |  |
| judge | Warehouse | Judge inventory status | decision |  |  |  |  |  |  |
| available | Warehouse | Create order | subflow |  |  |  |  |  |  |
| shortage | Warehouse | Notify shortage | subflow |  |  |  |  |  |  |
| end | Order Center | End | end |  |  |  |  |  |  |

## Flows

| from | to | condition | label | notes |
|---|---|---|---|---|
| judge | available | [[CODE-INVENTORY-STATUS]].available | Available |  |
| judge | shortage | [[CODE-INVENTORY-STATUS]].shortage | Shortage |  |
| available | end |  |  |  |
| shortage | end |  |  |  |
```

Expected flow:

```text
start -> open -> search -> judge
judge -> available -> end
judge -> shortage -> end
```

The implicit `judge -> available` row-order edge is not generated because `judge` has explicit outgoing flows.
The implicit `available -> shortage` row-order edge is also not generated because `available` has an explicit outgoing flow to `end`.

#### Flow edge label priority

The label shown on a flow edge is chosen in this order:

1. `Flows.label`
2. cleaned display text from `Flows.condition`
3. no edge label

Examples:

| condition                             | label       | diagram label                     |
| ------------------------------------- | ----------- | --------------------------------- |
| `[[CODE-INVENTORY-STATUS]].available` | `Available` | `Available`                       |
| `[[CODE-INVENTORY-STATUS]].available` |             | `CODE-INVENTORY-STATUS.available` |

### Transitions

Use `## Transitions` to define exits from the current app process.

Expected header:

```markdown
| id | event | to | condition | notes |
|---|---|---|---|---|
```

Columns:

| column      | meaning                                                                        |
| ----------- | ------------------------------------------------------------------------------ |
| `id`        | Transition ID.                                                                 |
| `event`     | Exit event, such as `success`, `error`, `validation_error`, or `next`.         |
| `to`        | Destination screen, app process, external control, or related model reference. |
| `condition` | Optional condition.                                                            |
| `notes`     | Optional explanation.                                                          |

Example:

```markdown
## Transitions

| id | event | to | condition | notes |
|---|---|---|---|---|
| TRN-SUCCESS | success | [[SCR-ORDER-COMPLETE]] | valid | Show completion screen |
| TRN-ERROR | validation_error | [[SCR-ORDER-ENTRY]] | invalid | Return to entry screen |
```

### Errors

Use `## Errors` for error handling, exception handling, validation failures, retries, and fallback behavior.

`Errors` is prose or bullet list content.

It is not a structured table in the current format.

### Notes

Use `## Notes` for free-form design notes.

Do not add unsupported columns to structured tables just to store extra information.
Put extra information in `notes`, `## Notes`, or `## Source Links`.

## Tables

### Triggers table

```markdown
| id | kind | source | event | notes |
|---|---|---|---|---|
```

### Inputs table

```markdown
| id | data | source | required | notes |
|---|---|---|---|---|
```

### Outputs table

```markdown
| id | data | target | notes |
|---|---|---|---|
```

### Steps table

```markdown
| id | domain | label | kind | input | output | rule | invoke | screen | notes |
|---|---|---|---|---|---|---|---|---|---|
```

### Flows table

```markdown
| from | to | condition | label | notes |
|---|---|---|---|---|
```

### Transitions table

```markdown
| id | event | to | condition | notes |
|---|---|---|---|---|
```

### Source Links table

```markdown
| path | notes |
|---|---|
```

## Qualified Ref / Member Ref

For `app_process`, `Inputs.id` and `Outputs.id` are member reference candidates.

Examples:

```markdown
[[PROC-INVENTORY-SEARCH]].IN-CONDITION
[[PROC-INVENTORY-SEARCH]].OUT-RESULT
```

`Steps` and `Errors` are not member candidates in the current format so that prose compatibility is preserved.

## Reference handling

Structured fields that may carry useful references include:

* `Triggers.source`
* `Inputs.data`
* `Inputs.source`
* `Outputs.data`
* `Outputs.target`
* `Steps.input`
* `Steps.output`
* `Steps.rule`
* `Steps.invoke`
* `Steps.screen`
* `Flows.condition`
* `Transitions.to`
* `Transitions.condition`

Plain prose may contain readable references, but analyzers should prefer structured fields when available.

## CodeSet value usage

CodeSet value usage can be detected from explicit qualified value references in structured fields.

Examples:

```markdown
[[CODE-INVENTORY-STATUS]].available
CODE-INVENTORY-STATUS.shortage
```

Useful locations include:

* `Flows.condition`
* `Transitions.condition`
* `Steps.notes`
* `Errors`
* `Notes`

Structured fields are more reliable than prose for usage detection.

## Relationship with screen

`screen` and `app_process` often work together.

Typical relationship:

1. A user performs an action on a screen.
2. The screen action triggers an app process.
3. The app process reads input data from the screen.
4. The app process executes validation / logic / persistence.
5. The app process returns output data to a screen or transitions to another screen.

Use `screen` for:

* fields
* buttons
* visible UI state
* screen actions
* screen-level messages
* UI transitions

Use `app_process` for:

* server-side logic
* process steps
* input / output data
* validation and business rules
* batch / API / event processing
* Business Flow preview

Do not define screen fields or UI layout in `app_process`.

## Common mistakes

### Adding unsupported columns to Inputs or Outputs

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

### Confusing Flows with Transitions

`Flows` connect steps inside the current Business Flow.

`Transitions` define exits from the current app process.

Do not use `Flows` to jump directly to screens or unrelated external processes.
Use `Transitions` for process exits.

### Using external model IDs as Flow endpoints

`Flows.from` and `Flows.to` must refer to `Steps.id`.

Avoid:

```markdown
| from | to | condition | label | notes |
|---|---|---|---|---|
| SCR-ORDER-ENTRY | PROC-ORDER-COMPLETE | valid | next | wrong level |
```

Prefer:

```markdown
| from | to | condition | label | notes |
|---|---|---|---|---|
| validate | success | valid | next | step-to-step flow |
```

### Expecting prose steps to become a Business Flow diagram

Prose steps are valid, but they are rendered as text.

Use table-based `Steps` for Business Flow preview.

### Treating invoke as inline expansion

`Steps.invoke` references another app process.

Do not assume the target process is expanded inline unless the implementation explicitly supports that behavior.

### Mixing screen definition into app_process

Do not define screen controls, fields, or UI layout in `app_process`.

Use `screen` for UI structure and `app_process` for processing logic.

### Unsafe table syntax

Avoid raw `|` characters inside table cells.

Avoid Wikilink aliases such as `[[PROC-ORDER|Order Process]]` inside tables.
Use `[[PROC-ORDER]]` and put display meaning in `label` or `notes`.

## AI generation notes

When generating `app_process` files with AI:

* Use `type: app_process`.
* Start with prose if the process is not yet structured.
* Use table-based `Steps` only when Business Flow preview is needed.
* Preserve exact table headers.
* Do not add unsupported columns.
* Do not add `ref` to `Inputs` or `Outputs`.
* Keep `Flows.from` and `Flows.to` aligned with `Steps.id`.
* Use `Transitions` for exits from the process.
* Use `Steps.invoke` for referenced child processes / subflows.
* Use `Steps.screen` only as a screen reference, not as a screen definition.
* Use `rule` to reference business or validation rules.
* Use `Inputs.data` and `Outputs.data` for data objects or related model references.
* Put extra explanation in `notes` or `## Notes`.
* Use `## Source Links` for implementation files, handlers, batch jobs, SQL, or process specs.
* Keep screen definitions in `screen` files.

If AI creates an app process from source code or design notes, verify:

* trigger source
* input / output data
* step IDs
* flow endpoints
* transition destinations
* rule references
* screen references
* invoked process references
* Source Links

## Related samples

* [Inventory search process](../../samples/app_process/PROC-INVENTORY-SEARCH.md)
* [Sample order entry business flow](../../samples/app_process/PROC-SAMPLE-ORDER-ENTRY-FLOW.md)
* [App Process samples index](../../samples/app_process/README.md)

## Related formats

* [screen](FORMAT-screen.md)
* [data_object](FORMAT-data_object.md)
* [rule](FORMAT-rule.md)
* [codeset](FORMAT-codeset.md)
* [message](FORMAT-message.md)
* [Common sections](FORMAT-common-sections.md)
