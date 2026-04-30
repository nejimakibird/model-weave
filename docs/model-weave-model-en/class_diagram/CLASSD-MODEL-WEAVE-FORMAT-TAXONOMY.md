---
type: class_diagram
id: CLASSD-MODEL-WEAVE-FORMAT-TAXONOMY
name: Model Weave Format Taxonomy
tags:
  - ModelWeave
  - Class
  - Diagram
---

# Model Weave Format Taxonomy

## Summary
A taxonomy diagram showing which abstract category (diagram, data, rule) each concrete format belongs to.

## Objects

| ref | notes |
|---|---|
| [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-FORMAT.md\|Model Weave Format]] | top-level abstract concept |
| [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-DIAGRAM-FORMAT.md\|Model Weave Diagram Format]] | diagram-related |
| [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-DATA-FORMAT.md\|Model Weave Data Format]] | data-definition related |
| [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-RULE-FORMAT.md\|Model Weave Rule Format]] | rule and mapping related |
| [[docs/model-weave-model-en/class/CLS-FORMAT-CLASS.md\|Class Format]] | |
| [[docs/model-weave-model-en/class/CLS-FORMAT-CLASS-DIAGRAM.md\|Class Diagram Format]] | |
| [[docs/model-weave-model-en/class/CLS-FORMAT-ER-ENTITY.md\|ER Entity Format]] | |
| [[docs/model-weave-model-en/class/CLS-FORMAT-ER-DIAGRAM.md\|ER Diagram Format]] | |
| [[docs/model-weave-model-en/class/CLS-FORMAT-DFD-OBJECT.md\|DFD Object Format]] | |
| [[docs/model-weave-model-en/class/CLS-FORMAT-DFD-DIAGRAM.md\|DFD Diagram Format]] | |
| [[docs/model-weave-model-en/class/CLS-FORMAT-DATA-OBJECT.md\|Data Object Format]] | |
| [[docs/model-weave-model-en/class/CLS-FORMAT-SCREEN.md\|Screen Format]] | |
| [[docs/model-weave-model-en/class/CLS-FORMAT-APP-PROCESS.md\|App Process Format]] | |
| [[docs/model-weave-model-en/class/CLS-FORMAT-RULE.md\|Rule Format]] | |
| [[docs/model-weave-model-en/class/CLS-FORMAT-MAPPING.md\|Mapping Format]] | |
| [[docs/model-weave-model-en/class/CLS-FORMAT-CODESET.md\|Codeset Format]] | |
| [[docs/model-weave-model-en/class/CLS-FORMAT-MESSAGE.md\|Message Format]] | |

## Relations

| id | from | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|---|
| REL-TAX-CLASS-SPEC | [[docs/model-weave-model-en/class/CLS-FORMAT-CLASS.md\|Class Format]] | [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-FORMAT.md\|Model Weave Format]] | inheritance | | | | |
| REL-TAX-SCREEN-SPEC | [[docs/model-weave-model-en/class/CLS-FORMAT-SCREEN.md\|Screen Format]] | [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-FORMAT.md\|Model Weave Format]] | inheritance | | | | |
| REL-TAX-APP-PROC-SPEC | [[docs/model-weave-model-en/class/CLS-FORMAT-APP-PROCESS.md\|App Process Format]] | [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-FORMAT.md\|Model Weave Format]] | inheritance | | | | |
| REL-TAX-CLD-SPEC | [[docs/model-weave-model-en/class/CLS-FORMAT-CLASS-DIAGRAM.md\|Class Diagram Format]] | [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-DIAGRAM-FORMAT.md\|Model Weave Diagram Format]] | inheritance | | | | |
| REL-TAX-ERD-SPEC | [[docs/model-weave-model-en/class/CLS-FORMAT-ER-DIAGRAM.md\|ER Diagram Format]] | [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-DIAGRAM-FORMAT.md\|Model Weave Diagram Format]] | inheritance | | | | |
| REL-TAX-DFD-SPEC | [[docs/model-weave-model-en/class/CLS-FORMAT-DFD-DIAGRAM.md\|DFD Diagram Format]] | [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-DIAGRAM-FORMAT.md\|Model Weave Diagram Format]] | inheritance | | | | |
| REL-TAX-DO-SPEC | [[docs/model-weave-model-en/class/CLS-FORMAT-DATA-OBJECT.md\|Data Object Format]] | [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-DATA-FORMAT.md\|Model Weave Data Format]] | inheritance | | | | |
| REL-TAX-ERE-SPEC | [[docs/model-weave-model-en/class/CLS-FORMAT-ER-ENTITY.md\|ER Entity Format]] | [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-DATA-FORMAT.md\|Model Weave Data Format]] | inheritance | | | | |
| REL-TAX-DFO-SPEC | [[docs/model-weave-model-en/class/CLS-FORMAT-DFD-OBJECT.md\|DFD Object Format]] | [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-FORMAT.md\|Model Weave Format]] | inheritance | | | | assumption |
| REL-TAX-CS-SPEC | [[docs/model-weave-model-en/class/CLS-FORMAT-CODESET.md\|Codeset Format]] | [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-DATA-FORMAT.md\|Model Weave Data Format]] | inheritance | | | | |
| REL-TAX-MSG-SPEC | [[docs/model-weave-model-en/class/CLS-FORMAT-MESSAGE.md\|Message Format]] | [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-DATA-FORMAT.md\|Model Weave Data Format]] | inheritance | | | | |
| REL-TAX-RULE-SPEC | [[docs/model-weave-model-en/class/CLS-FORMAT-RULE.md\|Rule Format]] | [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-RULE-FORMAT.md\|Model Weave Rule Format]] | inheritance | | | | |
| REL-TAX-MAP-SPEC | [[docs/model-weave-model-en/class/CLS-FORMAT-MAPPING.md\|Mapping Format]] | [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-RULE-FORMAT.md\|Model Weave Rule Format]] | inheritance | | | | |

## Notes
- This diagram is a conceptual model for reviewing the Model Weave specification concepts.
- Use Mermaid view for large diagrams and Custom view for detailed inspection.