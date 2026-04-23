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
  - minimal
  - er
---

## Overview

Minimal ER sample with one outbound relation to Customer.

## Columns

| logical_name | physical_name | data_type | length | scale | not_null | pk | encrypted | default_value | notes |
|---|---|---|---|---|---|---|---|---|---|
| Order ID | order_id | bigint | 19 | 0 | true | true | false |  | Primary key |
| Customer ID | customer_id | bigint | 19 | 0 | true | false | false |  | FK to customer |
| Order Date | order_date | date |  |  | true | false | false |  | Business date |

## Indexes

| index_name | index_type | unique | columns | notes |
|---|---|---|---|---|
| pk_t_order | primary | true | order_id | Primary key index |
| idx_t_order_customer | btree | false | customer_id | Customer lookup |

## Relations

### REL-ORDER-TO-CUSTOMER
- target_table: [[samples/v03/minimal/er/ENT-CUSTOMER]]
- kind: fk
- cardinality: N-1
- notes: Each order belongs to one customer

| local_column | target_column | notes |
|---|---|---|
| customer_id | customer_id | FK mapping |

## Notes

- Minimal relation sample for ER diagram aggregation.
