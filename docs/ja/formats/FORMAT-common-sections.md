# 共通セクション

English Version: [English](../../formats/FORMAT-common-sections.md)

このドキュメントでは、Model Weave の各モデルファイルで共通して利用できる任意セクションを説明します。

共通セクションは、特定のモデル形式だけに属するものではありません。各形式の中心構造を変えずに、実装参照、補足メモ、外部参照などの横断的な情報を追加するために使います。

## Source Links

`## Source Links` は、モデル要素と関連する外部ファイルを結びつけるための共通セクションです。

主な参照先の例は次の通りです。

* ソースコード
* テストファイル
* 設定ファイル
* SQL / DDL / migration ファイル
* サンプルデータ
* 外部仕様書
* 生成またはリバースエンジニアリング時に参照したファイル

このセクションは、既存コードベースから AI 支援でモデルファイルを生成する場合に特に有効です。生成されたモデルに、実装ファイルへ戻るための地図を残せます。

## Source Links の表形式

`## Source Links` は Markdown の表として記述します。

推奨列は次の通りです。

| column  | required | meaning                         |
| ------- | -------: | ------------------------------- |
| `path`  |      yes | モデルファイルに書かれた Source Link のパスです。 |
| `notes` |       no | 関連理由などの補足メモです。                  |

推奨構文:

```markdown
## Source Links

| path | notes |
|---|---|
| src/main.ts | Plugin entry point |
| src/views/modeling-preview-view.ts | Preview view implementation |
| src/renderers/object-context-renderer.ts | Object detail and context rendering |
```

`path` には相対パスまたは絶対パスを書けます。

## 最小例

```markdown
---
type: class
id: CLS-MODEL-WEAVE-PLUGIN
name: Model Weave Plugin
---

# Model Weave Plugin

## Summary

- Load Model Weave settings
- Register preview commands
- Render model previews

## Source Links

| path | notes |
|---|---|
| src/main.ts | Plugin entry point |
```

## 複数ファイルを関連付ける例

```markdown
## Source Links

| path | notes |
|---|---|
| src/views/modeling-preview-view.ts | Preview view and toolbar |
| src/renderers/graph-view-shared.ts | Shared fit, zoom, and pan behavior |
| src/renderers/object-context-renderer.ts | Connection details and object context UI |
| src/styles.css | Preview and Source Links styling |
```

## Windows パスの例

```markdown
## Source Links

| path | notes |
|---|---|
| C:\Users\example\projects\model-weave\src\main.ts | Local checkout path |
```

## Windows UNC / WSL パスの例

```markdown
## Source Links

| path | notes |
|---|---|
| \\wsl.localhost\Ubuntu\home\user\projects\model-weave\src\main.ts | WSL checkout path from Windows |
| //wsl.localhost/Ubuntu/home/user/projects/model-weave/src/views/modeling-preview-view.ts | Slash-style WSL UNC path |
```

スラッシュ形式の UNC パスは、Windows UNC 形式に正規化される場合があります。

```text
//wsl.localhost/Ubuntu/home/user/projects/model-weave/src/main.ts
```

これは次のように解決される場合があります。

```text
\\wsl.localhost\Ubuntu\home\user\projects\model-weave\src\main.ts
```

## macOS / Linux パスの例

```markdown
## Source Links

| path | notes |
|---|---|
| /home/user/projects/model-weave/src/main.ts | Linux checkout path |
| /Users/user/projects/model-weave/src/main.ts | macOS checkout path |
```

macOS や Linux では、POSIX 形式のパスは `/` 区切りのまま扱われます。

## パス解決

Source Links には、相対パスと絶対パスの両方を書けます。

### 相対パス

```markdown
## Source Links

| path | notes |
|---|---|
| src/main.ts | Plugin entry point |
```

`Local source root` が設定されている場合、Model Weave は次の組み合わせでパスを解決します。

```text
Local source root + path
```

例:

```text
Local source root:
C:\Users\example\projects\model-weave

path:
src/main.ts

Resolved Path:
C:\Users\example\projects\model-weave\src\main.ts
```

### 絶対パス

```markdown
## Source Links

| path | notes |
|---|---|
| C:\Users\example\projects\model-weave\src\main.ts | Local checkout path |
```

すでに絶対パスとして書かれている場合、`Local source root` は不要です。パス自体が `Resolved Path` として扱われます。

## プレビュー列

Source Links がプレビューに表示される場合、次の項目が表示されます。

| column          | meaning                          |
| --------------- | -------------------------------- |
| `Path`          | モデルファイルに書かれたパスです。                |
| `Status`        | 解決状態または利用可能状態です。                 |
| `Resolved Path` | `Copy Path` と `Open` が対象にするパスです。 |
| `Notes`         | Source Link と一緒に書かれた補足メモです。      |
| `Actions`       | `Copy Path` や `Open` などの操作です。    |

## Status

`Status` は、`Resolved Path` を確認できるか、また実ファイルが見つかるかを示します。

代表的な状態は次の通りです。

| status                       | meaning                                 |
| ---------------------------- | --------------------------------------- |
| `available`                  | `Resolved Path` のファイルが存在します。            |
| `missing`                    | `Resolved Path` は作成できたが、ファイルが見つかりません。   |
| `unresolved`                 | パスを解決または確認できません。                        |
| `source root not configured` | 相対パスですが、`Local source root` が設定されていません。 |

`missing` や `unresolved` の Source Links は、モデル診断上のエラーではありません。
ローカル環境に参照先ファイルが存在しない、または公開用ドキュメントリポジトリとソースリポジトリが分かれている、といった状況を示します。

これは、モデルファイルだけを公開し、ソースコードは別リポジトリで管理するような構成では通常起こり得ます。

## Actions

### Copy Path

`Copy Path` は、`Resolved Path` をクリップボードにコピーします。

最も安定して利用できる操作です。コピーしたパスは次のような場所に貼り付けて利用できます。

* Explorer / Finder / ファイルマネージャ
* VS Code / Cursor / エディタ
* ターミナル
* Issue tracker
* AI ツール

### Open

`Open` は、`Resolved Path` をOSまたは既定の関連付けアプリに渡して開くことを試みます。

`Open` はベストエフォートの操作です。次の要因によって失敗する場合があります。

* OS のファイル関連付け
* ファイル種別の関連付け
* 権限
* UNC / WSL パス対応
* エディタやアプリケーションの有無
* ネットワークパスの利用可否

`Open` の失敗は、モデル診断上のエラーではありません。`Resolved Path` は表示され続け、コピーして利用できます。

## Local source root

`Local source root` は、相対 Source Links を解決するための Model Weave 設定です。

Obsidian vault とソースリポジトリを別々に管理している場合に使います。

構成例:

```text
Obsidian vault:
C:\Users\example\Documents\ModelDocs

Source repository:
C:\Users\example\projects\model-weave
```

モデルファイル:

```markdown
## Source Links

| path | notes |
|---|---|
| src/main.ts | Plugin entry point |
```

設定:

```text
Local source root = C:\Users\example\projects\model-weave
```

Resolved Path:

```text
C:\Users\example\projects\model-weave\src\main.ts
```

## 設計メモ

Source Links は参照情報であり、ソースファイルそのものをモデルファイルに埋め込むものではありません。

Model Weave は、ソースファイルが Obsidian vault 内にあることを要求しません。これにより、ドキュメントリポジトリと実装リポジトリを分けたまま、モデル要素から関連する実装ファイルを参照できます。

Source Links は、AI 支援によるリバースエンジニアリングでも有効です。生成されたモデルに、推論元となったソースファイルへの参照を残せるため、後から人間がレビューしやすくなります。

## AI生成時の注意

AIでモデルファイルを生成するときは、`## Source Links` に推論元・参照元のファイルを残してください。

特に、次のような場合に有効です。

* ソースコードからモデルを生成した場合
* SQL / DDL / migration から ER Entity を生成した場合
* UIコードから Screen を生成した場合
* API仕様から Data Object を生成した場合
* 既存ドキュメントから DFD や App Process を生成した場合

Source Links があると、生成されたモデルを人間がレビューしやすくなります。

注意点:

* `path` には、プロジェクトで再現しやすいパスを使います。
* 公開リポジトリでは、個人PC固有の絶対パスを避けることを推奨します。
* 相対パスで書ける場合は、相対パスを優先します。
* Vault外のソースを参照する場合は、`Local source root` の利用を検討します。
* Source Links は設計参照であり、実装ファイルの内容を複製する場所ではありません。
