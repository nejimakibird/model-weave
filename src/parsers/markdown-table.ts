import type { ValidationWarning } from "../types/models";

export interface MarkdownTableParseResult {
  rows: Array<Record<string, string>>;
  warnings: ValidationWarning[];
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

  const headers = splitTableRow(normalizedLines[0]);
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
    const values = splitTableRow(rowLine);
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

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
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
