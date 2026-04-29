---
type: app_process
id: PROC-INVENTORY-SEARCH
name: Inventory Search Process
kind: server_process
tags:
  - AppProcess
  - WMS
---

# Inventory Search Process

## Summary

Searches inventory records using conditions entered on the inventory search screen.

## Triggers

| id | kind | source | event | notes |
|---|---|---|---|---|
| TRG-SEARCH-CLICK | screen_action | [[../screen/SCR-INVENTORY-SEARCH]].ACT-SEARCH | click | Search button |

## Inputs

| id | data | source | required | notes |
|---|---|---|---|---|
| IN-CONDITION | [[../data/DATA-INVENTORY-SEARCH-CONDITION]] | [[../screen/SCR-INVENTORY-SEARCH]] | Y | Search condition |

## Outputs

| id | data | target | notes |
|---|---|---|---|
| OUT-RESULT | [[../er/minimal/ENT-INVENTORY]] | [[../screen/SCR-INVENTORY-SEARCH]].inventory_table | Search result rows |

## Transitions

| id | event | to | condition | notes |
|---|---|---|---|---|

## Steps

1. Validate the search condition.
2. Query inventory rows by shipper, warehouse, item, lot, and status.
3. Return matching rows to the screen.

## Errors

- If the condition is invalid, return a validation error message.
- If the query fails, return a common system error message.

## Notes

- Detailed SQL is out of scope for this sample.
