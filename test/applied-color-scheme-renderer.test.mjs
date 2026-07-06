import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const outputFile = "dist/test-applied-color-scheme-renderer.mjs";

await build({
  stdin: {
    contents: [
      'export { renderAppliedColorSchemeSectionContent } from "./src/views/applied-color-scheme-renderer";',
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

test("Applied Color Scheme compact table shows only compact visible columns", () => {
  const container = renderAppliedColorScheme();
  const headers = findAll(container, "th").map((header) => header.textContent);

  assert.deepEqual(headers, ["Target", "Kind", "Preview", "Notes", "Source"]);
  assert.equal(headers.includes("Fill"), false);
  assert.equal(headers.includes("Stroke"), false);
  assert.equal(headers.includes("Text"), false);
});

test("Applied Color Scheme preview swatch carries style and accessible raw color metadata without native title", () => {
  const container = renderAppliedColorScheme();
  const swatch = findAll(container, "span").find((element) => element.className === "model-weave-color-swatch");

  assert.ok(swatch);
  assert.equal(swatch.textContent, "Aa");
  assert.equal(swatch.style.backgroundColor, "#DDF8E8");
  assert.equal(swatch.style.borderColor, "#388E3C");
  assert.equal(swatch.style.color, "#111111");
  assert.equal(swatch.attributes.title, undefined);
  assert.equal(swatch.attributes["aria-label"], "fill: #DDF8E8\nstroke: #388E3C\ntext: #111111");
});
