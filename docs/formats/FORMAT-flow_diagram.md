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
| `flow_view` | no | `detail` (default) or `screen` |


## Viewer Settings

`flow_view` selects the initial view only when a Flow Diagram is first opened in the Viewer. After that, the toolbar selection is kept as Viewer state for that file and does not modify Markdown.

When `flow_view` is absent or invalid, **Default Flow Diagram view** in plugin settings selects the initial mode. Its default is `detail`.

## Domain Sources / Domains

`flow_diagram` may use the same Domain placement support as DFD and App Process views.

Use `## Domain Sources` to reference reusable `type: domains` files:

```markdown
| ref | notes |
|---|---|
```

Use local `## Domains` when the Flow Diagram owns or overrides Domain definitions:

```markdown
| id | name | kind | parent | description |
|---|---|---|---|---|
```

`Objects.domain` refers to a Domain `id`. When Domain Sources or local Domains are present, Model Weave resolves the Domain `name`, `kind`, and `parent` and uses them for nested Mermaid domain groups. Domain group colors use Color Scheme rows with `target=domain` and `kind=<Domains.kind>`.

If neither Domain Sources nor local Domains are present, `Objects.domain` remains a lightweight raw group key for compatibility. In that mode, unknown Domain warnings are not produced and the raw value is used as the group label and Color Scheme kind.

If Domain Sources or local Domains are present, an `Objects.domain` value that cannot be resolved to a Domain `id` produces a warning.

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
| `actor` | `rect` | `external` |
| `user` | `rect` | `external` |
| `message` | `rect` | `context` |
| `data` | `rect` | `process` |
| `api` | `rect` | `process` |
| `service` | `rect` | `process` |
| `handler` | `rect` | `process` |
| unknown values | `rect` | fallback |

`Objects.ref` may point to `screen`, `app_process`, `data_object`, `dfd_object`, or another model asset. Unknown object kinds should not block rendering.

## Flows

Expected header:

```markdown
| id | from | to | kind | trigger | data | condition | notes |
```

`Flows.from` and `Flows.to` refer to local `Objects.id` values. `Flows.kind` describes edge semantics, `Flows.trigger` describes the event or action that causes the flow, `Flows.data` describes the payload or model references, and `Flows.condition` describes a guard. `Flows.notes` is for human review context that should not be part of the edge label.

Plain `Flows.data` values are treated as Mermaid edge-label text. Wikilinks in `Flows.data` are resolved as Model Weave references; unresolved Wikilinks produce diagnostics. `data_object` references in `Flows.data` are allowed and do not become graph nodes by default.

Mermaid edge labels are assembled compactly from `trigger`, `kind`, and `data`.

## Rendering

Flow Diagram supports two MVP view modes.

`detail` is the default view and renders the raw Objects / Flows graph. It keeps internal processes, contexts, stores, external systems, and all declared flow edges visible.

`screen` is a Screen Flow projection. It keeps user-visible objects with kind `screen`, `external`, `actor`, `user`, `context`, or `message`, and folds internal objects such as `work_object`, `app_process`, `process`, `session`, `datastore`, `data`, `store`, `api`, `service`, and `handler`. Edges are projected as reachability between visible objects. If a diagram has only folded/internal objects, rendering falls back to the Detail view so the graph is not empty.

Screen Flow edge labels are taken from the incoming flow to the visible target, using this priority: `condition`, then `trigger`, then `kind`. When multiple projected paths produce the same visible source/target pair, labels are merged with ` / `.

Screen Flow is a derived rendering projection. It does not change the source Markdown, does not create data nodes from `Flows.data`, and does not replace the detailed communication model.

`flow_view` supplies the Viewer initial view when no current Viewer state exists for the file. The Viewer toolbar can temporarily switch between Detail and Screen without changing the Markdown file. Detail is for inspecting the full communication graph; Screen is for following the projected handoff flow between user-visible objects.

## AI Generation Notes

- Use `type: flow_diagram`.
- Use `kind: screen_communication`.
- Keep table headers exactly as documented.
- Use local `Objects.id` values in `Flows.from` and `Flows.to`.
- Put edge semantics in `Flows.kind`, user/system events in `Flows.trigger`, payloads or data references in `Flows.data`, and guards in `Flows.condition`.
- Use `flow_view: screen` only when the same detailed graph should default to Screen Flow projection.
- Do not add generated state matrices, folding rules, or automatic screen/process derivations.
