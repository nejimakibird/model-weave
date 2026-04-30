---
type: class
id: CLS-MODEL-WEAVE-TABLE-SECTION
name: Model Weave Table Section
kind: class
package: model-weave
tags:
  - ModelWeave
  - Class
---

# Model Weave Table Section

## Summary
Markdownテーブルによってモデルの属性や関係を定義するセクションです。

## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| headers | list | public | N | テーブルの列名リスト |
| rows | list | public | N | テーブルの行データ（オブジェクト配列） |

## Methods

## Relations

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
| REL-TABLE-IS-SECTION | CLS-MODEL-WEAVE-SECTION | inheritance | | | | セクションの特殊化 |

## Notes
Model Weaveのパース処理の主要対象です。