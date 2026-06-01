# FORMAT-class_diagram

Japanese Version: [日本語版](../ja/formats/FORMAT-class_diagram.md)

## What this is for

`class_diagram` defines an overview diagram for multiple `class` files.

Use this format when you want to:

* show relationships between multiple classes
* create a package / module / layer overview
* review service, repository, domain, and DTO relationships
* create a diagram for documentation or review
* group existing `class` files into a readable view

A `class_diagram` file does not replace individual `class` files.

Use:

* `class` to define one class-like object
* `class_diagram` to define an overview diagram that includes multiple class-like objects

## Important concept: Objects and Relations

A `class_diagram` has two different concepts:

* `## Objects`: selects which class-like objects are included in the diagram.
* `## Relations`: optionally defines which relationships are explicitly shown in the diagram.

In many cases, `## Objects` is enough.

When `## Relations` is omitted or empty, Model Weave can collect relationships from the `## Relations` sections of the referenced `class` files.

This means:

* relationships owned by each class should usually be written in the individual `class` files
* `class_diagram` can focus on selecting which classes are included
* `class_diagram` `## Relations` is used when you want to explicitly control or override the relationship lines shown in the diagram

## Difference from ER diagrams

`class_diagram` and `er_diagram` look similar because both can select objects for a diagram.

However, their relationship handling is different.

For ER models:

* `er_diagram` mainly lists target entities in `## Objects`
* ER relationships are collected from each `er_entity`
* the diagram file normally does not define ER relationships directly

For Class models:

* `class_diagram` lists target classes in `## Objects`
* relationships can be collected from each `class`
* `class_diagram` may also define an optional `## Relations` section to explicitly control diagram-level relationship lines

Use diagram-level `## Relations` only when you need that control.

## Minimal example

This example only lists diagram objects. Relationships can be collected from the referenced `class` files.

```markdown
---
type: class_diagram
id: CLASSD-ORDER-SERVICE
name: Order Service Class Diagram
---

# Order Service Class Diagram

## Objects

| ref | notes |
|---|---|
| [[CLS-ORDER-SERVICE]] | Application service |
| [[IF-ORDER-REPOSITORY]] | Repository interface |
```

## Example with explicit Relations

Use explicit `## Relations` when you want to fix or limit the relationship lines shown in this diagram.

```markdown
---
type: class_diagram
id: CLASSD-ORDER-SERVICE
name: Order Service Class Diagram
---

# Order Service Class Diagram

## Objects

| ref | notes |
|---|---|
| [[CLS-ORDER-SERVICE]] | Application service |
| [[IF-ORDER-REPOSITORY]] | Repository interface |

## Relations

| id | from | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|---|
| REL-ORDER-SERVICE-USES-REPOSITORY | CLS-ORDER-SERVICE | IF-ORDER-REPOSITORY | dependency | uses |  |  | Explicit diagram relation |
```

## Full example

```markdown
---
type: class_diagram
id: CLASSD-ORDER-FLOW
name: Order Flow Class Diagram
tags:
  - ClassDiagram
---

# Order Flow Class Diagram

## Summary

Class overview for order creation and inventory allocation.

## Objects

| ref | notes |
|---|---|
| [[CLS-ORDER-SERVICE]] | Coordinates order operations |
| [[IF-ORDER-REPOSITORY]] | Persistence interface |
| [[CLS-ALLOCATION-POLICY]] | Stock allocation rules |
| [[DTO-CREATE-ORDER-REQUEST]] | Input DTO |

## Relations

| id | from | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|---|
| REL-SERVICE-USES-REPOSITORY | CLS-ORDER-SERVICE | IF-ORDER-REPOSITORY | dependency | uses |  |  | Explicitly shown in this diagram |
| REL-SERVICE-USES-POLICY | CLS-ORDER-SERVICE | CLS-ALLOCATION-POLICY | dependency | checks |  |  | Explicitly shown in this diagram |
| REL-SERVICE-USES-REQUEST | CLS-ORDER-SERVICE | DTO-CREATE-ORDER-REQUEST | dependency | receives |  |  | Explicitly shown in this diagram |

## Source Links

| path | notes |
|---|---|
| src/order/ | Order module implementation |
| docs/order-flow.md | Design note |
```

## Frontmatter

Required fields:

| field  | required | notes                        |
| ------ | -------- | ---------------------------- |
| `type` | yes      | Must be `class_diagram`.     |
| `id`   | yes      | Unique diagram model ID.     |
| `name` | yes      | Display name of the diagram. |

Optional fields:

| field         | notes                                                               |
| ------------- | ------------------------------------------------------------------- |
| `render_mode` | Optional. Supported values are `custom`, `mermaid`, and `mermaid-detail`. |
| `tags`        | Obsidian / Markdown tags.                                           |
| `scope`       | Optional logical scope, such as package, layer, module, or feature. |
| `notes`       | Short frontmatter note if needed.                                   |

Example:

```yaml
---
type: class_diagram
id: CLASSD-ORDER-FLOW
name: Order Flow Class Diagram
tags:
  - ClassDiagram
---
```

## Render mode

`class_diagram` supports renderer switching.

Allowed values:

* `custom`
* `mermaid`
* `mermaid-detail`

Interpretation:

| value            | meaning                                          |
| ---------------- | ------------------------------------------------ |
| `custom`         | Detailed review view with tables and navigation. |
| `mermaid`        | Overview class diagram / relationship graph.     |
| `mermaid-detail` | Mermaid class diagram with class body detail.    |

If `render_mode` is omitted, the format-specific default render mode from settings is used.

Deprecated or unsupported values such as `auto` should produce a warning and fall back to the format-specific default.

Mermaid mode is useful for overview diagrams.
Custom mode is useful when reviewing rows, references, diagnostics, and navigation details.

Toolbar selection is temporary and does not rewrite Markdown or frontmatter.

## Sections

Recommended structure:

```text
# <Diagram Name>

## Summary

## Objects

## Relations

## Source Links

## Notes
```

`## Relations` is optional.

### Summary

Use `## Summary` to describe the purpose, scope, or review intent of the diagram.

This section is free text.

### Objects

Use `## Objects` to list class-like objects included in the diagram.

Expected header:

```markdown
| ref | notes |
|---|---|
```

Columns:

| column  | meaning                                  |
| ------- | ---------------------------------------- |
| `ref`   | Wikilink or reference to a `class` file. |
| `notes` | Optional explanation.                    |

Example:

```markdown
## Objects

| ref | notes |
|---|---|
| [[CLS-ORDER-SERVICE]] | Application service |
| [[IF-ORDER-REPOSITORY]] | Repository interface |
```

Notes:

* `## Objects` defines the diagram scope.
* Relationships are normally collected from the referenced `class` files.
* Keep object references stable.
* Avoid using display labels as IDs.
* Use the `name` field in the target `class` file for display naming where possible.

### Relations

`## Relations` is optional in `class_diagram`.

Use it when you want to explicitly define the relationship lines shown by this diagram.

Expected header:

```markdown
| id | from | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|---|
```

Columns:

| column              | meaning                                   |
| ------------------- | ----------------------------------------- |
| `id`                | Relation ID.                              |
| `from`              | Source class ID.                          |
| `to`                | Target class ID.                          |
| `kind`              | Relation kind.                            |
| `label`             | Optional relation label.                  |
| `from_multiplicity` | Optional multiplicity on the source side. |
| `to_multiplicity`   | Optional multiplicity on the target side. |
| `notes`             | Optional explanation.                     |

Typical `kind` values:

* `association`
* `dependency`
* `inheritance`
* `implementation`
* `aggregation`
* `composition`

Example:

```markdown
## Relations

| id | from | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|---|
| REL-SERVICE-USES-REPOSITORY | CLS-ORDER-SERVICE | IF-ORDER-REPOSITORY | dependency | uses |  |  | Explicitly shown in this diagram |
```

When `## Relations` is omitted or empty, Model Weave can collect relations from the referenced `class` files.

When `## Relations` is present, it should be treated as an explicit diagram-level relationship list.

Use this section carefully. If the relationship is part of the class model itself, prefer defining it in the source `class` file.

### Source Links

`## Source Links` is optional.

Use it to connect the diagram to implementation directories, architecture notes, package-level source files, or design documents.

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
| src/order/ | Order module implementation |
| docs/order-flow.md | Related design note |
```

For details, see [FORMAT-common-sections](FORMAT-common-sections.md).

### Notes

Use `## Notes` for free-form design notes.

Do not add unsupported columns to structured tables just to store extra information. Put extra information in `notes`, `## Notes`, or `## Source Links`.

## Tables

### Objects table

```markdown
| ref | notes |
|---|---|
```

### Relations table

```markdown
| id | from | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|---|
```

This table is optional for `class_diagram`.

### Source Links table

```markdown
| path | notes |
|---|---|
```

## Common mistakes

### Thinking Relations is always required

`## Relations` is not always required in `class_diagram`.

If the referenced `class` files already define their own `## Relations`, the diagram can use those relationships.

Use diagram-level `## Relations` only when you want to explicitly control the relationship lines shown by this diagram.

### Using `class_diagram` to define class details

Do not put full attributes and methods for every class in a `class_diagram`.

Use individual `class` files for class details.

Use `class_diagram` to select and connect those class files.

### Confusing class_diagram with er_diagram

Do not assume Class diagrams and ER diagrams handle relations the same way.

For ER diagrams, relations are normally collected from `er_entity` files and the diagram file does not directly define ER relations.

For Class diagrams, diagram-level `## Relations` may be used when explicit relationship control is needed.

### Missing objects used by explicit relations

If `## Relations` is used, `from` and `to` should point to classes included in `## Objects`.

Risky:

```markdown
| id | from | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|---|
| REL-UNKNOWN | CLS-ORDER-SERVICE | CLS-MISSING | dependency | uses |  |  | Missing target |
```

Define all referenced classes explicitly in `## Objects`.

### Using labels instead of IDs

Relations should reference stable class IDs, not display labels.

Avoid:

```markdown
| REL-1 | OrderService | OrderRepository | dependency | uses |  |  |  |
```

Prefer:

```markdown
| REL-1 | CLS-ORDER-SERVICE | IF-ORDER-REPOSITORY | dependency | uses |  |  |  |
```

### Adding unsupported columns

Do not add columns such as `description`, `source`, `target_path`, or `rule` unless the FORMAT explicitly defines them.

Use `notes` or optional sections instead.

### Unsafe table syntax

Avoid raw `|` characters inside table cells.

Avoid Wikilink aliases such as `[[CLS-ORDER-SERVICE|OrderService]]` inside tables. Use `[[CLS-ORDER-SERVICE]]` and rely on the target class name or notes for display context.

## AI generation notes

When generating `class_diagram` files with AI:

* Use `type: class_diagram`.
* Use `## Objects` to choose the classes included in the diagram.
* Use `class` files for class details.
* Preserve exact table headers.
* Do not add unsupported columns.
* Do not use `## Classes`; use `## Objects`.
* Do not add `## Relations` unless explicit diagram-level relationship control is needed.
* If `## Relations` is used, make sure every `from` and `to` refers to a class included in `## Objects`.
* Put extra explanation in `notes` or `## Notes`.
* Use `## Source Links` for package directories, implementation files, or architecture notes.
* Do not treat Class diagram relation handling as identical to ER diagram relation handling.

If AI creates the diagram from source code, verify the object list and relationship lines against the implementation. Source Links can help with this review.

## Related samples

* [WMS service class diagram](../../samples/class/CLASSD-WMS-SERVICE.md)
* [Class samples index](../../samples/class/README.md)

## Related formats

* [class](FORMAT-class.md)
* [Common sections](FORMAT-common-sections.md)
