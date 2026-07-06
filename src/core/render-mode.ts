import type { FileType, ValidationWarning } from "../types/models";

export type RenderMode = "custom" | "mermaid" | "mermaid-detail";
export type DomainRenderMode = "mindmap" | "area" | "tree";
export type AnyRenderMode = RenderMode | DomainRenderMode;
export type EffectiveRenderMode = AnyRenderMode;
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
  selectedMode: AnyRenderMode;
  effectiveMode: EffectiveRenderMode;
  actualRenderer: RendererImplementation;
  source: RenderModeSource;
  fallbackReason?: string;
  diagnostics: ValidationWarning[];
}

const VALID_RENDER_MODES = new Set<RenderMode>([
  "custom",
  "mermaid",
  "mermaid-detail"
]);

const VALID_DOMAIN_RENDER_MODES = new Set<DomainRenderMode>([
  "mindmap",
  "area",
  "tree"
]);

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
  const toolbarMode = normalizeRenderModeForFormat(
    input.toolbarOverride,
    input.formatType
  );
  const frontmatterMode = normalizeFrontmatterRenderMode(
    input.frontmatterRenderMode,
    input.formatType,
    input.filePath,
    diagnostics
  );
  const settingsMode = normalizeRenderModeForFormat(
    input.settingsDefaultRenderMode,
    input.formatType
  );
  const formatDefaultMode = getFormatDefaultRenderMode(input.formatType);
  const supportedModes = getSupportedRenderModes(input.formatType, input.modelKind);
  const fallbackMode = getFallbackRenderMode(input.formatType, input.modelKind);

  const toolbarResult = selectSupportedRenderMode(
    toolbarMode,
    "toolbar",
    supportedModes
  );
  if (toolbarResult) {
    return buildResolvedRenderMode(input, toolbarResult.mode, toolbarResult.source, diagnostics);
  }

  const frontmatterResult = selectSupportedRenderMode(
    frontmatterMode,
    "frontmatter",
    supportedModes
  );
  if (frontmatterResult) {
    return buildResolvedRenderMode(
      input,
      frontmatterResult.mode,
      frontmatterResult.source,
      diagnostics
    );
  }
  if (frontmatterMode) {
    diagnostics.push(
      createRenderModeWarning(
        input.filePath,
        `${capitalizeRenderMode(frontmatterMode)} renderer is not supported for ${input.formatType}. Using the format default renderer.`,
        "render_mode"
      )
    );
  }

  const settingsResult = selectSupportedRenderMode(
    settingsMode,
    "settings",
    supportedModes
  );
  if (settingsResult) {
    return buildResolvedRenderMode(input, settingsResult.mode, settingsResult.source, diagnostics);
  }

  const defaultResult = selectSupportedRenderMode(
    formatDefaultMode,
    "format_default",
    supportedModes
  );
  if (defaultResult) {
    return buildResolvedRenderMode(input, defaultResult.mode, defaultResult.source, diagnostics);
  }

  return buildResolvedRenderMode(
    input,
    fallbackMode,
    "fallback",
    diagnostics,
    settingsMode ? `unsupported:${settingsMode}` : undefined
  );
}

export function getFormatDefaultRenderMode(
  formatType: FileType
): EffectiveRenderMode {
  switch (formatType) {
    case "dfd-diagram":
    case "flow-diagram":
      return "mermaid";
    case "domains":
    case "domain-diagram":
      return "mindmap";
    default:
      return "custom";
  }
}

export function getSupportedRenderModes(
  formatType: FileType,
  modelKind?: string | null
): AnyRenderMode[] {
  return getForcedRenderModes(formatType, modelKind);
}

function getForcedRenderModes(
  formatType: FileType,
  modelKind?: string | null
): EffectiveRenderMode[] {
  switch (formatType) {
    case "domains":
    case "domain-diagram":
      return ["mindmap", "area", "tree"];
    case "diagram":
      if (modelKind === "class") {
        return ["custom", "mermaid", "mermaid-detail"];
      }
      return modelKind === "er"
        ? ["custom", "mermaid", "mermaid-detail"]
        : ["custom"];
    case "object":
      return ["custom", "mermaid", "mermaid-detail"];
    case "er-entity":
      return ["custom", "mermaid", "mermaid-detail"];
    case "dfd-diagram":
    case "flow-diagram":
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

export function normalizeDomainRenderMode(value: unknown): DomainRenderMode | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return VALID_DOMAIN_RENDER_MODES.has(normalized as DomainRenderMode)
    ? (normalized as DomainRenderMode)
    : null;
}

function normalizeRenderModeForFormat(
  value: unknown,
  formatType: FileType
): AnyRenderMode | null {
  if (formatType === "domains" || formatType === "domain-diagram") {
    return normalizeDomainRenderMode(value);
  }

  return normalizeRenderMode(value);
}

function normalizeFrontmatterRenderMode(
  value: unknown,
  formatType: FileType,
  filePath: string,
  diagnostics: ValidationWarning[]
): AnyRenderMode | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized === "auto") {
    diagnostics.push(
      createRenderModeWarning(
        filePath,
        'Deprecated render_mode value "auto". Using the format default renderer.',
        "render_mode"
      )
    );
    return null;
  }

  const mode = normalizeRenderModeForFormat(normalized, formatType);
  if (!mode) {
    diagnostics.push(
      createRenderModeWarning(
        filePath,
        `Unknown render_mode value "${value}". Using the format default renderer.`,
        "render_mode"
      )
    );
  }

  return mode;
}

function selectSupportedRenderMode(
  mode: AnyRenderMode | null,
  source: Exclude<RenderModeSource, "fallback">,
  supportedModes: AnyRenderMode[]
): { mode: AnyRenderMode; source: Exclude<RenderModeSource, "fallback"> } | null {
  if (!mode || !supportedModes.includes(mode)) {
    return null;
  }

  return { mode, source };
}

function buildResolvedRenderMode(
  input: ResolveRenderModeInput,
  mode: EffectiveRenderMode,
  source: RenderModeSource,
  diagnostics: ValidationWarning[],
  fallbackReason?: string
): ResolvedRenderMode {
  return {
    selectedMode: mode,
    effectiveMode: mode,
    actualRenderer: getRendererImplementation(
      input.formatType,
      mode,
      input.modelKind
    ),
    source,
    fallbackReason,
    diagnostics: appendReducedOverviewNote(
      diagnostics,
      input.formatType,
      input.modelKind,
      mode,
      input.filePath
    )
  };
}

function getFallbackRenderMode(
  formatType: FileType,
  modelKind?: string | null
): EffectiveRenderMode {
  const supported = getForcedRenderModes(formatType, modelKind);
  if (supported.includes(getFormatDefaultRenderMode(formatType))) {
    return getFormatDefaultRenderMode(formatType);
  }

  return supported[0] ?? "custom";
}

function getRendererImplementation(
  formatType: FileType,
  mode: EffectiveRenderMode,
  modelKind?: string | null
): RendererImplementation {
  if (formatType === "domains" || formatType === "domain-diagram") {
    return "mermaid";
  }

  if (
    (mode === "mermaid" || mode === "mermaid-detail") &&
    (formatType === "dfd-diagram" ||
      formatType === "flow-diagram" ||
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

function capitalizeRenderMode(value: AnyRenderMode): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function appendReducedOverviewNote(
  diagnostics: ValidationWarning[],
  formatType: FileType,
  modelKind: string | null | undefined,
  effectiveMode: EffectiveRenderMode,
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
