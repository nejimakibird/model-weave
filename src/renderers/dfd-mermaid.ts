import type { DiagramNode, DfdObjectModel, DiagramEdge, ResolvedDiagram } from "../types/models";
import type { GraphViewportState } from "./graph-view-shared";
import {
  createMermaidFallbackNotice,
  createMermaidShell,
  renderMermaidSourceIntoShell,
  setMermaidRenderReadyPromise
} from "./mermaid-shared";

export function renderDfdMermaidDiagram(
  diagram: ResolvedDiagram,
  options?: {
    onOpenObject?: (
      objectId: string,
      navigation?: { openInNewLeaf?: boolean }
    ) => void;
    hideTitle?: boolean;
    hideDetails?: boolean;
    forExport?: boolean;
    viewportState?: GraphViewportState;
    onViewportStateChange?: (state: GraphViewportState) => void;
  }
): HTMLElement {
  const shell = createMermaidShell({
    className: "mdspec-diagram mdspec-diagram--dfd",
    title: options?.hideTitle ? undefined : `${diagram.diagram.name} (dfd)`,
    forExport: options?.forExport
  });

  if (!options?.hideDetails) {
    shell.root.appendChild(createFlowDetails(diagram.edges));
  }

  const ready = renderMermaidSourceIntoShell(shell, {
    source: buildDfdMermaidSource(diagram),
    renderIdPrefix: "model_weave_dfd",
    viewportState: options?.viewportState,
    onViewportStateChange: options?.onViewportStateChange
  }).catch(() => {
    shell.root.replaceChildren(
      createMermaidFallbackNotice(
        "DFD Mermaid rendering failed. Check diagnostics and Mermaid compatibility for this diagram."
      )
    );
  });

  setMermaidRenderReadyPromise(shell.root, ready);
  return shell.root;
}

export function buildDfdMermaidSource(diagram: ResolvedDiagram): string {
  const lines: string[] = [
    "flowchart LR",
    "  classDef dfdExternal fill:#fff8e1,stroke:#7c5c00,color:#2f2400,stroke-width:1.5px",
    "  classDef dfdProcess fill:#e9f2ff,stroke:#2f5b9a,color:#12243d,stroke-width:1.5px",
    "  classDef dfdDatastore fill:#eef7ee,stroke:#3b6b47,color:#17311e,stroke-width:1.5px",
    "  classDef dfdOther fill:#f5f7fb,stroke:#5f6b7a,color:#1f2937,stroke-width:1.5px"
  ];

  const nodeIds = new Map<string, string>();
  for (const node of diagram.nodes) {
    const object = node.object?.fileType === "dfd-object" ? node.object : undefined;
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

function createFlowDetails(edges: DiagramEdge[]): HTMLElement {
  const section = document.createElement("details");
  section.className = "mdspec-section";
  section.addClass("model-weave-diagram-details");
  section.open = false;

  const summary = document.createElement("summary");
  summary.textContent = `Displayed flows (${edges.length})`;
  summary.addClass("model-weave-diagram-details-summary");
  section.appendChild(summary);

  if (edges.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No flows are currently used for rendering.";
    empty.addClass("model-weave-diagram-details-empty");
    section.appendChild(empty);
    return section;
  }

  const list = document.createElement("ul");
  list.addClass("model-weave-diagram-details-list");
  for (const edge of edges) {
    const item = document.createElement("li");
    item.addClass("model-weave-diagram-details-item");
    const notes = formatDiagramEdgeNotes(edge.metadata?.notes);
    item.textContent = `${edge.id ?? "-"} / ${edge.source} -> ${edge.target} / ${
      edge.label ?? "-"
    }${notes ? ` / ${notes}` : ""}`;
    list.appendChild(item);
  }
  section.appendChild(list);
  return section;
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
  const kind = object?.kind ?? node.kind;
  switch (kind) {
    case "datastore":
      return `[("${label}")]:::dfdDatastore`;
    case "process":
      return `["${label}"]:::dfdProcess`;
    case "other":
      return `["${label}"]:::dfdOther`;
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
    .replace(/[[\]()]/g, " ")
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDiagramEdgeNotes(notes: unknown): string {
  if (typeof notes === "string") {
    return notes.trim();
  }

  if (Array.isArray(notes)) {
    return notes
      .filter((note): note is string => typeof note === "string" && note.trim().length > 0)
      .join(" / ");
  }

  if (notes && typeof notes === "object") {
    try {
      const serialized = JSON.stringify(notes);
      return typeof serialized === "string" && serialized !== "{}" ? serialized : "";
    } catch {
      return "";
    }
  }

  return "";
}
