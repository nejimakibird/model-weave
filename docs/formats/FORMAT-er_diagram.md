# FORMAT-er_diagram

Japanese Version: [日本語版](../ja/formats/FORMAT-er_diagram.md)

## What this is for

`er_diagram` defines an overview diagram for multiple `er_entity` files.

Use this format when you want to:

* show relationships between multiple entities / tables
* create a database or domain data model overview
* review table relationships
* group existing `er_entity` files into a readable diagram
* export an ER overview as a PNG

An `er_diagram` file does not replace individual `er_entity` files.

Use:

* `er_entity` to define one entity / table and its fields / relationships
* `er_diagram` to select which entities are included in an overview diagram

## Important concept: Objects only

An `er_diagram` mainly defines diagram scope.

In most cases, the diagram file only needs `## Objects`.

ER relationships are normally collected from each referenced `er_entity` file.

This means:

* entity fields should be written in individual `er_entity` files
* entity relationships should be written in individual `er_entity` files
* `er_diagram` should focus on selecting which entities are included in the diagram

Unlike `class_diagram`, `er_diagram` normally does not define diagram-level `## Relations`.

## Difference from Class diagrams

`er_diagram` and `class_diagram` look similar because both can select objects for a diagram.

However, their relationship handling is different.

For Class models:

* `class_diagram` lists target classes in `## Objects`
* relationships can be collected from each `class`
* `class_diagram` may also define optional diagram-level `## Relations`

For ER models:

* `er_diagram` lists target entities in `## Objects`
* relationships are collected from each `er_entity`
* the diagram file normally does not define ER relationships directly

This avoids duplicating the same ER relationship in multiple diagrams.

If an entity relationship is part of the data model, define it in the related `er_entity` file.

## Minimal example

```markdown
---
type: er_diagram
id: ERD-ORDER-CORE
name: Order Core ER Diagram
---

# Order Core ER Diagram

## Objects

| ref | notes |
|---|---|
| [[ENT-ORDER]] | Order header table |
| [[ENT-ORDER-LINE]] | Order line table |
| [[ENT-CUSTOMER]] | Customer table |
```

## Full example

```markdown
---
type: er_diagram
id: ERD-WMS-CORE
name: WMS Core ER Diagram
tags:
  - ER
---

# WMS Core ER Diagram

## Summary

Core entities for warehouse inventory and shipping.

## Objects

| ref | notes |
|---|---|
| [[ENT-INVENTORY]] | Inventory balance |
| [[ENT-ITEM]] | Item master |
| [[ENT-LOCATION]] | Warehouse location |
| [[ENT-STOCK-MOVEMENT]] | Stock movement history |

## Source Links

| path | notes |
|---|---|
| database/schema.sql | Database schema |
| migrations/ | Migration files |

## Notes

- Relationships are defined in each `er_entity` file.
- This diagram selects the entities to include in the overview.
```

## Frontmatter

Required fields:

| field  | required | notes                        |
| ------ | -------- | ---------------------------- |
| `type` | yes      | Must be `er_diagram`.        |
| `id`   | yes      | Unique diagram model ID.     |
| `name` | yes      | Display name of the diagram. |

Optional fields:

| field         | notes                                                                                  |
| ------------- | -------------------------------------------------------------------------------------- |
| `render_mode` | Optional. Supported values are `custom`, `mermaid`, and `mermaid-detail`.              |
| `tags`        | Obsidian / Markdown tags.                                                              |
| `scope`       | Optional logical scope, such as database, schema, module, bounded context, or feature. |
| `notes`       | Short frontmatter note if needed.                                                      |

Example:

```yaml
---
type: er_diagram
id: ERD-WMS-CORE
name: WMS Core ER Diagram
tags:
  - ER
---
```

## Render mode

`er_diagram` supports renderer switching.

Allowed values:

* `custom`
* `mermaid`
* `mermaid-detail`

Interpretation:

| value            | meaning                                          |
| ---------------- | ------------------------------------------------ |
| `custom`         | Detailed review view with tables and navigation. |
| `mermaid`        | Overview ER diagram / relationship graph.        |
| `mermaid-detail` | Mermaid ER diagram with entity column detail.    |

Mermaid mode is useful for overview diagrams.
Custom mode is useful when reviewing references, diagnostics, and navigation details.
Mermaid Detail is useful for export-friendly entity bodies.

If `render_mode` is omitted, the format-specific default render mode from settings is used.

Deprecated or unsupported values such as `auto` should produce a warning and fall back to the format-specific default.

Toolbar selection is temporary and does not rewrite Markdown or frontmatter.

## Sections

Recommended structure:

```text
# <Diagram Name>

## Summary

## Objects

## Source Links

## Notes
```

### Summary

Use `## Summary` to describe the purpose, scope, database area, or review intent of the diagram.

This section is free text.

### Objects

Use `## Objects` to list entities included in the diagram.

Expected header:

```markdown
| ref | notes |
|---|---|
```

Columns:

| column  | meaning                                       |
| ------- | --------------------------------------------- |
| `ref`   | Wikilink or reference to an `er_entity` file. |
| `notes` | Optional explanation.                         |

Example:

```markdown
## Objects

| ref | notes |
|---|---|
| [[ENT-ORDER]] | Order header |
| [[ENT-ORDER-LINE]] | Order details |
| [[ENT-CUSTOMER]] | Customer master |
```

Notes:

* `## Objects` defines the diagram scope.
* Relationships are collected from the referenced `er_entity` files.
* Keep object references stable.
* Do not use display labels as IDs.
* Use the `name` field in the target `er_entity` file for display naming where possible.

### Source Links

`## Source Links` is optional.

Use it to connect the ER diagram to schema files, migration files, database documentation, SQL files, or source code.

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
| database/schema.sql | Database schema |
| migrations/ | Migration files |
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

### Source Links table

```markdown
| path | notes |
|---|---|
```

## Relationship handling

`er_diagram` normally does not define relationships directly.

ER relationships should be defined in `er_entity` files.

The diagram uses `## Objects` to select entities, then collects relationships from those entity definitions.

This is different from `class_diagram`, where optional diagram-level `## Relations` may be used for explicit relationship control.

### Why ER relations belong to er_entity

ER relationships are part of the data model.

If the same relation is written separately in multiple diagrams, it can easily become inconsistent.

For that reason, define ER relationships close to the entity definition and let diagrams collect them.

## Common mistakes

### Adding a Relations table to er_diagram

Avoid adding diagram-level `## Relations` to `er_diagram` unless the FORMAT explicitly supports it.

Risky:

```markdown
## Relations

| id | from | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|---|
| REL-ORDER-CUSTOMER | ENT-ORDER | ENT-CUSTOMER | many-to-one | customer | * | 1 |  |
```

Prefer defining ER relationships in `er_entity` files.

### Treating er_diagram like class_diagram

Do not assume ER diagrams and Class diagrams handle relationships the same way.

For Class diagrams, optional diagram-level `## Relations` may be used.

For ER diagrams, relationships are normally collected from `er_entity` files.

### Missing entities referenced by relationships

If a relationship exists between two entities, but one side is not included in `## Objects`, the diagram may omit or warn about that relationship depending on implementation behavior.

Include all entities you want to see in the diagram.

### Adding unsupported columns

Do not add columns such as `label`, `kind`, `source`, `target`, or `description` to the `## Objects` table unless the FORMAT explicitly defines them.

Use `notes` or optional sections instead.

### Unsafe table syntax

Avoid raw `|` characters inside table cells.

Avoid Wikilink aliases such as `[[ENT-ORDER|Order]]` inside tables. Use `[[ENT-ORDER]]` and rely on the target entity name or notes for display context.

## AI generation notes

When generating `er_diagram` files with AI:

* Use `type: er_diagram`.
* Use `## Objects` to choose the entities included in the diagram.
* Use `er_entity` files for entity fields and relationships.
* Preserve exact table headers.
* Do not add unsupported columns.
* Do not add diagram-level `## Relations` unless the implementation explicitly supports it.
* Do not treat ER diagram relation handling as identical to Class diagram relation handling.
* Put extra explanation in `notes` or `## Notes`.
* Use `## Source Links` for schema files, migration files, SQL files, or database documentation.

If AI creates an ER diagram from source code or database schema, verify that the listed entities exist and that relationships are defined in the corresponding `er_entity` files.

## Related samples

* [WMS core ER diagram](../../samples/er/ERD-WMS-CORE.md)
* [ER samples index](../../samples/er/README.md)

## Related formats

* [er_entity](FORMAT-er_entity.md)
* [class_diagram](FORMAT-class_diagram.md)
* [Common sections](FORMAT-common-sections.md)
