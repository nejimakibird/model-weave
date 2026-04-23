---
type: er_diagram
id: ERD-OUTSIDE-SCOPE
name: Outside Scope ER Note Check
tags:
  - testdata
  - warning
  - er
---

## Summary

Test-only diagram for outside-scope relation note behavior.

## Objects

| ref | notes |
|---|---|
| [[ENT-CUSTOMER]] | Included |
| [[ENT-ORDER]] | Included |

## Notes

- Test purpose only. Relations from included entities to objects outside this diagram should be treated as out-of-scope notes, not diagram edges.

