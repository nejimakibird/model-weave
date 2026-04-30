---
type: class
id: CLS-MODEL-WEAVE-DIAGRAM-FORMAT
name: Model Weave Diagram Format
kind: class
package: model-weave
tags:
  - ModelWeave
  - Class
---

# Model Weave Diagram Format

## Summary
class_diagramやdfd_diagramなど、図としての描画を目的としたフォーマットです。

## Attributes

## Methods

## Relations

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
| REL-DIAGRAM-IS-FORMAT | CLS-MODEL-WEAVE-FORMAT | inheritance | | | | フォーマットの特殊化 |
| REL-DIAGRAM-DEPENDS-RENDERER | CLS-MODEL-WEAVE-RENDERER | dependency | drawn by | 1 | 1 | ダイアグラムはレンダラーによって描画される |

## Notes
推測: V0.7ポリシーでは、ダイアグラムはMermaidを主要なレンダラーとして使用します。