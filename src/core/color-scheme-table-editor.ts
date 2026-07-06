import {
  getMarkdownTableCellRanges,
  isEmptyMarkdownTableDataRow,
  splitMarkdownTableRow
} from "../parsers/markdown-table";

const COLORS_SECTION_NAME = "Colors";
const COLOR_HEADERS = ["target", "kind", "fill", "stroke", "text", "notes"] as const;
const HEX_RGB_PATTERN = /^#([0-9a-fA-F]{3})$/;
const HEX_RRGGBB_PATTERN = /^#[0-9a-fA-F]{6}$/;

export type ColorSchemeEditableColumn = "fill" | "stroke" | "text";

export interface UpdateColorSchemeCellRequest {
  rowIndex: number;
  columnName: ColorSchemeEditableColumn;
  value: string;
}

export interface UpdateColorSchemeCellResult {
  changed: boolean;
  updatedMarkdown: string;
  status: "updated" | "unchanged" | "invalid-color" | "section-missing" | "table-missing" | "header-mismatch" | "row-missing" | "column-missing";
}

export function updateColorSchemeColorCell(
  markdown: string,
  request: UpdateColorSchemeCellRequest
): UpdateColorSchemeCellResult {
  const normalizedColor = normalizeHexColorForPicker(request.value);
  if (!normalizedColor || !HEX_RRGGBB_PATTERN.test(normalizedColor)) {
    return unchanged(markdown, "invalid-color");
  }

  const columnIndex = COLOR_HEADERS.indexOf(request.columnName);
  if (columnIndex < 0) {
    return unchanged(markdown, "column-missing");
  }

  const lineEnding = markdown.includes("\r\n") ? "\r\n" : "\n";
  const lines = markdown.split(/\r?\n/);
  const sectionRange = findMarkdownSectionRange(lines, COLORS_SECTION_NAME);
  if (!sectionRange) {
    return unchanged(markdown, "section-missing");
  }

  const tableStart = findTableStart(lines, sectionRange.start + 1, sectionRange.end);
  if (tableStart === null || tableStart + 1 >= sectionRange.end) {
    return unchanged(markdown, "table-missing");
  }

  const headers = splitMarkdownTableRow(lines[tableStart]) ?? [];
  if (!sameHeaders(headers, [...COLOR_HEADERS])) {
    return unchanged(markdown, "header-mismatch");
  }

  const separatorCells = splitMarkdownTableRow(lines[tableStart + 1]);
  if (!separatorCells || separatorCells.length !== COLOR_HEADERS.length) {
    return unchanged(markdown, "table-missing");
  }

  const targetLineIndex = findDataRowLineIndex(lines, tableStart + 2, sectionRange.end, request.rowIndex);
  if (targetLineIndex === null) {
    return unchanged(markdown, "row-missing");
  }

  const ranges = getMarkdownTableCellRanges(lines[targetLineIndex]);
  if (!ranges || !ranges[columnIndex]) {
    return unchanged(markdown, "column-missing");
  }

  const range = ranges[columnIndex];
  const line = lines[targetLineIndex];
  const rawCell = line.slice(range.rawStart, range.rawEnd);
  const updatedLine = rawCell.trim().length === 0
    ? `${line.slice(0, range.rawStart)} ${normalizedColor} ${line.slice(range.rawEnd)}`
    : `${line.slice(0, range.contentStart)}${normalizedColor}${line.slice(range.contentEnd)}`;
  if (updatedLine === line) {
    return {
      changed: false,
      updatedMarkdown: markdown,
      status: "unchanged"
    };
  }

  const updatedLines = [...lines];
  updatedLines[targetLineIndex] = updatedLine;
  return {
    changed: true,
    updatedMarkdown: updatedLines.join(lineEnding),
    status: "updated"
  };
}

export function normalizeHexColorForPicker(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const rgb = trimmed.match(HEX_RGB_PATTERN);
  if (rgb) {
    return `#${rgb[1].split("").map((char) => `${char}${char}`).join("")}`.toLowerCase();
  }

  return HEX_RRGGBB_PATTERN.test(trimmed)
    ? trimmed.toLowerCase()
    : null;
}

function findMarkdownSectionRange(
  lines: string[],
  sectionName: string
): { start: number; end: number } | null {
  const headingPattern = /^##\s+(.+?)\s*$/;
  let start: number | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(headingPattern);
    if (!match) {
      continue;
    }

    if (start !== null) {
      return { start, end: index };
    }

    if (normalizeHeadingName(match[1]) === normalizeHeadingName(sectionName)) {
      start = index;
    }
  }

  return start === null ? null : { start, end: lines.length };
}

function findTableStart(lines: string[], start: number, end: number): number | null {
  for (let index = start; index < end; index += 1) {
    if (lines[index].trim().startsWith("|")) {
      return index;
    }
  }
  return null;
}

function findDataRowLineIndex(
  lines: string[],
  start: number,
  end: number,
  targetRowIndex: number
): number | null {
  let currentDataRowIndex = 0;
  for (let index = start; index < end; index += 1) {
    if (!lines[index].trim().startsWith("|")) {
      continue;
    }

    const values = splitMarkdownTableRow(lines[index]);
    if (!values || isEmptyMarkdownTableDataRow(values)) {
      continue;
    }

    if (currentDataRowIndex === targetRowIndex) {
      return index;
    }
    currentDataRowIndex += 1;
  }
  return null;
}

function sameHeaders(actual: string[], expected: string[]): boolean {
  return actual.length === expected.length &&
    actual.every((header, index) => header === expected[index]);
}

function normalizeHeadingName(value: string): string {
  return value.trim().replace(/\s+#+$/, "").trim().toLowerCase();
}

function unchanged(
  markdown: string,
  status: Exclude<UpdateColorSchemeCellResult["status"], "updated" | "unchanged">
): UpdateColorSchemeCellResult {
  return {
    changed: false,
    updatedMarkdown: markdown,
    status
  };
}
