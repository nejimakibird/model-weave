# Model Weave Format Specifications

This directory contains the public V0.7 format specifications for Model Weave.

Model Weave is a text-first modeling plugin for Obsidian. Markdown files are the source of truth. Diagrams, previews, diagnostics, Mermaid sources, SVG, and PNG exports are derived views.

## Stable / primary formats

- [class](FORMAT-class.md)
- [class_diagram](FORMAT-class_diagram.md)
- [er_entity](FORMAT-er_entity.md)
- [er_diagram](FORMAT-er_diagram.md)
- [dfd_object](FORMAT-dfd_object.md)
- [dfd_diagram](FORMAT-dfd_diagram.md)
- [data_object](FORMAT-data_object.md)

## Experimental / evolving formats

- [screen](FORMAT-screen.md)
- [app_process](FORMAT-app_process.md)
- [rule](FORMAT-rule.md)
- [codeset](FORMAT-codeset.md)
- [message](FORMAT-message.md)
- [mapping](FORMAT-mapping.md)

## Rendering policy summary

- Custom renderers are for detailed review.
- Mermaid renderers are for overview, relationships, and flow layout.
- `render_mode` does not change the Markdown file format.
- `auto` is not a renderer. It means “use the default renderer for this format”.

Renderer resolution priority:

1. toolbar override
2. `frontmatter.render_mode`
3. `settings.defaultRenderMode`
4. format default

## DFD note

In V0.7, `dfd_diagram` is Mermaid-only at runtime. The legacy DFD custom renderer has been removed from the runtime path. `dfd_object` remains a reusable definition/detail object.
