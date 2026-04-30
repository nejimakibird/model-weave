---
type: class
id: CLS-FORMAT-ER-DIAGRAM
name: ER Diagram Format
kind: class
package: model-weave.format
tags:
  - ModelWeave
  - Format
  - Class
---

# ER Diagram Format

## Summary
エンティティ間のリレーションシップを可視化するためのフォーマットです。

## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| entities | list | public | N | 配置されるエンティティのリスト |
| relations | list | public | N | エンティティ間の関係のリスト |

## Relations

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
| REL-ER-DIAGRAM-IS-DIAGRAM | CLS-MODEL-WEAVE-DIAGRAM-FORMAT | inheritance | | | | |
| REL-ER-DIAGRAM-INCLUDES-ENTITY | CLS-FORMAT-ER-ENTITY | aggregation | includes | 1 | 0..* | |