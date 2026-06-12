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

`dfd_diagram` は Mermaid-first です。

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

`dfd_diagram` には、主に次の構造化セクションがあります。

* `## Domain Sources`: Domain group を解決するための任意の再利用可能な `type: domains` ファイル
* `## Domains`: DFD objects を視覚的にまとめるための任意の local Domain groups
* `## Objects`: 図に含めるノード
* `## Flows`: ノード間の有向フロー

`Domain Sources.ref` は再利用可能な Domains ファイルを指します。`Domains.id` は local Domain group または local override を定義します。Domains は DFD objects ではなく、flow endpoints でもありません。

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
render_mode: mermaid
tags:
  - DFD
---

# Inventory Search DFD

## Summary

High-level data flow for inventory search.

## Objects

| id | label | kind | ref | domain | notes |
|---|---|---|---|---|---|
| user | Warehouse User | external |  | | User searching inventory |
| process | Inventory Search Process | process | [[DFD-PROC-INVENTORY-SEARCH]] | | Search process |
| store | Inventory Data Store | datastore | [[DFD-STORE-INVENTORY]] | | Inventory data |

## Flows

| id | from | to | data | notes |
|---|---|---|---|---|
| flow_search_condition | user | process | [[DATA-INVENTORY-SEARCH-CONDITION]] | Search condition; user enters search condition |
| flow_inventory_query | process | store | Inventory query | Query inventory |
| flow_inventory_rows | store | process | [[DATA-INVENTORY-SEARCH-RESULT]] | Inventory rows; search result rows |
| flow_search_result | process | user | [[DATA-INVENTORY-SEARCH-RESULT]] | Search result; show result |
```

## 詳細例

```markdown
---
type: dfd_diagram
id: DFD-WMS-L0
name: WMS Level 0 DFD
render_mode: mermaid
tags:
  - DFD
  - WMS
---

# WMS Level 0 DFD

## Summary

Level 0 data flow overview for warehouse management.

## Objects

| id | label | kind | ref | domain | notes |
|---|---|---|---|---|---|
| warehouse_user | Warehouse User | external |  | | User operating warehouse screens |
| inventory_search | Inventory Search Process | process | [[DFD-PROC-INVENTORY-SEARCH]] | | Search inventory |
| inventory_reserve | Inventory Reserve Process | process | [[DFD-PROC-INVENTORY-RESERVE]] | | Reserve inventory |
| inventory_store | Inventory Data Store | datastore | [[DFD-STORE-INVENTORY]] | | Inventory persistence |
| order_system | Order System | external | [[DFD-EXT-ORDER-SYSTEM]] | | External order source |

## Flows

| id | from | to | data | notes |
|---|---|---|---|---|
| flow_search_condition | warehouse_user | inventory_search | [[DATA-INVENTORY-SEARCH-CONDITION]] | Search condition; search request |
| flow_inventory_query | inventory_search | inventory_store | Inventory query | Query inventory data |
| flow_inventory_result | inventory_store | inventory_search | [[DATA-INVENTORY-SEARCH-RESULT]] | Inventory result; search result |
| flow_search_result | inventory_search | warehouse_user | [[DATA-INVENTORY-SEARCH-RESULT]] | Search result; display result |
| flow_reservation_request | order_system | inventory_reserve | [[DATA-INVENTORY-RESERVE-REQUEST]] | Reservation request; external reservation |
| flow_reserve_inventory | inventory_reserve | inventory_store | [[DATA-INVENTORY-RESERVE-COMMAND]] | Reserve inventory; update inventory |
| flow_reservation_result | inventory_store | inventory_reserve | [[DATA-INVENTORY-RESERVE-RESULT]] | Reservation result |
| flow_reservation_response | inventory_reserve | order_system | [[DATA-INVENTORY-RESERVE-RESULT]] | Reservation response; return result |

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
| `render_mode` | 任意です。指定できる値は `mermaid` です。DFDはMermaid-firstです。 |
| `tags`        | Obsidian / Markdown のタグです。                         |
| `level`       | 任意のDFD levelです。例: `context`, `L0`, `L1`, `detail`。 |
| `scope`       | 任意のsystem、domain、module、feature scopeです。           |

例:

```yaml
---
type: dfd_diagram
id: DFD-WMS-L0
name: WMS Level 0 DFD
render_mode: mermaid
tags:
  - DFD
  - WMS
---
```

## Render mode

`dfd_diagram` は Mermaid-first です。

指定できる値:

* `mermaid`

`custom` は、DFDの主要なruntime pathとして扱わないでください。

意味:

| value     | meaning                                 |
| --------- | --------------------------------------- |
| `mermaid` | DFDをMermaid-based flow diagramとして描画します。 |

`render_mode` を省略した場合は、設定画面のフォーマット別デフォルトレンダーモードが使われます。

`auto` などの非推奨または未サポート値は Warning を出し、フォーマット別デフォルトへフォールバックします。

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

## Domain Sources

## Domains

## Objects

## Flows

## Source Links

## Notes
```

### Summary

`## Summary` には、diagramの目的、対象範囲、DFD level、レビュー観点を記述します。

このセクションは自由記述です。

### Domain Sources

`## Domain Sources` は任意です。`Objects.domain` を再利用可能な `type: domains` ファイルに対して解決したい場合に使います。

基本の最小ヘッダー:

```markdown
| ref |
|---|
```

例:

```markdown
## Domain Sources

| ref |
|---|
| [[DOMAINS-COMPANY]] |
| [[DOMAINS-WMS]] |
```

任意の `notes` 付きヘッダー:

```markdown
| ref | notes |
|---|---|
| [[DOMAINS-COMPANY]] | 共通 company Domains |
| [[DOMAINS-WMS]] | WMS 固有 Domains |
```

`ref` は必須です。`notes` は任意です。

動作:

* source ref はテーブル順で解決されます。
* 各 ref は `type: domains` ファイルに解決される必要があります。
* 後続の source file の Domains は先行 source file を上書きし、共通 Domain merge rules による conflict diagnostics が表示されます。
* local `## Domains` は Domain Sources の後に適用され、同じ `id` では local が優先されます。
* local Domain が import された `name`, `kind`, `parent` を上書きする場合、Model Weave は warning を表示します。
* `## Domain Sources` がない場合、`Objects.domain` は既存の local-only behavior のままです。

### Domains

`## Domains` は任意です。DFD diagram 内の local Domain groups、または import した Domain Source entry の上書きを定義するために使います。

期待されるヘッダー:

```markdown
| id | name | kind | parent | description |
|---|---|---|---|---|
```

列の意味:

| column | meaning |
|---|---|
| `id` | `Objects.domain` から参照される Domain id です。 |
| `name` | Domain group の表示名です。 |
| `kind` | free-form の Domain kind です。Color Scheme では `target=domain`, `kind=<Domain.kind>` として使われます。 |
| `parent` | 任意の parent Domain id です。Domain Sources がある場合、parent は import された Domains ファイル由来でも構いません。nested Domain subgraphs に使われます。 |
| `description` | 任意の説明です。 |

Domains は DFD objects ではなく、`Flows.from` や `Flows.to` の有効な端点ではありません。

Domains は DFD objects を視覚的にグループ化します。未使用の空 Domains は rendering で省略される場合があります。

### Objects

`## Objects` は、DFD diagramに含まれるノードを定義するために使います。

期待されるヘッダー:

```markdown
| id | label | kind | ref | domain | notes |
|---|---|---|---|---|---|
```

列の意味:

| column  | meaning                                                                                               |
| ------- | ----------------------------------------------------------------------------------------------------- |
| `id`    | 図内で使うローカルobject IDです。`Flows.from` と `Flows.to` から参照されます。                                              |
| `label` | 図に表示されるラベルです。                                                                                         |
| `kind`  | object種別です。現在対応している値は `process`, `datastore`, `external`, `other` です。 |
| `ref`   | 任意の `dfd_object` または関連モデルへの参照です。                                                                      |
| `domain` | merged Domain Sources と local `## Domains` の任意の Domain id です。空の場合、object は Domain groups の外側に描画されます。 |
| `notes` | 任意の補足説明です。                                                                                            |

例:

```markdown
## Objects

| id | label | kind | ref | domain | notes |
|---|---|---|---|---|---|
| user | Warehouse User | external |  | | User searching inventory |
| process | Inventory Search Process | process | [[DFD-PROC-INVENTORY-SEARCH]] | | Search process |
| store | Inventory Data Store | datastore | [[DFD-STORE-INVENTORY]] | | Inventory data |
```

注意:

* `id` はdiagram内で安定させてください。
* `Flows.from` と `Flows.to` は `Objects.id` を参照します。
* 再利用可能な `dfd_object` 定義がある場合は `ref` を使います。
* `ref` には、必要に応じて `app_process`, `screen`, `er_entity`, system notes などを指すこともできます。
* 表示文言には `label` を使います。
* `## Domain Sources` がある場合、`domain` は merged Domain Sources と local `## Domains` に対して検証されます。
* `## Domain Sources` がない場合、`domain` は既存の local `## Domains` behavior のままです。
* `domain` が unknown Domain を参照した場合は diagnostic が表示されます。
* local `## Domains` と `## Domain Sources` のどちらもない状態で `domain` を使った場合は、既存互換の diagnostic が表示されます。

### Flows

`## Flows` は、object間の有向データフローを定義するために使います。

期待されるヘッダー:

```markdown
| id | from | to | data | notes |
|---|---|---|---|---|
```

列の意味:

| column  | meaning                                                         |
| ------- | --------------------------------------------------------------- |
| `id`    | Flow identifierです。存在する場合は `DfdFlowModel.id` と `DiagramEdge.id` に使われます。 |
| `from`  | flow元のobject IDです。`Objects.id` と一致する必要があります。                    |
| `to`    | flow先のobject IDです。`Objects.id` と一致する必要があります。                    |
| `data`  | flowで運ばれる任意のdata object、file、payload、message、model referenceです。 |
| `notes` | 任意の補足説明です。表示上の意味が必要な場合もここに記述します。                        |

例:

```markdown
## Flows

| id | from | to | data | notes |
|---|---|---|---|---|
| flow_search_condition | user | process | [[DATA-INVENTORY-SEARCH-CONDITION]] | Search condition; user input |
| flow_inventory_query | process | store | Inventory query | Query inventory |
| flow_inventory_result | store | process | [[DATA-INVENTORY-SEARCH-RESULT]] | Inventory result; query result |
```

ルール:

* `from` と `to` はdiagram-local object IDです。
* `from` や `to` にWikilinkを直接書かないでください。
* flowで運ばれるデータの参照には `data` を使います。
* flowが構造化データを運ぶ場合は、`data_object` として定義します。
* flow ID は安定して読みやすい値にします。

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
| id | label | kind | ref | domain | notes |
|---|---|---|---|---|---|
```

### Flows table

```markdown
| id | from | to | data | notes |
|---|---|---|---|---|
```

### Source Links table

```markdown
| path | notes |
|---|---|
```

## Object kinds

現在有効な `Objects.kind` 値:

| kind              | meaning                               |
| ----------------- | ------------------------------------- |
| `process`         | 処理または変換ノードです。                         |
| `datastore`       | データストア、データベース、キュー、ファイルストア、永続化ストレージです。 |
| `external`        | 外部アクター、組織、外部システム、外部参加者です。             |
| `other`           | 上記に合わないobjectのfallback kindです。            |

Vault内では一貫した値を使ってください。

## Object kind rendering

Mermaid DFD preview は `Objects.kind` を使ってnode shapeを選びます。
正確な見た目は Obsidian / Mermaid のバージョンにより少し異なる場合がありますが、現在生成されるnotationは次の動作です。

| kind | meaning | visual shape |
|---|---|---|
| `external` | 外部アクター、組織、外部システム、外部参加者です。 | external / default rectangle |
| `process` | 処理または変換ノードです。 | process rectangle |
| `datastore` | データストア、データベース、キュー、ファイルストア、永続化ストレージです。 | datastore / cylindrical shape |
| `other` | fallback object kindです。 | fallback / other rectangle |
| blank / unknown | 未指定または未対応のobject kindです。 | diagnostic 付きの fallback / other rectangle |

## DFD Domains と Color Scheme

DFD-local `## Domains` と resolved `## Domain Sources` は、DFD objects を Mermaid subgraphs としてグループ化できます。

Color Scheme は次のように使われます。

* DFD objects: `target=dfd`, `kind=<Objects.kind>`
* DFD Domain subgraphs: `target=domain`, `kind=<Domain.kind>`

`Objects.kind` は引き続き object node の color と shape を制御します。Domain Source resolution は Domain group placement と Domain group styling にだけ影響します。

コンパクトな例:

```markdown
---
type: dfd_diagram
id: DFD-COLOR-EXAMPLE
name: DFD color example
---

## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| model_layer | Model layer | model | | Markdown model and parser area |
| renderer_layer | Renderer layer | renderer | | Preview rendering area |

## Objects

| id | label | kind | ref | domain | notes |
|---|---|---|---|---|---|
| parse_model | Parse model | process | | model_layer | |
| model_store | Model store | datastore | | model_layer | |
| render_preview | Render preview | process | | renderer_layer | |
| user | User | external | | | |

## Flows

| id | from | to | data | notes |
|---|---|---|---|---|
| f1 | user | parse_model | Markdown file | |
| f2 | parse_model | model_store | Parsed model | |
| f3 | model_store | render_preview | Model data | |
```

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

| id | from | to | data | notes |
|---|---|---|---|---|
| flow_search_condition | user | process | [[DATA-INVENTORY-SEARCH-CONDITION]] | Search condition; search input |
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
| id | from | to | data | notes |
|---|---|---|---|---|
| flow_search | [[DFD-USER]] | [[DFD-PROC-INVENTORY-SEARCH]] | [[DATA-SEARCH]] | Search; wrong endpoint form |
```

推奨:

```markdown
| id | from | to | data | notes |
|---|---|---|---|---|
| flow_search | user | process | [[DATA-SEARCH]] | Search; correct endpoint form |
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
代わりに `[[DATA-SEARCH]]` を使い、表示上の意味は `Objects.label`、`Flows.data`、または `notes` に記述します。

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
* flow ID は安定して読みやすくする。
* DFDをMermaid-firstとして扱う。
* 補足説明は `notes` または `## Notes` に書く。
* architecture docs、interface specs、implementation folders、source files、test data には `## Source Links` を使う。

AIが source code、architecture notes、interface specs からDFDを作成した場合は、次を確認してください。

* object IDs
* object kinds
* flow endpoints
* flow direction
* flow IDs
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
