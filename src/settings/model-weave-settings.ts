import type { RenderMode } from "../core/render-mode";

export type ModelWeaveDefaultZoom = "fit" | "100";
export type ModelWeaveFontSize = "small" | "normal" | "large";
export type ModelWeaveNodeDensity = "compact" | "normal" | "relaxed";

export interface ModelWeaveSettings {
  defaultRenderMode: RenderMode;
  defaultZoom: ModelWeaveDefaultZoom;
  fontSize: ModelWeaveFontSize;
  nodeDensity: ModelWeaveNodeDensity;
}

export type ModelWeaveViewerPreferences = Pick<
  ModelWeaveSettings,
  "defaultZoom" | "fontSize" | "nodeDensity"
>;

export const DEFAULT_MODEL_WEAVE_SETTINGS: ModelWeaveSettings = {
  defaultRenderMode: "auto",
  defaultZoom: "fit",
  fontSize: "normal",
  nodeDensity: "normal"
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
const VALID_RENDER_MODES = new Set<RenderMode>(["auto", "custom", "mermaid"]);

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
    )
  };
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
