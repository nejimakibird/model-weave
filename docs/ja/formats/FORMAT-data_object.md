# FORMAT-data_object

English Version: [English](../../formats/FORMAT-data_object.md)

## 何に使うフォーマットか

`data_object` は、Model Weaveで使う論理データ構造、メッセージレイアウト、ファイルレイアウト、フォーム値、APIペイロード、帳票レイアウト、処理の入力 / 出力などを定義するためのフォーマットです。

次のような内容を記述するときに使います。

* DFDのフローで流れるデータ
* 画面の入力値 / 出力値
* `app_process` の入力 / 出力データ
* APIリクエスト / レスポンスペイロード
* JSON / XML ペイロード
* CSV / TSV / 区切り文字ファイル
* 固定長ファイル
* 複数レコードを持つ固定長ファイル
* EDI風のセグメント構造
* Excel風の帳票構造
* DTO、値オブジェクト、検索条件、処理結果

`data_object` は、画面、処理、DFDフロー、ERエンティティ、マッピング、ソースコード参照をつなぐためのデータ定義です。

主目的は図ではありません。
レビュー、参照チェック、フィールド補完、AI支援モデリングのために使う構造化されたデータ定義です。

## 重要な考え方: 論理データと物理ファイルレイアウト

`data_object` は、関連する2つの用途に対応します。

### 論理データ構造

データの意味や構造を表したい場合に使います。

例:

* APIリクエスト
* APIレスポンス
* フォーム値
* 検索条件
* 内部DTO
* インターフェースペイロード
* 処理結果

論理データでは、通常の `## Fields` テーブルを使います。

### 物理ファイルレイアウト

ファイルの物理的なレイアウトを表したい場合に使います。

例:

* 固定長ファイル
* CSVファイル
* TSVファイル
* インポート / エクスポートファイル
* 外部システム連携ファイル
* EDI風のセグメントファイル
* Excel帳票レイアウト

物理ファイルレイアウトでは、必要に応じて `## Format`, `## Records`, ファイルレイアウト用の `## Fields` を使います。

この区別は重要です。コマンドも分かれています。

* `Model Weave: Insert Data Object Template`: 論理データ構造用
* `Model Weave: Insert Data Object File Layout Template`: 物理ファイルレイアウト用

## 最小例: 論理データ

```markdown
---
type: data_object
id: DATA-ORDER-REQUEST
name: Order Request
kind: request
data_format: json
tags:
  - DataObject
---

# Order Request

## Summary

API request payload for creating an order.

## Fields

| name | label | type | length | required | path | ref | notes |
|---|---|---|---:|---|---|---|---|
| order_id | Order ID | string | 20 | Y | $.orderId | [[ENT-ORDER]].order_id |  |
| customer_id | Customer ID | string | 20 | Y | $.customer.id | [[ENT-CUSTOMER]].customer_id |  |
```

## 最小例: ファイルレイアウト

```markdown
---
type: data_object
id: DATA-BANK-TRANSFER-FILE
name: Bank Transfer Fixed-Length File
kind: file
data_format: fixed
encoding: Shift_JIS
line_ending: CRLF
record_length: 120
tags:
  - DataObject
  - File
---

# Bank Transfer Fixed-Length File

## Summary

Fixed-length file for bank transfer export.

## Format

| key | value | notes |
|---|---|---|
| data_format | fixed | fixed-length file |
| encoding | Shift_JIS | partner specification |
| line_ending | CRLF | Windows line ending |
| record_length | 120 | 120 bytes per record |

## Fields

| record_type | no | name | label | type | length | required | position | field_format | ref | notes |
|---|---:|---|---|---|---:|---|---|---|---|---|
| 1 | 1 | record_type | Record Type | string | 1 | Y | 1-1 | fixed:1 |  | header |
| 1 | 2 | company_code | Company Code | string | 10 | Y | 2-11 | zero_pad_left |  |  |
```

## Frontmatter

必須項目:

| field  | required | notes                 |
| ------ | -------- | --------------------- |
| `type` | yes      | `data_object` を指定します。 |
| `id`   | yes      | 一意のデータオブジェクトモデルIDです。  |
| `name` | yes      | データオブジェクトの表示名です。      |

任意項目:

| field           | notes                                                       |
| --------------- | ----------------------------------------------------------- |
| `kind`          | データの用途です。例: `request`, `response`, `file`, `form`, `dto`。   |
| `data_format`   | 表現形式です。例: `object`, `json`, `xml`, `csv`, `fixed`, `excel`。 |
| `encoding`      | ファイルの文字コードです。例: `UTF-8`, `Shift_JIS`。                       |
| `delimiter`     | CSV / TSV / 区切り文字ファイルの区切り文字です。                              |
| `line_ending`   | 改行コードです。例: `LF`, `CRLF`。                                    |
| `has_header`    | ヘッダー行の有無です。                                                 |
| `record_length` | 固定長ファイルのレコード長です。                                            |
| `render_mode`   | 通常は不要です。data_objectは主に構造化詳細ビューとして扱います。                      |
| `tags`          | Obsidian / Markdown のタグです。                                  |

### 想定される `kind` 値

`kind` は、そのデータが何に使われるかを表します。

代表的な値:

* `data`
* `dto`
* `request`
* `response`
* `payload`
* `file`
* `form`
* `query`
* `result`
* `report`
* `message`
* `other`

### 想定される `data_format` 値

`data_format` は、そのデータがどのように表現されるかを表します。

代表的な値:

* `object`
* `json`
* `xml`
* `csv`
* `tsv`
* `fixed`
* `delimited`
* `excel`
* `edi`
* `binary`
* `form`
* `query`
* `other`

## kind と data_format の違い

`kind` と `data_format` は役割が異なります。

| field         | meaning            |
| ------------- | ------------------ |
| `kind`        | そのデータが何に使われるか。     |
| `data_format` | そのデータがどのように表現されるか。 |

例:

| kind       | data_format | Meaning       |
| ---------- | ----------- | ------------- |
| `request`  | `json`      | APIリクエストペイロード |
| `response` | `json`      | APIレスポンスペイロード |
| `form`     | `object`    | 画面フォーム値       |
| `query`    | `object`    | 検索条件          |
| `file`     | `csv`       | CSVファイル       |
| `file`     | `fixed`     | 固定長ファイル       |
| `report`   | `excel`     | Excel帳票       |
| `dto`      | `object`    | 内部DTO         |

## セクション

推奨構成:

```text
# <data object name>

## Summary

## Format

## Records

## Fields

## Source Links

## Notes
```

通常の論理データでの最小構成:

```text
# <data object name>

## Summary

## Fields
```

`## Format` と `## Records` は任意です。必要な場合のみ使用します。

### Summary

`## Summary` には、データオブジェクトの目的、入力元、出力先、利用文脈などを記述します。

このセクションは自由記述です。

### Format

`## Format` は、ファイル全体、ペイロード全体、メッセージ全体、帳票全体の性質を記述するために使います。

期待されるヘッダー:

```markdown
| key | value | notes |
|---|---|---|
```

列の意味:

| column  | meaning       |
| ------- | ------------- |
| `key`   | フォーマット属性名です。  |
| `value` | フォーマット属性の値です。 |
| `notes` | 任意の補足説明です。    |

例:

```markdown
## Format

| key | value | notes |
|---|---|---|
| data_format | csv | CSV |
| encoding | UTF-8 |  |
| delimiter | , | comma-separated |
| quote | double_quote | double quote |
| has_header | true | first row is header |
| line_ending | LF |  |
```

### Records

`## Records` は、複数レコードを持つ固定長ファイル、ヘッダー / 明細 / トレーラー構造、EDI風のセグメント構造を表すために使います。

期待されるヘッダー:

```markdown
| record_type | name | occurrence | notes |
|---|---|---|---|
```

列の意味:

| column        | meaning                         |
| ------------- | ------------------------------- |
| `record_type` | レコード種別コード、またはセグメントIDです。         |
| `name`        | レコード名 / セグメント名です。               |
| `occurrence`  | `1`, `0..1`, `1..*` などの出現ルールです。 |
| `notes`       | 任意の補足説明です。                      |

例:

```markdown
## Records

| record_type | name | occurrence | notes |
|---|---|---|---|
| 1 | Header Record | 1 | first record |
| 2 | Detail Record | 1..* | repeated details |
| 8 | Trailer Record | 1 | totals |
| 9 | End Record | 1 | file terminator |
```

### Fields

`## Fields` は、`data_object` の中心となるセクションです。

`## Fields` には、2種類のテーブルがあります。

1. Standard Fields
2. File Layout Fields

1つの `## Fields` テーブル内で、2種類のヘッダーを混在させないでください。

#### Standard Fields

Standard Fields は、DTO、フォーム値、検索条件、APIペイロード、JSON/XMLペイロード、通常の論理オブジェクトに使います。

期待されるヘッダー:

```markdown
| name | label | type | length | required | path | ref | notes |
|---|---|---|---:|---|---|---|---|
```

列の意味:

| column     | meaning                                     |
| ---------- | ------------------------------------------- |
| `name`     | フィールド名です。メンバー参照候補にもなります。                    |
| `label`    | 人間向けの表示ラベルです。                               |
| `type`     | フィールド型です。単純なスカラー型を推奨します。                    |
| `length`   | 長さ / 精度です。該当しない場合は空欄にします。                   |
| `required` | `Y` または `N` を指定します。                         |
| `path`     | JSONPath、XML path、フォームパス、論理パスなどです。          |
| `ref`      | ER項目、CodeSet、別data_object、その他モデル要素への任意参照です。 |
| `notes`    | 任意の補足説明です。                                  |

例:

```markdown
## Fields

| name | label | type | length | required | path | ref | notes |
|---|---|---|---:|---|---|---|---|
| order_id | Order ID | string | 20 | Y | $.orderId | [[ENT-ORDER]].order_id |  |
| customer_id | Customer ID | string | 20 | Y | $.customer.id | [[ENT-CUSTOMER]].customer_id |  |
| order_status | Order Status | string | 20 | N | $.status | [[CODE-ORDER-STATUS]] |  |
```

#### File Layout Fields

File Layout Fields は、固定長ファイル、CSV、TSV、区切り文字ファイル、EDI風セグメント、Excel風帳票に使います。

期待されるヘッダー:

```markdown
| record_type | no | name | label | type | length | required | position | field_format | ref | notes |
|---|---:|---|---|---|---:|---|---|---|---|---|
```

列の意味:

| column         | meaning                                     |
| -------------- | ------------------------------------------- |
| `record_type`  | レコード種別コード、またはセグメントIDです。                     |
| `no`           | レコード内での項目順です。                               |
| `name`         | フィールド名です。                                   |
| `label`        | 人間向けの表示ラベルです。                               |
| `type`         | フィールド型です。                                   |
| `length`       | フィールド長です。                                   |
| `required`     | `Y` または `N` を指定します。                         |
| `position`     | `1-10`、Excelセル範囲、列番号などの物理位置です。              |
| `field_format` | 項目単位のフォーマット、パディング、日付形式、固定値などです。             |
| `ref`          | ER項目、CodeSet、別data_object、その他モデル要素への任意参照です。 |
| `notes`        | 任意の補足説明です。                                  |

例:

```markdown
## Fields

| record_type | no | name | label | type | length | required | position | field_format | ref | notes |
|---|---:|---|---|---|---:|---|---|---|---|---|
| 1 | 1 | record_type | Record Type | string | 1 | Y | 1-1 | fixed:1 |  | header |
| 1 | 2 | company_code | Company Code | string | 10 | Y | 2-11 | zero_pad_left |  |  |
| 2 | 1 | record_type | Record Type | string | 1 | Y | 1-1 | fixed:2 |  | detail |
| 2 | 2 | amount | Amount | number | 10 | Y | 16-25 | zero_pad_left | [[ENT-INVOICE]].total_amount | yen |
```

代表的な `field_format` 値:

* `yyyyMMdd`
* `zero_pad_left`
* `space_pad_right`
* `fixed:H`
* `decimal_2`
* `half_width_kana`

### Source Links

`## Source Links` は任意セクションです。

データオブジェクトを、ソースコード、インターフェース仕様、スキーマファイル、サンプルファイル、CSV定義、マッピング資料、テストデータなどへ結びつけるために使います。

期待されるヘッダー:

```markdown
| path | notes |
|---|---|
```

例:

```markdown
## Source Links

| path | notes |
|---|---|
| specs/order-request.json | API payload specification |
| src/order/dto/CreateOrderRequest.ts | DTO implementation |
| testdata/order-request-sample.json | Sample payload |
```

詳細は [共通セクション](FORMAT-common-sections.md) を参照してください。

### Notes

`## Notes` は自由記述の設計メモに使います。

追加情報を保存するために、構造化テーブルへ未対応の列を追加しないでください。
補足情報は `notes`, `## Notes`, `## Source Links` のいずれかに記述してください。

## テーブル

### Format table

```markdown
| key | value | notes |
|---|---|---|
```

### Records table

```markdown
| record_type | name | occurrence | notes |
|---|---|---|---|
```

### Standard Fields table

```markdown
| name | label | type | length | required | path | ref | notes |
|---|---|---|---:|---|---|---|---|
```

### File Layout Fields table

```markdown
| record_type | no | name | label | type | length | required | position | field_format | ref | notes |
|---|---:|---|---|---|---:|---|---|---|---|---|
```

### Source Links table

```markdown
| path | notes |
|---|---|
```

## Qualified Ref / Member Ref

`Fields.name` はメンバー参照候補になります。

例:

```markdown
[[DATA-ORDER-REQUEST]].order_id
[[DATA-BANK-TRANSFER-FILE]].amount
```

複数レコードファイルでは、同じ `name` が複数の `record_type` に出現する場合があります。
現在仕様では、`Fields.name` がデフォルトのメンバー候補です。

複数レコード間で名前が重複する場合は、警告対象になる可能性があります。

将来的に `record_type.name` 形式の参照をサポートする可能性はありますが、実装が対応していない限り、実装済み機能として記述しないでください。

## 他フォーマットとの関係

`data_object` は、他のフォーマットからよく参照されます。

例:

* Screenの項目がdata_object項目を参照する
* `app_process` の `Inputs.data` / `Outputs.data` がdata_objectを参照する
* DFDの `Flows.data` がdata_objectを参照する
* Mappingのsource / targetがdata_object項目を参照する
* `ref` 列がER項目やCodeSet値を指す

## よくあるミス

### Data Object と ER Entity を混同する

データベーステーブルや物理DBカラムを定義する場合は `er_entity` を使います。

ペイロード、DTO、フォーム値、インターフェースファイル、メッセージ、処理の入出力データには `data_object` を使います。

data_object は ER項目を参照できますが、ERエンティティ定義の代わりではありません。

### Standard Fields と File Layout Fields を混在させる

1つのテーブル内で、2種類の `## Fields` ヘッダーを混ぜないでください。

論理データには Standard Fields を使います。
物理ファイルや位置が重要なレイアウトには File Layout Fields を使います。

### 未対応の列を追加する

FORMATが明示的に定義していない限り、`description`, `source`, `target`, `rule`, `format` などの列を追加しないでください。

補足情報は `notes`, `## Notes`, `## Format` に記述してください。

### 危険な型表現を使う

`type` では複雑な型表現を避けます。

危険な例:

* `string[]`
* `Array<string>`
* `Optional<string>`
* `string | null`

単純な型名を推奨します。

* `string`
* `number`
* `boolean`
* `date`
* `datetime`

複数性、任意性、特殊制約は `notes` に記述してください。

### テーブル内でWikilinkエイリアスを使う

避ける例:

```markdown
[[ENT-ORDER|Order]]
```

推奨:

```markdown
[[ENT-ORDER]]
```

表示上の意味は `label` または `notes` に記述してください。

### テーブルセル内で生のパイプ文字を使う

避ける例:

```text
A | B | C
string | null
```

推奨:

```text
A / B / C
string
```

## AI生成時の注意

AIで `data_object` ファイルを生成する場合は、次の点に注意してください。

* `type: data_object` を使う。
* 1ファイルで1つのデータ構造、ペイロード、ファイル、帳票を定義する。
* 用途に応じて `kind` を選ぶ。
* 表現形式に応じて `data_format` を選ぶ。
* テーブルヘッダーを正確に保つ。
* 未対応の列を追加しない。
* 1つのテーブル内で Standard Fields と File Layout Fields を混ぜない。
* 論理データ構造には Standard Fields を使う。
* 物理ファイルレイアウトには File Layout Fields を使う。
* ファイル全体やペイロード全体のメタ情報には `## Format` を使う。
* レコード種別やセグメントが必要な場合だけ `## Records` を使う。
* 単純なスカラー型を使う。
* `required` は `Y` または `N` を使う。
* ER項目、CodeSet値、他モデル参照が有用な場合は `ref` を使う。
* 補足説明は `notes` または `## Notes` に書く。
* インターフェース仕様、スキーマ、ソースファイル、サンプルファイル、テストデータには `## Source Links` を使う。

AIがソースコード、スキーマ、インターフェース仕様からdata_objectを作成した場合は、次を確認してください。

* フィールド名
* 必須フラグ
* パス
* 物理位置
* レコード種別
* フィールド参照
* Source Links

## 関連サンプル

* [Inventory search condition](../../../samples/data/DATA-INVENTORY-SEARCH-CONDITION.md)
* [Inventory search result](../../../samples/data/DATA-INVENTORY-SEARCH-RESULT.md)
* [Data samples index](../../../samples/data/README.md)

## 関連フォーマット

* [er_entity](FORMAT-er_entity.md)
* [app_process](FORMAT-app_process.md)
* [mapping](FORMAT-mapping.md)
* [codeset](FORMAT-codeset.md)
* [共通セクション](FORMAT-common-sections.md)
