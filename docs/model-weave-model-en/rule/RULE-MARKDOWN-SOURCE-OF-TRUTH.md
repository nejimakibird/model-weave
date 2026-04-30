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

A rule that defines one of Model Weave's core principles: Markdown is the source of truth.

## Summary

This rule clarifies the source hierarchy in Model Weave. The model written in Markdown files is the only source of truth, and generated views such as Mermaid, SVG, preview UI, and PNG export are merely derived outputs from that Markdown.

## References

| ref | usage | notes |
|---|---|---|
| [[Samples/README\|Model Weave README]] | core_principle | Markdown is the canonical design asset |
| [[docs/formats/README.md\|Format docs index]] | format_index | Model Weave format documentation |

## Conditions

- All Model Weave model information is written in Markdown files.
- Markdown files are the single authoritative source for model structure, attributes, relations, and other details.
- Visual representations such as Mermaid, SVG, preview UI, and PNG export are automatically generated from the Markdown file content.
- These generated views are for visualizing the Markdown file content and should not be edited directly.
- Changes to generated views are not reflected back into the original Markdown file.
- Users always edit the Markdown file directly when changing a model.

## Notes

- This rule is not an executable decision rule; it expresses a Model Weave design principle in rule format.
- Therefore, it does not define Inputs as decision inputs.
- This principle is the foundation of the Model Weave text-first modeling approach.
- This rule strongly affects the Model Weave design philosophy and user workflow.