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
      'export { localizeDiagnosticMessage } from "./src/core/current-file-diagnostics";',
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
  localizeDiagnosticMessage,
  buildAppProcessBusinessFlowMermaidSource
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
  assert.match(source, /classDef kind_app_process_process fill:#e8f5e9,stroke:#388e3c,color:#111111/);
  assert.match(source, /class S1 kind_app_process_process/);
  assert.doesNotMatch(source, /kind_domain_/);
  assert.doesNotMatch(source, /style domain_known/);
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
  assert.equal(resolved.warnings.length, 0);
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
