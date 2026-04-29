---
type: er_entity
id: ENT-INVENTORY
logical_name: Inventory
physical_name: t_inventory
schema_name: public
dbms: postgresql
tags:
  - ER
  - Entity
  - WMS
---

# Inventory / t_inventory

## Overview

- purpose: Inventory data for WMS sample.

## Columns

| logical_name | physical_name | data_type | length | scale | not_null | pk | encrypted | default_value | notes |
|---|---|---|---:|---:|---|---|---|---|---|
| Inventory ID | inventory_id | varchar | 30 |  | Y | Y | N |  | Primary key |
| Shipper ID | shipper_id | varchar | 20 |  | Y | N | N |  | Shipper FK |
| Warehouse ID | warehouse_id | varchar | 20 |  | Y | N | N |  | Warehouse FK |
| Item ID | item_id | varchar | 30 |  | Y | N | N |  | Item FK |
| Lot No | lot_no | varchar | 30 |  | Y | N | N |  | Lot number |
| Quantity | quantity | numeric | 12 | 3 | Y | N | N | 0 | Available quantity |
| Inventory Status | inventory_status | varchar | 20 |  | Y | N | N | available | CodeSet reference |

## Indexes

| index_name | index_type | unique | columns | notes |
|---|---|---|---|---|
| pk_t_inventory | PRIMARY | Y | inventory_id | Primary key |
| idx_t_inventory_lookup | BTREE | N | shipper_id, warehouse_id, item_id, lot_no | Search index |

## Relations

### REL-INVENTORY-TO-SHIPPER
- target_table: [[ENT-SHIPPER]]
- kind: fk
- cardinality: N-1
- notes: Inventory belongs to shipper

| local_column | target_column | notes |
|---|---|---|
| shipper_id | shipper_id |  |

### REL-INVENTORY-TO-WAREHOUSE
- target_table: [[ENT-WAREHOUSE]]
- kind: fk
- cardinality: N-1
- notes: Inventory belongs to warehouse

| local_column | target_column | notes |
|---|---|---|
| warehouse_id | warehouse_id |  |

### REL-INVENTORY-TO-ITEM
- target_table: [[ENT-ITEM]]
- kind: fk
- cardinality: N-1
- notes: Inventory belongs to item

| local_column | target_column | notes |
|---|---|---|
| item_id | item_id |  |


## Notes

- Public sample entity.
