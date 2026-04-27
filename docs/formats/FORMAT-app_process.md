# FORMAT-app_process

`app_process` は、UI を持たないアプリケーション処理単位を Markdown で記述するためのフォーマットです。Model Weave では Markdown 本文を正本とし、Viewer は構造サマリとナビゲーション補助に寄せます。

## Frontmatter

必須:

- `type`
- `id`
- `name`

任意:

- `kind`
- `tags`

例:

```yaml
---
type: app_process
id: PROC-ORDER-REGISTER
name: 注文登録処理
kind: server_process
tags:
  - AppProcess
---
```

## 推奨本文構成

```md
# <process name>

## Summary

## Triggers

## Inputs

## Outputs

## Transitions

## Steps

## Errors

## Notes
```

この順序では、構造化テーブルとして扱うセクションを前半にまとめ、自然言語主体のセクションを後半にまとめます。

- 前半の構造化セクション:
  - `Triggers`
  - `Inputs`
  - `Outputs`
  - `Transitions`
- 後半の自然言語セクション:
  - `Steps`
  - `Errors`
  - `Notes`

## テーブル定義

### Triggers

```md
| id | kind | source | event | notes |
|---|---|---|---|---|
| TRG-LOAD | system | [[screen/SCR-ORDER-ENTRY\|注文入力画面]] | load | 初期化時 |
```

### Inputs

```md
| id | data | source | required | notes |
|---|---|---|---|---|
| IN-ORDER | [[data/DATA-ORDER-CONTENT\|注文内容]] | [[screen/SCR-ORDER-ENTRY\|注文入力画面]].order_id | Y | 入力条件 |
```

### Outputs

```md
| id | data | target | notes |
|---|---|---|---|
| OUT-RESULT | [[data/DATA-ORDER-RESULT\|注文結果]] | [[screen/SCR-ORDER-ENTRY\|注文入力画面]] | 完了時 |
```

### Transitions

```md
| id | event | to | condition | notes |
|---|---|---|---|---|
| TRANS-COMPLETE | success | [[screen/SCR-ORDER-COMPLETE\|注文完了画面]] | 登録成功時 |  |
```

## 自然言語セクション

### Steps

`Steps` は自然言語または箇条書きを正規形式とします。V0.6-1 では table 化せず、Viewer でも summary table として再構成しません。

### Errors

`Errors` も自然言語または箇条書きを正規形式とします。V0.6-1 では ID 管理を必須にせず、summary table として再構成しません。

## Viewer 方針

Simple Viewer はフォーマット順に沿って、次の構造サマリを表示します。

1. Metadata
2. Notes / Warnings / Errors
3. Counts
4. Detected Sections
5. `Triggers Summary`
6. `Inputs Summary`
7. `Outputs Summary`
8. `Transitions Summary`

`Steps` / `Errors` は summary table として表示せず、Detected Sections から見出しへジャンプする前提です。

## parser の互換方針

推奨順序は上記ですが、parser はセクション順序に厳密依存しません。以下の旧順序でも読み込み可能です。

```md
## Summary
## Triggers
## Inputs
## Steps
## Outputs
## Transitions
## Errors
## Notes
```

つまり、旧順序・新順序のどちらでも parse できます。Viewer は存在するセクションを認識し、構造化テーブルは `Triggers -> Inputs -> Outputs -> Transitions` の順に summary 表示します。
