# FORMAT-er_diagram

## Purpose

`er_diagram` groups multiple `er_entity` files and displays them as an ER diagram.

The `er_diagram` file itself does not own relation definitions. Relations are collected from the `## Relations` sections of included `er_entity` files.

## Core policy

- An `er_diagram` file has `type: er_diagram`.
- `Objects` lists the entities included in the diagram.
- Relations are not directly defined in the diagram file.
- During rendering, relations are collected from included `er_entity` files.
- Object references may be raw strings or wikilinks.
- Markdown is the source of truth. Custom/Mermaid views are derived.

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
type: er_diagram
id: ERD-ORDER
name: Order ER Diagram
render_mode: auto
tags:
  - ER
  - Diagram
---
```

## Render mode

`er_diagram` supports renderer switching in V0.7.

- `auto`: resolves to `custom`.
- `custom`: detailed review view.
- `mermaid`: reduced relationship overview view.

Mermaid mode should prioritize relationship readability. It should not show full columns, indexes, or mapping details.

## Recommended structure

```text
# <diagram name>

## Summary

## Objects

## Notes
```

## Objects

Columns:

- `ref`
- `notes`

`ref` points to an `er_entity`.

Allowed forms include:

- `m_customer`
- `t_order`
- `[[m_customer]]`
- `[[master/m_customer]]`
- `[[m_customer|Customer]]`

Example:

```markdown
## Objects

| ref | notes |
|---|---|
| [[m_customer]] | Customer master |
| [[t_order]] | Order |
| [[t_order_item]] | Order line |
| [[m_product]] | Product master |
```

## Relation handling

`er_diagram` does not define relations directly.

The renderer collects outbound relations from the included `er_entity` files.

A relation is normally displayed when:

- the source entity is included in `Objects`
- the target entity is also included in `Objects`

Relations to entities outside the diagram may be omitted or reported as diagnostics/notes. Do not treat every outside relation as a hard error, because partial ER diagrams are common.

Relation data used for display:

- source entity
- target entity
- `kind`
- `cardinality`
- relation mapping information where useful

## Mermaid overview policy

In Mermaid mode:

- render entities as compact nodes
- prefer logical name and/or physical name as node labels
- render relations as edges
- use `cardinality` as edge label if available
- do not list all columns or indexes

## Validation candidates

Error candidates:

- missing required frontmatter
- empty `Objects.ref`
- unresolved `Objects.ref`

Warning candidates:

- duplicate `Objects.ref`
- referenced file is not an `er_entity`
- relation target unresolved
- relation target is outside the diagram
- diagram has no relations

## Complete example

```markdown
---
type: er_diagram
id: ERD-ORDER
name: Order ER Diagram
tags:
  - ER
  - Diagram
---

# Order ER Diagram

## Summary

Overview of customer, order, order line, and product.

## Objects

| ref | notes |
|---|---|
| [[m_customer]] | Customer master |
| [[t_order]] | Order |
| [[t_order_item]] | Order line |
| [[m_product]] | Product master |

## Notes

- Use Custom mode for detailed review.
- Use Mermaid mode for relationship overview.
```
