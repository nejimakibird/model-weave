---
type: class
id: CLS-FORMAT-CLASS-DIAGRAM
name: Class Diagram Format
kind: class
package: model-weave.format
tags:
  - ModelWeave
  - Format
  - Class
---

# Class Diagram Format

## Summary
A format for visualizing static relationships among multiple classes.

## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| objects | list | public | N | list of placed objects (classes) |
| relations | list | public | N | list of relationship definitions between objects |

## Relations

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
| REL-CLASS-DIAGRAM-IS-DIAGRAM | CLS-MODEL-WEAVE-DIAGRAM-FORMAT | inheritance | | | | |
| REL-CLASS-DIAGRAM-INCLUDES-CLASS | CLS-FORMAT-CLASS | aggregation | includes | 1 | 0..* | |