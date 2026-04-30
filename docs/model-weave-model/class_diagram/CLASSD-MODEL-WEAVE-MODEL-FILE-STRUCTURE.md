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
1 つの Markdown モデルファイルの構成要素（Frontmatter, Section, Table）を示す構造図です。

## Objects

| ref | notes |
|---|---|
| [[docs/model-weave-model/class/CLS-MODEL-WEAVE-MODEL-FILE.md\|Model Weave Model File]] | Markdownファイル全体 |
| [[docs/model-weave-model/class/CLS-MODEL-WEAVE-FRONTMATTER.md\|Model Weave Frontmatter]] | YAMLメタデータ |
| [[docs/model-weave-model/class/CLS-MODEL-WEAVE-SECTION.md\|Model Weave Section]] | ヘッダー区切りの本文セクション |
| [[docs/model-weave-model/class/CLS-MODEL-WEAVE-TABLE-SECTION.md\|Model Weave Table Section]] | Markdownテーブルを含むセクション |

## Relations

| id | from | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|---|
| REL-STR-FILE-HAS-FM | [[docs/model-weave-model/class/CLS-MODEL-WEAVE-MODEL-FILE.md\|Model Weave Model File]] | [[docs/model-weave-model/class/CLS-MODEL-WEAVE-FRONTMATTER.md\|Model Weave Frontmatter]] | composition | contains | 1 | 1 | |
| REL-STR-FILE-HAS-SEC | [[docs/model-weave-model/class/CLS-MODEL-WEAVE-MODEL-FILE.md\|Model Weave Model File]] | [[docs/model-weave-model/class/CLS-MODEL-WEAVE-SECTION.md\|Model Weave Section]] | composition | contains | 1 | 0..* | |
| REL-STR-TABLE-IS-SECTION | [[docs/model-weave-model/class/CLS-MODEL-WEAVE-TABLE-SECTION.md\|Model Weave Table Section]] | [[docs/model-weave-model/class/CLS-MODEL-WEAVE-SECTION.md\|Model Weave Section]] | inheritance | | | | |

## Notes
- この図は Model Weave の物理・論理構成を俯瞰するための概念モデルである。