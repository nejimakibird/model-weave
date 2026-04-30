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
アプリケーションの処理手順（入力、出力、ステップ）を定義するためのフォーマットです。

## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| inputs | list | public | N | 処理への入力リスト |
| outputs | list | public | N | 処理からの出力リスト |
| steps | list | public | N | 処理の実行ステップリスト |

## Relations

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
| REL-APP-PROCESS-IS-FORMAT | CLS-MODEL-WEAVE-FORMAT | inheritance | | | | |