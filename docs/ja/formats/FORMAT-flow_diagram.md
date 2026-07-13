# FORMAT-flow_diagram

English Version: [English](../../formats/FORMAT-flow_diagram.md)

`flow_diagram` は、画面、コンテキスト、プロセス、ストア、外部システムの間の communication / data handoff flow を表す user-facing diagram format です。

MVPでは DFD-like な Objects / Flows テーブル構造を内部的に使います。ただし `dfd_diagram` とは別のフォーマットであり、利用者向けには classic DFD として扱いません。

## 最小例

```markdown
---
type: flow_diagram
id: FLOW-ORDER-SCREEN-COMMUNICATION
name: Order Screen Communication Flow
kind: screen_communication
---

## Objects

| id | label | kind | ref | domain | notes |
|---|---|---|---|---|---|
| order_screen | Order Screen | screen | [[SCR-ORDER]] | order | Source screen |
| order_process | Order Process | app_process | [[PROC-ORDER]] | order | Application process |
| session_store | Session Store | session | | order | Temporary state |

## Flows

| id | from | to | kind | trigger | data | condition | notes |
|---|---|---|---|---|---|---|---|
| FLOW-001 | order_screen | order_process | submit | click:Submit | [[DATA-ORDER-REQUEST]] | valid | Submit order |
| FLOW-002 | order_process | session_store | context_update |  | Order result |  | Store result |
```

## Frontmatter

| key | required | value |
|---|---|---|
| `type` | yes | `flow_diagram` |
| `id` | yes | 一意な model id |
| `name` | yes | 表示名 |
| `kind` | yes | MVPでは `screen_communication` |
| `flow_view` | no | `detail` (default) または `screen` |


## Viewer Settings

`flow_view` は Flow Diagram を Viewer で最初に開くときだけ初期 view を指定します。その後は toolbar の選択がファイルごとの Viewer state として保持され、Markdown は変更されません。

`flow_view` が未指定または不正な場合は、plugin settings の **Default Flow Diagram view** を初期値に使います。既定値は `detail` です。

## Domain Sources / Domains

`flow_diagram` では、DFD や App Process view と同じ Domain placement support を利用できます。

`## Domain Sources` は、再利用可能な `type: domains` ファイルを参照します。

```markdown
| ref | notes |
|---|---|
```

Flow Diagram 側で Domain 定義を持つ、または上書きする場合は local `## Domains` を使います。

```markdown
| id | name | kind | parent | description |
|---|---|---|---|---|
```

`Objects.domain` は Domain `id` を参照します。Domain Sources または local Domains がある場合、Model Weave は Domain の `name`、`kind`、`parent` を解決し、nested Mermaid domain group に使います。Domain group の配色には `target=domain` と `kind=<Domains.kind>` の Color Scheme row を使います。

Domain Sources も local Domains も無い場合、互換性のため `Objects.domain` は lightweight な raw group key として扱います。この mode では unknown Domain warning は出さず、raw value を group label と Color Scheme kind に使います。

Domain Sources または local Domains がある場合、Domain `id` として解決できない `Objects.domain` は warning になります。

## Objects

期待されるヘッダー:

```markdown
| id | label | kind | ref | domain | notes |
```

`Objects.id` はローカルノードIDです。`Flows.from` と `Flows.to` はこの値を参照します。

MVPで対応する object kind:

| kind | Mermaid shape | class |
|---|---|---|
| `screen` | `curv-trap` | `screen` |
| `process` | `rect` | `process` |
| `app_process` | `rect` | `process` |
| `context` | `rect` | `context` |
| `work_object` | `rect` | `context` |
| `session` | `lin-cyl` | `store` |
| `store` | `lin-cyl` | `store` |
| `datastore` | `lin-cyl` | `store` |
| `external` | `rect` | `external` |
| `actor` | `rect` | `external` |
| `user` | `rect` | `external` |
| `message` | `rect` | `context` |
| `data` | `rect` | `process` |
| `api` | `rect` | `process` |
| `service` | `rect` | `process` |
| `handler` | `rect` | `process` |
| unknown values | `rect` | fallback |

`Objects.ref` は `screen`, `app_process`, `data_object`, `dfd_object` または他の model asset を参照できます。未知の object kind はレンダリングを止めません。

## Flows

期待されるヘッダー:

```markdown
| id | from | to | kind | trigger | data | condition | notes |
```

`Flows.from` と `Flows.to` はローカルの `Objects.id` を参照します。`Flows.kind` は edge semantics、`Flows.trigger` は flow を起こす event / action、`Flows.data` は payload や model reference、`Flows.condition` は guard を表します。`Flows.notes` は edge label に含めない人間向けの補足です。

通常の `Flows.data` 値は Mermaid edge label の文字列として扱います。`Flows.data` 内の Wikilink は Model Weave reference として解決され、未解決の Wikilink は診断されます。`Flows.data` 内の `data_object` 参照は許容され、既定では graph node にはなりません。

Mermaid edge label は `trigger`、`kind`、`data` から compact に組み立てられます。

## Rendering

Flow Diagram は MVP として2つの view mode を持ちます。

`detail` は既定の view です。Objects / Flows の raw graph を表示し、内部 process、context、store、external system、宣言された flow edge をそのまま表示します。

`screen` は Screen Flow projection です。`screen`, `external`, `actor`, `user`, `context`, `message` のような user-visible object を残し、`work_object`, `app_process`, `process`, `session`, `datastore`, `data`, `store`, `api`, `service`, `handler` などの内部 object を折りたたみます。Edge は表示対象 object 間の到達関係として投影されます。折りたたみ対象の内部 object しか無い diagram では、空表示にせず Detail view に fallback します。

Screen Flow の edge label は、表示対象 target へ入る flow から `condition`、`trigger`、`kind` の優先順で作ります。同じ visible source / target に複数 path が畳み込まれる場合、label は ` / ` で結合されます。

Screen Flow は派生レンダリング projection です。source Markdown は変更せず、`Flows.data` から data node を作らず、詳細な communication model を置き換えるものではありません。

`flow_view` は、そのファイルの現在の Viewer state が無い場合に初期 view を選びます。Viewer toolbar では Markdown を変更せずに Detail と Screen を一時切り替えできます。Detail は communication graph 全体の確認、Screen は user-visible object 間の投影された handoff flow の確認に使います。

## AI生成時の注意

- `type: flow_diagram` を使う。
- `kind: screen_communication` を使う。
- テーブルヘッダーを仕様通りに保つ。
- `Flows.from` と `Flows.to` にはローカル `Objects.id` を使う。
- edge semantics は `Flows.kind`、user/system event は `Flows.trigger`、payload や data reference は `Flows.data`、guard は `Flows.condition` に書く。
- 同じ詳細 graph を Screen Flow projection で既定表示したい場合だけ `flow_view: screen` を使う。
- state matrix、folding rule、自動生成された screen/process derivation は追加しない。
