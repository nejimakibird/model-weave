---
type: dfd_diagram
id: DFD-SAMPLE-L0
name: Sample DFD
level: 0
render_mode: auto
tags:
  - DFD
  - Diagram
---

# Sample DFD

## Summary

Describe the data flow diagram scope.

## Objects

| id | label | kind | ref | notes |
|---|---|---|---|---|
| EXTERNAL | External System | external |  | Local object |
| PROCESS | Sample Process | process | [[DFD-PROC-SAMPLE]] | Referenced reusable object |
| STORE | Sample Data Store | datastore |  | Local object |

## Flows

| id | from | to | data | notes |
|---|---|---|---|---|
| FLOW-001 | EXTERNAL | PROCESS | Sample Input Data |  |
| FLOW-002 | PROCESS | STORE | Sample Stored Data |  |

## Notes

- In V0.7, `dfd_diagram` uses the Mermaid runtime path.
- `ref` can be empty for valid local objects.
- `Flows.from` and `Flows.to` must resolve through listed `Objects`.
- Flows do not silently create missing nodes.
