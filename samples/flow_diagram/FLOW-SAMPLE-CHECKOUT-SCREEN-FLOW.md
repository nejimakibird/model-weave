---
type: flow_diagram
id: FLOW-SAMPLE-CHECKOUT-SCREEN-FLOW
name: Sample Checkout Screen Flow
kind: screen_communication
flow_view: screen
tags:
  - Sample
  - FlowDiagram
  - DomainSources
---

# Sample Checkout Screen Flow

## Summary

Checkout screen submitから、内部処理を折りたたんだScreen Flow projectionを確認するFlow Diagramサンプルです。

このサンプルでは、同じ詳細Objects / Flowsから、user / screen / external / message中心の簡略表示、Domain Sources、parent-child Domain group、投影edge labelを確認します。

## Domain Sources

| ref | notes |
|---|---|
| [[DOMAINS-SAMPLE-CHECKOUT-FLOW]] | Sample Domains for Flow Diagram group rendering |

## Objects

| id | label | kind | ref | domain | notes |
|---|---|---|---|---|---|
| user | Customer | external | | actor_area | User who submits the checkout form |
| checkout_screen | Checkout Screen | screen | | frontend_area | Checkout screen |
| submit_action | Submit Order Action | work_object | | frontend_area | UI action on the checkout screen |
| checkout_process | Checkout Process | app_process | | application_area | Server-side checkout handling |
| session_store | Session Store | session | | data_area | Temporary checkout session |
| order_store | Order Store | datastore | | data_area | Persisted order data |
| payment_gateway | Payment Gateway | external | | external_area | External payment service |
| completion_screen | Completion Screen | screen | | frontend_area | Final screen after successful checkout |
| error_message | Error Message | context | | frontend_area | Validation or payment error display |

## Flows

| id | from | to | kind | trigger | data | condition | notes |
|---|---|---|---|---|---|---|---|
| F01 | user | checkout_screen | event | open | Checkout page request | | User opens checkout screen |
| F02 | checkout_screen | submit_action | event | click submit | Checkout form values | | UI submit action |
| F03 | submit_action | checkout_process | command | submit | DATA-CHECKOUT-SUBMIT-REQUEST | | Submit request from screen to process |
| F04 | checkout_process | session_store | read | load session | Checkout session | | Plain text data label |
| F05 | checkout_process | payment_gateway | call | authorize payment | DATA-PAYMENT-AUTHORIZATION-REQUEST | payment required | External payment authorization |
| F06 | payment_gateway | checkout_process | response | authorization result | DATA-PAYMENT-AUTHORIZATION-RESULT | | Payment result response |
| F07 | checkout_process | order_store | command | save order | DATA-ORDER-CREATE-COMMAND | authorized | Persist order |
| F08 | checkout_process | completion_screen | navigation | show complete | DATA-CHECKOUT-RESULT | success | Navigate to completion screen |
| F09 | checkout_process | error_message | event | show error | Checkout error | failed | Error branch |
