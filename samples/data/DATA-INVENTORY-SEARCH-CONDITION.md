---
type: data_object
id: DATA-INVENTORY-SEARCH-CONDITION
name: Inventory Search Condition
kind: query
data_format: object
tags:
  - DataObject
  - WMS
---

# Inventory Search Condition

## Summary

Search condition passed from inventory search screen to inventory search process.

## Fields

| name | label | type | length | required | path | ref | notes |
|---|---|---|---:|---|---|---|---|
| shipper_id | Shipper ID | string | 20 | Y | $.shipperId | [[../er/minimal/ENT-SHIPPER]].shipper_id |  |
| warehouse_id | Warehouse ID | string | 20 | N | $.warehouseId | [[../er/minimal/ENT-WAREHOUSE]].warehouse_id |  |
| item_id | Item ID | string | 30 | N | $.itemId | [[../er/minimal/ENT-ITEM]].item_id |  |
| lot_no | Lot No | string | 30 | N | $.lotNo | [[../er/minimal/ENT-INVENTORY]].lot_no |  |
| inventory_status | Inventory Status | string | 20 | N | $.inventoryStatus | [[../codeset/CODE-INVENTORY-STATUS]] |  |

## Notes

- Used by SCR-INVENTORY-SEARCH and PROC-INVENTORY-SEARCH.
