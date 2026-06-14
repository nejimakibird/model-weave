import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const outputFile = "dist/test-weave-map.mjs";

await build({
  stdin: {
    contents: `
      export {
        buildWeaveMapModel,
        getWeaveMapLayerForModelType
      } from "./src/core/weave-map";
    `,
    resolveDir: ".",
    sourcefile: "test-weave-map-entry.ts",
    loader: "ts"
  },
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: outputFile,
  logLevel: "silent"
});

const { buildWeaveMapModel, getWeaveMapLayerForModelType } = await import(
  `../${outputFile}?t=${Date.now()}`
);

test("maps model types to Weave Map layers", () => {
  assert.equal(getWeaveMapLayerForModelType("screen"), "UI");
  assert.equal(getWeaveMapLayerForModelType("app-process"), "Process");
  assert.equal(getWeaveMapLayerForModelType("app_process"), "Process");
  assert.equal(getWeaveMapLayerForModelType("codeset"), "Rule / State");
  assert.equal(getWeaveMapLayerForModelType("data_object"), "Data");
  assert.equal(getWeaveMapLayerForModelType("dfd-diagram"), "Data Flow");
  assert.equal(getWeaveMapLayerForModelType("source_link"), "Source");
  assert.equal(getWeaveMapLayerForModelType("unknown"), "Other");
});

test("builds Weave Map model from impact summary", () => {
  const summary = {
    modelPath: "screens/SCR-ORDER.md",
    modelId: "SCR-ORDER",
    modelType: "screen",
    modelLabel: "Order screen",
    outboundRelationships: [
      {
        direction: "outbound",
        modelPath: "process/PROC-SUBMIT.md",
        modelId: "PROC-SUBMIT",
        modelType: "app-process",
        modelLabel: "Submit order",
        usageCount: 2,
        usages: [
          {
            direction: "outbound",
            sourcePath: "screens/SCR-ORDER.md",
            sourceType: "screen",
            sourceLabel: "Order screen",
            targetRaw: "[[PROC-SUBMIT]]",
            targetPath: "process/PROC-SUBMIT.md",
            targetId: "PROC-SUBMIT",
            targetType: "app-process",
            targetLabel: "Submit order",
            relationKind: "screen action invoke",
            section: "Actions",
            field: "invoke"
          }
        ],
        sourceLinks: []
      }
    ],
    inboundRelationships: [
      {
        direction: "inbound",
        modelPath: "process/PROC-LAUNCH.md",
        modelId: "PROC-LAUNCH",
        modelType: "app-process",
        modelLabel: "Launch process",
        usageCount: 1,
        usages: [
          {
            direction: "inbound",
            sourcePath: "process/PROC-LAUNCH.md",
            sourceType: "app-process",
            sourceLabel: "Launch process",
            targetRaw: "[[SCR-ORDER]]",
            targetPath: "screens/SCR-ORDER.md",
            targetId: "SCR-ORDER",
            targetType: "screen",
            targetLabel: "Order screen",
            relationKind: "process step screen",
            section: "Steps",
            field: "screen"
          }
        ],
        sourceLinks: []
      }
    ],
    valueUsages: [],
    unresolvedOutbound: [
      {
        direction: "outbound",
        sourcePath: "screens/SCR-ORDER.md",
        sourceType: "screen",
        sourceLabel: "Order screen",
        targetRaw: "[[RULE-MISSING]]",
        targetLabel: "[[RULE-MISSING]]",
        relationKind: "screen field rule",
        section: "Fields",
        field: "rule"
      }
    ],
    relatedSourceLinks: [
      {
        ownerPath: "process/PROC-SUBMIT.md",
        ownerId: "PROC-SUBMIT",
        ownerType: "app-process",
        ownerLabel: "Submit order",
        path: "../src/submit.ts",
        label: "submit.ts",
        notes: ["implementation"],
        relationKind: "outbound"
      }
    ]
  };

  const model = buildWeaveMapModel(summary);
  const focus = model.nodes.find((node) => node.id === model.focusNodeId);
  const unresolved = model.nodes.find((node) => node.status === "unresolved");
  const source = model.nodes.find((node) => node.status === "source");

  assert.equal(focus?.label, "Order screen");
  assert.equal(focus?.layer, "UI");
  assert.equal(unresolved?.layer, "Warning");
  assert.equal(source?.layer, "Source");
  assert.ok(
    model.edges.some(
      (edge) =>
        edge.from === model.focusNodeId &&
        edge.relationType === "screen action invoke" &&
        edge.status === "ok"
    )
  );
  assert.ok(
    model.edges.some(
      (edge) =>
        edge.to === model.focusNodeId &&
        edge.relationType === "process step screen" &&
        edge.status === "ok"
    )
  );
  assert.ok(
    model.edges.some(
      (edge) =>
        edge.from === model.focusNodeId &&
        edge.relationType === "unresolved" &&
        edge.status === "unresolved"
    )
  );
  assert.ok(
    model.edges.some(
      (edge) =>
        edge.to === source?.id &&
        edge.from === "node:model:process/PROC-SUBMIT.md" &&
        edge.relationType === "source-link"
    )
  );
});
