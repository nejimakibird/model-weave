# FORMAT-dfd_object

`type: dfd_object` は、DFD の単体部品を表す正式フォーマットです。

## Frontmatter

必須:

- `type: dfd_object`
- `id`
- `name`
- `kind`

任意:

- `tags`

`kind` の想定値:

- `external`
- `process`
- `datastore`

## 本文構成

- `## Summary`
- `## Notes`

## 重要な方針

- `dfd_object` 自身は flow の正本を持ちません
- flow は常に `dfd_diagram` 側の `## Flows` を正本とします
- `dfd_object` 単体ビューでは diagram 由来 flow を逆引き表示しません

