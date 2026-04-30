---
type: class
id: CLS-MODEL-WEAVE-DATA-FORMAT
name: Model Weave Data Format
kind: class
package: model-weave
tags:
  - ModelWeave
  - Class
---

# Model Weave Data Format

## Summary
data_objectやer_entityなど、データの構造定義を目的としたフォーマットです。

## Attributes

## Methods

## Relations

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
| REL-DATA-IS-FORMAT | CLS-MODEL-WEAVE-FORMAT | inheritance | | | | フォーマットの特殊化 |
| REL-DATA-HAS-TABLES | CLS-MODEL-WEAVE-TABLE-SECTION | association | contains | 1 | 1..* | データ形式は通常複数のテーブルセクションを持つ |

## Notes
FieldsテーブルやAttributesテーブルが主役となる形式です。