import type {
  ClassRelationEdge,
  DiagramEdge,
  DiagramModel,
  DiagramNode,
  DfdDiagramModel,
  DfdDiagramObjectEntry,
  DfdDiagramObjectKind,
  DfdObjectModel,
  ErEntity,
  ErRelationEdge,
  ObjectModel,
  ParsedFileModel,
  RelationModel,
  ResolvedDiagram,
  ValidationWarning
} from "../types/models";
import {
  buildReferenceIdentityKeys,
  findModelByReference,
  getReferenceDisplayName,
  parseReferenceValue,
  resolveReferenceIdentity,
  resolveDataObjectReference,
  resolveDfdObjectReference,
  resolveErEntityReference,
  resolveObjectModelReference
} from "./reference-resolver";
import type { ModelingVaultIndex } from "./vault-index";

interface ResolvedDfdDiagramObject {
  entry: DfdDiagramObjectEntry;
  node: DiagramNode & { object?: DfdObjectModel };
  object?: DfdObjectModel;
  kind: DfdDiagramObjectKind;
}

export function resolveDiagramRelations(
  diagram: DiagramModel | DfdDiagramModel,
  index: ModelingVaultIndex
): ResolvedDiagram {
  if (diagram.kind === "er") {
    return resolveErDiagramRelations(diagram, index);
  }

  if (diagram.kind === "dfd") {
    return resolveDfdDiagramRelations(diagram as DfdDiagramModel, index);
  }

  const warnings: ValidationWarning[] = [];
  const presentObjectIds = new Set<string>();
  const deduped = dedupeDiagramNodes(
    diagram,
    (objectRef) => resolveObjectModelReference(objectRef, index) ?? undefined,
    (object, objectRef) => (object ? getObjectId(object) : objectRef),
    (object, objectRef) => (object ? getObjectId(object) : `ref:${objectRef}`),
    (object, objectRef) => getClassDiagramNodeDisplayName(objectRef, object),
    (objectRef) => `unresolved object ref "${objectRef}"`,
    "Objects"
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
  const presentEntities: ErEntity[] = [];
  const deduped = dedupeDiagramNodes(
    diagram,
    (objectRef) => resolveErEntityReference(objectRef, index) ?? undefined,
    (entity, objectRef) => entity?.id ?? objectRef,
    (entity, objectRef) => entity?.id ?? `ref:${objectRef}`,
    (entity, objectRef) => getErDiagramNodeDisplayName(objectRef, entity),
    (objectRef) => `unresolved ER entity ref "${objectRef}"`,
    "Objects"
  );

  for (const node of deduped.nodes) {
    if (node.object) {
      presentEntities.push(node.object);
    }
  }

  return {
    diagram,
    nodes: deduped.nodes,
    edges: resolveErEdges(diagram, index, presentEntities, warnings),
    missingObjects: deduped.missingObjects,
    warnings: [...warnings, ...deduped.warnings]
  };
}

function resolveDfdDiagramRelations(
  diagram: DfdDiagramModel,
  index: ModelingVaultIndex
): ResolvedDiagram {
  const warnings: ValidationWarning[] = [];
  const objectResolution = resolveDfdDiagramObjects(diagram, index);
  const edges: DiagramEdge[] = [];

  diagram.flows.forEach((flow, rowIndex) => {
    const context = {
      section: "Flows",
      rowIndex: rowIndex + 1,
      relatedId: flow.id
    };
    const sourceEntry = resolveDfdFlowEndpoint(flow.from, objectResolution, index);
    const targetEntry = resolveDfdFlowEndpoint(flow.to, objectResolution, index);

    if (!sourceEntry) {
      const listedObject = resolveDfdObjectReference(flow.from, index);
      if (listedObject) {
        warnings.push({
          code: "unresolved-reference",
          message: `flow source "${listedObject.id}" resolves to a dfd_object but is not listed in "Objects"`,
          severity: "warning",
          path: diagram.path,
          field: "Flows",
          context
        });
      }
      warnings.push({
        code: "unresolved-reference",
        message: `unresolved DFD flow source "${flow.from}"`,
        severity: "error",
        path: diagram.path,
        field: "Flows",
        context
      });
      return;
    }

    if (!targetEntry) {
      const listedObject = resolveDfdObjectReference(flow.to, index);
      if (listedObject) {
        warnings.push({
          code: "unresolved-reference",
          message: `flow target "${listedObject.id}" resolves to a dfd_object but is not listed in "Objects"`,
          severity: "warning",
          path: diagram.path,
          field: "Flows",
          context
        });
      }
      warnings.push({
        code: "unresolved-reference",
        message: `unresolved DFD flow target "${flow.to}"`,
        severity: "error",
        path: diagram.path,
        field: "Flows",
        context
      });
      return;
    }

    if (sourceEntry.node.id === targetEntry.node.id) {
      warnings.push({
        code: "invalid-structure",
        message: `DFD flow "${flow.id ?? rowIndex + 1}" is a self-loop`,
        severity: "warning",
        path: diagram.path,
        field: "Flows",
        context
      });
    }

    if (sourceEntry.kind === "external" && targetEntry.kind === "external") {
      warnings.push(createDfdFlowShapeWarning(diagram.path, context, "external -> external"));
    } else if (sourceEntry.kind === "external" && targetEntry.kind === "datastore") {
      warnings.push(createDfdFlowShapeWarning(diagram.path, context, "external -> datastore"));
    } else if (sourceEntry.kind === "datastore" && targetEntry.kind === "datastore") {
      warnings.push(createDfdFlowShapeWarning(diagram.path, context, "datastore -> datastore"));
    }

    const flowData = resolveDfdFlowDataDisplay(flow.data, index);
    if (flowData.warning) {
      warnings.push({
        code: "unresolved-reference",
        message: flowData.warning,
        severity: "warning",
        path: diagram.path,
        field: "Flows",
        context
      });
    }

    edges.push({
      id: flow.id,
      source: sourceEntry.node.id,
      target: targetEntry.node.id,
      kind: "flow",
      label: flowData.label,
      metadata: {
        notes: flow.notes,
        rowIndex,
        sourceKind: sourceEntry.kind,
        targetKind: targetEntry.kind,
        dataRaw: flow.data,
        dataReference: flowData.reference,
        dataModelPath: flowData.model?.path
      }
    });
  });

  return {
    diagram,
    nodes: objectResolution.nodes,
    edges,
    missingObjects: objectResolution.missingObjects,
    warnings: [...warnings, ...objectResolution.warnings]
  };
}

function resolveDfdDiagramObjects(
  diagram: DfdDiagramModel,
  index: ModelingVaultIndex
): {
  nodes: Array<DiagramNode & { object?: DfdObjectModel }>;
  missingObjects: string[];
  warnings: ValidationWarning[];
  byId: Map<string, ResolvedDfdDiagramObject>;
  byReferenceKey: Map<string, ResolvedDfdDiagramObject>;
} {
  const warnings: ValidationWarning[] = [];
  const nodes: Array<DiagramNode & { object?: DfdObjectModel }> = [];
  const missingObjects: string[] = [];
  const byId = new Map<string, ResolvedDfdDiagramObject>();
  const byReferenceKey = new Map<string, ResolvedDfdDiagramObject>();
  const entries: DfdDiagramObjectEntry[] =
    diagram.objectEntries.length > 0
      ? diagram.objectEntries
      : diagram.objectRefs.map((ref, rowIndex) => ({
          ref,
          rowIndex,
          compatibilityMode: "legacy_ref_only" as const
        }));

  for (const entry of entries) {
    const ref = entry.ref?.trim();
    const resolvedObject = ref ? resolveDfdObjectReference(ref, index) ?? undefined : undefined;
    if (!ref) {
      warnings.push({
        code: "invalid-structure",
        message: `DFD local object "${entry.id ?? entry.label ?? entry.rowIndex + 1}" uses diagram-local definition without ref.`,
        severity: "info",
        path: diagram.path,
        field: "Objects",
        context: { rowIndex: entry.rowIndex + 1 }
      });
    } else if (!resolvedObject) {
      missingObjects.push(ref);
      warnings.push({
        code: "unresolved-reference",
        message: `unresolved DFD object ref "${ref}"`,
        severity: "warning",
        path: diagram.path,
        field: "Objects",
        context: { rowIndex: entry.rowIndex + 1 }
      });
    }

    const effectiveKind = entry.kind ?? resolvedObject?.kind ?? "other";
    if (!entry.kind && !resolvedObject?.kind) {
      warnings.push({
        code: "invalid-structure",
        message: `DFD object "${entry.id ?? ref ?? entry.rowIndex + 1}" is missing kind and it could not be derived from ref.`,
        severity: "warning",
        path: diagram.path,
        field: "Objects",
        context: { rowIndex: entry.rowIndex + 1 }
      });
    }

    const resolvedLabel = getDfdDiagramNodeDisplayName(entry, resolvedObject);
    const nodeId = entry.id?.trim() || resolvedObject?.id || ref || `dfd-object-${entry.rowIndex + 1}`;
    const node: DiagramNode & { object?: DfdObjectModel } = {
      id: nodeId,
      ref,
      label: resolvedLabel,
      kind: effectiveKind,
      metadata: {
        notes: entry.notes,
        rowIndex: entry.rowIndex,
        local: !ref,
        compatibilityMode: entry.compatibilityMode
      },
      object: resolvedObject
    };
    const registryEntry: ResolvedDfdDiagramObject = {
      entry,
      node,
      object: resolvedObject,
      kind: effectiveKind
    };

    nodes.push(node);
    if (entry.id?.trim()) {
      byId.set(entry.id.trim(), registryEntry);
    }

    const keySourceRefs = [
      ref,
      resolvedObject?.id,
      resolvedObject?.path
    ].filter((value): value is string => Boolean(value && value.trim()));

    for (const sourceRef of keySourceRefs) {
      const keys = buildReferenceIdentityKeys(resolveReferenceIdentity(sourceRef, index));
      for (const key of keys) {
        if (!byReferenceKey.has(key)) {
          byReferenceKey.set(key, registryEntry);
        }
      }
    }
  }

  return { nodes, missingObjects, warnings, byId, byReferenceKey };
}

function resolveDfdFlowEndpoint(
  value: string,
  registry: {
    byId: Map<string, ResolvedDfdDiagramObject>;
    byReferenceKey: Map<string, ResolvedDfdDiagramObject>;
  },
  index: ModelingVaultIndex
): ResolvedDfdDiagramObject | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const byId = registry.byId.get(trimmed);
  if (byId) {
    return byId;
  }

  for (const key of buildReferenceIdentityKeys(resolveReferenceIdentity(trimmed, index))) {
    const matched = registry.byReferenceKey.get(key);
    if (matched) {
      return matched;
    }
  }

  return null;
}

function resolveDfdFlowDataDisplay(
  rawValue: string | undefined,
  index: ModelingVaultIndex
): {
  label?: string;
  reference?: ReturnType<typeof parseReferenceValue>;
  model?: ParsedFileModel | null;
  warning?: string;
} {
  const trimmed = rawValue?.trim();
  if (!trimmed) {
    return {};
  }

  const reference = parseReferenceValue(trimmed);
  if (!reference) {
    return { label: trimmed };
  }

  if (reference.kind === "raw") {
    return { label: trimmed, reference };
  }

  if (reference.isExternal) {
    return {
      label: reference.display || trimmed,
      reference
    };
  }

  const model = reference.target
    ? resolveDataObjectReference(reference.target, index) ??
      findModelByReference(reference.target, index)
    : null;
  if (reference.display) {
    return {
      label: reference.display,
      reference,
      model
    };
  }

  if (model) {
    return {
      label: getReferenceDisplayName(trimmed, model),
      reference,
      model
    };
  }

  if (reference.target) {
    return {
      label: getReferenceDisplayName(trimmed),
      reference,
      warning: `unresolved flow data reference "${trimmed}"`
    };
  }

  return { label: getReferenceDisplayName(trimmed), reference };
}

function dedupeDiagramNodes<TObject extends ObjectModel | ErEntity | DfdObjectModel>(
  diagram: DiagramModel | DfdDiagramModel,
  resolveObject: (objectRef: string) => TObject | undefined,
  buildResolvedId: (object: TObject | undefined, objectRef: string) => string,
  buildCanonicalKey: (object: TObject | undefined, objectRef: string) => string,
  buildDisplayName: (object: TObject | undefined, objectRef: string) => string,
  buildUnresolvedMessage: (objectRef: string) => string,
  field = "objectRefs"
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
        field
      });
    }

    nodes.push({
      id: buildResolvedId(object, objectRef),
      ref: objectRef,
      label: buildDisplayName(object, objectRef),
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
      field
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
  presentEntities: ErEntity[],
  warnings: ValidationWarning[]
): DiagramEdge[] {
  const edges: DiagramEdge[] = [];
  const seenRelationIds = new Set<string>();
  const presentEntityIds = new Set<string>(presentEntities.map((entity) => entity.id));
  const presentEntityKeys = new Set<string>();

  for (const entity of presentEntities) {
    for (const key of buildErEntityCanonicalKeys(entity)) {
      presentEntityKeys.add(key);
    }
  }

  for (const entity of presentEntities) {

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

        const targetIsPresent =
          presentEntityIds.has(targetEntity.id) ||
          buildErEntityCanonicalKeys(targetEntity).some((key) => presentEntityKeys.has(key));
        if (!targetIsPresent) {
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

function getClassDiagramNodeDisplayName(
  reference: string,
  object?: ObjectModel
): string {
  if (object) {
    return object.name || getObjectId(object);
  }

  const parsed = parseReferenceValue(reference);
  if (parsed?.target) {
    return parsed.target.split("/").pop() ?? parsed.target;
  }

  return parsed?.display || parsed?.raw || reference.trim();
}

function getErDiagramNodeDisplayName(
  reference: string,
  entity?: ErEntity
): string {
  const parsed = parseReferenceValue(reference);
  if (parsed?.display) {
    return parsed.display;
  }

  if (entity) {
    return entity.logicalName || entity.physicalName || entity.id;
  }

  if (parsed?.target) {
    return parsed.target.split("/").pop() ?? parsed.target;
  }

  return parsed?.raw || reference.trim();
}

function buildErEntityCanonicalKeys(entity: ErEntity): string[] {
  const keys = new Set<string>();
  if (entity.id?.trim()) {
    keys.add(`id:${entity.id.trim()}`);
  }
  if (entity.physicalName?.trim()) {
    keys.add(`physical:${entity.physicalName.trim()}`);
  }
  if (entity.path?.trim()) {
    const normalizedPath = entity.path.replace(/\\/g, "/").replace(/\.md$/i, "");
    keys.add(`path:${normalizedPath}`);
    const basename = normalizedPath.split("/").pop();
    if (basename) {
      keys.add(`basename:${basename}`);
    }
  }
  return Array.from(keys);
}

function getDfdDiagramNodeDisplayName(
  entry: Pick<DfdDiagramObjectEntry, "label" | "id" | "ref">,
  object?: DfdObjectModel
): string {
  if (entry.label?.trim()) {
    return entry.label.trim();
  }
  if (object) {
    return object.name || object.id;
  }

  if (entry.id?.trim()) {
    return entry.id.trim();
  }

  const reference = entry.ref?.trim() ?? "";
  const parsed = parseReferenceValue(reference);
  if (parsed?.target) {
    return parsed.target.split("/").pop() ?? parsed.target;
  }

  return parsed?.raw || reference.trim();
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

function createDfdFlowShapeWarning(
  path: string,
  context: Record<string, unknown>,
  shape: string
): ValidationWarning {
  return {
    code: "invalid-structure",
    message: `DFD flow shape "${shape}" may be unusual`,
    severity: "warning",
    path,
    field: "Flows",
    context
  };
}
