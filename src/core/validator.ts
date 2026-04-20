import type {
  DiagramModel,
  ErRelation,
  ObjectKind,
  ObjectModel,
  RelationKind,
  ValidationWarning
} from "../types/models";
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

  for (const relation of Object.values(index.erRelationsById)) {
    validateErRelationEndpoints(relation, index, warnings);
  }

  return dedupeWarnings(warnings);
}

function validateDiagram(
  diagram: DiagramModel,
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
    if (!index.objectsById[objectRef] && !index.erEntitiesById[objectRef]) {
      warnings.push({
        code: "unresolved-reference",
        message: `unresolved object ref "${objectRef}"`,
        severity: "warning",
        path: diagram.path,
        field: "objectRefs"
      });
    }
  }
}

function validateErRelationEndpoints(
  relation: ErRelation,
  index: ModelingVaultIndex,
  warnings: ValidationWarning[]
): void {
  if (
    index.erEntitiesByPhysicalName[relation.fromEntity] &&
    index.erEntitiesByPhysicalName[relation.toEntity]
  ) {
    return;
  }

  warnings.push({
    code: "unresolved-reference",
    message: `unresolved ER relation endpoint: "${relation.fromEntity}" -> "${relation.toEntity}"`,
    severity: "warning",
    path: relation.path,
    field: "relations"
  });
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
  if (!index.objectsById[source] || !index.objectsById[target]) {
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
