---
type: dfd_diagram
id: DFD-MODEL-WEAVE-OVERVIEW
name: Model Weave Processing Overview
level: 0
tags:
  - ModelWeave
  - DFD
---

# Model Weave Processing Overview

Model Weave プラグインにおけるMarkdownモデルファイルの処理フローの概要データフロー図です。

## Summary

このDFDは、Markdownソースファイルがどのように解析され、内部モデルに変換され、最終的にプレビューやエクスポートとして表示されるかを示します。主要なプロセス、データストア、および外部エンティティ間のデータフローを強調します。

## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| model_weave_app | Model Weave Plugin | application | | Obsidian 上で動作するプラグイン領域 |
| user_interface | User interface | ui | model_weave_app | エディタと viewer UI の領域 |
| markdown_model | Markdown モデル | model | model_weave_app | Markdown ファイルと解析済みモデルの設計領域 |
| model_storage | モデル datastore | data | markdown_model | Markdown ファイルと内部モデルを保持する領域 |
| rendering_pipeline | レンダリングパイプライン | integration | model_weave_app | プレビューと export の処理領域 |
| renderer_area | Renderer | renderer | rendering_pipeline | プレビューを生成する領域 |
| export_area | Export | export | rendering_pipeline | PNG export と出力ファイルの領域 |
| external_user | 外部利用者 | external | | プラグインを操作する利用者 |

## Objects

| id | label | kind | ref | domain | notes |
|---|---|---|---|---|---|
| USER | User | external | | external_user | プラグインを操作するユーザー |
| EDITOR | Obsidian Editor | process | | user_interface | ユーザーがMarkdownを編集するインターフェース |
| MARKDOWN_FILE | Markdown Model File | datastore | | model_storage | Model Weave の入力となるMarkdownファイル |
| PARSER_RESOLVER | Parser & Resolver | process | | markdown_model | Markdownを解析し、モデルを解決するプロセス |
| INTERNAL_MODEL | Internal Model | datastore | | model_storage | 解析・解決されたモデルの内部表現 |
| RENDERER | Renderer | process | | renderer_area | 内部モデルを視覚的な表現に変換するプロセス |
| VIEWER_UI | Model Weave Viewer UI | process | | user_interface | レンダリング結果をユーザーに提示するUIプロセス |
| EXPORT_ENGINE | Export Engine | process | | export_area | PNGなどの形式でモデルをエクスポートするプロセス |
| EXPORTED_FILE | Exported File | datastore | | export_area | PNGなどの出力ファイル |

## Flows

| id | from | to | data | notes |
|---|---|---|---|---|
| FLOW-USER-EDIT | USER | EDITOR | Edit Command | ユーザーによる編集操作 |
| FLOW-EDITOR-TO-FILE | EDITOR | MARKDOWN_FILE | Markdown Content | 編集内容の保存 |
| FLOW-FILE-TO-PARSER | MARKDOWN_FILE | PARSER_RESOLVER | Markdown Content | モデルファイルの読み込み |
| FLOW-PARSER-TO-MODEL | PARSER_RESOLVER | INTERNAL_MODEL | Parsed Model | 解析されたモデルを内部モデルとして保存 |
| FLOW-MODEL-TO-RENDERER | INTERNAL_MODEL | RENDERER | Internal Model | プレビュー用モデル |
| FLOW-RENDERER-TO-UI | RENDERER | VIEWER_UI | Rendered Preview | 描画データ |
| FLOW-UI-TO-USER | VIEWER_UI | USER | Visual Feedback | プレビュー表示 |
| FLOW-USER-EXPORT | USER | EXPORT_ENGINE | Export Command | エクスポート指示 |
| FLOW-MODEL-TO-EXPORT | INTERNAL_MODEL | EXPORT_ENGINE | Internal Model | エクスポート用モデル |
| FLOW-EXPORT-TO-FILE | EXPORT_ENGINE | EXPORTED_FILE | Exported Data | PNGなどのファイル出力 |

## Notes

- EDITOR を介することで、external から datastore への直接フローを避けている。
- EXPORTED_FILE から USER へのフローは、L0 DFDでは表現しない。
- Parser & Resolver は、解析と参照解決をまとめて表すため、内部的な参照解決ループは描かない。
- このDFDはModel Weaveの主要処理フローを抽象化したL0図であり、詳細な内部処理は下位DFDで表現する。
