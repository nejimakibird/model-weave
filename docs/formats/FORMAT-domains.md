# FORMAT-domains

Japanese Version: [日本語版](../ja/formats/FORMAT-domains.md)

## What this is for

`domains` defines reusable Domain/context entries.

Use this format to model organization areas, responsibility areas, physical locations, system boundaries, data areas, operation areas, external actors/systems, and similar context groupings.

`domains` is a standalone source file. Cross-file integration and consistency checks are handled by `type: domain_diagram`, not by standalone `type: domains`.

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

Standalone `domains` validation is file-local. Use `domain_diagram` when you need to combine and compare multiple Domains files.

## AI generation notes

* Keep the table header exactly as documented.
* Do not add unsupported columns.
* Use stable lowercase or uppercase IDs consistently.
* Use `kind` values that match the intended Color Scheme.
* Use `parent` only for another Domain id in the same file.
