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

Model Weave のバージョン0.7におけるDFD (Data Flow Diagram) のレンダリングポリシーを定義するルールです。

## Summary

このルールは、Model Weave の V0.7 において `dfd_diagram` フォーマットが Mermaid を主要かつ唯一のランタイムレンダラーとして使用することを明確にします。以前のカスタムDFDレンダラーは、このバージョンではサポートされません。

## References

| ref | usage | notes |
|---|---|---|
| [[docs/formats/FORMAT-dfd_diagram.md\|FORMAT-dfd_diagram]] | format_spec | dfd_diagram の仕様 |
| [[README.md\|Model Weave README]] | policy_summary | V0.7 rendering policy summary |

## Conditions

- `dfd_diagram` フォーマットは、V0.7 において Mermaid `flowchart LR` を正式なレンダラーとして使用する。
- `dfd_diagram` の `render_mode` が `auto` または `mermaid` の場合、Mermaid レンダラーが使用される。
- `dfd_diagram` の `render_mode` が `custom` の場合、レガシーなカスタムDFDレンダラーは使用されない。
- `render_mode: custom` が指定された場合、診断メッセージを生成し、Mermaid レンダラーにフォールバックする。
- DFDのViewer RenderModeセレクターは、DFDがランタイムでMermaid-onlyであるため非表示になる。
- レガシーなカスタムDFDレンダラーは、Mermaid DFDが安定した後に削除される予定である。

## Notes

- この rule は実行可能な判定ルールではなく、Model Weave のDFDレンダリングポリシーを rule 形式で表現したものです。
- そのため、判定入力としての Inputs は設けない。
- render_mode: custom の扱いは仕様と実装の整合確認対象である。
- このポリシーは、`docs/V0.7-rendering-policy.md` に基づいています。
- `custom renderer` の削除方針は、将来のバージョンで実施される予定です。
- `render_mode: custom` が指定された場合のフォールバック動作は、ユーザーエクスペリエンスの観点から重要です。
- `dfd_object` は単一のオブジェクト定義であり、DFDダイアグラムのレンダラーではない。