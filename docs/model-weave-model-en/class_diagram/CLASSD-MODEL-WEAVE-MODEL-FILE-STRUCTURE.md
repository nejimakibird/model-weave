---
type: class_diagram
id: CLASSD-MODEL-WEAVE-MODEL-FILE-STRUCTURE
name: Model Weave Model File Structure
tags:
  - ModelWeave
  - Class
  - Diagram
---

# Model Weave Model File Structure

## Summary
A structure diagram showing the components of a single Markdown model file: Frontmatter, Section, and Table.

## Objects

| ref | notes |
|---|---|
| [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-MODEL-FILE.md\|Model Weave Model File]] | entire Markdown file |
| [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-FRONTMATTER.md\|Model Weave Frontmatter]] | YAML metadata |
| [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-SECTION.md\|Model Weave Section]] | body section separated by headings |
| [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-TABLE-SECTION.md\|Model Weave Table Section]] | section containing a Markdown table |

## Relations

| id | from | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|---|
| REL-STR-FILE-HAS-FM | [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-MODEL-FILE.md\|Model Weave Model File]] | [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-FRONTMATTER.md\|Model Weave Frontmatter]] | composition | contains | 1 | 1 | |
| REL-STR-FILE-HAS-SEC | [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-MODEL-FILE.md\|Model Weave Model File]] | [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-SECTION.md\|Model Weave Section]] | composition | contains | 1 | 0..* | |
| REL-STR-TABLE-IS-SECTION | [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-TABLE-SECTION.md\|Model Weave Table Section]] | [[docs/model-weave-model-en/class/CLS-MODEL-WEAVE-SECTION.md\|Model Weave Section]] | inheritance | | | | |

## Notes
- This diagram is a conceptual model for reviewing the physical and logical structure of Model Weave.