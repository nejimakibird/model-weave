# FORMAT-class

## 1. 目的

`class` は、Model Weave におけるクラス、インターフェース、抽象クラス等の単体オブジェクトを定義するためのファイル形式です。

主に以下を管理します。

- クラス基本情報
- Attributes
- Methods
- Relations
- Notes

現行仕様では、`class` の `Relations` は **そのファイル自身を起点とする関係のみを記述する** 方式に変更します。  
そのため、従来の `from` 列は廃止し、`to` を中心とした記述に整理します。

---

## 2. 基本方針

- `type: class` を持つ
- `Attributes` は Markdown テーブルで管理する
- `Methods` は Markdown テーブルで管理する
- `Relations` は Markdown テーブルで管理する
- `Relations` は **このファイル自身から出る relation** のみを記述する
- `from` は明示記述せず、常にこのファイルの `id` とみなす
- 図全体の関係定義は `class_diagram` 側で管理する

---

## 3. Frontmatter

### 必須項目
- `type`
- `id`
- `name`

### 任意項目
- `kind`
- `package`
- `stereotype`
- `tags`
- `render_mode`

### 例

```yaml
---
type: class
id: CLS-ORDER-ORDER
name: Order
kind: class
package: order
stereotype:
tags:
  - Class
---
```

---

## 3.1 Render mode

`class` は V0.7 で Custom / Mermaid を切り替えられます。

- `auto`: format default を使う。`class` では Custom に解決される
- `custom`: 属性・メソッド・関係を含む詳細レビュー表示
- `mermaid`: 自クラスと関連オブジェクトを中心にした関係俯瞰表示

Mermaid mode では、図全体の見通しを優先します。node 内の表示は原則として `name` のみに絞り、Attributes / Methods の詳細は表示しません。詳細確認は Custom mode で行います。

Toolbar の選択は一時的な表示切替であり、Markdown / frontmatter には書き戻しません。

---

## 4. 本文構成

推奨構成:

```md
# <Class Name>

## Summary

<概要>

## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| ... | ... | ... | ... | ... |

## Methods

| name | parameters | returns | visibility | static | notes |
|---|---|---|---|---|---|
| ... | ... | ... | ... | ... | ... |

## Relations

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
| ... | ... | ... | ... | ... | ... | ... |

## Notes

- <任意メモ>
```

---

## 5. `## Attributes` 仕様

### 列名
- `name`
- `type`
- `visibility`
- `static`
- `notes`

### 値ルール
- `visibility` は `public` / `private` / `protected` / `package` などを推奨
- `static` は `Y` / `N`

### 例

```md
## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| id | string | private | N | 受注ID |
| orderItems | List<OrderItem> | private | N | 明細一覧 |
```

---

## 6. `## Methods` 仕様

### 列名
- `name`
- `parameters`
- `returns`
- `visibility`
- `static`
- `notes`

### 値ルール
- `static` は `Y` / `N`
- `parameters` は自由記述でよい

### 例

```md
## Methods

| name | parameters | returns | visibility | static | notes |
|---|---|---|---|---|---|
| addItem | item: OrderItem | void | public | N | 明細追加 |
| getTotal |  | Money | public | N | 合計金額算出 |
```

---

## 7. `## Relations` 仕様

### 方針
`class` の relation は、**そのファイル自身を起点とする relation** を複数本テーブルで管理します。

現行仕様では `from` 列を持ちません。  
`from` は常に **このファイル自身の frontmatter `id`** と解釈します。

### 列名
- `id`
- `to`
- `kind`
- `label`
- `from_multiplicity`
- `to_multiplicity`
- `notes`

### `kind` の例
- `association`
- `dependency`
- `inheritance`
- `implementation`
- `aggregation`
- `composition`

### 解釈ルール
各行は内部的に以下のように解釈します。

- `from` = このファイル自身の `id`
- `to` = テーブル記載値
- `kind` = テーブル記載値
- `label` = 任意
- `from_multiplicity` = 任意
- `to_multiplicity` = 任意
- `notes` = 任意

### 例

```md
## Relations

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
| REL-ORDER-ASSOCIATES-CUSTOMER | CLS-CUSTOMER-CUSTOMER | association | belongs to | 0..* | 1 |  |
| REL-ORDER-DEPENDS-ORDERITEM | CLS-ORDER-ORDER-ITEM | aggregation | has | 1 | 0..* |  |
| REL-ORDER-USES-REPOSITORY | IF-ORDER-ORDER-REPOSITORY | dependency | uses |  |  |  |
```

### 補足
- `to` は ID ベースを基本とする
- `class` 単体ファイルでは、他クラス同士の relation を記述しない
- 図全体の関係を自由に定義したい場合は `class_diagram` 側を使用する
- 旧来の `from / to` 形式は互換読み込み対象とするが、現行仕様の正規形式ではない

---

## 8. `class_diagram` との役割分担

`class` は **単体オブジェクト定義** であり、`Relations` はそのオブジェクト自身を起点にした関係のみを持ちます。  
一方 `class_diagram` は **図全体の関係定義** を持つため、引き続き `from / to` の両方を明示する形式を維持します。

つまり、現行仕様では以下のように役割を分けます。

- `class`
  - 自分から他オブジェクトへの relation を定義
  - `from` は暗黙
- `class_diagram`
  - 図全体の relation を定義
  - `from` / `to` を明示

---

## 9. 互換方針

### 旧形式
旧形式では、`class` の `## Relations` に以下の列がありました。

- `id`
- `from`
- `to`
- `kind`
- `label`
- `from_multiplicity`
- `to_multiplicity`
- `notes`

### 現行仕様の扱い
現行仕様では、旧形式の `class` relation も当面は読み込み可能とします。

#### 読み込みルール
- `from` 列がない → 現行形式として扱う
- `from` 列がある → 旧形式として扱う

#### 補足メッセージ方針
- `from == このファイルの id`  
  → Note 相当
- `from != このファイルの id`  
  → Warning 相当

### 移行方針
新規作成・テンプレート・補完はすべて 現行形式へ寄せる。  
旧形式は互換読み込み対象とし、将来的に段階的縮退を検討する。

---

## 10. 完成サンプル

```md
---
type: class
id: CLS-ORDER-ORDER
name: Order
kind: class
package: order
tags:
  - Class
---

# Order

## Summary

受注を表す中心クラス。

## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| id | string | private | N | 受注ID |
| customerId | string | private | N | 顧客ID |
| orderItems | List<OrderItem> | private | N | 明細一覧 |

## Methods

| name | parameters | returns | visibility | static | notes |
|---|---|---|---|---|---|
| addItem | item: OrderItem | void | public | N | 明細追加 |
| getTotal |  | Money | public | N | 合計金額算出 |

## Relations

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
| REL-ORDER-ASSOCIATES-CUSTOMER | CLS-CUSTOMER-CUSTOMER | association | belongs to | 0..* | 1 |  |
| REL-ORDER-DEPENDS-ORDERITEM | CLS-ORDER-ORDER-ITEM | aggregation | has | 1 | 0..* |  |
| REL-ORDER-USES-REPOSITORY | IF-ORDER-ORDER-REPOSITORY | dependency | uses |  |  |  |

## Notes

- class relation はそのファイル自身を起点とする定義のみを持つ
```

---

## 11. 現行仕様の要点

- `class` の `Relations` から `from` を削除
- `from` はそのファイル自身の `id` 固定
- `class_diagram` は `from / to` を維持
- 新規作成・テンプレート・補完は新形式に統一
- 旧形式は互換読み込み対象
