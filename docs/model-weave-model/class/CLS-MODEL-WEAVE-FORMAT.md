---
type: class
id: CLS-MODEL-WEAVE-FORMAT
name: Model Weave Format
kind: class
package: model-weave
tags:
  - ModelWeave
  - Class
---

# Model Weave Format

## Summary
Model Weaveがサポートする各モデル形式（class, er_diagramなど）の定義を司る抽象概念です。

## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| type | string | public | N | フォーマット識別子（例: class） |
| id | string | public | N | フォーマットの一意識別子 |
| name | string | public | N | 表示名 |
| requiredFrontmatter | list | public | N | 必須となるフロントマター項目 |
| category | string | public | N | stable / experimental |
| rendererRole | string | public | N | 推奨されるレンダラーの種類 |

## Methods

## Relations

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
| REL-FORMAT-DEFINES-FILE | CLS-MODEL-WEAVE-MODEL-FILE | association | defines structure | 1 | 1 | フォーマットはモデルファイルの構造を定義する |

## Notes
推測: 実装上は各フォーマットごとのSchema定義クラスに相当します。