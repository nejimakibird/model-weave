# FORMAT-er_diagram

`type: er_diagram` は、複数の `er_entity` を束ねて表示する ER diagram フォーマットです。

## Frontmatter

必須:

- `type: er_diagram`
- `id`
- `name`

任意:

- `tags`

## 本文構成

- `## Summary`
- `## Objects`
- `## Notes`

## Objects

```md
| ref | notes |
|---|---|
```

- `ref` は `er_entity` 参照です
- relation の正本は `er_entity` 側にあります
- `er_diagram` は `Objects` に含まれる entity の relation を集約して表示します

## 表示方針

- `Objects.ref` に link label / alias がある場合、entity title として優先して使えます
- なければ `logical_name`
- 次に `physical_name`
- 次に `id / filename`

