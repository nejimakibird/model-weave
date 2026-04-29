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

`app_process` は、最初から完全に正規化された処理定義を目指すものではありません。  
初期設計では、構造化された接続情報を `Triggers` / `Inputs` / `Outputs` / `Transitions` にまとめ、処理内容や例外処理は `Steps` / `Errors` に自然言語で記述してよいものとします。

後続のレビューや AI 補助により、重複処理の共通化、Rule の切り出し、Mapping の整理、app_process の分割、Trigger / Transition の明確化を段階的に行うことを前提とします。

---

## 基本方針

- `type: app_process` を持つ
- UI を持たない処理単位を表す
- `kind` により処理種別を区別する
- `Triggers` / `Inputs` / `Outputs` / `Transitions` は構造化テーブルとして前半にまとめる
- `Steps` / `Errors` / `Notes` は自然言語または箇条書きとして後半にまとめる
- `Steps` はテーブルではなく、自然言語または箇条書きで記述する
- `Errors` もテーブルではなく、自然言語または箇条書きで記述する
- Triggers / Transitions は Optional
- 自然言語による冗長な記述を許容する
- Rule / Message / data_object / Mapping などは文中リンクとして参考情報を付与できる
- AI レビューで共通化・整合性確認・分割を行いやすい構造にする
- Screen から呼び出される処理として利用できる
- Screen 内の Local Processes と同系統のセクション構造を持つ

---

## Frontmatter

### 必須

- `type`
- `id`
- `name`

### 任意

- `kind`
- `tags`

### `kind` の想定値

`kind` は厳密制限せず、文字列として保持します。

想定値:

- `server_process`
- `api`
- `batch`
- `event`
- `message_handler`
- `scheduled_job`
- `background_task`
- `manual`
- `other`

### 例

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

## Triggers

## Inputs

## Outputs

## Transitions

## Steps

## Errors

## Notes
~~~

### 構成方針

前半に構造化テーブルをまとめます。

- `Triggers`
- `Inputs`
- `Outputs`
- `Transitions`

後半に自然言語セクションをまとめます。

- `Steps`
- `Errors`
- `Notes`

この順序により、処理の接続点を先に俯瞰し、その後で処理内容と例外処理を詳しく読めます。

### 実質的な最小構成

最初に書き始める段階では、以下があれば十分です。

- `Summary`
- `Inputs`
- `Outputs`
- `Steps`

### Optional

以下は必要になった時だけ書けばよいです。

- `Triggers`
- `Transitions`
- `Errors`
- `Notes`

ただし、テンプレートには空セクションとして含めてもよいです。

### parser 方針

推奨順序は上記としますが、parser / validator はセクション順序に厳密依存しない方針とします。  
旧順序のファイルも読み込み対象とします。

旧順序例:

~~~text
## Summary
## Triggers
## Inputs
## Steps
## Outputs
## Transitions
## Errors
## Notes
~~~

---

## Summary

処理の概要を自然言語で記述します。

---

## Triggers

処理が何によって起動されるかを記述します。  
Optional です。

### 列

- `id`
- `kind`
- `source`
- `event`
- `notes`

### 例

~~~markdown
## Triggers

| id | kind | source | event | notes |
|---|---|---|---|---|
| TRG-001 | screen_action | [[screen/SCR-ORDER-ENTRY\|注文入力画面]].ACT-REGISTER | click | 登録ボタン押下 |
~~~

---

## Inputs

処理が受け取る入力を記述します。

### 列

- `id`
- `data`
- `source`
- `required`
- `notes`

### 例

~~~markdown
## Inputs

| id | data | source | required | notes |
|---|---|---|---|---|
| IN-ORDER | [[data/DATA-ORDER-CONTENT\|注文内容]] | [[screen/SCR-ORDER-ENTRY\|注文入力画面]] | Y | 画面入力値 |
~~~

---

## Outputs

処理の出力、保存先、返却先を記述します。

### 列

- `id`
- `data`
- `target`
- `notes`

### 例

~~~markdown
## Outputs

| id | data | target | notes |
|---|---|---|---|
| OUT-RESULT | [[data/DATA-ORDER-REGISTER-RESULT\|注文登録結果]] | [[screen/SCR-ORDER-COMPLETE\|登録完了画面]] | 登録結果を返す |
~~~

---

## Transitions

処理後の制御フローを明示したい場合に使います。  
Optional です。

### 列

- `id`
- `event`
- `to`
- `condition`
- `notes`

### 例

~~~markdown
## Transitions

| id | event | to | condition | notes |
|---|---|---|---|---|
| TRN-SUCCESS | success | [[screen/SCR-ORDER-COMPLETE\|登録完了画面]] |  | 正常時 |
| TRN-ERROR | error | [[screen/SCR-ORDER-ENTRY\|注文入力画面]] | validation_error | 入力画面へ戻る |
~~~

---

## Steps

処理手順を自然言語で記述します。

`Steps` は **テーブルではなく、文章または箇条書き** を正規形式とします。  
理由は、処理内容は初期設計段階では揺れが大きく、ID や入出力を厳密に表形式へ落とし込むより、まず人間が読みやすい文章で冗長に書く方が実用的だからです。

### 書き方

以下のいずれも許容します。

- 段落
- 番号付きリスト
- 箇条書き
- 小見出し付きの説明

### 方針

- Step ID は必須にしない
- 箇条書きで処理内容を書いてよい
- 処理の順序が分かる程度でよい
- Input / Output と厳密に対応していなくてもよい
- 文中に Rule / Mapping / data_object / er_entity / app_process などへのリンクを付与してよい
- 後続の AI レビューで、Rule / Mapping / app_process 分割の候補を抽出する

---

## Errors

エラーや例外時の扱いを自然言語で記述します。

`Errors` は **テーブルではなく、文章または箇条書き** を正規形式とします。  
初期設計段階では、エラー条件、利用者への表示、処理継続可否、ロールバック、再実行可否などを、人間が読みやすい形で書いてよいものとします。

### 文中リンク

必要に応じて、文中に以下のような参照リンクを付与します。

- `rule`
- `message`
- `data_object`
- `screen`
- `app_process`
- `er_entity`
- `class`
- `mapping`

### 方針

- Error ID は必須にしない
- エラーの網羅性より、まず人間が理解できる説明を優先する
- メッセージや判定条件を厳密に管理したい場合は、後続で `message` / `rule` に切り出す
- V0.7 時点では `Errors` は Qualified Ref の member 候補に含めない

---

## Notes

自由記述の補足です。

---

## Qualified Ref / Member Ref

`app_process` では、まず `Inputs.id` / `Outputs.id` を Qualified Ref の member 候補として扱います。

`Steps` と `Errors` は自然言語を正規形式とするため、V0.7 時点では member 候補に含めません。

例:

~~~markdown
[[process/PROC-ORDER-REGISTER\|注文登録処理]].IN-ORDER
[[process/PROC-ORDER-REGISTER\|注文登録処理]].OUT-RESULT
~~~

member 解決候補:

- `Inputs.id`
- `Outputs.id`
- 将来的には `Triggers.id`
- 将来的には `Transitions.id`

---

## Screen との関係

`screen` は UI を持つ設計単位です。  
`app_process` は UI を持たない処理単位です。

Screen では `Actions.invoke` から `app_process` を呼び出せます。  
また、Screen 内に閉じた中程度の処理は、Screen 内 `Local Processes` として記述できます。

---

## AI レビューでの利用

`app_process` は、初期状態では冗長に書かれることを許容します。

そのうえで、AI に複数の app_process / screen / data_object / er_entity を渡し、以下を相談する用途を想定します。

- 処理の重複
- 共通化できる app_process
- Input / Output の不整合
- data_object の不足
- Mapping の不足
- Rule として切り出すべき条件
- message として切り出すべき文言
- app_process の分割候補
- Trigger / Transition の明確化

このため、自然言語による `Steps` / `Errors` / notes を許容しつつ、Triggers / Inputs / Outputs / Transitions をテーブルとして持つ構成にしています。

---

## 完成例

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

## Triggers

| id | kind | source | event | notes |
|---|---|---|---|---|
| TRG-REGISTER-CLICK | screen_action | [[screen/SCR-ORDER-ENTRY\|注文入力画面]].ACT-REGISTER | click | 登録ボタン押下 |

## Inputs

| id | data | source | required | notes |
|---|---|---|---|---|
| IN-ORDER | [[data/DATA-ORDER-CONTENT\|注文内容]] | [[screen/SCR-ORDER-ENTRY\|注文入力画面]] | Y | 画面入力値 |

## Outputs

| id | data | target | notes |
|---|---|---|---|
| OUT-RESULT | [[data/DATA-ORDER-REGISTER-RESULT\|注文登録結果]] | [[screen/SCR-ORDER-COMPLETE\|登録完了画面]] | 登録結果を返す |

## Transitions

| id | event | to | condition | notes |
|---|---|---|---|---|
| TRN-SUCCESS | success | [[screen/SCR-ORDER-COMPLETE\|登録完了画面]] |  | 正常時 |
| TRN-ERROR | error | [[screen/SCR-ORDER-ENTRY\|注文入力画面]] | validation_error | 入力画面へ戻る |

## Steps

1. 入力内容を検証する。  
   注文ID、商品ID、数量、顧客情報を確認する。  
   関連ルール: [[rule/RULE-ORDER-REGISTER\|登録可否判定]]

2. 注文データを保存する。  
   注文テーブルと注文明細テーブルへ保存する。

3. 登録結果を作成する。  
   登録完了画面に表示するための結果データを返す。

## Errors

- 入力内容に不備がある場合、入力画面へ戻して修正を促す。  
  メッセージ: [[message/MSG-ORDER-001\|入力内容を確認してください]]  
  関連ルール: [[rule/RULE-ORDER-REGISTER\|登録可否判定]]

- データ更新に失敗した場合、処理をロールバックしてエラーとして終了する。  
  メッセージ: [[message/MSG-COMMON-DB-001\|データ更新に失敗しました]]

## Notes

- 初期設計では処理内容を冗長に書いてよい。
- 後続の AI レビューで共通化・分割・Rule 化を検討する。
~~~

---

## V0.7 での位置づけ

現時点では、まず `app_process` を先に定義し、次に `screen` を定義します。

理由:

- Screen は `app_process` を呼び出す
- Screen 内 Local Processes は `app_process` 相当の構造を持つ
- 先に `app_process` を定義した方が、Screen 仕様がぶれにくい

---

## 非対応 / 後続検討

V0.7 時点では以下を必須にしません。

- app_process diagram
- app_process のチャートレンダリング
- Trigger / Transition の厳格 validation
- Step 間の詳細なデータフロー検証
- Retry / Transaction の詳細仕様
- app_process の自動分割
- AI による自動共通化
- Steps の構造化 ID 管理
- Errors の構造化 ID 管理

まずは、処理をテキストで記述し、AI と人間がレビューできる構造を作ることを優先します。
