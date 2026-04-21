import type {
  ClassRelationEdge,
  DiagramEdge,
  ErEntity,
  ErEntityRelationBlock,
  ErRelationEdge,
  InternalEdge,
  RelationModel
} from "../types/models";

export function toClassRelationEdge(
  relation: RelationModel,
  sourceClass = relation.source,
  targetClass = relation.target
): ClassRelationEdge {
  return {
    domain: "class",
    id: relation.id,
    source: sourceClass,
    target: targetClass,
    sourceClass,
    targetClass,
    kind: relation.kind,
    label: relation.label,
    notes: relation.description,
    fromMultiplicity: relation.sourceCardinality,
    toMultiplicity: relation.targetCardinality
  };
}

export function erRelationBlockToInternalEdge(
  relationBlock: ErEntityRelationBlock,
  sourceEntity: ErEntity | string
): ErRelationEdge {
  const sourceName =
    typeof sourceEntity === "string" ? sourceEntity : sourceEntity.id;

  return {
    domain: "er",
    id: relationBlock.id,
    source: sourceName,
    target: relationBlock.targetTable ?? "",
    sourceEntity: sourceName,
    targetEntity: relationBlock.targetTable ?? "",
    kind: relationBlock.kind ?? "fk",
    label: relationBlock.id,
    notes: relationBlock.notes ?? undefined,
    cardinality: relationBlock.cardinality ?? undefined,
    mappings: relationBlock.mappings.map((mapping) => ({
      localColumn: mapping.localColumn,
      targetColumn: mapping.targetColumn,
      notes: mapping.notes ?? undefined
    }))
  };
}

export function classDiagramEdgeToInternalEdge(edge: DiagramEdge): ClassRelationEdge {
  return {
    domain: "class",
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceClass: edge.source,
    targetClass: edge.target,
    kind: edge.kind ?? "association",
    label: edge.label,
    notes:
      typeof edge.metadata?.notes === "string" ? edge.metadata.notes : undefined,
    fromMultiplicity:
      typeof edge.metadata?.sourceCardinality === "string"
        ? edge.metadata.sourceCardinality
        : undefined,
    toMultiplicity:
      typeof edge.metadata?.targetCardinality === "string"
        ? edge.metadata.targetCardinality
        : undefined
  };
}

export function erDiagramEdgeToInternalEdge(edge: DiagramEdge): ErRelationEdge {
  const mappings: ErRelationEdge["mappings"] = [];
  if (Array.isArray(edge.metadata?.mappings)) {
    for (const mapping of edge.metadata.mappings) {
      if (!mapping || typeof mapping !== "object") {
        continue;
      }

      const candidate = mapping as Record<string, unknown>;
      const localColumn = candidate.localColumn;
      const targetColumn = candidate.targetColumn;
      if (
        typeof localColumn !== "string" ||
        typeof targetColumn !== "string"
      ) {
        continue;
      }

      mappings.push({
        localColumn,
        targetColumn,
        notes:
          typeof candidate.notes === "string" ? candidate.notes : undefined
      });
    }
  }

  return {
    domain: "er",
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceEntity: edge.source,
    targetEntity: edge.target,
    kind: edge.kind ?? "association",
    label: getErEdgeLabel(edge),
    notes:
      typeof edge.metadata?.notes === "string" ? edge.metadata.notes : undefined,
    cardinality:
      typeof edge.metadata?.cardinality === "string"
        ? edge.metadata.cardinality
        : undefined,
    mappings:
      mappings.length > 0
        ? mappings
        : hasColumnMapping(edge)
          ? [
              {
                localColumn: String(edge.metadata?.sourceColumn),
                targetColumn: String(edge.metadata?.targetColumn),
                notes:
                  typeof edge.metadata?.mappingNotes === "string"
                    ? edge.metadata.mappingNotes
                    : undefined
              }
            ]
          : []
  };
}

export function isErInternalEdge(edge: InternalEdge): edge is ErRelationEdge {
  return edge.domain === "er";
}

function getErEdgeLabel(edge: DiagramEdge): string | undefined {
  if (typeof edge.metadata?.logicalName === "string") {
    return edge.metadata.logicalName;
  }

  if (typeof edge.metadata?.physicalName === "string") {
    return edge.metadata.physicalName;
  }

  return edge.label;
}

function hasColumnMapping(edge: DiagramEdge): boolean {
  return (
    typeof edge.metadata?.sourceColumn === "string" &&
    typeof edge.metadata?.targetColumn === "string"
  );
}
