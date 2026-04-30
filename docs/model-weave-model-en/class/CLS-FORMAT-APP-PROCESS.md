---
type: class
id: CLS-FORMAT-APP-PROCESS
name: App Process Format
kind: class
package: model-weave.format
tags:
  - ModelWeave
  - Format
  - Class
---

# App Process Format

## Summary
A format for defining application process steps, including inputs, outputs, and steps.

## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| inputs | list | public | N | list of inputs to the process |
| outputs | list | public | N | list of outputs from the process |
| steps | list | public | N | list of execution steps for the process |

## Relations

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
| REL-APP-PROCESS-IS-FORMAT | CLS-MODEL-WEAVE-FORMAT | inheritance | | | | |