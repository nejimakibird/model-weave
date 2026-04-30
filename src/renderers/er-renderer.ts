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
const DIAGRAM_EDGE = "#374151";
const ER_EDGE_STROKE_WIDTH = 2;
const ER_NODE_BORDER_WIDTH = 1;
const ER_ARROW_MARKER_WIDTH = 14;
const ER_ARROW_MARKER_HEIGHT = 14;
const ER_ARROW_TIP_X = 12;
const ER_ARROW_TIP_Y = 7;
const ER_ARROW_EXTRA_PADDING = 6;
const ER_DIAMOND_MARKER_WIDTH = 14;
const ER_DIAMOND_MARKER_HEIGHT = 14;
const ER_DIAMOND_TIP_X = 12;
const ER_DIAMOND_TIP_Y = 7;
const ER_DIAMOND_EXTRA_PADDING = 4;
const ER_MIN_EDGE_VISIBLE_LENGTH = 14;

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
  root.addClass("model-weave-diagram-shell");

  if (!options?.hideTitle) {
    const title = document.createElement("h2");
    title.textContent = `${diagram.diagram.name} (ER)`;
    title.addClass("model-weave-diagram-title");
    root.appendChild(title);
  }

  const layout = createLayout(
    diagram.nodes as Array<DiagramNode & { object?: ObjectModel | ErEntity }>,
    diagram.edges
  );
  const sceneBounds = createSceneBounds(diagram.edges, layout.byId);
  const canvas = document.createElement("div");
  canvas.addClass("model-weave-diagram-canvas");
  if (!options?.forExport) {
    canvas.addClass("model-weave-diagram-canvas-interactive");
  }

  const toolbar = options?.forExport
    ? null
    : createZoomToolbar("Wheel: zoom / Drag background: pan");
  if (toolbar) {
    root.appendChild(toolbar.root);
  }

  const viewport = document.createElement("div");
  viewport.addClass("model-weave-diagram-viewport");

  const surface = document.createElement("div");
  surface.addClass("model-weave-diagram-surface");
  surface.dataset.modelWeaveExportSurface = "true";
  surface.dataset.modelWeaveSceneWidth = `${sceneBounds.width}`;
  surface.dataset.modelWeaveSceneHeight = `${sceneBounds.height}`;
  surface.setCssStyles({
    width: `${sceneBounds.width}px`,
    height: `${sceneBounds.height}px`
  });

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
      nodeSelector: ".model-weave-node",
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
  svg.setAttribute("class", "model-weave-diagram-svg");
  return svg;
}

function createMarkerDefinitions(): SVGDefsElement {
  const defs = document.createElementNS(SVG_NS, "defs");
  defs.appendChild(
    createTriangleMarker("mdspec-er-arrow", DIAGRAM_EDGE, DIAGRAM_EDGE)
  );
  defs.appendChild(
    createDiamondMarker("mdspec-er-diamond-open", "none", DIAGRAM_EDGE)
  );
  defs.appendChild(
    createDiamondMarker(
      "mdspec-er-diamond-solid",
      DIAGRAM_EDGE,
      DIAGRAM_EDGE
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
  marker.setAttribute("markerWidth", String(ER_ARROW_MARKER_WIDTH));
  marker.setAttribute("markerHeight", String(ER_ARROW_MARKER_HEIGHT));
  marker.setAttribute("refX", String(ER_ARROW_TIP_X));
  marker.setAttribute("refY", String(ER_ARROW_TIP_Y));
  marker.setAttribute("orient", "auto");
  marker.setAttribute("markerUnits", "userSpaceOnUse");

  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute(
    "d",
    `M 0 0 L ${ER_ARROW_TIP_X} ${ER_ARROW_TIP_Y} L 0 ${ER_ARROW_MARKER_HEIGHT} z`
  );
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
  marker.setAttribute("markerWidth", String(ER_DIAMOND_MARKER_WIDTH));
  marker.setAttribute("markerHeight", String(ER_DIAMOND_MARKER_HEIGHT));
  marker.setAttribute("refX", String(ER_DIAMOND_TIP_X));
  marker.setAttribute("refY", String(ER_DIAMOND_TIP_Y));
  marker.setAttribute("orient", "auto");
  marker.setAttribute("markerUnits", "strokeWidth");

  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute(
    "d",
    `M 0 ${ER_DIAMOND_TIP_Y} L 4 0 L ${ER_DIAMOND_TIP_X} ${ER_DIAMOND_TIP_Y} L 4 ${ER_DIAMOND_MARKER_HEIGHT} z`
  );
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
  const basePoints = getConnectionPoints(source, target);
  const markers = getMarkerAttributes(edge.kind);
  const { startX, startY, endX, endY, midX, midY } = insetConnectionPoints(
    basePoints,
    markers
  );

  const line = document.createElementNS(SVG_NS, "line");
  line.setAttribute("x1", String(startX));
  line.setAttribute("y1", String(startY));
  line.setAttribute("x2", String(endX));
  line.setAttribute("y2", String(endY));
  line.setAttribute("stroke", DIAGRAM_EDGE);
  line.setAttribute("stroke-width", String(ER_EDGE_STROKE_WIDTH));
  line.setAttribute("stroke-dasharray", getDashPattern(edge.kind));

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

function insetConnectionPoints(
  points: ReturnType<typeof getConnectionPoints>,
  markers: { start?: string; end?: string }
): ReturnType<typeof getConnectionPoints> {
  const dx = points.endX - points.startX;
  const dy = points.endY - points.startY;
  const length = Math.hypot(dx, dy);
  if (length <= 0.001) {
    return points;
  }

  const ux = dx / length;
  const uy = dy / length;
  const desiredStartInset = getMarkerClearance(markers.start);
  const desiredEndInset = getMarkerClearance(markers.end);
  const maxInsetPerSide = Math.max(0, (length - ER_MIN_EDGE_VISIBLE_LENGTH) / 2);
  const startInset = Math.min(desiredStartInset, maxInsetPerSide);
  const endInset = Math.min(desiredEndInset, maxInsetPerSide);
  const usableLength = length - startInset - endInset;
  if (usableLength <= 8) {
    return points;
  }

  const startX = points.startX + ux * startInset;
  const startY = points.startY + uy * startInset;
  const endX = points.endX - ux * endInset;
  const endY = points.endY - uy * endInset;

  return {
    startX,
    startY,
    endX,
    endY,
    midX: (startX + endX) / 2,
    midY: (startY + endY) / 2
  };
}

function getMarkerClearance(markerRef?: string): number {
  if (!markerRef) {
    return 0;
  }

  if (markerRef.includes("mdspec-er-arrow")) {
    return (
      ER_ARROW_TIP_X +
      ER_EDGE_STROKE_WIDTH +
      ER_NODE_BORDER_WIDTH +
      ER_ARROW_EXTRA_PADDING
    );
  }

  if (
    markerRef.includes("mdspec-er-diamond-open") ||
    markerRef.includes("mdspec-er-diamond-solid")
  ) {
    return (
      ER_DIAMOND_TIP_X +
      ER_EDGE_STROKE_WIDTH +
      ER_NODE_BORDER_WIDTH +
      ER_DIAMOND_EXTRA_PADDING
    );
  }

  return ER_EDGE_STROKE_WIDTH + ER_NODE_BORDER_WIDTH + ER_ARROW_EXTRA_PADDING;
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
  box.addClass("model-weave-node");
  box.addClass("model-weave-node-er");
  box.setCssStyles({
    left: `${layout.x}px`,
    top: `${layout.y}px`,
    width: `${layout.width}px`,
    minHeight: `${layout.height}px`
  });

  if (!layout.node.object) {
    box.appendChild(createFallbackNode(layout.node.label ?? layout.node.ref ?? layout.node.id));
    return box;
  }

  if (options?.onOpenObject) {
    box.addClass("model-weave-node-clickable");
    box.setAttribute("role", "button");
    box.setAttribute("tabindex", "0");
    box.title = `Open ${
      layout.node.label ??
      (layout.node.object.fileType === "er-entity"
        ? layout.node.object.logicalName
        : layout.node.object.name)
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
  header.addClass("model-weave-node-header");
  header.addClass("model-weave-node-header-er");

  const kind = document.createElement("div");
  kind.addClass("model-weave-node-kind");
  kind.textContent = object.fileType === "er-entity" ? "er_entity" : "entity";

  const title = document.createElement("div");
  title.addClass("model-weave-node-title");
  title.addClass("model-weave-node-er-logical");
  title.textContent =
    layout.node.label ??
    (object.fileType === "er-entity" ? object.logicalName : object.name);

  header.append(kind, title);
  box.appendChild(header);

  if (object.fileType === "er-entity") {
    const physical = document.createElement("div");
    physical.addClass("model-weave-node-er-physical");
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
  section.addClass("model-weave-node-section");

  const heading = document.createElement("div");
  heading.addClass("model-weave-node-section-heading");
  heading.textContent = "Columns";
  section.appendChild(heading);

  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.addClass("model-weave-node-empty");
    empty.textContent = "None";
    section.appendChild(empty);
    return section;
  }

  const list = document.createElement("ul");
  list.addClass("model-weave-node-list");

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
  section.addClass("model-weave-diagram-details");
  section.open = false;

  const summary = document.createElement("summary");
  summary.textContent = `Resolved relations (${diagram.edges.length})`;
  summary.addClass("model-weave-diagram-details-summary");
  section.appendChild(summary);

  if (diagram.edges.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "表示対象の relation はありません。";
    empty.addClass("model-weave-diagram-details-empty");
    section.appendChild(empty);
    return section;
  }

  const list = document.createElement("ul");
  list.addClass("model-weave-diagram-details-list");

  const sortedEdges = [...diagram.edges].sort(compareErEdges);
  for (const edge of sortedEdges) {
    const internalEdge = erDiagramEdgeToInternalEdge(edge);
    const columns = internalEdge.mappings
      .map((mapping) => `${mapping.localColumn} -> ${mapping.targetColumn}`)
      .join(" / ");

    const item = document.createElement("li");
    item.addClass("model-weave-diagram-details-item");
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
  box.addClass("model-weave-node-empty");
  box.textContent = `Unresolved entity: ${id}`;
  return box;
}
