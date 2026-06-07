import { findModelByReference } from "./reference-resolver";
import type { ModelingVaultIndex } from "./vault-index";
import type {
  ColorSchemeEntry,
  ResolvedColorScheme,
  ResolvedColorStyle,
  ValidationWarning
} from "../types/models";

const BUILT_IN_COLOR_ENTRIES: ColorSchemeEntry[] = [
  { target: "domain", kind: "organization", fill: "#e3f2fd", stroke: "#1976d2", text: "#111111", rowIndex: 0 },
  { target: "domain", kind: "department", fill: "#e8f5e9", stroke: "#388e3c", text: "#111111", rowIndex: 1 },
  { target: "domain", kind: "location", fill: "#fff3e0", stroke: "#f57c00", text: "#111111", rowIndex: 2 },
  { target: "domain", kind: "system", fill: "#f3e5f5", stroke: "#7b1fa2", text: "#111111", rowIndex: 3 },
  { target: "domain", kind: "external", fill: "#eeeeee", stroke: "#616161", text: "#111111", rowIndex: 4 },
  { target: "domain", kind: "device", fill: "#e0f7fa", stroke: "#0097a7", text: "#111111", rowIndex: 5 },
  { kind: "default", fill: "#f5f5f5", stroke: "#9e9e9e", text: "#111111", rowIndex: 6 }
];

export const BUILT_IN_COLOR_SCHEME: ResolvedColorScheme = {
  id: "built-in-default",
  name: "Built-in default",
  entries: BUILT_IN_COLOR_ENTRIES,
  defaultStyle: {
    fill: "#f5f5f5",
    stroke: "#9e9e9e",
    text: "#111111"
  }
};

export function resolveDefaultColorScheme(
  index: ModelingVaultIndex,
  defaultColorSchemeRef?: string
): {
  colorScheme: ResolvedColorScheme;
  warnings: ValidationWarning[];
} {
  const ref = defaultColorSchemeRef?.trim();
  if (!ref) {
    return { colorScheme: BUILT_IN_COLOR_SCHEME, warnings: [] };
  }

  const resolved = findModelByReference(ref, index);
  if (!resolved) {
    return {
      colorScheme: BUILT_IN_COLOR_SCHEME,
      warnings: [createColorSchemeSettingWarning(formatColorSchemeSettingUnresolvedMessage(ref))]
    };
  }

  if (resolved.fileType !== "color-scheme") {
    return {
      colorScheme: BUILT_IN_COLOR_SCHEME,
      warnings: [
        createColorSchemeSettingWarning(
          formatColorSchemeSettingInvalidTypeMessage(ref, resolved.fileType)
        )
      ]
    };
  }

  return {
    colorScheme: {
      id: resolved.id,
      name: resolved.name,
      sourcePath: resolved.path,
      entries: resolved.colors,
      defaultStyle: resolveColorStyle(BUILT_IN_COLOR_SCHEME, "", "") 
    },
    warnings: []
  };
}

export function resolveColorStyle(
  colorScheme: ResolvedColorScheme | undefined,
  target: string,
  kind: string | undefined
): ResolvedColorStyle {
  const scheme = colorScheme ?? BUILT_IN_COLOR_SCHEME;
  const normalizedTarget = target.trim().toLowerCase();
  const normalizedKind = kind?.trim().toLowerCase() ?? "";

  const targetKindMatch = scheme.entries.find((entry) =>
    (entry.target?.trim().toLowerCase() ?? "") === normalizedTarget &&
    entry.kind.trim().toLowerCase() === normalizedKind
  );
  if (targetKindMatch) {
    return mergeStyle(scheme.defaultStyle, entryToStyle(targetKindMatch));
  }

  const globalKindMatch = scheme.entries.find((entry) =>
    !entry.target?.trim() &&
    entry.kind.trim().toLowerCase() === normalizedKind
  );
  if (globalKindMatch) {
    return mergeStyle(scheme.defaultStyle, entryToStyle(globalKindMatch));
  }

  const defaultMatch = scheme.entries.find((entry) =>
    !entry.target?.trim() &&
    entry.kind.trim().toLowerCase() === "default"
  );
  if (defaultMatch) {
    return mergeStyle(BUILT_IN_COLOR_SCHEME.defaultStyle, entryToStyle(defaultMatch));
  }

  return BUILT_IN_COLOR_SCHEME.defaultStyle;
}

export function getEffectiveColorSchemeEntriesForTarget(
  colorScheme: ResolvedColorScheme | undefined,
  target: string
): ColorSchemeEntry[] {
  const scheme = colorScheme ?? BUILT_IN_COLOR_SCHEME;
  const normalizedTarget = target.trim().toLowerCase();
  const entriesByKind = new Map<string, ColorSchemeEntry>();

  for (const entry of scheme.entries) {
    if (isEntryRelevantForTarget(entry, normalizedTarget)) {
      entriesByKind.set(normalizeKind(entry.kind), entry);
    }
  }

  for (const entry of scheme.entries) {
    if (isTargetSpecific(entry, normalizedTarget)) {
      entriesByKind.set(normalizeKind(entry.kind), entry);
    }
  }

  for (const entry of BUILT_IN_COLOR_SCHEME.entries) {
    if (isEntryRelevantForTarget(entry, normalizedTarget)) {
      const key = normalizeKind(entry.kind);
      if (!entriesByKind.has(key)) {
        entriesByKind.set(key, entry);
      }
    }
  }

  return [...entriesByKind.values()];
}

export function formatColorSchemeKindRequiredMessage(): string {
  return "Color Scheme kind is required.";
}

export function formatColorSchemeInvalidColorMessage(
  field: "fill" | "stroke" | "text",
  value: string
): string {
  return `Color Scheme ${field} "${value}" is not a supported hex color.`;
}

export function formatColorSchemeDuplicateEntryMessage(
  target: string,
  kind: string
): string {
  const targetLabel = target.trim() || "(default target)";
  return `duplicate Color Scheme entry for target "${targetLabel}" and kind "${kind}"`;
}

export function formatColorSchemeSettingUnresolvedMessage(ref: string): string {
  return `Default Color Scheme ref "${ref}" could not be resolved. Built-in colors will be used.`;
}

export function formatColorSchemeSettingInvalidTypeMessage(
  ref: string,
  fileType: string
): string {
  return `Default Color Scheme ref "${ref}" resolves to type "${fileType}", but expected type "color_scheme". Built-in colors will be used.`;
}

function entryToStyle(entry: ColorSchemeEntry): ResolvedColorStyle {
  return {
    fill: entry.fill,
    stroke: entry.stroke,
    text: entry.text
  };
}

function mergeStyle(
  base: ResolvedColorStyle,
  override: ResolvedColorStyle
): ResolvedColorStyle {
  return {
    fill: override.fill ?? base.fill,
    stroke: override.stroke ?? base.stroke,
    text: override.text ?? base.text
  };
}

function isEntryRelevantForTarget(
  entry: ColorSchemeEntry,
  normalizedTarget: string
): boolean {
  const entryTarget = entry.target?.trim().toLowerCase() ?? "";
  return !entryTarget || entryTarget === normalizedTarget;
}

function isTargetSpecific(
  entry: ColorSchemeEntry,
  normalizedTarget: string
): boolean {
  return (entry.target?.trim().toLowerCase() ?? "") === normalizedTarget;
}

function normalizeKind(kind: string): string {
  return kind.trim().toLowerCase();
}

function createColorSchemeSettingWarning(message: string): ValidationWarning {
  return {
    code: "unresolved-reference",
    message,
    severity: "warning",
    field: "defaultColorSchemeRef"
  };
}
