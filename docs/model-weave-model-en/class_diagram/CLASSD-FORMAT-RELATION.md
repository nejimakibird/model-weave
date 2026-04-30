---
type: class_diagram
id: CLASSD-FORMAT-RELATION
name: Model Weave Format Relations
tags:
  - ModelWeave
  - Diagram
  - Core
---

# Model Weave Format Relations

A class diagram that gives an overview of the relationships among the main Model Weave model formats.

## Summary

This diagram shows how the Markdown-based modeling formats provided by Model Weave relate to each other. Each format has a specific purpose and can reference, or be referenced by, other formats to build a larger model.

## Objects

| ref | notes |
|---|---|
| [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-FORMAT.md\|Model Weave Format]] | abstract concept of a format |
| [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-MODEL-FILE.md\|Model Weave Model File]] | Markdown model file structure |
| [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-FRONTMATTER.md\|Model Weave Frontmatter]] | metadata section |
| [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-SECTION.md\|Model Weave Section]] | body section |
| [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-TABLE-SECTION.md\|Model Weave Table Section]] | table-based section |
| [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-DIAGRAM-FORMAT.md\|Model Weave Diagram Format]] | diagram-format specialization |
| [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-DATA-FORMAT.md\|Model Weave Data Format]] | data-definition format specialization |
| [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-RULE-FORMAT.md\|Model Weave Rule Format]] | rule-definition format specialization |
| [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-RENDERER.md\|Model Weave Renderer]] | display and rendering engine |
| DATA-FORMAT-CATALOG | catalog of formats supported by Model Weave |
| [[docs/model-weave-model-en/class/CLS-FORMAT-CLASS.md\|CLS-FORMAT-CLASS]] | Class format |
| [[docs/model-weave-model-en/class/CLS-FORMAT-CLASS-DIAGRAM.md\|CLS-FORMAT-CLASS-DIAGRAM]] | Class Diagram format |
| [[docs/model-weave-model-en/class/CLS-FORMAT-ER-ENTITY.md\|CLS-FORMAT-ER-ENTITY]] | ER Entity format |
| [[docs/model-weave-model-en/class/CLS-FORMAT-ER-DIAGRAM.md\|CLS-FORMAT-ER-DIAGRAM]] | ER Diagram format |
| [[docs/model-weave-model-en/class/CLS-FORMAT-DFD-OBJECT.md\|CLS-FORMAT-DFD-OBJECT]] | DFD Object format |
| [[docs/model-weave-model-en/class/CLS-FORMAT-DFD-DIAGRAM.md\|CLS-FORMAT-DFD-DIAGRAM]] | DFD Diagram format |
| [[docs/model-weave-model-en/class/CLS-FORMAT-DATA-OBJECT.md\|CLS-FORMAT-DATA-OBJECT]] | Data Object format |
| [[docs/model-weave-model-en/class/CLS-FORMAT-SCREEN.md\|CLS-FORMAT-SCREEN]] | Screen format |
| [[docs/model-weave-model-en/class/CLS-FORMAT-APP-PROCESS.md\|CLS-FORMAT-APP-PROCESS]] | App Process format |
| [[docs/model-weave-model-en/class/CLS-FORMAT-RULE.md\|CLS-FORMAT-RULE]] | Rule format |
| [[docs/model-weave-model-en/class/CLS-FORMAT-MAPPING.md\|CLS-FORMAT-MAPPING]] | Mapping format |
| [[docs/model-weave-model-en/class/CLS-FORMAT-CODESET.md\|CLS-FORMAT-CODESET]] | Codeset format |
| [[docs/model-weave-model-en/class/CLS-FORMAT-MESSAGE.md\|CLS-FORMAT-MESSAGE]] | Message format |

## Relations

| id | from | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|---|
| REL-CATALOG-LISTS-FORMAT | DATA-FORMAT-CATALOG | CLS-MODEL-WEAVE-FORMAT | association | catalogs | 1 | 0..* | |
| REL-FORMAT-SPEC-FILE | CLS-MODEL-WEAVE-FORMAT | CLS-MODEL-WEAVE-MODEL-FILE | association | defines | 1 | 1 | |
| REL-CLASS-SPEC | CLS-FORMAT-CLASS | CLS-MODEL-WEAVE-FORMAT | inheritance | | | | |
| REL-CLASS-DIAGRAM-SPEC | CLS-FORMAT-CLASS-DIAGRAM | CLS-MODEL-WEAVE-DIAGRAM-FORMAT | inheritance | | | | |
| REL-ER-ENTITY-SPEC | CLS-FORMAT-ER-ENTITY | CLS-MODEL-WEAVE-DATA-FORMAT | inheritance | | | | |
| REL-ER-DIAGRAM-SPEC | CLS-FORMAT-ER-DIAGRAM | CLS-MODEL-WEAVE-DIAGRAM-FORMAT | inheritance | | | | |
| REL-DFD-OBJECT-SPEC | CLS-FORMAT-DFD-OBJECT | CLS-MODEL-WEAVE-FORMAT | inheritance | | | | |
| REL-DFD-DIAGRAM-SPEC | CLS-FORMAT-DFD-DIAGRAM | CLS-MODEL-WEAVE-DIAGRAM-FORMAT | inheritance | | | | |
| REL-DATA-OBJECT-SPEC | CLS-FORMAT-DATA-OBJECT | CLS-MODEL-WEAVE-DATA-FORMAT | inheritance | | | | |
| REL-SCREEN-SPEC | CLS-FORMAT-SCREEN | CLS-MODEL-WEAVE-FORMAT | inheritance | | | | |
| REL-APP-PROCESS-SPEC | CLS-FORMAT-APP-PROCESS | CLS-MODEL-WEAVE-FORMAT | inheritance | | | | |
| REL-RULE-SPEC | CLS-FORMAT-RULE | CLS-MODEL-WEAVE-RULE-FORMAT | inheritance | | | | |
| REL-MAPPING-SPEC | CLS-FORMAT-MAPPING | CLS-MODEL-WEAVE-RULE-FORMAT | inheritance | | | | |
| REL-CODESET-SPEC | CLS-FORMAT-CODESET | CLS-MODEL-WEAVE-DATA-FORMAT | inheritance | | | | |
| REL-MESSAGE-SPEC | CLS-FORMAT-MESSAGE | CLS-MODEL-WEAVE-DATA-FORMAT | inheritance | | | | |
| REL-FILE-HAS-FM | CLS-MODEL-WEAVE-MODEL-FILE | CLS-MODEL-WEAVE-FRONTMATTER | composition | contains | 1 | 1 | |
| REL-FILE-HAS-SEC | CLS-MODEL-WEAVE-MODEL-FILE | CLS-MODEL-WEAVE-SECTION | composition | contains | 1 | 0..* | |
| REL-TABLE-IS-SECTION | CLS-MODEL-WEAVE-TABLE-SECTION | CLS-MODEL-WEAVE-SECTION | inheritance | | | | |
| REL-DIAGRAM-IS-FORMAT | CLS-MODEL-WEAVE-DIAGRAM-FORMAT | CLS-MODEL-WEAVE-FORMAT | inheritance | | | | |
| REL-DATA-IS-FORMAT | CLS-MODEL-WEAVE-DATA-FORMAT | CLS-MODEL-WEAVE-FORMAT | inheritance | | | | |
| REL-RULE-IS-FORMAT | CLS-MODEL-WEAVE-RULE-FORMAT | CLS-MODEL-WEAVE-FORMAT | inheritance | | | | |
| REL-RENDERER-INPUT | CLS-MODEL-WEAVE-RENDERER | CLS-MODEL-WEAVE-FORMAT | dependency | takes input | 1 | 1 | |
| REL-DIAGRAM-DRAWN | CLS-MODEL-WEAVE-DIAGRAM-FORMAT | CLS-MODEL-WEAVE-RENDERER | dependency | drawn by | 1 | 1 | |
| REL-DATA-USES-TABLE | CLS-MODEL-WEAVE-DATA-FORMAT | CLS-MODEL-WEAVE-TABLE-SECTION | association | contains | 1 | 1..* | |
| REL-RULE-USES-SEC | CLS-MODEL-WEAVE-RULE-FORMAT | CLS-MODEL-WEAVE-SECTION | association | uses | 1 | 1..* | |

## Notes

- This diagram is an overall validation model showing relationships among all formats and internal concepts.
- It is not a complete reverse engineering of the implementation classes.
- For concrete internal structures and detailed relations of each format, see the individual format definition files.
- Multiplicities are based on common usage patterns.
- For normal review and learning, use the purpose-specific split diagrams under `docs/model-weave-model-en/class_diagram/`.
- Because this diagram has many connections, Mermaid view is recommended for understanding the overall picture, and Custom view is recommended for inspecting specific relationships.
- It can be split into more detailed class diagrams when needed.