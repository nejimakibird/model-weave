---
type: data_object
id: DATA-FORMAT-CATALOG
name: Model Weave Format Catalog
kind: catalog
tags:
  - ModelWeave
  - Catalog
---

# Model Weave Format Catalog

Model Weave がサポートするMarkdownベースのモデルフォーマットの一覧です。

## Summary

Model Weave プラグインが認識し、処理するMarkdownモデルファイルのフォーマットを定義します。各フォーマットは、特定のモデリング用途に対応しており、それぞれが独自の構造とレンダリングポリシーを持ちます。

## Fields

| name | label | type | length | required | path | ref | notes |
|---|---|---|---|---|---|---|---|
| id | Format ID | string | | Y | | | フォーマットの一意な識別子。ファイル名の一部となることが多い。 |
| name | Format Name | string | | Y | | | フォーマットの表示名。 |
| fileType | File Type | string | | Y | | | Model Weave 内部で認識されるファイルタイプ。 |
| schema | Schema Version | string | | Y | | | フォーマットのスキーマバージョン。 |
| category | Category | string | | Y | | | stable または experimental の区分。 |
| purpose | Purpose | string | | Y | | | フォーマットの主な目的。 |
| frontmatter_type | Frontmatter Type | string | | Y | | | フロントマターで指定される `type` の値。 |
| defaultRenderMode | Default Render Mode | string | | Y | | | このフォーマットのデフォルトのレンダリングモード。 |
| docsRef | Documentation | string | | Y | | [[docs/formats/README.md]] | 関連する公式ドキュメントへの参照。 |
| class | Class | string | | Y | | | クラス図のクラス定義。 |
| class_diagram | Class Diagram | string | | Y | | | クラス図の定義。 |
| er_entity | ER Entity | string | | Y | | | ER図のエンティティ定義。 |
| er_diagram | ER Diagram | string | | Y | | | ER図の定義。 |
| dfd_object | DFD Object | string | | Y | | | DFDのオブジェクト定義。 |
| dfd_diagram | DFD Diagram | string | | Y | | | DFDの定義。 |
| data_object | Data Object | string | | Y | | | データ構造の定義。 |
| screen | Screen | string | | Y | | | UI画面の定義。 |
| app_process | App Process | string | | Y | | | アプリケーションプロセスの定義。 |
| rule | Rule | string | | Y | | | ビジネスルールの定義。 |
| mapping | Mapping | string | | Y | | | データマッピングの定義。 |
| codeset | Codeset | string | | Y | | | コードセットの定義。 |
| message | Message | string | | Y | | | メッセージセットの定義。 |

## Notes

- `fileType` は内部的な識別子であり、`frontmatter_type` はMarkdownファイルのフロントマターで指定される `type` プロパティの値です。
- `category` は `README.md` の "Stable / primary formats" および "Experimental / evolving formats" セクションに基づいています。