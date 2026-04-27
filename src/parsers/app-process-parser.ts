import { parseFrontmatter } from "./frontmatter-parser";
import { parseMarkdownTable } from "./markdown-table";
import { extractMarkdownSections } from "./markdown-sections";
import type {
  AppProcessModel,
  ValidationWarning
} from "../types/models";

const INPUT_HEADERS = ["id", "data", "source", "required", "notes"];
const OUTPUT_HEADERS = ["id", "data", "target", "notes"];
const TRIGGER_HEADERS = ["id", "kind", "source", "event", "notes"];
const TRANSITION_HEADERS = ["id", "event", "to", "condition", "notes"];

export function parseAppProcessFile(
  markdown: string,
  path: string
): {
  file: AppProcessModel | null;
  warnings: ValidationWarning[];
} {
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

  if (frontmatter.type !== "app_process") {
    warnings.push(createWarning(path, "type", 'expected type "app_process"'));
  }
  if (!id) {
    warnings.push(createWarning(path, "id", 'required frontmatter "id" is missing'));
  }
  if (!name) {
    warnings.push(createWarning(path, "name", 'required frontmatter "name" is missing'));
  }

  const inputsTable = parseMarkdownTable(sections.Inputs, INPUT_HEADERS, path, "Inputs");
  const outputsTable = parseMarkdownTable(sections.Outputs, OUTPUT_HEADERS, path, "Outputs");
  const triggersTable = parseMarkdownTable(
    sections.Triggers,
    TRIGGER_HEADERS,
    path,
    "Triggers"
  );
  const transitionsTable = parseMarkdownTable(
    sections.Transitions,
    TRANSITION_HEADERS,
    path,
    "Transitions"
  );

  warnings.push(
    ...inputsTable.warnings,
    ...outputsTable.warnings,
    ...triggersTable.warnings,
    ...transitionsTable.warnings
  );

  const fallbackName = name || id || getFileStem(path) || "Untitled App Process";

  return {
    file: {
      fileType: "app-process",
      schema: "app_process",
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
      outputs: outputsTable.rows
        .map((row) => ({
          id: row.id?.trim() ?? "",
          data: row.data?.trim() || undefined,
          target: row.target?.trim() || undefined,
          notes: row.notes?.trim() || undefined
        }))
        .filter((row) => !isEmptyRow(Object.values(row))),
      triggers: triggersTable.rows
        .map((row) => ({
          id: row.id?.trim() ?? "",
          kind: row.kind?.trim() || undefined,
          source: row.source?.trim() || undefined,
          event: row.event?.trim() || undefined,
          notes: row.notes?.trim() || undefined
        }))
        .filter((row) => !isEmptyRow(Object.values(row))),
      transitions: transitionsTable.rows
        .map((row) => ({
          id: row.id?.trim() ?? "",
          event: row.event?.trim() || undefined,
          to: row.to?.trim() || undefined,
          condition: row.condition?.trim() || undefined,
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

function createWarning(
  path: string,
  field: string,
  message: string
): ValidationWarning {
  return {
    code: "invalid-structure",
    message,
    severity: "warning",
    path,
    field
  };
}
