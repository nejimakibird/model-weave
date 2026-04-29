# FORMAT-codeset

## 目的

`codeset` は、Model Weave における **コード体系・区分値・選択肢定義** を表すフォーマットです。

対象例:

- 画面の select / radio / checkbox の選択肢
- ステータス区分
- 税区分
- 通貨コード
- 部門コード
- 権限区分
- 外部システム連携で使う区分値
- rule で参照される許容値一覧

`codeset` は、最も単純な rule 的要素として扱います。  
つまり、「この項目にはこの値だけが入る」という制約・辞書を、独立した設計資産として定義します。

---

## 基本方針

- `type: codeset` を持つ
- コード体系・区分値・選択肢を 1 ファイルで定義する
- `Values` を Markdown テーブルで管理する
- Screen の `Fields.ref` から参照できる
- app_process / rule / mapping からも参照できる
- まずは単純な値一覧として扱い、複雑な条件付き表示や階層コードは後続検討とする

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

- `enum`
- `status`
- `master_code`
- `system_code`
- `external_code`
- `ui_options`
- `other`

### 例

~~~yaml
---
type: codeset
id: CODE-ORDER-STATUS
name: 注文ステータス
kind: status
tags:
  - CodeSet
---
~~~

---

## 本文構成

推奨構成:

~~~text
# <codeset name>

## Summary

## Values

## Notes
~~~

---

## Summary

コード体系の目的、利用箇所、管理方針などを自然言語で記述します。

### 例

~~~markdown
## Summary

注文の業務状態を表すコード体系。
注文入力画面、注文一覧、請求締め対象抽出で参照する。
~~~

---

## Values

コード値の一覧を記述します。

### 列

- `code`
- `label`
- `sort_order`
- `active`
- `notes`

### 意味

- `code`
  - システム上のコード値
- `label`
  - 表示名
- `sort_order`
  - 表示順
- `active`
  - 有効フラグ。`Y` / `N` など
- `notes`
  - 補足

### 例

~~~markdown
## Values

| code | label | sort_order | active | notes |
|---|---|---:|---|---|
| draft | 下書き | 10 | Y | 登録前 |
| confirmed | 確定済 | 20 | Y | 請求対象になり得る |
| cancelled | 取消 | 90 | Y | 通常は請求対象外 |
~~~

---

## Qualified Ref / Member Ref

`codeset` では、`Values.code` を Qualified Ref の member 候補として扱います。

例:

~~~markdown
[[codeset/CODE-ORDER-STATUS\|注文ステータス]].confirmed
[[codeset/CODE-TAX-TYPE\|税区分]].taxable
~~~

member 解決候補:

- `Values.code`

---

## Screen との関係

Screen の `Fields.ref` から `codeset` を参照できます。

例:

~~~markdown
## Fields

| id | label | kind | data_type | required | ref | rule | notes |
|---|---|---|---|---|---|---|---|
| order_status | 注文ステータス | select | string | N | [[codeset/CODE-ORDER-STATUS\|注文ステータス]] |  |  |
~~~

---

## Rule との関係

`rule` から `codeset` を参照し、許容値や判定条件として使えます。

例:

~~~markdown
## Conditions

- 注文ステータスは `confirmed` のみ対象とする。  
  関連コード: [[codeset/CODE-ORDER-STATUS\|注文ステータス]].confirmed
~~~

---

## Validation 方針（案）

### Error 候補

- frontmatter の `id` がない
- frontmatter の `name` がない
- `Values.code` が空
- `Values.code` が重複

### Warning 候補

- `Values.label` が空
- `active` が空
- `sort_order` が重複
- 参照されている `codeset` が存在しない
- 参照されている `Values.code` が存在しない

---

## 完成例

~~~markdown
---
type: codeset
id: CODE-ORDER-STATUS
name: 注文ステータス
kind: status
tags:
  - CodeSet
---

# 注文ステータス

## Summary

注文の業務状態を表すコード体系。
注文入力画面、注文一覧、請求締め対象抽出で参照する。

## Values

| code | label | sort_order | active | notes |
|---|---|---:|---|---|
| draft | 下書き | 10 | Y | 登録前 |
| confirmed | 確定済 | 20 | Y | 請求対象になり得る |
| shipped | 出荷済 | 30 | Y | 出荷処理完了 |
| invoiced | 請求済 | 40 | Y | 請求予定または請求確定済 |
| cancelled | 取消 | 90 | Y | 通常は請求対象外 |

## Notes

- 請求締め処理では `confirmed` を主対象とする。
- `cancelled` を含めるかどうかは rule 側で判断する。
~~~

---

## 非対応 / 後続検討

V0.7 時点では以下を必須にしません。

- 階層コード
- 親子コード
- 有効期間
- 多言語ラベル
- 外部コードとの変換表
- 条件付き選択肢
- codeset 専用 diagram
