---
type: class
id: CLS-MODEL-WEAVE-FRONTMATTER
name: Model Weave Frontmatter
kind: class
package: model-weave
tags:
  - ModelWeave
  - Class
---

# Model Weave Frontmatter

## Summary
YAML metadata written at the beginning of a Markdown file.

## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| type | string | public | N | model type |
| id | string | public | N | model ID |
| name | string | public | N | logical model name |
| tags | list | public | N | classification tags |
| render_mode | string | public | N | rendering option |

## Methods

## Relations

## Notes
Assumption: ID and type are the most important identifiers when resolving references between models.