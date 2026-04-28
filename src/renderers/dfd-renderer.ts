import { loadMermaid } from "obsidian";
import type {
  DiagramEdge,
  DiagramNode,
  DfdObjectModel,
  ResolvedDiagram
} from "../types/models";
import { buildDfdMermaidSource } from "./dfd-mermaid";
import {
  attachGraphViewportInteractions,
  computeSceneBounds,
  estimateBadgeBounds,
  type GraphViewportState,
  type SceneBounds
} from "./graph-view-shared";
import {
  createZoomToolbar,
  type ZoomToolbarElements
} from "./zoom-toolbar";

const SVG_NS = "http://www.w3.org/2000/svg";
const NODE_WIDTH = 240;
const COLUMN_GAP = 132;
const STACK_GAP = 52;
const CANVAS_PADDING = 72;
const MAIN_LANE_Y = 140;
const AUX_LANE_Y = 300;
const STORE_LANE_Y = 470;
const RETURN_TOP_GAP = 88;
const RETURN_BOTTOM_GAP = 86;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.4;
const INITIAL_ZOOM = 1;
const DFD_MERMAID_RENDER_FLAG = "__modelWeaveRenderReady";

interface NodeLayout {
  node: DiagramNode & { object?: DfdObjectModel };
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DfdLayoutNodeMeta {
  rank: number;
  lane: "main" | "aux" | "store";
  kind: DfdObjectModel["kind"] | "unknown";
}

interface DfdRouteLayout {
  edge: DiagramEdge;
  d: string;
  points: Array<{ x: number; y: number }>;
  labelX: number;
  labelY: number;
  isReturn: boolean;
}

type PortSide = "left" | "right" | "top" | "bottom";

interface PortAnchor {
  boundary: { x: number; y: number };
  outer: { x: number; y: number };
  side: PortSide;
}

interface PathCandidate {
  edge: DiagramEdge;
  points: Array<{ x: number; y: number }>;
  isReturn: boolean;
  routeKind: "direct-hvh" | "direct-vhv" | "lane-top" | "lane-bottom";
  score: number;
}

interface DfdLayoutResult {
  nodes: NodeLayout[];
  byId: Record<string, NodeLayout>;
  routes: DfdRouteLayout[];
  width: number;
  height: number;
}

interface MermaidRenderableRoot extends HTMLElement {
  [DFD_MERMAID_RENDER_FLAG]?: Promise<void>;
}

interface MermaidShellElements {
  root: HTMLElement;
  canvas: HTMLDivElement;
  surface: HTMLDivElement;
  toolbar: ZoomToolbarElements | null;
}

export function renderDfdDiagram(
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
  const shell = createMermaidShell(diagram, options);
  const ready = renderMermaidIntoShell(shell, diagram, options).catch((error) => {
    console.warn("[model-weave] DFD Mermaid render failed; falling back to custom renderer", {
      error,
      diagramId: "id" in diagram.diagram ? diagram.diagram.id : diagram.diagram.path
    });
    const fallback = renderDfdDiagramCustom(diagram, options);
    shell.root.replaceChildren(...Array.from(fallback.childNodes));
  });
  (shell.root as MermaidRenderableRoot)[DFD_MERMAID_RENDER_FLAG] = ready;
  return shell.root;
}

export function getDfdRenderReadyPromise(element: HTMLElement): Promise<void> | null {
  return (element as MermaidRenderableRoot)[DFD_MERMAID_RENDER_FLAG] ?? null;
}

function createMermaidShell(
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
): MermaidShellElements {
  const root = document.createElement("section");
  root.className = "mdspec-diagram mdspec-diagram--dfd";
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.flex = "1 1 auto";
  root.style.minHeight = "0";

  if (!options?.hideTitle) {
    const title = document.createElement("h2");
    title.textContent = `${diagram.diagram.name} (dfd)`;
    title.style.flex = "0 0 auto";
    root.appendChild(title);
  }

  const canvas = document.createElement("div");
  canvas.className = "mdspec-dfd-canvas";
  canvas.style.position = "relative";
  canvas.style.overflow = "hidden";
  canvas.style.padding = "0";
  canvas.style.border = "1px solid var(--background-modifier-border)";
  canvas.style.borderRadius = "8px";
  canvas.style.background = "#ffffff";
  canvas.style.flex = "1 1 auto";
  if (!options?.forExport) {
    canvas.style.minHeight = "420px";
  }
  canvas.style.cursor = "grab";
  canvas.style.userSelect = "none";
  canvas.style.touchAction = "none";

  const toolbar = options?.forExport
    ? null
    : createZoomToolbar("Wheel: zoom / Drag background: pan");
  if (toolbar) {
    root.appendChild(toolbar.root);
  }

  const viewport = document.createElement("div");
  viewport.style.position = "relative";
  viewport.style.width = "100%";
  viewport.style.height = "100%";
  viewport.style.minHeight = "0";
  viewport.style.overflow = "hidden";

  const surface = document.createElement("div");
  surface.className = "mdspec-dfd-surface";
  surface.dataset.modelWeaveExportSurface = "true";
  surface.style.position = "absolute";
  surface.style.left = "0";
  surface.style.top = "0";
  surface.style.width = "1px";
  surface.style.height = "1px";
  surface.style.transformOrigin = "0 0";
  surface.style.willChange = "transform";

  viewport.appendChild(surface);
  canvas.appendChild(viewport);
  root.appendChild(canvas);

  if (!options?.hideDetails) {
    root.appendChild(createFlowDetails(diagram.edges));
  }

  return {
    root,
    canvas,
    surface,
    toolbar
  };
}

async function renderMermaidIntoShell(
  shell: MermaidShellElements,
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
): Promise<void> {
  const mermaid = await loadMermaid();
  const source = buildDfdMermaidSource(diagram);
  const renderId = `model_weave_dfd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const rendered = await mermaid.render(renderId, source);
  const { canvas, surface, toolbar } = shell;

  surface.empty();
  surface.innerHTML = rendered.svg;
  surface.style.background = "#ffffff";
  surface.style.display = "block";
  surface.dataset.modelWeaveRenderer = "mermaid";

  const svg = surface.querySelector<SVGSVGElement>("svg");
  if (!svg) {
    throw new Error("Mermaid SVG was not generated.");
  }

  if (typeof rendered.bindFunctions === "function") {
    rendered.bindFunctions(surface);
  }

  const sceneSize = readMermaidSceneSize(svg);
  if (!sceneSize) {
    throw new Error("Mermaid SVG has no measurable bounds.");
  }

  surface.dataset.modelWeaveSceneWidth = `${sceneSize.width}`;
  surface.dataset.modelWeaveSceneHeight = `${sceneSize.height}`;
  surface.style.width = `${sceneSize.width}px`;
  surface.style.height = `${sceneSize.height}px`;
  svg.setAttribute("width", `${sceneSize.width}`);
  svg.setAttribute("height", `${sceneSize.height}`);
  svg.style.width = `${sceneSize.width}px`;
  svg.style.height = `${sceneSize.height}px`;
  svg.style.display = "block";

  if (options?.forExport) {
    return;
  }

  if (toolbar) {
    attachGraphViewportInteractions(
      canvas,
      surface,
      toolbar,
      sceneSize,
      {
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
        initialZoom: INITIAL_ZOOM,
        nodeSelector: ".node, g.node, foreignObject",
        viewportState: options?.viewportState,
        onViewportStateChange: options?.onViewportStateChange
      }
    );
  }
}

function readMermaidSceneSize(svg: SVGSVGElement): { width: number; height: number } | null {
  const viewBox = svg.viewBox?.baseVal;
  if (viewBox && Number.isFinite(viewBox.width) && Number.isFinite(viewBox.height) && viewBox.width > 0 && viewBox.height > 0) {
    return { width: viewBox.width, height: viewBox.height };
  }

  const width = parseFloat(svg.getAttribute("width") ?? "");
  const height = parseFloat(svg.getAttribute("height") ?? "");
  if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
    return { width, height };
  }

  try {
    const bbox = svg.getBBox();
    if (
      Number.isFinite(bbox.width) &&
      Number.isFinite(bbox.height) &&
      bbox.width > 0 &&
      bbox.height > 0
    ) {
      return { width: bbox.width, height: bbox.height };
    }
  } catch {
    // Ignore browsers/Electron cases where getBBox is not available yet.
  }

  const rect = svg.getBoundingClientRect();
  if (
    Number.isFinite(rect.width) &&
    Number.isFinite(rect.height) &&
    rect.width > 0 &&
    rect.height > 0
  ) {
    return { width: rect.width, height: rect.height };
  }

  return null;
}

export function renderDfdDiagramCustom(
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
  const root = document.createElement("section");
  root.className = "mdspec-diagram mdspec-diagram--dfd";
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.flex = "1 1 auto";
  root.style.minHeight = "0";

  if (!options?.hideTitle) {
    const title = document.createElement("h2");
    title.textContent = `${diagram.diagram.name} (dfd)`;
    title.style.flex = "0 0 auto";
    root.appendChild(title);
  }

  const layout = createDfdLayout(
    diagram.nodes as Array<DiagramNode & { object?: DfdObjectModel }>,
    diagram.edges
  );
  const sceneBounds = createSceneBounds(layout);

  const canvas = document.createElement("div");
  canvas.className = "mdspec-dfd-canvas";
  canvas.style.position = "relative";
  canvas.style.overflow = "hidden";
  canvas.style.padding = "0";
  canvas.style.border = "1px solid var(--background-modifier-border)";
  canvas.style.borderRadius = "8px";
  canvas.style.background = "#ffffff";
  canvas.style.flex = "1 1 auto";
  if (!options?.forExport) {
    canvas.style.minHeight = "420px";
  }
  canvas.style.cursor = "grab";
  canvas.style.userSelect = "none";
  canvas.style.touchAction = "none";

  const toolbar = options?.forExport
    ? null
    : createZoomToolbar("Wheel: zoom / Drag background: pan");
  if (toolbar) {
    root.appendChild(toolbar.root);
  }

  const viewport = document.createElement("div");
  viewport.style.position = "relative";
  viewport.style.width = "100%";
  viewport.style.height = "100%";
  viewport.style.minHeight = "0";
  viewport.style.overflow = "hidden";

  const surface = document.createElement("div");
  surface.className = "mdspec-dfd-surface";
  surface.dataset.modelWeaveExportSurface = "true";
  surface.dataset.modelWeaveRenderer = "custom";
  surface.dataset.modelWeaveSceneWidth = `${sceneBounds.width}`;
  surface.dataset.modelWeaveSceneHeight = `${sceneBounds.height}`;
  surface.style.position = "absolute";
  surface.style.left = "0";
  surface.style.top = "0";
  surface.style.width = `${sceneBounds.width}px`;
  surface.style.height = `${sceneBounds.height}px`;
  surface.style.transformOrigin = "0 0";
  surface.style.willChange = "transform";

  const svg = createSvgSurface(sceneBounds.width, sceneBounds.height);
  svg.appendChild(createMarkerDefinitions());
  for (const route of layout.routes) {
    svg.appendChild(renderEdge(route));
  }
  surface.appendChild(svg);

  for (const box of layout.nodes) {
    surface.appendChild(createNodeBox(box, options));
  }

  viewport.appendChild(surface);
  canvas.appendChild(viewport);
  root.appendChild(canvas);

  if (toolbar) {
    attachGraphViewportInteractions(canvas, surface, toolbar, sceneBounds, {
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      initialZoom: INITIAL_ZOOM,
      nodeSelector: ".mdspec-dfd-node",
      viewportState: options?.viewportState,
      onViewportStateChange: options?.onViewportStateChange
    });
  }

  if (!options?.hideDetails) {
    root.appendChild(createFlowDetails(diagram.edges));
  }

  return root;
}

function createDfdLayout(
  nodes: Array<DiagramNode & { object?: DfdObjectModel }>,
  edges: DiagramEdge[]
): DfdLayoutResult {
  const metas = assignDfdRanks(nodes, edges);
  const laneStacks = new Map<string, number>();
  const layouts: NodeLayout[] = [];
  const byId: Record<string, NodeLayout> = {};
  let maxX = CANVAS_PADDING;
  let maxY = CANVAS_PADDING;

  const orderedNodes = [...nodes].sort((left, right) => {
    const leftMeta = metas.get(left.id);
    const rightMeta = metas.get(right.id);
    if (!leftMeta || !rightMeta) {
      return left.id.localeCompare(right.id);
    }
    if (leftMeta.rank !== rightMeta.rank) {
      return leftMeta.rank - rightMeta.rank;
    }
    if (leftMeta.lane !== rightMeta.lane) {
      return laneOrder(leftMeta.lane) - laneOrder(rightMeta.lane);
    }
    return left.id.localeCompare(right.id);
  });

  for (const node of orderedNodes) {
    const meta = metas.get(node.id);
    if (!meta) {
      continue;
    }

    const width = NODE_WIDTH;
    const height = measureNodeHeight(node.object);
    const stackKey = `${meta.rank}:${meta.lane}`;
    const stackIndex = laneStacks.get(stackKey) ?? 0;
    laneStacks.set(stackKey, stackIndex + 1);

    const x = CANVAS_PADDING + meta.rank * (NODE_WIDTH + COLUMN_GAP);
    const y = getLaneBaseY(meta.lane) + stackIndex * (height + STACK_GAP);

    const layout: NodeLayout = { node, x, y, width, height };
    layouts.push(layout);
    byId[node.id] = layout;
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
  }

  const routes = buildDfdOrthogonalEdges(edges, byId, metas);

  for (const route of routes) {
    for (const point of route.points) {
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
  }

  return {
    nodes: layouts,
    byId,
    routes,
    width: maxX + CANVAS_PADDING,
    height: maxY + CANVAS_PADDING
  };
}

function createSceneBounds(layout: DfdLayoutResult): SceneBounds {
  const nodeBounds = layout.nodes.map((item) => ({
    x: item.x,
    y: item.y,
    width: item.width,
    height: item.height
  }));
  const routeBounds = layout.routes.map((route) => {
    const xs = route.points.map((point) => point.x);
    const ys = route.points.map((point) => point.y);
    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(1, Math.max(...xs) - Math.min(...xs)),
      height: Math.max(1, Math.max(...ys) - Math.min(...ys))
    };
  });
  const labelBounds = layout.routes
    .map((route) => {
      const label = getEdgeLabel(route.edge);
      if (!label) {
        return null;
      }
      return estimateBadgeBounds(route.labelX, route.labelY, label, { minWidth: 56 });
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value));

  return computeSceneBounds([...nodeBounds, ...routeBounds], labelBounds, CANVAS_PADDING);
}

function assignDfdRanks(
  nodes: Array<DiagramNode & { object?: DfdObjectModel }>,
  edges: DiagramEdge[]
): Map<string, DfdLayoutNodeMeta> {
  const nodeById = new Map(nodes.map((node) => [node.id, node] as const));
  const outgoing = new Map<string, DiagramEdge[]>();
  const incoming = new Map<string, DiagramEdge[]>();
  for (const node of nodes) {
    outgoing.set(node.id, []);
    incoming.set(node.id, []);
  }
  for (const edge of edges) {
    outgoing.get(edge.source)?.push(edge);
    incoming.get(edge.target)?.push(edge);
  }

  const metas = new Map<string, DfdLayoutNodeMeta>();
  for (const node of nodes) {
    const kind = node.object?.kind ?? "unknown";
    if (kind === "external") {
      metas.set(node.id, { rank: 0, lane: "main", kind });
    }
  }

  for (const edge of edges) {
    const targetNode = nodeById.get(edge.target);
    const sourceMeta = metas.get(edge.source);
    if (!targetNode || targetNode.object?.kind !== "process" || metas.has(edge.target)) {
      continue;
    }

    if (sourceMeta?.kind === "external") {
      metas.set(edge.target, { rank: 1, lane: "main", kind: "process" });
      continue;
    }

    if (sourceMeta?.kind === "process") {
      metas.set(edge.target, {
        rank: sourceMeta.rank + 1,
        lane: "main",
        kind: "process"
      });
    }
  }

  const processes = nodes.filter((node) => node.object?.kind === "process");
  const centerProcessId = pickCenterProcess(processes, incoming, outgoing);
  for (const process of processes) {
    if (!metas.has(process.id)) {
      metas.set(process.id, {
        rank: process.id === centerProcessId ? 1 : 2,
        lane: "main",
        kind: "process"
      });
    }
  }

  for (const process of processes) {
    const meta = metas.get(process.id);
    if (!meta) {
      continue;
    }

    const outgoingEdges = outgoing.get(process.id) ?? [];
    const returnishCount = outgoingEdges.filter((edge) => {
      const targetMeta = metas.get(edge.target);
      const targetKind = nodeById.get(edge.target)?.object?.kind;
      if (targetKind === "external") {
        return true;
      }
      return Boolean(targetMeta && targetMeta.rank <= meta.rank);
    }).length;

    if (returnishCount > 0 && returnishCount >= Math.ceil(outgoingEdges.length / 2)) {
      meta.lane = meta.rank <= 1 ? "main" : "aux";
    }
  }

  for (const node of nodes) {
    if (node.object?.kind !== "datastore") {
      continue;
    }

    const relatedRanks = [
      ...(incoming.get(node.id) ?? []).map((edge) => metas.get(edge.source)?.rank),
      ...(outgoing.get(node.id) ?? []).map((edge) => metas.get(edge.target)?.rank)
    ].filter((value): value is number => typeof value === "number");

    const rank =
      relatedRanks.length > 0 ? Math.max(...relatedRanks) + 1 : Math.max(2, processes.length);
    metas.set(node.id, { rank, lane: "store", kind: "datastore" });
  }

  for (const node of nodes) {
    if (!metas.has(node.id)) {
      metas.set(node.id, {
        rank: 1,
        lane: "main",
        kind: node.object?.kind ?? "unknown"
      });
    }
  }

  return metas;
}

function pickCenterProcess(
  processes: Array<DiagramNode & { object?: DfdObjectModel }>,
  incoming: Map<string, DiagramEdge[]>,
  outgoing: Map<string, DiagramEdge[]>
): string | null {
  if (processes.length === 0) {
    return null;
  }

  return [...processes]
    .sort((left, right) => {
      const leftScore = (incoming.get(left.id)?.length ?? 0) + (outgoing.get(left.id)?.length ?? 0);
      const rightScore =
        (incoming.get(right.id)?.length ?? 0) + (outgoing.get(right.id)?.length ?? 0);
      if (leftScore !== rightScore) {
        return rightScore - leftScore;
      }
      return left.id.localeCompare(right.id);
    })[0]?.id ?? null;
}

function buildDfdOrthogonalEdges(
  edges: DiagramEdge[],
  layoutById: Record<string, NodeLayout>,
  metas: Map<string, DfdLayoutNodeMeta>
): DfdRouteLayout[] {
  const routes: DfdRouteLayout[] = [];

  for (const edge of edges) {
    const source = layoutById[edge.source];
    const target = layoutById[edge.target];
    const sourceMeta = metas.get(edge.source);
    const targetMeta = metas.get(edge.target);
    if (!source || !target || !sourceMeta || !targetMeta) {
      continue;
    }

    const isReturn = classifyDfdFlowDirection(sourceMeta, targetMeta);
    const candidate = selectBestRouteCandidate(
      edge,
      source,
      target,
      sourceMeta,
      targetMeta,
      layoutById,
      routes,
      isReturn
    );
    routes.push(finalizeRouteCandidate(candidate));
  }

  return routes;
}

function classifyDfdFlowDirection(
  sourceMeta: DfdLayoutNodeMeta,
  targetMeta: DfdLayoutNodeMeta
): boolean {
  if (targetMeta.kind === "external") {
    return true;
  }
  return targetMeta.rank <= sourceMeta.rank;
}

function selectBestRouteCandidate(
  edge: DiagramEdge,
  source: NodeLayout,
  target: NodeLayout,
  sourceMeta: DfdLayoutNodeMeta,
  targetMeta: DfdLayoutNodeMeta,
  layoutById: Record<string, NodeLayout>,
  acceptedRoutes: DfdRouteLayout[],
  isReturn: boolean
): PathCandidate {
  const portPairs = getPortCandidatePairs(source, target);
  const candidates: PathCandidate[] = [];

  for (const [fromSide, toSide] of portPairs) {
    const sourcePort = getPortAnchor(source, fromSide);
    const targetPort = getPortAnchor(target, toSide);

    candidates.push(
      createDirectCandidate(edge, sourcePort, targetPort, "direct-hvh", isReturn),
      createDirectCandidate(edge, sourcePort, targetPort, "direct-vhv", isReturn)
    );

    if (isReturn || shouldConsiderLaneRoute(sourceMeta, targetMeta)) {
      candidates.push(
        createLaneCandidate(edge, sourcePort, targetPort, "lane-top", isReturn),
        createLaneCandidate(edge, sourcePort, targetPort, "lane-bottom", isReturn)
      );
    }
  }

  const scored = candidates.map((candidate) => ({
    candidate,
    score: scoreRouteCandidate(
      candidate,
      source,
      target,
      sourceMeta,
      targetMeta,
      layoutById,
      acceptedRoutes
    )
  }));

  scored.sort((left, right) => left.score - right.score);
  const best = scored[0];
  return {
    ...best.candidate,
    score: best.score
  };
}

function shouldConsiderLaneRoute(
  sourceMeta: DfdLayoutNodeMeta,
  targetMeta: DfdLayoutNodeMeta
): boolean {
  return sourceMeta.rank === targetMeta.rank || Math.abs(sourceMeta.rank - targetMeta.rank) > 1;
}

function getPortCandidatePairs(
  source: NodeLayout,
  target: NodeLayout
): Array<[PortSide, PortSide]> {
  const sourceCenterX = source.x + source.width / 2;
  const sourceCenterY = source.y + source.height / 2;
  const targetCenterX = target.x + target.width / 2;
  const targetCenterY = target.y + target.height / 2;
  const dx = targetCenterX - sourceCenterX;
  const dy = targetCenterY - sourceCenterY;

  const horizontalPrimary: [PortSide, PortSide] =
    dx >= 0 ? ["right", "left"] : ["left", "right"];
  const verticalPrimary: [PortSide, PortSide] =
    dy >= 0 ? ["bottom", "top"] : ["top", "bottom"];

  const pairs =
    Math.abs(dx) >= Math.abs(dy)
      ? [horizontalPrimary, verticalPrimary]
      : [verticalPrimary, horizontalPrimary];

  return dedupePortPairs([
    ...pairs,
    ["right", "left"],
    ["left", "right"],
    ["bottom", "top"],
    ["top", "bottom"]
  ]);
}

function dedupePortPairs(
  pairs: Array<[PortSide, PortSide]>
): Array<[PortSide, PortSide]> {
  const seen = new Set<string>();
  const result: Array<[PortSide, PortSide]> = [];
  for (const pair of pairs) {
    const key = `${pair[0]}:${pair[1]}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(pair);
  }
  return result;
}

function getPortAnchor(layout: NodeLayout, side: PortSide): PortAnchor {
  const stub = 18;
  switch (side) {
    case "left":
      return {
        side,
        boundary: { x: layout.x, y: layout.y + layout.height / 2 },
        outer: { x: layout.x - stub, y: layout.y + layout.height / 2 }
      };
    case "right":
      return {
        side,
        boundary: { x: layout.x + layout.width, y: layout.y + layout.height / 2 },
        outer: { x: layout.x + layout.width + stub, y: layout.y + layout.height / 2 }
      };
    case "top":
      return {
        side,
        boundary: { x: layout.x + layout.width / 2, y: layout.y },
        outer: { x: layout.x + layout.width / 2, y: layout.y - stub }
      };
    case "bottom":
    default:
      return {
        side,
        boundary: { x: layout.x + layout.width / 2, y: layout.y + layout.height },
        outer: { x: layout.x + layout.width / 2, y: layout.y + layout.height + stub }
      };
  }
}

function createDirectCandidate(
  edge: DiagramEdge,
  sourcePort: PortAnchor,
  targetPort: PortAnchor,
  routeKind: "direct-hvh" | "direct-vhv",
  isReturn: boolean
): PathCandidate {
  const points =
    routeKind === "direct-hvh"
      ? [
          sourcePort.boundary,
          sourcePort.outer,
          { x: (sourcePort.outer.x + targetPort.outer.x) / 2, y: sourcePort.outer.y },
          { x: (sourcePort.outer.x + targetPort.outer.x) / 2, y: targetPort.outer.y },
          targetPort.outer,
          targetPort.boundary
        ]
      : [
          sourcePort.boundary,
          sourcePort.outer,
          { x: sourcePort.outer.x, y: (sourcePort.outer.y + targetPort.outer.y) / 2 },
          { x: targetPort.outer.x, y: (sourcePort.outer.y + targetPort.outer.y) / 2 },
          targetPort.outer,
          targetPort.boundary
        ];

  return {
    edge,
    points: simplifyOrthogonalPoints(points),
    isReturn,
    routeKind,
    score: 0
  };
}

function createLaneCandidate(
  edge: DiagramEdge,
  sourcePort: PortAnchor,
  targetPort: PortAnchor,
  routeKind: "lane-top" | "lane-bottom",
  isReturn: boolean
): PathCandidate {
  const laneY =
    routeKind === "lane-top"
      ? Math.min(sourcePort.outer.y, targetPort.outer.y) - RETURN_TOP_GAP
      : Math.max(sourcePort.outer.y, targetPort.outer.y) + RETURN_BOTTOM_GAP;

  return {
    edge,
    points: simplifyOrthogonalPoints([
      sourcePort.boundary,
      sourcePort.outer,
      { x: sourcePort.outer.x, y: laneY },
      { x: targetPort.outer.x, y: laneY },
      targetPort.outer,
      targetPort.boundary
    ]),
    isReturn,
    routeKind,
    score: 0
  };
}

function simplifyOrthogonalPoints(
  points: Array<{ x: number; y: number }>
): Array<{ x: number; y: number }> {
  const compact: Array<{ x: number; y: number }> = [];
  for (const point of points) {
    const previous = compact[compact.length - 1];
    if (previous && previous.x === point.x && previous.y === point.y) {
      continue;
    }
    compact.push(point);
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (let index = 1; index < compact.length - 1; index += 1) {
      const prev = compact[index - 1];
      const current = compact[index];
      const next = compact[index + 1];
      const sameX = prev.x === current.x && current.x === next.x;
      const sameY = prev.y === current.y && current.y === next.y;
      if (sameX || sameY) {
        compact.splice(index, 1);
        changed = true;
        break;
      }
    }
  }

  return compact;
}

function scoreRouteCandidate(
  candidate: PathCandidate,
  source: NodeLayout,
  target: NodeLayout,
  sourceMeta: DfdLayoutNodeMeta,
  targetMeta: DfdLayoutNodeMeta,
  layoutById: Record<string, NodeLayout>,
  acceptedRoutes: DfdRouteLayout[]
): number {
  let score = 0;
  score += computePolylineLength(candidate.points);
  score += (candidate.points.length - 2) * 10;

  if (candidate.routeKind === "lane-top" || candidate.routeKind === "lane-bottom") {
    score += candidate.isReturn ? 12 : 40;
  } else if (candidate.isReturn) {
    score += 8;
  }

  if (
    sourceMeta.rank < targetMeta.rank &&
    (candidate.routeKind === "direct-hvh" || candidate.routeKind === "direct-vhv")
  ) {
    score -= 6;
  }

  score += evaluateNodeCrossingPenalty(candidate.points, layoutById, source.node.id, target.node.id);
  score += evaluateExistingRoutePenalty(candidate.points, acceptedRoutes);
  score += evaluatePortPreferencePenalty(candidate, source, target);

  return score;
}

function computePolylineLength(points: Array<{ x: number; y: number }>): number {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    total +=
      Math.abs(points[index].x - points[index - 1].x) +
      Math.abs(points[index].y - points[index - 1].y);
  }
  return total;
}

function evaluateNodeCrossingPenalty(
  points: Array<{ x: number; y: number }>,
  layoutById: Record<string, NodeLayout>,
  sourceId: string,
  targetId: string
): number {
  let penalty = 0;
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    for (const [nodeId, layout] of Object.entries(layoutById)) {
      if (nodeId === sourceId || nodeId === targetId) {
        continue;
      }
      if (segmentIntersectsExpandedRect(start, end, layout, 10)) {
        penalty += 180;
      }
    }
  }
  return penalty;
}

function segmentIntersectsExpandedRect(
  start: { x: number; y: number },
  end: { x: number; y: number },
  rect: NodeLayout,
  padding: number
): boolean {
  const left = rect.x - padding;
  const right = rect.x + rect.width + padding;
  const top = rect.y - padding;
  const bottom = rect.y + rect.height + padding;

  if (start.x === end.x) {
    const x = start.x;
    if (x < left || x > right) {
      return false;
    }
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);
    return maxY >= top && minY <= bottom;
  }

  if (start.y === end.y) {
    const y = start.y;
    if (y < top || y > bottom) {
      return false;
    }
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    return maxX >= left && minX <= right;
  }

  return false;
}

function evaluateExistingRoutePenalty(
  points: Array<{ x: number; y: number }>,
  acceptedRoutes: DfdRouteLayout[]
): number {
  let penalty = 0;
  const candidateSegments = toSegments(points);
  for (const route of acceptedRoutes) {
    const existingSegments = toSegments(route.points);
    for (const candidate of candidateSegments) {
      for (const existing of existingSegments) {
        penalty += scoreSegmentProximity(candidate, existing);
      }
    }
  }
  return penalty;
}

function toSegments(points: Array<{ x: number; y: number }>): Array<{
  orientation: "horizontal" | "vertical";
  fixed: number;
  start: number;
  end: number;
}> {
  const segments: Array<{
    orientation: "horizontal" | "vertical";
    fixed: number;
    start: number;
    end: number;
  }> = [];

  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    if (start.x === end.x) {
      segments.push({
        orientation: "vertical",
        fixed: start.x,
        start: Math.min(start.y, end.y),
        end: Math.max(start.y, end.y)
      });
    } else if (start.y === end.y) {
      segments.push({
        orientation: "horizontal",
        fixed: start.y,
        start: Math.min(start.x, end.x),
        end: Math.max(start.x, end.x)
      });
    }
  }

  return segments;
}

function scoreSegmentProximity(
  left: { orientation: "horizontal" | "vertical"; fixed: number; start: number; end: number },
  right: { orientation: "horizontal" | "vertical"; fixed: number; start: number; end: number }
): number {
  if (left.orientation !== right.orientation) {
    return 0;
  }

  const overlap = Math.min(left.end, right.end) - Math.max(left.start, right.start);
  if (overlap <= 0) {
    return 0;
  }

  const distance = Math.abs(left.fixed - right.fixed);
  if (distance === 0) {
    return 48;
  }
  if (distance < 18) {
    return 18;
  }
  if (distance < 32) {
    return 6;
  }
  return 0;
}

function evaluatePortPreferencePenalty(
  candidate: PathCandidate,
  source: NodeLayout,
  target: NodeLayout
): number {
  const firstStep = candidate.points[1];
  const beforeEnd = candidate.points[candidate.points.length - 2];
  const sourceCenterX = source.x + source.width / 2;
  const sourceCenterY = source.y + source.height / 2;
  const targetCenterX = target.x + target.width / 2;
  const targetCenterY = target.y + target.height / 2;
  const dx = targetCenterX - sourceCenterX;
  const dy = targetCenterY - sourceCenterY;

  let penalty = 0;
  if (Math.abs(dx) >= Math.abs(dy)) {
    if ((dx >= 0 && firstStep.x <= sourceCenterX) || (dx < 0 && firstStep.x >= sourceCenterX)) {
      penalty += 30;
    }
    if ((dx >= 0 && beforeEnd.x >= targetCenterX) || (dx < 0 && beforeEnd.x <= targetCenterX)) {
      penalty += 30;
    }
  } else {
    if ((dy >= 0 && firstStep.y <= sourceCenterY) || (dy < 0 && firstStep.y >= sourceCenterY)) {
      penalty += 30;
    }
    if ((dy >= 0 && beforeEnd.y >= targetCenterY) || (dy < 0 && beforeEnd.y <= targetCenterY)) {
      penalty += 30;
    }
  }

  return penalty;
}

function finalizeRouteCandidate(candidate: PathCandidate): DfdRouteLayout {
  const labelPosition = computeLabelPosition(candidate.points, candidate.isReturn);
  return {
    edge: candidate.edge,
    d: toOrthogonalPath(candidate.points),
    points: candidate.points,
    labelX: labelPosition.x,
    labelY: labelPosition.y,
    isReturn: candidate.isReturn
  };
}

function computeLabelPosition(
  points: Array<{ x: number; y: number }>,
  isReturn: boolean
): { x: number; y: number } {
  const segments = toSegments(points);
  if (segments.length === 0) {
    return { x: 0, y: 0 };
  }

  const longest = [...segments].sort((left, right) => (right.end - right.start) - (left.end - left.start))[0];
  if (longest.orientation === "horizontal") {
    return {
      x: (longest.start + longest.end) / 2,
      y: longest.fixed + (isReturn ? -16 : -12)
    };
  }

  return {
    x: longest.fixed + 14,
    y: (longest.start + longest.end) / 2
  };
}

function toOrthogonalPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) {
    return "";
  }

  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

function laneOrder(lane: DfdLayoutNodeMeta["lane"]): number {
  switch (lane) {
    case "main":
      return 0;
    case "aux":
      return 1;
    case "store":
    default:
      return 2;
  }
}

function getLaneBaseY(lane: DfdLayoutNodeMeta["lane"]): number {
  switch (lane) {
    case "main":
      return MAIN_LANE_Y;
    case "aux":
      return AUX_LANE_Y;
    case "store":
    default:
      return STORE_LANE_Y;
  }
}

function measureNodeHeight(object?: DfdObjectModel): number {
  if (!object) {
    return 88;
  }

  switch (object.kind) {
    case "process":
      return 104;
    case "datastore":
      return 92;
    case "external":
    default:
      return 88;
  }
}

function createSvgSurface(width: number, height: number): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.style.position = "absolute";
  svg.style.inset = "0";
  svg.style.pointerEvents = "none";
  svg.style.overflow = "visible";
  return svg;
}

function createMarkerDefinitions(): SVGDefsElement {
  const defs = document.createElementNS(SVG_NS, "defs");
  const marker = document.createElementNS(SVG_NS, "marker");
  marker.setAttribute("id", "mdspec-dfd-arrow");
  marker.setAttribute("markerWidth", "12");
  marker.setAttribute("markerHeight", "12");
  marker.setAttribute("refX", "10");
  marker.setAttribute("refY", "6");
  marker.setAttribute("orient", "auto");
  marker.setAttribute("markerUnits", "strokeWidth");

  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", "M 0 0 L 10 6 L 0 12 z");
  path.setAttribute("fill", "var(--text-muted)");
  path.setAttribute("stroke", "var(--text-muted)");
  path.setAttribute("stroke-width", "1.2");
  marker.appendChild(path);
  defs.appendChild(marker);
  return defs;
}

function renderEdge(route: DfdRouteLayout): SVGGElement {
  const group = document.createElementNS(SVG_NS, "g");

  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", route.d);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", route.isReturn ? "var(--text-accent)" : "var(--text-muted)");
  path.setAttribute("stroke-width", route.isReturn ? "2.2" : "2");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("marker-end", "url(#mdspec-dfd-arrow)");
  group.appendChild(path);

  const label = getEdgeLabel(route.edge);
  if (label) {
    group.appendChild(createEdgeBadge(route.labelX, route.labelY, label));
  }

  return group;
}

function getEdgeLabel(edge: DiagramEdge): string | null {
  return typeof edge.label === "string" && edge.label.trim() ? edge.label.trim() : null;
}

function createEdgeBadge(x: number, y: number, value: string): SVGGElement {
  const group = document.createElementNS(SVG_NS, "g");
  const badge = estimateBadgeBounds(x, y, value, { minWidth: 56 });

  const rect = document.createElementNS(SVG_NS, "rect");
  rect.setAttribute("x", String(badge.x));
  rect.setAttribute("y", String(badge.y));
  rect.setAttribute("width", String(badge.width));
  rect.setAttribute("height", String(badge.height));
  rect.setAttribute("rx", "10");
  rect.setAttribute("fill", "var(--background-primary)");
  rect.setAttribute("stroke", "var(--background-modifier-border)");
  group.appendChild(rect);

  const text = document.createElementNS(SVG_NS, "text");
  text.setAttribute("x", String(x));
  text.setAttribute("y", String(y + 4));
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("font-size", "11px");
  text.setAttribute("font-weight", "600");
  text.setAttribute("fill", "var(--text-normal)");
  text.textContent = value;
  group.appendChild(text);

  return group;
}

function createNodeBox(
  layout: NodeLayout,
  options?: {
    onOpenObject?: (
      objectId: string,
      navigation?: { openInNewLeaf?: boolean }
    ) => void;
  }
): HTMLElement {
  const box = document.createElement("article");
  box.className = "mdspec-dfd-node";
  box.style.position = "absolute";
  box.style.left = `${layout.x}px`;
  box.style.top = `${layout.y}px`;
  box.style.width = `${layout.width}px`;
  box.style.minHeight = `${layout.height}px`;
  box.style.boxSizing = "border-box";
  box.style.background = "var(--background-primary-alt)";
  box.style.color = "var(--text-normal)";
  box.style.overflow = "hidden";
  box.style.cursor = layout.node.object ? "pointer" : "default";
  applyDfdNodeShape(box, layout.node.object?.kind);

  if (!layout.node.object) {
    box.textContent = layout.node.label ?? layout.node.ref ?? layout.node.id;
    box.style.padding = "16px";
    return box;
  }

  if (options?.onOpenObject) {
    box.setAttribute("role", "button");
    box.tabIndex = 0;
    box.addEventListener("click", (event) => {
      options.onOpenObject?.(layout.node.id, {
        openInNewLeaf: event.ctrlKey || event.metaKey
      });
    });
    box.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        options.onOpenObject?.(layout.node.id, { openInNewLeaf: false });
      }
    });
    box.addEventListener("pointerdown", (event) => event.stopPropagation());
  }

  const object = layout.node.object;
  const kind = document.createElement("div");
  kind.textContent = object.kind;
  kind.style.fontSize = "11px";
  kind.style.textTransform = "uppercase";
  kind.style.letterSpacing = "0.08em";
  kind.style.color = "var(--text-muted)";
  kind.style.marginBottom = "8px";

  const title = document.createElement("div");
  title.textContent = layout.node.label ?? object.name;
  title.style.fontWeight = "700";
  title.style.fontSize = "16px";
  title.style.lineHeight = "1.35";

  const id = document.createElement("div");
  id.textContent = object.id;
  id.style.marginTop = "8px";
  id.style.fontSize = "11px";
  id.style.color = "var(--text-muted)";
  id.style.wordBreak = "break-all";

  box.style.padding = "14px 16px";
  box.append(kind, title, id);
  return box;
}

function applyDfdNodeShape(box: HTMLElement, kind: DfdObjectModel["kind"] | undefined): void {
  box.style.border = "2px solid var(--text-normal)";
  box.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.08)";

  switch (kind) {
    case "process":
      box.style.borderRadius = "16px";
      break;
    case "datastore":
      box.style.borderRadius = "8px";
      box.style.boxShadow = "inset 6px 0 0 rgba(0,0,0,0.08), 0 2px 8px rgba(0, 0, 0, 0.08)";
      break;
    case "external":
    default:
      box.style.borderRadius = "4px";
      break;
  }
}

function createFlowDetails(edges: DiagramEdge[]): HTMLElement {
  const section = document.createElement("details");
  section.className = "mdspec-section";
  section.style.marginTop = "10px";
  section.open = false;

  const summary = document.createElement("summary");
  summary.textContent = `Displayed flows (${edges.length})`;
  summary.style.cursor = "pointer";
  summary.style.fontWeight = "600";
  summary.style.padding = "4px 0";
  section.appendChild(summary);

  if (edges.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No flows are currently used for rendering.";
    empty.style.margin = "8px 0 0";
    empty.style.color = "var(--text-muted)";
    section.appendChild(empty);
    return section;
  }

  const list = document.createElement("ul");
  list.style.listStyle = "none";
  list.style.margin = "8px 0 0";
  list.style.padding = "0";
  for (const edge of edges) {
    const item = document.createElement("li");
    item.style.padding = "6px 8px";
    item.style.border = "1px solid var(--background-modifier-border-hover)";
    item.style.borderRadius = "8px";
    item.style.marginBottom = "6px";
    item.style.background = "var(--background-primary-alt)";
    item.style.fontSize = "12px";
    item.textContent = `${edge.id ?? "-"} / ${edge.source} -> ${edge.target} / ${
      edge.label ?? "-"
    }${edge.metadata?.notes ? ` / ${String(edge.metadata.notes)}` : ""}`;
    list.appendChild(item);
  }
  section.appendChild(list);
  return section;
}
