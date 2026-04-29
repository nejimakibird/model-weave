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

| id | label | kind | layout | data_type | required | ref | rule | notes |
|---|---|---|---|---|---|---|---|---|
| window | Sample Screen | window | root |  |  |  |  | Screen root |
| sample_input | Sample Input | input | main | string | Y |  |  | Example input field |
| execute_button | Execute | button | actions |  |  |  |  | Execute action |
| back_button | Back | button | actions |  |  |  |  | Back action |

## Actions

| id | label | kind | target | event | invoke | transition | rule | notes |
|---|---|---|---|---|---|---|---|---|
| ACT-INIT | Initial Load | screen_event | window | load | [[#PROC-INITIALIZE]] |  |  | Initialize screen values |
| ACT-EXECUTE | Execute | ui_action | execute_button | click |  |  |  | Add app_process invoke if needed |
| ACT-BACK | Back | ui_action | back_button | click |  |  |  | Add transition target if needed |

## Messages

| id | text | severity | timing | notes |
|---|---|---|---|---|
| MSG-SAMPLE-001 | Sample message. | info | display |  |

## Notes

- Screen transitions should be written in `Actions.transition`.
- Do not add an independent `Transitions` section for new V0.7 screen files.

## Local Processes

### PROC-INITIALIZE

#### Summary

Initializes screen default values.

#### Steps

1. Set default values.
2. Load selection candidates if needed.

#### Errors

- If initialization fails, keep the screen usable and show a warning.
