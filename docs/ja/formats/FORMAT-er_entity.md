# FORMAT-er_entity

## 目的
ERのエンティティ（テーブル）を表現する単体定義ファイル。

- 論理名 / 物理名
- Columns
- Indexes
- Relations（自テーブルから出る関係のみ）

を保持する。

---

## 基本方針

- `type: er_entity` を持つ
- `Columns` は Markdown テーブルで管理
- `Indexes` は Markdown テーブルで管理
- `Relations` は Entity ファイル内に持つ
- `Relations` は **outbound relation のみ** を正本として持つ
- inbound relation はプラグイン側で逆引き生成する
- `target_table` は relation block 単位で管理する
- 複合FKは Mapping テーブルで表現する
- `kind` はファイル仕様上は文字列で保持する
- 現時点では `kind: fk` を主な利用対象とする
- `cardinality` は任意

---

## Frontmatter

### 必須
- `type`
- `id`
- `logical_name`
- `physical_name`

### 任意
- `schema_name`
- `dbms`
- `tags`
- `render_mode`

### 例
```yaml
---
type: er_entity
id: ENT-CUSTOMER
logical_name: 顧客
physical_name: m_customer
schema_name: public
dbms: postgresql
tags:
  - ER
  - Entity
---
```

---

## Render mode

`er_entity` は V0.7 で Custom / Mermaid を切り替えられます。

- `auto`: format default を使う。`er_entity` では Custom に解決される
- `custom`: columns / indexes / relations を含む詳細レビュー表示
- `mermaid`: 自 Entity と関連 Entity を中心にした関係俯瞰表示

Mermaid mode では、図全体の見通しを優先します。node 内の表示は `logical_name` / `physical_name` などの識別情報に絞り、Columns / Indexes の詳細は表示しません。詳細確認は Custom mode で行います。

Toolbar の選択は一時的な表示切替であり、Markdown / frontmatter には書き戻しません。

---

## 本文構成

```text
# <Logical Name> / <physical_name>

## Overview

## Columns

## Indexes

## Relations

## Notes
```

---

## Overview

自由記述の要約セクション。

### 例
```markdown
## Overview

- purpose: 顧客基本情報を管理するマスタ
- notes: EC・受注・請求で共通参照
```

---

## Columns

### 形式
Markdown テーブル

### 列
- `logical_name`
- `physical_name`
- `data_type`
- `length`
- `scale`
- `not_null`
- `pk`
- `encrypted`
- `default_value`
- `notes`

### 値ルール
- `not_null`, `pk`, `encrypted` は `Y` / `N`
- `length`, `scale` は数値または空欄
- `default_value`, `notes` は空欄可

### 例
```markdown
## Columns

| logical_name | physical_name | data_type | length | scale | not_null | pk | encrypted | default_value | notes |
|---|---|---|---:|---:|---|---|---|---|---|
| 顧客ID | customer_id | varchar | 20 |  | Y | Y | N |  | 主キー |
| 顧客名 | customer_name | varchar | 100 |  | Y | N | N |  |  |
| メールアドレス | email | varchar | 255 |  | N | N | N |  |  |
| 作成日時 | created_at | timestamp |  |  | Y | N | N | CURRENT_TIMESTAMP |  |
```

---

## Indexes

### 形式
Markdown テーブル

### 列
- `index_name`
- `index_type`
- `unique`
- `columns`
- `notes`

### 値ルール
- `unique` は `Y` / `N`
- `columns` は単一列または複数列をカンマ区切りで記述
- 複合主キー / 複合ユニークはここで表現する

### 例
```markdown
## Indexes

| index_name | index_type | unique | columns | notes |
|---|---|---|---|---|
| pk_m_customer | PRIMARY | Y | customer_id | 主キー |
| idx_m_customer_email | BTREE | Y | email | メールアドレス一意 |
```

### 複合キー例
```markdown
## Indexes

| index_name | index_type | unique | columns | notes |
|---|---|---|---|---|
| pk_t_order_item | PRIMARY | Y | order_id, line_no | 複合主キー |
| uq_t_order_item_branch | BTREE | Y | order_id, branch_no | 複合ユニーク |
```

---

## Relations

### 基本方針
- `## Relations` 配下に relation block を持つ
- relation block は `### <relation id>` で始める
- relation block は **自テーブルから出る関係** を表す
- 相手テーブルは `target_table` に持つ
- 列対応は Mapping テーブルで表す
- 単一FK / 複合FK の両方に対応する

### relation block 形式
```markdown
### <relation id>
- target_table: [[...]]
- kind: fk
- cardinality: ...
- notes: ...

| local_column | target_column | notes |
|---|---|---|
| ... | ... | ... |
```

### relation block 属性
- `target_table`
  - 相手テーブル
  - wikilink を推奨
- `kind`
  - 文字列
  - 当面は `fk` を主要値とする
- `cardinality`
  - 任意
  - 表示用ラベルとして利用
- `notes`
  - 任意

### Mapping テーブル列
- `local_column`
- `target_column`
- `notes`

### 単一FK例
```markdown
## Relations

### REL-ORDER-TO-CUSTOMER
- target_table: [[m_customer]]
- kind: fk
- cardinality: N-1
- notes: 顧客を参照

| local_column | target_column | notes |
|---|---|---|
| customer_id | customer_id | 顧客ID |
```

### 複合FK例
```markdown
## Relations

### REL-ORDER-ITEM-TO-ORDER
- target_table: [[t_order]]
- kind: fk
- cardinality: N-1
- notes: 注文を参照

| local_column | target_column | notes |
|---|---|---|
| order_id | order_id | 注文ID |
| order_branch_no | order_branch_no | 枝番 |
```

### target_table の記法
以下を許容する想定
- `[[m_customer]]`
- `[[master/m_customer]]`
- `[[m_customer|顧客]]`

### Notes
- `target_table` は relation block 単位で1回だけ持つ
- Mapping の各行には `target_table` を持たせない
- relation の正本は outbound のみ
- inbound はプレビューや図で逆引き表示する

---

## Notes

自由記述の補足セクション。

### 例
```markdown
## Notes

- 個人情報を含む
- 将来的にメールアドレス必須化の可能性あり
```

---

## 完成例

```markdown
---
type: er_entity
id: ENT-ORDER
logical_name: 注文
physical_name: t_order
schema_name: public
dbms: postgresql
tags:
  - ER
  - Entity
---

# 注文 / t_order

## Overview

- purpose: 注文情報を管理するトランザクション
- notes: 顧客と注文明細を関連づける中心テーブル

## Columns

| logical_name | physical_name | data_type | length | scale | not_null | pk | encrypted | default_value | notes |
|---|---|---|---:|---:|---|---|---|---|---|
| 注文ID | order_id | varchar | 20 |  | Y | Y | N |  | 主キー |
| 顧客ID | customer_id | varchar | 20 |  | Y | N | N |  | 顧客FK |
| 注文日 | order_date | date |  |  | Y | N | N |  |  |

## Indexes

| index_name | index_type | unique | columns | notes |
|---|---|---|---|---|
| pk_t_order | PRIMARY | Y | order_id | 主キー |
| idx_t_order_customer_id | BTREE | N | customer_id | 顧客別検索用 |

## Relations

### REL-ORDER-TO-CUSTOMER
- target_table: [[m_customer]]
- kind: fk
- cardinality: N-1
- notes: 顧客を参照

| local_column | target_column | notes |
|---|---|---|
| customer_id | customer_id | 顧客ID |

## Notes

- 受注系の中心テーブル
```