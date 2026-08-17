import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const outputFile = "dist/test-app-process-step-interaction-target.mjs";

await build({
  stdin: {
    contents: [
      "export { buildVaultIndex } from \"./src/core/vault-index\";",
      "export { resolveAppProcessStepInteractionTarget } from \"./src/core/app-process-step-interaction-target\";",
      "export { buildAppProcessBusinessFlowInteractionTargets } from \"./src/renderers/app-process-business-flow\";"
    ].join("\n"),
    resolveDir: ".",
    sourcefile: "test-app-process-step-interaction-target-entry.ts",
    loader: "ts"
  },
  bundle: true,
  format: "esm",
  platform: "browser",
  plugins: [
    {
      name: "stub-obsidian",
      setup(buildApi) {
        buildApi.onResolve({ filter: /^obsidian$/ }, () => ({ path: "obsidian", namespace: "stub" }));
        buildApi.onLoad({ filter: /^obsidian$/, namespace: "stub" }, () => ({
          contents: "export const Platform = { isDesktop: true }; export class Notice {}; export class TFile {}; export class ItemView {}; export class WorkspaceLeaf {}; export const MarkdownRenderer = {}; export const normalizePath = (value) => value; export const getLanguage = () => \"en\"; export const loadMermaid = async () => ({ render: async () => ({ svg: \"\" }) });",
          loader: "js"
        }));
      }
    }
  ],
  outfile: outputFile,
  logLevel: "silent"
});

const {
  buildVaultIndex,
  resolveAppProcessStepInteractionTarget,
  buildAppProcessBusinessFlowInteractionTargets
} = await import("../" + outputFile + "?t=" + Date.now());


function modelFile(type, id, name = id) {
  return `---
type: ${type}
id: ${id}
name: ${name}
---
# ${name}
`;
}

function buildFixture() {
  const processContent = `---
type: app_process
id: PROC-SOURCE
name: Source process
---
# Source process

## Inputs

| id | data | source | required | notes |
|---|---|---|---|---|
| IN-ORDER | [[DATA-ORDER]] | [[SCR-ORDER]] | Y | |
| IN-FALLBACK | [[DATA-MISSING]] | [[SCR-FALLBACK]] | Y | |
| [[DATA-DIRECT-IN]] | [[DATA-ORDER]] | [[SCR-ORDER]] | Y | |

## Outputs

| id | data | target | notes |
|---|---|---|---|
| OUT-RESULT | [[DATA-RESULT]] | [[SCR-COMPLETE]] | |
| OUT-FALLBACK | [[DATA-MISSING]] | [[SCR-FALLBACK]] | |
| [[DATA-DIRECT-OUT]] | [[DATA-RESULT]] | [[SCR-COMPLETE]] | |

## Steps

| id | domain | label | kind | input | output | rule | invoke | screen | notes |
|---|---|---|---|---|---|---|---|---|---|
| screen | | Screen step | screen | IN-ORDER | OUT-RESULT | [[RULE-VALIDATE]] | [[PROC-SUBFLOW]] | [[SCR-ORDER]] | |
| subflow | | Subflow step | subflow | IN-ORDER | OUT-RESULT | [[RULE-VALIDATE]] | [[PROC-SUBFLOW]] | [[SCR-ORDER]] | |
| decision | | Decision step | decision | IN-ORDER | OUT-RESULT | [[RULE-VALIDATE]] | [[PROC-SUBFLOW]] | [[SCR-ORDER]] | |
| input | | Input step | input | IN-ORDER | | | | | |
| store | | Store step | store | | OUT-RESULT | | | | |
| end | | End step | end | | OUT-RESULT | | | | |
| directIn | | Direct input | input | [[DATA-DIRECT-IN]] | | | | | |
| directOut | | Direct output | store | | [[DATA-DIRECT-OUT]] | | | | |
| unknown | | Unknown step | custom | IN-ORDER | OUT-RESULT | [[RULE-VALIDATE]] | [[PROC-SUBFLOW]] | [[SCR-ORDER]] | |
| blank | | Blank step | | IN-ORDER | OUT-RESULT | [[RULE-VALIDATE]] | [[PROC-SUBFLOW]] | [[SCR-ORDER]] | |
| fallback | | Fallback step | process | IN-MISSING | OUT-MISSING | [[RULE-MISSING]] | [[PROC-MISSING]] | [[SCR-MISSING]] | |
`;
  const files = [
    { path: "process/PROC-SOURCE.md", content: processContent },
    { path: "process/PROC-SUBFLOW.md", content: modelFile("app_process", "PROC-SUBFLOW", "Subflow") },
    { path: "screens/SCR-ORDER.md", content: modelFile("screen", "SCR-ORDER", "Order screen") },
    { path: "screens/SCR-COMPLETE.md", content: modelFile("screen", "SCR-COMPLETE", "Complete screen") },
    { path: "screens/SCR-FALLBACK.md", content: modelFile("screen", "SCR-FALLBACK", "Fallback screen") },
    { path: "rules/RULE-VALIDATE.md", content: modelFile("rule", "RULE-VALIDATE", "Validate rule") },
    { path: "data/DATA-ORDER.md", content: modelFile("data_object", "DATA-ORDER", "Order data") },
    { path: "data/DATA-RESULT.md", content: modelFile("data_object", "DATA-RESULT", "Result data") },
    { path: "data/DATA-DIRECT-IN.md", content: modelFile("data_object", "DATA-DIRECT-IN", "Direct input data") },
    { path: "data/DATA-DIRECT-OUT.md", content: modelFile("data_object", "DATA-DIRECT-OUT", "Direct output data") }
  ];
  const index = buildVaultIndex(files, { parseMode: "full", validate: false });
  const model = index.modelsByFilePath["process/PROC-SOURCE.md"];
  assert.equal(model.fileType, "app-process");
  return { index, model };
}

function targetFor(model, index, stepId) {
  const step = model.steps.find((entry) => entry.id === stepId);
  assert.ok(step);
  return resolveAppProcessStepInteractionTarget(model, step, {
    index,
    sourcePath: model.path
  });
}


test("app_process Business Flow step interaction target follows kind priorities", () => {
  const { index, model } = buildFixture();

  assert.deepEqual(
    [targetFor(model, index, "screen").source, targetFor(model, index, "screen").targetPath],
    ["screen", "screens/SCR-ORDER.md"]
  );
  assert.deepEqual(
    [targetFor(model, index, "subflow").source, targetFor(model, index, "subflow").targetPath],
    ["invoke", "process/PROC-SUBFLOW.md"]
  );
  assert.deepEqual(
    [targetFor(model, index, "decision").source, targetFor(model, index, "decision").targetPath],
    ["rule", "rules/RULE-VALIDATE.md"]
  );
  assert.deepEqual(
    [targetFor(model, index, "input").source, targetFor(model, index, "input").targetPath],
    ["input", "data/DATA-ORDER.md"]
  );
  assert.deepEqual(
    [targetFor(model, index, "store").source, targetFor(model, index, "store").targetPath],
    ["output", "data/DATA-RESULT.md"]
  );
  assert.deepEqual(
    [targetFor(model, index, "end").source, targetFor(model, index, "end").targetPath],
    ["output", "data/DATA-RESULT.md"]
  );
});

test("app_process Business Flow input and output direct wikilinks win over id lookup", () => {
  const { index, model } = buildFixture();

  const input = targetFor(model, index, "directIn");
  assert.equal(input.source, "input");
  assert.equal(input.rawValue, "[[DATA-DIRECT-IN]]");
  assert.equal(input.targetPath, "data/DATA-DIRECT-IN.md");

  const output = targetFor(model, index, "directOut");
  assert.equal(output.source, "output");
  assert.equal(output.rawValue, "[[DATA-DIRECT-OUT]]");
  assert.equal(output.targetPath, "data/DATA-DIRECT-OUT.md");
});

test("app_process Business Flow blank and unknown kinds use generic process priority", () => {
  const { index, model } = buildFixture();

  assert.deepEqual(
    [targetFor(model, index, "unknown").source, targetFor(model, index, "unknown").targetPath],
    ["invoke", "process/PROC-SUBFLOW.md"]
  );
  assert.deepEqual(
    [targetFor(model, index, "blank").source, targetFor(model, index, "blank").targetPath],
    ["invoke", "process/PROC-SUBFLOW.md"]
  );
});

test("app_process Business Flow unresolved candidates fall back to source file", () => {
  const { index, model } = buildFixture();
  const target = targetFor(model, index, "fallback");

  assert.equal(target.source, "fallback");
  assert.equal(target.targetPath, "process/PROC-SOURCE.md");
});

test("app_process Business Flow interaction metadata uses resolved target", () => {
  const { index, model } = buildFixture();
  const targets = buildAppProcessBusinessFlowInteractionTargets(
    {
      title: model.name,
      inputs: model.inputs,
      outputs: model.outputs,
      steps: model.steps,
      flows: model.flows,
      hasExplicitFlows: Boolean(model.hasExplicitFlows)
    },
    model.path,
    index
  );

  const screenTarget = targets.find((target) => target.nodeId === "screen");
  assert.equal(screenTarget.linktext, "screens/SCR-ORDER.md");
  assert.equal(screenTarget.filePath, "screens/SCR-ORDER.md");
  assert.equal(screenTarget.status, "screen");

  const fallbackTarget = targets.find((target) => target.nodeId === "fallback");
  assert.equal(fallbackTarget.linktext, "process/PROC-SOURCE.md");
  assert.equal(fallbackTarget.status, "fallback");
});
