import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const outputFile = "dist/test-domains-model.mjs";

await build({
  stdin: {
    contents: [
      'export { parseDomainsFile } from "./src/parsers/domains-parser";',
      'export { parseDfdDiagramFile } from "./src/parsers/dfd-diagram-parser";',
      'export { buildDomainTree } from "./src/core/domain-tree";',
      'export { buildDomainHierarchyMermaid } from "./src/renderers/domains-mermaid";',
      'export { resolveDiagramRelations } from "./src/core/relation-resolver";',
      'export { buildDfdMermaidSource } from "./src/renderers/dfd-mermaid";',
      'export { buildVaultIndex, ensureVaultValidation, replaceVaultIndexFile } from "./src/core/vault-index";',
      'export { buildCurrentObjectDiagnostics, localizeDiagnosticMessage } from "./src/core/current-file-diagnostics";'
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
  parseDfdDiagramFile,
  buildDomainTree,
  buildDomainHierarchyMermaid,
  buildDfdMermaidSource,
  buildVaultIndex,
  buildCurrentObjectDiagnostics,
  ensureVaultValidation,
  localizeDiagnosticMessage,
  resolveDiagramRelations,
  replaceVaultIndexFile
} = await import(
  `../${outputFile}?t=${Date.now()}`
);

globalThis.activeDocument = {
  body: {
    classList: {
      contains: () => false
    }
  }
};

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

const dfdFrontmatter = `---
type: dfd_diagram
id: DFD-SHIPPING
name: Shipping DFD
---

# Shipping DFD
`;

function parseDfd(markdown) {
  const result = parseDfdDiagramFile(markdown, "DFD-SHIPPING.md");
  assert.ok(result.file);
  return result;
}

function dfdBody(domainsRows) {
  return `${dfdFrontmatter}
## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
${domainsRows}

## Objects

| id | label | kind | ref | notes |
|---|---|---|---|---|
| user | User | external | | User |
| pick | Pick items | process | | Pick |

## Flows

| id | from | to | data | notes |
|---|---|---|---|---|
| request | user | pick | Request | User request |
`;
}

function buildDomainsIndex(dfdDomainsRows) {
  const shared = `${baseFrontmatter}
## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| logistics | Logistics | department | | Shared logistics |
| warehouse | Warehouse | location | logistics | Shared warehouse |
| wms | WMS | system | logistics | Shared WMS |
`;

  return buildVaultIndex([
    {
      path: "DOMAINS-CORE.md",
      content: shared
    },
    {
      path: "DFD-SHIPPING.md",
      content: dfdBody(dfdDomainsRows)
    }
  ]);
}

function resolveDfdFromContent(content) {
  const index = buildVaultIndex([
    {
      path: "DFD-SHIPPING.md",
      content
    }
  ], { parseMode: "full", validate: false });
  const model = index.modelsByFilePath["DFD-SHIPPING.md"];
  assert.equal(model.fileType, "dfd-diagram");
  return {
    index,
    model,
    resolved: resolveDiagramRelations(model, index)
  };
}

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

test("validates duplicate standalone Domains across files", () => {
  const index = buildVaultIndex([
    {
      path: "DOMAINS-CORE.md",
      content: `${baseFrontmatter}
## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| logistics | Logistics | department | | Shared logistics |
| wms | WMS | system | logistics | Shared WMS |
`
    },
    {
      path: "DOMAINS-WAREHOUSE.md",
      content: `---
type: domains
id: DOMAINS-WAREHOUSE
name: Warehouse Domains
---

# Warehouse Domains

## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| warehouse | Warehouse | location | logistics | Shared warehouse |
| wms | WMS | system | logistics | Shared WMS |
`
    }
  ]);

  const coreMessages = (index.warningsByFilePath["DOMAINS-CORE.md"] ?? []).map(
    (warning) => warning.message
  );
  const warehouseMessages = (index.warningsByFilePath["DOMAINS-WAREHOUSE.md"] ?? []).map(
    (warning) => warning.message
  );

  assert.ok(coreMessages.includes('Domain "wms" is defined in multiple Domains files.'));
  assert.ok(warehouseMessages.includes('Domain "wms" is defined in multiple Domains files.'));
  assert.equal(
    warehouseMessages.some((message) => message.includes("conflicting")),
    false
  );
});

test("validates conflicting standalone Domains across files", () => {
  const index = buildVaultIndex([
    {
      path: "DOMAINS-CORE.md",
      content: `${baseFrontmatter}
## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| logistics | Logistics | department | | Shared logistics |
| warehouse | Warehouse | location | logistics | Shared warehouse |
| wms | WMS | system | warehouse | Shared WMS |
`
    },
    {
      path: "DOMAINS-WAREHOUSE.md",
      content: `---
type: domains
id: DOMAINS-WAREHOUSE
name: Warehouse Domains
---

# Warehouse Domains

## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| logistics | Logistics | department | | Shared logistics |
| wms | WMS local | application | logistics | Local WMS |
`
    }
  ]);

  const messages = (index.warningsByFilePath["DOMAINS-WAREHOUSE.md"] ?? []).map(
    (warning) => warning.message
  );

  assert.ok(messages.includes('Domain "wms" is defined in multiple Domains files.'));
  assert.ok(messages.includes('Domain "wms" has conflicting name values across Domains files.'));
  assert.ok(messages.includes('Domain "wms" has conflicting kind values across Domains files.'));
  assert.ok(messages.includes('Domain "wms" has conflicting parent values across Domains files.'));
  assert.equal(
    messages.some((message) => message.includes("description")),
    false
  );
});

test("shows standalone Domain duplicate diagnostics through current preview path", () => {
  const fileA = `${baseFrontmatter}
## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| company | Company | organization | | Company |
| logistics | Logistics | department | company | Logistics |
| warehouse | Warehouse | location | logistics | Warehouse |
| wms | WMS | system | logistics | WMS |
`;
  const fileB = `---
type: domains
id: DOMAINS-WAREHOUSE
name: Warehouse Domains
---

# Warehouse Domains

## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| logistics | Logistics | department | | Logistics |
| warehouse | Warehouse | location | logistics | Warehouse |
| wms | WMS | system | logistics | WMS |
`;
  const fileC = `---
type: domains
id: DOMAINS-UNIQUE
name: Unique Domains
---

# Unique Domains

## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| billing | Billing | department | | Billing |
`;
  const index = buildVaultIndex([
    {
      path: "DOMAINS-CORE.md",
      frontmatter: { type: "domains", id: "DOMAINS-CORE", name: "Core Domains" }
    },
    {
      path: "DOMAINS-WAREHOUSE.md",
      frontmatter: {
        type: "domains",
        id: "DOMAINS-WAREHOUSE",
        name: "Warehouse Domains"
      }
    },
    {
      path: "DOMAINS-UNIQUE.md",
      frontmatter: {
        type: "domains",
        id: "DOMAINS-UNIQUE",
        name: "Unique Domains"
      }
    }
  ], { parseMode: "shallow", validate: false });

  replaceVaultIndexFile(index, { path: "DOMAINS-CORE.md", content: fileA }, "full");
  replaceVaultIndexFile(index, { path: "DOMAINS-WAREHOUSE.md", content: fileB }, "full");
  replaceVaultIndexFile(index, { path: "DOMAINS-UNIQUE.md", content: fileC }, "full");
  ensureVaultValidation(index);

  const currentModel = index.modelsByFilePath["DOMAINS-CORE.md"];
  assert.equal(currentModel.fileType, "domains");
  const diagnostics = buildCurrentObjectDiagnostics(
    currentModel,
    index,
    null,
    index.warningsByFilePath["DOMAINS-CORE.md"] ?? []
  );
  const messages = diagnostics.map((warning) => warning.message);
  const uniqueMessages = (index.warningsByFilePath["DOMAINS-UNIQUE.md"] ?? []).map(
    (warning) => warning.message
  );

  assert.ok(messages.includes('Domain "logistics" is defined in multiple Domains files.'));
  assert.ok(messages.includes('Domain "warehouse" is defined in multiple Domains files.'));
  assert.ok(messages.includes('Domain "wms" is defined in multiple Domains files.'));
  assert.ok(messages.includes('Domain "logistics" has conflicting parent values across Domains files.'));
  assert.equal(
    uniqueMessages.some((message) => message.includes("multiple Domains files")),
    false
  );
});

test("localizes vault-wide standalone Domain diagnostics", () => {
  assert.equal(
    localizeDiagnosticMessage(
      'Domain "wms" is defined in multiple Domains files.',
      "ja"
    ),
    'Domain "wms" が複数の Domains ファイルで定義されています。'
  );
  assert.equal(
    localizeDiagnosticMessage(
      'Domain "wms" has conflicting kind values across Domains files.',
      "ja"
    ),
    'Domain "wms" の kind が複数の Domains ファイルで一致していません。'
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

test("DFD files without local Domains remain compatible", () => {
  const { file, warnings } = parseDfd(`${dfdFrontmatter}
## Objects

| id | label | kind | ref | notes |
|---|---|---|---|---|
| user | User | external | | User |
| pick | Pick items | process | | Pick |

## Flows

| id | from | to | data | notes |
|---|---|---|---|---|
| request | user | pick | Request | User request |
`);

  assert.deepEqual(file.domains, []);
  assert.equal(file.nodes.length, 2);
  assert.equal(warnings.length, 0);
});

test("DFD-local Domains parse without becoming DFD objects", () => {
  const { file, warnings } = parseDfd(dfdBody([
    "| logistics | Logistics | department | | Local logistics |",
    "| warehouse | Warehouse | location | logistics | Local warehouse |"
  ].join("\n")));

  assert.equal(file.domains.length, 2);
  assert.equal(file.nodes.length, 2);
  assert.deepEqual(file.nodes.map((node) => node.id), ["user", "pick"]);
  assert.equal(warnings.length, 0);
});

test("parses optional DFD object domain column", () => {
  const { file, warnings } = parseDfd(`${dfdFrontmatter}
## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| wms | WMS | system | | Warehouse system |

## Objects

| id | label | kind | ref | domain | notes |
|---|---|---|---|---|---|
| receive_order | Receive order | process | | wms | Local process |

## Flows

| id | from | to | data | notes |
|---|---|---|---|---|
`);

  assert.equal(file.objectEntries[0].domain, "wms");
  assert.equal(file.nodes[0].metadata.domain, "wms");
  assert.equal(warnings.length, 0);
});

test("renders DFD-local Domains as Mermaid subgraphs", () => {
  const { resolved } = resolveDfdFromContent(`${dfdFrontmatter}
## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| warehouse | 倉庫 | location | | 実作業場所 |
| wms | WMS | system | | 倉庫管理システム |
| core | 基幹 | system | | 基幹システム |

## Objects

| id | label | kind | ref | domain | notes |
|---|---|---|---|---|---|
| receive_order | 出荷依頼受付 | other | | wms | |
| pick_items | ピッキング | process | | warehouse | |
| inventory_db | 在庫DB | datastore | | wms | |
| core_system | 基幹 | external | | core | |
| operator | 作業者 | external | | | |

## Flows

| id | from | to | data | notes |
|---|---|---|---|---|
| f1 | core_system | receive_order | 出荷指示 | |
| f2 | receive_order | pick_items | ピッキング指示 | |
| f3 | pick_items | inventory_db | 在庫引当 | |
| f4 | operator | pick_items | 作業指示 | |
`);

  const source = buildDfdMermaidSource(resolved);
  assert.match(source, /subgraph domain_wms\["WMS \[system\]"\]/);
  assert.match(source, /subgraph domain_warehouse\["倉庫 \[location\]"\]/);
  assert.match(source, /subgraph domain_core\["基幹 \[system\]"\]/);
  assert.match(source, /receive_order\["出荷依頼受付"\]:::dfdOther/);
  assert.match(source, /inventory_db\[\("在庫DB"\)\]:::dfdDatastore/);
  assert.match(source, /operator\["作業者"\]:::dfdExternal/);
  assert.match(source, /core_system -->\|出荷指示\| receive_order/);
  assert.match(source, /receive_order -->\|ピッキング指示\| pick_items/);
  assert.doesNotMatch(source, /domain_wms -->/);
});

test("DFD files without object domain render without Domain subgraphs", () => {
  const { resolved } = resolveDfdFromContent(dfdBody([
    "| logistics | Logistics | department | | Local logistics |"
  ].join("\n")));
  const source = buildDfdMermaidSource(resolved);

  assert.doesNotMatch(source, /subgraph domain_/);
  assert.match(source, /user\["User"\]:::dfdExternal/);
  assert.match(source, /pick\["Pick items"\]:::dfdProcess/);
});

test("diagnoses DFD object domain without local Domains", () => {
  const { resolved } = resolveDfdFromContent(`${dfdFrontmatter}
## Objects

| id | label | kind | ref | domain | notes |
|---|---|---|---|---|---|
| receive_order | Receive order | process | | wms | |

## Flows

| id | from | to | data | notes |
|---|---|---|---|---|
`);
  const messages = resolved.warnings.map((warning) => warning.message);

  assert.ok(messages.includes('DFD object "receive_order" references Domain "wms", but this DFD has no local Domains.'));
});

test("diagnoses DFD object unknown local Domain", () => {
  const { resolved } = resolveDfdFromContent(`${dfdFrontmatter}
## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| warehouse | Warehouse | location | | Warehouse |

## Objects

| id | label | kind | ref | domain | notes |
|---|---|---|---|---|---|
| receive_order | Receive order | process | | missing | |

## Flows

| id | from | to | data | notes |
|---|---|---|---|---|
`);
  const messages = resolved.warnings.map((warning) => warning.message);

  assert.ok(messages.includes('DFD object "receive_order" references unknown local Domain "missing".'));
});

test("localizes DFD object Domain diagnostics", () => {
  assert.equal(
    localizeDiagnosticMessage(
      'DFD object "receive_order" references unknown local Domain "missing".',
      "ja"
    ),
    'DFD object "receive_order" が未定義のローカル Domain "missing" を参照しています。'
  );
  assert.equal(
    localizeDiagnosticMessage(
      'DFD object "receive_order" references Domain "wms", but this DFD has no local Domains.',
      "ja"
    ),
    'DFD object "receive_order" が Domain "wms" を参照していますが、この DFD にはローカル Domains が定義されていません。'
  );
});

test("DFD-local Domains reuse in-file Domain diagnostics", () => {
  const { warnings } = parseDfd(dfdBody([
    "| warehouse | Warehouse | location | | Warehouse operation |",
    "| warehouse | Duplicate | location | | Duplicate id |",
    "| orphan | Orphan | system | missing_parent | Unknown parent |",
    "| self | Self | system | self | Self parent |",
    "| cycle_a | Cycle A | system | cycle_b | Cycle A |",
    "| cycle_b | Cycle B | system | cycle_a | Cycle B |",
    "| | Missing | system | | Missing id |"
  ].join("\n")));

  const messages = warnings.map((warning) => warning.message);
  assert.ok(messages.includes('duplicate Domain id "warehouse"'));
  assert.ok(messages.includes('Domain parent "missing_parent" is not defined.'));
  assert.ok(messages.includes('Domain "self" cannot use itself as parent.'));
  assert.ok(messages.some((message) => message.includes("Domain parent cycle detected")));
  assert.ok(messages.includes("Domain id is required."));
});

test("validates DFD-local Domains against shared standalone Domains", () => {
  const index = buildDomainsIndex([
    "| warehouse | Warehouse | location | logistics | Description may differ |",
    "| wms | WMS | application | logistics | Description may differ |",
    "| unknown | Unknown | system | logistics | Local only |"
  ].join("\n"));
  const messages = (index.warningsByFilePath["DFD-SHIPPING.md"] ?? []).map(
    (warning) => warning.message
  );

  assert.ok(messages.includes('DFD-local Domain "unknown" is not defined in shared Domains.'));
  assert.ok(messages.includes('DFD-local Domain "wms" has kind "application", but shared Domains define kind "system".'));
  assert.equal(
    messages.some((message) => message.includes("Description may differ")),
    false
  );
});

test("validates DFD-local Domain parent and name mismatches", () => {
  const index = buildDomainsIndex([
    "| warehouse | 倉庫 | location | wms | Local parent mismatch |",
    "| wms | WMS local | system | logistics | Local name mismatch |"
  ].join("\n"));
  const messages = (index.warningsByFilePath["DFD-SHIPPING.md"] ?? []).map(
    (warning) => warning.message
  );

  assert.ok(messages.includes('DFD-local Domain "warehouse" has name "倉庫", but shared Domains define name "Warehouse".'));
  assert.ok(messages.includes('DFD-local Domain "warehouse" has parent "wms", but shared Domains define parent "logistics".'));
  assert.ok(messages.includes('DFD-local Domain "wms" has name "WMS local", but shared Domains define name "WMS".'));
});

test("empty DFD-local Domain fields do not conflict with shared Domains", () => {
  const index = buildDomainsIndex([
    "| warehouse | | | | Description may differ |",
    "| wms | WMS | system | logistics | Different description |"
  ].join("\n"));
  const messages = (index.warningsByFilePath["DFD-SHIPPING.md"] ?? []).map(
    (warning) => warning.message
  );

  assert.equal(
    messages.some((message) => message.startsWith("DFD-local Domain")),
    false
  );
});

test("localizes DFD-local Domain consistency diagnostics", () => {
  assert.equal(
    localizeDiagnosticMessage(
      'DFD-local Domain "warehouse" is not defined in shared Domains.',
      "ja"
    ),
    'DFD内の Domain "warehouse" は共通 Domains に定義されていません。'
  );
  assert.equal(
    localizeDiagnosticMessage(
      'DFD-local Domain "wms" has kind "application", but shared Domains define kind "system".',
      "ja"
    ),
    'DFD内の Domain "wms" の kind は "application" ですが、共通 Domains では "system" と定義されています。'
  );
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
