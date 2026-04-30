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
A class that abstracts the entire Markdown file used as the source of truth in Model Weave.

## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| filePath | string | public | N | path inside the vault |
| name | string | public | N | file name |

## Methods

## Relations

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|
| REL-FILE-HAS-FRONTMATTER | CLS-MODEL-WEAVE-FRONTMATTER | composition | contains | 1 | 1 | A file has one frontmatter block |
| REL-FILE-HAS-SECTION | CLS-MODEL-WEAVE-SECTION | composition | contains | 1 | 0..* | A file has multiple sections |

## Notes
Represents the physical structure of Markdown.