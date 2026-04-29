---
type: er_entity
id: ENT-SHIPPER
logical_name: Shipper
physical_name: m_shipper
schema_name: public
dbms: postgresql
tags:
  - ER
  - Entity
  - WMS
---

# Shipper / m_shipper

## Overview

- purpose: Shipper data for WMS sample.

## Columns

| logical_name | physical_name | data_type | length | scale | not_null | pk | encrypted | default_value | notes |
|---|---|---|---:|---:|---|---|---|---|---|
| Shipper ID | shipper_id | varchar | 20 |  | Y | Y | N |  | Primary key |
| Shipper Name | shipper_name | varchar | 100 |  | Y | N | N |  |  |
| Active Flag | active_flag | varchar | 1 |  | Y | N | N | Y |  |

## Indexes

| index_name | index_type | unique | columns | notes |
|---|---|---|---|---|
| pk_m_shipper | PRIMARY | Y | shipper_id | Primary key |

## Relations


## Notes

- Public sample entity.
