import type { DiagramNode, DfdObjectModel, ResolvedDiagram } from "../types/models";

export function buildDfdMermaidSource(diagram: ResolvedDiagram): string {
  const lines: string[] = [
    "flowchart LR",
    "  classDef dfdExternal fill:#fff8e1,stroke:#7c5c00,color:#2f2400,stroke-width:1.5px",
    "  classDef dfdProcess fill:#e9f2ff,stroke:#2f5b9a,color:#12243d,stroke-width:1.5px",
    "  classDef dfdDatastore fill:#eef7ee,stroke:#3b6b47,color:#17311e,stroke-width:1.5px"
  ];

  const nodeIds = new Map<string, string>();
  for (const node of diagram.nodes) {
    const object = node.object as DfdObjectModel | undefined;
    const mermaidId = toMermaidNodeId(node.id);
    nodeIds.set(node.id, mermaidId);
    lines.push(`  ${mermaidId}${toMermaidNodeDeclaration(node, object)}`);
  }

  for (const edge of diagram.edges) {
    const from = nodeIds.get(edge.source);
    const to = nodeIds.get(edge.target);
    if (!from || !to) {
      continue;
    }

    const label = sanitizeMermaidEdgeLabel(edge.label);
    if (label) {
      lines.push(`  ${from} -->|${label}| ${to}`);
    } else {
      lines.push(`  ${from} --> ${to}`);
    }
  }

  return lines.join("\n");
}

export function toMermaidNodeId(value: string): string {
  const normalized = value.replace(/[^A-Za-z0-9_]/g, "_");
  if (/^[A-Za-z_]/.test(normalized)) {
    return normalized;
  }
  return `N_${normalized}`;
}

function toMermaidNodeDeclaration(
  node: DiagramNode,
  object?: DfdObjectModel
): string {
  const label = escapeMermaidLabel(node.label ?? object?.name ?? node.ref ?? node.id);
  switch (object?.kind) {
    case "datastore":
      return `[("${label}")]:::dfdDatastore`;
    case "process":
      return `["${label}"]:::dfdProcess`;
    case "external":
    default:
      return `["${label}"]:::dfdExternal`;
  }
}

function escapeMermaidLabel(value: string): string {
  return value.replace(/"/g, '\\"').replace(/\r?\n/g, "<br/>");
}

function sanitizeMermaidEdgeLabel(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed
    .replace(/\|/g, "/")
    .replace(/[\[\]\(\)]/g, " ")
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
