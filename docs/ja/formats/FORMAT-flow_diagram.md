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
| unknown values | `rect` | fallback |

`Objects.ref` は `screen`, `app_process`, `data_object`, `dfd_object` または他の model asset を参照できます。未知の object kind はレンダリングを止めません。

## Flows

期待されるヘッダー:

```markdown
| id | from | to | kind | trigger | data | condition | notes |
```

`Flows.from` と `Flows.to` はローカルの `Objects.id` を参照します。`Flows.kind` は edge semantics、`Flows.trigger` は flow を起こす event / action、`Flows.data` は payload や model reference、`Flows.condition` は guard を表します。Mermaid edge label は `trigger`、`kind`、`data` から compact に組み立てられます。`Flows.data` 内の `data_object` 参照は許容され、既定では graph node にはなりません。

## Rendering

MVPでは Internal Detail View のみを使います。Objects / Flows の raw graph を表示し、projection、folding、view selector は実装しません。

## AI生成時の注意

- `type: flow_diagram` を使う。
- `kind: screen_communication` を使う。
- テーブルヘッダーを仕様通りに保つ。
- `Flows.from` と `Flows.to` にはローカル `Objects.id` を使う。
- edge semantics は `Flows.kind`、user/system event は `Flows.trigger`、payload や data reference は `Flows.data`、guard は `Flows.condition` に書く。
- state matrix、folding rule、自動生成された screen/process derivation は追加しない。
