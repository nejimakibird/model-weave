import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const outputFile = "dist/test-er-mermaid-style.mjs";

await build({
  stdin: {
    contents: `
      export { buildErMermaidReadableSvgStyle } from "./src/renderers/class-er-mermaid";
    `,
    resolveDir: ".",
    sourcefile: "test-er-mermaid-style-entry.ts",
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

const { buildErMermaidReadableSvgStyle } = await import(
  `../${outputFile}?t=${Date.now()}`
);

test("ER Mermaid readable SVG style fixes light cells with dark text", () => {
  const style = buildErMermaidReadableSvgStyle();

  assert.match(style, /\.entityBox/);
  assert.match(style, /\.attributeBoxOdd/);
  assert.match(style, /\.attributeBoxEven/);
  assert.match(style, /\.relationshipLabelBox/);
  assert.match(style, /fill:#f8fafc!important/);
  assert.match(style, /stroke:#64748b!important/);
  assert.match(style, /text,tspan\{fill:#111827!important;color:#111827!important;\}/);
});
