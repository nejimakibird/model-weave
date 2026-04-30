---
type: class
id: CLS-FORMAT-CLASS-DIAGRAM
name: Class Diagram Format
kind: class
package: model-weave.format
tags:
  - ModelWeave
  - Format
  - Class
---

# Class Diagram Format

## Summary
複数のクラス間の静的な関係を可視化するためのフォーマットです。

## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| objects | list | public | N | 配置されるオブジェクト(クラス)のリスト |
| relations | list | public | N | オブジェクト間の関係の定義リスト |

## Relations

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
| REL-CLASS-DIAGRAM-IS-DIAGRAM | CLS-MODEL-WEAVE-DIAGRAM-FORMAT | inheritance | | | | |
| REL-CLASS-DIAGRAM-INCLUDES-CLASS | CLS-FORMAT-CLASS | aggregation | includes | 1 | 0..* | |