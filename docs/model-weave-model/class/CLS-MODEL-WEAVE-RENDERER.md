---
type: class
id: CLS-MODEL-WEAVE-RENDERER
name: Model Weave Renderer
kind: class
package: model-weave
tags:
  - ModelWeave
  - Class
---

# Model Weave Renderer

## Summary
モデルデータを視覚的なプレビューに変換する責務を担います。

## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| name | string | public | N | レンダラー名（custom / mermaid） |
| targetFormat | string | public | N | 対象とするフォーマット |

## Methods

| name | parameters | returns | visibility | static | notes |
|---|---|---|---|---|---|
| render | model: CLS-MODEL-WEAVE-FORMAT | UIElement | public | N | モデルを描画要素に変換する |

## Relations

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
| REL-RENDERER-INPUT | CLS-MODEL-WEAVE-FORMAT | dependency | takes input | 1 | 1 | レンダラーはフォーマット定義を入力とする |

## Notes
推測: V0.7からは `render_mode` によって使用されるレンダラーが切り替わります。