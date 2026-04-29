# FORMAT-message

## 目的

`message` は、Model Weave における **メッセージ集合** を表すフォーマットです。

画面、業務ルール、アプリケーション処理、エラー処理などで利用する表示文言・確認文言・警告文言・エラー文言を、Markdown テーブルとして管理します。

対象例:

- 画面表示メッセージ
- 入力チェックエラー
- 業務ルール違反メッセージ
- 確認メッセージ
- 処理成功メッセージ
- 警告メッセージ
- 共通エラーメッセージ
- 外部連携エラーの利用者向け文言

`message` は、1メッセージ1ファイルではなく、**1ファイル = 1メッセージ集合** として扱います。

---

## 基本方針

- `type: message` を持つ
- 1ファイルで1つのメッセージ集合を表す
- `Messages` テーブルで複数メッセージを管理する
- `message_id` は同一 message ファイル内で一意とする
- メッセージ本文は `text` に記述する
- `severity` で info / success / warning / error / confirm などを表す
- `timing` で表示タイミングや利用場面を表す
- `audience` で利用者向け / 管理者向け / ログ向けなどを表せる
- `screen` / `rule` / `app_process` / `mapping` から参照できる
- Viewer は図やチャートを持たず、テーブルと diagnostics を表示する
- 多言語化、メッセージパラメータ、置換式は後続検討とする

---

## Frontmatter

### 必須

- `type`
- `id`
- `name`

### 任意

- `kind`
- `tags`

### `kind` の想定値

`kind` は厳密制限せず、文字列として保持します。

想定値:

- `common`
- `screen`
- `business_area`
- `validation`
- `system`
- `integration`
- `operation`
- `other`

### 例

```yaml
---
type: message
id: MSGSET-INVENTORY
name: 在庫関連メッセージ
kind: business_area
tags:
  - Message
  - WMS
---
```

---

## 本文構成

推奨構成:

```text
# <message set name>

## Summary

## Messages

## Notes
```

### 実質的な最小構成

最初に書き始める段階では、以下があれば十分です。

- `Summary`
- `Messages`

### parser 方針

推奨順序は上記としますが、parser / validator はセクション順序に厳密依存しない方針とします。

---

## Summary

メッセージ集合の目的、利用箇所、対象業務領域などを自然言語で記述します。

### 例

```markdown
## Summary

在庫確認、在庫引当、在庫不足、在庫状態変更で使用するメッセージを定義する。
```

---

## Messages

メッセージ集合に含まれる個別メッセージを定義します。

### 形式

Markdown テーブル

### 列

- `message_id`
- `text`
- `severity`
- `timing`
- `audience`
- `active`
- `notes`

### 意味

- `message_id`
  - メッセージ集合内で一意なメッセージID
  - Qualified Ref の member 候補になる
- `text`
  - 表示文言
  - 利用者に表示する文言、またはログ・運用向け文言
- `severity`
  - メッセージ種別
- `timing`
  - 表示タイミング、利用場面、発生契機
- `audience`
  - 想定読者・表示対象
- `active`
  - 有効フラグ
- `notes`
  - 補足

### `severity` の想定値

- `info`
- `success`
- `warning`
- `error`
- `confirm`
- `other`

### `audience` の想定値

厳密制限はしません。

想定値:

- `operator`
- `admin`
- `customer`
- `developer`
- `system`
- `log`
- `other`

### `active` の想定値

- `Y`
- `N`

### 例

```markdown
## Messages

| message_id | text | severity | timing | audience | active | notes |
|---|---|---|---|---|---|---|
| INV-001 | 在庫が不足しています。 | warning | stock_check | operator | Y | 引当可能数不足 |
| INV-002 | 指定されたロットは利用できません。 | error | validation | operator | Y | 保留・破損・出荷済を含む |
| INV-003 | 在庫を引き当てました。 | success | allocation_success | operator | Y | 正常完了 |
| INV-004 | 在庫状態を確認してください。 | info | confirmation | operator | Y | 判断保留時 |
```

---

## Notes

自由記述の補足です。

### 例

```markdown
## Notes

- 文言は利用者向け表示を前提とする。
- ログ専用メッセージは別 message set に分けてもよい。
```

---

## Qualified Ref / Member Ref

`message` では、`Messages.message_id` を Qualified Ref の member 候補として扱います。

### 例

```markdown
[[message/MSGSET-INVENTORY|在庫関連メッセージ]].INV-001
[[message/MSGSET-COMMON|共通メッセージ]].COMMON-VALIDATION-001
```

member 解決候補:

- `Messages.message_id`

### 参照解釈

```markdown
[[message/MSGSET-INVENTORY|在庫関連メッセージ]].INV-001
```

は、以下を意味します。

- message file: `MSGSET-INVENTORY`
- message member: `INV-001`
- text: `在庫が不足しています。`

### member 未解決

参照された `message_id` が `Messages.message_id` に存在しない場合、Warning とします。

---

## Screen との関係

Screen 内の `Messages` セクションは、画面固有の簡易メッセージ定義として使えます。

本格的に文言管理したい場合は、`message` ファイルへ切り出し、Screen 側では message 参照を使います。

### Screen 側の参照例

```markdown
## Messages

| id | text | severity | timing | notes |
|---|---|---|---|---|
| MSG-STOCK-001 | [[message/MSGSET-INVENTORY|在庫関連メッセージ]].INV-001 | warning | stock_check | 在庫不足 |
| MSG-SAVE-001 | [[message/MSGSET-COMMON|共通メッセージ]].COMMON-SAVE-001 | success | save_success | 登録完了 |
```

### 方針

- Screen 内 `Messages.text` は直接文言または message 参照を許容する
- message 参照がある場合、参照先の `Messages.message_id` を resolver で確認する
- Screen 内のローカルメッセージと外部 message 参照は混在してよい

---

## Rule との関係

Rule の `Messages.message` から `message` を参照できます。

### 例

```markdown
## Messages

| condition | message | severity | notes |
|---|---|---|---|
| stock shortage | [[message/MSGSET-INVENTORY|在庫関連メッセージ]].INV-001 | warning | 在庫不足 |
| invalid lot | [[message/MSGSET-INVENTORY|在庫関連メッセージ]].INV-002 | error | 利用不可ロット |
```

### 方針

- Rule は条件や制約を定義する
- message は利用者に表示する文言を定義する
- Rule 側に文言を直接書いてもよいが、再利用・文言統一が必要な場合は message に切り出す

---

## app_process との関係

app_process の `Errors` や `Steps` 内で、message を文中リンクとして参照できます。

### 例

```markdown
## Errors

- 入力内容に不備がある場合、入力画面へ戻して修正を促す。  
  メッセージ: [[message/MSGSET-COMMON|共通メッセージ]].COMMON-VALIDATION-001

- 在庫引当できない場合、処理を中断して警告を返す。  
  メッセージ: [[message/MSGSET-INVENTORY|在庫関連メッセージ]].INV-001
```

### 方針

- app_process は処理内容と例外時の扱いを説明する
- message は表示文言を外部化する
- app_process の自然言語内に message 参照を含めてよい

---

## Mapping との関係

mapping では、変換結果やエラー時に利用する message を `Rules` や `notes` から参照できます。

初期実装では、mapping 専用の message 列は設けません。  
必要になった場合は後続で検討します。

---

## CodeSet との関係

`severity` や `audience` を厳密に管理したい場合、将来的に codeset 参照へ切り替えることができます。

例:

```markdown
[[codeset/CODE-MESSAGE-SEVERITY|メッセージ重要度]].error
[[codeset/CODE-MESSAGE-AUDIENCE|メッセージ対象者]].operator
```

ただし、V0.7 時点では `severity` / `audience` は文字列として保持します。

---

## Validation 方針

### Error 候補

- frontmatter の `id` がない
- frontmatter の `name` がない
- `Messages.message_id` が空
- `Messages.message_id` が同一ファイル内で重複
- `Messages.text` が空

### Warning 候補

- `Messages` が空
- `severity` が空
- `severity` が想定値以外
- `timing` が空
- `audience` が空
- `active` が空
- `active` が `Y` / `N` 以外
- `kind` が空
- 参照された `message` ファイルが存在しない
- 参照された `message_id` が存在しない

### Note 候補

- `active = N` のメッセージが存在する
- `notes` が空の行が存在する
- 同じ `text` が同一 message ファイル内に複数存在する
  - ただし意図的な重複もあるため Error にはしない

---

## Viewer 方針

`message` Viewer は、画像やチャートを持ちません。

### 表示するもの

- title
- id
- kind
- Summary
- Messages table
- Notes
- diagnostics

### 表示しないもの

- 図
- チャート
- 遷移図
- Mermaid
- 実画面プレビュー

### 表示方針

- 既存 Viewer shell を利用する
- 上下リサイズと共存する
- light / dark theme で読みやすいテーブル表示にする
- `message_id` クリックで該当行へジャンプできるとよい
- 参照元一覧は後続検討とする

---

## 完成例

```markdown
---
type: message
id: MSGSET-INVENTORY
name: 在庫関連メッセージ
kind: business_area
tags:
  - Message
  - WMS
---

# 在庫関連メッセージ

## Summary

在庫確認、在庫引当、在庫不足、在庫状態変更で使用するメッセージを定義する。

## Messages

| message_id | text | severity | timing | audience | active | notes |
|---|---|---|---|---|---|---|
| INV-001 | 在庫が不足しています。 | warning | stock_check | operator | Y | 引当可能数不足 |
| INV-002 | 指定されたロットは利用できません。 | error | validation | operator | Y | 保留・破損・出荷済を含む |
| INV-003 | 在庫を引き当てました。 | success | allocation_success | operator | Y | 正常完了 |
| INV-004 | 在庫状態を確認してください。 | info | confirmation | operator | Y | 判断保留時 |

## Notes

- 文言は利用者向け表示を前提とする。
- ログ専用メッセージは別 message set に分けてもよい。
```

---

## 非対応 / 後続検討

V0.7 時点では以下を必須にしません。

- 多言語メッセージ
- メッセージパラメータ
- `{0}` / `{item_name}` などの置換式 validation
- 文言の自動重複判定
- 参照元の完全逆引き
- message catalog
- 未使用 message の検出
- severity / audience の codeset 強制
- ログメッセージと画面表示メッセージの厳密分離
- message 専用 diagram
