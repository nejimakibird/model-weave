import type {
  ClassRelationEdge,
  DiagramEdge,
  DiagramModel,
  DiagramNode,
  ErEntity,
  ErRelationEdge,
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
  const presentObjectIds = new Set<string>();
  const deduped = dedupeDiagramNodes(
    diagram,
    (objectRef) => resolveObjectModelReference(objectRef, index) ?? undefined,
    (object, objectRef) => (object ? getObjectId(object) : objectRef),
    (object, objectRef) => (object ? getObjectId(object) : `ref:${objectRef}`),
    (objectRef) => `unresolved object ref "${objectRef}"`
  );

  for (const node of deduped.nodes) {
    if (node.object) {
      presentObjectIds.add(getObjectId(node.object));
    }
  }

  const edges = resolveEdges(diagram, index, presentObjectIds, warnings);

  return {
    diagram,
    nodes: deduped.nodes,
    edges,
    missingObjects: deduped.missingObjects,
    warnings: [...warnings, ...deduped.warnings]
  };
}

function resolveErDiagramRelations(
  diagram: DiagramModel,
  index: ModelingVaultIndex
): ResolvedDiagram {
  const warnings: ValidationWarning[] = [];
  const presentEntityPhysicalNames = new Set<string>();
  const deduped = dedupeDiagramNodes(
    diagram,
    (objectRef) => resolveErEntityReference(objectRef, index) ?? undefined,
    (entity, objectRef) => entity?.id ?? objectRef,
    (entity, objectRef) => entity?.id ?? `ref:${objectRef}`,
    (objectRef) => `unresolved ER entity ref "${objectRef}"`
  );

  for (const node of deduped.nodes) {
    if (node.object) {
      presentEntityPhysicalNames.add(node.object.physicalName);
    }
  }

  return {
    diagram,
    nodes: deduped.nodes,
    edges: resolveErEdges(diagram, index, presentEntityPhysicalNames, warnings),
    missingObjects: deduped.missingObjects,
    warnings: [...warnings, ...deduped.warnings]
  };
}

function dedupeDiagramNodes<TObject extends ObjectModel | ErEntity>(
  diagram: DiagramModel,
  resolveObject: (objectRef: string) => TObject | undefined,
  buildResolvedId: (object: TObject | undefined, objectRef: string) => string,
  buildCanonicalKey: (object: TObject | undefined, objectRef: string) => string,
  buildUnresolvedMessage: (objectRef: string) => string
): {
  nodes: Array<DiagramNode & { object?: TObject }>;
  missingObjects: string[];
  warnings: ValidationWarning[];
} {
  const nodes: Array<DiagramNode & { object?: TObject }> = [];
  const missingObjects: string[] = [];
  const warnings: ValidationWarning[] = [];
  const seenKeys = new Set<string>();
  const seenMissingRefs = new Set<string>();
  const duplicateCounts = new Map<string, { displayRef: string; count: number }>();

  for (const objectRef of diagram.objectRefs) {
    const object = resolveObject(objectRef);
    const canonicalKey = buildCanonicalKey(object, objectRef);

    if (seenKeys.has(canonicalKey)) {
      const existing = duplicateCounts.get(canonicalKey);
      if (existing) {
        existing.count += 1;
      } else {
        duplicateCounts.set(canonicalKey, {
          displayRef: objectRef,
          count: 2
        });
      }
      continue;
    }

    seenKeys.add(canonicalKey);

    if (!object && !seenMissingRefs.has(objectRef)) {
      seenMissingRefs.add(objectRef);
      missingObjects.push(objectRef);
      warnings.push({
        code: "unresolved-reference",
        message: buildUnresolvedMessage(objectRef),
        severity: "warning",
        path: diagram.path,
        field: "objectRefs"
      });
    }

    nodes.push({
      id: buildResolvedId(object, objectRef),
      ref: objectRef,
      object
    });
  }

  if (duplicateCounts.size > 0) {
    const summary = Array.from(duplicateCounts.values())
      .map((entry) => `${entry.displayRef} x${entry.count}`)
      .join(", ");
    warnings.push({
      code: "invalid-structure",
      message: `Duplicate object refs were merged: ${summary}`,
      severity: "info",
      path: diagram.path,
      field: "objectRefs"
    });
  }

  return {
    nodes,
    missingObjects,
    warnings
  };
}

function resolveEdges(
  diagram: DiagramModel,
  index: ModelingVaultIndex,
  presentObjectIds: Set<string>,
  warnings: ValidationWarning[]
): DiagramEdge[] {
  const explicitEdges = diagram.edges.filter((edge) => {
    const sourceObject = resolveObjectModelReference(edge.source, index);
    const targetObject = resolveObjectModelReference(edge.target, index);

    if (!sourceObject || !targetObject) {
      warnings.push({
        code: "unresolved-reference",
        message: `unresolved relation endpoint in relation "${edge.id ?? `${edge.source}:${edge.target}`}"`,
        severity: "warning",
        path: diagram.path,
        field: "relations"
      });
      return false;
    }

    const sourceId = getObjectId(sourceObject);
    const targetId = getObjectId(targetObject);
    if (!presentObjectIds.has(sourceId) || !presentObjectIds.has(targetId)) {
      warnings.push({
        code: "unresolved-reference",
        message: `relation "${edge.id ?? `${edge.source}:${edge.target}`}" is outside diagram scope`,
        severity: "info",
        path: diagram.path,
        field: "relations"
      });
      return false;
    }

    edge.source = sourceId;
    edge.target = targetId;
    return true;
  });

  if (explicitEdges.length > 0) {
    return explicitEdges;
  }

  const autoAggregatedEdges = resolveClassDiagramEdgesFromObjects(
    diagram,
    index,
    presentObjectIds,
    warnings
  );
  if (autoAggregatedEdges.length > 0) {
    warnings.push({
      code: "section-missing",
      message:
        'diagram relations are empty; using auto-collected class relations from "Objects"',
      severity: "info",
      path: diagram.path,
      field: "relations"
    });
    return autoAggregatedEdges;
  }

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

function resolveClassDiagramEdgesFromObjects(
  diagram: DiagramModel,
  index: ModelingVaultIndex,
  presentObjectIds: Set<string>,
  warnings: ValidationWarning[]
): DiagramEdge[] {
  const edges: DiagramEdge[] = [];
  const seenRelationIds = new Set<string>();

  for (const objectId of presentObjectIds) {
    const object = index.objectsById[objectId];
    if (!object) {
      continue;
    }

    for (const relation of object.relations) {
      const sourceObject = resolveObjectModelReference(relation.sourceClass, index);
      const targetObject = resolveObjectModelReference(relation.targetClass, index);
      const relationKey = buildClassRelationKey(relation);

      if (seenRelationIds.has(relationKey)) {
        continue;
      }

      if (!sourceObject || !targetObject) {
        warnings.push({
          code: "unresolved-reference",
          message: `unresolved class relation endpoint in relation "${relation.id ?? relationKey}"`,
          severity: "warning",
          path: diagram.path,
          field: "relations"
        });
        continue;
      }

      const sourceId = getObjectId(sourceObject);
      const targetId = getObjectId(targetObject);
      if (!presentObjectIds.has(sourceId) || !presentObjectIds.has(targetId)) {
        continue;
      }

      seenRelationIds.add(relationKey);
      edges.push(toClassDiagramEdge(relation, sourceObject, targetObject));
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

function toClassDiagramEdge(
  relation: ClassRelationEdge,
  sourceObject: ObjectModel,
  targetObject: ObjectModel
): DiagramEdge {
  return {
    id: relation.id,
    source: getObjectId(sourceObject),
    target: getObjectId(targetObject),
    kind: relation.kind as DiagramEdge["kind"],
    label: relation.label,
    metadata: {
      notes: relation.notes,
      sourceCardinality: relation.fromMultiplicity,
      targetCardinality: relation.toMultiplicity
    }
  };
}

function buildRelationKey(relation: RelationModel): string {
  return `${relation.source}:${relation.kind}:${relation.target}:${relation.label ?? ""}`;
}

function buildClassRelationKey(relation: ClassRelationEdge): string {
  return (
    relation.id ??
    `${relation.sourceClass}:${relation.targetClass}:${relation.kind}:${relation.label ?? ""}`
  );
}

function resolveErEdges(
  diagram: DiagramModel,
  index: ModelingVaultIndex,
  presentEntityPhysicalNames: Set<string>,
  warnings: ValidationWarning[]
): DiagramEdge[] {
  const edges: DiagramEdge[] = [];
  const seenRelationIds = new Set<string>();
  const presentEntityIds = new Set<string>();

  for (const physicalName of presentEntityPhysicalNames) {
    const entity = index.erEntitiesByPhysicalName[physicalName];
    if (entity) {
      presentEntityIds.add(entity.id);
    }
  }

  for (const physicalName of presentEntityPhysicalNames) {
    const entity = index.erEntitiesByPhysicalName[physicalName];
    if (!entity) {
      continue;
    }

    for (const relation of entity.outboundRelations) {
      const relationId = relation.id ?? `${entity.id}:${relation.targetEntity}:${relation.kind}`;
      if (seenRelationIds.has(relationId)) {
        continue;
      }

      seenRelationIds.add(relationId);

      const targetEntity = resolveErEntityReference(relation.targetEntity, index);

      if (!targetEntity) {
        warnings.push({
          code: "unresolved-reference",
          message: `unresolved ER relation endpoint in relation "${relation.id ?? relationId}"`,
          severity: "warning",
          path: diagram.path,
          field: "relations"
        });
        continue;
      }

      if (!presentEntityIds.has(targetEntity.id)) {
        continue;
      }

      edges.push(toErDiagramEdge(entity, targetEntity, relation));
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
  sourceEntity: ErEntity,
  targetEntity: ErEntity,
  relation: ErRelationEdge
): DiagramEdge {
  const mappingSummary = relation.mappings
    .map((mapping) => `${mapping.localColumn} -> ${mapping.targetColumn}`)
    .join(" / ");

  return {
    id: relation.id,
    source: sourceEntity.id,
    target: targetEntity.id,
    kind: "association",
    label: relation.label,
    metadata: {
      cardinality: relation.cardinality,
      sourceColumn: relation.mappings[0]?.localColumn,
      targetColumn: relation.mappings[0]?.targetColumn,
      logicalName: relation.label,
      physicalName: relation.id,
      kind: relation.kind,
      mappingSummary,
      mappings: relation.mappings
    }
  };
}
