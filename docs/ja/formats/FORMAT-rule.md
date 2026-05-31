# FORMAT-rule

English Version: [English](../../formats/FORMAT-rule.md)

## 何に使うフォーマットか

`rule` は、業務ルール、バリデーションルール、計算ルール、判定ルール、変換ルールを定義するためのフォーマットです。

次のような内容を記述するときに使います。

* バリデーションロジック
* 業務制約
* 計算ロジック
* 判定条件
* 分岐条件
* 適格性チェック
* マッピングルール
* UIの活性 / 非活性条件
* processの分岐条件
* CodeSetに基づく判定

`rule` はロジックを記述するためのものです。

許可される値の定義には `codeset` を使います。
その値をどう判定・利用するかのロジックには `rule` を使います。

## 重要な考え方: Rule と CodeSet の違い

`codeset` は値を定義します。

`rule` はロジックを定義します。

例:

* `codeset` は在庫ステータスを定義する

  * `available`
  * `reserved`
  * `hold`
* `rule` は在庫を引当可能かどうかを定義する

  * status が `available` であること
  * quantity が 0 より大きいこと
  * 在庫が期限切れでないこと

rule は CodeSet 値を参照できます。
ただし、CodeSet 自体に業務ロジック全体を書かないでください。

## 重要な考え方: Rule と app_process の違い

`app_process` は処理フローを表します。

`rule` は、process、screen、mapping、validation などから利用される再利用可能なロジックを表します。

`app_process` で表すもの:

* 処理ステップ
* フロー分岐
* 入力 / 出力データ
* process遷移
* processレベルのエラー

`rule` で表すもの:

* バリデーション条件
* 計算式
* 判定基準
* 再利用可能な業務条件
* 変換ロジック

app process の step は、`Steps.rule` から rule を参照できます。

## 最小例

```markdown
---
type: rule
id: RULE-INVENTORY-ALLOCATABLE
name: Inventory Allocatable Rule
kind: validation
tags:
  - Rule
---

# Inventory Allocatable Rule

## Summary

Determines whether inventory can be allocated.

## Inputs

| id | data | source | required | notes |
|---|---|---|---|---|
| IN-INVENTORY | [[DATA-INVENTORY]] | inventory service | Y | Inventory data |

## Conditions

| id | expression | severity | message | notes |
|---|---|---|---|---|
| COND-STATUS | [[CODE-INVENTORY-STATUS]].available | error | Inventory must be available. | Status must be available |
| COND-QTY | quantity > 0 | error | Quantity must be greater than zero. | Quantity check |

## Outputs

| id | data | target | notes |
|---|---|---|---|
| OUT-RESULT | validation_result | caller | Rule evaluation result |
```

## 詳細例

```markdown
---
type: rule
id: RULE-ORDER-VALID
name: Order Validation Rule
kind: validation
tags:
  - Rule
  - Order
---

# Order Validation Rule

## Summary

Validation rule used before submitting an order.

## Inputs

| id | data | source | required | notes |
|---|---|---|---|---|
| IN-ORDER-DRAFT | [[DATA-ORDER-DRAFT]] | [[SCR-ORDER-ENTRY]] | Y | Order values entered by the user |
| IN-INVENTORY | [[DATA-INVENTORY]] | [[PROC-INVENTORY-RESERVE]] | Y | Current inventory state |

## Conditions

| id | expression | severity | message | notes |
|---|---|---|---|---|
| COND-CUSTOMER | customer_id is not empty | error | Customer is required. | Required customer |
| COND-ITEM | item_id is not empty | error | Item is required. | Required item |
| COND-QTY | quantity > 0 | error | Quantity must be greater than zero. | Numeric validation |
| COND-STOCK | [[CODE-INVENTORY-STATUS]].available | error | Inventory is not available. | CodeSet-based condition |

## Calculations

| id | expression | result | notes |
|---|---|---|---|
| CALC-AMOUNT | quantity * unit_price | order_amount | Calculates order amount |

## Outputs

| id | data | target | notes |
|---|---|---|---|
| OUT-VALIDATION-RESULT | [[DATA-VALIDATION-RESULT]] | [[PROC-ORDER-ENTRY-FLOW]].VALIDATION-RESULT | Validation result |

## Source Links

| path | notes |
|---|---|
| src/order/OrderValidationRule.ts | Rule implementation |
| src/order/OrderValidationMessages.ts | Messages used by validation |

## Notes

- This rule may be referenced from `app_process.Steps.rule`.
- CodeSet values should be referenced using qualified value references.
```

## Frontmatter

必須項目:

| field  | required | notes           |
| ------ | -------- | --------------- |
| `type` | yes      | `rule` を指定します。  |
| `id`   | yes      | 一意のruleモデルIDです。 |
| `name` | yes      | ruleの表示名です。     |

任意項目:

| field      | notes                                                                                     |
| ---------- | ----------------------------------------------------------------------------------------- |
| `kind`     | rule種別です。例: `validation`, `business`, `calculation`, `decision`, `mapping`, `constraint`。 |
| `tags`     | Obsidian / Markdown のタグです。                                                                |
| `owner`    | 任意の所有者、ドメイン、モジュール、チームです。                                                                  |
| `priority` | 任意の優先度または評価順です。                                                                           |

例:

```yaml
---
type: rule
id: RULE-ORDER-VALID
name: Order Validation Rule
kind: validation
tags:
  - Rule
  - Order
---
```

## セクション

推奨構成:

```text
# <rule name>

## Summary

## Inputs

## Conditions

## Calculations

## Outputs

## Source Links

## Notes
```

すべてのruleに、すべてのセクションが必要なわけではありません。

単純なバリデーションルールであれば、`Summary`, `Inputs`, `Conditions` だけで十分な場合があります。

計算ルールであれば、`Calculations` が中心になる場合があります。

### Summary

`## Summary` には、ruleの目的、業務上の意味、適用範囲、利用場面を記述します。

このセクションは自由記述です。

### Inputs

`## Inputs` は、rule評価に必要なデータを記述するために使います。

期待されるヘッダー:

```markdown
| id | data | source | required | notes |
|---|---|---|---|---|
```

列の意味:

| column     | meaning                                                  |
| ---------- | -------------------------------------------------------- |
| `id`       | Input IDです。                                              |
| `data`     | 入力データオブジェクト、ERエンティティ、項目、値、関連モデル参照です。                     |
| `source`   | 入力元screen、process、data object、table、API、file、systemなどです。 |
| `required` | `Y` または `N` を指定します。                                      |
| `notes`    | 任意の補足説明です。                                               |

例:

```markdown
## Inputs

| id | data | source | required | notes |
|---|---|---|---|---|
| IN-ORDER-DRAFT | [[DATA-ORDER-DRAFT]] | [[SCR-ORDER-ENTRY]] | Y | Input values |
| IN-INVENTORY | [[DATA-INVENTORY]] | inventory service | Y | Inventory state |
```

`Inputs` に `ref` 列を追加しないでください。
`data`, `source`, `notes` を使います。

### Conditions

`## Conditions` は、バリデーション、判定基準、分岐条件を記述するために使います。

期待されるヘッダー:

```markdown
| id | expression | severity | message | notes |
|---|---|---|---|---|
```

列の意味:

| column       | meaning                                         |
| ------------ | ----------------------------------------------- |
| `id`         | Condition IDです。                                 |
| `expression` | 条件式、ルール文、モデル参照です。                               |
| `severity`   | `info`, `warning`, `error`, `blocker` などの重要度です。 |
| `message`    | メッセージ文言、またはmessageモデル参照です。                      |
| `notes`      | 任意の補足説明です。                                      |

例:

```markdown
## Conditions

| id | expression | severity | message | notes |
|---|---|---|---|---|
| COND-STATUS | [[CODE-INVENTORY-STATUS]].available | error | Inventory must be available. | CodeSet value condition |
| COND-QTY | quantity > 0 | error | Quantity must be greater than zero. | Numeric condition |
```

注意:

* `expression` には通常テキストを書けます。
* `expression` にはCodeSet値参照を書けます。
* `message` には通常メッセージ、または `message` モデル参照を書けます。
* expression は読みやすく保ってください。プログラム構文を完全に詰め込むより、業務上読める表現の方が適している場合があります。

### Calculations

`## Calculations` は、計算式、派生値、変換計算を記述するために使います。

期待されるヘッダー:

```markdown
| id | expression | result | notes |
|---|---|---|---|
```

列の意味:

| column       | meaning           |
| ------------ | ----------------- |
| `id`         | Calculation IDです。 |
| `expression` | 計算式または計算表現です。     |
| `result`     | 出力項目、データ項目、結果値です。 |
| `notes`      | 任意の補足説明です。        |

例:

```markdown
## Calculations

| id | expression | result | notes |
|---|---|---|---|
| CALC-AMOUNT | quantity * unit_price | order_amount | Calculates line amount |
| CALC-TAX | order_amount * tax_rate | tax_amount | Calculates tax |
```

### Outputs

`## Outputs` は、ruleが生成するデータを記述するために使います。

期待されるヘッダー:

```markdown
| id | data | target | notes |
|---|---|---|---|
```

列の意味:

| column   | meaning                                         |
| -------- | ----------------------------------------------- |
| `id`     | Output IDです。                                    |
| `data`   | 出力データオブジェクト、結果値、項目、関連モデル参照です。                   |
| `target` | 出力先screen、process、data object、field、callerなどです。 |
| `notes`  | 任意の補足説明です。                                      |

例:

```markdown
## Outputs

| id | data | target | notes |
|---|---|---|---|
| OUT-VALIDATION-RESULT | [[DATA-VALIDATION-RESULT]] | [[PROC-ORDER-ENTRY-FLOW]].VALIDATION-RESULT | Validation result |
```

`Outputs` に `ref` 列を追加しないでください。

### Source Links

`## Source Links` は任意セクションです。

ruleを、実装ファイル、バリデーションコード、定数、テストファイル、SQL、設定、仕様書、業務ルール文書などへ結びつけるために使います。

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
| src/order/OrderValidationRule.ts | Rule implementation |
| tests/order/OrderValidationRule.test.ts | Rule tests |
```

詳細は [共通セクション](FORMAT-common-sections.md) を参照してください。

### Notes

`## Notes` は自由記述の設計メモに使います。

追加情報を保存するために、構造化テーブルへ未対応の列を追加しないでください。
補足情報は `notes`, `## Notes`, `## Source Links` のいずれかに記述してください。

## テーブル

### Inputs table

```markdown
| id | data | source | required | notes |
|---|---|---|---|---|
```

### Conditions table

```markdown
| id | expression | severity | message | notes |
|---|---|---|---|---|
```

### Calculations table

```markdown
| id | expression | result | notes |
|---|---|---|---|
```

### Outputs table

```markdown
| id | data | target | notes |
|---|---|---|---|
```

### Source Links table

```markdown
| path | notes |
|---|---|
```

## Qualified Ref / Member Ref

`rule` では、構造化IDをメンバー参照として使えます。

例:

```markdown
[[RULE-ORDER-VALID]].COND-QTY
[[RULE-ORDER-VALID]].CALC-AMOUNT
[[RULE-ORDER-VALID]].OUT-VALIDATION-RESULT
```

有用なメンバー候補:

* `Inputs.id`
* `Conditions.id`
* `Calculations.id`
* `Outputs.id`

他のモデルから特定のcondition、calculation、input、outputを参照する場合は、安定したIDを使ってください。

## 参照の扱い

参照として有用な構造化フィールドには、次のようなものがあります。

* `Inputs.data`
* `Inputs.source`
* `Conditions.expression`
* `Conditions.message`
* `Calculations.expression`
* `Calculations.result`
* `Outputs.data`
* `Outputs.target`

自由記述内にも読み取れる参照を含めることはできますが、解析では構造化フィールドを優先するべきです。

## CodeSet値の利用状況

CodeSet値の利用状況は、構造化フィールド内の明示的なQualified Value参照から検出できます。

例:

```markdown
[[CODE-INVENTORY-STATUS]].available
CODE-INVENTORY-STATUS.hold
```

有用な記述場所:

* `Conditions.expression`
* `Calculations.expression`
* `Outputs.data`
* `Notes`

rule条件がCodeSet値に依存する場合は、qualified value reference を使ってください。

## app_processとの関係

`app_process` は、`Steps.rule` からruleを参照できます。

例:

```markdown
## Steps

| id | lane | label | kind | input | output | rule | invoke | screen | notes |
|---|---|---|---|---|---|---|---|---|---|
| validate | System | Validate order | decision | IN-ORDER-DRAFT | VALIDATION-RESULT | [[RULE-ORDER-VALID]] |  |  | Branch by rule result |
```

processは、そのruleがいつ使われるかを表します。
ruleは、ロジックそのものを表します。

## screenとの関係

`screen` は、action、condition、message、呼び出すapp processなどを通じて、rule関連の振る舞いと間接的につながる場合があります。

UI条件や表示上の振る舞いには `screen` を使います。

再利用可能なバリデーションや業務ロジックには `rule` を使います。

## よくあるミス

### ruleに処理フローを書いてしまう

複数ステップの処理フローを `rule` に書かないでください。

処理フローには `app_process` を使います。

### ruleにUIレイアウトを書いてしまう

画面項目、ボタン、画面レイアウトを `rule` に定義しないでください。

UI構造には `screen` を使います。

### CodeSetをruleとして使う

業務ロジックを `codeset` に入れないでください。

許可値には `codeset` を使い、ロジックには `rule` を使います。

### 未対応の列を追加する

FORMATが明示的に定義していない限り、`ref`, `rule`, `condition`, `source`, `target` などの列を追加しないでください。

既存の構造化列、`notes`, `## Notes`, `## Source Links` を使ってください。

### InputsやOutputsにrefを追加する

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

### プログラム構文を詰め込みすぎる

読みやすい業務表現の方が適している場合は、実装寄りの構文を詰め込みすぎないでください。

危険な例:

```text
if (x != null && y !== undefined && z.length > 0) return true
```

推奨:

```text
customer_id is not empty and quantity > 0
```

正確なプログラムロジックが重要な場合は、Source Linksで実装コードへリンクしてください。

### Markdownテーブルとして危険な記法を使う

テーブルセル内では、生の `|` を避けます。

テーブル内では、`[[RULE-ORDER|Order Rule]]` のようなWikilinkエイリアスを避けてください。
代わりに `[[RULE-ORDER]]` を使い、表示上の意味は `notes` に記述します。

## AI生成時の注意

AIで `rule` ファイルを生成する場合は、次の点に注意してください。

* `type: rule` を使う。
* 1ファイルで一貫した1つのrule、またはrule groupを定義する。
* テーブルヘッダーを正確に保つ。
* 未対応の列を追加しない。
* `Inputs` や `Outputs` に `ref` を追加しない。
* バリデーションや判定ロジックには `Conditions` を使う。
* 計算式や派生値には `Calculations` を使う。
* ruleの結果には `Outputs` を使う。
* 条件がCodeSet値に依存する場合は qualified CodeSet value references を使う。
* 処理フローは `rule` ではなく `app_process` に書く。
* UI構造は `rule` ではなく `screen` に書く。
* 許可値は `rule` ではなく `codeset` に書く。
* 補足説明は `notes` または `## Notes` に書く。
* 実装ファイル、テスト、仕様書、SQL、ルール文書には `## Source Links` を使う。

AIがソースコードや設計メモからruleを作成した場合は、次を確認してください。

* ruleの目的
* inputs
* condition expressions
* message references
* calculation expressions
* outputs
* CodeSet value references
* Source Links

## 関連サンプル

* [Inventory search rule](../../../samples/rule/RULE-INVENTORY-SEARCH.md)
* [Rule samples index](../../../samples/rule/README.md)

## 関連フォーマット

* [app_process](FORMAT-app_process.md)
* [screen](FORMAT-screen.md)
* [codeset](FORMAT-codeset.md)
* [message](FORMAT-message.md)
* [mapping](FORMAT-mapping.md)
* [共通セクション](FORMAT-common-sections.md)
