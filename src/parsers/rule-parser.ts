import { parseFrontmatter } from "./frontmatter-parser";
import { parseMarkdownTable } from "./markdown-table";
import { extractMarkdownSections } from "./markdown-sections";
import type { RuleModel, ValidationWarning } from "../types/models";

const INPUT_HEADERS = ["id", "data", "source", "required", "notes"];
const REFERENCE_HEADERS = ["ref", "usage", "notes"];
const MESSAGE_HEADERS = ["condition", "message", "severity", "notes"];

export function parseRuleFile(
  markdown: string,
  path: string
): { file: RuleModel | null; warnings: ValidationWarning[] } {
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

  if (frontmatter.type !== "rule") {
    warnings.push(createWarning(path, "type", 'expected type "rule"'));
  }
  if (!id) {
    warnings.push(createWarning(path, "id", 'required frontmatter "id" is missing'));
  }
  if (!name) {
    warnings.push(createWarning(path, "name", 'required frontmatter "name" is missing'));
  }

  const inputsTable = parseMarkdownTable(sections.Inputs, INPUT_HEADERS, path, "Inputs");
  const referencesTable = parseMarkdownTable(
    sections.References,
    REFERENCE_HEADERS,
    path,
    "References"
  );
  const messagesTable = parseMarkdownTable(sections.Messages, MESSAGE_HEADERS, path, "Messages");

  warnings.push(...inputsTable.warnings, ...referencesTable.warnings, ...messagesTable.warnings);

  const fallbackName = name || id || getFileStem(path) || "Untitled Rule";

  return {
    file: {
      fileType: "rule",
      schema: "rule",
      path,
      title: fallbackName,
      frontmatter,
      sections,
      id,
      name: fallbackName,
      kind: kind || undefined,
      summary: joinSectionLines(sections.Summary),
      inputs: inputsTable.rows
        .map((row) => ({
          id: row.id?.trim() ?? "",
          data: row.data?.trim() || undefined,
          source: row.source?.trim() || undefined,
          required: row.required?.trim() || undefined,
          notes: row.notes?.trim() || undefined
        }))
        .filter((row) => !isEmptyRow(Object.values(row))),
      references: referencesTable.rows
        .map((row) => ({
          ref: row.ref?.trim() || undefined,
          usage: row.usage?.trim() || undefined,
          notes: row.notes?.trim() || undefined
        }))
        .filter((row) => !isEmptyRow(Object.values(row))),
      messages: messagesTable.rows
        .map((row) => ({
          condition: row.condition?.trim() || undefined,
          message: row.message?.trim() || undefined,
          severity: row.severity?.trim() || undefined,
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
