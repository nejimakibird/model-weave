# FORMAT-dfd_diagram

## 目的

`dfd_diagram` は、DFD（Data Flow Diagram）として、外部実体・処理・データストア間のデータフローを表現するための図表定義ファイルです。

DFD では「どのデータが、どこからどこへ流れるか」が主役です。  
そのため、フローの正本は `dfd_diagram` 側の `## Flows` に置きます。

V0.7 では、`dfd_diagram` は Mermaid `flowchart LR` を正式なレンダリング経路とします。  
旧 DFD custom renderer は削除済みであり、DFD 図は Mermaid-first / Mermaid-only として扱います。

---

## 基本方針

- `type: dfd_diagram` を持つ
- DFD 図に含める対象を `Objects` で列挙する
- データフローは `Flows` テーブルで定義する
- `Objects` では、外部 `dfd_object` 参照と diagram 内 local object の両方を扱える
- `ref` なし local object を許容する
- `ref` ありで未解決の場合は diagnostics 対象とする
- `Flows.from` / `Flows.to` は `Objects.id` または `Objects.ref` を解決する
- `Flows` だけから missing node を暗黙生成しない
- Mermaid renderer では layout ファイルを使わない
- Markdown が正本であり、Mermaid / SVG / PNG は派生出力である

---

## Frontmatter

### 必須

- `type`
- `id`
- `name`

### 任意

- `level`
- `render_mode`
- `tags`

### `level` の想定値

- `context`
- `0`
- `1`
- `2`
- ...

### `render_mode`

V0.7 では `dfd_diagram` は Mermaid-only です。

指定可能値としては他フォーマットとの共通性のため以下を受け付けます。

- `auto`
- `mermaid`
- `custom`

ただし、DFDでは以下のように解釈します。

- `auto`
  - Mermaid に解決される
- `mermaid`
  - Mermaid に解決される
- `custom`
  - 旧 custom renderer は使わず、diagnostics を出して Mermaid に fallback する

Viewer toolbar の RenderMode selector は、DFD では表示しません。  
DFD は runtime 上 Mermaid-only のため、ユーザーが切り替える意味がないからです。

### 例

```yaml
---
type: dfd_diagram
id: DFD-WMS-L0
name: WMS Level 0 DFD
level: 0
render_mode: auto
tags:
  - DFD
  - Diagram
---
```

---

## 本文構成

推奨構成:

```text
# <diagram name>

## Summary

## Objects

## Flows

## Notes
```

---

## Summary

図の対象範囲、粒度、上位図との関係を記述します。

### 例

```markdown
## Summary

WMSと荷主システム、外部業者、社内システム間の主要なデータ連携を表す Level 0 DFD。
```

---

## Objects

図に含める DFD object を列挙します。

V0.7 では、以下の新形式を推奨します。

```markdown
## Objects

| id | label | kind | ref | notes |
|---|---|---|---|---|
| CLIENT | 荷主システム | external |  | local external system |
| CONVERT | 通信データ変換システム | process | [[dfd/DFD-PROC-CONVERT]] | reusable dfd_object |
| WMS | 在庫管理システム | process |  | local process |
| STOCK | 在庫データ | datastore | [[dfd/DFD-STORE-STOCK]] | reusable datastore |
```

### 列

- `id`
- `label`
- `kind`
- `ref`
- `notes`

### 意味

#### `id`

diagram 内だけで使う local object ID です。  
`Flows.from` / `Flows.to` から参照できます。

例:

```markdown
| WMS | 在庫管理システム | process |  |  |
```

この場合、Flow 側では以下のように書けます。

```markdown
| FLOW-001 | CLIENT | WMS | 入庫予定データ |  |
```

#### `label`

図に表示するラベルです。  
Mermaid node label の第一候補になります。

#### `kind`

DFD object の種類です。

想定値:

- `external`
- `process`
- `datastore`
- `other`

`kind` は Mermaid 上の node shape や表示補助に使えます。

#### `ref`

任意の `dfd_object` 参照です。

- 空欄の場合
  - diagram 内だけの local object として扱う
  - 未解決エラーにはしない
- 値がある場合
  - 外部 `dfd_object` への参照として解決する
  - 未解決なら Warning / Error 対象

#### `notes`

任意の補足です。

---

## local object

`ref` が空欄の `Objects` 行は、diagram 内だけの local object として扱います。

```markdown
| CLIENT | 荷主システム | external |  | Level 0 用の簡易外部実体 |
```

local object は以下のような用途で使います。

- Level 0 の会社間連携図
- 初期検討中の外部システム
- まだ個別 `dfd_object` ファイルを作るほどではない要素
- DFDを軽く描きたい場合の仮ノード

local object は正常な表現です。  
`ref` が空であること自体は Error ではありません。

---

## referenced dfd_object

`ref` に値がある場合は、外部 `dfd_object` を参照します。

```markdown
| CONVERT | 通信データ変換システム | process | [[dfd/DFD-PROC-CONVERT]] |  |
```

この場合、リンク先 `dfd_object` から以下を補完できます。

- `name`
- `kind`
- `summary`
- `notes`

ただし、表示ラベルは原則として `Objects.label` を優先します。

---

## 旧 Objects 形式との互換

V0.7以前のような `ref / notes` のみの形式も、当面は互換読み込み対象です。

```markdown
## Objects

| ref | notes |
|---|---|
| [[dfd/DFD-EXT-CUSTOMER]] | 顧客 |
| [[dfd/DFD-PROC-ORDER-RECEIVE]] | 注文受付 |
| [[dfd/DFD-STORE-ORDER]] | 注文データ |
```

この場合は、`ref` から `dfd_object` を解決し、内部的に object を生成します。

新規作成・サンプル・テンプレートでは、V0.7形式の使用を推奨します。

```markdown
| id | label | kind | ref | notes |
```

---

## Flows

オブジェクト間のデータフローを定義します。

### 形式

Markdown テーブル

### 列

- `id`
- `from`
- `to`
- `data`
- `notes`

### 意味

- `id`
  - flow を識別する補助ID
  - 任意
- `from`
  - 送信元 object
- `to`
  - 送信先 object
- `data`
  - 流れるデータ名
  - Mermaid edge label の主候補
- `notes`
  - 条件や補足

### 例

```markdown
## Flows

| id | from | to | data | notes |
|---|---|---|---|---|
| FLOW-INBOUND-PLAN | CLIENT | CONVERT | 入庫予定データ | 固定長 |
| FLOW-CONVERTED-INBOUND | CONVERT | WMS | 入庫予定CSV | CSV変換後 |
| FLOW-STOCK-REF | WMS | STOCK | 在庫照会 | 参照 |
```

---

## Flows.from / Flows.to の解決順

`Flows.from` / `Flows.to` は、`Objects` に定義された object に解決されます。

解決順:

1. `Objects.id`
2. `Objects.ref` の raw target / resolved target / resolved `dfd_object.id`
3. 旧 `ref` only Objects 形式の互換値
4. unresolved

### 例

以下のように `Objects` に `TESTNODE1` と `TESTNODE2` が定義されている場合:

```markdown
## Objects

| id | label | kind | ref | notes |
|---|---|---|---|---|
| TESTNODE1 | テストノード1 | process |  |  |
| TESTNODE2 | テストノード2 | process |  |  |
```

Flow は以下のように書けます。

```markdown
| FLOW-L0-TEST | TESTNODE1 | TESTNODE2 | TESTDATA | テスト用 |
```

この場合、Mermaid 上では以下のような edge が描画されます。

```text
TESTNODE1 -- TESTDATA --> TESTNODE2
```

一方、`Objects` に存在しない `from` / `to` を `Flows` にだけ書いても、missing node は暗黙生成しません。  
未解決 diagnostics の対象になります。

---

## Mermaid rendering

V0.7 の `dfd_diagram` は Mermaid `flowchart LR` で表示します。

### Mermaid は派生出力

Mermaid source は、Markdown から生成される派生出力です。  
ユーザーが Mermaid source を正本として編集する前提ではありません。

### node id

Mermaid node id には、raw id / wikilink / 日本語ラベル / path を直接使いません。  
内部的には安全な ASCII ID を生成します。

例:

```text
mw_n_0
mw_n_1
mw_n_2
```

### label priority

Mermaid node label は以下の優先順で決定します。

1. `Objects.label`
2. resolved `dfd_object.name`
3. `Objects.id`
4. raw `ref`

### edge label

Mermaid edge label は `Flows.data` を使います。

### kind と shape

`Objects.kind` は、可能な範囲で node shape に反映します。

例:

- `external`
- `process`
- `datastore`
- `other`

実装上の制約により、shape 表現は今後調整される可能性があります。

---

## Custom renderer の扱い

V0.7 では、旧 DFD custom renderer は runtime から削除済みです。

- `dfd_diagram` は Mermaid-only
- `render_mode: custom` が指定された場合も旧 custom renderer は使わない
- diagnostics を出したうえで Mermaid に fallback する
- `dfd_object` の definition/detail view は残る

`dfd_object` は DFD の単体部品定義です。  
`dfd_diagram` の renderer とは別物です。

---

## PNG Export

DFD の PNG Export は、表示中の Mermaid diagram body を対象にします。

### 出力対象

含める:

- Mermaid-rendered diagram body

含めない:

- toolbar
- diagnostics panel
- lower information panel
- resize handle

### 方針

- 現在の zoom / pan 状態だけでなく、図全体が収まる形で export する
- Mermaid/SVG のフォントや CSS には環境差があり得る
- export はレビュー資料への貼り付け用途を優先する

---

## Diagnostics 方針

### Error 候補

- `Objects.id` が重複している
- 新形式の `Objects` 行で `id` も `ref` も空
- `Flows.from` が解決できない
- `Flows.to` が解決できない

### Warning 候補

- `Objects.ref` が存在するが未解決
- `Objects.kind` が空で、`ref` からも導出できない
- `Objects.kind` が想定外
- `Flows.from` / `Flows.to` が `Objects` に存在しない
- `from == to`
- `external -> external`
- `external -> datastore`
- `datastore -> datastore`

### Note 候補

- `Objects.ref` が空のため local object として扱う
- 旧 `ref / notes` 形式を互換読み込みしている
- local object と referenced object が混在している
- `render_mode` 未指定のため `auto` として扱う

Note は増えすぎると Viewer が見づらくなるため、表示上は抑制してもよいです。

---

## 分岐・合流・ループ

### 分岐

同じ `from` から複数の `to` を持つ複数行で表現します。

```markdown
| id | from | to | data | notes |
|---|---|---|---|---|
|  | WMS | STOCK | 在庫照会 | 正常時 |
|  | WMS | CLIENT | 入力エラー通知 | エラー時 |
```

### 合流

複数の `from` が同じ `to` へ流れる複数行で表現します。

```markdown
| id | from | to | data | notes |
|---|---|---|---|---|
|  | CLIENT | WMS | 入庫予定 | 荷主連携 |
|  | OPERATOR | WMS | 手入力補正 | 画面入力 |
```

### ループ

循環するフローを複数行で表現します。

```markdown
| id | from | to | data | notes |
|---|---|---|---|---|
|  | WMS | CONVERT | 出庫指示CSV |  |
|  | CONVERT | WMS | 変換エラー通知 | 差し戻し |
```

`from == to` の self-loop は許容しますが、最小版では Warning 対象としてよいです。

---

## 完成例

```markdown
---
type: dfd_diagram
id: DFD-WMS-L0
name: WMS Level 0 DFD
level: 0
render_mode: auto
tags:
  - DFD
  - Diagram
---

# WMS Level 0 DFD

## Summary

荷主システム、通信データ変換システム、在庫管理システム、庫内作業システムの間で流れる主要データを表す。

## Objects

| id | label | kind | ref | notes |
|---|---|---|---|---|
| CLIENT | 荷主システム | external |  | 固定長連携 |
| CONVERT | 通信データ変換システム | process |  | 固定長/CSV変換 |
| WMS | 在庫管理システム | process |  | 在庫・入出庫管理 |
| WORK | 庫内作業システム | process |  | 倉庫内作業 |
| STOCK | 在庫データ | datastore |  | 在庫情報 |

## Flows

| id | from | to | data | notes |
|---|---|---|---|---|
| FLOW-INBOUND-PLAN | CLIENT | CONVERT | 入庫予定データ | 固定長 |
| FLOW-INBOUND-CSV | CONVERT | WMS | 入庫予定CSV | CSV変換後 |
| FLOW-WORK-INSTRUCTION | WMS | WORK | 作業指示 | CSV |
| FLOW-WORK-RESULT | WORK | WMS | 作業実績 | CSV |
| FLOW-STOCK-UPDATE | WMS | STOCK | 在庫更新 |  |

## Notes

- Level 0 では会社間・主要社内システム間の連携を表す。
- 詳細なデータ項目は data_object / mapping で管理する。
```

---

## 非対応 / 後続検討

V0.7 初期では以下を必須にしません。

- DFD custom renderer
- DFD layout ファイル
- 手動座標指定
- Mermaid source の直接編集
- Mermaid SVG の完全なクリック遷移統合
- DFD drill-down / parent_process 構造化
- Flow の自動集約・自動分割
- data_object との完全なカバレッジ検証
- 大規模 DFD の自動分割
