import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const outputFile = "dist/test-color-scheme-picker-assist.mjs";

await build({
  stdin: {
    contents: [
      'export { parseColorSchemeFile } from "./src/parsers/color-scheme-parser";',
      'export { buildCurrentObjectDiagnostics } from "./src/core/current-file-diagnostics";',
      'export { getExpectedHeaderForDiagnostic } from "./src/core/diagnostic-section-guidance";',
      'export { normalizeHexColorForPicker, updateColorSchemeColorCell } from "./src/core/color-scheme-table-editor";'
    ].join("\n"),
    resolveDir: ".",
    sourcefile: "test-color-scheme-picker-assist-entry.ts",
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
  logLevel: "silent"
});

const {
  buildCurrentObjectDiagnostics,
  getExpectedHeaderForDiagnostic,
  normalizeHexColorForPicker,
  parseColorSchemeFile,
  updateColorSchemeColorCell
} = await import("../" + outputFile + "?t=" + Date.now());

function colorSchemeMarkdown({ header = "| target | kind | fill | stroke | text | notes |", row = "| domain | system | #112233 | #445566 | #abcdef | Base |" } = {}) {
  return `---
type: color_scheme
id: COLOR-TEST
name: Color Test
---
# Color Test

## Colors

${header}
|---|---|---|---|---|---|
${row}
`;
}

function update(markdown, rowIndex, columnName, value) {
  return updateColorSchemeColorCell(markdown, { rowIndex, columnName, value });
}

test("updates a fill cell in a valid color_scheme Colors table", () => {
  const result = update(colorSchemeMarkdown(), 0, "fill", "#aabbcc");

  assert.equal(result.status, "updated");
  assert.equal(result.changed, true);
  assert.match(result.updatedMarkdown, /\| domain \| system \| #aabbcc \| #445566 \| #abcdef \| Base \|/);
});

test("updates a stroke cell in a valid color_scheme Colors table", () => {
  const result = update(colorSchemeMarkdown(), 0, "stroke", "#0a1b2c");

  assert.equal(result.status, "updated");
  assert.match(result.updatedMarkdown, /\| domain \| system \| #112233 \| #0a1b2c \| #abcdef \| Base \|/);
});

test("updates a text cell in a valid color_scheme Colors table", () => {
  const result = update(colorSchemeMarkdown(), 0, "text", "#ffffff");

  assert.equal(result.status, "updated");
  assert.match(result.updatedMarkdown, /\| domain \| system \| #112233 \| #445566 \| #ffffff \| Base \|/);
});

test("updates a blank color cell with a selected RRGGBB value", () => {
  const markdown = colorSchemeMarkdown({ row: "| domain | system |  | #445566 | #abcdef | Base |" });
  const result = update(markdown, 0, "fill", "#123abc");

  assert.equal(result.status, "updated");
  assert.match(result.updatedMarkdown, /\| domain \| system \| #123abc \| #445566 \| #abcdef \| Base \|/);
});

test("accepts an existing RGB value and can replace it safely", () => {
  const markdown = colorSchemeMarkdown({ row: "| domain | system | #abc | #445566 | #abcdef | Base |" });

  assert.equal(normalizeHexColorForPicker("#abc"), "#aabbcc");
  const result = update(markdown, 0, "fill", "#ddeeff");

  assert.equal(result.status, "updated");
  assert.match(result.updatedMarkdown, /\| domain \| system \| #ddeeff \| #445566 \| #abcdef \| Base \|/);
});

test("replaces unsupported existing color values without rewriting other cells", () => {
  const markdown = colorSchemeMarkdown({ row: "| domain | system | blue | #445566 | #abcdef | Base |" });
  const result = update(markdown, 0, "fill", "#010203");

  assert.equal(result.status, "updated");
  assert.match(result.updatedMarkdown, /\| domain \| system \| #010203 \| #445566 \| #abcdef \| Base \|/);
});

test("refuses to update a malformed Colors header", () => {
  const markdown = colorSchemeMarkdown({ header: "| targeta | kind | fill | stroke | text | notes |" });
  const result = update(markdown, 0, "fill", "#010203");

  assert.equal(result.status, "header-mismatch");
  assert.equal(result.changed, false);
  assert.equal(result.updatedMarkdown, markdown);
});

test("malformed Colors header keeps schema-driven diagnostics behavior", () => {
  const markdown = colorSchemeMarkdown({
    header: "| targeta | kind | fill | stroke | text | notes |",
    row: "| domain | system | #112233 | #445566 | #abcdef | Base |\n| domain | system | #112233 | #445566 | #abcdef | Duplicate |"
  });
  const parsed = parseColorSchemeFile(markdown, "COLOR-TEST.md");
  assert.ok(parsed.file);

  const diagnostics = buildCurrentObjectDiagnostics(parsed.file, { warningsByFilePath: {} }, null, parsed.warnings);
  const headerDiagnostic = diagnostics.find((diagnostic) => diagnostic.code === "invalid-table-column");

  assert.ok(headerDiagnostic);
  assert.equal(headerDiagnostic.severity, "error");
  assert.equal(getExpectedHeaderForDiagnostic(headerDiagnostic), "| target | kind | fill | stroke | text | notes |");
  assert.equal(
    diagnostics.some((diagnostic) => /duplicate Color Scheme entry/.test(diagnostic.message)),
    false
  );
});
