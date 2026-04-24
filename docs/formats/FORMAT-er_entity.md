# FORMAT-er_entity

`type: er_entity` は、単体テーブル定義を表す正式フォーマットです。

## Frontmatter

必須:

- `type: er_entity`
- `id`
- `logical_name`
- `physical_name`

任意:

- `schema_name`
- `dbms`
- `tags`

## 本文構成

- `## Overview`
- `## Columns`
- `## Indexes`
- `## Relations`
- `## Notes`

## Columns

`Columns` はテーブルの主定義です。

## Indexes

`Indexes` は補助定義です。

## Relations

`er_entity` は outbound relation の正本を持ちます。

各 relation block は以下のように表します。

```md
### REL-
- target_table: [[]]
- kind: fk
- cardinality:
- notes:

| local_column | target_column | notes |
|---|---|---|
```

重要:

- `target_table` は relation block 単位で管理します
- 複合 FK は `Mapping` テーブルで表します
- `er_diagram` 側は relation の正本を持ちません

## 参照ルール

- `target_table` は raw / wikilink / markdown link を許容します
- 補完挿入は `[[path/to/entity\|displayName]]` を推奨します

