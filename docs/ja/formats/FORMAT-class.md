# FORMAT-class

English Version: [English](../../formats/FORMAT-class.md)

## 何に使うフォーマットか

`class` は、Model Weaveで1つのクラス相当のモデル要素を定義するためのフォーマットです。

次のような単位を表すときに使います。

* クラス
* インターフェース
* 抽象クラス
* サービス
* リポジトリインターフェース
* コンポーネント
* ドメインオブジェクト
* DTO / 値オブジェクト

`class` ファイルには、そのオブジェクトの基本情報、属性、メソッド、外向きの関連、メモ、任意のSource Linksを記述できます。

複数の `class` ファイルをまとめて概要図にしたい場合は、`class_diagram` を使います。

## 最小例

```markdown
---
type: class
id: CLS-ORDER-SERVICE
name: OrderService
kind: class
package: order
---

# OrderService

## Summary

Application service for order operations.

## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| repository | OrderRepository | private | N | Repository dependency |

## Methods

| name | parameters | returns | visibility | static | notes |
|---|---|---|---|---|---|
| createOrder | request: CreateOrderRequest | Order | public | N | Creates a new order |

## Relations

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
| REL-ORDER-SERVICE-USES-REPOSITORY | IF-ORDER-REPOSITORY | dependency | uses |  |  |  |
```

## 詳細例

```markdown
---
type: class
id: CLS-ORDER-SERVICE
name: OrderService
kind: class
package: order
stereotype: service
tags:
  - Class
---

# OrderService

## Summary

Application service that coordinates order creation and inventory allocation.

## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| repository | OrderRepository | private | N | Persists orders |
| allocationPolicy | AllocationPolicy | private | N | Checks stock allocation |

## Methods

| name | parameters | returns | visibility | static | notes |
|---|---|---|---|---|---|
| createOrder | request: CreateOrderRequest | Order | public | N | Creates a new order |
| cancelOrder | orderId: string | void | public | N | Cancels an order |

## Relations

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
| REL-ORDER-SERVICE-USES-REPOSITORY | IF-ORDER-REPOSITORY | dependency | uses |  |  |  |
| REL-ORDER-SERVICE-USES-POLICY | CLS-ALLOCATION-POLICY | dependency | checks |  |  |  |

## Source Links

| path | notes |
|---|---|
| src/order/OrderService.ts | Implementation source |

## Notes

- Use `class_diagram` for a diagram that includes this class and related classes.
```

## Frontmatter

必須項目:

| field  | required | notes              |
| ------ | -------- | ------------------ |
| `type` | yes      | `class` を指定します。    |
| `id`   | yes      | 一意のモデルIDです。        |
| `name` | yes      | クラス相当オブジェクトの表示名です。 |

任意項目:

| field         | notes                                                                              |
| ------------- | ---------------------------------------------------------------------------------- |
| `kind`        | `class`, `interface`, `abstract`, `service`, `repository`, `component` などのクラス種別です。 |
| `package`     | 論理パッケージ、モジュール、名前空間、レイヤーなどです。                                                       |
| `stereotype`  | UML風、またはプロジェクト固有のステレオタイプです。                                                        |
| `render_mode` | 任意です。指定できる値は `custom`, `mermaid`, `mermaid-detail` です。                         |
| `tags`        | Obsidian / Markdown のタグです。                                                         |

例:

```yaml
---
type: class
id: CLS-ORDER-SERVICE
name: OrderService
kind: class
package: order
stereotype: service
tags:
  - Class
---
```

## Render mode

`class` はレンダラー切り替えに対応しています。

指定できる値:

* `custom`
* `mermaid`
* `mermaid-detail`

意味:

| value            | meaning                         |
| ---------------- | ------------------------------- |
| `custom`         | 詳細レビュー用の表示です。                   |
| `mermaid`        | 関係の概要確認に向いた簡易表示です。              |
| `mermaid-detail` | class body detail を含む Mermaid 表示です。 |

`render_mode` を省略した場合は、設定画面のフォーマット別デフォルトレンダーモードが使われます。

`auto` などの非推奨または未サポート値は Warning を出し、フォーマット別デフォルトへフォールバックします。

Mermaid overview modeでは、ノード内の内容は最小限に保ちます。詳細確認にはCustom mode、エクスポートしやすい class body 表示には Mermaid Detail を使います。

ツールバーでの切り替えは一時的なもので、Markdownやfrontmatterを書き換えません。

## セクション

推奨構成:

```text
# <Class Name>

## Summary

## Attributes

## Methods

## Relations

## Source Links

## Notes
```

### Summary

`## Summary` には、クラスの責務、役割、設計メモを記述します。

このセクションは自由記述です。

### Attributes

`## Attributes` は、クラスが持つフィールドやプロパティを定義するために使います。

期待されるヘッダー:

```markdown
| name | type | visibility | static | notes |
|---|---|---|---|---|
```

列の意味:

| column       | meaning                                               |
| ------------ | ----------------------------------------------------- |
| `name`       | 属性 / フィールド名です。                                        |
| `type`       | 型名です。単純で読みやすい名前を推奨します。                                |
| `visibility` | `public`, `private`, `protected`, `package` などの可視性です。 |
| `static`     | `Y` または `N` を指定します。                                   |
| `notes`      | 任意の補足説明です。                                            |

例:

```markdown
## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| id | string | private | N | Identifier |
| status | OrderStatus | private | N | Current order status |
| items | OrderItem | private | N | Multiple values |
```

### Methods

`## Methods` は、クラスの操作を定義するために使います。

期待されるヘッダー:

```markdown
| name | parameters | returns | visibility | static | notes |
|---|---|---|---|---|---|
```

列の意味:

| column       | meaning                                               |
| ------------ | ----------------------------------------------------- |
| `name`       | メソッド名です。                                              |
| `parameters` | パラメータ一覧を読みやすいテキストで記述します。                              |
| `returns`    | 戻り値の型または結果名です。                                        |
| `visibility` | `public`, `private`, `protected`, `package` などの可視性です。 |
| `static`     | `Y` または `N` を指定します。                                   |
| `notes`      | 任意の補足説明です。                                            |

例:

```markdown
## Methods

| name | parameters | returns | visibility | static | notes |
|---|---|---|---|---|---|
| addItem | item: OrderItem | void | public | N | Adds an order line |
| getTotal |  | Money | public | N | Calculates total amount |
```

### Relations

`## Relations` は、現在のクラスから外向きに伸びる関連を定義するために使います。

現在の標準形式では、`class` の関連には `from` 列を使いません。関連元は、このファイルの `frontmatter.id` として暗黙的に扱われます。

期待されるヘッダー:

```markdown
| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
```

列の意味:

| column              | meaning                          |
| ------------------- | -------------------------------- |
| `id`                | 関連IDです。                          |
| `to`                | 関連先のクラス相当オブジェクトID、またはWikilinkです。 |
| `kind`              | 関連種別です。                          |
| `label`             | 任意の関連ラベルです。                      |
| `from_multiplicity` | 現在のクラス側の多重度です。                   |
| `to_multiplicity`   | 関連先側の多重度です。                      |
| `notes`             | 任意の補足説明です。                       |

代表的な `kind`:

* `association`
* `dependency`
* `inheritance`
* `implementation`
* `aggregation`
* `composition`

例:

```markdown
## Relations

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
| REL-ORDER-SERVICE-USES-REPOSITORY | IF-ORDER-REPOSITORY | dependency | uses |  |  |  |
| REL-ORDER-HAS-ITEM | CLS-ORDER-ITEM | aggregation | has | 1 | 0..* |  |
```

### Source Links

`## Source Links` は任意セクションです。

クラスモデルを、実装ファイル、テスト、設定ファイル、その他のローカル参照へ結びつけるために使います。

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
| src/order/OrderService.ts | Implementation source |
| test/order/OrderService.test.ts | Unit tests |
```

詳細は [FORMAT-common-sections](../../formats/FORMAT-common-sections.md) を参照してください。

### Notes

`## Notes` は自由記述の設計メモに使います。

追加情報を保存するために、構造化テーブルへ未対応の列を追加しないでください。
補足情報は `notes`, `## Notes`, `## Source Links` のいずれかに記述してください。

## 互換性

古い `class` ファイルには、`## Relations` に `from` 列が含まれている場合があります。

互換性方針:

* `from` 列なし: 現在の標準形式です。
* `from` 列あり: レガシー互換形式です。
* `from` が現在のファイルIDと一致する: 互換性上は許容されます。
* `from` が現在のファイルIDと異なる: 不審な関連として扱い、警告対象になる可能性があります。

新しいテンプレート、サンプル、AI生成ファイルでは、`from` を含まない現在の形式を使ってください。

明示的な `from` / `to` を持つ図全体の関連を定義したい場合は、`class_diagram` を使います。

## テーブル

### Attributes table

```markdown
| name | type | visibility | static | notes |
|---|---|---|---|---|
```

### Methods table

```markdown
| name | parameters | returns | visibility | static | notes |
|---|---|---|---|---|---|
```

### Relations table

```markdown
| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
```

### Source Links table

```markdown
| path | notes |
|---|---|
```

## よくあるミス

### 新しいclass関連に `from` 列を追加する

新規ファイルでは、次の形式は避けてください。

```markdown
| id | from | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|---|
```

現在の標準形式を使います。

```markdown
| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
```

### classファイルで図全体の関連を定義する

`class` ファイルでは、そのファイル自身から外向きに伸びる関連を定義します。

複数クラス間の関連を1つの概要図として定義したい場合は、`class_diagram` を使ってください。

### 未対応の列を追加する

対象セクションで明示的に定義されていない限り、`description`, `ref`, `source`, `target` などの列を追加しないでください。

補足情報は `notes` または任意セクションに記述してください。

### Markdownテーブルとして危険な記法を使う

テーブルセル内では、生の `|` を避けます。

避ける例:

```text
string | null
```

推奨:

```text
string
```

任意性は `notes` または対応する列で補足します。

### 複雑な型表現を使いすぎる

単純な型名で十分な場合は、複雑な型表現を避けます。

危険な例:

* `string[]`
* `Array<string>`
* `Optional<string>`
* `string | null`

読みやすい型名を優先し、複数性や任意性は `notes` に補足してください。

## AI生成時の注意

AIで `class` ファイルを生成する場合は、次の点に注意してください。

* `type: class` を使う。
* 1ファイルで1つのクラス相当オブジェクトを定義する。
* テーブルヘッダーを正確に保つ。
* 未対応の列を追加しない。
* 単純なIDを使う。
* `## Relations` は現在のクラスから外向きの関連として記述する。
* 新しい `class` の関連テーブルには `from` 列を追加しない。
* 図全体の関連には `class_diagram` を使う。
* 型名は単純で読みやすいものを優先する。
* 補足説明は `notes` または `## Notes` に書く。
* 実装ファイルを元にしたモデルでは、`## Source Links` を使う。

AIがソースコードを読んでclassモデルを作成した場合は、必ず元のソースファイルと照合してください。
このレビューにはSource Linksが有用です。

## 関連サンプル

* [Inventory service class](../../../samples/class/CLS-WMS-INVENTORY-SERVICE.md)
* [Inventory repository interface](../../../samples/class/IF-WMS-INVENTORY-REPOSITORY.md)
* [Allocation policy class](../../../samples/class/CLS-WMS-ALLOCATION-POLICY.md)
* [Class samples index](../../../samples/class/README.md)

## 関連フォーマット

* [class_diagram](FORMAT-class_diagram.md)
* [Common sections](FORMAT-common-sections.md)
