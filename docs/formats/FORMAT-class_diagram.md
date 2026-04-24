# FORMAT-class_diagram

`type: class_diagram` は、複数の `class` を束ねて表示する diagram フォーマットです。

## Frontmatter

必須:

- `type: class_diagram`
- `id`
- `name`

任意:

- `tags`

## 本文構成

- `## Summary`
- `## Objects`
- `## Relations`
- `## Notes`

## Objects

```md
| ref | notes |
|---|---|
```

- `ref` は `class` 参照です
- 推奨は wikilink です
- Markdown テーブル内では `[[target\|label]]` を推奨します

## Relations

`class_diagram` の `Relations` は diagram 全体の明示 relation を表します。

```md
| id | from | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|---|
```

重要:

- `class` 単体の Spec04 形式とは異なり、`from / to` の両方を持ちます
- `from / to` は参照正規化ルールに従います
- 補完挿入は `[[path/to/class\|displayName]]` を推奨します

## 表示方針

- ノードタイトルは参照先 `class.name` を優先します
- link label / alias は参照解決の target とは分離して扱います

