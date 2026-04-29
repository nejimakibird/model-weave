---
type: rule
id: RULE-INVENTORY-SEARCH-CONDITION
name: Inventory Search Condition Rule
kind: validation
tags:
  - Rule
  - WMS
---

# Inventory Search Condition Rule

## Summary

Defines validation rules for inventory search conditions.

## Inputs

| id | data | source | required | notes |
|---|---|---|---|---|
| IN-SHIPPER | [[../data/DATA-INVENTORY-SEARCH-CONDITION]].shipper_id | [[../screen/SCR-INVENTORY-SEARCH]].shipper_id | Y | Required |
| IN-STATUS | [[../data/DATA-INVENTORY-SEARCH-CONDITION]].inventory_status | [[../screen/SCR-INVENTORY-SEARCH]].inventory_status | N | CodeSet value |

## References

| ref | usage | notes |
|---|---|---|
| [[../codeset/CODE-INVENTORY-STATUS]] | allowed_values | Inventory status values |

## Conditions

- Shipper ID is required.
- If inventory status is specified, it must exist in [[../codeset/CODE-INVENTORY-STATUS]].
- At least one optional filter should be specified for large warehouses.

## Messages

| condition | message | severity | notes |
|---|---|---|---|
| shipper_id is empty | [[../message/MSGSET-INVENTORY]].INV-ERR-001 | error | Required field |
| invalid status | [[../message/MSGSET-INVENTORY]].INV-ERR-002 | error | Invalid CodeSet value |

## Notes

- This rule is intentionally written in natural language.
