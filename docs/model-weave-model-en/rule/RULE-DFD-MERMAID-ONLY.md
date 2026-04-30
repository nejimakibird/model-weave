---
type: rule
id: RULE-DFD-MERMAID-ONLY
name: DFD is Mermaid-First/Mermaid-Only in V0.7
kind: rendering_policy
tags:
  - ModelWeave
  - DFD
  - V0.7
---

# DFD is Mermaid-First/Mermaid-Only in V0.7

A rule that defines the DFD (Data Flow Diagram) rendering policy in Model Weave version 0.7.

## Summary

This rule clarifies that in Model Weave V0.7, the `dfd_diagram` format uses Mermaid as the primary and only runtime renderer. The previous custom DFD renderer is not supported in this version.

## References

| ref | usage | notes |
|---|---|---|
| [[docs/formats/FORMAT-dfd_diagram.md\|FORMAT-dfd_diagram]] | format_spec | dfd_diagram specification |
| [[Samples/README\|Model Weave README]] | policy_summary | V0.7 rendering policy summary |

## Conditions

- The `dfd_diagram` format uses Mermaid `flowchart LR` as the formal renderer in V0.7.
- When `render_mode` for `dfd_diagram` is `auto` or `mermaid`, the Mermaid renderer is used.
- When `render_mode` for `dfd_diagram` is `custom`, the legacy custom DFD renderer is not used.
- When `render_mode: custom` is specified, diagnostics are generated and rendering falls back to Mermaid.
- The DFD Viewer RenderMode selector is hidden because DFD is Mermaid-only at runtime.
- The legacy custom DFD renderer is planned for removal after Mermaid DFD stabilizes.

## Notes

- This rule is not an executable decision rule; it expresses the Model Weave DFD rendering policy in rule format.
- Therefore, it does not define Inputs as decision inputs.
- The handling of `render_mode: custom` is subject to specification/implementation consistency review.
- This policy is based on `docs/V0.7-rendering-policy.md`.
- The removal policy for `custom renderer` is planned for a future version.
- The fallback behavior when `render_mode: custom` is specified is important for user experience.
- `dfd_object` is a single object definition, not a renderer for DFD diagrams.