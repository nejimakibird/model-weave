---
type: mapping
id: MAP-INVENTORY-SEARCH-SCREEN-TO-DATA
name: Inventory Search Screen to Condition Mapping
kind: screen_to_data
source: [[../screen/SCR-INVENTORY-SEARCH]]
target: [[../data/DATA-INVENTORY-SEARCH-CONDITION]]
tags:
  - Mapping
  - WMS
---

# Inventory Search Screen to Condition Mapping

## Summary

Maps inventory search screen fields to inventory search condition data object.

## Scope

| role | ref | notes |
|---|---|---|
| source | [[../screen/SCR-INVENTORY-SEARCH]] | Search screen |
| target | [[../data/DATA-INVENTORY-SEARCH-CONDITION]] | Search condition |
| rule | [[../rule/RULE-INVENTORY-SEARCH-CONDITION]] | Validation |

## Mappings

| source_ref | target_ref | transform | rule | required | notes |
|---|---|---|---|---|---|
| [[../screen/SCR-INVENTORY-SEARCH]].shipper_id | [[../data/DATA-INVENTORY-SEARCH-CONDITION]].shipper_id | Direct copy | [[../rule/RULE-INVENTORY-SEARCH-CONDITION]] | Y |  |
| [[../screen/SCR-INVENTORY-SEARCH]].warehouse_id | [[../data/DATA-INVENTORY-SEARCH-CONDITION]].warehouse_id | Direct copy |  | N |  |
| [[../screen/SCR-INVENTORY-SEARCH]].item_id | [[../data/DATA-INVENTORY-SEARCH-CONDITION]].item_id | Direct copy |  | N |  |
| [[../screen/SCR-INVENTORY-SEARCH]].lot_no | [[../data/DATA-INVENTORY-SEARCH-CONDITION]].lot_no | Direct copy |  | N |  |
| [[../screen/SCR-INVENTORY-SEARCH]].inventory_status | [[../data/DATA-INVENTORY-SEARCH-CONDITION]].inventory_status | Direct copy | [[../rule/RULE-INVENTORY-SEARCH-CONDITION]] | N | CodeSet value |

## Rules

- Shipper ID must be set.
- Inventory status must be an allowed value when specified.

## Notes

- Fixed values are not needed for this mapping.
