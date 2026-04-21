import type {
  DiagramEdge,
  DiagramNode,
  ErEntity,
  ObjectModel,
  ResolvedDiagram
} from "../types/models";
import { classDiagramEdgeToInternalEdge } from "../core/internal-edge-adapters";
import { buildGraphLayout } from "./graph-layout";
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

interface NodeLayout {
  node: DiagramNode & { object?: ObjectModel | ErEntity };
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ViewState {
  zoom: number;
  panX: number;
  panY: number;
}

export function renderClassDiagram(
  diagram: ResolvedDiagram,
  options?: {
    onOpenObject?: (
      objectId: string,
      navigation?: { openInNewLeaf?: boolean }
    ) => void;
  }
): HTMLElement {
  const root = document.createElement("section");
  root.className = "mdspec-diagram mdspec-diagram--class";
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.flex = "1 1 auto";
  root.style.minHeight = "0";

  const title = document.createElement("h2");
  title.textContent = `${diagram.diagram.name} (class)`;
  title.style.flex = "0 0 auto";
  root.appendChild(title);

  const layout = createLayout(diagram.nodes, diagram.edges);
  const canvas = document.createElement("div");
  canvas.className = "mdspec-class-canvas";
  canvas.style.position = "relative";
  canvas.style.overflow = "hidden";
  canvas.style.padding = "0";
  canvas.style.border = "1px solid var(--background-modifier-border)";
  canvas.style.borderRadius = "8px";
  canvas.style.background = "var(--background-primary)";
  canvas.style.flex = "1 1 auto";
  canvas.style.minHeight = "420px";
  canvas.style.height = "auto";
  canvas.style.cursor = "grab";
  canvas.style.userSelect = "none";
  canvas.style.touchAction = "none";

  const toolbar = createZoomToolbar("Wheel: zoom / Drag background: pan");
  root.appendChild(toolbar.root);

  const viewport = document.createElement("div");
  viewport.className = "mdspec-class-viewport";
  viewport.style.position = "relative";
  viewport.style.width = "100%";
  viewport.style.height = "100%";
  viewport.style.minHeight = "0";
  viewport.style.overflow = "hidden";

  const surface = document.createElement("div");
  surface.className = "mdspec-class-surface";
  surface.style.position = "absolute";
  surface.style.left = "0";
  surface.style.top = "0";
  surface.style.width = `${layout.width}px`;
  surface.style.height = `${layout.height}px`;
  surface.style.transformOrigin = "0 0";
  surface.style.willChange = "transform";

  const svg = createSvgSurface(layout.width, layout.height);
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

  const state: ViewState = {
    zoom: INITIAL_ZOOM,
    panX: 0,
    panY: 0
  };

  let isPanning = false;
  let pointerId: number | null = null;
  let startClientX = 0;
  let startClientY = 0;
  let startPanX = 0;
  let startPanY = 0;

  const applyTransform = (): void => {
    surface.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
    toolbar.zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;
  };

  const fitToView = (): void => {
    const viewportWidth = canvas.clientWidth || layout.width;
    const viewportHeight = canvas.clientHeight || 720;
    const scaleX = viewportWidth / layout.width;
    const scaleY = viewportHeight / layout.height;
    const nextZoom = clamp(Math.min(scaleX, scaleY), MIN_ZOOM, MAX_ZOOM);

    state.zoom = nextZoom;
    state.panX = Math.max(0, (viewportWidth - layout.width * nextZoom) / 2);
    state.panY = Math.max(0, (viewportHeight - layout.height * nextZoom) / 2);
    applyTransform();
  };

  const zoomAtPoint = (
    nextZoom: number,
    clientX: number,
    clientY: number
  ): void => {
    const clampedZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
    const rect = canvas.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    const worldX = (localX - state.panX) / state.zoom;
    const worldY = (localY - state.panY) / state.zoom;

    state.zoom = clampedZoom;
    state.panX = localX - worldX * clampedZoom;
    state.panY = localY - worldY * clampedZoom;
    applyTransform();
  };

  canvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const delta = event.deltaY < 0 ? 1.12 : 1 / 1.12;
      zoomAtPoint(state.zoom * delta, event.clientX, event.clientY);
    },
    { passive: false }
  );

  canvas.addEventListener("pointerdown", (event) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest(".mdspec-class-node")) {
      return;
    }

    isPanning = true;
    pointerId = event.pointerId;
    startClientX = event.clientX;
    startClientY = event.clientY;
    startPanX = state.panX;
    startPanY = state.panY;
    canvas.style.cursor = "grabbing";
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!isPanning || pointerId !== event.pointerId) {
      return;
    }

    const dx = event.clientX - startClientX;
    const dy = event.clientY - startClientY;
    state.panX = startPanX + dx;
    state.panY = startPanY + dy;
    applyTransform();
  });

  const stopPanning = (event: PointerEvent): void => {
    if (!isPanning || pointerId !== event.pointerId) {
      return;
    }

    isPanning = false;
    pointerId = null;
    canvas.style.cursor = "grab";
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  };

  canvas.addEventListener("pointerup", stopPanning);
  canvas.addEventListener("pointercancel", stopPanning);
  canvas.addEventListener("pointerleave", (event) => {
    if (isPanning && pointerId === event.pointerId) {
      stopPanning(event);
    }
  });

  toolbar.zoomOutButton.addEventListener("click", () => {
    state.zoom = clamp(state.zoom / 1.12, MIN_ZOOM, MAX_ZOOM);
    applyTransform();
  });
  toolbar.zoomInButton.addEventListener("click", () => {
    state.zoom = clamp(state.zoom * 1.12, MIN_ZOOM, MAX_ZOOM);
    applyTransform();
  });
  toolbar.fitButton.addEventListener("click", () => fitToView());
  toolbar.resetButton.addEventListener("click", () => {
    state.zoom = INITIAL_ZOOM;
    state.panX = 0;
    state.panY = 0;
    applyTransform();
  });

  requestAnimationFrame(() => {
    fitToView();
    applyTransform();
  });

  const resizeObserver = new ResizeObserver(() => {
    fitToView();
  });
  resizeObserver.observe(canvas);

  root.appendChild(createConnectionsTable(diagram));
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
  svg.style.position = "absolute";
  svg.style.inset = "0";
  svg.style.pointerEvents = "none";
  svg.style.overflow = "visible";
  return svg;
}

function createMarkerDefinitions(): SVGDefsElement {
  const defs = document.createElementNS(SVG_NS, "defs");
  defs.appendChild(
    createTriangleMarker("mdspec-arrow-solid", "var(--text-muted)", "var(--text-muted)")
  );
  defs.appendChild(createTriangleMarker("mdspec-arrow-open", "none", "var(--text-muted)"));
  defs.appendChild(
    createDiamondMarker("mdspec-diamond-open", "none", "var(--text-muted)")
  );
  defs.appendChild(
    createDiamondMarker(
      "mdspec-diamond-solid",
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

function getConnectionPoints(source: NodeLayout, target: NodeLayout): {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  midX: number;
  midY: number;
} {
  const sourceCenterX = source.x + source.width / 2;
  const sourceCenterY = source.y + source.height / 2;
  const targetCenterX = target.x + target.width / 2;
  const targetCenterY = target.y + target.height / 2;

  const horizontal =
    Math.abs(targetCenterX - sourceCenterX) >=
    Math.abs(targetCenterY - sourceCenterY);

  const startX = horizontal
    ? sourceCenterX < targetCenterX
      ? source.x + source.width
      : source.x
    : sourceCenterX;
  const startY = horizontal
    ? sourceCenterY
    : sourceCenterY < targetCenterY
      ? source.y + source.height
      : source.y;
  const endX = horizontal
    ? sourceCenterX < targetCenterX
      ? target.x
      : target.x + target.width
    : targetCenterX;
  const endY = horizontal
    ? targetCenterY
    : sourceCenterY < targetCenterY
      ? target.y
      : target.y + target.height;

  return {
    startX,
    startY,
    endX,
    endY,
    midX: (startX + endX) / 2,
    midY: (startY + endY) / 2
  };
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
  box.className = "mdspec-class-node";
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
      layout.node.object.fileType === "object"
        ? layout.node.object.name
        : layout.node.object.logicalName
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
  }

  const object = layout.node.object;
  if (object.fileType !== "object") {
    box.appendChild(createFallbackNode(object.logicalName));
    return box;
  }

  const header = document.createElement("header");
  header.style.padding = "10px 12px";
  header.style.borderBottom = "1px solid var(--background-modifier-border)";
  header.style.background = getHeaderBackground(object.kind);

  const kind = document.createElement("div");
  kind.style.fontSize = "11px";
  kind.style.textTransform = "uppercase";
  kind.style.letterSpacing = "0.08em";
  kind.style.color = "var(--text-muted)";
  kind.textContent = object.kind;

  const title = document.createElement("div");
  title.style.fontWeight = "700";
  title.style.fontSize = "16px";
  title.style.lineHeight = "1.3";
  title.textContent = object.name;

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
  section.style.padding = "8px 12px 10px";
  section.style.borderTop = "1px solid var(--background-modifier-border)";

  const heading = document.createElement("div");
  heading.style.fontSize = "11px";
  heading.style.fontWeight = "600";
  heading.style.textTransform = "uppercase";
  heading.style.letterSpacing = "0.06em";
  heading.style.color = "var(--text-muted)";
  heading.style.marginBottom = "6px";
  heading.textContent = title;
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

function getHeaderBackground(kind: ObjectModel["kind"]): string {
  switch (kind) {
    case "interface":
      return "color-mix(in srgb, var(--color-cyan) 12%, var(--background-primary-alt))";
    case "enum":
      return "color-mix(in srgb, var(--color-orange) 12%, var(--background-primary-alt))";
    case "component":
      return "color-mix(in srgb, var(--color-green) 12%, var(--background-primary-alt))";
    case "entity":
      return "color-mix(in srgb, var(--color-blue) 10%, var(--background-primary-alt))";
    case "class":
    default:
      return "color-mix(in srgb, var(--color-purple) 8%, var(--background-primary-alt))";
  }
}

function createConnectionsTable(diagram: ResolvedDiagram): HTMLElement {
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
    empty.textContent = "No relations resolved.";
    empty.style.margin = "8px 0 0";
    section.appendChild(empty);
    return section;
  }

  const list = document.createElement("ul");
  list.style.listStyle = "none";
  list.style.margin = "8px 0 0";
  list.style.padding = "0";
  list.style.maxWidth = "720px";

  for (const edge of diagram.edges) {
    const internalEdge = classDiagramEdgeToInternalEdge(edge);
    const details = buildEdgeDetails(internalEdge);

    const item = document.createElement("li");
    item.style.padding = "6px 8px";
    item.style.border = "1px solid var(--background-modifier-border-hover)";
    item.style.borderRadius = "8px";
    item.style.marginBottom = "6px";
    item.style.background = "var(--background-primary-alt)";
    item.style.fontSize = "12px";
    item.style.lineHeight = "1.45";
    item.textContent = `${internalEdge.sourceClass} -> ${internalEdge.targetClass} / ${
      internalEdge.kind || "-"
    } / ${
      internalEdge.label || "-"
    }${details ? ` / ${details}` : ""}`;
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
  box.className = "mdspec-fallback";
  box.style.padding = "16px";
  box.textContent = `Unresolved object: ${id}`;
  return box;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
