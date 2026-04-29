---
type: class
id: IF-WMS-INVENTORY-REPOSITORY
name: InventoryRepository
kind: interface
package: wms.inventory
tags:
  - Class
  - WMS
---

# InventoryRepository

## Summary

Repository interface for inventory persistence.

## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|

## Methods

| name | parameters | returns | visibility | static | notes |  
|---|---|---|---|---|---|  
| findAvailable | condition: InventorySearchCondition | InventoryList | public | N | Finds available inventory |  
| saveAllocation | allocation: Allocation | void | public | N | Persists allocation result |

## Relations

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|

## Notes

- Interface used by InventoryService.
