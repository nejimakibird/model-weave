---
type: class
id: CLS-FORMAT-SCREEN
name: Screen Format
kind: class
package: model-weave.format
tags:
  - ModelWeave
  - Format
  - Class
---

# Screen Format

## Summary
UI画面の構成要素（フィールド、アクション）を定義するためのフォーマットです。

## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| fields | list | public | N | 画面上の項目リスト |
| actions | list | public | N | 画面上の操作リスト |

## Relations

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
| REL-SCREEN-IS-FORMAT | CLS-MODEL-WEAVE-FORMAT | inheritance | | | | |