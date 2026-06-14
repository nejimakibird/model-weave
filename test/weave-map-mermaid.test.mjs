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
  assert.match(source, /subgraph layer_Source\["Source"\]/);
  assert.match(source, /class .* weaveFocus/);
  assert.match(source, /class .* weaveSource/);
  assert.match(source, /class .* weaveUnresolved/);
  assert.match(source, /-\.->\|&#91;&#91;missing&#93;&#93; \/ broken\|/);
  assert.doesNotMatch(source, /\[\[RULE-MISSING\]\]/);
  assert.match(source, /&#91;&#91;RULE-MISSING&#93;&#93; &lt;bad&gt;/);
});
