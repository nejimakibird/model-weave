# FORMAT-dfd_diagram

`type: dfd_diagram` は、DFD の flow を正本として持つ diagram フォーマットです。

## Frontmatter

必須:

- `type: dfd_diagram`
- `id`
- `name`

任意:

- `level`
- `tags`

`level` は文脈メタ情報です。現時点では drill-down や parent-child 遷移には使いません。

## 本文構成

- `## Summary`
- `## Objects`
- `## Flows`
- `## Notes`

## Objects

```md
| ref | notes |
|---|---|
```

- `ref` は `dfd_object` 参照です
- 推奨は wikilink です

## Flows

```md
| id | from | to | data | notes |
|---|---|---|---|---|
```

### 列の意味

- `id`
  - 任意の補助識別子
  - 一意性は強制しません
- `from`
  - 送信元 `dfd_object`
- `to`
  - 送信先 `dfd_object`
- `data`
  - 流れるデータ名
  - 生文字列または `data_object` 参照を許容します
- `notes`
  - 補足

## 描画方針

- DFD 表示は Mermaid `flowchart LR` を主経路とします
- Model Weave 側は parser / resolver / validation / completion / diagnostics / Mermaid 変換に集中します
- parent_process は現時点では持ちません

