# FORMAT-flow_diagram

Japanese Version: [日本語版](../ja/formats/FORMAT-flow_diagram.md)

`flow_diagram` defines user-facing communication and data handoff flows between screens, contexts, processes, stores, and external systems.

It is rendered as a Mermaid flowchart. Internally, the MVP uses a DFD-like Objects / Flows table structure, but the format is distinct from `dfd_diagram` and should not be presented as a classic DFD.

## Minimal Example

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
| `id` | yes | Unique model id |
| `name` | yes | Human-readable name |
| `kind` | yes | `screen_communication` for the MVP |

## Objects

Expected header:

```markdown
| id | label | kind | ref | domain | notes |
```

`Objects.id` is the local node id used by `Flows.from` and `Flows.to`.

Supported MVP object kinds:

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

`Objects.ref` may point to `screen`, `app_process`, `data_object`, `dfd_object`, or another model asset. Unknown object kinds should not block rendering.

## Flows

Expected header:

```markdown
| id | from | to | kind | trigger | data | condition | notes |
```

`Flows.from` and `Flows.to` refer to local `Objects.id` values. `Flows.kind` describes edge semantics, `Flows.trigger` describes the event or action that causes the flow, `Flows.data` describes the payload or model references, and `Flows.condition` describes a guard. Mermaid edge labels are assembled compactly from `trigger`, `kind`, and `data`. `data_object` references in `Flows.data` are allowed and do not become graph nodes by default.

## Rendering

The MVP uses Internal Detail View only and renders the raw Objects / Flows graph without projection, folding, or view selectors.

## AI Generation Notes

- Use `type: flow_diagram`.
- Use `kind: screen_communication`.
- Keep table headers exactly as documented.
- Use local `Objects.id` values in `Flows.from` and `Flows.to`.
- Put edge semantics in `Flows.kind`, user/system events in `Flows.trigger`, payloads or data references in `Flows.data`, and guards in `Flows.condition`.
- Do not add generated state matrices, folding rules, or automatic screen/process derivations.
