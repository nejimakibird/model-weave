---
type: er_entity
id: ENT-CUSTOMER
logical_name: Customer
physical_name: m_customer
schema_name: public
dbms: PostgreSQL
tags:
  - sample
  - v03
  - minimal
  - er
---

## Overview

Minimal ER sample for single-object and relation resolution checks.

## Columns

| logical_name | physical_name | data_type | length | scale | not_null | pk | encrypted | default_value | notes |
|---|---|---|---|---|---|---|---|---|---|
| Customer ID | customer_id | bigint | 19 | 0 | true | true | false |  | Primary key |
| Customer Name | customer_name | varchar | 100 | 0 | true | false | false |  | Display name |

## Indexes

| index_name | index_type | unique | columns | notes |
|---|---|---|---|---|
| pk_m_customer | primary | true | customer_id | Primary key index |

## Relations

## Notes

- Minimal sample: no outbound relations on this entity.

