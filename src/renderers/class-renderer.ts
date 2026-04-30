import type {
  DiagramEdge,
  DiagramNode,
  ErEntity,
  ObjectModel,
  ResolvedDiagram
} from "../types/models";
import { classDiagramEdgeToInternalEdge } from "../core/internal-edge-adapters";
import { buildGraphLayout } from "./graph-layout";
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
const NODE_WIDTH = 300;
const HEADER_HEIGHT = 38;
const SECTION_TITLE_HEIGHT = 24;
const ROW_HEIGHT = 20;
const NODE_PADDING = 12;
const COLUMN_GAP = 96;
const ROW_GAP = 92;
const CANVAS_PADDING = 48;
const DEFAULT_ATTRIBUTE_LIMIT = 5;
const DEFAULT_METHOD_LIMIT = 5;
const MIN_ZOOM = 0.45;
const MAX_ZOOM = 2.4;
const INITIAL_ZOOM = 1;
const DIAGRAM_LABEL_BG = "#ffffff";
const DIAGRAM_LABEL_BORDER = "#e5e7eb";
const DIAGRAM_LABEL_TEXT = "#111827";
const DIAGRAM_EDGE = "#374151";

interface NodeLayout {
  node: DiagramNode & { object?: ObjectModel | ErEntity };
  x: number;
  y: number;
  width: number;
  height: number;
}

export function renderClassDiagram(
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
    title.textContent = `${diagram.diagram.name} (class)`;
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
      nodeSelector: ".model-weave-node",
      viewportState: options?.viewportState,
      onViewportStateChange: options?.onViewportStateChange
    });
  }

  if (!options?.hideDetails) {
    root.appendChild(createConnectionsTable(diagram));
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
    getMinimalEdgeLabel
  );

  return computeSceneBounds(nodeBounds, labelBounds, CANVAS_PADDING);
}

function measureNodeHeight(object?: ObjectModel | ErEntity): number {
  if (!object || object.fileType !== "object") {
    return HEADER_HEIGHT + NODE_PADDING * 2 + ROW_HEIGHT;
  }

  const attributeRows = Math.max(getVisibleAttributes(object).length, 1);
  const methodRows = Math.max(getVisibleMethods(object).length, 1);

  return (
    HEADER_HEIGHT +
    SECTION_TITLE_HEIGHT +
    attributeRows * ROW_HEIGHT +
    SECTION_TITLE_HEIGHT +
    methodRows * ROW_HEIGHT +
    NODE_PADDING * 2
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
    createTriangleMarker("mdspec-arrow-solid", DIAGRAM_EDGE, DIAGRAM_EDGE)
  );
  defs.appendChild(createTriangleMarker("mdspec-arrow-open", "none", DIAGRAM_EDGE));
  defs.appendChild(
    createDiamondMarker("mdspec-diamond-open", "none", DIAGRAM_EDGE)
  );
  defs.appendChild(
    createDiamondMarker(
      "mdspec-diamond-solid",
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
  line.setAttribute("stroke", DIAGRAM_EDGE);
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

  const edgeLabel = getMinimalEdgeLabel(edge);
  if (edgeLabel) {
    group.appendChild(createEdgeBadge(midX, midY - 8, edgeLabel));
  }

  return group;
}

function getMinimalEdgeLabel(edge: DiagramEdge): string | null {
  const internalEdge = classDiagramEdgeToInternalEdge(edge);
  switch (internalEdge.kind) {
    case "inheritance":
      return "inheritance";
    case "implementation":
      return "implementation";
    case "dependency":
      return "dependency";
    case "composition":
      return "composition";
    case "aggregation":
      return "aggregation";
    case "association":
      return "association";
    default:
      return internalEdge.kind ?? null;
  }
}

function createEdgeBadge(x: number, y: number, value: string): SVGGElement {
  const group = document.createElementNS(SVG_NS, "g");
  const width = Math.max(52, value.length * 8 + 12);
  const height = 20;

  const rect = document.createElementNS(SVG_NS, "rect");
  rect.setAttribute("x", String(x - width / 2));
  rect.setAttribute("y", String(y - height / 2));
  rect.setAttribute("width", String(width));
  rect.setAttribute("height", String(height));
  rect.setAttribute("rx", "10");
  rect.setAttribute("fill", DIAGRAM_LABEL_BG);
  rect.setAttribute("stroke", DIAGRAM_LABEL_BORDER);
  group.appendChild(rect);

  const text = document.createElementNS(SVG_NS, "text");
  text.setAttribute("x", String(x));
  text.setAttribute("y", String(y + 4));
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("font-size", "11px");
  text.setAttribute("font-weight", "600");
  text.setAttribute("fill", DIAGRAM_LABEL_TEXT);
  text.textContent = value;
  group.appendChild(text);

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
    case "inheritance":
      return { end: "url(#mdspec-arrow-open)" };
    case "implementation":
      return { end: "url(#mdspec-arrow-open)" };
    case "dependency":
      return { end: "url(#mdspec-arrow-solid)" };
    case "aggregation":
      return { start: "url(#mdspec-diamond-open)" };
    case "composition":
      return { start: "url(#mdspec-diamond-solid)" };
    case "association":
    case "reference":
    case "flow":
    default:
      return { end: "url(#mdspec-arrow-solid)" };
  }
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
  box.addClass("model-weave-node");
  box.addClass(
    layout.node.object?.fileType === "object" && layout.node.object.kind === "interface"
      ? "model-weave-node-interface"
      : "model-weave-node-class"
  );
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
      (layout.node.object.fileType === "object"
        ? layout.node.object.name
        : layout.node.object.logicalName)
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
  if (object.fileType !== "object") {
    box.appendChild(createFallbackNode(layout.node.label ?? object.logicalName));
    return box;
  }

  const header = document.createElement("header");
  header.addClass("model-weave-node-header");
  header.addClass(getHeaderModifierClass(object.kind));

  const kind = document.createElement("div");
  kind.addClass("model-weave-node-kind");
  kind.textContent = object.kind;

  const title = document.createElement("div");
  title.addClass("model-weave-node-title");
  title.textContent = layout.node.label ?? object.name;

  header.append(kind, title);
  box.appendChild(header);

  box.appendChild(createNodeSection("Attributes", getVisibleAttributes(object)));
  box.appendChild(createNodeSection("Methods", getVisibleMethods(object)));
  return box;
}

function getVisibleAttributes(object: ObjectModel): string[] {
  const visible = object.attributes
    .slice(0, DEFAULT_ATTRIBUTE_LIMIT)
    .map((attribute) => {
      const detail = attribute.type ? `: ${attribute.type}` : "";
      return `${attribute.name}${detail}`;
    });

  if (object.attributes.length > DEFAULT_ATTRIBUTE_LIMIT) {
    visible.push("...");
  }

  return visible;
}

function getVisibleMethods(object: ObjectModel): string[] {
  const visible = object.methods
    .slice(0, DEFAULT_METHOD_LIMIT)
    .map((method) => {
      const parameters = method.parameters
        .map((parameter) =>
          `${parameter.name}${parameter.type ? `: ${parameter.type}` : ""}`
        )
        .join(", ");
      const returnType = method.returnType ? ` ${method.returnType}` : "";
      return `${method.name}(${parameters})${returnType}`;
    });

  if (object.methods.length > DEFAULT_METHOD_LIMIT) {
    visible.push("...");
  }

  return visible;
}

function createNodeSection(title: string, items: string[]): HTMLElement {
  const section = document.createElement("section");
  section.addClass("model-weave-node-section");

  const heading = document.createElement("div");
  heading.addClass("model-weave-node-section-heading");
  heading.textContent = title;
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

function getHeaderModifierClass(kind: ObjectModel["kind"]): string {
  switch (kind) {
    case "interface":
      return "model-weave-node-header-interface";
    case "enum":
      return "model-weave-node-header-enum";
    case "component":
      return "model-weave-node-header-component";
    case "entity":
      return "model-weave-node-header-entity";
    case "class":
    default:
      return "model-weave-node-header-class";
  }
}

function createConnectionsTable(diagram: ResolvedDiagram): HTMLElement {
  const section = document.createElement("details");
  section.addClass("model-weave-diagram-details");
  section.open = false;

  const summary = document.createElement("summary");
  summary.textContent = `Displayed relations (${diagram.edges.length})`;
  summary.addClass("model-weave-diagram-details-summary");
  section.appendChild(summary);

  if (diagram.edges.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No relations are currently used for rendering.";
    empty.addClass("model-weave-diagram-details-empty");
    section.appendChild(empty);
    return section;
  }

  const list = document.createElement("ul");
  list.addClass("model-weave-diagram-details-list");

  const sortedEdges = [...diagram.edges].sort(compareClassEdges);
  for (const edge of sortedEdges) {
    const internalEdge = classDiagramEdgeToInternalEdge(edge);
    const details = buildEdgeDetails(internalEdge);

    const item = document.createElement("li");
    item.addClass("model-weave-diagram-details-item");
    item.textContent = `${internalEdge.id || "-"} / ${internalEdge.sourceClass} -> ${
      internalEdge.targetClass
    } / ${internalEdge.kind || "-"} / ${internalEdge.label || "-"}${
      details ? ` / ${details}` : ""
    }${internalEdge.notes ? ` / ${internalEdge.notes}` : ""}`;
    list.appendChild(item);
  }

  section.appendChild(list);
  return section;
}

function buildEdgeDetails(
  edge: ReturnType<typeof classDiagramEdgeToInternalEdge>
): string {
  const parts: string[] = [];

  if (edge.fromMultiplicity) {
    parts.push(`from: ${edge.fromMultiplicity}`);
  }

  if (edge.toMultiplicity) {
    parts.push(`to: ${edge.toMultiplicity}`);
  }

  return parts.join(" / ");
}

function createFallbackNode(id: string): HTMLElement {
  const box = document.createElement("div");
  box.addClass("model-weave-node-empty");
  box.textContent = `Unresolved object: ${id}`;
  return box;
}

function compareClassEdges(left: DiagramEdge, right: DiagramEdge): number {
  const leftEdge = classDiagramEdgeToInternalEdge(left);
  const rightEdge = classDiagramEdgeToInternalEdge(right);

  const sourceCompare = leftEdge.sourceClass.localeCompare(rightEdge.sourceClass);
  if (sourceCompare !== 0) {
    return sourceCompare;
  }

  const targetCompare = leftEdge.targetClass.localeCompare(rightEdge.targetClass);
  if (targetCompare !== 0) {
    return targetCompare;
  }

  return (leftEdge.id || "").localeCompare(rightEdge.id || "");
}
