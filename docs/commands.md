# Model Weave Command Reference

All Model Weave features are accessible via the Obsidian Command Palette.

In Obsidian's command palette, commands are shown with the plugin name prefix `Model Weave:`. Search for `Model Weave` to find them.

**To use a command:**
1.  Press `Ctrl + P` (Windows/Linux) or `Cmd + P` (macOS).
2.  Type "Model Weave" to filter the list.

## 1. Preview, Index & Export

| Command Name | Description | When to use |
| :--- | :--- | :--- |
| `Model Weave: Open modeling preview for active file` | Opens the graphical/structured preview for the current Markdown file. | Whenever you want to review a model or diagram. |
| `Model Weave: Rebuild modeling index` | Scans the vault to refresh relationships and diagnostics. | If you've made bulk changes to files or references aren't resolving. |
| `Model Weave: Export Current Diagram as PNG` | Saves the currently rendered diagram as a PNG file. | When you need to share a diagram in a report or presentation. |

## 2. Template Insertion

Templates help you start new models with the correct frontmatter and section structure. Note: These commands only work on empty Markdown files.

### Core Formats
- `Model Weave: Insert Class Template`: For object-oriented class definitions.
- `Model Weave: Insert Class Diagram Template`: For overview diagrams of multiple classes.
- `Model Weave: Insert ER Entity Template`: For ER (Entity Relationship) model entities.
- `Model Weave: Insert ER Diagram Template`: For ER diagrams.
- `Model Weave: Insert DFD Object Template`: For DFD processes, stores, or external entities.
- `Model Weave: Insert DFD Diagram Template`: For DFD diagrams (Mermaid-first).
- `Model Weave: Insert Flow Diagram Template`: For screen communication and data handoff flows.

### Data Modeling
- `Model Weave: Insert Data Object Template`: Use for **logical data structures** (e.g., API requests, responses, payloads, or internal application data).
- `Model Weave: Insert Data Object File Layout Template`: Use for **physical file layouts** (e.g., fixed-length files, CSV columns, or external interface files).

### Logic & UI (Experimental)
- `Model Weave: Insert App Process Template`: For server-side or batch processing units.
- `Model Weave: Insert Screen Template`: For UI design units.
- `Model Weave: Insert CodeSet Template`: For enums, states, and code lists.
- `Model Weave: Insert Message Template`: For system or UI messages.
- `Model Weave: Insert Rule Template`: For business logic and validation rules.
- `Model Weave: Insert Mapping Template`: For data transformation definitions.
- `Model Weave: Insert domains template`: For standalone Domain hierarchy definitions.
- `Model Weave: Insert domain diagram template`: For integrated diagrams that combine multiple `domains` files.
- `Model Weave: Insert color scheme template`: For reusable diagram color rules.

## 3. Editing Helpers

| Command Name | Description | When to use |
| :--- | :--- | :--- |
| `Model Weave: Insert ER Relation Block` | Appends a structured relation block to an `er_entity` file. | When adding new relationships to an existing entity. |
| `Model Weave: Complete Current Field` | Provides autocompletion for model fields. | When filling out tables in a model file. |

---

## Settings

You can configure the following in **Settings** > **Model Weave**:

- **Default render mode**: Choose between `Auto`, `Custom`, or `Mermaid`.
- **Default Flow Diagram view**: Choose `Detail` or `Screen` as the initial view for Flow Diagrams without `flow_view`. The Viewer `Flow view` selector can temporarily switch the current Flow Diagram without modifying its Markdown.
- **Default zoom**: Set the initial zoom state (`Fit` or `100%`).
- **Font size**: Adjust text size in the preview.
- **Node density**: Control how compact diagrams appear.
- **Relationship View**: Toggle the impact analysis/relationship panel.
- **UI Language**: Set captions to English or Japanese.
- **Local source root**: The base path for resolving relative `Source Links`.
