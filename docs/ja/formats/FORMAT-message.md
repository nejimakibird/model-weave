# FORMAT-message

English Version: [English](../../formats/FORMAT-message.md)

## 何に使うフォーマットか

`message` は、再利用可能なメッセージ文言を定義するためのフォーマットです。

次のような内容を記述するときに使います。

* ユーザー向けUIメッセージ
* バリデーションメッセージ
* エラーメッセージ
* 警告メッセージ
* 情報メッセージ
* 成功メッセージ
* システムメッセージ
* ログに近いメッセージ定義
* screen、rule、app process から参照されるメッセージID

`message` ファイルを使うと、screen、rule、process にまたがってメッセージ文言を一貫して管理できます。

screen上のどこでメッセージが表示されるかを記述する場合は `screen.Messages` を使います。
rule条件でどのメッセージを返すかを記述する場合は `rule.Conditions.message` を使います。
メッセージそのものを再利用可能な資産として定義する場合は `message` を使います。

## 重要な考え方: Message と screen message usage の違い

`message` ファイルは、メッセージ文言とメタデータを定義します。

`screen` ファイルは、画面上でメッセージがどのように使われるかを記述します。

例:

* `message`: `MSG-NO-RESULT` を "No inventory rows found." として定義する
* `screen.Messages`: 検索結果が空のときに `MSG-NO-RESULT` を表示すると定義する

この分離により、メッセージ文言を再利用しやすくなり、複数画面に同じ文言を重複して書くことを避けられます。

## 重要な考え方: Message と CodeSet の違い

メッセージ文言には `message` を使います。

選択・比較される値には `codeset` を使います。

例:

* Message: `No inventory rows found.`
* Message: `Inventory is on hold.`
* CodeSet value: `available`
* CodeSet value: `hold`

メッセージはCodeSet値に依存する場合があります。
ただし、メッセージ文言そのものをCodeSet値として定義しないでください。

## 重要な考え方: Message と Rule の違い

ロジックの定義には `rule` を使います。

rule条件に該当したときに表示・返却される文言には `message` を使います。

例:

* Rule condition: `quantity > 0`
* Message: `Quantity must be greater than zero.`

rule は message を参照できます。
ただし、message にバリデーションロジック全体を書かないでください。

## 最小例

```markdown
---
type: message
id: MSG-NO-RESULT
name: No Result Message
kind: info
tags:
  - Message
---

# No Result Message

## Summary

Message shown when a search returns no rows.

## Messages

| id | text | severity | audience | notes |
|---|---|---|---|---|
| MSG-NO-RESULT | No inventory rows found. | info | user | Search completed with no rows |
```

## 詳細例

```markdown
---
type: message
id: MSG-INVENTORY-MESSAGES
name: Inventory Messages
kind: message_group
tags:
  - Message
  - WMS
---

# Inventory Messages

## Summary

Reusable inventory-related messages.

## Messages

| id | text | severity | audience | notes |
|---|---|---|---|---|
| MSG-INVENTORY-NO-RESULT | No inventory rows found. | info | user | Search completed with no rows |
| MSG-INVENTORY-HOLD | Inventory is on hold. | warning | user | Shown when status is hold |
| MSG-INVENTORY-NOT-ALLOCATABLE | Inventory cannot be allocated. | error | user | Returned by allocation rule |
| MSG-INVENTORY-SYSTEM-ERROR | Inventory processing failed. Please try again later. | error | user | Generic process failure |

## Source Links

| path | notes |
|---|---|
| src/messages/inventoryMessages.ts | Message constants |
| src/i18n/en/inventory.json | English translations |

## Notes

- Rules and screens may reference these message IDs.
- CodeSet values may be used in conditions that decide which message is shown.
```

## Frontmatter

必須項目:

| field  | required | notes                               |
| ------ | -------- | ----------------------------------- |
| `type` | yes      | `message` を指定します。                   |
| `id`   | yes      | 一意のmessageモデルIDです。                  |
| `name` | yes      | messageファイル、またはmessage groupの表示名です。 |

任意項目:

| field    | notes                                                                                          |
| -------- | ---------------------------------------------------------------------------------------------- |
| `kind`   | message種別です。例: `info`, `warning`, `error`, `success`, `validation`, `system`, `message_group`。 |
| `tags`   | Obsidian / Markdown のタグです。                                                                     |
| `locale` | 任意のロケールです。例: `en`, `ja`, `en-US`。                                                              |
| `owner`  | 任意の所有者、ドメイン、モジュール、チームです。                                                                       |

例:

```yaml
---
type: message
id: MSG-INVENTORY-MESSAGES
name: Inventory Messages
kind: message_group
locale: en
tags:
  - Message
  - WMS
---
```

## セクション

推奨構成:

```text
# <message name>

## Summary

## Messages

## Source Links

## Notes
```

### Summary

`## Summary` には、messageまたはmessage groupの目的、対象ドメイン、想定利用者、利用場面などを記述します。

このセクションは自由記述です。

### Messages

`## Messages` は、メッセージIDとメッセージ文言を定義するために使います。

期待されるヘッダー:

```markdown
| id | text | severity | audience | notes |
|---|---|---|---|---|
```

列の意味:

| column     | meaning                                                       |
| ---------- | ------------------------------------------------------------- |
| `id`       | Message IDです。                                                 |
| `text`     | メッセージ文言、またはデフォルト文言です。                                         |
| `severity` | `info`, `warning`, `error`, `success` などの重要度です。               |
| `audience` | 想定読者です。例: `user`, `operator`, `developer`, `admin`, `system`。 |
| `notes`    | 任意の補足説明です。                                                    |

例:

```markdown
## Messages

| id | text | severity | audience | notes |
|---|---|---|---|---|
| MSG-REQUIRED | This field is required. | error | user | Validation message |
| MSG-SAVED | Saved successfully. | success | user | Completion message |
```

ルール:

* `id` は安定させます。
* `text` にはデフォルトのメッセージ文言を書きます。
* `severity` は一貫した値を使います。
* 文脈、プレースホルダー、利用上の注意は `notes` に書きます。
* 条件ロジックを `text` に入れないでください。
* CodeSet値定義を `message` に入れないでください。

### Source Links

`## Source Links` は任意セクションです。

message定義を、ソースファイル、i18nファイル、定数、リソースバンドル、バリデーションコード、メッセージカタログなどへ結びつけるために使います。

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
| src/messages/commonMessages.ts | Message constants |
| src/i18n/en/common.json | English message resource |
| src/i18n/ja/common.json | Japanese message resource |
```

詳細は [共通セクション](FORMAT-common-sections.md) を参照してください。

### Notes

`## Notes` は自由記述の設計メモに使います。

追加情報を保存するために、`## Messages` に未対応の列を追加しないでください。
補足情報は `notes`, `## Notes`, `## Source Links` のいずれかに記述してください。

## テーブル

### Messages table

```markdown
| id | text | severity | audience | notes |
|---|---|---|---|---|
```

### Source Links table

```markdown
| path | notes |
|---|---|
```

## Qualified Ref / Member Ref

`message` では、`Messages.id` をメンバー参照として使えます。

例:

```markdown
[[MSG-INVENTORY-MESSAGES]].MSG-INVENTORY-NO-RESULT
[[MSG-INVENTORY-MESSAGES]].MSG-INVENTORY-HOLD
```

1つのファイルに1つのメッセージだけを定義している場合は、ファイルID自体を直接参照として使うこともできます。

例:

```markdown
[[MSG-NO-RESULT]]
```

rules、screens、processes からメッセージ定義を参照する場合は、安定したmessage IDを使ってください。

## 参照の扱い

参照として有用な構造化フィールドには、次のようなものがあります。

* `Messages.id`
* `Messages.notes`
* `Source Links.path`

他フォーマットからmessageを参照する場所の例:

* `screen.Messages.message`
* `rule.Conditions.message`
* `app_process.Errors`
* `app_process.Transitions.notes`
* `mapping` の notes や rule references

自由記述内にも読み取れる参照を含めることはできますが、解析では構造化フィールドを優先するべきです。

## プレースホルダーとパラメータ

実装がプレースホルダーを使う場合、メッセージ文言にプレースホルダーを含めることができます。

例:

```text
{field} is required.
Inventory for {item_id} is on hold.
```

プレースホルダーの意味は `notes` に記述してください。

例:

```markdown
| id | text | severity | audience | notes |
|---|---|---|---|---|
| MSG-FIELD-REQUIRED | {field} is required. | error | user | `{field}` is the display label of the target field |
```

プレースホルダーは単純で、実装しやすい形に保ってください。

## ローカライズ

メッセージを多言語化する場合、代表的な方法は2つあります。

### ロケールごとにファイルを分ける

frontmatter に `locale` を指定します。

例:

```yaml
---
type: message
id: MSG-INVENTORY-MESSAGES-EN
name: Inventory Messages English
locale: en
---
```

### 正本ファイルと Source Links を使う

正本となるmessageファイルを1つ置き、`## Source Links` で i18n resource files へリンクします。

例:

```markdown
## Source Links

| path | notes |
|---|---|
| src/i18n/en/inventory.json | English messages |
| src/i18n/ja/inventory.json | Japanese messages |
```

プロジェクトの管理方法に合わせて選んでください。

## screenとの関係

`screen` は、`screen.Messages` を使ってメッセージを表示できます。

例:

```markdown
## Messages

| id | message | condition | severity | notes |
|---|---|---|---|---|
| MSG-NO-RESULT | [[MSG-INVENTORY-MESSAGES]].MSG-INVENTORY-NO-RESULT | no_result | info | Search completed with no rows |
```

screenは、メッセージがいつ、どこで表示されるかを表します。
messageファイルは、再利用可能なメッセージ文言を定義します。

## ruleとの関係

`rule` は、`Conditions.message` からメッセージを返却または参照できます。

例:

```markdown
## Conditions

| id | expression | severity | message | notes |
|---|---|---|---|---|
| COND-QTY | quantity > 0 | error | [[MSG-COMMON]].MSG-QTY-POSITIVE | Quantity validation |
```

ruleは条件を定義します。
messageは、その条件に該当したときに表示される文言を定義します。

## app_processとの関係

`app_process` は、`Errors`, `Transitions.notes`, process notes などでmessageを参照できます。

メッセージを再利用する場合や安定して追跡したい場合は、`message` ファイルに定義して参照してください。

## よくあるミス

### message textに条件を書いてしまう

rule logic や screen condition をメッセージ文言そのものに埋め込まないでください。

条件は `rule`, `screen`, `app_process` で定義します。

### メッセージをCodeSetで表そうとする

ユーザー向けメッセージ文言をCodeSet値として定義しないでください。

文言には `message` を使い、選択・比較される値には `codeset` を使います。

### 同じ文言を複数画面に重複して書く

再利用されるメッセージは、`message` で一度定義して参照します。

これにより、文言変更や翻訳がしやすくなります。

### message IDを気軽に変更する

他のモデルが参照しているmessage IDを気軽に変更しないでください。

message IDの変更は、screen、rule、process からの参照を壊す可能性があります。

### 未対応の列を追加する

FORMATが明示的に定義していない限り、`condition`, `rule`, `screen`, `process`, `code` などの列を追加しないでください。

補足情報は `notes`, `## Notes`, 他フォーマットからの参照で表現します。

### Markdownテーブルとして危険な記法を使う

message text内では、生の `|` を避けます。

テーブル内では、`[[MSG-COMMON|Common Messages]]` のようなWikilinkエイリアスを避けてください。
代わりに `[[MSG-COMMON]]` を使い、表示上の意味は `notes` に記述します。

## AI生成時の注意

AIで `message` ファイルを生成する場合は、次の点に注意してください。

* `type: message` を使う。
* 1ファイルで1つのmessage、または一貫したmessage groupを定義できる。
* テーブルヘッダーを正確に保つ。
* 未対応の列を追加しない。
* message IDを安定させる。
* 再利用可能な文言は `text` に書く。
* `severity` を一貫して使う。
* `audience` で、ユーザー向け、システム向け、開発者向けなどを区別する。
* プレースホルダーの説明は `notes` に書く。
* rule logic を message text に入れない。
* 人間が読む文に含まれる場合を除き、CodeSet値をmessage textに混ぜない。
* message constants、i18n resources、resource bundles、message catalogs には `## Source Links` を使う。

AIがソースコードやUI文言からmessageを作成した場合は、次を確認してください。

* message IDs
* message text
* severity
* audience
* placeholders
* screens and rulesからの参照
* localization resource links

## 関連サンプル

* [Inventory messages](../../../samples/message/MSG-INVENTORY-MESSAGES.md)
* [Message samples index](../../../samples/message/README.md)

## 関連フォーマット

* [screen](FORMAT-screen.md)
* [rule](FORMAT-rule.md)
* [app_process](FORMAT-app_process.md)
* [codeset](FORMAT-codeset.md)
* [共通セクション](FORMAT-common-sections.md)
