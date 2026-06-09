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

## Steps

| id | domain | label | kind | input | output | rule | invoke | screen | notes |
|---|---|---|---|---|---|---|---|---|---|
| step1 | User | Submit request | start | IN-SAMPLE |  |  |  | SCR-SAMPLE | User starts the process |
| step2 | System | Execute process | process | IN-SAMPLE | OUT-SAMPLE |  |  |  | Execute the main process |

## Flows

| from | to | condition | label | notes |
|---|---|---|---|---|
| step1 | step2 | [[CODE-INVENTORY-STATUS]].available | OK | `from` and `to` are internal step ids; plain text conditions are display-only |

## Transitions

| id | event | to | condition | notes |
|---|---|---|---|---|

## Errors

- If validation fails, return a validation message.
- If processing fails, return an error message.

## Notes

- `Flows.from` and `Flows.to` are internal step ids.
- `Flows.condition` may contain structured references such as `[[CODE-INVENTORY-STATUS]].available`.
