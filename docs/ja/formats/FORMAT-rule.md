# FORMAT-rule

## 目的

`rule` は、Model Weave における **条件・制約・判定・業務ルール** を表すフォーマットです。

対象例:

- 入力チェック
- 実行条件
- 表示条件
- 活性 / 非活性条件
- 分岐条件
- 状態遷移条件
- 抽出条件
- 計算条件
- 例外判定
- 権限制御

`rule` は、Screen や app_process に直接書かれた自然言語の条件を、必要に応じて切り出して再利用・検証しやすくするための設計資産です。

---

## 基本方針

- `type: rule` を持つ
- 条件や制約を自然言語中心で記述する
- 厳密な DSL にはしない
- 必要に応じて `Inputs` / `References` / `Conditions` を持つ
- `codeset` は最も単純な rule 的要素として参照できる
- Screen / app_process / mapping から参照される
- 初期段階では人間と AI が読めることを優先する

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

- `validation`
- `condition`
- `business_rule`
- `display_rule`
- `transition_rule`
- `calculation_rule`
- `authorization_rule`
- `extraction_rule`
- `other`

### 例

~~~yaml
---
type: rule
id: RULE-INVOICE-CLOSE-CONDITION
name: 請求締め条件チェック
kind: validation
tags:
  - Rule
  - Invoice
---
~~~

---

## 本文構成

推奨構成:

~~~text
# <rule name>

## Summary

## Inputs

## References

## Conditions

## Messages

## Notes
~~~

### 実質的な最小構成

最初に書き始める段階では、以下があれば十分です。

- `Summary`
- `Conditions`

---

## Summary

ルールの目的、適用範囲、利用箇所を自然言語で記述します。

### 例

~~~markdown
## Summary

請求締め処理を実行できる条件を定義する。
画面の実行ボタン押下時と、請求予定作成処理の開始時に参照する。
~~~

---

## Inputs

ルール判定に使う入力を記述します。

### 列

- `id`
- `data`
- `source`
- `required`
- `notes`

### 意味

- `id`
  - 入力の識別子
- `data`
  - 参照する data_object / screen field / app_process input など
- `source`
  - 入力元
- `required`
  - 必須有無
- `notes`
  - 補足

### 例

~~~markdown
## Inputs

| id | data | source | required | notes |
|---|---|---|---|---|
| IN-CLOSE-DATE | [[data/DATA-INVOICE-CLOSE-CONDITION\|請求締め条件]].close_date | [[screen/SCR-INVOICE-CLOSE-ENTRY\|請求締め条件入力画面]].close_date | Y | 締め日 |
| IN-ORDER-STATUS | [[codeset/CODE-ORDER-STATUS\|注文ステータス]] | [[screen/SCR-INVOICE-CLOSE-ENTRY\|請求締め条件入力画面]].order_status | N | 対象注文状態 |
~~~

---

## References

ルールの判定で参照する関連情報を記述します。

`Inputs` が直接の判定入力であるのに対し、`References` はマスタ、コード体系、関連 rule、ER Entity などの補助参照を表します。

### 列

- `ref`
- `usage`
- `notes`

### 例

~~~markdown
## References

| ref | usage | notes |
|---|---|---|
| [[codeset/CODE-ORDER-STATUS\|注文ステータス]] | allowed_values | 対象ステータス判定 |
| [[er/t_order\|注文]] | source_table | 対象注文抽出 |
| [[rule/RULE-INVOICE-DUPLICATE-CHECK\|重複請求防止]] | related_rule | 請求済除外条件 |
~~~

---

## Conditions

条件本文を自然言語で記述します。

`Conditions` は、テーブルではなく文章または箇条書きを正規形式とします。  
厳密な DSL にはせず、人間と AI が読める条件として書きます。

### 書き方

以下のいずれも許容します。

- 段落
- 番号付きリスト
- 箇条書き
- 小見出し付きの説明

### 方針

- 条件 ID は必須にしない
- 複雑化したら複数 rule に分割してよい
- `codeset` / `data_object` / `screen` / `er_entity` への文中リンクを許容する
- 将来、AI レビューで曖昧条件や重複条件を洗い出す

### 例

~~~markdown
## Conditions

- 締め日は必須とする。  
  対象: [[data/DATA-INVOICE-CLOSE-CONDITION\|請求締め条件]].close_date

- 対象開始日は対象終了日以前でなければならない。  
  対象: [[data/DATA-INVOICE-CLOSE-CONDITION\|請求締め条件]].target_from_date  
  対象: [[data/DATA-INVOICE-CLOSE-CONDITION\|請求締め条件]].target_to_date

- 注文ステータスが未指定の場合、既定では `confirmed` のみを対象とする。  
  関連コード: [[codeset/CODE-ORDER-STATUS\|注文ステータス]].confirmed

- `include_already_invoiced` が OFF の場合、既に請求予定に紐づく注文は除外する。  
  関連ルール: [[rule/RULE-INVOICE-DUPLICATE-CHECK\|重複請求防止]]
~~~

---

## Messages

ルール違反時、警告時、確認時に利用するメッセージを記述します。

本格的な文言管理が必要な場合は、後続の `message` フォーマットへ切り出します。

### 列

- `condition`
- `message`
- `severity`
- `notes`

### 例

~~~markdown
## Messages

| condition | message | severity | notes |
|---|---|---|---|
| close_date is empty | [[message/MSG-INVOICE-CLOSE-001\|締め日を入力してください]] | error |  |
| already invoiced included | [[message/MSG-INVOICE-CLOSE-002\|請求済を含める場合は確認が必要です]] | warning |  |
~~~

---

## Notes

自由記述の補足です。

---

## Qualified Ref / Member Ref

`rule` では、V0.7 時点では member 候補を必須にしません。

将来的に必要であれば、以下を member 候補にできます。

- `Inputs.id`
- `Messages.condition`

ただし、`Conditions` は自然言語が正規形式であるため、member 候補には含めません。

---

## Screen との関係

Screen の `Fields.rule` / `Actions.rule` から `rule` を参照できます。

例:

~~~markdown
## Fields

| id | label | kind | data_type | required | ref | rule | notes |
|---|---|---|---|---|---|---|---|
| close_date | 締め日 | input | date | Y | [[data/DATA-INVOICE-CLOSE-CONDITION\|請求締め条件]].close_date | [[rule/RULE-INVOICE-CLOSE-DATE\|請求締め日判定]] |  |
~~~

---

## app_process との関係

app_process の `Steps` / `Errors` 内で文中リンクとして参照できます。

例:

~~~markdown
## Steps

1. 締め条件を決定する。  
   関連ルール: [[rule/RULE-INVOICE-CLOSE-DATE\|請求締め日判定]]
~~~

---

## Validation 方針（案）

### Error 候補

- frontmatter の `id` がない
- frontmatter の `name` がない
- `Inputs.id` が重複
- `Inputs.data` の参照未解決
- `References.ref` の参照未解決

### Warning 候補

- `Conditions` が空
- `Messages.message` の参照未解決
- 同じ内容に見える rule が複数ある
- Screen / app_process から参照されているが Summary が空

---

## 完成例

~~~markdown
---
type: rule
id: RULE-INVOICE-CLOSE-CONDITION
name: 請求締め条件チェック
kind: validation
tags:
  - Rule
  - Invoice
---

# 請求締め条件チェック

## Summary

請求予定作成処理を実行できる条件を定義する。
請求締め条件入力画面の実行ボタン押下時と、請求予定作成処理の開始時に参照する。

## Inputs

| id | data | source | required | notes |
|---|---|---|---|---|
| IN-CLOSE-DATE | [[data/DATA-INVOICE-CLOSE-CONDITION\|請求締め条件]].close_date | [[screen/SCR-INVOICE-CLOSE-ENTRY\|請求締め条件入力画面]].close_date | Y | 締め日 |
| IN-TARGET-FROM | [[data/DATA-INVOICE-CLOSE-CONDITION\|請求締め条件]].target_from_date | [[screen/SCR-INVOICE-CLOSE-ENTRY\|請求締め条件入力画面]].target_from_date | Y | 対象開始日 |
| IN-TARGET-TO | [[data/DATA-INVOICE-CLOSE-CONDITION\|請求締め条件]].target_to_date | [[screen/SCR-INVOICE-CLOSE-ENTRY\|請求締め条件入力画面]].target_to_date | Y | 対象終了日 |

## References

| ref | usage | notes |
|---|---|---|
| [[codeset/CODE-ORDER-STATUS\|注文ステータス]] | allowed_values | 対象注文状態 |
| [[rule/RULE-INVOICE-DUPLICATE-CHECK\|重複請求防止]] | related_rule | 請求済除外 |

## Conditions

- 締め日は必須とする。
- 対象開始日は対象終了日以前でなければならない。
- 注文ステータスが未指定の場合、既定では `confirmed` のみを対象とする。  
  関連コード: [[codeset/CODE-ORDER-STATUS\|注文ステータス]].confirmed
- 請求済注文を含める指定は、管理者権限を持つ利用者のみ許可する。
- 請求済注文を含めない場合、既に請求予定に紐づく注文は対象外とする。  
  関連ルール: [[rule/RULE-INVOICE-DUPLICATE-CHECK\|重複請求防止]]

## Messages

| condition | message | severity | notes |
|---|---|---|---|
| close_date is empty | [[message/MSG-INVOICE-CLOSE-001\|締め日を入力してください]] | error |  |
| invalid period | [[message/MSG-INVOICE-CLOSE-002\|対象期間を確認してください]] | error |  |
| already invoiced included | [[message/MSG-INVOICE-CLOSE-003\|請求済を含める場合は確認が必要です]] | warning |  |

## Notes

- 厳密な式ではなく、人間と AI が読める条件として記述する。
- 必要に応じて、個別 rule に分割する。
~~~

---

## 非対応 / 後続検討

V0.7 時点では以下を必須にしません。

- DSL 化
- 条件式の完全評価
- 自動実行可能なルールエンジン
- 複雑な真理値表
- ルール間の矛盾自動証明
