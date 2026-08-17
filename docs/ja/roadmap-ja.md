# Model Weave ロードマップ

このロードマップは現在の方向性を示すものであり、提供時期、対象version、リリース日を約束するものではありません。

## Current

- v0.1.22 Primary View: 上部Viewer領域でモデルと派生Weave Mapを切り替え、Details、Relationships、Diagnostics、Source Links、Mermaidはlower panelに維持。
- v0.1.22 visual Color Legend: Applied Color Schemeで、有効な行をtargetごとにgroup化し、fill、stroke、text、configured / built-inのsource情報を表示。
- v0.1.22 Flow Diagram diagnostics accuracy: local Objects IDと外部Model参照を分離。
- v0.1.22 Declarative Settings support: Obsidian 1.13+のSettings searchと従来Settings表示の互換性を維持。

## Next

- Color filter。
- Flow Diagram の使いやすさ改善。

## Later

- Communication View。
- State Machine View。
- Transition Matrix。
- View-driven Authoring。
- Source Links Explorer。
- Reference Explorer。
- Model Index View。

## Exploring

### Mobile Support

Model Weave は現在 desktop-only です。一部の desktop workflow が filesystem と Electron の操作に依存するためです。段階的な、view-focused の Mobile MVP を検討しています。初期候補は preview、diagram、diagnostics、vault navigation、Zoom/Pan/Fit です。desktop 固有の Source Links と file-opening 操作は利用できない場合があります。

Mobile Support には対象versionやリリース日の割り当てはありません。既存の GitHub Issue で追跡します。
