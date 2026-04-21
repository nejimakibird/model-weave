import type {
  ClassRelationEdge,
  ErEntity,
  ErRelationEdge,
  ObjectModel,
  RelationModel,
  ValidationWarning
} from "../types/models";
import {
  resolveErEntityReference,
  resolveObjectModelReference
} from "./reference-resolver";
import type { ModelingVaultIndex } from "./vault-index";

export type FocusObject = ObjectModel | ErEntity;
export type FocusRelation = RelationModel | ErRelationEdge | ClassRelationEdge;

export interface RelatedObjectEntry {
  relation: FocusRelation;
  relatedObjectId: string;
  relatedObject?: FocusObject;
  direction: "outgoing" | "incoming";
}

export interface ResolvedObjectContext {
  object: FocusObject;
  relatedObjects: RelatedObjectEntry[];
  warnings: ValidationWarning[];
}

export function resolveObjectContext(
  object: FocusObject,
  index: ModelingVaultIndex
): ResolvedObjectContext {
  return object.fileType === "er-entity"
    ? resolveErEntityContext(object, index)
    : resolveClassLikeContext(object, index);
}

function resolveClassLikeContext(
  object: ObjectModel,
  index: ModelingVaultIndex
): ResolvedObjectContext {
  const warnings: ValidationWarning[] = [];
  const seen = new Set<string>();
  const relatedObjects: RelatedObjectEntry[] = [];
  const objectId = getObjectId(object);

  for (const relation of object.relations) {
    const relationKey = buildClassRelationKey(relation);
    if (seen.has(relationKey)) {
      continue;
    }

    seen.add(relationKey);
    const relatedReference = relation.targetClass;
    const relatedObject = resolveObjectModelReference(relatedReference, index) ?? undefined;
    const relatedObjectId = relatedObject ? getObjectId(relatedObject) : relation.targetClass;

    if (!relatedObject) {
      warnings.push({
        code: "unresolved-reference",
        message: `unresolved related object "${relatedObjectId}"`,
        severity: "warning",
        path: object.path,
        field: "relatedObjects"
      });
    }

    relatedObjects.push({
      relation,
      relatedObjectId,
      relatedObject,
      direction: "outgoing"
    });
  }

  for (const candidate of Object.values(index.objectsById)) {
    if (getObjectId(candidate) === objectId) {
      continue;
    }

    for (const relation of candidate.relations) {
      const targetObject = resolveObjectModelReference(relation.targetClass, index);
      if (!targetObject || getObjectId(targetObject) !== objectId) {
        continue;
      }

      const relationKey = buildClassRelationKey(relation);
      if (seen.has(relationKey)) {
        continue;
      }

      seen.add(relationKey);
      relatedObjects.push({
        relation,
        relatedObjectId: getObjectId(candidate),
        relatedObject: candidate,
        direction: "incoming"
      });
    }
  }

  for (const relation of index.relationsByObjectId[objectId] ?? []) {
    const relationKey = relation.id ?? buildRelationKey(relation);
    if (seen.has(relationKey)) {
      continue;
    }

    seen.add(relationKey);

    const outgoing = relation.source === objectId;
    const relatedReference = outgoing ? relation.target : relation.source;
    const relatedObject = resolveObjectModelReference(relatedReference, index) ?? undefined;
    const relatedObjectId = relatedObject ? getObjectId(relatedObject) : relatedReference;

    if (!relatedObject) {
      warnings.push({
        code: "unresolved-reference",
        message: `unresolved related object "${relatedObjectId}"`,
        severity: "warning",
        path: object.path,
        field: "relatedObjects"
      });
    }

    relatedObjects.push({
      relation,
      relatedObjectId,
      relatedObject,
      direction: outgoing ? "outgoing" : "incoming"
    });
  }

  return {
    object,
    relatedObjects,
    warnings
  };
}

function resolveErEntityContext(
  object: ErEntity,
  index: ModelingVaultIndex
): ResolvedObjectContext {
  const warnings: ValidationWarning[] = [];
  const seen = new Set<string>();
  const relatedObjects: RelatedObjectEntry[] = [];
  const allEntities = Object.values(index.erEntitiesById);

  for (const relation of object.outboundRelations) {
    const relationKey =
      relation.id ?? `${object.id}:${relation.targetEntity}:${relation.kind}`;
    if (seen.has(relationKey)) {
      continue;
    }

    seen.add(relationKey);

    const relatedObject = resolveErEntityReference(relation.targetEntity, index) ?? undefined;
    const relatedObjectId = relatedObject?.id ?? relation.targetEntity;

    if (!relatedObject) {
      warnings.push({
        code: "unresolved-reference",
        message: `unresolved related entity "${relation.targetEntity}"`,
        severity: "warning",
        path: object.path,
        field: "relatedObjects"
      });
    }

    relatedObjects.push({
      relation,
      relatedObjectId,
      relatedObject,
      direction: "outgoing"
    });
  }

  for (const entity of allEntities) {
    if (entity.id === object.id) {
      continue;
    }

    for (const relation of entity.outboundRelations) {
      const targetEntity = resolveErEntityReference(relation.targetEntity, index);
      if (!targetEntity || targetEntity.id !== object.id) {
        continue;
      }

      const relationKey = relation.id ?? `${entity.id}:${relation.targetEntity}:${relation.kind}`;
      if (seen.has(relationKey)) {
        continue;
      }

      seen.add(relationKey);
      relatedObjects.push({
        relation,
        relatedObjectId: entity.id,
        relatedObject: entity,
        direction: "incoming"
      });
    }
  }

  return {
    object,
    relatedObjects,
    warnings
  };
}

function getObjectId(object: ObjectModel): string {
  const explicitId = object.frontmatter.id;
  if (typeof explicitId === "string" && explicitId.trim()) {
    return explicitId.trim();
  }

  return object.name;
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
