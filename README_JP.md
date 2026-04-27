# Model Weave

**Model Weave は、設計をテキスト資産として記述し、図と文書を派生的に生成することで、レビュー・差分管理・AI実装をつなぐためのテキストベースモデリングツールです。**

## Vision

人間が理解でき、AIも活用できる設計資産を、プレーンテキストで残す。

## Mission

設計の意味をテキストで記述し、そこから図と文書を自動生成することで、レビューと実装をつなぐ。

## Scope

まずは ER / Class / DFD / data_object を整備し、次に screen / app_process / codeset / message を Markdown ベースで扱えるようにし、その後に業務フローや rule / mapping へ拡張する。

---

## 概要

Model Weave は、設計をプレーンテキストで記述し、そこから図と文書を生成するためのテキストベースモデリングツールです。

目的は、ER図やクラス図を単に描くことではありません。  
設計の意味をテキスト資産として残し、それを人間が理解しやすい図や文書へ変換することで、レビューしやすく、差分管理しやすく、将来的には AI による実装やテスト生成にも接続しやすい設計基盤を作ることを目指しています。

設計の正本はあくまでテキストです。  
図はその派生物として生成されます。  
これにより、特定の作図ツールに依存せず、Git などによる履歴管理や再利用がしやすい形で設計資産を残すことができます。

---

## なぜ作るのか

従来の設計では、Excel や作図ツール上に情報が分散しやすく、差分管理や再利用、AI 活用が難しいという課題があります。

一方で、AI に直接実装を任せると、要求とのズレや妥当性判断が難しくなります。  
コードは速く生成できても、その内容が本当に妥当かどうかを判断しにくいことが多いためです。

Model Weave は、その間に **人間も AI も扱える中間設計資産** を置くことを狙っています。  
自然言語で考えた要求や設計意図を、構造化されたテキストへ落とし込み、そこから図や文書を生成して人間がレビューし、その後に AI 実装へつなげる。  
そのようなワークフローを支えるためのツールです。

---

## このツールの価値

### 1. 設計の正本をテキストとして残せる

- プレーンテキストとして保存できる
- Git で差分管理できる
- 特定ツールに閉じない
- ツールが使えなくなっても資産が残る

### 2. 人が理解しやすい形に変換できる

- テキストから図や文書を生成できる
- 設計レビューに使いやすい
- 構造・関係・流れを可視化できる

### 3. AI 実装やテスト生成の土台になる

- 自然言語だけに依存しない設計を持てる
- AI が解釈しやすい構造を与えられる
- テスト観点やテストケース生成にも接続しやすい

---

## 設計原則

### 1. テキストを正本とする
設計の正本はプレーンテキストとし、図やプレビューは派生物として扱う。

### 2. 作図より意味記述を優先する
目的は図を手で描くことではなく、設計の意味を記述し、それを見やすい形に変換することである。

### 3. 人間が読めることを重視する
記述形式は、機械処理だけでなく人間が直接読んで理解できることを重視する。

### 4. AI が扱いやすい構造を持たせる
ID、型、関係、項目、ルールなどを明示し、AI が処理しやすい構造を持たせる。

### 5. 差分管理しやすい形を保つ
Git などのバージョン管理と相性の良い形式を採用する。

### 6. ツールに依存しない資産を残す
作図ツールや実行環境に依存せず、設計資産そのものが残ることを重視する。

### 7. 段階的に拡張する
最初からすべてを扱わず、構造設計から始めて段階的に対象を広げる。

### 8. 実装コードの写像を目的にしない
設計モデルは、実装コードをそのまま再現するものではなく、実装とテストに接続しやすい責務整理のための中間表現とする。

### 9. レビュー可能性を重視する
設計は AI に直接渡す前に、人間がレビューし妥当性を確認できる形で提示されるべきである。

### 10. 自動化は補助、最終判断は人が行う
AI やツールは下書き生成や整合性チェックを支援するが、業務妥当性の最終判断は人間が担う。

---

## 現在のスコープ

このツールは段階的に拡張する前提で設計しています。

### フェーズ1
まずは構造設計を対象に、以下を扱います。

- ER
- Class

### フェーズ2
次に、より大きな粒度の可視化として以下を扱います。

- DFD
- data_object
- Business Flow（後続フェーズ）

### フェーズ3
さらに、画面仕様や処理仕様、ルール定義へ拡張します。

- Screen
- app_process
- Rule
- CodeSet
- Mapping
- Transition
- Message

---

## 現在の正式対応フォーマット

現時点では、以下の 7 フォーマットを正式対応形式として扱います。

- `class`
- `class_diagram`
- `er_entity`
- `er_diagram`
- `dfd_object`
- `dfd_diagram`
- `data_object`

設計の正本は個別オブジェクト側に置き、図はそれを可視化するビューとして扱う方針です。

### V0.6 対応中フォーマット

V0.6 では、画面仕様、アプリケーション処理仕様、コード体系、メッセージ集合を Markdown 上で記述できるようにするため、`screen`、`app_process`、`codeset`、`message` を対応中フォーマットとして扱います。

これらは、図形 Viewer を主役にせず、Markdown 本文を正本とします。Viewer は構造サマリ、整合性確認、ナビゲーション補助に寄せます。

- `screen`: UI を持つ画面設計単位です。Fields を画面上の target 定義、Actions を target + event のイベントハンドラ定義として扱います。
- `app_process`: UI を持たないアプリケーション処理単位です。Triggers / Inputs / Outputs / Transitions を構造化テーブル、Steps / Errors / Notes を自然言語セクションとして扱います。
- `codeset`: コード体系・区分値・選択肢定義を表します。1 ファイル = 1 コード体系、`Values` テーブル = コード値一覧として扱います。
- `message`: メッセージ集合を表します。1 ファイル = 1 メッセージ集合、`Messages` テーブル = 文言一覧として扱います。

### V0.6 後続検討フォーマット

`screen` と `app_process` を書ける状態にした後、そこから参照されるルールや項目対応を段階的に整備します。

- `rule`: 入力制約、分岐条件、状態制約、実行条件などを表します。
- `mapping`: screen / data_object / er_entity / app_process などの項目対応を表します。

---

## Quick Start

最短で試すなら、まずは単体オブジェクトを 1 つ作り、そのあと diagram ファイルで束ねる流れが分かりやすいです。

1. `class`、`er_entity`、`dfd_object`、または `data_object` の単体ファイルを 1 つ作る  
   クラスなら責務・属性・メソッド・関係を、ER ならテーブル・カラム・関係を、DFD なら単体要素の kind を、data_object なら flow 上を流れるデータ構造を記述します。
2. `class_diagram`、`er_diagram`、または `dfd_diagram` を作り、`## Objects` に対象を並べる  
   図は個別ファイルを束ねて可視化するビューです。DFD の flow は `dfd_diagram` 側の `## Flows` を正本として定義します。
3. 右ペインの Viewer で図を確認する  
   単体ファイルは部分図、diagram ファイルは全体図として表示されます。
4. 補完・validation・diagnostics を使って記述を整える  
   補完で参照入力を補助し、右ペインの Notes / Warnings / Errors で整合性を確認します。
5. 必要に応じて PNG Export する  
   レビュー資料や Obsidian 文書へ貼る用途では、`Model Weave: Export Current Diagram as PNG` を使います。

---

## ファイルの役割

Model Weave では、単体定義ファイルと diagram ファイルを分けて扱います。

- `class`: 単体クラス定義です。責務、属性、メソッド、関係の正本を持ちます。
- `class_diagram`: 複数の class を束ねて表示する図です。`Objects` と diagram 全体の relation を持ちます。
- `er_entity`: 単体テーブル定義です。カラム、インデックス、FK 関係の正本を持ちます。
- `er_diagram`: 複数の entity を束ねて表示する ER 図です。`Objects` を起点に関係を集約します。
- `dfd_object`: DFD の単体部品です。`kind` で external / process / datastore を表します。
- `dfd_diagram`: 複数の dfd_object を束ね、`Objects` と `Flows` を正本として持つ DFD 図です。
- `data_object`: DFD flow 上を流れるデータ定義です。専用 viewer は持たず、通常 Markdown として扱います。

単体ファイルに意味を持たせ、diagram はそれを束ねて見やすくする、という役割分担が基本です。

### V0.6 対応中

- `screen`: 画面仕様を表します。Fields で画面 target を定義し、Actions で target + event に紐づく操作や処理呼び出しを定義します。
- `app_process`: 画面を持たない処理仕様を表します。画面イベント、API、バッチ、サーバサイド処理などを記述します。
- `codeset`: コード体系を表します。`Values` をコード値一覧として持ち、screen / rule / mapping などから参照されます。
- `message`: メッセージ集合を表します。`Messages` を文言一覧として持ち、screen / rule / app_process などから参照されます。

---

## V0.5 現行仕様メモ

### Class と Class Diagram

`class` は Spec04 形式を正規形式として扱います。  
`class` の `## Relations` は `from` 列を持たず、`from` は常にそのファイル自身の frontmatter `id` とみなします。

`class` の `## Relations` は以下の列を使います。

- `id`
- `to`
- `kind`
- `label`
- `from_multiplicity`
- `to_multiplicity`
- `notes`

`class.Relations.to` は ID ベースで記述します。  
例: `CLS-ORDER-ORDER`, `IF-ORDER-ORDER-REPOSITORY`

一方、`class_diagram` は図全体に対する明示 relation を表すため、`## Relations` では従来どおり `from` / `to` を持ちます。  
`class_diagram.Objects.ref` は、Obsidian 上で実ファイルへ移動できる wikilink を推奨します。  
例: `[[classes/CLS-ORDER-ORDER]]`

抽象クラスは当面、`kind: class` と `stereotype: abstract` の組み合わせで表現します。  
`kind: abstract` は正規運用ではなく、サンプルやテンプレートでは使いません。

旧 `class` relation 形式、つまり `## Relations` に `from` 列を持つ形式は、当面は読み込み互換のみ残しています。  
新規作成・テンプレート・正式サンプルでは Spec04 形式を使ってください。

### ER の参照ルール

ER の `target_table` と diagram の `Objects.ref` は、Obsidian 上で実ファイルへ移動できる wikilink を推奨します。

- `er_entity.Relations.target_table`: `[[entities/m_customer]]`
- `er_diagram.Objects.ref`: `[[entities/t_order]]`
- `class_diagram.Objects.ref`: `[[classes/CLS-ORDER-ORDER]]`

内部解釈では、リンク先ファイルを解決したうえで frontmatter や本文から必要な値を読みます。  
ER の SQL 的なテーブル名や relation 解釈では、リンク先 `er_entity` の `physical_name` を使います。

このため、参照値そのものは「クリックできるリンク」、DB 名や class ID は「リンク先ファイルの属性」として分離して扱います。

### DFD の参照ルール

DFD では `dfd_object` が単体部品、`dfd_diagram` が flow の正本です。描画は Mermaid `flowchart LR` を主経路とします。

- `dfd_diagram.Objects.ref`: wikilink 推奨
- `dfd_diagram.Flows.from`: wikilink 推奨
- `dfd_diagram.Flows.to`: wikilink 推奨
- `dfd_diagram.Flows.data`: 生文字列または `data_object` 参照

`dfd_object` 側は flow を持たず、diagram 側の `## Flows` に送信元、送信先、データ名を記述します。  
`level` は `dfd_diagram` frontmatter の任意メタ情報として持てますが、現時点では drill-down や親子遷移には使いません。

### data_object

`data_object` は、DFD flow 上を流れるデータ構造定義です。

- Flow.data から参照できます
- 専用 viewer は持たず、通常 Markdown として扱います
- `## Fields` で項目定義を持ちます
- `Fields.ref` から `er_entity` / `class` / `data_object` などへ接続できます

### V0.6 対応中メモ

`screen`、`app_process`、`codeset`、`message` は V0.6 の対応中フォーマットです。いずれも Markdown 本文を正本とし、Viewer は図形描画ではなく構造サマリ、diagnostics、本文ジャンプの補助に寄せます。

- `screen`
  - Fields を画面 target 定義として扱います
  - Actions を target + event に紐づくイベントハンドラとして扱います
  - `ref` には `data_object` / `er_entity` / `class` などの参照を許容します
- `app_process`
  - Triggers / Inputs / Outputs / Transitions を構造化テーブルとして扱います
  - Steps / Errors / Notes は自然言語または箇条書きを正規形式とします
  - Qualified Ref を使い、`[[data/...]].field` のような参照を段階的に扱えるようにします
- `codeset`
  - 1 ファイル = 1 コード体系、`Values` = コード値一覧として扱います
  - `[[codeset/...]].code` の Qualified Ref で個別コード値を参照できます
- `message`
  - 1 ファイル = 1 メッセージ集合、`Messages` = 文言一覧として扱います
  - `[[message/...]].message_id` の Qualified Ref で個別メッセージを参照できます

### 参照ルール

Model Weave の参照は、以下の形式を許容します。

- raw id
- raw filename
- path
- `[[target]]`
- `[[target|label]]`
- `[[target\|label]]`
- `[label](target)`

Markdown テーブル内では `|` が列区切りになるため、補完挿入は `[[target\|label]]` を推奨します。  
resolver は常に `target` を使って解決し、`label / alias` は図種ごとの表示名候補として扱います。

---

## PNG Export

Model Weave では、現在表示中の diagram / object view を PNG として出力できます。

### 用途

- Obsidian 文書へ図を貼る
- Excel / PowerPoint / Word に貼る
- レビュー資料や説明資料へ持ち出す

### コマンド

- `Model Weave: Export Current Diagram as PNG`

### 出力仕様

- 出力形式は PNG
- 背景は白固定
- 出力対象は図本体のみ
- Notes / Warnings / Errors、操作ボタン、補助一覧は含まない
- 現在の zoom / pan そのままではなく、図全体が収まる形で出力する

### 保存先

- vault 内 `exports/`

資料貼り付け向けの安定した出力を優先しているため、画面上で一部を拡大して見ていても、PNG は図全体が読める形で生成されます。

---

## サンプル

初見では、まず repo 内のサンプルファイルを見るのが一番早いです。

- `class`, `class_diagram`, `er_entity`, `er_diagram`, `dfd_object`, `dfd_diagram` の最小例を見れば基本記法が分かります
- relation が多いサンプルを見ると、diagram の束ね方や参照の書き方が分かります
- DFD サンプルでは、直列 flow、分岐、合流、差し戻しループの最小表現を確認できます
- warning / unsupported 用の testdata は、正式記法の手本ではなく確認用として扱ってください

テンプレートをそのまま埋めるより、サンプルを 1 つ開いて Viewer と対応づけながら読む方が、運用イメージを掴みやすいです。

---

## 基本的な使い方

1. 設計対象をプレーンテキストで記述する  
2. ツールがその内容を解析する  
3. 図や文書を生成する  
4. 人間がレビューして修正する  
5. チェック機構で不整合を検出する  
6. 必要に応じて AI 実装やテスト生成に接続する  

---

## 主要な概念

### Class
振る舞いや責務を持つ設計要素を表します。  
サービス、DTO、ViewModel、ドメイン概念などを扱います。

### ER Entity
DB 上の格納構造を表します。  
テーブル、カラム、インデックス、FK 関係を扱います。

### Format
システム間連携や API、帳票などで受け渡されるデータ構造を表します。  
Class とは分離し、データ構造定義として扱います。

### DFD
システム間でどのデータがどこからどこへ流れるかを可視化します。

### Data Object
DFD flow 上を流れるデータ、電文、DTO、request / response、payload、file layout などを表します。

### Business Flow
業務の流れを、担当や部門の境界を含めて表現する後続対象です。V0.5 ではまだ実装しません。

### Rule
項目制約、分岐条件、状態制約などの業務ルールを表します。

### CodeSet
共通利用される区分値やコード体系を辞書として管理します。V0.6 では 1 ファイル = 1 コード体系、`Values` テーブル = コード値一覧という単体フォーマットとして対応を進めています。

### Message
エラー、確認、通知などの表示文言をメッセージ集合として管理します。V0.6 では 1 ファイル = 1 メッセージ集合、`Messages` テーブル = 文言一覧という単体フォーマットとして対応を進めています。

### Mapping
画面項目、Format、ER など異なる設計要素間の対応を表します。

### Screen
画面仕様を表す V0.6 対応中フォーマットです。Fields で画面 target を定義し、Actions で target + event に紐づく処理や遷移を記述します。

### app_process
画面を持たない処理仕様を表す V0.6 対応中フォーマットです。Triggers / Inputs / Outputs / Transitions を前半の構造化テーブル、Steps / Errors / Notes を後半の自然言語セクションとして扱います。

---

## このツールがやること / やらないこと

### このツールがやること

- 設計情報をプレーンテキストで記述できる
- テキストから図や文書を生成できる
- 差分管理しやすい設計資産を残せる
- AI 実装やテスト生成の土台を作れる

### このツールがやらないこと

- GUI で自由に図を描くことを主目的にしない
- 作図ツールの完全代替を目指さない
- 自然言語から完全自動で正しい設計を保証しない
- 実装コードそのものを正本にしない

---

## 想定ユースケース

- 構造設計をテキストで管理し、ER 図やクラス図を生成する
- システム間連携を DFD として可視化する
- DFD flow から data_object を辿って、流れるデータ構造を管理する
- 業務フローを後続フェーズでスイムレーン付きに整理する
- 画面仕様を構造化し、実装責務へ分解する
- AI に設計下書きを作らせ、人がレビューする
- レビュー済み設計をもとにコーディング AI で実装する
- 設計からテスト観点やテストケースを生成する

---

## 今後の拡張方針

### 1. 構造設計の強化
- Class
- ER
- Format
- CodeSet
- Mapping

### 2. 流れの可視化
- DFD
- data_object
- 業務フロー
- システム間連携
- データの受け渡し

### 3. 画面仕様と処理仕様の導入
- Screen
- app_process
- Rule
- CodeSet
- Mapping
- Message

### 4. AI 連携
- 自然言語からの設計下書き生成
- 設計レビュー補助
- 実装 AI への入力生成
- テスト観点・テストケース生成

---

## 将来像

最終的には、自然言語で表現された要求や設計意図をもとに、AI が構造化された設計の下書きを生成し、人間がそれを図と文書でレビューし、その確定した設計を実装 AI やテスト生成に接続できる状態を目指します。

Model Weave は、そのための中間設計資産をプレーンテキストとして残し、継続的に保守・再利用できる設計基盤になることを目標とします。

---

## 備考

- 旧 `diagram_v1` 系フォーマットは正式対応外です
- Business Flow は V0.5 では未実装です
- Business Flow は画像を正本にせず、構造化テキストを正本にする方針で後続検討します
- GitHub 公開や外部配布は、今後のバージョンで検討予定です
