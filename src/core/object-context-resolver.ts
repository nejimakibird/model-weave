import type {
  ErEntity,
  ErRelation,
  ObjectModel,
  RelationModel,
  ValidationWarning
} from "../types/models";
import type { ModelingVaultIndex } from "./vault-index";

export type FocusObject = ObjectModel | ErEntity;
export type FocusRelation = RelationModel | ErRelation;

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
  const allRelations = index.relationsByObjectId[getObjectId(object)] ?? [];
  const seen = new Set<string>();
  const relatedObjects: RelatedObjectEntry[] = [];

  for (const relation of allRelations) {
    const relationKey = relation.id ?? buildRelationKey(relation);
    if (seen.has(relationKey)) {
      continue;
    }

    seen.add(relationKey);

    const outgoing = relation.source === getObjectId(object);
    const relatedObjectId = outgoing ? relation.target : relation.source;
    const relatedObject = index.objectsById[relatedObjectId];

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
  const allRelations = index.erRelationsByEntityPhysicalName[object.physicalName] ?? [];
  const seen = new Set<string>();
  const relatedObjects: RelatedObjectEntry[] = [];

  for (const relation of allRelations) {
    const relationKey = relation.id;
    if (seen.has(relationKey)) {
      continue;
    }

    seen.add(relationKey);

    const outgoing = relation.fromEntity === object.physicalName;
    const relatedPhysicalName = outgoing ? relation.toEntity : relation.fromEntity;
    const relatedObject = index.erEntitiesByPhysicalName[relatedPhysicalName];
    const relatedObjectId = relatedObject?.id ?? relatedPhysicalName;

    if (!relatedObject) {
      warnings.push({
        code: "unresolved-reference",
        message: `unresolved related entity "${relatedPhysicalName}"`,
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
