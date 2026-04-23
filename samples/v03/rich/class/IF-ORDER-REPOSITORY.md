---
type: class
id: IF-ORDER-REPOSITORY
name: IOrderRepository
kind: interface
package: app.order.port
tags:
  - sample
  - v03
  - rich
  - class
---

## Summary

Reference interface sample used by application services.

## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|

## Methods

| name | parameters | returns | visibility | static | notes |
|---|---|---|---|---|---|
| findById | orderId: string | Order | public | false | Loads aggregate |
| save | order: Order | void | public | false | Persists aggregate |

## Relations

| id | from | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|---|

## Notes

- Rich sample target for dependency edges.

