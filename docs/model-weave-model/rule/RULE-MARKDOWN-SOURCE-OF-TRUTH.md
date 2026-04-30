---
type: rule
id: RULE-MARKDOWN-SOURCE-OF-TRUTH
name: Markdown is the Canonical Design Asset
kind: business_rule
tags:
  - ModelWeave
  - CorePrinciple
---

# Markdown is the Canonical Design Asset

Model Weave のコア原則の一つである「Markdownが正本である」という方針を定義するルールです。

## Summary

このルールは、Model Weave における情報源の階層を明確にします。Markdownファイルに記述されたモデルが唯一の真実であり、そこから生成される様々なビュー（Mermaid、SVG、プレビューUI、PNGエクスポートなど）は、そのMarkdownから派生した出力に過ぎません。

## References

| ref | usage | notes |
|---|---|---|
| [[README.md\|Model Weave README]] | core_principle | Markdown is the canonical design asset |
| [[docs/formats/README.md\|Format docs index]] | format_index | Model Weave format documentation |

## Conditions

- Model Weave のすべてのモデル情報はMarkdownファイルに記述される。
- Markdownファイルは、モデルの構造、属性、関係、およびその他の詳細を定義する唯一の権威ある情報源である。
- Mermaid、SVG、プレビューUI、PNGエクスポートなどの視覚的な表現は、Markdownファイルの内容から自動的に生成される。
- これらの生成されたビューは、Markdownファイルの内容を視覚化するためのものであり、直接編集されるべきではない。
- 生成されたビューの変更は、元のMarkdownファイルに反映されない。
- ユーザーは、モデルの変更を行う際には常にMarkdownファイルを直接編集する。

## Notes

- この rule は実行可能な判定ルールではなく、Model Weave の設計原則を rule 形式で表現したものです。
- そのため、判定入力としての Inputs は設けない。
- この原則は、Model Weave の「text-first modeling」アプローチの基盤です。
- このルールは、Model Weave の設計思想とユーザーのワークフローに大きな影響を与えます。