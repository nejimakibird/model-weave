---
type: dfd_diagram
id: DFD-WMS-L0-LOCAL
name: WMS Level 0 Local Object DFD
level: 0
render_mode: auto
tags:
  - DFD
  - WMS
---

# WMS Level 0 Local Object DFD

## Summary

A lightweight DFD using only local objects in `dfd_diagram.Objects`.

## Objects

| id | label | kind | ref | notes |
|---|---|---|---|---|
| CLIENT | Shipper System | external |  | Local external system |
| WMS | Inventory Management System | process |  | Local process |
| WORK | Warehouse Operation System | process |  | Local process |
| STOCK | Inventory Data | datastore |  | Local datastore |

## Flows

| id | from | to | data | notes |
|---|---|---|---|---|
| FLOW-L0-TEST | CLIENT | WMS | Inbound Plan Data | Local object test flow |
| FLOW-WORK | WMS | WORK | Work Instruction |  |
| FLOW-RESULT | WORK | WMS | Work Result |  |
| FLOW-STOCK | WMS | STOCK | Stock Update |  |

## Notes

- `CLIENT`, `WMS`, `WORK`, and `STOCK` are local object IDs.
- Flows do not create missing nodes silently.
