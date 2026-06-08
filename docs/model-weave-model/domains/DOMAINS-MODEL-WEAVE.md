---
type: domains
id: DOMAINS-MODEL-WEAVE
name: ModelWeaveDomains
tags:
  - ModelWeave
  - Domains
---

# ModelWeaveDomains

## Summary

Model Weave の主要な内部領域を、Domain Diagram と DFD の配色確認に使える単位として定義します。

## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| model_weave_app | Model Weave Plugin | application | | Obsidian 上で動作するプラグイン領域 |
| markdown_model | Markdown モデル | model | model_weave_app | Markdown ファイルと解析済みモデルの設計領域 |
| parser_resolver | Parser & Resolver | model | markdown_model | Markdown を解析し参照を解決する領域 |
| model_storage | 内部モデル | data | markdown_model | 解析済みモデルと datastore の領域 |
| rendering_pipeline | レンダリングパイプライン | integration | model_weave_app | プレビューと Mermaid/PNG export をつなぐ処理領域 |
| renderer_area | Renderer | renderer | rendering_pipeline | Mermaid や tree view を生成する領域 |
| viewer_ui | Model Weave Viewer UI | ui | model_weave_app | ユーザーにプレビューを表示する領域 |
| export_engine | Export Engine | export | rendering_pipeline | PNG export を実行する領域 |
| export_output | Export 出力 | export | export_engine | PNG などの生成物 |
