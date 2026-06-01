---
type: rule
id: RULE-DFD-MERMAID-ONLY
name: DFD is Mermaid-First/Mermaid-Only
kind: rendering_policy
tags:
  - ModelWeave
  - DFD
  - V0.8
---

# DFD is Mermaid-First/Mermaid-Only

A rule that defines the current DFD (Data Flow Diagram) rendering policy in Model Weave.

## Summary

This rule clarifies that the `dfd_diagram` format uses Mermaid as the primary and only runtime renderer.

## References

| ref | usage | notes |
|---|---|---|
| [[docs/formats/FORMAT-dfd_diagram.md\|FORMAT-dfd_diagram]] | format_spec | dfd_diagram specification |
| [[docs/V0.8-rendering-policy.md\|V0.8 rendering policy]] | policy_summary | Current rendering policy summary |

## Conditions

- The `dfd_diagram` format uses Mermaid `flowchart LR` as the formal renderer.
- When `render_mode` for `dfd_diagram` is omitted, the format-specific default render mode from settings is used.
- When `render_mode` for `dfd_diagram` is `mermaid`, the Mermaid renderer is used.
- Unsupported or deprecated render modes should generate diagnostics and fall back safely.
- The DFD Viewer RenderMode selector is hidden because DFD is Mermaid-only at runtime.

## Notes

- This rule is not an executable decision rule; it expresses the Model Weave DFD rendering policy in rule format.
- Therefore, it does not define Inputs as decision inputs.
- The handling of unsupported render modes is subject to specification/implementation consistency review.
- This policy is based on `docs/V0.8-rendering-policy.md`.
- Safe fallback behavior for unsupported render modes is important for user experience.
- `dfd_object` is a single object definition, not a renderer for DFD diagrams.
