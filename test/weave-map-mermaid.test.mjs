import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const outputFile = "dist/test-weave-map-mermaid.mjs";

await build({
  stdin: {
    contents: `
      export { buildWeaveMapMermaidSource } from "./src/renderers/weave-map-mermaid";
    `,
    resolveDir: ".",
    sourcefile: "test-weave-map-mermaid-entry.ts",
    loader: "ts"
  },
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: outputFile,
  logLevel: "silent"
});

const { buildWeaveMapMermaidSource } = await import(`../${outputFile}?t=${Date.now()}`);

test("builds Weave Map Mermaid flowchart source", () => {
  const source = buildWeaveMapMermaidSource({
    focusNodeId: "node:focus:PROC-XXX",
    nodes: [
      {
        id: "node:focus:PROC-XXX",
        label: "PROC-XXX",
        modelType: "app-process",
        layer: "Process",
        status: "focus"
      },
      {
        id: "node:rule:RULE-XXX",
        label: "RULE-XXX",
        modelType: "rule",
        layer: "Rule",
        status: "ok"
      },
      {
        id: "node:data:DATA-XXX",
        label: "DATA-XXX",
        modelType: "data-object",
        layer: "Data",
        status: "ok"
      },
      {
        id: "node:mapping:MAP-XXX",
        label: "MAP-XXX",
        modelType: "mapping",
        layer: "Mapping",
        status: "ok"
      },
      {
        id: "node:impl:CLS-XXX",
        label: "CLS-XXX",
        modelType: "class",
        layer: "Implementation",
        status: "ok"
      },
      {
        id: "node:source:src/example.ts",
        label: "src/example.ts",
        modelType: "source-link",
        layer: "Source",
        status: "source"
      },
      {
        id: "node:unresolved:0",
        label: "[[RULE-MISSING]] <bad>",
        modelType: "unresolved",
        layer: "Warning",
        status: "unresolved"
      }
    ],
    edges: [
      {
        id: "edge:outbound:0",
        from: "node:focus:PROC-XXX",
        to: "node:rule:RULE-XXX",
        relationType: "uses",
        status: "ok"
      },
      {
        id: "edge:source:0",
        from: "node:focus:PROC-XXX",
        to: "node:source:src/example.ts",
        relationType: "source-link",
        status: "source"
      },
      {
        id: "edge:unresolved:0",
        from: "node:focus:PROC-XXX",
        to: "node:unresolved:0",
        relationType: "unresolved",
        label: "[[missing]] | broken",
        status: "unresolved"
      }
    ]
  });

  assert.match(source, /^flowchart LR/);
  assert.match(source, /subgraph layer_Process\["Process"\]/);
  assert.match(source, /subgraph layer_Rule\["Rule"\]/);
  assert.match(source, /subgraph layer_Data\["Data"\]/);
  assert.match(source, /subgraph layer_Mapping\["Mapping"\]/);
  assert.match(source, /subgraph layer_Implementation\["Implementation"\]/);
  assert.match(source, /subgraph layer_Source\["Source"\]/);
  assert.match(source, /style layer_Process fill:#eefaf1,stroke:#b7dfc2,stroke-width:1px,color:#1f2937/);
  assert.match(source, /style layer_Data fill:#eef6ff,stroke:#b8d4f0,stroke-width:1px,color:#1f2937/);
  assert.match(source, /style layer_Mapping fill:#f5efff,stroke:#d6c2f0,stroke-width:1px,color:#1f2937/);
  assert.match(source, /style layer_Implementation fill:#f3f4f6,stroke:#cbd5e1,stroke-width:1px,color:#1f2937/);
  assert.match(source, /style layer_Source fill:#effaf0,stroke:#9fd3a8,stroke-width:1px,color:#1f2937/);
  assert.match(source, /style layer_Warning fill:#fff1f1,stroke:#f0b4b4,stroke-width:1px,color:#1f2937/);
  assert.match(source, /class .* weaveFocus/);
  assert.match(source, /class .* weaveSource/);
  assert.match(source, /class .* weaveUnresolved/);
  assert.match(source, /-\.->\|&#91;&#91;missing&#93;&#93; \/ broken\|/);
  assert.doesNotMatch(source, /\[\[RULE-MISSING\]\]/);
  assert.match(source, /&#91;&#91;RULE-MISSING&#93;&#93; &lt;bad&gt;/);
});
