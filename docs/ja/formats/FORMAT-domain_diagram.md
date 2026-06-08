# FORMAT-domain_diagram

English Version: [English](../../formats/FORMAT-domain_diagram.md)

## 何に使うフォーマットか

`domain_diagram` は、複数の standalone `type: domains` files を統合して表示するためのフォーマットです。

再利用可能な Domain 定義を選び、1つの preview として統合し、全体構造を視覚的に確認したい場合に使います。

`domain_diagram` は diagram / selective view です。再利用可能な Domain entries は `type: domains` files に残します。

## 最小例

```markdown
---
type: domain_diagram
id: DOMAIN-DIAGRAM-MODEL-WEAVE
name: ModelWeaveDomainDiagram
---

## Domain Sources

| ref | notes |
|---|---|
| [[DOMAINS-COMPANY]] | User and team context |
| [[DOMAINS-MODEL-WEAVE]] | Model Weave internal areas |
```

## Domain Sources

期待されるヘッダー:

```markdown
| ref | notes |
|---|---|
```

列の意味:

| column | required | notes |
|---|---|---|
| `ref` | yes | `type: domains` file への Wikilink、file basename、frontmatter `id`、または vault path です。 |
| `notes` | no | 人間向けの説明です。 |

source refs は、参照先ファイルの basename または frontmatter id と、大文字小文字を含めて一致させることを推奨します。

推奨 convention:

```text
file name: DOMAINS-COMPANY.md
frontmatter id: DOMAINS-COMPANY
Domain Source ref: [[DOMAINS-COMPANY]]
```

source order は意味を持ちます。重複する Domain ids がある場合、rendering では後の source が優先されます。duplicate や conflict の diagnostics は引き続き表示されます。

## Diagnostics

Model Weave は次の内容を診断します。

* `ref` がない
* `ref` を解決できない
* source が `type: domains` ではない
* source に Domain rows がない
* duplicate Domain id
* `name` conflict
* `kind` conflict
* `parent` conflict

`description` conflict は、現在は noise を減らすために無視されます。

duplicate / conflict diagnostics は warning として扱われるため、merged view は確認できます。

## 対応ビュー

`domain_diagram` は次のビューに対応しています。

* Mindmap
* Area
* Tree

3つのビューはいずれも PNG export に対応しています。

## Color Scheme

Area と Tree view は、次の Color Scheme rows を使います。

* `target=domain`
* `kind=<Domain.kind>`

Mindmap には現在 Color Scheme は適用されません。

preview では、現在の view に対して有効な rows を確認するために Applied Color Scheme section が表示される場合があります。

## Default view mode

Domains と Domain Diagram の default mode は plugin settings で設定できます。

指定できる mode:

* `mindmap`
* `area`
* `tree`

設定がない、または不正な場合は `mindmap` に fallback します。

## AI生成時の注意

* `Domain Sources.ref` の大文字小文字は file name と frontmatter ID に合わせてください。
* 1つの source を1行に書いてください。
* duplicate Domain ids を想定する場合は source order を意図して決めてください。
* 再利用可能な Domain rows は `type: domains` files に書いてください。
