---
type: class
id: CLS-ORDER-ITEM
name: OrderItem
kind: class
package: app.order.domain.model
tags:
  - sample
  - v03
  - rich
  - class
---

## Summary

Reference value object style sample.

## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| productId | string | private | false | Product reference |
| quantity | number | private | false | Ordered quantity |

## Methods

| name | parameters | returns | visibility | static | notes |
|---|---|---|---|---|---|
| changeQuantity | quantity: number | void | public | false | Updates quantity |

## Relations

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|

## Notes

- Rich sample target for composition.
