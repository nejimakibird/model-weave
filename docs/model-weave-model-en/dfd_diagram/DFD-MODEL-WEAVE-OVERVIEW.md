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

## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| model_weave_app | Model Weave plugin | application | | Plugin area running in Obsidian |
| user_interface | User interface | ui | model_weave_app | Editor and viewer UI area |
| markdown_model | Markdown model | model | model_weave_app | Design area for Markdown files and parsed models |
| model_storage | Model datastore | data | markdown_model | Area storing Markdown files and internal models |
| rendering_pipeline | Rendering pipeline | integration | model_weave_app | Processing area for previews and exports |
| renderer_area | Renderer | renderer | rendering_pipeline | Area that generates previews |
| export_area | Export | export | rendering_pipeline | Area for PNG export and output files |
| external_user | External user | external | | User operating the plugin |

## Objects

| id | label | kind | ref | domain | notes |
|---|---|---|---|---|---|
| USER | User | external | | external_user | user operating the plugin |
| EDITOR | Obsidian Editor | process | | user_interface | interface used by the user to edit Markdown |
| MARKDOWN_FILE | Markdown Model File | datastore | | model_storage | Markdown file used as Model Weave input |
| PARSER_RESOLVER | Parser & Resolver | process | | markdown_model | process that parses Markdown and resolves models |
| INTERNAL_MODEL | Internal Model | datastore | | model_storage | internal representation of the parsed and resolved model |
| RENDERER | Renderer | process | | renderer_area | process that converts the internal model into a visual representation |
| VIEWER_UI | Model Weave Viewer UI | process | | user_interface | UI process that presents rendered results to the user |
| EXPORT_ENGINE | Export Engine | process | | export_area | process that exports the model in formats such as PNG |
| EXPORTED_FILE | Exported File | datastore | | export_area | output file such as PNG |

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
