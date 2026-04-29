# FORMAT-screen

## 目的

`screen` は、Model Weave における **UI を持つ設計単位**を表すフォーマットです。

画面の意味、画面構成、入力・表示・操作 target、ユーザー操作、画面イベント、呼び出される処理、画面遷移、表示メッセージ、画面内に閉じる補助処理を Markdown で記述します。

`screen` は、最初から厳密な UI 実装仕様を目指すものではありません。初期設計では、画面に存在する target と、それに紐づく event / action を中心に、自然言語を許容しながら記述します。

詳細化が必要な処理は、Screen 内の `Local Processes` または外部 `app_process` に逃がせる構造にします。

---

## 基本方針

- `type: screen` を持つ
- UI を持つ画面設計単位を表す
- `Layout` は実装レイアウトではなく、画面構成の粗いブロック定義として扱う
- `Fields` は入力・表示項目だけではなく、画面上の **target 定義**として扱う
- `Fields.layout` で、各 target がどの Layout block に属するかを指定できる
- `Actions` は操作項目だけではなく、`target + event` に紐づく **イベントハンドラ定義**として扱う
- `Actions.id` は Optional
- `Actions.target` は基本的に `Fields.id` を参照する
- `Actions.invoke` から外部 `app_process` または Screen 内 `Local Processes` を呼び出せる
- `Actions.transition` は画面遷移先 screen を表す
- 画面遷移の正本は `Actions.transition` に寄せる
- 独立した `Transitions` セクションは正規仕様としては持たない
- Viewer / Preview では `Actions.transition` から出口画面を集約して表示する
- `Actions.rule` から実行条件・入力チェック・表示条件などの Rule を参照できる
- 軽い処理は `Actions.notes` に自然言語で書いてよい
- 画面内だけで完結する中程度の処理は `Local Processes` に書ける
- 複雑化・共通化する処理は外部 `app_process` に切り出す
- `Local Processes` は `app_process` と似た構造を持つが、当面は diagram / chart のレンダリング対象外とする
- 簡易 Screen Preview は、Layout block、Fields、Actions.invoke、Actions.transition を使って画面構成と出口を可視化する

---

## Frontmatter

### 必須

- `type`
- `id`
- `name`

### 任意

- `screen_type`
- `tags`

### `screen_type` の想定値

`screen_type` は厳密制限せず、文字列として保持します。

想定値:

- `entry`
- `list`
- `detail`
- `confirm`
- `complete`
- `dialog`
- `dashboard`
- `admin`
- `other`

### 例

```yaml
---
type: screen
id: SCR-WAREHOUSE-TRANSFER-ENTRY
name: 倉庫間転送依頼入力
screen_type: entry
tags:
  - Screen
  - WMS
---
```

---

## 本文構成

推奨構成:

```text
# <screen name>

## Summary

## Layout

## Fields

## Actions

## Messages

## Notes

## Local Processes
```

### 実質的な最小構成

最初に書き始める段階では、以下があれば十分です。

- `Summary`
- `Fields`
- `Actions`

### Optional

以下は必要になった時だけ書けばよいです。

- `Layout`
- `Messages`
- `Notes`
- `Local Processes`

ただし、テンプレートには空セクションとして含めてもよいです。

### parser 方針

推奨順序は上記としますが、parser / validator はセクション順序に厳密依存しない方針とします。

旧形式互換として、既存ファイルに `## Transitions` が存在しても読み込みは許容してよいです。ただし、新規作成・テンプレート・正式サンプルでは `Transitions` セクションを正規形式としては使わず、画面遷移は `Actions.transition` に寄せます。

---

## Summary

画面の概要、目的、対象ユーザー、利用シーンなどを自然言語で記述します。

### 例

```markdown
## Summary

荷主01からの倉庫間転送指示を入力し、A倉庫からの出荷、B倉庫への入荷として扱う依頼を登録する画面。
```

---

## Layout

画面構成の粗いブロックを定義します。

`Layout` は実装レイアウトではありません。CSS Grid、座標、ピクセル単位の位置、厳密な画面再現を目的にしません。

目的は、画面を意味のある領域に分け、Viewer / Preview で画面構成を俯瞰しやすくすることです。

### 列

- `id`
- `label`
- `kind`
- `purpose`
- `notes`

### 意味

- `id`
  - Layout block の識別子
  - `Fields.layout` から参照される
- `label`
  - ブロック表示名
- `kind`
  - ブロック種別
- `purpose`
  - ブロックの目的
- `notes`
  - 補足

### `kind` の想定値

- `header`
- `body`
- `detail`
- `footer`
- `section`
- `form_area`
- `table_area`
- `action_area`
- `search_area`
- `result_area`
- `message_area`
- `other`

### 例

```markdown
## Layout

| id | label | kind | purpose | notes |
|---|---|---|---|---|
| header | 転送元・転送先 | header | 倉庫A/Bを入力 |  |
| detail | 転送商品 | table_area | 商品、ロット、数量を入力 |  |
| footer | 登録操作 | action_area | 在庫確認、登録、戻る |  |
```

### Preview 方針

簡易 Screen Preview では、Layout block を四角い領域として表示します。

```text
[転送元・転送先]
  - 荷主ID
  - 転送元倉庫
  - 転送先倉庫
  - 転送希望日

[転送商品]
  - 商品
  - ロット
  - 数量

[登録操作]
  - 在庫確認
  - 登録
  - 戻る
```

実装レイアウトではなく、画面の意味構成を見せるための可視化です。

---

## Fields

画面上に存在する target を定義します。

`Fields` は入力項目だけではありません。Window、Form、Panel、Button、Table、TextArea など、イベントの対象になり得る画面上の部品・領域を広く扱います。

### 列

- `id`
- `label`
- `kind`
- `layout`
- `data_type`
- `required`
- `ref`
- `rule`
- `notes`

### 意味

- `id`
  - 画面内で安定した target ID
  - `Actions.target` から参照される
- `label`
  - 画面表示名
- `kind`
  - UI 部品種別
- `layout`
  - 所属する Layout block
  - `Layout.id` を指定する
- `data_type`
  - 入力・表示値の型
  - 対象が window / form / button などの場合は空欄可
- `required`
  - 必須有無。`Y` / `N` など
- `ref`
  - 対応する data_object / er_entity / codeset など
- `rule`
  - 項目に関係する Rule
- `notes`
  - 補足

### `kind` の想定値

- `window`
- `form`
- `panel`
- `section`
- `table`
- `list`
- `input`
- `textarea`
- `select`
- `checkbox`
- `radio`
- `button`
- `link`
- `label`
- `hidden`
- `computed`
- `table_input`
- `table_select`
- `other`

### 方針

- `Fields.id` は、Actions の target として使う場合は必須
- `window` や `form` のようなベース部品も Fields に定義してよい
- `window` は画面全体を表す target として使える
- `layout` は Optional だが、簡易 Preview でグルーピングしたい場合は指定を推奨する
- `layout` が空の Field は Preview では `未分類` または `other` にまとめてよい
- `ref` には Qualified Ref を許容する
- `ref` に `codeset` を指定すると、select / radio / checkbox の選択肢定義として扱える
- `rule` は入力制約、表示制約、活性制御などへの参照として使える

### 例

```markdown
## Fields

| id | label | kind | layout | data_type | required | ref | rule | notes |
|---|---|---|---|---|---|---|---|---|
| window | 倉庫間転送依頼入力 | window |  |  |  |  |  | 画面全体 |
| shipper_id | 荷主ID | select | header | string | Y | [[02_er/m_shipper]] |  | 荷主01 |
| transfer_request_no | 転送依頼番号 | input | header | string | N | [[02_er/t_transfer_request]].transfer_request_no |  | 未入力時採番 |
| from_warehouse_id | 転送元倉庫 | select | header | string | Y | [[02_er/m_warehouse]] |  | A倉庫 |
| to_warehouse_id | 転送先倉庫 | select | header | string | Y | [[02_er/m_warehouse]] |  | B倉庫 |
| requested_transfer_date | 転送希望日 | input | header | date | Y |  |  |  |
| item_id | 商品 | table_select | detail | string | Y | [[02_er/m_item]] |  |  |
| lot_no | ロット | table_input | detail | string | Y | [[02_er/t_inventory]].lot_no |  |  |
| quantity | 数量 | table_input | detail | number | Y |  |  |  |
| check_stock_button | 在庫確認 | button | footer |  |  |  |  | 転送元在庫を確認 |
| save_button | 登録 | button | footer |  |  |  |  | 登録操作 |
| back_button | 戻る | button | footer |  |  |  |  | メニューへ戻る |
```

---

## Actions

画面上で発生するイベント、操作、処理呼び出し、画面遷移を定義します。

`Actions` は「ボタン操作」だけではありません。Window の load、Field の focus / blur / change、Form の submit、Button の click など、`target + event` に紐づくイベントハンドラとして扱います。

### 列

- `id`
- `label`
- `kind`
- `target`
- `event`
- `invoke`
- `transition`
- `rule`
- `notes`

### 意味

- `id`
  - Action の識別子
  - Optional
  - 外部参照や安定運用が必要な場合は推奨
- `label`
  - Action 表示名・説明名
- `kind`
  - Action 種別
- `target`
  - 対象 target
  - 基本的に `Fields.id` を指定する
- `event`
  - 発生イベント
- `invoke`
  - 呼び出す処理
  - 外部 `app_process` または Screen 内 `Local Processes`
- `transition`
  - 遷移先 screen
  - 画面遷移専用
- `rule`
  - 実行条件、入力チェック、表示条件など
- `notes`
  - 補足
  - 軽い処理内容、遷移条件、成功時/失敗時の挙動などを書いてよい

### `kind` の想定値

- `ui_action`
- `field_event`
- `screen_event`
- `form_event`
- `system_event`
- `shortcut`
- `auto`
- `other`

### `event` の想定値

- `load`
- `unload`
- `click`
- `change`
- `input`
- `focus`
- `blur`
- `submit`
- `select`
- `keydown`
- `timer`
- `message`
- `other`

### `target`

`target` は、基本的に `Fields.id` を指定します。

同一 Screen 内では、短く `order_id` のように書いてよいです。将来的には Qualified Ref も許容します。

例:

```markdown
order_id
[[screen/SCR-ORDER-ENTRY\|注文入力画面]].order_id
```

`window` や `form` のような画面全体・領域も target にできます。

### `invoke`

`invoke` は以下を許容します。

#### 外部 app_process

```markdown
[[process/PROC-ORDER-REGISTER\|注文登録処理]]
```

#### Screen 内 Local Process

```markdown
[[#PROC-CLEAR\|クリア処理]]
```

同一ファイル内の見出しリンクは、Obsidian 標準の見出しリンク補助を利用できる想定です。Model Weave では、V0.7 時点では厳格に解析しすぎず、壊さず許容することを優先します。

### `transition`

`transition` は画面遷移専用です。処理遷移、状態遷移、表示モード切替、内部状態更新までは含めません。

#### transition に書くもの

- メニューへ戻る
- 完了画面へ進む
- 確認画面へ進む
- 詳細画面を開く
- 検索ダイアログを開く
- エラー専用画面へ移動する

#### transition に書かないもの

- 在庫確認処理を実行する
- 入力補完を行う
- 計算結果を同画面に表示する
- ボタンを非活性にする
- メッセージエリアを更新する
- 内部ステータスを変更する

上記は `invoke`、`notes`、`Local Processes` で表現します。

### invoke と transition の組み合わせ

#### invoke なし / transition あり

単純な画面移動。

```markdown
| ACT-BACK | 戻る | ui_action | back_button | click |  | [[08_screen/SCR-WMS-HOME\|WMSホーム]] |  | メニューへ戻る |
```

#### invoke あり / transition なし

処理を呼び、同じ画面内に結果を表示する。

```markdown
| ACT-CHECK-STOCK | 在庫確認 | ui_action | check_stock_button | click | [[06_process/PROC-ALLOCATE-INVENTORY\|在庫引当処理]] |  | [[05_rule/RULE-INVENTORY-ALLOCATION\|在庫引当ルール]] | 結果を同じ画面の在庫確認エリアに表示する |
```

#### invoke あり / transition あり

処理を呼び、処理結果に応じて別画面へ進む。

```markdown
| ACT-SAVE | 登録 | ui_action | save_button | click | [[06_process/PROC-REGISTER-WAREHOUSE-TRANSFER\|倉庫間転送登録処理]] | [[08_screen/SCR-WAREHOUSE-TRANSFER-COMPLETE\|登録完了画面]] |  | 登録成功時に完了画面へ遷移。エラー時は同画面にメッセージ表示 |
```

#### invoke なし / transition なし

軽い表示変更や入力補助。

```markdown
|  | 備考フォーカス取得 | field_event | memo | focus |  |  |  | 入力例を表示する |
```

### `Actions.id` の扱い

`Actions.id` は Optional です。理屈上は `target + event` の組み合わせで Action を識別できます。

ただし、以下の場合は `id` を付与することを推奨します。

- 他の場所から Action 自体を参照する
- 同じ `target + event` に複数の処理を定義する
- 条件違いの Action を分ける
- diagnostics や AI レビューで安定して指摘したい
- 後から app_process / rule / mapping へ切り出す可能性がある

空欄の場合、plugin 内部では `target + event + row index` などで一時的に識別してよいです。

### 例

```markdown
## Actions

| id | label | kind | target | event | invoke | transition | rule | notes |
|---|---|---|---|---|---|---|---|---|
|  | 初期表示 | screen_event | window | load | [[#PROC-INITIALIZE\|初期表示処理]] |  |  | 初期値と選択肢を設定する |
|  | 転送元倉庫変更 | field_event | from_warehouse_id | change | [[#PROC-REFRESH-LOT-CANDIDATES\|ロット候補更新処理]] |  |  | 転送元倉庫に応じてロット候補を更新 |
| ACT-CHECK-STOCK | 在庫確認 | ui_action | check_stock_button | click | [[06_process/PROC-ALLOCATE-INVENTORY\|在庫引当処理]] |  | [[05_rule/RULE-INVENTORY-ALLOCATION\|在庫引当ルール]] | 転送元在庫 |
| ACT-SAVE | 登録 | ui_action | save_button | click | [[06_process/PROC-REGISTER-WAREHOUSE-TRANSFER\|倉庫間転送登録処理]] | [[08_screen/SCR-WAREHOUSE-TRANSFER-COMPLETE\|登録完了画面]] |  | 登録成功時に遷移。エラー時は同画面にメッセージ表示 |
| ACT-BACK | 戻る | ui_action | back_button | click |  | [[08_screen/SCR-WMS-HOME\|WMSホーム]] |  | メニューへ戻る |
```

---

## Messages

画面で使用するメッセージを任意で記述します。

本格的に管理する場合は、後続の `message` フォーマットへ切り出します。V0.7 時点では、Screen 内の補足一覧として扱います。

### 列

- `id`
- `text`
- `severity`
- `timing`
- `notes`

### 意味

- `id`
  - メッセージ ID
  - message ファイルに切り出す前のローカル ID として使える
- `text`
  - 画面に表示する文言
  - 直接文言または message 参照
- `severity`
  - 種別
- `timing`
  - 表示タイミング
- `notes`
  - 補足

### `severity` の想定値

- `info`
- `success`
- `warning`
- `error`
- `confirm`
- `other`

### 例

```markdown
## Messages

| id | text | severity | timing | notes |
|---|---|---|---|---|
| MSG-COMMON-001 | 入力内容を確認してください。 | error | validation_error | 汎用入力エラー |
| MSG-SAVE-001 | 登録しました。 | success | save_success | 登録完了時 |
| MSG-STOCK-001 | 転送元在庫が不足しています。 | warning | stock_check | 在庫確認時 |
```

### message ファイル参照の例

```markdown
| id | text | severity | timing | notes |
|---|---|---|---|---|
| MSG-COMMON-DB-001 | [[message/MSG-COMMON-DB-001\|データ更新に失敗しました]] | error | save_error |  |
```

---

## Notes

自由記述の補足です。

---

## Local Processes

Screen 内に閉じた中程度の処理を記述します。

`Local Processes` は、外部 `app_process` に切り出すほどではないが、`Actions.notes` だけでは説明しづらい処理を書くための領域です。ソースコードのサブルーチンに近い扱いです。

### 基本方針

- 同一 screen 内だけで使う処理を記述する
- `app_process` と似たセクション構造を持つ
- `Steps` と `Errors` は自然言語・箇条書きで書いてよい
- 当面は diagram / chart のレンダリング対象外
- Obsidian の見出しリンクで `Actions.invoke` から参照できる
- 複雑化・共通化が必要になったら外部 `app_process` に切り出す

### 見出し構造

`## Local Processes` 配下に、`### <local process id>` を置きます。各 local process の内部セクションは `####` を使います。

```markdown
## Local Processes

### PROC-CLEAR

#### Summary

#### Inputs

#### Steps

#### Outputs

#### Errors
```

### `Actions.invoke` からの参照

```markdown
[[#PROC-CLEAR\|クリア処理]]
```

### 例

```markdown
## Local Processes

### PROC-REFRESH-LOT-CANDIDATES

#### Summary

転送元倉庫に応じて、選択可能なロット候補を更新する。

#### Steps

1. 転送元倉庫が空の場合、ロット候補をクリアする。
2. 転送元倉庫の在庫を検索する。
3. 商品と倉庫に一致するロット候補を明細行に表示する。

#### Errors

- 在庫候補の取得に失敗した場合、候補を空にして警告を表示する。
```

---

## Qualified Ref / Member Ref

`screen` では、まず `Fields.id` / `Actions.id` を Qualified Ref の member 候補として扱います。

ただし、`Actions.id` は Optional のため、空欄の Action は member 候補に含めません。

例:

```markdown
[[screen/SCR-WAREHOUSE-TRANSFER-ENTRY\|倉庫間転送依頼入力]].shipper_id
[[screen/SCR-WAREHOUSE-TRANSFER-ENTRY\|倉庫間転送依頼入力]].ACT-SAVE
```

member 解決候補:

- `Fields.id`
- `Actions.id` が存在する行
- 将来的には `Layout.id`
- 将来的には Local Processes の ID
- 将来的には Messages.id

V0.7 時点では、Local Processes は Obsidian の見出しリンクで参照できればよく、Model Weave の member 解決対象にはしなくてもよいです。

---

## app_process との関係

`app_process` は UI を持たない処理単位です。`screen` は UI を持つ設計単位です。

Screen の `Actions.invoke` から `app_process` を呼び出せます。

```markdown
| id | label | kind | target | event | invoke | transition | rule | notes |
|---|---|---|---|---|---|---|---|---|
| ACT-SAVE | 登録 | ui_action | save_button | click | [[process/PROC-ORDER-REGISTER\|注文登録処理]] | [[screen/SCR-ORDER-COMPLETE\|登録完了画面]] | [[rule/RULE-ORDER-REGISTER\|登録可否判定]] | 登録成功時に遷移 |
```

Screen 内に閉じた処理は `Local Processes` に書き、共通化・複雑化した場合に外部 `app_process` へ切り出します。

---

## Screen Preview 方針

`screen` の Preview は、実画面再現ではなく、整合性とナビゲーション補助を目的とします。

### 表示するもの

- Layout block
- 各 Layout block に属する Fields
- Actions.invoke で呼び出す app_process / Local Process
- Actions.transition で遷移する outgoing screen
- Messages
- Warnings / Errors

### 表示しないもの

- 実装 UI のピクセル単位レイアウト
- CSS / HTML / React の具体構造
- モーダル、レスポンシブ、細かい配置
- Local Processes の詳細チャート

### 簡易 Preview イメージ

```text
+------------------------------------------------+
| 倉庫間転送依頼入力                              |
+------------------------------------------------+

[転送元・転送先]
  - 荷主ID
  - 転送依頼番号
  - 転送元倉庫
  - 転送先倉庫
  - 転送希望日

[転送商品]
  - 商品
  - ロット
  - 数量

[登録操作]
  - 在庫確認
  - 登録
  - 戻る

Invoked Processes:
  - 在庫確認 -> PROC-ALLOCATE-INVENTORY
  - 登録 -> PROC-REGISTER-WAREHOUSE-TRANSFER

Outgoing Screens:
  - 登録 -> SCR-WAREHOUSE-TRANSFER-COMPLETE
  - 戻る -> SCR-WMS-HOME
```

### Preview の出口表示

Preview では、以下を集約して表示します。

- `Actions.invoke`
- `Actions.transition`

`Actions.transition` は画面遷移先として表示します。`Actions.invoke` は処理呼び出しとして表示します。

`Actions.invoke` と `Actions.transition` の両方がある場合は、以下のように解釈します。

```text
Action
  ↓
invoke の処理を実行
  ↓
成功時または条件成立時に transition の画面へ遷移
```

厳密な成功/失敗分岐は、V0.7 時点では `Actions.notes` に自然言語で書いてよいものとします。

---

## AI レビューでの利用

`screen` は、初期状態では冗長に書かれることを許容します。

そのうえで、AI に screen / app_process / data_object / er_entity / rule / mapping を渡し、以下を相談する用途を想定します。

- 画面項目と data_object / ER の対応不足
- Layout に属していない Fields
- Fields.ref の不整合
- target が未定義の Actions
- target + event の重複
- Actions.invoke で呼ばれる app_process の妥当性
- Actions.transition で示される画面遷移の不足や不整合
- app_process に外出しすべき Local Processes
- Rule として切り出すべき入力制約・表示制御
- Message として切り出すべき文言
- Mapping として整理すべき項目対応

---

## Validation 方針（案）

### Error 候補

- `Fields.id` の重複
- `Actions.target` が未定義の `Fields.id` を参照している
- `Actions.invoke` の外部 app_process 参照が未解決
- `Actions.transition` の screen 参照が未解決
- `Fields.ref` の参照が未解決
- `Fields.layout` が未定義の `Layout.id` を参照している
- `Layout.id` が重複

### Warning 候補

- `Actions.id` の重複
- `target + event` の完全重複
- `Actions.rule` が未解決
- `Fields.rule` が未解決
- `Actions.invoke` が `[[#...]]` 形式だが該当見出しが存在しない
  - V0.7 時点では厳格チェックせず Note 程度でもよい
- `Fields.kind = button` なのに click Action が存在しない
  - 厳格化しすぎないこと
- `Fields.kind = input / textarea / select` なのに ref が空
  - 画面項目によっては意図的に空の場合があるため Warning 程度
- `Fields.layout` が空
  - Layout を使っている screen では Warning
  - Layout セクションがない screen では Warning にしなくてよい
- 旧形式の `## Transitions` セクションを検出した
  - 読み込みは許容
  - 新規仕様では `Actions.transition` への移行を推奨

### Note 候補

- `Actions.id` が空
- `Actions.target` が空の `screen_event`
- `window` が Fields に存在しないが `target = window` が使われている
  - 将来的には予約 target として許容してもよい

---

## 完成例

```markdown
---
type: screen
id: SCR-WAREHOUSE-TRANSFER-ENTRY
name: 倉庫間転送依頼入力
screen_type: entry
tags:
  - Screen
  - WMS
---

# 倉庫間転送依頼入力

## Summary

荷主01からの倉庫間転送指示を入力し、A倉庫からの出荷、B倉庫への入荷として扱う依頼を登録する画面。

## Layout

| id | label | kind | purpose | notes |
|---|---|---|---|---|
| header | 転送元・転送先 | header | 倉庫A/Bを入力 |  |
| detail | 転送商品 | table_area | 商品、ロット、数量を入力 |  |
| footer | 登録操作 | action_area | 在庫確認、登録、戻る |  |

## Fields

| id | label | kind | layout | data_type | required | ref | rule | notes |
|---|---|---|---|---|---|---|---|---|
| window | 倉庫間転送依頼入力 | window |  |  |  |  |  | 画面全体 |
| shipper_id | 荷主ID | select | header | string | Y | [[02_er/m_shipper]] |  | 荷主01 |
| transfer_request_no | 転送依頼番号 | input | header | string | N | [[02_er/t_transfer_request]].transfer_request_no |  | 未入力時採番 |
| from_warehouse_id | 転送元倉庫 | select | header | string | Y | [[02_er/m_warehouse]] |  | A倉庫 |
| to_warehouse_id | 転送先倉庫 | select | header | string | Y | [[02_er/m_warehouse]] |  | B倉庫 |
| requested_transfer_date | 転送希望日 | input | header | date | Y |  |  |  |
| item_id | 商品 | table_select | detail | string | Y | [[02_er/m_item]] |  |  |
| lot_no | ロット | table_input | detail | string | Y | [[02_er/t_inventory]].lot_no |  |  |
| quantity | 数量 | table_input | detail | number | Y |  |  |  |
| check_stock_button | 在庫確認 | button | footer |  |  |  |  | 転送元在庫を確認 |
| save_button | 登録 | button | footer |  |  |  |  | 登録操作 |
| back_button | 戻る | button | footer |  |  |  |  | メニューへ戻る |

## Actions

| id | label | kind | target | event | invoke | transition | rule | notes |
|---|---|---|---|---|---|---|---|---|
|  | 初期表示 | screen_event | window | load | [[#PROC-INITIALIZE\|初期表示処理]] |  |  | 初期値と選択肢を設定する |
| ACT-CHECK-STOCK | 在庫確認 | ui_action | check_stock_button | click | [[06_process/PROC-ALLOCATE-INVENTORY\|在庫引当処理]] |  | [[05_rule/RULE-INVENTORY-ALLOCATION\|在庫引当ルール]] | 転送元在庫 |
| ACT-SAVE | 登録 | ui_action | save_button | click | [[06_process/PROC-REGISTER-WAREHOUSE-TRANSFER\|倉庫間転送登録処理]] | [[08_screen/SCR-WAREHOUSE-TRANSFER-COMPLETE\|登録完了画面]] |  | 登録成功時に遷移。エラー時は同画面にメッセージ表示 |
| ACT-BACK | 戻る | ui_action | back_button | click |  | [[08_screen/SCR-WMS-HOME\|WMSホーム]] |  | メニューへ戻る |

## Messages

| id | text | severity | timing | notes |
|---|---|---|---|---|
| MSG-COMMON-001 | 入力内容を確認してください。 | error | validation_error | 汎用入力エラー |
| MSG-STOCK-001 | 転送元在庫が不足しています。 | warning | stock_check | 在庫確認時 |
| MSG-SAVE-001 | 登録しました。 | success | save_success | 登録完了時 |

## Notes

- AIで生成したたたき台。実運用レビューで項目名、必須条件、遷移を補正する。
- Transitions セクションは使わず、画面遷移は Actions.transition に寄せる。

## Local Processes

### PROC-INITIALIZE

#### Summary

画面初期表示時の値と選択肢を設定する。

#### Steps

1. 荷主、倉庫、商品の選択肢を取得する。
2. 初期値として荷主01、転送元A倉庫、転送先B倉庫を設定する。

#### Errors

- 選択肢の取得に失敗した場合、画面を表示しつつ警告を出す。
```

---

## 非対応 / 後続検討

V0.7 時点では以下を必須にしません。

- 実画面レイアウトの完全再現
- CSS / HTML / React 構造の表現
- screen diagram 専用ファイル
- screen transition diagram 専用ファイル
- Local Processes の chart / diagram レンダリング
- Local Processes の厳格 validation
- Obsidian 見出しリンクの完全 resolver 対応
- `window` の予約 target 化
- UI 部品の階層構造 validation
- `target + event` の厳格一意制約
- message / rule / mapping の完全統合
- Actions.transition の成功/失敗分岐の構造化
- 旧 `## Transitions` セクションの自動変換

まずは、画面の意味、構成、項目、イベント、呼び出し処理、画面遷移をテキストで記述し、人間と AI がレビューできる構造を作ることを優先します。
