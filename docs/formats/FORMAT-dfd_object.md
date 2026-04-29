# FORMAT-dfd_object

## Purpose

`dfd_object` defines a reusable single object used by DFD diagrams.

Typical DFD object kinds:

- external entity
- process
- datastore

Data flows are not defined in `dfd_object`. Flow definitions belong to `dfd_diagram`.

## Core policy

- A `dfd_object` file has `type: dfd_object`.
- One file defines one reusable DFD object.
- The object kind is stored in `kind`.
- Data flows are defined in `dfd_diagram`, not here.
- `dfd_object` is a definition/detail object, not a diagram renderer target.
- In V0.7, `dfd_diagram` is Mermaid-only at runtime.

## Frontmatter

Required:

- `type`
- `id`
- `name`
- `kind`

Optional:

- `tags`

Expected `kind` values:

- `external`
- `process`
- `datastore`
- `other`

Example:

```yaml
---
type: dfd_object
id: DFD-PROC-ORDER-RECEIVE
name: Order Receive
kind: process
tags:
  - DFD
  - Process
---
```

## Recommended structure

```text
# <object name>

## Summary

## Notes
```

## Summary

Describe the role of the object.

Example:

```markdown
## Summary

Receives order data from an API or screen input and passes it to downstream processing.
```

## Notes

Free-form notes.

## Relationship with dfd_diagram

A `dfd_diagram` may reference a `dfd_object` from its `Objects.ref` column.

Example:

```markdown
| id | label | kind | ref | notes |
|---|---|---|---|---|
| ORDER_RECEIVE | Order Receive | process | [[dfd/DFD-PROC-ORDER-RECEIVE]] | reusable process |
```

A `dfd_diagram` may also define local objects without a `ref`. Use `dfd_object` when you want a reusable object definition.

## Validation candidates

Error candidates:

- missing `id`
- missing `name`
- missing `kind`

Warning candidates:

- unknown `kind`
- object is never referenced by any known diagram

## Complete example

```markdown
---
type: dfd_object
id: DFD-PROC-ORDER-RECEIVE
name: Order Receive
kind: process
tags:
  - DFD
  - Process
---

# Order Receive

## Summary

Receives order information from an API or screen input and passes it to downstream processing.

## Notes

- Treated as a main process in Level 0 diagrams.
```
