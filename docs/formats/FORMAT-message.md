# FORMAT-message

`message` は、画面、処理、ルールから参照されるメッセージ文言を Markdown で管理するための Model Weave フォーマットです。

## 基本方針

- 1ファイル = 1メッセージ集合
- `Messages` テーブル = その集合に属するメッセージ一覧
- `Messages.message_id` は同一ファイル内でユニーク
- 1 message_id = 1 meaning を原則とする
- どの条件でどの message_id を使うかは `rule` に書く
- 外部メッセージ体系との対応付けは `mapping` に書く
- Viewer はチャートではなく、テーブル + diagnostics を中心にする

## frontmatter

```yaml
---
type: message
id: MSGSET-
name:
kind:
tags:
  - Message
---
```

## 推奨本文構成

```markdown
# <message set name>

## Summary

## Messages

| message_id | text | severity | timing | audience | active | notes |
|---|---|---|---|---|---|---|

## Notes
```

parser はセクション順序に厳密依存しません。`Messages` テーブルの列は列名ベースで読みます。

## Qualified Ref

`Messages.message_id` は member 候補として扱います。

```markdown
[[message/MSGSET-INVENTORY|在庫関連メッセージ]].INV-001
[[message/MSGSET-COMMON|共通メッセージ]].COMMON-VALIDATION-001
```

## Viewer

`message` は図やチャートを持たず、以下を中心としたシンプルな viewer を使います。

- Metadata
- Summary
- Messages table
- Notes
- diagnostics
