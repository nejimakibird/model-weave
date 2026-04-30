---
type: class_diagram
id: CLASSD-MODEL-WEAVE-RENDERING
name: Model Weave Rendering Structure
tags:
  - ModelWeave
  - Class
  - Diagram
---

# Model Weave Rendering Structure

## Summary
A diagram showing the relationship between model data and renderers in Model Weave.

## Objects

| ref | notes |
|---|---|
| [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-FORMAT.md\|Model Weave Format]] | data definition to be rendered |
| [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-DIAGRAM-FORMAT.md\|Model Weave Diagram Format]] | diagram-related format |
| [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-RENDERER.md\|Model Weave Renderer]] | rendering engine (Mermaid/Custom) |
| [[docs/model-weave-model-en/class/CLS-FORMAT-CLASS-DIAGRAM.md\|Class Diagram Format]] | |
| [[docs/model-weave-model-en/class/CLS-FORMAT-ER-DIAGRAM.md\|ER Diagram Format]] | |
| [[docs/model-weave-model-en/class/CLS-FORMAT-DFD-DIAGRAM.md\|DFD Diagram Format]] | |

## Relations

| id | from | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|---|
| REL-RND-RENDERER-INPUT | [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-RENDERER.md\|Model Weave Renderer]] | [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-FORMAT.md\|Model Weave Format]] | dependency | takes input | 1 | 1 | |
| REL-RND-DIAGRAM-DRAWN | [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-DIAGRAM-FORMAT.md\|Model Weave Diagram Format]] | [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-RENDERER.md\|Model Weave Renderer]] | dependency | drawn by | 1 | 1 | |
| REL-RND-CLD-IS-DIAGRAM | [[docs/model-weave-model-en/class/CLS-FORMAT-CLASS-DIAGRAM.md\|Class Diagram Format]] | [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-DIAGRAM-FORMAT.md\|Model Weave Diagram Format]] | inheritance | | | | |
| REL-RND-ERD-IS-DIAGRAM | [[docs/model-weave-model-en/class/CLS-FORMAT-ER-DIAGRAM.md\|ER Diagram Format]] | [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-DIAGRAM-FORMAT.md\|Model Weave Diagram Format]] | inheritance | | | | |
| REL-RND-DFD-IS-DIAGRAM | [[docs/model-weave-model-en/class/CLS-FORMAT-DFD-DIAGRAM.md\|DFD Diagram Format]] | [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-DIAGRAM-FORMAT.md\|Model Weave Diagram Format]] | inheritance | | | | |

## Notes
- Under the V0.7 policy, diagram-related formats mainly depend on the Mermaid renderer.
- Custom renderers are used for detailed views.
- It is not a complete reverse engineering of the implementation classes.
- Use Mermaid view for large diagrams and Custom view for detailed inspection.