---
type: screen
id: SCR-INVENTORY-SEARCH
name: Inventory Search
screen_type: list
tags:
  - Screen
  - WMS
---

# Inventory Search

## Summary

Screen for searching inventory by shipper, warehouse, item, lot, and inventory status.

## Layout

| id      | label             | kind        | purpose                       | notes |
| ------- | ----------------- | ----------- | ----------------------------- | ----- |
| root    | Screen Root       | body        | Whole screen                  |       |
| search  | Search Conditions | search_area | Enter search filters          |       |
| result  | Inventory Results | result_area | Show inventory rows           |       |
| actions | Actions           | action_area | Search and navigation buttons |       |

## Fields

| id               | label            | kind   | layout  | data_type | required | ref                                          | rule                                        | notes               |
| ---------------- | ---------------- | ------ | ------- | --------- | -------- | -------------------------------------------- | ------------------------------------------- | ------------------- |
| window | Inventory Search | window | root |  |  |  |  | Screen root |
| shipper_id       | Shipper ID       | select | search  | string    | Y        | [[../er/minimal/ENT-SHIPPER]].shipper_id     | [[../rule/RULE-INVENTORY-SEARCH-CONDITION]] | Required            |
| warehouse_id     | Warehouse ID     | select | search  | string    | N        | [[../er/minimal/ENT-WAREHOUSE]].warehouse_id |                                             |                     |
| item_id          | Item ID          | input  | search  | string    | N        | [[../er/minimal/ENT-ITEM]].item_id           |                                             |                     |
| lot_no           | Lot No           | input  | search  | string    | N        | [[../er/minimal/ENT-INVENTORY]].lot_no       |                                             |                     |
| inventory_status | Inventory Status | select | search  | string    | N        | [[../codeset/CODE-INVENTORY-STATUS]]         |                                             |                     |
| inventory_table  | Inventory Table  | table  | result  |           |          | [[../er/minimal/ENT-INVENTORY]]              |                                             | Search result table |
| search_button    | Search           | button | actions |           |          |                                              |                                             | Execute search      |
| back_button      | Back             | button | actions |           |          |                                              |                                             | Return to menu      |

## Actions

| id         | label        | kind         | target        | event | invoke                                   | transition       | rule                                        | notes                           |
| ---------- | ------------ | ------------ | ------------- | ----- | ---------------------------------------- | ---------------- | ------------------------------------------- | ------------------------------- |
| ACT-INIT   | Initial Load | screen_event | window        | load  | [[#PROC-INITIALIZE]]                          |                  |                                             | Load default conditions         |
| ACT-SEARCH | Search       | ui_action    | search_button | click | [[../app_process/PROC-INVENTORY-SEARCH]] |                  | [[../rule/RULE-INVENTORY-SEARCH-CONDITION]] | Show results in inventory_table |
| ACT-BACK   | Back         | ui_action    | back_button   | click |                                          | [[SCR-WMS-HOME]] |                                             | Return to WMS menu              |

## Messages

| id | text | severity | timing | notes |
|---|---|---|---|---|
| MSG-NO-RESULT | [[../message/MSGSET-INVENTORY]].INV-INFO-001 | info | search_result | No rows found |
| MSG-VALIDATION | [[../message/MSGSET-INVENTORY]].INV-ERR-001 | error | validation | Invalid search condition |

## Notes

- Transition diagram is derived from Actions.transition in future phases.

## Local Processes

### PROC-INITIALIZE

#### Summary

Initializes the screen with default search conditions.

#### Steps

1. Set default shipper.
2. Load inventory status codes.
3. Clear previous search results.

#### Errors

- If codes cannot be loaded, show a warning and keep the screen usable.
