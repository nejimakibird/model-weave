import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const outputFile = "dist/test-diagnostic-section-guidance.mjs";

await build({
  stdin: {
    contents: [
      'export { parseColorSchemeFile } from "./src/parsers/color-scheme-parser";',
      'export { parseDfdDiagramFile } from "./src/parsers/dfd-diagram-parser";',
      'export { parseMessageFile } from "./src/parsers/message-parser";',
      'export { parseRuleFile } from "./src/parsers/rule-parser";',
      'export { parseScreenFile } from "./src/parsers/screen-parser";',
      'export { createModelWeaveTranslator } from "./src/i18n/messages";',
      'export { formatDiagnosticAsMarkdown, getDiagnosticActionCandidates, getDiagnosticDetailEntries } from "./src/views/modeling-preview-view";',
      'export { buildCurrentDiagramDiagnostics, buildCurrentObjectDiagnostics } from "./src/core/current-file-diagnostics";',
      'export { getExpectedHeaderForDiagnostic, resolveDiagnosticSectionGuidance, resolveSectionGuidance } from "./src/core/diagnostic-section-guidance";'
    ].join("\n"),
    resolveDir: ".",
    sourcefile: "test-diagnostic-section-guidance-entry.ts",
    loader: "ts"
  },
  bundle: true,
  format: "esm",
  platform: "browser",
  outfile: outputFile,
  plugins: [
    {
      name: "stub-platform-modules",
      setup(buildApi) {
        buildApi.onResolve({ filter: /^obsidian$/ }, () => ({
          path: "obsidian",
          namespace: "stub"
        }));
        buildApi.onLoad({ filter: /^obsidian$/, namespace: "stub" }, () => ({
          contents: [
            "export class ItemView {}",
            "export const MarkdownRenderer = { renderMarkdown: async () => {} };",
            "export class Notice { constructor() {} }",
            "export class TFile {}",
            "export class WorkspaceLeaf {}",
            "export const getLanguage = () => 'en';",
            "export const loadMermaid = async () => ({ initialize: () => {}, render: async () => ({ svg: '' }) });"
          ].join("\n"),
          loader: "js"
        }));
        buildApi.onResolve({ filter: /^electron$/ }, () => ({
          path: "electron",
          namespace: "stub"
        }));
        buildApi.onLoad({ filter: /^electron$/, namespace: "stub" }, () => ({
          contents: "export const shell = { openPath: async () => '', openExternal: async () => {} };",
          loader: "js"
        }));
        buildApi.onResolve({ filter: /^fs$/ }, () => ({
          path: "fs",
          namespace: "stub"
        }));
        buildApi.onLoad({ filter: /^fs$/, namespace: "stub" }, () => ({
          contents: "export const existsSync = () => false; export const statSync = () => ({ isFile: () => false, isDirectory: () => false }); export const promises = {}; export default { existsSync, statSync, promises };",
          loader: "js"
        }));
        buildApi.onResolve({ filter: /^path$/ }, () => ({
          path: "path",
          namespace: "stub"
        }));
        buildApi.onLoad({ filter: /^path$/, namespace: "stub" }, () => ({
          contents: "export const basename = (value) => String(value).split('/').pop() ?? ''; export const extname = () => ''; export const join = (...parts) => parts.join('/'); export default { basename, extname, join };",
          loader: "js"
        }));
      }
    }
  ],
  logLevel: "silent"
});

const {
  buildCurrentDiagramDiagnostics,
  buildCurrentObjectDiagnostics,
  createModelWeaveTranslator,
  formatDiagnosticAsMarkdown,
  getDiagnosticActionCandidates,
  getDiagnosticDetailEntries,
  getExpectedHeaderForDiagnostic,
  parseColorSchemeFile,
  parseDfdDiagramFile,
  parseMessageFile,
  parseRuleFile,
  parseScreenFile,
  resolveDiagnosticSectionGuidance,
  resolveSectionGuidance
} = await import(`../${outputFile}?t=${Date.now()}`);
const emptyIndex = {};

test("rule Messages diagnostics do not expose Copy Expected Header guidance", () => {
  const markdown = `---
type: rule
id: RULE-MESSAGES
name: Rule Messages
---

# Rule Messages

## Messages

| id | text | severity | audience | notes |
|---|---|---|---|---|
| MSG-A | Message | info | user | notes |
`;
  const parsed = parseRuleFile(markdown, "RULE-MESSAGES.md");
  const diagnostics = buildCurrentObjectDiagnostics(parsed.file, emptyIndex, null, parsed.warnings);
  const tableDiagnostic = diagnostics.find((diagnostic) => diagnostic.code === "invalid-table-column");

  assert.ok(tableDiagnostic);
  assert.equal(getExpectedHeaderForDiagnostic(tableDiagnostic), null);

  const guidance = resolveDiagnosticSectionGuidance(tableDiagnostic);
  assert.equal(guidance?.supported, false);
  assert.match(guidance?.manualFix?.en ?? "", /not supported for rule files/);
  assert.match(guidance?.manualFix?.ja ?? "", /rule ファイルでは ## Messages セクションはサポートされていません/);
});

test("rule Conditions guidance exposes the rule Conditions expected header", () => {
  const guidance = resolveSectionGuidance("rule", "Conditions");

  assert.equal(guidance?.supported, true);
  assert.equal(guidance?.copyExpectedHeaderAvailable, true);
  assert.equal(guidance?.expectedHeader, "id | expression | severity | message | notes");
});

test("message Messages diagnostics expose FORMAT-message expected header", () => {
  const markdown = `---
type: message
id: MSG-SAMPLE
name: Sample Messages
---

# Sample Messages

## Messages

| bad | text |
|---|---|
| MSG-A | Message |
`;
  const parsed = parseMessageFile(markdown, "MSG-SAMPLE.md");
  const diagnostics = buildCurrentObjectDiagnostics(parsed.file, emptyIndex, null, parsed.warnings);
  const tableDiagnostic = diagnostics.find((diagnostic) => diagnostic.code === "invalid-table-column");

  assert.ok(tableDiagnostic);
  assert.equal(
    getExpectedHeaderForDiagnostic(tableDiagnostic),
    "id | text | severity | audience | notes"
  );
});

test("screen Messages diagnostics expose FORMAT-screen expected header", () => {
  const markdown = `---
type: screen
id: SCR-SAMPLE
name: Sample Screen
---

# Sample Screen

## Messages

| id | text |
|---|---|
| MSG-A | Message |
`;
  const parsed = parseScreenFile(markdown, "SCR-SAMPLE.md");
  const diagnostics = buildCurrentObjectDiagnostics(parsed.file, emptyIndex, null, parsed.warnings);
  const tableDiagnostic = diagnostics.find((diagnostic) =>
    /table columns in section \"Messages\"/.test(diagnostic.message)
  );

  assert.ok(tableDiagnostic);
  assert.equal(
    getExpectedHeaderForDiagnostic(tableDiagnostic),
    "id | text | severity | timing | condition | notes"
  );
});

test("section guidance resolves stable headers across supported model types", () => {
  const cases = [
    ["class", "Relations", "id | to | kind | label | from_multiplicity | to_multiplicity | notes"],
    ["class_diagram", "Objects", "ref | notes"],
    ["class_diagram", "Relations", "id | from | to | kind | label | from_multiplicity | to_multiplicity | notes"],
    ["er_entity", "Columns", "logical_name | physical_name | data_type | length | scale | not_null | pk | encrypted | default_value | notes"],
    ["er_entity", "Indexes", "index_name | index_type | unique | columns | notes"],
    ["dfd_diagram", "Objects", "id | label | kind | ref | domain | notes"],
    ["dfd_diagram", "Flows", "id | from | to | data | notes"],
    ["data_object", "Format", "key | value | notes"],
    ["app_process", "Steps", "id | domain | label | kind | input | output | rule | invoke | screen | notes"],
    ["screen", "Actions", "id | label | kind | target | event | condition | invoke | transition | rule | notes"],
    ["mapping", "Mappings", "source_ref | target_ref | transform | rule | required | notes"],
    ["codeset", "Values", "code | label | sort_order | active | notes"],
    ["domains", "Domains", "id | name | kind | parent | description"],
    ["domain_diagram", "Domain Sources", "ref | notes"],
    ["color_scheme", "Colors", "| target | kind | fill | stroke | text | notes |"],
    ["rule", "Source Links", "| path | notes |"]
  ];

  for (const [fileType, section, expectedHeader] of cases) {
    const guidance = resolveSectionGuidance(fileType, section);
    assert.equal(guidance?.supported, true, `${fileType} ${section}`);
    assert.equal(guidance?.expectedHeader, expectedHeader, `${fileType} ${section}`);
    assert.equal(guidance?.copyExpectedHeaderAvailable, true, `${fileType} ${section}`);
  }
});

test("app_process Messages stays unsupported and does not expose an expected header", () => {
  const guidance = resolveSectionGuidance("app_process", "Messages");

  assert.equal(guidance?.supported, false);
  assert.equal(guidance?.copyExpectedHeaderAvailable, false);
  assert.equal(guidance?.expectedHeader, undefined);
  assert.match(guidance?.manualFix?.en ?? "", /not supported for app_process files/);
});

test("DFD Flow header diagnostics suppress cascading row diagnostics for the same section", () => {
  const markdown = `---
type: dfd_diagram
id: DFD-BAD-FLOW
name: Bad Flow Header
---

# Bad Flow Header

## Objects

| id | label | kind | ref | domain | notes |
|---|---|---|---|---|---|
| user | User | external | | | |
| system | System | process | | | |

## Flows

| id | frow | to | data | notes |
|---|---|---|---|---|
| F1 | user | system | DATA-ORDER | |
`;
  const parsed = parseDfdDiagramFile(markdown, "DFD-BAD-FLOW.md");
  assert.ok(parsed.file);

  const diagnostics = buildCurrentDiagramDiagnostics({ diagram: parsed.file }, parsed.warnings);
  assert.ok(diagnostics.some((diagnostic) => /table columns in section "Flows"/.test(diagnostic.message)));
  assert.equal(
    diagnostics.some((diagnostic) => /unresolved DFD flow source ""/.test(diagnostic.message)),
    false
  );

  const flowHeaderDiagnostic = diagnostics.find((diagnostic) => /table columns in section "Flows"/.test(diagnostic.message));
  assert.equal(getExpectedHeaderForDiagnostic(flowHeaderDiagnostic), "id | from | to | data | notes");
  assert.equal(flowHeaderDiagnostic.severity, "error");
});

test("Source Links malformed table header produces expected header guidance", () => {
  const markdown = `---
type: rule
id: RULE-SOURCE-LINKS
name: Rule Source Links
---

# Rule Source Links

## Source Links

| pash | notes |
|---|---|
| src/main.ts | entry |
`;
  const parsed = parseRuleFile(markdown, "RULE-SOURCE-LINKS.md");
  const diagnostics = buildCurrentObjectDiagnostics(parsed.file, emptyIndex, null, parsed.warnings);
  const tableDiagnostic = diagnostics.find((diagnostic) =>
    diagnostic.code === "invalid-table-column" && /Source Links/.test(diagnostic.message)
  );

  assert.ok(tableDiagnostic);
  assert.equal(getExpectedHeaderForDiagnostic(tableDiagnostic), "| path | notes |");
  assert.equal(tableDiagnostic.severity, "error");

  const guidance = resolveDiagnosticSectionGuidance(tableDiagnostic);
  assert.equal(guidance?.supported, true);
  assert.equal(guidance?.copyExpectedHeaderAvailable, true);
});

test("Source Links valid table header does not produce header diagnostics", () => {
  const markdown = `---
type: rule
id: RULE-SOURCE-LINKS-VALID
name: Rule Source Links Valid
---

# Rule Source Links Valid

## Source Links

| path | notes |
|---|---|
| src/main.ts | entry |
`;
  const parsed = parseRuleFile(markdown, "RULE-SOURCE-LINKS-VALID.md");
  const diagnostics = buildCurrentObjectDiagnostics(parsed.file, emptyIndex, null, parsed.warnings);

  assert.equal(
    diagnostics.some((diagnostic) => diagnostic.code === "invalid-table-column" && /Source Links/.test(diagnostic.message)),
    false
  );
});

test("Source Links non-table syntax remains compatible", () => {
  const markdown = `---
type: rule
id: RULE-SOURCE-LINKS-NONTABLE
name: Rule Source Links Non Table
---

# Rule Source Links Non Table

## Source Links

- [main](src/main.ts) - entry
- src/other.ts: other
`;
  const parsed = parseRuleFile(markdown, "RULE-SOURCE-LINKS-NONTABLE.md");
  const diagnostics = buildCurrentObjectDiagnostics(parsed.file, emptyIndex, null, parsed.warnings);

  assert.equal(
    diagnostics.some((diagnostic) => diagnostic.code === "invalid-table-column" && /Source Links/.test(diagnostic.message)),
    false
  );
});

test("color_scheme malformed Colors header suppresses duplicate entry cascades", () => {
  const markdown = `---
type: color_scheme
id: COLOR-BAD
name: Bad Colors
---

# Bad Colors

## Colors

| targeta | kind | fill | stroke | text | notes |
|---|---|---|---|---|---|
| domain | system | #ffffff | #111111 | #222222 | first |
| dfd_object | system | #eeeeee | #333333 | #444444 | second |
`;
  const parsed = parseColorSchemeFile(markdown, "COLOR-BAD.md");
  assert.ok(parsed.file);
  assert.equal(
    parsed.warnings.some((diagnostic) => /duplicate Color Scheme entry/.test(diagnostic.message)),
    false
  );

  const diagnostics = buildCurrentObjectDiagnostics(parsed.file, emptyIndex, null, parsed.warnings);
  const tableDiagnostic = diagnostics.find((diagnostic) =>
    diagnostic.code === "invalid-table-column" && /Colors/.test(diagnostic.message)
  );

  assert.ok(tableDiagnostic);
  assert.equal(getExpectedHeaderForDiagnostic(tableDiagnostic), "| target | kind | fill | stroke | text | notes |");
  assert.equal(tableDiagnostic.severity, "error");

  const t = createModelWeaveTranslator("en");
  const details = getDiagnosticDetailEntries(tableDiagnostic, t);
  assert.equal(
    details.some((entry) => entry.label === "Expected header" && entry.value === "| target | kind | fill | stroke | text | notes |"),
    true
  );
  const actions = getDiagnosticActionCandidates(tableDiagnostic, tableDiagnostic.message, t, undefined);
  assert.equal(
    actions.some((action) => action.id === "copy-expected-header" && action.copyText === "| target | kind | fill | stroke | text | notes |"),
    true
  );
  assert.match(
    formatDiagnosticAsMarkdown(tableDiagnostic, tableDiagnostic.message, t),
    /Expected header: \| target \| kind \| fill \| stroke \| text \| notes \|/
  );
  assert.equal(
    diagnostics.some((diagnostic) => /duplicate Color Scheme entry/.test(diagnostic.message)),
    false
  );
});

test("color_scheme valid Colors header still reports genuine duplicate entries", () => {
  const markdown = `---
type: color_scheme
id: COLOR-DUPLICATE
name: Duplicate Colors
---

# Duplicate Colors

## Colors

| target | kind | fill | stroke | text | notes |
|---|---|---|---|---|---|
| domain | system | #ffffff | #111111 | #222222 | first |
| domain | system | #eeeeee | #333333 | #444444 | second |
`;
  const parsed = parseColorSchemeFile(markdown, "COLOR-DUPLICATE.md");
  assert.ok(parsed.file);

  const diagnostics = buildCurrentObjectDiagnostics(parsed.file, emptyIndex, null, parsed.warnings);
  assert.equal(
    diagnostics.some((diagnostic) => diagnostic.code === "invalid-table-column" && /Colors/.test(diagnostic.message)),
    false
  );
  assert.equal(
    diagnostics.some((diagnostic) => /duplicate Color Scheme entry for target "domain" and kind "system"/.test(diagnostic.message)),
    true
  );
});
