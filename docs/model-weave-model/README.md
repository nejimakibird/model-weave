# Model Weave Model

このフォルダは、Model Weave の公開用 sample vault / showcase model です。Model Weave の Markdown モデルファイルで、主要なファイル種別、プレビュー、診断、Color Scheme、PNG export の代表的な使い方を確認できます。

## Summary

**重要:**

*   このフォルダ内のファイルは、Model Weave の正式な仕様ではありません。
*   Model Weave の正式な仕様は、`docs/formats/` ディレクトリ内のファイルおよびリポジトリのルートにある `README.md` です。
*   この sample vault は、Model Weave の表示例と動作確認用のサンプルとして機能します。
*   実装や形式の正確なルールを確認する場合は、正式仕様を参照してください。

## 機能ショーケース

このサンプル Vault では、Model Weave の主要な機能（`app_process` や DFD でのドメイン対応モデリング、ドメイン階層の描画、カラースキーム設定など）を実際のファイルで確認できます。これらは、バージョン 0.1.13 での改善内容を反映しています。

バージョンごとの詳細な変更点については、v0.1.13 リリースノート を参照してください。

*   Color Scheme: `color_scheme/COLOR-SCHEME-DEFAULT.md`
    *   `defaultColorSchemeRef` に `[[COLOR-SCHEME-DEFAULT]]` を設定すると、Domains / Domain Diagram / DFD / Business Flow の配色確認に使えます。
    *   空 target のグローバル行と、`domain` / `dfd` / `app_process` 向けの target-specific 行を含みます。
*   Domains: `domains/DOMAINS-COMPANY.md`, `domains/DOMAINS-MODEL-WEAVE.md`
    *   standalone `type: domains` の Mindmap / Area / Tree 表示確認に使えます。
*   Domain Diagram: `domain_diagram/DOMAIN-DIAGRAM-MODEL-WEAVE.md`
    *   複数 Domains ファイルを統合する `type: domain_diagram` の Mindmap / Area / Tree 表示確認に使えます。
    *   `Domain Sources.ref` は sample ファイル名と frontmatter `id` に合わせて、`[[DOMAINS-COMPANY]]` のように大文字小文字をそろえています。
*   DFD: `dfd_diagram/DFD-MODEL-WEAVE-OVERVIEW.md`
    *   DFD local Domains、Domain Sources、`Objects.domain` のサンプルを含み、merged Domain groups と DFD object domain colors の確認に使えます。
*   app_process: `app_process/PROC-MODEL-WEAVE-PREVIEW-FLOW.md`
    *   `Steps.domain` 配置、Domain階層、Domain group colors、Business Flow の `Steps.kind` 配色確認に使えます。

### app_process / Business Flow

*   `app_process/PROC-MODEL-WEAVE-PREVIEW-FLOW.md`
    *   Model Weave のプレビュー処理を Business Flow として表現するサンプルです。
    *   `Steps.domain` でDomain配置を行い、`Steps.kind` により step node に `target=app_process` の Color Scheme が適用されます。

各 diagram preview では、代表的な図の PNG export と、Applied Color Scheme セクションの表示を確認できます。
