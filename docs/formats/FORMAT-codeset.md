# FORMAT-codeset

Japanese Version: [日本語版](../ja/formats/FORMAT-codeset.md)

## What this is for

`codeset` defines a named set of values.

Use this format when you want to describe:

* code lists
* enum-like values
* category values
* status values
* state values
* flags
* UI option values
* business classification values
* values used in conditions, rules, screens, and processes

A `codeset` helps keep values consistent across Model Weave files.

It is especially useful when the same value appears in many places, such as:

* screen field conditions
* app process flow conditions
* rule conditions
* message conditions
* data object references
* mapping rules

## Important concept: values as traceable design elements

A `codeset` value is not just text.

In Model Weave, values can be used as traceable design elements.

For example, a switch state may define values such as:

* `ON`
* `OFF`

Those values can then appear in:

* screen conditions
* app process `Flows.condition`
* app process `Transitions.condition`
* rule conditions
* message conditions
* data object references
* notes

Model Weave can summarize value usage by value, making it easier to answer questions such as:

* Where is `ON` used?
* Which screens depend on `OFF`?
* Which process branches use this status?
* Which rules or messages mention this value?
* Are there unused or inconsistent values?

This is useful for impact analysis, state review, and AI-assisted model maintenance.

## Important concept: CodeSet vs internal state

`codeset` can describe both traditional code lists and internal state values.

Traditional code list examples:

* order status
* inventory status
* user role
* message severity
* shipping method

Internal state examples:

* switch state
* process branch status
* UI mode
* temporary validation result
* internal workflow state

If a value affects conditions or behavior across multiple models, defining it as a `codeset` makes the design easier to trace.

## Minimal example

```markdown id="6go2ul"
---
type: codeset
id: CODE-SWITCH-STATE
name: Switch State
kind: state
tags:
  - CodeSet
---

# Switch State

## Summary

State values for a simple ON / OFF switch.

## Values

| value | label | meaning | active | sort_order | notes |
|---|---|---|---|---:|---|
| ON | ON | Switch is enabled | Y | 1 |  |
| OFF | OFF | Switch is disabled | Y | 2 |  |
```

## Full example

```markdown id="464tvv"
---
type: codeset
id: CODE-INVENTORY-STATUS
name: Inventory Status
kind: status
tags:
  - CodeSet
  - WMS
---

# Inventory Status

## Summary

Inventory status values used by inventory search, allocation, and transfer processes.

## Values

| value | label | meaning | active | sort_order | notes |
|---|---|---|---|---:|---|
| available | Available | Stock can be allocated | Y | 10 | Normal usable inventory |
| reserved | Reserved | Stock is reserved for an order | Y | 20 | Allocation in progress |
| hold | On Hold | Stock is blocked from allocation | Y | 30 | Quality or operational hold |
| damaged | Damaged | Stock is damaged | Y | 40 | Cannot be allocated |
| shipped | Shipped | Stock has already shipped | Y | 50 | Historical state |

## Source Links

| path | notes |
|---|---|
| src/domain/inventory/InventoryStatus.ts | Enum / status definition |
| src/domain/inventory/InventoryAllocationService.ts | Status usage |

## Notes

- Use these values in screen conditions, app process flow conditions, and rule conditions.
- Prefer qualified references when the value is used as a condition.
```

## Frontmatter

Required fields:

| field  | required | notes                        |
| ------ | -------- | ---------------------------- |
| `type` | yes      | Must be `codeset`.           |
| `id`   | yes      | Unique CodeSet model ID.     |
| `name` | yes      | Display name of the CodeSet. |

Optional fields:

| field    | notes                                                                                       |
| -------- | ------------------------------------------------------------------------------------------- |
| `kind`   | CodeSet kind, such as `code`, `status`, `state`, `flag`, `category`, `severity`, or `role`. |
| `tags`   | Obsidian / Markdown tags.                                                                   |
| `owner`  | Optional owner, domain, module, or team.                                                    |
| `source` | Optional source specification, system, or reference.                                        |

Example:

```yaml id="7xa1f7"
---
type: codeset
id: CODE-INVENTORY-STATUS
name: Inventory Status
kind: status
tags:
  - CodeSet
  - WMS
---
```

## Sections

Recommended structure:

```text id="mimn3i"
# <codeset name>

## Summary

## Values

## Source Links

## Notes
```

### Summary

Use `## Summary` to describe the purpose, domain, and expected usage of the CodeSet.

This section is free text.

### Values

Use `## Values` to define allowed values.

Expected header:

```markdown id="2gd04p"
| value | label | meaning | active | sort_order | notes |
|---|---|---|---|---:|---|
```

Columns:

| column       | meaning                                                      |
| ------------ | ------------------------------------------------------------ |
| `value`      | Stable value used in references and conditions.              |
| `label`      | Human-readable display label.                                |
| `meaning`    | Meaning of the value.                                        |
| `active`     | `Y` or `N`. Indicates whether the value is currently active. |
| `sort_order` | Numeric display or processing order.                         |
| `notes`      | Optional explanation.                                        |

Example:

```markdown id="0fvw9z"
## Values

| value | label | meaning | active | sort_order | notes |
|---|---|---|---|---:|---|
| draft | Draft | Not yet confirmed | Y | 10 | Editable |
| confirmed | Confirmed | Confirmed by user | Y | 20 | Locked for editing |
| cancelled | Cancelled | Cancelled by user or process | Y | 30 | Terminal state |
```

Rules:

* Keep `value` stable.
* Prefer simple values that are safe in references.
* Avoid spaces in `value`.
* Use `label` for display text.
* Use `meaning` and `notes` for explanation.
* Use `active: N` for deprecated values instead of deleting them immediately when history matters.

### Source Links

`## Source Links` is optional.

Use it to connect the CodeSet to enum definitions, constants, database master tables, configuration files, validation code, UI option definitions, or documentation.

Expected header:

```markdown id="fnx04w"
| path | notes |
|---|---|
```

Example:

```markdown id="0h652u"
## Source Links

| path | notes |
|---|---|
| src/domain/inventory/InventoryStatus.ts | TypeScript enum |
| database/master/inventory_status.csv | Master data |
```

For details, see [FORMAT-common-sections](FORMAT-common-sections.md).

### Notes

Use `## Notes` for free-form design notes.

Do not add unsupported columns to `## Values` just to store extra information. Put extra information in `notes`, `## Notes`, or `## Source Links`.

## Tables

### Values table

```markdown id="am8q9j"
| value | label | meaning | active | sort_order | notes |
|---|---|---|---|---:|---|
```

### Source Links table

```markdown id="wfqvo4"
| path | notes |
|---|---|
```

## Qualified value references

A CodeSet value can be referenced as a qualified value.

Recommended forms:

```markdown id="4sjayh"
[[CODE-INVENTORY-STATUS]].available
CODE-INVENTORY-STATUS.available
```

For Wikilink-based references, the CodeSet ID is linked and the value follows after the dot.

Examples:

```markdown id="7r7019"
[[CODE-SWITCH-STATE]].ON
[[CODE-SWITCH-STATE]].OFF
[[CODE-INVENTORY-STATUS]].available
[[CODE-INVENTORY-STATUS]].reserved
```

Use qualified value references when the value is used as a condition or state dependency.

## Value usage tracking

Model Weave can summarize where each CodeSet value is used.

Useful usage locations include:

* `screen.Fields.condition`
* `screen.Actions.condition`
* `screen.Messages.condition`
* `screen.Transitions.condition`
* `app_process.Flows.condition`
* `app_process.Transitions.condition`
* `app_process.Steps.notes`
* `rule` conditions
* `mapping` rules
* `data_object.Fields.ref`
* notes and prose sections where supported

Example usage:

```markdown id="6j5dcb"
## Flows

| from | to | condition | label | notes |
|---|---|---|---|---|
| validate | reserve | [[CODE-INVENTORY-STATUS]].available | OK | Available inventory |
| validate | reject | [[CODE-INVENTORY-STATUS]].hold | NG | Blocked inventory |
```

This allows value-level review such as:

```text id="k3q3jd"
available:
- used by inventory allocation flow
- used by inventory search screen
- used by validation rule

hold:
- used by rejection branch
- used by warning message
```

## CodeSet vs Message

Use `codeset` for selectable or comparable values.

Use `message` for message texts shown to users or logged by the system.

Example:

* CodeSet: `available`, `reserved`, `hold`
* Message: `Inventory is on hold.`, `No inventory rows found.`

A message may depend on a CodeSet value, but the message text itself should not be modeled as a CodeSet value.

## CodeSet vs Rule

Use `codeset` to define allowed values.

Use `rule` to define logic that evaluates or transforms values.

Example:

* CodeSet defines `available`, `reserved`, `hold`.
* Rule defines when inventory can be allocated.
* app_process uses the rule and branches based on CodeSet values.

## Common mistakes

### Using labels as values

Avoid using display labels as stable values.

Risky:

```markdown id="4dc7g0"
| value | label | meaning | active | sort_order | notes |
|---|---|---|---|---:|---|
| Available Stock | Available Stock | Stock can be allocated | Y | 10 |  |
```

Prefer stable values:

```markdown id="cabff8"
| value | label | meaning | active | sort_order | notes |
|---|---|---|---|---:|---|
| available | Available Stock | Stock can be allocated | Y | 10 |  |
```

### Changing value identifiers casually

Do not rename `value` casually after other models reference it.

Changing a value can break usage tracking and conditions.

If a value is no longer used, consider marking it inactive with `active: N`.

### Adding unsupported columns

Do not add columns such as `code`, `description`, `ref`, `rule`, or `condition` unless the FORMAT explicitly defines them.

Use `meaning`, `notes`, `## Notes`, or related `rule` files instead.

### Mixing messages into CodeSet

Do not put full user-facing messages in `value`.

Use `message` format for messages.

### Using unsafe value names

Avoid value names with spaces, raw `|`, brackets, or punctuation that makes references difficult.

Prefer:

* `available`
* `reserved`
* `ON`
* `OFF`
* `validation_error`

### Treating future values as implemented values

If a value is only a future idea, mark it clearly in `notes` or keep it in a separate design note.

Do not mix future-only values into active production values without explanation.

## AI generation notes

When generating `codeset` files with AI:

* Use `type: codeset`.
* One file should define one coherent set of values.
* Preserve exact table headers.
* Do not add unsupported columns.
* Keep `value` stable and reference-safe.
* Use `label` for display text.
* Use `meaning` for the semantic meaning of the value.
* Use `active` as `Y` or `N`.
* Use numeric `sort_order`.
* Use `notes` for extra explanation.
* Use `## Source Links` for enum files, constants, master data, configuration, or validation code.
* Prefer qualified value references when using values in conditions.
* Do not treat messages as CodeSet values.
* Do not treat business logic as CodeSet values; use `rule` for logic.

If AI creates a CodeSet from source code, verify:

* enum / constant names
* value identifiers
* display labels
* active / inactive status
* existing references from screens, processes, rules, mappings, and data objects

## Related samples

* [Switch state CodeSet](../../samples/codeset/CODE-SWITCH-STATE.md)
* [Inventory status CodeSet](../../samples/codeset/CODE-INVENTORY-STATUS.md)
* [CodeSet samples index](../../samples/codeset/README.md)

## Related formats

* [screen](FORMAT-screen.md)
* [app_process](FORMAT-app_process.md)
* [rule](FORMAT-rule.md)
* [message](FORMAT-message.md)
* [mapping](FORMAT-mapping.md)
* [Common sections](FORMAT-common-sections.md)
