---
type: app_process
id: PROC-MODEL-WEAVE-PREVIEW-FLOW
name: Model Weave プレビュー処理フロー
tags:
  - ModelWeave
  - AppProcess
  - BusinessFlow
---

# Model Weave プレビュー処理フロー

## Summary

Model Weave が Markdown モデルを読み取り、プレビュー表示と PNG export を行うまでの処理を表す Business Flow サンプルです。

`Steps.kind` に `start` / `process` / `decision` / `end` を設定しているため、`target=app_process` の Color Scheme が適用されます。

## Steps

| id | lane | label | kind | input | output | rule | invoke | screen | notes |
|---|---|---|---|---|---|---|---|---|---|
| start | User | 開始 | start | Markdown file | Preview request | | | | プレビュー対象の Markdown ファイルを開きます。 |
| open_model | Obsidian | Markdown モデルを開く | process | Markdown file | File content | | | | 現在のファイル内容を取得します。 |
| detect_type | Model Weave | モデル種別を判定する | process | File content | Model type | | | | frontmatter の `type` から表示形式を判定します。 |
| parse_sections | Model Weave | モデルセクションを解析する | process | File content | Parsed sections | | | | テーブルや定義セクションを解析します。 |
| resolve_refs | Model Weave | 参照関係を解決する | process | Parsed sections | Resolved model | | | | ref や Domain Sources などの参照を解決します。 |
| choose_renderer | Model Weave | レンダラーを選択する | process | Resolved model | Renderer | | | | DFD、Domains、Business Flow などの表示処理を選択します。 |
| render_preview | Model Weave | プレビューを描画する | process | Renderer | Rendered preview | | | | Mermaid または独自描画でビューを表示します。 |
| export_needed | User | PNG 出力するか？ | decision | Rendered preview | Export decision | | | | 必要に応じて現在の図を PNG 出力します。 |
| export_png | Model Weave | PNG を出力する | process | Rendered preview | PNG file | | | | 現在表示中の図を PNG として保存します。 |
| continue_editing | User | 編集を続ける | process | Rendered preview | Updated Markdown | | | | Markdown モデルを更新しながら確認します。 |
| end | User | 終了 | end | PNG file | Review complete | | | | プレビュー確認を終了します。 |

## Flows

| from | to | condition | label | notes |
|---|---|---|---|---|
| start | open_model | | | |
| open_model | detect_type | | | |
| detect_type | parse_sections | | | |
| parse_sections | resolve_refs | | | |
| resolve_refs | choose_renderer | | | |
| choose_renderer | render_preview | | | |
| render_preview | export_needed | | | |
| export_needed | export_png | Yes | Yes | PNG が必要な場合 |
| export_needed | continue_editing | No | No | 編集を続ける場合 |
| export_png | end | | | |
| continue_editing | open_model | Update | Update | 更新後に再確認します。 |
