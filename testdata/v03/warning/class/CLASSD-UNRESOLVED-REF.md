---
type: class_diagram
id: CLASSD-UNRESOLVED-REF
name: Unresolved Class Diagram References
tags:
  - testdata
  - warning
  - class
---

## Summary

Test-only class diagram sample for unresolved object and relation endpoint warnings.

## Objects

| ref | notes |
|---|---|
| [[CLS-ORDER-SERVICE]] | Valid object |
| [[CLS-NOT-FOUND]] | Unresolved object |

## Relations

| id | from | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|---|
| REL-UNRESOLVED-ENDPOINT | [[CLS-ORDER-SERVICE]] | [[CLS-NOT-FOUND]] | dependency | uses | 1 | 1 | Should trigger unresolved endpoint warning |

## Notes

- Test purpose only. This file is expected to raise unresolved object warnings.

