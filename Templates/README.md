# Model Weave Templates

This directory contains V0.7-aligned Markdown templates for Model Weave.

Model Weave uses Markdown model files as the source of truth. Diagrams, previews, diagnostics, Mermaid output, and PNG exports are derived from Markdown.

## Template policy

- Templates are starting points, not generated outputs.
- Keep Markdown as the canonical design asset.
- Fill in IDs, names, references, and notes for your project.
- Avoid leaving placeholder IDs in real design files.
- Prefer wikilinks for cross-file references when possible.

## Format groups

### Stable / primary formats

- [class/class.template.md](class/class.template.md)
- [class/class_diagram.template.md](class/class_diagram.template.md)
- [er/er_entity.template.md](er/er_entity.template.md)
- [er/er_diagram.template.md](er/er_diagram.template.md)
- [dfd/dfd_object.template.md](dfd/dfd_object.template.md)
- [dfd/dfd_diagram.template.md](dfd/dfd_diagram.template.md)
- [data/data_object.template.md](data/data_object.template.md)

### Experimental / evolving formats

- [screen/screen.template.md](screen/screen.template.md)
- [app_process/app_process.template.md](app_process/app_process.template.md)
- [rule/rule.template.md](rule/rule.template.md)
- [codeset/codeset.template.md](codeset/codeset.template.md)
- [message/message.template.md](message/message.template.md)
- [mapping/mapping.template.md](mapping/mapping.template.md)

## Important V0.7 notes

- `dfd_diagram` uses the Mermaid runtime path in V0.7.
- `dfd_diagram.Objects` should use `id / label / kind / ref / notes`.
- `screen` transitions should be written in `Actions.transition`.
- New `screen` templates do not use an independent `Transitions` section.
- `class.Relations` starts from the current class file; it does not use a `from` column.
- `class_diagram.Relations` still uses both `from` and `to`.

## Related docs

- [Format docs](../docs/formats/README.md)
- [Japanese README](../README_JP.md)
