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
  root.addClass("model-weave-object-context");

  const titleRow = document.createElement("div");
  titleRow.addClass("model-weave-object-context-title-row");

  const title = document.createElement("h3");
  title.textContent = "Related Objects";
  title.addClass("model-weave-object-context-title");
  titleRow.appendChild(title);

  const count = document.createElement("span");
  count.textContent = `${context.relatedObjects.length} linked`;
  count.addClass("model-weave-object-context-count");
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

  graph.addClass("model-weave-object-context-graph");
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
  details.addClass("model-weave-object-context-list");

  const summary = document.createElement("summary");
  summary.textContent =
    context.object.fileType === "er-entity"
      ? `Relation Details (${sortedEntries.length})`
      : `Connection Details (${sortedEntries.length})`;
  summary.addClass("model-weave-object-context-summary");
  details.appendChild(summary);

  const tableWrap = document.createElement("div");
  tableWrap.addClass("model-weave-object-context-table-wrap");

  if (sortedEntries.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "直接関係するオブジェクトはありません。";
    empty.addClass("model-weave-object-context-empty");
    details.appendChild(empty);
    return details;
  }

  const table = document.createElement("table");
  table.addClass("model-weave-object-context-table");

  const headers = context.object.fileType === "er-entity"
    ? ["Related", "Direction", "Relation ID", "Source", "Target", "Kind", "Cardinality", "Mappings", "Notes"]
    : ["Related", "Direction", "Relation ID", "Source", "Target", "Kind", "Label", "Multiplicity", "Notes"];

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  for (const header of headers) {
    const cell = document.createElement("th");
    cell.textContent = header;
    cell.addClass("model-weave-object-context-th");
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
      cell.addClass("model-weave-object-context-td");

      if (index === 0 && options?.onOpenObject) {
        const wrapper = document.createElement("div");
        wrapper.addClass("model-weave-object-context-link-wrap");

        const badge = createDirectionBadge(entry.direction);
        wrapper.appendChild(badge);

        const button = document.createElement("button");
        button.type = "button";
        button.textContent = value;
        button.addClass("model-weave-object-context-link");
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
  badge.addClass("model-weave-badge");
  badge.addClass(getDirectionBadgeClass(direction));
  return badge;
}

function createKindBadge(kind: string): HTMLElement {
  const badge = document.createElement("span");
  badge.textContent = kind || "-";
  badge.addClass("model-weave-badge");
  badge.addClass(getKindBadgeClass(kind));
  return badge;
}

function getDirectionBadgeClass(
  direction: RelatedObjectEntry["direction"]
): string {
  return direction === "outgoing"
    ? "model-weave-badge-outgoing"
    : "model-weave-badge-incoming";
}

function getKindBadgeClass(kind: string): string {
  switch (kind) {
    case "inheritance":
      return "model-weave-badge-inheritance";
    case "implementation":
      return "model-weave-badge-implementation";
    case "dependency":
      return "model-weave-badge-dependency";
    case "composition":
      return "model-weave-badge-composition";
    case "aggregation":
      return "model-weave-badge-aggregation";
    case "association":
      return "model-weave-badge-association";
    case "fk":
      return "model-weave-badge-fk";
    default:
      return "model-weave-badge-default";
  }
}

function truncateValue(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}
