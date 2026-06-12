# FORMAT-domains

English Version: [English](../../formats/FORMAT-domains.md)

## 何に使うフォーマットか

`domains` は、再利用可能な Domain / context entry を定義するためのフォーマットです。

組織、責任範囲、物理ロケーション、システム境界、データ領域、運用領域、外部アクター / 外部システムなどの文脈を表すときに使います。

`domains` は standalone の source file です。ファイル内の validation は、そのファイル自身の行を確認します。プレビューでは、他の `domains` ファイルが同じ Domain id を定義している場合に、vault-wide の duplicate / conflict warning が表示されることがあります。複数の `domains` ファイルを明示的に統合して見る場合は `type: domain_diagram` を使います。

## 最小例

```markdown
---
type: domains
id: DOMAINS-MODEL-WEAVE
name: ModelWeaveDomains
---

## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| model_weave | Model Weave | application | | Plugin boundary |
| markdown_model | Markdown model | model | model_weave | Markdown-based model files |
| renderer | Renderer | renderer | model_weave | Preview rendering area |
```

## Frontmatter

必須項目:

| field | required | notes |
|---|---|---|
| `type` | yes | `domains` を指定します。 |
| `id` | no | ファイル単位の安定した ID として推奨します。 |
| `name` | no | Domains file の表示名です。 |
| `render_mode` | no | 任意の初期表示モードです。canonical value として `mindmap`, `area`, `tree` を使います。利便性のため大文字小文字は区別しません。 |

## セクション

### Domains

`## Domains` には Domain rows を定義します。

期待されるヘッダー:

```markdown
| id | name | kind | parent | description |
|---|---|---|---|---|
```

列の意味:

| column | required | notes |
|---|---|---|
| `id` | yes | ファイル内で一意な安定 Domain id です。 |
| `name` | no | 表示名です。空の場合は `id` が fallback として使われる場合があります。 |
| `kind` | no | free-form の Domain kind です。Color Scheme 対応ビューで使われます。 |
| `parent` | no | 同じファイル内の別の Domain id を参照します。 |
| `description` | no | 人間向けの説明です。 |

`kind` は free-form です。Color Scheme を安定して適用したい場合は、vault 内で値を揃えてください。

`parent` は同じファイル内の別の Domain id を参照します。Mindmap、Area、Tree の階層構造に使われます。

## 対応ビュー

`domains` は次のビューに対応しています。

* Mindmap
* Area
* Tree

3つのビューはいずれも PNG エクスポートに対応しています。

frontmatter の canonical value:

```yaml
render_mode: mindmap
render_mode: area
render_mode: tree
```

利便性のため大文字小文字は区別しません。frontmatter には翻訳ラベルではなく、安定した内部値を使ってください。

## Color Scheme

Area と Tree view は、次の Color Scheme 行を使います。

* `target=domain`
* `kind=<Domain.kind>`

Mindmap には現在 Color Scheme は適用されません。

プレビューでは、現在有効な kind colors を確認するために Applied Color Scheme section が表示される場合があります。

## Validation

Model Weave は次の内容を診断します。

* `id` がない
* 同じファイル内で `id` が重複している
* 不明な `parent`
* self-parent
* parent cycle

ファイル内の validation は、同じファイル内の重複 id と parent 参照を確認します。standalone `domains` のプレビューでは、他の `domains` ファイルが同じ id を定義している場合に、vault-wide の relationship / duplicate / conflict warning が表示されることがあります。これは意図しない定義のずれを見つけるための警告であり、standalone ファイル自体が統合ビューになるという意味ではありません。

複数の Domains files を明示的に統合・比較する場合は `domain_diagram` を使います。

## AI生成時の注意

* table header はドキュメント通りに保ってください。
* 未対応の列を追加しないでください。
* ID は安定した lowercase または uppercase のルールで揃えてください。
* `kind` は適用したい Color Scheme に合わせてください。
* `parent` には同じファイル内の別 Domain id だけを書いてください。
