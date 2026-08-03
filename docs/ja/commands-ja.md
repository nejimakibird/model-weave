# Model Weave コマンドリファレンス

Model Weave のすべての機能は、Obsidian のコマンドパレットから利用できます。
コマンドにはプラグイン名の接頭辞 `Model Weave:` が付いています。`Model Weave` で検索すると見つけることができます。

**コマンドの使い方:**
1. `Ctrl + P` (Windows/Linux) または `Cmd + P` (macOS) を押します。
2. "Model Weave" と入力してリストを絞り込みます。

## 1. プレビュー / インデックス / エクスポート

| コマンド名 | 何ができるか | いつ使うか |
| :--- | :--- | :--- |
| `Model Weave: Open modeling preview for active file` | 現在開いている Markdown モデルの、図や構造化されたプレビューを表示します。 | モデルや図を視覚的に確認したいとき。 |
| `Model Weave: Rebuild modeling index` | Vault 内をスキャンして、すべての関係性、メンバー検索、診断情報を更新します。 | ファイルの一括変更後や、参照が正しく解決されないとき。 |
| `Model Weave: Export Current Diagram as PNG` | 現在描画されている図を PNG 画像ファイルとして保存します。 | レポートやプレゼンテーションで図を共有したいとき。 |
| `Model Weave: Refresh Open Views` | 現在の設定を使用して、開いているすべてのプレビューを再描画します。 | フォントサイズや密度などのビューアー設定を変更した後。 |
| `Model Weave: Check all model diagnostics` | フルモデルインデックスを再構築し、認識済みのすべての Model Weave ファイルの静的診断を表示します。Mermaid 図は描画しません。 | レビュー、リリース前、一括修正の前。 |
| `Model Weave: Toggle focus mode` | アクティブな Modeling Preview を一時的に広げます。再実行または Esc で解除します。図を表示可能な場合は View をONにし、解除後もViewはONのまま、Flow DiagramのDetail/Screen状態を維持します。Markdownや設定は変更しません。 | 分割ペインで図を広く確認したいとき。 |

### `Model Weave: Check all model diagnostics`

明示的に実行するとフルインデックスを再構築し、認識済みの Model Weave ファイルを静的に検査して、Error、Warning、Note をファイル単位で表示します。重要度と diagnostic code のfilter、Recheck、Markdown copy、該当ファイル・行への移動を利用できます。自動監視ではなく、Mermaid の描画エラーも対象外です。diagnostic message とコピーする Markdown は UI 言語に従い、diagnostic code、file path、expected header は正規表記のままです。

### `Model Weave: Toggle focus mode`

一つの Modeling Preview を workspace leaf を外さず overlay として拡大します。Toolbar、このcommand、Escで切り替えます。図を表示可能な Preview では Focus 開始時に View を自動でONにし、Focus解除後も View はONのままです。Flow Diagram の Detail/Screen 状態と zoom/pan は可能な範囲で維持します。Focus は一時状態であり、Markdown や Settings は変更しません。Markdown editor 側から実行した場合は同じ vault-relative file path を表示している Preview を解決し、安全に一意に特定できない場合は Notice を表示します。

## 2. テンプレートの挿入
テンプレートを使用すると、正しい Frontmatter とセクション構造で新しいモデルを開始できます。**注意: これらのコマンドは、空の Markdown ファイルでのみ動作します。**

### 基本フォーマット
- `Model Weave: Insert Class Template`: オブジェクト指向のクラス定義用。
- `Model Weave: Insert Class Diagram Template`: 複数のクラスの概要図（クラス図）用。
- `Model Weave: Insert ER Entity Template`: ER（実体関連）モデルのエンティティ用。
- `Model Weave: Insert ER Diagram Template`: ER 図用。
- `Model Weave: Insert DFD Object Template`: DFD のプロセス、データストア、または外部エンティティ用。
- `Model Weave: Insert DFD Diagram Template`: DFD 図（Mermaid 優先）用。
- `Model Weave: Insert Flow Diagram Template`: 画面連携や data handoff flow 用。

### データモデリング
- **`Model Weave: Insert Data Object Template`**: API リクエスト、レスポンス、内部データ、インターフェースデータなどの**論理的なデータ構造**に使用します。
- **`Model Weave: Insert Data Object File Layout Template`**: 固定長ファイル、CSV 列、入出力ファイル、外部連携ファイルなどの**物理的なファイルレイアウト**に使用します。

### ロジック & UI (実験的)
- `Model Weave: Insert App Process Template`: サーバーサイドやバッチ処理の単位用。
- `Model Weave: Insert Screen Template`: UI デザインの単位用。
- `Model Weave: Insert CodeSet Template`: 列挙型（Enum）、状態、コードリスト用。
- `Model Weave: Insert Message Template`: システムまたは UI メッセージ用。
- `Model Weave: Insert Rule Template`: ビジネスロジックやバリデーションルール用。
- `Model Weave: Insert Mapping Template`: データ変換の定義用。
- `Model Weave: Insert domains template`: standalone の Domain 階層定義用。
- `Model Weave: Insert domain diagram template`: 複数の `domains` ファイルを統合する Domain Diagram 用。
- `Model Weave: Insert color scheme template`: 再利用可能な図の色ルール用。

## 3. 編集支援コマンド

| コマンド名 | 何ができるか | いつ使うか |
| :--- | :--- | :--- |
| `Model Weave: Insert ER Relation Block` | 構造化されたリレーションブロック（target_table, kind, mappings）を `er_entity` ファイルに追加します。 | 既存のエンティティに新しい関連を追加するとき。 |
| `Model Weave: Complete Current Field` | 現在のテーブルセルに対して補完モーダルを開きます（オブジェクト、メンバー、または種類オプションへのリンク）。 | 参照が有効であることを確認しながらテーブルを埋めるとき。 |

---

## 設定に関する補足

これらは **設定 > Model Weave** で構成できます：

- **UI Language**: ビューアーのキャプションの言語（English または 日本語）を切り替えます。
- **Local source root**: Obsidian Vault 外のファイルへの `## Source Links`（相対パス）を解決するためのベースパス。
- **フォーマット別の既定レンダリング**: Class と ER は `Custom`、`Mermaid`、`Mermaid detail` を選べます。DFD は Mermaid、App Process と Screen は Custom を使います。専用view設定を持つformatは別の設定項目で指定します。
- **Default Flow Diagram view**: `flow_view` が未指定の Flow Diagram の初期表示を `Detail` または `Screen` から選びます。Viewer の `Flow view` selector では、Markdown を変更せずに現在の Flow Diagram を一時切替できます。
- **Relationship View**: 「Impact / Relationships（影響/関連）」分析パネルの有効/無効。

### 次に読むもの
- はじめに
- フォーマットガイド (英語)
- サンプル
