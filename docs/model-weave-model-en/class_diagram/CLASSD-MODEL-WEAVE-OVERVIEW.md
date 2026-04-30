---
type: class_diagram
id: CLASSD-MODEL-WEAVE-OVERVIEW
name: Model Weave Conceptual Overview
tags:
  - ModelWeave
  - Class
  - Diagram
---

# Model Weave Conceptual Overview

## Summary
An overview diagram of the overall conceptual structure of the Model Weave plugin. It shows relationships among format definitions, physical file structure, and renderers.

## Objects

| ref | notes |
|---|---|
| [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-FORMAT.md\|Model Weave Format]] | abstract concept of a format |
| [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-MODEL-FILE.md\|Model Weave Model File]] | Markdown model file structure |
| [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-FRONTMATTER.md\|Model Weave Frontmatter]] | metadata section |
| [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-SECTION.md\|Model Weave Section]] | body section |
| [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-TABLE-SECTION.md\|Model Weave Table Section]] | table-based section |
| [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-DIAGRAM-FORMAT.md\|Model Weave Diagram Format]] | abstract category for diagram formats |
| [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-DATA-FORMAT.md\|Model Weave Data Format]] | abstract category for data-definition formats |
| [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-RULE-FORMAT.md\|Model Weave Rule Format]] | abstract category for rule-definition formats |
| [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-RENDERER.md\|Model Weave Renderer]] | display and rendering engine |

## Relations

| id | from | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|---|
| REL-OV-FORMAT-DEFINES-FILE | [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-FORMAT.md\|Model Weave Format]] | [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-MODEL-FILE.md\|Model Weave Model File]] | association | defines | 1 | 1 | |
| REL-OV-FILE-HAS-FM | [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-MODEL-FILE.md\|Model Weave Model File]] | [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-FRONTMATTER.md\|Model Weave Frontmatter]] | composition | contains | 1 | 1 | |
| REL-OV-FILE-HAS-SEC | [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-MODEL-FILE.md\|Model Weave Model File]] | [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-SECTION.md\|Model Weave Section]] | composition | contains | 1 | 0..* | |
| REL-OV-TABLE-IS-SECTION | [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-TABLE-SECTION.md\|Model Weave Table Section]] | [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-SECTION.md\|Model Weave Section]] | inheritance | | | | |
| REL-OV-DIAGRAM-IS-FORMAT | [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-DIAGRAM-FORMAT.md\|Model Weave Diagram Format]] | [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-FORMAT.md\|Model Weave Format]] | inheritance | | | | |
| REL-OV-DATA-IS-FORMAT | [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-DATA-FORMAT.md\|Model Weave Data Format]] | [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-FORMAT.md\|Model Weave Format]] | inheritance | | | | |
| REL-OV-RULE-IS-FORMAT | [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-RULE-FORMAT.md\|Model Weave Rule Format]] | [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-FORMAT.md\|Model Weave Format]] | inheritance | | | | |
| REL-OV-RENDERER-INPUT | [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-RENDERER.md\|Model Weave Renderer]] | [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-FORMAT.md\|Model Weave Format]] | dependency | takes input | 1 | 1 | |

## Notes
- This diagram is a conceptual model for reviewing the Model Weave specification concepts.
- It is not a complete reverse engineering of the implementation classes.
- Use Mermaid view for large diagrams and Custom view for detailed inspection.