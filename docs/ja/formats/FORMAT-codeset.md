# FORMAT-codeset

English Version: [English](../../formats/FORMAT-codeset.md)

## 何に使うフォーマットか

`codeset` は、名前付きの値セットを定義するためのフォーマットです。

次のような値を記述するときに使います。

* コード一覧
* enum相当の値
* 区分値
* ステータス値
* 状態値
* フラグ
* UI選択肢
* 業務分類値
* 条件、ルール、画面、処理で使われる値

`codeset` を使うと、Model Weaveファイル全体で同じ値を一貫して扱いやすくなります。

特に、同じ値が複数の場所に現れる場合に有効です。

* 画面項目の条件
* app process の flow 条件
* rule 条件
* message 条件
* data object の参照
* mapping ルール

## 重要な考え方: 値を追跡可能な設計要素として扱う

`codeset` の値は、単なる文字列ではありません。

Model Weaveでは、値を追跡可能な設計要素として扱えます。

たとえば、スイッチ状態に次の値があるとします。

* `ON`
* `OFF`

これらの値は、次のような場所で使われます。

* screen の condition
* app_process の `Flows.condition`
* app_process の `Transitions.condition`
* rule の condition
* message の condition
* data_object の ref
* notes

Model Weave は、値ごとの利用状況を集約できます。

これにより、次のような確認がしやすくなります。

* `ON` はどこで使われているか
* `OFF` に依存している画面はどれか
* このステータスを使っている処理分岐はどれか
* この値を参照しているルールやメッセージはどれか
* 未使用または不整合な値はないか

これは、影響分析、状態レビュー、AI支援によるモデル保守に役立ちます。

## 重要な考え方: CodeSet と内部状態

`codeset` は、従来のコード一覧だけでなく、内部状態値も表せます。

従来のコード一覧の例:

* order status
* inventory status
* user role
* message severity
* shipping method

内部状態の例:

* switch state
* process branch status
* UI mode
* temporary validation result
* internal workflow state

ある値が複数のモデルにまたがって条件や振る舞いに影響する場合は、`codeset` として定義しておくと追跡しやすくなります。

## 最小例

```markdown
---
type: codeset
id: CODE-SWITCH-STATE
name: Switch State
kind: state
tags:
  - CodeSet
---

# Switch State

## Summary

State values for a simple ON / OFF switch.

## Values

| value | label | meaning | active | sort_order | notes |
|---|---|---|---|---:|---|
| ON | ON | Switch is enabled | Y | 1 |  |
| OFF | OFF | Switch is disabled | Y | 2 |  |
```

## 詳細例

```markdown
---
type: codeset
id: CODE-INVENTORY-STATUS
name: Inventory Status
kind: status
tags:
  - CodeSet
  - WMS
---

# Inventory Status

## Summary

Inventory status values used by inventory search, allocation, and transfer processes.

## Values

| value | label | meaning | active | sort_order | notes |
|---|---|---|---|---:|---|
| available | Available | Stock can be allocated | Y | 10 | Normal usable inventory |
| reserved | Reserved | Stock is reserved for an order | Y | 20 | Allocation in progress |
| hold | On Hold | Stock is blocked from allocation | Y | 30 | Quality or operational hold |
| damaged | Damaged | Stock is damaged | Y | 40 | Cannot be allocated |
| shipped | Shipped | Stock has already shipped | Y | 50 | Historical state |

## Source Links

| path | notes |
|---|---|
| src/domain/inventory/InventoryStatus.ts | Enum / status definition |
| src/domain/inventory/InventoryAllocationService.ts | Status usage |

## Notes

- Use these values in screen conditions, app process flow conditions, and rule conditions.
- Prefer qualified references when the value is used as a condition.
```

## Frontmatter

必須項目:

| field  | required | notes              |
| ------ | -------- | ------------------ |
| `type` | yes      | `codeset` を指定します。  |
| `id`   | yes      | 一意のCodeSetモデルIDです。 |
| `name` | yes      | CodeSetの表示名です。     |

任意項目:

| field    | notes                                                                             |
| -------- | --------------------------------------------------------------------------------- |
| `kind`   | CodeSet種別です。例: `code`, `status`, `state`, `flag`, `category`, `severity`, `role`。 |
| `tags`   | Obsidian / Markdown のタグです。                                                        |
| `owner`  | 任意の所有者、ドメイン、モジュール、チームです。                                                          |
| `source` | 任意の元仕様、システム、参照元です。                                                                |

例:

```yaml
---
type: codeset
id: CODE-INVENTORY-STATUS
name: Inventory Status
kind: status
tags:
  - CodeSet
  - WMS
---
```

## セクション

推奨構成:

```text
# <codeset name>

## Summary

## Values

## Source Links

## Notes
```

### Summary

`## Summary` には、CodeSetの目的、対象ドメイン、想定される利用場所を記述します。

このセクションは自由記述です。

### Values

`## Values` は、許可される値を定義するために使います。

期待されるヘッダー:

```markdown
| value | label | meaning | active | sort_order | notes |
|---|---|---|---|---:|---|
```

列の意味:

| column       | meaning                           |
| ------------ | --------------------------------- |
| `value`      | 参照や条件で使う安定した値です。                  |
| `label`      | 人間向けの表示ラベルです。                     |
| `meaning`    | 値の意味です。                           |
| `active`     | `Y` または `N` を指定します。現在有効かどうかを表します。 |
| `sort_order` | 表示順または処理順を表す数値です。                 |
| `notes`      | 任意の補足説明です。                        |

例:

```markdown
## Values

| value | label | meaning | active | sort_order | notes |
|---|---|---|---|---:|---|
| draft | Draft | Not yet confirmed | Y | 10 | Editable |
| confirmed | Confirmed | Confirmed by user | Y | 20 | Locked for editing |
| cancelled | Cancelled | Cancelled by user or process | Y | 30 | Terminal state |
```

ルール:

* `value` は安定させます。
* 参照に使いやすい単純な値を推奨します。
* `value` では空白を避けます。
* 表示文言は `label` に書きます。
* 意味や補足は `meaning` と `notes` に書きます。
* 履歴上残したい値は、すぐ削除せず `active: N` とすることを検討します。

### Source Links

`## Source Links` は任意セクションです。

CodeSetを、enum定義、定数、DBマスタ、設定ファイル、バリデーションコード、UI選択肢定義、仕様書などへ結びつけるために使います。

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
| src/domain/inventory/InventoryStatus.ts | TypeScript enum |
| database/master/inventory_status.csv | Master data |
```

詳細は [共通セクション](FORMAT-common-sections.md) を参照してください。

### Notes

`## Notes` は自由記述の設計メモに使います。

追加情報を保存するために、`## Values` に未対応の列を追加しないでください。
補足情報は `notes`, `## Notes`, `## Source Links` のいずれかに記述してください。

## テーブル

### Values table

```markdown
| value | label | meaning | active | sort_order | notes |
|---|---|---|---|---:|---|
```

### Source Links table

```markdown
| path | notes |
|---|---|
```

## Qualified value references

CodeSet値は、qualified value として参照できます。

推奨される形式:

```markdown
[[CODE-INVENTORY-STATUS]].available
CODE-INVENTORY-STATUS.available
```

Wikilink形式では、CodeSet IDをリンクし、その後ろにドットで値を続けます。

例:

```markdown
[[CODE-SWITCH-STATE]].ON
[[CODE-SWITCH-STATE]].OFF
[[CODE-INVENTORY-STATUS]].available
[[CODE-INVENTORY-STATUS]].reserved
```

条件や状態依存として値を使う場合は、qualified value reference を推奨します。

## 値の利用状況追跡

Model Weave は、各CodeSet値がどこで使われているかを集約できます。

有用な利用場所:

* `screen.Fields.condition`
* `screen.Actions.condition`
* `screen.Messages.condition`
* `screen.Transitions.condition`
* `app_process.Flows.condition`
* `app_process.Transitions.condition`
* `app_process.Steps.notes`
* `rule` conditions
* `mapping` rules
* `data_object.Fields.ref`
* 対応している notes や prose sections

利用例:

```markdown
## Flows

| from | to | condition | label | notes |
|---|---|---|---|---|
| validate | reserve | [[CODE-INVENTORY-STATUS]].available | OK | Available inventory |
| validate | reject | [[CODE-INVENTORY-STATUS]].hold | NG | Blocked inventory |
```

これにより、値ごとのレビューができます。

```text
available:
- used by inventory allocation flow
- used by inventory search screen
- used by validation rule

hold:
- used by rejection branch
- used by warning message
```

## CodeSet と Message の違い

選択・比較される値には `codeset` を使います。

ユーザーに表示する文言や、システムが記録するメッセージには `message` を使います。

例:

* CodeSet: `available`, `reserved`, `hold`
* Message: `Inventory is on hold.`, `No inventory rows found.`

メッセージはCodeSet値に依存する場合がありますが、メッセージ文言そのものをCodeSet値として定義しないでください。

## CodeSet と Rule の違い

許可値の定義には `codeset` を使います。

値を評価・変換するロジックには `rule` を使います。

例:

* CodeSetは `available`, `reserved`, `hold` を定義する。
* Ruleは在庫を引当可能かどうかの判定を定義する。
* app_processはRuleを使い、CodeSet値に基づいて分岐する。

## よくあるミス

### ラベルをvalueとして使う

表示ラベルを安定値として使うのは避けてください。

危険な例:

```markdown
| value | label | meaning | active | sort_order | notes |
|---|---|---|---|---:|---|
| Available Stock | Available Stock | Stock can be allocated | Y | 10 |  |
```

推奨:

```markdown
| value | label | meaning | active | sort_order | notes |
|---|---|---|---|---:|---|
| available | Available Stock | Stock can be allocated | Y | 10 |  |
```

### valueを気軽に変更する

他のモデルが参照している `value` を気軽に変更しないでください。

値の変更は、利用状況追跡や条件を壊す可能性があります。

使われなくなった値は、すぐ削除せず `active: N` として残すことを検討してください。

### 未対応の列を追加する

FORMATが明示的に定義していない限り、`code`, `description`, `ref`, `rule`, `condition` などの列を追加しないでください。

補足情報は `meaning`, `notes`, `## Notes`, 関連する `rule` ファイルに記述してください。

### メッセージをCodeSetに混ぜる

ユーザー向けの完全なメッセージ文言を `value` に入れないでください。

メッセージには `message` フォーマットを使います。

### 危険なvalue名を使う

参照しにくくなるため、value名では空白、生の `|`、括弧、複雑な記号を避けます。

推奨:

* `available`
* `reserved`
* `ON`
* `OFF`
* `validation_error`

### 将来構想の値を実装済み値として扱う

将来の案にすぎない値は、`notes` に明記するか、別の設計メモに分けてください。

説明なしに、将来専用の値を有効な本番値に混ぜないでください。

## AI生成時の注意

AIで `codeset` ファイルを生成する場合は、次の点に注意してください。

* `type: codeset` を使う。
* 1ファイルで一貫した1つの値セットを定義する。
* テーブルヘッダーを正確に保つ。
* 未対応の列を追加しない。
* `value` は安定して参照しやすい値にする。
* 表示文言は `label` に書く。
* 値の意味は `meaning` に書く。
* `active` は `Y` または `N` にする。
* `sort_order` は数値にする。
* 補足説明は `notes` に書く。
* enumファイル、定数、マスタデータ、設定、バリデーションコードには `## Source Links` を使う。
* 条件で値を使う場合は qualified value reference を推奨する。
* メッセージをCodeSet値として扱わない。
* ビジネスロジックをCodeSet値として扱わない。ロジックには `rule` を使う。

AIがソースコードからCodeSetを作成した場合は、次を確認してください。

* enum / constant名
* value識別子
* 表示ラベル
* active / inactive状態
* screen、process、rule、mapping、data_objectからの既存参照

## 関連サンプル

* [Switch state CodeSet](../../../samples/codeset/CODE-SWITCH-STATE.md)
* [Inventory status CodeSet](../../../samples/codeset/CODE-INVENTORY-STATUS.md)
* [CodeSet samples index](../../../samples/codeset/README.md)

## 関連フォーマット

* [screen](FORMAT-screen.md)
* [app_process](FORMAT-app_process.md)
* [rule](FORMAT-rule.md)
* [message](FORMAT-message.md)
* [mapping](FORMAT-mapping.md)
* [共通セクション](FORMAT-common-sections.md)
