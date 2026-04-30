---
type: dfd_diagram
id: DFD-MODEL-WEAVE-OVERVIEW
name: Model Weave Processing Overview
level: 0
tags:
  - ModelWeave
  - DFD
---

# Model Weave Processing Overview

A high-level data flow diagram showing how Markdown model files are processed in the Model Weave plugin.

## Summary

This DFD shows how Markdown source files are parsed, converted into internal models, and finally displayed as previews or exports. It highlights data flows among major processes, datastores, and external entities.

## Objects

| id | label | kind | ref | notes |
|---|---|---|---|---|
| USER | User | external | | user operating the plugin |
| EDITOR | Obsidian Editor | process | | interface used by the user to edit Markdown |
| MARKDOWN_FILE | Markdown Model File | datastore | | Markdown file used as Model Weave input |
| PARSER_RESOLVER | Parser & Resolver | process | | process that parses Markdown and resolves models |
| INTERNAL_MODEL | Internal Model | datastore | | internal representation of the parsed and resolved model |
| RENDERER | Renderer | process | | process that converts the internal model into a visual representation |
| VIEWER_UI | Model Weave Viewer UI | process | | UI process that presents rendered results to the user |
| EXPORT_ENGINE | Export Engine | process | | process that exports the model in formats such as PNG |
| EXPORTED_FILE | Exported File | datastore | | output file such as PNG |

## Flows

| id | from | to | data | notes |
|---|---|---|---|---|
| FLOW-USER-EDIT | USER | EDITOR | Edit Command | edit operation by the user |
| FLOW-EDITOR-TO-FILE | EDITOR | MARKDOWN_FILE | Markdown Content | saving edited content |
| FLOW-FILE-TO-PARSER | MARKDOWN_FILE | PARSER_RESOLVER | Markdown Content | loading the model file |
| FLOW-PARSER-TO-MODEL | PARSER_RESOLVER | INTERNAL_MODEL | Parsed Model | storing the parsed model as an internal model |
| FLOW-MODEL-TO-RENDERER | INTERNAL_MODEL | RENDERER | Internal Model | model for preview |
| FLOW-RENDERER-TO-UI | RENDERER | VIEWER_UI | Rendered Preview | rendered data |
| FLOW-UI-TO-USER | VIEWER_UI | USER | Visual Feedback | preview display |
| FLOW-USER-EXPORT | USER | EXPORT_ENGINE | Export Command | export command |
| FLOW-MODEL-TO-EXPORT | INTERNAL_MODEL | EXPORT_ENGINE | Internal Model | model for export |
| FLOW-EXPORT-TO-FILE | EXPORT_ENGINE | EXPORTED_FILE | Exported Data | file output such as PNG |

## Notes

- By using EDITOR, the diagram avoids a direct flow from external to datastore.
- The flow from EXPORTED_FILE to USER is not represented in this L0 DFD.
- Parser & Resolver represents both parsing and reference resolution, so internal reference-resolution loops are not shown.
- This DFD is an L0 diagram that abstracts the main Model Weave processing flow; detailed internal processing should be represented in lower-level DFDs.