# FORMAT-er_diagram

English Version: [English](../../formats/FORMAT-er_diagram.md)

## 何に使うフォーマットか

`er_diagram` は、複数の `er_entity` ファイルをまとめて表示するER概要図を定義するためのフォーマットです。

次のような場合に使います。

* 複数のエンティティ / テーブル間の関係を表示したい
* データベースやドメインデータモデルの概要を作りたい
* テーブル間の関係をレビューしたい
* 既存の `er_entity` ファイルを読みやすい図にまとめたい
* ER概要図をPNGとして出力したい

`er_diagram` ファイルは、個々の `er_entity` ファイルの代わりではありません。

使い分けは次の通りです。

* `er_entity`: 1つのエンティティ / テーブルと、その項目・関連を定義する
* `er_diagram`: 概要図に含めるエンティティを選ぶ

## 重要な考え方: Objectsのみ

`er_diagram` は、主に図の対象範囲を定義します。

多くの場合、図ファイルに必要なのは `## Objects` だけです。

ERの関係は、通常、参照先の各 `er_entity` ファイルから収集されます。

つまり、基本の考え方は次の通りです。

* エンティティの項目は、個別の `er_entity` ファイルに書く
* エンティティ間の関係も、個別の `er_entity` ファイルに書く
* `er_diagram` は、図に含めるエンティティを選ぶことに集中する

`class_diagram` とは異なり、`er_diagram` では通常、図レベルの `## Relations` を直接定義しません。

## Class図との違い

`er_diagram` と `class_diagram` は、どちらも図に含める対象を選ぶ点では似ています。

しかし、関係の扱いが異なります。

Classモデルでは、次のようになります。

* `class_diagram` は `## Objects` で対象クラスを列挙する
* 関係は各 `class` から収集できる
* 必要に応じて、`class_diagram` 側に任意の図レベル `## Relations` を書ける

ERモデルでは、次のようになります。

* `er_diagram` は `## Objects` で対象エンティティを列挙する
* 関係は各 `er_entity` から収集する
* 図ファイル側では通常、ER関係を直接定義しない

この違いにより、同じER関係を複数の図ファイルに重複して書くことを避けられます。

エンティティ間の関係がデータモデルの一部である場合は、関連する `er_entity` ファイルに定義してください。

## 最小例

```markdown
---
type: er_diagram
id: ERD-ORDER-CORE
name: Order Core ER Diagram
---

# Order Core ER Diagram

## Objects

| ref | notes |
|---|---|
| [[ENT-ORDER]] | Order header table |
| [[ENT-ORDER-LINE]] | Order line table |
| [[ENT-CUSTOMER]] | Customer table |
```

## 詳細例

```markdown
---
type: er_diagram
id: ERD-WMS-CORE
name: WMS Core ER Diagram
tags:
  - ER
---

# WMS Core ER Diagram

## Summary

Core entities for warehouse inventory and shipping.

## Objects

| ref | notes |
|---|---|
| [[ENT-INVENTORY]] | Inventory balance |
| [[ENT-ITEM]] | Item master |
| [[ENT-LOCATION]] | Warehouse location |
| [[ENT-STOCK-MOVEMENT]] | Stock movement history |

## Source Links

| path | notes |
|---|---|
| database/schema.sql | Database schema |
| migrations/ | Migration files |

## Notes

- Relationships are defined in each `er_entity` file.
- This diagram selects the entities to include in the overview.
```

## Frontmatter

必須項目:

| field  | required | notes                |
| ------ | -------- | -------------------- |
| `type` | yes      | `er_diagram` を指定します。 |
| `id`   | yes      | 一意の図モデルIDです。         |
| `name` | yes      | 図の表示名です。             |

任意項目:

| field         | notes                                          |
| ------------- | ---------------------------------------------- |
| `render_mode` | 任意です。指定できる値は `custom`, `mermaid`, `mermaid-detail` です。 |
| `tags`        | Obsidian / Markdown のタグです。                     |
| `scope`       | データベース、スキーマ、モジュール、境界づけられたコンテキスト、機能などの論理スコープです。 |
| `notes`       | 必要に応じた短い補足です。                                  |

例:

```yaml
---
type: er_diagram
id: ERD-WMS-CORE
name: WMS Core ER Diagram
tags:
  - ER
---
```

## Render mode

`er_diagram` はレンダラー切り替えに対応しています。

指定できる値:

* `custom`
* `mermaid`
* `mermaid-detail`

意味:

| value            | meaning                            |
| ---------------- | ---------------------------------- |
| `custom`         | テーブルやナビゲーションを含む詳細レビュー用の表示です。       |
| `mermaid`        | ER図や関係グラフの概要表示です。                  |
| `mermaid-detail` | カラム情報を含む Mermaid ER 表示です。             |

Mermaid modeは概要図に向いています。
Custom modeは、参照、診断、ナビゲーションの詳細を確認するときに向いています。
Mermaid Detailは、エクスポートしやすいエンティティ本文表示に向いています。

`render_mode` を省略した場合は、設定画面のフォーマット別デフォルトレンダーモードが使われます。

`auto` などの非推奨または未サポート値は Warning を出し、フォーマット別デフォルトへフォールバックします。

ツールバーでの切り替えは一時的なもので、Markdownやfrontmatterを書き換えません。

## セクション

推奨構成:

```text
# <Diagram Name>

## Summary

## Objects

## Source Links

## Notes
```

### Summary

`## Summary` には、図の目的、対象範囲、データベース領域、レビュー観点などを記述します。

このセクションは自由記述です。

### Objects

`## Objects` は、図に含めるエンティティを一覧化するために使います。

期待されるヘッダー:

```markdown
| ref | notes |
|---|---|
```

列の意味:

| column  | meaning                             |
| ------- | ----------------------------------- |
| `ref`   | `er_entity` ファイルへのWikilink、または参照です。 |
| `notes` | 任意の補足説明です。                          |

例:

```markdown
## Objects

| ref | notes |
|---|---|
| [[ENT-ORDER]] | Order header |
| [[ENT-ORDER-LINE]] | Order details |
| [[ENT-CUSTOMER]] | Customer master |
```

注意:

* `## Objects` は図の対象範囲を定義します。
* 関係は参照先の `er_entity` ファイルから収集されます。
* オブジェクト参照は安定させてください。
* 表示ラベルをIDとして使わないでください。
* 可能な場合、表示名は参照先 `er_entity` ファイルの `name` を利用します。

### Source Links

`## Source Links` は任意セクションです。

ER図を、スキーマファイル、マイグレーションファイル、DB設計書、SQLファイル、ソースコードなどへ結びつけるために使います。

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
| database/schema.sql | Database schema |
| migrations/ | Migration files |
```

詳細は [FORMAT-common-sections](../../formats/FORMAT-common-sections.md) を参照してください。

### Notes

`## Notes` は自由記述の設計メモに使います。

追加情報を保存するために、構造化テーブルへ未対応の列を追加しないでください。
補足情報は `notes`, `## Notes`, `## Source Links` のいずれかに記述してください。

## テーブル

### Objects table

```markdown
| ref | notes |
|---|---|
```

### Source Links table

```markdown
| path | notes |
|---|---|
```

## 関係の扱い

`er_diagram` では、通常、関係を直接定義しません。

ERの関係は `er_entity` ファイルに定義します。

図は `## Objects` でエンティティを選び、そのエンティティ定義から関係を収集します。

これは、明示的な図レベル `## Relations` を使える `class_diagram` とは異なります。

### ER関係をer_entityに書く理由

ERの関係はデータモデルの一部です。

同じ関係を複数の図ファイルに別々に書くと、不整合が起きやすくなります。

そのため、ER関係はエンティティ定義の近くに書き、図はそこから収集する形にします。

## よくあるミス

### er_diagramにRelationsテーブルを追加する

FORMATが明示的に対応していない限り、`er_diagram` に図レベルの `## Relations` を追加しないでください。

危険な例:

```markdown
## Relations

| id | from | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|---|
| REL-ORDER-CUSTOMER | ENT-ORDER | ENT-CUSTOMER | many-to-one | customer | * | 1 |  |
```

ER関係は `er_entity` ファイルに定義してください。

### er_diagramをclass_diagramと同じものとして扱う

ER図とClass図が、同じ方法で関係を扱うと思わないでください。

Class図では、任意の図レベル `## Relations` を使える場合があります。

ER図では、通常、関係は `er_entity` ファイルから収集されます。

### 関係先のエンティティがObjectsに含まれていない

2つのエンティティ間に関係があっても、片方が `## Objects` に含まれていない場合、その関係は図に表示されない、または実装によっては警告対象になる可能性があります。

図に表示したいエンティティは、すべて `## Objects` に含めてください。

### 未対応の列を追加する

FORMATが明示的に定義していない限り、`## Objects` テーブルに `label`, `kind`, `source`, `target`, `description` などの列を追加しないでください。

補足情報は `notes` または任意セクションに記述してください。

### Markdownテーブルとして危険な記法を使う

テーブルセル内では、生の `|` を避けます。

テーブル内では、`[[ENT-ORDER|Order]]` のようなWikilinkエイリアスを避けてください。
代わりに `[[ENT-ORDER]]` を使い、表示名は参照先entityの `name` や `notes` で補足します。

## AI生成時の注意

AIで `er_diagram` ファイルを生成する場合は、次の点に注意してください。

* `type: er_diagram` を使う。
* `## Objects` で図に含めるエンティティを選ぶ。
* エンティティの項目や関係は `er_entity` ファイルに書く。
* テーブルヘッダーを正確に保つ。
* 未対応の列を追加しない。
* 実装が明示的に対応していない限り、図レベルの `## Relations` を追加しない。
* ER図の関係処理をClass図と同じものとして扱わない。
* 補足説明は `notes` または `## Notes` に書く。
* スキーマファイル、マイグレーションファイル、SQLファイル、DB設計書には `## Source Links` を使う。

AIがソースコードやDBスキーマからER図を作成した場合は、一覧化されたエンティティが存在するか、関係が対応する `er_entity` ファイルに定義されているかを確認してください。

## 関連サンプル

* [WMS core ER diagram](../../../samples/er/ERD-WMS-CORE.md)
* [ER samples index](../../../samples/er/README.md)

## 関連フォーマット

* [er_entity](FORMAT-er_entity.md)
* [class_diagram](FORMAT-class_diagram.md)
* [Common sections](FORMAT-common-sections.md)
