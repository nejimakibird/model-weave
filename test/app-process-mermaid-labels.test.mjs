import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const outputFile = "dist/test-app-process-business-flow.mjs";

await build({
  entryPoints: ["src/renderers/app-process-business-flow.ts"],
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
            "export const Platform = { isDesktop: true };",
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

const { buildAppProcessBusinessFlowMermaidSource } = await import(
  `../${outputFile}?t=${Date.now()}`
);

test("app_process Business Flow source defaults to LR direction", () => {
  const source = buildAppProcessBusinessFlowMermaidSource({
    title: "Direction test",
    hasExplicitFlows: false,
    steps: [{ id: "start", label: "Start" }],
    flows: []
  });

  assert.match(source, /^flowchart LR/);
});

test("app_process Business Flow source supports TD direction", () => {
  const source = buildAppProcessBusinessFlowMermaidSource(
    {
      title: "Direction test",
      hasExplicitFlows: false,
      steps: [{ id: "start", label: "Start" }],
      flows: []
    },
    undefined,
    "TD"
  );

  assert.match(source, /^flowchart TD/);
});

test("app_process Business Flow source falls back to LR for unknown direction", () => {
  const source = buildAppProcessBusinessFlowMermaidSource(
    {
      title: "Direction test",
      hasExplicitFlows: false,
      steps: [{ id: "start", label: "Start" }],
      flows: []
    },
    undefined,
    "RL"
  );

  assert.match(source, /^flowchart LR/);
});
test("app_process Mermaid labels preserve visible punctuation", () => {
  const source = buildAppProcessBusinessFlowMermaidSource({
    title: "Label escaping verification",
    hasExplicitFlows: true,
    steps: [
      {
        id: "slash",
        label: "Vault/ファイル解析開始"
      },
      {
        id: "opening-brackets",
        label: "[[Mermaidソース生成開始"
      },
      {
        id: "closing-brackets",
        label: "Mermaidソース生成開始]]"
      },
      {
        id: "wikilink-like",
        label: "[[Mermaidソース生成開始]]"
      },
      {
        id: "pipe",
        label: "A \\| B"
      }
    ],
    flows: [
      {
        from: "slash",
        to: "opening-brackets"
      },
      {
        from: "opening-brackets",
        to: "closing-brackets",
        label: "A \\| B"
      },
      {
        from: "closing-brackets",
        to: "wikilink-like"
      },
      {
        from: "wikilink-like",
        to: "pipe"
      }
    ]
  });

  assert.match(source, /Vault\/ファイル解析開始/);
  assert.match(source, /#91;#91;Mermaidソース生成開始/);
  assert.match(source, /Mermaidソース生成開始#93;#93;/);
  assert.match(source, /#91;#91;Mermaidソース生成開始#93;#93;/);
  assert.match(source, /A \| B/);

  assert.doesNotMatch(source, /&#47;/);
  assert.doesNotMatch(source, /&#91;/);
  assert.doesNotMatch(source, /&#93;/);
  assert.doesNotMatch(source, /\[\[Mermaidソース生成開始/);
  assert.doesNotMatch(source, /Mermaidソース生成開始\]\]/);
  assert.doesNotMatch(source, /&\//);
  assert.doesNotMatch(source, /&\[&\[/);
  assert.doesNotMatch(source, /&\]&\]/);
  assert.doesNotMatch(source, /\\\|/);
});

test("app_process Business Flow source can use Color Scheme classes", () => {
  const model = {
    title: "Color test",
    hasExplicitFlows: true,
    steps: [
      { id: "start", label: "Start", kind: "start" },
      { id: "receive", label: "Receive order", kind: "process" },
      { id: "route", label: "Route?", kind: "decision" },
      { id: "unknown", label: "Unknown" },
      { id: "end", label: "End", kind: "end" }
    ],
    flows: [
      { from: "start", to: "receive" },
      { from: "receive", to: "route" },
      { from: "route", to: "unknown", label: "fallback" },
      { from: "unknown", to: "end" }
    ]
  };
  const scheme = {
    id: "test",
    name: "Test",
    entries: [
      { target: "app_process", kind: "start", fill: "#e3f2fd", stroke: "#1976d2", text: "#111111", rowIndex: 0 },
      { target: "app_process", kind: "process", fill: "#e8f5e9", stroke: "#388e3c", text: "#111111", rowIndex: 1 },
      { target: "app_process", kind: "decision", fill: "#fff3e0", stroke: "#f57c00", text: "#111111", rowIndex: 2 },
      { target: "app_process", kind: "end", fill: "#eeeeee", stroke: "#616161", text: "#111111", rowIndex: 3 },
      { kind: "default", fill: "#f5f5f5", stroke: "#9e9e9e", text: "#111111", rowIndex: 4 }
    ],
    defaultStyle: {
      fill: "#f5f5f5",
      stroke: "#9e9e9e",
      text: "#111111"
    }
  };

  const colored = buildAppProcessBusinessFlowMermaidSource(model, scheme);
  assert.match(colored, /classDef kind_app_process_start fill:#e3f2fd,stroke:#1976d2,color:#111111/);
  assert.match(colored, /classDef kind_app_process_process fill:#e8f5e9,stroke:#388e3c,color:#111111/);
  assert.match(colored, /classDef kind_app_process_decision fill:#fff3e0,stroke:#f57c00,color:#111111/);
  assert.match(colored, /classDef kind_app_process_end fill:#eeeeee,stroke:#616161,color:#111111/);
  assert.match(colored, /classDef kind_app_process_default fill:#f5f5f5,stroke:#9e9e9e,color:#111111/);
  assert.match(colored, /class S1 kind_app_process_start/);
  assert.match(colored, /class S2 kind_app_process_process/);
  assert.match(colored, /class S3 kind_app_process_decision/);
  assert.match(colored, /class S4 kind_app_process_default/);
  assert.match(colored, /class S5 kind_app_process_end/);
  assert.match(colored, /S3 -->\|"fallback"\| S4/);

  const plain = buildAppProcessBusinessFlowMermaidSource(model);
  assert.doesNotMatch(plain, /classDef kind_app_process_/);
  assert.doesNotMatch(plain, /class S\d/);
});



test("app_process Business Flow Color Scheme classes support expanded step kinds", () => {
  const model = {
    title: "Expanded color test",
    hasExplicitFlows: true,
    steps: [
      { id: "event", label: "Event", kind: "event" },
      { id: "store", label: "Store", kind: "store" }
    ],
    flows: [{ from: "event", to: "store" }]
  };
  const scheme = {
    id: "expanded",
    name: "Expanded",
    entries: [
      { target: "app_process", kind: "event", fill: "#fff8e1", stroke: "#ff8f00", text: "#111111", rowIndex: 0 },
      { target: "app_process", kind: "store", fill: "#e0f2f1", stroke: "#00796b", text: "#111111", rowIndex: 1 }
    ],
    defaultStyle: {
      fill: "#f5f5f5",
      stroke: "#9e9e9e",
      text: "#111111"
    }
  };

  const source = buildAppProcessBusinessFlowMermaidSource(model, scheme);

  assert.match(source, /classDef kind_app_process_event fill:#fff8e1,stroke:#ff8f00,color:#111111/);
  assert.match(source, /classDef kind_app_process_store fill:#e0f2f1,stroke:#00796b,color:#111111/);
  assert.match(source, /class S1 kind_app_process_event/);
  assert.match(source, /class S2 kind_app_process_store/);
});

test("app_process Business Flow renders expanded step kind shapes", () => {
  const source = buildAppProcessBusinessFlowMermaidSource({
    title: "Expanded kind shapes",
    hasExplicitFlows: true,
    steps: [
      { id: "event", label: "Event", kind: "event" },
      { id: "api", label: "API", kind: "api" },
      { id: "batch", label: "Batch", kind: "batch" },
      { id: "message", label: "Message", kind: "message" },
      { id: "data", label: "Data", kind: "data" },
      { id: "store", label: "Store", kind: "store" },
      { id: "wait", label: "Wait", kind: "wait" },
      { id: "error", label: "Error", kind: "error" },
      { id: "connector", label: "Connector", kind: "connector" },
      { id: "external", label: "External", kind: "external" }
    ],
    flows: []
  });

  assert.match(source, /S1\(\["Event"\]\)/);
  assert.match(source, /S2\("API"\)/);
  assert.match(source, /S3\("Batch"\)/);
  assert.match(source, /S4\("Message"\)/);
  assert.match(source, /S5\[\("Data"\)\]/);
  assert.match(source, /S6\[\("Store"\)\]/);
  assert.match(source, /S7\("Wait"\)/);
  assert.match(source, /S8\(\["Error"\]\)/);
  assert.match(source, /S9\(\("Connector"\)\)/);
  assert.match(source, /S10\("External"\)/);
});

test("app_process Business Flow keeps blank and unknown step kinds as process nodes", () => {
  const source = buildAppProcessBusinessFlowMermaidSource({
    title: "Fallback kinds",
    hasExplicitFlows: true,
    steps: [
      { id: "blank", label: "Blank", kind: "" },
      { id: "missing", label: "Missing" },
      { id: "unknown", label: "Unknown", kind: "custom-kind" }
    ],
    flows: []
  });

  assert.match(source, /S1\["Blank"\]/);
  assert.match(source, /S2\["Missing"\]/);
  assert.match(source, /S3\["Unknown"\]/);
  assert.doesNotMatch(source, /S3\("Unknown"\)/);
  assert.doesNotMatch(source, /S3\(\["Unknown"\]\)/);
});
