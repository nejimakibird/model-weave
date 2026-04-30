---
type: class
id: CLS-MODEL-WEAVE-DATA-FORMAT
name: Model Weave Data Format
kind: class
package: model-weave
tags:
  - ModelWeave
  - Class
---

# Model Weave Data Format

## Summary
A format category for defining data structures, such as data_object and er_entity.

## Attributes

## Methods

## Relations

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
| REL-DATA-IS-FORMAT | CLS-MODEL-WEAVE-FORMAT | inheritance | | | | format specialization |
| REL-DATA-HAS-TABLES | CLS-MODEL-WEAVE-TABLE-SECTION | association | contains | 1 | 1..* | Data formats usually have multiple table sections |

## Notes
Fields and Attributes tables are the primary sections in these formats.