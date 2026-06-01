# FORMAT-screen

Japanese Version: [日本語版](../ja/formats/FORMAT-screen.md)

## What this is for

`screen` represents one UI screen or view.

Use this format when you want to describe:

* screen purpose
* visible fields
* buttons / actions
* UI messages
* screen-level conditions
* transitions to other screens
* app processes invoked by screen actions
* lightweight screen-local processes
* source links to UI implementation files

`screen` is for what the user sees and operates.

Use `app_process` for the processing logic behind the screen, such as validation, business logic, persistence, batch processing, API processing, job flow, internal process flow, or Business Flow preview.

## Important concept: screen vs app_process

`screen` and `app_process` often work together, but they model different things.

Use `screen` when you want to describe UI behavior:

* fields shown on the screen
* input values
* buttons and actions
* UI messages
* UI state
* navigation / transitions
* which app process is invoked by an action
* lightweight screen-local behavior such as clear/reset, initial display, validation, display control, or message control

Use `app_process` when you want to describe processing behavior:

* process inputs
* process outputs
* validation logic
* business rules
* internal processing steps
* step-to-step flows
* server-side / batch / API logic
* job flow or internal process flow
* Business Flow preview

A screen can invoke an app process.
An app process can return data to a screen or transition to another screen.

Do not put full server-side process flows into `screen`.
Do not put UI layout fields into `app_process`.

Screen does not use `Flows` in V0.8.
If a process needs explicit step-to-step flow or branching, model it as `app_process` and reference it from `Actions.invoke`.

## Minimal example

```markdown
---
type: screen
id: SCR-INVENTORY-SEARCH
name: Inventory Search Screen
kind: search
tags:
  - Screen
---

# Inventory Search Screen

## Summary

Screen for searching inventory by item, warehouse, and status.

## Fields

| id | label | kind | layout | data_type | required | ref | condition | rule | notes |
|---|---|---|---|---|---|---|---|---|---|
| item_id | Item ID | input | search | string | N | [[ENT-ITEM]].item_id |  |  | Search condition |
| warehouse_id | Warehouse ID | input | search | string | N | [[ENT-WAREHOUSE]].warehouse_id |  |  | Search condition |
| status | Status | select | search | string | N | [[CODE-INVENTORY-STATUS]] |  |  | Inventory status |

## Actions

| id | label | kind | target | event | condition | invoke | transition | rule | notes |
|---|---|---|---|---|---|---|---|---|---|
| ACT-SEARCH | Search | submit | search_button | click |  | [[PROC-INVENTORY-SEARCH]] |  |  | Run inventory search |

## Messages

| id | text | severity | timing | condition | notes |
|---|---|---|---|---|---|
| MSG-NO-RESULT | No inventory rows found. | info | search_result |  | Search completed with no rows |
```

## Full example

```markdown
---
type: screen
id: SCR-ORDER-ENTRY
name: Order Entry Screen
kind: entry
tags:
  - Screen
  - Order
---

# Order Entry Screen

## Summary

Screen for entering and submitting a new order.

## Source Links

| path | notes |
|---|---|
| src/screens/OrderEntryScreen.tsx | UI implementation |
| src/screens/order-entry.css | Screen style |

## Fields

| id | label | kind | layout | data_type | required | ref | condition | rule | notes |
|---|---|---|---|---|---|---|---|---|---|
| customer_id | Customer ID | input | main | string | Y | [[ENT-CUSTOMER]].customer_id |  |  | Required customer |
| order_date | Order Date | input | main | date | Y | [[ENT-ORDER]].order_date |  |  | Default today |
| item_id | Item ID | input | main | string | Y | [[ENT-ITEM]].item_id |  |  | Order item |
| quantity | Quantity | input | main | number | Y | [[ENT-ORDER-LINE]].quantity |  | [[RULE-ORDER-QUANTITY]] | Must be greater than zero |
| submit_button | Submit | button | footer |  |  |  | [[CODE-SWITCH-STATE]].ON |  | Enabled when submission is allowed |

## Actions

| id | label | kind | target | event | condition | invoke | transition | rule | notes |
|---|---|---|---|---|---|---|---|---|---|
| ACT-SUBMIT | Submit | submit | submit_button | click | [[CODE-SWITCH-STATE]].ON | [[PROC-ORDER-ENTRY-FLOW]] |  |  | Submit order |
| ACT-CLEAR | Clear | clear | clear_button | click |  |  |  |  | Clear entered values |
| ACT-BACK | Back | navigate | back_button | click |  |  | [[SCR-MENU]] |  | Return to menu |

## Messages

| id | text | severity | timing | condition | notes |
|---|---|---|---|---|---|
| MSG-VALIDATION-ERROR | Please correct the highlighted fields. | warning | validation_error |  | Returned from app process |
| MSG-SAVED | Order has been saved. | info | saved |  | Completion message |
| MSG-SUBMIT-DISABLED | Submit is currently disabled. | warning | input_change | [[CODE-SWITCH-STATE]].OFF | Displayed when the submit action is not available |

## Transitions

| id | event | to | condition | notes |
|---|---|---|---|---|
| TRN-COMPLETE | success | [[SCR-ORDER-COMPLETE]] |  | Go to completion screen |
| TRN-BACK | back | [[SCR-MENU]] |  | Return to menu |

## Local Processes

### PROC-CLEAR

#### Summary

Clears screen-local input values.

#### Inputs

| id | data | source | required | notes |
|---|---|---|---|---|
| INP-CURRENT-DRAFT | [[DATA-ORDER-DRAFT]] | screen | N | Current screen input values |

#### Steps

| id | label | kind | condition | input | output | rule | invoke | screen | notes |
|---|---|---|---|---|---|---|---|---|---|
| STP-CLEAR-FIELDS | Clear fields | ui_control |  | [[DATA-ORDER-DRAFT]] | [[DATA-ORDER-DRAFT]] |  |  |  | Reset input values |
| STP-DISABLE-SUBMIT | Disable submit | ui_control | [[CODE-SWITCH-STATE]].OFF |  |  |  |  |  | Disable submit button |

#### Outputs

| id | data | target | notes |
|---|---|---|---|
| OUT-CLEARED-DRAFT | [[DATA-ORDER-DRAFT]] | screen | Cleared input values |

#### Errors

| id | condition | message | notes |
|---|---|---|---|
| ERR-CLEAR-FAILED |  | MSG-VALIDATION-ERROR | Shown if local clear processing fails |

## Notes

- Server-side validation is modeled in `app_process`.
- This screen defines visible fields, user actions, messages, and lightweight screen-local behavior.
```

## Frontmatter

Required fields:

| field  | required | notes                       |
| ------ | -------- | --------------------------- |
| `type` | yes      | Must be `screen`.           |
| `id`   | yes      | Unique screen model ID.     |
| `name` | yes      | Display name of the screen. |

Optional fields:

| field         | notes                                                                          |
| ------------- | ------------------------------------------------------------------------------ |
| `kind`        | Screen kind, such as `search`, `entry`, `detail`, `list`, `menu`, or `dialog`. |
| `render_mode` | Optional. Supported value is `custom`. If omitted, the settings default is used. |
| `tags`        | Obsidian / Markdown tags.                                                      |

Example:

```yaml
---
type: screen
id: SCR-INVENTORY-SEARCH
name: Inventory Search Screen
kind: search
tags:
  - Screen
---
```

## Sections

Recommended structure:

```text
# <screen name>

## Summary

## Source Links

## Fields

## Actions

## Messages

## Transitions

## Local Processes

## Notes
```

### Summary

Use `## Summary` to describe the purpose of the screen, user role, main operation, and usage context.

This section is free text.

Summary text is not parsed for codeset value usage.

### Source Links

`## Source Links` is optional.

Use it to connect the screen model to UI implementation files, component files, templates, stylesheets, route definitions, or test files.

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
| src/screens/InventorySearchScreen.tsx | UI implementation |
| tests/screens/InventorySearchScreen.test.ts | UI tests |
```

For details, see [FORMAT-common-sections](FORMAT-common-sections.md).

### Fields

Use `## Fields` to define visible screen fields, input values, output values, table columns, hidden values, buttons, controls, or display-only values.

Expected header:

```markdown
| id | label | kind | layout | data_type | required | ref | condition | rule | notes |
|---|---|---|---|---|---|---|---|---|---|
```

Columns:

| column      | meaning                                                                                |
| ----------- | -------------------------------------------------------------------------------------- |
| `id`        | Field/control ID.                                                                      |
| `label`     | Display label.                                                                         |
| `kind`      | Field/control kind, such as `input`, `label`, `select`, `button`, `grid`, or `hidden`. |
| `layout`    | Layout area or group, such as `header`, `main`, `footer`, or `dialog`.                 |
| `data_type` | Data type, such as `string`, `number`, `date`, `boolean`, or blank for controls.       |
| `required`  | `Y`, `N`, or blank.                                                                    |
| `ref`       | Related model reference, such as data object field, ER field, or CodeSet.              |
| `condition` | Optional display / enabled / input / control condition.                                |
| `rule`      | Related validation or business rule.                                                   |
| `notes`     | Optional human explanation. Not parsed for codeset value usage.                        |

Example:

```markdown
## Fields

| id | label | kind | layout | data_type | required | ref | condition | rule | notes |
|---|---|---|---|---|---|---|---|---|---|
| item_id | Item ID | input | search | string | N | [[ENT-ITEM]].item_id |  |  | Search condition |
| status | Status | select | search | string | N | [[CODE-INVENTORY-STATUS]] |  |  | CodeSet |
| order_button | Order | button | result |  |  |  | [[CODE-INVENTORY-STATUS]].available |  | Enabled only when inventory is available |
```

Notes:

* `ref` may point to data object fields, ER fields, CodeSets, CodeSet values, or related model elements.
* Use `condition` for display, enablement, input, validation, or state conditions.
* Use `rule` for validation or business rule references.
* Use `notes` for human explanation only.

### Actions

Use `## Actions` to define user operations available on the screen.

Expected header:

```markdown
| id | label | kind | target | event | condition | invoke | transition | rule | notes |
|---|---|---|---|---|---|---|---|---|---|
```

Columns:

| column       | meaning                                                                                               |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| `id`         | Action ID.                                                                                            |
| `label`      | Display label.                                                                                        |
| `kind`       | Action kind, such as `submit`, `search`, `clear`, `navigate`, `open`, `close`, or `delete`.           |
| `target`     | Internal UI element/control ID affected by or triggering the action. Not an external model reference. |
| `event`      | UI event, such as `click`, `load`, `change`, `submit`, or `select`.                                   |
| `condition`  | Optional visibility / enablement / execution condition.                                               |
| `invoke`     | Related `app_process` or callable process reference invoked by this action.                           |
| `transition` | Destination screen reference when the action directly navigates to another screen.                    |
| `rule`       | Related rule reference.                                                                               |
| `notes`      | Optional human explanation.                                                                           |

Example:

```markdown
## Actions

| id | label | kind | target | event | condition | invoke | transition | rule | notes |
|---|---|---|---|---|---|---|---|---|---|
| ACT-SEARCH | Search | search | search_button | click |  | [[PROC-INVENTORY-SEARCH]] |  |  | Run inventory search |
| ACT-ORDER | Order | submit | order_button | click | [[CODE-INVENTORY-STATUS]].available | [[PROC-CREATE-ORDER]] | [[SCR-ORDER-ENTRY]] |  | Create an order when inventory is available |
| ACT-CLEAR | Clear | clear | clear_button | click |  |  |  |  | Clear conditions |
```

Notes:

* Use `invoke` when the action invokes application processing.
* Use `transition` when the action directly navigates to another screen.
* `target` is an internal UI target/control ID.
* Do not define full process steps in the screen. Put them in `app_process`.

### Messages

Use `## Messages` to define screen-level messages.

Expected header:

```markdown
| id | text | severity | timing | condition | notes |
|---|---|---|---|---|---|
```

Columns:

| column      | meaning                                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------- |
| `id`        | Message ID.                                                                                                   |
| `text`      | Message text or message model reference.                                                                      |
| `severity`  | Message severity, such as `info`, `warning`, `error`, or `success`.                                           |
| `timing`    | Timing when the message is displayed, such as `load`, `input_change`, `search_result`, or `validation_error`. |
| `condition` | Condition where the message is shown.                                                                         |
| `notes`     | Optional human explanation.                                                                                   |

Example:

```markdown
## Messages

| id | text | severity | timing | condition | notes |
|---|---|---|---|---|---|
| MSG-NO-RESULT | No inventory rows found. | info | search_result |  | Search completed with no rows |
| MSG-SHORTAGE | Inventory is short. | warning | search_result | [[CODE-INVENTORY-STATUS]].shortage | Shown when inventory is short |
| MSG-VALIDATION | Please correct the highlighted fields. | warning | validation_error |  | Returned from process |
```

### Transitions

Use `## Transitions` to define screen navigation when navigation is better described separately from `Actions.transition`.

Expected header:

```markdown
| id | event | to | condition | notes |
|---|---|---|---|---|
```

Columns:

| column      | meaning                                     |
| ----------- | ------------------------------------------- |
| `id`        | Transition ID.                              |
| `event`     | Event or outcome that triggers navigation.  |
| `to`        | Destination screen or external destination. |
| `condition` | Optional condition.                         |
| `notes`     | Optional explanation.                       |

Example:

```markdown
## Transitions

| id | event | to | condition | notes |
|---|---|---|---|---|
| TRN-DETAIL | open_detail | [[SCR-INVENTORY-DETAIL]] | row_selected | Open detail screen |
| TRN-BACK | back | [[SCR-MENU]] |  | Return to menu |
```

Notes:

* `Transitions` describe UI navigation.
* Simple action-triggered navigation can be written directly in `Actions.transition`.
* Process exits should be described in `app_process.Transitions`.
* Do not use screen `Transitions` to describe internal app process flow edges.

### Local Processes

`## Local Processes` is optional.

Use it for lightweight screen-local behavior such as:

* clear/reset
* initial display
* local input validation
* display control
* button enable/disable control
* message control

Local Processes should remain screen-local.

If behavior needs explicit step-to-step flow, complex branching, persistence, API processing, batch processing, or reusable business logic, define it as `app_process` and reference it from `Actions.invoke`.

Screen Local Processes do not use `Flows` in V0.8.

Recommended skeleton:

```markdown
## Local Processes

### PROC-CLEAR

#### Summary

#### Inputs

| id | data | source | required | notes |
|---|---|---|---|---|
|  |  |  |  |  |

#### Steps

| id | label | kind | condition | input | output | rule | invoke | screen | notes |
|---|---|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |  |  |

#### Outputs

| id | data | target | notes |
|---|---|---|---|
|  |  |  |  |

#### Errors

| id | condition | message | notes |
|---|---|---|---|
|  |  |  |  |
```

Subsections:

| subsection | purpose                                                                        |
| ---------- | ------------------------------------------------------------------------------ |
| `Summary`  | Free text summary of the local process. Not parsed for codeset value usage.    |
| `Inputs`   | Screen-local input data used by the local process.                             |
| `Steps`    | Lightweight screen-local steps. `condition` may contain structured references. |
| `Outputs`  | Screen-local output data or target UI elements.                                |
| `Errors`   | Screen-local error or message conditions.                                      |

Example:

```markdown
### PROC-CLEAR

#### Summary

Clear local input values and reset button state.

#### Steps

| id | label | kind | condition | input | output | rule | invoke | screen | notes |
|---|---|---|---|---|---|---|---|---|---|
| STP-CLEAR-FIELDS | Clear fields | ui_control |  | [[DATA-ORDER-DRAFT]] | [[DATA-ORDER-DRAFT]] |  |  |  | Reset input values |
| STP-DISABLE-SUBMIT | Disable submit | ui_control | [[CODE-SWITCH-STATE]].OFF |  |  |  |  |  | Disable submit button |

#### Errors

| id | condition | message | notes |
|---|---|---|---|
| ERR-CLEAR-DISABLED | [[CODE-SWITCH-STATE]].OFF | MSG-SUBMIT-DISABLED | Shown when clear cannot run |
```

### Notes

Use `## Notes` for free-form design notes.

Do not add unsupported columns to structured tables just to store extra information. Put extra information in `notes`, `## Notes`, or `## Source Links`.

Notes text is not parsed for codeset value usage.

## Tables

### Fields table

```markdown
| id | label | kind | layout | data_type | required | ref | condition | rule | notes |
|---|---|---|---|---|---|---|---|---|---|
```

### Actions table

```markdown
| id | label | kind | target | event | condition | invoke | transition | rule | notes |
|---|---|---|---|---|---|---|---|---|---|
```

### Messages table

```markdown
| id | text | severity | timing | condition | notes |
|---|---|---|---|---|---|
```

### Transitions table

```markdown
| id | event | to | condition | notes |
|---|---|---|---|---|
```

### Local Process Inputs table

```markdown
| id | data | source | required | notes |
|---|---|---|---|---|
```

### Local Process Steps table

```markdown
| id | label | kind | condition | input | output | rule | invoke | screen | notes |
|---|---|---|---|---|---|---|---|---|---|
```

### Local Process Outputs table

```markdown
| id | data | target | notes |
|---|---|---|---|
```

### Local Process Errors table

```markdown
| id | condition | message | notes |
|---|---|---|---|
```

### Source Links table

```markdown
| path | notes |
|---|---|
```

## Qualified Ref / Member Ref

For `screen`, structured IDs may be used as member references.

Examples:

```markdown
[[SCR-INVENTORY-SEARCH]].item_id
[[SCR-INVENTORY-SEARCH]].ACT-SEARCH
[[SCR-INVENTORY-SEARCH]].MSG-NO-RESULT
```

Useful member candidates include:

* `Fields.id`
* `Actions.id`
* `Messages.id`
* `Transitions.id`
* `Local Processes` process IDs
* `Local Processes > Steps.id`
* `Local Processes > Errors.id`

Use stable IDs when other models need to refer to screen fields, actions, messages, transitions, or local process elements.

## Reference handling

Structured fields that may carry useful references include:

* `Fields.ref`
* `Fields.condition`
* `Fields.rule`
* `Actions.condition`
* `Actions.invoke`
* `Actions.transition`
* `Actions.rule`
* `Messages.text`
* `Messages.condition`
* `Transitions.to`
* `Transitions.condition`
* `Local Processes > Inputs.data`
* `Local Processes > Steps.condition`
* `Local Processes > Steps.input`
* `Local Processes > Steps.output`
* `Local Processes > Steps.rule`
* `Local Processes > Steps.invoke`
* `Local Processes > Steps.screen`
* `Local Processes > Outputs.data`
* `Local Processes > Outputs.target`
* `Local Processes > Errors.condition`
* `Local Processes > Errors.message`

`Actions.target` is an internal UI element/control ID and should not be treated as an external model reference.

Plain prose may contain readable references, but analyzers should use structured fields only.

## CodeSet value usage

CodeSet value usage can be detected from explicit qualified value references in structured fields.

Examples:

```markdown
[[CODE-SWITCH-STATE]].ON
[[04_codeset/CODE-INVENTORY-STATUS]].available
CODE-INVENTORY-STATUS.available
```

These references mean:

* codeset: `CODE-INVENTORY-STATUS`
* value: `available`

Useful locations include:

* `Fields.condition`
* `Actions.condition`
* `Messages.condition`
* `Transitions.condition`
* `Local Processes > Steps.condition`
* `Local Processes > Errors.condition`

Model Weave does not infer CodeSet value usage from:

* value code alone, such as `available`
* value label alone, such as `良品利用可`
* `Summary`
* `Notes`
* arbitrary prose
* `Actions.target`

Structured condition fields are the recommended way to make CodeSet/state usage analyzable.

## Relationship with app_process

A typical UI-to-process relationship is:

1. The user performs a screen action.
2. `Actions.invoke` references an `app_process`.
3. The app process receives input data from the screen.
4. The app process returns output data or navigates to another screen.

Use `screen` for:

* visible fields
* UI actions
* UI messages
* UI transitions
* screen-local conditions
* lightweight screen-local behavior

Use `app_process` for:

* process inputs and outputs
* validation / business logic
* internal processing steps
* step-to-step flows
* Business Flow preview
* server-side / API / batch logic
* job flow or internal process flow

## Common mistakes

### Putting full processing flows into screen

Do not describe full server-side processing flows or job flows in `screen`.

Use `app_process` for process steps, flows, and business logic.

### Adding Flows to screen

Do not add `Flows` to `screen` in V0.8.

If you need step-to-step edges, use `app_process.Flows`.

### Defining UI fields in app_process

Do not define UI layout fields in `app_process`.

Use `screen.Fields` for visible fields and UI data binding.

### Adding unsupported columns

Do not add columns such as `description`, `source`, or `target` unless the FORMAT explicitly defines them.

Use `notes`, `## Notes`, or `## Source Links`.

### Treating Actions.target as a model reference

`Actions.target` is an internal UI element/control ID.

Use `Actions.invoke`, `Actions.transition`, or `Actions.rule` for external model references.

### Parsing Notes as structured usage

Do not rely on `Notes` or free-form prose for CodeSet/state usage tracking.

Use structured condition fields.

### Confusing screen transitions with process transitions

Screen `Transitions` describe UI navigation.

App process `Transitions` describe exits from a process.

Do not use screen `Transitions` to describe internal Business Flow step-to-step edges. Use `app_process.Flows`.

### Unsafe table syntax

Avoid raw `|` characters inside table cells.

Avoid Wikilink aliases such as `[[SCR-ORDER|Order Screen]]` inside tables. Use `[[SCR-ORDER]]` and put display meaning in `label` or `notes`.

## AI generation notes

When generating `screen` files with AI:

* Use `type: screen`.
* One file should define one screen or view.
* Preserve exact table headers.
* Do not add unsupported columns.
* Use `Fields` for visible fields and UI-bound values.
* Use `Fields.condition` for field display, enablement, input, or control conditions.
* Use `Actions` for user operations.
* Use `Actions.invoke` to reference `app_process`.
* Use `Actions.transition` for direct screen navigation.
* Use `Actions.condition` for action execution conditions.
* Use `Messages` for screen-level messages.
* Use `Messages.condition` for message display conditions.
* Use `Transitions` for UI navigation when navigation is better described separately from `Actions.transition`.
* Use `Local Processes` only for lightweight screen-local behavior.
* Do not add `Flows` to `screen`.
* Keep server-side logic and process flows in `app_process`.
* Use stable IDs for fields, actions, messages, transitions, and local process elements.
* Put extra explanation in `notes` or `## Notes`.
* Use `## Source Links` for UI implementation files, templates, styles, routes, and tests.

If AI creates a screen model from UI code or screenshots, verify:

* field IDs
* field labels
* field kinds
* layouts
* data bindings
* action IDs
* action targets
* action events
* process references
* message conditions
* transition destinations
* Local Processes scope
* Source Links

## Related samples

* [Inventory search screen](../../samples/screen/SCR-INVENTORY-SEARCH.md)
* [Screen samples index](../../samples/screen/README.md)

## Related formats

* [app_process](FORMAT-app_process.md)
* [data_object](FORMAT-data_object.md)
* [message](FORMAT-message.md)
* [codeset](FORMAT-codeset.md)
* [Common sections](FORMAT-common-sections.md)
