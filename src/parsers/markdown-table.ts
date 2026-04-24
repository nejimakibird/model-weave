import type { ValidationWarning } from "../types/models";

export interface MarkdownTableParseResult {
  rows: Array<Record<string, string>>;
  warnings: ValidationWarning[];
}

export interface MarkdownTableCellRange {
  columnIndex: number;
  rawStart: number;
  rawEnd: number;
  contentStart: number;
  contentEnd: number;
}

export function parseMarkdownTable(
  lines: string[] | undefined,
  expectedHeaders: string[],
  path: string,
  sectionName: string
): MarkdownTableParseResult {
  if (!lines) {
    return { rows: [], warnings: [] };
  }

  const normalizedLines = lines
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|"));

  if (normalizedLines.length < 2) {
    return {
      rows: [],
      warnings: normalizedLines.length === 0
        ? []
        : [
            createWarning(
              "invalid-table-row",
              `table in section "${sectionName}" is incomplete`,
              path,
              sectionName
            )
          ]
    };
  }

  const headers = splitMarkdownTableRow(normalizedLines[0]) ?? [];
  const warnings: ValidationWarning[] = [];

  if (!sameHeaders(headers, expectedHeaders)) {
    warnings.push(
      createWarning(
        "invalid-table-column",
        `table columns in section "${sectionName}" do not match expected headers`,
        path,
        sectionName
      )
    );
  }

  const rows: Array<Record<string, string>> = [];

  for (const rowLine of normalizedLines.slice(2)) {
    const values = splitMarkdownTableRow(rowLine) ?? [];
    if (values.length !== headers.length) {
      warnings.push(
        createWarning(
          "invalid-table-row",
          `table row in section "${sectionName}" has ${values.length} columns, expected ${headers.length}`,
          path,
          sectionName
        )
      );
      continue;
    }

    const row: Record<string, string> = {};
    for (const [index, header] of headers.entries()) {
      row[header] = values[index] ?? "";
    }
    rows.push(row);
  }

  return { rows, warnings };
}

export function splitMarkdownTableRow(line: string): string[] | null {
  const ranges = getMarkdownTableCellRanges(line);
  if (!ranges) {
    return null;
  }

  return ranges.map((range) => line.slice(range.contentStart, range.contentEnd).trim());
}

export function getMarkdownTableCellRanges(line: string): MarkdownTableCellRange[] | null {
  const trimmedLine = line.trim();
  if (!trimmedLine.startsWith("|")) {
    return null;
  }

  const separatorIndexes = findMarkdownTableSeparators(line);
  if (separatorIndexes.length === 0) {
    return null;
  }

  const trailingPipeIndex = separatorIndexes[separatorIndexes.length - 1];
  const effectiveSeparators =
    trailingPipeIndex === line.length - 1
      ? separatorIndexes
      : [...separatorIndexes, line.length];

  if (effectiveSeparators.length < 2) {
    return null;
  }

  const cells: MarkdownTableCellRange[] = [];
  for (let columnIndex = 0; columnIndex < effectiveSeparators.length - 1; columnIndex += 1) {
    const rawStart = effectiveSeparators[columnIndex] + 1;
    const rawEnd = effectiveSeparators[columnIndex + 1];
    let contentStart = rawStart;
    let contentEnd = rawEnd;

    while (contentStart < rawEnd && /\s/.test(line[contentStart] ?? "")) {
      contentStart += 1;
    }

    while (contentEnd > rawStart && /\s/.test(line[contentEnd - 1] ?? "")) {
      contentEnd -= 1;
    }

    if (contentStart > contentEnd) {
      contentStart = rawStart;
      contentEnd = rawStart;
    }

    cells.push({
      columnIndex,
      rawStart,
      rawEnd,
      contentStart,
      contentEnd
    });
  }

  return cells;
}

function findMarkdownTableSeparators(line: string): number[] {
  const separators: number[] = [];
  let escaped = false;
  let wikilinkDepth = 0;
  let markdownLinkTextDepth = 0;
  let markdownLinkTargetDepth = 0;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === "[" && next === "[") {
      wikilinkDepth += 1;
      index += 1;
      continue;
    }

    if (char === "]" && next === "]" && wikilinkDepth > 0) {
      wikilinkDepth -= 1;
      index += 1;
      continue;
    }

    if (wikilinkDepth === 0 && markdownLinkTargetDepth === 0 && char === "[") {
      markdownLinkTextDepth += 1;
      continue;
    }

    if (markdownLinkTextDepth > 0 && char === "]" && next === "(") {
      markdownLinkTextDepth -= 1;
      markdownLinkTargetDepth = 1;
      index += 1;
      continue;
    }

    if (markdownLinkTargetDepth > 0) {
      if (char === "(") {
        markdownLinkTargetDepth += 1;
        continue;
      }
      if (char === ")") {
        markdownLinkTargetDepth -= 1;
        continue;
      }
    }

    if (
      char === "|" &&
      wikilinkDepth === 0 &&
      markdownLinkTextDepth === 0 &&
      markdownLinkTargetDepth === 0
    ) {
      separators.push(index);
      continue;
    }
  }

  return separators;
}

function sameHeaders(actual: string[], expected: string[]): boolean {
  if (actual.length !== expected.length) {
    return false;
  }

  return actual.every((header, index) => header === expected[index]);
}

function createWarning(
  code: "invalid-table-column" | "invalid-table-row",
  message: string,
  path: string,
  field: string
): ValidationWarning {
  return {
    code,
    message,
    severity: "warning",
    path,
    field
  };
}
