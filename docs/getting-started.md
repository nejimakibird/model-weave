# Getting Started with Model Weave

Follow this guide to set up Model Weave and view your first software design model in Obsidian in under 5 minutes.

In Obsidian's command palette, commands are shown with the plugin name prefix `Model Weave:`. Search for `Model Weave` to find them.

## 1. Install and Enable

1.  Open Obsidian.
2.  Go to **Settings** > **Community plugins**.
3.  Click **Browse** and search for `Model Weave`.
4.  Click **Install**, then **Enable**.

## 2. Open a Sample Model

Model Weave is text-first. To see it in action, open one of the provided sample files in your vault (or copy one from the samples/ directory). 

For example, try opening the Inventory ER Entity file: `samples/er/ENT-INVENTORY.md`.

## 3. Launch the Preview

1.  Ensure the sample model file is active in your editor.
2.  Open the **Command Palette**:
    - **Windows/Linux**: `Ctrl + P`
    - **macOS**: `Cmd + P`
3.  Search for `Model Weave: Open modeling preview for active file` and press `Enter`.

## 4. Explore the Viewer

- **Diagnostics**: Check the bottom panel for any parsing warnings or errors.
- **Navigation**: Click on related objects in the preview to jump to their Markdown files.
- **Export**: Run the command `Model Weave: Export Current Diagram as PNG` to save the current view.
- **Source Links**: If the model has a `## Source Links` section, try the "Open" or "Copy Path" actions to navigate to your actual source code.