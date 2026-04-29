import type {
  RelatedObjectEntry,
  ResolvedObjectContext
} from "../core/object-context-resolver";
import { buildObjectSubgraphScene } from "../core/object-subgraph-builder";
import { toClassRelationEdge } from "../core/internal-edge-adapters";
import { renderDiagramModel } from "./diagram-renderer";
import type { GraphViewportState } from "./graph-view-shared";
import type {
  ClassRelationEdge,
  ErRelationEdge,
  RelationModel
} from "../types/models";
 

const MINI_GRAPH_MIN_HEIGHT = 360;

export function renderObjectContext(
  context: ResolvedObjectContext,
  options?: {
    onOpenObject?: (
      objectId: string,
      navigation?: { openInNewLeaf?: boolean }
    ) => void;
    viewportState?: GraphViewportState;
    onViewportStateChange?: (state: GraphViewportState) => void;
  }
): HTMLElement {
  const root = document.createElement("section");
  root.className = "mdspec-object-context";
  root.style.marginTop = "10px";
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.flex = "1 1 auto";
  root.style.minHeight = "0";
  root.style.fontSize = "var(--model-weave-font-size)";

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
  count.style.fontSize = "var(--model-weave-font-size-small)";
  count.style.color = "var(--text-muted)";
  titleRow.appendChild(count);
  root.appendChild(titleRow);

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
    viewportState?: GraphViewportState;
    onViewportStateChange?: (state: GraphViewportState) => void;
  }
): HTMLElement {
  const subgraph = buildObjectSubgraphScene(context);
  const graph = renderDiagramModel(subgraph, {
    onOpenObject: options?.onOpenObject,
    hideTitle: true,
    hideDetails: true,
    viewportState: options?.viewportState,
    onViewportStateChange: options?.onViewportStateChange
  });

  graph.classList.add("mdspec-related-graph");
  graph.style.marginTop = "10px";
  graph.style.minHeight = `${MINI_GRAPH_MIN_HEIGHT}px`;
  return graph;
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
  const sortedEntries = [...context.relatedObjects].sort((left, right) =>
    compareRelatedEntries(left, right)
  );
  const details = document.createElement("details");
  details.className = "mdspec-related-list";
  details.style.marginTop = "10px";

  const summary = document.createElement("summary");
  summary.textContent =
    context.object.fileType === "er-entity"
      ? `Relation Details (${sortedEntries.length})`
      : `Connection Details (${sortedEntries.length})`;
  summary.style.cursor = "pointer";
  summary.style.fontWeight = "600";
  summary.style.padding = "6px 2px";
  details.appendChild(summary);

  const tableWrap = document.createElement("div");
  tableWrap.style.marginTop = "8px";
  tableWrap.style.maxHeight = "180px";
  tableWrap.style.overflow = "auto";

  if (sortedEntries.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "直接関係するオブジェクトはありません。";
    empty.style.margin = "8px 0 0";
    empty.style.color = "var(--text-muted)";
    details.appendChild(empty);
    return details;
  }

  const table = document.createElement("table");
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";
  table.style.fontSize = "var(--model-weave-font-size)";

  const headers = context.object.fileType === "er-entity"
    ? ["Related", "Direction", "Relation ID", "Source", "Target", "Kind", "Cardinality", "Mappings", "Notes"]
    : ["Related", "Direction", "Relation ID", "Source", "Target", "Kind", "Label", "Multiplicity", "Notes"];

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
  for (const entry of sortedEntries) {
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
        const wrapper = document.createElement("div");
        wrapper.style.display = "flex";
        wrapper.style.alignItems = "center";
        wrapper.style.gap = "6px";

        const badge = createDirectionBadge(entry.direction);
        wrapper.appendChild(badge);

        const button = document.createElement("button");
        button.type = "button";
        button.textContent = value;
        button.style.padding = "0";
        button.style.border = "0";
        button.style.background = "transparent";
        button.style.color = "var(--text-accent)";
        button.style.cursor = "pointer";
        button.style.fontSize = "var(--model-weave-font-size)";
        button.addEventListener("click", () => {
          options.onOpenObject?.(entry.relatedObjectId, { openInNewLeaf: false });
        });
        wrapper.appendChild(button);
        cell.appendChild(wrapper);
      } else if (index === 1) {
        cell.appendChild(createDirectionBadge(entry.direction));
      } else if (index === 5) {
        cell.appendChild(createKindBadge(value));
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
    formatDirection(entry.direction),
    relation.id || "-",
    relation.sourceEntity,
    relation.targetEntity,
    relation.kind,
    relation.cardinality ?? "-",
    truncateValue(mappingSummary || "-", 72),
    relation.notes || "-"
  ];
}

function buildClassListRow(entry: RelatedObjectEntry): string[] {
  const relation = normalizeClassRelation(entry.relation);
  const relatedName = entry.relatedObject?.fileType === "object"
    ? entry.relatedObject.name
    : entry.relatedObjectId;
  const multiplicity = [
    relation.fromMultiplicity ? `from ${relation.fromMultiplicity}` : "",
    relation.toMultiplicity ? `to ${relation.toMultiplicity}` : ""
  ].filter(Boolean).join(" / ");

  return [
    relatedName,
    formatDirection(entry.direction),
    relation.id || "-",
    relation.sourceClass,
    relation.targetClass,
    relation.kind,
    relation.label ?? "-",
    multiplicity || "-",
    relation.notes || "-"
  ];
}

function normalizeClassRelation(
  relation: RelatedObjectEntry["relation"]
): ClassRelationEdge {
  if ("domain" in relation && relation.domain === "class") {
    return relation as ClassRelationEdge;
  }

  return toClassRelationEdge(relation as RelationModel);
}

function compareRelatedEntries(
  left: RelatedObjectEntry,
  right: RelatedObjectEntry
): number {
  if (left.direction !== right.direction) {
    return left.direction === "outgoing" ? -1 : 1;
  }

  const leftName = getStableRelatedName(left).toLowerCase();
  const rightName = getStableRelatedName(right).toLowerCase();
  if (leftName !== rightName) {
    return leftName.localeCompare(rightName);
  }

  const leftId = getRelationId(left).toLowerCase();
  const rightId = getRelationId(right).toLowerCase();
  return leftId.localeCompare(rightId);
}

function getStableRelatedName(entry: RelatedObjectEntry): string {
  if (!entry.relatedObject) {
    return entry.relatedObjectId;
  }

  if (entry.relatedObject.fileType === "er-entity") {
    return `${entry.relatedObject.logicalName}/${entry.relatedObject.physicalName}`;
  }

  return entry.relatedObject.name;
}

function getRelationId(entry: RelatedObjectEntry): string {
  const relation = entry.relation;
  if ("domain" in relation) {
    return relation.id || relation.label || relation.kind;
  }

  return relation.id || relation.label || relation.kind;
}

function formatDirection(direction: RelatedObjectEntry["direction"]): string {
  return direction === "outgoing" ? "Outbound" : "Inbound";
}

function createDirectionBadge(
  direction: RelatedObjectEntry["direction"]
): HTMLElement {
  const badge = document.createElement("span");
  badge.textContent = formatDirection(direction);
  badge.style.display = "inline-flex";
  badge.style.alignItems = "center";
  badge.style.padding = "2px 8px";
  badge.style.borderRadius = "999px";
  badge.style.fontSize = "var(--model-weave-font-size-small)";
  badge.style.fontWeight = "600";
  badge.style.whiteSpace = "nowrap";
  badge.style.background =
    direction === "outgoing"
      ? "color-mix(in srgb, var(--color-green) 18%, var(--background-primary-alt))"
      : "color-mix(in srgb, var(--color-orange) 18%, var(--background-primary-alt))";
  badge.style.color = "var(--text-normal)";
  return badge;
}

function createKindBadge(kind: string): HTMLElement {
  const badge = document.createElement("span");
  badge.textContent = kind || "-";
  badge.style.display = "inline-flex";
  badge.style.alignItems = "center";
  badge.style.padding = "2px 8px";
  badge.style.borderRadius = "999px";
  badge.style.fontSize = "var(--model-weave-font-size-small)";
  badge.style.fontWeight = "600";
  badge.style.whiteSpace = "nowrap";
  badge.style.background = getKindBadgeBackground(kind);
  badge.style.color = "var(--text-normal)";
  return badge;
}

function getKindBadgeBackground(kind: string): string {
  switch (kind) {
    case "inheritance":
      return "color-mix(in srgb, var(--color-blue) 18%, var(--background-primary-alt))";
    case "implementation":
      return "color-mix(in srgb, var(--color-cyan) 18%, var(--background-primary-alt))";
    case "dependency":
      return "color-mix(in srgb, var(--color-yellow) 18%, var(--background-primary-alt))";
    case "composition":
      return "color-mix(in srgb, var(--color-red) 18%, var(--background-primary-alt))";
    case "aggregation":
      return "color-mix(in srgb, var(--color-orange) 18%, var(--background-primary-alt))";
    case "association":
      return "color-mix(in srgb, var(--color-green) 18%, var(--background-primary-alt))";
    case "fk":
      return "color-mix(in srgb, var(--color-purple) 18%, var(--background-primary-alt))";
    default:
      return "var(--background-secondary)";
  }
}

function truncateValue(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}
