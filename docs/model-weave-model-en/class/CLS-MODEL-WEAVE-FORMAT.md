---
type: class
id: CLS-MODEL-WEAVE-FORMAT
name: Model Weave Format
kind: class
package: model-weave
tags:
  - ModelWeave
  - Class
---

# Model Weave Format

## Summary
An abstract concept representing the model formats supported by Model Weave, such as class and er_diagram.

## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| type | string | public | N | format identifier, for example class |
| id | string | public | N | unique format identifier |
| name | string | public | N | display name |
| requiredFrontmatter | list | public | N | required frontmatter fields |
| category | string | public | N | stable / experimental |
| rendererRole | string | public | N | recommended renderer type |

## Methods

## Relations

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
| REL-FORMAT-DEFINES-FILE | CLS-MODEL-WEAVE-MODEL-FILE | association | defines structure | 1 | 1 | A format defines the structure of a model file |

## Notes
Assumption: In the implementation, this likely corresponds to schema definition classes for each format.