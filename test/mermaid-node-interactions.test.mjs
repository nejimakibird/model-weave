import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const outputFile = "dist/test-mermaid-node-interactions.mjs";

await build({
  stdin: {
    contents: 'export { resolveGraphHoverParent, resolveGraphHoverLinkTargetElement } from "./src/views/mermaid-node-interactions";',
    resolveDir: ".",
    sourcefile: "test-mermaid-node-interactions-entry.ts",
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
          contents: "export class App {};",
          loader: "js"
        }));
      }
    }
  ],
  outfile: outputFile,
  logLevel: "silent"
});

const { resolveGraphHoverParent, resolveGraphHoverLinkTargetElement } = await import(
  `../${outputFile}?t=${Date.now()}`
);

class TestElement {
  constructor(className = "", parent = null) {
    this.className = className;
    this.parentElement = parent;
  }

  closest(selector) {
    const selectors = selector.split(",").map((entry) => entry.trim());
    let current = this;
    while (current) {
      if (selectors.some((entry) => current.matches(entry))) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }

  matches(selector) {
    if (!selector.startsWith(".")) {
      return false;
    }
    const expected = selector.slice(1);
    return this.className.split(/\s+/).includes(expected);
  }
}

test("resolveGraphHoverParent prefers View Only stage", () => {
  const fallback = new TestElement("fallback");
  const viewerRoot = new TestElement("model-weave-viewer-root", fallback);
  const viewOnlyStage = new TestElement("model-weave-view-only-stage", viewerRoot);
  const shell = new TestElement("model-weave-mermaid-shell", viewOnlyStage);
  const target = new TestElement("node", shell);

  assert.equal(resolveGraphHoverParent(target, fallback), viewOnlyStage);
});

test("resolveGraphHoverParent prefers viewer root before graph shell in Focus mode", () => {
  const fallback = new TestElement("fallback");
  const viewerRoot = new TestElement("model-weave-viewer-root model-weave-viewer-focus-mode", fallback);
  const shell = new TestElement("model-weave-mermaid-shell", viewerRoot);
  const diagram = new TestElement("mdspec-diagram mdspec-diagram--dfd", shell);
  const target = new TestElement("node", diagram);

  assert.equal(resolveGraphHoverParent(target, fallback), viewerRoot);
});

test("resolveGraphHoverParent falls back to workspace leaf content", () => {
  const fallback = new TestElement("fallback");
  const leaf = new TestElement("workspace-leaf-content", fallback);
  const shell = new TestElement("model-weave-mermaid-shell", leaf);
  const target = new TestElement("node", shell);

  assert.equal(resolveGraphHoverParent(target, fallback), leaf);
});

test("resolveGraphHoverParent keeps explicit hover parent override", () => {
  const fallback = new TestElement("fallback");
  const explicit = new TestElement("explicit");
  const viewerRoot = new TestElement("model-weave-viewer-root", fallback);
  const target = new TestElement("node", viewerRoot);

  assert.equal(resolveGraphHoverParent(target, fallback, explicit), explicit);
  assert.equal(
    resolveGraphHoverParent(target, fallback, () => explicit),
    explicit
  );
});


test("resolveGraphHoverLinkTargetElement prefers graph canvas", () => {
  const viewerRoot = new TestElement("model-weave-viewer-root");
  const viewport = new TestElement("model-weave-graph-viewport", viewerRoot);
  const canvas = new TestElement("model-weave-graph-canvas", viewport);
  const svgNode = new TestElement("node", canvas);

  assert.equal(resolveGraphHoverLinkTargetElement(svgNode, viewerRoot), canvas);
});

test("resolveGraphHoverLinkTargetElement falls back through viewport and viewer root", () => {
  const viewerRoot = new TestElement("model-weave-viewer-root");
  const viewport = new TestElement("model-weave-graph-viewport", viewerRoot);
  const svgNode = new TestElement("node", viewport);
  const detached = new TestElement("node");

  assert.equal(resolveGraphHoverLinkTargetElement(svgNode, viewerRoot), viewport);
  assert.equal(resolveGraphHoverLinkTargetElement(detached, viewerRoot), viewerRoot);
});
