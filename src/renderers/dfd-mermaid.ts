import type { App } from "obsidian";
import type {
  DiagramNode,
  DfdObjectModel,
  DiagramEdge,
  DfdDiagramModel,
  DomainEntry,
  FlowDiagramModel,
  FlowDiagramViewMode,
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
import { parseReferenceValue } from "../core/reference-resolver";
import { modelWeaveText } from "../i18n/language";
import {
  attachGraphElementHoverPreview,
  attachMermaidNodeInteractions,
  type GraphInteractionHoverRow,
  type GraphInteractionTarget
} from "../views/mermaid-node-interactions";

export interface DfdDetailLabels {
  displayedObjects: string;
  displayedFlows: string;
  noObjects: string;
  noFlows: string;
  domainPlacement: string;
  resolved: string;
  unresolved: string;
}

export interface FlowDiagramHoverMetadata {
  objects: GraphInteractionTarget[];
  flows: FlowDiagramFlowHoverTarget[];
}

export interface FlowDiagramFlowHoverTarget extends GraphInteractionTarget {
  edgeId?: string;
  source: string;
  target: string;
  flowKind?: string;
  trigger?: string;
  data?: string;
  condition?: string;
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
    flowDiagramViewMode?: FlowDiagramViewMode;
    colorScheme?: ResolvedColorScheme;
    dfdDetailLabels?: DfdDetailLabels;
  }
): HTMLElement {
  const shell = createMermaidShell({
    className: isFlowDiagramModel(diagram.diagram)
      ? "mdspec-diagram mdspec-diagram--flow-diagram"
      : "mdspec-diagram mdspec-diagram--dfd",
    title: options?.hideTitle
      ? undefined
      : isFlowDiagramModel(diagram.diagram)
        ? `${diagram.diagram.name} (flow diagram)`
        : `${diagram.diagram.name} (dfd)`,
    forExport: options?.forExport,
    onExportPng: options?.onExportPng,
    onExportAndOpenPng: options?.onExportAndOpenPng,
    exportPngLabel: options?.exportPngLabel,
    exportPngTitle: options?.exportPngTitle,
    exportAndOpenPngLabel: options?.exportAndOpenPngLabel,
    exportAndOpenPngTitle: options?.exportAndOpenPngTitle
  });

  const renderedDiagram = getFlowDiagramRenderedDiagram(diagram, options?.flowDiagramViewMode);

  if (!options?.hideDetails) {
    const domainDetails = createDomainPlacementDetails(renderedDiagram, options?.dfdDetailLabels);
    if (domainDetails) {
      shell.root.appendChild(domainDetails);
    }
    shell.root.appendChild(createObjectDetails(renderedDiagram, options?.dfdDetailLabels));
    shell.root.appendChild(createFlowDetails(renderedDiagram.edges, options?.dfdDetailLabels));
  }

  const sourcePath = options?.interactionSourcePath ?? diagram.diagram.path;
  const flowHoverMetadata = isFlowDiagramModel(renderedDiagram.diagram)
    ? buildFlowDiagramHoverMetadata(renderedDiagram, sourcePath)
    : null;
  const interactionTargets = flowHoverMetadata?.objects ?? buildDfdMermaidInteractionTargets(
    renderedDiagram,
    sourcePath
  );

  const ready = renderMermaidSourceIntoShell(shell, {
    source: buildDfdMermaidSource(renderedDiagram, options?.colorScheme),
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
    if (!options?.forExport && options?.app && flowHoverMetadata) {
      attachFlowDiagramFlowHoverPreviews(
        shell.surface,
        flowHoverMetadata.flows,
        options.app,
        options?.showMermaidRenderDebug === true
      );
    }
    if (!options?.forExport && options?.app && interactionTargets.length > 0) {
      attachMermaidNodeInteractions({
        app: options.app,
        rootEl: shell.surface,
        targets: interactionTargets,
        source: "model-weave",
        nodeClassName: "model-weave-mermaid-interactive-node",
        dragThreshold: 6,
        isDebugEnabled: () => options?.showMermaidRenderDebug === true,
        debugName: isFlowDiagramModel(renderedDiagram.diagram) ? "Flow Diagram Mermaid" : "DFD Mermaid",
        formatTitle: (target) => target.label
          ? `${target.label} (${target.targetType ?? "model"})`
          : target.linktext,
        openLinkText: isFlowDiagramModel(diagram.diagram)
          ? (target, event) => {
              const linktext = getFlowDiagramOpenLinkText(target);
              if (!linktext) {
                return;
              }
              return options.app?.workspace.openLinkText(
                linktext,
                target.sourcePath,
                event.ctrlKey || event.metaKey
              );
            }
          : undefined
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


export function buildFlowDiagramHoverMetadata(
  diagram: ResolvedDiagram,
  sourcePath: string
): FlowDiagramHoverMetadata {
  if (!isFlowDiagramModel(diagram.diagram)) {
    return { objects: [], flows: [] };
  }

  const objects = diagram.nodes.map((node) => {
    const rows = buildFlowDiagramObjectHoverRows(node);
    const hoverTitle = "Flow Object";
    const target: GraphInteractionTarget = {
      mermaidId: toMermaidNodeId(node.id),
      linktext: getFlowDiagramFallbackLinktext(sourcePath),
      sourcePath,
      label: node.label ?? node.id,
      kind: "flow-diagram-object",
      targetType: "flow_diagram_object",
      filePath: getStringMetadata(node.metadata, "refModelPath"),
      modelId: node.id,
      modelType: "flow-diagram",
      nodeId: node.id,
      hoverTitle,
      hoverRows: rows,
      hoverText: formatHoverText(hoverTitle, rows),
      previewLinktext: getResolvedPreviewLinktext(node.ref, getStringMetadata(node.metadata, "refModelPath")),
      nativeTooltip: formatFlowDiagramObjectTooltip(node)
    };
    return target;
  });

  const flows = diagram.edges.map((edge, index) => {
    const data = getStringMetadata(edge.metadata, "dataRaw");
    const rows = buildFlowDiagramFlowHoverRows(edge, data);
    const hoverTitle = "Flow";
    return {
      mermaidId: toFlowDiagramFlowMermaidId(edge, index),
      linktext: getFlowDiagramFallbackLinktext(sourcePath),
      sourcePath,
      edgeId: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      flowKind: getStringMetadata(edge.metadata, "flowKind"),
      trigger: getStringMetadata(edge.metadata, "trigger"),
      data,
      condition: getStringMetadata(edge.metadata, "condition"),
      kind: "flow-diagram-flow",
      targetType: "flow_diagram_flow",
      modelId: edge.id,
      modelType: "flow-diagram",
      filePath: getStringMetadata(edge.metadata, "dataModelPath"),
      hoverTitle,
      hoverRows: rows,
      hoverText: formatHoverText(hoverTitle, rows),
      previewLinktext: getResolvedPreviewLinktext(data, getStringMetadata(edge.metadata, "dataModelPath")),
      nativeTooltip: formatFlowDiagramFlowTooltip(edge, data)
    };
  });

  return { objects, flows };
}

function formatFlowDiagramObjectTooltip(node: DiagramNode): string {
  const lines = [
    `Flow Object: ${node.id}`,
    node.label,
    `kind: ${typeof node.kind === "string" ? node.kind : "-"}`,
    `domain: ${getStringMetadata(node.metadata, "domain") ?? "-"}`,
    `ref: ${node.ref?.trim() || "-"}`
  ];
  const notes = formatDiagramEdgeNotes(node.metadata?.notes);
  if (notes) {
    lines.push(notes);
  }
  return lines.filter((line): line is string => Boolean(line && line.trim())).join("\n");
}

function formatFlowDiagramFlowTooltip(edge: DiagramEdge, data: string | undefined): string {
  const lines = [
    `Flow: ${edge.id ?? "-"}`,
    `${edge.source} -> ${edge.target}`,
    `kind: ${getStringMetadata(edge.metadata, "flowKind") ?? "-"}`,
    `trigger: ${getStringMetadata(edge.metadata, "trigger") ?? "-"}`,
    `data: ${data?.trim() || "-"}`,
    `condition: ${getStringMetadata(edge.metadata, "condition") ?? "-"}`
  ];
  const notes = formatDiagramEdgeNotes(edge.metadata?.notes);
  if (notes) {
    lines.push(notes);
  }
  return lines.join("\n");
}

function buildFlowDiagramObjectHoverRows(node: DiagramNode): GraphInteractionHoverRow[] {
  return [
    { label: "id", value: node.id },
    { label: "label", value: node.label },
    { label: "kind", value: typeof node.kind === "string" ? node.kind : undefined },
    { label: "domain", value: getStringMetadata(node.metadata, "domain") },
    { label: "ref", value: node.ref },
    { label: "notes", value: formatDiagramEdgeNotes(node.metadata?.notes) }
  ];
}

function buildFlowDiagramFlowHoverRows(edge: DiagramEdge, data: string | undefined): GraphInteractionHoverRow[] {
  return [
    { label: "id", value: edge.id },
    { label: "from", value: edge.source },
    { label: "to", value: edge.target },
    { label: "kind", value: getStringMetadata(edge.metadata, "flowKind") },
    { label: "trigger", value: getStringMetadata(edge.metadata, "trigger") },
    { label: "data", value: data },
    { label: "condition", value: getStringMetadata(edge.metadata, "condition") },
    { label: "notes", value: formatDiagramEdgeNotes(edge.metadata?.notes) }
  ];
}

function formatHoverText(title: string, rows: GraphInteractionHoverRow[]): string {
  return [
    title,
    ...rows.map((row) => `${row.label}: ${formatHoverValue(row.value)}`)
  ].join("\n");
}

function formatHoverValue(value: string | undefined): string {
  const trimmed = value?.trim();
  return trimmed || "-";
}

function getStringMetadata(metadata: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = metadata?.[key];
  return typeof value === "string" ? value : undefined;
}

function toFlowDiagramFlowMermaidId(edge: DiagramEdge, index: number): string {
  const id = edge.id?.trim() || `${edge.source}_${edge.target}_${index + 1}`;
  return `FLOW_${index + 1}_${toMermaidNodeId(id)}`;
}

function getResolvedPreviewLinktext(rawReference: string | undefined, resolvedPath: string | undefined): string | undefined {
  if (!resolvedPath) {
    return undefined;
  }

  const trimmed = rawReference?.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = parseReferenceValue(trimmed);
  return parsed?.kind === "wikilink" || parsed?.kind === "markdown_link"
    ? resolvedPath
    : undefined;
}

function getFlowDiagramFallbackLinktext(sourcePath: string): string {
  return sourcePath;
}

function getFlowDiagramOpenLinkText(target: GraphInteractionTarget): string | null {
  const linktext = target.previewLinktext?.trim() || target.filePath?.trim();
  return linktext ? linktext : null;
}

function attachFlowDiagramFlowHoverPreviews(
  rootEl: HTMLElement,
  flowTargets: FlowDiagramFlowHoverTarget[],
  app: App,
  showMermaidRenderDebug: boolean
): void {
  if (flowTargets.length === 0) {
    return;
  }

  const svg = rootEl.querySelector<SVGElement>("svg");
  if (!svg) {
    return;
  }

  const edgeLabels = Array.from(svg.querySelectorAll<SVGElement>("g.edgeLabel"));
  flowTargets.forEach((target, index) => {
    const labelEl = edgeLabels[index];
    if (!labelEl) {
      return;
    }
    setSvgNativeTooltip(labelEl, target.nativeTooltip);
    labelEl.addClass("model-weave-mermaid-interactive-flow");
    labelEl.setAttribute("data-model-weave-flow-id", target.edgeId ?? target.mermaidId);
    attachGraphElementHoverPreview({
      app,
      targetEl: labelEl,
      target,
      rootEl,
      source: "model-weave",
      isDebugEnabled: () => showMermaidRenderDebug,
      debugName: "Flow Diagram Mermaid Flow"
    });
  });
}

function setSvgNativeTooltip(element: SVGElement, text: string | undefined): void {
  const existingTitle = element.querySelector("title");
  const trimmed = text?.trim();
  if (!trimmed) {
    existingTitle?.remove();
    element.removeAttribute("title");
    return;
  }

  const title = existingTitle
    ?? element.ownerDocument.win.createSvg("title");
  title.textContent = trimmed;
  if (!title.parentElement) {
    element.prepend(title);
  }
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
  colorScheme?: ResolvedColorScheme,
  flowDiagramViewMode?: FlowDiagramViewMode
): string {
  if (isFlowDiagramModel(diagram.diagram)) {
    return buildFlowDiagramMermaidSource(getFlowDiagramRenderedDiagram(diagram, flowDiagramViewMode), colorScheme);
  }

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


function getFlowDiagramRenderedDiagram(
  diagram: ResolvedDiagram,
  effectiveViewMode?: FlowDiagramViewMode
): ResolvedDiagram {
  if (!isFlowDiagramModel(diagram.diagram) || effectiveViewMode !== "screen") {
    return diagram;
  }
  return buildFlowDiagramScreenFlowProjection(diagram);
}


export function buildFlowDiagramScreenFlowProjection(diagram: ResolvedDiagram): ResolvedDiagram {
  if (!isFlowDiagramModel(diagram.diagram)) {
    return diagram;
  }

  const visibleNodes = diagram.nodes.filter(isScreenFlowVisibleNode);
  if (visibleNodes.length === 0) {
    return diagram;
  }

  const visibleIds = new Set(visibleNodes.map((node) => node.id));
  const outgoing = new Map<string, DiagramEdge[]>();
  for (const edge of diagram.edges) {
    const edges = outgoing.get(edge.source) ?? [];
    edges.push(edge);
    outgoing.set(edge.source, edges);
  }

  const projectedByPair = new Map<string, DiagramEdge>();
  for (const sourceNode of visibleNodes) {
    const queue = (outgoing.get(sourceNode.id) ?? []).map((edge) => ({
      edge,
      visitedEdges: new Set<string>([getProjectionEdgeVisitKey(edge)])
    }));

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        continue;
      }

      const targetId = current.edge.target;
      if (visibleIds.has(targetId)) {
        if (targetId !== sourceNode.id) {
          addProjectedScreenFlowEdge(projectedByPair, sourceNode.id, targetId, current.edge);
        }
        continue;
      }

      for (const nextEdge of outgoing.get(targetId) ?? []) {
        const visitKey = getProjectionEdgeVisitKey(nextEdge);
        if (current.visitedEdges.has(visitKey)) {
          continue;
        }
        const nextVisitedEdges = new Set(current.visitedEdges);
        nextVisitedEdges.add(visitKey);
        queue.push({ edge: nextEdge, visitedEdges: nextVisitedEdges });
      }
    }
  }

  return {
    ...diagram,
    diagram: {
      ...diagram.diagram,
      flowView: "detail"
    },
    nodes: visibleNodes,
    edges: [...projectedByPair.values()]
  };
}

function isScreenFlowVisibleNode(node: DiagramNode): boolean {
  switch (node.kind) {
    case "screen":
    case "external":
    case "actor":
    case "user":
    case "context":
    case "message":
      return true;
    default:
      return false;
  }
}

function addProjectedScreenFlowEdge(
  projectedByPair: Map<string, DiagramEdge>,
  source: string,
  target: string,
  incomingEdge: DiagramEdge
): void {
  const key = `${source}->${target}`;
  const label = buildScreenFlowProjectionEdgeLabel(incomingEdge);
  const existing = projectedByPair.get(key);
  if (!existing) {
    projectedByPair.set(key, {
      id: `screen_flow:${source}->${target}`,
      source,
      target,
      kind: "flow",
      label,
      metadata: {
        ...incomingEdge.metadata,
        projected: true,
        sourceFlowId: incomingEdge.id,
        dataRaw: undefined
      }
    });
    return;
  }

  existing.label = mergeScreenFlowLabels(existing.label, label);
}

function buildScreenFlowProjectionEdgeLabel(edge: DiagramEdge): string | undefined {
  return getStringMetadata(edge.metadata, "condition")?.trim() ||
    getStringMetadata(edge.metadata, "trigger")?.trim() ||
    getStringMetadata(edge.metadata, "flowKind")?.trim() ||
    undefined;
}

function mergeScreenFlowLabels(left: string | undefined, right: string | undefined): string | undefined {
  const values = [
    ...(left ?? "").split(" / "),
    ...(right ?? "").split(" / ")
  ]
    .map((value) => value.trim())
    .filter(Boolean);
  const unique = [...new Set(values)];
  if (unique.length === 0) {
    return undefined;
  }
  const merged = unique.join(" / ");
  return merged.length > 80 ? `${merged.slice(0, 77)}...` : merged;
}

function getProjectionEdgeVisitKey(edge: DiagramEdge): string {
  return `${edge.id ?? ""}:${edge.source}->${edge.target}`;
}


function buildFlowDiagramMermaidSource(
  diagram: ResolvedDiagram,
  colorScheme?: ResolvedColorScheme,
): string {
  const palette = getModelWeaveMermaidPalette();
  const lines: string[] = ["flowchart LR"];
  const colorClasses = new Map<string, ResolvedColorStyle>();
  if (!colorScheme) {
    lines.push(
      `  ${buildModelWeaveMermaidClassDef("screen", palette.dfdProcessFill, palette.dfdProcessBorder, { strokeWidth: 1.5 })}`,
      `  ${buildModelWeaveMermaidClassDef("process", palette.dfdProcessFill, palette.dfdProcessBorder, { strokeWidth: 1.5 })}`,
      `  ${buildModelWeaveMermaidClassDef("context", palette.dfdOtherFill, palette.dfdOtherBorder, { strokeWidth: 1.5 })}`,
      `  ${buildModelWeaveMermaidClassDef("store", palette.dfdDatastoreFill, palette.dfdDatastoreBorder, { strokeWidth: 1.5 })}`,
      `  ${buildModelWeaveMermaidClassDef("external", palette.dfdExternalFill, palette.dfdExternalBorder, { strokeWidth: 1.5 })}`
    );
  }
  const nodeIds = new Map<string, string>();
  const domainStyles: string[] = [];
  const flowDomains = getFlowDiagramDomains(diagram);
  const usesResolvedDomains = flowDomains.length > 0;
  const flowDomainsById = new Map(flowDomains.map((domain) => [domain.id, domain]));
  const groupedNodes = new Map<string, Array<typeof diagram.nodes[number]>>();
  const ungroupedNodes: typeof diagram.nodes = [];

  for (const node of diagram.nodes) {
    const domainId = getNodeDomainId(node);
    if (domainId && flowDomainsById.has(domainId)) {
      if (!groupedNodes.has(domainId)) {
        groupedNodes.set(domainId, []);
      }
      groupedNodes.get(domainId)!.push(node);
    } else if (domainId && !usesResolvedDomains) {
      const synthetic = createSyntheticDomainEntry(domainId, flowDomainsById.size);
      flowDomainsById.set(domainId, synthetic);
      groupedNodes.set(domainId, [node]);
    } else {
      ungroupedNodes.push(node);
    }
  }

  for (const root of buildDomainTree(Array.from(flowDomainsById.values()))) {
    appendFlowDiagramDomainSubgraph(
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
    appendFlowDiagramNode(lines, node, nodeIds, 1, colorScheme, colorClasses);
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

function appendFlowDiagramDomainSubgraph(
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
    appendFlowDiagramDomainSubgraph(
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
  const domainMermaidId = toFlowMermaidDomainId(domainNode.domain.id);
  lines.push(`${indent}subgraph ${domainMermaidId}["${buildFlowDomainLabel(domainNode.domain)}"]`);
  lines.push(...childLines);
  for (const node of nodes) {
    appendFlowDiagramNode(lines, node, nodeIds, depth + 1, colorScheme, colorClasses);
  }
  lines.push(`${indent}end`);

  if (colorScheme) {
    domainStyles.push(
      `  style ${domainMermaidId} ${formatMermaidClassDefStyle(
        resolveColorStyle(colorScheme, "domain", getFlowDomainColorKind(domainNode.domain))
      )}`
    );
  }
  return true;
}

function appendFlowDiagramNode(
  lines: string[],
  node: DiagramNode,
  nodeIds: Map<string, string>,
  depth: number,
  colorScheme?: ResolvedColorScheme,
  colorClasses?: Map<string, ResolvedColorStyle>
): void {
  const mermaidId = toMermaidNodeId(node.id);
  const shape = toFlowDiagramMermaidShape(node.kind);
  const className = colorScheme
    ? registerFlowDiagramColorClass(node.kind, colorScheme, colorClasses)
    : toFlowDiagramClassName(node.kind);
  const indent = "  ".repeat(depth);
  nodeIds.set(node.id, mermaidId);
  lines.push(`${indent}${mermaidId}@{ shape: ${shape}, label: "${escapeMermaidLabel(node.label ?? node.ref ?? node.id)}" }`);
  lines.push(`${indent}class ${mermaidId} ${className}`);
}

function getFlowDiagramDomains(diagram: ResolvedDiagram): DomainEntry[] {
  return getOptionalResolvedDomains(diagram);
}

function getOptionalResolvedDomains(diagram: ResolvedDiagram): DomainEntry[] {
  const maybeDomains = (diagram.diagram as { domains?: unknown }).domains;
  return Array.isArray(maybeDomains) ? maybeDomains.filter(isDomainEntry) : [];
}

function isDomainEntry(value: unknown): value is DomainEntry {
  return Boolean(value && typeof value === "object" && "id" in value && typeof value.id === "string");
}

function createSyntheticDomainEntry(id: string, rowIndex: number): DomainEntry {
  return { id, name: id, kind: id, rowIndex };
}

function toFlowMermaidDomainId(value: string): string {
  return `DOMAIN_${toMermaidNodeId(value)}`;
}

function buildFlowDomainLabel(domain: DomainEntry): string {
  return escapeMermaidLabel(domain.name?.trim() || domain.id);
}

function getFlowDomainColorKind(domain: DomainEntry): string {
  return domain.kind?.trim() || domain.id;
}

export function getDfdMermaidColorSchemeTargets(diagram: ResolvedDiagram): string[] {
  if (isFlowDiagramModel(diagram.diagram)) {
    return hasNodesWithDomain(diagram) ? ["flow_diagram", "domain"] : ["flow_diagram"];
  }
  if (isDfdDiagramModel(diagram.diagram)) {
    return hasNodesWithDomain(diagram) || (diagram.diagram.domains?.length ?? 0) > 0
      ? ["dfd", "domain"]
      : ["dfd"];
  }
  return [];
}

function hasNodesWithDomain(diagram: ResolvedDiagram): boolean {
  return diagram.nodes.some((node) => Boolean(getNodeDomainId(node)));
}

function toFlowDiagramMermaidShape(kind: unknown): string {
  switch (kind) {
    case "screen":
      return "curv-trap";
    case "session":
    case "store":
    case "datastore":
      return "lin-cyl";
    case "process":
    case "app_process":
    case "context":
    case "work_object":
    case "actor":
    case "user":
    case "message":
    case "data":
    case "api":
    case "service":
    case "handler":
    case "external":
    case "unknown":
    default:
      return "rect";
  }
}

function registerFlowDiagramColorClass(
  kind: unknown,
  colorScheme: ResolvedColorScheme,
  colorClasses: Map<string, ResolvedColorStyle> | undefined
): string {
  const className = toFlowDiagramColorClassName(kind);
  colorClasses?.set(
    className,
    resolveColorStyle(colorScheme, "flow_diagram", typeof kind === "string" ? kind : undefined)
  );
  return className;
}

function toFlowDiagramColorClassName(kind: unknown): string {
  const suffix = typeof kind === "string" && kind.trim() ? kind.trim() : "default";
  return `kind_flow_diagram_${sanitizeMermaidId(suffix)}`;
}

function toFlowDiagramClassName(kind: unknown): string {
  switch (kind) {
    case "screen":
      return "screen";
    case "session":
    case "store":
    case "datastore":
      return "store";
    case "context":
    case "work_object":
    case "message":
      return "context";
    case "process":
    case "app_process":
    case "data":
    case "api":
    case "service":
    case "handler":
      return "process";
    case "external":
    case "actor":
    case "user":
      return "external";
    case "unknown":
    default:
      return "process";
  }
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

function isFlowDiagramModel(diagram: ResolvedDiagram["diagram"]): diagram is FlowDiagramModel {
  return diagram.schema === "flow_diagram";
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

  const section = activeWindow.createEl("details");
  section.className = "mdspec-section";
  section.addClass("model-weave-diagram-details");
  section.open = false;

  const resolvedCount = placed.filter((entry) => domainsById.has(entry.domainId)).length;
  const summary = activeWindow.createEl("summary");
  summary.textContent = `${labels?.domainPlacement ?? "Domain placement"} (${resolvedCount}/${placed.length} ${
    labels?.resolved ?? "resolved"
  })`;
  summary.addClass("model-weave-diagram-details-summary");
  section.appendChild(summary);

  const list = activeWindow.createEl("ul");
  list.addClass("model-weave-diagram-details-list");
  for (const source of sources) {
    const item = activeWindow.createEl("li");
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
    const item = activeWindow.createEl("li");
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
  const section = activeWindow.createEl("details");
  section.className = "mdspec-section";
  section.addClass("model-weave-diagram-details");
  section.open = false;

  const summary = activeWindow.createEl("summary");
  summary.textContent = `${labels?.displayedFlows ?? "Displayed flows"} (${edges.length})`;
  summary.addClass("model-weave-diagram-details-summary");
  section.appendChild(summary);

  if (edges.length === 0) {
    const empty = activeWindow.createEl("p");
    empty.textContent = labels?.noFlows ?? "No flows are used for rendering.";
    empty.addClass("model-weave-diagram-details-empty");
    section.appendChild(empty);
    return section;
  }

  const list = activeWindow.createEl("ul");
  list.addClass("model-weave-diagram-details-list");
  for (const edge of edges) {
    const item = activeWindow.createEl("li");
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
  const section = activeWindow.createEl("details");
  section.className = "mdspec-section";
  section.addClass("model-weave-diagram-details");
  section.open = false;

  const summary = activeWindow.createEl("summary");
  summary.textContent = `${labels?.displayedObjects ?? "Displayed objects"} (${diagram.nodes.length})`;
  summary.addClass("model-weave-diagram-details-summary");
  section.appendChild(summary);

  if (diagram.nodes.length === 0) {
    const empty = activeWindow.createEl("p");
    empty.textContent = labels?.noObjects ?? "No objects are used for rendering.";
    empty.addClass("model-weave-diagram-details-empty");
    section.appendChild(empty);
    return section;
  }

  const domainsById = new Map(getDfdLocalDomains(diagram).map((domain) => [domain.id, domain]));
  const list = activeWindow.createEl("ul");
  list.addClass("model-weave-diagram-details-list");
  for (const node of diagram.nodes) {
    const item = activeWindow.createEl("li");
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
