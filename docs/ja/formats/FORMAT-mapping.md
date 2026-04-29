# FORMAT-mapping

## 目的

`mapping` は、Model Weave における **異なる設計要素間の項目対応** を表すフォーマットです。

対象例:

- screen field → data_object field
- data_object field → er_entity column
- app_process input / output → data_object
- 外部 API payload → 内部 data_object
- data_object → data_object 変換
- ER Entity 間、または Entity と DTO の対応
- 変換ルール、固定値、計算式、除外条件の整理

`mapping` は、Screen / app_process / data_object / er_entity / class などをつなぐ横断的な設計資産です。  
初期段階では厳密な ETL 仕様ではなく、人間と AI が対応関係をレビューできることを重視します。

---

## 基本方針

- `type: mapping` を持つ
- 1 ファイルで 1 つの mapping セットを表す
- `source` と `target` を frontmatter または本文で明示する
- `Mappings` を Markdown テーブルで管理する
- `source_ref` / `target_ref` には Qualified Ref を推奨する
- 変換ロジックは自然言語を許容する
- 複雑な条件や変換は `rule` に切り出して参照する
- 原則として、1 行は 1 つの `target_ref` への対応を表す
- 多対多になりそうな場合は、mapping を分割するか、中間 data_object / app_process / rule に切り出す

---

## Frontmatter

### 必須

- `type`
- `id`
- `name`

### 任意

- `kind`
- `source`
- `target`
- `tags`

### `kind` の想定値

`kind` は厳密制限せず、文字列として保持します。

想定値:

- `screen_to_data`
- `data_to_er`
- `er_to_data`
- `data_to_data`
- `api_to_data`
- `data_to_api`
- `process_io`
- `other`

### 例

~~~yaml
---
type: mapping
id: MAP-INVOICE-CANDIDATE-SAVE
name: 請求予定保存マッピング
kind: data_to_er
source: [[data/DATA-INVOICE-CANDIDATE\|請求予定データ]]
target: [[er/t_invoice_candidate\|請求予定]]
tags:
  - Mapping
  - Invoice
---
~~~

---

## 本文構成

推奨構成:

~~~text
# <mapping name>

## Summary

## Scope

## Mappings

## Rules

## Notes
~~~

### 実質的な最小構成

最初に書き始める段階では、以下があれば十分です。

- `Summary`
- `Mappings`

---

## Summary

mapping の目的、対象範囲、利用箇所を自然言語で記述します。

### 例

~~~markdown
## Summary

請求予定データを請求予定ヘッダテーブルへ保存する際の項目対応を定義する。
~~~

---

## Scope

mapping 全体の source / target や前提条件を記述します。

### 列

- `role`
- `ref`
- `notes`

### `role` の想定値

- `source`
- `target`
- `intermediate`
- `reference`
- `rule`
- `process`

### 例

~~~markdown
## Scope

| role | ref | notes |
|---|---|---|
| source | [[data/DATA-INVOICE-CANDIDATE\|請求予定データ]] | 入力データ |
| target | [[er/t_invoice_candidate\|請求予定]] | 保存先 |
| reference | [[codeset/CODE-TAX-TYPE\|税区分]] | 税区分変換 |
| rule | [[rule/RULE-INVOICE-AMOUNT-CALC\|請求金額計算ルール]] | 金額計算 |
~~~

---

## Mappings

項目対応を記述します。

### 列

- `source_ref`
- `target_ref`
- `transform`
- `rule`
- `required`
- `notes`

### 意味

- `source_ref`
  - 変換元項目
  - Qualified Ref を推奨
  - 固定値、システム値、採番値などの場合は空欄可
- `target_ref`
  - 変換先項目
  - Qualified Ref を推奨
  - 原則として 1 行に 1 つだけ記述する
- `transform`
  - 変換内容
  - 直接値、固定値、計算、編集、集約などを自然言語で記述してよい
- `rule`
  - 関連する rule 参照
- `required`
  - 必須有無
- `notes`
  - 補足

### 基本例

~~~markdown
## Mappings

| source_ref | target_ref | transform | rule | required | notes |
|---|---|---|---|---|---|
| [[data/DATA-INVOICE-CANDIDATE\|請求予定データ]].customer_id | [[er/t_invoice_candidate\|請求予定]].customer_id | そのまま設定 |  | Y | 顧客ID |
| [[data/DATA-INVOICE-CANDIDATE\|請求予定データ]].total_amount | [[er/t_invoice_candidate\|請求予定]].total_amount | 税込金額を設定 | [[rule/RULE-INVOICE-AMOUNT-CALC\|請求金額計算ルール]] | Y | 金額計算結果 |
|  | [[er/t_invoice_candidate\|請求予定]].created_at | システム日時 |  | Y | 登録日時 |
~~~

---

## Mapping の粒度

Mapping は、Markdown テーブルとして扱いやすい粒度に保つことを重視します。

### 原則

- 1 行は 1 つの `target_ref` への対応を表す
- `target_ref` は可能な限り 1 行に 1 つだけ書く
- 1 対 1 はそのまま 1 行で書く
- 1 対多は、同じ `source_ref` を複数行に分けて書く
- 多対 1 は、代表 `source_ref` を置き、他の入力は `transform` / `notes` / `rule` に記述する
- 多対多になりそうな場合は、mapping を分割するか、中間 `data_object` / `app_process` / `rule` に切り出す
- 固定値、システム値、採番値などは `source_ref` を空欄にしてよい
- 複雑な変換は `transform` に詰め込まず、`rule` または `app_process` に逃がす

### 1 対 1

~~~markdown
| source_ref | target_ref | transform | rule | required | notes |
|---|---|---|---|---|---|
| [[screen/SCR-INVOICE-CLOSE-ENTRY\|請求締め条件入力画面]].close_date | [[data/DATA-INVOICE-CLOSE-CONDITION\|請求締め条件]].close_date | そのまま設定 | [[rule/RULE-INVOICE-CLOSE-CONDITION\|請求締め条件チェック]] | Y | 締め日 |
~~~

### 1 対多

1 つの source から複数 target を作る場合は、target ごとに行を分けます。

~~~markdown
| source_ref | target_ref | transform | rule | required | notes |
|---|---|---|---|---|---|
| [[screen/SCR-INVOICE-CLOSE-ENTRY\|請求締め条件入力画面]].dry_run | [[data/DATA-INVOICE-CLOSE-CONDITION\|請求締め条件]].execution_mode | ON なら `dry_run`、OFF なら `normal` | [[rule/RULE-INVOICE-CLOSE-CONDITION\|請求締め条件チェック]] | N | 実行モード |
| [[screen/SCR-INVOICE-CLOSE-ENTRY\|請求締め条件入力画面]].dry_run | [[data/DATA-INVOICE-CLOSE-CONDITION\|請求締め条件]].save_enabled | ON なら `false`、OFF なら `true` | [[rule/RULE-INVOICE-CLOSE-CONDITION\|請求締め条件チェック]] | N | 保存可否 |
~~~

### 多対 1

複数 source から 1 つの target を作る場合は、代表 `source_ref` を置き、他の入力は `transform` / `notes` / `rule` に記述します。

~~~markdown
| source_ref | target_ref | transform | rule | required | notes |
|---|---|---|---|---|---|
| [[screen/SCR-INVOICE-CLOSE-ENTRY\|請求締め条件入力画面]].target_from_date | [[data/DATA-INVOICE-CLOSE-CONDITION\|請求締め条件]].target_period_label | 対象開始日と対象終了日を表示用期間文字列に編集する | [[rule/RULE-INVOICE-TARGET-PERIOD\|請求対象期間チェック]] | N | inputs: target_from_date, target_to_date |
~~~

多対 1 が複雑になる場合は、詳細を rule に切り出します。

~~~markdown
| source_ref | target_ref | transform | rule | required | notes |
|---|---|---|---|---|---|
| [[screen/SCR-INVOICE-CLOSE-ENTRY\|請求締め条件入力画面]].target_from_date | [[data/DATA-INVOICE-CLOSE-CONDITION\|請求締め条件]].target_period_label | 請求対象期間表示ルールに従って編集する | [[rule/RULE-INVOICE-PERIOD-LABEL\|請求対象期間表示ルール]] | N | target_to_date も参照する |
~~~

### 固定値・システム値・採番値

固定値、システム日時、ログインユーザー、採番値などは `source_ref` を空欄にします。

~~~markdown
| source_ref | target_ref | transform | rule | required | notes |
|---|---|---|---|---|---|
|  | [[er/t_invoice_candidate\|請求予定]].created_at | システム日時 |  | Y | 登録日時 |
|  | [[er/t_invoice_candidate\|請求予定]].created_by | 実行ユーザーID |  | Y | 登録者 |
|  | [[er/t_invoice_candidate\|請求予定]].invoice_candidate_id | 採番 | [[rule/RULE-INVOICE-ID-NUMBERING\|請求予定ID採番]] | Y | 主キー |
~~~

### 多対多

多対多を 1 行に押し込むことは避けます。

避けたい例:

~~~markdown
| source_ref | target_ref | transform | rule | required | notes |
|---|---|---|---|---|---|
| close_date, target_from_date, target_to_date, customer_id | execution_mode, search_condition, batch_parameter | 複数項目をまとめて変換 | [[rule/RULE-XXX]] | Y | 複雑 |
~~~

このような場合は、mapping を分割するか、中間 `data_object` / `app_process` / `rule` に切り出します。

分割例:

~~~text
screen fields
  ↓
MAP-INVOICE-CLOSE-SCREEN-TO-CONDITION
  ↓
DATA-INVOICE-CLOSE-CONDITION
  ↓
PROC-INVOICE-CREATE-FROM-ORDERS
  ↓
DATA-INVOICE-CANDIDATE
  ↓
MAP-INVOICE-CANDIDATE-SAVE
  ↓
ER
~~~

---

## Rules

mapping 全体に関係する補足ルールを自然言語で記述します。

`Rules` は、テーブルではなく文章または箇条書きを正規形式とします。  
厳密に管理したい場合は `rule` ファイルへ切り出します。

### 例

~~~markdown
## Rules

- `total_amount` は明細の税込金額を合算する。  
  関連ルール: [[rule/RULE-INVOICE-AMOUNT-CALC\|請求金額計算ルール]]

- 取消注文は通常 mapping 対象に含めない。  
  関連ルール: [[rule/RULE-INVOICE-INCLUDE-CANCELLED\|取消注文含有可否]]
~~~

---

## Notes

自由記述の補足です。

---

## Qualified Ref / Member Ref

`mapping` では、V0.7 時点では member 候補を必須にしません。

ただし、`Mappings.source_ref` / `Mappings.target_ref` で Qualified Ref を多用します。

例:

~~~markdown
[[screen/SCR-INVOICE-CLOSE-ENTRY\|請求締め条件入力画面]].close_date
[[data/DATA-INVOICE-CLOSE-CONDITION\|請求締め条件]].close_date
[[er/t_invoice_candidate\|請求予定]].invoice_candidate_id
[[process/PROC-INVOICE-CREATE-FROM-ORDERS\|注文締め請求作成処理]].IN-CLOSE-CONDITION
~~~

---

## Screen との関係

Screen の `Fields.ref` は簡易 mapping として機能します。

ただし、以下のような場合は `mapping` に切り出します。

- 1 画面項目が複数データ項目に分解される
- 複数項目から 1 項目を生成する
- 固定値や変換ルールがある
- data_object / ER との対応をレビュー対象にしたい
- app_process の input / output と接続したい

---

## app_process との関係

app_process の `Inputs` / `Outputs` は、mapping の source / target になれます。

例:

~~~markdown
[[process/PROC-INVOICE-CREATE-FROM-ORDERS\|注文締め請求作成処理]].IN-CLOSE-CONDITION
[[process/PROC-INVOICE-CREATE-FROM-ORDERS\|注文締め請求作成処理]].OUT-INVOICE-CANDIDATE
~~~

---

## Validation 方針（案）

### Error 候補

- frontmatter の `id` がない
- frontmatter の `name` がない
- `Mappings.target_ref` が空
- `source_ref` / `target_ref` の参照未解決
- `source_ref` / `target_ref` の Qualified Ref member 未解決

### Warning 候補

- `Mappings.source_ref` が空で、`transform` も空
- `transform` が複雑だが `rule` がない
- `required` が空
- `Scope.source` と `Mappings.source_ref` の大元が一致しない
- `Scope.target` と `Mappings.target_ref` の大元が一致しない
- 同じ `target_ref` が複数回出ている
  - ただし意図的な上書きや条件違いの場合もあるため、最初は Warning 程度とする

---

## 完成例

~~~markdown
---
type: mapping
id: MAP-INVOICE-CANDIDATE-SAVE
name: 請求予定保存マッピング
kind: data_to_er
source: [[data/DATA-INVOICE-CANDIDATE\|請求予定データ]]
target: [[er/t_invoice_candidate\|請求予定]]
tags:
  - Mapping
  - Invoice
---

# 請求予定保存マッピング

## Summary

請求予定データを請求予定ヘッダテーブルへ保存する際の項目対応を定義する。

## Scope

| role | ref | notes |
|---|---|---|
| source | [[data/DATA-INVOICE-CANDIDATE\|請求予定データ]] | 入力データ |
| target | [[er/t_invoice_candidate\|請求予定]] | 保存先 |
| rule | [[rule/RULE-INVOICE-AMOUNT-CALC\|請求金額計算ルール]] | 金額計算 |

## Mappings

| source_ref | target_ref | transform | rule | required | notes |
|---|---|---|---|---|---|
| [[data/DATA-INVOICE-CANDIDATE\|請求予定データ]].invoice_candidate_id | [[er/t_invoice_candidate\|請求予定]].invoice_candidate_id | 採番済みIDを設定 |  | Y | 主キー |
| [[data/DATA-INVOICE-CANDIDATE\|請求予定データ]].customer_id | [[er/t_invoice_candidate\|請求予定]].customer_id | そのまま設定 |  | Y | 顧客ID |
| [[data/DATA-INVOICE-CANDIDATE\|請求予定データ]].billing_customer_id | [[er/t_invoice_candidate\|請求予定]].billing_customer_id | そのまま設定 |  | Y | 請求先 |
| [[data/DATA-INVOICE-CANDIDATE\|請求予定データ]].total_amount | [[er/t_invoice_candidate\|請求予定]].total_amount | 税込金額を設定 | [[rule/RULE-INVOICE-AMOUNT-CALC\|請求金額計算ルール]] | Y | 金額 |
|  | [[er/t_invoice_candidate\|請求予定]].created_at | システム日時 |  | Y | 登録日時 |
|  | [[er/t_invoice_candidate\|請求予定]].created_by | 実行ユーザーID |  | Y | 登録者 |

## Rules

- `total_amount` は明細の税込金額を合算する。  
  関連ルール: [[rule/RULE-INVOICE-AMOUNT-CALC\|請求金額計算ルール]]

- `created_at` は DB 登録時のシステム日時を設定する。

## Notes

- 明細側の mapping は別ファイル `MAP-INVOICE-CANDIDATE-LINE-SAVE` で管理する。
~~~

---

## 非対応 / 後続検討

V0.7 時点では以下を必須にしません。

- 自動変換実行
- 式評価
- ETL レベルの詳細仕様
- 双方向 mapping
- 差分 mapping
- mapping diagram
- 完全なカバレッジ検証
