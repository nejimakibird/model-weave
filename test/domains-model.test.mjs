import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const outputFile = "dist/test-domains-model.mjs";

await build({
  stdin: {
    contents: [
      'export { parseDomainsFile } from "./src/parsers/domains-parser";',
      'export { buildDomainTree } from "./src/core/domain-tree";',
      'export { buildDomainHierarchyMermaid } from "./src/renderers/domains-mermaid";',
      'export { localizeDiagnosticMessage } from "./src/core/current-file-diagnostics";'
    ].join("\n"),
    resolveDir: ".",
    sourcefile: "test-domains-model-entry.ts",
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
    },
    {
      name: "stub-node-builtins",
      setup(buildApi) {
        buildApi.onResolve({ filter: /^(fs|path|electron)$/ }, (args) => ({
          path: args.path,
          namespace: "stub"
        }));
        buildApi.onLoad({ filter: /.*/, namespace: "stub" }, (args) => ({
          contents:
            args.path === "path"
              ? "export default {}; export const win32 = {}; export const posix = {};"
              : "export const shell = { openPath: async () => '' }; export default {};",
          loader: "js"
        }));
      }
    }
  ],
  outfile: outputFile,
  logLevel: "silent"
});

const {
  parseDomainsFile,
  buildDomainTree,
  buildDomainHierarchyMermaid,
  localizeDiagnosticMessage
} = await import(
  `../${outputFile}?t=${Date.now()}`
);

function parseDomains(markdown) {
  const result = parseDomainsFile(markdown, "model/domains/core.md");
  assert.ok(result.file);
  return result;
}

const baseFrontmatter = `---
type: domains
id: DOMAINS-CORE
name: Core Domains
---

# Core Domains
`;

test("parses standalone Domains documents", () => {
  const { file, warnings } = parseDomains(`${baseFrontmatter}
## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| logistics | Logistics | organization | | Logistics area |
| warehouse | Warehouse | location | logistics | Warehouse operation |
| fallback_name | | system | logistics | Uses id as display fallback |
`);

  assert.equal(file.fileType, "domains");
  assert.equal(file.schema, "domains");
  assert.equal(file.domains.length, 3);
  assert.equal(file.domains[1].parent, "logistics");
  assert.equal(file.domains[2].name, undefined);
  assert.equal(warnings.length, 0);
});

test("diagnoses invalid standalone Domain definitions", () => {
  const { warnings } = parseDomains(`${baseFrontmatter}
## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| warehouse | Warehouse | location | | Warehouse operation |
| warehouse | Duplicate | location | | Duplicate id |
| orphan | Orphan | system | missing_parent | Unknown parent |
| self | Self | system | self | Self parent |
| cycle_a | Cycle A | system | cycle_b | Cycle A |
| cycle_b | Cycle B | system | cycle_a | Cycle B |
| | Missing | system | | Missing id |
`);

  const messages = warnings.map((warning) => warning.message);
  assert.ok(messages.includes('duplicate Domain id "warehouse"'));
  assert.ok(messages.includes('Domain parent "missing_parent" is not defined.'));
  assert.ok(messages.includes('Domain "self" cannot use itself as parent.'));
  assert.ok(messages.some((message) => message.includes("Domain parent cycle detected")));
  assert.ok(messages.includes("Domain id is required."));
});

test("localizes standalone Domain diagnostics", () => {
  assert.equal(
    localizeDiagnosticMessage('Domain parent "missing_parent" is not defined.', "ja"),
    'Domain parent "missing_parent" が定義されていません。'
  );
  assert.equal(
    localizeDiagnosticMessage('Domain "self" cannot use itself as parent.', "ja"),
    'Domain "self" は自分自身を parent にできません。'
  );
});

test("builds a simple standalone Domain hierarchy", () => {
  const { file } = parseDomains(`${baseFrontmatter}
## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| logistics | Logistics | organization | | Logistics area |
| warehouse | Warehouse | location | logistics | Warehouse operation |
| wms | WMS | system | warehouse | Warehouse management |
`);

  const tree = buildDomainTree(file.domains);
  assert.equal(tree.length, 1);
  assert.equal(tree[0].domain.id, "logistics");
  assert.equal(tree[0].children[0].domain.id, "warehouse");
  assert.equal(tree[0].children[0].children[0].domain.id, "wms");
});

test("generates Mermaid source for nested Domain hierarchy", () => {
  const { file } = parseDomains(`${baseFrontmatter}
## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| company | 会社全体 | organization | | 業務全体 |
| logistics | 物流部 | department | company | 物流 |
| warehouse | 倉庫 | location | logistics | 倉庫 |
| handheld | ハンディ端末 | device | warehouse | 端末 |
| wms | WMS | system | logistics | WMS |
| core | 基幹システム | system | company | 基幹 |
`);

  const source = buildDomainHierarchyMermaid(file.domains);
  assert.match(source, /^flowchart TB/);
  assert.match(source, /subgraph domain_company\["会社全体 \[organization\]"\]/);
  assert.match(source, /subgraph domain_logistics\["物流部 \[department\]"\]/);
  assert.match(source, /subgraph domain_warehouse\["倉庫 \[location\]"\]/);
  assert.match(source, /domain_handheld\["ハンディ端末 \[device\]"\]/);
  assert.match(source, /domain_wms\["WMS \[system\]"\]/);
  assert.match(source, /domain_core\["基幹システム \[system\]"\]/);
});

test("generates Mermaid label fallback from empty Domain name", () => {
  const { file } = parseDomains(`${baseFrontmatter}
## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| fallback_name | | system | | Uses id |
`);

  const source = buildDomainHierarchyMermaid(file.domains);
  assert.match(source, /domain_fallback_name\["fallback_name \[system\]"\]/);
});

test("generates safe Mermaid source for circular Domain hierarchy", () => {
  const { file } = parseDomains(`${baseFrontmatter}
## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| cycle_a | Cycle A | system | cycle_b | Cycle A |
| cycle_b | Cycle B | system | cycle_a | Cycle B |
`);

  const source = buildDomainHierarchyMermaid(file.domains);
  assert.match(source, /^flowchart TB/);
  assert.match(source, /domain_cycle_a\["Cycle A \[system\]"\]/);
  assert.match(source, /domain_cycle_b\["Cycle B \[system\]"\]/);
  assert.doesNotMatch(source, /Maximum call stack/i);
});
