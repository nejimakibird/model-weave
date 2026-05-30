# FORMAT-screen

## Purpose

`screen` defines a UI-bearing design unit in Model Weave.

It describes screen purpose, rough layout blocks, UI targets, user/system events, invoked processes, screen transitions, messages, notes, and screen-local processes in Markdown.

`screen` is not intended to be a pixel-perfect UI implementation specification. It focuses on meaningful UI targets and event/action relationships.

In V0.8, `screen` can be treated as a UI-bearing process-like format where practical, but its subject remains the UI/screen. It shares structured concepts such as inputs, outputs, steps, conditions, rules, invokes, errors, and source links with `app_process`, but it does not gain `app_process` `Flows`.

## Core policy

- A `screen` file has `type: screen`.
- It represents a UI design unit.
- `Layout` is a rough semantic block definition, not an implementation layout.
- `Fields` define UI targets, not only input fields.
- `Fields.layout` can associate a target with a `Layout.id`.
- `Fields.condition` may describe a structured display, enabled, or input condition for a UI field/control.
- `Actions` define event handlers as `target + event`.
- `Actions.id` is optional.
- `Actions.target` usually references `Fields.id`; it is an internal UI target, not an external model reference.
- `Actions.invoke` can call an external `app_process` or a screen-local process.
- `Actions.transition` represents outgoing screen transitions.
- `Actions.condition` may describe a structured execution condition for a UI action.
- `Messages.condition` may describe a structured display condition for a message.
- Screen transition source of truth is `Actions.transition`.
- A standalone `Transitions` section is not part of the current canonical format.
- `Actions.rule` can refer to execution/display/validation rules.
- Lightweight logic can be written in `Actions.notes`.
- Medium screen-local logic can be written in `Local Processes`.
- Complex or reusable logic should be extracted to `app_process`.
- Complex flows should be represented as `app_process` and referenced from `Actions.invoke`.
- `Summary`, `Notes`, and prose descriptions are human-readable and are not parsed for codeset value usage.

## Frontmatter

Required:

- `type`
- `id`
- `name`

Optional:

- `screen_type`
- `tags`

Expected `screen_type` values:

- `entry`
- `list`
- `detail`
- `confirm`
- `complete`
- `dialog`
- `dashboard`
- `admin`
- `other`

Example:

```yaml
---
type: screen
id: SCR-WAREHOUSE-TRANSFER-ENTRY
name: Warehouse Transfer Entry
screen_type: entry
tags:
  - Screen
  - WMS
---
```

## Recommended structure

```text
# <screen name>

## Summary

## Layout

## Fields

## Actions

## Messages

## Notes

## Local Processes
```

Minimum:

- `Summary`
- `Fields`
- `Actions`

Parser/validator should not depend strictly on section order.

Older files with `## Transitions` may be read for compatibility, but new files should use `Actions.transition`.

## Layout

Defines rough semantic screen blocks.

Columns:

- `id`
- `label`
- `kind`
- `purpose`
- `notes`

Expected `kind` values:

- `header`
- `body`
- `detail`
- `footer`
- `section`
- `form_area`
- `table_area`
- `action_area`
- `search_area`
- `result_area`
- `message_area`
- `other`

Example:

```markdown
## Layout

| id | label | kind | purpose | notes |
|---|---|---|---|---|
| header | Source / Destination | header | select warehouses |  |
| detail | Transfer Items | table_area | enter item, lot, quantity |  |
| footer | Actions | action_area | check stock, save, back |  |
```

## Fields

Defines UI targets. A target can be a window, form, panel, table, input, button, label, etc.

Columns:

- `id`
- `label`
- `kind`
- `layout`
- `data_type`
- `required`
- `ref`
- `rule`
- `condition`
- `notes`

Expected `kind` values:

- `window`
- `form`
- `panel`
- `section`
- `table`
- `list`
- `input`
- `textarea`
- `select`
- `checkbox`
- `radio`
- `button`
- `link`
- `label`
- `hidden`
- `computed`
- `table_input`
- `table_select`
- `other`

Example:

```markdown
## Fields

| id | label | kind | layout | data_type | required | ref | rule | condition | notes |
|---|---|---|---|---|---|---|---|---|---|
| window | Warehouse Transfer Entry | window |  |  |  |  |  |  | whole screen |
| shipper_id | Shipper | select | header | string | Y | [[er/ENT-SHIPPER|Shipper]] |  |  |  |
| from_warehouse_id | Source Warehouse | select | header | string | Y | [[er/ENT-WAREHOUSE|Warehouse]] |  |  |  |
| item_id | Item | table_select | detail | string | Y | [[er/ENT-ITEM|Item]] |  |  |  |
| quantity | Quantity | table_input | detail | number | Y |  |  |  |  |
| check_stock_button | Check Stock | button | footer |  |  |  |  | [[CODE-INVENTORY-STATUS]].available | enabled only when inventory is available |
| save_button | Save | button | footer |  |  |  |  |  |  |
| back_button | Back | button | footer |  |  |  |  |  |  |
```

## Actions

Defines screen events, user operations, process invocation, and screen transitions.

Columns:

- `id`
- `label`
- `kind`
- `target`
- `event`
- `invoke`
- `transition`
- `rule`
- `condition`
- `notes`

Expected `kind` values:

- `ui_action`
- `field_event`
- `screen_event`
- `form_event`
- `system_event`
- `shortcut`
- `auto`
- `other`

Expected `event` values:

- `load`
- `unload`
- `click`
- `change`
- `input`
- `focus`
- `blur`
- `submit`
- `select`
- `keydown`
- `timer`
- `message`
- `other`

`target` should usually be a `Fields.id`.

`invoke` may point to:

- external `app_process`
- local process heading such as `[[#PROC-INITIALIZE|Initialize]]`

`transition` points to a destination screen. It should not be used for internal state updates, field recalculation, or message display.

Examples:

```markdown
## Actions

| id | label | kind | target | event | invoke | transition | rule | condition | notes |
|---|---|---|---|---|---|---|---|---|---|
|  | Initial Load | screen_event | window | load | [[#PROC-INITIALIZE|Initialize]] |  |  |  | set initial values |
| ACT-CHECK-STOCK | Check Stock | ui_action | check_stock_button | click | [[process/PROC-ALLOCATE-INVENTORY|Allocate Inventory]] |  | [[rule/RULE-INVENTORY-ALLOCATION|Inventory Allocation Rule]] | [[CODE-INVENTORY-STATUS]].available | show result on same screen |
| ACT-SAVE | Save | ui_action | save_button | click | [[process/PROC-REGISTER-TRANSFER|Register Transfer]] | [[screen/SCR-TRANSFER-COMPLETE|Transfer Complete]] |  |  | transition on success |
| ACT-BACK | Back | ui_action | back_button | click |  | [[screen/SCR-WMS-HOME|WMS Home]] |  |  | return to menu |
```

## Messages

Optional local screen messages.

Columns:

- `id`
- `text`
- `severity`
- `timing`
- `condition`
- `notes`

`text` may be direct text or a reference to a `message` file.

Example:

```markdown
## Messages

| id | text | severity | timing | condition | notes |
|---|---|---|---|---|---|
| MSG-STOCK-SHORTAGE | Inventory is short. | warning | after_check | [[CODE-INVENTORY-STATUS]].shortage | display when stock is insufficient |
```

## Local Processes

Use `Local Processes` for screen-local logic that is too large for `Actions.notes` but not yet worth extracting to `app_process`.

Structure:

```markdown
## Local Processes

### PROC-INITIALIZE

#### Summary

#### Inputs

#### Steps

#### Outputs

#### Conditions

#### Errors
```

`#### Conditions` is optional. It can contain structured screen-local conditions when local process details need analyzer-readable references.

Recommended columns:

- `id`
- `condition`
- `ref`
- `value`
- `notes`

`condition` may contain a qualified codeset value reference directly. `ref` + `value` may be treated as a structured codeset value reference when `ref` points to a `codeset` and `value` is a value code.

`Actions.invoke` can link to local processes with heading links:

```markdown
[[#PROC-INITIALIZE|Initialize]]
```

Example:

```markdown
## Local Processes

### PROC-INITIALIZE

#### Summary

Set initial display state.

#### Conditions

| id | condition | ref | value | notes |
|---|---|---|---|---|
| CND-STOCK-AVAILABLE | [[CODE-INVENTORY-STATUS]].available |  |  | initial stock state allows operation |
```

## V0.8 structured condition and codeset value usage

Codeset value usage is detected only from explicit qualified value references in structured fields:

- `[[CODE-ID]].value`
- `[[path/CODE-ID]].value`
- `CODE-ID.value`, only when `CODE-ID` resolves to a `codeset`

Do not infer value usage from:

- value code alone, such as `available`
- value label alone, such as `Available`
- `Summary`, `Notes`, or arbitrary prose
- `Actions.target`

Structured screen targets for V0.8 are:

- `Fields.condition`
- `Actions.condition`
- `Messages.condition`
- Local Processes `Conditions.condition`
- Local Processes `Conditions.ref` + `Conditions.value`

Condition columns are optional. Existing screen files without condition columns remain valid.

## Qualified Ref / Member Ref

Current member candidates:

- `Fields.id`
- non-empty `Actions.id`

Future candidates may include:

- `Layout.id`
- Local Process IDs
- `Messages.id`

Examples:

```markdown
[[screen/SCR-WAREHOUSE-TRANSFER-ENTRY|Warehouse Transfer Entry]].shipper_id
[[screen/SCR-WAREHOUSE-TRANSFER-ENTRY|Warehouse Transfer Entry]].ACT-SAVE
```

## Screen Preview policy

Screen Preview is not pixel-perfect UI rendering.

It may show:

- Layout blocks
- Fields grouped by layout
- invoked processes
- outgoing screens from `Actions.transition`
- messages
- diagnostics

It should not try to show:

- exact CSS/HTML/React structure
- pixel-level layout
- full modal/responsive behavior
- detailed Local Process diagrams

## Validation candidates

Error candidates:

- duplicate `Fields.id`
- `Actions.target` references unknown `Fields.id`
- unresolved external `Actions.invoke`
- unresolved `Actions.transition`
- unresolved `Fields.ref`
- `Fields.layout` references unknown `Layout.id`
- duplicate `Layout.id`

Warning candidates:

- duplicate `Actions.id`
- duplicate `target + event`
- unresolved `Actions.rule`
- unresolved `Fields.rule`
- local heading link in `Actions.invoke` not found
- button without click action
- input/select/textarea with empty `ref`
- old `## Transitions` section detected

Note candidates:

- empty `Actions.id`
- `screen_event` with empty target
- `target = window` used without a `window` field

## Not required in V0.7

- pixel-perfect UI layout
- CSS / HTML / React structure
- dedicated screen diagram file
- dedicated screen transition diagram file
- chart rendering for Local Processes
- strict Local Process validation
- full resolver support for Obsidian heading links
- strict uniqueness for `target + event`
- complete message/rule/mapping integration
- structured success/failure branching in `Actions.transition`
- automatic conversion from old `Transitions` sections
