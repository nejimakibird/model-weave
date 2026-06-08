---
type: domains
id: DOMAINS-COMPANY
name: CompanyDomains
tags:
  - ModelWeave
  - Domains
---

# CompanyDomains

## Summary

Model Weave を使うチームと外部利用者のコンテキストを示す Domain 定義です。

## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| model_weave_context | Model Weave 利用コンテキスト | business | | サンプル全体の業務コンテキスト |
| modeling_team | モデリングチーム | operations | model_weave_context | Markdown モデルを作成・保守するチーム |
| plugin_user | Obsidian 利用者 | external | model_weave_context | プレビューや PNG export を利用する外部アクター |
| obsidian_workspace | Obsidian ワークスペース | ui | model_weave_context | プレビューを開く作業画面 |
