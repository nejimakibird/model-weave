---
type: class
id: CLS-ORDER
name: Order
kind: class
package: app.order.domain.model
tags:
  - sample
  - v03
  - rich
  - class
---

## Summary

Reference aggregate root sample.

## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| id | string | private | false | Aggregate identifier |
| customerId | string | private | false | Customer reference |
| items | OrderItem[] | private | false | Ordered items |

## Methods

| name | parameters | returns | visibility | static | notes |
|---|---|---|---|---|---|
| addItem | item: OrderItem | void | public | false | Adds line item |
| cancel |  | void | public | false | Cancels order |

## Relations

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
| REL-ORDER-HAS-ITEM | CLS-ORDER-ITEM | composition | has | 1 | * | Aggregate owns order items |

## Notes

- Rich sample for composition rendering.
