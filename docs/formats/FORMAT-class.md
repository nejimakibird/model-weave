# FORMAT-class

## Purpose

`class` defines a single class-like model object in Model Weave.

Typical targets:

- class
- interface
- abstract class
- entity-like class
- service class
- repository interface
- DTO / value object

A `class` file stores the object's basic information, attributes, methods, outbound relations, and notes.

## Core policy

- A `class` file has `type: class`.
- One file defines one class-like object.
- `Attributes` are managed as a Markdown table.
- `Methods` are managed as a Markdown table.
- `Relations` are managed as a Markdown table.
- Relations in a `class` file are outbound relations from that file's object only.
- The source of each relation is implicitly the current file's `frontmatter.id`.
- Diagram-wide relations can be defined in `class_diagram`.
- Markdown is the source of truth. Custom/Mermaid views are derived.

## Frontmatter

Required:

- `type`
- `id`
- `name`

Optional:

- `kind`
- `package`
- `stereotype`
- `render_mode`
- `tags`

Example:

```yaml
---
type: class
id: CLS-ORDER-ORDER
name: Order
kind: class
package: order
render_mode: auto
tags:
  - Class
---
```

## Render mode

`class` supports renderer switching in V0.7.

Allowed values:

- `auto`
- `custom`
- `mermaid`

Interpretation:

- `auto`: resolves to `custom` for `class`.
- `custom`: detailed review view.
- `mermaid`: reduced relationship overview view.

Mermaid mode should keep node content minimal. It should not show full attributes and methods. Use Custom mode for detailed review.

## Recommended structure

```text
# <Class Name>

## Summary

## Attributes

## Methods

## Relations

## Notes
```

## Summary

Describe the role, responsibility, and design notes for the class.

## Attributes

Columns:

- `name`
- `type`
- `visibility`
- `static`
- `notes`

Rules:

- `visibility` should usually be `public`, `private`, `protected`, or `package`.
- `static` should be `Y` or `N`.

Example:

```markdown
## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| id | string | private | N | Order identifier |
| customerId | string | private | N | Customer identifier |
| orderItems | List<OrderItem> | private | N | Order lines |
```

## Methods

Columns:

- `name`
- `parameters`
- `returns`
- `visibility`
- `static`
- `notes`

Rules:

- `static` should be `Y` or `N`.
- `parameters` is free text.

Example:

```markdown
## Methods

| name | parameters | returns | visibility | static | notes |
|---|---|---|---|---|---|
| addItem | item: OrderItem | void | public | N | Add an order line |
| getTotal |  | Money | public | N | Calculate total amount |
```

## Relations

Relations in a `class` file are outbound relations from the current class.

The `from` column is not part of the current canonical form. Internally, `from` is the current file's `frontmatter.id`.

Columns:

- `id`
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

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
| REL-ORDER-ASSOCIATES-CUSTOMER | CLS-CUSTOMER-CUSTOMER | association | belongs to | 0..* | 1 |  |
| REL-ORDER-HAS-ITEM | CLS-ORDER-ORDER-ITEM | aggregation | has | 1 | 0..* |  |
| REL-ORDER-USES-REPOSITORY | IF-ORDER-ORDER-REPOSITORY | dependency | uses |  |  |  |
```

## Compatibility

Older `class` files may contain a `from` column in `Relations`.

Compatibility policy:

- No `from` column: current canonical form.
- `from` column exists: legacy compatible form.
- `from` equals current file id: acceptable compatibility case.
- `from` differs from current file id: should produce a warning.

New templates and samples should use the current form without `from`.

## class_diagram relationship

- `class` defines one object and its outbound relations.
- `class_diagram` defines diagram membership and may also define diagram-wide relations with explicit `from` and `to`.

## Validation candidates

Error candidates:

- missing `id`
- missing `name`
- duplicate `Attributes.name`
- duplicate `Methods.name` where not intended
- relation row without `to`

Warning candidates:

- unknown relation `kind`
- invalid `static` value
- legacy `from` column where `from` differs from the current file id
- unresolved relation target

## Complete example

```markdown
---
type: class
id: CLS-ORDER-ORDER
name: Order
kind: class
package: order
tags:
  - Class
---

# Order

## Summary

Main domain class for an order.

## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| id | string | private | N | Order identifier |
| customerId | string | private | N | Customer identifier |
| orderItems | List<OrderItem> | private | N | Order lines |

## Methods

| name | parameters | returns | visibility | static | notes |
|---|---|---|---|---|---|
| addItem | item: OrderItem | void | public | N | Add line |
| getTotal |  | Money | public | N | Calculate total |

## Relations

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
| REL-ORDER-ASSOCIATES-CUSTOMER | CLS-CUSTOMER-CUSTOMER | association | belongs to | 0..* | 1 |  |
| REL-ORDER-HAS-ITEM | CLS-ORDER-ORDER-ITEM | aggregation | has | 1 | 0..* |  |

## Notes

- Relations are outbound from this class.
```
