# Model Weave はじめに

このガイドに従って Model Weave をセットアップし、最初のソフトウェア設計モデルを 5 分以内に表示してみましょう。

Obsidian のコマンドパレットでは、コマンドにはプラグイン名の接頭辞 `Model Weave:` が付いています。`Model Weave` で検索すると見つけることができます。

## 1. インストールと有効化

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
- **ナビゲーション**: プレビュー内の関連オブジェクトをクリックして、その Markdown ファイルにジャンプします。
- **エクスポート**: `Model Weave: Export Current Diagram as PNG` コマンドを実行して、現在の表示を保存します。
- **Source Links**: モデルに `## Source Links` セクションがある場合は、"Open" や "Copy Path" を試して、実際のソースコードへの導線を確認してください。