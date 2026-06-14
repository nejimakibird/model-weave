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
        edge.from === "node:model:PROC-SUBMIT" &&
        edge.relationType === "source-link"
    )
  );
});

test("aggregates duplicate Weave Map source, unresolved, and edge entries", () => {
  const summary = {
    modelPath: "screens/SCR-PICK.md",
    modelId: "SCR-PICK",
    modelType: "screen",
    modelLabel: "Pick screen",
    outboundRelationships: [
      {
        direction: "outbound",
        modelPath: "process/PROC-PICK.md",
        modelId: "PROC-PICK",
        modelType: "app-process",
        modelLabel: "Pick items",
        usageCount: 1,
        usages: [
          {
            direction: "outbound",
            sourcePath: "screens/SCR-PICK.md",
            sourceType: "screen",
            sourceLabel: "Pick screen",
            targetRaw: "[[PROC-PICK]]",
            targetPath: "process/PROC-PICK.md",
            targetId: "PROC-PICK",
            targetType: "app-process",
            targetLabel: "Pick items",
            relationKind: "screen action invoke",
            section: "Actions",
            field: "invoke"
          }
        ],
        sourceLinks: []
      },
      {
        direction: "outbound",
        modelPath: "process/PROC-PICK-COPY.md",
        modelId: "PROC-PICK",
        modelType: "app-process",
        modelLabel: "Pick items duplicate path",
        usageCount: 1,
        usages: [
          {
            direction: "outbound",
            sourcePath: "screens/SCR-PICK.md",
            sourceType: "screen",
            sourceLabel: "Pick screen",
            targetRaw: "[[PROC-PICK]]",
            targetPath: "process/PROC-PICK-COPY.md",
            targetId: "PROC-PICK",
            targetType: "app-process",
            targetLabel: "Pick items",
            relationKind: "screen action invoke",
            section: "Actions",
            field: "invoke"
          }
        ],
        sourceLinks: []
      }
    ],
    inboundRelationships: [],
    valueUsages: [],
    unresolvedOutbound: [
      {
        direction: "outbound",
        sourcePath: "screens/SCR-PICK.md",
        sourceType: "screen",
        sourceLabel: "Pick screen",
        targetRaw: "receive_order",
        targetLabel: "receive_order",
        relationKind: "dfd flow",
        section: "Flows",
        field: "to"
      },
      {
        direction: "outbound",
        sourcePath: "screens/SCR-PICK.md",
        sourceType: "screen",
        sourceLabel: "Pick screen",
        targetRaw: "receive_order",
        targetLabel: "receive_order",
        relationKind: "dfd flow",
        section: "Flows",
        field: "to"
      },
      {
        direction: "outbound",
        sourcePath: "screens/SCR-PICK.md",
        sourceType: "screen",
        sourceLabel: "Pick screen",
        targetRaw: "receive_order",
        targetLabel: "receive_order",
        relationKind: "screen message",
        section: "Messages",
        field: "id"
      }
    ],
    relatedSourceLinks: [
      {
        ownerPath: "process/PROC-PICK.md",
        ownerId: "PROC-PICK",
        ownerType: "app-process",
        ownerLabel: "Pick items",
        path: "src/core/impact-analyzer.ts",
        label: "impact-analyzer.ts",
        notes: ["implementation"],
        relationKind: "outbound"
      },
      {
        ownerPath: "process/PROC-PICK-COPY.md",
        ownerId: "PROC-PICK",
        ownerType: "app-process",
        ownerLabel: "Pick items duplicate path",
        path: "src/core/impact-analyzer.ts",
        label: "impact-analyzer.ts",
        notes: ["implementation"],
        relationKind: "outbound"
      }
    ]
  };

  const model = buildWeaveMapModel(summary);
  const modelNodes = model.nodes.filter((node) => node.modelId === "PROC-PICK");
  const sourceNodes = model.nodes.filter((node) => node.status === "source");
  const unresolvedNodes = model.nodes.filter((node) => node.status === "unresolved");

  assert.equal(modelNodes.length, 1);
  assert.equal(sourceNodes.length, 1);
  assert.equal(sourceNodes[0].label, "impact-analyzer.ts × 2");
  assert.equal(unresolvedNodes.length, 1);
  assert.equal(unresolvedNodes[0].label, "receive_order × 3");

  assert.ok(
    model.edges.some(
      (edge) =>
        edge.from === model.focusNodeId &&
        edge.to === "node:model:PROC-PICK" &&
        edge.label === "screen action invoke × 2"
    )
  );
  assert.ok(
    model.edges.some(
      (edge) =>
        edge.from === model.focusNodeId &&
        edge.to === "node:unresolved:receive_order" &&
        edge.label === "dfd flow × 2"
    )
  );
  assert.ok(
    model.edges.some(
      (edge) =>
        edge.from === model.focusNodeId &&
        edge.to === "node:unresolved:receive_order" &&
        edge.label === "screen message"
    )
  );
  assert.ok(
    model.edges.some(
      (edge) =>
        edge.from === "node:model:PROC-PICK" &&
        edge.to === "node:source:src/core/impact-analyzer.ts" &&
        edge.label === "outbound × 2"
    )
  );
});
