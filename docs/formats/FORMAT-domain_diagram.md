# FORMAT-domain_diagram

Japanese Version: [日本語版](../ja/formats/FORMAT-domain_diagram.md)

## What this is for

`domain_diagram` defines an integrated view over multiple standalone `type: domains` files.

Use it when you want to select reusable Domain definitions, merge them into one preview, and check the whole structure visually.

`domain_diagram` is a diagram/selective view. The reusable Domain entries remain in `type: domains` files.

## Minimal example

```markdown
---
type: domain_diagram
id: DOMAIN-DIAGRAM-MODEL-WEAVE
name: ModelWeaveDomainDiagram
---

## Domain Sources

| ref | notes |
|---|---|
| [[DOMAINS-COMPANY]] | User and team context |
| [[DOMAINS-MODEL-WEAVE]] | Model Weave internal areas |
```

## Domain Sources

Expected header:

```markdown
| ref | notes |
|---|---|
```

Columns:

| column | required | notes |
|---|---|---|
| `ref` | yes | Wikilink, file basename, frontmatter `id`, or vault path for a `type: domains` file. |
| `notes` | no | Human-readable explanation. |

Source refs should match the target file basename or frontmatter id, including case.

Recommended convention:

```text
file name: DOMAINS-COMPANY.md
frontmatter id: DOMAINS-COMPANY
Domain Source ref: [[DOMAINS-COMPANY]]
```

Source order matters. When duplicate Domain ids appear, later sources win for rendering. Diagnostics still report duplicates and conflicts.

## Diagnostics

Model Weave reports diagnostics for:

* missing `ref`
* unresolved `ref`
* source is not `type: domains`
* source has no Domain rows
* duplicate Domain id
* `name` conflict
* `kind` conflict
* `parent` conflict

`description` conflicts are currently ignored to reduce noise.

Duplicate/conflict diagnostics are warnings so that users can still inspect the merged view.

## Supported views

`domain_diagram` supports:

* Mindmap
* Area
* Tree

All three views support PNG export.

## Color Scheme

Area and Tree views use Color Scheme rows with:

* `target=domain`
* `kind=<Domain.kind>`

Mindmap currently does not apply Color Scheme colors.

The preview may show an Applied Color Scheme section so users can confirm the active/effective rows for the current view.

## Default view mode

Domains and Domain Diagram default modes can be configured in plugin settings.

Allowed modes:

* `mindmap`
* `area`
* `tree`

If a setting is missing or invalid, Model Weave falls back to `mindmap`.

## AI generation notes

* Keep `Domain Sources.ref` casing aligned with file names and frontmatter IDs.
* Put one source per row.
* Use source order intentionally when duplicate Domain ids are expected.
* Keep reusable Domain rows in `type: domains` files.
