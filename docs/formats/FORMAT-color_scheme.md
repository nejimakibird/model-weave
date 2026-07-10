# FORMAT-color_scheme

Japanese Version: [日本語版](../ja/formats/FORMAT-color_scheme.md)

## What this is for

`color_scheme` defines a reusable color dictionary for Model Weave diagrams.

Colors are keyed by `target` and `kind`. A Color Scheme file can be selected in plugin settings through `defaultColorSchemeRef`.

## Minimal example

```markdown
---
type: color_scheme
id: COLOR-SCHEME-DEFAULT
name: DefaultColorScheme
---

## Colors

| target | kind | fill | stroke | text | notes |
|---|---|---|---|---|---|
|  | default | #f5f5f5 | #9e9e9e | #111111 | Global fallback |
|  | application | #9bbb59 | #6f8a3f | #000000 | Global application color |
| domain | model | #A88CCF | #7E57A6 | #000000 | Domain model color |
| dfd | process | #9bbb59 | #6f8a3f | #000000 | DFD process |
| dfd | datastore | #8064a2 | #60497a | #ffffff | DFD datastore |
| app_process | decision | #f4b183 | #c55a11 | #000000 | Business Flow decision |
| weave_map | data | #eef6ff | #4f8fc9 | #111111 | Weave Map Data layer |
```

## Colors

Expected header:

```markdown
| target | kind | fill | stroke | text | notes |
|---|---|---|---|---|---|
```

Columns:

| column | required | notes |
|---|---|---|
| `target` | no | Free-form diagram target. Empty target means global kind color. |
| `kind` | yes | Free-form kind key. |
| `fill` | no | Node/subgraph fill color. |
| `stroke` | no | Border/stroke color. |
| `text` | no | Text color. |
| `notes` | no | Human-readable explanation. |

Supported color values:

* `#RGB`
* `#RRGGBB`

Invalid color values produce diagnostics.

Duplicate `target + kind` rows in the same file produce diagnostics. Empty `target` is a real duplicate key, so two empty-target rows with the same `kind` conflict.

## Resolution order

Color resolution uses this order:

1. configured `target + kind`
2. configured empty target + `kind`
3. built-in `target + kind`
4. configured empty target + `default`
5. built-in default

Target-specific rows override global rows for the same `kind`.

## defaultColorSchemeRef

`defaultColorSchemeRef` accepts a vault ref/path to a `type: color_scheme` file.

Example:

```text
[[COLOR-SCHEME-DEFAULT]]
```

If the ref is unresolved or the target file is not `type: color_scheme`, Model Weave falls back to built-in defaults and reports a warning.

## Current application targets

Current Color Scheme application:

| view | target / kind |
|---|---|
| `domains` Area / Tree | `target=domain`, `kind=<Domain.kind>` |
| `domain_diagram` Area / Tree | `target=domain`, `kind=<Domain.kind>` |
| `dfd_diagram` objects | `target=dfd`, `kind=<Objects.kind>` |
| `dfd_diagram` Domain subgraphs | `target=domain`, `kind=<Domain.kind>` |
| low_diagram nodes | 	arget=flow_diagram, kind=<Objects.kind> |
| low_diagram Domain subgraphs | 	arget=domain, kind=<Objects.domain> matching Domain kind rows |
| `app_process` Business Flow | `target=app_process`, `kind=<Steps.kind>` |
| Weave Map layer subgraphs | `target=weave_map`, `kind=ui / process / rule / rule_state / ui_message / data / mapping / implementation / data_flow / relationship / source / warning / other` |

Weave Map layer colors are target-specific. Only `target=weave_map` rows override the layer subgraph defaults; global `kind` rows and global `default` do not replace the Weave Map layer palette.

Currently not colorized:

* Mindmap
* Class
* ER
* Screen

## Applied Color Scheme

Supported previews may show an Applied Color Scheme section.

This section shows active/effective rows as a compact kind dictionary for the current view so users can confirm which colors are in use. It is display metadata only; the source `type: color_scheme` `## Colors` table keeps the `target | kind | fill | stroke | text | notes` format documented above.

PNG export preserves rendered colors where the current view supports colorized rendering.

## AI generation notes

* Keep HEX colors valid.
* Use an empty `target` for global defaults.
* Use target-specific rows when a view needs a different color for the same `kind`.
* Do not define the same `target + kind` pair more than once.
