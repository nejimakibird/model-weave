import type { SourceLink } from "../types/models";
import { splitMarkdownTableRow } from "./markdown-table";

export function parseSourceLinks(lines: string[] | undefined): SourceLink[] {
  if (!lines) {
    return [];
  }

  const tableLinks = parseSourceLinksTable(lines);
  if (tableLinks.length > 0) {
    return tableLinks;
  }

  return lines
    .map((line) => parseSourceLinkLine(line))
    .filter((link): link is SourceLink => Boolean(link));
}

function parseSourceLinksTable(lines: string[]): SourceLink[] {
  const tableLines = lines
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|"));
  if (tableLines.length < 2) {
    return [];
  }

  const headers = splitMarkdownTableRow(tableLines[0])?.map((header) =>
    normalizeHeader(header)
  );
  if (!headers || headers.length === 0) {
    return [];
  }

  const pathIndex = findHeaderIndex(headers, ["path", "source", "source_path", "file"]);
  if (pathIndex < 0) {
    return [];
  }
  const labelIndex = findHeaderIndex(headers, ["label", "name", "title"]);
  const notesIndex = findHeaderIndex(headers, ["notes", "note", "description"]);

  return tableLines.slice(2)
    .map((line) => splitMarkdownTableRow(line) ?? [])
    .map((cells) => ({
      path: cleanSourcePath(cells[pathIndex]),
      label: labelIndex >= 0 ? cleanOptionalValue(cells[labelIndex]) : undefined,
      notes: notesIndex >= 0 ? cleanOptionalValue(cells[notesIndex]) : undefined
    }))
    .filter((link) => Boolean(link.path));
}

function parseSourceLinkLine(line: string): SourceLink | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }

  const withoutBullet = trimmed.replace(/^[-*]\s+/, "").trim();
  if (!withoutBullet) {
    return null;
  }

  const markdownLink = withoutBullet.match(/^\[([^\]]+)\]\(([^)]+)\)(?:\s*[-:]\s*(.+))?$/);
  if (markdownLink) {
    return {
      path: cleanSourcePath(markdownLink[2]),
      label: cleanOptionalValue(markdownLink[1]),
      notes: cleanOptionalValue(markdownLink[3])
    };
  }

  const [pathValue, notes] = splitPathAndNotes(withoutBullet);
  const path = cleanSourcePath(pathValue);
  return path
    ? {
        path,
        notes: cleanOptionalValue(notes)
      }
    : null;
}

function splitPathAndNotes(value: string): [string, string | undefined] {
  const separator = value.match(/\s+-\s+|\s+:\s+/);
  if (!separator || separator.index === undefined) {
    return [value, undefined];
  }

  return [
    value.slice(0, separator.index),
    value.slice(separator.index + separator[0].length)
  ];
}

function cleanSourcePath(value: string | undefined): string {
  return cleanOptionalValue(value)?.replace(/^`|`$/g, "").trim() ?? "";
}

function cleanOptionalValue(value: string | undefined): string | undefined {
  const cleaned = value?.trim();
  return cleaned ? cleaned : undefined;
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function findHeaderIndex(headers: string[], candidates: string[]): number {
  return headers.findIndex((header) => candidates.includes(header));
}
