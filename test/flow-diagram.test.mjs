import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const outputFile = "dist/test-flow-diagram.mjs";

await build({
  stdin: {
    contents: [
      'export { parseFlowDiagramFile } from "./src/parsers/dfd-diagram-parser";',
      'export { buildVaultIndex } from "./src/core/vault-index";',
      'export { detectFileType } from "./src/core/schema-detector";',
      'export { isDiagramPreviewRouteFileType, isDfdLikeDiagramPreviewFileType } from "./src/core/preview-routing";',
      'export { isModelWeavePreviewSupportedFileType } from "./src/core/supported-formats";',
      'export { resolveDiagramRelations } from "./src/core/relation-resolver";',
      'export { buildDfdMermaidSource, getDfdMermaidColorSchemeTargets } from "./src/renderers/dfd-mermaid";',
      'export { getAppliedColorSchemeRowsForTargets } from "./src/core/color-scheme";',
      'export { buildCurrentDiagramDiagnostics } from "./src/core/current-file-diagnostics";',
      'export { createModelWeaveTranslator } from "./src/i18n/messages";',
      'export { getAppliedColorSchemeLowerPaneSlot, getDiagnosticActionCandidates, getDiagnosticDetailEntries } from "./src/views/modeling-preview-view";',
      'export { getExpectedHeaderForDiagnostic } from "./src/core/diagnostic-section-guidance";'
    ].join("\n"),
    resolveDir: ".",
    sourcefile: "test-flow-diagram-entry.ts",
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
  buildDfdMermaidSource,
  createModelWeaveTranslator,
  getAppliedColorSchemeLowerPaneSlot,
  getAppliedColorSchemeRowsForTargets,
  getDfdMermaidColorSchemeTargets,
  buildVaultIndex,
  detectFileType,
  getDiagnosticActionCandidates,
  getDiagnosticDetailEntries,
  getExpectedHeaderForDiagnostic,
  isDfdLikeDiagramPreviewFileType,
  isDiagramPreviewRouteFileType,
  isModelWeavePreviewSupportedFileType,
  parseFlowDiagramFile,
  resolveDiagramRelations
} = await import(`../${outputFile}?t=${Date.now()}`);

globalThis.activeDocument = {
  body: {
    classList: {
      contains: () => false
    }
  }
};

const flowMarkdown = `---
type: flow_diagram
id: FLOW-ORDER-SCREEN-COMMUNICATION
name: Order Screen Communication Flow
kind: screen_communication
---

# Order Screen Communication Flow

## Objects

| id | label | kind | ref | domain | notes |
|---|---|---|---|---|---|
| order_screen | Order Screen | screen | [[SCR-ORDER]] | order | Source screen |
| order_process | Order Process | app_process | [[PROC-ORDER]] | order | Application process |
| session_store | Session Store | session | | order | Session state |
| data_store | Data Store | datastore | | order | Persistent state |
| mystery | Mystery | something_new | | order | Unknown kind |

## Flows

| id | from | to | data | notes |
|---|---|---|---|---|
| FLOW-001 | order_screen | order_process | [[DATA-ORDER-REQUEST]] | Submit order |
| FLOW-002 | order_process | session_store | Order result | Store result |
| FLOW-003 | session_store | data_store | Snapshot | Persist snapshot |
| FLOW-004 | mystery | order_screen | Unknown handoff | Unknown source |
`;

function parseFlow(markdown = flowMarkdown) {
  const result = parseFlowDiagramFile(markdown, "FLOW-ORDER-SCREEN-COMMUNICATION.md");
  assert.ok(result.file);
  return result;
}

function resolveFlow(markdown = flowMarkdown, extraFiles = []) {
  const index = buildVaultIndex([
    { path: "FLOW-ORDER-SCREEN-COMMUNICATION.md", content: markdown },
    ...extraFiles
  ], { parseMode: "full", validate: false });
  const model = index.modelsByFilePath["FLOW-ORDER-SCREEN-COMMUNICATION.md"];
  assert.equal(model.fileType, "flow-diagram");
  return { index, model, resolved: resolveDiagramRelations(model, index) };
}

test("flow_diagram is detected and parsed as a distinct model type", () => {
  assert.equal(detectFileType({ type: "flow_diagram" }), "flow-diagram");
  const { file, warnings } = parseFlow();

  assert.equal(file.fileType, "flow-diagram");
  assert.equal(file.schema, "flow_diagram");
  assert.equal(file.kind, "screen_communication");
  assert.equal(warnings.length, 0);
});


test("flow_diagram follows the same preview support and diagram route checks", () => {
  const fileType = detectFileType({ type: "flow_diagram" });

  assert.equal(fileType, "flow-diagram");
  assert.equal(isModelWeavePreviewSupportedFileType(fileType), true);
  assert.equal(isDfdLikeDiagramPreviewFileType(fileType), true);
  assert.equal(isDiagramPreviewRouteFileType(fileType), true);
});

test("flow-diagram alias normalizes to the same internal preview route", () => {
  const fileType = detectFileType({ type: "flow-diagram" });

  assert.equal(fileType, "flow-diagram");
  assert.equal(isModelWeavePreviewSupportedFileType(fileType), true);
  assert.equal(isDfdLikeDiagramPreviewFileType(fileType), true);
});

test("dfd_diagram preview route remains DFD-like diagram", () => {
  const fileType = detectFileType({ type: "dfd_diagram" });

  assert.equal(fileType, "dfd-diagram");
  assert.equal(isModelWeavePreviewSupportedFileType(fileType), true);
  assert.equal(isDfdLikeDiagramPreviewFileType(fileType), true);
  assert.equal(isDiagramPreviewRouteFileType(fileType), true);
});

test("unsupported type still does not use the diagram preview route", () => {
  const fileType = detectFileType({ type: "not_a_model_weave_type" });

  assert.equal(fileType, "markdown");
  assert.equal(isModelWeavePreviewSupportedFileType(fileType), false);
  assert.equal(isDfdLikeDiagramPreviewFileType(fileType), false);
  assert.equal(isDiagramPreviewRouteFileType(fileType), false);
});

test("flow_diagram Objects table parses MVP columns", () => {
  const { file } = parseFlow();
  const first = file.objectEntries[0];

  assert.equal(first.id, "order_screen");
  assert.equal(first.label, "Order Screen");
  assert.equal(first.kind, "screen");
  assert.equal(first.ref, "[[SCR-ORDER]]");
  assert.equal(first.domain, "order");
  assert.equal(first.notes, "Source screen");
});

test("flow_diagram Flows table parses MVP columns", () => {
  const { file } = parseFlow();
  const first = file.flows[0];

  assert.equal(first.id, "FLOW-001");
  assert.equal(first.from, "order_screen");
  assert.equal(first.to, "order_process");
  assert.equal(first.data, "[[DATA-ORDER-REQUEST]]");
  assert.equal(first.notes, "Submit order");
});

test("flow_diagram Mermaid renders screen as curv-trap", () => {
  const { resolved } = resolveFlow();
  const source = buildDfdMermaidSource(resolved);

  assert.match(source, /order_screen@\{ shape: curv-trap, label: "Order Screen" \}/);
  assert.match(source, /class order_screen screen/);
});

test("flow_diagram Mermaid renders store kinds as lin-cyl", () => {
  const { resolved } = resolveFlow();
  const source = buildDfdMermaidSource(resolved);

  assert.match(source, /session_store@\{ shape: lin-cyl, label: "Session Store" \}/);
  assert.match(source, /data_store@\{ shape: lin-cyl, label: "Data Store" \}/);
  assert.match(source, /class session_store store/);
  assert.match(source, /class data_store store/);
});

test("flow_diagram unknown object kind falls back to rect", () => {
  const { model, resolved } = resolveFlow();
  const source = buildDfdMermaidSource(resolved);

  assert.equal(model.objectEntries.find((entry) => entry.id === "mystery")?.kind, "unknown");
  assert.match(source, /mystery@\{ shape: rect, label: "Mystery" \}/);
});

test("flow_diagram Flows.data appears as edge label", () => {
  const { resolved } = resolveFlow();
  const source = buildDfdMermaidSource(resolved);

  assert.match(source, /order_screen -->\|DATA-ORDER-REQUEST\| order_process/);
  assert.match(source, /order_process -->\|Order result\| session_store/);
});

test("flow_diagram refs can point to screen, app_process, and data_object without DFD compatibility warnings", () => {
  const markdown = flowMarkdown.replace(
    "| data_store | Data Store | datastore | | order | Persistent state |",
    "| data_store | Data Store | datastore | [[DATA-ORDER-REQUEST]] | order | Persistent state |"
  );
  const { index, model, resolved } = resolveFlow(markdown, [
    { path: "SCR-ORDER.md", content: "---\ntype: screen\nid: SCR-ORDER\nname: Order Screen\n---\n" },
    { path: "PROC-ORDER.md", content: "---\ntype: app_process\nid: PROC-ORDER\nname: Order Process\n---\n" },
    { path: "DATA-ORDER-REQUEST.md", content: "---\ntype: data_object\nid: DATA-ORDER-REQUEST\nname: Order Request\n---\n" }
  ]);
  const messages = [
    ...(index.warningsByFilePath[model.path] ?? []),
    ...resolved.warnings
  ].map((warning) => warning.message);

  assert.equal(messages.some((message) => /DFD/.test(message)), false);
  assert.equal(messages.some((message) => /unresolved Flow Diagram object ref/.test(message)), false);
});

test("flow_diagram malformed Objects header exposes expected header guidance", () => {
  const markdown = flowMarkdown.replace("| id | label | kind | ref | domain | notes |", "| id | label | kind | notes |");
  const parsed = parseFlow(markdown);
  const diagnostics = buildCurrentDiagramDiagnostics({ diagram: parsed.file }, parsed.warnings);
  const tableDiagnostic = diagnostics.find((diagnostic) => diagnostic.code === "invalid-table-column" && /Objects/.test(diagnostic.message));

  assert.ok(tableDiagnostic);
  assert.equal(getExpectedHeaderForDiagnostic(tableDiagnostic), "id | label | kind | ref | domain | notes");
});

test("flow_diagram malformed Flows header exposes expected header and suppresses row cascade", () => {
  const markdown = flowMarkdown.replace("| id | from | to | data | notes |", "| id | frow | to | data | notes |");
  const parsed = parseFlow(markdown);
  const diagnostics = buildCurrentDiagramDiagnostics({ diagram: parsed.file }, parsed.warnings);
  const tableDiagnostic = diagnostics.find((diagnostic) => diagnostic.code === "invalid-table-column" && /Flows/.test(diagnostic.message));

  assert.ok(tableDiagnostic);
  assert.equal(getExpectedHeaderForDiagnostic(tableDiagnostic), "id | from | to | data | notes");
  assert.equal(diagnostics.some((diagnostic) => /Flow Diagram Flows row must have "from"/.test(diagnostic.message)), false);
  assert.equal(diagnostics.some((diagnostic) => /unresolved Flow Diagram flow source/.test(diagnostic.message)), false);
});

test("flow_diagram unresolved Objects.ref keeps external reference guidance without expected header", () => {
  const markdown = flowMarkdown.replace("[[SCR-ORDER]]", "[[SCR-MISSING]]");
  const { model, resolved } = resolveFlow(markdown);
  const diagnostics = buildCurrentDiagramDiagnostics({ diagram: model }, [
    ...(resolved.warnings ?? [])
  ]);
  const diagnostic = diagnostics.find((entry) =>
    entry.code === "unresolved-reference" && /object ref/.test(entry.message)
  );

  assert.ok(diagnostic);
  assert.equal(diagnostic.severity, "warning");
  assert.equal(getExpectedHeaderForDiagnostic(diagnostic), null);

  const t = createModelWeaveTranslator("en");
  const details = getDiagnosticDetailEntries(diagnostic, t);
  const actions = getDiagnosticActionCandidates(diagnostic, diagnostic.message, t, undefined);

  assert.equal(details.some((entry) => entry.label === "Expected header"), false);
  assert.equal(actions.some((action) => action.id === "copy-expected-header"), false);
  assert.equal(
    details.some((entry) => /indexed model files/.test(entry.value)),
    true
  );
});

test("flow_diagram unresolved Flows.from reports local Objects.id guidance", () => {
  const markdown = flowMarkdown.replace("| FLOW-001 | order_screen | order_process |", "| FLOW-001 | ORDER_ENTRY | order_process |");
  const { model, resolved } = resolveFlow(markdown);
  const diagnostics = buildCurrentDiagramDiagnostics({ diagram: model }, resolved.warnings);
  const diagnostic = diagnostics.find((entry) =>
    entry.code === "unresolved-reference" && entry.field === "Flows.from"
  );

  assert.ok(diagnostic);
  assert.equal(diagnostic.severity, "error");
  assert.match(diagnostic.message, /local ## Objects table/);
  assert.doesNotMatch(diagnostic.message, /indexed Model Weave files|indexed model files/);
  assert.equal(getExpectedHeaderForDiagnostic(diagnostic), null);

  const t = createModelWeaveTranslator("en");
  const details = getDiagnosticDetailEntries(diagnostic, t);
  assert.equal(details.some((entry) => entry.label === "Expected header"), false);
  assert.equal(
    details.some((entry) => /local .*Objects.* table/.test(entry.value) && /object ID/.test(entry.value)),
    true
  );
});

test("flow_diagram unresolved Flows.to reports local Objects.id guidance", () => {
  const markdown = flowMarkdown.replace("| FLOW-001 | order_screen | order_process |", "| FLOW-001 | order_screen | ORDER_DONE |");
  const { model, resolved } = resolveFlow(markdown);
  const diagnostics = buildCurrentDiagramDiagnostics({ diagram: model }, resolved.warnings);
  const diagnostic = diagnostics.find((entry) =>
    entry.code === "unresolved-reference" && entry.field === "Flows.to"
  );

  assert.ok(diagnostic);
  assert.equal(diagnostic.severity, "error");
  assert.match(diagnostic.message, /local ## Objects table/);
  assert.doesNotMatch(diagnostic.message, /indexed Model Weave files|indexed model files/);
  assert.equal(getExpectedHeaderForDiagnostic(diagnostic), null);
});

test("flow_diagram malformed Objects header suppresses flow endpoint cascade", () => {
  const markdown = flowMarkdown.replace("| id | label | kind | ref | domain | notes |", "| id | label | kind | notes |");
  const { index, model, resolved } = resolveFlow(markdown);
  const diagnostics = buildCurrentDiagramDiagnostics({ diagram: model }, [
    ...(index.warningsByFilePath[model.path] ?? []),
    ...resolved.warnings
  ]);
  const tableDiagnostics = diagnostics.filter((entry) =>
    entry.code === "invalid-table-column" && /Objects/.test(entry.message)
  );

  assert.equal(tableDiagnostics.length, 1);
  assert.equal(getExpectedHeaderForDiagnostic(tableDiagnostics[0]), "id | label | kind | ref | domain | notes");
  assert.equal(
    diagnostics.some((entry) => entry.code === "unresolved-reference" && (entry.field === "Flows.from" || entry.field === "Flows.to")),
    false
  );
});

const flowDomainMarkdown = `---
type: flow_diagram
id: FLOW-ORDER-SCREEN-COMMUNICATION
name: Order Screen Communication Flow
kind: screen_communication
---

## Objects

| id | label | kind | ref | domain | notes |
|---|---|---|---|---|---|
| ORDER_ENTRY | Order Entry Screen | screen | [[SCR-ORDER-ENTRY]] | sales | Parent screen |
| CUSTOMER_SEARCH | Customer Search Screen | screen | [[SCR-CUSTOMER-SEARCH]] | sales | Helper search screen |
| ORDER_CONTEXT | Order Wizard Context | context |  | sales | Temporary working context |
| SESSION_STORE | Session Store | store |  | platform | Temporary persistence |
| ORDER_SUBMIT | Order Submit Process | app_process | [[PROC-ORDER-SUBMIT]] | application | Submit process |

## Flows

| id | from | to | data | notes |
|---|---|---|---|---|
| F01 | ORDER_ENTRY | ORDER_CONTEXT | [[DATA-ORDER-DRAFT]] | Keep draft |
| F02 | ORDER_CONTEXT | CUSTOMER_SEARCH | [[DATA-CUSTOMER-SEARCH-CONDITION]] | Open search |
| F03 | CUSTOMER_SEARCH | ORDER_CONTEXT | [[DATA-CUSTOMER-SELECTION]] | Return selection |
| F04 | ORDER_CONTEXT | ORDER_ENTRY | [[DATA-CUSTOMER-SELECTION]] | Apply selection |
| F05 | ORDER_CONTEXT | SESSION_STORE | [[DATA-ORDER-DRAFT]] | Save draft |
| F06 | ORDER_ENTRY | ORDER_SUBMIT | [[DATA-ORDER-DRAFT]] | Submit |
`;

test("flow_diagram Objects.domain renders Mermaid domain subgraphs", () => {
  const { resolved } = resolveFlow(flowDomainMarkdown);
  const source = buildDfdMermaidSource(resolved);

  assert.match(source, /subgraph DOMAIN_sales\["sales"\]/);
  assert.match(source, /subgraph DOMAIN_platform\["platform"\]/);
  assert.match(source, /subgraph DOMAIN_application\["application"\]/);
  assert.match(source, /subgraph DOMAIN_sales[\s\S]*ORDER_ENTRY@\{ shape: curv-trap, label: "Order Entry Screen" \}[\s\S]*CUSTOMER_SEARCH@\{ shape: curv-trap, label: "Customer Search Screen" \}[\s\S]*ORDER_CONTEXT@\{ shape: rect, label: "Order Wizard Context" \}[\s\S]*end/);
});

test("flow_diagram domain grouping preserves kind shapes and flow data labels", () => {
  const { resolved } = resolveFlow(flowDomainMarkdown);
  const source = buildDfdMermaidSource(resolved);

  assert.match(source, /ORDER_ENTRY@\{ shape: curv-trap, label: "Order Entry Screen" \}/);
  assert.match(source, /SESSION_STORE@\{ shape: lin-cyl, label: "Session Store" \}/);
  assert.match(source, /ORDER_SUBMIT@\{ shape: rect, label: "Order Submit Process" \}/);
  assert.match(source, /ORDER_ENTRY -->\|DATA-ORDER-DRAFT\| ORDER_CONTEXT/);
  assert.match(source, /ORDER_CONTEXT -->\|DATA-ORDER-DRAFT\| SESSION_STORE/);
});

test("flow_diagram without Objects.domain renders without domain subgraphs", () => {
  const markdown = flowDomainMarkdown.replaceAll("| sales |", "|  |").replaceAll("| platform |", "|  |").replaceAll("| application |", "|  |");
  const { resolved } = resolveFlow(markdown);
  const source = buildDfdMermaidSource(resolved);

  assert.doesNotMatch(source, /subgraph DOMAIN_/);
  assert.match(source, /ORDER_ENTRY@\{ shape: curv-trap, label: "Order Entry Screen" \}/);
  assert.match(source, /SESSION_STORE@\{ shape: lin-cyl, label: "Session Store" \}/);
});

test("flow_diagram domain IDs are sanitized for Mermaid subgraphs", () => {
  const markdown = flowDomainMarkdown.replaceAll("| sales |", "| sales/platform ops |");
  const { resolved } = resolveFlow(markdown);
  const source = buildDfdMermaidSource(resolved);

  assert.match(source, /subgraph DOMAIN_sales_platform_ops\["sales\/platform ops"\]/);
  assert.match(source, /DOMAIN_sales_platform_ops/);
});

const flowDomainColorScheme = {
  id: "COLOR-FLOW-DOMAINS",
  name: "Flow Domain Colors",
  entries: [
    { target: "domain", kind: "sales", fill: "#7ddea7", stroke: "#000000", text: "#ffffff", rowIndex: 0 },
    { target: "domain", kind: "application", fill: "#DDEBFF", stroke: "#4F81BD", text: "#111111", rowIndex: 1 }
  ],
  defaultStyle: {
    fill: "#f5f5f5",
    stroke: "#9e9e9e",
    text: "#111111"
  }
};

test("flow_diagram domain Color Scheme rows emit Mermaid subgraph style lines", () => {
  const { resolved } = resolveFlow(flowDomainMarkdown);
  const source = buildDfdMermaidSource(resolved, flowDomainColorScheme);

  assert.match(source, /style DOMAIN_sales fill:#7ddea7,stroke:#000000,color:#ffffff/);
  assert.match(source, /style DOMAIN_application fill:#DDEBFF,stroke:#4F81BD,color:#111111/);
  assert.match(source, /style DOMAIN_platform fill:#f5f5f5,stroke:#9e9e9e,color:#111111/);
  assert.match(source, /ORDER_ENTRY@\{ shape: curv-trap, label: "Order Entry Screen" \}/);
  assert.match(source, /SESSION_STORE@\{ shape: lin-cyl, label: "Session Store" \}/);
  assert.match(source, /ORDER_ENTRY -->\|DATA-ORDER-DRAFT\| ORDER_CONTEXT/);
});

test("flow_diagram Applied Color Scheme targets include used domain rows", () => {
  const { resolved } = resolveFlow(flowDomainMarkdown);
  const targets = getDfdMermaidColorSchemeTargets(resolved);
  const rows = getAppliedColorSchemeRowsForTargets(flowDomainColorScheme, targets);

  assert.deepEqual(targets, ["domain"]);
  assert.equal(rows.some((row) => row.entry.target === "domain" && row.entry.kind === "sales"), true);
  assert.equal(rows.some((row) => row.entry.target === "domain" && row.entry.kind === "application"), true);
  assert.equal(rows.some((row) => row.entry.target === "app_process"), false);
  assert.equal(rows.some((row) => row.entry.target === "weave_map"), false);
});

test("dfd_diagram Applied Color Scheme targets include dfd and domain when domains are used", () => {
  const targets = getDfdMermaidColorSchemeTargets({
    diagram: {
      schema: "dfd_diagram",
      kind: "dfd",
      domains: [{ id: "sales", name: "Sales", kind: "sales", rowIndex: 0 }]
    },
    nodes: [{ id: "process", metadata: { domain: "sales" } }],
    edges: []
  });
  const rows = getAppliedColorSchemeRowsForTargets({
    ...flowDomainColorScheme,
    entries: [
      ...flowDomainColorScheme.entries,
      { target: "dfd", kind: "process", fill: "#9bbb59", stroke: "#6f8a3f", text: "#000000", rowIndex: 2 }
    ]
  }, targets);

  assert.deepEqual(targets, ["dfd", "domain"]);
  assert.equal(rows.some((row) => row.entry.target === "domain" && row.entry.kind === "sales"), true);
  assert.equal(rows.some((row) => row.entry.target === "dfd" && row.entry.kind === "process"), true);
  assert.equal(rows.some((row) => row.entry.target === "app_process"), false);
});

test("Applied Color Scheme placement policy uses Details for color-aware previews", () => {
  assert.equal(getAppliedColorSchemeLowerPaneSlot("app_process"), "details");
  assert.equal(getAppliedColorSchemeLowerPaneSlot("domains"), "details");
  assert.equal(getAppliedColorSchemeLowerPaneSlot("domain_diagram"), "details");
  assert.equal(getAppliedColorSchemeLowerPaneSlot("dfd_diagram"), "details");
  assert.equal(getAppliedColorSchemeLowerPaneSlot("flow_diagram"), "details");
});

test("DFD and Flow Applied Color Scheme placement is not Relationships", () => {
  assert.notEqual(getAppliedColorSchemeLowerPaneSlot("dfd_diagram"), "impact");
  assert.notEqual(getAppliedColorSchemeLowerPaneSlot("flow_diagram"), "impact");
});
