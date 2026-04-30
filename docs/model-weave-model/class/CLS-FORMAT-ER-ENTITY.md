---
type: class
id: CLS-FORMAT-ER-ENTITY
name: ER Entity Format
kind: class
package: model-weave.format
tags:
  - ModelWeave
  - Format
  - Class
---

# ER Entity Format

## Summary
ER図における実体(エンティティ)とその属性を定義するためのフォーマットです。

## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| attributes | list | public | N | エンティティ属性のリスト |

## Relations

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
| REL-ER-ENTITY-IS-DATA | CLS-MODEL-WEAVE-DATA-FORMAT | inheritance | | | | |