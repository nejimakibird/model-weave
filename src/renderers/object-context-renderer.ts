import type {
  RelatedObjectEntry,
  ResolvedObjectContext
} from "../core/object-context-resolver";
import { buildObjectSubgraphScene } from "../core/object-subgraph-builder";
import { toClassRelationEdge } from "../core/internal-edge-adapters";
import { renderDiagramModel } from "./diagram-renderer";
import type {
  GraphFitVerticalAlign,
  GraphViewportState
} from "./graph-view-shared";
import type {
  ClassRelationEdge
} from "../types/models";

export interface ObjectContextLabels {
  title: string;
  linked: (count: number) => string;
  connectionDetails: string;
  relationDetails: string;
  noDirectlyRelated: string;
}

export function renderObjectContext(
  context: ResolvedObjectContext,
  options?: {
    onOpenObject?: (
      objectId: string,
      navigation?: { openInNewLeaf?: boolean }
    ) => void;
    fitVerticalAlign?: GraphFitVerticalAlign;
    viewportState?: GraphViewportState;
    onViewportStateChange?: (state: GraphViewportState) => void;
    labels?: ObjectContextLabels;
  }
): HTMLElement {
  const root = activeDocument.createElement("section");
  root.addClass("model-weave-object-context");
  root.addClass("model-weave-preview-section");

  const titleRow = activeDocument.createElement("div");
  titleRow.addClass("model-weave-object-context-title-row");

  const title = activeDocument.createElement("h3");
  title.textContent = options?.labels?.title ?? "Related objects";
  title.addClass("model-weave-object-context-title");
  title.addClass("model-weave-preview-section-title");
  titleRow.appendChild(title);

  const count = activeDocument.createElement("span");
  count.textContent =
    options?.labels?.linked(context.relatedObjects.length) ??
    `${context.relatedObjects.length} linked`;
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
    fitVerticalAlign?: GraphFitVerticalAlign;
    viewportState?: GraphViewportState;
    onViewportStateChange?: (state: GraphViewportState) => void;
    labels?: ObjectContextLabels;
  }
): HTMLElement {
  const subgraph = buildObjectSubgraphScene(context);
  const graph = renderDiagramModel(subgraph, {
    onOpenObject: options?.onOpenObject,
    hideTitle: true,
    hideDetails: true,
    fitVerticalAlign: options?.fitVerticalAlign ?? "top",
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
    labels?: ObjectContextLabels;
  }
): HTMLElement {
  const sortedEntries = [...context.relatedObjects].sort((left, right) =>
    compareRelatedEntries(left, right)
  );
  const details = activeDocument.createElement("details");
  details.addClass("model-weave-object-context-list");
  details.addClass("model-weave-preview-section");

  const summary = activeDocument.createElement("summary");
  summary.textContent =
    context.object.fileType === "er-entity"
      ? `${options?.labels?.relationDetails ?? "Relation details"} (${sortedEntries.length})`
      : `${options?.labels?.connectionDetails ?? "Connection details"} (${sortedEntries.length})`;
  summary.addClass("model-weave-object-context-summary");
  summary.addClass("model-weave-preview-section-title");
  details.appendChild(summary);

  const tableWrap = activeDocument.createElement("div");
  tableWrap.addClass("model-weave-object-context-table-wrap");
  tableWrap.addClass("model-weave-table-wrap");

  if (sortedEntries.length === 0) {
    const empty = activeDocument.createElement("p");
    empty.textContent =
      options?.labels?.noDirectlyRelated ??
      "No directly related objects.";
    empty.addClass("model-weave-object-context-empty");
    details.appendChild(empty);
    return details;
  }

  const table = activeDocument.createElement("table");
  table.addClass("model-weave-object-context-table");
  table.addClass("model-weave-data-table");

  const headers = context.object.fileType === "er-entity"
    ? ["Related", "Direction", "Relation ID", "Source", "Target", "Kind", "Cardinality", "Mappings", "Notes"]
    : ["Related", "Direction", "Relation ID", "Source", "Target", "Kind", "Label", "Multiplicity", "Notes"];

  const thead = activeDocument.createElement("thead");
  const headRow = activeDocument.createElement("tr");
  for (const header of headers) {
    const cell = activeDocument.createElement("th");
    cell.textContent = header;
    cell.addClass("model-weave-object-context-th");
    headRow.appendChild(cell);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = activeDocument.createElement("tbody");
  for (const entry of sortedEntries) {
    const row = activeDocument.createElement("tr");
    const values = context.object.fileType === "er-entity"
      ? buildErListRow(entry)
      : buildClassListRow(entry);

    values.forEach((value, index) => {
      const cell = activeDocument.createElement("td");
      cell.addClass("model-weave-object-context-td");

      if (index === 0 && options?.onOpenObject) {
        const wrapper = activeDocument.createElement("div");
        wrapper.addClass("model-weave-object-context-link-wrap");

        const badge = createDirectionBadge(entry.direction);
        wrapper.appendChild(badge);

        const button = activeDocument.createElement("button");
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
  const relation = entry.relation;
  const related = entry.relatedObject;
  const relatedName =
    related && related.fileType === "er-entity"
      ? `${related.logicalName} / ${related.physicalName}`
      : entry.relatedObjectId;
  if (!("domain" in relation) || relation.domain !== "er") {
    const notes =
      "notes" in relation && typeof relation.notes === "string" && relation.notes.trim()
        ? relation.notes
        : "metadata" in relation && typeof relation.metadata?.notes === "string"
          ? relation.metadata.notes
          : "-";
    return [
      relatedName,
      formatDirection(entry.direction),
      relation.id || "-",
      relation.source,
      relation.target,
      relation.kind ?? "-",
      "-",
      "-",
      notes
    ];
  }
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

function normalizeClassRelation(relation: RelatedObjectEntry["relation"]): ClassRelationEdge {
  if ("domain" in relation) {
    if (relation.domain === "class") {
      return relation;
    }

    return toClassRelationEdge({
      id: relation.id,
      kind: "association",
      source: relation.source,
      target: relation.target,
      label: relation.label
    });
  }

  return toClassRelationEdge(relation);
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
  const badge = activeDocument.createElement("span");
  badge.textContent = formatDirection(direction);
  badge.addClass("model-weave-badge");
  badge.addClass(getDirectionBadgeClass(direction));
  return badge;
}

function createKindBadge(kind: string): HTMLElement {
  const badge = activeDocument.createElement("span");
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
