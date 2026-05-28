---
type: app_process
id: PROC-SAMPLE-ORDER-ENTRY-FLOW
name: Sample Order Entry Business Flow
kind: server_process
tags:
  - AppProcess
  - BusinessFlow
  - Sample
---

# Sample Order Entry Business Flow

## Summary

Demonstrates table-based app_process Steps and Flows for the experimental Business Flow preview.

## Source Links

| path | notes |
|---|---|
| src/order/OrderEntryProcess.ts | Placeholder process implementation |
| src/order/OrderValidationService.ts | Placeholder validation service |

## Triggers

| id | kind | source | event | notes |
|---|---|---|---|---|
| TRG-SUBMIT-ORDER | screen_action | [[../screen/SCR-ORDER-ENTRY]].ACT-SUBMIT | click | User submits the order entry form |

## Inputs

| id | data | source | required | notes |
|---|---|---|---|---|
| IN-ORDER-DRAFT | DATA-SAMPLE-ORDER-DRAFT | [[../screen/SCR-ORDER-ENTRY]] | Y | Order values entered by the user |

## Outputs

| id | data | target | notes |
|---|---|---|---|
| OUT-ORDER-RESULT | DATA-SAMPLE-ORDER-RESULT | [[../screen/SCR-ORDER-COMPLETE]] | Result for completion or correction |

## Steps

| id | lane | label | kind | input | output | rule | invoke | screen | notes |
|---|---|---|---|---|---|---|---|---|---|
| start | User | Submit order | start | IN-ORDER-DRAFT |  |  |  | SCR-ORDER-ENTRY | User submits the entry form |
| capture | Screen | Capture entered values | input | IN-ORDER-DRAFT | ORDER-CANDIDATE |  |  | SCR-ORDER-ENTRY | Read visible form values |
| validate | System | Validate order | decision | ORDER-CANDIDATE | VALIDATION-RESULT | RULE-SAMPLE-ORDER-VALID |  |  | Branches to valid or invalid path |
| audit |  | Record validation attempt | process | VALIDATION-RESULT | AUDIT-ENTRY |  |  |  | Lane-less step; no Unassigned lane is generated |
| reserve | External | Reserve inventory | subflow | ORDER-CANDIDATE | RESERVATION-RESULT |  | PROC-SAMPLE-INVENTORY-RESERVE |  | Placeholder child business flow |
| save | System | Save order | process | RESERVATION-RESULT | OUT-ORDER-RESULT |  |  |  | Persist accepted order |
| success | Screen | Show completion | end | OUT-ORDER-RESULT |  |  |  | SCR-ORDER-COMPLETE | Valid path |
| invalid | Screen | Show validation messages | end | VALIDATION-RESULT | OUT-ORDER-RESULT |  |  | SCR-ORDER-ENTRY | Invalid path |

## Flows

| from | to | condition | label | notes |
|---|---|---|---|---|
| start | capture |  | submit | User action |
| capture | validate |  | validate |  |
| validate | audit |  | record | Always record validation attempt |
| validate | reserve | valid | OK | Valid order path |
| reserve | save | reserved | reserve OK | External reservation succeeded |
| save | success |  | complete |  |
| validate | invalid | invalid | NG | Invalid order path |

## Transitions

| id | event | to | condition | notes |
|---|---|---|---|---|
| TRN-ORDER-COMPLETE | success | [[../screen/SCR-ORDER-COMPLETE]] | valid | Show completion screen |
| TRN-ORDER-INVALID | validation_error | [[../screen/SCR-ORDER-ENTRY]] | invalid | Return to entry screen |

## Errors

- If the order is invalid, return validation messages to the order entry screen.
- If inventory reservation fails, keep the order unsaved and show a retryable error.
- If saving fails, rollback any local transaction and show a system error.

## Notes

- The `audit` step intentionally has a blank lane to demonstrate that no automatic Unassigned lane is generated.
- The sample uses placeholder data, rule, screen, and process IDs so it can be copied into a real vault and connected later.
