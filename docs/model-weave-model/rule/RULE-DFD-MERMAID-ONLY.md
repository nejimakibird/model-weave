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

Model Weave における現在の DFD (Data Flow Diagram) レンダリングポリシーを定義するルールです。

## Summary

このルールは、`dfd_diagram` フォーマットが Mermaid を主要かつ唯一のランタイムレンダラーとして使用することを明確にします。

## References

| ref | usage | notes |
|---|---|---|
| [[docs/formats/FORMAT-dfd_diagram.md\|FORMAT-dfd_diagram]] | format_spec | dfd_diagram の仕様 |
| [[docs/V0.8-rendering-policy.md\|V0.8 rendering policy]] | policy_summary | 現在のレンダリングポリシー概要 |

## Conditions

- `dfd_diagram` フォーマットは、Mermaid `flowchart LR` を正式なレンダラーとして使用する。
- `dfd_diagram` の `render_mode` が省略された場合、設定画面のフォーマット別デフォルトレンダーモードが使われる。
- `dfd_diagram` の `render_mode` が `mermaid` の場合、Mermaid レンダラーが使用される。
- 未サポートまたは非推奨のレンダーモードは診断メッセージを生成し、安全にフォールバックする。
- DFDのViewer RenderModeセレクターは、DFDがランタイムでMermaid-onlyであるため非表示になる。

## Notes

- この rule は実行可能な判定ルールではなく、Model Weave のDFDレンダリングポリシーを rule 形式で表現したものです。
- そのため、判定入力としての Inputs は設けない。
- 未サポートの render_mode の扱いは仕様と実装の整合確認対象である。
- このポリシーは、`docs/V0.8-rendering-policy.md` に基づいています。
- 未サポートの render_mode に対する安全なフォールバック動作は、ユーザーエクスペリエンスの観点から重要です。
- `dfd_object` は単一のオブジェクト定義であり、DFDダイアグラムのレンダラーではない。
