---
type: class
id: CLS-MODEL-WEAVE-DIAGRAM-FORMAT
name: Model Weave Diagram Format
kind: class
package: model-weave
tags:
  - ModelWeave
  - Class
---

# Model Weave Diagram Format

## Summary
A format category intended for diagram rendering, such as class_diagram and dfd_diagram.

## Attributes

## Methods

## Relations

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
| REL-DIAGRAM-IS-FORMAT | CLS-MODEL-WEAVE-FORMAT | inheritance | | | | format specialization |
| REL-DIAGRAM-DEPENDS-RENDERER | CLS-MODEL-WEAVE-RENDERER | dependency | drawn by | 1 | 1 | Diagrams are rendered by a renderer |

## Notes
Assumption: Under the V0.7 policy, diagrams mainly use Mermaid as the renderer.