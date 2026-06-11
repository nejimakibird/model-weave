import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const outputFile = "dist/test-domains-model.mjs";

await build({
  stdin: {
    contents: [
      'export { parseDomainsFile } from "./src/parsers/domains-parser";',
      'export { parseDomainDiagramFile } from "./src/parsers/domain-diagram-parser";',
      'export { parseColorSchemeFile } from "./src/parsers/color-scheme-parser";',
      'export { parseDfdDiagramFile } from "./src/parsers/dfd-diagram-parser";',
      'export { MODEL_WEAVE_TEMPLATES } from "./src/templates/model-weave-templates";',
      'export { DEFAULT_MODEL_WEAVE_SETTINGS, DOMAIN_VIEW_MODE_SETTING_OPTIONS, normalizeModelWeaveSettings } from "./src/settings/model-weave-settings";',
      'export { detectFileType } from "./src/core/schema-detector";',
      'export { isModelWeavePreviewSupportedFileType, SUPPORTED_MODEL_WEAVE_FORMAT_LIST } from "./src/core/supported-formats";',
      'export { BUILT_IN_COLOR_SCHEME, getAppliedColorSchemeRowsForTargets, getEffectiveColorSchemeEntriesForTarget, resolveColorStyle, resolveDefaultColorScheme } from "./src/core/color-scheme";',
      'export { buildDomainTree } from "./src/core/domain-tree";',
      'export { buildDomainRelationshipSummaries } from "./src/core/domain-relationships";',
      'export { mergeDomainDiagramSources, resolveDomainDiagram } from "./src/core/domain-diagram-resolver";',
      'export { resolveRenderMode } from "./src/core/render-mode";',
      'export { createModelWeaveTranslator } from "./src/i18n/messages";',
      'export { buildDomainHierarchyMermaid, buildDomainMindmapMermaid, buildDomainTreeViewMermaid } from "./src/renderers/domains-mermaid";',
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
  parseDomainDiagramFile,
  parseColorSchemeFile,
  parseDfdDiagramFile,
  MODEL_WEAVE_TEMPLATES,
  DEFAULT_MODEL_WEAVE_SETTINGS,
  DOMAIN_VIEW_MODE_SETTING_OPTIONS,
  normalizeModelWeaveSettings,
  detectFileType,
  isModelWeavePreviewSupportedFileType,
  SUPPORTED_MODEL_WEAVE_FORMAT_LIST,
  BUILT_IN_COLOR_SCHEME,
  getAppliedColorSchemeRowsForTargets,
  getEffectiveColorSchemeEntriesForTarget,
  resolveColorStyle,
  resolveDefaultColorScheme,
  buildDomainRelationshipSummaries,
  buildDomainTree,
  buildDomainHierarchyMermaid,
  buildDomainMindmapMermaid,
  buildDomainTreeViewMermaid,
  createModelWeaveTranslator,
  buildDfdMermaidSource,
  buildVaultIndex,
  mergeDomainDiagramSources,
  resolveRenderMode,
  resolveDomainDiagram,
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

function parseDomainDiagram(markdown) {
  const result = parseDomainDiagramFile(markdown, "model/domains/DOMAIN-DIAGRAM-LOGISTICS.md");
  assert.ok(result.file);
  return result;
}

function parseColorScheme(markdown) {
  const result = parseColorSchemeFile(markdown, "model/config/COLOR-SCHEME-DEFAULT.md");
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

function domainsFile(path, id, rows) {
  return {
    path,
    content: `---
type: domains
id: ${id}
name: ${id}
---

## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
${rows}
`
  };
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

function resolveDfdWithFiles(files) {
  const index = buildVaultIndex(files, { parseMode: "full", validate: false });
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

test("parses standalone Domain Diagram source refs", () => {
  const { file, warnings } = parseDomainDiagram(`---
type: domain_diagram
title: 物流Domain統合図
id: DOMAIN-DIAGRAM-LOGISTICS
name: 物流Domain統合図
---

## Domain Sources

| ref | notes |
|---|---|
| [[DOMAINS-COMPANY]] | 会社・部門 |
| [[DOMAINS-WAREHOUSE]] | 倉庫・係 |
`);

  assert.equal(file.fileType, "domain-diagram");
  assert.equal(file.id, "DOMAIN-DIAGRAM-LOGISTICS");
  assert.equal(file.domainSources.length, 2);
  assert.equal(file.domainSources[0].ref, "[[DOMAINS-COMPANY]]");
  assert.equal(file.domainSources[1].notes, "倉庫・係");
  assert.equal(warnings.length, 0);
});

test("parses standalone Domain Diagram source refs without notes", () => {
  const { file, warnings } = parseDomainDiagram(`---
type: domain_diagram
title: 物流Domain統合図
id: DOMAIN-DIAGRAM-LOGISTICS
name: 物流Domain統合図
---

## Domain Sources

| ref |
|---|
| [[DOMAINS-COMPANY]] |
| [[DOMAINS-WAREHOUSE]] |
`);

  assert.equal(file.domainSources.length, 2);
  assert.equal(file.domainSources[0].ref, "[[DOMAINS-COMPANY]]");
  assert.equal(file.domainSources[0].notes, undefined);
  assert.equal(file.domainSources[1].ref, "[[DOMAINS-WAREHOUSE]]");
  assert.equal(warnings.length, 0);
});

test("registers domain_diagram as a supported Model Weave type", () => {
  assert.equal(detectFileType({ type: "domain_diagram" }), "domain-diagram");
  assert.equal(isModelWeavePreviewSupportedFileType("domain-diagram"), true);
  assert.match(SUPPORTED_MODEL_WEAVE_FORMAT_LIST, /domain_diagram/);
  assert.equal(detectFileType({ type: "color_scheme" }), "color-scheme");
  assert.equal(isModelWeavePreviewSupportedFileType("color-scheme"), true);
  assert.match(SUPPORTED_MODEL_WEAVE_FORMAT_LIST, /color_scheme/);
});

test("defines Domain and Color Scheme insertion templates", () => {
  assert.match(MODEL_WEAVE_TEMPLATES.domains, /type: domains/);
  assert.match(MODEL_WEAVE_TEMPLATES.domains, /\| id \| name \| kind \| parent \| description \|/);
  assert.match(MODEL_WEAVE_TEMPLATES.domains, /business_domain/);

  assert.match(MODEL_WEAVE_TEMPLATES.domainDiagram, /type: domain_diagram/);
  assert.match(MODEL_WEAVE_TEMPLATES.domainDiagram, /## Domain Sources/);
  assert.match(MODEL_WEAVE_TEMPLATES.domainDiagram, /\| ref \|/);

  assert.match(MODEL_WEAVE_TEMPLATES.colorScheme, /type: color_scheme/);
  assert.match(MODEL_WEAVE_TEMPLATES.colorScheme, /\| target \| kind \| fill \| stroke \| text \| notes \|/);
  assert.match(MODEL_WEAVE_TEMPLATES.colorScheme, /\|  \| business \| #4f81bd \| #2f5597 \| #ffffff \| Global business color \|/);
  assert.match(MODEL_WEAVE_TEMPLATES.colorScheme, /\| domain \| business \| #4f81bd \| #2f5597 \| #ffffff \| Domain-specific business color \|/);
});

test("normalizes default Domain view mode settings", () => {
  assert.equal(DEFAULT_MODEL_WEAVE_SETTINGS.defaultDomainsViewMode, "mindmap");
  assert.equal(DEFAULT_MODEL_WEAVE_SETTINGS.defaultDomainDiagramViewMode, "mindmap");

  const configured = normalizeModelWeaveSettings({
    defaultDomainsViewMode: "area",
    defaultDomainDiagramViewMode: "tree"
  });
  assert.equal(configured.defaultDomainsViewMode, "area");
  assert.equal(configured.defaultDomainDiagramViewMode, "tree");

  const fallback = normalizeModelWeaveSettings({
    defaultDomainsViewMode: "unknown",
    defaultDomainDiagramViewMode: "mermaid"
  });
  assert.equal(fallback.defaultDomainsViewMode, "mindmap");
  assert.equal(fallback.defaultDomainDiagramViewMode, "mindmap");

  for (const value of ["mindmap", "area", "tree"]) {
    const settings = normalizeModelWeaveSettings({
      defaultDomainsViewMode: value,
      defaultDomainDiagramViewMode: value
    });
    assert.equal(settings.defaultDomainsViewMode, value);
    assert.equal(settings.defaultDomainDiagramViewMode, value);
  }

  const mixedCase = normalizeModelWeaveSettings({
    defaultDomainsViewMode: "Tree",
    defaultDomainDiagramViewMode: "AREA"
  });
  assert.equal(mixedCase.defaultDomainsViewMode, "tree");
  assert.equal(mixedCase.defaultDomainDiagramViewMode, "area");
});

test("Domain view mode setting options use stable frontmatter labels", () => {
  assert.deepEqual(
    DOMAIN_VIEW_MODE_SETTING_OPTIONS,
    [
      { value: "mindmap", label: "Mindmap" },
      { value: "area", label: "Area" },
      { value: "tree", label: "Tree" }
    ]
  );

  const labels = DOMAIN_VIEW_MODE_SETTING_OPTIONS.map((option) => option.label);
  assert.equal(/領域|ツリー|マインドマップ/.test(labels.join(" ")), false);

  const values = DOMAIN_VIEW_MODE_SETTING_OPTIONS.map((option) => option.value);
  assert.deepEqual(values, ["mindmap", "area", "tree"]);
});

test("English settings labels for Domain view modes do not contain Japanese fixed labels", () => {
  const en = createModelWeaveTranslator("en");
  const labels = [
    en("settings.defaultDomainsViewMode.name"),
    en("settings.defaultDomainsViewMode.desc"),
    en("settings.defaultDomainDiagramViewMode.name"),
    en("settings.defaultDomainDiagramViewMode.desc"),
    ...DOMAIN_VIEW_MODE_SETTING_OPTIONS.map((option) => option.label)
  ];

  assert.deepEqual(
    labels.slice(0, 4),
    [
      "Default Domains view mode",
      "Used when frontmatter.render_mode is not set for domains files.",
      "Default Domain Diagram view mode",
      "Used when frontmatter.render_mode is not set for domain_diagram files."
    ]
  );
  assert.equal(/領域|ツリー|マインドマップ|初期表示モード|表示モードです/.test(labels.join(" ")), false);
});

test("resolves Domains render_mode values without warnings", () => {
  for (const [value, expected] of [
    ["tree", "tree"],
    ["Tree", "tree"],
    ["area", "area"],
    ["mindmap", "mindmap"]
  ]) {
    const resolved = resolveRenderMode({
      filePath: "model/domains/DOMAINS.md",
      formatType: "domains",
      frontmatterRenderMode: value,
      settingsDefaultRenderMode: "area"
    });

    assert.equal(resolved.selectedMode, expected);
    assert.equal(resolved.effectiveMode, expected);
    assert.equal(resolved.source, "frontmatter");
    assert.equal(resolved.diagnostics.length, 0);
  }
});

test("resolves Domain Diagram render_mode values without warnings", () => {
  for (const value of ["tree", "Tree"]) {
    const resolved = resolveRenderMode({
      filePath: "model/domains/DOMAIN-DIAGRAM.md",
      formatType: "domain-diagram",
      frontmatterRenderMode: value,
      settingsDefaultRenderMode: "area"
    });

    assert.equal(resolved.selectedMode, "tree");
    assert.equal(resolved.effectiveMode, "tree");
    assert.equal(resolved.source, "frontmatter");
    assert.equal(resolved.diagnostics.length, 0);
  }
});

test("invalid Domain render_mode values still warn and fall back", () => {
  const domains = resolveRenderMode({
    filePath: "model/domains/DOMAINS.md",
    formatType: "domains",
    frontmatterRenderMode: "mermaid",
    settingsDefaultRenderMode: "tree"
  });
  assert.equal(domains.selectedMode, "tree");
  assert.equal(domains.source, "settings");
  assert.equal(domains.diagnostics.length, 1);
  assert.match(domains.diagnostics[0].message, /Unknown render_mode value "mermaid"/);

  const diagram = resolveRenderMode({
    filePath: "model/domains/DOMAIN-DIAGRAM.md",
    formatType: "domain-diagram",
    frontmatterRenderMode: "custom",
    settingsDefaultRenderMode: "area"
  });
  assert.equal(diagram.selectedMode, "area");
  assert.equal(diagram.source, "settings");
  assert.equal(diagram.diagnostics.length, 1);
  assert.match(diagram.diagnostics[0].message, /Unknown render_mode value "custom"/);
});

test("Domain UI labels are localized while values remain internal", () => {
  const en = createModelWeaveTranslator("en");
  const ja = createModelWeaveTranslator("ja");

  const englishLabels = [
    en("mermaid.source.title"),
    en("domains.preview.mindmap"),
    en("domains.preview.area"),
    en("domains.preview.treeMode")
  ];
  assert.deepEqual(englishLabels, ["Mermaid source", "Mindmap", "Area", "Tree"]);
  for (const label of englishLabels) {
    assert.equal(/Mermaid ソース|領域|ツリー|マインドマップ/.test(label), false);
  }

  assert.deepEqual(
    [
      ja("mermaid.source.title"),
      ja("domains.preview.mindmap"),
      ja("domains.preview.area"),
      ja("domains.preview.treeMode")
    ],
    ["Mermaid ソース", "マインドマップ", "領域", "ツリー"]
  );

  const settings = normalizeModelWeaveSettings({
    defaultDomainsViewMode: "Tree",
    defaultDomainDiagramViewMode: "Area"
  });
  assert.equal(settings.defaultDomainsViewMode, "tree");
  assert.equal(settings.defaultDomainDiagramViewMode, "area");
});

test("parses Color Scheme colors", () => {
  const { file, warnings } = parseColorScheme(`---
type: color_scheme
title: Default color scheme
id: COLOR-SCHEME-DEFAULT
---

## Colors

| target | kind | fill | stroke | text | notes |
|---|---|---|---|---|---|
| domain | organization | #e3f2fd | #1976d2 | #111111 | 組織 |
| | default | #eee | #999 | #111 | default |
`);

  assert.equal(file.fileType, "color-scheme");
  assert.equal(file.colors.length, 2);
  assert.equal(file.colors[0].target, "domain");
  assert.equal(file.colors[0].kind, "organization");
  assert.equal(file.colors[1].target, undefined);
  assert.equal(warnings.length, 0);
});

test("diagnoses invalid Color Scheme rows", () => {
  const { warnings } = parseColorScheme(`---
type: color_scheme
id: COLOR-SCHEME-DEFAULT
---

## Colors

| target | kind | fill | stroke | text | notes |
|---|---|---|---|---|---|
| domain | | #e3f2fd | #1976d2 | #111111 | missing kind |
| domain | organization | blue | #1976d2 | #111111 | invalid fill |
| domain | organization | #e3f2fd | #1976d2 | #111111 | duplicate |
`);

  const messages = warnings.map((warning) => warning.message);
  assert.ok(messages.includes("Color Scheme kind is required."));
  assert.ok(messages.includes('Color Scheme fill "blue" is not a supported hex color.'));
  assert.ok(messages.includes('duplicate Color Scheme entry for target "domain" and kind "organization"'));
});

test("allows global Color Scheme kind override rows", () => {
  const { warnings } = parseColorScheme(`---
type: color_scheme
id: COLOR-SCHEME-DEFAULT
---

## Colors

| target | kind | fill | stroke | text | notes |
|---|---|---|---|---|---|
| | business | #4f81bd | #2f5597 | #ffffff | Global business color |
| domain | business | #70ad47 | #548235 | #ffffff | Domain-specific business color |
`);

  assert.equal(
    warnings.some((warning) => warning.message.includes("duplicate Color Scheme entry")),
    false
  );
});

test("diagnoses duplicate global Color Scheme kind rows", () => {
  const { warnings } = parseColorScheme(`---
type: color_scheme
id: COLOR-SCHEME-DEFAULT
---

## Colors

| target | kind | fill | stroke | text | notes |
|---|---|---|---|---|---|
| | business | #4f81bd | #2f5597 | #ffffff | Global business color |
| | business | #70ad47 | #548235 | #ffffff | Duplicate global business |
`);

  assert.ok(warnings.some((warning) =>
    warning.message === 'duplicate Color Scheme entry for target "(default target)" and kind "business"'
  ));
});

test("resolves Color Scheme fallback and target-kind matches", () => {
  const scheme = {
    ...BUILT_IN_COLOR_SCHEME,
    entries: [
      {
        target: "domain",
        kind: "organization",
        fill: "#000",
        stroke: "#111",
        text: "#222",
        rowIndex: 0
      },
      {
        kind: "default",
        fill: "#abc",
        stroke: "#def",
        text: "#123",
        rowIndex: 1
      }
    ]
  };

  assert.deepEqual(resolveColorStyle(scheme, "domain", "organization"), {
    fill: "#000",
    stroke: "#111",
    text: "#222"
  });
  assert.deepEqual(resolveColorStyle(scheme, "domain", "department"), {
    fill: "#e8f5e9",
    stroke: "#388e3c",
    text: "#111111"
  });
  assert.deepEqual(resolveColorStyle(scheme, "domain", "unknown"), {
    fill: "#abc",
    stroke: "#def",
    text: "#123"
  });
});

test("resolves global Color Scheme rules with target-specific override", () => {
  const scheme = {
    ...BUILT_IN_COLOR_SCHEME,
    entries: [
      {
        kind: "business",
        fill: "#4f81bd",
        stroke: "#2f5597",
        text: "#ffffff",
        rowIndex: 0
      },
      {
        target: "domain",
        kind: "business",
        fill: "#70ad47",
        stroke: "#548235",
        text: "#ffffff",
        rowIndex: 1
      },
      {
        kind: "application",
        fill: "#8064a2",
        stroke: "#5f497a",
        text: "#ffffff",
        rowIndex: 2
      }
    ]
  };

  assert.deepEqual(resolveColorStyle(scheme, "domain", "business"), {
    fill: "#70ad47",
    stroke: "#548235",
    text: "#ffffff"
  });
  assert.deepEqual(resolveColorStyle(scheme, "domain", "application"), {
    fill: "#8064a2",
    stroke: "#5f497a",
    text: "#ffffff"
  });

  const effective = getEffectiveColorSchemeEntriesForTarget(scheme, "domain");
  const businessRows = effective.filter((entry) => entry.kind === "business");
  assert.equal(businessRows.length, 1);
  assert.equal(businessRows[0].target, "domain");
  assert.ok(effective.some((entry) =>
    entry.kind === "application" && entry.target === undefined
  ));
});

test("filters Applied Color Scheme rows for diagram targets", () => {
  const scheme = {
    ...BUILT_IN_COLOR_SCHEME,
    id: "custom",
    entries: [
      { kind: "default", fill: "#111111", stroke: "#222222", text: "#ffffff", rowIndex: 0 },
      { kind: "business", fill: "#4f81bd", stroke: "#2f5597", text: "#ffffff", rowIndex: 1 },
      { target: "domain", kind: "business", fill: "#70ad47", stroke: "#548235", text: "#ffffff", rowIndex: 2 },
      { target: "dfd", kind: "process", fill: "#9bbb59", stroke: "#6f8a3f", text: "#000000", rowIndex: 3 },
      { target: "app_process", kind: "start", fill: "#e3f2fd", stroke: "#1976d2", text: "#111111", rowIndex: 4 },
      { target: "class", kind: "entity", fill: "#000000", stroke: "#000000", text: "#ffffff", rowIndex: 5 }
    ]
  };

  const domainRows = getAppliedColorSchemeRowsForTargets(scheme, ["domain"]);
  assert.ok(domainRows.some((row) => row.entry.kind === "business" && row.entry.target === undefined));
  assert.ok(domainRows.some((row) => row.entry.kind === "business" && row.entry.target === "domain"));
  assert.ok(domainRows.some((row) => row.entry.kind === "organization" && row.entry.target === "domain" && row.source === "built-in"));
  assert.equal(domainRows.some((row) => row.entry.target === "dfd"), false);
  assert.equal(domainRows.some((row) => row.entry.target === "class"), false);

  const dfdRows = getAppliedColorSchemeRowsForTargets(scheme, ["dfd", "domain"]);
  assert.ok(dfdRows.some((row) => row.entry.kind === "process" && row.entry.target === "dfd"));
  assert.ok(dfdRows.some((row) => row.entry.kind === "business" && row.entry.target === "domain"));
  assert.equal(dfdRows.some((row) => row.entry.target === "app_process"), false);
  assert.equal(dfdRows.some((row) => row.entry.target === "class"), false);

  const appProcessRows = getAppliedColorSchemeRowsForTargets(scheme, ["app_process"]);
  assert.ok(appProcessRows.some((row) => row.entry.kind === "start" && row.entry.target === "app_process"));
  assert.ok(appProcessRows.some((row) => row.entry.kind === "default" && row.entry.target === undefined));
  assert.equal(appProcessRows.some((row) => row.entry.target === "domain"), false);
  assert.equal(appProcessRows.some((row) => row.entry.target === "dfd"), false);

  const builtInRows = getAppliedColorSchemeRowsForTargets(undefined, ["domain"]);
  assert.ok(builtInRows.some((row) => row.entry.kind === "organization" && row.source === "built-in"));
  assert.ok(builtInRows.some((row) => row.entry.kind === "default" && row.source === "built-in"));
});

test("resolves configured default Color Scheme from vault index", () => {
  const index = buildVaultIndex([
    {
      path: "model/config/COLOR-SCHEME-DEFAULT.md",
      content: `---
type: color_scheme
id: COLOR-SCHEME-DEFAULT
---

## Colors

| target | kind | fill | stroke | text | notes |
|---|---|---|---|---|---|
| domain | organization | #000 | #111 | #222 | custom |
`
    }
  ]);

  const resolved = resolveDefaultColorScheme(index, "[[COLOR-SCHEME-DEFAULT]]");
  assert.equal(resolved.colorScheme.id, "COLOR-SCHEME-DEFAULT");
  assert.equal(resolved.warnings.length, 0);
  assert.deepEqual(resolveColorStyle(resolved.colorScheme, "domain", "organization"), {
    fill: "#000",
    stroke: "#111",
    text: "#222"
  });

  const fallback = resolveDefaultColorScheme(index, "[[MISSING]]");
  assert.equal(fallback.colorScheme.id, "built-in-default");
  assert.ok(fallback.warnings.some((warning) =>
    warning.message.includes('Default Color Scheme ref "[[MISSING]]" could not be resolved')
  ));
});

test("diagnoses missing Domain Diagram source ref", () => {
  const { warnings } = parseDomainDiagram(`---
type: domain_diagram
id: DOMAIN-DIAGRAM-LOGISTICS
---

## Domain Sources

| ref | notes |
|---|---|
| | missing |
`);

  assert.ok(warnings.some((warning) =>
    warning.message === "Domain Source ref is required."
  ));
});

test("merges Domain Diagram sources with later source override", () => {
  const company = parseDomainsFile(`---
type: domains
id: DOMAINS-COMPANY
---

## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| company | 会社全体 | organization | | |
| logistics | 物流部 | department | company | earlier |
`, "DOMAINS-COMPANY.md").file;
  const warehouse = parseDomainsFile(`---
type: domains
id: DOMAINS-WAREHOUSE
---

## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| logistics | 物流 | department | | later description ignored |
| warehouse | 倉庫 | location | logistics | |
`, "DOMAINS-WAREHOUSE.md").file;

  assert.ok(company);
  assert.ok(warehouse);
  const result = mergeDomainDiagramSources([
    { source: company },
    { source: warehouse }
  ], "DOMAIN-DIAGRAM-LOGISTICS.md");

  const logistics = result.domains.find((domain) => domain.id === "logistics");
  assert.equal(logistics?.name, "物流");
  assert.equal(logistics?.parent, undefined);
  assert.ok(result.conflicts.some((conflict) =>
    conflict.domainId === "logistics" && conflict.field === "duplicate"
  ));
  assert.ok(result.conflicts.some((conflict) =>
    conflict.domainId === "logistics" && conflict.field === "parent"
  ));
  assert.ok(result.conflicts.some((conflict) =>
    conflict.domainId === "logistics" && conflict.field === "name"
  ));
  assert.equal(
    result.conflicts.some((conflict) => conflict.field === "description"),
    false
  );
});

test("diagnoses Domain Diagram kind conflicts", () => {
  const first = parseDomainsFile(`---
type: domains
id: DOMAINS-A
---

## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| wms | WMS | system | | |
`, "DOMAINS-A.md").file;
  const second = parseDomainsFile(`---
type: domains
id: DOMAINS-B
---

## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| wms | WMS | service | | |
`, "DOMAINS-B.md").file;

  assert.ok(first);
  assert.ok(second);
  const result = mergeDomainDiagramSources([
    { source: first },
    { source: second }
  ]);

  assert.ok(result.conflicts.some((conflict) =>
    conflict.domainId === "wms" &&
    conflict.field === "kind" &&
    conflict.severity === "error"
  ));
});

test("resolves Domain Diagram sources through vault index", () => {
  const index = buildVaultIndex([
    domainsFile(
      "model/domains/DOMAINS-COMPANY.md",
      "DOMAINS-COMPANY",
      "| company | 会社全体 | organization | | |\n| logistics | 物流部 | department | company | |"
    ),
    domainsFile(
      "model/domains/DOMAINS-WAREHOUSE.md",
      "DOMAINS-WAREHOUSE",
      "| warehouse | 倉庫 | location | logistics | |\n| team_1 | 係1 | team | warehouse | |"
    ),
    {
      path: "model/domains/DOMAIN-DIAGRAM-LOGISTICS.md",
      content: `---
type: domain_diagram
id: DOMAIN-DIAGRAM-LOGISTICS
---

## Domain Sources

| ref | notes |
|---|---|
| [[DOMAINS-COMPANY]] | 会社・部門 |
| [[DOMAINS-WAREHOUSE]] | 倉庫・係 |
`
    }
  ]);
  const diagram = index.modelsByFilePath["model/domains/DOMAIN-DIAGRAM-LOGISTICS.md"];
  assert.equal(diagram.fileType, "domain-diagram");

  const resolved = resolveDomainDiagram(diagram, index);
  assert.equal(resolved.sourceSummaries.length, 2);
  assert.deepEqual(
    resolved.domains.map((domain) => domain.id),
    ["company", "logistics", "warehouse", "team_1"]
  );
  assert.equal(resolved.warnings.length, 0);
  assert.match(buildDomainMindmapMermaid(resolved.domains), /会社全体（organization）/);
  assert.match(buildDomainHierarchyMermaid(resolved.domains), /subgraph domain_company/);
  assert.match(
    buildDomainHierarchyMermaid(resolved.domains, BUILT_IN_COLOR_SCHEME),
    /style domain_company fill:#e3f2fd,stroke:#1976d2,color:#111111/
  );
  assert.match(buildDomainTreeViewMermaid(resolved.domains), /domain_company --> domain_logistics/);
  assert.match(
    buildDomainTreeViewMermaid(resolved.domains, BUILT_IN_COLOR_SCHEME),
    /class domain_company kind_domain_organization/
  );
});

test("diagnoses unresolved and non-Domains Domain Diagram sources", () => {
  const index = buildVaultIndex([
    {
      path: "model/rules/RULE-ORDER.md",
      content: `---
type: rule
id: RULE-ORDER
name: Order rule
---
`
    },
    {
      path: "model/domains/DOMAIN-DIAGRAM-LOGISTICS.md",
      content: `---
type: domain_diagram
id: DOMAIN-DIAGRAM-LOGISTICS
---

## Domain Sources

| ref | notes |
|---|---|
| [[MISSING-DOMAINS]] | missing |
| [[RULE-ORDER]] | wrong type |
`
    }
  ]);
  const diagram = index.modelsByFilePath["model/domains/DOMAIN-DIAGRAM-LOGISTICS.md"];
  assert.equal(diagram.fileType, "domain-diagram");

  const resolved = resolveDomainDiagram(diagram, index);
  assert.ok(resolved.warnings.some((warning) =>
    warning.message.includes('Domain Source ref "[[MISSING-DOMAINS]]" could not be resolved')
  ));
  assert.ok(resolved.warnings.some((warning) =>
    warning.message.includes('expected type "domains"')
  ));
  assert.ok(resolved.warnings.some((warning) =>
    warning.message === "Domain Diagram has no valid Domain Sources."
  ));
});

test("localizes Domain Diagram diagnostics", () => {
  const messages = [
    "Domain Source ref is required.",
    'Domain Source ref "[[MISSING]]" could not be resolved. Check the ID or file name.',
    'Domain Source ref "[[RULE]]" resolves to type "rule", but expected type "domains".',
    "Domain Diagram has no valid Domain Sources.",
    'Domain Source ref "[[EMPTY]]" has no Domain rows.',
    'Domain "logistics" is defined by multiple Domain Diagram sources: "A.md" and "B.md".',
    'Domain "logistics" has conflicting parent values between Domain Diagram sources "A.md" and "B.md".'
  ].map((message) => localizeDiagnosticMessage(message, "ja"));

  assert.ok(messages[0].includes("ref が必要です"));
  assert.ok(messages[1].includes("参照先が見つかりません"));
  assert.ok(messages[2].includes('type "domains" が必要です'));
  assert.ok(messages[3].includes("有効な Domain Sources がありません"));
  assert.ok(messages[4].includes("Domain 行がありません"));
  assert.ok(messages[5].includes("複数の Domain Diagram source"));
  assert.ok(messages[6].includes("parent が Domain Diagram source"));
});

test("localizes Color Scheme diagnostics", () => {
  const messages = [
    "Color Scheme kind is required.",
    'Color Scheme fill "blue" is not a supported hex color.',
    'duplicate Color Scheme entry for target "domain" and kind "system"',
    'Default Color Scheme ref "[[MISSING]]" could not be resolved. Built-in colors will be used.',
    'Default Color Scheme ref "[[RULE]]" resolves to type "rule", but expected type "color_scheme". Built-in colors will be used.'
  ].map((message) => localizeDiagnosticMessage(message, "ja"));

  assert.ok(messages[0].includes("kind が必要です"));
  assert.ok(messages[1].includes("hex color ではありません"));
  assert.ok(messages[2].includes("重複しています"));
  assert.ok(messages[3].includes("組み込み色を使います"));
  assert.ok(messages[4].includes('type "color_scheme" が必要です'));
});

test("builds standalone Domain relationship summaries", () => {
  const core = `${baseFrontmatter}
## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| logistics | Logistics | department | company | Logistics area |
| warehouse | Warehouse | location | logistics | Warehouse |
| wms | WMS | system | logistics | Warehouse management |
`;
  const duplicate = `---
type: domains
id: DOMAINS-ALT
name: Alternate Domains
---

# Alternate Domains

## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| logistics | Logistics | department | | Alternate logistics |
| wms | WMS local | application | logistics | Different description |
`;
  const dfd = `${dfdFrontmatter}
## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| logistics | Logistics | department | | Local logistics |
| wms | WMS | system | logistics | Local WMS |

## Objects

| id | label | kind | ref | domain | notes |
|---|---|---|---|---|---|
| receive_order | 出荷依頼受付 | process | | wms | |
| inventory_db | 在庫DB | datastore | | wms | |
| operator | Operator | external | | logistics | |

## Flows

| id | from | to | data | notes |
|---|---|---|---|---|
| f1 | operator | receive_order | Request | |
`;
  const index = buildVaultIndex([
    { path: "DOMAINS-CORE.md", content: core },
    { path: "DOMAINS-ALT.md", content: duplicate },
    { path: "DFD-SHIPPING.md", content: dfd }
  ], { parseMode: "full" });
  const model = index.modelsByFilePath["DOMAINS-CORE.md"];
  assert.equal(model.fileType, "domains");

  const summaries = buildDomainRelationshipSummaries(model, index);
  const logistics = summaries.find((entry) => entry.domain.id === "logistics");
  const wms = summaries.find((entry) => entry.domain.id === "wms");
  const warehouse = summaries.find((entry) => entry.domain.id === "warehouse");

  assert.ok(logistics);
  assert.deepEqual(logistics.childIds, ["warehouse", "wms"]);
  assert.equal(logistics.parentId, "company");
  assert.deepEqual(logistics.definedIn.map((entry) => entry.path), [
    "DOMAINS-ALT.md",
    "DOMAINS-CORE.md"
  ]);
  assert.deepEqual(logistics.conflicts, ["parent"]);
  assert.deepEqual(logistics.dfdLocalDomainReferences.map((entry) => entry.path), [
    "DFD-SHIPPING.md"
  ]);
  assert.deepEqual(logistics.dfdObjectReferences.map((entry) => entry.objectId), [
    "operator"
  ]);

  assert.ok(wms);
  assert.deepEqual(wms.conflicts, ["name", "kind"]);
  assert.deepEqual(wms.dfdObjectReferences.map((entry) => `${entry.objectId}: ${entry.label}`), [
    "inventory_db: 在庫DB",
    "receive_order: 出荷依頼受付"
  ]);

  assert.ok(warehouse);
  assert.deepEqual(warehouse.definedIn.map((entry) => entry.path), ["DOMAINS-CORE.md"]);
  assert.deepEqual(warehouse.dfdLocalDomainReferences, []);
  assert.deepEqual(warehouse.dfdObjectReferences, []);
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

test("parses optional DFD Domain Sources", () => {
  const { file, warnings } = parseDfd(`${dfdFrontmatter}
## Domain Sources

| ref | notes |
|---|---|
| [[DOMAINS-COMPANY]] | Company domains |
| [[DOMAINS-WMS]] | WMS domains |

## Objects

| id | label | kind | ref | domain | notes |
|---|---|---|---|---|---|
| receive_order | Receive order | process | | wms | Local process |

## Flows

| id | from | to | data | notes |
|---|---|---|---|---|
`);

  assert.equal(file.domainSources.length, 2);
  assert.equal(file.domainSources[0].ref, "[[DOMAINS-COMPANY]]");
  assert.equal(file.domainSources[1].notes, "WMS domains");
  assert.equal(warnings.length, 0);
});

test("parses optional DFD Domain Sources without notes", () => {
  const { file, warnings } = parseDfd(`${dfdFrontmatter}
## Domain Sources

| ref |
|---|
| [[DOMAINS-COMPANY]] |
| [[DOMAINS-WMS]] |

## Objects

| id | label | kind | ref | domain | notes |
|---|---|---|---|---|---|
| receive_order | Receive order | process | | wms | Local process |

## Flows

| id | from | to | data | notes |
|---|---|---|---|---|
`);

  assert.equal(file.domainSources.length, 2);
  assert.equal(file.domainSources[0].ref, "[[DOMAINS-COMPANY]]");
  assert.equal(file.domainSources[0].notes, undefined);
  assert.equal(file.domainSources[1].ref, "[[DOMAINS-WMS]]");
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

test("resolves DFD Domain Sources for nested Mermaid subgraphs", () => {
  const { resolved } = resolveDfdWithFiles([
    domainsFile("DOMAINS-COMPANY.md", "DOMAINS-COMPANY", [
      "| company | Company | organization | | Company group |",
      "| logistics | Logistics | department | company | Logistics group |"
    ].join("\n")),
    domainsFile("DOMAINS-WMS.md", "DOMAINS-WMS", [
      "| warehouse | Warehouse | location | logistics | Warehouse group |",
      "| wms | WMS | system | logistics | WMS group |"
    ].join("\n")),
    {
      path: "DFD-SHIPPING.md",
      content: `${dfdFrontmatter}
## Domain Sources

| ref | notes |
|---|---|
| [[DOMAINS-COMPANY]] | Company domains |
| [[DOMAINS-WMS]] | WMS domains |

## Objects

| id | label | kind | ref | domain | notes |
|---|---|---|---|---|---|
| receive_order | Receive order | process | | wms | |
| pick_items | Pick items | process | | warehouse | |
| user | User | external | | | |

## Flows

| id | from | to | data | notes |
|---|---|---|---|---|
| f1 | user | receive_order | Request | |
| f2 | receive_order | pick_items | Work | |
`
    }
  ]);

  const source = buildDfdMermaidSource(resolved);
  const companyIndex = source.indexOf('subgraph domain_company["Company [organization]"]');
  const logisticsIndex = source.indexOf('subgraph domain_logistics["Logistics [department]"]');
  const wmsIndex = source.indexOf('subgraph domain_wms["WMS [system]"]');
  const warehouseIndex = source.indexOf('subgraph domain_warehouse["Warehouse [location]"]');

  assert.ok(companyIndex >= 0);
  assert.ok(logisticsIndex > companyIndex);
  assert.ok(wmsIndex > logisticsIndex);
  assert.ok(warehouseIndex > logisticsIndex);
  assert.match(source, /receive_order\["Receive order"\]:::dfdProcess/);
  assert.match(source, /pick_items\["Pick items"\]:::dfdProcess/);
  assert.match(source, /user\["User"\]:::dfdExternal/);
});

test("generates colored DFD Mermaid source from Color Scheme rows", () => {
  const { resolved } = resolveDfdFromContent(`${dfdFrontmatter}
## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| wms | WMS | application | | 倉庫管理システム |
| warehouse | 倉庫 | operations | | 実作業場所 |
| core | 基幹 | external | | 基幹システム |

## Objects

| id | label | kind | ref | domain | notes |
|---|---|---|---|---|---|
| receive_order | 出荷依頼受付 | process | | wms | |
| inventory_db | 在庫DB | datastore | | wms | |
| core_system | 基幹 | external | | core | |
| manual_check | 手動確認 | other | | warehouse | |
| unknown_kind | 未分類 | | | | |

## Flows

| id | from | to | data | notes |
|---|---|---|---|---|
| f1 | core_system | receive_order | 出荷指示 | |
| f2 | receive_order | inventory_db | 在庫引当 | |
| f3 | manual_check | receive_order | 確認結果 | |
`);
  const scheme = {
    ...BUILT_IN_COLOR_SCHEME,
    entries: [
      { target: "dfd", kind: "process", fill: "#9bbb59", stroke: "#6f8a3f", text: "#000000", rowIndex: 0 },
      { target: "dfd", kind: "datastore", fill: "#8064a2", stroke: "#60497a", text: "#ffffff", rowIndex: 1 },
      { target: "dfd", kind: "external", fill: "#a6a6a6", stroke: "#7f7f7f", text: "#000000", rowIndex: 2 },
      { target: "dfd", kind: "other", fill: "#f79646", stroke: "#c55a11", text: "#000000", rowIndex: 3 },
      { kind: "default", fill: "#f5f5f5", stroke: "#9e9e9e", text: "#111111", rowIndex: 4 },
      { target: "domain", kind: "application", fill: "#9bbb59", stroke: "#6f8a3f", text: "#000000", rowIndex: 5 },
      { target: "domain", kind: "operations", fill: "#7f7f7f", stroke: "#595959", text: "#ffffff", rowIndex: 6 },
      { target: "domain", kind: "external", fill: "#a6a6a6", stroke: "#7f7f7f", text: "#000000", rowIndex: 7 }
    ]
  };

  const source = buildDfdMermaidSource(resolved, scheme);
  assert.match(source, /receive_order\["出荷依頼受付"\]:::kind_dfd_process/);
  assert.match(source, /inventory_db\[\("在庫DB"\)\]:::kind_dfd_datastore/);
  assert.match(source, /core_system\["基幹"\]:::kind_dfd_external/);
  assert.match(source, /manual_check\["手動確認"\]:::kind_dfd_other/);
  assert.match(source, /unknown_kind\["未分類"\]:::kind_dfd_other/);
  assert.match(source, /classDef kind_dfd_process fill:#9bbb59,stroke:#6f8a3f,color:#000000/);
  assert.match(source, /classDef kind_dfd_datastore fill:#8064a2,stroke:#60497a,color:#ffffff/);
  assert.match(source, /classDef kind_dfd_external fill:#a6a6a6,stroke:#7f7f7f,color:#000000/);
  assert.match(source, /classDef kind_dfd_other fill:#f79646,stroke:#c55a11,color:#000000/);
  assert.match(source, /style domain_wms fill:#9bbb59,stroke:#6f8a3f,color:#000000/);
  assert.match(source, /style domain_warehouse fill:#7f7f7f,stroke:#595959,color:#ffffff/);
  assert.match(source, /style domain_core fill:#a6a6a6,stroke:#7f7f7f,color:#000000/);
  assert.doesNotMatch(source, /:::dfdProcess/);
  assert.match(source, /core_system -->\|出荷指示\| receive_order/);
});

test("uses DFD Domain Sources for domain group colors but keeps DFD node colors", () => {
  const { resolved } = resolveDfdWithFiles([
    domainsFile("DOMAINS-COMPANY.md", "DOMAINS-COMPANY", [
      "| wms | WMS | application | | WMS group |"
    ].join("\n")),
    {
      path: "DFD-SHIPPING.md",
      content: `${dfdFrontmatter}
## Domain Sources

| ref | notes |
|---|---|
| [[DOMAINS-COMPANY]] | Company domains |

## Objects

| id | label | kind | ref | domain | notes |
|---|---|---|---|---|---|
| receive_order | Receive order | process | | wms | |

## Flows

| id | from | to | data | notes |
|---|---|---|---|---|
`
    }
  ]);
  const scheme = {
    ...BUILT_IN_COLOR_SCHEME,
    entries: [
      { target: "dfd", kind: "process", fill: "#9bbb59", stroke: "#6f8a3f", text: "#000000", rowIndex: 0 },
      { target: "domain", kind: "application", fill: "#8064a2", stroke: "#60497a", text: "#ffffff", rowIndex: 1 }
    ]
  };

  const source = buildDfdMermaidSource(resolved, scheme);
  assert.match(source, /receive_order\["Receive order"\]:::kind_dfd_process/);
  assert.match(source, /classDef kind_dfd_process fill:#9bbb59,stroke:#6f8a3f,color:#000000/);
  assert.match(source, /style domain_wms fill:#8064a2,stroke:#60497a,color:#ffffff/);
  assert.doesNotMatch(source, /kind_domain_/);
});

test("renders nested DFD-local Domain subgraphs", () => {
  const { resolved } = resolveDfdFromContent(`${dfdFrontmatter}
## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| company | 会社全体 | organization | | |
| logistics | 物流部 | department | company | |
| warehouse | 倉庫 | location | logistics | |
| wms | WMS | system | logistics | |
| core | 基幹 | system | company | |
| unused | 未使用 | system | company | |

## Objects

| id | label | kind | ref | domain | notes |
|---|---|---|---|---|---|
| receive_order | 出荷依頼受付 | other | | wms | |
| pick_items | ピッキング | process | | warehouse | |
| inventory_db | 在庫DB | datastore | | wms | |
| core_system | 基幹 | external | | core | |
| manual_check | 手動確認 | other | | | |

## Flows

| id | from | to | data | notes |
|---|---|---|---|---|
| f1 | core_system | receive_order | 出荷指示 | |
| f2 | receive_order | pick_items | ピッキング指示 | |
| f3 | pick_items | inventory_db | 在庫引当 | |
| f4 | manual_check | receive_order | 確認結果 | |
`);

  const source = buildDfdMermaidSource(resolved);
  const companyIndex = source.indexOf('subgraph domain_company["会社全体 [organization]"]');
  const logisticsIndex = source.indexOf('subgraph domain_logistics["物流部 [department]"]');
  const warehouseIndex = source.indexOf('subgraph domain_warehouse["倉庫 [location]"]');
  const wmsIndex = source.indexOf('subgraph domain_wms["WMS [system]"]');
  const coreIndex = source.indexOf('subgraph domain_core["基幹 [system]"]');
  const manualCheckIndex = source.indexOf('manual_check["手動確認"]:::dfdOther');

  assert.ok(companyIndex >= 0);
  assert.ok(logisticsIndex > companyIndex);
  assert.ok(warehouseIndex > logisticsIndex);
  assert.ok(wmsIndex > logisticsIndex);
  assert.ok(coreIndex > companyIndex);
  assert.ok(manualCheckIndex > coreIndex);
  assert.match(source, /pick_items\["ピッキング"\]:::dfdProcess/);
  assert.match(source, /receive_order\["出荷依頼受付"\]:::dfdOther/);
  assert.match(source, /inventory_db\[\("在庫DB"\)\]:::dfdDatastore/);
  assert.doesNotMatch(source, /domain_unused/);
  assert.match(source, /core_system -->\|出荷指示\| receive_order/);
  assert.match(source, /manual_check -->\|確認結果\| receive_order/);
  assert.doesNotMatch(source, /domain_company -->/);
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

test("diagnoses unknown DFD object Domain when Domain Sources are present", () => {
  const { resolved } = resolveDfdWithFiles([
    domainsFile("DOMAINS-COMPANY.md", "DOMAINS-COMPANY", [
      "| warehouse | Warehouse | location | | Warehouse group |"
    ].join("\n")),
    {
      path: "DFD-SHIPPING.md",
      content: `${dfdFrontmatter}
## Domain Sources

| ref | notes |
|---|---|
| [[DOMAINS-COMPANY]] | Company domains |

## Objects

| id | label | kind | ref | domain | notes |
|---|---|---|---|---|---|
| receive_order | Receive order | process | | missing | |

## Flows

| id | from | to | data | notes |
|---|---|---|---|---|
`
    }
  ]);
  const messages = resolved.warnings.map((warning) => warning.message);

  assert.ok(messages.includes('DFD object "receive_order" references unknown Domain "missing".'));
  assert.equal(
    messages.includes('DFD object "receive_order" references Domain "missing", but this DFD has no local Domains.'),
    false
  );
});

test("diagnoses unresolved and non-domains DFD Domain Source refs", () => {
  const { resolved } = resolveDfdWithFiles([
    {
      path: "RULE-SHIPPING.md",
      content: `---
type: rule
id: RULE-SHIPPING
name: Shipping Rule
---

# Shipping Rule
`
    },
    {
      path: "DFD-SHIPPING.md",
      content: `${dfdFrontmatter}
## Domain Sources

| ref | notes |
|---|---|
| [[DOMAINS-MISSING]] | Missing |
| [[RULE-SHIPPING]] | Wrong type |

## Objects

| id | label | kind | ref | domain | notes |
|---|---|---|---|---|---|
| receive_order | Receive order | process | | wms | |

## Flows

| id | from | to | data | notes |
|---|---|---|---|---|
`
    }
  ]);
  const messages = resolved.warnings.map((warning) => warning.message);

  assert.ok(messages.includes('Domain Source ref "[[DOMAINS-MISSING]]" could not be resolved. Check the ID or file name.'));
  assert.ok(messages.includes('Domain Source ref "[[RULE-SHIPPING]]" resolves to type "rule", but expected type "domains".'));
  assert.ok(messages.includes('DFD object "receive_order" references unknown Domain "wms".'));
});

test("DFD-local Domains override Domain Sources after merge", () => {
  const { resolved } = resolveDfdWithFiles([
    domainsFile("DOMAINS-COMPANY.md", "DOMAINS-COMPANY", [
      "| logistics | Logistics | department | | Logistics group |",
      "| wms | WMS | system | logistics | WMS group |"
    ].join("\n")),
    {
      path: "DFD-SHIPPING.md",
      content: `${dfdFrontmatter}
## Domain Sources

| ref | notes |
|---|---|
| [[DOMAINS-COMPANY]] | Company domains |

## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| wms | Local WMS | application | logistics | Local override |

## Objects

| id | label | kind | ref | domain | notes |
|---|---|---|---|---|---|
| receive_order | Receive order | process | | wms | |

## Flows

| id | from | to | data | notes |
|---|---|---|---|---|
`
    }
  ]);
  const source = buildDfdMermaidSource(resolved);
  const messages = resolved.warnings.map((warning) => warning.message);

  assert.match(source, /subgraph domain_wms\["Local WMS \[application\]"\]/);
  assert.ok(messages.includes('DFD-local Domain "wms" overrides Domain Source name "WMS" with "Local WMS".'));
  assert.ok(messages.includes('DFD-local Domain "wms" overrides Domain Source kind "system" with "application".'));
  assert.equal(messages.includes('Domain parent "logistics" is not defined.'), false);
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
  assert.equal(
    localizeDiagnosticMessage(
      'DFD object "receive_order" references unknown Domain "missing".',
      "ja"
    ),
    'DFD object "receive_order" が未定義の Domain "missing" を参照しています。'
  );
  assert.equal(
    localizeDiagnosticMessage(
      'DFD-local Domain "wms" overrides Domain Source kind "system" with "application".',
      "ja"
    ),
    'DFD内の Domain "wms" は Domain Source の kind "system" を "application" で上書きしています。'
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
  assert.doesNotMatch(source, /classDef/);
  assert.doesNotMatch(source, /style domain_/);
});

test("generates colored Area source for Domain hierarchy", () => {
  const { file } = parseDomains(`${baseFrontmatter}
## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| company | 会社全体 | organization | | 業務全体 |
| logistics | 物流部 | department | company | 物流 |
| unknown | 不明 | mystery | company | unknown kind |
`);

  const source = buildDomainHierarchyMermaid(file.domains, BUILT_IN_COLOR_SCHEME);
  assert.match(source, /subgraph domain_company\["会社全体 \[organization\]"\]/);
  assert.match(source, /style domain_company fill:#e3f2fd,stroke:#1976d2,color:#111111/);
  assert.match(source, /style domain_logistics fill:#e8f5e9,stroke:#388e3c,color:#111111/);
  assert.match(source, /style domain_unknown fill:#f5f5f5,stroke:#9e9e9e,color:#111111/);
  assert.doesNotMatch(source, /classDef/);
});

test("generates TreeView source for single-root Domain hierarchy", () => {
  const { file } = parseDomains(`${baseFrontmatter}
## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| company | 会社全体 | organization | | 業務全体 |
| logistics | 物流部 | department | company | 物流 |
| warehouse | 倉庫 | location | logistics | 倉庫 |
| handheld | ハンディ端末 | device | warehouse | 端末 |
| office | 事務所 | location | logistics | 事務所 |
| wms | WMS | system | logistics | WMS |
| core | 基幹システム | system | company | 基幹 |
`);

  const source = buildDomainTreeViewMermaid(file.domains);
  assert.match(source, /^flowchart TB/);
  assert.match(source, /domain_company\["会社全体 \[organization\]"\]/);
  assert.match(source, /domain_logistics\["物流部 \[department\]"\]/);
  assert.match(source, /domain_warehouse\["倉庫 \[location\]"\]/);
  assert.match(source, /domain_handheld\["ハンディ端末 \[device\]"\]/);
  assert.match(source, /domain_office\["事務所 \[location\]"\]/);
  assert.match(source, /domain_wms\["WMS \[system\]"\]/);
  assert.match(source, /domain_core\["基幹システム \[system\]"\]/);
  assert.match(source, /domain_company --> domain_logistics/);
  assert.match(source, /domain_logistics --> domain_warehouse/);
  assert.match(source, /domain_warehouse --> domain_handheld/);
  assert.match(source, /domain_logistics --> domain_office/);
  assert.match(source, /domain_logistics --> domain_wms/);
  assert.match(source, /domain_company --> domain_core/);
});

test("generates colored TreeView source for Domain hierarchy", () => {
  const { file } = parseDomains(`${baseFrontmatter}
## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| company | 会社全体 | organization | | 業務全体 |
| logistics | 物流部 | department | company | 物流 |
| unknown | 不明 | mystery | company | unknown kind |
`);

  const source = buildDomainTreeViewMermaid(file.domains, BUILT_IN_COLOR_SCHEME);
  assert.match(source, /classDef kind_domain_organization fill:#e3f2fd,stroke:#1976d2,color:#111111/);
  assert.match(source, /classDef kind_domain_department fill:#e8f5e9,stroke:#388e3c,color:#111111/);
  assert.match(source, /classDef kind_domain_mystery fill:#f5f5f5,stroke:#9e9e9e,color:#111111/);
  assert.match(source, /class domain_company kind_domain_organization/);
  assert.match(source, /class domain_logistics kind_domain_department/);
  assert.match(source, /class domain_unknown kind_domain_mystery/);
});

test("generates colored TreeView source from global Color Scheme rows", () => {
  const { file } = parseDomains(`${baseFrontmatter}
## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| business | 事業 | business | | Business |
| application | アプリ | application | business | Application |
`);
  const scheme = {
    ...BUILT_IN_COLOR_SCHEME,
    entries: [
      {
        kind: "business",
        fill: "#4f81bd",
        stroke: "#2f5597",
        text: "#ffffff",
        rowIndex: 0
      },
      {
        target: "domain",
        kind: "business",
        fill: "#70ad47",
        stroke: "#548235",
        text: "#ffffff",
        rowIndex: 1
      },
      {
        kind: "application",
        fill: "#8064a2",
        stroke: "#5f497a",
        text: "#ffffff",
        rowIndex: 2
      }
    ]
  };

  const source = buildDomainTreeViewMermaid(file.domains, scheme);
  assert.match(source, /classDef kind_domain_business fill:#70ad47,stroke:#548235,color:#ffffff/);
  assert.match(source, /classDef kind_domain_application fill:#8064a2,stroke:#5f497a,color:#ffffff/);
});

test("generates TreeView source for multiple root Domain hierarchy", () => {
  const { file } = parseDomains(`${baseFrontmatter}
## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| company | 会社全体 | organization | | 業務全体 |
| logistics | 物流部 | department | company | 物流 |
| external | 外部 | external | | 外部 |
| carrier | 配送会社 | partner | external | 配送 |
`);

  const source = buildDomainTreeViewMermaid(file.domains);
  assert.match(source, /^flowchart TB/);
  assert.match(source, /domain_company\["会社全体 \[organization\]"\]/);
  assert.match(source, /domain_external\["外部 \[external\]"\]/);
  assert.match(source, /domain_company --> domain_logistics/);
  assert.match(source, /domain_external --> domain_carrier/);
  assert.doesNotMatch(source, /root\(\(Domains\)\)/);
});

test("generates TreeView label fallback from empty Domain name", () => {
  const { file } = parseDomains(`${baseFrontmatter}
## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| fallback_name | | system | | Uses id |
`);

  const source = buildDomainTreeViewMermaid(file.domains);
  assert.match(source, /domain_fallback_name\["fallback_name \[system\]"\]/);
});

test("generates Mindmap source for single-root Domain hierarchy", () => {
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

  const source = buildDomainMindmapMermaid(file.domains);
  assert.match(source, /^mindmap/);
  assert.match(source, /  root\(\(会社全体（organization）\)\)/);
  assert.match(source, /    物流部（department）/);
  assert.match(source, /      倉庫（location）/);
  assert.match(source, /        ハンディ端末（device）/);
  assert.match(source, /      WMS（system）/);
  assert.match(source, /    基幹システム（system）/);
  assert.doesNotMatch(source, /\[[^\]]+\]/);
  assert.doesNotMatch(source, /classDef/);
});

test("generates Mindmap source with synthetic root for multiple roots", () => {
  const { file } = parseDomains(`${baseFrontmatter}
## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| company | 会社全体 | organization | | 業務全体 |
| logistics | 物流部 | department | company | 物流 |
| external | 外部 | organization | | 外部 |
| carrier | 配送会社 | partner | external | 配送 |
`);

  const source = buildDomainMindmapMermaid(file.domains);
  assert.match(source, /^mindmap/);
  assert.match(source, /  root\(\(Domains\)\)/);
  assert.match(source, /    会社全体（organization）/);
  assert.match(source, /      物流部（department）/);
  assert.match(source, /    外部（organization）/);
  assert.match(source, /      配送会社（partner）/);
  assert.doesNotMatch(source, /\[[^\]]+\]/);
});

test("generates Mindmap label fallback from empty Domain name", () => {
  const { file } = parseDomains(`${baseFrontmatter}
## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| fallback_name | | system | | Uses id |
`);

  const source = buildDomainMindmapMermaid(file.domains);
  assert.match(source, /root\(\(fallback_name（system）\)\)/);
  assert.doesNotMatch(source, /\[[^\]]+\]/);
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

test("generates safe TreeView source for circular Domain hierarchy", () => {
  const { file } = parseDomains(`${baseFrontmatter}
## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| cycle_a | Cycle A | system | cycle_b | Cycle A |
| cycle_b | Cycle B | system | cycle_a | Cycle B |
`);

  const source = buildDomainTreeViewMermaid(file.domains);
  assert.match(source, /^flowchart TB/);
  assert.match(source, /domain_cycle_a\["Cycle A \[system\]"\]/);
  assert.match(source, /domain_cycle_b\["Cycle B \[system\]"\]/);
  assert.doesNotMatch(source, /domain_cycle_a --> domain_cycle_b/);
  assert.doesNotMatch(source, /domain_cycle_b --> domain_cycle_a/);
  assert.doesNotMatch(source, /Maximum call stack/i);
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

test("generates safe Mindmap source for circular Domain hierarchy", () => {
  const { file } = parseDomains(`${baseFrontmatter}
## Domains

| id | name | kind | parent | description |
|---|---|---|---|---|
| cycle_a | Cycle A | system | cycle_b | Cycle A |
| cycle_b | Cycle B | system | cycle_a | Cycle B |
`);

  const source = buildDomainMindmapMermaid(file.domains);
  assert.match(source, /^mindmap/);
  assert.match(source, /Cycle A（system）/);
  assert.match(source, /Cycle B（system）/);
  assert.doesNotMatch(source, /\[[^\]]+\]/);
  assert.doesNotMatch(source, /Maximum call stack/i);
});
