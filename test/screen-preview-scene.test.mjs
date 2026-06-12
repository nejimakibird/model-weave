import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const outputFile = "dist/test-screen-preview-scene.mjs";

await build({
  stdin: {
    contents: `
      export { measureScreenPreviewBlockHeight } from "./src/views/modeling-preview-view";
    `,
    resolveDir: ".",
    sourcefile: "test-screen-preview-scene-entry.ts",
    loader: "ts"
  },
  bundle: true,
  format: "esm",
  platform: "node",
  plugins: [
    {
      name: "stub-obsidian",
      setup(buildApi) {
        buildApi.onResolve({ filter: /^obsidian$/ }, () => ({
          path: "obsidian",
          namespace: "stub"
        }));
        buildApi.onResolve({ filter: /^electron$/ }, () => ({
          path: "electron",
          namespace: "stub"
        }));
        buildApi.onLoad({ filter: /^obsidian$/, namespace: "stub" }, () => ({
          contents: `
            export class ItemView {}
            export class WorkspaceLeaf {}
            export class TFile {}
            export const MarkdownRenderer = { render: async () => {} };
            export class Notice {}
            export const Platform = { isMobile: false };
            export const normalizePath = (path) => path;
            export const getLanguage = () => 'en';
            export const loadMermaid = async () => ({});
          `,
          loader: "js"
        }));
        buildApi.onLoad({ filter: /^electron$/, namespace: "stub" }, () => ({
          contents: "export const shell = { openPath: async () => '' };",
          loader: "js"
        }));
      }
    }
  ],
  outfile: outputFile,
  logLevel: "silent"
});

const { measureScreenPreviewBlockHeight } = await import(`../${outputFile}?t=${Date.now()}`);

test("screen preview block height reserves one row for empty placeholders", () => {
  const emptyHeight = measureScreenPreviewBlockHeight({ items: [] });
  const oneRowHeight = measureScreenPreviewBlockHeight({ items: [{ label: "Name" }] });
  const twoRowHeight = measureScreenPreviewBlockHeight({
    items: [{ label: "Name" }, { label: "Status" }]
  });

  assert.equal(emptyHeight, oneRowHeight);
  assert.ok(twoRowHeight > oneRowHeight);
  assert.equal(twoRowHeight - oneRowHeight, 22);
});
