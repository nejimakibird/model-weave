import { parseFrontmatter } from "./frontmatter-parser";
import { parseMarkdownTable } from "./markdown-table";
import { extractMarkdownSections } from "./markdown-sections";
import type { MessageModel, ValidationWarning } from "../types/models";

const MESSAGE_HEADERS = [
  "message_id",
  "text",
  "severity",
  "timing",
  "audience",
  "active",
  "notes"
];

export function parseMessageFile(
  markdown: string,
  path: string
): { file: MessageModel | null; warnings: ValidationWarning[] } {
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

  if (frontmatter.type !== "message") {
    warnings.push(createWarning(path, "type", 'expected type "message"'));
  }
  if (!id) {
    warnings.push(createWarning(path, "id", 'required frontmatter "id" is missing'));
  }
  if (!name) {
    warnings.push(createWarning(path, "name", 'required frontmatter "name" is missing'));
  }

  const messagesTable = parseMarkdownTable(sections.Messages, MESSAGE_HEADERS, path, "Messages");
  warnings.push(...messagesTable.warnings);

  const fallbackName = name || id || getFileStem(path) || "Untitled Message Set";

  return {
    file: {
      fileType: "message",
      schema: "message",
      path,
      title: fallbackName,
      frontmatter,
      sections,
      id,
      name: fallbackName,
      kind: kind || undefined,
      summary: joinSectionLines(sections.Summary),
      messages: messagesTable.rows
        .map((row) => ({
          messageId: row.message_id?.trim() ?? "",
          text: row.text?.trim() || undefined,
          severity: row.severity?.trim() || undefined,
          timing: row.timing?.trim() || undefined,
          audience: row.audience?.trim() || undefined,
          active: row.active?.trim() || undefined,
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
