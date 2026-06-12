# FORMAT-domains

Japanese Version: [日本語版](../ja/formats/FORMAT-domains.md)

## What this is for

`domains` defines reusable Domain/context entries.

Use this format to model organization areas, responsibility areas, physical locations, system boundaries, data areas, operation areas, external actors/systems, and similar context groupings.

`domains` is a standalone source file. In-file validation checks each file's own rows. The preview may also show vault-wide duplicate or conflict warnings when other `domains` files define the same Domain id. Use `type: domain_diagram` when you want an explicit integration view that combines selected `domains` files.

## Minimal example

```markdown
---
type: domains
id: DOMAINS-MODEL-WEAVE
name: ModelWeaveDomains
---

## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| model_weave | Model Weave | application | | Plugin boundary |
| markdown_model | Markdown model | model | model_weave | Markdown-based model files |
| renderer | Renderer | renderer | model_weave | Preview rendering area |
```

## Frontmatter

Required fields:

| field | required | notes |
|---|---|---|
| `type` | yes | Must be `domains`. |
| `id` | no | Recommended stable file-level ID. |
| `name` | no | Display name for the Domains file. |
| `render_mode` | no | Optional initial view mode. Use canonical values `mindmap`, `area`, or `tree`. Values are case-insensitive for convenience. |

## Sections

### Domains

Use `## Domains` to define Domain rows.

Expected header:

```markdown
| id | name | kind | parent | description |
|---|---|---|---|---|
```

Columns:

| column | required | notes |
|---|---|---|
| `id` | yes | Stable Domain id, unique within the file. |
| `name` | no | Display name. If empty, `id` may be used as fallback. |
| `kind` | no | Free-form Domain kind used by supported Color Scheme views. |
| `parent` | no | References another Domain id in the same file. |
| `description` | no | Human-readable explanation. |

`kind` is free-form. Keep values consistent within a vault when you want Color Scheme rows to apply predictably.

`parent` references another Domain id in the same file. It is used to build nested Mindmap, Area, and Tree views.

## Supported views

`domains` supports:

* Mindmap
* Area
* Tree

All three views support PNG export.

Canonical frontmatter values:

```yaml
render_mode: mindmap
render_mode: area
render_mode: tree
```

Values are case-insensitive for convenience. Use stable internal values in frontmatter, not localized labels.

## Color Scheme

Area and Tree views use Color Scheme rows with:

* `target=domain`
* `kind=<Domain.kind>`

Mindmap currently does not apply Color Scheme colors.

The preview may show an Applied Color Scheme section so users can confirm the active/effective kind colors.

## Validation

Model Weave reports diagnostics for:

* missing `id`
* duplicate `id` in the same file
* unknown `parent`
* self-parent
* parent cycle

In-file validation covers duplicate ids within the same file and parent references inside that file. Standalone `domains` previews may also show vault-wide relationship, duplicate, or conflict warnings when other `domains` files define the same id. These warnings help catch accidental drift without making a standalone file the integration view.

Use `domain_diagram` when you need to explicitly combine and compare multiple Domains files in one selected view.

## AI generation notes

* Keep the table header exactly as documented.
* Do not add unsupported columns.
* Use stable lowercase or uppercase IDs consistently.
* Use `kind` values that match the intended Color Scheme.
* Use `parent` only for another Domain id in the same file.
