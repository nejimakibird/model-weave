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
* source links to UI implementation files

`screen` is for what the user sees and operates.

Use `app_process` for the processing logic behind the screen, such as validation, business logic, persistence, batch processing, API processing, or Business Flow preview.

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

Use `app_process` when you want to describe processing behavior:

* process inputs
* process outputs
* validation logic
* business rules
* internal processing steps
* server-side / batch / API logic
* Business Flow preview

A screen can invoke an app process.
An app process can return data to a screen or transition to another screen.

Do not put server-side process steps into `screen`.
Do not put UI layout fields into `app_process`.

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

| id | label | data | ref | required | condition | notes |
|---|---|---|---|---|---|---|
| item_id | Item ID | [[DATA-INVENTORY-SEARCH-CONDITION]].item_id | [[ENT-ITEM]].item_id | N |  | Search condition |
| warehouse_id | Warehouse ID | [[DATA-INVENTORY-SEARCH-CONDITION]].warehouse_id | [[ENT-WAREHOUSE]].warehouse_id | N |  | Search condition |

## Actions

| id | label | kind | process | condition | notes |
|---|---|---|---|---|---|
| ACT-SEARCH | Search | submit | [[PROC-INVENTORY-SEARCH]] |  | Run inventory search |

## Messages

| id | message | condition | severity | notes |
|---|---|---|---|---|
| MSG-NO-RESULT | No inventory rows found. | no_result | info | Search completed with no rows |
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

| id | label | data | ref | required | condition | notes |
|---|---|---|---|---|---|---|
| customer_id | Customer ID | [[DATA-ORDER-DRAFT]].customer_id | [[ENT-CUSTOMER]].customer_id | Y |  | Required customer |
| order_date | Order Date | [[DATA-ORDER-DRAFT]].order_date | [[ENT-ORDER]].order_date | Y |  | Default today |
| item_id | Item ID | [[DATA-ORDER-DRAFT]].item_id | [[ENT-ITEM]].item_id | Y |  | Order item |
| quantity | Quantity | [[DATA-ORDER-DRAFT]].quantity | [[ENT-ORDER-LINE]].quantity | Y |  | Must be greater than zero |

## Actions

| id | label | kind | process | condition | notes |
|---|---|---|---|---|---|
| ACT-SUBMIT | Submit | submit | [[PROC-ORDER-ENTRY-FLOW]] |  | Submit order |
| ACT-CLEAR | Clear | clear |  |  | Clear entered values |
| ACT-BACK | Back | navigate |  |  | Return to menu |

## Messages

| id | message | condition | severity | notes |
|---|---|---|---|---|
| MSG-VALIDATION-ERROR | Please correct the highlighted fields. | validation_error | warning | Returned from app process |
| MSG-SAVED | Order has been saved. | saved | info | Completion message |

## Transitions

| id | action | to | condition | notes |
|---|---|---|---|---|
| TRN-COMPLETE | ACT-SUBMIT | [[SCR-ORDER-COMPLETE]] | success | Go to completion screen |
| TRN-BACK | ACT-BACK | [[SCR-MENU]] |  | Return to menu |

## Notes

- Server-side validation is modeled in `app_process`.
- This screen defines visible fields and user actions.
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
| `render_mode` | Usually `auto`.                                                                |
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

## Notes
```

### Summary

Use `## Summary` to describe the purpose of the screen, user role, main operation, and usage context.

This section is free text.

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

Use `## Fields` to define visible screen fields, input values, output values, table columns, hidden values, or display-only values.

Expected header:

```markdown
| id | label | data | ref | required | condition | notes |
|---|---|---|---|---|---|---|
```

Columns:

| column      | meaning                                               |
| ----------- | ----------------------------------------------------- |
| `id`        | Field ID.                                             |
| `label`     | Display label.                                        |
| `data`      | Related data object field or logical data reference.  |
| `ref`       | Related model reference, such as ER field or CodeSet. |
| `required`  | `Y` or `N`.                                           |
| `condition` | Optional display / enable / validation condition.     |
| `notes`     | Optional explanation.                                 |

Example:

```markdown
## Fields

| id | label | data | ref | required | condition | notes |
|---|---|---|---|---|---|---|
| item_id | Item ID | [[DATA-INVENTORY-SEARCH-CONDITION]].item_id | [[ENT-ITEM]].item_id | N |  | Search condition |
| status | Status | [[DATA-INVENTORY-SEARCH-CONDITION]].status | [[CODE-INVENTORY-STATUS]] | N |  | CodeSet |
```

Notes:

* `data` should point to the screen data structure when available.
* `ref` may point to ER fields, CodeSet values, or related model elements.
* Use `condition` for display, enablement, validation, or state conditions.
* Use `notes` for details that do not belong in structured columns.

### Actions

Use `## Actions` to define user operations available on the screen.

Expected header:

```markdown
| id | label | kind | process | condition | notes |
|---|---|---|---|---|---|
```

Columns:

| column      | meaning                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------- |
| `id`        | Action ID.                                                                                  |
| `label`     | Display label.                                                                              |
| `kind`      | Action kind, such as `submit`, `search`, `clear`, `navigate`, `open`, `close`, or `delete`. |
| `process`   | Related `app_process` or process-like reference invoked by this action.                     |
| `condition` | Optional enablement / visibility / execution condition.                                     |
| `notes`     | Optional explanation.                                                                       |

Example:

```markdown
## Actions

| id | label | kind | process | condition | notes |
|---|---|---|---|---|---|
| ACT-SEARCH | Search | search | [[PROC-INVENTORY-SEARCH]] |  | Run inventory search |
| ACT-CLEAR | Clear | clear |  |  | Clear conditions |
```

Notes:

* Use `process` when the action invokes application processing.
* Do not define process steps in the screen. Put them in `app_process`.

### Messages

Use `## Messages` to define screen-level messages.

Expected header:

```markdown
| id | message | condition | severity | notes |
|---|---|---|---|---|
```

Columns:

| column      | meaning                                                             |
| ----------- | ------------------------------------------------------------------- |
| `id`        | Message ID.                                                         |
| `message`   | Message text or message model reference.                            |
| `condition` | Condition where the message is shown.                               |
| `severity`  | Message severity, such as `info`, `warning`, `error`, or `success`. |
| `notes`     | Optional explanation.                                               |

Example:

```markdown
## Messages

| id | message | condition | severity | notes |
|---|---|---|---|---|
| MSG-NO-RESULT | No inventory rows found. | no_result | info | Search completed with no rows |
| MSG-VALIDATION | Please correct the highlighted fields. | validation_error | warning | Returned from process |
```

### Transitions

Use `## Transitions` to define screen navigation.

Expected header:

```markdown
| id | action | to | condition | notes |
|---|---|---|---|---|
```

Columns:

| column      | meaning                                     |
| ----------- | ------------------------------------------- |
| `id`        | Transition ID.                              |
| `action`    | Related screen action ID.                   |
| `to`        | Destination screen or external destination. |
| `condition` | Optional condition.                         |
| `notes`     | Optional explanation.                       |

Example:

```markdown
## Transitions

| id | action | to | condition | notes |
|---|---|---|---|---|
| TRN-DETAIL | ACT-OPEN-DETAIL | [[SCR-INVENTORY-DETAIL]] | row_selected | Open detail screen |
| TRN-BACK | ACT-BACK | [[SCR-MENU]] |  | Return to menu |
```

Notes:

* `Transitions` describe UI navigation.
* Process exits should be described in `app_process.Transitions`.

### Notes

Use `## Notes` for free-form design notes.

Do not add unsupported columns to structured tables just to store extra information. Put extra information in `notes`, `## Notes`, or `## Source Links`.

## Tables

### Fields table

```markdown
| id | label | data | ref | required | condition | notes |
|---|---|---|---|---|---|---|
```

### Actions table

```markdown
| id | label | kind | process | condition | notes |
|---|---|---|---|---|---|
```

### Messages table

```markdown
| id | message | condition | severity | notes |
|---|---|---|---|---|
```

### Transitions table

```markdown
| id | action | to | condition | notes |
|---|---|---|---|---|
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

Use stable IDs when other models need to refer to screen fields, actions, messages, or transitions.

## Reference handling

Structured fields that may carry useful references include:

* `Fields.data`
* `Fields.ref`
* `Fields.condition`
* `Actions.process`
* `Actions.condition`
* `Messages.message`
* `Messages.condition`
* `Transitions.to`
* `Transitions.condition`

Plain prose may contain readable references, but analyzers should prefer structured fields when available.

## CodeSet value usage

CodeSet value usage can be detected from explicit qualified value references in structured fields.

Examples:

```markdown
[[CODE-SWITCH-STATE]].ON
CODE-INVENTORY-STATUS.available
```

Useful locations include:

* `Fields.condition`
* `Actions.condition`
* `Messages.condition`
* `Transitions.condition`
* `Fields.ref`
* `Notes`

Structured fields are more reliable than prose for usage detection.

## Relationship with app_process

A typical UI-to-process relationship is:

1. The user performs a screen action.
2. `Actions.process` references an `app_process`.
3. The app process receives input data from the screen.
4. The app process returns output data or navigates to another screen.

Use `screen` for:

* visible fields
* UI actions
* UI messages
* UI transitions
* user-visible conditions

Use `app_process` for:

* process inputs and outputs
* validation / business logic
* internal processing steps
* Business Flow preview
* server-side / API / batch logic

## Common mistakes

### Putting processing steps into screen

Do not describe server-side processing steps in `screen`.

Use `app_process` for process steps and business logic.

### Defining UI fields in app_process

Do not define UI layout fields in `app_process`.

Use `screen.Fields` for visible fields and UI data binding.

### Adding unsupported columns

Do not add columns such as `description`, `rule`, `source`, or `target` unless the FORMAT explicitly defines them.

Use `notes`, `## Notes`, or `## Source Links`.

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
* Use `Actions` for user operations.
* Use `Actions.process` to reference `app_process`.
* Use `Messages` for screen-level messages.
* Use `Transitions` for UI navigation.
* Keep server-side logic in `app_process`.
* Use stable IDs for fields, actions, messages, and transitions.
* Put extra explanation in `notes` or `## Notes`.
* Use `## Source Links` for UI implementation files, templates, styles, routes, and tests.

If AI creates a screen model from UI code or screenshots, verify:

* field IDs
* field labels
* data bindings
* action IDs
* process references
* message conditions
* transition destinations
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
