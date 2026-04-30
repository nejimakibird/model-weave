---
type: class
id: CLS-FORMAT-RULE
name: Rule Format
kind: class
package: model-weave.format
tags:
  - ModelWeave
  - Format
  - Class
---

# Rule Format

## Summary
A format for defining business rules and decision conditions.

## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| references | list | public | N | resources referenced by the rule |
| conditions | list | public | N | rule application conditions |

## Relations

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
| REL-RULE-IS-RULE-FORMAT | CLS-MODEL-WEAVE-RULE-FORMAT | inheritance | | | | |