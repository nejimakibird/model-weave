import { extractMarkdownSections } from "./markdown-sections";
import { parseFrontmatter } from "./frontmatter-parser";
import { splitMarkdownTableRow } from "./markdown-table";
import type {
  DataObjectField,
  DataObjectFormatEntry,
  DataObjectModel,
  DataObjectRecord,
  ValidationWarning
} from "../types/models";

const FORMAT_HEADERS = ["key", "value", "notes"] as const;
const RECORD_HEADERS = ["record_type", "name", "occurrence", "notes"] as const;
const FILE_LAYOUT_HINTS = new Set(["record_type", "no", "position", "field_format"]);

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
  const dataFormat =
    typeof frontmatter.data_format === "string" ? frontmatter.data_format.trim() : "";
  const encoding =
    typeof frontmatter.encoding === "string" ? frontmatter.encoding.trim() : "";
  const delimiter =
    typeof frontmatter.delimiter === "string" ? frontmatter.delimiter.trim() : "";
  const lineEnding =
    typeof frontmatter.line_ending === "string" ? frontmatter.line_ending.trim() : "";
  const hasHeader =
    typeof frontmatter.has_header === "string" || typeof frontmatter.has_header === "boolean"
      ? String(frontmatter.has_header).trim()
      : "";
  const recordLength =
    typeof frontmatter.record_length === "string" || typeof frontmatter.record_length === "number"
      ? String(frontmatter.record_length).trim()
      : "";

  if (frontmatter.type !== "data_object") {
    warnings.push(createWarning(path, "type", 'expected type "data_object"'));
  }
  if (!id) {
    warnings.push(createWarning(path, "id", 'required frontmatter "id" is missing'));
  }
  if (!name) {
    warnings.push(createWarning(path, "name", 'required frontmatter "name" is missing'));
  }

  const lines = normalizeLines(markdown);
  const bodyStartLine = getBodyStartLine(lines);
  const sectionRanges = getSectionRanges(lines, bodyStartLine);

  const formatTable = parseSectionTable(lines, sectionRanges.Format, path, "Format");
  const recordsTable = parseSectionTable(lines, sectionRanges.Records, path, "Records");
  const fieldsTable = parseSectionTable(lines, sectionRanges.Fields, path, "Fields");

  warnings.push(...formatTable.warnings, ...recordsTable.warnings, ...fieldsTable.warnings);

  const formatEntries: DataObjectFormatEntry[] = formatTable.rows.map((row) => ({
    key: row.record.key?.trim() ?? "",
    value: row.record.value?.trim() || undefined,
    notes: row.record.notes?.trim() || undefined,
    rowLine: row.line
  }));

  const records: DataObjectRecord[] = recordsTable.rows.map((row) => ({
    recordType: row.record.record_type?.trim() ?? "",
    name: row.record.name?.trim() || undefined,
    occurrence: row.record.occurrence?.trim() || undefined,
    notes: row.record.notes?.trim() || undefined,
    rowLine: row.line
  }));

  const fieldMode = detectFieldMode(fieldsTable.header);
  if (fieldMode === "file_layout" && hasStandardAndFileLayoutColumns(fieldsTable.header)) {
    warnings.push(
      createSectionWarning(
        path,
        "Fields",
        "Fields table mixes standard and file layout columns; parsed as file_layout"
      )
    );
  }

  const fields: DataObjectField[] = fieldsTable.rows.map((row) =>
    fieldMode === "file_layout"
      ? {
          fieldMode,
          recordType: row.record.record_type?.trim() || undefined,
          no: row.record.no?.trim() || undefined,
          name: row.record.name?.trim() ?? "",
          label: row.record.label?.trim() || undefined,
          type: row.record.type?.trim() || undefined,
          length: row.record.length?.trim() || undefined,
          required: row.record.required?.trim() || undefined,
          position: row.record.position?.trim() || undefined,
          fieldFormat: row.record.field_format?.trim() || undefined,
          ref: row.record.ref?.trim() || undefined,
          notes: row.record.notes?.trim() || undefined,
          rowLine: row.line
        }
      : {
          fieldMode,
          name: row.record.name?.trim() ?? "",
          label: row.record.label?.trim() || undefined,
          type: row.record.type?.trim() || undefined,
          length: row.record.length?.trim() || undefined,
          required: row.record.required?.trim() || undefined,
          path: row.record.path?.trim() || undefined,
          ref: row.record.ref?.trim() || undefined,
          notes: row.record.notes?.trim() || undefined,
          rowLine: row.line
        }
  );

  const fallbackName = name || id || getFileStem(path) || "Untitled Data Object";
  const sectionLines = Object.fromEntries(
    Object.entries(sectionRanges)
      .filter(([, range]) => range)
      .map(([key, range]) => [key, range?.headingLine ?? bodyStartLine])
  );

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
      dataFormat: dataFormat || undefined,
      encoding: encoding || undefined,
      delimiter: delimiter || undefined,
      lineEnding: lineEnding || undefined,
      hasHeader: hasHeader || undefined,
      recordLength: recordLength || undefined,
      summary: joinSectionLines(sections.Summary),
      notes: normalizeNotes(sections.Notes),
      formatEntries,
      records,
      fields,
      fieldMode,
      sectionLines
    },
    warnings
  };
}

function normalizeLines(markdown: string): string[] {
  return markdown.replace(/\r\n/g, "\n").split("\n");
}

function getBodyStartLine(lines: string[]): number {
  if ((lines[0] ?? "").trim() !== "---") {
    return 0;
  }

  for (let index = 1; index < lines.length; index += 1) {
    if ((lines[index] ?? "").trim() === "---") {
      return index + 1;
    }
  }

  return 0;
}

function getSectionRanges(
  lines: string[],
  bodyStartLine: number
): Record<string, { headingLine: number; endLine: number } | null> {
  const sectionNames = ["Summary", "Format", "Records", "Fields", "Notes"] as const;
  const ranges: Record<string, { headingLine: number; endLine: number } | null> = {
    Summary: null,
    Format: null,
    Records: null,
    Fields: null,
    Notes: null
  };

  const headings: Array<{ name: string; line: number }> = [];
  for (let index = bodyStartLine; index < lines.length; index += 1) {
    const match = (lines[index] ?? "").trim().match(/^##\s+(.+)$/);
    if (!match) {
      continue;
    }
    const name = match[1].trim();
    if (sectionNames.includes(name as (typeof sectionNames)[number])) {
      headings.push({ name, line: index });
    }
  }

  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index];
    const nextLine = headings[index + 1]?.line ?? lines.length;
    ranges[heading.name] = {
      headingLine: heading.line,
      endLine: nextLine
    };
  }

  return ranges;
}

function parseSectionTable(
  lines: string[],
  range: { headingLine: number; endLine: number } | null,
  path: string,
  section: string
): {
  header: string[];
  rows: Array<{ record: Record<string, string>; line: number }>;
  warnings: ValidationWarning[];
} {
  const warnings: ValidationWarning[] = [];
  if (!range) {
    return { header: [], rows: [], warnings };
  }

  let header: string[] = [];
  const rows: Array<{ record: Record<string, string>; line: number }> = [];

  for (let index = range.headingLine + 1; index < range.endLine; index += 1) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) {
      continue;
    }

    const cells = splitMarkdownTableRow(line);
    if (!cells || cells.length === 0) {
      continue;
    }

    if (isSeparatorRow(cells)) {
      continue;
    }

    if (header.length === 0) {
      header = cells.map((cell) => cell.trim());
      continue;
    }

    const record: Record<string, string> = {};
    for (let columnIndex = 0; columnIndex < header.length; columnIndex += 1) {
      record[header[columnIndex]] = cells[columnIndex] ?? "";
    }

    if (Object.values(record).every((value) => !value.trim())) {
      continue;
    }

    if (cells.length > header.length) {
      warnings.push(
        createSectionWarning(
          path,
          section,
          `table row in section "${section}" has ${cells.length} columns, expected ${header.length}`
        )
      );
    }

    rows.push({ record, line: index });
  }

  if (section === "Format" && header.length > 0 && !matchesHeader(header, FORMAT_HEADERS)) {
    warnings.push(
      createSectionWarning(path, section, 'Format table should use: key | value | notes')
    );
  }
  if (section === "Records" && header.length > 0 && !matchesHeader(header, RECORD_HEADERS)) {
    warnings.push(
      createSectionWarning(
        path,
        section,
        'Records table should use: record_type | name | occurrence | notes'
      )
    );
  }

  return { header, rows, warnings };
}

function detectFieldMode(header: string[]): "standard" | "file_layout" {
  return header.some((cell) => FILE_LAYOUT_HINTS.has(cell)) ? "file_layout" : "standard";
}

function hasStandardAndFileLayoutColumns(header: string[]): boolean {
  const hasFileLayout = header.some((cell) => FILE_LAYOUT_HINTS.has(cell));
  const hasStandardOnly = header.some((cell) => ["path"].includes(cell));
  return hasFileLayout && hasStandardOnly;
}

function matchesHeader(header: string[], expected: readonly string[]): boolean {
  return expected.every((value, index) => header[index] === value);
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
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

function createSectionWarning(
  path: string,
  section: string,
  message: string
): ValidationWarning {
  return {
    code: "invalid-structure",
    message,
    severity: "warning",
    path,
    field: section,
    context: {
      section
    }
  };
}
