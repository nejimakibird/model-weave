---
type: class
id: CLS-WMS-INVENTORY-SERVICE
name: InventoryService
kind: class
package: wms.inventory
tags:
  - Class
  - WMS
---

# InventoryService

## Summary

Coordinates inventory search and inventory allocation use cases.

## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| inventoryRepository | InventoryRepository | private | N | Repository dependency |
| allocationPolicy | AllocationPolicy | private | N | Allocation business policy |

## Methods

| name | parameters | returns | visibility | static | notes |
|---|---|---|---|---|---|
| searchInventory | condition: InventorySearchCondition | InventorySearchResult | public | N | Search available inventory |
| allocate | request: AllocationRequest | AllocationResult | public | N | Allocate inventory for outbound order |

## Relations

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
| REL-INVENTORY-SERVICE-USES-REPOSITORY | IF-WMS-INVENTORY-REPOSITORY | dependency | uses |  |  | Repository access |
| REL-INVENTORY-SERVICE-USES-POLICY | CLS-WMS-ALLOCATION-POLICY | dependency | applies |  |  | Allocation rule |

## Notes

- Mermaid mode shows this class and related objects as a reduced overview.
