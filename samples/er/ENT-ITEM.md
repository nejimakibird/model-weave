---
type: er_entity
id: ENT-ITEM
logical_name: Item
physical_name: m_item
schema_name: public
dbms: postgresql
tags:
  - ER
  - Entity
  - WMS
---

# Item / m_item

## Overview

- purpose: Item data for WMS sample.

## Columns

| logical_name | physical_name | data_type | length | scale | not_null | pk | encrypted | default_value | notes |
|---|---|---|---:|---:|---|---|---|---|---|
| Item ID | item_id | varchar | 30 |  | Y | Y | N |  | Primary key |
| Item Name | item_name | varchar | 120 |  | Y | N | N |  |  |
| Unit | unit | varchar | 10 |  | Y | N | N |  |  |

## Indexes

| index_name | index_type | unique | columns | notes |
|---|---|---|---|---|
| pk_m_item | PRIMARY | Y | item_id | Primary key |

## Relations


## Notes

- Public sample entity.
