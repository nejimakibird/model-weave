---
type: er_entity
id: ENT-ORDER-ITEM
logical_name: Order Item
physical_name: t_order_item
schema_name: public
dbms: PostgreSQL
tags:
  - sample
  - v03
  - rich
  - er
---

## Overview

Rich ER sample with composite foreign key mapping.

## Columns

| logical_name | physical_name | data_type | length | scale | not_null | pk | encrypted | default_value | notes |
|---|---|---|---|---|---|---|---|---|---|
| Order ID | order_id | bigint | 19 | 0 | true | true | false |  | Composite PK |
| Order Branch No | order_branch_no | integer | 10 | 0 | true | true | false |  | Composite PK |
| Product ID | product_id | bigint | 19 | 0 | true | false | false |  | FK to product |
| Quantity | quantity | integer | 10 | 0 | true | false | false | 1 | Ordered quantity |

## Indexes

| index_name | index_type | unique | columns | notes |
|---|---|---|---|---|
| pk_t_order_item | primary | true | order_id, order_branch_no | Primary key |
| idx_t_order_item_product | btree | false | product_id | Product lookup |

## Relations

### REL-ORDER-ITEM-TO-ORDER
- target_table: [[ENT-ORDER]]
- kind: fk
- cardinality: N-1
- notes: Composite FK to order

| local_column | target_column | notes |
|---|---|---|
| order_id | order_id | Composite key part 1 |
| order_branch_no | order_branch_no | Composite key part 2 |

### REL-ORDER-ITEM-TO-PRODUCT
- target_table: [[ENT-PRODUCT]]
- kind: fk
- cardinality: N-1
- notes: Product reference

| local_column | target_column | notes |
|---|---|---|
| product_id | product_id | Product relation |

## Notes

- Rich sample for composite FK and mapping summary checks.

