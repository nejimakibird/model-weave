import type {
  DiagramEdge,
  DiagramNode,
  ErEntity,
  ObjectModel,
  ResolvedDiagram
} from "../types/models";
import { erDiagramEdgeToInternalEdge } from "../core/internal-edge-adapters";
import { buildGraphLayout } from "./graph-layout";
import { createErCardinalityBadge, getVisibleErColumns } from "./er-shared";
import {
  attachGraphViewportInteractions,
  computeSceneBounds,
  estimateEdgeLabelBounds,
  getConnectionPoints,
  type GraphViewportState,
  type SceneBounds
} from "./graph-view-shared";
import { createZoomToolbar } from "./zoom-toolbar";

const SVG_NS = "http://www.w3.org/2000/svg";
const NODE_WIDTH = 280;
const HEADER_HEIGHT = 40;
const SECTION_TITLE_HEIGHT = 24;
const ROW_HEIGHT = 20;
const NODE_PADDING = 12;
const COLUMN_GAP = 96;
const ROW_GAP = 92;
const CANVAS_PADDING = 48;
const MIN_ZOOM = 0.45;
const MAX_ZOOM = 2.4;
const INITIAL_ZOOM = 1;

interface NodeLayout {
  node: DiagramNode & { object?: ObjectModel | ErEntity };
  x: number;
  y: number;
  width: number;
  height: number;
}

export function renderErDiagram(
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
  root.className = "mdspec-diagram mdspec-diagram--er";
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.flex = "1 1 auto";
  root.style.minHeight = "0";

  if (!options?.hideTitle) {
    const title = document.createElement("h2");
    title.textContent = `${diagram.diagram.name} (ER)`;
    title.style.flex = "0 0 auto";
    root.appendChild(title);
  }

  const layout = createLayout(diagram.nodes, diagram.edges);
  const sceneBounds = createSceneBounds(diagram.edges, layout.byId);
  const canvas = document.createElement("div");
  canvas.className = "mdspec-er-canvas";
  canvas.style.position = "relative";
  canvas.style.overflow = "hidden";
  canvas.style.padding = "0";
  canvas.style.border = "1px solid var(--background-modifier-border)";
  canvas.style.borderRadius = "8px";
  canvas.style.background = "var(--background-primary)";
  canvas.style.flex = "1 1 auto";
  if (!options?.forExport) {
    canvas.style.minHeight = "420px";
  }
  canvas.style.height = "auto";
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
  viewport.className = "mdspec-er-viewport";
  viewport.style.position = "relative";
  viewport.style.width = "100%";
  viewport.style.height = "100%";
  viewport.style.minHeight = "0";
  viewport.style.overflow = "hidden";

  const surface = document.createElement("div");
  surface.className = "mdspec-er-surface";
  surface.dataset.modelWeaveExportSurface = "true";
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

  for (const edge of diagram.edges) {
    const edgeGroup = renderEdge(edge, layout.byId);
    if (edgeGroup) {
      svg.appendChild(edgeGroup);
    }
  }

  surface.appendChild(svg);

  for (const box of layout.nodes) {
    surface.appendChild(createEntityBox(box, options));
  }

  viewport.appendChild(surface);
  canvas.appendChild(viewport);
  root.appendChild(canvas);

  if (toolbar) {
    attachGraphViewportInteractions(canvas, surface, toolbar, sceneBounds, {
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      initialZoom: INITIAL_ZOOM,
      nodeSelector: ".mdspec-er-node",
      viewportState: options?.viewportState,
      onViewportStateChange: options?.onViewportStateChange
    });
  }

  if (!options?.hideDetails) {
    root.appendChild(createRelationTable(diagram));
  }
  return root;
}

function createLayout(
  nodes: Array<DiagramNode & { object?: ObjectModel | ErEntity }>,
  edges: DiagramEdge[]
): {
  nodes: NodeLayout[];
  byId: Record<string, NodeLayout>;
  width: number;
  height: number;
} {
  return buildGraphLayout(nodes, edges, {
    getWidth: () => NODE_WIDTH,
    getHeight: (node) => measureNodeHeight(node.object),
    canvasPadding: CANVAS_PADDING,
    columnGap: COLUMN_GAP,
    rowGap: ROW_GAP,
    maxColumns: 4
  });
}

function createSceneBounds(
  edges: DiagramEdge[],
  layoutById: Record<string, NodeLayout>
): SceneBounds {
  const nodeBounds = Object.values(layoutById).map((layout) => ({
    x: layout.x,
    y: layout.y,
    width: layout.width,
    height: layout.height
  }));
  const labelBounds = estimateEdgeLabelBounds(
    edges,
    layoutById,
    (edge) => erDiagramEdgeToInternalEdge(edge).cardinality ?? null
  );

  return computeSceneBounds(nodeBounds, labelBounds, CANVAS_PADDING);
}

function measureNodeHeight(object?: ObjectModel | ErEntity): number {
  if (!object) {
    return HEADER_HEIGHT + NODE_PADDING * 2 + ROW_HEIGHT;
  }

  const attributeRows =
    object.fileType === "er-entity"
      ? Math.max(getVisibleErColumns(object.columns).length, 1)
      : Math.max(object.attributes.length, 1);

  return (
    HEADER_HEIGHT +
    SECTION_TITLE_HEIGHT +
    attributeRows * ROW_HEIGHT +
    NODE_PADDING * 2 +
    16
  );
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
  defs.appendChild(
    createTriangleMarker("mdspec-er-arrow", "var(--text-muted)", "var(--text-muted)")
  );
  defs.appendChild(
    createDiamondMarker("mdspec-er-diamond-open", "none", "var(--text-muted)")
  );
  defs.appendChild(
    createDiamondMarker(
      "mdspec-er-diamond-solid",
      "var(--text-muted)",
      "var(--text-muted)"
    )
  );
  return defs;
}

function createTriangleMarker(
  id: string,
  fill: string,
  stroke: string
): SVGMarkerElement {
  const marker = document.createElementNS(SVG_NS, "marker");
  marker.setAttribute("id", id);
  marker.setAttribute("markerWidth", "12");
  marker.setAttribute("markerHeight", "12");
  marker.setAttribute("refX", "10");
  marker.setAttribute("refY", "6");
  marker.setAttribute("orient", "auto");
  marker.setAttribute("markerUnits", "strokeWidth");

  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", "M 0 0 L 10 6 L 0 12 z");
  path.setAttribute("fill", fill);
  path.setAttribute("stroke", stroke);
  path.setAttribute("stroke-width", "1.2");
  marker.appendChild(path);

  return marker;
}

function createDiamondMarker(
  id: string,
  fill: string,
  stroke: string
): SVGMarkerElement {
  const marker = document.createElementNS(SVG_NS, "marker");
  marker.setAttribute("id", id);
  marker.setAttribute("markerWidth", "14");
  marker.setAttribute("markerHeight", "14");
  marker.setAttribute("refX", "12");
  marker.setAttribute("refY", "7");
  marker.setAttribute("orient", "auto");
  marker.setAttribute("markerUnits", "strokeWidth");

  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", "M 0 7 L 4 0 L 12 7 L 4 14 z");
  path.setAttribute("fill", fill);
  path.setAttribute("stroke", stroke);
  path.setAttribute("stroke-width", "1.2");
  marker.appendChild(path);

  return marker;
}

function renderEdge(
  edge: DiagramEdge,
  layoutById: Record<string, NodeLayout>
): SVGGElement | null {
  const source = layoutById[edge.source];
  const target = layoutById[edge.target];

  if (!source || !target) {
    return null;
  }

  const group = document.createElementNS(SVG_NS, "g");
  const { startX, startY, endX, endY, midX, midY } = getConnectionPoints(
    source,
    target
  );

  const line = document.createElementNS(SVG_NS, "line");
  line.setAttribute("x1", String(startX));
  line.setAttribute("y1", String(startY));
  line.setAttribute("x2", String(endX));
  line.setAttribute("y2", String(endY));
  line.setAttribute("stroke", "var(--text-muted)");
  line.setAttribute("stroke-width", "2");
  line.setAttribute("stroke-dasharray", getDashPattern(edge.kind));

  const markers = getMarkerAttributes(edge.kind);
  if (markers.start) {
    line.setAttribute("marker-start", markers.start);
  }
  if (markers.end) {
    line.setAttribute("marker-end", markers.end);
  }

  group.appendChild(line);

  const internalEdge = erDiagramEdgeToInternalEdge(edge);
  const cardinality = internalEdge.cardinality ?? null;
  if (cardinality) {
    group.appendChild(createErCardinalityBadge(midX, midY - 8, cardinality));
  }

  return group;
}

function getDashPattern(kind?: DiagramEdge["kind"]): string {
  switch (kind) {
    case "dependency":
    case "implementation":
      return "8 6";
    default:
      return "0";
  }
}

function getMarkerAttributes(kind?: DiagramEdge["kind"]): {
  start?: string;
  end?: string;
} {
  switch (kind) {
    case "composition":
      return { start: "url(#mdspec-er-diamond-solid)" };
    case "aggregation":
      return { start: "url(#mdspec-er-diamond-open)" };
    case "association":
    case "reference":
    case "flow":
    case "dependency":
    case "implementation":
    case "inheritance":
    default:
      return { end: "url(#mdspec-er-arrow)" };
  }
}

function createEntityBox(
  layout: NodeLayout,
  options?: {
    onOpenObject?: (
      objectId: string,
      navigation?: { openInNewLeaf?: boolean }
    ) => void;
  }
): HTMLElement {
  const box = document.createElement("article");
  box.className = "mdspec-er-node";
  box.style.position = "absolute";
  box.style.left = `${layout.x}px`;
  box.style.top = `${layout.y}px`;
  box.style.width = `${layout.width}px`;
  box.style.minHeight = `${layout.height}px`;
  box.style.boxSizing = "border-box";
  box.style.border = "1px solid var(--background-modifier-border)";
  box.style.borderRadius = "8px";
  box.style.background = "var(--background-primary-alt)";
  box.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.08)";
  box.style.overflow = "hidden";
  box.style.cursor = layout.node.object ? "pointer" : "default";

  if (!layout.node.object) {
    box.appendChild(createFallbackNode(layout.node.ref ?? layout.node.id));
    return box;
  }

  if (options?.onOpenObject) {
    box.setAttribute("role", "button");
    box.setAttribute("tabindex", "0");
    box.title = `Open ${
      layout.node.object.fileType === "er-entity"
        ? layout.node.object.logicalName
        : layout.node.object.name
    }`;
    box.addEventListener("click", (event) => {
      if (event.defaultPrevented) {
        return;
      }

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
    box.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
    });
  }

  const object = layout.node.object;

  const header = document.createElement("header");
  header.style.padding = "10px 12px";
  header.style.borderBottom = "1px solid var(--background-modifier-border)";
  header.style.background =
    "color-mix(in srgb, var(--color-blue) 10%, var(--background-primary-alt))";

  const kind = document.createElement("div");
  kind.style.fontSize = "11px";
  kind.style.textTransform = "uppercase";
  kind.style.letterSpacing = "0.08em";
  kind.style.color = "var(--text-muted)";
  kind.textContent = object.fileType === "er-entity" ? "er_entity" : "entity";

  const title = document.createElement("div");
  title.style.fontWeight = "700";
  title.style.fontSize = "16px";
  title.style.lineHeight = "1.3";
  title.textContent =
    object.fileType === "er-entity" ? object.logicalName : object.name;

  header.append(kind, title);
  box.appendChild(header);

  if (object.fileType === "er-entity") {
    const physical = document.createElement("div");
    physical.style.padding = "8px 12px 0";
    physical.style.fontFamily = "var(--font-monospace)";
    physical.style.fontSize = "12px";
    physical.style.color = "var(--text-muted)";
    physical.textContent = object.physicalName;
    box.appendChild(physical);

      box.appendChild(createAttributeSection(getVisibleErColumns(object.columns)));
      return box;
  }

  box.appendChild(
    createAttributeSection(
      object.attributes.map((attribute) => {
        const detail = attribute.type ? `: ${attribute.type}` : "";
        return `${attribute.name}${detail}`;
      })
    )
  );

  return box;
}

function createAttributeSection(items: string[]): HTMLElement {
  const section = document.createElement("section");
  section.style.padding = "8px 12px 10px";
  section.style.borderTop = "1px solid var(--background-modifier-border)";

  const heading = document.createElement("div");
  heading.style.fontSize = "11px";
  heading.style.fontWeight = "600";
  heading.style.textTransform = "uppercase";
  heading.style.letterSpacing = "0.06em";
  heading.style.color = "var(--text-muted)";
  heading.style.marginBottom = "6px";
  heading.textContent = "Columns";
  section.appendChild(heading);

  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.style.fontSize = "12px";
    empty.style.color = "var(--text-faint)";
    empty.textContent = "None";
    section.appendChild(empty);
    return section;
  }

  const list = document.createElement("ul");
  list.style.margin = "0";
  list.style.paddingLeft = "18px";
  list.style.fontSize = "12px";
  list.style.lineHeight = "1.45";

  for (const item of items) {
    const entry = document.createElement("li");
    entry.textContent = item;
    list.appendChild(entry);
  }

  section.appendChild(list);
  return section;
}

function createRelationTable(diagram: ResolvedDiagram): HTMLElement {
  const section = document.createElement("details");
  section.className = "mdspec-section";
  section.style.marginTop = "10px";
  section.style.flex = "0 0 auto";
  section.open = false;

  const summary = document.createElement("summary");
  summary.textContent = `Resolved relations (${diagram.edges.length})`;
  summary.style.cursor = "pointer";
  summary.style.fontWeight = "600";
  summary.style.padding = "4px 0";
  section.appendChild(summary);

  if (diagram.edges.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "表示対象の relation はありません。";
    empty.style.margin = "8px 0 0";
    empty.style.color = "var(--text-muted)";
    section.appendChild(empty);
    return section;
  }

  const list = document.createElement("ul");
  list.style.listStyle = "none";
  list.style.margin = "8px 0 0";
  list.style.padding = "0";
  list.style.maxWidth = "720px";

  const sortedEdges = [...diagram.edges].sort(compareErEdges);
  for (const edge of sortedEdges) {
    const internalEdge = erDiagramEdgeToInternalEdge(edge);
    const columns = internalEdge.mappings
      .map((mapping) => `${mapping.localColumn} -> ${mapping.targetColumn}`)
      .join(" / ");

    const item = document.createElement("li");
    item.style.padding = "6px 8px";
    item.style.border = "1px solid var(--background-modifier-border-hover)";
    item.style.borderRadius = "8px";
    item.style.marginBottom = "6px";
    item.style.background = "var(--background-primary-alt)";
    item.style.fontSize = "12px";
    item.style.lineHeight = "1.45";
    item.textContent = `${internalEdge.id || "-"} / ${internalEdge.sourceEntity} -> ${
      internalEdge.targetEntity
    } / ${internalEdge.kind || "-"} / ${internalEdge.cardinality || "-"}${
      internalEdge.notes ? ` / ${internalEdge.notes}` : ""
    } / ${columns || "-"}`;
    list.appendChild(item);
  }

  section.appendChild(list);
  return section;
}

function compareErEdges(left: DiagramEdge, right: DiagramEdge): number {
  const leftEdge = erDiagramEdgeToInternalEdge(left);
  const rightEdge = erDiagramEdgeToInternalEdge(right);

  const sourceCompare = leftEdge.sourceEntity.localeCompare(rightEdge.sourceEntity);
  if (sourceCompare !== 0) {
    return sourceCompare;
  }

  const targetCompare = leftEdge.targetEntity.localeCompare(rightEdge.targetEntity);
  if (targetCompare !== 0) {
    return targetCompare;
  }

  return (leftEdge.id || "").localeCompare(rightEdge.id || "");
}

function createFallbackNode(id: string): HTMLElement {
  const box = document.createElement("div");
  box.className = "mdspec-fallback";
  box.style.padding = "16px";
  box.textContent = `Unresolved entity: ${id}`;
  return box;
}
