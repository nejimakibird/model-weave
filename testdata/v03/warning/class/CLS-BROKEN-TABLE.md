---
type: class
id: CLS-BROKEN-TABLE
name: BrokenTableSample
kind: class
package: test.warning
tags:
  - testdata
  - warning
  - class
---

## Summary

Test-only sample with malformed Markdown tables.

## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| repository | IOrderRepository | private |

## Methods

| name | parameters | returns | visibility | static | notes |
|---|---|---|---|---|---|
| execute | input: string | string | public | false |

## Relations

| id | from | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|---|
| REL-BROKEN | [[CLS-BROKEN-TABLE]] | [[CLS-MISSING]] | dependency |

## Notes

- Test purpose only. This file is expected to raise malformed table warnings.

