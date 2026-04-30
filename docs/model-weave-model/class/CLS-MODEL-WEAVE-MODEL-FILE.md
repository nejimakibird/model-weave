---
type: class
id: CLS-MODEL-WEAVE-MODEL-FILE
name: Model Weave Model File
kind: class
package: model-weave
tags:
  - ModelWeave
  - Class
---

# Model Weave Model File

## Summary
Model Weaveの正本であるMarkdownファイル全体を抽象化したクラスです。

## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| filePath | string | public | N | Vault内のパス |
| name | string | public | N | ファイル名 |

## Methods

## Relations

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
| REL-FILE-HAS-FRONTMATTER | CLS-MODEL-WEAVE-FRONTMATTER | composition | contains | 1 | 1 | ファイルは1つのフロントマターを持つ |
| REL-FILE-HAS-SECTION | CLS-MODEL-WEAVE-SECTION | composition | contains | 1 | 0..* | ファイルは複数のセクションを持つ |

## Notes
Markdownの物理構造を表します。