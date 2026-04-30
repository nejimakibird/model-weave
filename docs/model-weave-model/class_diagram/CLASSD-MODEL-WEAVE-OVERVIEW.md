---
type: class_diagram
id: CLASSD-MODEL-WEAVE-OVERVIEW
name: Model Weave Conceptual Overview
tags:
  - ModelWeave
  - Class
  - Diagram
---

# Model Weave Conceptual Overview

## Summary
Model Weave プラグイン全体の概念構造を俯瞰する概要図です。フォーマット定義、物理ファイル構造、レンダラーの関係を示します。

## Objects

| ref | notes |
|---|---|
| [[docs/model-weave-model/class/CLS-MODEL-WEAVE-FORMAT.md\|Model Weave Format]] | フォーマットの抽象概念 |
| [[docs/model-weave-model/class/CLS-MODEL-WEAVE-MODEL-FILE.md\|Model Weave Model File]] | Markdownモデルファイル構造 |
| [[docs/model-weave-model/class/CLS-MODEL-WEAVE-FRONTMATTER.md\|Model Weave Frontmatter]] | メタデータセクション |
| [[docs/model-weave-model/class/CLS-MODEL-WEAVE-SECTION.md\|Model Weave Section]] | 本文セクション |
| [[docs/model-weave-model/class/CLS-MODEL-WEAVE-TABLE-SECTION.md\|Model Weave Table Section]] | テーブル形式セクション |
| [[docs/model-weave-model/class/CLS-MODEL-WEAVE-DIAGRAM-FORMAT.md\|Model Weave Diagram Format]] | 図解形式の抽象カテゴリ |
| [[docs/model-weave-model/class/CLS-MODEL-WEAVE-DATA-FORMAT.md\|Model Weave Data Format]] | データ定義形式の抽象カテゴリ |
| [[docs/model-weave-model/class/CLS-MODEL-WEAVE-RULE-FORMAT.md\|Model Weave Rule Format]] | ルール定義形式の抽象カテゴリ |
| [[docs/model-weave-model/class/CLS-MODEL-WEAVE-RENDERER.md\|Model Weave Renderer]] | 表示・描画エンジン |

## Relations

| id | from | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|---|
| REL-OV-FORMAT-DEFINES-FILE | [[docs/model-weave-model/class/CLS-MODEL-WEAVE-FORMAT.md\|Model Weave Format]] | [[docs/model-weave-model/class/CLS-MODEL-WEAVE-MODEL-FILE.md\|Model Weave Model File]] | association | defines | 1 | 1 | |
| REL-OV-FILE-HAS-FM | [[docs/model-weave-model/class/CLS-MODEL-WEAVE-MODEL-FILE.md\|Model Weave Model File]] | [[docs/model-weave-model/class/CLS-MODEL-WEAVE-FRONTMATTER.md\|Model Weave Frontmatter]] | composition | contains | 1 | 1 | |
| REL-OV-FILE-HAS-SEC | [[docs/model-weave-model/class/CLS-MODEL-WEAVE-MODEL-FILE.md\|Model Weave Model File]] | [[docs/model-weave-model/class/CLS-MODEL-WEAVE-SECTION.md\|Model Weave Section]] | composition | contains | 1 | 0..* | |
| REL-OV-TABLE-IS-SECTION | [[docs/model-weave-model/class/CLS-MODEL-WEAVE-TABLE-SECTION.md\|Model Weave Table Section]] | [[docs/model-weave-model/class/CLS-MODEL-WEAVE-SECTION.md\|Model Weave Section]] | inheritance | | | | |
| REL-OV-DIAGRAM-IS-FORMAT | [[docs/model-weave-model/class/CLS-MODEL-WEAVE-DIAGRAM-FORMAT.md\|Model Weave Diagram Format]] | [[docs/model-weave-model/class/CLS-MODEL-WEAVE-FORMAT.md\|Model Weave Format]] | inheritance | | | | |
| REL-OV-DATA-IS-FORMAT | [[docs/model-weave-model/class/CLS-MODEL-WEAVE-DATA-FORMAT.md\|Model Weave Data Format]] | [[docs/model-weave-model/class/CLS-MODEL-WEAVE-FORMAT.md\|Model Weave Format]] | inheritance | | | | |
| REL-OV-RULE-IS-FORMAT | [[docs/model-weave-model/class/CLS-MODEL-WEAVE-RULE-FORMAT.md\|Model Weave Rule Format]] | [[docs/model-weave-model/class/CLS-MODEL-WEAVE-FORMAT.md\|Model Weave Format]] | inheritance | | | | |
| REL-OV-RENDERER-INPUT | [[docs/model-weave-model/class/CLS-MODEL-WEAVE-RENDERER.md\|Model Weave Renderer]] | [[docs/model-weave-model/class/CLS-MODEL-WEAVE-FORMAT.md\|Model Weave Format]] | dependency | takes input | 1 | 1 | |

## Notes
- この図は Model Weave の仕様概念を俯瞰するための概念モデルである。
- 実装クラスそのものの完全なリバースエンジニアリングではない。
- 大きな図では Mermaid 表示、詳細確認では Custom 表示を使い分ける。