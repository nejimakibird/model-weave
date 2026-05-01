import type {
  ClassRelationEdge,
  DiagramEdge,
  DiagramModel,
  DiagramNode,
  ObjectModel,
  ResolvedDiagram
} from "../types/models";
import type {
  FocusObject,
  RelatedObjectEntry,
  ResolvedObjectContext
} from "./object-context-resolver";
import { toClassRelationEdge } from "./internal-edge-adapters";

export function buildObjectSubgraphScene(
  context: ResolvedObjectContext
): ResolvedDiagram {
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
    schema: kind === "er" ? "er_diagram" : "class_diagram",
    path: context.object.path,
    title: `${getGraphTitle(context.object)} related`,
    frontmatter: {
      name: `${getGraphTitle(context.object)} related`
    },
    sections: {},
    name: `${getGraphTitle(context.object)} related`,
    kind,
    objectRefs: Array.from(nodes.keys()),
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
    const relation = entry.relation;
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

function normalizeClassRelation(
  relation: RelatedObjectEntry["relation"]
): ClassRelationEdge {
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
