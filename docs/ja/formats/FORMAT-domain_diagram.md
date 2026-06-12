# FORMAT-domain_diagram

English Version: [English](../../formats/FORMAT-domain_diagram.md)

## 何に使うフォーマットか

`domain_diagram` は、複数の standalone `type: domains` ファイルを統合して表示するためのフォーマットです。

再利用可能な Domain 定義を選び、1つのプレビューとして統合し、全体構造を視覚的に確認したい場合に使います。

`domain_diagram` は diagram / selective view です。再利用可能な Domain entries は `type: domains` files に残します。

## 最小例

```markdown
---
type: domain_diagram
id: DOMAIN-DIAGRAM-MODEL-WEAVE
name: ModelWeaveDomainDiagram
---

## Domain Sources

| ref |
|---|
| [[DOMAINS-COMPANY]] |
| [[DOMAINS-MODEL-WEAVE]] |
```

## Domain Sources

基本の最小ヘッダー:

```markdown
| ref |
|---|
```

任意の `notes` 付きヘッダー:

```markdown
| ref | notes |
|---|---|
```

列の意味:

| column | required | notes |
|---|---|---|
| `ref` | yes | `type: domains` file への Wikilink、file basename、frontmatter `id`、または vault path です。 |
| `notes` | no | 人間向けの説明です。 |

`ref` は必須です。`notes` は任意です。

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
* source に Domain 行がない
* duplicate Domain id
* `name` conflict
* `kind` conflict
* `parent` conflict

`description` conflict は、現在は noise を減らすために無視されます。

duplicate / conflict diagnostics は warning として扱われるため、統合後のビューは確認できます。

## 対応ビュー

`domain_diagram` は次のビューに対応しています。

* Mindmap
* Area
* Tree

3つのビューはいずれも PNG エクスポートに対応しています。

## Color Scheme

Area と Tree view は、次の Color Scheme 行を使います。

* `target=domain`
* `kind=<Domain.kind>`

Mindmap には現在 Color Scheme は適用されません。

プレビューでは、現在の view に対して有効な行を確認するために Applied Color Scheme section が表示される場合があります。

## Default view mode

Domains と Domain Diagram の default mode は plugin settings で設定できます。

`domain_diagram` は frontmatter の `render_mode` でも初期表示を指定できます。

指定できる mode:

* `mindmap`
* `area`
* `tree`

frontmatter の canonical value:

```yaml
render_mode: mindmap
render_mode: area
render_mode: tree
```

利便性のため大文字小文字は区別しません。frontmatter には翻訳ラベルではなく、安定した内部値を使ってください。

設定がない、または不正な場合は `mindmap` に fallback します。

## AI生成時の注意

* `Domain Sources.ref` の大文字小文字は file name と frontmatter ID に合わせてください。
* 1つの source を1行に書いてください。
* duplicate Domain ids を想定する場合は source order を意図して決めてください。
* 再利用可能な Domain 行は `type: domains` ファイルに書いてください。
