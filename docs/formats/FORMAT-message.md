# FORMAT-message

## Purpose

`message` defines a message set used by screens, business rules, application processes, errors, confirmations, and warnings.

`message` is not one message per file. It is one file per message set.

## Core policy

- A `message` file has `type: message`.
- One file defines one message set.
- `Messages` is a Markdown table containing multiple messages.
- `Messages.message_id` is unique within the file.
- `Messages.text` contains the message text or display text.
- `severity` indicates info/success/warning/error/confirm.
- `timing` describes when the message is used.
- `audience` describes the intended audience.
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

- `common`
- `screen`
- `business_area`
- `validation`
- `system`
- `integration`
- `operation`
- `other`

Example:

```yaml
---
type: message
id: MSGSET-INVENTORY
name: Inventory Messages
kind: business_area
tags:
  - Message
  - WMS
---
```

## Recommended structure

```text
# <message set name>

## Summary

## Messages

## Notes
```

## Messages

Columns:

- `message_id`
- `text`
- `severity`
- `timing`
- `audience`
- `active`
- `notes`

Expected `severity` values:

- `info`
- `success`
- `warning`
- `error`
- `confirm`
- `other`

Expected `audience` values:

- `operator`
- `admin`
- `customer`
- `developer`
- `system`
- `log`
- `other`

Expected `active` values:

- `Y`
- `N`

Example:

```markdown
## Messages

| message_id | text | severity | timing | audience | active | notes |
|---|---|---|---|---|---|---|
| INV-001 | Stock is insufficient. | warning | stock_check | operator | Y | allocation shortage |
| INV-002 | The specified lot cannot be used. | error | validation | operator | Y | hold/damaged/shipped lot |
| INV-003 | Stock has been allocated. | success | allocation_success | operator | Y | normal completion |
```

## Qualified Ref / Member Ref

`Messages.message_id` is the member candidate.

Example:

```markdown
[[message/MSGSET-INVENTORY|Inventory Messages]].INV-001
```

This means:

- message file: `MSGSET-INVENTORY`
- message member: `INV-001`
- text: `Stock is insufficient.`

Unresolved message members should produce warnings.

## Relationships

- Screen `Messages.text` may contain a direct message or a message reference.
- Rule `Messages.message` may refer to a message.
- app_process `Steps` / `Errors` may include message references in text.
- Mapping notes/rules may include message references if needed.

## Validation candidates

Error candidates:

- missing `id`
- missing `name`
- empty `Messages.message_id`
- duplicate `Messages.message_id`
- empty `Messages.text`

Warning candidates:

- empty `Messages`
- empty or unknown `severity`
- empty `timing`
- empty `audience`
- empty or invalid `active`
- missing `kind`
- referenced message file does not exist
- referenced message member does not exist

Note candidates:

- `active = N`
- repeated `text` within the same message file

## Viewer policy

Show:

- title
- id
- kind
- Summary
- Messages table
- Notes
- diagnostics

Do not show:

- diagram
- chart
- transition diagram
- Mermaid
- screen preview

## Not required in V0.7

- multilingual messages
- message parameters
- placeholder validation such as `{0}` or `{item_name}`
- automatic duplicate text detection
- complete reverse reference listing
- message catalog view
- unused message detection
- forced codeset validation for severity/audience
- strict separation of log messages and screen messages
- message diagrams
