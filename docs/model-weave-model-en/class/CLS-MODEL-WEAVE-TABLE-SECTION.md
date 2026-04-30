---
type: class
id: CLS-MODEL-WEAVE-TABLE-SECTION
name: Model Weave Table Section
kind: class
package: model-weave
tags:
  - ModelWeave
  - Class
---

# Model Weave Table Section

## Summary
A section that defines model attributes and relations using Markdown tables.

## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| headers | list | public | N | list of table column names |
| rows | list | public | N | table row data (array of objects) |

## Methods

## Relations

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
| REL-TABLE-IS-SECTION | CLS-MODEL-WEAVE-SECTION | inheritance | | | | section specialization |

## Notes
A primary target of Model Weave parsing.