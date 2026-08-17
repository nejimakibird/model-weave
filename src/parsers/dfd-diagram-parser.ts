import { extractMarkdownSections } from "./markdown-sections";
import { parseFrontmatter } from "./frontmatter-parser";
import { isEmptyMarkdownTableDataRow, parseMarkdownTable, splitMarkdownTableRow } from "./markdown-table";
import { parseSourceLinks } from "./source-links-parser";
import { parseDomainEntries, validateDomainEntries } from "./domains-parser";
import { parseDomainSourcesTable } from "./domain-sources-parser";
import { parseReferenceValue } from "../core/reference-resolver";
import type {
  DiagramEdge,
  DiagramNode,
  DfdDiagramModel,
  DfdDiagramObjectEntry,
  DfdFlowModel,
  FlowDiagramModel,
  FlowDiagramObjectKind,
  ValidationWarning
} from "../types/models";

const DFD_FLOW_HEADERS = ["id", "from", "to", "data", "notes"];
const FLOW_DIAGRAM_FLOW_HEADERS = ["id", "from", "to", "kind", "trigger", "data", "condition", "notes"];
const OBJECT_HEADERS = ["id", "label", "kind", "ref", "domain", "notes"];
const DFD_OBJECT_HEADERS_WITHOUT_DOMAIN = ["id", "label", "kind", "ref", "notes"];
const LEGACY_OBJECT_HEADERS = ["ref", "notes"];
const FLOW_OBJECT_KINDS = new Set<string>([
  "screen",
  "actor",
  "user",
  "message",
  "data",
  "api",
  "service",
  "handler",
  "process",
  "app_process",
  "context",
  "work_object",
  "session",
  "store",
  "datastore",
  "external",
  "unknown"
]);

export function parseDfdDiagramFile(
  markdown: string,
  path: string
): {
  file: DfdDiagramModel | null;
  warnings: ValidationWarning[];
} {
  return parseDfdLikeDiagramFile(markdown, path, {
    type: "dfd_diagram",
    fileType: "dfd-diagram",
    schema: "dfd_diagram",
    defaultTitle: "Untitled DFD Diagram",
    defaultKind: "dfd",
    allowLegacyObjects: true,
    requireObjectId: false
  }) as { file: DfdDiagramModel | null; warnings: ValidationWarning[] };
}

export function parseFlowDiagramFile(
  markdown: string,
  path: string
): {
  file: FlowDiagramModel | null;
  warnings: ValidationWarning[];
} {
  return parseDfdLikeDiagramFile(markdown, path, {
    type: "flow_diagram",
    fileType: "flow-diagram",
    schema: "flow_diagram",
    defaultTitle: "Untitled Flow Diagram",
    defaultKind: "screen_communication",
    allowLegacyObjects: false,
    requireObjectId: true
  }) as { file: FlowDiagramModel | null; warnings: ValidationWarning[] };
}

function parseDfdLikeDiagramFile(
  markdown: string,
  path: string,
  options: {
    type: "dfd_diagram" | "flow_diagram";
    fileType: "dfd-diagram" | "flow-diagram";
    schema: "dfd_diagram" | "flow_diagram";
    defaultTitle: string;
    defaultKind: "dfd" | "screen_communication";
    allowLegacyObjects: boolean;
    requireObjectId: boolean;
  }
): {
  file: DfdDiagramModel | FlowDiagramModel | null;
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
  const kind = typeof frontmatter.kind === "string" && frontmatter.kind.trim()
    ? frontmatter.kind.trim()
    : options.defaultKind;
  const flowView = parseFlowDiagramViewMode(frontmatter.flow_view);
  const flowViewRaw = frontmatter.flow_view;
  const flowViewSpecified = options.schema === "flow_diagram" && !isUnknownFlowDiagramViewMode(frontmatter.flow_view) && typeof frontmatter.flow_view === "string" && frontmatter.flow_view.trim().length > 0;

  const rawType = typeof frontmatter.type === "string" ? frontmatter.type.trim() : "";
  const isAcceptedType = rawType === options.type ||
    (options.type === "flow_diagram" && rawType === "flow-diagram");
  if (!isAcceptedType) {
    warnings.push(createWarning(path, "type", `expected type "${options.type}"`));
  }
  if (!id) {
    warnings.push(createWarning(path, "id", 'required frontmatter "id" is missing'));
  }
  if (!name) {
    warnings.push(createWarning(path, "name", 'required frontmatter "name" is missing'));
  }
  if (options.schema === "flow_diagram" && kind !== "screen_communication") {
    warnings.push(createWarning(path, "kind", 'expected kind "screen_communication"'));
  }
  if (options.schema === "flow_diagram" && isUnknownFlowDiagramViewMode(frontmatter.flow_view)) {
    warnings.push(createWarning(path, "flow_view", 'unknown flow_view; expected "detail" or "screen"'));
  }

  const objectsTable = parseDfdObjectsTable(sections.Objects, path, {
    schema: options.schema,
    allowLegacyObjects: options.allowLegacyObjects,
    requireObjectId: options.requireObjectId
  });
  const domainsTable = parseDomainEntries(sections.Domains, path);
  const domainSourcesTable = parseDomainSourcesTable(sections["Domain Sources"], path);
  const flowHeaders = options.schema === "flow_diagram" ? FLOW_DIAGRAM_FLOW_HEADERS : DFD_FLOW_HEADERS;
  const flowsTable = parseMarkdownTable(sections.Flows, flowHeaders, path, "Flows");
  const hasInvalidFlowsHeader = flowsTable.warnings.some(
    (warning) => warning.code === "invalid-table-column"
  );
  warnings.push(
    ...domainsTable.warnings,
    ...validateDomainEntries(path, domainsTable.rows, {
      skipUnknownParents: domainSourcesTable.rows.length > 0
    }),
    ...domainSourcesTable.warnings,
    ...objectsTable.warnings,
    ...flowsTable.warnings
  );

  const fallbackTitle = name || id || getFileStem(path) || options.defaultTitle;

  const objectEntries = objectsTable.rows;
  const objectRefs = objectEntries
    .map((row) => options.schema === "flow_diagram"
      ? row.ref?.trim() || ""
      : row.id?.trim() || row.ref?.trim() || "")
    .filter(Boolean);
  const nodes: DiagramNode[] = objectEntries.map((entry) => ({
    id: entry.id?.trim() || entry.ref?.trim() || `object-${entry.rowIndex + 1}`,
    ref: entry.ref?.trim() || undefined,
    label: entry.label?.trim() || undefined,
    kind: entry.kind,
    metadata: {
      domain: entry.domain,
      rowIndex: entry.rowIndex
    }
  }));
  const flows: DfdFlowModel[] = [];
  const edges: DiagramEdge[] = [];

  if (!hasInvalidFlowsHeader) {
    flowsTable.rows.forEach((row, rowIndex) => {
      const from = row.from?.trim() ?? "";
      const to = row.to?.trim() ?? "";
      const flowKind = options.schema === "flow_diagram" ? row.kind?.trim() ?? "" : "";
      const trigger = options.schema === "flow_diagram" ? row.trigger?.trim() ?? "" : "";
      const data = row.data?.trim() ?? "";
      const condition = options.schema === "flow_diagram" ? row.condition?.trim() ?? "" : "";
      const notes = row.notes?.trim() ?? "";
      const flowId = row.id?.trim() ?? "";

      if (!flowId) {
        warnings.push({
          code: "invalid-structure",
          message: `${options.schema === "flow_diagram" ? "Flow Diagram" : "DFD"} Flows row must have "id".`,
          severity: "error",
          path,
          field: "Flows",
          context: { rowIndex: rowIndex + 1 }
        });
      }
      if (!from) {
        warnings.push({
          code: "invalid-structure",
          message: `${options.schema === "flow_diagram" ? "Flow Diagram" : "DFD"} Flows row must have "from".`,
          severity: "error",
          path,
          field: "Flows",
          context: { rowIndex: rowIndex + 1 }
        });
      }
      if (!to) {
        warnings.push({
          code: "invalid-structure",
          message: `${options.schema === "flow_diagram" ? "Flow Diagram" : "DFD"} Flows row must have "to".`,
          severity: "error",
          path,
          field: "Flows",
          context: { rowIndex: rowIndex + 1 }
        });
      }

      flows.push({
        id: flowId || undefined,
        from,
        to,
        kind: flowKind || undefined,
        trigger: trigger || undefined,
        data: data || undefined,
        dataRef: data ? parseReferenceValue(data) ?? undefined : undefined,
        condition: condition || undefined,
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
          flowKind: flowKind || undefined,
          trigger: trigger || undefined,
          dataRaw: data || undefined,
          condition: condition || undefined,
          rowIndex
        }
      });
    });
  }

  if (options.schema === "flow_diagram") {
    return {
      file: {
        fileType: "flow-diagram",
        schema: "flow_diagram",
        path,
        title: fallbackTitle,
        frontmatter,
        sections,
        sourceLinks: parseSourceLinks(sections["Source Links"]),
        id,
        name: name || fallbackTitle,
        kind: "screen_communication",
        description: joinSectionLines(sections.Summary),
        flowView,
        flowViewSpecified,
        flowViewRaw,
        domainSources: domainSourcesTable.rows,
        domains: domainsTable.rows,
        objectRefs,
        objectEntries,
        nodes,
        edges,
        flows
      },
      warnings
    };
  }

  return {
    file: {
      fileType: "dfd-diagram",
      schema: "dfd_diagram",
      path,
      title: fallbackTitle,
      frontmatter,
      sections,
      sourceLinks: parseSourceLinks(sections["Source Links"]),
      id,
      name: name || fallbackTitle,
      kind: "dfd",
      level,
      description: joinSectionLines(sections.Summary),
      domainSources: domainSourcesTable.rows,
      domains: domainsTable.rows,
      objectRefs,
      objectEntries,
      nodes,
      edges,
      flows
    },
    warnings
  };
}

function parseFlowDiagramViewMode(value: unknown): "detail" | "screen" {
  return typeof value === "string" && value.trim() === "screen" ? "screen" : "detail";
}

function isUnknownFlowDiagramViewMode(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0 && value.trim() !== "detail" && value.trim() !== "screen";
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

function createTableWarning(
  path: string,
  field: string,
  message: string
): ValidationWarning {
  return {
    code: "invalid-table-column",
    message,
    severity: "warning",
    path,
    field
  };
}

function parseDfdObjectsTable(
  lines: string[] | undefined,
  path: string,
  options: {
    schema: "dfd_diagram" | "flow_diagram";
    allowLegacyObjects: boolean;
    requireObjectId: boolean;
  }
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
          : [{
              code: "invalid-table-row",
              message: 'table in section "Objects" is incomplete',
              severity: "warning",
              path,
              field: "Objects"
            }]
    };
  }

  const headers = splitMarkdownTableRow(normalizedLines[0]) ?? [];
  const warnings: ValidationWarning[] = [];
  const hasLegacyHeaders = options.allowLegacyObjects && sameHeaders(headers, LEGACY_OBJECT_HEADERS);
  const hasLocalHeaders = sameHeaders(headers, OBJECT_HEADERS) ||
    (options.schema === "dfd_diagram" && sameHeaders(headers, DFD_OBJECT_HEADERS_WITHOUT_DOMAIN));

  if (!hasLegacyHeaders && !hasLocalHeaders) {
    warnings.push(
      createTableWarning(
        path,
        "Objects",
        options.schema === "flow_diagram"
          ? 'table columns in section "Objects" do not match expected headers'
          : 'table columns in section "Objects" do not match supported DFD object headers'
      )
    );
    return { rows: [], warnings };
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
    if (isEmptyMarkdownTableDataRow(values)) {
      return;
    }
    if (values.length !== headers.length) {
      warnings.push({
        code: "invalid-table-row",
        message: `table row in section "Objects" has ${values.length} columns, expected ${headers.length}`,
        severity: "warning",
        path,
        field: "Objects"
      });
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
    const domain = row.domain?.trim() || "";
    const notes = row.notes?.trim() || "";

    if (options.requireObjectId ? !id : !id && !ref) {
      warnings.push({
        code: "invalid-structure",
        message: options.schema === "flow_diagram"
          ? 'Flow Diagram Objects row must have "id".'
          : 'DFD Objects row must have "id" or "ref".',
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
          message: `duplicate ${options.schema === "flow_diagram" ? "Flow Diagram" : "DFD"} Objects.id "${id}"`,
          severity: "error",
          path,
          field: "Objects",
          context: { rowIndex: rowIndex + 1 }
        });
      } else {
        seenIds.add(id);
      }
    }

    if (kind && options.schema === "dfd_diagram" && !isSupportedDfdDiagramObjectKind(kind)) {
      warnings.push({
        code: "invalid-structure",
        message: `unknown DFD object kind "${kind}"`,
        severity: "warning",
        path,
        field: "Objects",
        context: { rowIndex: rowIndex + 1 }
      });
    }

    rows.push({
      id: id || undefined,
      label: label || undefined,
      kind: kind ? normalizeDiagramObjectKind(kind, options.schema) : undefined,
      ref: ref || undefined,
      domain: domain || undefined,
      notes: notes || undefined,
      rowIndex,
      compatibilityMode: hasLegacyHeaders ? "legacy_ref_only" : "explicit"
    });
  });

  return { rows, warnings };
}

function normalizeDiagramObjectKind(
  value: string,
  schema: "dfd_diagram" | "flow_diagram"
): DfdDiagramObjectEntry["kind"] {
  if (schema === "flow_diagram") {
    return (FLOW_OBJECT_KINDS.has(value) ? value : "unknown") as FlowDiagramObjectKind;
  }
  return normalizeDfdDiagramObjectKind(value);
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

function isSupportedDfdDiagramObjectKind(value: string): boolean {
  return value === "external" || value === "process" || value === "datastore" || value === "other";
}

function sameHeaders(actual: string[], expected: string[]): boolean {
  return (
    actual.length === expected.length &&
    actual.every((header, index) => header === expected[index])
  );
}
