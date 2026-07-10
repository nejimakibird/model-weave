import type { RenderMode } from "../core/render-mode";
import {
  normalizeAppProcessBusinessFlowDirectionWithFallback,
  type AppProcessBusinessFlowDirection
} from "../core/app-process-business-flow-direction";
import type { FlowDiagramViewMode } from "../types/models";
import type { ModelWeaveUiLanguage } from "../i18n/messages";

export type ModelWeaveDefaultZoom = "fit" | "100";
export type ModelWeaveFontSize = "small" | "normal" | "large";
export type ModelWeaveNodeDensity = "compact" | "normal" | "relaxed";
export type ModelWeaveDomainViewMode = "mindmap" | "area" | "tree";
export type ModelWeaveFlowDiagramViewMode = FlowDiagramViewMode;

export const DOMAIN_VIEW_MODE_SETTING_OPTIONS: ReadonlyArray<{
  value: ModelWeaveDomainViewMode;
  label: string;
}> = [
  { value: "mindmap", label: "Mindmap" },
  { value: "area", label: "Area" },
  { value: "tree", label: "Tree" }
];

export interface ModelWeaveSettings {
  defaultClassRenderMode: RenderMode;
  defaultErRenderMode: RenderMode;
  defaultDfdRenderMode: RenderMode;
  defaultProcessRenderMode: RenderMode;
  defaultBusinessFlowDirection: AppProcessBusinessFlowDirection;
  defaultScreenRenderMode: RenderMode;
  defaultFlowDiagramViewMode: ModelWeaveFlowDiagramViewMode;
  defaultDomainsViewMode: ModelWeaveDomainViewMode;
  defaultDomainDiagramViewMode: ModelWeaveDomainViewMode;
  defaultZoom: ModelWeaveDefaultZoom;
  fontSize: ModelWeaveFontSize;
  nodeDensity: ModelWeaveNodeDensity;
  localSourceRoot: string;
  defaultColorSchemeRef?: string;
  enableRelationshipView: boolean;
  showMermaidRenderDebug: boolean;
  uiLanguage: ModelWeaveUiLanguage;
}

export type ModelWeaveViewerPreferences = Pick<
  ModelWeaveSettings,
  | "defaultZoom"
  | "defaultBusinessFlowDirection"
  | "defaultDomainsViewMode"
  | "defaultFlowDiagramViewMode"
  | "defaultDomainDiagramViewMode"
  | "fontSize"
  | "nodeDensity"
  | "localSourceRoot"
  | "defaultColorSchemeRef"
  | "uiLanguage"
  | "showMermaidRenderDebug"
>;

export const DEFAULT_MODEL_WEAVE_SETTINGS: ModelWeaveSettings = {
  defaultClassRenderMode: "custom",
  defaultErRenderMode: "custom",
  defaultDfdRenderMode: "mermaid",
  defaultProcessRenderMode: "custom",
  defaultBusinessFlowDirection: "LR",
  defaultScreenRenderMode: "custom",
  defaultFlowDiagramViewMode: "detail",
  defaultDomainsViewMode: "mindmap",
  defaultDomainDiagramViewMode: "mindmap",
  defaultZoom: "fit",
  fontSize: "normal",
  nodeDensity: "normal",
  localSourceRoot: "",
  defaultColorSchemeRef: "",
  enableRelationshipView: true,
  showMermaidRenderDebug: false,
  uiLanguage: "auto"
};

const VALID_DEFAULT_ZOOMS = new Set<ModelWeaveDefaultZoom>(["fit", "100"]);
const VALID_FONT_SIZES = new Set<ModelWeaveFontSize>([
  "small",
  "normal",
  "large"
]);
const VALID_NODE_DENSITIES = new Set<ModelWeaveNodeDensity>([
  "compact",
  "normal",
  "relaxed"
]);
const VALID_RENDER_MODES = new Set<RenderMode>([
  "custom",
  "mermaid",
  "mermaid-detail"
]);
const CLASS_RENDER_MODES = new Set<RenderMode>([
  "custom",
  "mermaid",
  "mermaid-detail"
]);
const ER_RENDER_MODES = new Set<RenderMode>([
  "custom",
  "mermaid",
  "mermaid-detail"
]);
const DFD_RENDER_MODES = new Set<RenderMode>(["mermaid"]);
const PROCESS_RENDER_MODES = new Set<RenderMode>(["custom"]);
const SCREEN_RENDER_MODES = new Set<RenderMode>(["custom"]);
const VALID_DOMAIN_VIEW_MODES = new Set<ModelWeaveDomainViewMode>([
  "mindmap",
  "area",
  "tree"
]);
const VALID_FLOW_DIAGRAM_VIEW_MODES = new Set<ModelWeaveFlowDiagramViewMode>([
  "detail", "screen"
]);
const VALID_UI_LANGUAGES = new Set<ModelWeaveUiLanguage>(["auto", "en", "ja"]);

export function normalizeModelWeaveSettings(
  value: unknown
): ModelWeaveSettings {
  const raw = isRecord(value) ? value : {};
  const legacyDefaultRenderMode = normalizeEnumValue(
    raw.defaultRenderMode,
    VALID_RENDER_MODES,
    DEFAULT_MODEL_WEAVE_SETTINGS.defaultClassRenderMode
  );

  return {
    defaultClassRenderMode: normalizeEnumValue(
      raw.defaultClassRenderMode ?? legacyDefaultRenderMode,
      CLASS_RENDER_MODES,
      DEFAULT_MODEL_WEAVE_SETTINGS.defaultClassRenderMode
    ),
    defaultErRenderMode: normalizeEnumValue(
      raw.defaultErRenderMode ?? legacyDefaultRenderMode,
      ER_RENDER_MODES,
      DEFAULT_MODEL_WEAVE_SETTINGS.defaultErRenderMode
    ),
    defaultDfdRenderMode: normalizeEnumValue(
      raw.defaultDfdRenderMode,
      DFD_RENDER_MODES,
      DEFAULT_MODEL_WEAVE_SETTINGS.defaultDfdRenderMode
    ),
    defaultProcessRenderMode: normalizeEnumValue(
      raw.defaultProcessRenderMode,
      PROCESS_RENDER_MODES,
      DEFAULT_MODEL_WEAVE_SETTINGS.defaultProcessRenderMode
    ),
    defaultBusinessFlowDirection: normalizeAppProcessBusinessFlowDirectionWithFallback(
      raw.defaultBusinessFlowDirection
    ),
    defaultScreenRenderMode: normalizeEnumValue(
      raw.defaultScreenRenderMode,
      SCREEN_RENDER_MODES,
      DEFAULT_MODEL_WEAVE_SETTINGS.defaultScreenRenderMode
    ),
    defaultFlowDiagramViewMode: normalizeEnumValue(
      raw.defaultFlowDiagramViewMode,
      VALID_FLOW_DIAGRAM_VIEW_MODES,
      DEFAULT_MODEL_WEAVE_SETTINGS.defaultFlowDiagramViewMode
    ),
    defaultDomainsViewMode: normalizeEnumValue(
      raw.defaultDomainsViewMode,
      VALID_DOMAIN_VIEW_MODES,
      DEFAULT_MODEL_WEAVE_SETTINGS.defaultDomainsViewMode
    ),
    defaultDomainDiagramViewMode: normalizeEnumValue(
      raw.defaultDomainDiagramViewMode,
      VALID_DOMAIN_VIEW_MODES,
      DEFAULT_MODEL_WEAVE_SETTINGS.defaultDomainDiagramViewMode
    ),
    defaultZoom: normalizeEnumValue(
      raw.defaultZoom,
      VALID_DEFAULT_ZOOMS,
      DEFAULT_MODEL_WEAVE_SETTINGS.defaultZoom
    ),
    fontSize: normalizeEnumValue(
      raw.fontSize,
      VALID_FONT_SIZES,
      DEFAULT_MODEL_WEAVE_SETTINGS.fontSize
    ),
    nodeDensity: normalizeEnumValue(
      raw.nodeDensity,
      VALID_NODE_DENSITIES,
      DEFAULT_MODEL_WEAVE_SETTINGS.nodeDensity
    ),
    localSourceRoot: normalizeStringValue(raw.localSourceRoot ?? raw.sourceRoot),
    defaultColorSchemeRef: normalizeStringValue(raw.defaultColorSchemeRef),
    enableRelationshipView: normalizeBooleanValue(
      raw.enableRelationshipView,
      DEFAULT_MODEL_WEAVE_SETTINGS.enableRelationshipView
    ),
    showMermaidRenderDebug: normalizeBooleanValue(
      raw.showMermaidRenderDebug,
      DEFAULT_MODEL_WEAVE_SETTINGS.showMermaidRenderDebug
    ),
    uiLanguage: normalizeEnumValue(
      raw.uiLanguage,
      VALID_UI_LANGUAGES,
      DEFAULT_MODEL_WEAVE_SETTINGS.uiLanguage
    )
  };
}

function normalizeStringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeBooleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeEnumValue<T extends string>(
  value: unknown,
  allowed: Set<T>,
  fallback: T
): T {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase() as T;
  return allowed.has(normalized) ? normalized : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
