---
type: class_diagram
id: CLASSD-ORDER-APPLICATION
name: Order Application Diagram
tags:
  - sample
  - v03
  - rich
  - class
---

## Summary

Rich class diagram sample for fallback auto-collect, dependency, inheritance, and composition checks.

## Objects

| ref | notes |
|---|---|
| [[CLS-ORDER-APPLICATION-SERVICE]] | Application service |
| [[CLS-ORDER-DOMAIN-SERVICE]] | Domain service |
| [[IF-ORDER-REPOSITORY]] | Repository interface |
| [[ABS-BASE-SERVICE]] | Shared base class |
| [[CLS-ORDER]] | Aggregate root |
| [[CLS-ORDER-ITEM]] | Aggregate child |

## Relations

| id | from | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|---|

## Notes

- This sample intentionally uses empty diagram relations so fallback auto-collect can be verified.

