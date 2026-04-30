---
type: class_diagram
id: CLASSD-FORMAT-RELATION
name: Model Weave Format Relations
tags:
  - ModelWeave
  - Diagram
  - Core
---

# Model Weave Format Relations

Model Weave の主要なモデルフォーマット間の関係を俯瞰するクラス図です。

## Summary

この図は、Model Weave が提供する様々なMarkdownベースのモデリングフォーマットが、どのように相互に関連しているかを示します。各フォーマットは特定の目的を持ち、他のフォーマットを参照したり、他のフォーマットによって参照されたりすることで、より大きなモデルを構築します。

## Objects

| ref | notes |
|---|---|
| [[docs/model-weave-model/class/CLS-MODEL-WEAVE-FORMAT.md\|Model Weave Format]] | フォーマットの抽象概念 |
| [[docs/model-weave-model/class/CLS-MODEL-WEAVE-MODEL-FILE.md\|Model Weave Model File]] | Markdownモデルファイル構造 |
| [[docs/model-weave-model/class/CLS-MODEL-WEAVE-FRONTMATTER.md\|Model Weave Frontmatter]] | メタデータセクション |
| [[docs/model-weave-model/class/CLS-MODEL-WEAVE-SECTION.md\|Model Weave Section]] | 本文セクション |
| [[docs/model-weave-model/class/CLS-MODEL-WEAVE-TABLE-SECTION.md\|Model Weave Table Section]] | テーブル形式セクション |
| [[docs/model-weave-model/class/CLS-MODEL-WEAVE-DIAGRAM-FORMAT.md\|Model Weave Diagram Format]] | 図解形式の特殊化 |
| [[docs/model-weave-model/class/CLS-MODEL-WEAVE-DATA-FORMAT.md\|Model Weave Data Format]] | データ定義形式の特殊化 |
| [[docs/model-weave-model/class/CLS-MODEL-WEAVE-RULE-FORMAT.md\|Model Weave Rule Format]] | ルール定義形式の特殊化 |
| [[docs/model-weave-model/class/CLS-MODEL-WEAVE-RENDERER.md\|Model Weave Renderer]] | 表示・描画エンジン |
| DATA-FORMAT-CATALOG | Model Weave がサポートするフォーマットのカタログ |
| [[docs/model-weave-model/class/CLS-FORMAT-CLASS.md\|CLS-FORMAT-CLASS]] | Class 形式 |
| [[docs/model-weave-model/class/CLS-FORMAT-CLASS-DIAGRAM.md\|CLS-FORMAT-CLASS-DIAGRAM]] | Class Diagram 形式 |
| [[docs/model-weave-model/class/CLS-FORMAT-ER-ENTITY.md\|CLS-FORMAT-ER-ENTITY]] | ER Entity 形式 |
| [[docs/model-weave-model/class/CLS-FORMAT-ER-DIAGRAM.md\|CLS-FORMAT-ER-DIAGRAM]] | ER Diagram 形式 |
| [[docs/model-weave-model/class/CLS-FORMAT-DFD-OBJECT.md\|CLS-FORMAT-DFD-OBJECT]] | DFD Object 形式 |
| [[docs/model-weave-model/class/CLS-FORMAT-DFD-DIAGRAM.md\|CLS-FORMAT-DFD-DIAGRAM]] | DFD Diagram 形式 |
| [[docs/model-weave-model/class/CLS-FORMAT-DATA-OBJECT.md\|CLS-FORMAT-DATA-OBJECT]] | Data Object 形式 |
| [[docs/model-weave-model/class/CLS-FORMAT-SCREEN.md\|CLS-FORMAT-SCREEN]] | Screen 形式 |
| [[docs/model-weave-model/class/CLS-FORMAT-APP-PROCESS.md\|CLS-FORMAT-APP-PROCESS]] | App Process 形式 |
| [[docs/model-weave-model/class/CLS-FORMAT-RULE.md\|CLS-FORMAT-RULE]] | Rule 形式 |
| [[docs/model-weave-model/class/CLS-FORMAT-MAPPING.md\|CLS-FORMAT-MAPPING]] | Mapping 形式 |
| [[docs/model-weave-model/class/CLS-FORMAT-CODESET.md\|CLS-FORMAT-CODESET]] | Codeset 形式 |
| [[docs/model-weave-model/class/CLS-FORMAT-MESSAGE.md\|CLS-FORMAT-MESSAGE]] | Message 形式 |

## Relations

| id | from | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|---|
| REL-CATALOG-LISTS-FORMAT | DATA-FORMAT-CATALOG | CLS-MODEL-WEAVE-FORMAT | association | catalogs | 1 | 0..* | |
| REL-FORMAT-SPEC-FILE | CLS-MODEL-WEAVE-FORMAT | CLS-MODEL-WEAVE-MODEL-FILE | association | defines | 1 | 1 | |
| REL-CLASS-SPEC | CLS-FORMAT-CLASS | CLS-MODEL-WEAVE-FORMAT | inheritance | | | | |
| REL-CLASS-DIAGRAM-SPEC | CLS-FORMAT-CLASS-DIAGRAM | CLS-MODEL-WEAVE-DIAGRAM-FORMAT | inheritance | | | | |
| REL-ER-ENTITY-SPEC | CLS-FORMAT-ER-ENTITY | CLS-MODEL-WEAVE-DATA-FORMAT | inheritance | | | | |
| REL-ER-DIAGRAM-SPEC | CLS-FORMAT-ER-DIAGRAM | CLS-MODEL-WEAVE-DIAGRAM-FORMAT | inheritance | | | | |
| REL-DFD-OBJECT-SPEC | CLS-FORMAT-DFD-OBJECT | CLS-MODEL-WEAVE-FORMAT | inheritance | | | | |
| REL-DFD-DIAGRAM-SPEC | CLS-FORMAT-DFD-DIAGRAM | CLS-MODEL-WEAVE-DIAGRAM-FORMAT | inheritance | | | | |
| REL-DATA-OBJECT-SPEC | CLS-FORMAT-DATA-OBJECT | CLS-MODEL-WEAVE-DATA-FORMAT | inheritance | | | | |
| REL-SCREEN-SPEC | CLS-FORMAT-SCREEN | CLS-MODEL-WEAVE-FORMAT | inheritance | | | | |
| REL-APP-PROCESS-SPEC | CLS-FORMAT-APP-PROCESS | CLS-MODEL-WEAVE-FORMAT | inheritance | | | | |
| REL-RULE-SPEC | CLS-FORMAT-RULE | CLS-MODEL-WEAVE-RULE-FORMAT | inheritance | | | | |
| REL-MAPPING-SPEC | CLS-FORMAT-MAPPING | CLS-MODEL-WEAVE-RULE-FORMAT | inheritance | | | | |
| REL-CODESET-SPEC | CLS-FORMAT-CODESET | CLS-MODEL-WEAVE-DATA-FORMAT | inheritance | | | | |
| REL-MESSAGE-SPEC | CLS-FORMAT-MESSAGE | CLS-MODEL-WEAVE-DATA-FORMAT | inheritance | | | | |
| REL-FILE-HAS-FM | CLS-MODEL-WEAVE-MODEL-FILE | CLS-MODEL-WEAVE-FRONTMATTER | composition | contains | 1 | 1 | |
| REL-FILE-HAS-SEC | CLS-MODEL-WEAVE-MODEL-FILE | CLS-MODEL-WEAVE-SECTION | composition | contains | 1 | 0..* | |
| REL-TABLE-IS-SECTION | CLS-MODEL-WEAVE-TABLE-SECTION | CLS-MODEL-WEAVE-SECTION | inheritance | | | | |
| REL-DIAGRAM-IS-FORMAT | CLS-MODEL-WEAVE-DIAGRAM-FORMAT | CLS-MODEL-WEAVE-FORMAT | inheritance | | | | |
| REL-DATA-IS-FORMAT | CLS-MODEL-WEAVE-DATA-FORMAT | CLS-MODEL-WEAVE-FORMAT | inheritance | | | | |
| REL-RULE-IS-FORMAT | CLS-MODEL-WEAVE-RULE-FORMAT | CLS-MODEL-WEAVE-FORMAT | inheritance | | | | |
| REL-RENDERER-INPUT | CLS-MODEL-WEAVE-RENDERER | CLS-MODEL-WEAVE-FORMAT | dependency | takes input | 1 | 1 | |
| REL-DIAGRAM-DRAWN | CLS-MODEL-WEAVE-DIAGRAM-FORMAT | CLS-MODEL-WEAVE-RENDERER | dependency | drawn by | 1 | 1 | |
| REL-DATA-USES-TABLE | CLS-MODEL-WEAVE-DATA-FORMAT | CLS-MODEL-WEAVE-TABLE-SECTION | association | contains | 1 | 1..* | |
| REL-RULE-USES-SEC | CLS-MODEL-WEAVE-RULE-FORMAT | CLS-MODEL-WEAVE-SECTION | association | uses | 1 | 1..* | |

## Notes

- この図は全フォーマットと内部概念の相互関係を示す**総合検証用**のモデルです。
- 実装クラスそのものの完全なリバースエンジニアリングではない。
- 各フォーマットの具体的な内部構造や詳細な関係は、個別のフォーマット定義ファイルを参照してください。
- 関係の多重度は、一般的な使用パターンに基づいています。
- 通常のレビューや学習には、`docs/model-weave-model/class_diagram/` 配下の用途別分割図を利用してください。
- 接続数が多いため、全体像の把握には **Mermaid 表示**、特定関係の精査には **Custom 表示** の利用を推奨します。
- 必要に応じて、さらに詳細なクラス図に分割できます。