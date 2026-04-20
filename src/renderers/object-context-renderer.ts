import type {
  FocusObject,
  RelatedObjectEntry,
  ResolvedObjectContext
} from "../core/object-context-resolver";
import type { ErRelation, ObjectModel, RelationModel } from "../types/models";

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
const CENTER_CARD_WIDTH = 168;
const RELATED_CARD_WIDTH = 144;

interface GraphNodeLayout {
  card: HTMLElement;
  centerX: number;
  centerY: number;
  width: number;
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

  const toolbar = document.createElement("div");
  toolbar.style.display = "flex";
  toolbar.style.alignItems = "center";
  toolbar.style.justifyContent = "space-between";
  toolbar.style.gap = "8px";
  toolbar.style.padding = "8px 10px";
  toolbar.style.borderBottom = "1px solid var(--background-modifier-border)";

  const hint = document.createElement("span");
  hint.textContent = "Wheel to zoom, drag background to pan";
  hint.style.fontSize = "11px";
  hint.style.color = "var(--text-muted)";
  toolbar.appendChild(hint);

  const controls = document.createElement("div");
  controls.style.display = "flex";
  controls.style.alignItems = "center";
  controls.style.gap = "6px";

  const zoomLabel = document.createElement("span");
  zoomLabel.style.fontSize = "11px";
  zoomLabel.style.color = "var(--text-muted)";

  const zoomOutButton = createToolbarButton("−");
  const fitButton = createToolbarButton("Fit");
  const resetButton = createToolbarButton("100%");
  const zoomInButton = createToolbarButton("+");
  controls.append(zoomOutButton, fitButton, resetButton, zoomInButton, zoomLabel);
  toolbar.appendChild(controls);
  wrapper.appendChild(toolbar);

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

  const scene = document.createElement("div");
  scene.style.position = "relative";
  scene.style.transformOrigin = "top left";
  viewport.appendChild(scene);

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.style.position = "absolute";
  svg.style.inset = "0";
  svg.style.pointerEvents = "none";
  scene.appendChild(svg);

  const centerCard = createFocusNode(context.object, true, options);
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

  const applyScale = (nextScale: number, anchor?: { x: number; y: number }): void => {
    const clamped = clamp(nextScale, MIN_SCALE, MAX_SCALE);
    if (Math.abs(clamped - scale) < 0.001) {
      updateZoomLabel(zoomLabel, scale);
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
    scene.style.width = `${GRAPH_BASE_WIDTH * scale}px`;
    scene.style.height = `${GRAPH_BASE_HEIGHT * scale}px`;
    layoutCards(centerCard, relatedCards, scale);
    renderMiniGraphConnections(scene, svg, centerCard, relatedCards, context.object);

    viewport.scrollLeft = contentX * scale - effectiveAnchor.x;
    viewport.scrollTop = contentY * scale - effectiveAnchor.y;
    updateZoomLabel(zoomLabel, scale);
  };

  const fitToView = (): void => {
    layoutCards(centerCard, relatedCards, 1);
    const bounds = measureGraphBounds(scene, [centerCard, ...relatedCards.map(({ card }) => card)]);
    const availableWidth = Math.max(viewport.clientWidth - VIEWPORT_PADDING * 2, 120);
    const availableHeight = Math.max(viewport.clientHeight - VIEWPORT_PADDING * 2, 120);
    const fitScale = clamp(
      Math.min(availableWidth / bounds.width, availableHeight / bounds.height, 1.4),
      MIN_SCALE,
      MAX_SCALE
    );

    scale = fitScale;
    scene.style.width = `${GRAPH_BASE_WIDTH * scale}px`;
    scene.style.height = `${GRAPH_BASE_HEIGHT * scale}px`;
    layoutCards(centerCard, relatedCards, scale);
    renderMiniGraphConnections(scene, svg, centerCard, relatedCards, context.object);

    const scaledBounds = measureGraphBounds(scene, [centerCard, ...relatedCards.map(({ card }) => card)]);
    viewport.scrollLeft = Math.max(
      0,
      scaledBounds.left + scaledBounds.width / 2 - viewport.clientWidth / 2
    );
    viewport.scrollTop = Math.max(
      0,
      scaledBounds.top + scaledBounds.height / 2 - viewport.clientHeight / 2
    );
    updateZoomLabel(zoomLabel, scale);
  };

  zoomOutButton.addEventListener("click", () => {
    applyScale(scale - ZOOM_STEP);
  });
  zoomInButton.addEventListener("click", () => {
    applyScale(scale + ZOOM_STEP);
  });
  fitButton.addEventListener("click", () => {
    fitToView();
  });
  resetButton.addEventListener("click", () => {
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
  scale: number
): void {
  centerCard.style.left = `${(BASE_CENTER_X - CENTER_CARD_WIDTH / 2) * scale}px`;
  centerCard.style.top = `${(BASE_CENTER_Y - 44) * scale}px`;
  centerCard.style.width = `${CENTER_CARD_WIDTH * scale}px`;

  relatedCards.forEach(({ card }, index) => {
    const angle =
      -Math.PI / 2 + (index * Math.PI * 2) / Math.max(relatedCards.length, 1);
    const x = BASE_CENTER_X + Math.cos(angle) * BASE_ORBIT_X;
    const y = BASE_CENTER_Y + Math.sin(angle) * BASE_ORBIT_Y;
    card.style.left = `${(x - RELATED_CARD_WIDTH / 2) * scale}px`;
    card.style.top = `${(y - 38) * scale}px`;
    card.style.width = `${RELATED_CARD_WIDTH * scale}px`;
  });
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
  const start = getConnectionPoint(centerLayout, relatedLayout);
  const end = getConnectionPoint(relatedLayout, centerLayout);
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");

  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", String(start.x));
  line.setAttribute("y1", String(start.y));
  line.setAttribute("x2", String(end.x));
  line.setAttribute("y2", String(end.y));
  line.setAttribute("stroke", "var(--background-modifier-border)");
  line.setAttribute("stroke-width", "2");
  group.appendChild(line);

  const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
  label.setAttribute("x", String((start.x + end.x) / 2));
  label.setAttribute("y", String((start.y + end.y) / 2 - 6));
  label.setAttribute("text-anchor", "middle");
  label.setAttribute("font-size", "10");
  label.setAttribute("fill", "var(--text-muted)");
  label.textContent = object.fileType === "er-entity"
    ? getErRelationCardinality(entry.relation)
    : getClassRelationType(entry.relation);
  group.appendChild(label);

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

  return {
    left,
    top,
    width: right - left,
    height: bottom - top
  };
}

function createToolbarButton(label: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.style.border = "1px solid var(--background-modifier-border)";
  button.style.borderRadius = "6px";
  button.style.background = "var(--background-primary)";
  button.style.padding = "2px 8px";
  button.style.cursor = "pointer";
  button.style.fontSize = "11px";
  return button;
}

function updateZoomLabel(label: HTMLElement, scale: number): void {
  label.textContent = `${Math.round(scale * 100)}%`;
}

function createFocusNode(
  object: FocusObject,
  isCenter: boolean,
  options?: {
    onOpenObject?: (
      objectId: string,
      navigation?: { openInNewLeaf?: boolean }
    ) => void;
  }
): HTMLElement {
  const card = document.createElement("article");
  card.style.border = "1px solid var(--background-modifier-border)";
  card.style.borderRadius = "8px";
  card.style.padding = "10px 12px";
  card.style.background = isCenter
    ? "color-mix(in srgb, var(--interactive-accent) 12%, var(--background-primary))"
    : "var(--background-primary)";
  card.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.08)";

  const type = document.createElement("div");
  type.style.fontSize = "10px";
  type.style.textTransform = "uppercase";
  type.style.letterSpacing = "0.08em";
  type.style.color = "var(--text-muted)";
  type.textContent = object.fileType === "er-entity" ? "er_entity" : object.kind;

  const title = document.createElement("div");
  title.style.fontWeight = "700";
  title.style.marginTop = "4px";
  title.style.fontSize = "14px";
  title.textContent = object.fileType === "er-entity" ? object.logicalName : object.name;

  const subtitle = document.createElement("div");
  subtitle.style.fontSize = "12px";
  subtitle.style.color = "var(--text-muted)";
  subtitle.style.marginTop = "4px";
  subtitle.textContent = object.fileType === "er-entity" ? object.physicalName : object.kind;

  card.append(type, title, subtitle);

  if (options?.onOpenObject) {
    const objectId = object.fileType === "er-entity" ? object.id : getObjectId(object);
    wireClickable(card, objectId, options);
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
  title.textContent = object
    ? object.fileType === "er-entity"
      ? object.logicalName
      : object.name
    : entry.relatedObjectId;

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
    ? ["Related Entity", "Relation", "Cardinality", "Columns"]
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
  const relation = entry.relation as ErRelation;
  const relatedName = entry.relatedObject?.fileType === "er-entity"
    ? `${entry.relatedObject.logicalName} / ${entry.relatedObject.physicalName}`
    : entry.relatedObjectId;
  return [
    relatedName,
    relation.logicalName || relation.physicalName,
    relation.cardinality,
    `${relation.fromColumn} -> ${relation.toColumn}`
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
    const pkColumns = object.columns.filter((column) => column.pk).slice(0, 2);
    if (pkColumns.length === 0) {
      return "PK: -";
    }

    const suffix = object.columns.filter((column) => column.pk).length > 2 ? ", ..." : "";
    return `PK: ${pkColumns.map((column) => column.physicalName).join(", ")}${suffix}`;
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
  const erRelation = relation as ErRelation;
  return erRelation.cardinality ?? "";
}

function getClassRelationType(relation: RelatedObjectEntry["relation"]): string {
  const classRelation = relation as RelationModel;
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
