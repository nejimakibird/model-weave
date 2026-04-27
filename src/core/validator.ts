import type {
  DataObjectModel,
  DiagramModel,
  DfdDiagramModel,
  ObjectKind,
  ObjectModel,
  RelationKind,
  ValidationWarning
} from "../types/models";
import {
  buildReferenceIdentityKeys,
  parseReferenceValue,
  resolveReferenceIdentity,
  resolveDfdObjectReference,
  resolveErEntityReference,
  resolveObjectModelReference
} from "./reference-resolver";
import type { ModelingVaultIndex } from "./vault-index";

const RESERVED_OBJECT_KINDS = new Set<ObjectKind>(["actor", "usecase"]);
const RESERVED_RELATION_KINDS = new Set<RelationKind>([
  "include",
  "extend",
  "transition",
  "message"
]);
const RESERVED_DIAGRAM_KINDS = new Set(["usecase", "activity", "sequence"]);

export function validateVaultIndex(index: ModelingVaultIndex): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const idRegistry = new Map<string, string>();

  for (const [objectId, object] of Object.entries(index.objectsById)) {
    registerId(idRegistry, objectId, object.path, warnings);
    validateFilenameMatchesId(objectId, object.path, warnings);
    validateReservedObjectKind(object, objectId, warnings);
  }

  for (const [entityId, entity] of Object.entries(index.erEntitiesById)) {
    registerId(idRegistry, entityId, entity.path, warnings);
    validateFilenameMatchesId(entityId, entity.path, warnings);
  }

  validateErRelationIds(index, warnings);

  for (const [dfdObjectId, dfdObject] of Object.entries(index.dfdObjectsById)) {
    registerId(idRegistry, dfdObjectId, dfdObject.path, warnings);
    validateFilenameMatchesId(dfdObjectId, dfdObject.path, warnings);
  }

  for (const [dataObjectId, dataObject] of Object.entries(index.dataObjectsById)) {
    registerId(idRegistry, dataObjectId, dataObject.path, warnings);
    validateFilenameMatchesId(dataObjectId, dataObject.path, warnings);
    validateDataObject(dataObject, index, warnings);
  }

  for (const [fileId, relationsFile] of Object.entries(index.relationsFilesById)) {
    registerId(idRegistry, fileId, relationsFile.path, warnings);
    validateFilenameMatchesId(fileId, relationsFile.path, warnings);

    for (const relation of relationsFile.relations) {
      if (relation.id) {
        registerId(idRegistry, relation.id, relationsFile.path, warnings);
      }

      validateRelationEndpoints(relation.source, relation.target, relationsFile.path, index, warnings);

      if (RESERVED_RELATION_KINDS.has(relation.kind)) {
        warnings.push({
          code: "reserved-relation-kind-used",
          message: `reserved kind used: "${relation.kind}"`,
          severity: "info",
          path: relationsFile.path,
          field: "kind"
        });
      }
    }
  }

  for (const [diagramId, diagram] of Object.entries(index.diagramsById)) {
    registerId(idRegistry, diagramId, diagram.path, warnings);
    validateFilenameMatchesId(diagramId, diagram.path, warnings);
    validateDiagram(diagram, index, warnings);
  }

  return dedupeWarnings(warnings);
}

function validateDiagram(
  diagram: DiagramModel | DfdDiagramModel,
  index: ModelingVaultIndex,
  warnings: ValidationWarning[]
): void {
  if (RESERVED_DIAGRAM_KINDS.has(diagram.kind)) {
    warnings.push({
      code: "reserved-diagram-kind-used",
      message: `reserved kind used: "${diagram.kind}"`,
      severity: "info",
      path: diagram.path,
      field: "diagram_kind"
    });
  }

  for (const objectRef of diagram.objectRefs) {
    const identity = resolveReferenceIdentity(objectRef, index);
    if (
      (diagram.kind === "dfd" &&
        (!resolveDfdObjectReference(objectRef, index) ||
          identity.resolvedModelType !== "dfd-object")) ||
      (diagram.kind !== "dfd" &&
      !resolveObjectModelReference(objectRef, index) &&
      !resolveErEntityReference(objectRef, index))
    ) {
      warnings.push({
        code: "unresolved-reference",
        message: `unresolved object ref "${objectRef}"`,
        severity: "warning",
        path: diagram.path,
        field: "objectRefs"
      });
    }
  }

  if (diagram.kind === "dfd") {
    const objectRefIdentityKeys = new Set(
      diagram.objectRefs.flatMap((objectRef) =>
        buildReferenceIdentityKeys(resolveReferenceIdentity(objectRef, index))
      )
    );
    for (const edge of diagram.edges) {
      const sourceIdentity = edge.source
        ? resolveReferenceIdentity(edge.source, index)
        : null;
      const sourceResolved =
        !!edge.source &&
        !!resolveDfdObjectReference(edge.source, index) &&
        sourceIdentity?.resolvedModelType === "dfd-object";
      if (!sourceResolved) {
        warnings.push({
          code: "unresolved-reference",
          message: `unresolved flow source "${edge.source}"`,
          severity: "warning",
          path: diagram.path,
          field: "Flows"
        });
      } else if (
        !buildReferenceIdentityKeys(sourceIdentity!).some((key) =>
          objectRefIdentityKeys.has(key)
        )
      ) {
        warnings.push({
          code: "unresolved-reference",
          message: `flow source "${edge.source}" is not listed in "Objects"`,
          severity: "warning",
          path: diagram.path,
          field: "Flows"
        });
      }

      const targetIdentity = edge.target
        ? resolveReferenceIdentity(edge.target, index)
        : null;
      const targetResolved =
        !!edge.target &&
        !!resolveDfdObjectReference(edge.target, index) &&
        targetIdentity?.resolvedModelType === "dfd-object";
      if (!targetResolved) {
        warnings.push({
          code: "unresolved-reference",
          message: `unresolved flow target "${edge.target}"`,
          severity: "warning",
          path: diagram.path,
          field: "Flows"
        });
      } else if (
        !buildReferenceIdentityKeys(targetIdentity!).some((key) =>
          objectRefIdentityKeys.has(key)
        )
      ) {
        warnings.push({
          code: "unresolved-reference",
          message: `flow target "${edge.target}" is not listed in "Objects"`,
          severity: "warning",
          path: diagram.path,
          field: "Flows"
        });
      }
    }
  }
}

function validateDataObject(
  dataObject: DataObjectModel,
  index: ModelingVaultIndex,
  warnings: ValidationWarning[]
): void {
  for (const field of dataObject.fields) {
    const ref = field.ref?.trim();
    if (!ref) {
      continue;
    }

    const parsed = parseReferenceValue(ref);
    if (parsed?.isExternal || parsed?.kind === "raw") {
      continue;
    }

    const resolved = resolveReferenceIdentity(ref, index);
    if (resolved.resolvedModel) {
      continue;
    }

    warnings.push({
      code: "unresolved-reference",
      message: `unresolved field reference "${ref}"`,
      severity: "warning",
      path: dataObject.path,
      field: "Fields"
    });
  }
}

function validateErRelationIds(
  index: ModelingVaultIndex,
  warnings: ValidationWarning[]
): void {
  const relationIdRegistry = new Map<string, { path: string; ownerId: string }>();

  for (const entity of Object.values(index.erEntitiesById)) {
    for (const relation of entity.relationBlocks) {
      const relationId = relation.id?.trim() ?? "";
      if (!relationId) {
        continue;
      }

      if (isIncompleteErRelationId(relationId)) {
        warnings.push({
          code: "invalid-structure",
          message: `ER relation id looks incomplete: ${relationId}`,
          severity: "warning",
          path: entity.path,
          field: "Relations"
        });
      }

      const existing = relationIdRegistry.get(relationId);
      if (existing && (existing.path !== entity.path || existing.ownerId !== entity.id)) {
        warnings.push({
          code: "invalid-structure",
          message: `duplicate ER relation id: ${relationId}`,
          severity: "warning",
          path: entity.path,
          field: "Relations"
        });
        continue;
      }

      relationIdRegistry.set(relationId, { path: entity.path, ownerId: entity.id });
    }
  }
}

function isIncompleteErRelationId(id: string): boolean {
  const normalized = id.trim().toUpperCase();
  return (
    !normalized ||
    normalized === "REL" ||
    normalized === "REL-" ||
    normalized === "REL--" ||
    normalized === "REL-NEW" ||
    normalized === "REL-TODO"
  );
}

function validateReservedObjectKind(
  object: ObjectModel,
  objectId: string,
  warnings: ValidationWarning[]
): void {
  if (!RESERVED_OBJECT_KINDS.has(object.kind)) {
    return;
  }

  warnings.push({
    code: "reserved-kind-used",
    message: `reserved kind used: "${object.kind}"`,
    severity: "info",
    path: object.path,
    field: objectId
  });
}

function validateRelationEndpoints(
  source: string,
  target: string,
  path: string,
  index: ModelingVaultIndex,
  warnings: ValidationWarning[]
): void {
  if (
    !resolveObjectModelReference(source, index) ||
    !resolveObjectModelReference(target, index)
  ) {
    warnings.push({
      code: "unresolved-reference",
      message: `unresolved relation endpoint: "${source}" -> "${target}"`,
      severity: "warning",
      path,
      field: "relations"
    });
  }
}

function registerId(
  registry: Map<string, string>,
  id: string,
  path: string,
  warnings: ValidationWarning[]
): void {
  const existing = registry.get(id);
  if (!existing) {
    registry.set(id, path);
    return;
  }

  warnings.push({
    code: "invalid-structure",
    message: `duplicate id detected: "${id}"`,
    severity: "warning",
    path,
    field: "id"
  });
}

function validateFilenameMatchesId(
  id: string,
  path: string,
  warnings: ValidationWarning[]
): void {
  const baseName = path.replace(/\\/g, "/").split("/").pop()?.replace(/\.md$/i, "");

  if (!baseName || baseName === id) {
    return;
  }

  warnings.push({
    code: "invalid-structure",
    message: `filename and id mismatch: "${baseName}" != "${id}"`,
    severity: "info",
    path,
    field: "id"
  });
}

function dedupeWarnings(warnings: ValidationWarning[]): ValidationWarning[] {
  return warnings.filter((warning, index) => {
    return (
      warnings.findIndex(
        (entry) =>
          entry.code === warning.code &&
          entry.message === warning.message &&
          entry.path === warning.path &&
          entry.field === warning.field
      ) === index
    );
  });
}
