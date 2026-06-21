import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const outputFile = "dist/test-app-process-domain-placement.mjs";

await build({
  stdin: {
    contents: [
      'export { parseAppProcessFile } from "./src/parsers/app-process-parser";',
      'export { resolveAppProcessDomainPlacement } from "./src/core/app-process-domain-resolver";',
      'export { buildVaultIndex } from "./src/core/vault-index";',
      'export { buildCurrentObjectDiagnostics, localizeDiagnosticMessage } from "./src/core/current-file-diagnostics";',
      'export { buildAppProcessBusinessFlowMermaidSource, getAppProcessBusinessFlowColorSchemeTargets } from "./src/renderers/app-process-business-flow";'
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
    },
    {
      name: "stub-node-builtins",
      setup(buildApi) {
        buildApi.onResolve({ filter: /^(fs|path|electron)$/ }, (args) => ({
          path: args.path,
          namespace: "stub"
        }));
        buildApi.onLoad({ filter: /.*/, namespace: "stub" }, (args) => ({
          contents:
            args.path === "path"
              ? "export default {}; export const win32 = {}; export const posix = {};"
              : "export const shell = { openPath: async () => '' }; export default {};",
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
  resolveAppProcessDomainPlacement,
  buildVaultIndex,
  buildCurrentObjectDiagnostics,
  localizeDiagnosticMessage,
  buildAppProcessBusinessFlowMermaidSource,
  getAppProcessBusinessFlowColorSchemeTargets
} = await import(`../${outputFile}?t=${Date.now()}`);

function processMarkdown(stepsHeader, stepsRows, domainSources = "") {
  return `---
type: app_process
id: PROC-DOMAIN-PLACEMENT
name: Domain Placement
---

# Domain Placement

${domainSources}

## Steps

${stepsHeader}
${stepsRows}
`;
}

function domainsMarkdown(rows) {
  return `---
type: domains
id: DOMAINS-COMPANY
name: Company Domains
---

# Company Domains

## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
${rows}
`;
}

function localDomainsSection(rows) {
  return [
    "## Domains",
    "",
    "| id | name | kind | parent | description |",
    "|---|---|---|---|---|",
    rows
  ].join("\n");
}

function buildIndexWithProcess(processContent, extraFiles = []) {
  const index = buildVaultIndex([
    {
      path: "PROC-DOMAIN-PLACEMENT.md",
      content: processContent
    },
    ...extraFiles
  ], { parseMode: "full", validate: false });
  const model = index.modelsByFilePath["PROC-DOMAIN-PLACEMENT.md"];
  assert.equal(model.fileType, "app-process");
  return { index, model };
}

const domainStepsHeader = [
  "| id | domain | label | kind | input | output | rule | invoke | screen | notes |",
  "|---|---|---|---|---|---|---|---|---|---|"
].join("\n");

function parseSteps(stepsHeader, stepsRows, preStepsSections = "") {
  const result = parseAppProcessFile(
    processMarkdown(stepsHeader, stepsRows, preStepsSections),
    "PROC-DOMAIN-PLACEMENT.md"
  );
  assert.ok(result.file);
  return result;
}

test("app_process Transitions.to accepts generic Model Weave asset refs", () => {
  const index = buildVaultIndex([
    { path: "PROC-SOURCE.md", content: `---
type: app_process
id: PROC-SOURCE
name: Source process
---

# Source process

## Transitions

| id | event | to | condition | notes |
|---|---|---|---|---|
| TRN-APP | success | [[PROC-TARGET]] | persisted | Return to target process |
| TRN-RULE | audit | [[RULE-TARGET]] | audited | Trace to rule |
| TRN-MISSING | missing | [[PROC-MISSING]] | missing | Missing target |
` },
    { path: "PROC-TARGET.md", content: `---
type: app_process
id: PROC-TARGET
name: Target process
---

# Target process
` },
    { path: "RULE-TARGET.md", content: `---
type: rule
id: RULE-TARGET
name: Target rule
kind: validation
---

# Target rule
` }
  ], { parseMode: "full" });

  const model = index.modelsByFilePath["PROC-SOURCE.md"];
  assert.equal(model.fileType, "app-process");
  const diagnostics = buildCurrentObjectDiagnostics(
    model,
    index,
    null,
    index.warningsByFilePath["PROC-SOURCE.md"] ?? []
  );
  const messages = diagnostics.map((warning) => warning.message);

  assert.equal(
    messages.some((message) => message.includes('transition target reference "[[PROC-TARGET]]"')),
    false
  );
  assert.equal(
    messages.some((message) => message.includes('transition target reference "[[RULE-TARGET]]"')),
    false
  );
  assert.equal(
    messages.some((message) => message.includes('transition target reference "[[PROC-MISSING]]"')),
    true
  );
});

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

test("app_process accepts Domain Sources without notes", () => {
  const { file, warnings } = parseSteps(
    domainStepsHeader,
    "| receive | wms | Receive order | process |  |  |  |  |  | domain placement |",
    [
      "## Domain Sources",
      "",
      "| ref |",
      "|---|",
      "| [[DOMAINS-COMPANY]] |"
    ].join("\n")
  );

  assert.equal(file.domainSources.length, 1);
  assert.equal(file.domainSources[0].ref, "[[DOMAINS-COMPANY]]");
  assert.equal(file.domainSources[0].notes, undefined);
  assert.equal(warnings.some((warning) => warning.field === "Domain Sources"), false);
});

test("app_process accepts Domain Sources with notes", () => {
  const { file, warnings } = parseSteps(
    domainStepsHeader,
    "| receive | wms | Receive order | process |  |  |  |  |  | domain placement |",
    [
      "## Domain Sources",
      "",
      "| ref | notes |",
      "|---|---|",
      "| [[DOMAINS-COMPANY]] | Company domains |"
    ].join("\n")
  );

  assert.equal(file.domainSources.length, 1);
  assert.equal(file.domainSources[0].ref, "[[DOMAINS-COMPANY]]");
  assert.equal(file.domainSources[0].notes, "Company domains");
  assert.equal(warnings.some((warning) => warning.field === "Domain Sources"), false);
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

test("app_process local Domains parse", () => {
  const { file, warnings } = parseSteps(
    domainStepsHeader,
    "| receive | fulfillment | Receive order | process |  |  |  |  |  | local placement |",
    localDomainsSection(
      "| fulfillment | Fulfillment | business_domain | | Fulfillment process area |"
    )
  );

  assert.equal(file.domains.length, 1);
  assert.equal(file.domains[0].id, "fulfillment");
  assert.equal(file.domains[0].kind, "business_domain");
  assert.equal(warnings.length, 0);
});

test("app_process known step domain resolves against local Domains", () => {
  const { index, model } = buildIndexWithProcess(
    processMarkdown(
      domainStepsHeader,
      "| receive | fulfillment | Receive order | process |  |  |  |  |  | resolved locally |",
      localDomainsSection(
        "| fulfillment | Fulfillment | business_domain | | Fulfillment process area |"
      )
    )
  );

  const resolved = resolveAppProcessDomainPlacement(model, index);
  assert.equal(model.domains.length, 1);
  assert.equal(resolved.placements.length, 1);
  assert.equal(resolved.placements[0].status, "resolved");
  assert.equal(resolved.placements[0].domain.name, "Fulfillment");
  assert.equal(resolved.warnings.length, 0);
});

test("app_process unknown step domain warns when local Domains exist", () => {
  const { index, model } = buildIndexWithProcess(
    processMarkdown(
      domainStepsHeader,
      "| receive | missing | Receive order | process |  |  |  |  |  | unresolved locally |",
      localDomainsSection(
        "| fulfillment | Fulfillment | business_domain | | Fulfillment process area |"
      )
    )
  );

  const resolved = resolveAppProcessDomainPlacement(model, index);
  const messages = resolved.warnings.map((warning) => warning.message);
  assert.equal(resolved.placements[0].status, "unresolved");
  assert.ok(messages.includes('app_process Step "receive" references unknown local Domain "missing".'));
  assert.equal(
    localizeDiagnosticMessage(messages[0], "ja"),
    'app_process Step "receive" が未定義のローカル Domain "missing" を参照しています。'
  );
});

test("app_process duplicate local Domain id warns", () => {
  const { warnings } = parseSteps(
    domainStepsHeader,
    "| receive | fulfillment | Receive order | process |  |  |  |  |  | duplicate local domain |",
    localDomainsSection([
      "| fulfillment | Fulfillment | business_domain | | Fulfillment process area |",
      "| fulfillment | Duplicate | business_domain | | Duplicate local domain |"
    ].join("\n"))
  );

  assert.ok(warnings.some((warning) =>
    warning.message === 'duplicate Domain id "fulfillment"'
  ));
});

test("app_process unknown local Domain parent warns", () => {
  const { warnings } = parseSteps(
    domainStepsHeader,
    "| receive | fulfillment | Receive order | process |  |  |  |  |  | unknown parent |",
    localDomainsSection(
      "| fulfillment | Fulfillment | business_domain | missing_parent | Fulfillment process area |"
    )
  );

  assert.ok(warnings.some((warning) =>
    warning.message === 'Domain parent "missing_parent" is not defined.'
  ));
});

test("app_process renderer nests resolved local Domain hierarchy", () => {
  const source = buildAppProcessBusinessFlowMermaidSource({
    title: "Hierarchical domains",
    hasExplicitFlows: false,
    domains: [
      { id: "warehouse", name: "倉庫", kind: "operations", rowIndex: 0 },
      { id: "office", name: "事務所", kind: "organization", parent: "warehouse", rowIndex: 1 },
      { id: "wms", name: "WMS", kind: "system", parent: "office", rowIndex: 2 },
      { id: "floor", name: "フロア", kind: "location", parent: "warehouse", rowIndex: 3 }
    ],
    steps: [
      { id: "start", domain: "office", label: "在庫照会開始", kind: "start" },
      { id: "open", domain: "wms", label: "在庫照会画面を開く", kind: "screen" },
      { id: "judge", domain: "office", label: "在庫有無を判定", kind: "decision" },
      { id: "available", domain: "floor", label: "在庫ありの場合受注", kind: "subflow" }
    ],
    flows: []
  });

  const warehouseIndex = source.indexOf('subgraph domain_warehouse["倉庫"]');
  const officeIndex = source.indexOf('subgraph domain_office["事務所"]');
  const wmsIndex = source.indexOf('subgraph domain_wms["WMS"]');
  const floorIndex = source.indexOf('subgraph domain_floor["フロア"]');
  const openIndex = source.indexOf('S2[/"在庫照会画面を開く"/]');
  const startIndex = source.indexOf('S1(["在庫照会開始"])');
  const judgeIndex = source.indexOf('S3{"在庫有無を判定"}');
  const availableIndex = source.indexOf('S4[["在庫ありの場合受注"]]');

  assert.ok(warehouseIndex >= 0);
  assert.ok(officeIndex > warehouseIndex);
  assert.ok(wmsIndex > officeIndex);
  assert.ok(openIndex > wmsIndex);
  assert.ok(startIndex > openIndex);
  assert.ok(judgeIndex > startIndex);
  assert.ok(floorIndex > judgeIndex);
  assert.ok(availableIndex > floorIndex);
});

test("app_process renderer includes ancestor Domains with no direct steps", () => {
  const source = buildAppProcessBusinessFlowMermaidSource({
    title: "Ancestor container",
    hasExplicitFlows: false,
    domains: [
      { id: "root", name: "Root", rowIndex: 0 },
      { id: "child", name: "Child", parent: "root", rowIndex: 1 }
    ],
    steps: [
      { id: "work", domain: "child", label: "Work", kind: "process" }
    ],
    flows: []
  });

  assert.match(source, /subgraph domain_root\["Root"\]/);
  assert.match(source, /subgraph domain_child\["Child"\]/);
  assert.match(source, /S1\["Work"\]/);
});

test("app_process renderer uses Domain id when name is empty", () => {
  const source = buildAppProcessBusinessFlowMermaidSource({
    title: "Domain id fallback",
    hasExplicitFlows: false,
    domains: [
      { id: "fallback", rowIndex: 0 }
    ],
    steps: [
      { id: "work", domain: "fallback", label: "Work", kind: "process" }
    ],
    flows: []
  });

  assert.match(source, /subgraph domain_fallback\["fallback"\]/);
});

test("app_process renderer treats unknown Domain parent as root-level container", () => {
  const source = buildAppProcessBusinessFlowMermaidSource({
    title: "Unknown parent",
    hasExplicitFlows: false,
    domains: [
      { id: "orphan", name: "Orphan", parent: "missing_parent", rowIndex: 0 }
    ],
    steps: [
      { id: "work", domain: "orphan", label: "Work", kind: "process" }
    ],
    flows: []
  });

  assert.match(source, /^  subgraph domain_orphan\["Orphan"\]/m);
  assert.match(source, /S1\["Work"\]/);
});

test("app_process unresolved domain stays out of local Domain hierarchy", () => {
  const source = buildAppProcessBusinessFlowMermaidSource({
    title: "Unresolved domain",
    hasExplicitFlows: false,
    domains: [
      { id: "known", name: "Known", rowIndex: 0 }
    ],
    steps: [
      { id: "known_step", domain: "known", label: "Known step", kind: "process" },
      { id: "missing_step", domain: "missing", label: "Missing step", kind: "process" }
    ],
    flows: []
  });

  assert.match(source, /subgraph domain_known\["Known"\]/);
  assert.doesNotMatch(source, /subgraph domain_missing/);
  assert.match(source, /subgraph L1\["missing"\]/);
});

test("app_process legacy lane grouping remains flat with local Domains", () => {
  const source = buildAppProcessBusinessFlowMermaidSource({
    title: "Legacy lane",
    hasExplicitFlows: false,
    domains: [
      { id: "known", name: "Known", rowIndex: 0 }
    ],
    steps: [
      { id: "lane_step", lane: "Legacy lane", label: "Lane step", kind: "process" }
    ],
    flows: []
  });

  assert.match(source, /subgraph L1\["Legacy lane"\]/);
  assert.doesNotMatch(source, /subgraph domain_known/);
});

test("app_process renderer supports mixed domain, lane, and ungrouped steps", () => {
  const source = buildAppProcessBusinessFlowMermaidSource({
    title: "Mixed placement",
    hasExplicitFlows: false,
    domains: [
      { id: "known", name: "Known", rowIndex: 0 }
    ],
    steps: [
      { id: "domain_step", domain: "known", label: "Domain step", kind: "process" },
      { id: "lane_step", lane: "Legacy lane", label: "Lane step", kind: "process" },
      { id: "plain_step", label: "Plain step", kind: "process" }
    ],
    flows: []
  });

  assert.match(source, /subgraph domain_known\["Known"\]/);
  assert.match(source, /subgraph L1\["Legacy lane"\]/);
  assert.match(source, /S3\["Plain step"\]/);
});

test("app_process flow edges remain across nested Domain subgraphs", () => {
  const source = buildAppProcessBusinessFlowMermaidSource({
    title: "Nested edges",
    hasExplicitFlows: true,
    domains: [
      { id: "parent", name: "Parent", rowIndex: 0 },
      { id: "child", name: "Child", parent: "parent", rowIndex: 1 }
    ],
    steps: [
      { id: "start", domain: "parent", label: "Start", kind: "start" },
      { id: "work", domain: "child", label: "Work", kind: "process" },
      { id: "done", label: "Done", kind: "end" }
    ],
    flows: [
      { from: "start", to: "work", label: "go" },
      { from: "work", to: "done", label: "finish" }
    ]
  });

  assert.match(source, /S1 -->\|"go"\| S2/);
  assert.match(source, /S2 -->\|"finish"\| S3/);
});

test("app_process nested Domain rendering keeps step colors on app_process kind", () => {
  const scheme = {
    id: "test",
    name: "Test",
    entries: [
      { target: "domain", kind: "business_domain", fill: "#000000", stroke: "#000000", text: "#ffffff", rowIndex: 0 },
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
    title: "Nested color target",
    hasExplicitFlows: false,
    domains: [
      { id: "known", name: "Known", kind: "business_domain", rowIndex: 0 }
    ],
    steps: [
      { id: "receive", domain: "known", label: "Receive", kind: "process" }
    ],
    flows: []
  }, scheme);

  assert.match(source, /subgraph domain_known\["Known"\]/);
  assert.match(source, /style domain_known fill:#000000,stroke:#000000,color:#ffffff/);
  assert.match(source, /classDef kind_app_process_process fill:#e8f5e9,stroke:#388e3c,color:#111111/);
  assert.match(source, /class S1 kind_app_process_process/);
  assert.doesNotMatch(source, /kind_domain_/);
});

test("app_process nested Domain groups use target domain colors by kind", () => {
  const scheme = {
    id: "test",
    name: "Test",
    entries: [
      { target: "domain", kind: "operations", fill: "#111111", stroke: "#222222", text: "#ffffff", rowIndex: 0 },
      { target: "domain", kind: "system", fill: "#333333", stroke: "#444444", text: "#eeeeee", rowIndex: 1 },
      { target: "app_process", kind: "process", fill: "#e8f5e9", stroke: "#388e3c", text: "#111111", rowIndex: 2 },
      { kind: "default", fill: "#f5f5f5", stroke: "#9e9e9e", text: "#111111", rowIndex: 3 }
    ],
    defaultStyle: {
      fill: "#f5f5f5",
      stroke: "#9e9e9e",
      text: "#111111"
    }
  };
  const source = buildAppProcessBusinessFlowMermaidSource({
    title: "Nested domain colors",
    hasExplicitFlows: false,
    domains: [
      { id: "warehouse", name: "Warehouse", kind: "operations", rowIndex: 0 },
      { id: "wms", name: "WMS", kind: "system", parent: "warehouse", rowIndex: 1 }
    ],
    steps: [
      { id: "receive", domain: "warehouse", label: "Receive", kind: "process" },
      { id: "open", domain: "wms", label: "Open WMS", kind: "process" }
    ],
    flows: []
  }, scheme);

  assert.match(source, /style domain_warehouse fill:#111111,stroke:#222222,color:#ffffff/);
  assert.match(source, /style domain_wms fill:#333333,stroke:#444444,color:#eeeeee/);
  assert.match(source, /classDef kind_app_process_process fill:#e8f5e9,stroke:#388e3c,color:#111111/);
});

test("app_process legacy lane groups are not styled as Domains", () => {
  const scheme = {
    id: "test",
    name: "Test",
    entries: [
      { target: "domain", kind: "application", fill: "#000000", stroke: "#000000", text: "#ffffff", rowIndex: 0 },
      { kind: "default", fill: "#f5f5f5", stroke: "#9e9e9e", text: "#111111", rowIndex: 1 }
    ],
    defaultStyle: {
      fill: "#f5f5f5",
      stroke: "#9e9e9e",
      text: "#111111"
    }
  };
  const source = buildAppProcessBusinessFlowMermaidSource({
    title: "Lane colors",
    hasExplicitFlows: false,
    domains: [
      { id: "system", name: "System", kind: "application", rowIndex: 0 }
    ],
    steps: [
      { id: "legacy", lane: "system", label: "Legacy", kind: "process" }
    ],
    flows: []
  }, scheme);

  assert.match(source, /subgraph L1\["system"\]/);
  assert.doesNotMatch(source, /style domain_system/);
  assert.doesNotMatch(source, /fill:#000000,stroke:#000000,color:#ffffff/);
});

test("app_process unresolved domain groups are not styled as Domains", () => {
  const scheme = {
    id: "test",
    name: "Test",
    entries: [
      { target: "domain", kind: "application", fill: "#000000", stroke: "#000000", text: "#ffffff", rowIndex: 0 },
      { kind: "default", fill: "#f5f5f5", stroke: "#9e9e9e", text: "#111111", rowIndex: 1 }
    ],
    defaultStyle: {
      fill: "#f5f5f5",
      stroke: "#9e9e9e",
      text: "#111111"
    }
  };
  const source = buildAppProcessBusinessFlowMermaidSource({
    title: "Unresolved domain colors",
    hasExplicitFlows: false,
    domains: [
      { id: "known", name: "Known", kind: "application", rowIndex: 0 }
    ],
    steps: [
      { id: "missing", domain: "missing", label: "Missing", kind: "process" }
    ],
    flows: []
  }, scheme);

  assert.match(source, /subgraph L1\["missing"\]/);
  assert.doesNotMatch(source, /style domain_missing/);
  assert.doesNotMatch(source, /fill:#000000,stroke:#000000,color:#ffffff/);
});

test("app_process Applied Color Scheme targets include domain only for resolved Domain groups", () => {
  assert.deepEqual(getAppProcessBusinessFlowColorSchemeTargets({
    title: "No local domains",
    hasExplicitFlows: false,
    steps: [
      { id: "legacy", lane: "System", label: "Legacy", kind: "process" },
      { id: "missing", domain: "missing", label: "Missing", kind: "process" }
    ],
    flows: []
  }), ["app_process"]);

  assert.deepEqual(getAppProcessBusinessFlowColorSchemeTargets({
    title: "Resolved domain",
    hasExplicitFlows: false,
    domains: [
      { id: "system", name: "System", kind: "application", rowIndex: 0 }
    ],
    steps: [
      { id: "work", domain: "system", label: "Work", kind: "process" }
    ],
    flows: []
  }), ["app_process", "domain"]);
});

test("app_process domain placement without Domain Sources does not warn about unknown domain", () => {
  const { index, model } = buildIndexWithProcess(
    processMarkdown(
      domainStepsHeader,
      "| receive | missing | Receive order | process |  |  |  |  |  | unvalidated placement |"
    )
  );

  const resolved = resolveAppProcessDomainPlacement(model, index);
  assert.equal(model.domainSources.length, 0);
  assert.deepEqual(resolved.sourceSummaries, []);
  assert.deepEqual(resolved.placements, []);
  assert.equal(
    resolved.warnings.some((warning) => warning.message.includes("unknown Domain")),
    false
  );
});

test("app_process Domain Sources resolve known step domains", () => {
  const { index, model } = buildIndexWithProcess(
    processMarkdown(
      domainStepsHeader,
      "| receive | fulfillment | Receive order | process |  |  |  |  |  | resolved placement |",
      [
        "## Domain Sources",
        "",
        "| ref |",
        "|---|",
        "| [[DOMAINS-COMPANY]] |"
      ].join("\n")
    ),
    [
      {
        path: "DOMAINS-COMPANY.md",
        content: domainsMarkdown(
          "| fulfillment | Fulfillment | business_domain | | Fulfillment process area |"
        )
      }
    ]
  );

  const resolved = resolveAppProcessDomainPlacement(model, index);
  assert.equal(model.domainSources.length, 1);
  assert.equal(resolved.sourceSummaries[0].status, "ok");
  assert.equal(resolved.placements.length, 1);
  assert.equal(resolved.placements[0].status, "resolved");
  assert.equal(resolved.placements[0].domain.name, "Fulfillment");
  assert.equal(resolved.placements[0].domain.kind, "business_domain");
  assert.equal(resolved.domains[0].id, "fulfillment");
  assert.equal(resolved.warnings.length, 0);
});

test("app_process Domain Sources render merged hierarchy", () => {
  const { index, model } = buildIndexWithProcess(
    processMarkdown(
      domainStepsHeader,
      [
        "| receive | office | Receive order | process |  |  |  |  |  | external child |",
        "| open | wms | Open WMS | screen |  |  |  |  |  | external grandchild |"
      ].join("\n"),
      [
        "## Domain Sources",
        "",
        "| ref |",
        "|---|",
        "| [[DOMAINS-COMPANY]] |"
      ].join("\n")
    ),
    [
      {
        path: "DOMAINS-COMPANY.md",
        content: domainsMarkdown([
          "| warehouse | Warehouse | operations | | Warehouse area |",
          "| office | Office | organization | warehouse | Office area |",
          "| wms | WMS | system | office | Warehouse management system |"
        ].join("\n"))
      }
    ]
  );

  const resolved = resolveAppProcessDomainPlacement(model, index);
  const source = buildAppProcessBusinessFlowMermaidSource({
    title: model.name,
    hasExplicitFlows: false,
    domains: resolved.domains,
    steps: model.steps,
    flows: []
  });

  assert.equal(resolved.warnings.length, 0);
  assert.match(source, /subgraph domain_warehouse\["Warehouse"\]/);
  assert.match(source, /subgraph domain_office\["Office"\]/);
  assert.match(source, /subgraph domain_wms\["WMS"\]/);
  assert.match(source, /S1\["Receive order"\]/);
  assert.match(source, /S2\[\/"Open WMS"\/\]/);
});

test("app_process mixed local and external Domain Sources render full Business Flow hierarchy", () => {
  const processContent = `---
type: app_process
id: PROC-DOMAIN-PLACEMENT
name: Domain Placement
---

# Domain Placement

## Domain Sources

| ref |
|---|
| [[DOMAINS-COMPANY]] |

${localDomainsSection([
  "| office | 事務所 | organization | warehouse | local definition override |",
  "| qa | 検品 | operations | floor | local child of external floor |"
].join("\n"))}

## Steps

${domainStepsHeader}
| start | office | 在庫照会開始 | start |  |  |  |  |  |  |
| open | wms | 在庫照会画面を開く | screen |  |  |  |  |  |  |
| search | wms | 在庫検索 | input |  |  |  |  |  |  |
| judge | office | 在庫有無を判定 | decision |  |  |  |  |  |  |
| available | floor | 在庫ありの場合受注 | subflow |  |  |  |  |  |  |
| inspect | qa | 検品対象を確認 | process |  |  |  |  |  | local Domainsで追加した領域 |
| unavailable | external | 在庫なしの場合は連絡 | subflow |  |  |  |  |  |  |
| end |  | 終了 | end |  |  |  |  |  |  |

## Flows

| from | to | condition | label | notes |
|---|---|---|---|---|
| start | open |  |  |  |
| open | search |  |  |  |
| search | judge |  |  |  |
| judge | available |  | 在庫あり |  |
| judge | unavailable |  | 在庫なし |  |
| available | inspect |  |  |  |
| inspect | end |  |  |  |
| unavailable | end |  |  |  |
`;
  const parsed = parseAppProcessFile(processContent, "PROC-DOMAIN-PLACEMENT.md");
  assert.ok(parsed.file);
  assert.equal(
    parsed.warnings.some((warning) =>
      warning.message === 'Domain parent "floor" is not defined.'
    ),
    false
  );

  const { index, model } = buildIndexWithProcess(
    processContent,
    [
      {
        path: "DOMAINS-COMPANY.md",
        content: domainsMarkdown([
          "| warehouse | 倉庫 | operations | | |",
          "| office | 事務所 | organization | warehouse | |",
          "| wms | WMS | system | office | |",
          "| floor | フロア | location | warehouse | |",
          "| external | 外部 | external | | |"
        ].join("\n"))
      }
    ]
  );
  const resolved = resolveAppProcessDomainPlacement(model, index);
  const scheme = {
    id: "test",
    name: "Test",
    entries: [
      { target: "domain", kind: "operations", fill: "#111111", stroke: "#222222", text: "#ffffff", rowIndex: 0 },
      { target: "domain", kind: "organization", fill: "#333333", stroke: "#444444", text: "#eeeeee", rowIndex: 1 },
      { target: "domain", kind: "system", fill: "#555555", stroke: "#666666", text: "#ffffff", rowIndex: 2 },
      { target: "domain", kind: "location", fill: "#777777", stroke: "#888888", text: "#ffffff", rowIndex: 3 },
      { target: "domain", kind: "external", fill: "#999999", stroke: "#aaaaaa", text: "#111111", rowIndex: 4 },
      { target: "app_process", kind: "process", fill: "#e8f5e9", stroke: "#388e3c", text: "#111111", rowIndex: 5 },
      { kind: "default", fill: "#f5f5f5", stroke: "#9e9e9e", text: "#111111", rowIndex: 6 }
    ],
    defaultStyle: {
      fill: "#f5f5f5",
      stroke: "#9e9e9e",
      text: "#111111"
    }
  };
  const source = buildAppProcessBusinessFlowMermaidSource({
    title: model.name,
    hasExplicitFlows: Boolean(model.hasExplicitFlows),
    domains: resolved.domains,
    steps: model.steps,
    flows: model.flows
  }, scheme);

  assert.equal(
    resolved.warnings.some((warning) =>
      warning.message === 'Domain parent "floor" is not defined.'
    ),
    false
  );
  assert.equal(resolved.placements.filter((placement) => placement.status === "resolved").length, 7);
  assert.match(source, /subgraph domain_warehouse\["倉庫"\]/);
  assert.match(source, /subgraph domain_office\["事務所"\]/);
  assert.match(source, /subgraph domain_wms\["WMS"\]/);
  assert.match(source, /subgraph domain_floor\["フロア"\]/);
  assert.match(source, /subgraph domain_qa\["検品"\]/);
  assert.match(source, /subgraph domain_external\["外部"\]/);
  assert.ok(source.indexOf('subgraph domain_wms["WMS"]') > source.indexOf('subgraph domain_office["事務所"]'));
  assert.ok(source.indexOf('subgraph domain_qa["検品"]') > source.indexOf('subgraph domain_floor["フロア"]'));
  assert.match(source, /style domain_warehouse fill:#111111,stroke:#222222,color:#ffffff/);
  assert.match(source, /style domain_wms fill:#555555,stroke:#666666,color:#ffffff/);
  assert.match(source, /style domain_floor fill:#777777,stroke:#888888,color:#ffffff/);
  assert.match(source, /style domain_external fill:#999999,stroke:#aaaaaa,color:#111111/);
  assert.match(source, /classDef kind_app_process_process fill:#e8f5e9,stroke:#388e3c,color:#111111/);
  assert.match(source, /S4 -->\|"在庫あり"\| S5/);
  assert.match(source, /S4 -->\|"在庫なし"\| S7/);
});

test("app_process Domain group Color Scheme uses merged external Domain kind", () => {
  const { index, model } = buildIndexWithProcess(
    processMarkdown(
      domainStepsHeader,
      "| receive | fulfillment | Receive order | process |  |  |  |  |  | external color |",
      [
        "## Domain Sources",
        "",
        "| ref |",
        "|---|",
        "| [[DOMAINS-COMPANY]] |"
      ].join("\n")
    ),
    [
      {
        path: "DOMAINS-COMPANY.md",
        content: domainsMarkdown(
          "| fulfillment | Fulfillment | business_domain | | Fulfillment process area |"
        )
      }
    ]
  );
  const resolved = resolveAppProcessDomainPlacement(model, index);
  const scheme = {
    id: "test",
    name: "Test",
    entries: [
      { target: "domain", kind: "business_domain", fill: "#123456", stroke: "#234567", text: "#ffffff", rowIndex: 0 },
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
    title: model.name,
    hasExplicitFlows: false,
    domains: resolved.domains,
    steps: model.steps,
    flows: []
  }, scheme);

  assert.match(source, /style domain_fulfillment fill:#123456,stroke:#234567,color:#ffffff/);
  assert.match(source, /classDef kind_app_process_process fill:#e8f5e9,stroke:#388e3c,color:#111111/);
});

test("app_process local Domains override external source definitions", () => {
  const { index, model } = buildIndexWithProcess(
    processMarkdown(
      domainStepsHeader,
      "| receive | fulfillment | Receive order | process |  |  |  |  |  | local override |",
      [
        "## Domain Sources",
        "",
        "| ref |",
        "|---|",
        "| [[DOMAINS-COMPANY]] |",
        "",
        localDomainsSection(
          "| fulfillment | Local Fulfillment | local_kind | local_parent | Local definition |"
        )
      ].join("\n")
    ),
    [
      {
        path: "DOMAINS-COMPANY.md",
        content: domainsMarkdown(
          "| fulfillment | External Fulfillment | external_kind | external_parent | External definition |"
        )
      }
    ]
  );

  const resolved = resolveAppProcessDomainPlacement(model, index);
  const domain = resolved.placements[0].domain;
  const messages = resolved.warnings.map((warning) => warning.message);

  assert.equal(domain.name, "Local Fulfillment");
  assert.equal(domain.kind, "local_kind");
  assert.equal(domain.parent, "local_parent");
  assert.ok(messages.includes('app_process local Domain "fulfillment" overrides external Domain name.'));
  assert.ok(messages.includes('app_process local Domain "fulfillment" overrides external Domain kind.'));
  assert.ok(messages.includes('app_process local Domain "fulfillment" overrides external Domain parent.'));
  assert.equal(resolved.conflicts.length, 3);
  assert.equal(
    localizeDiagnosticMessage(messages[0], "ja"),
    'app_process ローカル Domain "fulfillment" が外部 Domain の parent を上書きしています。'
  );
});

test("app_process local override controls rendered Domain color", () => {
  const { index, model } = buildIndexWithProcess(
    processMarkdown(
      domainStepsHeader,
      "| receive | fulfillment | Receive order | process |  |  |  |  |  | local color override |",
      [
        "## Domain Sources",
        "",
        "| ref |",
        "|---|",
        "| [[DOMAINS-COMPANY]] |",
        "",
        localDomainsSection(
          "| fulfillment | Local Fulfillment | local_kind | | Local definition |"
        )
      ].join("\n")
    ),
    [
      {
        path: "DOMAINS-COMPANY.md",
        content: domainsMarkdown(
          "| fulfillment | External Fulfillment | external_kind | | External definition |"
        )
      }
    ]
  );
  const resolved = resolveAppProcessDomainPlacement(model, index);
  const scheme = {
    id: "test",
    name: "Test",
    entries: [
      { target: "domain", kind: "external_kind", fill: "#000000", stroke: "#000000", text: "#ffffff", rowIndex: 0 },
      { target: "domain", kind: "local_kind", fill: "#abcdef", stroke: "#123456", text: "#111111", rowIndex: 1 },
      { kind: "default", fill: "#f5f5f5", stroke: "#9e9e9e", text: "#111111", rowIndex: 2 }
    ],
    defaultStyle: {
      fill: "#f5f5f5",
      stroke: "#9e9e9e",
      text: "#111111"
    }
  };
  const source = buildAppProcessBusinessFlowMermaidSource({
    title: model.name,
    hasExplicitFlows: false,
    domains: resolved.domains,
    steps: model.steps,
    flows: []
  }, scheme);

  assert.match(source, /subgraph domain_fulfillment\["Local Fulfillment"\]/);
  assert.match(source, /style domain_fulfillment fill:#abcdef,stroke:#123456,color:#111111/);
  assert.doesNotMatch(source, /fill:#000000,stroke:#000000,color:#ffffff/);
});

test("app_process unknown step domain warns when Domain Sources are present", () => {
  const { index, model } = buildIndexWithProcess(
    processMarkdown(
      domainStepsHeader,
      "| receive | missing | Receive order | process |  |  |  |  |  | unresolved placement |",
      [
        "## Domain Sources",
        "",
        "| ref |",
        "|---|",
        "| [[DOMAINS-COMPANY]] |"
      ].join("\n")
    ),
    [
      {
        path: "DOMAINS-COMPANY.md",
        content: domainsMarkdown(
          "| fulfillment | Fulfillment | business_domain | | Fulfillment process area |"
        )
      }
    ]
  );

  const resolved = resolveAppProcessDomainPlacement(model, index);
  const messages = resolved.warnings.map((warning) => warning.message);
  assert.equal(resolved.placements[0].status, "unresolved");
  assert.ok(messages.includes('app_process Step "receive" references unknown Domain "missing".'));
  assert.equal(
    localizeDiagnosticMessage(messages[0], "ja"),
    'app_process Step "receive" が未定義の Domain "missing" を参照しています。'
  );
});

test("app_process unresolved Domain Source ref warns", () => {
  const { index, model } = buildIndexWithProcess(
    processMarkdown(
      domainStepsHeader,
      "| receive | fulfillment | Receive order | process |  |  |  |  |  | source missing |",
      [
        "## Domain Sources",
        "",
        "| ref |",
        "|---|",
        "| [[DOMAINS-MISSING]] |"
      ].join("\n")
    )
  );

  const resolved = resolveAppProcessDomainPlacement(model, index);
  assert.equal(resolved.sourceSummaries[0].status, "unresolved");
  assert.ok(resolved.warnings.some((warning) =>
    warning.message === 'Domain Source ref "[[DOMAINS-MISSING]]" could not be resolved. Check the ID or file name.'
  ));
});

test("app_process non-domains Domain Source ref warns", () => {
  const { index, model } = buildIndexWithProcess(
    processMarkdown(
      domainStepsHeader,
      "| receive | fulfillment | Receive order | process |  |  |  |  |  | wrong source type |",
      [
        "## Domain Sources",
        "",
        "| ref |",
        "|---|",
        "| [[RULE-SAMPLE]] |"
      ].join("\n")
    ),
    [
      {
        path: "RULE-SAMPLE.md",
        content: `---
type: rule
id: RULE-SAMPLE
name: Sample Rule
---
`
      }
    ]
  );

  const resolved = resolveAppProcessDomainPlacement(model, index);
  assert.equal(resolved.sourceSummaries[0].status, "invalid-type");
  assert.ok(resolved.warnings.some((warning) =>
    warning.message === 'Domain Source ref "[[RULE-SAMPLE]]" resolves to type "rule", but expected type "domains".'
  ));
});

test("app_process unresolved domain still wins over legacy lane", () => {
  const source = buildAppProcessBusinessFlowMermaidSource({
    title: "No fallback from unresolved domain",
    hasExplicitFlows: false,
    steps: [
      { id: "receive", domain: "missing", lane: "Legacy System", label: "Receive", kind: "process" }
    ],
    flows: []
  });

  assert.match(source, /subgraph L1\["missing"\]/);
  assert.doesNotMatch(source, /Legacy System/);
});

test("app_process legacy lane-only model has no Domain Sources resolver warnings", () => {
  const { index, model } = buildIndexWithProcess(
    processMarkdown(
      [
        "| id | lane | label | kind | input | output | rule | invoke | screen | notes |",
        "|---|---|---|---|---|---|---|---|---|---|"
      ].join("\n"),
      "| receive | System | Receive order | process |  |  |  |  |  | legacy lane |"
    )
  );

  const resolved = resolveAppProcessDomainPlacement(model, index);
  assert.equal(model.steps[0].lane, "System");
  assert.equal(model.domainSources.length, 0);
  assert.equal(resolved.warnings.length, 0);
  assert.equal(resolved.placements.length, 0);
});
