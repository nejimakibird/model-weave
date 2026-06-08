---
type: domains
id: DOMAINS-MODEL-WEAVE
name: ModelWeaveDomains
tags:
  - ModelWeave
  - Domains
---

# ModelWeaveDomains

## Summary

Domain definitions for the main internal areas of Model Weave, useful for Domain Diagram and DFD color checks.

## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| model_weave_app | Model Weave plugin | application | | Plugin area running in Obsidian |
| markdown_model | Markdown model | model | model_weave_app | Design area for Markdown files and parsed models |
| parser_resolver | Parser & Resolver | model | markdown_model | Area that parses Markdown and resolves references |
| model_storage | Internal model | data | markdown_model | Parsed model and datastore area |
| rendering_pipeline | Rendering pipeline | integration | model_weave_app | Processing area connecting previews, Mermaid, and PNG export |
| renderer_area | Renderer | renderer | rendering_pipeline | Area that generates Mermaid and tree views |
| viewer_ui | Model Weave Viewer UI | ui | model_weave_app | Area that presents previews to users |
| export_engine | Export Engine | export | rendering_pipeline | Area that runs PNG export |
| export_output | Export output | export | export_engine | Generated files such as PNG exports |
