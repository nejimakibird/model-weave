# FORMAT-app_process

English Version: [English](../../formats/FORMAT-app_process.md)

## 何に使うフォーマットか

`app_process` は、UIそのものを持たないアプリケーション処理単位を表すフォーマットです。

次のような処理を記述するときに使います。

* サーバーサイド処理
* API処理
* バッチ処理
* スケジュールジョブ
* イベント処理
* メッセージハンドラー
* バックグラウンドタスク
* 業務プロセスフロー
* 画面から呼び出される処理
* 別処理 / サブフローを呼び出す処理

`app_process` は、最初は自然言語の処理説明として書き始め、後から構造化されたテーブルへ発展させることができます。

対応する書き方は大きく2種類あります。

* 自然言語による処理メモ
* table-based `Steps` と `Flows` による構造化された Business Flow preview

## 重要な考え方: app_process と screen の違い

`app_process` と `screen` は関連しますが、モデリングする対象が異なります。

`screen` は、UIの振る舞いを記述するときに使います。

* 画面項目
* ボタン / アクション
* 画面メッセージ
* UI条件
* 画面遷移
* ユーザーが見るもの、操作するもの

`app_process` は、処理の振る舞いを記述するときに使います。

* 入力
* 出力
* バリデーション
* サーバーサイドまたはアプリケーションロジック
* バッチ / API / バックグラウンド処理
* 内部処理ステップ
* 処理間フロー
* Business Flow preview

画面は app process を呼び出すことができます。
app process は、入力元、出力先、遷移先として screen を参照できます。

ただし、app process は画面レイアウトそのものを定義しません。
画面項目、ボタン、UIアクションを定義したい場合は `screen` を使ってください。

## 重要な考え方: prose process と structured Business Flow

`app_process` は、2段階の詳細度に対応します。

### Prose process

処理は、文章、番号付きリスト、箇条書きで書くことができます。

これは次のような場合に有効です。

* 初期設計メモ
* 既存の処理説明
* 軽量ドキュメント
* 構造がまだ安定していないAI生成ドラフト

例:

```markdown
## Steps

1. Validate the search condition.
2. Query inventory rows.
3. Return matching rows to the screen.
```

prose steps は有効な記述であり、テキストとして表示されます。

### Structured Business Flow

`## Steps` が対応するヘッダーを持つMarkdownテーブルの場合、Model Weave は Business Flow preview 用の構造化ステップとして解析します。

table-based `Steps` は、`## Flows` で接続できます。

`## Flows` が存在しない、または空の場合、table-based steps は行順で接続できます。

lane、decision、subflow、rule、screen、step間のエッジを含む視覚的なフローを作りたい場合に使います。

## 重要な考え方: Flows と Transitions の違い

`Flows` と `Transitions` は、異なるレベルの制御フローを表します。

| Section          | Meaning                                    |
| ---------------- | ------------------------------------------ |
| `## Flows`       | 現在のBusiness Flow内部にあるStep間の接続です。           |
| `## Transitions` | 現在のapp process / Business Flow から外へ出る遷移です。 |

`Flows.from` と `Flows.to` は `Steps.id` を参照します。

これらは内部ステップIDです。
外部モデルIDではありません。

`Transitions.to` は、screen、別process、または現在のprocess外の遷移先を参照できます。

## 重要な考え方: invoke / subflow

table-based step では、`invoke` 列を使って別のprocessを参照できます。

代表的な使い方:

* `kind: subflow`
* `invoke: PROC-OTHER-PROCESS`

これは、そのステップが別のapp processを呼び出す、または表していることを示します。

現在の Business Flow preview では、参照されたprocessはノードとして表示されます。
将来の実装で明示的に対応されない限り、参照先processをネスト図としてインライン展開するものではありません。

## 最小例: prose process

```markdown
---
type: app_process
id: PROC-INVENTORY-SEARCH
name: Inventory Search Process
kind: server_process
tags:
  - AppProcess
---

# Inventory Search Process

## Summary

Searches inventory records using conditions entered on the inventory search screen.

## Inputs

| id | data | source | required | notes |
|---|---|---|---|---|
| IN-CONDITION | [[DATA-INVENTORY-SEARCH-CONDITION]] | [[SCR-INVENTORY-SEARCH]] | Y | Search condition |

## Outputs

| id | data | target | notes |
|---|---|---|---|
| OUT-RESULT | [[DATA-INVENTORY-SEARCH-RESULT]] | [[SCR-INVENTORY-SEARCH]].inventory_table | Search result rows |

## Steps

1. Validate the search condition.
2. Query inventory rows.
3. Return matching rows to the screen.

## Errors

- If the condition is invalid, return a validation error message.
- If the query fails, return a common system error message.
```

## 最小例: structured Business Flow

```markdown
---
type: app_process
id: PROC-ORDER-ENTRY-FLOW
name: Order Entry Business Flow
kind: server_process
tags:
  - AppProcess
  - BusinessFlow
---

# Order Entry Business Flow

## Summary

Processes order entry submitted from the order entry screen.

## Inputs

| id | data | source | required | notes |
|---|---|---|---|---|
| IN-ORDER-DRAFT | [[DATA-ORDER-DRAFT]] | [[SCR-ORDER-ENTRY]] | Y | Order values entered by the user |

## Outputs

| id | data | target | notes |
|---|---|---|---|
| OUT-ORDER-RESULT | [[DATA-ORDER-RESULT]] | [[SCR-ORDER-COMPLETE]] | Result for completion or correction |

## Steps

| id | lane | label | kind | input | output | rule | invoke | screen | notes |
|---|---|---|---|---|---|---|---|---|---|
| start | User | Submit order | start | IN-ORDER-DRAFT |  |  |  | SCR-ORDER-ENTRY | User submits the entry form |
| validate | System | Validate order | decision | IN-ORDER-DRAFT | VALIDATION-RESULT | RULE-ORDER-VALID |  |  | Branches to valid or invalid path |
| reserve | External | Reserve inventory | subflow | IN-ORDER-DRAFT | RESERVATION-RESULT |  | PROC-INVENTORY-RESERVE |  | Child process |
| save | System | Save order | process | RESERVATION-RESULT | OUT-ORDER-RESULT |  |  |  | Persist accepted order |
| success | Screen | Show completion | end | OUT-ORDER-RESULT |  |  |  | SCR-ORDER-COMPLETE | Valid path |
| invalid | Screen | Show validation messages | end | VALIDATION-RESULT | OUT-ORDER-RESULT |  |  | SCR-ORDER-ENTRY | Invalid path |

## Flows

| from | to | condition | label | notes |
|---|---|---|---|---|
| start | validate |  | validate |  |
| validate | reserve | valid | OK | Valid order path |
| reserve | save | reserved | reserve OK | Reservation succeeded |
| save | success |  | complete |  |
| validate | invalid | invalid | NG | Invalid order path |
```

## 詳細例

```markdown
---
type: app_process
id: PROC-SAMPLE-ORDER-ENTRY-FLOW
name: Sample Order Entry Business Flow
kind: server_process
tags:
  - AppProcess
  - BusinessFlow
  - Sample
---

# Sample Order Entry Business Flow

## Summary

Demonstrates table-based app_process Steps and Flows for the Business Flow preview.

## Source Links

| path | notes |
|---|---|
| src/order/OrderEntryProcess.ts | Process implementation |
| src/order/OrderValidationService.ts | Validation service |

## Triggers

| id | kind | source | event | notes |
|---|---|---|---|---|
| TRG-SUBMIT-ORDER | screen_action | [[SCR-ORDER-ENTRY]].ACT-SUBMIT | click | User submits the order entry form |

## Inputs

| id | data | source | required | notes |
|---|---|---|---|---|
| IN-ORDER-DRAFT | [[DATA-ORDER-DRAFT]] | [[SCR-ORDER-ENTRY]] | Y | Order values entered by the user |

## Outputs

| id | data | target | notes |
|---|---|---|---|
| OUT-ORDER-RESULT | [[DATA-ORDER-RESULT]] | [[SCR-ORDER-COMPLETE]] | Result for completion or correction |

## Steps

| id | lane | label | kind | input | output | rule | invoke | screen | notes |
|---|---|---|---|---|---|---|---|---|---|
| start | User | Submit order | start | IN-ORDER-DRAFT |  |  |  | SCR-ORDER-ENTRY | User submits the entry form |
| capture | Screen | Capture entered values | input | IN-ORDER-DRAFT | ORDER-CANDIDATE |  |  | SCR-ORDER-ENTRY | Read visible form values |
| validate | System | Validate order | decision | ORDER-CANDIDATE | VALIDATION-RESULT | RULE-ORDER-VALID |  |  | Branches to valid or invalid path |
| audit |  | Record validation attempt | process | VALIDATION-RESULT | AUDIT-ENTRY |  |  |  | Lane-less step |
| reserve | External | Reserve inventory | subflow | ORDER-CANDIDATE | RESERVATION-RESULT |  | PROC-INVENTORY-RESERVE |  | Child business flow |
| save | System | Save order | process | RESERVATION-RESULT | OUT-ORDER-RESULT |  |  |  | Persist accepted order |
| success | Screen | Show completion | end | OUT-ORDER-RESULT |  |  |  | SCR-ORDER-COMPLETE | Valid path |
| invalid | Screen | Show validation messages | end | VALIDATION-RESULT | OUT-ORDER-RESULT |  |  | SCR-ORDER-ENTRY | Invalid path |

## Flows

| from | to | condition | label | notes |
|---|---|---|---|---|
| start | capture |  | submit | User action |
| capture | validate |  | validate |  |
| validate | audit |  | record | Always record validation attempt |
| validate | reserve | valid | OK | Valid order path |
| reserve | save | reserved | reserve OK | Reservation succeeded |
| save | success |  | complete |  |
| validate | invalid | invalid | NG | Invalid order path |

## Transitions

| id | event | to | condition | notes |
|---|---|---|---|---|
| TRN-ORDER-COMPLETE | success | [[SCR-ORDER-COMPLETE]] | valid | Show completion screen |
| TRN-ORDER-INVALID | validation_error | [[SCR-ORDER-ENTRY]] | invalid | Return to entry screen |

## Errors

- If the order is invalid, return validation messages to the order entry screen.
- If inventory reservation fails, keep the order unsaved and show a retryable error.
- If saving fails, rollback any local transaction and show a system error.

## Notes

- The `audit` step intentionally has a blank lane.
- The `reserve` step demonstrates `invoke` as a child process reference.
```

## Frontmatter

必須項目:

| field  | required | notes                 |
| ------ | -------- | --------------------- |
| `type` | yes      | `app_process` を指定します。 |
| `id`   | yes      | 一意のprocessモデルIDです。    |
| `name` | yes      | processの表示名です。        |

任意項目:

| field         | notes                                                                                |
| ------------- | ------------------------------------------------------------------------------------ |
| `kind`        | 処理種別です。例: `server_process`, `batch`, `api`, `job`, `event_handler`, `business_flow`。 |
| `render_mode` | 通常は `auto` です。Business Flow preview は table-based `Steps` と `Flows` に基づきます。          |
| `tags`        | Obsidian / Markdown のタグです。                                                           |

例:

```yaml
---
type: app_process
id: PROC-ORDER-ENTRY-FLOW
name: Order Entry Business Flow
kind: server_process
render_mode: auto
tags:
  - AppProcess
  - BusinessFlow
---
```

## セクション

推奨構成:

```text
# <process name>

## Summary

## Source Links

## Triggers

## Inputs

## Outputs

## Steps

## Flows

## Transitions

## Errors

## Notes
```

prose process の最小構成:

```text
# <process name>

## Summary

## Steps
```

structured Business Flow の最小構成:

```text
# <process name>

## Summary

## Steps

## Flows
```

`## Flows` は任意です。省略または空の場合、table-based steps は行順で接続できます。

### Summary

`## Summary` には、processの目的、起動文脈、業務上の意味、処理範囲を記述します。

このセクションは自由記述です。

### Source Links

`## Source Links` は任意セクションです。

processを、実装ファイル、サービスクラス、ハンドラー、バッチジョブ、SQL、ジョブ定義、ワークフロー定義、処理仕様書などへ結びつけるために使います。

期待されるヘッダー:

```markdown
| path | notes |
|---|---|
```

例:

```markdown
## Source Links

| path | notes |
|---|---|
| src/order/OrderEntryProcess.ts | Process implementation |
| src/order/OrderValidationService.ts | Validation service |
```

詳細は [共通セクション](FORMAT-common-sections.md) を参照してください。

### Triggers

`## Triggers` は、processを開始するものを記述するために使います。

期待されるヘッダー:

```markdown
| id | kind | source | event | notes |
|---|---|---|---|---|
```

列の意味:

| column   | meaning                                                                |
| -------- | ---------------------------------------------------------------------- |
| `id`     | Trigger IDです。                                                          |
| `kind`   | `screen_action`, `api`, `schedule`, `message`, `event` などのTrigger種別です。 |
| `source` | 起動元のscreen、process、system、queue、API、job、event sourceなどです。              |
| `event`  | event名、action、schedule、message type、trigger conditionなどです。             |
| `notes`  | 任意の補足説明です。                                                             |

例:

```markdown
## Triggers

| id | kind | source | event | notes |
|---|---|---|---|---|
| TRG-SEARCH-CLICK | screen_action | [[SCR-INVENTORY-SEARCH]].ACT-SEARCH | click | Search button |
```

### Inputs

`## Inputs` は、processが受け取るデータを記述するために使います。

期待されるヘッダー:

```markdown
| id | data | source | required | notes |
|---|---|---|---|---|
```

列の意味:

| column     | meaning                                      |
| ---------- | -------------------------------------------- |
| `id`       | Input IDです。                                  |
| `data`     | 入力データオブジェクト、ERエンティティ、メッセージ、ペイロード、その他モデル参照です。 |
| `source`   | 入力元screen、process、API、file、queue、systemなどです。 |
| `required` | `Y` または `N` を指定します。                          |
| `notes`    | 任意の補足説明です。                                   |

例:

```markdown
## Inputs

| id | data | source | required | notes |
|---|---|---|---|---|
| IN-CONDITION | [[DATA-INVENTORY-SEARCH-CONDITION]] | [[SCR-INVENTORY-SEARCH]] | Y | Search condition |
```

`Inputs` に `ref` 列を追加しないでください。
`data`, `source`, `notes` を使います。

### Outputs

`## Outputs` は、processが生成するデータを記述するために使います。

期待されるヘッダー:

```markdown
| id | data | target | notes |
|---|---|---|---|
```

列の意味:

| column   | meaning                                              |
| -------- | ---------------------------------------------------- |
| `id`     | Output IDです。                                         |
| `data`   | 出力データオブジェクト、ERエンティティ、メッセージ、ペイロード、ファイル、その他モデル参照です。    |
| `target` | 出力先screen、process、API、file、queue、system、storageなどです。 |
| `notes`  | 任意の補足説明です。                                           |

例:

```markdown
## Outputs

| id | data | target | notes |
|---|---|---|---|
| OUT-RESULT | [[DATA-INVENTORY-SEARCH-RESULT]] | [[SCR-INVENTORY-SEARCH]].inventory_table | Search result rows |
```

`Outputs` に `ref` 列を追加しないでください。
`data`, `target`, `notes` を使います。

### Steps

`## Steps` は、processの処理ステップを記述するために使います。

`Steps` は prose または構造化テーブルとして記述できます。

#### Prose Steps

Prose steps は、段落、箇条書き、番号付きリストとして書けます。

これは有効な記述であり、互換性があります。

例:

```markdown
## Steps

1. Validate the search condition.
2. Query inventory rows.
3. Return matching rows to the screen.
```

#### Table-based Steps

Business Flow preview には table-based steps を使います。

期待されるヘッダー:

```markdown
| id | lane | label | kind | input | output | rule | invoke | screen | notes |
|---|---|---|---|---|---|---|---|---|---|
```

列の意味:

| column   | meaning                                                                          |
| -------- | -------------------------------------------------------------------------------- |
| `id`     | Step IDです。`Flows.from` と `Flows.to` から参照されます。                                    |
| `lane`   | 任意のlane / swimlaneラベルです。                                                         |
| `label`  | stepの表示ラベルです。                                                                    |
| `kind`   | `start`, `process`, `decision`, `input`, `screen`, `subflow`, `end` などのstep種別です。 |
| `input`  | 関連するinput ID、data ID、中間データ名です。                                                   |
| `output` | 関連するoutput ID、data ID、中間データ名です。                                                  |
| `rule`   | 関連するrule IDまたはWikilinkです。                                                        |
| `invoke` | 子process / subflowとして参照するapp_process IDまたはWikilinkです。                            |
| `screen` | 関連するscreen IDまたはWikilinkです。                                                      |
| `notes`  | 任意の補足説明です。                                                                       |

注意:

* `id` は安定した単純な値にしてください。
* `Flows.from` / `Flows.to` は `Steps.id` を参照します。
* `lane` は任意です。
* 同じ空でない `lane` を持つStepは、視覚的にグループ化される場合があります。
* 空の `lane` は、自動的に “Unassigned” lane を意味するわけではありません。
* `kind` は自由記述ですが、Vault内で一貫した値を使うことを推奨します。
* `invoke` は別processを参照します。将来の実装で明示的に対応されない限り、参照先processをインライン展開しません。

### Flows

`## Flows` は、現在のBusiness Flow内のStep間エッジを定義するために使います。

期待されるヘッダー:

```markdown
| from | to | condition | label | notes |
|---|---|---|---|---|
```

列の意味:

| column      | meaning                        |
| ----------- | ------------------------------ |
| `from`      | 関連元の `Steps.id` です。            |
| `to`        | 関連先の `Steps.id` です。            |
| `condition` | 任意の条件です。通常テキストまたはモデル参照を記述できます。 |
| `label`     | 任意のエッジラベルです。                   |
| `notes`     | 任意の補足説明です。                     |

例:

```markdown
## Flows

| from | to | condition | label | notes |
|---|---|---|---|---|
| validate | reserve | [[CODE-INVENTORY-STATUS]].available | OK | Valid path |
| validate | invalid | [[CODE-INVENTORY-STATUS]].shortage | NG | Invalid path |
```

ルール:

* `from` と `to` は内部Step IDです。
* `from` や `to` に外部モデルIDを入れないでください。
* `from` または `to` が `Steps.id` と一致しない場合、診断対象として扱われます。
* `condition` にはCodeSet値参照を含めることができます。
* 通常テキストの `condition` も表示上は有効ですが、モデル参照として解析されない場合があります。

### Transitions

`## Transitions` は、現在のapp processから外へ出る遷移を定義するために使います。

期待されるヘッダー:

```markdown
| id | event | to | condition | notes |
|---|---|---|---|---|
```

列の意味:

| column      | meaning                                                     |
| ----------- | ----------------------------------------------------------- |
| `id`        | Transition IDです。                                            |
| `event`     | `success`, `error`, `validation_error`, `next` などの終了イベントです。 |
| `to`        | 遷移先screen、app process、外部制御、関連モデル参照です。                       |
| `condition` | 任意の条件です。                                                    |
| `notes`     | 任意の補足説明です。                                                  |

例:

```markdown
## Transitions

| id | event | to | condition | notes |
|---|---|---|---|---|
| TRN-SUCCESS | success | [[SCR-ORDER-COMPLETE]] | valid | Show completion screen |
| TRN-ERROR | validation_error | [[SCR-ORDER-ENTRY]] | invalid | Return to entry screen |
```

### Errors

`## Errors` は、エラー処理、例外処理、バリデーション失敗、リトライ、フォールバック動作を記述するために使います。

現在のFORMATでは、`Errors` は文章または箇条書きです。

構造化テーブルではありません。

### Notes

`## Notes` は自由記述の設計メモに使います。

追加情報を保存するために、構造化テーブルへ未対応の列を追加しないでください。
補足情報は `notes`, `## Notes`, `## Source Links` のいずれかに記述してください。

## テーブル

### Triggers table

```markdown
| id | kind | source | event | notes |
|---|---|---|---|---|
```

### Inputs table

```markdown
| id | data | source | required | notes |
|---|---|---|---|---|
```

### Outputs table

```markdown
| id | data | target | notes |
|---|---|---|---|
```

### Steps table

```markdown
| id | lane | label | kind | input | output | rule | invoke | screen | notes |
|---|---|---|---|---|---|---|---|---|---|
```

### Flows table

```markdown
| from | to | condition | label | notes |
|---|---|---|---|---|
```

### Transitions table

```markdown
| id | event | to | condition | notes |
|---|---|---|---|---|
```

### Source Links table

```markdown
| path | notes |
|---|---|
```

## Qualified Ref / Member Ref

`app_process` では、`Inputs.id` と `Outputs.id` がメンバー参照候補になります。

例:

```markdown
[[PROC-INVENTORY-SEARCH]].IN-CONDITION
[[PROC-INVENTORY-SEARCH]].OUT-RESULT
```

`Steps` と `Errors` は、現在のFORMATではメンバー候補ではありません。
これは prose compatibility を保つためです。

## 参照の扱い

参照として有用な構造化フィールドには、次のようなものがあります。

* `Triggers.source`
* `Inputs.data`
* `Inputs.source`
* `Outputs.data`
* `Outputs.target`
* `Steps.input`
* `Steps.output`
* `Steps.rule`
* `Steps.invoke`
* `Steps.screen`
* `Flows.condition`
* `Transitions.to`
* `Transitions.condition`

自由記述内にも読み取れる参照を含めることはできますが、解析では構造化フィールドを優先するべきです。

## CodeSet値の利用状況

CodeSet値の利用状況は、構造化フィールド内の明示的なQualified Value参照から検出できます。

例:

```markdown
[[CODE-INVENTORY-STATUS]].available
CODE-INVENTORY-STATUS.shortage
```

有用な記述場所:

* `Flows.condition`
* `Transitions.condition`
* `Steps.notes`
* `Errors`
* `Notes`

利用状況検出では、自由記述より構造化フィールドの方が信頼できます。

## screenとの関係

`screen` と `app_process` はよく一緒に使われます。

典型的な関係は次の通りです。

1. ユーザーが画面で操作する。
2. 画面アクションがapp processを起動する。
3. app processが画面から入力データを受け取る。
4. app processがバリデーション、ロジック、永続化などを実行する。
5. app processが出力データを画面に返す、または別画面へ遷移する。

`screen` で表すもの:

* 画面項目
* ボタン
* 表示されるUI状態
* 画面アクション
* 画面レベルのメッセージ
* UI遷移

`app_process` で表すもの:

* サーバーサイドロジック
* 処理ステップ
* 入力 / 出力データ
* バリデーションとビジネスルール
* バッチ / API / イベント処理
* Business Flow preview

`app_process` には、画面項目やUIレイアウトを定義しないでください。

## よくあるミス

### InputsやOutputsに未対応の列を追加する

`Inputs` や `Outputs` に `ref` を追加しないでください。

正しいヘッダーを使います。

```markdown
| id | data | source | required | notes |
|---|---|---|---|---|
```

```markdown
| id | data | target | notes |
|---|---|---|---|
```

### FlowsとTransitionsを混同する

`Flows` は現在のBusiness Flow内部のStep間接続です。

`Transitions` は現在のapp processから外へ出る遷移です。

画面や無関係な外部processへ直接ジャンプするために `Flows` を使わないでください。
processの出口には `Transitions` を使います。

### Flowの端点に外部モデルIDを使う

`Flows.from` と `Flows.to` は `Steps.id` を参照します。

避ける例:

```markdown
| from | to | condition | label | notes |
|---|---|---|---|---|
| SCR-ORDER-ENTRY | PROC-ORDER-COMPLETE | valid | next | wrong level |
```

推奨:

```markdown
| from | to | condition | label | notes |
|---|---|---|---|---|
| validate | success | valid | next | step-to-step flow |
```

### prose stepsがBusiness Flow図になると期待する

prose steps は有効ですが、テキストとして表示されます。

Business Flow preview を使う場合は table-based `Steps` を使ってください。

### invokeがインライン展開されると思い込む

`Steps.invoke` は別のapp processを参照します。

実装が明示的に対応していない限り、参照先processがインライン展開されるとは限りません。

### screen定義をapp_processに混ぜる

画面コントロール、項目、UIレイアウトを `app_process` に定義しないでください。

UI構造には `screen` を使い、処理ロジックには `app_process` を使います。

### Markdownテーブルとして危険な記法を使う

テーブルセル内では、生の `|` を避けます。

テーブル内では、`[[PROC-ORDER|Order Process]]` のようなWikilinkエイリアスを避けてください。
代わりに `[[PROC-ORDER]]` を使い、表示上の意味は `label` または `notes` に記述します。

## AI生成時の注意

AIで `app_process` ファイルを生成する場合は、次の点に注意してください。

* `type: app_process` を使う。
* 処理がまだ構造化されていない場合は、proseから始める。
* Business Flow preview が必要な場合のみ table-based `Steps` を使う。
* テーブルヘッダーを正確に保つ。
* 未対応の列を追加しない。
* `Inputs` や `Outputs` に `ref` を追加しない。
* `Flows.from` と `Flows.to` を `Steps.id` と一致させる。
* processの出口には `Transitions` を使う。
* 子process / subflow参照には `Steps.invoke` を使う。
* `Steps.screen` はscreen参照として使い、screen定義として扱わない。
* ビジネスルールやバリデーションルールは `rule` で参照する。
* `Inputs.data` と `Outputs.data` にはdata objectや関連モデル参照を使う。
* 補足説明は `notes` または `## Notes` に書く。
* 実装ファイル、ハンドラー、バッチジョブ、SQL、処理仕様には `## Source Links` を使う。
* screen定義は `screen` ファイルに書く。

AIがソースコードや設計メモからapp processを作成した場合は、次を確認してください。

* trigger source
* input / output data
* step IDs
* flow endpoints
* transition destinations
* rule references
* screen references
* invoked process references
* Source Links

## 関連サンプル

* [Inventory search process](../../../samples/app_process/PROC-INVENTORY-SEARCH.md)
* [Sample order entry business flow](../../../samples/app_process/PROC-SAMPLE-ORDER-ENTRY-FLOW.md)
* [App Process samples index](../../../samples/app_process/README.md)

## 関連フォーマット

* [screen](FORMAT-screen.md)
* [data_object](FORMAT-data_object.md)
* [rule](FORMAT-rule.md)
* [codeset](FORMAT-codeset.md)
* [message](FORMAT-message.md)
* [共通セクション](FORMAT-common-sections.md)
