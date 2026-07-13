import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const outputFile = "dist/test-flow-diagram.mjs";

await build({
  stdin: {
    contents: [
      'export { parseFlowDiagramFile } from "./src/parsers/dfd-diagram-parser";',
      'export { FlowDiagramViewModeState, resolveInitialFlowDiagramViewMode } from "./src/core/flow-diagram-view-mode";',
      'export { DEFAULT_MODEL_WEAVE_SETTINGS, normalizeModelWeaveSettings } from "./src/settings/model-weave-settings";',
      'export { buildVaultIndex } from "./src/core/vault-index";',
      'export { detectFileType } from "./src/core/schema-detector";',
      'export { isDiagramPreviewRouteFileType, isDfdLikeDiagramPreviewFileType } from "./src/core/preview-routing";',
      'export { isModelWeavePreviewSupportedFileType } from "./src/core/supported-formats";',
      'export { resolveDiagramRelations } from "./src/core/relation-resolver";',
      'export { buildDfdMermaidSource, buildFlowDiagramHoverMetadata, buildFlowDiagramScreenFlowProjection, getDfdMermaidColorSchemeTargets } from "./src/renderers/dfd-mermaid";',
      'export { getAppliedColorSchemeRowsForTargets } from "./src/core/color-scheme";',
      'export { buildCurrentDiagramDiagnostics } from "./src/core/current-file-diagnostics";',
      'export { createModelWeaveTranslator } from "./src/i18n/messages";',
      'export { getAppliedColorSchemeLowerPaneSlot, getDiagnosticActionCandidates, getDiagnosticDetailEntries, isFlowDiagramViewSelectorVisible } from "./src/views/modeling-preview-view";',
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
  FlowDiagramViewModeState,
  resolveInitialFlowDiagramViewMode,
  DEFAULT_MODEL_WEAVE_SETTINGS,
  normalizeModelWeaveSettings,
  buildDfdMermaidSource,
  buildFlowDiagramHoverMetadata,
  buildFlowDiagramScreenFlowProjection,
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
  isFlowDiagramViewSelectorVisible,
  parseFlowDiagramFile,
  resolveDiagramRelations,
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

| id | from | to | kind | trigger | data | condition | notes |
|---|---|---|---|---|---|---|---|
| FLOW-001 | order_screen | order_process | submit | click:Submit | [[DATA-ORDER-REQUEST]] | valid | Submit order |
| FLOW-002 | order_process | session_store | context_update |  | Order result |  | Store result |
| FLOW-003 | session_store | data_store | store |  | Snapshot |  | Persist snapshot |
| FLOW-004 | mystery | order_screen |  | fallback | Unknown handoff |  | Unknown source |
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


test("flow_diagram defaults flow_view to detail", () => {
  const { file } = parseFlow();

  assert.equal(file.flowView, "detail");
  assert.equal(resolveInitialFlowDiagramViewMode(file), "detail");
});

test("flow_diagram parses and resolves screen flow_view", () => {
  const markdown = flowMarkdown.replace("kind: screen_communication", "kind: screen_communication\nflow_view: screen");
  const { file, warnings } = parseFlow(markdown);

  assert.equal(file.flowView, "screen");
  assert.equal(resolveInitialFlowDiagramViewMode(file), "screen");
  assert.equal(warnings.some((warning) => warning.field === "flow_view"), false);
});

test("flow_diagram unknown flow_view warns and falls back to detail", () => {
  const markdown = flowMarkdown.replace("kind: screen_communication", "kind: screen_communication\nflow_view: storyboard");
  const { file, warnings } = parseFlow(markdown);

  assert.equal(file.flowView, "detail");
  assert.equal(resolveInitialFlowDiagramViewMode(file), "detail");
  assert.equal(
    warnings.some((warning) => warning.field === "flow_view" && /unknown flow_view/.test(warning.message)),
    true
  );
});

test("flow_diagram view state initializes once and keeps toolbar changes per file", () => {
  const screenMarkdown = flowMarkdown.replace("kind: screen_communication", "kind: screen_communication\nflow_view: screen");
  const noFrontmatter = parseFlow();
  const screen = parseFlow(screenMarkdown);
  const unknown = parseFlow(flowMarkdown.replace("kind: screen_communication", "kind: screen_communication\nflow_view: storyboard"));

  const detail = parseFlow(screenMarkdown.replace("flow_view: screen", "flow_view: detail"));
  const state = new FlowDiagramViewModeState();

  assert.equal(screen.file.flowViewSpecified, true);
  assert.deepEqual(state.synchronize("A.md", screen.file, "detail"), {
    mode: "screen",
    initializationChanged: true
  });
  state.set("A.md", "detail");
  assert.deepEqual(state.synchronize("A.md", screen.file, "screen"), {
    mode: "detail",
    initializationChanged: false
  });
  assert.deepEqual(state.synchronize("A.md", detail.file, "screen"), {
    mode: "detail",
    initializationChanged: true
  });
  assert.deepEqual(state.synchronize("B.md", noFrontmatter.file, "screen"), {
    mode: "screen",
    initializationChanged: true
  });
  assert.deepEqual(state.synchronize("B.md", noFrontmatter.file, "detail"), {
    mode: "detail",
    initializationChanged: true
  });
  assert.deepEqual(state.synchronize("C.md", unknown.file, "screen"), {
    mode: "screen",
    initializationChanged: true
  });
  assert.equal(resolveInitialFlowDiagramViewMode(unknown.file, "invalid"), "detail");
  assert.equal(DEFAULT_MODEL_WEAVE_SETTINGS.defaultFlowDiagramViewMode, "detail");
  assert.equal(normalizeModelWeaveSettings({ defaultFlowDiagramViewMode: "screen" }).defaultFlowDiagramViewMode, "screen");
  assert.equal(normalizeModelWeaveSettings({ defaultFlowDiagramViewMode: "invalid" }).defaultFlowDiagramViewMode, "detail");
  assert.equal(unknown.warnings.some((warning) => warning.field === "flow_view"), true);
});

test("flow_diagram selector appears only for Flow Diagram previews", () => {
  const markdown = flowMarkdown.replace("kind: screen_communication", "kind: screen_communication\nflow_view: screen");
  const { file } = parseFlow(markdown);

  assert.equal(resolveInitialFlowDiagramViewMode(file), "screen");
  assert.equal(isFlowDiagramViewSelectorVisible({ diagram: file }), true);
  assert.equal(isFlowDiagramViewSelectorVisible({ diagram: { schema: "dfd_diagram" } }), false);
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
  assert.equal(first.kind, "submit");
  assert.equal(first.trigger, "click:Submit");
  assert.equal(first.data, "[[DATA-ORDER-REQUEST]]");
  assert.equal(first.condition, "valid");
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

test("flow_diagram Mermaid edge labels use trigger, data, and kind", () => {
  const { resolved } = resolveFlow();
  const source = buildDfdMermaidSource(resolved);

  assert.match(source, /order_screen -->\|click:Submit \/ DATA-ORDER-REQUEST\| order_process/);
  assert.match(source, /order_process -->\|context_update \/ Order result\| session_store/);
  assert.match(source, /mystery -->\|fallback \/ Unknown handoff\| order_screen/);
});

const screenFlowMarkdown = `---
type: flow_diagram
id: FLOW-CHECKOUT-SCREEN-FLOW
name: Checkout Screen Flow
kind: screen_communication
flow_view: screen
---

## Objects

| id | label | kind | ref | domain | notes |
|---|---|---|---|---|---|
| checkout_screen | Checkout Screen | screen | | frontend_area | Start screen |
| submit_action | Submit Action | work_object | | frontend_area | User action detail |
| checkout_process | Checkout Process | app_process | | application_area | Hidden submit process |
| completion_screen | Completion Screen | screen | | frontend_area | Success screen |
| error_message | Error Message | message | | frontend_area | User-visible error |
| session_store | Session Store | session | | data_area | Hidden session store |
| retry_process | Retry Process | process | | application_area | Alternate hidden route |

## Flows

| id | from | to | kind | trigger | data | condition | notes |
|---|---|---|---|---|---|---|---|
| SF01 | checkout_screen | submit_action | action | click:Submit | Checkout input | | Submit action |
| SF02 | submit_action | checkout_process | command | | Checkout request | | Invoke process |
| SF03 | checkout_process | completion_screen | navigate | showComplete | Completion payload | success | Show completion |
| SF04 | checkout_process | error_message | message | showError | Error details | failed | Show error |
| SF05 | checkout_process | session_store | store | save | Session data | | Hidden persistence |
| SF06 | checkout_screen | retry_process | action | click:Retry | Retry input | | Retry action |
| SF07 | retry_process | completion_screen | navigate | showComplete | Retry payload | alternate | Alternate success |
`;
function getFlowDiagramDataWarnings(markdown, extraFiles = []) {
  const { model, resolved } = resolveFlow(markdown, extraFiles);
  return buildCurrentDiagramDiagnostics({ diagram: model }, resolved.warnings)
    .filter((warning) => warning.code === "unresolved-reference" && /flow data reference/.test(warning.message));
}

test("flow_diagram screen view projects internal paths into visible nodes", () => {
  const { resolved } = resolveFlow(screenFlowMarkdown);
  const projected = buildFlowDiagramScreenFlowProjection(resolved);

  assert.deepEqual(projected.nodes.map((node) => node.id), [
    "checkout_screen",
    "completion_screen",
    "error_message"
  ]);
  assert.equal(projected.edges.length, 2);
  assert.equal(projected.edges.some((edge) => edge.source === "checkout_screen" && edge.target === "session_store"), false);
  assert.equal(projected.edges.some((edge) => edge.source === "checkout_screen" && edge.target === "completion_screen"), true);
  assert.equal(projected.edges.some((edge) => edge.source === "checkout_screen" && edge.target === "error_message"), true);
});

test("flow_diagram screen view deduplicates projected edges and merges labels", () => {
  const { resolved } = resolveFlow(screenFlowMarkdown);
  const projected = buildFlowDiagramScreenFlowProjection(resolved);
  const completionEdges = projected.edges.filter((edge) =>
    edge.source === "checkout_screen" && edge.target === "completion_screen"
  );

  assert.equal(completionEdges.length, 1);
  assert.match(completionEdges[0].label ?? "", /^(success \/ alternate|alternate \/ success)$/);
  assert.equal(completionEdges[0].metadata.projected, true);
});

test("flow_diagram screen flow Mermaid hides collapsed nodes and uses projected labels", () => {
  const { resolved } = resolveFlow(screenFlowMarkdown);
  const source = buildDfdMermaidSource(resolved, undefined, "screen");

  assert.match(source, /checkout_screen@\{ shape: curv-trap, label: "Checkout Screen" \}/);
  assert.match(source, /completion_screen@\{ shape: curv-trap, label: "Completion Screen" \}/);
  assert.match(source, /error_message@\{ shape: rect, label: "Error Message" \}/);
  assert.doesNotMatch(source, /submit_action@/);
  assert.doesNotMatch(source, /checkout_process@/);
  assert.doesNotMatch(source, /session_store@/);
  assert.match(source, /checkout_screen -->\|(success \/ alternate|alternate \/ success)\| completion_screen/);
  assert.match(source, /checkout_screen -->\|failed\| error_message/);
  assert.doesNotMatch(source, /Checkout input|Session data/);
});
test("flow_diagram effective mode drives Mermaid source in both directions", () => {
  const { resolved } = resolveFlow(screenFlowMarkdown);
  const detailSource = buildDfdMermaidSource(resolved, undefined, "detail");
  const screenSource = buildDfdMermaidSource(resolved, undefined, "screen");
  const detailAgain = buildDfdMermaidSource(resolved, undefined, "detail");

  assert.match(detailSource, /submit_action@/);
  assert.match(detailSource, /session_store@/);
  assert.doesNotMatch(screenSource, /submit_action@/);
  assert.doesNotMatch(screenSource, /session_store@/);
  assert.equal(detailAgain, detailSource);
});

test("flow_diagram screen view falls back to detail when no visible nodes exist", () => {
  const markdown = `---
type: flow_diagram
id: FLOW-INTERNAL-ONLY
name: Internal Only Flow
kind: screen_communication
flow_view: screen
---

## Objects

| id | label | kind | ref | domain | notes |
|---|---|---|---|---|---|
| process_a | Process A | app_process | | application | Internal process |
| store_a | Store A | session | | data | Internal store |

## Flows

| id | from | to | kind | trigger | data | condition | notes |
|---|---|---|---|---|---|---|---|
| F01 | process_a | store_a | store | save | Session data | | Store state |
`;
  const { resolved } = resolveFlow(markdown);
  const projected = buildFlowDiagramScreenFlowProjection(resolved);
  const source = buildDfdMermaidSource(resolved);

  assert.deepEqual(projected.nodes.map((node) => node.id), ["process_a", "store_a"]);
  assert.equal(projected.edges.length, 1);
  assert.match(source, /process_a@\{ shape: rect, label: "Process A" \}/);
  assert.match(source, /store_a@\{ shape: lin-cyl, label: "Store A" \}/);
  assert.match(source, /process_a -->\|save \/ Session data\| store_a/);
});
test("flow_diagram Flows.data plain text does not warn", () => {
  const warnings = getFlowDiagramDataWarnings(flowMarkdown.replace("[[DATA-ORDER-REQUEST]]", "DATA-ORDER-DRAFT"));

  assert.equal(warnings.length, 0);
});

test("flow_diagram Flows.data empty value does not warn", () => {
  const warnings = getFlowDiagramDataWarnings(flowMarkdown.replace("[[DATA-ORDER-REQUEST]]", ""));

  assert.equal(warnings.length, 0);
});

test("flow_diagram Flows.data resolved Wikilink does not warn", () => {
  const warnings = getFlowDiagramDataWarnings(flowMarkdown, [
    { path: "DATA-ORDER-REQUEST.md", content: "---\ntype: data_object\nid: DATA-ORDER-REQUEST\nname: Order Request\n---\n" }
  ]);

  assert.equal(warnings.length, 0);
});

test("flow_diagram Flows.data unresolved Wikilink emits unresolved-reference warning", () => {
  const warnings = getFlowDiagramDataWarnings(flowMarkdown);
  const diagnostic = warnings.find((warning) => warning.context.referenceValue === "[[DATA-ORDER-REQUEST]]");

  assert.ok(diagnostic);
  assert.equal(diagnostic.message, 'Flow Diagram flow data reference "[[DATA-ORDER-REQUEST]]" could not be resolved. Check the data/model id or file name.');
  assert.equal(diagnostic.severity, "warning");
  assert.equal(diagnostic.field, "data");
  assert.equal(diagnostic.context.section, "Flows");
  assert.equal(diagnostic.context.rowIndex, 1);
  assert.equal(getExpectedHeaderForDiagnostic(diagnostic), null);

  const t = createModelWeaveTranslator("en");
  const details = getDiagnosticDetailEntries(diagnostic, t);
  assert.equal(details.some((entry) => /local .*Objects.* table/.test(entry.value)), false);
});

test("flow_diagram Flows.data multiple Wikilinks warn only for unresolved links", () => {
  const markdown = flowMarkdown.replace("[[DATA-ORDER-REQUEST]]", "[[DATA-A]], [[DATA-B]]");
  const warnings = getFlowDiagramDataWarnings(markdown, [
    { path: "DATA-A.md", content: "---\ntype: data_object\nid: DATA-A\nname: Data A\n---\n" }
  ]);

  assert.deepEqual(warnings.map((warning) => warning.context.referenceValue), ["[[DATA-B]]"]);
});

test("flow_diagram object hover metadata is generated for each Objects row", () => {
  const { resolved } = resolveFlow();
  const metadata = buildFlowDiagramHoverMetadata(resolved, "FLOW-ORDER-SCREEN-COMMUNICATION.md");

  assert.equal(metadata.objects.length, resolved.nodes.length);
  assert.deepEqual(metadata.objects.map((target) => target.mermaidId), [
    "order_screen",
    "order_process",
    "session_store",
    "data_store",
    "mystery"
  ]);
});

test("flow_diagram object hover metadata includes row details and raw wikilink ref", () => {
  const { resolved } = resolveFlow();
  const metadata = buildFlowDiagramHoverMetadata(resolved, "FLOW-ORDER-SCREEN-COMMUNICATION.md");
  const target = metadata.objects.find((entry) => entry.nodeId === "order_screen");

  assert.ok(target);
  assert.equal(target.hoverTitle, "Flow Object");
  assert.deepEqual(
    Object.fromEntries(target.hoverRows.map((row) => [row.label, row.value])),
    {
      id: "order_screen",
      label: "Order Screen",
      kind: "screen",
      domain: "order",
      ref: "[[SCR-ORDER]]",
      notes: "Source screen"
    }
  );
  assert.match(target.hoverText, /Flow Object/);
  assert.match(target.hoverText, /ref: \[\[SCR-ORDER\]\]/);
});

test("flow_diagram object hover metadata exposes resolved file path for resolved wikilink ref", () => {
  const { resolved } = resolveFlow(flowMarkdown, [
    { path: "SCR-ORDER.md", content: "---\ntype: screen\nid: SCR-ORDER\nname: Order Screen\n---\n" }
  ]);
  const metadata = buildFlowDiagramHoverMetadata(resolved, "FLOW-ORDER-SCREEN-COMMUNICATION.md");
  const target = metadata.objects.find((entry) => entry.nodeId === "order_screen");

  assert.ok(target);
  assert.equal(target.previewLinktext, "SCR-ORDER.md");
  assert.equal(target.filePath, "SCR-ORDER.md");
  assert.notEqual(target.previewLinktext, "[[SCR-ORDER]]");
  assert.match(target.nativeTooltip, /Flow Object: order_screen/);
  assert.match(target.nativeTooltip, /ref: \[\[SCR-ORDER\]\]/);
  assert.ok(target.hoverRows.length > 0);
});

test("flow_diagram plain or unresolved object ref falls back to custom card metadata", () => {
  const markdown = flowMarkdown.replace("[[SCR-ORDER]]", "SCR-MISSING");
  const { resolved } = resolveFlow(markdown);
  const metadata = buildFlowDiagramHoverMetadata(resolved, "FLOW-ORDER-SCREEN-COMMUNICATION.md");
  const target = metadata.objects.find((entry) => entry.nodeId === "order_screen");

  assert.ok(target);
  assert.equal(target.previewLinktext, undefined);
  assert.equal(target.hoverTitle, "Flow Object");
  assert.equal(target.hoverRows.find((row) => row.label === "ref")?.value, "SCR-MISSING");
  assert.match(target.nativeTooltip, /ref: SCR-MISSING/);
  assert.notEqual(target.hoverText, undefined);
});

test("flow_diagram unresolved object ref wikilink falls back without raw Page Preview target", () => {
  const markdown = flowMarkdown.replace("[[SCR-ORDER]]", "[[SCR-MISSING]]");
  const { resolved } = resolveFlow(markdown);
  const metadata = buildFlowDiagramHoverMetadata(resolved, "FLOW-ORDER-SCREEN-COMMUNICATION.md");
  const target = metadata.objects.find((entry) => entry.nodeId === "order_screen");

  assert.ok(target);
  assert.equal(target.previewLinktext, undefined);
  assert.equal(target.filePath, undefined);
  assert.equal(target.hoverRows.find((row) => row.label === "ref")?.value, "[[SCR-MISSING]]");
  assert.match(target.nativeTooltip, /ref: \[\[SCR-MISSING\]\]/);
});

test("flow_diagram empty object ref has fallback card metadata and safe tooltip", () => {
  const { resolved } = resolveFlow();
  const metadata = buildFlowDiagramHoverMetadata(resolved, "FLOW-ORDER-SCREEN-COMMUNICATION.md");
  const target = metadata.objects.find((entry) => entry.nodeId === "session_store");

  assert.ok(target);
  assert.equal(target.previewLinktext, undefined);
  assert.equal(target.hoverRows.find((row) => row.label === "ref")?.value, undefined);
  assert.match(target.nativeTooltip, /Flow Object: session_store/);
  assert.match(target.nativeTooltip, /ref: -/);
});

test("flow_diagram flow hover metadata is generated for each Flows row", () => {
  const { resolved } = resolveFlow();
  const metadata = buildFlowDiagramHoverMetadata(resolved, "FLOW-ORDER-SCREEN-COMMUNICATION.md");

  assert.equal(metadata.flows.length, resolved.edges.length);
  assert.deepEqual(metadata.flows.map((target) => target.mermaidId), [
    "FLOW_1_FLOW_001",
    "FLOW_2_FLOW_002",
    "FLOW_3_FLOW_003",
    "FLOW_4_FLOW_004"
  ]);
});

test("flow_diagram flow hover metadata includes row details and raw data ref", () => {
  const { resolved } = resolveFlow();
  const metadata = buildFlowDiagramHoverMetadata(resolved, "FLOW-ORDER-SCREEN-COMMUNICATION.md");
  const target = metadata.flows.find((entry) => entry.edgeId === "FLOW-001");

  assert.ok(target);
  assert.equal(target.hoverTitle, "Flow");
  assert.deepEqual(
    Object.fromEntries(target.hoverRows.map((row) => [row.label, row.value])),
    {
      id: "FLOW-001",
      from: "order_screen",
      to: "order_process",
      kind: "submit",
      trigger: "click:Submit",
      data: "[[DATA-ORDER-REQUEST]]",
      condition: "valid",
      notes: "Submit order"
    }
  );
  assert.match(target.hoverText, /kind: submit/);
  assert.match(target.hoverText, /trigger: click:Submit/);
  assert.match(target.hoverText, /data: \[\[DATA-ORDER-REQUEST\]\]/);
  assert.match(target.hoverText, /condition: valid/);
});

test("flow_diagram flow hover metadata exposes resolved file path for resolved wikilink data", () => {
  const { resolved } = resolveFlow(flowMarkdown, [
    { path: "DATA-ORDER-REQUEST.md", content: "---\ntype: data_object\nid: DATA-ORDER-REQUEST\nname: Order Request\n---\n" }
  ]);
  const metadata = buildFlowDiagramHoverMetadata(resolved, "FLOW-ORDER-SCREEN-COMMUNICATION.md");
  const target = metadata.flows.find((entry) => entry.edgeId === "FLOW-001");

  assert.ok(target);
  assert.equal(target.previewLinktext, "DATA-ORDER-REQUEST.md");
  assert.equal(target.filePath, "DATA-ORDER-REQUEST.md");
  assert.notEqual(target.previewLinktext, "[[DATA-ORDER-REQUEST]]");
  assert.match(target.nativeTooltip, /Flow: FLOW-001/);
  assert.match(target.nativeTooltip, /kind: submit/);
  assert.match(target.nativeTooltip, /trigger: click:Submit/);
  assert.match(target.nativeTooltip, /data: \[\[DATA-ORDER-REQUEST\]\]/);
  assert.match(target.nativeTooltip, /condition: valid/);
  assert.ok(target.hoverRows.length > 0);
});

test("flow_diagram plain flow data falls back to custom card metadata", () => {
  const { resolved } = resolveFlow();
  const metadata = buildFlowDiagramHoverMetadata(resolved, "FLOW-ORDER-SCREEN-COMMUNICATION.md");
  const target = metadata.flows.find((entry) => entry.edgeId === "FLOW-002");

  assert.ok(target);
  assert.equal(target.previewLinktext, undefined);
  assert.equal(target.hoverTitle, "Flow");
  assert.equal(target.hoverRows.find((row) => row.label === "kind")?.value, "context_update");
  assert.equal(target.hoverRows.find((row) => row.label === "data")?.value, "Order result");
  assert.match(target.nativeTooltip, /data: Order result/);
  assert.notEqual(target.hoverText, undefined);
});

test("flow_diagram unresolved flow data wikilink falls back without raw Page Preview target", () => {
  const { resolved } = resolveFlow();
  const metadata = buildFlowDiagramHoverMetadata(resolved, "FLOW-ORDER-SCREEN-COMMUNICATION.md");
  const target = metadata.flows.find((entry) => entry.edgeId === "FLOW-001");

  assert.ok(target);
  assert.equal(target.previewLinktext, undefined);
  assert.equal(target.filePath, undefined);
  assert.equal(target.hoverRows.find((row) => row.label === "data")?.value, "[[DATA-ORDER-REQUEST]]");
  assert.match(target.nativeTooltip, /data: \[\[DATA-ORDER-REQUEST\]\]/);
});

test("flow_diagram empty flow data has fallback card metadata and safe tooltip", () => {
  const markdown = flowMarkdown.replace("| FLOW-002 | order_process | session_store | context_update |  | Order result |  | Store result |", "| FLOW-002 | order_process | session_store | context_update |  |  |  | Store result |");
  const { resolved } = resolveFlow(markdown);
  const metadata = buildFlowDiagramHoverMetadata(resolved, "FLOW-ORDER-SCREEN-COMMUNICATION.md");
  const target = metadata.flows.find((entry) => entry.edgeId === "FLOW-002");

  assert.ok(target);
  assert.equal(target.previewLinktext, undefined);
  assert.equal(target.hoverRows.find((row) => row.label === "data")?.value, undefined);
  assert.match(target.nativeTooltip, /Flow: FLOW-002/);
  assert.match(target.nativeTooltip, /data: -/);
});

test("flow_diagram hover metadata is not native-tooltip-only", () => {
  const { resolved } = resolveFlow();
  const metadata = buildFlowDiagramHoverMetadata(resolved, "FLOW-ORDER-SCREEN-COMMUNICATION.md");

  assert.equal(metadata.objects.every((target) => target.hoverRows.length > 0), true);
  assert.equal(metadata.flows.every((target) => target.hoverRows.length > 0), true);
  assert.equal(metadata.objects.some((target) => target.previewLinktext), false);
});

test("flow_diagram hover metadata uses stable node and flow mapping keys", () => {
  const { resolved } = resolveFlow(flowDomainMarkdown);
  const metadata = buildFlowDiagramHoverMetadata(resolved, "FLOW-ORDER-SCREEN-COMMUNICATION.md");

  assert.equal(metadata.objects.find((target) => target.nodeId === "ORDER_ENTRY")?.mermaidId, "ORDER_ENTRY");
  assert.equal(metadata.objects.find((target) => target.nodeId === "SESSION_STORE")?.mermaidId, "SESSION_STORE");
  assert.equal(metadata.flows.find((target) => target.edgeId === "F01")?.mermaidId, "FLOW_1_F01");
  assert.equal(metadata.flows.find((target) => target.edgeId === "F05")?.mermaidId, "FLOW_5_F05");
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


test("flow_diagram old Flows header is rejected with new expected header guidance", () => {
  const oldHeaderMarkdown = flowMarkdown
    .replace("| id | from | to | kind | trigger | data | condition | notes |", "| id | from | to | data | notes |")
    .replace("|---|---|---|---|---|---|---|---|", "|---|---|---|---|---|");
  const parsed = parseFlow(oldHeaderMarkdown);
  const diagnostics = buildCurrentDiagramDiagnostics({ diagram: parsed.file }, parsed.warnings);
  const tableDiagnostic = diagnostics.find((diagnostic) => diagnostic.code === "invalid-table-column" && /Flows/.test(diagnostic.message));

  assert.ok(tableDiagnostic);
  assert.equal(getExpectedHeaderForDiagnostic(tableDiagnostic), "id | from | to | kind | trigger | data | condition | notes");
});

test("flow_diagram malformed Flows header exposes expected header and suppresses row cascade", () => {
  const markdown = flowMarkdown.replace("| id | from | to | kind | trigger | data | condition | notes |", "| id | frow | to | data | notes |");
  const parsed = parseFlow(markdown);
  const diagnostics = buildCurrentDiagramDiagnostics({ diagram: parsed.file }, parsed.warnings);
  const tableDiagnostic = diagnostics.find((diagnostic) => diagnostic.code === "invalid-table-column" && /Flows/.test(diagnostic.message));

  assert.ok(tableDiagnostic);
  assert.equal(getExpectedHeaderForDiagnostic(tableDiagnostic), "id | from | to | kind | trigger | data | condition | notes");
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

| id | from | to | kind | trigger | data | condition | notes |
|---|---|---|---|---|---|---|---|
| F01 | ORDER_ENTRY | ORDER_CONTEXT | context_update | click:SaveDraft | [[DATA-ORDER-DRAFT]] | dirty | Keep draft |
| F02 | ORDER_CONTEXT | CUSTOMER_SEARCH | navigate | click:SearchCustomer | [[DATA-CUSTOMER-SEARCH-CONDITION]] |  | Open search |
| F03 | CUSTOMER_SEARCH | ORDER_CONTEXT | return | select:Customer | [[DATA-CUSTOMER-SELECTION]] | customer selected | Return selection |
| F04 | ORDER_CONTEXT | ORDER_ENTRY | context_update |  | [[DATA-CUSTOMER-SELECTION]] | customer selected | Apply selection |
| F05 | ORDER_CONTEXT | SESSION_STORE | store |  | [[DATA-ORDER-DRAFT]] |  | Save draft |
| F06 | ORDER_ENTRY | ORDER_SUBMIT | submit | click:Submit | [[DATA-ORDER-DRAFT]] | valid | Submit |
`;


const flowDomainSourceMarkdown = `---
type: domains
id: DOMAINS-FLOW-TEST
name: Flow Test Domains
---

## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| checkout_system | Checkout System | system | | Overall checkout boundary |
| frontend_area | Frontend Area | ui | checkout_system | Browser and screen side |
| application_area | Application Area | application | checkout_system | Application handling |
| data_area | Data Area | data | checkout_system | Data boundary |
`;

const flowDomainSourceDiagramMarkdown = `---
type: flow_diagram
id: FLOW-ORDER-SCREEN-COMMUNICATION
name: Order Screen Communication Flow
kind: screen_communication
---

## Domain Sources

| ref | notes |
|---|---|
| [[DOMAINS-FLOW-TEST]] | test domains |

## Objects

| id | label | kind | ref | domain | notes |
|---|---|---|---|---|---|
| ORDER_ENTRY | Order Entry Screen | screen | | frontend_area | Parent screen |
| ORDER_SUBMIT | Order Submit Process | app_process | | application_area | Submit process |
| SESSION_STORE | Session Store | session | | data_area | Temporary persistence |

## Flows

| id | from | to | kind | trigger | data | condition | notes |
|---|---|---|---|---|---|---|---|
| F01 | ORDER_ENTRY | ORDER_SUBMIT | submit | click:Submit | Order draft | valid | Submit |
| F02 | ORDER_SUBMIT | SESSION_STORE | store | save | Session data | | Save session |
`;

test("flow_diagram parses Domain Sources and local Domains sections", () => {
  const markdown = flowDomainSourceDiagramMarkdown.replace(
    "## Objects",
    "## Domains\n\n| id | name | kind | parent | description |\n|---|---|---|---|---|\n| local_area | Local Area | local | checkout_system | Local override area |\n\n## Objects"
  );
  const { file, warnings } = parseFlow(markdown);

  assert.equal(warnings.some((warning) => warning.code === "invalid-table-column"), false);
  assert.equal(file.domainSources.length, 1);
  assert.equal(file.domainSources[0].ref, "[[DOMAINS-FLOW-TEST]]");
  assert.equal(file.domains?.length, 1);
  assert.equal(file.domains?.[0].id, "local_area");
});

test("flow_diagram Domain Sources resolve Domain name, kind, and parent for nested groups", () => {
  const { resolved } = resolveFlow(flowDomainSourceDiagramMarkdown, [
    { path: "DOMAINS-FLOW-TEST.md", content: flowDomainSourceMarkdown }
  ]);
  const source = buildDfdMermaidSource(resolved, {
    id: "COLOR-FLOW-DOMAIN-TEST",
    name: "Flow Domain Test Colors",
    entries: [
      { target: "domain", kind: "system", fill: "#f7f7f7", stroke: "#999999", text: "#222222", rowIndex: 0 },
      { target: "domain", kind: "ui", fill: "#e8f1ff", stroke: "#3b73d9", text: "#102a5c", rowIndex: 1 },
      { target: "domain", kind: "application", fill: "#e9fbe9", stroke: "#2f8f46", text: "#123d1b", rowIndex: 2 },
      { target: "domain", kind: "data", fill: "#f3e8ff", stroke: "#7c3bbd", text: "#2d124c", rowIndex: 3 }
    ],
    defaultStyle: { fill: "#f5f5f5", stroke: "#9e9e9e", text: "#111111" }
  });

  assert.match(source, /subgraph DOMAIN_checkout_system\["Checkout System"\]/);
  assert.match(source, /subgraph DOMAIN_frontend_area\["Frontend Area"\]/);
  assert.match(source, /subgraph DOMAIN_checkout_system[\s\S]*subgraph DOMAIN_frontend_area[\s\S]*ORDER_ENTRY/);
  assert.match(source, /subgraph DOMAIN_checkout_system[\s\S]*subgraph DOMAIN_application_area[\s\S]*ORDER_SUBMIT/);
  assert.match(source, /subgraph DOMAIN_checkout_system[\s\S]*subgraph DOMAIN_data_area[\s\S]*SESSION_STORE/);
  assert.match(source, /style DOMAIN_frontend_area fill:#e8f1ff,stroke:#3b73d9,color:#102a5c/);
  assert.match(source, /style DOMAIN_application_area fill:#e9fbe9,stroke:#2f8f46,color:#123d1b/);
});

test("flow_diagram screen view preserves resolved Domain Sources for visible screens", () => {
  const markdown = flowDomainSourceDiagramMarkdown
    .replace("kind: screen_communication", "kind: screen_communication\nflow_view: screen")
    .replace(
      "| SESSION_STORE | Session Store | session | | data_area | Temporary persistence |",
      "| SESSION_STORE | Session Store | session | | data_area | Temporary persistence |\n| CONFIRM_SCREEN | Confirmation Screen | screen | | frontend_area | Completion screen |"
    )
    .replace(
      "| F02 | ORDER_SUBMIT | SESSION_STORE | store | save | Session data | | Save session |",
      "| F02 | ORDER_SUBMIT | SESSION_STORE | store | save | Session data | | Save session |\n| F03 | ORDER_SUBMIT | CONFIRM_SCREEN | navigate | showComplete | Confirmation data | success | Show completion |"
    );
  const { resolved } = resolveFlow(markdown, [
    { path: "DOMAINS-FLOW-TEST.md", content: flowDomainSourceMarkdown }
  ]);
  const source = buildDfdMermaidSource(resolved, {
    id: "COLOR-FLOW-DOMAIN-TEST",
    name: "Flow Domain Test Colors",
    entries: [
      { target: "domain", kind: "system", fill: "#f7f7f7", stroke: "#999999", text: "#222222", rowIndex: 0 },
      { target: "domain", kind: "ui", fill: "#e8f1ff", stroke: "#3b73d9", text: "#102a5c", rowIndex: 1 },
      { target: "domain", kind: "application", fill: "#e9fbe9", stroke: "#2f8f46", text: "#123d1b", rowIndex: 2 },
      { target: "domain", kind: "data", fill: "#f3e8ff", stroke: "#7c3bbd", text: "#2d124c", rowIndex: 3 }
    ],
    defaultStyle: { fill: "#f5f5f5", stroke: "#9e9e9e", text: "#111111" }
  }, "screen");

  assert.match(source, /subgraph DOMAIN_checkout_system\["Checkout System"\]/);
  assert.match(source, /subgraph DOMAIN_frontend_area\["Frontend Area"\]/);
  assert.match(source, /subgraph DOMAIN_checkout_system[\s\S]*subgraph DOMAIN_frontend_area[\s\S]*ORDER_ENTRY/);
  assert.match(source, /subgraph DOMAIN_frontend_area[\s\S]*CONFIRM_SCREEN/);
  assert.doesNotMatch(source, /ORDER_SUBMIT@/);
  assert.doesNotMatch(source, /SESSION_STORE@/);
  assert.match(source, /ORDER_ENTRY -->\|success\| CONFIRM_SCREEN/);
  assert.match(source, /style DOMAIN_frontend_area fill:#e8f1ff,stroke:#3b73d9,color:#102a5c/);
});
test("flow_diagram local Domains resolve names, kinds, and nested parents", () => {
  const markdown = flowDomainSourceDiagramMarkdown
    .replace("## Domain Sources\n\n| ref | notes |\n|---|---|\n| [[DOMAINS-FLOW-TEST]] | test domains |\n\n", "")
    .replace(
      "## Objects",
      "## Domains\n\n| id | name | kind | parent | description |\n|---|---|---|---|---|\n| checkout_system | Checkout System | system | | Overall checkout boundary |\n| frontend_area | Frontend Area | ui | checkout_system | Browser and screen side |\n| application_area | Application Area | application | checkout_system | Application handling |\n| data_area | Data Area | data | checkout_system | Data boundary |\n\n## Objects"
    );
  const { resolved } = resolveFlow(markdown);
  const source = buildDfdMermaidSource(resolved);

  assert.match(source, /subgraph DOMAIN_checkout_system\["Checkout System"\]/);
  assert.match(source, /subgraph DOMAIN_frontend_area\["Frontend Area"\]/);
  assert.match(source, /subgraph DOMAIN_checkout_system[\s\S]*subgraph DOMAIN_data_area[\s\S]*SESSION_STORE/);
});

test("flow_diagram without Domain Sources or local Domains keeps raw synthetic domain groups without warnings", () => {
  const { model, resolved } = resolveFlow(flowDomainMarkdown);
  const diagnostics = buildCurrentDiagramDiagnostics({ diagram: model }, [
    ...(resolved.warnings ?? [])
  ]);
  const source = buildDfdMermaidSource(resolved);

  assert.match(source, /subgraph DOMAIN_sales\["sales"\]/);
  assert.equal(
    diagnostics.some((warning) => warning.field === "Objects.domain" && /unknown Domain/.test(warning.message)),
    false
  );
});

test("flow_diagram with Domain Sources warns for unknown Objects.domain", () => {
  const markdown = flowDomainSourceDiagramMarkdown.replaceAll("frontend_area", "missing_area");
  const { model, resolved } = resolveFlow(markdown, [
    { path: "DOMAINS-FLOW-TEST.md", content: flowDomainSourceMarkdown }
  ]);
  const diagnostics = buildCurrentDiagramDiagnostics({ diagram: model }, [
    ...(resolved.warnings ?? [])
  ]);

  assert.equal(
    diagnostics.some((warning) =>
      warning.code === "unresolved-reference" &&
      warning.field === "Objects.domain" &&
      /Flow Diagram object "ORDER_ENTRY" references unknown Domain "missing_area"/.test(warning.message)
    ),
    true
  );
});

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
  assert.match(source, /ORDER_ENTRY -->\|click:SaveDraft \/ DATA-ORDER-DRAFT\| ORDER_CONTEXT/);
  assert.match(source, /ORDER_CONTEXT -->\|store \/ DATA-ORDER-DRAFT\| SESSION_STORE/);
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
    { target: "domain", kind: "application", fill: "#DDEBFF", stroke: "#4F81BD", text: "#111111", rowIndex: 1 },
    { target: "flow_diagram", kind: "screen", fill: "#fff4cc", stroke: "#bf9000", text: "#111111", rowIndex: 2 },
    { target: "flow_diagram", kind: "app_process", fill: "#e2f0d9", stroke: "#70ad47", text: "#111111", rowIndex: 3 }
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
  assert.match(source, /ORDER_ENTRY -->\|click:SaveDraft \/ DATA-ORDER-DRAFT\| ORDER_CONTEXT/);
});

test("flow_diagram Applied Color Scheme targets include used domain rows", () => {
  const { resolved } = resolveFlow(flowDomainMarkdown);
  const targets = getDfdMermaidColorSchemeTargets(resolved);
  const rows = getAppliedColorSchemeRowsForTargets(flowDomainColorScheme, targets);

  assert.deepEqual(targets, ["flow_diagram", "domain"]);
  assert.equal(rows.some((row) => row.entry.target === "flow_diagram" && row.entry.kind === "screen"), true);
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
