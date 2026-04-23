---
type: class
id: CLS-ORDER-DOMAIN-SERVICE
name: OrderDomainService
kind: class
package: app.order.domain
tags:
  - sample
  - v03
  - rich
  - class
---

## Summary

Reference domain service sample.

## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| validator | OrderValidator | private | false | Domain validation helper |

## Methods

| name | parameters | returns | visibility | static | notes |
|---|---|---|---|---|---|
| createOrder | customerId: string, items: OrderItem[] | Order | public | false | Builds aggregate |
| validate | order: Order | void | public | false | Validates state |

## Relations

| id | from | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|---|
| REL-DOMAIN-CREATES-ORDER | [[CLS-ORDER-DOMAIN-SERVICE]] | [[CLS-ORDER]] | dependency | creates | 1 | * | Builds order aggregate |

## Notes

- Rich sample for class single-view related graph.

