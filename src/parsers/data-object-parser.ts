import { extractMarkdownSections } from "./markdown-sections";
import { parseFrontmatter } from "./frontmatter-parser";
import { parseMarkdownTable } from "./markdown-table";
import type {
  DataObjectField,
  DataObjectModel,
  ValidationWarning
} from "../types/models";

const FIELD_HEADERS = ["name", "type", "required", "ref", "notes"];

export function parseDataObjectFile(
  markdown: string,
  path: string
): {
  file: DataObjectModel | null;
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

  if (frontmatter.type !== "data_object") {
    warnings.push(createWarning(path, "type", 'expected type "data_object"'));
  }
  if (!id) {
    warnings.push(createWarning(path, "id", 'required frontmatter "id" is missing'));
  }
  if (!name) {
    warnings.push(createWarning(path, "name", 'required frontmatter "name" is missing'));
  }

  const fieldsTable = parseMarkdownTable(sections.Fields, FIELD_HEADERS, path, "Fields");
  warnings.push(...fieldsTable.warnings);

  const fallbackName = name || id || getFileStem(path) || "Untitled Data Object";

  const fields: DataObjectField[] = fieldsTable.rows.map((row) => ({
    name: row.name?.trim() ?? "",
    type: row.type?.trim() || undefined,
    required: row.required?.trim() || undefined,
    ref: row.ref?.trim() || undefined,
    notes: row.notes?.trim() || undefined
  }));

  return {
    file: {
      fileType: "data-object",
      schema: "data_object",
      path,
      title: fallbackName,
      frontmatter,
      sections,
      id,
      name: fallbackName,
      kind: kind || undefined,
      summary: joinSectionLines(sections.Summary),
      notes: normalizeNotes(sections.Notes),
      fields
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
