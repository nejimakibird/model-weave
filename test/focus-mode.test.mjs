import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { build } from "esbuild";

const outputFile = "dist/test-focus-mode.mjs";

await build({
  stdin: {
    contents: 'export { resolveFocusModeTransition, shouldHandleFocusModeEscape } from "./src/core/focus-mode"; export { resolveFocusTarget } from "./src/core/focus-target-resolver";',
    resolveDir: ".",
    sourcefile: "test-focus-mode-entry.ts",
    loader: "ts"
  },
  bundle: true,
  format: "esm",
  platform: "browser",
  outfile: outputFile,
  logLevel: "silent"
});

const { resolveFocusModeTransition, shouldHandleFocusModeEscape, resolveFocusTarget } = await import("../" + outputFile);

test("Focus starts off, toggles on, then toggles off without disabling View", () => {
  assert.deepEqual(resolveFocusModeTransition(false, false, false), {
    focusEnabled: true,
    enableView: false
  });
  assert.deepEqual(resolveFocusModeTransition(false, false, true), {
    focusEnabled: true,
    enableView: true
  });
  assert.deepEqual(resolveFocusModeTransition(false, true, true), {
    focusEnabled: true,
    enableView: false
  });
  assert.deepEqual(resolveFocusModeTransition(true, true, true), {
    focusEnabled: false,
    enableView: false
  });
});

test("Focus Escape only handles unclaimed Escape outside editable controls", () => {
  assert.equal(shouldHandleFocusModeEscape({ key: "Escape", target: null }), true);
  assert.equal(shouldHandleFocusModeEscape({ key: "Escape", defaultPrevented: true, target: null }), false);
  assert.equal(shouldHandleFocusModeEscape({ key: "Enter", target: null }), false);
});

test("Focus command is registered with a stable English name", () => {
  const source = readFileSync("src/main.ts", "utf8");
  assert.match(source, /id: "toggle-focus-mode",\s*name: "Toggle focus mode"/);
});
test("Focus target uses the active Modeling Preview first", () => {
  const active = { id: "active" };
  const matching = { id: "matching" };
  assert.equal(resolveFocusTarget({ activePreviewView: active, activeFilePath: "models/order.md", candidates: [{ view: matching, filePath: "models/order.md" }] }), active);
});

test("Focus target matches the active Markdown file by full vault-relative path", () => {
  const orderPreview = { id: "order" };
  const otherPreview = { id: "other" };
  assert.equal(resolveFocusTarget({ activePreviewView: null, activeFilePath: "models/order/Screen.md", candidates: [{ view: otherPreview, filePath: "archive/Screen.md" }, { view: orderPreview, filePath: "models/order/Screen.md" }] }), orderPreview);
});

test("Focus target only falls back when exactly one Modeling Preview is open", () => {
  const onlyPreview = { id: "only" };
  assert.equal(resolveFocusTarget({ activePreviewView: null, activeFilePath: "models/unmatched.md", candidates: [{ view: onlyPreview, filePath: "models/other.md" }] }), onlyPreview);
  assert.equal(resolveFocusTarget({ activePreviewView: null, activeFilePath: "models/unmatched.md", candidates: [{ view: { id: "a" }, filePath: "models/a.md" }, { view: { id: "b" }, filePath: "models/b.md" }] }), null);
  assert.equal(resolveFocusTarget({ activePreviewView: null, activeFilePath: null, candidates: [] }), null);
});
