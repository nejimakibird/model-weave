---
type: dfd_diagram
id: DFD-WMS-L0
name: WMS Level 0 DFD
level: 0
render_mode: auto
tags:
  - DFD
  - WMS
---

# WMS Level 0 DFD

## Summary

Level 0 DFD showing main data flows between shipper system, data converter, inventory system, and warehouse operation system.

## Objects

| id | label | kind | ref | notes |
|---|---|---|---|---|
| SHIPPER | Shipper System | external | [[../objects/DFD-EXT-SHIPPER-SYSTEM]] | Referenced external object |
| CONVERTER | Data Converter | process | [[../objects/DFD-PROC-DATA-CONVERTER]] | Referenced process |
| WMS | Inventory Management System | process |  | Local process |
| WORK | Warehouse Operation System | process |  | Local process |
| STOCK | Inventory Data | datastore |  | Local datastore |

## Flows

| id | from | to | data | notes |
|---|---|---|---|---|
| FLOW-INBOUND-PLAN | SHIPPER | CONVERTER | [[../../data/DATA-INBOUND-PLAN-FIXED]] | Fixed-length inbound plan |
| FLOW-INBOUND-CSV | CONVERTER | WMS | [[../../data/DATA-INBOUND-PLAN-CSV]] | Converted CSV |
| FLOW-WORK-INSTRUCTION | WMS | WORK | Work Instruction CSV | CSV |
| FLOW-WORK-RESULT | WORK | WMS | Work Result CSV | CSV |
| FLOW-STOCK-UPDATE | WMS | STOCK | Inventory Update |  |

## Notes

- DFD diagrams are Mermaid-only in V0.7.
- Local and referenced objects can be mixed.
