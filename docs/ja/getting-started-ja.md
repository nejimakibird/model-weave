# Model Weave はじめに

このガイドに従って Model Weave をセットアップし、最初のソフトウェア設計モデルを 5 分以内に表示してみましょう。

Obsidian のコマンドパレットでは、コマンドにはプラグイン名の接頭辞 `Model Weave:` が付いています。`Model Weave` で検索すると見つけることができます。

## 1. インストールと有効化

0.1.16 以降、Model Weave は Obsidian 1.8.7 以上を対象にします。

1. Obsidian を開きます。
2. **設定** > **コミュニティプラグイン** に移動します。
3. **閲覧** をクリックし、`Model Weave` を検索します。
4. **インストール** をクリックし、次に **有効化** をクリックします。

## 2. サンプルモデルを開く

Model Weave はテキスト第一（Text-first）です。動作を確認するために、Vault 内に提供されているサンプルファイルのいずれかを開いてください（または `samples/` ディレクトリからコピーしてください）。

例えば、在庫（Inventory）の ER エンティティファイル `samples/er/ENT-INVENTORY.md` を開いてみてください。

## 3. プレビューの起動

1. エディタでサンプルモデルファイルがアクティブになっていることを確認します。
2. **コマンドパレット**を開きます：
   - **Windows/Linux**: `Ctrl + P`
   - **macOS**: `Cmd + P`
3. `Model Weave: Open modeling preview for active file` を検索して `Enter` を押します。

## 4. ビューアーの操作

- **Diagnostics (診断)**: 下部パネルでパースの警告やエラーがないか確認します。
- **ナビゲーション**: 対応しているビューでは、解決済みのノードやボックスでホバープレビューを表示し、クリックで参照元 Markdown を開けます。未解決ノード、ラベル、エッジ、フィールド行などは操作対象外の場合があります。
- **ホバープレビュー**: ホバープレビューは Obsidian の hover-link / Page Preview の挙動に依存しています。そのため、Obsidian ウィンドウ上部付近や Model Weave Focus mode では表示されない場合があります。解決済みノードでは、クリックによる遷移を確実な導線として利用してください。
- **エクスポート**: `Model Weave: Export Current Diagram as PNG` コマンドを実行して、現在の表示を保存します。
- **Source Links**: モデルに `## Source Links` セクションがある場合は、"Open" や "Copy Path" を試して、実際のソースコードへの導線を確認してください。