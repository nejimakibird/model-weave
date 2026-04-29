# FORMAT-er_entity

## Purpose

`er_entity` defines a single ER entity/table.

It stores:

- logical name
- physical name
- columns
- indexes
- outbound relations
- notes

## Core policy

- An `er_entity` file has `type: er_entity`.
- `Columns` are managed as a Markdown table.
- `Indexes` are managed as a Markdown table.
- `Relations` are stored inside the entity file.
- `Relations` are outbound relations from the current table only.
- Inbound relations are derived by the plugin.
- `target_table` is stored per relation block.
- Composite foreign keys are represented by the relation mapping table.
- Markdown is the source of truth. Preview diagrams are derived.

## Frontmatter

Required:

- `type`
- `id`
- `logical_name`
- `physical_name`

Optional:

- `schema_name`
- `dbms`
- `render_mode`
- `tags`

Example:

```yaml
---
type: er_entity
id: ENT-CUSTOMER
logical_name: Customer
physical_name: m_customer
schema_name: public
dbms: postgresql
render_mode: auto
tags:
  - ER
  - Entity
---
```

## Render mode

`er_entity` supports renderer switching in V0.7.

- `auto`: resolves to `custom`.
- `custom`: detailed review view.
- `mermaid`: reduced relationship overview view centered on this entity.

Mermaid mode shows the current entity and related entities with compact labels. It should not list all columns and indexes.

## Recommended structure

```text
# <logical_name> / <physical_name>

## Overview

## Columns

## Indexes

## Relations

## Notes
```

## Overview

Free-form summary of the table's purpose and design notes.

## Columns

Columns:

- `logical_name`
- `physical_name`
- `data_type`
- `length`
- `scale`
- `not_null`
- `pk`
- `encrypted`
- `default_value`
- `notes`

Rules:

- `not_null`, `pk`, and `encrypted` should be `Y` or `N`.
- `length` and `scale` should be numeric or blank.

Example:

```markdown
## Columns

| logical_name | physical_name | data_type | length | scale | not_null | pk | encrypted | default_value | notes |
|---|---|---|---:|---:|---|---|---|---|---|
| Customer ID | customer_id | varchar | 20 |  | Y | Y | N |  | Primary key |
| Customer Name | customer_name | varchar | 100 |  | Y | N | N |  |  |
| Email | email | varchar | 255 |  | N | N | N |  |  |
| Created At | created_at | timestamp |  |  | Y | N | N | CURRENT_TIMESTAMP |  |
```

## Indexes

Columns:

- `index_name`
- `index_type`
- `unique`
- `columns`
- `notes`

Rules:

- `unique` should be `Y` or `N`.
- `columns` may contain one column or a comma-separated list.

Example:

```markdown
## Indexes

| index_name | index_type | unique | columns | notes |
|---|---|---|---|---|
| pk_m_customer | PRIMARY | Y | customer_id | Primary key |
| idx_m_customer_email | BTREE | Y | email | Unique email |
```

## Relations

Relations are stored as blocks under `## Relations`.

Each relation block starts with `### <relation id>`.

Block shape:

```markdown
### <relation id>
- target_table: [[...]]
- kind: fk
- cardinality: ...
- notes: ...

| local_column | target_column | notes |
|---|---|---|
| ... | ... | ... |
```

Relation block attributes:

- `target_table`: target entity/table; wikilink recommended
- `kind`: string; `fk` is the main current value
- `cardinality`: optional display label
- `notes`: optional

Mapping table columns:

- `local_column`
- `target_column`
- `notes`

Example:

```markdown
## Relations

### REL-ORDER-TO-CUSTOMER
- target_table: [[m_customer]]
- kind: fk
- cardinality: N-1
- notes: References customer

| local_column | target_column | notes |
|---|---|---|
| customer_id | customer_id | Customer ID |
```

## Notes

Free-form notes.

## Validation candidates

Error candidates:

- missing required frontmatter
- duplicate `Columns.physical_name`
- missing column names
- relation block without `target_table`
- relation mapping row missing local or target column

Warning candidates:

- `not_null`, `pk`, or `encrypted` is not `Y`/`N`
- unknown relation `kind`
- unresolved `target_table`
- local relation column not found in `Columns`
- target relation column unresolved

## Complete example

```markdown
---
type: er_entity
id: ENT-ORDER
logical_name: Order
physical_name: t_order
schema_name: public
dbms: postgresql
tags:
  - ER
  - Entity
---

# Order / t_order

## Overview

- purpose: Transaction table for orders
- notes: Central table connecting customer and order lines

## Columns

| logical_name | physical_name | data_type | length | scale | not_null | pk | encrypted | default_value | notes |
|---|---|---|---:|---:|---|---|---|---|---|
| Order ID | order_id | varchar | 20 |  | Y | Y | N |  | Primary key |
| Customer ID | customer_id | varchar | 20 |  | Y | N | N |  | Customer FK |
| Order Date | order_date | date |  |  | Y | N | N |  |  |

## Indexes

| index_name | index_type | unique | columns | notes |
|---|---|---|---|---|
| pk_t_order | PRIMARY | Y | order_id | Primary key |
| idx_t_order_customer_id | BTREE | N | customer_id | Customer search |

## Relations

### REL-ORDER-TO-CUSTOMER
- target_table: [[m_customer]]
- kind: fk
- cardinality: N-1
- notes: References customer

| local_column | target_column | notes |
|---|---|---|
| customer_id | customer_id | Customer ID |

## Notes

- Central order table.
```
