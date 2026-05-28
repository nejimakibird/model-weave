# FORMAT-app_process

## 目的

`app_process` は、Model Weave における **UI を持たないアプリケーション処理単位**を表すフォーマットです。

対象例:

- サーバサイド処理
- API 処理
- バッチ処理
- スケジュールジョブ
- イベント処理
- メッセージハンドラ
- バックグラウンド処理
- 画面から呼び出される登録・検索・更新処理

`app_process` は、最初から完全に正規化された処理定義を目指すものではありません。自然言語による `Steps` / `Errors` / `Notes` を許容しつつ、必要に応じて `Steps` / `Flows` を Business Flow preview 用の構造化テーブルとして記述できます。

---

## 基本方針

- `type: app_process` を持つ
- UI を持たない処理単位を表す
- `kind` により処理種別を区別する
- `Steps` は自然言語・箇条書き、または構造化テーブルとして記述できる
- テーブル形式の `Steps` は、実験的な Business Flow preview の入力になる
- `Flows` は Business Flow 内の Step 間接続を定義する任意の構造化テーブル
- `Transitions` は app_process / Business Flow の外へ出る接続を表す任意の構造化テーブル
- `Triggers` / `Inputs` / `Outputs` は詳細化の過程で追加できる
- `Errors` / `Notes` は自然言語または箇条書きとして記述する
- 既存の自然言語・箇条書きの `Steps` は互換性を保ち、テキストとして表示される
- Rule / Message / data_object / Mapping などは文中リンクとして参考情報を付与できる
- Screen から呼び出される処理として利用できる

---

## Frontmatter

### 必須

- `type`
- `id`
- `name`

### 任意

- `kind`
- `tags`

`kind` は厳密制限せず、文字列として保持します。

例:

~~~yaml
---
type: app_process
id: PROC-ORDER-REGISTER
name: 注文登録処理
kind: server_process
tags:
  - AppProcess
---
~~~

---

## 本文構成

推奨構成:

~~~text
# <process name>

## Summary

## Source Links

## Steps

## Flows

## Triggers

## Inputs

## Outputs

## Transitions

## Errors

## Notes
~~~

### 実質的な最小構成

最初に書き始める段階では、以下があれば十分です。

- `Summary`
- `Steps`

Business Flow preview で明示的な分岐・合流を表現したい場合は、次を追加します。

- `Flows`

`Flows` がない場合、テーブル形式の `Steps` は行順で接続されます。

### 詳細化で追加するセクション

以下は、処理の接続点や入出力を明確化したい段階で追加します。

- `Source Links`
- `Triggers`
- `Inputs`
- `Outputs`
- `Transitions`
- `Errors`
- `Notes`

テンプレートには空セクションとして含めてもよいです。

### parser 方針

推奨順序は上記としますが、parser / validator はセクション順序に厳密依存しない方針とします。

---

## Summary

処理の概要を自然言語で記述します。

---

## Source Links

実装ソースや関連ファイルへの参照を記述します。共通セクションとして扱います。

---

## Steps

処理手順を記述します。

`Steps` は次のどちらでも記述できます。

- 文章、番号付きリスト、箇条書き
- 実験的な Business Flow preview 用の Markdown テーブル

既存の文章・箇条書きの `Steps` は有効で、テキストとして表示されます。

### 自然言語 Steps

以下のいずれも許容します。

- 段落
- 番号付きリスト
- 箇条書き
- 小見出し付きの説明

方針:

- Step ID は必須にしない
- 箇条書きで処理内容を書いてよい
- 処理の順序が分かる程度でよい
- Input / Output と厳密に対応していなくてもよい
- 文中に Rule / Mapping / data_object / er_entity / app_process などへのリンクを付与してよい

### テーブル形式 Steps

`## Steps` に Markdown テーブルがある場合、Model Weave は Business Flow 用の構造化 Steps として解析します。

列:

- `id`
- `lane`
- `label`
- `kind`
- `input`
- `output`
- `rule`
- `invoke`
- `screen`
- `notes`

`kind` は自由なテキストです。`start`、`process`、`decision`、`screen`、`end` などを使えますが、Model Weave は固定 enum として強制しません。

子 Business Flow や別の app_process を表す Step には、`kind: flow` または `kind: subflow` を使えます。参照先の app_process がある場合は、`invoke` に app_process id を書きます。0.1.6 では、参照先 flow は現在の Business Flow 内の node として表示されますが、inline 展開はされません。

例:

~~~markdown
## Steps

| id | lane | label | kind | input | output | rule | invoke | screen | notes |
|---|---|---|---|---|---|---|---|---|---|
| step1 | User | 注文を送信 | start | IN-ORDER |  |  |  | SCR-ORDER-ENTRY | 利用者が入力を送信 |
| step2 | System | 注文を検証 | decision | IN-ORDER | VALIDATED-ORDER | RULE-ORDER-VALID |  |  | 必須項目を確認 |
| step3 | System | 在庫を引き当て | subflow | VALIDATED-ORDER | RESERVED-ORDER |  | PROC-INVENTORY-RESERVE |  | 子 Business Flow |
| step4 | Screen | 結果を表示 | end | RESERVED-ORDER | OUT-RESULT |  |  | SCR-ORDER-RESULT | 完了結果を表示 |
~~~

### lane の挙動

- `lane` は任意
- `lane` は自由なテキストラベル
- 同じ非空の `lane` を持つ Step は同じ Mermaid subgraph にまとめられる
- `lane` が空または未指定の Step は、lane subgraph の外側に直接表示される
- `lane` 未指定は warning ではない
- 自動的な Unassigned lane は生成しない

---

## Flows

`Flows` は任意です。テーブル形式 `Steps` の Business Flow edge を定義します。

列:

- `from`
- `to`
- `condition`
- `label`
- `notes`

例:

~~~markdown
## Flows

| from | to | condition | label | notes |
|---|---|---|---|---|
| step1 | step2 |  | submit |  |
| step2 | step3 | valid | OK | 正常系 |
| step2 | step90 | invalid | NG | 入力エラー |
~~~

Flow の挙動:

- `## Flows` が存在し、行がある場合は、その内容が Business Flow の edge になる
- `## Flows` がない、または空の場合は、構造化 Steps をテーブル行順に接続する
- `from` / `to` は `Steps.id` を参照する
- 無効な `from` / `to` 参照は diagnostics の対象になる
- `condition` / `label` は edge label として表示されることがある

---

## Triggers

処理が何によって起動されるかを記述します。Optional です。

列:

- `id`
- `kind`
- `source`
- `event`
- `notes`

---

## Inputs

処理が受け取る入力を記述します。詳細化の過程で追加できます。

列:

- `id`
- `data`
- `source`
- `required`
- `notes`

---

## Outputs

処理の出力、保存先、返却先を記述します。詳細化の過程で追加できます。

列:

- `id`
- `data`
- `target`
- `notes`

---

## Transitions

`Transitions` は、現在の app_process / Business Flow の外へ出る制御遷移を定義します。Optional です。

`Flows` と `Transitions` は制御フローの粒度が異なります。

- `Flows` は、現在の Business Flow 内の Step 間接続を定義します。
- `Transitions` は、現在の app_process / Business Flow から外へ出る遷移を定義します。
- 遷移先の例:
  - 次の Screen
  - 次の app_process
  - 外部制御
  - process 境界での flow-to-flow 接続

列:

- `id`
- `event`
- `to`
- `condition`
- `notes`

例:

~~~markdown
## Transitions

| id | event | to | condition | notes |
|---|---|---|---|---|
| TRN-SUCCESS | success | [[screen/SCR-ORDER-COMPLETE|登録完了画面]] |  | 正常時 |
| TRN-NEXT-PROCESS | next | [[process/PROC-SHIPPING-START|出荷開始処理]] | order_registered | 次の業務フローへ接続 |
| TRN-ERROR | error | [[screen/SCR-ORDER-ENTRY|注文入力画面]] | validation_error | 入力画面へ戻る |
~~~

---

## Errors

エラーや例外時の扱いを自然言語で記述します。

`Errors` は **テーブルではなく、文章または箇条書き** を正規形式とします。

---

## Notes

自由記述の補足です。

---

## Qualified Ref / Member Ref

`app_process` では、まず `Inputs.id` / `Outputs.id` を Qualified Ref の member 候補として扱います。

`Steps` と `Errors` は自然言語互換を保つため、0.1.6 時点では member 候補に含めません。

member 解決候補:

- `Inputs.id`
- `Outputs.id`
- 将来的には `Triggers.id`
- 将来的には `Transitions.id`

---

## Screen との関係

`screen` は UI を持つ設計単位です。`app_process` は UI を持たない処理単位です。

Screen では `Actions.invoke` から `app_process` を呼び出せます。また、Screen 内に閉じた中程度の処理は、Screen 内 `Local Processes` として記述できます。

---

## 完成例: Business Flow

~~~markdown
---
type: app_process
id: PROC-ORDER-REGISTER
name: 注文登録処理
kind: server_process
tags:
  - AppProcess
---

# 注文登録処理

## Summary

注文入力画面から受け取った注文内容を検証し、注文データとして保存する。

## Steps

| id | lane | label | kind | input | output | rule | invoke | screen | notes |
|---|---|---|---|---|---|---|---|---|---|
| step1 | User | 注文を送信 | start | IN-ORDER |  |  |  | SCR-ORDER-ENTRY | 利用者が入力を送信 |
| step2 | System | 注文を検証 | decision | IN-ORDER | VALIDATED-ORDER | RULE-ORDER-VALID |  |  | valid / invalid に分岐 |
| step3 | System | 在庫を引き当て | subflow | VALIDATED-ORDER | RESERVED-ORDER |  | PROC-INVENTORY-RESERVE |  | 子 Business Flow |
| step4 | System | 注文を登録 | process | RESERVED-ORDER | ORDER | RULE-ORDER-CREATE | PROC-ORDER-SAVE |  | 注文を保存 |
| step5 | Screen | 完了画面を表示 | end | ORDER | OUT-RESULT |  |  | SCR-ORDER-COMPLETE | 正常終了 |
| step90 |  | エラーを表示 | end | IN-ORDER |  | RULE-ORDER-VALID |  | SCR-ORDER-ENTRY | lane 未指定の例 |

## Flows

| from | to | condition | label | notes |
|---|---|---|---|---|
| step1 | step2 |  | submit |  |
| step2 | step3 | valid | OK | 正常系 |
| step2 | step90 | invalid | NG | 入力エラー |
| step3 | step4 |  | reserved |  |
| step4 | step5 |  | registered |  |

## Inputs

| id | data | source | required | notes |
|---|---|---|---|---|
| IN-ORDER | [[data/DATA-ORDER-CONTENT|注文内容]] | [[screen/SCR-ORDER-ENTRY|注文入力画面]] | Y | 画面入力値 |

## Outputs

| id | data | target | notes |
|---|---|---|---|
| OUT-RESULT | [[data/DATA-ORDER-REGISTER-RESULT|注文登録結果]] | [[screen/SCR-ORDER-COMPLETE|登録完了画面]] | 登録結果を返す |

## Transitions

| id | event | to | condition | notes |
|---|---|---|---|---|
| TRN-SUCCESS | success | [[screen/SCR-ORDER-COMPLETE|登録完了画面]] |  | 正常時 |
| TRN-ERROR | error | [[screen/SCR-ORDER-ENTRY|注文入力画面]] | validation_error | 入力画面へ戻る |

## Errors

- 入力内容に不備がある場合、入力画面へ戻して修正を促す。
- データ更新に失敗した場合、処理をロールバックしてエラーとして終了する。

## Notes

- `Steps` / `Flows` が Business Flow preview の主入力になります。
- `Inputs` / `Outputs` / `Transitions` は詳細化の過程で追記できます。
~~~

---

## 完成例: 自然言語 Steps

~~~markdown
---
type: app_process
id: PROC-ORDER-REGISTER-PROSE
name: 注文登録処理（自然言語版）
kind: server_process
---

# 注文登録処理（自然言語版）

## Summary

注文入力画面から受け取った注文内容を検証し、注文データとして保存する。

## Steps

1. 入力内容を検証する。  
   注文ID、商品ID、数量、顧客情報を確認する。  
   関連ルール: [[rule/RULE-ORDER-REGISTER|登録可否判定]]

2. 注文データを保存する。  
   注文テーブルと注文明細テーブルへ保存する。

3. 登録結果を作成する。  
   登録完了画面に表示するための結果データを返す。

## Errors

- 入力内容に不備がある場合、入力画面へ戻して修正を促す。
- データ更新に失敗した場合、処理をロールバックしてエラーとして終了する。
~~~

---

## 0.1.6 での位置づけ

0.1.6 では、テーブル形式 `Steps` / `Flows` による Business Flow preview は実験的機能です。

- `Steps` / `Flows` は Business Flow preview の主入力です
- `Flows` がない場合、`Steps` は行順で接続されます
- `lane` は自由文字列であり、固定 enum ではありません
- `kind` も自由文字列であり、固定 enum ではありません
- `kind: flow` / `kind: subflow` は階層化のための軽量な慣習です
- `Transitions` は現在の app_process / Business Flow の外へ出る接続を表します

---

## 非対応 / 後続検討

0.1.6 時点では以下を必須にしません。

- Business Flow を超える app_process diagram
- BPMN
- 手動レイアウト
- 自動 Unassigned lane
- Lane 定義セクション
- Trigger / Transition の厳格 validation
- Step 間の詳細なデータフロー検証
- Retry / Transaction の詳細仕様
- app_process の自動分割
- AI による自動共通化
- 必須としての Steps の構造化 ID 管理
- Errors の構造化 ID 管理
- subflow の inline 展開
- 複数 app_process をまたぐ自動Business Flow描画

まずは、処理をテキストで記述し、必要に応じて Business Flow として見える化できる構造を作ることを優先します。
