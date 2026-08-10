import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync("src/main.ts", "utf8");
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));

const settingKeys = [
  "uiLanguage",
  "defaultClassRenderMode",
  "defaultErRenderMode",
  "defaultDfdRenderMode",
  "defaultProcessRenderMode",
  "defaultBusinessFlowDirection",
  "defaultFlowDiagramViewMode",
  "defaultScreenRenderMode",
  "defaultDomainsViewMode",
  "defaultDomainDiagramViewMode",
  "defaultZoom",
  "fontSize",
  "nodeDensity",
  "enableRelationshipView",
  "showMermaidRenderDebug",
  "localSourceRoot",
  "defaultColorSchemeRef"
];

test("Declarative Settings defines every Model Weave setting once", () => {
  for (const key of settingKeys) {
    assert.match(source, new RegExp('(?:dropdown|toggle|text)\\("' + key + '"'));
  }
  assert.equal(new Set(settingKeys).size, settingKeys.length);
  assert.match(source, /name: t\("settings\.refreshOpenViews\.name"\)[\s\S]*action: async/);
});

test("Declarative Settings keeps updateSettings side effects and legacy display fallback", () => {
  assert.match(source, /getSettingDefinitions\(\): ModelWeaveDeclarativeSettingItem\[]/);
  assert.match(source, /async setControlValue\(key: string, value: unknown\)[\s\S]*plugin\.updateSettings\(partial\)/);
  assert.match(source, /display\(\): void/);
  assert.match(source, /if \(key === "uiLanguage"\)[\s\S]*requestDeclarativeSettingsUpdate/);
});

test("Declarative Settings retains validation and the supported manifest floor", () => {
  for (const helper of [
    "isClassRenderModeOption",
    "isErRenderModeOption",
    "isDfdRenderModeOption",
    "isProcessRenderModeOption",
    "isBusinessFlowDirectionOption",
    "isFlowDiagramViewModeOption",
    "isScreenRenderModeOption",
    "isDomainViewModeOption",
    "isDefaultZoomOption",
    "isFontSizeOption",
    "isNodeDensityOption",
    "isUiLanguageOption"
  ]) {
    assert.match(source, new RegExp(helper + "\\(value\\)"));
  }
  assert.equal(manifest.minAppVersion, "1.8.7");
});
