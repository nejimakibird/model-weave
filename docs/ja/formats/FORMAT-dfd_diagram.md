# FORMAT-dfd_diagram

English Version: [English](../../formats/FORMAT-dfd_diagram.md)

## 何に使うフォーマットか

`dfd_diagram` は、DFD / flow-oriented overview diagram を定義するためのフォーマットです。

次のような内容を記述するときに使います。

* システム間のデータフロー
* process と datastore の間のデータフロー
* コンテキスト図
* 高レベルなシステム連携図
* 外部システム連携図
* 軽量な業務データフロー
* process と data store の関係
* 再利用可能な `dfd_object` 定義を接続する flow view

`dfd_diagram` は、図レベルのビューを表します。

再利用可能なオブジェクトを詳しく定義したい場合は `dfd_object` を使います。
フローで運ばれるデータ構造を定義したい場合は `data_object` を使います。
process node の背後にある詳細な処理ロジックを定義したい場合は `app_process` を使います。

## 重要な考え方: Mermaid-first DFD

V0.7以降のドキュメントでは、`dfd_diagram` は Mermaid-first です。

これは次の意味です。

* DFD diagram は主に Mermaid を通じて描画されます。
* 旧custom DFD renderer は主要なruntime pathではありません。
* Markdown format は Model Weave Markdown のままです。
* Mermaid、SVG、PNG は生成されたビューです。

`render_mode` は Markdown source format を変更しません。

`dfd_diagram` は text-first source として記述し、Model Weave が Mermaid-based view を生成します。

## 重要な考え方: 図と再利用可能オブジェクトの違い

`dfd_diagram` と `dfd_object` は役割が異なります。

`dfd_object` は、そのオブジェクトが何であるかを定義します。

`dfd_diagram` は、オブジェクト同士がどのようなフローで接続されるかを定義します。

例:

* `dfd_object`: "Warehouse User" を定義する
* `dfd_object`: "Inventory Search Process" を定義する
* `dfd_object`: "Inventory Data Store" を定義する
* `dfd_diagram`: それらを "Search Condition" や "Search Result" などのフローで接続する

`dfd_diagram` は再利用可能な `dfd_object` ファイルを利用できます。
一方で、軽量な図で十分な場合は、diagram内だけのローカルオブジェクトを定義することもできます。

## 重要な考え方: Objects と Flows

`dfd_diagram` には、主に2つの構造化セクションがあります。

* `## Objects`: 図に含めるノード
* `## Flows`: ノード間の有向フロー

`Objects.id` は、図の中で使うnode IDです。

`Flows.from` と `Flows.to` は `Objects.id` を参照します。

これは、参照先オブジェクトファイルから関係を収集する場合がある `class_diagram` や `er_diagram` とは異なります。

`dfd_diagram` では、図レベルのフローは通常、diagram file に直接記述します。

## 最小例

```markdown
---
type: dfd_diagram
id: DFD-INVENTORY-SEARCH-L0
name: Inventory Search DFD
render_mode: auto
tags:
  - DFD
---

# Inventory Search DFD

## Summary

High-level data flow for inventory search.

## Objects

| id | label | kind | ref | notes |
|---|---|---|---|---|
| user | Warehouse User | external_entity |  | User searching inventory |
| process | Inventory Search Process | process | [[DFD-PROC-INVENTORY-SEARCH]] | Search process |
| store | Inventory Data Store | datastore | [[DFD-STORE-INVENTORY]] | Inventory data |

## Flows

| from | to | label | data | notes |
|---|---|---|---|---|
| user | process | Search condition | [[DATA-INVENTORY-SEARCH-CONDITION]] | User enters search condition |
| process | store | Inventory query |  | Query inventory |
| store | process | Inventory rows | [[DATA-INVENTORY-SEARCH-RESULT]] | Search result rows |
| process | user | Search result | [[DATA-INVENTORY-SEARCH-RESULT]] | Show result |
```

## 詳細例

```markdown
---
type: dfd_diagram
id: DFD-WMS-L0
name: WMS Level 0 DFD
render_mode: auto
tags:
  - DFD
  - WMS
---

# WMS Level 0 DFD

## Summary

Level 0 data flow overview for warehouse management.

## Objects

| id | label | kind | ref | notes |
|---|---|---|---|---|
| warehouse_user | Warehouse User | external_entity |  | User operating warehouse screens |
| inventory_search | Inventory Search Process | process | [[DFD-PROC-INVENTORY-SEARCH]] | Search inventory |
| inventory_reserve | Inventory Reserve Process | process | [[DFD-PROC-INVENTORY-RESERVE]] | Reserve inventory |
| inventory_store | Inventory Data Store | datastore | [[DFD-STORE-INVENTORY]] | Inventory persistence |
| order_system | Order System | external_entity | [[DFD-EXT-ORDER-SYSTEM]] | External order source |

## Flows

| from | to | label | data | notes |
|---|---|---|---|---|
| warehouse_user | inventory_search | Search condition | [[DATA-INVENTORY-SEARCH-CONDITION]] | Search request |
| inventory_search | inventory_store | Inventory query |  | Query inventory data |
| inventory_store | inventory_search | Inventory result | [[DATA-INVENTORY-SEARCH-RESULT]] | Search result |
| inventory_search | warehouse_user | Search result | [[DATA-INVENTORY-SEARCH-RESULT]] | Display result |
| order_system | inventory_reserve | Reservation request | [[DATA-INVENTORY-RESERVE-REQUEST]] | External reservation |
| inventory_reserve | inventory_store | Reserve inventory | [[DATA-INVENTORY-RESERVE-COMMAND]] | Update inventory |
| inventory_store | inventory_reserve | Reservation result | [[DATA-INVENTORY-RESERVE-RESULT]] | Reservation result |
| inventory_reserve | order_system | Reservation response | [[DATA-INVENTORY-RESERVE-RESULT]] | Return result |

## Source Links

| path | notes |
|---|---|
| docs/architecture/wms-context.md | Architecture note |
| src/inventory/ | Inventory implementation |

## Notes

- This diagram focuses on high-level data flow.
- Detailed process logic is modeled in `app_process`.
- Data carried by flows is modeled in `data_object`.
```

## Frontmatter

必須項目:

| field  | required | notes                  |
| ------ | -------- | ---------------------- |
| `type` | yes      | `dfd_diagram` を指定します。  |
| `id`   | yes      | 一意のDFD diagramモデルIDです。 |
| `name` | yes      | diagramの表示名です。         |

任意項目:

| field         | notes                                              |
| ------------- | -------------------------------------------------- |
| `render_mode` | 通常は `auto` または `mermaid` です。DFDはMermaid-firstです。   |
| `tags`        | Obsidian / Markdown のタグです。                         |
| `level`       | 任意のDFD levelです。例: `context`, `L0`, `L1`, `detail`。 |
| `scope`       | 任意のsystem、domain、module、feature scopeです。           |

例:

```yaml
---
type: dfd_diagram
id: DFD-WMS-L0
name: WMS Level 0 DFD
render_mode: auto
tags:
  - DFD
  - WMS
---
```

## Render mode

`dfd_diagram` は、V0.7以降のドキュメントでは Mermaid-first です。

指定できる値:

* `auto`
* `mermaid`

`custom` は、DFDの主要なruntime pathとして扱わないでください。

意味:

| value     | meaning                                          |
| --------- | ------------------------------------------------ |
| `auto`    | このフォーマットのデフォルトレンダラーを使います。DFDでは Mermaid-first です。 |
| `mermaid` | DFDをMermaid-based flow diagramとして描画します。          |

注意:

* `render_mode` はMarkdown formatを変更しません。
* Mermaid output は生成されたビューです。
* PNG export は描画されたビューから派生します。
* 旧custom DFD renderer は推奨経路として記述しないでください。

## セクション

推奨構成:

```text
# <diagram name>

## Summary

## Objects

## Flows

## Source Links

## Notes
```

### Summary

`## Summary` には、diagramの目的、対象範囲、DFD level、レビュー観点を記述します。

このセクションは自由記述です。

### Objects

`## Objects` は、DFD diagramに含まれるノードを定義するために使います。

期待されるヘッダー:

```markdown
| id | label | kind | ref | notes |
|---|---|---|---|---|
```

列の意味:

| column  | meaning                                                                                               |
| ------- | ----------------------------------------------------------------------------------------------------- |
| `id`    | 図内で使うローカルobject IDです。`Flows.from` と `Flows.to` から参照されます。                                              |
| `label` | 図に表示されるラベルです。                                                                                         |
| `kind`  | object種別です。例: `external_entity`, `process`, `datastore`, `system`, `subsystem`, `actor`, `interface`。 |
| `ref`   | 任意の `dfd_object` または関連モデルへの参照です。                                                                      |
| `notes` | 任意の補足説明です。                                                                                            |

例:

```markdown
## Objects

| id | label | kind | ref | notes |
|---|---|---|---|---|
| user | Warehouse User | external_entity |  | User searching inventory |
| process | Inventory Search Process | process | [[DFD-PROC-INVENTORY-SEARCH]] | Search process |
| store | Inventory Data Store | datastore | [[DFD-STORE-INVENTORY]] | Inventory data |
```

注意:

* `id` はdiagram内で安定させてください。
* `Flows.from` と `Flows.to` は `Objects.id` を参照します。
* 再利用可能な `dfd_object` 定義がある場合は `ref` を使います。
* `ref` には、必要に応じて `app_process`, `screen`, `er_entity`, system notes などを指すこともできます。
* 表示文言には `label` を使います。

### Flows

`## Flows` は、object間の有向データフローを定義するために使います。

期待されるヘッダー:

```markdown
| from | to | label | data | notes |
|---|---|---|---|---|
```

列の意味:

| column  | meaning                                                         |
| ------- | --------------------------------------------------------------- |
| `from`  | flow元のobject IDです。`Objects.id` と一致する必要があります。                    |
| `to`    | flow先のobject IDです。`Objects.id` と一致する必要があります。                    |
| `label` | diagramに表示するflow labelです。                                       |
| `data`  | flowで運ばれる任意のdata object、file、payload、message、model referenceです。 |
| `notes` | 任意の補足説明です。                                                      |

例:

```markdown
## Flows

| from | to | label | data | notes |
|---|---|---|---|---|
| user | process | Search condition | [[DATA-INVENTORY-SEARCH-CONDITION]] | User input |
| process | store | Inventory query |  | Query inventory |
| store | process | Inventory result | [[DATA-INVENTORY-SEARCH-RESULT]] | Query result |
```

ルール:

* `from` と `to` はdiagram-local object IDです。
* `from` や `to` にWikilinkを直接書かないでください。
* flowで運ばれるデータの参照には `data` を使います。
* flowが構造化データを運ぶ場合は、`data_object` として定義します。
* flow label は短く読みやすくします。

### Source Links

`## Source Links` は任意セクションです。

DFD diagramを、アーキテクチャ文書、インターフェース仕様、実装フォルダ、図、ソースファイル、テストデータなどへ結びつけるために使います。

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
| docs/architecture/wms-context.md | Architecture note |
| src/inventory/ | Inventory implementation |
```

詳細は [共通セクション](FORMAT-common-sections.md) を参照してください。

### Notes

`## Notes` は自由記述の設計メモに使います。

追加情報を保存するために、構造化テーブルへ未対応の列を追加しないでください。
補足情報は `notes`, `## Notes`, `## Source Links` のいずれかに記述してください。

## テーブル

### Objects table

```markdown
| id | label | kind | ref | notes |
|---|---|---|---|---|
```

### Flows table

```markdown
| from | to | label | data | notes |
|---|---|---|---|---|
```

### Source Links table

```markdown
| path | notes |
|---|---|
```

## Object kinds

代表的な `kind` 値:

| kind              | meaning                               |
| ----------------- | ------------------------------------- |
| `external_entity` | 外部アクター、組織、外部システム、外部参加者です。             |
| `process`         | 処理または変換ノードです。                         |
| `datastore`       | データストア、データベース、キュー、ファイルストア、永続化ストレージです。 |
| `system`          | システムレベルのオブジェクトです。                     |
| `subsystem`       | サブシステムまたはモジュールです。                     |
| `actor`           | 人間またはロールのアクターです。                      |
| `interface`       | API、エンドポイント、キュー、ファイル連携、外部インターフェースです。  |

Vault内では一貫した値を使ってください。

## Object kind rendering

Mermaid DFD preview は `Objects.kind` を使ってnode shapeを選びます。
正確な見た目は Obsidian / Mermaid のバージョンにより少し異なる場合がありますが、現在生成されるnotationは次の動作です。

| kind | meaning | visual shape | notes |
|---|---|---|---|
| `external` | 外部アクター、組織、外部システム、外部参加者です。 | external / default rectangle | 現在対応しているexternal node kindです。 |
| `external_entity` | 外部アクター、組織、外部システム、外部参加者です。 | fallback / other rectangle | 現在のdiagram parserではunknown diagram kindとして扱われます。 |
| `actor` | 人間またはロールのアクターです。 | fallback / other rectangle | 現在のdiagram parserではunknown diagram kindとして扱われます。 |
| `process` | 処理または変換ノードです。 | process rectangle | 主要なprocess / transformation shapeです。 |
| `datastore` | データストア、データベース、キュー、ファイルストア、永続化ストレージです。 | datastore / cylindrical shape | Mermaidのdatastore風notationで描画されます。 |
| `system` | システムレベルのオブジェクトです。 | fallback / other rectangle | 現在のdiagram parserではunknown diagram kindとして扱われます。 |
| `subsystem` | サブシステムまたはモジュールです。 | fallback / other rectangle | 現在のdiagram parserではunknown diagram kindとして扱われます。 |
| `interface` | API、エンドポイント、キュー、ファイル連携、外部インターフェースです。 | fallback / other rectangle | 現在のdiagram parserではunknown diagram kindとして扱われます。 |
| blank / unknown | 未指定または未対応のobject kindです。 | fallback / other rectangle | unknown values はwarningになりますが、レンダリングを壊さない想定です。 |

## dfd_objectとの関係

`dfd_diagram` は、`Objects.ref` を通じて再利用可能な `dfd_object` ファイルを参照できます。

diagramはローカルなdiagram nodeとflowsを定義します。
`dfd_object` は再利用可能なobject詳細を定義します。

つまり、次のように分けます。

* diagram node は `dfd_diagram.Objects` に書く
* diagram-level data flow は `dfd_diagram.Flows` に書く
* 再利用可能なobject description は `dfd_object` に書く
* diagram node と再利用可能objectの接続には `Objects.ref` を使う

## data_objectとの関係

DFD flowには、データが流れることがよくあります。

flowで運ばれるデータ構造は `data_object` で定義します。

そのdata objectへの参照は `Flows.data` に書きます。

例:

```markdown
## Flows

| from | to | label | data | notes |
|---|---|---|---|---|
| user | process | Search condition | [[DATA-INVENTORY-SEARCH-CONDITION]] | Search input |
```

## app_processとの関係

DFD process node は、高レベルなprocessを表す場合があります。

詳細なprocessing behaviorが必要な場合は、`app_process` を作成し、次のいずれかから参照します。

* `Objects.ref`
* `Objects.notes`
* 関連する `dfd_object.Details`
* `Notes`

高レベルなデータフローには `dfd_diagram` を使います。
詳細なBusiness Flowやprocess logicには `app_process` を使います。

## er_entityとの関係

datastore node は、1つ以上のER entityに対応する場合があります。

table や column の詳細定義には `er_entity` を使います。

関連entityへの参照は、次の場所に書けます。

* nodeが1つのentityに直接対応する場合は `Objects.ref`
* `Objects.notes`
* 関連する `dfd_object.Details`
* `Notes`

## Qualified Ref / Member Ref

`dfd_diagram` は、主にdiagram全体として参照されます。

例:

```markdown
[[DFD-WMS-L0]]
[[DFD-INVENTORY-SEARCH-L0]]
```

`Objects.id` と `Flows` の端点はdiagram-local IDです。
通常、安定したglobal member referenceとしては扱いません。

他のモデルから再利用可能なprocess、data store、external systemを参照する必要がある場合は、関連する `dfd_object`, `app_process`, `data_object`, `er_entity` を直接参照することを推奨します。

## 参照の扱い

参照として有用な構造化フィールドには、次のようなものがあります。

* `Objects.ref`
* `Flows.data`
* `Source Links.path`
* `Summary` や `Notes` 内のprose references

解析では、可能な限り構造化フィールドを優先するべきです。

## よくあるミス

### Flow endpointsにWikilinkを書いてしまう

`Flows.from` と `Flows.to` は `Objects.id` を参照する必要があります。

避ける例:

```markdown
| from | to | label | data | notes |
|---|---|---|---|---|
| [[DFD-USER]] | [[DFD-PROC-INVENTORY-SEARCH]] | Search | [[DATA-SEARCH]] | wrong endpoint form |
```

推奨:

```markdown
| from | to | label | data | notes |
|---|---|---|---|---|
| user | process | Search | [[DATA-SEARCH]] | correct endpoint form |
```

### 再利用可能なobject詳細をdiagramだけに書く

objectが複数のdiagramで再利用される場合は、`dfd_object` を作成してください。

diagram固有の詳細は `dfd_diagram` に、再利用可能な詳細は `dfd_object` に書きます。

### Flows.dataにデータ構造を直接定義する

`Flows.data` に、full data field definitions を書かないでください。

データ構造は `data_object` で定義し、`Flows.data` から参照します。

### dfd_diagramをapp_processとして扱う

詳細なprocess steps、decisions、subflows、transitions を `dfd_diagram` に定義しないでください。

詳細なprocess behaviorには `app_process` を使います。

### DFDをERとして扱う

DFD flows は ER relationships ではありません。

DFDは、object間でデータがどう移動するかを表します。
ERは、table / entity の関係を表します。

### 未対応の列を追加する

FORMATが明示的に定義していない限り、`source`, `target`, `condition`, `rule`, `type`, `description` などの列を追加しないでください。

既存の列、`notes`, `## Notes`, 関連モデルファイルを使います。

### Markdownテーブルとして危険な記法を使う

テーブルセル内では、生の `|` を避けます。

テーブル内では、`[[DATA-SEARCH|Search Data]]` のようなWikilinkエイリアスを避けてください。
代わりに `[[DATA-SEARCH]]` を使い、表示上の意味は `label` または `notes` に記述します。

## AI生成時の注意

AIで `dfd_diagram` ファイルを生成する場合は、次の点に注意してください。

* `type: dfd_diagram` を使う。
* テーブルヘッダーを正確に保つ。
* 未対応の列を追加しない。
* `## Objects` でdiagram-local nodesを定義する。
* `## Flows` でnodes間の有向フローを定義する。
* すべての `Flows.from` と `Flows.to` が `Objects.id` に存在することを確認する。
* `Flows.from` や `Flows.to` にWikilinkを書かない。
* 再利用可能な `dfd_object` ファイルへの参照には `Objects.ref` を使う。
* `data_object` ファイルへの参照には `Flows.data` を使う。
* 再利用可能なobject詳細には `dfd_object` を使う。
* flowで運ばれるデータ構造には `data_object` を使う。
* 詳細なprocess behaviorには `app_process` を使う。
* flow label は短く読みやすくする。
* V0.7以降のドキュメントでは、DFDをMermaid-firstとして扱う。
* 補足説明は `notes` または `## Notes` に書く。
* architecture docs、interface specs、implementation folders、source files、test data には `## Source Links` を使う。

AIが source code、architecture notes、interface specs からDFDを作成した場合は、次を確認してください。

* object IDs
* object kinds
* flow endpoints
* flow direction
* flow labels
* data object references
* reusable object references
* Source Links

## 関連サンプル

* [DFD basic samples](../../../samples/dfd/basic/)
* [DFD local object samples](../../../samples/dfd/local-objects/)
* [DFD samples index](../../../samples/dfd/README.md)

## 関連フォーマット

* [dfd_object](FORMAT-dfd_object.md)
* [data_object](FORMAT-data_object.md)
* [app_process](FORMAT-app_process.md)
* [er_entity](FORMAT-er_entity.md)
* [er_diagram](FORMAT-er_diagram.md)
* [共通セクション](FORMAT-common-sections.md)
