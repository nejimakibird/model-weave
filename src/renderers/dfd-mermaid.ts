import type {
  DiagramNode,
  DfdObjectModel,
  DiagramEdge,
  DfdDiagramModel,
  DomainEntry,
  ResolvedDiagram
} from "../types/models";
import type {
  GraphFitVerticalAlign,
  GraphViewportState
} from "./graph-view-shared";
import {
  buildModelWeaveMermaidClassDef,
  createMermaidFallbackNotice,
  createMermaidShell,
  getModelWeaveMermaidPalette,
  renderMermaidSourceIntoShell,
  setMermaidRenderReadyPromise
} from "./mermaid-shared";
import { modelWeaveText } from "../i18n/language";

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
    fitVerticalAlign?: GraphFitVerticalAlign;
    viewportState?: GraphViewportState;
    onViewportStateChange?: (state: GraphViewportState) => void;
    sourcePanelContainer?: HTMLElement;
    sourcePanelPlacement?: "append" | "prepend";
    showMermaidRenderDebug?: boolean;
  }
): HTMLElement {
  const shell = createMermaidShell({
    className: "mdspec-diagram mdspec-diagram--dfd",
    title: options?.hideTitle ? undefined : `${diagram.diagram.name} (dfd)`,
    forExport: options?.forExport
  });

  if (!options?.hideDetails) {
    shell.root.appendChild(createObjectDetails(diagram));
    shell.root.appendChild(createFlowDetails(diagram.edges));
  }

  const ready = renderMermaidSourceIntoShell(shell, {
    source: buildDfdMermaidSource(diagram),
    renderIdPrefix: "model_weave_dfd",
    fitVerticalAlign: options?.fitVerticalAlign,
    viewportState: options?.viewportState,
    onViewportStateChange: options?.onViewportStateChange,
    showSourcePanel: !options?.forExport,
    sourcePanelContainer: options?.sourcePanelContainer,
    sourcePanelPlacement: options?.sourcePanelPlacement,
    showRenderDebug:
      !options?.forExport && options?.showMermaidRenderDebug === true
  }).catch(() => {
    shell.root.replaceChildren(
      createMermaidFallbackNotice(
        modelWeaveText(
          "DFD Mermaid rendering failed. Check diagnostics and Mermaid compatibility for this diagram.",
          "DFD Mermaid の描画に失敗しました。Diagnostics と Mermaid 互換性を確認してください。"
        )
      )
    );
  });

  setMermaidRenderReadyPromise(shell.root, ready);
  return shell.root;
}

export function buildDfdMermaidSource(diagram: ResolvedDiagram): string {
  const palette = getModelWeaveMermaidPalette();
  const lines: string[] = [
    "flowchart LR",
    `  ${buildModelWeaveMermaidClassDef("dfdExternal", palette.dfdExternalFill, palette.dfdExternalBorder, { strokeWidth: 1.5 })}`,
    `  ${buildModelWeaveMermaidClassDef("dfdProcess", palette.dfdProcessFill, palette.dfdProcessBorder, { strokeWidth: 1.5 })}`,
    `  ${buildModelWeaveMermaidClassDef("dfdDatastore", palette.dfdDatastoreFill, palette.dfdDatastoreBorder, { strokeWidth: 1.5 })}`,
    `  ${buildModelWeaveMermaidClassDef("dfdOther", palette.dfdOtherFill, palette.dfdOtherBorder, { strokeWidth: 1.5 })}`
  ];

  const nodeIds = new Map<string, string>();
  const localDomains = getDfdLocalDomains(diagram);
  const localDomainsById = new Map(localDomains.map((domain) => [domain.id, domain]));
  const groupedNodes = new Map<string, Array<typeof diagram.nodes[number]>>();
  const ungroupedNodes: typeof diagram.nodes = [];

  for (const node of diagram.nodes) {
    const domainId = getNodeDomainId(node);
    if (domainId && localDomainsById.has(domainId)) {
      if (!groupedNodes.has(domainId)) {
        groupedNodes.set(domainId, []);
      }
      groupedNodes.get(domainId)!.push(node);
    } else {
      ungroupedNodes.push(node);
    }
  }

  for (const domain of localDomains) {
    const nodes = groupedNodes.get(domain.id) ?? [];
    if (nodes.length === 0) {
      continue;
    }

    lines.push(`  subgraph ${toMermaidDomainId(domain.id)}["${buildDomainLabel(domain)}"]`);
    for (const node of nodes) {
      const mermaidId = toMermaidNodeId(node.id);
      nodeIds.set(node.id, mermaidId);
      lines.push(`    ${mermaidId}${toMermaidNodeDeclaration(node, getDfdObject(node))}`);
    }
    lines.push("  end");
  }

  for (const node of ungroupedNodes) {
    const mermaidId = toMermaidNodeId(node.id);
    nodeIds.set(node.id, mermaidId);
    lines.push(`  ${mermaidId}${toMermaidNodeDeclaration(node, getDfdObject(node))}`);
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

function getDfdLocalDomains(diagram: ResolvedDiagram): DomainEntry[] {
  return isDfdDiagramModel(diagram.diagram) ? diagram.diagram.domains ?? [] : [];
}

function isDfdDiagramModel(diagram: ResolvedDiagram["diagram"]): diagram is DfdDiagramModel {
  return diagram.schema === "dfd_diagram";
}

function getDfdObject(node: DiagramNode & { object?: unknown }): DfdObjectModel | undefined {
  return node.object && typeof node.object === "object" && "fileType" in node.object &&
    node.object.fileType === "dfd-object"
    ? node.object as DfdObjectModel
    : undefined;
}

function getNodeDomainId(node: DiagramNode): string | undefined {
  const domain = node.metadata?.domain;
  return typeof domain === "string" && domain.trim() ? domain.trim() : undefined;
}

function toMermaidDomainId(value: string): string {
  return `domain_${toMermaidNodeId(value)}`;
}

function buildDomainLabel(domain: DomainEntry): string {
  const displayName = domain.name?.trim() || domain.id;
  const label = domain.kind?.trim() ? `${displayName} [${domain.kind.trim()}]` : displayName;
  return escapeMermaidLabel(label);
}

function createFlowDetails(edges: DiagramEdge[]): HTMLElement {
  const section = activeDocument.createElement("details");
  section.className = "mdspec-section";
  section.addClass("model-weave-diagram-details");
  section.open = false;

  const summary = activeDocument.createElement("summary");
  summary.textContent = `Displayed flows (${edges.length})`;
  summary.addClass("model-weave-diagram-details-summary");
  section.appendChild(summary);

  if (edges.length === 0) {
    const empty = activeDocument.createElement("p");
    empty.textContent = modelWeaveText(
      "No flows are currently used for rendering.",
      "描画に使われている flow はありません。"
    );
    empty.addClass("model-weave-diagram-details-empty");
    section.appendChild(empty);
    return section;
  }

  const list = activeDocument.createElement("ul");
  list.addClass("model-weave-diagram-details-list");
  for (const edge of edges) {
    const item = activeDocument.createElement("li");
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

function createObjectDetails(diagram: ResolvedDiagram): HTMLElement {
  const section = activeDocument.createElement("details");
  section.className = "mdspec-section";
  section.addClass("model-weave-diagram-details");
  section.open = false;

  const summary = activeDocument.createElement("summary");
  summary.textContent = modelWeaveText(
    `Displayed objects (${diagram.nodes.length})`,
    `表示中の object (${diagram.nodes.length})`
  );
  summary.addClass("model-weave-diagram-details-summary");
  section.appendChild(summary);

  if (diagram.nodes.length === 0) {
    const empty = activeDocument.createElement("p");
    empty.textContent = modelWeaveText(
      "No objects are currently used for rendering.",
      "描画に使われている object はありません。"
    );
    empty.addClass("model-weave-diagram-details-empty");
    section.appendChild(empty);
    return section;
  }

  const domainsById = new Map(getDfdLocalDomains(diagram).map((domain) => [domain.id, domain]));
  const list = activeDocument.createElement("ul");
  list.addClass("model-weave-diagram-details-list");
  for (const node of diagram.nodes) {
    const item = activeDocument.createElement("li");
    item.addClass("model-weave-diagram-details-item");
    const domainId = getNodeDomainId(node);
    const domain = domainId ? domainsById.get(domainId) : undefined;
    const domainLabel = domain ? domain.name || domain.id : domainId;
    item.textContent = [
      node.id,
      node.label ?? node.ref ?? "-",
      modelWeaveText("Domain", "Domain") + `: ${domainLabel ?? "-"}`
    ].join(" / ");
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
