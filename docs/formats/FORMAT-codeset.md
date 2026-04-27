# FORMAT-codeset

`codeset` は、コード体系・区分値・選択肢定義を Markdown で管理するためのフォーマットです。Model Weave では Markdown 本文を正本とし、Viewer はチャートではなくテーブルと diagnostics を中心に扱います。

## 基本方針

- 1 ファイル = 1 コード体系
- `Values` テーブル = コード値一覧
- `Values.code` は同一 codeset 内でユニーク
- 1 code = 1 meaning を原則とする
- 複数条件でどの code を使うかは `rule` に書く
- 外部コードと内部コードの変換は `mapping` に書く
- codeset Viewer はチャートではなくテーブル + diagnostics とする

## Frontmatter

必須:

- `type`
- `id`
- `name`

任意:

- `kind`
- `tags`

例:

```yaml
---
type: codeset
id: CODE-INVENTORY-STATUS
name: 在庫状態
kind: status
tags:
  - CodeSet
---
```

## 推奨本文構成

```md
# <codeset name>

## Summary

## Values

## Notes
```

parser / validator はセクション順序に厳密依存しませんが、`Values` を中心セクションとして扱います。

## Values

```md
| code | label | sort_order | active | notes |
|---|---|---:|---|---|
| available | 利用可能 | 10 | Y | 通常利用できる状態 |
| reserved | 引当済 | 20 | Y | 他処理で確保済 |
| deleted | 削除済 | 90 | N | 旧データ互換用 |
```

### 列の意味

- `code`: コード値。codeset 内でユニーク
- `label`: 表示名
- `sort_order`: 並び順
- `active`: `Y` / `N`
- `notes`: 補足

## Qualified Ref

`Values.code` は member ref の対象です。

例:

- `[[codeset/CODE-INVENTORY-STATUS\|在庫状態]].available`
- `[[codeset/CODE-DOCUMENT-TYPE\|伝票種別]].receipt`

## Viewer 方針

codeset Viewer は図を持たず、次を表示します。

1. Notes / Warnings / Errors
2. Metadata
3. Counts
4. Detected Sections
5. `Summary`
6. `Values Summary`
7. `Notes`

`Values Summary` では、次の列を表示します。

- `code`
- `label`
- `sort_order`
- `active`
- `notes`

## diagnostics 方針

Error:

- `frontmatter.id` が空
- `frontmatter.name` が空
- `Values.code` が空
- `Values.code` が同一ファイル内で重複

Warning:

- `Values` が空
- `Values.label` が空
- `Values.active` が空
- `Values.sort_order` が同一ファイル内で重複
- `active` が `Y/N` 以外
- `kind` が空

Note:

- `active = N` のコードが存在する
- `sort_order` が空の行が存在する
- `Values.notes` が空の行が存在する
