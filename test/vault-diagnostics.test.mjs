import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const outputFile = "dist/test-vault-diagnostics.mjs";

await build({
  stdin: {
    contents: [
      'export { buildVaultIndex } from "./src/core/vault-index";',
      "export { createModelWeaveTranslator } from " + String.fromCharCode(34) + "./src/i18n/messages" + String.fromCharCode(34) + ";",
      'export { buildVaultDiagnostics, filterVaultDiagnostics, formatVaultDiagnosticsAsMarkdown, getVaultDiagnosticCodes, presentVaultDiagnostic } from "./src/core/vault-diagnostics";',
      'export { buildCurrentObjectDiagnostics, localizeDiagnosticMessage } from "./src/core/current-file-diagnostics";'
    ].join("\n"),
    resolveDir: ".",
    sourcefile: "test-vault-diagnostics-entry.ts",
    loader: "ts"
  },
  bundle: true,
  format: "esm",
  platform: "browser",
  outfile: outputFile,
  plugins: [
    {
      name: "stub-obsidian",
      setup(buildApi) {
        buildApi.onResolve({ filter: /^obsidian$/ }, () => ({ path: "obsidian", namespace: "stub" }));
        buildApi.onLoad({ filter: /^obsidian$/, namespace: "stub" }, () => ({
          contents: "export const Platform = { isDesktop: true }; export const getLanguage = () => 'en';",
          loader: "js"
        }));
      }
    }
  ],
  logLevel: "silent"
});

const {
  buildCurrentObjectDiagnostics,
  createModelWeaveTranslator,
  localizeDiagnosticMessage,
  buildVaultDiagnostics,
  buildVaultIndex,
  filterVaultDiagnostics,
  formatVaultDiagnosticsAsMarkdown,
  presentVaultDiagnostic,
  getVaultDiagnosticCodes
} = await import("../" + outputFile);

function createIndex() {
  return buildVaultIndex([
    {
      path: "RULE-VALID.md",
      content: `---
type: rule
id: RULE-VALID
name: Valid Rule
---

## Conditions

| id | expression | severity | message | notes |
|---|---|---|---|---|
| COND-001 | order.total > 0 | error | Total is required | |
`
    },
    {
      path: "RULE-MISSING.md",
      content: `---
type: rule
id: RULE-MISSING
name: Missing Rule Reference
---

## References

| ref | usage | notes |
|---|---|---|
| [[RULE-NOT-FOUND]].COND-001 | condition | Missing |
`
    },
    {
      path: "CLASS-BROKEN.md",
      content: `---
type: class
id: CLASS-BROKEN
name: Broken Class
---

## Relations

### REL-001

target: [[CLASS-NOT-FOUND]]
kind: association
`
    },
    {
      path: "README.md",
      content: "# Ordinary Markdown\n\nThis is not a Model Weave model."
    }
  ], { parseMode: "full", resolveRelations: true, indexMembers: true, validate: true });
}

test("vault diagnostics use current-file static diagnostics and exclude normal Markdown", () => {
  const index = createIndex();
  const result = buildVaultDiagnostics(index);
  const current = index.modelsByFilePath["RULE-MISSING.md"];
  assert.equal(current.fileType, "rule");

  const expected = buildCurrentObjectDiagnostics(
    current,
    index,
    null,
    index.warningsByFilePath["RULE-MISSING.md"] ?? []
  );
  const actual = result.files.find((file) => file.filePath === "RULE-MISSING.md");
  assert.ok(actual);
  assert.deepEqual(
    actual.diagnostics.map((diagnostic) => [diagnostic.code, diagnostic.message]).sort(),
    expected.map((diagnostic) => [diagnostic.code, diagnostic.message]).sort()
  );
  assert.equal(result.checkedFileCount, 3);
  assert.ok(actual.diagnostics.some((diagnostic) => diagnostic.message.includes("unresolved rule reference")));
  assert.equal(result.files.some((file) => file.filePath === "README.md"), false);
  assert.ok(result.files.some((file) => file.filePath === "RULE-VALID.md"));
});

test("vault diagnostics support deterministic filters, codes, and Markdown export", () => {
  const result = buildVaultDiagnostics(createIndex());
  const missingRule = result.files.find((file) => file.filePath === "RULE-MISSING.md");
  const selectedDiagnostic = missingRule?.diagnostics[0];
  assert.ok(selectedDiagnostic);
  const unresolved = filterVaultDiagnostics(result, {
    severity: selectedDiagnostic.severity,
    code: selectedDiagnostic.code
  });
  assert.ok(unresolved.length > 0);
  assert.ok(unresolved.every((file) => file.diagnostics.every((diagnostic) =>
    diagnostic.severity === selectedDiagnostic.severity && diagnostic.code === selectedDiagnostic.code
  )));
  assert.deepEqual(getVaultDiagnosticCodes(result), [...getVaultDiagnosticCodes(result)].sort());

  const markdown = formatVaultDiagnosticsAsMarkdown(result, {
    severity: selectedDiagnostic.severity,
    code: selectedDiagnostic.code
  });
  assert.match(markdown, /# Model Weave Vault Diagnostics/);
  assert.match(markdown, /RULE-MISSING.md/);
  assert.doesNotMatch(markdown, /README.md/);
});

test("qualified Rule Condition references remain valid in vault diagnostics", () => {
  const result = buildVaultDiagnostics(createIndex());
  const validRule = result.files.find((file) => file.filePath === "RULE-VALID.md");
  assert.ok(validRule);
  assert.equal(validRule.diagnostics.some((diagnostic) => diagnostic.code === "unresolved-reference"), false);
});

test("vault diagnostics presentation localizes Modal and Markdown text", () => {
  const message = "table columns in section " + String.fromCharCode(34) + "Conditions" + String.fromCharCode(34) + " do not match expected headers";
  const diagnostic = { code: "invalid-table-column", message, severity: "error", field: "Conditions", context: { section: "Conditions", fileType: "rule" } };
  const result = { files: [{ filePath: "model-weave-model/05_rule/RULE.md", modelId: "RULE", modelType: "rule", diagnostics: [diagnostic] }], checkedFileCount: 1, filesWithDiagnostics: 1, errorCount: 1, warningCount: 0, noteCount: 0 };
  const ja = createModelWeaveTranslator("ja");
  const jaPresentation = presentVaultDiagnostic(diagnostic, { t: ja, language: "ja" });
  const jaMarkdown = formatVaultDiagnosticsAsMarkdown(result, undefined, { t: ja, language: "ja" });
  const currentFileMessage = localizeDiagnosticMessage(message, "ja");
  const enMarkdown = formatVaultDiagnosticsAsMarkdown(result);
  assert.equal(jaPresentation.severityLabel, "エラー");
  assert.equal(jaPresentation.message, currentFileMessage);
  assert.ok(jaMarkdown.includes("[エラー]"));
  assert.ok(jaMarkdown.includes(currentFileMessage));
  assert.ok(jaMarkdown.includes("フィールド: Conditions"));
  assert.ok(jaMarkdown.includes("期待されるヘッダー: id | expression | severity | message | notes"));
  assert.ok(enMarkdown.includes("[error]"));
  assert.ok(enMarkdown.includes(message));
  assert.ok(jaMarkdown.includes("model-weave-model/05_rule/RULE.md"));
  assert.match(jaMarkdown, new RegExp(String.fromCharCode(96) + "invalid-table-column" + String.fromCharCode(96)));
});

test("vault diagnostics export still supports filters", () => {
  const result = buildVaultDiagnostics(createIndex());
  const first = result.files[0].diagnostics[0];
  const filtered = formatVaultDiagnosticsAsMarkdown(result, { severity: first.severity, code: first.code });
  assert.match(filtered, new RegExp(String.fromCharCode(96) + first.code + String.fromCharCode(96)));
});
