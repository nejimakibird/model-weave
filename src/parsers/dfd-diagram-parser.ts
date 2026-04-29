import { extractMarkdownSections } from "./markdown-sections";
import { parseFrontmatter } from "./frontmatter-parser";
import { parseMarkdownTable } from "./markdown-table";
import { splitMarkdownTableRow } from "./markdown-table";
import { parseReferenceValue } from "../core/reference-resolver";
import type {
  DiagramEdge,
  DiagramNode,
  DfdDiagramModel,
  DfdDiagramObjectEntry,
  DfdFlowModel,
  ValidationWarning
} from "../types/models";

const FLOW_HEADERS = ["id", "from", "to", "data", "notes"];
const LEGACY_OBJECT_HEADERS = ["ref", "notes"];

export function parseDfdDiagramFile(
  markdown: string,
  path: string
): {
  file: DfdDiagramModel | null;
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
  const level =
    typeof frontmatter.level === "string" || typeof frontmatter.level === "number"
      ? String(frontmatter.level).trim()
      : undefined;

  if (frontmatter.type !== "dfd_diagram") {
    warnings.push(createWarning(path, "type", 'expected type "dfd_diagram"'));
  }
  if (!id) {
    warnings.push(createWarning(path, "id", 'required frontmatter "id" is missing'));
  }
  if (!name) {
    warnings.push(createWarning(path, "name", 'required frontmatter "name" is missing'));
  }

  const objectsTable = parseDfdObjectsTable(sections.Objects, path);
  const flowsTable = parseMarkdownTable(sections.Flows, FLOW_HEADERS, path, "Flows");
  warnings.push(...objectsTable.warnings, ...flowsTable.warnings);

  const fallbackTitle = name || id || getFileStem(path) || "Untitled DFD Diagram";

  const objectEntries = objectsTable.rows;
  const objectRefs = objectEntries
    .map((row) => row.id?.trim() || row.ref?.trim() || "")
    .filter(Boolean);
  const nodes: DiagramNode[] = objectEntries.map((entry) => ({
    id: entry.id?.trim() || entry.ref?.trim() || `object-${entry.rowIndex + 1}`,
    ref: entry.ref?.trim() || undefined,
    label: entry.label?.trim() || undefined,
    kind: entry.kind
  }));
  const flows: DfdFlowModel[] = [];
  const edges: DiagramEdge[] = [];

  flowsTable.rows.forEach((row, rowIndex) => {
    const from = row.from?.trim() ?? "";
    const to = row.to?.trim() ?? "";
    const data = row.data?.trim() ?? "";
    const notes = row.notes?.trim() ?? "";
    const flowId = row.id?.trim() ?? "";

    flows.push({
      id: flowId || undefined,
      from,
      to,
      data: data || undefined,
      dataRef: data ? parseReferenceValue(data) ?? undefined : undefined,
      notes: notes || undefined,
      rowIndex
    });

    edges.push({
      id: flowId || undefined,
      source: from,
      target: to,
      kind: "flow",
      label: data || undefined,
      metadata: {
        notes: notes || undefined,
        rowIndex
      }
    });
  });

  return {
    file: {
      fileType: "dfd-diagram",
      schema: "dfd_diagram",
      path,
      title: fallbackTitle,
      frontmatter,
      sections,
      id,
      name: name || fallbackTitle,
      kind: "dfd",
      level,
      description: joinSectionLines(sections.Summary),
      objectRefs,
      objectEntries,
      nodes,
      edges,
      flows
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

function parseDfdObjectsTable(
  lines: string[] | undefined,
  path: string
): {
  rows: DfdDiagramObjectEntry[];
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
          : [createWarning(path, "Objects", 'table in section "Objects" is incomplete')]
    };
  }

  const headers = splitMarkdownTableRow(normalizedLines[0]) ?? [];
  const warnings: ValidationWarning[] = [];
  const hasLegacyHeaders = sameHeaders(headers, LEGACY_OBJECT_HEADERS);
  const hasLocalHeaders =
    headers.includes("id") &&
    headers.includes("label") &&
    headers.includes("kind") &&
    headers.includes("ref");

  if (!hasLegacyHeaders && !hasLocalHeaders) {
    warnings.push(
      createWarning(
        path,
        "Objects",
        'table columns in section "Objects" do not match supported DFD object headers'
      )
    );
  }

  if (hasLegacyHeaders) {
    warnings.push({
      code: "invalid-structure",
      message: "Old ref-only DFD Objects format detected; compatibility mode used.",
      severity: "info",
      path,
      field: "Objects"
    });
  }

  const rows: DfdDiagramObjectEntry[] = [];
  const seenIds = new Set<string>();

  normalizedLines.slice(2).forEach((rowLine, rowIndex) => {
    const values = splitMarkdownTableRow(rowLine) ?? [];
    if (values.length !== headers.length) {
      warnings.push(
        createWarning(
          path,
          "Objects",
          `table row in section "Objects" has ${values.length} columns, expected ${headers.length}`
        )
      );
      return;
    }

    const row: Record<string, string> = {};
    for (const [headerIndex, header] of headers.entries()) {
      row[header] = values[headerIndex] ?? "";
    }

    const id = row.id?.trim() || "";
    const label = row.label?.trim() || "";
    const kind = row.kind?.trim() || "";
    const ref = row.ref?.trim() || "";
    const notes = row.notes?.trim() || "";

    if (!id && !ref) {
      warnings.push({
        code: "invalid-structure",
        message: 'DFD Objects row must have "id" or "ref".',
        severity: "error",
        path,
        field: "Objects",
        context: { rowIndex: rowIndex + 1 }
      });
      return;
    }

    if (id) {
      if (seenIds.has(id)) {
        warnings.push({
          code: "invalid-structure",
          message: `duplicate DFD Objects.id "${id}"`,
          severity: "error",
          path,
          field: "Objects",
          context: { rowIndex: rowIndex + 1 }
        });
      } else {
        seenIds.add(id);
      }
    }

    rows.push({
      id: id || undefined,
      label: label || undefined,
      kind: kind ? normalizeDfdDiagramObjectKind(kind) : undefined,
      ref: ref || undefined,
      notes: notes || undefined,
      rowIndex,
      compatibilityMode: hasLegacyHeaders ? "legacy_ref_only" : "explicit"
    });
  });

  return { rows, warnings };
}

function normalizeDfdDiagramObjectKind(value: string): "external" | "process" | "datastore" | "other" {
  switch (value) {
    case "external":
    case "process":
    case "datastore":
      return value;
    default:
      return "other";
  }
}

function sameHeaders(actual: string[], expected: string[]): boolean {
  return (
    actual.length === expected.length &&
    actual.every((header, index) => header === expected[index])
  );
}
