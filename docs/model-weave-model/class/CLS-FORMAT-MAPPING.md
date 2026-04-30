---
type: class
id: CLS-FORMAT-MAPPING
name: Mapping Format
kind: class
package: model-weave.format
tags:
  - ModelWeave
  - Format
  - Class
---

# Mapping Format

## Summary
異なるモデル（データオブジェクト間など）の対応関係を定義するためのフォーマットです。

## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| mappings | list | public | N | 対応関係のリスト |

## Relations

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
| REL-MAPPING-IS-RULE-FORMAT | CLS-MODEL-WEAVE-RULE-FORMAT | inheritance | | | | |