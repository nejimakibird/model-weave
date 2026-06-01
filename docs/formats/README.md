# Model Weave Format Specifications

日本語版 : [README.md](../ja/formats/README.md)

This directory contains the public format specifications for Model Weave.

These documents follow the [V0.8 Documentation Policy](../V0.8-documentation-policy.md), which defines how FORMAT documents are structured for human users, maintainers, and AI-assisted model generation.

Model Weave is a text-first modeling plugin for Obsidian. Markdown files are the source of truth. Diagrams, previews, diagnostics, Mermaid sources, SVG, and PNG exports are derived views.

## Stable / primary formats

Stable / primary formats are the recommended starting points for most users.

* [class](FORMAT-class.md)
* [class_diagram](FORMAT-class_diagram.md)
* [er_entity](FORMAT-er_entity.md)
* [er_diagram](FORMAT-er_diagram.md)
* [dfd_object](FORMAT-dfd_object.md)
* [dfd_diagram](FORMAT-dfd_diagram.md)
* [data_object](FORMAT-data_object.md)

## Experimental / evolving formats

Experimental / evolving formats are usable, but their documentation and modeling conventions may continue to change.

* [screen](FORMAT-screen.md)
* [app_process](FORMAT-app_process.md)
* [rule](FORMAT-rule.md)
* [codeset](FORMAT-codeset.md)
* [message](FORMAT-message.md)
* [mapping](FORMAT-mapping.md)

## Recommended reading order

You do not need to learn every format first. Start from the format that matches your current task.

1. [class](FORMAT-class.md) / [class_diagram](FORMAT-class_diagram.md)
2. [er_entity](FORMAT-er_entity.md) / [er_diagram](FORMAT-er_diagram.md)
3. [data_object](FORMAT-data_object.md)
4. [dfd_object](FORMAT-dfd_object.md) / [dfd_diagram](FORMAT-dfd_diagram.md)
5. [app_process](FORMAT-app_process.md)
6. Experimental formats as needed

## How FORMAT docs are organized

Each V0.8 FORMAT document should generally explain:

* what the format is for
* a minimal example
* a fuller example when useful
* supported frontmatter
* supported sections
* expected table headers
* common mistakes
* AI generation notes
* related samples

Not every format needs the same amount of detail, but the structure should be predictable.

## AI generation note

When using AI to generate Model Weave files, always follow the exact table headers defined in each FORMAT document.

Do not add undefined columns. Put extra information in `notes` or optional sections.

Common AI-safe Markdown rules:

* Keep table headers exactly as documented.
* Do not add unsupported columns such as `ref`, `rule`, `description`, or `notes` unless the FORMAT explicitly supports them.
* Quote Wikilinks in frontmatter.
* Avoid Wikilink aliases such as `[[target|label]]` inside tables.
* Avoid raw `|` characters inside table cells.
* Prefer simple scalar type names.
* Express optionality or multiplicity with supported columns such as `required`, `not_null`, or `notes`.
* Separate implemented behavior from future design ideas.
* Use Source Links to connect models back to source files when useful.

## Shared customization docs

* [CSS customization](FORMAT-css-customization.md)
* [Common sections](FORMAT-common-sections.md)

## Rendering policy summary

Model Weave separates Markdown source format from generated views.

* Custom renderers are for detailed review.
* Mermaid renderers are for overview, relationships, and flow layout.
* `render_mode` does not change the Markdown file format.
* `auto` is no longer a user-facing default render mode.
* If `render_mode` is omitted, the format-specific default render mode from settings is used.

Renderer resolution priority:

1. supported `frontmatter.render_mode`
2. format-specific default render mode from settings
3. built-in format fallback

Toolbar selection is temporary for the current view only and does not set the initial renderer for other files.

See also: [V0.8 rendering policy](../V0.8-rendering-policy.md)

## DFD note

`dfd_diagram` is Mermaid-first.

`dfd_object` remains a reusable definition / detail object. `dfd_diagram` is used for diagram and flow views.
