# Model Weave

Japanese Version: [README-ja.md](README-ja.md)

> Model Weave is an Obsidian plugin for reading design information written in Markdown as diagrams, previews, diagnostics, and source links.
> Markdown files are the source of truth. From those files, Model Weave generates views such as ER diagrams, Class diagrams, DFDs, business flows, and data definitions.

## What is Model Weave?

Model Weave brings structured software modeling capabilities to Obsidian.

It helps keep design assets human-readable, Git-friendly, and usable as structured context for AI-assisted implementation, documentation, and review.

## What can you use it for?

* **Structural design**: ER diagrams and Class diagrams.
* **Data flow**: DFDs and Data Object definitions.
* **Application logic**: App Process business flows, Screen definitions, and Business Rules.
* **Impact analysis**: Automatically detect relationships and dependencies across the design.

## Basic idea

### Start from what you need

You do not need to learn every model format first.

Whether you are working with a simple class definition or a complex data flow, you can start with only the model type needed for your current task.

### From rough manual design to AI-assisted detailed modeling

Model Weave supports a wide range of workflows, from rough manual design to detailed AI-assisted modeling.

You can start with simple prose or rough notes, then refine them into structured tables as the design matures.

### Automatically generate diagrams for design review

Focus on writing the design in text.

Model Weave automatically renders diagrams for overview checks and relationship review using Custom or Mermaid renderers.

### Use design documents as a map to find source code

With Source Links, design documents can become a navigation map.

You can jump from documentation to actual implementation files, including files outside the vault when configured.

## First things to try

1. Install and enable the plugin.
2. Open a sample file from the `samples/` directory.
3. Run the modeling preview and check the diagram and diagnostics.
4. Click related objects in the preview to navigate through the design.

## First commands to use

Open the Obsidian command palette (`Ctrl+P` / `Cmd+P`) and search for `Model Weave`.

Try these commands first:

* `Model Weave: Open modeling preview for active file`: Preview the active model as a diagram or structured view.
* `Model Weave: Rebuild modeling index`: Rebuild relationship information across the vault.
* `Model Weave: Export Current Diagram as PNG`: Export the current diagram as a PNG file.

> In Obsidian's command palette, commands are shown with the plugin name prefix `Model Weave:`. Search for `Model Weave` to find them.

## Where to go next

* [Getting Started](docs/getting-started.md) - A 5-minute tutorial.
* [Command Guide](docs/commands.md) - Full command and template reference.
* [Format Guide](docs/formats/README.md) - How to write each model type.
* [Samples](samples/README.md) - Example models and diagrams.
* [Japanese README](README-ja.md) - Japanese version of this document.

---

## Technical reference summary

### Core principles

* Markdown is the source of truth.
* Mermaid, SVG, and PNG are generated views.
* Custom renderers are for detailed review; Mermaid renderers are for overview.

### Rendering policy

* `render_mode`: `auto`, `custom`, and `mermaid`.
* Priority: toolbar override > frontmatter > settings > format default.
* See [docs/V0.7-rendering-policy.md](docs/V0.7-rendering-policy.md) for details.

### Main formats

* **Stable**: `class`, `er_entity`, `dfd_diagram`, `data_object`, and others.
* **Evolving**: `screen`, `app_process`, `rule`, `codeset`, and others.

### Installation

1. Open Obsidian Settings > Community plugins.
2. Search for `Model Weave`.
3. Install and enable the plugin.

### Viewer behavior

* Supports zoom, fit, pan, and real-time diagnostics.
* PNG export captures only the diagram body.

### Source Links

Source Links can point to external implementation files.

Relative paths are resolved using the `localSourceRoot` setting.

See [docs/formats/FORMAT-common-sections.md](docs/formats/FORMAT-common-sections.md) for details.

### Performance and scale

* Startup uses a lightweight index, and detailed information is loaded as needed.
* For large systems, prefer splitting diagrams into multiple files instead of putting everything into one diagram.

---

## License

Model Weave is released under the MIT License.
