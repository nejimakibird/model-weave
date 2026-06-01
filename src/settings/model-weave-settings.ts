import type { RenderMode } from "../core/render-mode";
import type { ModelWeaveUiLanguage } from "../i18n/messages";

export type ModelWeaveDefaultZoom = "fit" | "100";
export type ModelWeaveFontSize = "small" | "normal" | "large";
export type ModelWeaveNodeDensity = "compact" | "normal" | "relaxed";

export interface ModelWeaveSettings {
  defaultRenderMode: RenderMode;
  defaultZoom: ModelWeaveDefaultZoom;
  fontSize: ModelWeaveFontSize;
  nodeDensity: ModelWeaveNodeDensity;
  localSourceRoot: string;
  enableRelationshipView: boolean;
  uiLanguage: ModelWeaveUiLanguage;
}

export type ModelWeaveViewerPreferences = Pick<
  ModelWeaveSettings,
  "defaultZoom" | "fontSize" | "nodeDensity" | "localSourceRoot" | "uiLanguage"
>;

export const DEFAULT_MODEL_WEAVE_SETTINGS: ModelWeaveSettings = {
  defaultRenderMode: "auto",
  defaultZoom: "fit",
  fontSize: "normal",
  nodeDensity: "normal",
  localSourceRoot: "",
  enableRelationshipView: true,
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
  "auto",
  "custom",
  "mermaid",
  "mermaid-detail"
]);
const VALID_UI_LANGUAGES = new Set<ModelWeaveUiLanguage>(["auto", "en", "ja"]);

export function normalizeModelWeaveSettings(
  value: unknown
): ModelWeaveSettings {
  const raw = isRecord(value) ? value : {};

  return {
    defaultRenderMode: normalizeEnumValue(
      raw.defaultRenderMode,
      VALID_RENDER_MODES,
      DEFAULT_MODEL_WEAVE_SETTINGS.defaultRenderMode
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
    enableRelationshipView: normalizeBooleanValue(
      raw.enableRelationshipView,
      DEFAULT_MODEL_WEAVE_SETTINGS.enableRelationshipView
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

  return allowed.has(value as T) ? (value as T) : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
