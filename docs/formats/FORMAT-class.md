# FORMAT-class

`type: class` は、単体クラス・インターフェース・コンポーネントなどの責務単位を表す正式フォーマットです。

## Frontmatter

必須:

- `type: class`
- `id`
- `name`
- `kind`

任意:

- `package`
- `stereotype`
- `tags`

抽象クラスは `kind: class` + `stereotype: abstract` を推奨します。

## 本文構成

- `## Summary`
- `## Attributes`
- `## Methods`
- `## Relations`
- `## Notes`

## Relations

`class` 単体ファイルの `## Relations` は Spec04 形式を正規形式とします。

```md
| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
```

重要:

- `from` 列は持ちません
- `from` は常にそのファイル自身の frontmatter `id` とみなします
- `to` は参照正規化ルールに従って解釈されます

許容する参照表記:

- raw id
- raw filename
- path
- `[[target]]`
- `[[target|label]]`
- `[[target\|label]]`
- `[label](target)`

Markdown テーブル内の補完挿入は `[[target\|label]]` を推奨します。

## 旧形式との互換

以下の旧形式も当面は読み込み互換として許容します。

```md
| id | from | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|---|
```

- `from == current class id` の場合は Note 相当
- `from != current class id` の場合は Warning 相当
- 新規作成・テンプレート・正式サンプルでは使いません

## class_diagram との違い

- `class` は単体定義ファイルです
- `class_diagram` は複数 class を束ねる diagram ファイルです
- `class_diagram` の `Relations` は `from / to` を明示します

