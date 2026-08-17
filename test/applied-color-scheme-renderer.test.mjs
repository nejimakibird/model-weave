import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const outputFile = "dist/test-applied-color-scheme-renderer.mjs";

await build({
  stdin: {
    contents: [
      'export { groupAppliedColorSchemeRows, renderAppliedColorSchemeSectionContent } from "./src/views/applied-color-scheme-renderer";',
      'export { createModelWeaveTranslator } from "./src/i18n/messages";'
    ].join("\n"),
    resolveDir: ".",
    sourcefile: "test-applied-color-scheme-renderer-entry.ts",
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
          contents: "export const getLanguage = () => 'en';",
          loader: "js"
        }));
      }
    }
  ],
  outfile: outputFile,
  logLevel: "silent"
});

const {
  createModelWeaveTranslator,
  groupAppliedColorSchemeRows,
  renderAppliedColorSchemeSectionContent
} = await import(`../${outputFile}?t=${Date.now()}`);

class TestElement {
  constructor(tagName) {
    this.tagName = tagName.toLowerCase();
    this.children = [];
    this.attributes = {};
    this.style = {};
    this.className = "";
    this._textContent = "";
  }

  set textContent(value) {
    this._textContent = String(value ?? "");
    this.children = [];
  }

  get textContent() {
    return [
      this._textContent,
      ...this.children.map((child) => child.textContent ?? "")
    ].join("");
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  createEl(tagName, options = {}) {
    const child = new TestElement(tagName);
    applyOptions(child, options);
    this.appendChild(child);
    return child;
  }

  createDiv(options = {}) {
    return this.createEl("div", options);
  }

  createSpan(options = {}) {
    return this.createEl("span", options);
  }
}

function applyOptions(element, options) {
  if (options.text !== undefined) {
    element.textContent = options.text;
  }
  if (options.cls) {
    element.className = options.cls;
  }
  for (const [name, value] of Object.entries(options.attr ?? {})) {
    element.setAttribute(name, value);
  }
}

function findAll(element, tagName) {
  return [
    ...(element.tagName === tagName ? [element] : []),
    ...element.children.flatMap((child) => findAll(child, tagName))
  ];
}

function renderAppliedColorScheme() {
  const container = new TestElement("section");
  renderAppliedColorSchemeSectionContent(
    container,
    {
      id: "COLOR-SALES",
      name: "Sales colors",
      sourcePath: "colors/COLOR-SALES.md",
      defaultStyle: { fill: "#ffffff", stroke: "#000000", text: "#111111" },
      entries: []
    },
    [
      {
        source: "configured",
        entry: {
          target: "domain",
          kind: "sales",
          fill: "#DDF8E8",
          stroke: "#388E3C",
          text: "#111111",
          notes: "Sales boundary",
          rowIndex: 0
        }
      }
    ],
    ["domain"],
    createModelWeaveTranslator("en")
  );
  return container;
}

test("Applied Color Scheme visual legend groups effective rows by target", () => {
  const container = renderAppliedColorScheme();
  const groups = findAll(container, "div")
    .filter((element) => element.className === "model-weave-color-legend-group");

  assert.equal(groups.length, 1);
  assert.equal(groups[0].attributes["data-target"], "domain");
  assert.equal(
    findAll(container, "div").some((element) => element.className === "model-weave-color-legend-group-title" && element.textContent === "domain"),
    true
  );
  assert.equal(findAll(container, "table").length, 0);
});

test("Applied Color Scheme legend preserves styles, source, and semantic metadata", () => {
  const container = renderAppliedColorScheme();
  const item = findAll(container, "div").find((element) => element.className === "model-weave-color-legend-item");
  const swatch = findAll(container, "span").find((element) => element.className === "model-weave-color-legend-swatch");

  assert.ok(item);
  assert.ok(swatch);
  assert.equal(item.attributes["data-target"], "domain");
  assert.equal(item.attributes["data-kind"], "sales");
  assert.match(item.attributes["aria-label"], /fill: #DDF8E8/);
  assert.match(item.attributes["aria-label"], /source: configured/);
  assert.equal(swatch.textContent, "Aa");
  assert.equal(swatch.style.backgroundColor, "#DDF8E8");
  assert.equal(swatch.style.borderColor, "#388E3C");
  assert.equal(swatch.style.color, "#111111");
});

test("Applied Color Scheme legend groups target rows and removes duplicate kinds", () => {
  const t = createModelWeaveTranslator("en");
  const groups = groupAppliedColorSchemeRows([
    { source: "configured", entry: { target: "dfd", kind: "process", fill: "#fff", stroke: "#111", text: "#111", rowIndex: 0 } },
    { source: "built-in", entry: { target: "dfd", kind: "process", fill: "#eee", stroke: "#222", text: "#222", rowIndex: 1 } },
    { source: "built-in", entry: { target: "domain", kind: "sales", fill: "#ddd", stroke: "#333", text: "#333", rowIndex: 2 } }
  ], t);

  assert.deepEqual(groups.map((group) => [group.target, group.rows.length]), [["dfd", 1], ["domain", 1]]);
  assert.equal(groups[0].rows[0].source, "configured");
});

test("Applied Color Scheme empty legend explains that the current view has no applied colors", () => {
  const container = new TestElement("section");
  renderAppliedColorSchemeSectionContent(
    container,
    {
      id: "COLOR-EMPTY",
      name: "Empty colors",
      sourcePath: "colors/COLOR-EMPTY.md",
      defaultStyle: { fill: "#ffffff", stroke: "#000000", text: "#111111" },
      entries: []
    },
    [],
    [],
    createModelWeaveTranslator("en")
  );
  assert.equal(
    findAll(container, "p").some((element) => element.textContent === "No colors are applied to the current view."),
    true
  );
});
