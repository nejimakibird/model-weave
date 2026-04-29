---
type: screen
id: SCR-WMS-HOME
name: WMS Home
screen_type: dashboard
tags:
  - Screen
  - WMS
---

# WMS Home

## Summary

Entry screen for WMS sample operations.

## Layout

| id | label | kind | purpose | notes |
|---|---|---|---|---|
| root    | Screen Root       | body        | Whole screen                  |       |
| menu | Menu | action_area | Navigate to WMS sample screens |  |

## Fields

| id                    | label            | kind   | layout | data_type | required | ref                      | rule | notes                 |
| --------------------- | ---------------- | ------ | ------ | --------- | -------- | ------------------------ | ---- | --------------------- |
| window                | WMS Home         | window | root   |           |          |                          |      | Screen root           |
| inventory_search_link | Inventory Search | link   | menu   |           |          | [[SCR-INVENTORY-SEARCH]] |      | Open inventory search |

## Actions

| id | label | kind | target | event | invoke | transition | rule | notes |
|---|---|---|---|---|---|---|---|---|
| ACT-OPEN-INVENTORY-SEARCH | Open Inventory Search | ui_action | inventory_search_link | click |  | [[SCR-INVENTORY-SEARCH]] |  | Open inventory search screen |

## Messages

| id | text | severity | timing | notes |
|---|---|---|---|---|

## Notes

- Minimal home screen for sample navigation.

## Local Processes