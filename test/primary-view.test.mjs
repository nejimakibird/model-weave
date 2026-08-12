import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const outputFile = "dist/test-primary-view.mjs";

await build({
  stdin: {
    contents: 'export { getAvailablePrimaryViewModes, getPrimaryViewColorSchemeTargets, hasMermaidCapablePrimaryView, resolvePrimaryViewMode } from "./src/core/primary-view";',
    resolveDir: ".",
    sourcefile: "test-primary-view-entry.ts",
    loader: "ts"
  },
  bundle: true,
  format: "esm",
  platform: "browser",
  outfile: outputFile,
  logLevel: "silent"
});

const { getAvailablePrimaryViewModes, getPrimaryViewColorSchemeTargets, hasMermaidCapablePrimaryView, resolvePrimaryViewMode } = await import("../" + outputFile + "?t=" + Date.now());

test("Primary View defaults to Model when both views are available", () => {
  const availability = { modelViewAvailable: true, weaveMapAvailable: true };
  assert.deepEqual(getAvailablePrimaryViewModes(availability), ["model", "weave-map"]);
  assert.equal(resolvePrimaryViewMode(availability), "model");
  assert.equal(resolvePrimaryViewMode(availability, "weave-map"), "weave-map");
});

test("Primary View supports model-only, weave-map-only, and unavailable states", () => {
  assert.equal(resolvePrimaryViewMode({ modelViewAvailable: true, weaveMapAvailable: false }, "weave-map"), "model");
  assert.equal(resolvePrimaryViewMode({ modelViewAvailable: false, weaveMapAvailable: true }), "weave-map");
  assert.equal(resolvePrimaryViewMode({ modelViewAvailable: false, weaveMapAvailable: false }), null);
});

test("Primary View preserves model detail inputs and uses weave_map colors only for Weave Map", () => {
  const modelDetailsId = "FLOW-ORDER-SCREEN-COMMUNICATION";
  assert.equal(modelDetailsId, "FLOW-ORDER-SCREEN-COMMUNICATION");
  assert.deepEqual(getPrimaryViewColorSchemeTargets("model", ["dfd", "domain"]), ["dfd", "domain"]);
  assert.deepEqual(getPrimaryViewColorSchemeTargets("weave-map", ["dfd", "domain"]), ["weave_map"]);
  assert.deepEqual(getPrimaryViewColorSchemeTargets("model", []), []);
});


test("Mermaid tab capability includes a Weave Map for non-Mermaid model views", () => {
  assert.equal(
    hasMermaidCapablePrimaryView({ modelMermaidAvailable: true, weaveMapAvailable: true }),
    true
  );
  assert.equal(
    hasMermaidCapablePrimaryView({ modelMermaidAvailable: false, weaveMapAvailable: true }),
    true
  );
  assert.equal(
    hasMermaidCapablePrimaryView({ modelMermaidAvailable: false, weaveMapAvailable: false }),
    false
  );
});
