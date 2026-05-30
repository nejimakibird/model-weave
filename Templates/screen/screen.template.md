---
type: screen
id: SCR-SAMPLE
name: Sample Screen
screen_type: entry
tags:
  - Screen
---

# Sample Screen

## Summary

Describe the screen purpose and user scenario.

## Layout

| id | label | kind | purpose | notes |
|---|---|---|---|---|
| root | Screen Root | body | Whole screen |  |
| main | Main Area | form_area | Main input/display area |  |
| actions | Actions | action_area | Operation buttons |  |

## Fields

| id | label | kind | layout | data_type | required | ref | condition | rule | notes |
|---|---|---|---|---|---|---|---|---|---|
| window | Sample Screen | window | root |  |  |  |  |  | Screen root |
| sample_input | Sample Input | input | main | string | Y |  |  |  | Example input field |
| execute_button | Execute | button | actions |  |  |  | [[CODE-INVENTORY-STATUS]].available |  | Execute action |
| back_button | Back | button | actions |  |  |  |  |  | Back action |

## Actions

| id | label | kind | target | event | condition | invoke | transition | rule | notes |
|---|---|---|---|---|---|---|---|---|---|
| ACT-INIT | Initial Load | screen_event | window | load |  | [[#PROC-INITIALIZE]] |  |  | Initialize screen values |
| ACT-EXECUTE | Execute | ui_action | execute_button | click | [[CODE-INVENTORY-STATUS]].available |  |  |  | Add app_process invoke if needed |
| ACT-BACK | Back | ui_action | back_button | click |  |  |  |  | Add transition target if needed |

## Messages

| id | text | severity | timing | condition | notes |
|---|---|---|---|---|---|
| MSG-SAMPLE-001 | Sample message. | info | display | [[CODE-INVENTORY-STATUS]].shortage |  |

## Notes

- Screen transitions should be written in `Actions.transition`.
- Do not add an independent `Transitions` section for new V0.7 screen files.

## Local Processes

### PROC-INITIALIZE

#### Summary

Initializes screen default values.

#### Inputs

| id | data | source | required | notes |
|---|---|---|---|---|
|  |  |  |  |  |

#### Steps

| id | label | kind | condition | input | output | rule | invoke | screen | notes |
|---|---|---|---|---|---|---|---|---|---|
| STEP-001 | Set default values | process | [[CODE-INVENTORY-STATUS]].available |  |  |  |  |  | Load selection candidates if needed |

#### Outputs

| id | data | target | notes |
|---|---|---|---|
|  |  |  |  |

#### Errors

| id | condition | message | notes |
|---|---|---|---|
| ERR-001 | [[CODE-INVENTORY-STATUS]].shortage | Sample message. | Example structured error condition |
