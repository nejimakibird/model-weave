import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const outputFile = "dist/test-app-process-business-flow.mjs";

await build({
  entryPoints: ["src/renderers/app-process-business-flow.ts"],
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
          contents: [
            "export const Platform = {};",
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

const { buildAppProcessBusinessFlowMermaidSource } = await import(
  `../${outputFile}?t=${Date.now()}`
);

test("app_process Mermaid labels preserve visible punctuation", () => {
  const source = buildAppProcessBusinessFlowMermaidSource({
    title: "Label escaping verification",
    hasExplicitFlows: true,
    steps: [
      {
        id: "slash",
        label: "Vault/ファイル解析開始"
      },
      {
        id: "opening-brackets",
        label: "[[Mermaidソース生成開始"
      },
      {
        id: "closing-brackets",
        label: "Mermaidソース生成開始]]"
      },
      {
        id: "wikilink-like",
        label: "[[Mermaidソース生成開始]]"
      },
      {
        id: "pipe",
        label: "A \\| B"
      }
    ],
    flows: [
      {
        from: "slash",
        to: "opening-brackets"
      },
      {
        from: "opening-brackets",
        to: "closing-brackets",
        label: "A \\| B"
      },
      {
        from: "closing-brackets",
        to: "wikilink-like"
      },
      {
        from: "wikilink-like",
        to: "pipe"
      }
    ]
  });

  assert.match(source, /Vault\/ファイル解析開始/);
  assert.match(source, /#91;#91;Mermaidソース生成開始/);
  assert.match(source, /Mermaidソース生成開始#93;#93;/);
  assert.match(source, /#91;#91;Mermaidソース生成開始#93;#93;/);
  assert.match(source, /A \| B/);

  assert.doesNotMatch(source, /&#47;/);
  assert.doesNotMatch(source, /&#91;/);
  assert.doesNotMatch(source, /&#93;/);
  assert.doesNotMatch(source, /\[\[Mermaidソース生成開始/);
  assert.doesNotMatch(source, /Mermaidソース生成開始\]\]/);
  assert.doesNotMatch(source, /&\//);
  assert.doesNotMatch(source, /&\[&\[/);
  assert.doesNotMatch(source, /&\]&\]/);
  assert.doesNotMatch(source, /\\\|/);
});
