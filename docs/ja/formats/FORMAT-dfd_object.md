# FORMAT-dfd_object

English Version: [English](../../formats/FORMAT-dfd_object.md)

## 何に使うフォーマットか

`dfd_object` は、DFD / flow-oriented modeling で使う再利用可能なオブジェクトを1つ定義するためのフォーマットです。

次のような要素を記述するときに使います。

* 外部エンティティ
* プロセス
* データストア
* 再利用可能なDFDノード
* 1つ以上のDFD図で使われるオブジェクトの詳細メモ

`dfd_object` は、再利用可能な定義です。

複数のオブジェクトをフローで接続する実際のDFD / flow overview を作りたい場合は、`dfd_diagram` を使います。

## 重要な考え方: オブジェクト定義と図の違い

`dfd_object` と `dfd_diagram` は役割が異なります。

`dfd_object` は、そのオブジェクトが何であるかを定義します。

`dfd_diagram` は、オブジェクト同士がどのようにつながるかを定義します。

例:

* `dfd_object`: "Inventory Search Process" を定義する
* `dfd_object`: "Inventory Database" を定義する
* `dfd_object`: "Warehouse User" を定義する
* `dfd_diagram`: それらを "Search Condition" や "Search Result" などのフローで接続する

この分離により、同じオブジェクトを複数の図で再利用できます。

## 重要な考え方: DFD object と app_process の違い

`dfd_object` と `app_process` は、どちらもprocessのようなものを表す場合がありますが、同じものではありません。

DFD風の概要図でノードとして使いたい場合は `dfd_object` を使います。

詳細なアプリケーション処理ロジック、入力、出力、ステップ、フロー、遷移、Business Flow preview が必要な場合は `app_process` を使います。

典型的な使い分け:

* `dfd_object`: コンテキスト図やDFDに置く高レベルなprocessノード
* `app_process`: そのノードの背後にある詳細な処理モデル

DFD process object は、必要に応じて `app_process` を参照できます。

## 最小例

```markdown
---
type: dfd_object
id: DFD-PROC-INVENTORY-SEARCH
name: Inventory Search Process
kind: process
tags:
  - DFD
---

# Inventory Search Process

## Summary

Process that receives inventory search conditions and returns inventory search results.

## Details

| key | value | notes |
|---|---|---|
| owner | Inventory module | Responsible module |
| related_process | [[PROC-INVENTORY-SEARCH]] | Detailed app process |
| related_data | [[DATA-INVENTORY-SEARCH-CONDITION]] | Input data |
```

## 詳細例

```markdown
---
type: dfd_object
id: DFD-STORE-INVENTORY
name: Inventory Data Store
kind: datastore
tags:
  - DFD
  - WMS
---

# Inventory Data Store

## Summary

Data store representing inventory-related persistent data.

## Details

| key | value | notes |
|---|---|---|
| owner | Inventory module | Responsible module |
| physical_store | database | Main persistence type |
| related_entity | [[ENT-INVENTORY]] | Inventory table |
| related_entity | [[ENT-STOCK-MOVEMENT]] | Stock movement history |

## Source Links

| path | notes |
|---|---|
| database/schema.sql | Database schema |
| src/inventory/InventoryRepository.ts | Repository implementation |

## Notes

- This object can be reused by multiple DFD diagrams.
- Detailed table structure is defined in ER entity files.
```

## Frontmatter

必須項目:

| field  | required | notes                 |
| ------ | -------- | --------------------- |
| `type` | yes      | `dfd_object` を指定します。  |
| `id`   | yes      | 一意のDFD objectモデルIDです。 |
| `name` | yes      | DFD objectの表示名です。     |

任意項目:

| field   | notes                                                                                                 |
| ------- | ----------------------------------------------------------------------------------------------------- |
| `kind`  | 実質的に必須のオブジェクト種別です。有効な値は `external`, `process`, `datastore` です。未設定または不正な値の場合は警告し、互換性のため `process` として扱います。 |
| `tags`  | Obsidian / Markdown のタグです。                                                                            |
| `owner` | 任意の所有者、ドメイン、モジュール、チームです。                                                                              |
| `scope` | 任意の論理スコープです。                                                                                          |

例:

```yaml
---
type: dfd_object
id: DFD-PROC-INVENTORY-SEARCH
name: Inventory Search Process
kind: process
tags:
  - DFD
---
```

## セクション

推奨構成:

```text
# <dfd object name>

## Summary

## Details

## Source Links

## Notes
```

### Summary

`## Summary` には、DFD objectの目的、役割、境界、責務を記述します。

このセクションは自由記述です。

### Details

`## Details` は、オブジェクト単位のプロパティを記述するために使います。

期待されるヘッダー:

```markdown
| key | value | notes |
|---|---|---|
```

列の意味:

| column  | meaning            |
| ------- | ------------------ |
| `key`   | プロパティ名です。          |
| `value` | プロパティ値、またはモデル参照です。 |
| `notes` | 任意の補足説明です。         |

例:

```markdown
## Details

| key | value | notes |
|---|---|---|
| owner | Inventory module | Responsible module |
| related_process | [[PROC-INVENTORY-SEARCH]] | Detailed app process |
| related_data | [[DATA-INVENTORY-SEARCH-CONDITION]] | Input data |
| related_entity | [[ENT-INVENTORY]] | Main table |
```

代表的な `key` の例:

* `owner`
* `system`
* `module`
* `boundary`
* `related_process`
* `related_data`
* `related_entity`
* `related_screen`
* `related_interface`
* `external_system`

関連モデルがある場合は、`value` にモデルファイルへの参照を書くと便利です。

### Source Links

`## Source Links` は任意セクションです。

DFD objectを、実装ファイル、アーキテクチャ文書、外部インターフェース仕様、DB定義、サービスコード、設定、テストデータなどへ結びつけるために使います。

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
| src/inventory/InventorySearchService.ts | Service implementation |
| docs/interfaces/inventory-search.md | Interface note |
```

詳細は [共通セクション](FORMAT-common-sections.md) を参照してください。

### Notes

`## Notes` は自由記述の設計メモに使います。

追加情報を保存するために、構造化テーブルへ未対応の列を追加しないでください。
補足情報は `notes`, `## Notes`, `## Source Links` のいずれかに記述してください。

## テーブル

### Details table

```markdown
| key | value | notes |
|---|---|---|
```

### Source Links table

```markdown
| path | notes |
|---|---|
```

## Object kinds

`kind` は、そのオブジェクトをDFD / flow-oriented diagram上でどう理解するかを表します。

代表的な値:

| kind        | meaning                               |
| ----------- | ------------------------------------- |
| `external`  | アクター、組織、外部システム、外部参加者です。               |
| `process`   | 処理または変換ノードです。                         |
| `datastore` | データストア、データベース、ファイルストア、キュー、永続化ストレージです。 |

`kind` は実質的に必須です。未設定の場合、Model Weave は警告を出し、互換性のため `process` として扱います。`external`, `process`, `datastore` 以外の値の場合も警告を出し、`process` にfallbackします。

Vault内では一貫した値を使ってください。

## dfd_diagramとの関係

`dfd_diagram` は、object list で `dfd_object` ファイルを参照できます。

オブジェクト定義は `dfd_object` にあります。

図レベルのフローは `dfd_diagram` にあります。

つまり、次のように分かれます。

* `dfd_object` は再利用可能なノードを定義する
* `dfd_diagram` は図の対象範囲とフローを定義する
* 1つの `dfd_object` は複数のDFD図に登場できる
* 再利用可能なオブジェクト詳細を `dfd_diagram` だけに書くべきではない

## data_objectとの関係

DFDのフローには、データが流れることがよくあります。

DFD object間を流れるデータの構造は `data_object` で定義します。

`dfd_diagram` のフローでは、それらの data object を参照します。

オブジェクトの責務として関連データを説明したい場合は、`dfd_object` のDetailsにも関連データを記述できます。

## app_processとの関係

DFD process object は、高レベルなprocessを表す場合があります。

詳細な処理の振る舞いが必要な場合は、`app_process` を作成し、DFD object または DFD diagram からリンクします。

例:

```markdown
## Details

| key | value | notes |
|---|---|---|
| related_process | [[PROC-INVENTORY-SEARCH]] | Detailed app process |
```

## Qualified Ref / Member Ref

`dfd_object` は、主にオブジェクト全体として参照されます。

例:

```markdown
[[DFD-PROC-INVENTORY-SEARCH]]
[[DFD-STORE-INVENTORY]]
```

通常、`Details.key` は安定したメンバー参照としては扱いません。

他のモデルから再利用可能なデータ構造、process、entity、rule などを参照する必要がある場合は、`Details.key` に依存せず、そのモデルを直接参照してください。

## 参照の扱い

参照として有用な構造化フィールドには、次のようなものがあります。

* `Details.value`
* `Source Links.path`
* `Summary` や `Notes` 内のprose references

解析では、可能な限り構造化フィールドを優先するべきです。

## よくあるミス

### dfd_objectを図として使ってしまう

`dfd_object` の中だけに完全なDFDフローを定義しないでください。

図レベルのフローには `dfd_diagram` を使います。

### dfd_objectに詳細な処理ステップを書いてしまう

詳細なアプリケーション処理をステップ単位で `dfd_object` に書かないでください。

詳細なprocess behaviorには `app_process` を使います。

### dfd_objectにデータ構造を定義してしまう

payload fields や file layouts を `dfd_object` に定義しないでください。

データ構造には `data_object` を使います。

### kind値が一貫しない

`data_store`, `datastore`, `store`, `database` のように似た名前を混在させるのは避けてください。

少数の `kind` 値を決めて、一貫して使ってください。

### 未対応の列を追加する

FORMATが明示的に定義していない限り、`description`, `ref`, `type`, `source`, `target` などの列を追加しないでください。

`key`, `value`, `notes`, `## Notes`, 関連モデルファイルを使ってください。

### Markdownテーブルとして危険な記法を使う

テーブルセル内では、生の `|` を避けます。

テーブル内では、`[[PROC-INVENTORY|Inventory Process]]` のようなWikilinkエイリアスを避けてください。
代わりに `[[PROC-INVENTORY]]` を使い、表示上の意味は `notes` に記述します。

## AI生成時の注意

AIで `dfd_object` ファイルを生成する場合は、次の点に注意してください。

* `type: dfd_object` を使う。
* 1ファイルで1つの再利用可能なDFD objectを定義する。
* テーブルヘッダーを正確に保つ。
* 未対応の列を追加しない。
* `kind` を一貫して使う。
* `## Summary` にはオブジェクトの役割と責務を書く。
* `## Details` にはオブジェクト単位のプロパティと関連モデル参照を書く。
* オブジェクト間のフローには `dfd_diagram` を使う。
* フローで運ばれるデータ構造には `data_object` を使う。
* 詳細な処理ロジックには `app_process` を使う。
* 補足説明は `notes` または `## Notes` に書く。
* 実装ファイル、外部仕様、アーキテクチャ文書、設定、テストデータには `## Source Links` を使う。

AIがソースコードやアーキテクチャメモからDFD objectを作成した場合は、次を確認してください。

* object kind
* object boundary
* related process references
* related data references
* related entity references
* Source Links

## 関連サンプル

* [DFD basic samples](../../../samples/dfd/basic/)
* [DFD local object samples](../../../samples/dfd/local-objects/)
* [DFD samples index](../../../samples/dfd/README.md)

## 関連フォーマット

* [dfd_diagram](FORMAT-dfd_diagram.md)
* [data_object](FORMAT-data_object.md)
* [app_process](FORMAT-app_process.md)
* [er_entity](FORMAT-er_entity.md)
* [共通セクション](FORMAT-common-sections.md)
