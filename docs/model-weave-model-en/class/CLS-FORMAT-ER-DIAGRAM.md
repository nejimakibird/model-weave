---
type: class
id: CLS-FORMAT-ER-DIAGRAM
name: ER Diagram Format
kind: class
package: model-weave.format
tags:
  - ModelWeave
  - Format
  - Class
---

# ER Diagram Format

## Summary
A format for visualizing relationships between entities.

## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| entities | list | public | N | list of placed entities |
| relations | list | public | N | list of relationships between entities |

## Relations

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
| REL-ER-DIAGRAM-IS-DIAGRAM | CLS-MODEL-WEAVE-DIAGRAM-FORMAT | inheritance | | | | |
| REL-ER-DIAGRAM-INCLUDES-ENTITY | CLS-FORMAT-ER-ENTITY | aggregation | includes | 1 | 0..* | |