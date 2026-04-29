---
type: er_entity
id: ENT-WAREHOUSE
logical_name: Warehouse
physical_name: m_warehouse
schema_name: public
dbms: postgresql
tags:
  - ER
  - Entity
  - WMS
---

# Warehouse / m_warehouse

## Overview

- purpose: Warehouse data for WMS sample.

## Columns

| logical_name | physical_name | data_type | length | scale | not_null | pk | encrypted | default_value | notes |
|---|---|---|---:|---:|---|---|---|---|---|
| Warehouse ID | warehouse_id | varchar | 20 |  | Y | Y | N |  | Primary key |
| Warehouse Name | warehouse_name | varchar | 100 |  | Y | N | N |  |  |
| Active Flag | active_flag | varchar | 1 |  | Y | N | N | Y |  |

## Indexes

| index_name | index_type | unique | columns | notes |
|---|---|---|---|---|
| pk_m_warehouse | PRIMARY | Y | warehouse_id | Primary key |

## Relations


## Notes

- Public sample entity.
