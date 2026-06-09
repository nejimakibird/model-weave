import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const outputFile = "dist/test-app-process-domain-placement.mjs";

await build({
  stdin: {
    contents: [
      'export { parseAppProcessFile } from "./src/parsers/app-process-parser";',
      'export { buildAppProcessBusinessFlowMermaidSource } from "./src/renderers/app-process-business-flow";'
    ].join("\n"),
    resolveDir: ".",
    sourcefile: "test-app-process-domain-placement-entry.ts",
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
          contents: [
            "export const Platform = {};",
            "export class Notice {};",
            "export class TFile {};",
            "export class ItemView {};",
            "export class WorkspaceLeaf {};",
            "export const MarkdownRenderer = {};",
            "export const normalizePath = (value) => value;",
            "export const getLanguage = () => 'en';",
            "export const loadMermaid = async () => ({ render: async () => ({ svg: '' }) });"
          ].join("\n"),
          loader: "js"
        }));
      }
    }
  ],
  outfile: outputFile,
  logLevel: "silent"
});

const {
  parseAppProcessFile,
  buildAppProcessBusinessFlowMermaidSource
} = await import(`../${outputFile}?t=${Date.now()}`);

function processMarkdown(stepsHeader, stepsRows) {
  return `---
type: app_process
id: PROC-DOMAIN-PLACEMENT
name: Domain Placement
---

# Domain Placement

## Steps

${stepsHeader}
${stepsRows}
`;
}

function parseSteps(stepsHeader, stepsRows) {
  const result = parseAppProcessFile(
    processMarkdown(stepsHeader, stepsRows),
    "PROC-DOMAIN-PLACEMENT.md"
  );
  assert.ok(result.file);
  return result;
}

test("app_process legacy lane Steps header still parses", () => {
  const { file, warnings } = parseSteps(
    [
      "| id | lane | label | kind | input | output | rule | invoke | screen | notes |",
      "|---|---|---|---|---|---|---|---|---|---|"
    ].join("\n"),
    "| receive | System | Receive order | process |  |  |  |  |  | legacy lane |"
  );

  assert.equal(file.steps.length, 1);
  assert.equal(file.steps[0].domain, undefined);
  assert.equal(file.steps[0].lane, "System");
  assert.equal(warnings.some((warning) => warning.field === "Steps"), false);
});

test("app_process domain Steps header parses recommended placement", () => {
  const { file, warnings } = parseSteps(
    [
      "| id | domain | label | kind | input | output | rule | invoke | screen | notes |",
      "|---|---|---|---|---|---|---|---|---|---|"
    ].join("\n"),
    "| receive | fulfillment | Receive order | process |  |  |  |  |  | domain placement |"
  );

  assert.equal(file.steps.length, 1);
  assert.equal(file.steps[0].domain, "fulfillment");
  assert.equal(file.steps[0].lane, undefined);
  assert.equal(warnings.some((warning) => warning.field === "Steps"), false);
});

test("app_process transitional domain and lane header warns that domain wins", () => {
  const { file, warnings } = parseSteps(
    [
      "| id | domain | lane | label | kind | input | output | rule | invoke | screen | notes |",
      "|---|---|---|---|---|---|---|---|---|---|---|"
    ].join("\n"),
    "| receive | fulfillment | Legacy System | Receive order | process |  |  |  |  |  | mixed placement |"
  );

  assert.equal(file.steps.length, 1);
  assert.equal(file.steps[0].domain, "fulfillment");
  assert.equal(file.steps[0].lane, "Legacy System");
  assert.ok(warnings.some((warning) =>
    warning.message === 'Step "receive" has both domain and lane. domain is used and lane is ignored.'
  ));
});

test("app_process renderer groups by domain before legacy lane", () => {
  const source = buildAppProcessBusinessFlowMermaidSource({
    title: "Domain grouping",
    hasExplicitFlows: false,
    steps: [
      { id: "receive", domain: "fulfillment", lane: "Legacy System", label: "Receive", kind: "process" },
      { id: "validate", domain: "fulfillment", label: "Validate", kind: "decision" },
      { id: "notify", lane: "Legacy User", label: "Notify", kind: "end" },
      { id: "audit", label: "Audit", kind: "process" }
    ],
    flows: []
  });

  assert.match(source, /subgraph L1\["fulfillment"\]/);
  assert.doesNotMatch(source, /subgraph L\d\["Legacy System"\]/);
  assert.match(source, /subgraph L2\["Legacy User"\]/);
  assert.match(source, /S4\["Audit"\]/);
});

test("app_process step color classes still use app_process kind", () => {
  const scheme = {
    id: "test",
    name: "Test",
    entries: [
      { target: "domain", kind: "fulfillment", fill: "#000000", stroke: "#000000", text: "#ffffff", rowIndex: 0 },
      { target: "app_process", kind: "process", fill: "#e8f5e9", stroke: "#388e3c", text: "#111111", rowIndex: 1 },
      { kind: "default", fill: "#f5f5f5", stroke: "#9e9e9e", text: "#111111", rowIndex: 2 }
    ],
    defaultStyle: {
      fill: "#f5f5f5",
      stroke: "#9e9e9e",
      text: "#111111"
    }
  };
  const source = buildAppProcessBusinessFlowMermaidSource({
    title: "Color target",
    hasExplicitFlows: false,
    steps: [
      { id: "receive", domain: "fulfillment", label: "Receive", kind: "process" }
    ],
    flows: []
  }, scheme);

  assert.match(source, /subgraph L1\["fulfillment"\]/);
  assert.match(source, /classDef kind_app_process_process fill:#e8f5e9,stroke:#388e3c,color:#111111/);
  assert.match(source, /class S1 kind_app_process_process/);
  assert.doesNotMatch(source, /kind_domain_/);
  assert.doesNotMatch(source, /fill:#000000,stroke:#000000,color:#ffffff/);
});
