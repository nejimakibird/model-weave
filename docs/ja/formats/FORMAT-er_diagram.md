# FORMAT-er_diagram

## 目的
複数の `er_entity` を束ねてER図として表示するための図表定義ファイル。

このファイル自体は relation の正本を持たない。
relation は各 `er_entity` の `## Relations` から収集する。

---

## 基本方針

- `type: er_diagram` を持つ
- ER図に含める Entity を列挙する
- relation は diagram ファイル内で直接持たない
- diagram 表示時に対象 entity から relation を集約して edge を生成する
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
type: er_diagram
id: ERD-ORDER
name: 注文ER図
tags:
  - ER
  - Diagram
---
```

---

## 本文構成

```text
# <diagram name>

## Summary

## Objects

## Notes
```

---

## Summary

図の要約や対象範囲を記述する。

### 例
```markdown
## Summary

注文周辺のERを表示する。
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
  - 対象 entity 参照
  - `er_entity` を指す
- `notes`
  - 任意

### 記法
以下を許容する想定
- `m_customer`
- `t_order`
- `[[m_customer]]`
- `[[master/m_customer]]`
- `[[m_customer|顧客]]`

### 例
```markdown
## Objects

| ref | notes |
|---|---|
| [[m_customer]] | 顧客マスタ |
| [[t_order]] | 注文 |
| [[t_order_item]] | 注文明細 |
| [[m_product]] | 商品マスタ |
```

---

## relation の扱い

### 方針
- `er_diagram` ファイル内には relation を定義しない
- 含まれる `er_entity` の `## Relations` を集約して表示する
- `target_table` が diagram 内 object に含まれていれば edge を表示する
- diagram 外の table を参照している relation は、表示しないか unresolved 扱いとする

### 表示に使う relation 情報
- source entity
- target entity
- `kind`
- `cardinality`
- Mapping 情報

### 備考
- `cardinality` は任意
- 未指定なら線ラベルなしでもよい

---

## Render mode

`er_diagram` は V0.7 で Custom / Mermaid を切り替えられます。

- `auto`: format default を使う。`er_diagram` では Custom に解決される
- `custom`: 詳細レビュー表示
- `mermaid`: 関係俯瞰表示

Mermaid mode では、columns / indexes の詳細は省略し、Entity 間の関係を見通しよく表示します。node 内の表示は `logical_name` / `physical_name` などの識別情報に絞ります。詳細確認は Custom mode で行います。

Toolbar の選択は一時的な表示切替であり、Markdown / frontmatter には書き戻しません。

---

## Notes

自由記述の補足。

### 例
```markdown
## Notes

- 初期実装では注文・注文明細・顧客・商品を対象にする
```

---

## 完成例

```markdown
---
type: er_diagram
id: ERD-ORDER
name: 注文ER図
tags:
  - ER
  - Diagram
---

# 注文ER図

## Summary

注文周辺のERを表示する。

## Objects

| ref | notes |
|---|---|
| [[m_customer]] | 顧客マスタ |
| [[t_order]] | 注文 |
| [[t_order_item]] | 注文明細 |
| [[m_product]] | 商品マスタ |

## Notes

- 顧客、注文、明細、商品を俯瞰するER図
```