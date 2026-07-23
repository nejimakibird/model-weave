import { buildDfdObjectScene } from "./dfd-object-scene";
import { resolveDomainDiagram } from "./domain-diagram-resolver";
import {
  buildCurrentDiagramDiagnostics,
  buildCurrentObjectDiagnostics
} from "./current-file-diagnostics";
import { resolveObjectContext } from "./object-context-resolver";
import { resolveDiagramRelations } from "./relation-resolver";
import type { ModelingVaultIndex } from "./vault-index";
import type { ParsedFileModel, ValidationWarning } from "../types/models";

export interface VaultDiagnosticsFileResult {
  filePath: string;
  modelId: string | null;
  modelType: ParsedFileModel["fileType"];
  diagnostics: ValidationWarning[];
}

export interface VaultDiagnosticsResult {
  files: VaultDiagnosticsFileResult[];
  checkedFileCount: number;
  filesWithDiagnostics: number;
  errorCount: number;
  warningCount: number;
  noteCount: number;
}

export type VaultDiagnosticsSeverityFilter = "all" | "error" | "warning" | "info";

export interface VaultDiagnosticsFilter {
  severity: VaultDiagnosticsSeverityFilter;
  code: string;
}

export function buildVaultDiagnostics(index: ModelingVaultIndex): VaultDiagnosticsResult {
  const files = Object.values(index.modelsByFilePath)
    .filter((model) => model.fileType !== "markdown")
    .map((model) => ({
      filePath: model.path,
      modelId: getModelId(model),
      modelType: model.fileType,
      diagnostics: buildModelDiagnostics(model, index)
    }))
    .filter((entry) => entry.diagnostics.length > 0)
    .map((entry) => ({ ...entry, diagnostics: sortDiagnostics(dedupeDiagnostics(entry.diagnostics)) }))
    .sort(compareFiles);

  const diagnostics = files.flatMap((entry) => entry.diagnostics);
  return {
    files,
    checkedFileCount: Object.values(index.modelsByFilePath)
      .filter((model) => model.fileType !== "markdown").length,
    filesWithDiagnostics: files.length,
    errorCount: diagnostics.filter((diagnostic) => diagnostic.severity === "error").length,
    warningCount: diagnostics.filter((diagnostic) => diagnostic.severity === "warning").length,
    noteCount: diagnostics.filter((diagnostic) => diagnostic.severity === "info").length
  };
}

export function filterVaultDiagnostics(
  result: VaultDiagnosticsResult,
  filter: VaultDiagnosticsFilter
): VaultDiagnosticsFileResult[] {
  return result.files
    .map((file) => ({
      ...file,
      diagnostics: file.diagnostics.filter((diagnostic) =>
        (filter.severity === "all" || diagnostic.severity === filter.severity) &&
        (filter.code === "all" || diagnostic.code === filter.code)
      )
    }))
    .filter((file) => file.diagnostics.length > 0);
}

export function getVaultDiagnosticCodes(result: VaultDiagnosticsResult): string[] {
  return [...new Set(result.files.flatMap((file) => file.diagnostics.map((diagnostic) => diagnostic.code)))].sort();
}

export function formatVaultDiagnosticsAsMarkdown(
  result: VaultDiagnosticsResult,
  filter: VaultDiagnosticsFilter = { severity: "all", code: "all" }
): string {
  const files = filterVaultDiagnostics(result, filter);
  const diagnostics = files.flatMap((file) => file.diagnostics);
  const lines = [
    "# Model Weave Vault Diagnostics",
    "",
    "## Summary",
    "",
    "- Checked model files: " + String(result.checkedFileCount),
    "- Files with diagnostics: " + String(files.length),
    "- Errors: " + String(diagnostics.filter((item) => item.severity === "error").length),
    "- Warnings: " + String(diagnostics.filter((item) => item.severity === "warning").length),
    "- Notes: " + String(diagnostics.filter((item) => item.severity === "info").length)
  ];

  for (const file of files) {
    lines.push("", "## " + file.filePath);
    for (const diagnostic of file.diagnostics) {
      lines.push("", "- [" + diagnostic.severity + "] `" + diagnostic.code + "`: " + diagnostic.message);
      if (diagnostic.line !== undefined) {
        lines.push("  - Line: " + String(diagnostic.line));
      }
      if (diagnostic.field) {
        lines.push("  - Field: " + diagnostic.field);
      }
    }
  }
  return lines.join("\n") + "\n";
}

function buildModelDiagnostics(model: ParsedFileModel, index: ModelingVaultIndex): ValidationWarning[] {
  const parserWarnings = index.warningsByFilePath[model.path] ?? [];
  if (model.fileType === "markdown") {
    return [];
  }
  if (model.fileType === "diagram" || model.fileType === "dfd-diagram" || model.fileType === "flow-diagram") {
    const resolved = resolveDiagramRelations(model, index);
    return buildCurrentDiagramDiagnostics(resolved, [...parserWarnings, ...resolved.warnings]);
  }
  if (model.fileType === "domain-diagram") {
    const resolved = resolveDomainDiagram(model, index);
    return [...parserWarnings, ...resolved.warnings];
  }
  if (model.fileType === "dfd-object") {
    return [
      ...buildCurrentObjectDiagnostics(model, index, null, parserWarnings),
      ...buildDfdObjectScene(model).warnings
    ];
  }
  if (model.fileType === "object" || model.fileType === "er-entity") {
    const context = resolveObjectContext(model, index);
    return buildCurrentObjectDiagnostics(model, index, context, parserWarnings);
  }
  if (model.fileType === "relations") {
    return parserWarnings;
  }
  return buildCurrentObjectDiagnostics(model, index, null, parserWarnings);
}

function getModelId(model: ParsedFileModel): string | null {
  return "id" in model && typeof model.id === "string" && model.id.trim().length > 0
    ? model.id
    : null;
}

function dedupeDiagnostics(diagnostics: ValidationWarning[]): ValidationWarning[] {
  const seen = new Set<string>();
  return diagnostics.filter((diagnostic) => {
    const key = [
      diagnostic.severity,
      diagnostic.code,
      diagnostic.path ?? diagnostic.filePath ?? "",
      diagnostic.line ?? "",
      diagnostic.field ?? "",
      diagnostic.message
    ].join("\u0000");
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function sortDiagnostics(diagnostics: ValidationWarning[]): ValidationWarning[] {
  return [...diagnostics].sort((left, right) => {
    const severityOrder = severityRank(left.severity) - severityRank(right.severity);
    if (severityOrder !== 0) {
      return severityOrder;
    }
    const lineOrder = (left.line ?? Number.MAX_SAFE_INTEGER) - (right.line ?? Number.MAX_SAFE_INTEGER);
    if (lineOrder !== 0) {
      return lineOrder;
    }
    return left.code.localeCompare(right.code) || left.message.localeCompare(right.message);
  });
}

function compareFiles(left: VaultDiagnosticsFileResult, right: VaultDiagnosticsFileResult): number {
  const leftSeverity = Math.min(...left.diagnostics.map((diagnostic) => severityRank(diagnostic.severity)));
  const rightSeverity = Math.min(...right.diagnostics.map((diagnostic) => severityRank(diagnostic.severity)));
  return leftSeverity - rightSeverity || left.filePath.localeCompare(right.filePath);
}

function severityRank(severity: ValidationWarning["severity"]): number {
  return severity === "error" ? 0 : severity === "warning" ? 1 : 2;
}
