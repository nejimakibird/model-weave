# FORMAT-er_entity

Japanese Version: [日本語版](../ja/formats/FORMAT-er_entity.md)

## What this is for

`er_entity` defines one ER entity / table.

Use this format when you want to describe:

* a database table
* a logical entity
* table columns
* indexes
* outbound ER relationships
* schema-related notes
* links to schema files, migrations, SQL, or source code

An `er_entity` file is the main place to define fields and ER relationships.

Use `er_diagram` when you want to select multiple `er_entity` files and show them as an overview diagram.

## Important concept: entity as the source of relationships

In Model Weave ER modeling, relationships belong to `er_entity` files.

An `er_diagram` normally only selects entities with `## Objects`.

The relationship itself should be written in the related `er_entity` file, under `## Relations`.

This avoids duplicating the same relationship in multiple diagrams.

A relation in an `er_entity` file is outbound from the current entity.

For example, if `ENT-INVENTORY` has a foreign key to `ENT-ITEM`, define that relation in `ENT-INVENTORY`.

Inbound relations are derived by Model Weave.

## Minimal example

```markdown
---
type: er_entity
id: ENT-ORDER
logical_name: Order
physical_name: t_order
schema_name: public
dbms: postgresql
---

# Order / t_order

## Overview

Order header table.

## Columns

| logical_name | physical_name | data_type | length | scale | not_null | pk | encrypted | default_value | notes |
|---|---|---|---:|---:|---|---|---|---|---|
| Order ID | order_id | varchar | 20 |  | Y | Y | N |  | Primary key |
| Customer ID | customer_id | varchar | 20 |  | Y | N | N |  | Customer FK |

## Relations

### REL-ORDER-TO-CUSTOMER
- target_table: [[ENT-CUSTOMER]]
- kind: fk
- cardinality: N-1
- notes: Order belongs to customer

| local_column | target_column | notes |
|---|---|---|
| customer_id | customer_id | Customer ID |
```

## Full example

```markdown
---
type: er_entity
id: ENT-INVENTORY
logical_name: Inventory
physical_name: t_inventory
schema_name: public
dbms: postgresql
tags:
  - ER
  - Entity
  - WMS
---

# Inventory / t_inventory

## Overview

- purpose: Inventory data for WMS sample.

## Columns

| logical_name | physical_name | data_type | length | scale | not_null | pk | encrypted | default_value | notes |
|---|---|---|---:|---:|---|---|---|---|---|
| Inventory ID | inventory_id | varchar | 30 |  | Y | Y | N |  | Primary key |
| Shipper ID | shipper_id | varchar | 20 |  | Y | N | N |  | Shipper FK |
| Warehouse ID | warehouse_id | varchar | 20 |  | Y | N | N |  | Warehouse FK |
| Item ID | item_id | varchar | 30 |  | Y | N | N |  | Item FK |
| Quantity | quantity | numeric | 12 | 3 | Y | N | N | 0 | Available quantity |
| Inventory Status | inventory_status | varchar | 20 |  | Y | N | N | available | CodeSet reference |

## Indexes

| index_name | index_type | unique | columns | notes |
|---|---|---|---|---|
| pk_t_inventory | PRIMARY | Y | inventory_id | Primary key |
| idx_t_inventory_lookup | BTREE | N | shipper_id, warehouse_id, item_id | Search index |

## Relations

### REL-INVENTORY-TO-SHIPPER
- target_table: [[ENT-SHIPPER]]
- kind: fk
- cardinality: N-1
- notes: Inventory belongs to shipper

| local_column | target_column | notes |
|---|---|---|
| shipper_id | shipper_id |  |

### REL-INVENTORY-TO-WAREHOUSE
- target_table: [[ENT-WAREHOUSE]]
- kind: fk
- cardinality: N-1
- notes: Inventory belongs to warehouse

| local_column | target_column | notes |
|---|---|---|
| warehouse_id | warehouse_id |  |

## Source Links

| path | notes |
|---|---|
| database/schema.sql | Schema definition |
| migrations/ | Migration files |

## Notes

- Public sample entity.
```

## Frontmatter

Required fields:

| field           | required | notes                        |
| --------------- | -------- | ---------------------------- |
| `type`          | yes      | Must be `er_entity`.         |
| `id`            | yes      | Unique entity model ID.      |
| `logical_name`  | yes      | Logical entity / table name. |
| `physical_name` | yes      | Physical table name.         |

Optional fields:

| field         | notes                                                               |
| ------------- | ------------------------------------------------------------------- |
| `schema_name` | Database schema name.                                               |
| `dbms`        | DBMS name, such as `postgresql`, `mysql`, `oracle`, or `sqlserver`. |
| `render_mode` | Optional. Supported values are `custom`, `mermaid`, and `mermaid-detail`. |
| `tags`        | Obsidian / Markdown tags.                                           |

Example:

```yaml
---
type: er_entity
id: ENT-CUSTOMER
logical_name: Customer
physical_name: m_customer
schema_name: public
dbms: postgresql
tags:
  - ER
  - Entity
---
```

## Render mode

`er_entity` supports renderer switching.

Allowed values:

* `custom`
* `mermaid`
* `mermaid-detail`

Interpretation:

| value            | meaning                                                |
| ---------------- | ------------------------------------------------------ |
| `custom`         | Detailed review view.                                  |
| `mermaid`        | Reduced relationship overview centered on this entity. |
| `mermaid-detail` | Mermaid ER diagram with entity column detail.          |

If `render_mode` is omitted, the format-specific default render mode from settings is used.

Deprecated or unsupported values such as `auto` should produce a warning and fall back to the format-specific default.

Mermaid overview mode should keep entity content compact. Use Custom mode for detailed table review, or Mermaid Detail for export-friendly entity bodies.

Toolbar selection is temporary and does not rewrite Markdown or frontmatter.

## Sections

Recommended structure:

```text
# <logical_name> / <physical_name>

## Overview

## Columns

## Indexes

## Relations

## Source Links

## Notes
```

### Overview

Use `## Overview` to describe the table purpose, data meaning, design notes, and operational context.

This section is free text.

### Columns

Use `## Columns` to define entity / table columns.

Expected header:

```markdown
| logical_name | physical_name | data_type | length | scale | not_null | pk | encrypted | default_value | notes |
|---|---|---|---:|---:|---|---|---|---|---|
```

Columns:

| column          | meaning                                          |
| --------------- | ------------------------------------------------ |
| `logical_name`  | Logical column name.                             |
| `physical_name` | Physical database column name.                   |
| `data_type`     | Data type. Prefer simple scalar names.           |
| `length`        | Length / precision. Use blank if not applicable. |
| `scale`         | Numeric scale. Use blank if not applicable.      |
| `not_null`      | `Y` or `N`.                                      |
| `pk`            | `Y` or `N`.                                      |
| `encrypted`     | `Y` or `N`.                                      |
| `default_value` | Default value, if any.                           |
| `notes`         | Optional explanation.                            |

Example:

```markdown
## Columns

| logical_name | physical_name | data_type | length | scale | not_null | pk | encrypted | default_value | notes |
|---|---|---|---:|---:|---|---|---|---|---|
| Customer ID | customer_id | varchar | 20 |  | Y | Y | N |  | Primary key |
| Customer Name | customer_name | varchar | 100 |  | Y | N | N |  |  |
| Created At | created_at | timestamp |  |  | Y | N | N | CURRENT_TIMESTAMP |  |
```

Rules:

* `not_null`, `pk`, and `encrypted` should be `Y` or `N`.
* `length` and `scale` should be numeric or blank.
* Use simple `data_type` values where possible.
* Explain optionality, multiplicity, special formats, or CodeSet references in `notes`.

### Indexes

Use `## Indexes` to define indexes, primary keys, unique constraints, and search indexes.

Expected header:

```markdown
| index_name | index_type | unique | columns | notes |
|---|---|---|---|---|
```

Columns:

| column       | meaning                                                                  |
| ------------ | ------------------------------------------------------------------------ |
| `index_name` | Index or constraint name.                                                |
| `index_type` | Index type, such as `PRIMARY`, `BTREE`, `UNIQUE`, or DBMS-specific type. |
| `unique`     | `Y` or `N`.                                                              |
| `columns`    | Column list. Use comma-separated physical column names.                  |
| `notes`      | Optional explanation.                                                    |

Example:

```markdown
## Indexes

| index_name | index_type | unique | columns | notes |
|---|---|---|---|---|
| pk_m_customer | PRIMARY | Y | customer_id | Primary key |
| idx_m_customer_email | BTREE | Y | email | Unique email |
```

### Relations

Use `## Relations` to define outbound relationships from the current entity.

Each relation is written as a block under `## Relations`.

Each relation block starts with:

```markdown
### <relation id>
```

Block shape:

```markdown
### REL-ORDER-TO-CUSTOMER
- target_table: [[ENT-CUSTOMER]]
- kind: fk
- cardinality: N-1
- notes: References customer

| local_column | target_column | notes |
|---|---|---|
| customer_id | customer_id | Customer ID |
```

Relation block fields:

| field          | meaning                                                 |
| -------------- | ------------------------------------------------------- |
| `target_table` | Target entity / table. Wikilink is recommended.         |
| `kind`         | Relation kind. `fk` is the main current value.          |
| `cardinality`  | Optional display label, such as `N-1`, `1-N`, or `1-1`. |
| `notes`        | Optional explanation.                                   |

Mapping table header:

```markdown
| local_column | target_column | notes |
|---|---|---|
```

Mapping table columns:

| column          | meaning                                     |
| --------------- | ------------------------------------------- |
| `local_column`  | Physical column name in the current entity. |
| `target_column` | Physical column name in the target entity.  |
| `notes`         | Optional explanation.                       |

Notes:

* Relations are outbound from the current entity.
* Inbound relations are derived by Model Weave.
* Composite foreign keys are represented by multiple mapping table rows.
* Use physical column names in relation mappings.

### Source Links

`## Source Links` is optional.

Use it to connect the entity to schema files, migration files, SQL files, source code, or database documentation.

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
| database/schema.sql | Schema definition |
| migrations/001_create_inventory.sql | Create table migration |
```

For details, see [FORMAT-common-sections](FORMAT-common-sections.md).

### Notes

Use `## Notes` for free-form design notes.

Do not add unsupported columns to structured tables just to store extra information. Put extra information in `notes`, `## Notes`, or `## Source Links`.

## Tables

### Columns table

```markdown
| logical_name | physical_name | data_type | length | scale | not_null | pk | encrypted | default_value | notes |
|---|---|---|---:|---:|---|---|---|---|---|
```

### Indexes table

```markdown
| index_name | index_type | unique | columns | notes |
|---|---|---|---|---|
```

### Relation mapping table

```markdown
| local_column | target_column | notes |
|---|---|---|
```

### Source Links table

```markdown
| path | notes |
|---|---|
```

## Relationship handling

`er_entity` is the primary place to define ER relationships.

A relationship block describes a relationship from the current entity to a target entity.

For example:

* `ENT-INVENTORY` -> `ENT-ITEM`
* `ENT-ORDER` -> `ENT-CUSTOMER`
* `ENT-ORDER-LINE` -> `ENT-ORDER`

`er_diagram` uses `## Objects` to select entities and then collects relationships from those entity files.

This is different from `class_diagram`, where optional diagram-level `## Relations` may be used for explicit diagram relationship control.

## Common mistakes

### Defining ER relationships in er_diagram

Do not define normal ER relationships in `er_diagram`.

Put them in the source `er_entity` file.

### Forgetting target_table in a relation block

Each relation block should include `target_table`.

Risky:

```markdown
### REL-ORDER-TO-CUSTOMER
- kind: fk

| local_column | target_column | notes |
|---|---|---|
| customer_id | customer_id |  |
```

Preferred:

```markdown
### REL-ORDER-TO-CUSTOMER
- target_table: [[ENT-CUSTOMER]]
- kind: fk

| local_column | target_column | notes |
|---|---|---|
| customer_id | customer_id |  |
```

### Using logical names in relation mapping

Relation mappings should use physical column names, not logical names.

Avoid:

```markdown
| local_column | target_column | notes |
|---|---|---|
| Customer ID | Customer ID |  |
```

Prefer:

```markdown
| local_column | target_column | notes |
|---|---|---|
| customer_id | customer_id |  |
```

### Adding unsupported columns

Do not add columns such as `description`, `ref`, `source`, or `target` unless the FORMAT explicitly defines them.

Use `notes` or optional sections instead.

### Unsafe table syntax

Avoid raw `|` characters inside table cells.

Avoid Wikilink aliases such as `[[ENT-CUSTOMER|Customer]]` inside tables. Use `[[ENT-CUSTOMER]]` and rely on target entity metadata or notes for display context.

### Using complex type expressions

Avoid complex expressions in `data_type`.

Risky examples:

* `string[]`
* `Array<string>`
* `Optional<string>`
* `string | null`

Prefer simple database-oriented type names such as:

* `varchar`
* `numeric`
* `timestamp`
* `date`
* `boolean`

Use `notes` to explain multiplicity, optionality, or special constraints.

## AI generation notes

When generating `er_entity` files with AI:

* Use `type: er_entity`.
* One file should define one entity / table.
* Preserve exact table headers.
* Do not add unsupported columns.
* Use physical names for `physical_name`, `Columns.physical_name`, and relation mappings.
* Use simple database-oriented data types.
* Use `Y` / `N` for `not_null`, `pk`, `encrypted`, and `Indexes.unique`.
* Define ER relationships in `## Relations`, not in `er_diagram`.
* Use one relation block per outbound relationship.
* Include `target_table` in each relation block.
* Use multiple mapping rows for composite foreign keys.
* Put extra explanation in `notes` or `## Notes`.
* Use `## Source Links` for schema files, migrations, SQL, or source files.

If AI creates an entity from schema or source code, verify:

* table name
* column names
* primary key
* indexes
* relation target entity
* relation mapping columns

## Related samples

* [Inventory entity](../../samples/er/ENT-INVENTORY.md)
* [Item entity](../../samples/er/ENT-ITEM.md)
* [Shipper entity](../../samples/er/ENT-SHIPPER.md)
* [Warehouse entity](../../samples/er/ENT-WAREHOUSE.md)
* [ER samples index](../../samples/er/README.md)

## Related formats

* [er_diagram](FORMAT-er_diagram.md)
* [Common sections](FORMAT-common-sections.md)
