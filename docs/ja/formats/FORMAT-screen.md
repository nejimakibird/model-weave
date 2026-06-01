# FORMAT-screen

English Version: [English](../../formats/FORMAT-screen.md)

## 何に使うフォーマットか

`screen` は、1つのUI画面またはビューを表すフォーマットです。

次のような内容を記述するときに使います。

* 画面の目的
* 表示される項目
* ボタン / アクション
* UIメッセージ
* 画面レベルの条件
* 他画面への遷移
* 画面アクションから呼び出される app process
* 画面内の軽量なローカル処理
* UI実装ファイルへの Source Links

`screen` は、ユーザーが見て操作するものを表します。

画面の背後にある処理ロジック、バリデーション、業務ロジック、永続化、バッチ処理、API処理、ジョブフロー、内部処理フロー、Business Flow preview などは `app_process` を使います。

## 重要な考え方: screen と app_process の違い

`screen` と `app_process` はよく一緒に使われますが、モデリングする対象が異なります。

`screen` は、UIの振る舞いを記述するときに使います。

* 画面に表示される項目
* 入力値
* ボタンやアクション
* UIメッセージ
* UI状態
* ナビゲーション / 遷移
* アクションが呼び出す app process
* クリア、初期表示、入力チェック、表示制御、メッセージ制御などの軽量な画面内処理

`app_process` は、処理の振る舞いを記述するときに使います。

* process inputs
* process outputs
* validation logic
* business rules
* internal processing steps
* step-to-step flows
* server-side / batch / API logic
* job flow または internal process flow
* Business Flow preview

画面は app process を呼び出せます。
app process は、画面へデータを返したり、別画面へ遷移したりできます。

完全なサーバーサイド処理フローを `screen` に書かないでください。
UIレイアウト項目を `app_process` に書かないでください。

V0.8 の `screen` は `Flows` を持ちません。
ステップ間の明示的な流れや分岐が必要な場合は `app_process` として定義し、`Actions.invoke` から参照してください。

## 最小例

```markdown
---
type: screen
id: SCR-INVENTORY-SEARCH
name: Inventory Search Screen
kind: search
tags:
  - Screen
---

# Inventory Search Screen

## Summary

Screen for searching inventory by item, warehouse, and status.

## Fields

| id | label | kind | layout | data_type | required | ref | condition | rule | notes |
|---|---|---|---|---|---|---|---|---|---|
| item_id | Item ID | input | search | string | N | [[ENT-ITEM]].item_id |  |  | Search condition |
| warehouse_id | Warehouse ID | input | search | string | N | [[ENT-WAREHOUSE]].warehouse_id |  |  | Search condition |
| status | Status | select | search | string | N | [[CODE-INVENTORY-STATUS]] |  |  | Inventory status |

## Actions

| id | label | kind | target | event | condition | invoke | transition | rule | notes |
|---|---|---|---|---|---|---|---|---|---|
| ACT-SEARCH | Search | submit | search_button | click |  | [[PROC-INVENTORY-SEARCH]] |  |  | Run inventory search |

## Messages

| id | text | severity | timing | condition | notes |
|---|---|---|---|---|---|
| MSG-NO-RESULT | No inventory rows found. | info | search_result |  | Search completed with no rows |
```

## 詳細例

```markdown
---
type: screen
id: SCR-ORDER-ENTRY
name: Order Entry Screen
kind: entry
tags:
  - Screen
  - Order
---

# Order Entry Screen

## Summary

Screen for entering and submitting a new order.

## Source Links

| path | notes |
|---|---|
| src/screens/OrderEntryScreen.tsx | UI implementation |
| src/screens/order-entry.css | Screen style |

## Fields

| id | label | kind | layout | data_type | required | ref | condition | rule | notes |
|---|---|---|---|---|---|---|---|---|---|
| customer_id | Customer ID | input | main | string | Y | [[ENT-CUSTOMER]].customer_id |  |  | Required customer |
| order_date | Order Date | input | main | date | Y | [[ENT-ORDER]].order_date |  |  | Default today |
| item_id | Item ID | input | main | string | Y | [[ENT-ITEM]].item_id |  |  | Order item |
| quantity | Quantity | input | main | number | Y | [[ENT-ORDER-LINE]].quantity |  | [[RULE-ORDER-QUANTITY]] | Must be greater than zero |
| submit_button | Submit | button | footer |  |  |  | [[CODE-SWITCH-STATE]].ON |  | Enabled when submission is allowed |

## Actions

| id | label | kind | target | event | condition | invoke | transition | rule | notes |
|---|---|---|---|---|---|---|---|---|---|
| ACT-SUBMIT | Submit | submit | submit_button | click | [[CODE-SWITCH-STATE]].ON | [[PROC-ORDER-ENTRY-FLOW]] |  |  | Submit order |
| ACT-CLEAR | Clear | clear | clear_button | click |  |  |  |  | Clear entered values |
| ACT-BACK | Back | navigate | back_button | click |  |  | [[SCR-MENU]] |  | Return to menu |

## Messages

| id | text | severity | timing | condition | notes |
|---|---|---|---|---|---|
| MSG-VALIDATION-ERROR | Please correct the highlighted fields. | warning | validation_error |  | Returned from app process |
| MSG-SAVED | Order has been saved. | info | saved |  | Completion message |
| MSG-SUBMIT-DISABLED | Submit is currently disabled. | warning | input_change | [[CODE-SWITCH-STATE]].OFF | Displayed when the submit action is not available |

## Transitions

| id | event | to | condition | notes |
|---|---|---|---|---|
| TRN-COMPLETE | success | [[SCR-ORDER-COMPLETE]] |  | Go to completion screen |
| TRN-BACK | back | [[SCR-MENU]] |  | Return to menu |

## Local Processes

### PROC-CLEAR

#### Summary

Clears screen-local input values.

#### Inputs

| id | data | source | required | notes |
|---|---|---|---|---|
| INP-CURRENT-DRAFT | [[DATA-ORDER-DRAFT]] | screen | N | Current screen input values |

#### Steps

| id | label | kind | condition | input | output | rule | invoke | screen | notes |
|---|---|---|---|---|---|---|---|---|---|
| STP-CLEAR-FIELDS | Clear fields | ui_control |  | [[DATA-ORDER-DRAFT]] | [[DATA-ORDER-DRAFT]] |  |  |  | Reset input values |
| STP-DISABLE-SUBMIT | Disable submit | ui_control | [[CODE-SWITCH-STATE]].OFF |  |  |  |  |  | Disable submit button |

#### Outputs

| id | data | target | notes |
|---|---|---|---|
| OUT-CLEARED-DRAFT | [[DATA-ORDER-DRAFT]] | screen | Cleared input values |

#### Errors

| id | condition | message | notes |
|---|---|---|---|
| ERR-CLEAR-FAILED |  | MSG-VALIDATION-ERROR | Shown if local clear processing fails |

## Notes

- Server-side validation is modeled in `app_process`.
- This screen defines visible fields, user actions, messages, and lightweight screen-local behavior.
```

## Frontmatter

必須項目:

| field  | required | notes             |
| ------ | -------- | ----------------- |
| `type` | yes      | `screen` を指定します。  |
| `id`   | yes      | 一意のscreenモデルIDです。 |
| `name` | yes      | screenの表示名です。     |

任意項目:

| field         | notes                                                            |
| ------------- | ---------------------------------------------------------------- |
| `kind`        | 画面種別です。例: `search`, `entry`, `detail`, `list`, `menu`, `dialog`。 |
| `render_mode` | 任意です。指定できる値は `custom` です。省略時は設定画面のデフォルトに従います。                 |
| `tags`        | Obsidian / Markdown のタグです。                                       |

例:

```yaml
---
type: screen
id: SCR-INVENTORY-SEARCH
name: Inventory Search Screen
kind: search
tags:
  - Screen
---
```

## セクション

推奨構成:

```text
# <screen name>

## Summary

## Source Links

## Fields

## Actions

## Messages

## Transitions

## Local Processes

## Notes
```

### Summary

`## Summary` には、画面の目的、利用者ロール、主な操作、利用文脈などを記述します。

このセクションは自由記述です。

Summary本文は、CodeSet値の利用状況解析の対象にはなりません。

### Source Links

`## Source Links` は任意セクションです。

screenモデルを、UI実装ファイル、コンポーネントファイル、テンプレート、スタイルシート、ルート定義、テストファイルなどへ結びつけるために使います。

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
| src/screens/InventorySearchScreen.tsx | UI implementation |
| tests/screens/InventorySearchScreen.test.ts | UI tests |
```

詳細は [共通セクション](FORMAT-common-sections.md) を参照してください。

### Fields

`## Fields` は、画面に表示される項目、入力値、出力値、表の列、hidden値、ボタン、コントロール、表示専用値などを定義するために使います。

期待されるヘッダー:

```markdown
| id | label | kind | layout | data_type | required | ref | condition | rule | notes |
|---|---|---|---|---|---|---|---|---|---|
```

列の意味:

| column      | meaning                                                                  |
| ----------- | ------------------------------------------------------------------------ |
| `id`        | Field / control IDです。                                                    |
| `label`     | 表示ラベルです。                                                                 |
| `kind`      | 項目・コントロール種別です。例: `input`, `label`, `select`, `button`, `grid`, `hidden`。 |
| `layout`    | 配置エリアまたはグループです。例: `header`, `main`, `footer`, `dialog`。                  |
| `data_type` | データ型です。例: `string`, `number`, `date`, `boolean`。コントロールの場合は空でも構いません。      |
| `required`  | `Y`, `N`, または空を指定します。                                                    |
| `ref`       | data object項目、ER項目、CodeSetなどの関連モデル参照です。                                  |
| `condition` | 表示、活性、入力可否、制御条件などの任意条件です。                                                |
| `rule`      | 関連するバリデーションルールまたは業務ルールです。                                                |
| `notes`     | 任意の補足説明です。CodeSet値の利用状況解析対象にはなりません。                                      |

例:

```markdown
## Fields

| id | label | kind | layout | data_type | required | ref | condition | rule | notes |
|---|---|---|---|---|---|---|---|---|---|
| item_id | Item ID | input | search | string | N | [[ENT-ITEM]].item_id |  |  | Search condition |
| status | Status | select | search | string | N | [[CODE-INVENTORY-STATUS]] |  |  | CodeSet |
| order_button | Order | button | result |  |  |  | [[CODE-INVENTORY-STATUS]].available |  | Enabled only when inventory is available |
```

注意:

* `ref` には、data object項目、ER項目、CodeSet、CodeSet値、関連モデル要素などを書けます。
* `condition` には、表示条件、活性条件、入力条件、バリデーション条件、状態条件などを書きます。
* `rule` には、バリデーションルールまたは業務ルールを書きます。
* `notes` は人間向けの補足説明に使います。

### Actions

`## Actions` は、画面で利用できるユーザー操作を定義するために使います。

期待されるヘッダー:

```markdown
| id | label | kind | target | event | condition | invoke | transition | rule | notes |
|---|---|---|---|---|---|---|---|---|---|
```

列の意味:

| column       | meaning                                                                           |
| ------------ | --------------------------------------------------------------------------------- |
| `id`         | Action IDです。                                                                      |
| `label`      | 表示ラベルです。                                                                          |
| `kind`       | Action種別です。例: `submit`, `search`, `clear`, `navigate`, `open`, `close`, `delete`。 |
| `target`     | Actionの対象または発生元となる画面内UI部品・コントロールIDです。外部モデル参照ではありません。                              |
| `event`      | UIイベントです。例: `click`, `load`, `change`, `submit`, `select`。                        |
| `condition`  | 表示、活性、実行条件などです。                                                                   |
| `invoke`     | このActionが呼び出す `app_process` または呼び出し可能なprocess参照です。                                |
| `transition` | Actionが直接遷移する先のscreen参照です。                                                        |
| `rule`       | 関連するrule参照です。                                                                     |
| `notes`      | 任意の補足説明です。                                                                        |

例:

```markdown
## Actions

| id | label | kind | target | event | condition | invoke | transition | rule | notes |
|---|---|---|---|---|---|---|---|---|---|
| ACT-SEARCH | Search | search | search_button | click |  | [[PROC-INVENTORY-SEARCH]] |  |  | Run inventory search |
| ACT-ORDER | Order | submit | order_button | click | [[CODE-INVENTORY-STATUS]].available | [[PROC-CREATE-ORDER]] | [[SCR-ORDER-ENTRY]] |  | Create an order when inventory is available |
| ACT-CLEAR | Clear | clear | clear_button | click |  |  |  |  | Clear conditions |
```

注意:

* Actionがアプリケーション処理を呼び出す場合は `invoke` を使います。
* Actionが別画面へ直接遷移する場合は `transition` を使います。
* `target` は画面内のUI部品・コントロールIDです。
* 完全な処理ステップをscreenに定義しないでください。処理は `app_process` に書きます。

### Messages

`## Messages` は、画面レベルのメッセージを定義するために使います。

期待されるヘッダー:

```markdown
| id | text | severity | timing | condition | notes |
|---|---|---|---|---|---|
```

列の意味:

| column      | meaning                                                                   |
| ----------- | ------------------------------------------------------------------------- |
| `id`        | Message IDです。                                                             |
| `text`      | メッセージ文言、またはmessageモデル参照です。                                                |
| `severity`  | 重要度です。例: `info`, `warning`, `error`, `success`。                           |
| `timing`    | 表示タイミングです。例: `load`, `input_change`, `search_result`, `validation_error`。 |
| `condition` | メッセージが表示される条件です。                                                          |
| `notes`     | 任意の補足説明です。                                                                |

例:

```markdown
## Messages

| id | text | severity | timing | condition | notes |
|---|---|---|---|---|---|
| MSG-NO-RESULT | No inventory rows found. | info | search_result |  | Search completed with no rows |
| MSG-SHORTAGE | Inventory is short. | warning | search_result | [[CODE-INVENTORY-STATUS]].shortage | Shown when inventory is short |
| MSG-VALIDATION | Please correct the highlighted fields. | warning | validation_error |  | Returned from process |
```

### Transitions

`## Transitions` は、`Actions.transition` とは別に画面遷移を定義したい場合に使います。

期待されるヘッダー:

```markdown
| id | event | to | condition | notes |
|---|---|---|---|---|
```

列の意味:

| column      | meaning               |
| ----------- | --------------------- |
| `id`        | Transition IDです。      |
| `event`     | 遷移を発生させるイベントまたは結果です。  |
| `to`        | 遷移先screen、または外部遷移先です。 |
| `condition` | 任意の条件です。              |
| `notes`     | 任意の補足説明です。            |

例:

```markdown
## Transitions

| id | event | to | condition | notes |
|---|---|---|---|---|
| TRN-DETAIL | open_detail | [[SCR-INVENTORY-DETAIL]] | row_selected | Open detail screen |
| TRN-BACK | back | [[SCR-MENU]] |  | Return to menu |
```

注意:

* `Transitions` はUIナビゲーションを表します。
* 単純なAction起点の画面遷移は `Actions.transition` に直接書けます。
* processからの出口は `app_process.Transitions` に記述します。
* 内部処理フローのedgeをscreen `Transitions` に書かないでください。

### Local Processes

`## Local Processes` は任意セクションです。

クリア、初期表示、ローカル入力チェック、表示制御、ボタン活性制御、メッセージ制御など、画面内に閉じた軽量な処理を書くために使います。

Local Processes は画面内に閉じたものにしてください。

明示的なステップ間フロー、複雑な分岐、永続化、API処理、バッチ処理、再利用可能な業務ロジックが必要な場合は、`app_process` として定義し、`Actions.invoke` から参照してください。

V0.8 の Screen Local Processes は `Flows` を持ちません。

推奨スケルトン:

```markdown
## Local Processes

### PROC-CLEAR

#### Summary

#### Inputs

| id | data | source | required | notes |
|---|---|---|---|---|
|  |  |  |  |  |

#### Steps

| id | label | kind | condition | input | output | rule | invoke | screen | notes |
|---|---|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |  |  |

#### Outputs

| id | data | target | notes |
|---|---|---|---|
|  |  |  |  |

#### Errors

| id | condition | message | notes |
|---|---|---|---|
|  |  |  |  |
```

サブセクション:

| subsection | purpose                                          |
| ---------- | ------------------------------------------------ |
| `Summary`  | Local Processの自由記述概要です。CodeSet値の利用状況解析対象にはなりません。 |
| `Inputs`   | Local Processが使う画面内入力データです。                      |
| `Steps`    | 軽量な画面内ステップです。`condition` には構造化参照を書けます。           |
| `Outputs`  | 画面内出力データまたは対象UI要素です。                             |
| `Errors`   | 画面内エラーまたはメッセージ条件です。                              |

例:

```markdown
### PROC-CLEAR

#### Summary

Clear local input values and reset button state.

#### Steps

| id | label | kind | condition | input | output | rule | invoke | screen | notes |
|---|---|---|---|---|---|---|---|---|---|
| STP-CLEAR-FIELDS | Clear fields | ui_control |  | [[DATA-ORDER-DRAFT]] | [[DATA-ORDER-DRAFT]] |  |  |  | Reset input values |
| STP-DISABLE-SUBMIT | Disable submit | ui_control | [[CODE-SWITCH-STATE]].OFF |  |  |  |  |  | Disable submit button |

#### Errors

| id | condition | message | notes |
|---|---|---|---|
| ERR-CLEAR-DISABLED | [[CODE-SWITCH-STATE]].OFF | MSG-SUBMIT-DISABLED | Shown when clear cannot run |
```

### Notes

`## Notes` は自由記述の設計メモに使います。

追加情報を保存するために、構造化テーブルへ未対応の列を追加しないでください。
補足情報は `notes`, `## Notes`, `## Source Links` のいずれかに記述してください。

Notes本文は、CodeSet値の利用状況解析の対象にはなりません。

## テーブル

### Fields table

```markdown
| id | label | kind | layout | data_type | required | ref | condition | rule | notes |
|---|---|---|---|---|---|---|---|---|---|
```

### Actions table

```markdown
| id | label | kind | target | event | condition | invoke | transition | rule | notes |
|---|---|---|---|---|---|---|---|---|---|
```

### Messages table

```markdown
| id | text | severity | timing | condition | notes |
|---|---|---|---|---|---|
```

### Transitions table

```markdown
| id | event | to | condition | notes |
|---|---|---|---|---|
```

### Local Process Inputs table

```markdown
| id | data | source | required | notes |
|---|---|---|---|---|
```

### Local Process Steps table

```markdown
| id | label | kind | condition | input | output | rule | invoke | screen | notes |
|---|---|---|---|---|---|---|---|---|---|
```

### Local Process Outputs table

```markdown
| id | data | target | notes |
|---|---|---|---|
```

### Local Process Errors table

```markdown
| id | condition | message | notes |
|---|---|---|---|
```

### Source Links table

```markdown
| path | notes |
|---|---|
```

## Qualified Ref / Member Ref

`screen` では、構造化IDをメンバー参照として使えます。

例:

```markdown
[[SCR-INVENTORY-SEARCH]].item_id
[[SCR-INVENTORY-SEARCH]].ACT-SEARCH
[[SCR-INVENTORY-SEARCH]].MSG-NO-RESULT
```

有用なメンバー候補:

* `Fields.id`
* `Actions.id`
* `Messages.id`
* `Transitions.id`
* `Local Processes` のprocess ID
* `Local Processes > Steps.id`
* `Local Processes > Errors.id`

他のモデルから画面項目、アクション、メッセージ、遷移、Local Process要素を参照する場合は、安定したIDを使ってください。

## 参照の扱い

参照として有用な構造化フィールドには、次のようなものがあります。

* `Fields.ref`
* `Fields.condition`
* `Fields.rule`
* `Actions.condition`
* `Actions.invoke`
* `Actions.transition`
* `Actions.rule`
* `Messages.text`
* `Messages.condition`
* `Transitions.to`
* `Transitions.condition`
* `Local Processes > Inputs.data`
* `Local Processes > Steps.condition`
* `Local Processes > Steps.input`
* `Local Processes > Steps.output`
* `Local Processes > Steps.rule`
* `Local Processes > Steps.invoke`
* `Local Processes > Steps.screen`
* `Local Processes > Outputs.data`
* `Local Processes > Outputs.target`
* `Local Processes > Errors.condition`
* `Local Processes > Errors.message`

`Actions.target` は画面内のUI部品・コントロールIDであり、外部モデル参照としては扱いません。

自由記述内にも読み取れる参照を含めることはできますが、解析では構造化フィールドのみを使います。

## CodeSet値の利用状況

CodeSet値の利用状況は、構造化フィールド内の明示的なQualified Value参照から検出できます。

例:

```markdown
[[CODE-SWITCH-STATE]].ON
[[04_codeset/CODE-INVENTORY-STATUS]].available
CODE-INVENTORY-STATUS.available
```

これらは以下を意味します。

* codeset: `CODE-INVENTORY-STATUS`
* value: `available`

有用な記述場所:

* `Fields.condition`
* `Actions.condition`
* `Messages.condition`
* `Transitions.condition`
* `Local Processes > Steps.condition`
* `Local Processes > Errors.condition`

Model Weave は、次のものからCodeSet値の利用状況を推定しません。

* `available` のようなコード値単体
* `良品利用可` のような表示ラベル単体
* `Summary`
* `Notes`
* 任意の自然文
* `Actions.target`

CodeSetや状態の利用状況を追跡可能にするには、構造化された `condition` 列に明示的な参照を書いてください。

## app_processとの関係

典型的なUIからprocessへの関係は次の通りです。

1. ユーザーが画面で操作する。
2. `Actions.invoke` が `app_process` を参照する。
3. app process が画面から入力データを受け取る。
4. app process が出力データを返す、または別画面へ遷移する。

`screen` で表すもの:

* 表示される項目
* UIアクション
* UIメッセージ
* UI遷移
* 画面内条件
* 軽量な画面内処理

`app_process` で表すもの:

* process inputs / outputs
* validation / business logic
* internal processing steps
* step-to-step flows
* Business Flow preview
* server-side / API / batch logic
* job flow または internal process flow

## よくあるミス

### screenに完全な処理フローを書いてしまう

完全なサーバーサイド処理フローやジョブフローを `screen` に書かないでください。

処理ステップ、フロー、ビジネスロジックは `app_process` に書きます。

### screenにFlowsを追加してしまう

V0.8 の `screen` に `Flows` を追加しないでください。

ステップ間のedgeが必要な場合は `app_process.Flows` を使います。

### UI項目をapp_processに定義してしまう

UIレイアウト項目を `app_process` に定義しないでください。

表示項目やUIデータバインディングには `screen.Fields` を使います。

### 未対応の列を追加する

FORMATが明示的に定義していない限り、`description`, `source`, `target` などの列を追加しないでください。

補足情報は `notes`, `## Notes`, `## Source Links` に記述してください。

### Actions.targetをモデル参照として扱ってしまう

`Actions.target` は画面内のUI部品・コントロールIDです。

外部モデル参照には `Actions.invoke`, `Actions.transition`, `Actions.rule` を使います。

### Notesを構造化された利用状況として扱ってしまう

CodeSetや状態の利用状況を追跡するために、`Notes` や自由記述に依存しないでください。

構造化された `condition` 列を使ってください。

### screen transitions と process transitions を混同する

Screen `Transitions` はUIナビゲーションを表します。

App process `Transitions` はprocessからの出口を表します。

内部Business FlowのStep間接続をscreen `Transitions` に書かないでください。
その場合は `app_process.Flows` を使います。

### Markdownテーブルとして危険な記法を使う

テーブルセル内では、生の `|` を避けます。

テーブル内では、`[[SCR-ORDER|Order Screen]]` のようなWikilinkエイリアスを避けてください。
代わりに `[[SCR-ORDER]]` を使い、表示上の意味は `label` または `notes` に記述します。

## AI生成時の注意

AIで `screen` ファイルを生成する場合は、次の点に注意してください。

* `type: screen` を使う。
* 1ファイルで1つのscreenまたはviewを定義する。
* テーブルヘッダーを正確に保つ。
* 未対応の列を追加しない。
* 表示項目やUIバインディングには `Fields` を使う。
* 項目の表示、活性、入力、制御条件には `Fields.condition` を使う。
* ユーザー操作には `Actions` を使う。
* `Actions.invoke` で `app_process` を参照する。
* 直接の画面遷移には `Actions.transition` を使う。
* Actionの実行条件には `Actions.condition` を使う。
* 画面レベルのメッセージには `Messages` を使う。
* メッセージの表示条件には `Messages.condition` を使う。
* `Actions.transition` と分けた方がよいUIナビゲーションには `Transitions` を使う。
* 画面内の軽量な処理に限り `Local Processes` を使う。
* `screen` に `Flows` を追加しない。
* サーバーサイドロジックや処理フローは `app_process` に書く。
* Fields, Actions, Messages, Transitions, Local Process要素には安定したIDを使う。
* 補足説明は `notes` または `## Notes` に書く。
* UI実装ファイル、テンプレート、スタイル、ルート、テストには `## Source Links` を使う。

AIがUIコードやスクリーンショットからscreenモデルを作成した場合は、次を確認してください。

* field IDs
* field labels
* field kinds
* layouts
* data bindings
* action IDs
* action targets
* action events
* process references
* message conditions
* transition destinations
* Local Processes scope
* Source Links

## 関連サンプル

* [Inventory search screen](../../../samples/screen/SCR-INVENTORY-SEARCH.md)
* [Screen samples index](../../../samples/screen/README.md)

## 関連フォーマット

* [app_process](FORMAT-app_process.md)
* [data_object](FORMAT-data_object.md)
* [message](FORMAT-message.md)
* [codeset](FORMAT-codeset.md)
* [共通セクション](FORMAT-common-sections.md)
