---
type: class
id: CLS-FORMAT-DFD-DIAGRAM
name: DFD Diagram Format
kind: class
package: model-weave.format
tags:
  - ModelWeave
  - Format
  - Class
---

# DFD Diagram Format

## Summary
A format for defining a Data Flow Diagram (DFD) and rendering it with Mermaid or similar renderers.

## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| objects | list | public | N | list of elements in the diagram |
| flows | list | public | N | list of data flows |

## Relations

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
| REL-DFD-DIAGRAM-IS-DIAGRAM | CLS-MODEL-WEAVE-DIAGRAM-FORMAT | inheritance | | | | |
| REL-DFD-DIAGRAM-INCLUDES-OBJECT | CLS-FORMAT-DFD-OBJECT | aggregation | includes | 1 | 0..* | |