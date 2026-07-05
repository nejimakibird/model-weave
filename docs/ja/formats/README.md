# Model Weave フォーマット仕様

English Version : [README.md](../../formats/README.md)

このディレクトリには、Model Weave の公開フォーマット仕様を配置しています。

これらのドキュメントは [V0.8 Documentation Policy](../V0.8-documentation-policy.md) に従って整理します。  
V0.8 Documentation Policy は、人間の利用者、メンテナー、AIによるモデル生成のいずれにも読みやすいように、FORMATドキュメントの構成方針を定めるものです。

Model Weave は、Obsidian向けのテキストファーストなモデリングプラグインです。  
Markdownファイルを正本として扱い、図、プレビュー、診断、Mermaidソース、SVG、PNG出力などは派生ビューとして生成されます。

## 安定版 / 主要フォーマット

安定版 / 主要フォーマットは、多くの利用者にとって最初に触る入口になります。

- [class](FORMAT-class.md)
- [class_diagram](FORMAT-class_diagram.md)
- [er_entity](FORMAT-er_entity.md)
- [er_diagram](FORMAT-er_diagram.md)
- [dfd_object](FORMAT-dfd_object.md)
- [dfd_diagram](FORMAT-dfd_diagram.md)
- [data_object](FORMAT-data_object.md)

## 実験中 / 発展中フォーマット

実験中 / 発展中フォーマットは利用可能ですが、ドキュメントやモデリング上の慣習は今後変わる可能性があります。

- [flow_diagram](FORMAT-flow_diagram.md)
- [screen](FORMAT-screen.md)
- [app_process](FORMAT-app_process.md)
- [rule](FORMAT-rule.md)
- [codeset](FORMAT-codeset.md)
- [message](FORMAT-message.md)
- [mapping](FORMAT-mapping.md)
- [domains](FORMAT-domains.md)
- [domain_diagram](FORMAT-domain_diagram.md)
- [color_scheme](FORMAT-color_scheme.md)

## おすすめの読み進め方

すべてのフォーマットを最初から覚える必要はありません。  
現在の作業に必要なフォーマットから読み始めてください。

1. [class](FORMAT-class.md) / [class_diagram](FORMAT-class_diagram.md)
2. [er_entity](FORMAT-er_entity.md) / [er_diagram](FORMAT-er_diagram.md)
3. [data_object](FORMAT-data_object.md)
4. [dfd_object](FORMAT-dfd_object.md) / [dfd_diagram](FORMAT-dfd_diagram.md)
5. [flow_diagram](FORMAT-flow_diagram.md)
6. [app_process](FORMAT-app_process.md)
6. 必要に応じて実験中フォーマット

## FORMATドキュメントの構成

V0.8のFORMATドキュメントでは、原則として次の内容を説明します。

- 何に使うフォーマットか
- 最小例
- 必要に応じた詳細例
- 対応するfrontmatter
- 対応するセクション
- 期待されるテーブルヘッダー
- よくあるミス
- AI生成時の注意
- 関連サンプル

すべてのフォーマットで同じ分量の説明が必要なわけではありません。  
ただし、構成はできるだけ予測しやすく揃えます。

## AI生成時の注意

AIを使ってModel Weaveファイルを生成する場合は、各FORMATドキュメントで定義されているテーブルヘッダーを正確に守ってください。

未定義の列を追加しないでください。  
補足情報は `notes` または任意セクションに記述してください。

共通の安全ルールは次の通りです。

- テーブルヘッダーはドキュメント通りに保つ。
- FORMATが明示的に対応していない限り、`ref`, `rule`, `description`, `notes` などの列を追加しない。
- frontmatter内のWikilinkはクォートする。
- テーブル内では `[[target|label]]` のようなWikilinkエイリアスを避ける。
- テーブルセル内では生の `|` を避ける。
- 全セルが空白のテーブルデータ行は入力ノイズとして無視される。一部のセルに値がある行は従来どおり検証対象になる。
- 型名は単純なスカラー型を優先する。
- 任意性や複数性は、対応している `required`, `not_null`, `notes` などの列で表現する。
- 実装済みの動作と将来構想を混ぜない。
- 必要に応じてSource Linksを使い、モデルとソースファイルを結びつける。

## 共通カスタマイズ / 共通仕様

- [CSS customization](FORMAT-css-customization.md)
- [Common sections](FORMAT-common-sections.md)

## レンダリングポリシー概要

Model Weaveでは、Markdownの記述形式と生成されるビューを分離して考えます。

- Customレンダラーは詳細レビュー向けです。
- Mermaidレンダラーは概要、関係、フローの把握に向いています。
- `render_mode` はMarkdownファイル形式を変更しません。
- `auto` は現在のユーザー向けデフォルトのレンダーモードではありません。
- `render_mode` を省略した場合は、設定画面のフォーマット別デフォルトレンダーモードが使われます。

レンダラー解決の優先順位は次の通りです。

1. サポートされている `frontmatter.render_mode`
2. 設定画面のフォーマット別デフォルトレンダーモード
3. 組み込みのフォーマット別フォールバック

ツールバーでの切り替えは現在のビューだけの一時的な選択であり、他のファイルの初期表示レンダラーには影響しません。

関連: [V0.8 rendering policy](../V0.8-rendering-policy.md)

## DFDについて

`dfd_diagram` はMermaid-firstとして扱います。

`dfd_object` は再利用可能な定義 / 詳細オブジェクトとして残り、`dfd_diagram` は図やフロー表示に使います。
