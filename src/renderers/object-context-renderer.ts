import type {
  FocusObject,
  RelatedObjectEntry,
  ResolvedObjectContext
} from "../core/object-context-resolver";
import { toClassRelationEdge } from "../core/internal-edge-adapters";
import { renderClassDiagram } from "./class-renderer";
import { renderErDiagram } from "./er-renderer";
import type {
  ClassRelationEdge,
  DiagramEdge,
  DiagramModel,
  DiagramNode,
  ErRelationEdge,
  ObjectModel,
  RelationModel,
  ResolvedDiagram
} from "../types/models";
 

const MINI_GRAPH_MIN_HEIGHT = 360;

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
  const subgraph = buildSubgraphDiagram(context);
  const graph =
    context.object.fileType === "er-entity"
      ? renderErDiagram(subgraph, {
          onOpenObject: options?.onOpenObject,
          hideTitle: true,
          hideDetails: true
        })
      : renderClassDiagram(subgraph, {
          onOpenObject: options?.onOpenObject,
          hideTitle: true,
          hideDetails: true
        });

  graph.classList.add("mdspec-related-graph");
  graph.style.marginTop = "10px";
  graph.style.minHeight = `${MINI_GRAPH_MIN_HEIGHT}px`;
  return graph;
}

function buildSubgraphDiagram(context: ResolvedObjectContext): ResolvedDiagram {
  const centerId = getFocusObjectId(context.object);
  const nodes = new Map<string, DiagramNode & { object?: FocusObject }>();
  const edges = new Map<string, DiagramEdge>();

  nodes.set(centerId, {
    id: centerId,
    ref: centerId,
    object: context.object
  });

  for (const entry of context.relatedObjects) {
    if (entry.relatedObject) {
      nodes.set(entry.relatedObjectId, {
        id: entry.relatedObjectId,
        ref: entry.relatedObjectId,
        object: entry.relatedObject
      });
    }

    const edge = toDiagramEdge(entry, centerId);
    if (!edge) {
      continue;
    }

    const edgeKey =
      edge.id ?? `${edge.source}:${edge.target}:${edge.kind ?? ""}:${edge.label ?? ""}`;
    edges.set(edgeKey, edge);
  }

  const kind = context.object.fileType === "er-entity" ? "er" : "class";
  const diagram: DiagramModel = {
    fileType: "diagram",
    schema: "diagram_v1",
    path: context.object.path,
    title: `${getGraphTitle(context.object)} related`,
    frontmatter: {
      name: `${getGraphTitle(context.object)} related`
    },
    sections: {},
    name: `${getGraphTitle(context.object)} related`,
    kind,
    objectRefs: Array.from(nodes.keys()),
    autoRelations: true,
    nodes: Array.from(nodes.values()).map(({ object, ...node }) => node),
    edges: Array.from(edges.values())
  };

  return {
    diagram,
    nodes: Array.from(nodes.values()),
    edges: Array.from(edges.values()),
    missingObjects: [],
    warnings: []
  };
}

function toDiagramEdge(
  entry: RelatedObjectEntry,
  centerId: string
): DiagramEdge | null {
  const relatedId = entry.relatedObjectId;
  if (entry.relation && "domain" in entry.relation && entry.relation.domain === "er") {
    const relation = entry.relation as ErRelationEdge;
    const sourceId = entry.direction === "incoming" ? relatedId : centerId;
    const targetId = entry.direction === "incoming" ? centerId : relatedId;
    return {
      id: relation.id,
      source: sourceId,
      target: targetId,
      kind: "association",
      label: relation.label,
      metadata: {
        cardinality: relation.cardinality,
        sourceColumn: relation.mappings[0]?.localColumn,
        targetColumn: relation.mappings[0]?.targetColumn,
        logicalName: relation.label,
        physicalName: relation.id,
        kind: relation.kind,
        mappingSummary: relation.mappings
          .map((mapping) => `${mapping.localColumn} -> ${mapping.targetColumn}`)
          .join(" / "),
        mappings: relation.mappings
      }
    };
  }

  const relation = normalizeClassRelation(entry.relation);
  const sourceId = entry.direction === "incoming" ? relatedId : centerId;
  const targetId = entry.direction === "incoming" ? centerId : relatedId;
  return {
    id: relation.id,
    source: sourceId,
    target: targetId,
    kind: relation.kind as DiagramEdge["kind"],
    label: relation.label,
    metadata: {
      notes: relation.notes,
      sourceCardinality: relation.fromMultiplicity,
      targetCardinality: relation.toMultiplicity
    }
  };
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
  const relation = normalizeClassRelation(entry.relation);
  const relatedName = entry.relatedObject?.fileType === "object"
    ? entry.relatedObject.name
    : entry.relatedObjectId;
  const details = [
    relation.fromMultiplicity ? `from: ${relation.fromMultiplicity}` : "",
    relation.toMultiplicity ? `to: ${relation.toMultiplicity}` : ""
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

function normalizeClassRelation(
  relation: RelatedObjectEntry["relation"]
): ClassRelationEdge {
  if ("domain" in relation && relation.domain === "class") {
    return relation as ClassRelationEdge;
  }

  return toClassRelationEdge(relation as RelationModel);
}

function getGraphTitle(object: FocusObject): string {
  return object.fileType === "er-entity" ? object.logicalName : object.name;
}

function getObjectId(object: ObjectModel): string {
  const explicitId = object.frontmatter.id;
  if (typeof explicitId === "string" && explicitId.trim()) {
    return explicitId.trim();
  }

  return object.name;
}

function getFocusObjectId(object: FocusObject): string {
  return object.fileType === "er-entity" ? object.id : getObjectId(object);
}
