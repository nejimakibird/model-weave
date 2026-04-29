# Model Weave フォーマット仕様

このディレクトリには、Model Weave の各種 Markdown フォーマット仕様の日本語版を配置しています。

英語版の仕様は以下を参照してください。

- [English format docs](../../formats/README.md)

## Stable / primary formats

- [class](FORMAT-class.md)
- [class_diagram](FORMAT-class_diagram.md)
- [er_entity](FORMAT-er_entity.md)
- [er_diagram](FORMAT-er_diagram.md)
- [dfd_object](FORMAT-dfd_object.md)
- [dfd_diagram](FORMAT-dfd_diagram.md)
- [data_object](FORMAT-data_object.md)

## Experimental / evolving formats

- [screen](FORMAT-screen.md)
- [app_process](FORMAT-app_process.md)
- [rule](FORMAT-rule.md)
- [codeset](FORMAT-codeset.md)
- [message](FORMAT-message.md)
- [mapping](FORMAT-mapping.md)

## 方針

- Markdown ファイルを設計の正本とします。
- 図、プレビュー、diagnostics、PNG export は Markdown から生成される派生出力です。
- Custom renderer は詳細レビュー用です。
- Mermaid renderer は俯瞰、関係、フロー表示用です。
- DFD は V0.7 では Mermaid-first / Mermaid-only です。