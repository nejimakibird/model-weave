# FORMAT-class_diagram

## Purpose

`class_diagram` groups multiple `class` objects and displays them as a class diagram.

A `class` file owns a single class-like object. A `class_diagram` file defines diagram membership and diagram-level relations.

## Core policy

- A `class_diagram` file has `type: class_diagram`.
- `Objects` lists class-like objects included in the diagram.
- `Relations` may define relationships across the diagram.
- Object references may be raw IDs or wikilinks.
- Markdown is the source of truth; Custom and Mermaid views are derived.

## Frontmatter

Required:

- `type`
- `id`
- `name`

Optional:

- `render_mode`
- `tags`

Example:

```yaml
---
type: class_diagram
id: CLASSD-ORDER
name: Order Schema
render_mode: auto
tags:
  - Class
  - Diagram
---
```

## Render mode

`class_diagram` supports renderer switching in V0.7.

- `auto`: resolves to `custom`.
- `custom`: detailed review view.
- `mermaid`: reduced relationship overview view.

Mermaid mode should prioritize readable relationships and automatic layout. It should keep node labels compact and should not try to show all attributes and methods.

## Recommended structure

```text
# <diagram name>

## Summary

## Objects

## Relations

## Notes
```

## Objects

Columns:

- `ref`
- `notes`

`ref` points to a `class` file or class object.

Allowed reference forms include:

- `CLS-ORDER-ORDER`
- `[[CLS-ORDER-ORDER]]`
- `[[order/CLS-ORDER-ORDER]]`
- `[[CLS-ORDER-ORDER|Order]]`

Example:

```markdown
## Objects

| ref | notes |
|---|---|
| [[CLS-ORDER-ORDER]] | Order entity |
| [[CLS-ORDER-ORDER-SERVICE]] | Order service |
| [[IF-ORDER-ORDER-REPOSITORY]] | Repository interface |
| [[CLS-CUSTOMER-CUSTOMER]] | Customer |
```

## Relations

Columns:

- `id`
- `from`
- `to`
- `kind`
- `label`
- `from_multiplicity`
- `to_multiplicity`
- `notes`

Typical `kind` values:

- `association`
- `dependency`
- `inheritance`
- `implementation`
- `aggregation`
- `composition`

Example:

```markdown
## Relations

| id | from | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|---|
| REL-ORDER-ASSOCIATES-CUSTOMER | [[CLS-ORDER-ORDER]] | [[CLS-CUSTOMER-CUSTOMER]] | association | belongs to | 0..* | 1 |  |
| REL-SERVICE-DEPENDS-ORDER | [[CLS-ORDER-ORDER-SERVICE]] | [[CLS-ORDER-ORDER]] | dependency | creates |  |  |  |
| REL-SERVICE-USES-REPOSITORY | [[CLS-ORDER-ORDER-SERVICE]] | [[IF-ORDER-ORDER-REPOSITORY]] | dependency | uses |  |  |  |
```

## Mermaid overview policy

In Mermaid mode:

- render objects as compact nodes
- show class/interface names only or minimal labels
- render relations as labeled edges
- use `label` if present, otherwise `kind`
- keep detailed attributes and methods out of the diagram

## Validation candidates

Error candidates:

- missing `id`
- missing `name`
- unresolved `Objects.ref`
- relation `from` or `to` cannot be resolved

Warning candidates:

- duplicate object reference
- relation references an object not listed in `Objects`
- unknown relation `kind`
- diagram has no objects
- diagram has no relations

## Complete example

```markdown
---
type: class_diagram
id: CLASSD-ORDER
name: Order Schema
tags:
  - Class
  - Diagram
---

# Order Schema

## Summary

Class structure around Order.

## Objects

| ref | notes |
|---|---|
| [[CLS-ORDER-ORDER]] | Order entity |
| [[CLS-ORDER-ORDER-SERVICE]] | Order service |
| [[IF-ORDER-ORDER-REPOSITORY]] | Repository interface |
| [[CLS-CUSTOMER-CUSTOMER]] | Customer |

## Relations

| id | from | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|---|
| REL-ORDER-ASSOCIATES-CUSTOMER | [[CLS-ORDER-ORDER]] | [[CLS-CUSTOMER-CUSTOMER]] | association | belongs to | 0..* | 1 |  |
| REL-SERVICE-DEPENDS-ORDER | [[CLS-ORDER-ORDER-SERVICE]] | [[CLS-ORDER-ORDER]] | dependency | creates |  |  |  |

## Notes

- Use Custom mode for detailed review.
- Use Mermaid mode for relationship overview.
```
