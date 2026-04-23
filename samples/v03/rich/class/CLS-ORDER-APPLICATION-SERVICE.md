---
type: class
id: CLS-ORDER-APPLICATION-SERVICE
name: OrderApplicationService
kind: class
package: app.order.application
tags:
  - sample
  - v03
  - rich
  - class
---

## Summary

Reference class sample for service-oriented relations and dependency visualization.

## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| orderService | OrderDomainService | private | false | Domain service dependency |
| repository | IOrderRepository | private | false | Persistence dependency |

## Methods

| name | parameters | returns | visibility | static | notes |
|---|---|---|---|---|---|
| placeOrder | command: PlaceOrderCommand | Order | public | false | Main entry point |
| cancelOrder | orderId: string | void | public | false | Cancellation flow |

## Relations

| id | from | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|---|
| REL-APP-USES-DOMAIN-SERVICE | [[CLS-ORDER-APPLICATION-SERVICE]] | [[CLS-ORDER-DOMAIN-SERVICE]] | dependency | uses | 1 | 1 | Uses domain service |
| REL-APP-USES-REPOSITORY | [[CLS-ORDER-APPLICATION-SERVICE]] | [[IF-ORDER-REPOSITORY]] | dependency | uses | 1 | 1 | Uses repository |
| REL-APP-EXTENDS-BASE | [[CLS-ORDER-APPLICATION-SERVICE]] | [[ABS-BASE-SERVICE]] | inheritance | extends | 1 | 1 | Extends base service |

## Notes

- Rich sample for dependency and inheritance rendering.

