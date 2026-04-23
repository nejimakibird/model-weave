---
type: er_entity
id: ENT-ORDER
logical_name: Order
physical_name: t_order
schema_name: public
dbms: PostgreSQL
tags:
  - sample
  - v03
  - rich
  - er
---

## Overview

Rich ER sample for FK aggregation and single-object subgraph rendering.

## Columns

| logical_name | physical_name | data_type | length | scale | not_null | pk | encrypted | default_value | notes |
|---|---|---|---|---|---|---|---|---|---|
| Order ID | order_id | bigint | 19 | 0 | true | true | false |  | Primary key |
| Customer ID | customer_id | bigint | 19 | 0 | true | false | false |  | FK to customer |
| Order Date | order_date | date |  |  | true | false | false |  | Business date |
| Order Status | order_status | varchar | 20 | 0 | true | false | false | NEW | Business status |

## Indexes

| index_name | index_type | unique | columns | notes |
|---|---|---|---|---|
| pk_t_order | primary | true | order_id | Primary key |
| idx_t_order_customer | btree | false | customer_id | Customer lookup |

## Relations

### REL-ORDER-TO-CUSTOMER
- target_table: [[samples/v03/rich/er/ENT-CUSTOMER]]
- kind: fk
- cardinality: N-1
- notes: Order belongs to customer

| local_column | target_column | notes |
|---|---|---|
| customer_id | customer_id | Customer relation |

## Notes

- Rich sample source for inbound and outbound relation checks.
