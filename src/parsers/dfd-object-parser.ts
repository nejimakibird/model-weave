import { extractMarkdownSections } from "./markdown-sections";
import { parseFrontmatter } from "./frontmatter-parser";
import type { DfdObjectKind, DfdObjectModel, ValidationWarning } from "../types/models";

const DFD_OBJECT_KINDS = new Set<DfdObjectKind>(["external", "process", "datastore"]);

export function parseDfdObjectFile(
  markdown: string,
  path: string
): {
  file: DfdObjectModel | null;
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
  const rawKind = typeof frontmatter.kind === "string" ? frontmatter.kind.trim() : "";

  if (frontmatter.type !== "dfd_object") {
    warnings.push(createWarning(path, "type", 'expected type "dfd_object"'));
  }
  if (!id) {
    warnings.push(createWarning(path, "id", 'required frontmatter "id" is missing'));
  }
  if (!name) {
    warnings.push(createWarning(path, "name", 'required frontmatter "name" is missing'));
  }
  if (!rawKind) {
    warnings.push(createWarning(path, "kind", 'required frontmatter "kind" is missing'));
  } else if (!DFD_OBJECT_KINDS.has(rawKind as DfdObjectKind)) {
    warnings.push({
      code: "invalid-kind",
      message: `invalid dfd_object kind "${rawKind}"`,
      severity: "warning",
      path,
      field: "kind"
    });
  }

  const fallbackName = name || id || getFileStem(path) || "Untitled DFD Object";
  const normalizedKind = DFD_OBJECT_KINDS.has(rawKind as DfdObjectKind)
    ? (rawKind as DfdObjectKind)
    : "process";

  return {
    file: {
      fileType: "dfd-object",
      schema: "dfd_object",
      path,
      title: fallbackName,
      frontmatter,
      sections,
      id,
      name: fallbackName,
      kind: normalizedKind,
      summary: joinSectionLines(sections.Summary),
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
