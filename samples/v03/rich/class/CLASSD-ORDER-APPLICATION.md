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
| [[samples/v03/rich/class/CLS-ORDER-APPLICATION-SERVICE]] | Application service |
| [[samples/v03/rich/class/CLS-ORDER-DOMAIN-SERVICE]] | Domain service |
| [[samples/v03/rich/class/IF-ORDER-REPOSITORY]] | Repository interface |
| [[samples/v03/rich/class/ABS-BASE-SERVICE]] | Shared base class |
| [[samples/v03/rich/class/CLS-ORDER]] | Aggregate root |
| [[samples/v03/rich/class/CLS-ORDER-ITEM]] | Aggregate child |

## Relations

| id | from | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|---|

## Notes

- This sample intentionally uses empty diagram relations so fallback auto-collect can be verified.
