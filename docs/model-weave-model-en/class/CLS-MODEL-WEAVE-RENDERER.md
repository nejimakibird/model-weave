---
type: class
id: CLS-MODEL-WEAVE-RENDERER
name: Model Weave Renderer
kind: class
package: model-weave
tags:
  - ModelWeave
  - Class
---

# Model Weave Renderer

## Summary
Responsible for converting model data into a visual preview.

## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| name | string | public | N | renderer name (custom / mermaid) |
| targetFormat | string | public | N | target format |

## Methods

| name | parameters | returns | visibility | static | notes |
|---|---|---|---|---|---|
| render | model: CLS-MODEL-WEAVE-FORMAT | UIElement | public | N | converts a model into a rendered UI element |

## Relations

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
| REL-RENDERER-INPUT | CLS-MODEL-WEAVE-FORMAT | dependency | takes input | 1 | 1 | The renderer takes a format definition as input |

## Notes
Assumption: From V0.7, the renderer is selected based on `render_mode`.