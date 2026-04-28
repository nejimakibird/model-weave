import type { FileType, ValidationWarning } from "../types/models";

export type RenderMode = "auto" | "custom" | "mermaid";
export type RendererImplementation = "custom" | "mermaid" | "table-text";
export type RenderModeSource =
  | "toolbar"
  | "frontmatter"
  | "settings"
  | "format_default"
  | "fallback";

export interface ResolveRenderModeInput {
  filePath: string;
  formatType: FileType;
  modelKind?: string | null;
  toolbarOverride?: string | null;
  frontmatterRenderMode?: unknown;
  settingsDefaultRenderMode?: string | null;
}

export interface ResolvedRenderMode {
  selectedMode: RenderMode;
  effectiveMode: "custom" | "mermaid";
  actualRenderer: RendererImplementation;
  source: RenderModeSource;
  fallbackReason?: string;
  diagnostics: ValidationWarning[];
}

const VALID_RENDER_MODES = new Set<RenderMode>(["auto", "custom", "mermaid"]);

const TABLE_TEXT_FORMATS = new Set<FileType>([
  "data-object",
  "app-process",
  "rule",
  "codeset",
  "message",
  "mapping"
]);

export function resolveRenderMode(
  input: ResolveRenderModeInput
): ResolvedRenderMode {
  const diagnostics: ValidationWarning[] = [];
  const toolbarMode = normalizeRenderMode(input.toolbarOverride);
  const frontmatterMode = normalizeRenderMode(input.frontmatterRenderMode);
  const settingsMode = normalizeRenderMode(input.settingsDefaultRenderMode);

  if (
    typeof input.frontmatterRenderMode === "string" &&
    input.frontmatterRenderMode.trim().length > 0 &&
    !frontmatterMode
  ) {
    diagnostics.push(
      createRenderModeWarning(
        input.filePath,
        `Unknown render_mode value "${input.frontmatterRenderMode}". Falling back to auto.`,
        "render_mode"
      )
    );
  }

  const selectedSource: Exclude<RenderModeSource, "fallback"> =
    toolbarMode
      ? "toolbar"
      : frontmatterMode
        ? "frontmatter"
        : settingsMode
          ? "settings"
          : "format_default";

  const selectedMode = toolbarMode ?? frontmatterMode ?? settingsMode ?? "auto";
  const formatDefaultMode = getFormatDefaultRenderMode(input.formatType);
  if (selectedMode === "auto") {
    return {
      selectedMode,
      effectiveMode: formatDefaultMode,
      actualRenderer: getRendererImplementation(
        input.formatType,
        formatDefaultMode,
        input.modelKind
      ),
      source: selectedSource,
      diagnostics: appendReducedOverviewNote(
        diagnostics,
        input.formatType,
        input.modelKind,
        formatDefaultMode,
        input.filePath
      )
    };
  }

  const fallbackMode = getFallbackRenderMode(input.formatType, input.modelKind);
  const supportedModes = getForcedRenderModes(input.formatType, input.modelKind);

  if (!supportedModes.includes(selectedMode)) {
    diagnostics.push(
      createRenderModeWarning(
        input.filePath,
        `${capitalizeRenderMode(selectedMode)} renderer is not supported for ${input.formatType} yet. Falling back to auto (${fallbackMode}).`,
        "render_mode"
      )
    );
    return {
      selectedMode,
      effectiveMode: fallbackMode,
      actualRenderer: getRendererImplementation(
        input.formatType,
        fallbackMode,
        input.modelKind
      ),
      source: "fallback",
      fallbackReason: `unsupported:${selectedMode}`,
      diagnostics: appendReducedOverviewNote(
        diagnostics,
        input.formatType,
        input.modelKind,
        fallbackMode,
        input.filePath
      )
    };
  }

  return {
    selectedMode,
    effectiveMode: selectedMode,
    actualRenderer: getRendererImplementation(
      input.formatType,
      selectedMode,
      input.modelKind
    ),
    source: selectedSource,
    diagnostics: appendReducedOverviewNote(
      diagnostics,
      input.formatType,
      input.modelKind,
      selectedMode,
      input.filePath
    )
  };
}

export function getFormatDefaultRenderMode(
  formatType: FileType
): "custom" | "mermaid" {
  switch (formatType) {
    case "dfd-diagram":
      return "mermaid";
    default:
      return "custom";
  }
}

export function getSupportedRenderModes(
  formatType: FileType,
  modelKind?: string | null
): RenderMode[] {
  if (formatType === "dfd-diagram") {
    return ["auto"];
  }

  return ["auto", ...getForcedRenderModes(formatType, modelKind)];
}

function getForcedRenderModes(
  formatType: FileType,
  modelKind?: string | null
): Array<"custom" | "mermaid"> {
  switch (formatType) {
    case "diagram":
      return modelKind === "class" || modelKind === "er"
        ? ["custom", "mermaid"]
        : ["custom"];
    case "object":
    case "er-entity":
      return ["custom", "mermaid"];
    case "dfd-diagram":
      return ["mermaid"];
    case "dfd-object":
      return [];
    case "screen":
      return [];
    case "data-object":
    case "app-process":
    case "rule":
    case "codeset":
    case "message":
    case "mapping":
      return [];
    case "markdown":
      return [];
    default:
      return ["custom"];
  }
}

export function normalizeRenderMode(value: unknown): RenderMode | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return VALID_RENDER_MODES.has(normalized as RenderMode)
    ? (normalized as RenderMode)
    : null;
}

function getFallbackRenderMode(
  formatType: FileType,
  modelKind?: string | null
): "custom" | "mermaid" {
  const supported = getForcedRenderModes(formatType, modelKind);
  if (supported.includes(getFormatDefaultRenderMode(formatType))) {
    return getFormatDefaultRenderMode(formatType);
  }

  return (supported[0] as "custom" | "mermaid" | undefined) ?? "custom";
}

function getRendererImplementation(
  formatType: FileType,
  mode: "custom" | "mermaid",
  modelKind?: string | null
): RendererImplementation {
  if (
    mode === "mermaid" &&
    (formatType === "dfd-diagram" ||
      formatType === "object" ||
      formatType === "er-entity" ||
      (formatType === "diagram" && (modelKind === "class" || modelKind === "er")))
  ) {
    return "mermaid";
  }

  if (TABLE_TEXT_FORMATS.has(formatType)) {
    return "table-text";
  }

  return "custom";
}

function createRenderModeWarning(
  filePath: string,
  message: string,
  field: string
): ValidationWarning {
  return {
    code: "invalid-structure",
    message,
    severity: "warning",
    filePath,
    field,
    section: "frontmatter"
  };
}

function capitalizeRenderMode(value: RenderMode): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function appendReducedOverviewNote(
  diagnostics: ValidationWarning[],
  formatType: FileType,
  modelKind: string | null | undefined,
  effectiveMode: "custom" | "mermaid",
  filePath: string
): ValidationWarning[] {
  if (
    effectiveMode !== "mermaid" ||
    !(
      formatType === "object" ||
      formatType === "er-entity" ||
      (formatType === "diagram" && (modelKind === "class" || modelKind === "er"))
    )
  ) {
    return diagnostics;
  }

  return [
    ...diagnostics,
    {
      code: "invalid-structure",
      message: "Mermaid mode shows reduced overview only.",
      severity: "info",
      filePath,
      section: "frontmatter",
      field: "render_mode"
    }
  ];
}
