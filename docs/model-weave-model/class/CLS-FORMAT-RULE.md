---
type: class
id: CLS-FORMAT-RULE
name: Rule Format
kind: class
package: model-weave.format
tags:
  - ModelWeave
  - Format
  - Class
---

# Rule Format

## Summary
ビジネスルールや判定条件を定義するためのフォーマットです。

## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| references | list | public | N | ルールが参照するリソース |
| conditions | list | public | N | ルールの適用条件 |

## Relations

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
| REL-RULE-IS-RULE-FORMAT | CLS-MODEL-WEAVE-RULE-FORMAT | inheritance | | | | |