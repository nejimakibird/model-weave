---
type: class
id: CLS-FORMAT-DFD-DIAGRAM
name: DFD Diagram Format
kind: class
package: model-weave.format
tags:
  - ModelWeave
  - Format
  - Class
---

# DFD Diagram Format

## Summary
データフロー図(DFD)を定義し、Mermaid等で描画するためのフォーマットです。

## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| objects | list | public | N | ダイアグラム内の要素リスト |
| flows | list | public | N | データフローのリスト |

## Relations

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
| REL-DFD-DIAGRAM-IS-DIAGRAM | CLS-MODEL-WEAVE-DIAGRAM-FORMAT | inheritance | | | | |
| REL-DFD-DIAGRAM-INCLUDES-OBJECT | CLS-FORMAT-DFD-OBJECT | aggregation | includes | 1 | 0..* | |