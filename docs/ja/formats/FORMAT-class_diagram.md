# FORMAT-class_diagram

## 目的
複数の `class` オブジェクトを束ねて、クラス図として表示するための図表定義ファイル。

Class 単体定義は別の `class` ファイルで管理し、
この diagram ファイルでは
- 対象オブジェクト
- 関係性一覧
を保持する。

---

## 基本方針

- `type: class_diagram` を持つ
- 図に含める object を列挙する
- 関係は diagram ファイル内で複数定義できる
- 関係は Markdown テーブルで記述する
- object 参照は生文字列または wikilink を許容する

---

## Frontmatter

### 必須
- `type`
- `id`
- `name`

### 任意
- `tags`
- `render_mode`

### 例
```yaml
---
type: class_diagram
id: CLASSD-ORDER
name: Order Schema
tags:
  - Class
  - Diagram
---
```

---

## 本文構成

```text
# <diagram name>

## Summary

## Objects

## Relations

## Notes
```

---

## Summary

図の要約や対象範囲を記述する。

### 例
```markdown
## Summary

Order 周辺のクラス構造を定義する。
```

---

## Objects

### 形式
Markdown テーブル

### 列
- `ref`
- `notes`

### 意味
- `ref`
  - 対象 class 参照
- `notes`
  - 任意

### 記法
以下を許容する想定
- `CLS-ORDER-ORDER`
- `[[CLS-ORDER-ORDER]]`
- `[[order/CLS-ORDER-ORDER]]`
- `[[CLS-ORDER-ORDER|Order]]`

### 例
```markdown
## Objects

| ref | notes |
|---|---|
| [[CLS-ORDER-ORDER]] | 注文エンティティ |
| [[CLS-ORDER-ORDER-SERVICE]] | 注文サービス |
| [[IF-ORDER-ORDER-REPOSITORY]] | リポジトリIF |
| [[CLS-CUSTOMER-CUSTOMER]] | 顧客 |
```

---

## Relations

### 形式
Markdown テーブル

### 列
- `id`
- `from`
- `to`
- `kind`
- `label`
- `from_multiplicity`
- `to_multiplicity`
- `notes`

### 値の考え方
- `kind`
  - `association`
  - `dependency`
  - `inheritance`
  - `implementation`
  - `aggregation`
  - `composition`
  など
- `label`
  - 任意
- `from_multiplicity`, `to_multiplicity`
  - 任意
- `notes`
  - 任意

### 例
```markdown
## Relations

| id | from | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|---|
| REL-ORDER-ASSOCIATES-CUSTOMER | [[CLS-ORDER-ORDER]] | [[CLS-CUSTOMER-CUSTOMER]] | association | belongs to | 0..* | 1 |  |
| REL-ORDER-SERVICE-DEPENDS-ORDER | [[CLS-ORDER-ORDER-SERVICE]] | [[CLS-ORDER-ORDER]] | dependency | creates |  |  |  |
| REL-ORDER-SERVICE-DEPENDS-ORDER-REPOSITORY | [[CLS-ORDER-ORDER-SERVICE]] | [[IF-ORDER-ORDER-REPOSITORY]] | dependency | uses |  |  |  |
```

---

## Render mode

`class_diagram` は V0.7 で Custom / Mermaid を切り替えられます。

- `auto`: format default を使う。`class_diagram` では Custom に解決される
- `custom`: 詳細レビュー表示
- `mermaid`: 関係俯瞰表示

Mermaid mode では、node 内の情報量を抑え、関係の見通しを優先します。class node は原則として名前のみを表示し、属性・メソッドの詳細は表示しません。詳細確認は Custom mode で行います。

Toolbar の選択は一時的な表示切替であり、Markdown / frontmatter には書き戻しません。

---

## Notes

自由記述の補足。

### 例
```markdown
## Notes

- 初期実装では dependency と association の表示確認を優先
```

---

## 完成例

```markdown
---
type: class_diagram
id: CLASSD-ORDER
name: Order Schema
tags:
  - Class
  - Diagram
---

# Order Schema

## Summary

Order 周辺のクラス構造を定義する。

## Objects

| ref | notes |
|---|---|
| [[CLS-ORDER-ORDER]] | 注文エンティティ |
| [[CLS-ORDER-ORDER-SERVICE]] | 注文サービス |
| [[IF-ORDER-ORDER-REPOSITORY]] | リポジトリIF |
| [[CLS-CUSTOMER-CUSTOMER]] | 顧客 |

## Relations

| id | from | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|---|
| REL-ORDER-ASSOCIATES-CUSTOMER | [[CLS-ORDER-ORDER]] | [[CLS-CUSTOMER-CUSTOMER]] | association | belongs to | 0..* | 1 |  |
| REL-ORDER-SERVICE-DEPENDS-ORDER | [[CLS-ORDER-ORDER-SERVICE]] | [[CLS-ORDER-ORDER]] | dependency | creates |  |  |  |
| REL-ORDER-SERVICE-DEPENDS-ORDER-REPOSITORY | [[CLS-ORDER-ORDER-SERVICE]] | [[IF-ORDER-ORDER-REPOSITORY]] | dependency | uses |  |  |  |

## Notes

- 初期実装では dependency と association の表示確認を優先
```