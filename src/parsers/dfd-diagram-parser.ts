import { extractMarkdownSections } from "./markdown-sections";
import { parseFrontmatter } from "./frontmatter-parser";
import { parseMarkdownTable } from "./markdown-table";
import { parseReferenceValue } from "../core/reference-resolver";
import type {
  DiagramEdge,
  DiagramNode,
  DfdDiagramModel,
  DfdFlowModel,
  ValidationWarning
} from "../types/models";

const OBJECT_HEADERS = ["ref", "notes"];
const FLOW_HEADERS = ["id", "from", "to", "data", "notes"];

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

  const objectsTable = parseMarkdownTable(sections.Objects, OBJECT_HEADERS, path, "Objects");
  const flowsTable = parseMarkdownTable(sections.Flows, FLOW_HEADERS, path, "Flows");
  warnings.push(...objectsTable.warnings, ...flowsTable.warnings);

  const fallbackTitle = name || id || getFileStem(path) || "Untitled DFD Diagram";

  const objectRefs = objectsTable.rows
    .map((row) => row.ref?.trim() ?? "")
    .filter(Boolean);
  const nodes: DiagramNode[] = objectRefs.map((ref) => ({
    id: ref,
    ref,
    kind: "process"
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
