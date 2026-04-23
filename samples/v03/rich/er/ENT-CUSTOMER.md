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
  - rich
  - er
---

## Overview

Reference ER sample with enough columns to test node summaries and related graph readability.

## Columns

| logical_name | physical_name | data_type | length | scale | not_null | pk | encrypted | default_value | notes |
|---|---|---|---|---|---|---|---|---|---|
| Customer ID | customer_id | bigint | 19 | 0 | true | true | false |  | Primary key |
| Customer Code | customer_code | varchar | 20 | 0 | true | false | false |  | Business key |
| Customer Name | customer_name | varchar | 100 | 0 | true | false | false |  | Display name |
| Customer Status | customer_status | varchar | 20 | 0 | true | false | false | ACTIVE | Lifecycle status |

## Indexes

| index_name | index_type | unique | columns | notes |
|---|---|---|---|---|
| pk_m_customer | primary | true | customer_id | Primary key |
| uq_m_customer_code | btree | true | customer_code | Unique business code |

## Relations

## Notes

- Rich sample target for inbound relation checks.

