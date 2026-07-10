---
type: domains
id: DOMAINS-SAMPLE-CHECKOUT-FLOW
name: Sample Checkout Flow Domains
tags:
  - Sample
  - Domains
  - FlowDiagram
---

# Sample Checkout Flow Domains

## Summary

Flow Diagram の Domain Sources、Domain group、parent-child Domain group、Color Scheme 適用を確認するためのサンプルDomain定義です。

## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| checkout_system | Checkout System | system | | Overall checkout flow boundary |
| actor_area | Actor Area | actor | checkout_system | Customer and external actor side |
| internal_area | Internal Area | application | checkout_system | Internal application and data boundary |
| frontend_area | Frontend Area | ui | internal_area | Browser and screen side |
| application_area | Application Area | application | internal_area | Application process and API handling |
| data_area | Data Area | data | internal_area | Session, database, and persisted data |
| integration_area | Integration Area | integration | checkout_system | External integration boundary |
| external_area | External Area | external | integration_area | External service boundary |
