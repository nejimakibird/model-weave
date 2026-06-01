# FORMAT-class_diagram

English Version: [English](../../formats/FORMAT-class_diagram.md)

## 何に使うフォーマットか

`class_diagram` は、複数の `class` ファイルをまとめて表示する概要図を定義するためのフォーマットです。

次のような場合に使います。

* 複数クラス間の関係を表示したい
* パッケージ、モジュール、レイヤー単位の概要を作りたい
* サービス、リポジトリ、ドメイン、DTO の関係を確認したい
* ドキュメントやレビュー用の図を作りたい
* 既存の `class` ファイルを読みやすいビューにまとめたい

`class_diagram` ファイルは、個々の `class` ファイルの代わりではありません。

使い分けは次の通りです。

* `class`: 1つのクラス相当オブジェクトを定義する
* `class_diagram`: 複数のクラス相当オブジェクトを含む概要図を定義する

## 重要な考え方: Objects と Relations

`class_diagram` には、役割の異なる2つの概念があります。

* `## Objects`: 図に含めるクラス相当オブジェクトを選ぶ
* `## Relations`: 図に明示的に表示する関係線を任意で定義する

多くの場合、`## Objects` だけで図は成立します。

`## Relations` を省略した場合、または空の場合、Model Weave は参照先 `class` ファイルの `## Relations` から関係を収集できます。

つまり、基本の考え方は次の通りです。

* 各クラスが持つ関係は、通常は個別の `class` ファイルに書く
* `class_diagram` は、どのクラスを図に含めるかを選ぶ
* `class_diagram` の `## Relations` は、図に表示する関係線を明示的に制御したい場合に使う

## ER図との違い

`class_diagram` と `er_diagram` は、どちらも図に含める対象を選ぶ点では似ています。

しかし、関係の扱いが異なります。

ERモデルでは、通常は次の考え方になります。

* `er_diagram` は主に `## Objects` で対象エンティティを列挙する
* ERの関係は各 `er_entity` から収集する
* 図ファイル側では通常、ER関係を直接定義しない

Classモデルでは、次のようになります。

* `class_diagram` は `## Objects` で対象クラスを列挙する
* 関係は各 `class` から収集できる
* 必要に応じて、`class_diagram` 側に任意の `## Relations` を書き、図レベルの関係線を明示的に制御できる

図レベルの `## Relations` は、明示的な制御が必要な場合にだけ使ってください。

## 最小例

この例では、図に含めるオブジェクトだけを列挙しています。
関係は、参照先の `class` ファイルから収集できます。

```markdown
---
type: class_diagram
id: CLASSD-ORDER-SERVICE
name: Order Service Class Diagram
---

# Order Service Class Diagram

## Objects

| ref | notes |
|---|---|
| [[CLS-ORDER-SERVICE]] | Application service |
| [[IF-ORDER-REPOSITORY]] | Repository interface |
```

## 明示的な Relations を使う例

この図に表示する関係線を固定または制限したい場合は、明示的な `## Relations` を使います。

```markdown
---
type: class_diagram
id: CLASSD-ORDER-SERVICE
name: Order Service Class Diagram
---

# Order Service Class Diagram

## Objects

| ref | notes |
|---|---|
| [[CLS-ORDER-SERVICE]] | Application service |
| [[IF-ORDER-REPOSITORY]] | Repository interface |

## Relations

| id | from | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|---|
| REL-ORDER-SERVICE-USES-REPOSITORY | CLS-ORDER-SERVICE | IF-ORDER-REPOSITORY | dependency | uses |  |  | Explicit diagram relation |
```

## 詳細例

```markdown
---
type: class_diagram
id: CLASSD-ORDER-FLOW
name: Order Flow Class Diagram
tags:
  - ClassDiagram
---

# Order Flow Class Diagram

## Summary

Class overview for order creation and inventory allocation.

## Objects

| ref | notes |
|---|---|
| [[CLS-ORDER-SERVICE]] | Coordinates order operations |
| [[IF-ORDER-REPOSITORY]] | Persistence interface |
| [[CLS-ALLOCATION-POLICY]] | Stock allocation rules |
| [[DTO-CREATE-ORDER-REQUEST]] | Input DTO |

## Relations

| id | from | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|---|
| REL-SERVICE-USES-REPOSITORY | CLS-ORDER-SERVICE | IF-ORDER-REPOSITORY | dependency | uses |  |  | Explicitly shown in this diagram |
| REL-SERVICE-USES-POLICY | CLS-ORDER-SERVICE | CLS-ALLOCATION-POLICY | dependency | checks |  |  | Explicitly shown in this diagram |
| REL-SERVICE-USES-REQUEST | CLS-ORDER-SERVICE | DTO-CREATE-ORDER-REQUEST | dependency | receives |  |  | Explicitly shown in this diagram |

## Source Links

| path | notes |
|---|---|
| src/order/ | Order module implementation |
| docs/order-flow.md | Design note |
```

## Frontmatter

必須項目:

| field  | required | notes                   |
| ------ | -------- | ----------------------- |
| `type` | yes      | `class_diagram` を指定します。 |
| `id`   | yes      | 一意の図モデルIDです。            |
| `name` | yes      | 図の表示名です。                |

任意項目:

| field         | notes                                |
| ------------- | ------------------------------------ |
| `render_mode` | 任意です。指定できる値は `custom`, `mermaid`, `mermaid-detail` です。 |
| `tags`        | Obsidian / Markdown のタグです。           |
| `scope`       | パッケージ、レイヤー、モジュール、機能などの論理スコープです。      |
| `notes`       | 必要に応じた短い補足です。                        |

例:

```yaml
---
type: class_diagram
id: CLASSD-ORDER-FLOW
name: Order Flow Class Diagram
tags:
  - ClassDiagram
---
```

## Render mode

`class_diagram` はレンダラー切り替えに対応しています。

指定できる値:

* `custom`
* `mermaid`
* `mermaid-detail`

意味:

| value            | meaning                                      |
| ---------------- | -------------------------------------------- |
| `custom`         | テーブルやナビゲーションを含む詳細レビュー用の表示です。         |
| `mermaid`        | クラス図や関係グラフの概要表示です。                    |
| `mermaid-detail` | class body detail を含む Mermaid 表示です。           |

`render_mode` を省略した場合は、設定画面のフォーマット別デフォルトレンダーモードが使われます。

`auto` などの非推奨または未サポート値は Warning を出し、フォーマット別デフォルトへフォールバックします。

Mermaid modeは概要図に向いています。
Custom modeは、行、参照、診断、ナビゲーションの詳細を確認するときに向いています。

ツールバーでの切り替えは一時的なもので、Markdownやfrontmatterを書き換えません。

## セクション

推奨構成:

```text
# <Diagram Name>

## Summary

## Objects

## Relations

## Source Links

## Notes
```

`## Relations` は任意です。

### Summary

`## Summary` には、図の目的、対象範囲、レビュー観点などを記述します。

このセクションは自由記述です。

### Objects

`## Objects` は、図に含めるクラス相当オブジェクトを一覧化するために使います。

期待されるヘッダー:

```markdown
| ref | notes |
|---|---|
```

列の意味:

| column  | meaning                         |
| ------- | ------------------------------- |
| `ref`   | `class` ファイルへのWikilink、または参照です。 |
| `notes` | 任意の補足説明です。                      |

例:

```markdown
## Objects

| ref | notes |
|---|---|
| [[CLS-ORDER-SERVICE]] | Application service |
| [[IF-ORDER-REPOSITORY]] | Repository interface |
```

注意:

* `## Objects` は図の対象範囲を定義します。
* 関係は通常、参照先の `class` ファイルから収集されます。
* オブジェクト参照は安定させてください。
* 表示ラベルをIDとして使わないでください。
* 可能な場合、表示名は参照先 `class` ファイルの `name` を利用します。

### Relations

`## Relations` は `class_diagram` では任意です。

この図に表示する関係線を明示的に定義したい場合に使います。

期待されるヘッダー:

```markdown
| id | from | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|---|
```

列の意味:

| column              | meaning      |
| ------------------- | ------------ |
| `id`                | 関連IDです。      |
| `from`              | 関連元のクラスIDです。 |
| `to`                | 関連先のクラスIDです。 |
| `kind`              | 関連種別です。      |
| `label`             | 任意の関連ラベルです。  |
| `from_multiplicity` | 関連元側の多重度です。  |
| `to_multiplicity`   | 関連先側の多重度です。  |
| `notes`             | 任意の補足説明です。   |

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

| id | from | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|---|
| REL-SERVICE-USES-REPOSITORY | CLS-ORDER-SERVICE | IF-ORDER-REPOSITORY | dependency | uses |  |  | Explicitly shown in this diagram |
```

`## Relations` を省略した場合、または空の場合、Model Weave は参照先 `class` ファイルから関連を収集できます。

`## Relations` が存在する場合は、図レベルの明示的な関係リストとして扱います。

このセクションは注意して使ってください。
その関連がクラスモデル自体の関係である場合は、元の `class` ファイルに定義することを優先します。

### Source Links

`## Source Links` は任意セクションです。

図を、実装ディレクトリ、アーキテクチャメモ、パッケージ単位のソース、設計ドキュメントなどへ結びつけるために使います。

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
| src/order/ | Order module implementation |
| docs/order-flow.md | Related design note |
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

### Relations table

```markdown
| id | from | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|---|
```

このテーブルは `class_diagram` では任意です。

### Source Links table

```markdown
| path | notes |
|---|---|
```

## よくあるミス

### Relationsが常に必要だと思ってしまう

`class_diagram` では、`## Relations` が常に必要なわけではありません。

参照先の `class` ファイルがそれぞれ `## Relations` を定義している場合、図はそれらの関係を利用できます。

図レベルの `## Relations` は、この図で表示する関係線を明示的に制御したい場合にだけ使います。

### class_diagramにクラス詳細をすべて書いてしまう

`class_diagram` に、各クラスの属性やメソッドをすべて書かないでください。

クラス詳細は個別の `class` ファイルに書きます。

`class_diagram` は、それらの `class` ファイルを選び、関係づけるために使います。

### class_diagramとer_diagramを同じものとして扱う

Class図とER図の関係処理を同じだと思わないでください。

ER図では、通常、関係は `er_entity` ファイルから収集され、図ファイル側ではER関係を直接定義しません。

Class図では、明示的な関係制御が必要な場合に、図レベルの `## Relations` を使えます。

### 明示Relationsで使うオブジェクトがObjectsに存在しない

`## Relations` を使う場合、`from` と `to` は `## Objects` に含まれるクラスを指す必要があります。

危険な例:

```markdown
| id | from | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|---|
| REL-UNKNOWN | CLS-ORDER-SERVICE | CLS-MISSING | dependency | uses |  |  | Missing target |
```

参照するクラスは、必ず `## Objects` に明示してください。

### ラベルをIDとして使う

Relationsでは、表示ラベルではなく安定したクラスIDを参照してください。

避ける例:

```markdown
| REL-1 | OrderService | OrderRepository | dependency | uses |  |  |  |
```

推奨:

```markdown
| REL-1 | CLS-ORDER-SERVICE | IF-ORDER-REPOSITORY | dependency | uses |  |  |  |
```

### 未対応の列を追加する

対象セクションで明示的に定義されていない限り、`description`, `source`, `target_path`, `rule` などの列を追加しないでください。

補足情報は `notes` または任意セクションに記述してください。

### Markdownテーブルとして危険な記法を使う

テーブルセル内では、生の `|` を避けます。

テーブル内では、`[[CLS-ORDER-SERVICE|OrderService]]` のようなWikilinkエイリアスを避けてください。
代わりに `[[CLS-ORDER-SERVICE]]` を使い、表示名は参照先classの `name` や `notes` で補足します。

## AI生成時の注意

AIで `class_diagram` ファイルを生成する場合は、次の点に注意してください。

* `type: class_diagram` を使う。
* `## Objects` で図に含めるクラスを選ぶ。
* クラス詳細は `class` ファイルに書く。
* テーブルヘッダーを正確に保つ。
* 未対応の列を追加しない。
* `## Classes` ではなく `## Objects` を使う。
* 明示的な図レベルの関係制御が必要な場合以外は、`## Relations` を追加しない。
* `## Relations` を使う場合は、すべての `from` / `to` が `## Objects` に含まれるクラスを指すことを確認する。
* 補足説明は `notes` または `## Notes` に書く。
* パッケージディレクトリ、実装ファイル、アーキテクチャメモなどには `## Source Links` を使う。
* Class図の関係処理をER図と同じものとして扱わない。

AIがソースコードを元に図を作成した場合は、オブジェクト一覧と関係線を実装と照合してください。
このレビューにはSource Linksが有用です。

## 関連サンプル

* [WMS service class diagram](../../../samples/class/CLASSD-WMS-SERVICE.md)
* [Class samples index](../../../samples/class/README.md)

## 関連フォーマット

* [class](FORMAT-class.md)
* [Common sections](../../formats/FORMAT-common-sections.md)
