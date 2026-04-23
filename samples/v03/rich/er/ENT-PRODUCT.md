---
type: er_entity
id: ENT-PRODUCT
logical_name: Product
physical_name: m_product
schema_name: public
dbms: PostgreSQL
tags:
  - sample
  - v03
  - rich
  - er
---

## Overview

Reference ER sample used by Order Item.

## Columns

| logical_name | physical_name | data_type | length | scale | not_null | pk | encrypted | default_value | notes |
|---|---|---|---|---|---|---|---|---|---|
| Product ID | product_id | bigint | 19 | 0 | true | true | false |  | Primary key |
| Product Code | product_code | varchar | 20 | 0 | true | false | false |  | Business code |
| Product Name | product_name | varchar | 100 | 0 | true | false | false |  | Display name |

## Indexes

| index_name | index_type | unique | columns | notes |
|---|---|---|---|---|
| pk_m_product | primary | true | product_id | Primary key |
| uq_m_product_code | btree | true | product_code | Unique business code |

## Relations

## Notes

- Rich sample target for product references.

