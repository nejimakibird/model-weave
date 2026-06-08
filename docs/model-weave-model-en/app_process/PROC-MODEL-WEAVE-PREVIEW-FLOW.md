---
type: app_process
id: PROC-MODEL-WEAVE-PREVIEW-FLOW
name: Model Weave preview flow
tags:
  - ModelWeave
  - AppProcess
  - BusinessFlow
---

# Model Weave preview flow

## Summary

This Business Flow sample shows how Model Weave reads a Markdown model, renders a preview, and exports the active diagram as PNG.

Because `Steps.kind` uses `start` / `process` / `decision` / `end`, the `target=app_process` Color Scheme rows are applied.

## Steps

| id | lane | label | kind | input | output | rule | invoke | screen | notes |
|---|---|---|---|---|---|---|---|---|---|
| start | User | Start | start | Markdown file | Preview request | | | | Open the Markdown file to preview. |
| open_model | Obsidian | Open Markdown model | process | Markdown file | File content | | | | Read the current file content. |
| detect_type | Model Weave | Detect model type | process | File content | Model type | | | | Detect the preview type from frontmatter `type`. |
| parse_sections | Model Weave | Parse model sections | process | File content | Parsed sections | | | | Parse tables and definition sections. |
| resolve_refs | Model Weave | Resolve references | process | Parsed sections | Resolved model | | | | Resolve refs, Domain Sources, and related links. |
| choose_renderer | Model Weave | Choose renderer | process | Resolved model | Renderer | | | | Select DFD, Domains, Business Flow, or another renderer. |
| render_preview | Model Weave | Render preview | process | Renderer | Rendered preview | | | | Render the view with Mermaid or a custom renderer. |
| export_needed | User | Export PNG? | decision | Rendered preview | Export decision | | | | Decide whether to export the active diagram. |
| export_png | Model Weave | Export PNG | process | Rendered preview | PNG file | | | | Save the currently displayed diagram as PNG. |
| continue_editing | User | Continue editing | process | Rendered preview | Updated Markdown | | | | Update the Markdown model and review again. |
| end | User | End | end | PNG file | Review complete | | | | Finish preview review. |

## Flows

| from | to | condition | label | notes |
|---|---|---|---|---|
| start | open_model | | | |
| open_model | detect_type | | | |
| detect_type | parse_sections | | | |
| parse_sections | resolve_refs | | | |
| resolve_refs | choose_renderer | | | |
| choose_renderer | render_preview | | | |
| render_preview | export_needed | | | |
| export_needed | export_png | Yes | Yes | Export is needed. |
| export_needed | continue_editing | No | No | Continue editing. |
| export_png | end | | | |
| continue_editing | open_model | Update | Update | Recheck after updating the model. |
