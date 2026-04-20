import type {
  DiagramEdge,
  DiagramModel,
  DiagramNode,
  ErEntity,
  ErRelation,
  ObjectModel,
  RelationModel,
  ResolvedDiagram,
  ValidationWarning
} from "../types/models";
import {
  resolveErEntityReference,
  resolveObjectModelReference
} from "./reference-resolver";
import type { ModelingVaultIndex } from "./vault-index";

export function resolveDiagramRelations(
  diagram: DiagramModel,
  index: ModelingVaultIndex
): ResolvedDiagram {
  if (diagram.kind === "er") {
    return resolveErDiagramRelations(diagram, index);
  }

  const warnings: ValidationWarning[] = [];
  const resolvedNodes: Array<DiagramNode & { object?: ObjectModel }> = [];
  const presentObjectIds = new Set<string>();

  for (const objectRef of diagram.objectRefs) {
    const object = resolveObjectModelReference(objectRef, index) ?? undefined;
    const resolvedId = object ? getObjectId(object) : objectRef;

    if (!object) {
      warnings.push({
        code: "unresolved-reference",
        message: `unresolved object ref "${objectRef}"`,
        severity: "warning",
        path: diagram.path,
        field: "objectRefs"
      });
    } else {
      presentObjectIds.add(resolvedId);
    }

    resolvedNodes.push({
      id: resolvedId,
      ref: objectRef,
      object
    });
  }

  if (!diagram.autoRelations) {
    warnings.push({
      code: "invalid-structure",
      message: "autoRelations: false is treated as true in v1 preview",
      severity: "info",
      path: diagram.path,
      field: "autoRelations"
    });
  }

  const edges = resolveEdges(diagram, index, presentObjectIds, warnings);

  return {
    diagram,
    nodes: resolvedNodes,
    edges,
    missingObjects: diagram.objectRefs.filter(
      (ref) => !resolveObjectModelReference(ref, index)
    ),
    warnings
  };
}

function resolveErDiagramRelations(
  diagram: DiagramModel,
  index: ModelingVaultIndex
): ResolvedDiagram {
  const warnings: ValidationWarning[] = [];
  const resolvedNodes: Array<DiagramNode & { object?: ErEntity }> = [];
  const presentEntityPhysicalNames = new Set<string>();

  for (const objectRef of diagram.objectRefs) {
    const entity = resolveErEntityReference(objectRef, index) ?? undefined;
    const resolvedId = entity?.id ?? objectRef;

    if (!entity) {
      warnings.push({
        code: "unresolved-reference",
        message: `unresolved ER entity ref "${objectRef}"`,
        severity: "warning",
        path: diagram.path,
        field: "objectRefs"
      });
    } else {
      presentEntityPhysicalNames.add(entity.physicalName);
    }

    resolvedNodes.push({
      id: resolvedId,
      ref: objectRef,
      object: entity
    });
  }

  return {
    diagram,
    nodes: resolvedNodes,
    edges: resolveErEdges(diagram, index, presentEntityPhysicalNames, warnings),
    missingObjects: diagram.objectRefs.filter(
      (ref) => !resolveErEntityReference(ref, index)
    ),
    warnings
  };
}

function resolveEdges(
  diagram: DiagramModel,
  index: ModelingVaultIndex,
  presentObjectIds: Set<string>,
  warnings: ValidationWarning[]
): DiagramEdge[] {
  const edges: DiagramEdge[] = [];
  const seenRelationIds = new Set<string>();

  for (const objectId of presentObjectIds) {
    const relations = index.relationsByObjectId[objectId] ?? [];

    for (const relation of relations) {
      const relationKey = relation.id ?? buildRelationKey(relation);
      if (seenRelationIds.has(relationKey)) {
        continue;
      }

      seenRelationIds.add(relationKey);

      const sourceObject = resolveObjectModelReference(relation.source, index);
      const targetObject = resolveObjectModelReference(relation.target, index);
      if (!sourceObject || !targetObject) {
        warnings.push({
          code: "unresolved-reference",
          message: `unresolved relation endpoint in relation "${relation.id ?? relationKey}"`,
          severity: "warning",
          path: diagram.path,
          field: "relations"
        });
        continue;
      }

      if (
        presentObjectIds.has(getObjectId(sourceObject)) &&
        presentObjectIds.has(getObjectId(targetObject))
      ) {
        edges.push(toDiagramEdge(relation, sourceObject, targetObject));
      }
    }
  }

  return edges;
}

function toDiagramEdge(
  relation: RelationModel,
  sourceObject: ObjectModel,
  targetObject: ObjectModel
): DiagramEdge {
  return {
    id: relation.id,
    source: getObjectId(sourceObject),
    target: getObjectId(targetObject),
    kind: relation.kind,
    label: relation.label,
    metadata: {
      sourceCardinality: relation.sourceCardinality,
      targetCardinality: relation.targetCardinality
    }
  };
}

function buildRelationKey(relation: RelationModel): string {
  return `${relation.source}:${relation.kind}:${relation.target}:${relation.label ?? ""}`;
}

function resolveErEdges(
  diagram: DiagramModel,
  index: ModelingVaultIndex,
  presentEntityPhysicalNames: Set<string>,
  warnings: ValidationWarning[]
): DiagramEdge[] {
  const edges: DiagramEdge[] = [];
  const seenRelationIds = new Set<string>();

  for (const physicalName of presentEntityPhysicalNames) {
    const relations = index.erRelationsByEntityPhysicalName[physicalName] ?? [];

    for (const relation of relations) {
      if (seenRelationIds.has(relation.id)) {
        continue;
      }

      seenRelationIds.add(relation.id);

      const sourceEntity = resolveErEntityReference(relation.fromEntity, index);
      const targetEntity = resolveErEntityReference(relation.toEntity, index);

      if (!sourceEntity || !targetEntity) {
        warnings.push({
          code: "unresolved-reference",
          message: `unresolved ER relation endpoint in relation "${relation.id}"`,
          severity: "warning",
          path: diagram.path,
          field: "relations"
        });
        continue;
      }

      if (
        presentEntityPhysicalNames.has(sourceEntity.physicalName) &&
        presentEntityPhysicalNames.has(targetEntity.physicalName)
      ) {
        edges.push(toErDiagramEdge(relation, sourceEntity, targetEntity));
      }
    }
  }

  return edges;
}

function getObjectId(object: ObjectModel): string {
  const explicitId = object.frontmatter.id;
  if (typeof explicitId === "string" && explicitId.trim()) {
    return explicitId.trim();
  }

  return object.name;
}

function toErDiagramEdge(
  relation: ErRelation,
  sourceEntity: ErEntity,
  targetEntity: ErEntity
): DiagramEdge {
  return {
    id: relation.id,
    source: sourceEntity.id,
    target: targetEntity.id,
    kind: "association",
    label: relation.logicalName || relation.physicalName,
    metadata: {
      cardinality: relation.cardinality,
      sourceColumn: relation.fromColumn,
      targetColumn: relation.toColumn,
      logicalName: relation.logicalName,
      physicalName: relation.physicalName
    }
  };
}
