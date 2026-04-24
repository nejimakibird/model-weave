# FORMAT-data_object

`type: data_object` は、DFD flow 上を流れるデータ構造定義を表す正式フォーマットです。

## 役割

`data_object` は、以下のようなデータ定義を表します。

- message
- DTO
- request / response
- file layout
- payload
- event
- structure

## Frontmatter

必須:

- `type: data_object`
- `id`
- `name`

任意:

- `kind`
- `tags`

`kind` は厳密制限せず、文字列として保持します。

## 本文構成

- `## Summary`
- `## Fields`
- `## Notes`

## Fields

```md
| name | type | required | ref | notes |
|---|---|---|---|---|
```

- `ref` から `er_entity` / `class` / `data_object` / `dfd_object` などを参照できます
- `DFD Flow.data` から `data_object` を参照できます

## Viewer 方針

- V0.5 では専用 viewer を作りません
- 通常 Markdown として扱います
- resolver / index / completion / diagnostics の対象には入ります

