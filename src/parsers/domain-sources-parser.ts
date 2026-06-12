import { formatDomainDiagramMissingRefMessage } from "../core/domain-diagnostics";
import { splitMarkdownTableRow } from "./markdown-table";
import type { DomainSourceRef, ValidationWarning } from "../types/models";

const DOMAIN_SOURCE_HEADERS = ["ref"];
const DOMAIN_SOURCE_WITH_NOTES_HEADERS = ["ref", "notes"];

export function parseDomainSourcesTable(
  lines: string[] | undefined,
  path: string
): {
  rows: DomainSourceRef[];
  warnings: ValidationWarning[];
} {
  if (!lines) {
    return { rows: [], warnings: [] };
  }

  const normalizedLines = lines
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|"));

  if (normalizedLines.length < 2) {
    return {
      rows: [],
      warnings:
        normalizedLines.length === 0
          ? []
          : [createTableWarning(
              "invalid-table-row",
              path,
              "Domain Sources",
              'table in section "Domain Sources" is incomplete'
            )]
    };
  }

  const headers = splitMarkdownTableRow(normalizedLines[0]) ?? [];
  const warnings: ValidationWarning[] = [];
  if (!isSupportedDomainSourceHeaders(headers)) {
    warnings.push(
      createTableWarning(
        "invalid-table-column",
        path,
        "Domain Sources",
        'table columns in section "Domain Sources" do not match supported Domain Sources headers'
      )
    );
  }

  const rows: DomainSourceRef[] = [];
  normalizedLines.slice(2).forEach((rowLine, rowIndex) => {
    const values = splitMarkdownTableRow(rowLine) ?? [];
    if (values.length !== headers.length) {
      warnings.push(
        createTableWarning(
          "invalid-table-row",
          path,
          "Domain Sources",
          `table row in section "Domain Sources" has ${values.length} columns, expected ${headers.length}`
        )
      );
      return;
    }

    const row: Record<string, string> = {};
    for (const [index, header] of headers.entries()) {
      row[header] = values[index] ?? "";
    }

    const ref = row.ref?.trim() ?? "";
    if (!ref) {
      warnings.push({
        code: "invalid-structure",
        message: formatDomainDiagramMissingRefMessage(),
        severity: "error",
        path,
        field: "Domain Sources.ref",
        context: { rowIndex: rowIndex + 1 }
      });
      return;
    }

    rows.push({
      ref,
      notes: row.notes?.trim() || undefined,
      rowIndex
    });
  });

  return { rows, warnings };
}

function isSupportedDomainSourceHeaders(headers: string[]): boolean {
  return sameHeaders(headers, DOMAIN_SOURCE_HEADERS) ||
    sameHeaders(headers, DOMAIN_SOURCE_WITH_NOTES_HEADERS);
}

function sameHeaders(actual: string[], expected: string[]): boolean {
  return (
    actual.length === expected.length &&
    actual.every((header, index) => header === expected[index])
  );
}

function createTableWarning(
  code: "invalid-table-column" | "invalid-table-row",
  path: string,
  field: string,
  message: string
): ValidationWarning {
  return {
    code,
    message,
    severity: "warning",
    path,
    field
  };
}
