---
type: class
id: CLS-FORMAT-MESSAGE
name: Message Format
kind: class
package: model-weave.format
tags:
  - ModelWeave
  - Format
  - Class
---

# Message Format

## Summary
システムで使用するメッセージ（文言、レベル等）を定義するためのフォーマットです。

## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| messages | list | public | N | メッセージ定義のリスト |

## Relations

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
| REL-MESSAGE-IS-DATA | CLS-MODEL-WEAVE-DATA-FORMAT | inheritance | | | | |