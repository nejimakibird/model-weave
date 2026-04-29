---
type: class
id: CLS-WMS-ALLOCATION-POLICY
name: AllocationPolicy
kind: class
package: wms.inventory
tags:
  - Class
  - WMS
---

# AllocationPolicy

## Summary

Defines how inventory should be selected for allocation.

## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| preferOldestLot | boolean | private | N | FIFO-like lot selection |

## Methods

| name | parameters | returns | visibility | static | notes |
|---|---|---|---|---|---|
| selectLots | candidates: InventoryList; quantity: number | InventoryList | public | N | Selects inventory lots |

## Relations

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|

## Notes

- The related rule is managed as a rule document.
