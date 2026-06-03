# FORMAT-mapping

English Version: [English](../../formats/FORMAT-mapping.md)

## 何に使うフォーマットか

`mapping` は、ある構造から別の構造へデータをどのように変換・転記するかを定義するためのフォーマットです。

次のような内容を記述するときに使います。

* source-to-target の項目マッピング
* APIリクエスト / レスポンス変換
* ファイル取込マッピング
* ファイル出力マッピング
* screen から process へのデータ受け渡し
* process から database へのデータマッピング
* database から DTO へのマッピング
* data object から data object への変換
* ER entity から data object へのマッピング
* CodeSet値変換
* rule に基づく変換

`mapping` ファイルを使うと、データの移動を明示できます。

項目の漏れ、重複、変換、条件付きマッピングをレビューしやすくなります。

## 重要な考え方: mapping は既存モデル要素をつなぐ

`mapping` は、通常、既存のモデル要素同士をつなぐために使います。

代表的な source / target は次の通りです。

* `data_object` の項目
* `er_entity` のカラム
* screen fields
* app_process inputs / outputs
* CodeSet values
* 外部インターフェース項目

mapping は source や target の定義そのものを置き換えるものではありません。

使い分けは次の通りです。

* `data_object`: ペイロード、ファイル、DTO、process dataを定義する
* `er_entity`: データベーステーブルとカラムを定義する
* `screen`: UI項目を定義する
* `app_process`: process inputs / outputs を定義する
* `rule`: 再利用可能なロジックを定義する
* `mapping`: それらの間で値がどう移動するかを定義する

## 重要な考え方: transformation と rule

`mapping` は、項目単位のデータ移動と変換を記述します。

`rule` は、再利用可能な業務ロジックを記述します。

変換ロジックが複雑、または再利用される場合、mapping row から rule を参照できます。

例:

* Mapping: `source.customer_id` を `target.customer_id` に写す
* Mapping: `source.status` を `target.inventory_status` に写す
* Rule: status conversion rule
* Rule: amount calculation rule

大きな業務ルールを mapping table に直接書かないでください。
必要に応じて `rule` に分け、mapping から参照します。

## 最小例

```markdown
---
type: mapping
id: MAP-ORDER-REQUEST-TO-ENTITY
name: Order Request to Entity Mapping
kind: transform
tags:
  - Mapping
---

# Order Request to Entity Mapping

## Summary

Maps order request fields to the order entity.

## Scope

| role | ref | notes |
|---|---|---|
| source | [[DATA-ORDER-REQUEST]] | API request payload |
| target | [[ENT-ORDER]] | Order table |

## Mappings

| source_ref | target_ref | transform | rule | required | notes |
|---|---|---|---|---|---|
| [[DATA-ORDER-REQUEST]].order_id | [[ENT-ORDER]].order_id | copy |  | Y |  |
| [[DATA-ORDER-REQUEST]].customer_id | [[ENT-ORDER]].customer_id | copy |  | Y |  |
```

## 詳細例

```markdown
---
type: mapping
id: MAP-INVENTORY-IMPORT
name: Inventory Import Mapping
kind: import
tags:
  - Mapping
  - WMS
---

# Inventory Import Mapping

## Summary

Maps an external inventory CSV file to inventory-related database entities.

## Scope

| role | ref | notes |
|---|---|---|
| source | [[DATA-INVENTORY-IMPORT-FILE]] | External CSV import file |
| target | [[ENT-INVENTORY]] | Inventory table |
| target | [[ENT-STOCK-MOVEMENT]] | Movement history table |

## Mappings

| source_ref | target_ref | transform | rule | required | notes |
|---|---|---|---|---|---|
| [[DATA-INVENTORY-IMPORT-FILE]].shipper_code | [[ENT-INVENTORY]].shipper_id | lookup shipper_id by code | [[RULE-SHIPPER-LOOKUP]] | Y | External code conversion |
| [[DATA-INVENTORY-IMPORT-FILE]].warehouse_code | [[ENT-INVENTORY]].warehouse_id | lookup warehouse_id by code | [[RULE-WAREHOUSE-LOOKUP]] | Y | External code conversion |
| [[DATA-INVENTORY-IMPORT-FILE]].item_code | [[ENT-INVENTORY]].item_id | lookup item_id by code | [[RULE-ITEM-LOOKUP]] | Y | External code conversion |
| [[DATA-INVENTORY-IMPORT-FILE]].quantity | [[ENT-INVENTORY]].quantity | parse decimal |  | Y | Convert text to numeric |
| [[DATA-INVENTORY-IMPORT-FILE]].status | [[ENT-INVENTORY]].inventory_status | convert status | [[RULE-INVENTORY-STATUS-CONVERT]] | Y | Maps external status to CodeSet value |
| [[DATA-INVENTORY-IMPORT-FILE]].quantity | [[ENT-STOCK-MOVEMENT]].movement_quantity | copy when quantity is positive |  | N | Create movement row only when quantity exists |

## Source Links

| path | notes |
|---|---|
| specs/inventory-import.csv.md | Import file specification |
| src/import/InventoryImportMapper.ts | Mapping implementation |
| testdata/inventory-import-sample.csv | Sample import file |

## Notes

- Code conversion rules are kept in separate `rule` files.
- The mapping describes field movement, not the whole import process.
```

## Frontmatter

必須項目:

| field  | required | notes              |
| ------ | -------- | ------------------ |
| `type` | yes      | `mapping` を指定します。  |
| `id`   | yes      | 一意のmappingモデルIDです。 |
| `name` | yes      | mappingの表示名です。     |

任意項目:

| field   | notes                                                                                                                      |
| ------- | -------------------------------------------------------------------------------------------------------------------------- |
| `kind`  | mapping種別です。例: `transform`, `import`, `export`, `copy`, `sync`, `screen_to_process`, `process_to_entity`, `entity_to_dto`。 |
| `tags`  | Obsidian / Markdown のタグです。                                                                                                 |
| `owner` | 任意の所有者、ドメイン、モジュール、チームです。                                                                                                   |

例:

```yaml
---
type: mapping
id: MAP-INVENTORY-IMPORT
name: Inventory Import Mapping
kind: import
tags:
  - Mapping
  - WMS
---
```

## セクション

推奨構成:

```text
# <mapping name>

## Summary

## Scope

## Mappings

## Source Links

## Notes
```

### Summary

`## Summary` には、mappingの目的、方向、起動文脈、対象範囲を記述します。

このセクションは自由記述です。

### Scope

`## Scope` は、mappingで使うsource、target、lookup、context、external modelなどを一覧化するために使います。

期待されるヘッダー:

```markdown
| role | ref | notes |
|---|---|---|
```

列の意味:

| column  | meaning                                                                                 |
| ------- | --------------------------------------------------------------------------------------- |
| `role`  | `source`, `target`, `input`, `output`, `lookup`, `context`, `destination`, `external` などの役割です。 |
| `ref`   | data object、ER entity、screen、process、file、external source、raw value などの参照です。            |
| `notes` | 任意の補足説明です。                                                                      |

例:

```markdown
## Scope

| role | ref | notes |
|---|---|---|
| source | [[DATA-ORDER-REQUEST]] | API request |
| target | [[ENT-ORDER]] | Order table |
| context | current_user | Login user context |
```

### Mappings

`## Mappings` は、項目単位のmapping rowを定義するために使います。

期待されるヘッダー:

```markdown
| source_ref | target_ref | transform | rule | required | notes |
|---|---|---|---|---|---|
```

列の意味:

| column       | meaning                                                                 |
| ------------ | ----------------------------------------------------------------------- |
| `source_ref` | source field、値、式、model referenceです。`[[DATA-ID]].fieldName` のようなmember参照を使えます。 |
| `target_ref` | target field、値、式、model referenceです。`[[DATA-ID]].fieldName` のようなmember参照を使えます。 |
| `transform`  | 変換内容です。`copy`, `format date`, `lookup`, `convert status` などの短い説明を使います。 |
| `rule`       | 変換がrule modelに従う場合の任意の関連 `rule` 参照です。                              |
| `required`   | mappingが必須かどうかを示します。`Y` または `N` を使います。                         |
| `notes`      | 任意の補足説明です。行単位の適用条件も必要に応じてここに書きます。                    |

例:

```markdown
## Mappings

| source_ref | target_ref | transform | rule | required | notes |
|---|---|---|---|---|---|
| [[DATA-ORDER-REQUEST]].order_id | [[ENT-ORDER]].order_id | copy |  | Y |  |
| [[DATA-ORDER-REQUEST]].status | [[ENT-ORDER]].order_status | convert status | [[RULE-ORDER-STATUS-CONVERT]] | Y | Code conversion |
| current_user.user_id | [[ENT-ORDER]].created_by | copy |  | N | Audit field |
```

注意:

* `source_ref` と `target_ref` は、必要な範囲でできるだけ具体的に書きます。
* モデル項目をmappingする場合は、`[[DATA-ID]].fieldName` のようなqualified member reference を推奨します。
* 複雑または再利用されるロジックには `rule` を使います。
* mappingが必須かどうかは `required` で示します。
* 構造化列に入らない詳細は `notes` に書きます。

### Source Links

`## Source Links` は任意セクションです。

mappingを、実装ファイル、インターフェース仕様、ETLスクリプト、SQL、mapping spreadsheet、サンプルファイル、テストデータなどへ結びつけるために使います。

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
| specs/inventory-import-mapping.xlsx | Original mapping spreadsheet |
| src/import/InventoryImportMapper.ts | Mapping implementation |
| testdata/inventory-import-sample.csv | Sample import file |
```

詳細は [共通セクション](FORMAT-common-sections.md) を参照してください。

### Notes

`## Notes` は自由記述の設計メモに使います。

追加情報を保存するために、構造化テーブルへ未対応の列を追加しないでください。
補足情報は `notes`, `## Notes`, `## Source Links` のいずれかに記述してください。

## テーブル

### Scope table

```markdown
| role | ref | notes |
|---|---|---|
```

### Mappings table

```markdown
| source_ref | target_ref | transform | rule | required | notes |
|---|---|---|---|---|---|
```

### Source Links table

```markdown
| path | notes |
|---|---|
```

## Qualified Ref / Member Ref

`mapping` では、`source_ref` と `target_ref` にqualified member referenceを使えます。

例:

```markdown
[[DATA-INVENTORY-IMPORT-FILE]].status
[[ENT-INVENTORY]].inventory_status
```

現在のparser-backed formatでは、mapping row自体の個別IDは定義しません。

## 参照の扱い

参照として有用な構造化フィールドには、次のようなものがあります。

* `Scope.ref`
* `Mappings.source_ref`
* `Mappings.target_ref`
* `Mappings.rule`

自由記述内にも読み取れる参照を含めることはできますが、解析では構造化フィールドを優先するべきです。

## CodeSet値の利用状況

CodeSet値は、mapping condition や transformation に現れる場合があります。

例:

```markdown
[[CODE-INVENTORY-STATUS]].available
CODE-ORDER-STATUS.confirmed
```

有用な記述場所:

* `Mappings.source_ref`
* `Mappings.target_ref`
* `Mappings.transform`
* `Mappings.notes`

mapping が CodeSet間の値変換や外部値変換を行う場合は、変換ロジックを `rule` として定義することを検討してください。

## data_objectとの関係

`mapping` は、data object間の項目mappingによく使われます。

例:

* request payload から internal DTO
* screen form data から process input
* process output から response payload
* fixed-length file fields から import DTO
* export DTO から CSV file layout

source と target の構造定義には `data_object` を使います。
その項目がどう移動するかを `mapping` に書きます。

## er_entityとの関係

`mapping` は、data object fields と ER entity columns の対応を定義できます。

例:

* API request から database table
* import file から entity
* entity から response DTO
* entity から report file

データベースカラムの定義には `er_entity` を使います。
そのカラムへ、またはそのカラムからデータがどう動くかを `mapping` に書きます。

## ruleとの関係

mapping logic が複雑、再利用される、または独立してレビューすべき場合は `rule` を使います。

例:

* CodeSet conversion
* status transition logic
* amount calculation
* date normalization
* default value decision
* conditional target selection

mapping row では、`rule` 列からruleを参照します。

## よくあるミス

### transformに業務ロジック全体を書いてしまう

大きな業務ロジックを `Mappings.transform` に直接書かないでください。

`transform` には短く読みやすい概要を書き、詳細なロジックは `rule` へ分けて参照します。

### mappingをsource定義そのものとして扱う

source / target fields を mapping の中だけで定義しないでください。

構造定義には `data_object`, `er_entity`, `screen` などを使います。
`mapping` はそれらをつなぐために使います。

### 未対応の列を追加する

FORMATが明示的に定義していない限り、`id`, `source`, `target`, `condition`, `description`, `type`, `format`, `message` などの列を追加しないでください。

既存の列、`notes`, `## Notes`, `## Source Links` を使います。

### ラベルを安定参照として使う

表示ラベルをmapping endpointとして使うのは避けてください。

危険な例:

```markdown
| source_ref | target_ref | transform | rule | required | notes |
|---|---|---|---|---|---|
| Customer ID | Customer ID | copy |  | Y | ambiguous |
```

推奨:

```markdown
| source_ref | target_ref | transform | rule | required | notes |
|---|---|---|---|---|---|
| [[DATA-ORDER-REQUEST]].customer_id | [[ENT-ORDER]].customer_id | copy |  | Y |  |
```

### mappingとapp_processを混同する

`mapping` はデータの移動を記述します。

`app_process` は処理フローを記述します。

ステップ順序、分岐、subflow、process transitions が必要な場合は `app_process` を使ってください。

### Markdownテーブルとして危険な記法を使う

テーブルセル内では、生の `|` を避けます。

テーブル内では、`[[DATA-ORDER|Order Data]]` のようなWikilinkエイリアスを避けてください。
代わりに `[[DATA-ORDER]]` を使い、表示上の意味は `notes` に記述します。

## AI生成時の注意

AIで `mapping` ファイルを生成する場合は、次の点に注意してください。

* `type: mapping` を使う。
* 1ファイルで一貫した1つのmapping方向、またはmapping groupを定義する。
* テーブルヘッダーを正確に保つ。
* 未対応の列を追加しない。
* mapping endpoint は `Scope` で宣言する。
* 項目単位の対応は `Mappings` に書く。
* `source_ref` / `target_ref` には qualified member reference を推奨する。
* `transform` には短く読みやすい変換概要を書く。
* 複雑または再利用される変換ロジックには `rule` を使う。
* mappingが必須かどうかは `required` で示す。
* data object や ER entity の定義を mapping row で代替しない。
* 補足説明は `notes` または `## Notes` に書く。
* mapping specs、spreadsheets、ETL scripts、implementation files、sample files、test data には `## Source Links` を使う。

AIが source code、SQL、interface specs、spreadsheet からmappingを作成した場合は、次を確認してください。

* source models
* target models
* source field names
* target field names
* transformation descriptions
* rule references
* conditions
* unmapped required fields
* Source Links

## 関連サンプル

* [Inventory search mapping](../../../samples/mapping/MAP-INVENTORY-SEARCH.md)
* [Mapping samples index](../../../samples/mapping/README.md)

## 関連フォーマット

* [data_object](FORMAT-data_object.md)
* [er_entity](FORMAT-er_entity.md)
* [screen](FORMAT-screen.md)
* [app_process](FORMAT-app_process.md)
* [rule](FORMAT-rule.md)
* [codeset](FORMAT-codeset.md)
* [共通セクション](FORMAT-common-sections.md)
