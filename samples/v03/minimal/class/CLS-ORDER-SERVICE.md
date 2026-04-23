---
type: class
id: CLS-ORDER-SERVICE
name: OrderService
kind: class
package: app.order
tags:
  - sample
  - v03
  - minimal
  - class
---

## Summary

Minimal class sample for single-object preview and relation parsing.

## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| repository | IOrderRepository | private | false | Repository dependency |

## Methods

| name | parameters | returns | visibility | static | notes |
|---|---|---|---|---|---|
| createOrder | customerId: string | Order | public | false | Creates a new order |

## Relations

| id | from | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|---|
| REL-ORDER-SERVICE-USES-REPOSITORY | [[CLS-ORDER-SERVICE]] | [[IF-ORDER-REPOSITORY]] | dependency | uses | 1 | 1 | Service depends on repository |

## Notes

- Minimal sample for class relation parsing and Related Objects.

