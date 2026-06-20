import type { App } from "obsidian";
import type {
  DiagramNode,
  DfdObjectModel,
  DiagramEdge,
  DfdDiagramModel,
  DomainEntry,
  ResolvedColorScheme,
  ResolvedColorStyle,
  ResolvedDiagram
} from "../types/models";
import { buildDomainTree, type DomainTreeNode } from "../core/domain-tree";
import { resolveColorStyle } from "../core/color-scheme";
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
import { sanitizeMermaidId } from "./mermaid-helpers";
import { modelWeaveText } from "../i18n/language";
import { attachMermaidNodeInteractions, type GraphInteractionTarget } from "../views/mermaid-node-interactions";

export interface DfdDetailLabels {
  displayedObjects: string;
  displayedFlows: string;
  noObjects: string;
  noFlows: string;
  domainPlacement: string;
  resolved: string;
  unresolved: string;
}

export function renderDfdMermaidDiagram(
  diagram: ResolvedDiagram,
  options?: {
    onOpenObject?: (
      objectId: string,
      navigation?: { openInNewLeaf?: boolean }
    ) => void;
    app?: App;
    interactionSourcePath?: string;
    hideTitle?: boolean;
    hideDetails?: boolean;
    forExport?: boolean;
    fitVerticalAlign?: GraphFitVerticalAlign;
    viewportState?: GraphViewportState;
    onViewportStateChange?: (state: GraphViewportState) => void;
    sourcePanelContainer?: HTMLElement;
    sourcePanelPlacement?: "append" | "prepend";
    sourcePanelTitle?: string;
    sourcePanelCopyLabel?: string;
    showMermaidRenderDebug?: boolean;
    onExportPng?: () => void | Promise<void>;
    onExportAndOpenPng?: () => void | Promise<void>;
    exportPngLabel?: string;
    exportPngTitle?: string;
    exportAndOpenPngLabel?: string;
    exportAndOpenPngTitle?: string;
    colorScheme?: ResolvedColorScheme;
    dfdDetailLabels?: DfdDetailLabels;
  }
): HTMLElement {
  const shell = createMermaidShell({
    className: "mdspec-diagram mdspec-diagram--dfd",
    title: options?.hideTitle ? undefined : `${diagram.diagram.name} (dfd)`,
    forExport: options?.forExport,
    onExportPng: options?.onExportPng,
    onExportAndOpenPng: options?.onExportAndOpenPng,
    exportPngLabel: options?.exportPngLabel,
    exportPngTitle: options?.exportPngTitle,
    exportAndOpenPngLabel: options?.exportAndOpenPngLabel,
    exportAndOpenPngTitle: options?.exportAndOpenPngTitle
  });

  if (!options?.hideDetails) {
    const domainDetails = createDomainPlacementDetails(diagram, options?.dfdDetailLabels);
    if (domainDetails) {
      shell.root.appendChild(domainDetails);
    }
    shell.root.appendChild(createObjectDetails(diagram, options?.dfdDetailLabels));
    shell.root.appendChild(createFlowDetails(diagram.edges, options?.dfdDetailLabels));
  }

  const interactionTargets = buildDfdMermaidInteractionTargets(
    diagram,
    options?.interactionSourcePath ?? diagram.diagram.path
  );

  const ready = renderMermaidSourceIntoShell(shell, {
    source: buildDfdMermaidSource(diagram, options?.colorScheme),
    renderIdPrefix: "model_weave_dfd",
    fitVerticalAlign: options?.fitVerticalAlign,
    viewportState: options?.viewportState,
    onViewportStateChange: options?.onViewportStateChange,
    showSourcePanel: !options?.forExport,
    sourcePanelContainer: options?.sourcePanelContainer,
    sourcePanelPlacement: options?.sourcePanelPlacement,
    sourcePanelTitle: options?.sourcePanelTitle,
    sourcePanelCopyLabel: options?.sourcePanelCopyLabel,
    showRenderDebug:
      !options?.forExport && options?.showMermaidRenderDebug === true
  }).then(() => {
    if (!options?.forExport && options?.app && interactionTargets.length > 0) {
      attachMermaidNodeInteractions({
        app: options.app,
        rootEl: shell.surface,
        targets: interactionTargets,
        source: "model-weave",
        nodeClassName: "model-weave-mermaid-interactive-node",
        dragThreshold: 6,
        hoverParent: (nodeEl, fallback) =>
          nodeEl.closest<HTMLElement>(
            ".model-weave-view-only-stage, .mdspec-diagram--dfd, .model-weave-mermaid-shell"
          ) ?? fallback,
        formatTitle: (target) => target.label
          ? `${target.label} (${target.targetType ?? "model"})`
          : target.linktext
      });
    }
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


function buildDfdMermaidInteractionTargets(
  diagram: ResolvedDiagram,
  sourcePath: string
): GraphInteractionTarget[] {
  return diagram.nodes
    .map((node) => {
      const object = getDfdObject(node);
      if (!object?.path) {
        return null;
      }

      const target: GraphInteractionTarget = {
        mermaidId: toMermaidNodeId(node.id),
        linktext: object.path,
        sourcePath,
        label: node.label ?? object.name ?? node.id,
        kind: "dfd-object",
        targetType: object.fileType,
        filePath: object.path,
        modelId: object.id,
        modelType: object.fileType
      };
      return target;
    })
    .filter((target): target is GraphInteractionTarget => Boolean(target));
}

export function buildDfdMermaidSource(
  diagram: ResolvedDiagram,
  colorScheme?: ResolvedColorScheme
): string {
  const palette = getModelWeaveMermaidPalette();
  const lines: string[] = ["flowchart LR"];
  const colorClasses = new Map<string, ResolvedColorStyle>();
  const domainStyles: string[] = [];
  if (!colorScheme) {
    lines.push(
      `  ${buildModelWeaveMermaidClassDef("dfdExternal", palette.dfdExternalFill, palette.dfdExternalBorder, { strokeWidth: 1.5 })}`,
      `  ${buildModelWeaveMermaidClassDef("dfdProcess", palette.dfdProcessFill, palette.dfdProcessBorder, { strokeWidth: 1.5 })}`,
      `  ${buildModelWeaveMermaidClassDef("dfdDatastore", palette.dfdDatastoreFill, palette.dfdDatastoreBorder, { strokeWidth: 1.5 })}`,
      `  ${buildModelWeaveMermaidClassDef("dfdOther", palette.dfdOtherFill, palette.dfdOtherBorder, { strokeWidth: 1.5 })}`
    );
  }

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

  for (const root of buildDomainTree(localDomains)) {
    appendDfdDomainSubgraph(
      lines,
      root,
      groupedNodes,
      nodeIds,
      1,
      colorScheme,
      colorClasses,
      domainStyles
    );
  }

  for (const node of ungroupedNodes) {
    const mermaidId = toMermaidNodeId(node.id);
    nodeIds.set(node.id, mermaidId);
    lines.push(`  ${mermaidId}${toMermaidNodeDeclaration(
      node,
      getDfdObject(node),
      colorScheme,
      colorClasses
    )}`);
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

  if (colorClasses.size > 0) {
    lines.push("");
    for (const [className, style] of colorClasses) {
      lines.push(`  classDef ${className} ${formatMermaidClassDefStyle(style)}`);
    }
  }

  if (domainStyles.length > 0) {
    lines.push("", ...domainStyles);
  }

  return lines.join("\n");
}

function appendDfdDomainSubgraph(
  lines: string[],
  domainNode: DomainTreeNode,
  groupedNodes: Map<string, Array<DiagramNode & { object?: unknown }>>,
  nodeIds: Map<string, string>,
  depth: number,
  colorScheme: ResolvedColorScheme | undefined,
  colorClasses: Map<string, ResolvedColorStyle>,
  domainStyles: string[]
): boolean {
  const childLines: string[] = [];
  for (const child of domainNode.children) {
    appendDfdDomainSubgraph(
      childLines,
      child,
      groupedNodes,
      nodeIds,
      depth + 1,
      colorScheme,
      colorClasses,
      domainStyles
    );
  }

  const nodes = groupedNodes.get(domainNode.domain.id) ?? [];
  if (nodes.length === 0 && childLines.length === 0) {
    return false;
  }

  const indent = "  ".repeat(depth);
  const domainMermaidId = toMermaidDomainId(domainNode.domain.id);
  lines.push(`${indent}subgraph ${domainMermaidId}["${buildDomainLabel(domainNode.domain)}"]`);
  lines.push(...childLines);
  for (const node of nodes) {
    const mermaidId = toMermaidNodeId(node.id);
    nodeIds.set(node.id, mermaidId);
    lines.push(`${indent}  ${mermaidId}${toMermaidNodeDeclaration(
      node,
      getDfdObject(node),
      colorScheme,
      colorClasses
    )}`);
  }
  lines.push(`${indent}end`);
  if (colorScheme) {
    domainStyles.push(
      `  style ${domainMermaidId} ${formatMermaidClassDefStyle(
        resolveColorStyle(colorScheme, "domain", domainNode.domain.kind)
      )}`
    );
  }
  return true;
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

function createDomainPlacementDetails(
  diagram: ResolvedDiagram,
  labels?: DfdDetailLabels
): HTMLElement | null {
  if (!isDfdDiagramModel(diagram.diagram)) {
    return null;
  }

  const sources = diagram.diagram.domainSourceSummaries ?? [];
  const domainsById = new Map(getDfdLocalDomains(diagram).map((domain) => [domain.id, domain]));
  const placed = diagram.nodes
    .map((node) => ({ node, domainId: getNodeDomainId(node) }))
    .filter((entry): entry is { node: typeof diagram.nodes[number]; domainId: string } =>
      Boolean(entry.domainId)
    );

  if (sources.length === 0 && placed.length === 0) {
    return null;
  }

  const section = activeDocument.createElement("details");
  section.className = "mdspec-section";
  section.addClass("model-weave-diagram-details");
  section.open = false;

  const resolvedCount = placed.filter((entry) => domainsById.has(entry.domainId)).length;
  const summary = activeDocument.createElement("summary");
  summary.textContent = `${labels?.domainPlacement ?? "Domain placement"} (${resolvedCount}/${placed.length} ${
    labels?.resolved ?? "resolved"
  })`;
  summary.addClass("model-weave-diagram-details-summary");
  section.appendChild(summary);

  const list = activeDocument.createElement("ul");
  list.addClass("model-weave-diagram-details-list");
  for (const source of sources) {
    const item = activeDocument.createElement("li");
    item.addClass("model-weave-diagram-details-item");
    item.textContent = [
      modelWeaveText("Source", "Source"),
      source.ref.ref,
      source.status,
      source.resolvedPath ?? "-",
      `${source.domainCount} domains`
    ].join(" / ");
    list.appendChild(item);
  }

  for (const entry of placed) {
    const domain = domainsById.get(entry.domainId);
    const item = activeDocument.createElement("li");
    item.addClass("model-weave-diagram-details-item");
    item.textContent = [
      modelWeaveText("Object", "Object"),
      entry.node.id,
      entry.domainId,
      domain ? labels?.resolved ?? "resolved" : labels?.unresolved ?? "unresolved"
    ].join(" / ");
    list.appendChild(item);
  }

  section.appendChild(list);
  return section;
}

function createFlowDetails(edges: DiagramEdge[], labels?: DfdDetailLabels): HTMLElement {
  const section = activeDocument.createElement("details");
  section.className = "mdspec-section";
  section.addClass("model-weave-diagram-details");
  section.open = false;

  const summary = activeDocument.createElement("summary");
  summary.textContent = `${labels?.displayedFlows ?? "Displayed flows"} (${edges.length})`;
  summary.addClass("model-weave-diagram-details-summary");
  section.appendChild(summary);

  if (edges.length === 0) {
    const empty = activeDocument.createElement("p");
    empty.textContent = labels?.noFlows ?? "No flows are used for rendering.";
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

function createObjectDetails(diagram: ResolvedDiagram, labels?: DfdDetailLabels): HTMLElement {
  const section = activeDocument.createElement("details");
  section.className = "mdspec-section";
  section.addClass("model-weave-diagram-details");
  section.open = false;

  const summary = activeDocument.createElement("summary");
  summary.textContent = `${labels?.displayedObjects ?? "Displayed objects"} (${diagram.nodes.length})`;
  summary.addClass("model-weave-diagram-details-summary");
  section.appendChild(summary);

  if (diagram.nodes.length === 0) {
    const empty = activeDocument.createElement("p");
    empty.textContent = labels?.noObjects ?? "No objects are used for rendering.";
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
  object?: DfdObjectModel,
  colorScheme?: ResolvedColorScheme,
  colorClasses?: Map<string, ResolvedColorStyle>
): string {
  const label = escapeMermaidLabel(node.label ?? object?.name ?? node.ref ?? node.id);
  const kind = object?.kind ?? node.kind;
  const className = colorScheme
    ? registerDfdColorClass(kind, colorScheme, colorClasses)
    : toBuiltInDfdClassName(kind);
  switch (kind) {
    case "datastore":
      return `[("${label}")]:::${className}`;
    case "process":
      return `["${label}"]:::${className}`;
    case "other":
      return `["${label}"]:::${className}`;
    case "external":
    default:
      return `["${label}"]:::${className}`;
  }
}

function registerDfdColorClass(
  kind: string | undefined,
  colorScheme: ResolvedColorScheme,
  colorClasses: Map<string, ResolvedColorStyle> | undefined
): string {
  const className = toDfdColorClassName(kind);
  colorClasses?.set(className, resolveColorStyle(colorScheme, "dfd", kind));
  return className;
}

function toBuiltInDfdClassName(kind: string | undefined): string {
  switch (kind) {
    case "datastore":
      return "dfdDatastore";
    case "process":
      return "dfdProcess";
    case "other":
      return "dfdOther";
    case "external":
    default:
      return "dfdExternal";
  }
}

function toDfdColorClassName(kind: string | undefined): string {
  const suffix = kind?.trim() ? kind.trim() : "default";
  return `kind_dfd_${sanitizeMermaidId(suffix)}`;
}

function formatMermaidClassDefStyle(style: ResolvedColorStyle): string {
  return [
    style.fill ? `fill:${style.fill}` : undefined,
    style.stroke ? `stroke:${style.stroke}` : undefined,
    style.text ? `color:${style.text}` : undefined
  ].filter((entry): entry is string => Boolean(entry)).join(",");
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
