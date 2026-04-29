# FORMAT-data_object

## 目的

`data_object` は、Model Weave における **データ構造・電文・ファイルレイアウト・画面フォーム値・API payload** を表すフォーマットです。

対象例:

- DFD flow 上を流れるデータ
- 画面入力値 / 画面表示値
- app_process の Input / Output
- API request / response
- JSON / XML payload
- CSV / TSV / 独自区切りファイル
- 固定長ファイル
- 固定長マルチレコードファイル
- EDI 的なセグメント構造
- Excel 帳票やセル位置に意味があるデータ
- 内部 DTO / Value Object / 検索条件 / 処理結果

`data_object` は、処理や画面、DFD、ER、Mapping をつなぐ中間データ定義です。  
完全なファイルパーサ仕様ではなく、人間と AI がデータ構造を理解し、参照・レビュー・整合性確認できることを重視します。

---

## 基本方針

- `type: data_object` を持つ
- 1 ファイルで 1 つのデータ構造、電文、ファイル、payload を表す
- `Fields` を Markdown テーブルで管理する
- 通常データとファイルレイアウトの両方を扱える
- 固定長マルチレコードや EDI 的な構造は `Records` と `Fields.record_type` で表現する
- JSON / XML などの階層データは `Fields.path` で表現できる
- Excel 帳票や固定長ファイルなど位置が重要なデータは `Fields.position` で表現できる
- `Fields.name` を Qualified Ref の member 候補として扱う
- data_object 自体は図ではなく、構造サマリ・参照チェック・補完の対象とする

---

## Frontmatter

### 必須

- `type`
- `id`
- `name`

### 任意

- `kind`
- `data_format`
- `encoding`
- `delimiter`
- `line_ending`
- `has_header`
- `record_length`
- `tags`

### `kind` の想定値

`kind` は、データの用途・性格を表します。  
厳密制限せず、文字列として保持します。

想定値:

- `data`
- `dto`
- `request`
- `response`
- `payload`
- `file`
- `form`
- `query`
- `result`
- `report`
- `message`
- `other`

### `data_format` の想定値

`data_format` は、データの具体的な表現形式を表します。  
本文の `## Format` セクションと混同しないよう、frontmatter では `format` ではなく `data_format` を使います。

想定値:

- `object`
- `json`
- `xml`
- `csv`
- `tsv`
- `fixed`
- `delimited`
- `excel`
- `edi`
- `binary`
- `form`
- `query`
- `other`

### 例: 通常データ

```yaml
---
type: data_object
id: DATA-INVOICE-CLOSE-CONDITION
name: 請求締め条件
kind: request
data_format: object
tags:
  - DataObject
  - Invoice
---
```

### 例: CSV

```yaml
---
type: data_object
id: DATA-INVOICE-IMPORT-CSV
name: 請求取込CSV
kind: file
data_format: csv
encoding: UTF-8
delimiter: ","
line_ending: LF
has_header: true
tags:
  - DataObject
  - File
---
```

### 例: 固定長ファイル

```yaml
---
type: data_object
id: DATA-BANK-TRANSFER-FILE
name: 銀行振込固定長ファイル
kind: file
data_format: fixed
encoding: Shift_JIS
line_ending: CRLF
record_length: 120
tags:
  - DataObject
  - File
---
```

---

## `kind` と `data_format` の役割分担

`kind` は「何のためのデータか」を表します。  
`data_format` は「どの形式で表現されるか」を表します。

| kind | data_format | 意味 |
|---|---|---|
| request | json | API request payload |
| response | json | API response payload |
| form | object | 画面フォーム値 |
| query | object | 検索条件 |
| file | csv | CSV ファイル |
| file | fixed | 固定長ファイル |
| report | excel | Excel 帳票 |
| dto | object | 内部 DTO |

---

## 本文構成

推奨構成:

```text
# <data object name>

## Summary

## Format

## Records

## Fields

## Notes
```

### 実質的な最小構成

通常データであれば、以下があれば十分です。

```text
# <data object name>

## Summary

## Fields

## Notes
```

### Optional

以下は必要な場合だけ記述します。

- `Format`
  - ファイル、payload、電文、帳票などの詳細形式を説明したい場合
- `Records`
  - 固定長マルチレコード、ヘッダ・明細・トレーラ、EDI セグメントなどを表す場合

### parser 方針

推奨順序は上記としますが、parser / validator はセクション順序に厳密依存しない方針とします。

---

## Summary

data_object の目的、利用箇所、受け渡し元・受け渡し先などを自然言語で記述します。

### 例

```markdown
## Summary

請求締め条件入力画面から、注文締め請求作成処理へ渡す条件データ。
画面項目をそのまま渡す項目と、画面状態から導出する項目を含む。
```

---

## Format

ファイル・電文・payload・帳票などの形式詳細を記述します。

`data_format` は frontmatter に持ちます。  
`## Format` は、その形式に関する詳細仕様を本文で説明するセクションです。

### 形式

Markdown テーブルを推奨します。

### 列

- `key`
- `value`
- `notes`

### 例: 固定長

```markdown
## Format

| key | value | notes |
|---|---|---|
| data_format | fixed | 固定長 |
| encoding | Shift_JIS | 連携先仕様 |
| line_ending | CRLF | Windows 系改行 |
| record_length | 120 | 1 レコード 120 バイト |
| record_type_position | 1-1 | レコード区分位置 |
| padding | space | 文字列は右スペース埋め |
| numeric_padding | zero | 数値は左ゼロ埋め |
```

### 例: CSV

```markdown
## Format

| key | value | notes |
|---|---|---|
| data_format | csv | CSV |
| encoding | UTF-8 |  |
| delimiter | , | カンマ区切り |
| quote | double_quote | ダブルクォート |
| has_header | true | 1 行目ヘッダあり |
| line_ending | LF |  |
```

### 例: 独自区切り

```markdown
## Format

| key | value | notes |
|---|---|---|
| data_format | delimited | 独自区切り |
| encoding | Shift_JIS |  |
| delimiter | \\|^ | 独自区切り文字 |
| escape | backslash |  |
| has_header | false |  |
```

### 例: Excel

```markdown
## Format

| key | value | notes |
|---|---|---|
| data_format | excel | Excel 帳票 |
| sheet | Invoice | 請求書シート |
| template | invoice_template.xlsx | 帳票テンプレート |
```

---

## Records

固定長マルチレコード、ヘッダ・明細・トレーラ構造、EDI セグメント構造などを記述します。

`Records` は Optional です。  
通常の object / json / form / query では不要です。

### 列

- `record_type`
- `name`
- `occurrence`
- `notes`

### 意味

- `record_type`
  - レコード区分、セグメント ID、行種別など
- `name`
  - レコード種別名
- `occurrence`
  - 出現回数
  - 例: `1`, `0..1`, `1..*`, `0..*`
- `notes`
  - 補足

### 例

```markdown
## Records

| record_type | name | occurrence | notes |
|---|---|---|---|
| 1 | ヘッダレコード | 1 | ファイル先頭に 1 件 |
| 2 | 明細レコード | 1..* | 振込先ごとに複数件 |
| 8 | トレーラレコード | 1 | 件数・金額合計 |
| 9 | エンドレコード | 1 | ファイル終端 |
```

### 補足

- `record_type` は `Fields.record_type` と対応する
- 固定長ファイルでは `record_type_position` を `## Format` に書くと分かりやすい
- EDI では `record_type` を segment ID として扱ってよい

---

## Fields

data_object の項目を記述します。

`Fields` は以下の 2 系統を許容します。

1. Standard Fields
2. File Layout Fields

どちらも `## Fields` という同じセクション名を使います。  
parser は列名を見て判定します。

---

## Standard Fields

内部 DTO、画面フォーム値、検索条件、API payload、JSON / XML などで使う標準形です。

### 列

- `name`
- `label`
- `type`
- `length`
- `required`
- `path`
- `ref`
- `notes`

### 意味

- `name`
  - 項目名
  - Qualified Ref の member 候補
- `label`
  - 表示名・論理名
- `type`
  - データ型
- `length`
  - 長さ、桁数、最大長
- `required`
  - 必須有無
- `path`
  - JSONPath / XPath / object path など
- `ref`
  - 関連する er_entity column / class attribute / codeset / 他 data_object field など
- `notes`
  - 補足

### 例

```markdown
## Fields

| name | label | type | length | required | path | ref | notes |
|---|---|---|---:|---|---|---|---|
| close_date | 締め日 | date |  | Y | $.closeDate |  |  |
| customer_id | 顧客ID | string | 20 | N | $.customer.id | [[../er/ENT-CUSTOMER\\|顧客]].customer_id |  |
| order_status | 注文ステータス | string | 20 | N | $.orderStatus | [[../codeset/CODE-ORDER-STATUS\\|注文ステータス]] |  |
```

### path の例

| data_format | path 例 | notes |
|---|---|---|
| object | `order.customer_id` | object path |
| json | `$.order.customer_id` | JSONPath |
| json | `$.order.items[].item_code` | 配列 |
| xml | `/Order/CustomerId` | XPath |
| form | `customer_id` | form field name |
| query | `customer_id` | query parameter |

---

## File Layout Fields

固定長、CSV、TSV、独自区切り、EDI、Excel 帳票などで使うレイアウト重視の形です。

### 列

- `record_type`
- `no`
- `name`
- `label`
- `type`
- `length`
- `required`
- `position`
- `field_format`
- `ref`
- `notes`

### 意味

- `record_type`
  - 所属するレコード区分
  - `Records.record_type` と対応する
  - 単一レコード形式では空欄でもよい
- `no`
  - 項目順
  - CSV / TSV / 固定長での並び順
- `name`
  - 項目名
  - Qualified Ref の member 候補
- `label`
  - 表示名・論理名
- `type`
  - データ型
- `length`
  - 固定長の長さ、最大長、桁数
- `required`
  - 必須有無
- `position`
  - 固定長の桁位置、CSV の列番号、Excel のセル位置など
- `field_format`
  - 項目単位の編集形式
  - 日付形式、ゼロ埋め、固定値など
- `ref`
  - 関連する er_entity column / class attribute / codeset / 他 data_object field など
- `notes`
  - 補足

### field_format について

frontmatter の `data_format` や本文の `## Format` と混同しないよう、項目単位の形式は `field_format` とします。

例:

- `yyyyMMdd`
- `zero_pad_left`
- `space_pad_right`
- `fixed:H`
- `decimal_2`
- `half_width_kana`

### 例: 固定長マルチレコード

```markdown
## Fields

| record_type | no | name | label | type | length | required | position | field_format | ref | notes |
|---|---:|---|---|---|---:|---|---|---|---|---|
| 1 | 1 | record_type | レコード区分 | string | 1 | Y | 1-1 | fixed:1 |  | ヘッダ |
| 1 | 2 | company_code | 会社コード | string | 10 | Y | 2-11 | zero_pad_left |  |  |
| 1 | 3 | transfer_date | 振込日 | date | 8 | Y | 12-19 | yyyyMMdd |  |  |
| 2 | 1 | record_type | レコード区分 | string | 1 | Y | 1-1 | fixed:2 |  | 明細 |
| 2 | 2 | bank_code | 銀行コード | string | 4 | Y | 2-5 | zero_pad_left |  |  |
| 2 | 3 | branch_code | 支店コード | string | 3 | Y | 6-8 | zero_pad_left |  |  |
| 2 | 4 | account_no | 口座番号 | string | 7 | Y | 9-15 | zero_pad_left |  |  |
| 2 | 5 | amount | 振込金額 | number | 10 | Y | 16-25 | zero_pad_left | [[../er/ENT-INVOICE-CANDIDATE\\|請求予定]].total_amount | 円単位 |
| 8 | 1 | record_type | レコード区分 | string | 1 | Y | 1-1 | fixed:8 |  | トレーラ |
| 8 | 2 | total_count | 合計件数 | number | 6 | Y | 2-7 | zero_pad_left |  | 明細件数 |
| 8 | 3 | total_amount | 合計金額 | number | 12 | Y | 8-19 | zero_pad_left |  | 明細金額合計 |
| 9 | 1 | record_type | レコード区分 | string | 1 | Y | 1-1 | fixed:9 |  | エンド |
```

### 例: CSV

```markdown
## Fields

| record_type | no | name | label | type | length | required | position | field_format | ref | notes |
|---|---:|---|---|---|---:|---|---|---|---|---|
|  | 1 | customer_id | 顧客ID | string | 20 | Y | 1 |  | [[../er/ENT-CUSTOMER\\|顧客]].customer_id |  |
|  | 2 | customer_name | 顧客名 | string | 100 | Y | 2 |  | [[../er/ENT-CUSTOMER\\|顧客]].customer_name |  |
|  | 3 | amount | 金額 | number | 12 | Y | 3 | decimal_0 |  | 円単位 |
```

### 例: Excel

```markdown
## Fields

| record_type | no | name | label | type | length | required | position | field_format | ref | notes |
|---|---:|---|---|---|---:|---|---|---|---|---|
|  | 1 | invoice_date | 請求日 | date |  | Y | Invoice!B3 | yyyy/MM/dd |  |  |
|  | 2 | customer_name | 顧客名 | string | 100 | Y | Invoice!B5 |  | [[../er/ENT-CUSTOMER\\|顧客]].customer_name |  |
|  | 3 | total_amount | 合計金額 | number | 12 | Y | Invoice!E20 | currency | [[../er/ENT-INVOICE-CANDIDATE\\|請求予定]].total_amount |  |
```

---

## Qualified Ref / Member Ref

`data_object` では、`Fields.name` を Qualified Ref の member 候補として扱います。

例:

```markdown
[[data/DATA-INVOICE-CLOSE-CONDITION\\|請求締め条件]].close_date
[[data/DATA-BANK-TRANSFER-FILE\\|銀行振込固定長ファイル]].amount
```

member 解決候補:

- `Fields.name`

### record_type 付き Fields の扱い

マルチレコード形式では、同じ `name` が複数の `record_type` に出ることがあります。  
例: `record_type`, `total_amount`

このため、V0.7 時点では以下の方針とします。

- `Fields.name` は member 候補にする
- 同じ `name` が複数 record_type に存在する場合は Warning としてよい
- 将来的には `record_type.name` の Qualified Ref を検討する
  - 例: `[[data/DATA-BANK-TRANSFER-FILE\\|銀行振込固定長ファイル]].2.amount`
  - 例: `[[data/DATA-BANK-TRANSFER-FILE\\|銀行振込固定長ファイル]].detail.amount`

V0.7 時点では、通常の member ref は `Fields.name` までとします。

---

## Screen との関係

Screen の `Fields.ref` から data_object の field を参照できます。

例:

```markdown
| id | label | kind | data_type | required | ref | rule | notes |
|---|---|---|---|---|---|---|---|
| close_date | 締め日 | input | date | Y | [[data/DATA-INVOICE-CLOSE-CONDITION\\|請求締め条件]].close_date | [[rule/RULE-INVOICE-CLOSE-DATE\\|請求締め日判定]] |  |
```

---

## app_process との関係

app_process の `Inputs.data` / `Outputs.data` から data_object を参照できます。

例:

```markdown
| id | data | source | required | notes |
|---|---|---|---|---|
| IN-CLOSE-CONDITION | [[data/DATA-INVOICE-CLOSE-CONDITION\\|請求締め条件]] | [[screen/SCR-INVOICE-CLOSE-ENTRY\\|請求締め条件入力画面]] | Y |  |
```

---

## DFD との関係

DFD の `Flows.data` から data_object を参照できます。

例:

```markdown
| id | from | to | data | notes |
|---|---|---|---|---|
| FLOW-ORDER | [[dfd/DFD-EXT-CUSTOMER\\|顧客]] | [[dfd/DFD-PROC-ORDER-RECEIVE\\|注文受付]] | [[data/DATA-ORDER-REQUEST\\|注文依頼]] |  |
```

---

## Mapping との関係

Mapping の `source_ref` / `target_ref` から data_object field を参照できます。

例:

```markdown
| source_ref | target_ref | transform | rule | required | notes |
|---|---|---|---|---|---|
| [[data/DATA-INVOICE-CANDIDATE\\|請求予定データ]].customer_id | [[er/ENT-INVOICE-CANDIDATE\\|請求予定]].customer_id | そのまま設定 |  | Y | 顧客ID |
```

---

## Validation 方針（案）

### Error 候補

- frontmatter の `id` がない
- frontmatter の `name` がない
- `Fields.name` が空
- `Fields.name` が重複
  - ただし `record_type` が異なる場合は Warning に留めてもよい
- `Fields.ref` の参照未解決
- `Fields.ref` の Qualified Ref member 未解決
- `data_format: fixed` で `record_length` が空
- `data_format: fixed` で File Layout Fields の `position` が空
- `Records.record_type` が重複
- `Fields.record_type` が `Records.record_type` に存在しない

### Warning 候補

- `data_format` が空
- `kind` が空
- `Fields.label` が空
- `Fields.type` が空
- `Fields.required` が `Y` / `N` 以外
- `Fields.length` が数値でない
- `Fields.no` が重複
- `Fields.position` が重複
- `data_format: fixed` で record_type ごとの length 合計が `record_length` と一致しない
- `data_format: csv` / `tsv` / `delimited` で `delimiter` が空
- `data_format: csv` / `tsv` / `delimited` で `no` が重複
- Standard Fields と File Layout Fields の列が混在している

---

## 完成例: 通常データ

```markdown
---
type: data_object
id: DATA-INVOICE-CLOSE-CONDITION
name: 請求締め条件
kind: request
data_format: object
tags:
  - DataObject
  - Invoice
---

# 請求締め条件

## Summary

請求締め条件入力画面から、注文締め請求作成処理へ渡す条件データ。

## Fields

| name | label | type | length | required | path | ref | notes |
|---|---|---|---:|---|---|---|---|
| close_date | 締め日 | date |  | Y | $.closeDate |  |  |
| target_from_date | 対象開始日 | date |  | Y | $.targetFromDate |  |  |
| target_to_date | 対象終了日 | date |  | Y | $.targetToDate |  |  |
| customer_id | 顧客ID | string | 20 | N | $.customer.id | [[er/ENT-CUSTOMER\\|顧客]].customer_id |  |
| order_status | 注文ステータス | string | 20 | N | $.orderStatus | [[codeset/CODE-ORDER-STATUS\\|注文ステータス]] |  |

## Notes

- 画面入力から生成する。
```

---

## 完成例: 固定長マルチレコード

```markdown
---
type: data_object
id: DATA-BANK-TRANSFER-FILE
name: 銀行振込固定長ファイル
kind: file
data_format: fixed
encoding: Shift_JIS
line_ending: CRLF
record_length: 120
tags:
  - DataObject
  - File
---

# 銀行振込固定長ファイル

## Summary

銀行振込依頼を連携する固定長ファイル。
ヘッダ、明細、トレーラ、エンドの複数レコードで構成する。

## Format

| key | value | notes |
|---|---|---|
| data_format | fixed | 固定長 |
| encoding | Shift_JIS | 連携先仕様 |
| line_ending | CRLF | Windows 系改行 |
| record_length | 120 | 全レコード共通 |
| record_type_position | 1-1 | レコード区分位置 |
| padding | space | 文字列は右スペース埋め |
| numeric_padding | zero | 数値は左ゼロ埋め |

## Records

| record_type | name | occurrence | notes |
|---|---|---|---|
| 1 | ヘッダレコード | 1 | ファイル先頭に 1 件 |
| 2 | 明細レコード | 1..* | 振込先ごとに複数件 |
| 8 | トレーラレコード | 1 | 件数・金額合計 |
| 9 | エンドレコード | 1 | ファイル終端 |

## Fields

| record_type | no | name | label | type | length | required | position | field_format | ref | notes |
|---|---:|---|---|---|---:|---|---|---|---|---|
| 1 | 1 | record_type | レコード区分 | string | 1 | Y | 1-1 | fixed:1 |  | ヘッダ |
| 1 | 2 | company_code | 会社コード | string | 10 | Y | 2-11 | zero_pad_left |  |  |
| 1 | 3 | transfer_date | 振込日 | date | 8 | Y | 12-19 | yyyyMMdd |  |  |
| 2 | 1 | record_type | レコード区分 | string | 1 | Y | 1-1 | fixed:2 |  | 明細 |
| 2 | 2 | bank_code | 銀行コード | string | 4 | Y | 2-5 | zero_pad_left |  |  |
| 2 | 3 | branch_code | 支店コード | string | 3 | Y | 6-8 | zero_pad_left |  |  |
| 2 | 4 | account_no | 口座番号 | string | 7 | Y | 9-15 | zero_pad_left |  |  |
| 2 | 5 | amount | 振込金額 | number | 10 | Y | 16-25 | zero_pad_left | [[er/ENT-INVOICE-CANDIDATE\\|請求予定]].total_amount | 円単位 |
| 8 | 1 | record_type | レコード区分 | string | 1 | Y | 1-1 | fixed:8 |  | トレーラ |
| 8 | 2 | total_count | 合計件数 | number | 6 | Y | 2-7 | zero_pad_left |  | 明細件数 |
| 8 | 3 | total_amount | 合計金額 | number | 12 | Y | 8-19 | zero_pad_left |  | 明細金額合計 |
| 9 | 1 | record_type | レコード区分 | string | 1 | Y | 1-1 | fixed:9 |  | エンド |

## Notes

- 固定長の正確な byte length は文字コードと半角・全角の扱いに依存するため、必要に応じて連携先仕様を確認する。
```

---

## 非対応 / 後続検討

V0.7 時点では以下を必須にしません。

- 完全な JSON Schema 互換
- 完全な XML Schema 互換
- 固定長ファイルの自動生成
- CSV / 固定長の実ファイル parse
- EDI の標準仕様完全対応
- Excel の実セル読み取り
- `record_type.name` 形式の member ref
- nested object の完全な構造化表現
