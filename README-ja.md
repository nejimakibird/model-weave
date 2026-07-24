# Model Weave

English Version: [README.md](https://github.com/nejimakibird/model-weave/blob/main/README.md)

> Model Weave は、Markdownで書いた設計情報を、Obsidian上で図・プレビュー・診断・ソースリンクとして読むためのプラグインです。
> Markdownファイルを正本として扱い、そこからER図、Class図、DFD、業務フロー、データ定義などの表示を生成します。

## Model Weave とは何か

Model Weave は、構造化されたソフトウェアモデリングの機能を Obsidian に提供します。

設計資産を人間が読みやすく、Git などのバージョン管理と相性が良く、さらに AI による実装支援・ドキュメント作成・レビューの構造化コンテキストとして利用可能な状態に保つことができます。

## 何に使うのか

* **構造設計**: ER図やクラス図。
* **データフロー**: DFD（データフロー図）やデータオブジェクト定義。
* **アプリケーションロジック**: 業務フロー（App Process）、画面定義、ビジネスルール。
* **影響分析**: 設計全体にわたる関係性や依存関係を自動的に検出。

## 0.1.21 の主な更新

* **Vault-wide Diagnostics** は、フルインデックスを再構築した後、認識済みの Model Weave ファイルを静的に一括検査します。Mermaid 図の描画は行いません。
* **Rule Conditions** は `[[RULE-ID]].COND-ID` と `RULE-ID.COND-ID` のような qualified member reference を補完と Impact Analysis で解決します。Rule format の変更はありません。
* **Modeling Preview Focus mode** は一つの Preview を overlay として拡大します。図を表示可能なモデルでは View を自動でONにし、Focus解除後も View を維持します。
* Current File と Vault-wide Diagnostics は、diagnostic code、path、expected header を正規表記のまま保ち、診断メッセージと Markdown export を UI 言語で表示します。

## 基本の考え方

### 必要なところから使える

すべてのモデル形式を最初に覚える必要はありません。

単純なクラス定義でも、複雑なデータフローでも、現在のタスクに必要なモデルタイプから使い始めることができます。

### 手書きのラフから AI による緻密な詳細化まで

手書きによるラフなデザインから、AI を活用した緻密なモデリングまで幅広くサポートします。

最初は単純な文章やラフなメモから始め、設計が成熟するにつれて構造化されたテーブルへと洗練させていくことができます。

### 設計を確認するための図を自動生成

テキストを書くことに集中してください。

Model Weave がオーバービューの確認や関係性のチェックのための図を、Custom または Mermaid レンダラーを使って自動的に描画します。

### 設計書を地図に、ソースを探すことができる

Source Links 機能を使えば、設計ドキュメントをナビゲーションマップに変えることができます。

ドキュメントから実際の実装ファイルへ移動できます。設定すれば、Vault 外のファイルも対象にできます。

## 最初に試すなら

1. プラグインをインストールして有効化します。
2. `samples/` フォルダからサンプルファイルを開きます。
3. モデリングプレビューを実行して、図と診断（Diagnostics）を確認します。
4. プレビュー上の関連オブジェクトをクリックして、設計内を移動してみます。

## 最初に使うコマンド

Obsidian のコマンドパレット（`Ctrl+P` / `Cmd+P`）を開き、`Model Weave` で検索して以下のコマンドを試してください。

* `Model Weave: Open modeling preview for active file`: 表示中のモデルを図または構造化ビューとしてプレビューします。
* `Model Weave: Rebuild modeling index`: Vault 全体の関係性情報を更新します。
* `Model Weave: Export Current Diagram as PNG`: 図を PNG ファイルとして保存します。

> Obsidian のコマンドパレットでは、コマンドにはプラグイン名の接頭辞 `Model Weave:` が付いています。`Model Weave` で検索すると見つけることができます。

## 次に読むもの

* [はじめに](https://github.com/nejimakibird/model-weave/blob/main/docs/ja/getting-started-ja.md) - 最初の 5 分間のチュートリアル。
* [コマンドガイド](https://github.com/nejimakibird/model-weave/blob/main/docs/ja/commands-ja.md) - テンプレートやツールの全リスト。
* [ロードマップ](https://github.com/nejimakibird/model-weave/blob/main/docs/ja/roadmap-ja.md) - 現在の方向性と検討中の項目。
* [フォーマットガイド](https://github.com/nejimakibird/model-weave/tree/main/docs/ja/formats) - 各モデルタイプの書き方。
* [サンプル](https://github.com/nejimakibird/model-weave/tree/main/samples) - 設計の具体例。
* [English README](https://github.com/nejimakibird/model-weave/blob/main/README.md) - English version of this document.

---

## 技術リファレンス（抜粋）

### 設計の原則

* Markdown が唯一の正本（Source of Truth）です。
* Mermaid、SVG、PNG は生成された「表示」です。
* Custom レンダラーは詳細なレビュー用、Mermaid は概要把握用です。

### レンダリングポリシー

* `render_mode`: 指定できる値はフォーマットにより異なります。たとえば class / ER 系は `custom`, `mermaid`, `mermaid-detail`、`dfd_diagram` と `flow_diagram` は `mermaid`、`domains` / `domain_diagram` は `mindmap`, `area`, `tree` を使います。
* 初期表示の優先順位: サポートされている Frontmatter `render_mode` > 設定画面のフォーマット別デフォルト > 組み込みフォールバック。
* ツールバーのレンダラー切り替えは現在のビューだけの一時的な選択です。
* 詳細は [V0.8 rendering policy](https://github.com/nejimakibird/model-weave/blob/main/docs/V0.8-rendering-policy.md) を参照してください。

### 主要なフォーマット

* **安定版**: `class`, `er_entity`, `dfd_diagram`, `data_object` など。
* **開発中**: `flow_diagram`, `screen`, `app_process`, `rule`, `codeset` など。

### インストール

0.1.16 以降、Model Weave は Obsidian 1.8.7 以上を対象にします。

1. Obsidian の設定 > コミュニティプラグインを開きます。
2. `Model Weave` を検索します。
3. インストールして有効化します。

### ビューアーの動作

* ズーム、フィット、パン、Focus mode、View Only mode、リアルタイム診断機能を備えています。
* 対応している Model Weave ビューでは、解決済みのノードやボックスでホバープレビューを表示し、クリックで参照元 Markdown を開けます。未解決ノード、ラベル、エッジ、フィールド行などは操作対象外の場合があります。
* ホバープレビューは Obsidian の hover-link / Page Preview の挙動に依存しています。そのため、Obsidian ウィンドウ上部付近や Model Weave Focus mode では表示されない場合があります。解決済みノードでは、クリックによる遷移を確実な導線として利用してください。
* PNG エクスポートは図の本体のみをキャプチャします。

### Source Links

外部の実装ファイルへのリンクを定義できます。

相対パスは設定の `localSourceRoot` を基準に解決されます。

詳細は [共通セクション](https://github.com/nejimakibird/model-weave/blob/main/docs/ja/formats/FORMAT-common-sections.md) を参照してください。

### パフォーマンスとスケール

* 起動時は軽量なインデックスのみを作成し、詳細は必要に応じてロードされます。
* 大規模なシステムでは、一つの図にすべてを詰め込まず、複数のファイルに分割することを推奨します。

---

## ライセンス

Model Weave は MIT License の下で公開されています。
