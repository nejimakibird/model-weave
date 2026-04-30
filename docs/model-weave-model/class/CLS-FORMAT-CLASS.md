---
type: class
id: CLS-FORMAT-CLASS
name: Class Format
kind: class
package: model-weave.format
tags:
  - ModelWeave
  - Format
  - Class
---

# Class Format

## Summary
単一のクラス構造（属性、メソッド、関係）を定義するためのフォーマットです。

## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| attributes | list | public | N | クラス属性の定義リスト |
| methods | list | public | N | クラスメソッドの定義リスト |
| relations | list | public | N | このクラスを起点とする関係のリスト |

## Relations

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
| REL-CLASS-IS-FORMAT | CLS-MODEL-WEAVE-FORMAT | inheritance | | | | |