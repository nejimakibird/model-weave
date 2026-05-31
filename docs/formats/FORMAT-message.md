# FORMAT-message

Japanese Version: [日本語版](../ja/formats/FORMAT-message.md)

## What this is for

`message` defines reusable message texts.

Use this format when you want to describe:

* user-facing UI messages
* validation messages
* error messages
* warning messages
* information messages
* success messages
* system messages
* log-like message definitions
* message IDs used by screens, rules, or app processes

A `message` file helps keep message text consistent across screens, rules, and processes.

Use `screen.Messages` when you want to describe where a message appears on a screen.
Use `rule.Conditions.message` when you want to describe which message is returned by a rule condition.
Use `message` when you want to define the message itself as a reusable asset.

## Important concept: Message vs screen message usage

A `message` file defines message text and metadata.

A `screen` file describes how messages are used on a screen.

For example:

* `message`: defines `MSG-NO-RESULT` as "No inventory rows found."
* `screen.Messages`: says `MSG-NO-RESULT` is shown when the search result is empty

This separation keeps message text reusable and avoids duplicating wording across many screens.

## Important concept: Message vs CodeSet

Use `message` for message text.

Use `codeset` for selectable or comparable values.

Examples:

* Message: `No inventory rows found.`
* Message: `Inventory is on hold.`
* CodeSet value: `available`
* CodeSet value: `hold`

A message may depend on a CodeSet value, but the message text itself should not be modeled as a CodeSet value.

## Important concept: Message vs Rule

Use `rule` to define logic.

Use `message` to define the text shown or returned when a rule condition applies.

For example:

* Rule condition: `quantity > 0`
* Message: `Quantity must be greater than zero.`

The rule may reference the message, but the message should not contain the whole validation logic.

## Minimal example

```markdown
---
type: message
id: MSG-NO-RESULT
name: No Result Message
kind: info
tags:
  - Message
---

# No Result Message

## Summary

Message shown when a search returns no rows.

## Messages

| id | text | severity | audience | notes |
|---|---|---|---|---|
| MSG-NO-RESULT | No inventory rows found. | info | user | Search completed with no rows |
```

## Full example

```markdown
---
type: message
id: MSG-INVENTORY-MESSAGES
name: Inventory Messages
kind: message_group
tags:
  - Message
  - WMS
---

# Inventory Messages

## Summary

Reusable inventory-related messages.

## Messages

| id | text | severity | audience | notes |
|---|---|---|---|---|
| MSG-INVENTORY-NO-RESULT | No inventory rows found. | info | user | Search completed with no rows |
| MSG-INVENTORY-HOLD | Inventory is on hold. | warning | user | Shown when status is hold |
| MSG-INVENTORY-NOT-ALLOCATABLE | Inventory cannot be allocated. | error | user | Returned by allocation rule |
| MSG-INVENTORY-SYSTEM-ERROR | Inventory processing failed. Please try again later. | error | user | Generic process failure |

## Source Links

| path | notes |
|---|---|
| src/messages/inventoryMessages.ts | Message constants |
| src/i18n/en/inventory.json | English translations |

## Notes

- Rules and screens may reference these message IDs.
- CodeSet values may be used in conditions that decide which message is shown.
```

## Frontmatter

Required fields:

| field  | required | notes                                              |
| ------ | -------- | -------------------------------------------------- |
| `type` | yes      | Must be `message`.                                 |
| `id`   | yes      | Unique message model ID.                           |
| `name` | yes      | Display name of the message file or message group. |

Optional fields:

| field    | notes                                                                                                    |
| -------- | -------------------------------------------------------------------------------------------------------- |
| `kind`   | Message kind, such as `info`, `warning`, `error`, `success`, `validation`, `system`, or `message_group`. |
| `tags`   | Obsidian / Markdown tags.                                                                                |
| `locale` | Optional locale, such as `en`, `ja`, or `en-US`.                                                         |
| `owner`  | Optional owner, domain, module, or team.                                                                 |

Example:

```yaml
---
type: message
id: MSG-INVENTORY-MESSAGES
name: Inventory Messages
kind: message_group
locale: en
tags:
  - Message
  - WMS
---
```

## Sections

Recommended structure:

```text
# <message name>

## Summary

## Messages

## Source Links

## Notes
```

### Summary

Use `## Summary` to describe the purpose, domain, audience, and usage of the message or message group.

This section is free text.

### Messages

Use `## Messages` to define message IDs and message text.

Expected header:

```markdown
| id | text | severity | audience | notes |
|---|---|---|---|---|
```

Columns:

| column     | meaning                                                                           |
| ---------- | --------------------------------------------------------------------------------- |
| `id`       | Message ID.                                                                       |
| `text`     | Message text or default text.                                                     |
| `severity` | Message severity, such as `info`, `warning`, `error`, or `success`.               |
| `audience` | Intended audience, such as `user`, `operator`, `developer`, `admin`, or `system`. |
| `notes`    | Optional explanation.                                                             |

Example:

```markdown
## Messages

| id | text | severity | audience | notes |
|---|---|---|---|---|
| MSG-REQUIRED | This field is required. | error | user | Validation message |
| MSG-SAVED | Saved successfully. | success | user | Completion message |
```

Rules:

* Keep `id` stable.
* Use `text` for the default message text.
* Use `severity` consistently.
* Use `notes` for context, placeholders, or usage notes.
* Do not put condition logic into `text`.
* Do not put CodeSet value definitions into `message`.

### Source Links

`## Source Links` is optional.

Use it to connect the message definition to source files, i18n files, constants, resource bundles, validation code, or message catalogs.

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
| src/messages/commonMessages.ts | Message constants |
| src/i18n/en/common.json | English message resource |
| src/i18n/ja/common.json | Japanese message resource |
```

For details, see [FORMAT-common-sections](FORMAT-common-sections.md).

### Notes

Use `## Notes` for free-form design notes.

Do not add unsupported columns to `## Messages` just to store extra information. Put extra information in `notes`, `## Notes`, or `## Source Links`.

## Tables

### Messages table

```markdown
| id | text | severity | audience | notes |
|---|---|---|---|---|
```

### Source Links table

```markdown
| path | notes |
|---|---|
```

## Qualified Ref / Member Ref

For `message`, `Messages.id` may be used as a member reference.

Examples:

```markdown
[[MSG-INVENTORY-MESSAGES]].MSG-INVENTORY-NO-RESULT
[[MSG-INVENTORY-MESSAGES]].MSG-INVENTORY-HOLD
```

When a file contains only one message, the file ID itself may also be used as a direct reference.

Examples:

```markdown
[[MSG-NO-RESULT]]
```

Use stable message IDs when rules, screens, or processes need to refer to message definitions.

## Reference handling

Structured fields that may carry useful references include:

* `Messages.id`
* `Messages.notes`
* `Source Links.path`

Other formats may reference messages from:

* `screen.Messages.message`
* `rule.Conditions.message`
* `app_process.Errors`
* `app_process.Transitions.notes`
* `mapping` notes or rule references

Plain prose may contain readable references, but analyzers should prefer structured fields when available.

## Placeholders and parameters

Message text may include placeholders when the implementation uses them.

Examples:

```text
{field} is required.
Inventory for {item_id} is on hold.
```

Document placeholder meaning in `notes`.

Example:

```markdown
| id | text | severity | audience | notes |
|---|---|---|---|---|
| MSG-FIELD-REQUIRED | {field} is required. | error | user | `{field}` is the display label of the target field |
```

Keep placeholders simple and implementation-friendly.

## Localization

If messages are localized, there are two common approaches.

### One file per locale

Use `locale` in frontmatter.

Example:

```yaml
---
type: message
id: MSG-INVENTORY-MESSAGES-EN
name: Inventory Messages English
locale: en
---
```

### One canonical file with Source Links

Keep a canonical message file and use `## Source Links` to point to i18n resource files.

Example:

```markdown
## Source Links

| path | notes |
|---|---|
| src/i18n/en/inventory.json | English messages |
| src/i18n/ja/inventory.json | Japanese messages |
```

Choose the approach that matches the project.

## Relationship with screen

A `screen` may show messages using `screen.Messages`.

Example:

```markdown
## Messages

| id | message | condition | severity | notes |
|---|---|---|---|---|
| MSG-NO-RESULT | [[MSG-INVENTORY-MESSAGES]].MSG-INVENTORY-NO-RESULT | no_result | info | Search completed with no rows |
```

The screen describes when and where the message appears.
The message file defines the reusable message text.

## Relationship with rule

A `rule` may return or reference a message from `Conditions.message`.

Example:

```markdown
## Conditions

| id | expression | severity | message | notes |
|---|---|---|---|---|
| COND-QTY | quantity > 0 | error | [[MSG-COMMON]].MSG-QTY-POSITIVE | Quantity validation |
```

The rule defines the condition.
The message defines the text shown when the condition applies.

## Relationship with app_process

An `app_process` may refer to messages in `Errors`, `Transitions.notes`, or process notes.

If a message is reused or needs stable tracking, define it in a `message` file and reference it.

## Common mistakes

### Putting conditions into message text

Do not encode rule logic or screen conditions in the message text itself.

Use `rule`, `screen`, or `app_process` to define conditions.

### Using CodeSet for messages

Do not model user-facing message text as CodeSet values.

Use `message` for text and `codeset` for selectable / comparable values.

### Duplicating the same text in many screens

If a message is reused, define it once in `message` and reference it.

This makes wording changes and translation easier.

### Changing message IDs casually

Do not rename message IDs casually after other models reference them.

Changing message IDs can break references from screens, rules, and processes.

### Adding unsupported columns

Do not add columns such as `condition`, `rule`, `screen`, `process`, or `code` unless the FORMAT explicitly defines them.

Use `notes`, `## Notes`, or references from other formats.

### Unsafe table syntax

Avoid raw `|` characters inside message text.

Avoid Wikilink aliases such as `[[MSG-COMMON|Common Messages]]` inside tables. Use `[[MSG-COMMON]]` and put display meaning in `notes`.

## AI generation notes

When generating `message` files with AI:

* Use `type: message`.
* One file may define one message or a coherent message group.
* Preserve exact table headers.
* Do not add unsupported columns.
* Keep message IDs stable.
* Put reusable text in `text`.
* Use `severity` consistently.
* Use `audience` to distinguish user-facing messages from system or developer messages.
* Put placeholder explanations in `notes`.
* Do not put rule logic into message text.
* Do not put CodeSet values into message text unless they are part of the human-readable sentence.
* Use `## Source Links` for message constants, i18n resources, resource bundles, or message catalogs.

If AI creates messages from source code or UI text, verify:

* message IDs
* message text
* severity
* audience
* placeholders
* references from screens and rules
* localization resource links

## Related samples

* [Inventory messages](../../samples/message/MSG-INVENTORY-MESSAGES.md)
* [Message samples index](../../samples/message/README.md)

## Related formats

* [screen](FORMAT-screen.md)
* [rule](FORMAT-rule.md)
* [app_process](FORMAT-app_process.md)
* [codeset](FORMAT-codeset.md)
* [Common sections](FORMAT-common-sections.md)
