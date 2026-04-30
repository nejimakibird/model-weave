---
type: class
id: CLS-MODEL-WEAVE-SECTION
name: Model Weave Section
kind: class
package: model-weave
tags:
  - ModelWeave
  - Class
---

# Model Weave Section

## Summary
Markdownのヘッダー（# や ##）で区切られた本文の構成要素です。

## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| title | string | public | N | セクション名（Summary, Objectsなど） |
| level | number | public | N | ヘッダーレベル |
| type | string | public | N | セクションの種類（text, table, etc.） |

## Methods

## Relations

## Notes
Summaryは通常テキストセクション、ObjectsやFlowsはテーブルセクションとして扱われます。