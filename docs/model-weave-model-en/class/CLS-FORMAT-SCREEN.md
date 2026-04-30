---
type: class
id: CLS-FORMAT-SCREEN
name: Screen Format
kind: class
package: model-weave.format
tags:
  - ModelWeave
  - Format
  - Class
---

# Screen Format

## Summary
A format for defining UI screen elements, such as fields and actions.

## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| fields | list | public | N | list of screen fields |
| actions | list | public | N | list of screen actions |

## Relations

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
| REL-SCREEN-IS-FORMAT | CLS-MODEL-WEAVE-FORMAT | inheritance | | | | |