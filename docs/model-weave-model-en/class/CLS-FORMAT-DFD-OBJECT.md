---
type: class
id: CLS-FORMAT-DFD-OBJECT
name: DFD Object Format
kind: class
package: model-weave.format
tags:
  - ModelWeave
  - Format
  - Class
---

# DFD Object Format

## Summary
A format for defining DFD processes, datastores, and external entities as reusable objects.

## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| kind | string | public | N | process / datastore / external |

## Relations

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
| REL-DFD-OBJECT-IS-FORMAT | CLS-MODEL-WEAVE-FORMAT | inheritance | | | | |