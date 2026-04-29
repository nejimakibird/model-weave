# Model Weave

Model Weave is an Obsidian plugin for text-first modeling.

Markdown model files are the source of truth. Diagrams, previews, diagnostics, and PNG exports are derived outputs generated from Markdown.

Model Weave is currently aimed at Obsidian Desktop workflows. Viewer behavior, Mermaid rendering, zoom/pan interactions, and PNG export are designed around the desktop plugin runtime.

## Core principles

- Markdown is the canonical design asset.
- Mermaid, SVG, preview UI, and PNG are generated views.
- Custom renderers are for detailed review.
- Mermaid renderers are for overview, relationships, and flow layout.
- Renderer choice does not change the Markdown source format.

## Stable / primary formats

- `class`
- `class_diagram`
- `er_entity`
- `er_diagram`
- `dfd_object`
- `dfd_diagram`
- `data_object`

## Experimental / evolving formats

- `screen`
- `app_process`
- `rule`
- `codeset`
- `message`
- `mapping`

Format docs index:

- [docs/formats/README.md](docs/formats/README.md)

V0.7 rendering policy:

- [docs/V0.7-rendering-policy.md](docs/V0.7-rendering-policy.md)

## V0.7 rendering policy summary

- `render_mode` values:
  - `auto`
  - `custom`
  - `mermaid`
- `auto` means “use the default renderer for this format”. It is not itself a renderer.
- Renderer selection priority:
  1. toolbar override
  2. `frontmatter.render_mode`
  3. `settings.defaultRenderMode`
  4. format default
- Toolbar selection is temporary and does not edit Markdown or frontmatter.
- Unsupported render requests fall back safely with diagnostics.

### Custom vs Mermaid

- Custom renderer:
  - detailed review views
  - row-jump/navigation heavy views
  - richer diagnostics and tables
- Mermaid renderer:
  - overview graphs
  - relation/flow readability
  - automatic layout and routing

### DFD in V0.7

- `dfd_diagram` is Mermaid-first in V0.7.
- The formal DFD diagram path is Mermaid `flowchart LR`.
- The old DFD custom renderer is treated as legacy and planned for removal later.
- DFD local objects are supported directly in `dfd_diagram.Objects`.
- DFD Mermaid does not require layout files.

## Settings

Minimal Model Weave settings currently include:

- `defaultRenderMode`
- `defaultZoom`
- `fontSize`
- `nodeDensity`

These settings affect Viewer behavior only. They do not rewrite Markdown or frontmatter.

## Installation

Model Weave is being prepared for public release, but this README does not assume that it is already available in the Obsidian Community Plugin directory.

Planned installation path after approval:

- Install from Obsidian Community Plugins once the plugin is approved and published there.

Current practical path:

- Use manual installation from this repository or a packaged release artifact.

Manual installation outline:

1. Get the repository or release files.
2. Build the plugin if needed.
3. Copy the plugin files into `.obsidian/plugins/model-weave/` in your vault.
4. Enable Model Weave in Obsidian Desktop.

## Viewer behavior

- Shared Viewer features include zoom, fit, `100%`, pan, diagnostics, upper/lower resizable panels, and PNG export.
- RenderMode selector is shown only where multiple meaningful renderers exist:
  - shown for Class / ER views
  - hidden for DFD because DFD is Mermaid-first
  - hidden for table/text-only formats
- PNG export exports the diagram body only.
- Toolbar, diagnostics panel, lower information area, and resize handle are excluded from PNG export.
- Export fits the full diagram rather than only the current zoom/pan state.

## Performance & Scale

- Very large Mermaid graphs may hit rendering or export performance limits.
- For large systems, prefer splitting diagrams into multiple files instead of putting every object into one graph.

## Mermaid safety notes

- Mermaid source is generated output, not authoring source.
- Mermaid node IDs should be safe generated internal IDs, not raw labels or wikilinks.
- Display labels should remain separate from Mermaid internal IDs.
- Mermaid labels should be quoted/escaped safely.
- Navigation should prefer Model Weave-controlled SVG post-processing rather than Mermaid click callback syntax.
- Avoid relying on unsafe Mermaid settings such as loose security only for navigation.
- Mermaid PNG export can still vary slightly depending on fonts, CSS, and device pixel ratio.

## DFD local object summary

Preferred `dfd_diagram.Objects` columns in V0.7:

| id | label | kind | ref | notes |
|---|---|---|---|---|

- `id`: diagram-local object ID
- `label`: display label
- `kind`: `external` / `process` / `datastore` / `other`
- `ref`: optional `dfd_object` reference
- `notes`: optional notes

Rules:

- `ref` empty means a valid local diagram object.
- `ref` present means a linked reusable `dfd_object` when resolvable.
- Old ref-only `Objects` format remains compatible.
- `Flows.from/to` resolve through listed `Objects`.
- Flows must not silently create missing nodes.

See:

- [docs/formats/FORMAT-dfd_diagram.md](docs/formats/FORMAT-dfd_diagram.md)
- [samples/README.md](samples/README.md)

## Repository layout

- [docs](docs/)
- [docs/formats](docs/formats/)
- [samples](samples/)
- [Templates](Templates/)
- `testdata/` (diagnostics / compatibility checks, if present in local development copies)

## Samples

Sample index:

- [samples/README.md](samples/README.md)

Useful manual checks:

- Class:
  - [samples/class/CLASSD-WMS-SERVICE.md](samples/class/CLASSD-WMS-SERVICE.md)
  - [samples/class/CLS-WMS-INVENTORY-SERVICE.md](samples/class/CLS-WMS-INVENTORY-SERVICE.md)
- ER:
  - [samples/er/ERD-WMS-CORE.md](samples/er/ERD-WMS-CORE.md)
  - [samples/er/ENT-INVENTORY.md](samples/er/ENT-INVENTORY.md)
- DFD:
  - [samples/dfd/basic/DFD-WMS-L0.md](samples/dfd/basic/DFD-WMS-L0.md)
  - [samples/dfd/local-objects/DFD-WMS-L0-LOCAL.md](samples/dfd/local-objects/DFD-WMS-L0-LOCAL.md)

## Notes for public release

- This repository contains samples and test-oriented files side by side.
- `testdata/` is for warning/unsupported/diagnostic checks and is not the main public sample set.
- Some format docs are still pending publication as standalone spec pages. The current docs index marks those cases explicitly instead of inventing partial specs here.
