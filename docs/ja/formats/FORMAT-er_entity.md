# FORMAT-er_entity

English Version: [English](../../formats/FORMAT-er_entity.md)

## 何に使うフォーマットか

`er_entity` は、1つのERエンティティ / テーブルを定義するためのフォーマットです。

次のような内容を記述するときに使います。

* データベーステーブル
* 論理エンティティ
* テーブル項目
* インデックス
* 外向きのER関係
* スキーマ関連のメモ
* スキーマファイル、マイグレーション、SQL、ソースコードへのリンク

`er_entity` ファイルは、項目とER関係を定義する主要な場所です。

複数の `er_entity` ファイルを選んで概要図として表示したい場合は、`er_diagram` を使います。

## 重要な考え方: エンティティが関係の正本になる

Model Weave のERモデリングでは、関係は `er_entity` ファイルに属します。

`er_diagram` は、通常 `## Objects` で対象エンティティを選ぶだけです。

関係そのものは、関連する `er_entity` ファイルの `## Relations` に記述します。

これにより、同じ関係を複数の図ファイルに重複して書くことを避けられます。

`er_entity` ファイルに書く関係は、現在のエンティティから外向きに伸びる関係です。

たとえば、`ENT-INVENTORY` が `ENT-ITEM` への外部キーを持つ場合、その関係は `ENT-INVENTORY` に定義します。

逆向きの参照関係は、Model Weaveが導出します。

## 最小例

```markdown
---
type: er_entity
id: ENT-ORDER
logical_name: Order
physical_name: t_order
schema_name: public
dbms: postgresql
---

# Order / t_order

## Overview

Order header table.

## Columns

| logical_name | physical_name | data_type | length | scale | not_null | pk | encrypted | default_value | notes |
|---|---|---|---:|---:|---|---|---|---|---|
| Order ID | order_id | varchar | 20 |  | Y | Y | N |  | Primary key |
| Customer ID | customer_id | varchar | 20 |  | Y | N | N |  | Customer FK |

## Relations

### REL-ORDER-TO-CUSTOMER
- target_table: [[ENT-CUSTOMER]]
- kind: fk
- cardinality: N-1
- notes: Order belongs to customer

| local_column | target_column | notes |
|---|---|---|
| customer_id | customer_id | Customer ID |
```

## 詳細例

```markdown
---
type: er_entity
id: ENT-INVENTORY
logical_name: Inventory
physical_name: t_inventory
schema_name: public
dbms: postgresql
tags:
  - ER
  - Entity
  - WMS
---

# Inventory / t_inventory

## Overview

- purpose: Inventory data for WMS sample.

## Columns

| logical_name | physical_name | data_type | length | scale | not_null | pk | encrypted | default_value | notes |
|---|---|---|---:|---:|---|---|---|---|---|
| Inventory ID | inventory_id | varchar | 30 |  | Y | Y | N |  | Primary key |
| Shipper ID | shipper_id | varchar | 20 |  | Y | N | N |  | Shipper FK |
| Warehouse ID | warehouse_id | varchar | 20 |  | Y | N | N |  | Warehouse FK |
| Item ID | item_id | varchar | 30 |  | Y | N | N |  | Item FK |
| Quantity | quantity | numeric | 12 | 3 | Y | N | N | 0 | Available quantity |
| Inventory Status | inventory_status | varchar | 20 |  | Y | N | N | available | CodeSet reference |

## Indexes

| index_name | index_type | unique | columns | notes |
|---|---|---|---|---|
| pk_t_inventory | PRIMARY | Y | inventory_id | Primary key |
| idx_t_inventory_lookup | BTREE | N | shipper_id, warehouse_id, item_id | Search index |

## Relations

### REL-INVENTORY-TO-SHIPPER
- target_table: [[ENT-SHIPPER]]
- kind: fk
- cardinality: N-1
- notes: Inventory belongs to shipper

| local_column | target_column | notes |
|---|---|---|
| shipper_id | shipper_id |  |

### REL-INVENTORY-TO-WAREHOUSE
- target_table: [[ENT-WAREHOUSE]]
- kind: fk
- cardinality: N-1
- notes: Inventory belongs to warehouse

| local_column | target_column | notes |
|---|---|---|
| warehouse_id | warehouse_id |  |

## Source Links

| path | notes |
|---|---|
| database/schema.sql | Schema definition |
| migrations/ | Migration files |

## Notes

- Public sample entity.
```

## Frontmatter

必須項目:

| field           | required | notes                  |
| --------------- | -------- | ---------------------- |
| `type`          | yes      | `er_entity` を指定します。    |
| `id`            | yes      | 一意のエンティティモデルIDです。      |
| `logical_name`  | yes      | 論理エンティティ名 / 論理テーブル名です。 |
| `physical_name` | yes      | 物理テーブル名です。             |

任意項目:

| field         | notes                                                    |
| ------------- | -------------------------------------------------------- |
| `schema_name` | データベーススキーマ名です。                                           |
| `dbms`        | `postgresql`, `mysql`, `oracle`, `sqlserver` などのDBMS名です。 |
| `render_mode` | 任意です。指定できる値は `custom`, `mermaid`, `mermaid-detail` です。 |
| `tags`        | Obsidian / Markdown のタグです。                               |

例:

```yaml
---
type: er_entity
id: ENT-CUSTOMER
logical_name: Customer
physical_name: m_customer
schema_name: public
dbms: postgresql
tags:
  - ER
  - Entity
---
```

## Render mode

`er_entity` はレンダラー切り替えに対応しています。

指定できる値:

* `custom`
* `mermaid`
* `mermaid-detail`

意味:

| value            | meaning                                  |
| ---------------- | ---------------------------------------- |
| `custom`         | 詳細レビュー用の表示です。                          |
| `mermaid`        | このエンティティを中心にした関係の簡易表示です。             |
| `mermaid-detail` | カラム情報を含む Mermaid ER 表示です。               |

`render_mode` を省略した場合は、設定画面のフォーマット別デフォルトレンダーモードが使われます。

`auto` などの非推奨または未サポート値は Warning を出し、フォーマット別デフォルトへフォールバックします。

Mermaid overview modeでは、エンティティ内容は簡潔に保ちます。詳細なテーブルレビューにはCustom mode、エクスポートしやすいカラム表示には Mermaid Detail を使います。

ツールバーでの切り替えは一時的なもので、Markdownやfrontmatterを書き換えません。

## セクション

推奨構成:

```text
# <logical_name> / <physical_name>

## Overview

## Columns

## Indexes

## Relations

## Source Links

## Notes
```

### Overview

`## Overview` には、テーブルの目的、データの意味、設計メモ、運用上の文脈などを記述します。

このセクションは自由記述です。

### Columns

`## Columns` は、エンティティ / テーブルのカラムを定義するために使います。

期待されるヘッダー:

```markdown
| logical_name | physical_name | data_type | length | scale | not_null | pk | encrypted | default_value | notes |
|---|---|---|---:|---:|---|---|---|---|---|
```

列の意味:

| column          | meaning                   |
| --------------- | ------------------------- |
| `logical_name`  | 論理カラム名です。                 |
| `physical_name` | 物理データベースカラム名です。           |
| `data_type`     | データ型です。単純なスカラー型を推奨します。    |
| `length`        | 長さ / 精度です。該当しない場合は空欄にします。 |
| `scale`         | 数値の小数桁です。該当しない場合は空欄にします。  |
| `not_null`      | `Y` または `N` を指定します。       |
| `pk`            | `Y` または `N` を指定します。       |
| `encrypted`     | `Y` または `N` を指定します。       |
| `default_value` | デフォルト値がある場合に記述します。        |
| `notes`         | 任意の補足説明です。                |

例:

```markdown
## Columns

| logical_name | physical_name | data_type | length | scale | not_null | pk | encrypted | default_value | notes |
|---|---|---|---:|---:|---|---|---|---|---|
| Customer ID | customer_id | varchar | 20 |  | Y | Y | N |  | Primary key |
| Customer Name | customer_name | varchar | 100 |  | Y | N | N |  |  |
| Created At | created_at | timestamp |  |  | Y | N | N | CURRENT_TIMESTAMP |  |
```

ルール:

* `not_null`, `pk`, `encrypted` は `Y` または `N` にします。
* `length`, `scale` は数値または空欄にします。
* `data_type` は、可能な限り単純な値にします。
* 任意性、複数性、特殊フォーマット、CodeSet参照などは `notes` に補足します。

### Indexes

`## Indexes` は、インデックス、主キー、一意制約、検索用インデックスを定義するために使います。

期待されるヘッダー:

```markdown
| index_name | index_type | unique | columns | notes |
|---|---|---|---|---|
```

列の意味:

| column       | meaning                                                  |
| ------------ | -------------------------------------------------------- |
| `index_name` | インデックス名または制約名です。                                         |
| `index_type` | `PRIMARY`, `BTREE`, `UNIQUE` などのインデックス種別、またはDBMS固有の種別です。 |
| `unique`     | `Y` または `N` を指定します。                                      |
| `columns`    | 対象カラム一覧です。物理カラム名をカンマ区切りで記述します。                           |
| `notes`      | 任意の補足説明です。                                               |

例:

```markdown
## Indexes

| index_name | index_type | unique | columns | notes |
|---|---|---|---|---|
| pk_m_customer | PRIMARY | Y | customer_id | Primary key |
| idx_m_customer_email | BTREE | Y | email | Unique email |
```

### Relations

`## Relations` は、現在のエンティティから外向きに伸びる関係を定義するために使います。

各関係は、`## Relations` 配下のブロックとして記述します。

各関係ブロックは次の見出しで始めます。

```markdown
### <relation id>
```

ブロックの形:

```markdown
### REL-ORDER-TO-CUSTOMER
- target_table: [[ENT-CUSTOMER]]
- kind: fk
- cardinality: N-1
- notes: References customer

| local_column | target_column | notes |
|---|---|---|
| customer_id | customer_id | Customer ID |
```

関係ブロック項目:

| field          | meaning                            |
| -------------- | ---------------------------------- |
| `target_table` | 関連先エンティティ / テーブルです。Wikilinkを推奨します。 |
| `kind`         | 関係種別です。現在の主な値は `fk` です。            |
| `cardinality`  | `N-1`, `1-N`, `1-1` などの任意の表示ラベルです。 |
| `notes`        | 任意の補足説明です。                         |

マッピングテーブルのヘッダー:

```markdown
| local_column | target_column | notes |
|---|---|---|
```

マッピングテーブル列:

| column          | meaning              |
| --------------- | -------------------- |
| `local_column`  | 現在のエンティティ側の物理カラム名です。 |
| `target_column` | 関連先エンティティ側の物理カラム名です。 |
| `notes`         | 任意の補足説明です。           |

注意:

* 関係は現在のエンティティから外向きに伸びます。
* 逆向きの関係はModel Weaveが導出します。
* 複合外部キーは、マッピングテーブルに複数行で表現します。
* 関係マッピングには物理カラム名を使います。

### Source Links

`## Source Links` は任意セクションです。

エンティティを、スキーマファイル、マイグレーションファイル、SQLファイル、ソースコード、DB設計書などへ結びつけるために使います。

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
| database/schema.sql | Schema definition |
| migrations/001_create_inventory.sql | Create table migration |
```

詳細は [FORMAT-common-sections](../../formats/FORMAT-common-sections.md) を参照してください。

### Notes

`## Notes` は自由記述の設計メモに使います。

追加情報を保存するために、構造化テーブルへ未対応の列を追加しないでください。
補足情報は `notes`, `## Notes`, `## Source Links` のいずれかに記述してください。

## テーブル

### Columns table

```markdown
| logical_name | physical_name | data_type | length | scale | not_null | pk | encrypted | default_value | notes |
|---|---|---|---:|---:|---|---|---|---|---|
```

### Indexes table

```markdown
| index_name | index_type | unique | columns | notes |
|---|---|---|---|---|
```

### Relation mapping table

```markdown
| local_column | target_column | notes |
|---|---|---|
```

### Source Links table

```markdown
| path | notes |
|---|---|
```

## 関係の扱い

`er_entity` は、ER関係を定義する主要な場所です。

関係ブロックは、現在のエンティティから関連先エンティティへ向かう関係を表します。

例:

* `ENT-INVENTORY` -> `ENT-ITEM`
* `ENT-ORDER` -> `ENT-CUSTOMER`
* `ENT-ORDER-LINE` -> `ENT-ORDER`

`er_diagram` は `## Objects` でエンティティを選び、それらのエンティティファイルから関係を収集します。

これは、明示的な図レベル `## Relations` を使える `class_diagram` とは異なります。

## よくあるミス

### ER関係をer_diagramに書いてしまう

通常のER関係を `er_diagram` に書かないでください。

関係は、関連元の `er_entity` ファイルに書きます。

### 関係ブロックでtarget_tableを書き忘れる

各関係ブロックには `target_table` を含めてください。

危険な例:

```markdown
### REL-ORDER-TO-CUSTOMER
- kind: fk

| local_column | target_column | notes |
|---|---|---|
| customer_id | customer_id |  |
```

推奨:

```markdown
### REL-ORDER-TO-CUSTOMER
- target_table: [[ENT-CUSTOMER]]
- kind: fk

| local_column | target_column | notes |
|---|---|---|
| customer_id | customer_id |  |
```

### 関係マッピングに論理名を使う

関係マッピングでは、論理名ではなく物理カラム名を使います。

避ける例:

```markdown
| local_column | target_column | notes |
|---|---|---|
| Customer ID | Customer ID |  |
```

推奨:

```markdown
| local_column | target_column | notes |
|---|---|---|
| customer_id | customer_id |  |
```

### 未対応の列を追加する

対象FORMATが明示的に定義していない限り、`description`, `ref`, `source`, `target` などの列を追加しないでください。

補足情報は `notes` または任意セクションに記述してください。

### Markdownテーブルとして危険な記法を使う

テーブルセル内では、生の `|` を避けます。

テーブル内では、`[[ENT-CUSTOMER|Customer]]` のようなWikilinkエイリアスを避けてください。
代わりに `[[ENT-CUSTOMER]]` を使い、表示名は関連先エンティティのメタデータや `notes` で補足します。

### 複雑な型表現を使う

`data_type` では、複雑な型表現を避けます。

危険な例:

* `string[]`
* `Array<string>`
* `Optional<string>`
* `string | null`

データベース向けの単純な型名を優先してください。

* `varchar`
* `numeric`
* `timestamp`
* `date`
* `boolean`

複数性、任意性、特殊制約は `notes` に記述します。

## AI生成時の注意

AIで `er_entity` ファイルを生成する場合は、次の点に注意してください。

* `type: er_entity` を使う。
* 1ファイルで1つのエンティティ / テーブルを定義する。
* テーブルヘッダーを正確に保つ。
* 未対応の列を追加しない。
* `physical_name`, `Columns.physical_name`, 関係マッピングには物理名を使う。
* データベース向けの単純なデータ型を使う。
* `not_null`, `pk`, `encrypted`, `Indexes.unique` には `Y` / `N` を使う。
* ER関係は `er_diagram` ではなく `## Relations` に定義する。
* 外向きの関係ごとに1つの関係ブロックを作る。
* 各関係ブロックには `target_table` を含める。
* 複合外部キーは複数のマッピング行で表現する。
* 補足説明は `notes` または `## Notes` に書く。
* スキーマファイル、マイグレーション、SQL、ソースファイルには `## Source Links` を使う。

AIがスキーマやソースコードからエンティティを作成した場合は、次を確認してください。

* テーブル名
* カラム名
* 主キー
* インデックス
* 関連先エンティティ
* 関係マッピング列

## 関連サンプル

* [Inventory entity](../../../samples/er/ENT-INVENTORY.md)
* [Item entity](../../../samples/er/ENT-ITEM.md)
* [Shipper entity](../../../samples/er/ENT-SHIPPER.md)
* [Warehouse entity](../../../samples/er/ENT-WAREHOUSE.md)
* [ER samples index](../../../samples/er/README.md)

## 関連フォーマット

* [er_diagram](FORMAT-er_diagram.md)
* [Common sections](FORMAT-common-sections.md)
