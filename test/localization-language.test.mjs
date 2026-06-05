import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const outputFile = "dist/test-localization-language.mjs";

await build({
  stdin: {
    contents: `
      export {
        localizeDiagnosticMessage,
        resolveModelWeaveLanguage
      } from "./src/core/current-file-diagnostics";
      export {
        formatMermaidRenderFailedMessage,
        formatNoSourceLinksFoundMessage
      } from "./src/i18n/localized-messages";
    `,
    resolveDir: ".",
    sourcefile: "test-localization-entry.ts",
    loader: "ts"
  },
  bundle: true,
  format: "esm",
  platform: "browser",
  plugins: [
    {
      name: "stub-obsidian",
      setup(buildApi) {
        buildApi.onResolve({ filter: /^obsidian$/ }, () => ({
          path: "obsidian",
          namespace: "stub"
        }));
        buildApi.onLoad({ filter: /^obsidian$/, namespace: "stub" }, () => ({
          contents: "export const getLanguage = () => 'en';",
          loader: "js"
        }));
      }
    }
  ],
  outfile: outputFile,
  logLevel: "silent"
});

const {
  formatMermaidRenderFailedMessage,
  formatNoSourceLinksFoundMessage,
  localizeDiagnosticMessage,
  resolveModelWeaveLanguage
} = await import(`../${outputFile}?t=${Date.now()}`);

test("localization language resolution falls back to English", () => {
  assert.equal(resolveModelWeaveLanguage("en"), "en");
  assert.equal(resolveModelWeaveLanguage("ja"), "ja");
  assert.equal(resolveModelWeaveLanguage("ja-JP"), "ja");
  assert.equal(resolveModelWeaveLanguage("fr"), "en");
  assert.equal(resolveModelWeaveLanguage(undefined), "en");
});

test("diagnostic formatting respects language", () => {
  const rowMessage = 'table row in section "Objects" has 2 columns, expected 5';
  const screenHeadersMessage = 'table columns in section "Fields" do not match expected screen field headers';
  const dfdMessage = 'unresolved DFD flow source "MD_FILES"';
  const duplicateFieldMessage = 'duplicate field name "record_type"';
  const layoutMessage = 'layout is empty for field "window"';
  const actionTargetMessage = 'action target "back_button" does not match any Fields.id';
  const fieldIdMessage = "field id is empty";

  assert.equal(localizeDiagnosticMessage(rowMessage, "en"), rowMessage);
  assert.equal(
    localizeDiagnosticMessage(screenHeadersMessage, "en"),
    screenHeadersMessage
  );
  assert.equal(
    localizeDiagnosticMessage(duplicateFieldMessage, "en"),
    duplicateFieldMessage
  );
  assert.equal(
    localizeDiagnosticMessage(rowMessage, "ja"),
    '"Objects" セクションのテーブル行の列数が 2 です。期待値は 5 です。'
  );
  assert.equal(
    localizeDiagnosticMessage(screenHeadersMessage, "ja"),
    '"Fields" セクションのテーブル列が期待される screen field ヘッダーと一致しません。'
  );
  assert.equal(
    localizeDiagnosticMessage(duplicateFieldMessage, "ja"),
    'フィールド名 "record_type" が重複しています。'
  );
  assert.equal(
    localizeDiagnosticMessage(layoutMessage, "ja"),
    'field "window" の layout が空です。'
  );
  assert.equal(
    localizeDiagnosticMessage(actionTargetMessage, "ja"),
    'action target "back_button" に一致する Fields.id がありません。'
  );
  assert.equal(
    localizeDiagnosticMessage(fieldIdMessage, "ja"),
    "Fields の id が空です。"
  );
  assert.equal(
    localizeDiagnosticMessage(dfdMessage, "ja-JP"),
    'DFD flow source "MD_FILES" の参照先が見つかりません。IDまたはファイル名を確認してください。'
  );
  assert.equal(localizeDiagnosticMessage(dfdMessage, "unknown"), dfdMessage);
});

test("representative UI message helpers respect language", () => {
  assert.equal(formatMermaidRenderFailedMessage("en"), "Mermaid render failed.");
  assert.equal(
    formatMermaidRenderFailedMessage("ja"),
    "Mermaid の描画に失敗しました。"
  );
  assert.equal(formatNoSourceLinksFoundMessage("en"), "No source links found.");
  assert.equal(
    formatNoSourceLinksFoundMessage("ja-JP"),
    "Source Links が見つかりません。"
  );
  assert.equal(
    formatNoSourceLinksFoundMessage("unknown"),
    "No source links found."
  );
});
