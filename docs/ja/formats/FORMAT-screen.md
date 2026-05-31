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
* UI実装ファイルへの Source Links

`screen` は、ユーザーが見て操作するものを表します。

画面の背後にある処理ロジック、バリデーション、業務ロジック、永続化、バッチ処理、API処理、Business Flow preview などは `app_process` を使います。

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

`app_process` は、処理の振る舞いを記述するときに使います。

* process inputs
* process outputs
* validation logic
* business rules
* internal processing steps
* server-side / batch / API logic
* Business Flow preview

画面は app process を呼び出せます。
app process は、画面へデータを返したり、別画面へ遷移したりできます。

サーバーサイドの処理ステップを `screen` に書かないでください。
UIレイアウト項目を `app_process` に書かないでください。

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

| id | label | data | ref | required | condition | notes |
|---|---|---|---|---|---|---|
| item_id | Item ID | [[DATA-INVENTORY-SEARCH-CONDITION]].item_id | [[ENT-ITEM]].item_id | N |  | Search condition |
| warehouse_id | Warehouse ID | [[DATA-INVENTORY-SEARCH-CONDITION]].warehouse_id | [[ENT-WAREHOUSE]].warehouse_id | N |  | Search condition |

## Actions

| id | label | kind | process | condition | notes |
|---|---|---|---|---|---|
| ACT-SEARCH | Search | submit | [[PROC-INVENTORY-SEARCH]] |  | Run inventory search |

## Messages

| id | message | condition | severity | notes |
|---|---|---|---|---|
| MSG-NO-RESULT | No inventory rows found. | no_result | info | Search completed with no rows |
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

| id | label | data | ref | required | condition | notes |
|---|---|---|---|---|---|---|
| customer_id | Customer ID | [[DATA-ORDER-DRAFT]].customer_id | [[ENT-CUSTOMER]].customer_id | Y |  | Required customer |
| order_date | Order Date | [[DATA-ORDER-DRAFT]].order_date | [[ENT-ORDER]].order_date | Y |  | Default today |
| item_id | Item ID | [[DATA-ORDER-DRAFT]].item_id | [[ENT-ITEM]].item_id | Y |  | Order item |
| quantity | Quantity | [[DATA-ORDER-DRAFT]].quantity | [[ENT-ORDER-LINE]].quantity | Y |  | Must be greater than zero |

## Actions

| id | label | kind | process | condition | notes |
|---|---|---|---|---|---|
| ACT-SUBMIT | Submit | submit | [[PROC-ORDER-ENTRY-FLOW]] |  | Submit order |
| ACT-CLEAR | Clear | clear |  |  | Clear entered values |
| ACT-BACK | Back | navigate |  |  | Return to menu |

## Messages

| id | message | condition | severity | notes |
|---|---|---|---|---|
| MSG-VALIDATION-ERROR | Please correct the highlighted fields. | validation_error | warning | Returned from app process |
| MSG-SAVED | Order has been saved. | saved | info | Completion message |

## Transitions

| id | action | to | condition | notes |
|---|---|---|---|---|
| TRN-COMPLETE | ACT-SUBMIT | [[SCR-ORDER-COMPLETE]] | success | Go to completion screen |
| TRN-BACK | ACT-BACK | [[SCR-MENU]] |  | Return to menu |

## Notes

- Server-side validation is modeled in `app_process`.
- This screen defines visible fields and user actions.
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
| `render_mode` | 通常は `auto` です。                                                   |
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

## Notes
```

### Summary

`## Summary` には、画面の目的、利用者ロール、主な操作、利用文脈などを記述します。

このセクションは自由記述です。

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

`## Fields` は、画面に表示される項目、入力値、出力値、表の列、hidden値、表示専用値などを定義するために使います。

期待されるヘッダー:

```markdown
| id | label | data | ref | required | condition | notes |
|---|---|---|---|---|---|---|
```

列の意味:

| column      | meaning                         |
| ----------- | ------------------------------- |
| `id`        | Field IDです。                     |
| `label`     | 表示ラベルです。                        |
| `data`      | 関連するdata_object項目、または論理データ参照です。 |
| `ref`       | ER項目、CodeSet、その他関連モデル要素への参照です。  |
| `required`  | `Y` または `N` を指定します。             |
| `condition` | 表示、活性、バリデーション、状態などの任意条件です。      |
| `notes`     | 任意の補足説明です。                      |

例:

```markdown
## Fields

| id | label | data | ref | required | condition | notes |
|---|---|---|---|---|---|---|
| item_id | Item ID | [[DATA-INVENTORY-SEARCH-CONDITION]].item_id | [[ENT-ITEM]].item_id | N |  | Search condition |
| status | Status | [[DATA-INVENTORY-SEARCH-CONDITION]].status | [[CODE-INVENTORY-STATUS]] | N |  | CodeSet |
```

注意:

* `data` には、可能な場合は画面データ構造への参照を書きます。
* `ref` には、ER項目、CodeSet値、関連モデル要素などを書けます。
* `condition` には、表示条件、活性条件、バリデーション条件、状態条件などを書きます。
* 構造化列に入らない詳細は `notes` に書きます。

### Actions

`## Actions` は、画面で利用できるユーザー操作を定義するために使います。

期待されるヘッダー:

```markdown
| id | label | kind | process | condition | notes |
|---|---|---|---|---|---|
```

列の意味:

| column      | meaning                                                                           |
| ----------- | --------------------------------------------------------------------------------- |
| `id`        | Action IDです。                                                                      |
| `label`     | 表示ラベルです。                                                                          |
| `kind`      | `submit`, `search`, `clear`, `navigate`, `open`, `close`, `delete` などのAction種別です。 |
| `process`   | このActionが呼び出す `app_process` またはprocess相当の参照です。                                    |
| `condition` | 表示、活性、実行条件などです。                                                                   |
| `notes`     | 任意の補足説明です。                                                                        |

例:

```markdown
## Actions

| id | label | kind | process | condition | notes |
|---|---|---|---|---|---|
| ACT-SEARCH | Search | search | [[PROC-INVENTORY-SEARCH]] |  | Run inventory search |
| ACT-CLEAR | Clear | clear |  |  | Clear conditions |
```

注意:

* Actionがアプリケーション処理を呼び出す場合は `process` を使います。
* processの処理ステップをscreenに定義しないでください。処理は `app_process` に書きます。

### Messages

`## Messages` は、画面レベルのメッセージを定義するために使います。

期待されるヘッダー:

```markdown
| id | message | condition | severity | notes |
|---|---|---|---|---|
```

列の意味:

| column      | meaning                                         |
| ----------- | ----------------------------------------------- |
| `id`        | Message IDです。                                   |
| `message`   | メッセージ文言、またはmessageモデル参照です。                      |
| `condition` | メッセージが表示される条件です。                                |
| `severity`  | `info`, `warning`, `error`, `success` などの重要度です。 |
| `notes`     | 任意の補足説明です。                                      |

例:

```markdown
## Messages

| id | message | condition | severity | notes |
|---|---|---|---|---|
| MSG-NO-RESULT | No inventory rows found. | no_result | info | Search completed with no rows |
| MSG-VALIDATION | Please correct the highlighted fields. | validation_error | warning | Returned from process |
```

### Transitions

`## Transitions` は、画面遷移を定義するために使います。

期待されるヘッダー:

```markdown
| id | action | to | condition | notes |
|---|---|---|---|---|
```

列の意味:

| column      | meaning                 |
| ----------- | ----------------------- |
| `id`        | Transition IDです。        |
| `action`    | 関連するscreen action IDです。 |
| `to`        | 遷移先screen、または外部遷移先です。   |
| `condition` | 任意の条件です。                |
| `notes`     | 任意の補足説明です。              |

例:

```markdown
## Transitions

| id | action | to | condition | notes |
|---|---|---|---|---|
| TRN-DETAIL | ACT-OPEN-DETAIL | [[SCR-INVENTORY-DETAIL]] | row_selected | Open detail screen |
| TRN-BACK | ACT-BACK | [[SCR-MENU]] |  | Return to menu |
```

注意:

* `Transitions` はUIナビゲーションを表します。
* processからの出口は `app_process.Transitions` に記述します。

### Notes

`## Notes` は自由記述の設計メモに使います。

追加情報を保存するために、構造化テーブルへ未対応の列を追加しないでください。
補足情報は `notes`, `## Notes`, `## Source Links` のいずれかに記述してください。

## テーブル

### Fields table

```markdown
| id | label | data | ref | required | condition | notes |
|---|---|---|---|---|---|---|
```

### Actions table

```markdown
| id | label | kind | process | condition | notes |
|---|---|---|---|---|---|
```

### Messages table

```markdown
| id | message | condition | severity | notes |
|---|---|---|---|---|
```

### Transitions table

```markdown
| id | action | to | condition | notes |
|---|---|---|---|---|
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

他のモデルから画面項目、アクション、メッセージ、遷移を参照する場合は、安定したIDを使ってください。

## 参照の扱い

参照として有用な構造化フィールドには、次のようなものがあります。

* `Fields.data`
* `Fields.ref`
* `Fields.condition`
* `Actions.process`
* `Actions.condition`
* `Messages.message`
* `Messages.condition`
* `Transitions.to`
* `Transitions.condition`

自由記述内にも読み取れる参照を含めることはできますが、解析では構造化フィールドを優先するべきです。

## CodeSet値の利用状況

CodeSet値の利用状況は、構造化フィールド内の明示的なQualified Value参照から検出できます。

例:

```markdown
[[CODE-SWITCH-STATE]].ON
CODE-INVENTORY-STATUS.available
```

有用な記述場所:

* `Fields.condition`
* `Actions.condition`
* `Messages.condition`
* `Transitions.condition`
* `Fields.ref`
* `Notes`

利用状況検出では、自由記述より構造化フィールドの方が信頼できます。

## app_processとの関係

典型的なUIからprocessへの関係は次の通りです。

1. ユーザーが画面で操作する。
2. `Actions.process` が `app_process` を参照する。
3. app process が画面から入力データを受け取る。
4. app process が出力データを返す、または別画面へ遷移する。

`screen` で表すもの:

* 表示される項目
* UIアクション
* UIメッセージ
* UI遷移
* ユーザーから見える条件

`app_process` で表すもの:

* process inputs / outputs
* validation / business logic
* internal processing steps
* Business Flow preview
* server-side / API / batch logic

## よくあるミス

### screenに処理ステップを書いてしまう

サーバーサイドの処理ステップを `screen` に書かないでください。

処理ステップやビジネスロジックは `app_process` に書きます。

### UI項目をapp_processに定義してしまう

UIレイアウト項目を `app_process` に定義しないでください。

表示項目やUIデータバインディングには `screen.Fields` を使います。

### 未対応の列を追加する

FORMATが明示的に定義していない限り、`description`, `rule`, `source`, `target` などの列を追加しないでください。

補足情報は `notes`, `## Notes`, `## Source Links` に記述してください。

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
* ユーザー操作には `Actions` を使う。
* `Actions.process` で `app_process` を参照する。
* 画面レベルのメッセージには `Messages` を使う。
* UIナビゲーションには `Transitions` を使う。
* サーバーサイドロジックは `app_process` に書く。
* Fields, Actions, Messages, Transitions には安定したIDを使う。
* 補足説明は `notes` または `## Notes` に書く。
* UI実装ファイル、テンプレート、スタイル、ルート、テストには `## Source Links` を使う。

AIがUIコードやスクリーンショットからscreenモデルを作成した場合は、次を確認してください。

* field IDs
* field labels
* data bindings
* action IDs
* process references
* message conditions
* transition destinations
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
