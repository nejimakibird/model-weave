---
type: class
id: CLS-FORMAT-CLASS
name: Class Format
kind: class
package: model-weave.format
tags:
  - ModelWeave
  - Format
  - Class
---

# Class Format

## Summary
A format for defining a single class structure, including attributes, methods, and relations.

## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| attributes | list | public | N | list of class attribute definitions |
| methods | list | public | N | list of class method definitions |
| relations | list | public | N | list of relations originating from this class |

## Relations

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
| REL-CLASS-IS-FORMAT | CLS-MODEL-WEAVE-FORMAT | inheritance | | | | |