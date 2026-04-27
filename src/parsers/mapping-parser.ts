import { parseFrontmatter } from "./frontmatter-parser";
import { parseMarkdownTable } from "./markdown-table";
import { extractMarkdownSections } from "./markdown-sections";
import type { MappingModel, ValidationWarning } from "../types/models";

const SCOPE_HEADERS = ["role", "ref", "notes"];
const MAPPING_HEADERS = ["source_ref", "target_ref", "transform", "rule", "required", "notes"];

export function parseMappingFile(
  markdown: string,
  path: string
): { file: MappingModel | null; warnings: ValidationWarning[] } {
  const frontmatterResult = parseFrontmatter(markdown);
  const frontmatter = frontmatterResult.file.frontmatter ?? {};
  const sections = extractMarkdownSections(frontmatterResult.file.body);
  const warnings: ValidationWarning[] = frontmatterResult.warnings.map((warning) => ({
    ...warning,
    path: warning.path ?? path
  }));

  const id = typeof frontmatter.id === "string" ? frontmatter.id.trim() : "";
  const name = typeof frontmatter.name === "string" ? frontmatter.name.trim() : "";
  const kind = typeof frontmatter.kind === "string" ? frontmatter.kind.trim() : "";
  const source = typeof frontmatter.source === "string" ? frontmatter.source.trim() : "";
  const target = typeof frontmatter.target === "string" ? frontmatter.target.trim() : "";

  if (frontmatter.type !== "mapping") {
    warnings.push(createWarning(path, "type", 'expected type "mapping"'));
  }
  if (!id) {
    warnings.push(createWarning(path, "id", 'required frontmatter "id" is missing'));
  }
  if (!name) {
    warnings.push(createWarning(path, "name", 'required frontmatter "name" is missing'));
  }

  const scopeTable = parseMarkdownTable(sections.Scope, SCOPE_HEADERS, path, "Scope");
  const mappingsTable = parseMarkdownTable(sections.Mappings, MAPPING_HEADERS, path, "Mappings");

  warnings.push(...scopeTable.warnings, ...mappingsTable.warnings);

  const fallbackName = name || id || getFileStem(path) || "Untitled Mapping";

  return {
    file: {
      fileType: "mapping",
      schema: "mapping",
      path,
      title: fallbackName,
      frontmatter,
      sections,
      id,
      name: fallbackName,
      kind: kind || undefined,
      source: source || undefined,
      target: target || undefined,
      summary: joinSectionLines(sections.Summary),
      scope: scopeTable.rows
        .map((row) => ({
          role: row.role?.trim() || undefined,
          ref: row.ref?.trim() || undefined,
          notes: row.notes?.trim() || undefined
        }))
        .filter((row) => !isEmptyRow(Object.values(row))),
      mappings: mappingsTable.rows
        .map((row) => ({
          sourceRef: row.source_ref?.trim() || undefined,
          targetRef: row.target_ref?.trim() || undefined,
          transform: row.transform?.trim() || undefined,
          rule: row.rule?.trim() || undefined,
          required: row.required?.trim() || undefined,
          notes: row.notes?.trim() || undefined
        }))
        .filter((row) => !isEmptyRow(Object.values(row))),
      notes: normalizeNotes(sections.Notes)
    },
    warnings
  };
}

function getFileStem(path: string): string {
  return path.replace(/\\/g, "/").split("/").pop()?.replace(/\.md$/i, "") ?? "";
}

function joinSectionLines(lines: string[] | undefined): string | undefined {
  const value = (lines ?? []).join("\n").trim();
  return value || undefined;
}

function normalizeNotes(lines: string[] | undefined): string[] | undefined {
  const notes = (lines ?? [])
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^-\s+/, ""));
  return notes.length > 0 ? notes : undefined;
}

function isEmptyRow(values: Array<string | undefined>): boolean {
  return values.every((value) => !value?.trim());
}

function createWarning(path: string, field: string, message: string): ValidationWarning {
  return {
    code: "invalid-structure",
    message,
    severity: "warning",
    path,
    field
  };
}
