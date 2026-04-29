---
type: app_process
id: PROC-SAMPLE
name: Sample Application Process
kind: server_process
tags:
  - AppProcess
---

# Sample Application Process

## Summary

Describe the UI-less application process.

## Triggers

| id | kind | source | event | notes |
|---|---|---|---|---|
| TRG-SAMPLE | screen_action | [[SCR-SAMPLE]].ACT-EXECUTE | click | Example trigger |

## Inputs

| id | data | source | required | notes |
|---|---|---|---|---|
| IN-SAMPLE | [[DATA-SAMPLE]] | [[SCR-SAMPLE]] | Y | Input data |

## Outputs

| id | data | target | notes |
|---|---|---|---|
| OUT-SAMPLE | [[DATA-SAMPLE-RESULT]] | [[SCR-SAMPLE]] | Output data |

## Transitions

| id | event | to | condition | notes |
|---|---|---|---|---|

## Steps

1. Validate input data.
2. Execute the main process.
3. Return output data.

## Errors

- If validation fails, return a validation message.
- If processing fails, return an error message.

## Notes

- Steps and Errors are intentionally natural-language sections.
