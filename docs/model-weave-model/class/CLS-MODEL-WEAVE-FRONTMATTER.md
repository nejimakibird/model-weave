---
type: class
id: CLS-MODEL-WEAVE-FRONTMATTER
name: Model Weave Frontmatter
kind: class
package: model-weave
tags:
  - ModelWeave
  - Class
---

# Model Weave Frontmatter

## Summary
Markdownファイルの先頭に記述されるYAML形式のメタ情報です。

## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|
| type | string | public | N | モデルのタイプ |
| id | string | public | N | モデルのID |
| name | string | public | N | モデルの論理名 |
| tags | list | public | N | 分類タグ |
| render_mode | string | public | N | レンダリング指定（オプション） |

## Methods

## Relations

## Notes
推測: モデル間の参照解決において、IDとタイプは最も重要な識別情報です。