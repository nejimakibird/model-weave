import type {
  FocusObject,
  RelatedObjectEntry,
  ResolvedObjectContext
} from "../core/object-context-resolver";
import { toClassRelationEdge } from "../core/internal-edge-adapters";
import type { ErRelationEdge, ObjectModel, RelationModel } from "../types/models";
import { createErCardinalityBadge, getVisibleErColumns } from "./er-shared";
import { createZoomToolbar } from "./zoom-toolbar";

const SVG_NS = "http://www.w3.org/2000/svg";
const MINI_GRAPH_MIN_HEIGHT = 360;
const MINI_GRAPH_MAX_ENTRIES = 8;
const MIN_SCALE = 0.5;
const MAX_SCALE = 2.5;
const ZOOM_STEP = 0.15;
const VIEWPORT_PADDING = 28;
const BASE_CENTER_X = 280;
const BASE_CENTER_Y = 200;
const BASE_ORBIT_X = 190;
const BASE_ORBIT_Y = 138;
const BAND_OFFSET_X = 112;
const BAND_GAP_Y = 28;
const GRAPH_PADDING_X = 52;
const GRAPH_PADDING_Y = 40;
const LABEL_CLEARANCE_X = 92;
const CENTER_CARD_WIDTH = 220;
const RELATED_CARD_WIDTH = 176;
const ER_PREVIEW_LIMIT = 5;

interface GraphNodeLayout {
  card: HTMLElement;
  centerX: number;
  centerY: number;
  width: number;
}

interface MiniGraphLayoutResult {
  width: number;
  height: number;
}

export function renderObjectContext(
  context: ResolvedObjectContext,
  options?: {
    onOpenObject?: (
      objectId: string,
      navigation?: { openInNewLeaf?: boolean }
    ) => void;
  }
): HTMLElement {
  const root = document.createElement("section");
  root.className = "mdspec-object-context";
  root.style.marginTop = "10px";
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.flex = "1 1 auto";
  root.style.minHeight = "0";

  const titleRow = document.createElement("div");
  titleRow.style.display = "flex";
  titleRow.style.alignItems = "center";
  titleRow.style.justifyContent = "space-between";
  titleRow.style.gap = "8px";

  const title = document.createElement("h3");
  title.textContent = "Related Objects";
  title.style.margin = "0";
  titleRow.appendChild(title);

  const count = document.createElement("span");
  count.textContent = `${context.relatedObjects.length} linked`;
  count.style.fontSize = "11px";
  count.style.color = "var(--text-muted)";
  titleRow.appendChild(count);
  root.appendChild(titleRow);

  if (context.relatedObjects.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No related objects found.";
    empty.style.marginTop = "10px";
    root.appendChild(empty);
    return root;
  }

  root.appendChild(createMiniGraph(context, options));
  root.appendChild(createRelatedList(context, options));
  return root;
}

function createMiniGraph(
  context: ResolvedObjectContext,
  options?: {
    onOpenObject?: (
      objectId: string,
      navigation?: { openInNewLeaf?: boolean }
    ) => void;
  }
): HTMLElement {
  const wrapper = document.createElement("section");
  wrapper.className = "mdspec-related-graph";
  wrapper.style.marginTop = "10px";
  wrapper.style.border = "1px solid var(--background-modifier-border)";
  wrapper.style.borderRadius = "10px";
  wrapper.style.background = "var(--background-primary-alt)";
  wrapper.style.display = "flex";
  wrapper.style.flexDirection = "column";
  wrapper.style.flex = "1 1 auto";
  wrapper.style.minHeight = `${MINI_GRAPH_MIN_HEIGHT}px`;
  wrapper.style.overflow = "hidden";

  const toolbar = createZoomToolbar("Wheel: zoom / Drag background: pan");
  toolbar.root.style.padding = "8px 10px";
  toolbar.root.style.margin = "0";
  toolbar.root.style.borderBottom = "1px solid var(--background-modifier-border)";
  wrapper.appendChild(toolbar.root);

  const viewport = document.createElement("div");
  viewport.style.position = "relative";
  viewport.style.flex = "1 1 auto";
  viewport.style.minHeight = `${MINI_GRAPH_MIN_HEIGHT}px`;
  viewport.style.overflow = "auto";
  viewport.style.cursor = "grab";
  viewport.style.padding = "0";
  viewport.style.background =
    "radial-gradient(circle at center, color-mix(in srgb, var(--background-primary) 92%, transparent), var(--background-primary-alt))";
  wrapper.appendChild(viewport);

  const frame = document.createElement("div");
  frame.style.position = "relative";
  viewport.appendChild(frame);

  const scene = document.createElement("div");
  scene.style.position = "relative";
  scene.style.left = "0";
  scene.style.top = "0";
  scene.style.transformOrigin = "top left";
  frame.appendChild(scene);

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.style.position = "absolute";
  svg.style.inset = "0";
  svg.style.pointerEvents = "none";
  svg.appendChild(createMiniGraphMarkerDefinitions());
  scene.appendChild(svg);

  const centerCard = createFocusNode(context, options);
  centerCard.style.position = "absolute";
  centerCard.style.width = `${CENTER_CARD_WIDTH}px`;
  scene.appendChild(centerCard);

  const relatedCards: Array<{ entry: RelatedObjectEntry; card: HTMLElement }> = [];
  const entries = context.relatedObjects.slice(0, MINI_GRAPH_MAX_ENTRIES);
  for (const entry of entries) {
    const card = createRelatedNode(entry, options);
    card.style.position = "absolute";
    card.style.width = `${RELATED_CARD_WIDTH}px`;
    scene.appendChild(card);
    relatedCards.push({ entry, card });
  }

  let scale = 1;
  let isPanning = false;
  let panPointerId: number | null = null;
  let startX = 0;
  let startY = 0;
  let startScrollLeft = 0;
  let startScrollTop = 0;
  let baseLayout: MiniGraphLayoutResult = {
    width: GRAPH_BASE_WIDTH,
    height: GRAPH_BASE_HEIGHT
  };

  const applySceneMetrics = (): void => {
    frame.style.width = `${baseLayout.width * scale}px`;
    frame.style.height = `${baseLayout.height * scale}px`;
    scene.style.width = `${baseLayout.width}px`;
    scene.style.height = `${baseLayout.height}px`;
    scene.style.transform = `scale(${scale})`;
  };

  const applyScale = (nextScale: number, anchor?: { x: number; y: number }): void => {
    const clamped = clamp(nextScale, MIN_SCALE, MAX_SCALE);
    if (Math.abs(clamped - scale) < 0.001) {
      updateZoomLabel(toolbar.zoomLabel, scale);
      return;
    }

    const previousScale = scale;
    const fallbackAnchor = {
      x: viewport.clientWidth / 2,
      y: viewport.clientHeight / 2
    };
    const effectiveAnchor = anchor ?? fallbackAnchor;
    const contentX = (viewport.scrollLeft + effectiveAnchor.x) / previousScale;
    const contentY = (viewport.scrollTop + effectiveAnchor.y) / previousScale;

    scale = clamped;
    applySceneMetrics();

    viewport.scrollLeft = contentX * scale - effectiveAnchor.x;
    viewport.scrollTop = contentY * scale - effectiveAnchor.y;
    updateZoomLabel(toolbar.zoomLabel, scale);
  };

  const fitToView = (): void => {
    baseLayout = layoutCards(centerCard, relatedCards, context.object);
    applySceneMetrics();
    renderMiniGraphConnections(scene, svg, centerCard, relatedCards, context.object);
    const bounds = measureGraphBounds(
      scene,
      svg,
      [centerCard, ...relatedCards.map(({ card }) => card)]
    );
    const availableWidth = Math.max(viewport.clientWidth - VIEWPORT_PADDING * 2, 120);
    const availableHeight = Math.max(viewport.clientHeight - VIEWPORT_PADDING * 2, 120);
    const fitScale = clamp(
      Math.min(availableWidth / bounds.width, availableHeight / bounds.height),
      MIN_SCALE,
      MAX_SCALE
    );

    scale = fitScale;
    applySceneMetrics();

    const scaledBounds = measureGraphBounds(
      scene,
      svg,
      [centerCard, ...relatedCards.map(({ card }) => card)]
    );
    viewport.scrollLeft = Math.max(
      0,
      (scaledBounds.left + scaledBounds.width / 2) * scale - viewport.clientWidth / 2
    );
    viewport.scrollTop = Math.max(
      0,
      (scaledBounds.top + scaledBounds.height / 2) * scale - viewport.clientHeight / 2
    );
    updateZoomLabel(toolbar.zoomLabel, scale);
  };

  toolbar.zoomOutButton.addEventListener("click", () => {
    applyScale(scale - ZOOM_STEP);
  });
  toolbar.zoomInButton.addEventListener("click", () => {
    applyScale(scale + ZOOM_STEP);
  });
  toolbar.fitButton.addEventListener("click", () => {
    fitToView();
  });
  toolbar.resetButton.addEventListener("click", () => {
    applyScale(1);
  });

  viewport.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const rect = viewport.getBoundingClientRect();
      const anchor = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
      const nextScale = scale + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP);
      applyScale(nextScale, anchor);
    },
    { passive: false }
  );

  viewport.addEventListener("pointerdown", (event) => {
    const target = event.target as Node | null;
    if (!target || !(target === viewport || target === scene || target === svg)) {
      return;
    }

    isPanning = true;
    panPointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    startScrollLeft = viewport.scrollLeft;
    startScrollTop = viewport.scrollTop;
    viewport.style.cursor = "grabbing";
    viewport.setPointerCapture(event.pointerId);
  });

  viewport.addEventListener("pointermove", (event) => {
    if (!isPanning || panPointerId !== event.pointerId) {
      return;
    }

    viewport.scrollLeft = startScrollLeft - (event.clientX - startX);
    viewport.scrollTop = startScrollTop - (event.clientY - startY);
  });

  const stopPanning = (event: PointerEvent): void => {
    if (!isPanning || panPointerId !== event.pointerId) {
      return;
    }

    isPanning = false;
    panPointerId = null;
    viewport.style.cursor = "grab";
    if (viewport.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId);
    }
  };

  viewport.addEventListener("pointerup", stopPanning);
  viewport.addEventListener("pointercancel", stopPanning);

  const resizeObserver = new ResizeObserver(() => {
    baseLayout = layoutCards(centerCard, relatedCards, context.object);
    applySceneMetrics();
    renderMiniGraphConnections(scene, svg, centerCard, relatedCards, context.object);
  });
  resizeObserver.observe(viewport);
  resizeObserver.observe(scene);
  resizeObserver.observe(centerCard);
  relatedCards.forEach(({ card }) => {
    resizeObserver.observe(card);
  });

  queueMicrotask(() => {
    fitToView();
  });

  return wrapper;
}

function layoutCards(
  centerCard: HTMLElement,
  relatedCards: Array<{ entry: RelatedObjectEntry; card: HTMLElement }>,
  object: FocusObject
): MiniGraphLayoutResult {
  if (object.fileType !== "er-entity") {
    centerCard.style.left = `${BASE_CENTER_X - CENTER_CARD_WIDTH / 2}px`;
    centerCard.style.top = `${BASE_CENTER_Y - 44}px`;
    centerCard.style.width = `${CENTER_CARD_WIDTH}px`;

    relatedCards.forEach(({ card }, index) => {
      const angle =
        -Math.PI / 2 + (index * Math.PI * 2) / Math.max(relatedCards.length, 1);
      const x = BASE_CENTER_X + Math.cos(angle) * BASE_ORBIT_X;
      const y = BASE_CENTER_Y + Math.sin(angle) * BASE_ORBIT_Y;
      card.style.left = `${x - RELATED_CARD_WIDTH / 2}px`;
      card.style.top = `${y - 38}px`;
      card.style.width = `${RELATED_CARD_WIDTH}px`;
    });

    return {
      width: GRAPH_BASE_WIDTH,
      height: GRAPH_BASE_HEIGHT
    };
  }

  const centerHeight = centerCard.offsetHeight || estimateCardHeight(centerCard);
  const inboundCards = [...relatedCards]
    .filter(({ entry }) => entry.direction === "incoming")
    .sort(compareRelatedEntries);
  const outboundCards = [...relatedCards]
    .filter(({ entry }) => entry.direction === "outgoing")
    .sort(compareRelatedEntries);
  const inboundHeight = measureColumnHeight(inboundCards);
  const outboundHeight = measureColumnHeight(outboundCards);
  const contentHeight = Math.max(centerHeight, inboundHeight, outboundHeight);
  const centerLeft =
    GRAPH_PADDING_X + RELATED_CARD_WIDTH + BAND_OFFSET_X + LABEL_CLEARANCE_X;
  const centerTop = GRAPH_PADDING_Y + (contentHeight - centerHeight) / 2;
  const leftColumnX = GRAPH_PADDING_X;
  const rightColumnX =
    centerLeft + CENTER_CARD_WIDTH + BAND_OFFSET_X + LABEL_CLEARANCE_X;

  centerCard.style.left = `${centerLeft}px`;
  centerCard.style.top = `${centerTop}px`;
  centerCard.style.width = `${CENTER_CARD_WIDTH}px`;

  layoutColumn(inboundCards, leftColumnX, contentHeight);
  layoutColumn(outboundCards, rightColumnX, contentHeight);

  return {
    width: rightColumnX + RELATED_CARD_WIDTH + GRAPH_PADDING_X,
    height: GRAPH_PADDING_Y * 2 + contentHeight
  };
}

function layoutColumn(
  cards: Array<{ entry: RelatedObjectEntry; card: HTMLElement }>,
  columnLeft: number,
  contentHeight: number
): void {
  const totalHeight = measureColumnHeight(cards);
  let currentTop = GRAPH_PADDING_Y + Math.max(0, (contentHeight - totalHeight) / 2);

  for (const { card } of cards) {
    const height = card.offsetHeight || estimateCardHeight(card);
    card.style.left = `${columnLeft}px`;
    card.style.top = `${currentTop}px`;
    card.style.width = `${RELATED_CARD_WIDTH}px`;
    currentTop += height + BAND_GAP_Y;
  }
}

function measureColumnHeight(
  cards: Array<{ entry: RelatedObjectEntry; card: HTMLElement }>
): number {
  if (cards.length === 0) {
    return 0;
  }

  return cards.reduce((total, { card }, index) => {
    const height = card.offsetHeight || estimateCardHeight(card);
    return total + height + (index === cards.length - 1 ? 0 : BAND_GAP_Y);
  }, 0);
}

function estimateCardHeight(card: HTMLElement): number {
  return Math.max(120, card.getBoundingClientRect().height || card.scrollHeight || card.offsetHeight);
}

function compareRelatedEntries(
  left: { entry: RelatedObjectEntry; card: HTMLElement },
  right: { entry: RelatedObjectEntry; card: HTMLElement }
): number {
  const leftObject = left.entry.relatedObject;
  const rightObject = right.entry.relatedObject;
  const leftKey =
    leftObject?.fileType === "er-entity"
      ? `${leftObject.logicalName}|${leftObject.physicalName}`
      : left.entry.relatedObjectId;
  const rightKey =
    rightObject?.fileType === "er-entity"
      ? `${rightObject.logicalName}|${rightObject.physicalName}`
      : right.entry.relatedObjectId;
  return leftKey.localeCompare(rightKey, "ja");
}

function renderMiniGraphConnections(
  scene: HTMLElement,
  svg: SVGSVGElement,
  centerCard: HTMLElement,
  relatedCards: Array<{ entry: RelatedObjectEntry; card: HTMLElement }>,
  object: FocusObject
): void {
  if (!scene.isConnected) {
    return;
  }

  const width = scene.clientWidth;
  const height = scene.clientHeight;
  if (width === 0 || height === 0) {
    return;
  }

  svg.replaceChildren();
  svg.appendChild(createMiniGraphMarkerDefinitions());
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

  const centerLayout = getNodeLayout(centerCard);
  for (const { entry, card } of relatedCards) {
    const relatedLayout = getNodeLayout(card);
    svg.appendChild(createConnectionLine(centerLayout, relatedLayout, object, entry));
  }
}

function getNodeLayout(card: HTMLElement): GraphNodeLayout {
  return {
    card,
    centerX: card.offsetLeft + card.offsetWidth / 2,
    centerY: card.offsetTop + card.offsetHeight / 2,
    width: card.offsetWidth
  };
}

function createConnectionLine(
  centerLayout: GraphNodeLayout,
  relatedLayout: GraphNodeLayout,
  object: FocusObject,
  entry: RelatedObjectEntry
): SVGElement {
  const relation = entry.relation as ErRelationEdge | RelationModel;
  const isErRelation = object.fileType === "er-entity";
  const sourceLayout =
    isErRelation && entry.direction === "incoming" ? relatedLayout : centerLayout;
  const targetLayout =
    isErRelation && entry.direction === "incoming" ? centerLayout : relatedLayout;
  const start = getConnectionPoint(sourceLayout, targetLayout);
  const end = getConnectionPoint(targetLayout, sourceLayout);
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");

  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", String(start.x));
  line.setAttribute("y1", String(start.y));
  line.setAttribute("x2", String(end.x));
  line.setAttribute("y2", String(end.y));
  line.setAttribute("stroke", "var(--text-muted)");
  line.setAttribute("stroke-width", "2");
  if (isErRelation) {
    line.setAttribute("marker-end", "url(#mdspec-mini-er-arrow)");
  }
  group.appendChild(line);

  const labelText = isErRelation
    ? getErRelationCardinality(relation)
    : getClassRelationType(relation);
  if (labelText) {
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2 - 8;
    if (object.fileType === "er-entity") {
      group.appendChild(createErCardinalityBadge(midX, midY, labelText));
    } else {
      const label = document.createElementNS(SVG_NS, "text");
      label.setAttribute("x", String(midX));
      label.setAttribute("y", String(midY));
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("font-size", "10");
      label.setAttribute("fill", "var(--text-muted)");
      label.textContent = labelText;
      group.appendChild(label);
    }
  }

  return group;
}

function getConnectionPoint(
  from: GraphNodeLayout,
  to: GraphNodeLayout
): { x: number; y: number } {
  const deltaX = to.centerX - from.centerX;
  const deltaY = to.centerY - from.centerY;

  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    return {
      x: from.centerX + Math.sign(deltaX || 1) * from.width * 0.48,
      y: from.centerY
    };
  }

  return {
    x: from.centerX,
    y: from.centerY + Math.sign(deltaY || 1) * from.card.offsetHeight * 0.48
  };
}

function measureGraphBounds(
  scene: HTMLElement,
  svg: SVGSVGElement,
  cards: HTMLElement[]
): { left: number; top: number; width: number; height: number } {
  if (cards.length === 0) {
    return {
      left: 0,
      top: 0,
      width: scene.clientWidth,
      height: scene.clientHeight
    };
  }

  let left = Number.POSITIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;

  for (const card of cards) {
    left = Math.min(left, card.offsetLeft);
    top = Math.min(top, card.offsetTop);
    right = Math.max(right, card.offsetLeft + card.offsetWidth);
    bottom = Math.max(bottom, card.offsetTop + card.offsetHeight);
  }

  const svgBounds = getSvgVisualBounds(svg);
  if (svgBounds) {
    left = Math.min(left, svgBounds.x);
    top = Math.min(top, svgBounds.y);
    right = Math.max(right, svgBounds.x + svgBounds.width);
    bottom = Math.max(bottom, svgBounds.y + svgBounds.height);
  }

  return {
    left,
    top,
    width: right - left,
    height: bottom - top
  };
}

function getSvgVisualBounds(
  svg: SVGSVGElement
): { x: number; y: number; width: number; height: number } | null {
  try {
    const bounds = svg.getBBox();
    if (bounds.width === 0 && bounds.height === 0) {
      return null;
    }

    return {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height
    };
  } catch {
    return null;
  }
}

function updateZoomLabel(label: HTMLElement, scale: number): void {
  label.textContent = `${Math.round(scale * 100)}%`;
}

function createFocusNode(
  context: ResolvedObjectContext,
  options?: {
    onOpenObject?: (
      objectId: string,
      navigation?: { openInNewLeaf?: boolean }
    ) => void;
  }
): HTMLElement {
  const object = context.object;
  if (object.fileType === "er-entity") {
    return createErEntityNodeCard(
      object,
      collectFocusedColumns(context.relatedObjects),
      true,
      options
    );
  }

  const card = document.createElement("article");
  card.style.border = "1px solid var(--background-modifier-border)";
  card.style.borderRadius = "8px";
  card.style.padding = "10px 12px";
  card.style.background =
    "color-mix(in srgb, var(--interactive-accent) 12%, var(--background-primary))";
  card.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.08)";

  const type = document.createElement("div");
  type.style.fontSize = "10px";
  type.style.textTransform = "uppercase";
  type.style.letterSpacing = "0.08em";
  type.style.color = "var(--text-muted)";
  type.textContent = object.kind;

  const title = document.createElement("div");
  title.style.fontWeight = "700";
  title.style.marginTop = "4px";
  title.style.fontSize = "14px";
  title.textContent = object.name;

  const subtitle = document.createElement("div");
  subtitle.style.fontSize = "12px";
  subtitle.style.color = "var(--text-muted)";
  subtitle.style.marginTop = "4px";
  subtitle.textContent = object.kind;

  card.append(type, title, subtitle);

  if (options?.onOpenObject) {
    wireClickable(card, getObjectId(object), options);
  }

  return card;
}

function createRelatedNode(
  entry: RelatedObjectEntry,
  options?: {
    onOpenObject?: (
      objectId: string,
      navigation?: { openInNewLeaf?: boolean }
    ) => void;
  }
): HTMLElement {
  if (entry.relatedObject?.fileType === "er-entity") {
    return createErEntityNodeCard(
      entry.relatedObject,
      getRelationColumnsForEntry(entry),
      false,
      options,
      `${entry.direction} / ${
        getErRelationCardinality(entry.relation) || (entry.relation as ErRelationEdge).kind
      }`
    );
  }

  const card = document.createElement("article");
  card.style.border = "1px solid var(--background-modifier-border)";
  card.style.borderRadius = "8px";
  card.style.padding = "8px 10px";
  card.style.background = "var(--background-primary)";
  card.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.06)";

  const object = entry.relatedObject;
  const title = document.createElement("div");
  title.style.fontWeight = "700";
  title.style.fontSize = "13px";
  title.textContent = object ? object.name : entry.relatedObjectId;

  const subtitle = document.createElement("div");
  subtitle.style.fontSize = "11px";
  subtitle.style.color = "var(--text-muted)";
  subtitle.style.marginTop = "2px";
  subtitle.textContent = buildCardSubtitle(entry);

  const preview = document.createElement("div");
  preview.style.fontSize = "11px";
  preview.style.marginTop = "6px";
  preview.style.color = "var(--text-muted)";
  preview.textContent = buildCardPreview(entry);

  card.append(title, subtitle, preview);

  if (options?.onOpenObject) {
    wireClickable(card, entry.relatedObjectId, options);
  }

  return card;
}

function createRelatedList(
  context: ResolvedObjectContext,
  options?: {
    onOpenObject?: (
      objectId: string,
      navigation?: { openInNewLeaf?: boolean }
    ) => void;
  }
): HTMLElement {
  const details = document.createElement("details");
  details.className = "mdspec-related-list";
  details.style.marginTop = "10px";

  const summary = document.createElement("summary");
  summary.textContent = `Connections (${context.relatedObjects.length})`;
  summary.style.cursor = "pointer";
  summary.style.fontWeight = "600";
  summary.style.padding = "6px 2px";
  details.appendChild(summary);

  const tableWrap = document.createElement("div");
  tableWrap.style.marginTop = "8px";
  tableWrap.style.maxHeight = "180px";
  tableWrap.style.overflow = "auto";

  const table = document.createElement("table");
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";

  const headers = context.object.fileType === "er-entity"
    ? ["Related Entity", "Direction", "Relation", "Source", "Target", "Kind", "Cardinality", "Mappings"]
    : ["Related Class", "Relation", "Type", "Details"];

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  for (const header of headers) {
    const cell = document.createElement("th");
    cell.textContent = header;
    cell.style.textAlign = "left";
    cell.style.padding = "6px 8px";
    cell.style.borderBottom = "1px solid var(--background-modifier-border)";
    headRow.appendChild(cell);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  for (const entry of context.relatedObjects) {
    const row = document.createElement("tr");
    const values = context.object.fileType === "er-entity"
      ? buildErListRow(entry)
      : buildClassListRow(entry);

    values.forEach((value, index) => {
      const cell = document.createElement("td");
      cell.style.padding = "6px 8px";
      cell.style.borderBottom = "1px solid var(--background-modifier-border-hover)";
      cell.style.verticalAlign = "top";

      if (index === 0 && options?.onOpenObject) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = value;
        button.style.padding = "0";
        button.style.border = "0";
        button.style.background = "transparent";
        button.style.color = "var(--text-accent)";
        button.style.cursor = "pointer";
        button.addEventListener("click", () => {
          options.onOpenObject?.(entry.relatedObjectId, { openInNewLeaf: false });
        });
        cell.appendChild(button);
      } else {
        cell.textContent = value;
      }

      row.appendChild(cell);
    });

    tbody.appendChild(row);
  }

  table.appendChild(tbody);
  tableWrap.appendChild(table);
  details.appendChild(tableWrap);
  return details;
}

function buildErListRow(entry: RelatedObjectEntry): string[] {
  const relation = entry.relation as ErRelationEdge;
  const related = entry.relatedObject;
  const relatedName =
    related && related.fileType === "er-entity"
      ? `${related.logicalName} / ${related.physicalName}`
      : entry.relatedObjectId;
  const mappingSummary = relation.mappings
    .map((mapping) => `${mapping.localColumn} -> ${mapping.targetColumn}`)
    .join(", ");
  return [
    relatedName,
    entry.direction,
    relation.id || relation.label || relation.kind,
    relation.sourceEntity,
    relation.targetEntity,
    relation.kind,
    relation.cardinality ?? "",
    mappingSummary || "-"
  ];
}

function buildClassListRow(entry: RelatedObjectEntry): string[] {
  const relation = entry.relation as RelationModel;
  const relatedName = entry.relatedObject?.fileType === "object"
    ? entry.relatedObject.name
    : entry.relatedObjectId;
  const details = [
    relation.sourceCardinality ? `from: ${relation.sourceCardinality}` : "",
    relation.targetCardinality ? `to: ${relation.targetCardinality}` : ""
  ]
    .filter(Boolean)
    .join(" / ");

  return [
    relatedName,
    relation.label ?? relation.kind,
    relation.kind,
    details
  ];
}

function buildCardSubtitle(entry: RelatedObjectEntry): string {
  const object = entry.relatedObject;
  if (!object) {
    return "unresolved";
  }

  if (object.fileType === "er-entity") {
    return object.physicalName;
  }

  return object.kind;
}

function buildCardPreview(entry: RelatedObjectEntry): string {
  const object = entry.relatedObject;
  if (!object) {
    return "Unresolved object";
  }

  if (object.fileType === "er-entity") {
    const relation = entry.relation as ErRelationEdge;
    const relationLabel = relation.cardinality
      ? `${entry.direction} / ${relation.cardinality}`
      : entry.direction;
    return `${relationLabel} / ${relation.id || relation.kind}`;
  }

  const attributePreview = object.attributes.slice(0, 2).map((attribute) => `+${attribute.name}`);
  const methodPreview = object.methods.slice(0, 2).map((method) => `+${method.name}()`);
  const items = [...attributePreview, ...methodPreview];
  if (object.attributes.length + object.methods.length > items.length) {
    items.push("...");
  }
  return items.join(" / ");
}

function getErRelationCardinality(relation: RelatedObjectEntry["relation"]): string {
  const erRelation = relation as ErRelationEdge;
  return erRelation.cardinality ?? "";
}

function buildErEntitySummaryLines(
  entity: Extract<FocusObject, { fileType: "er-entity" }>,
  highlightedColumns: string[]
): string[] {
  return getVisibleErColumns(entity.columns, {
    highlightedColumns,
    limit: ER_PREVIEW_LIMIT
  });
}

function createErEntityNodeCard(
  entity: Extract<FocusObject, { fileType: "er-entity" }>,
  highlightedColumns: string[],
  isCenter: boolean,
  options?: {
    onOpenObject?: (
      objectId: string,
      navigation?: { openInNewLeaf?: boolean }
    ) => void;
  },
  metaLabel?: string
): HTMLElement {
  const card = document.createElement("article");
  card.className = "mdspec-er-node";
  card.style.border = "1px solid var(--background-modifier-border)";
  card.style.borderRadius = "8px";
  card.style.background = isCenter
    ? "color-mix(in srgb, var(--interactive-accent) 10%, var(--background-primary-alt))"
    : "var(--background-primary-alt)";
  card.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.08)";
  card.style.overflow = "hidden";

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
  kind.textContent = "er_entity";

  const title = document.createElement("div");
  title.style.fontWeight = "700";
  title.style.fontSize = isCenter ? "16px" : "14px";
  title.style.lineHeight = "1.3";
  title.textContent = entity.logicalName;

  header.append(kind, title);
  card.appendChild(header);

  const physical = document.createElement("div");
  physical.style.padding = "8px 12px 0";
  physical.style.fontFamily = "var(--font-monospace)";
  physical.style.fontSize = "12px";
  physical.style.color = "var(--text-muted)";
  physical.textContent = entity.physicalName;
  card.appendChild(physical);

  if (metaLabel) {
    const meta = document.createElement("div");
    meta.style.padding = "6px 12px 0";
    meta.style.fontSize = "11px";
    meta.style.fontWeight = "600";
    meta.style.color = "var(--text-muted)";
    meta.textContent = metaLabel;
    card.appendChild(meta);
  }

  card.appendChild(
    createAttributeSection(buildErEntitySummaryLines(entity, highlightedColumns))
  );

  if (options?.onOpenObject) {
    wireClickable(card, entity.id, options);
  }

  return card;
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

function createMiniGraphMarkerDefinitions(): SVGDefsElement {
  const defs = document.createElementNS(SVG_NS, "defs");
  defs.appendChild(
    createTriangleMarker("mdspec-mini-er-arrow", "var(--text-muted)", "var(--text-muted)")
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

function getRelationColumnsForEntry(entry: RelatedObjectEntry): string[] {
  const relation = entry.relation as ErRelationEdge;
  return relation.mappings.map((mapping) =>
    entry.direction === "outgoing" ? mapping.targetColumn : mapping.localColumn
  );
}

function collectFocusedColumns(entries: RelatedObjectEntry[]): string[] {
  return Array.from(
    new Set(
      entries.flatMap((entry) => {
        const relation = entry.relation as ErRelationEdge;
        return relation.mappings.map((mapping) =>
          entry.direction === "outgoing" ? mapping.localColumn : mapping.targetColumn
        );
      })
    )
  );
}

function getClassRelationType(relation: RelatedObjectEntry["relation"]): string {
  const classRelation = toClassRelationEdge(relation as RelationModel);
  return classRelation.kind;
}

function wireClickable(
  element: HTMLElement,
  objectId: string,
  options: {
    onOpenObject?: (
      objectId: string,
      navigation?: { openInNewLeaf?: boolean }
    ) => void;
  }
): void {
  element.style.cursor = "pointer";
  element.setAttribute("role", "button");
  element.setAttribute("tabindex", "0");
  element.addEventListener("click", () => {
    options.onOpenObject?.(objectId, { openInNewLeaf: false });
  });
  element.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      options.onOpenObject?.(objectId, { openInNewLeaf: false });
    }
  });
}

function getObjectId(object: ObjectModel): string {
  const explicitId = object.frontmatter.id;
  if (typeof explicitId === "string" && explicitId.trim()) {
    return explicitId.trim();
  }

  return object.name;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const GRAPH_BASE_WIDTH = 560;
const GRAPH_BASE_HEIGHT = 400;
