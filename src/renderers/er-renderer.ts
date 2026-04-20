import type {
  DiagramEdge,
  DiagramNode,
  ErColumn,
  ErEntity,
  ObjectModel,
  ResolvedDiagram
} from "../types/models";
import { buildGraphLayout } from "./graph-layout";

const SVG_NS = "http://www.w3.org/2000/svg";
const NODE_WIDTH = 280;
const HEADER_HEIGHT = 40;
const SECTION_TITLE_HEIGHT = 24;
const ROW_HEIGHT = 20;
const NODE_PADDING = 12;
const COLUMN_GAP = 96;
const ROW_GAP = 92;
const CANVAS_PADDING = 48;
const DEFAULT_COLUMN_LIMIT = 5;
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

export function renderErDiagram(
  diagram: ResolvedDiagram,
  options?: {
    onOpenObject?: (
      objectId: string,
      navigation?: { openInNewLeaf?: boolean }
    ) => void;
  }
): HTMLElement {
  const root = document.createElement("section");
  root.className = "mdspec-diagram mdspec-diagram--er";

  const title = document.createElement("h2");
  title.textContent = `${diagram.diagram.name} (ER)`;
  root.appendChild(title);

  const layout = createLayout(diagram.nodes, diagram.edges);
  const canvas = document.createElement("div");
  canvas.className = "mdspec-er-canvas";
  canvas.style.position = "relative";
  canvas.style.overflow = "hidden";
  canvas.style.padding = "0";
  canvas.style.border = "1px solid var(--background-modifier-border)";
  canvas.style.borderRadius = "8px";
  canvas.style.background = "var(--background-primary)";
  canvas.style.height = "720px";
  canvas.style.minHeight = "480px";
  canvas.style.cursor = "grab";
  canvas.style.userSelect = "none";
  canvas.style.touchAction = "none";

  const toolbar = createToolbar();
  const zoomLabel = toolbar.querySelector("[data-role='zoom-label']");
  const fitButton = toolbar.querySelector("[data-role='fit-button']");
  root.appendChild(toolbar);

  const viewport = document.createElement("div");
  viewport.className = "mdspec-er-viewport";
  viewport.style.position = "relative";
  viewport.style.width = "100%";
  viewport.style.height = "100%";
  viewport.style.overflow = "hidden";

  const surface = document.createElement("div");
  surface.className = "mdspec-er-surface";
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
    surface.appendChild(createEntityBox(box, options));
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
    if (zoomLabel instanceof HTMLElement) {
      zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;
    }
  };

  const fitToView = (): void => {
    const viewportWidth = canvas.clientWidth || layout.width;
    const viewportHeight = canvas.clientHeight || 720;
    const scaleX = viewportWidth / layout.width;
    const scaleY = viewportHeight / layout.height;
    const nextZoom = clamp(Math.min(scaleX, scaleY, 1), MIN_ZOOM, MAX_ZOOM);

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
    if (target?.closest(".mdspec-er-node")) {
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

  fitButton?.addEventListener("click", () => fitToView());

  requestAnimationFrame(() => {
    fitToView();
    applyTransform();
  });

  root.appendChild(createRelationTable(diagram));
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
  if (!object) {
    return HEADER_HEIGHT + NODE_PADDING * 2 + ROW_HEIGHT;
  }

  const attributeRows =
    object.fileType === "er-entity"
      ? Math.max(getVisibleColumns(object.columns).length, 1)
      : Math.max(object.attributes.length, 1);

  return (
    HEADER_HEIGHT +
    SECTION_TITLE_HEIGHT +
    attributeRows * ROW_HEIGHT +
    NODE_PADDING * 2 +
    16
  );
}

function createToolbar(): HTMLElement {
  const toolbar = document.createElement("div");
  toolbar.className = "mdspec-er-toolbar";
  toolbar.style.display = "flex";
  toolbar.style.justifyContent = "space-between";
  toolbar.style.alignItems = "center";
  toolbar.style.gap = "12px";
  toolbar.style.margin = "8px 0 10px";

  const help = document.createElement("div");
  help.style.fontSize = "12px";
  help.style.color = "var(--text-muted)";
  help.textContent = "Wheel: zoom / Drag background: pan";

  const controls = document.createElement("div");
  controls.style.display = "flex";
  controls.style.alignItems = "center";
  controls.style.gap = "8px";

  const fitButton = document.createElement("button");
  fitButton.type = "button";
  fitButton.textContent = "Fit";
  fitButton.setAttribute("data-role", "fit-button");

  const zoomLabel = document.createElement("span");
  zoomLabel.setAttribute("data-role", "zoom-label");
  zoomLabel.style.fontSize = "12px";
  zoomLabel.style.minWidth = "52px";
  zoomLabel.style.textAlign = "right";
  zoomLabel.textContent = "100%";

  controls.append(fitButton, zoomLabel);
  toolbar.append(help, controls);
  return toolbar;
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

  const cardinality =
    typeof edge.metadata?.cardinality === "string" ? edge.metadata.cardinality : null;
  if (cardinality) {
    group.appendChild(createEdgeBadge(midX, midY - 8, cardinality));
  }

  return group;
}

function createEdgeBadge(x: number, y: number, value: string): SVGGElement {
  const group = document.createElementNS(SVG_NS, "g");
  const width = Math.max(34, value.length * 8 + 12);
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

    box.appendChild(createAttributeSection(getVisibleColumns(object.columns)));
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

function getVisibleColumns(columns: ErColumn[]): string[] {
  const prioritized = [...columns].sort((left, right) => {
    const leftScore = getColumnPriority(left);
    const rightScore = getColumnPriority(right);

    if (leftScore !== rightScore) {
      return rightScore - leftScore;
    }

    return columns.indexOf(left) - columns.indexOf(right);
  });

  const visible = prioritized.slice(0, DEFAULT_COLUMN_LIMIT).map((column) => {
    const parts = [`${column.logicalName} / ${column.physicalName}`, `: ${column.dataType}`];
    if (column.pk) {
      parts.push(" [PK]");
    }
    return parts.join("");
  });

  if (columns.length > DEFAULT_COLUMN_LIMIT) {
    visible.push("...");
  }

  return visible;
}

function getColumnPriority(column: ErColumn): number {
  if (column.pk) {
    return 3;
  }

  const name = `${column.logicalName} ${column.physicalName}`.toLowerCase();
  if (name.includes("id") || name.includes("_cd") || name.includes("code")) {
    return 2;
  }

  return 1;
}

function createRelationTable(diagram: ResolvedDiagram): HTMLElement {
  const section = document.createElement("section");
  section.className = "mdspec-section";
  section.style.marginTop = "16px";

  const heading = document.createElement("h3");
  heading.textContent = "Resolved relations";
  section.appendChild(heading);

  if (diagram.edges.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No relations resolved.";
    section.appendChild(empty);
    return section;
  }

  const wrapper = document.createElement("div");
  wrapper.style.overflowX = "auto";

  const table = document.createElement("table");
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";

  const headers = [
    "From",
    "To",
    "Relation",
    "Cardinality",
    "Columns"
  ];

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  for (const header of headers) {
    const cell = document.createElement("th");
    cell.textContent = header;
    cell.style.textAlign = "left";
    cell.style.borderBottom = "1px solid var(--background-modifier-border)";
    cell.style.padding = "6px 8px";
    headRow.appendChild(cell);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  for (const edge of diagram.edges) {
    const row = document.createElement("tr");
    const relationName =
      typeof edge.metadata?.logicalName === "string"
        ? edge.metadata.logicalName
        : typeof edge.metadata?.physicalName === "string"
          ? edge.metadata.physicalName
          : edge.label ?? "";
    const cardinality =
      typeof edge.metadata?.cardinality === "string" ? edge.metadata.cardinality : "";
    const columns =
      typeof edge.metadata?.sourceColumn === "string" &&
      typeof edge.metadata?.targetColumn === "string"
        ? `${edge.metadata.sourceColumn} -> ${edge.metadata.targetColumn}`
        : "";

    for (const value of [edge.source, edge.target, relationName, cardinality, columns]) {
      const cell = document.createElement("td");
      cell.textContent = value;
      cell.style.borderBottom = "1px solid var(--background-modifier-border-hover)";
      cell.style.padding = "6px 8px";
      cell.style.verticalAlign = "top";
      row.appendChild(cell);
    }

    tbody.appendChild(row);
  }

  table.appendChild(tbody);
  wrapper.appendChild(table);
  section.appendChild(wrapper);
  return section;
}

function createFallbackNode(id: string): HTMLElement {
  const box = document.createElement("div");
  box.className = "mdspec-fallback";
  box.style.padding = "16px";
  box.textContent = `Unresolved entity: ${id}`;
  return box;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
