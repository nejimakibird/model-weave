---
type: class_diagram
id: CLASSD-MODEL-WEAVE-RENDERING
name: Model Weave Rendering Structure
tags:
  - ModelWeave
  - Class
  - Diagram
---

# Model Weave Rendering Structure

## Summary
Model Weave におけるモデルデータとレンダラーの関係を示す図です。

## Objects

| ref | notes |
|---|---|
| [[docs/model-weave-model/class/CLS-MODEL-WEAVE-FORMAT.md\|Model Weave Format]] | レンダリング対象のデータ定義 |
| [[docs/model-weave-model/class/CLS-MODEL-WEAVE-DIAGRAM-FORMAT.md\|Model Weave Diagram Format]] | 図解系フォーマット |
| [[docs/model-weave-model/class/CLS-MODEL-WEAVE-RENDERER.md\|Model Weave Renderer]] | レンダリングエンジン (Mermaid/Custom) |
| [[docs/model-weave-model/class/CLS-FORMAT-CLASS-DIAGRAM.md\|Class Diagram Format]] | |
| [[docs/model-weave-model/class/CLS-FORMAT-ER-DIAGRAM.md\|ER Diagram Format]] | |
| [[docs/model-weave-model/class/CLS-FORMAT-DFD-DIAGRAM.md\|DFD Diagram Format]] | |

## Relations

| id | from | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|---|
| REL-RND-RENDERER-INPUT | [[docs/model-weave-model/class/CLS-MODEL-WEAVE-RENDERER.md\|Model Weave Renderer]] | [[docs/model-weave-model/class/CLS-MODEL-WEAVE-FORMAT.md\|Model Weave Format]] | dependency | takes input | 1 | 1 | |
| REL-RND-DIAGRAM-DRAWN | [[docs/model-weave-model/class/CLS-MODEL-WEAVE-DIAGRAM-FORMAT.md\|Model Weave Diagram Format]] | [[docs/model-weave-model/class/CLS-MODEL-WEAVE-RENDERER.md\|Model Weave Renderer]] | dependency | drawn by | 1 | 1 | |
| REL-RND-CLD-IS-DIAGRAM | [[docs/model-weave-model/class/CLS-FORMAT-CLASS-DIAGRAM.md\|Class Diagram Format]] | [[docs/model-weave-model/class/CLS-MODEL-WEAVE-DIAGRAM-FORMAT.md\|Model Weave Diagram Format]] | inheritance | | | | |
| REL-RND-ERD-IS-DIAGRAM | [[docs/model-weave-model/class/CLS-FORMAT-ER-DIAGRAM.md\|ER Diagram Format]] | [[docs/model-weave-model/class/CLS-MODEL-WEAVE-DIAGRAM-FORMAT.md\|Model Weave Diagram Format]] | inheritance | | | | |
| REL-RND-DFD-IS-DIAGRAM | [[docs/model-weave-model/class/CLS-FORMAT-DFD-DIAGRAM.md\|DFD Diagram Format]] | [[docs/model-weave-model/class/CLS-MODEL-WEAVE-DIAGRAM-FORMAT.md\|Model Weave Diagram Format]] | inheritance | | | | |

## Notes
- V0.7 のポリシーでは、ダイアグラム系は主に Mermaid レンダラーに依存します。
- 詳細ビューでは Custom レンダラーが使用されます。
- 実装クラスそのものの完全なリバースエンジニアリングではない。
- 大きな図では Mermaid 表示、詳細確認では Custom 表示を使い分ける。