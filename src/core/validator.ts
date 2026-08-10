import type {
  DataObjectModel,
  DiagramModel,
  DomainEntry,
  DfdDiagramModel,
  DfdDiagramObjectEntry,
  FlowDiagramModel,
  ObjectKind,
  ObjectModel,
  RelationKind,
  ValidationWarning
} from "../types/models";
import {
  formatDfdObjectDomainWithoutLocalDomainsMessage,
  formatDfdObjectUnknownDomainMessage,
  formatDfdObjectUnknownLocalDomainMessage,
  formatDfdLocalDomainOverridesSourceMessage,
  formatDfdLocalDomainFieldMismatchMessage,
  formatDfdLocalDomainMissingSharedMessage,
  formatDomainParentUnknownMessage,
  formatStandaloneDomainDuplicateMessage,
  formatStandaloneDomainFieldConflictMessage
} from "./domain-diagnostics";
import { resolveDomainSources } from "./domain-diagram-resolver";
import {
  buildReferenceIdentityKeys,
  parseReferenceValue,
  resolveReferenceIdentity,
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
const STANDALONE_DOMAIN_CANONICAL_FIELDS = [
  "name",
  "kind",
  "parent"
] as const;

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

  validateStandaloneDomains(index, warnings);

  for (const [diagramId, diagram] of Object.entries(index.diagramsById)) {
    registerId(idRegistry, diagramId, diagram.path, warnings);
    validateFilenameMatchesId(diagramId, diagram.path, warnings);
    validateDiagram(diagram, index, warnings);
  }

  return dedupeWarnings(warnings);
}

function validateStandaloneDomains(
  index: ModelingVaultIndex,
  warnings: ValidationWarning[]
): void {
  const entriesByDomainId = new Map<
    string,
    Array<{ domain: DomainEntry; path: string }>
  >();

  for (const model of Object.values(index.modelsByFilePath)) {
    if (model.fileType !== "domains") {
      continue;
    }

    for (const domain of model.domains) {
      if (!entriesByDomainId.has(domain.id)) {
        entriesByDomainId.set(domain.id, []);
      }
      entriesByDomainId.get(domain.id)!.push({
        domain,
        path: model.path
      });
    }
  }

  validateStandaloneDomainParents(entriesByDomainId, warnings);

  for (const entries of entriesByDomainId.values()) {
    if (entries.length < 2) {
      continue;
    }

    const sortedEntries = [...entries].sort((left, right) => {
      const pathOrder = left.path.localeCompare(right.path);
      if (pathOrder !== 0) {
        return pathOrder;
      }
      return left.domain.rowIndex - right.domain.rowIndex;
    });
    const canonical = sortedEntries[0];
    if (!canonical) {
      continue;
    }

    for (const entry of sortedEntries) {
      warnings.push({
        code: "invalid-structure",
        message: formatStandaloneDomainDuplicateMessage(entry.domain.id),
        severity: "warning",
        path: entry.path,
        field: "Domains.id",
        context: { rowIndex: entry.domain.rowIndex + 1 }
      });
    }

    compareStandaloneDomainFields(sortedEntries, warnings);
  }
}

function validateStandaloneDomainParents(
  entriesByDomainId: Map<string, Array<{ domain: DomainEntry; path: string }>>,
  warnings: ValidationWarning[]
): void {
  for (const entries of entriesByDomainId.values()) {
    for (const entry of entries) {
      const parent = entry.domain.parent?.trim();
      if (!parent || parent === entry.domain.id || entriesByDomainId.has(parent)) {
        continue;
      }
      warnings.push({
        code: "unresolved-reference",
        message: formatDomainParentUnknownMessage(parent),
        severity: "warning",
        path: entry.path,
        field: "Domains.parent",
        context: { rowIndex: entry.domain.rowIndex + 1 }
      });
    }
  }
}

function compareStandaloneDomainFields(
  entries: Array<{ domain: DomainEntry; path: string }>,
  warnings: ValidationWarning[]
): void {
  for (const field of STANDALONE_DOMAIN_CANONICAL_FIELDS) {
    const values = new Set(entries.map((entry) => entry.domain[field]?.trim() ?? ""));
    if (values.size < 2) {
      continue;
    }

    for (const entry of entries) {
      warnings.push({
        code: "invalid-structure",
        message: formatStandaloneDomainFieldConflictMessage(
          entry.domain.id,
          field
        ),
        severity: "warning",
        path: entry.path,
        field: `Domains.${field}`,
        context: { rowIndex: entry.domain.rowIndex + 1 }
      });
    }
  }
}

function validateDiagram(
  diagram: DiagramModel | DfdDiagramModel | FlowDiagramModel,
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

  if (diagram.schema === "dfd_diagram") {
    const dfdDiagram = diagram;
    validateDfdLocalDomains(dfdDiagram, index, warnings);
    validateDfdObjectDomains(dfdDiagram, index, warnings);

    const objectEntries: DfdDiagramObjectEntry[] =
      dfdDiagram.objectEntries.length > 0
        ? dfdDiagram.objectEntries
        : dfdDiagram.objectRefs.map((objectRef, rowIndex) => ({
            ref: objectRef,
            rowIndex,
            compatibilityMode: "legacy_ref_only"
          }));
    const objectIdentityKeys = new Set<string>();
    const objectIds = new Set<string>();

    for (const entry of objectEntries) {
      if (entry.id?.trim()) {
        objectIds.add(entry.id.trim());
      }

      const ref = entry.ref?.trim();
      if (!ref) {
        continue;
      }

      const identity = resolveReferenceIdentity(ref, index);
      if (!identity.resolvedModel) {
        warnings.push({
          code: "unresolved-reference",
          message: `unresolved object ref "${ref}"`,
          severity: "warning",
          path: diagram.path,
          field: "Objects"
        });
        continue;
      }

      for (const key of buildReferenceIdentityKeys(identity)) {
        objectIdentityKeys.add(key);
      }
    }

    for (const edge of dfdDiagram.edges) {
      if (edge.source && objectIds.has(edge.source)) {
        // resolved by local Objects.id
      } else {
        const sourceIdentity = edge.source
          ? resolveReferenceIdentity(edge.source, index)
          : null;
        const sourceResolved =
          !!edge.source &&
          Boolean(sourceIdentity?.resolvedModel);
        const sourceIdentityKeys = sourceIdentity
          ? buildReferenceIdentityKeys(sourceIdentity)
          : [];
        if (!sourceResolved) {
          warnings.push({
            code: "unresolved-reference",
            message: `unresolved flow source "${edge.source}"`,
            severity: "warning",
            path: diagram.path,
            field: "Flows"
          });
        } else if (!sourceIdentityKeys.some((key) => objectIdentityKeys.has(key))) {
          warnings.push({
            code: "unresolved-reference",
            message: `flow source "${edge.source}" is not listed in "Objects"`,
            severity: "warning",
            path: diagram.path,
            field: "Flows"
          });
        }
      }

      if (edge.target && objectIds.has(edge.target)) {
        continue;
      }

      const targetIdentity = edge.target
        ? resolveReferenceIdentity(edge.target, index)
        : null;
      const targetResolved =
        !!edge.target &&
        Boolean(targetIdentity?.resolvedModel);
      const targetIdentityKeys = targetIdentity
        ? buildReferenceIdentityKeys(targetIdentity)
        : [];
      if (!targetResolved) {
        warnings.push({
          code: "unresolved-reference",
          message: `unresolved flow target "${edge.target}"`,
          severity: "warning",
          path: diagram.path,
          field: "Flows"
        });
      } else if (!targetIdentityKeys.some((key) => objectIdentityKeys.has(key))) {
        warnings.push({
          code: "unresolved-reference",
          message: `flow target "${edge.target}" is not listed in "Objects"`,
          severity: "warning",
          path: diagram.path,
          field: "Flows"
        });
      }
    }
  } else if (diagram.schema === "flow_diagram") {
    for (const entry of diagram.objectEntries) {
      const ref = entry.ref?.trim();
      if (ref && !resolveReferenceIdentity(ref, index).resolvedModel) {
        warnings.push({
          code: "unresolved-reference",
          message: `unresolved object ref "${ref}"`,
          severity: "warning",
          path: diagram.path,
          field: "Objects"
        });
      }
    }
  } else {
    for (const objectRef of diagram.objectRefs) {
      if (
        !resolveObjectModelReference(objectRef, index) &&
        !resolveErEntityReference(objectRef, index)
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
  }
}

function validateDfdObjectDomains(
  diagram: DfdDiagramModel,
  index: ModelingVaultIndex,
  warnings: ValidationWarning[]
): void {
  const hasDomainSources = diagram.domainSources.length > 0;
  const mergedDomainIds = buildDfdMergedDomainIdSet(diagram, index, warnings);

  for (const entry of diagram.objectEntries) {
    const domain = entry.domain?.trim();
    if (!domain) {
      continue;
    }

    const objectId = entry.id?.trim() || entry.ref?.trim() || String(entry.rowIndex + 1);
    if (mergedDomainIds.size === 0 && !hasDomainSources) {
      warnings.push({
        code: "unresolved-reference",
        message: formatDfdObjectDomainWithoutLocalDomainsMessage(objectId, domain),
        severity: "warning",
        path: diagram.path,
        field: "Objects.domain",
        context: { rowIndex: entry.rowIndex + 1 }
      });
    } else if (!mergedDomainIds.has(domain)) {
      warnings.push({
        code: "unresolved-reference",
        message: hasDomainSources
          ? formatDfdObjectUnknownDomainMessage(objectId, domain)
          : formatDfdObjectUnknownLocalDomainMessage(objectId, domain),
        severity: "warning",
        path: diagram.path,
        field: "Objects.domain",
        context: { rowIndex: entry.rowIndex + 1 }
      });
    }
  }
}

function buildDfdMergedDomainIdSet(
  diagram: DfdDiagramModel,
  index: ModelingVaultIndex,
  warnings: ValidationWarning[]
): Set<string> {
  const domainsById = new Map<string, DomainEntry>();

  if (diagram.domainSources.length > 0) {
    const resolvedSources = resolveDomainSources(
      diagram.path,
      diagram.domainSources,
      index
    );
    warnings.push(...resolvedSources.warnings);

    for (const domain of resolvedSources.domains) {
      domainsById.set(domain.id, domain);
    }
  }

  for (const localDomain of diagram.domains ?? []) {
    const externalDomain = domainsById.get(localDomain.id);
    if (externalDomain) {
      for (const field of STANDALONE_DOMAIN_CANONICAL_FIELDS) {
        const localValue = localDomain[field]?.trim() ?? "";
        const sourceValue = externalDomain[field]?.trim() ?? "";
        if (!localValue || !sourceValue || localValue === sourceValue) {
          continue;
        }

        warnings.push({
          code: "invalid-structure",
          message: formatDfdLocalDomainOverridesSourceMessage(
            localDomain.id,
            field,
            localValue,
            sourceValue
          ),
          severity: "warning",
          path: diagram.path,
          field: `Domains.${field}`,
          context: { rowIndex: localDomain.rowIndex + 1 }
        });
      }
    }

    domainsById.set(localDomain.id, localDomain);
  }

  return new Set(domainsById.keys());
}

function validateDfdLocalDomains(
  diagram: DfdDiagramModel,
  index: ModelingVaultIndex,
  warnings: ValidationWarning[]
): void {
  const localDomains = diagram.domains ?? [];
  if (localDomains.length === 0) {
    return;
  }

  const sharedDomains = buildSharedDomainLookup(index);
  for (const localDomain of localDomains) {
    const sharedDomain = sharedDomains.get(localDomain.id);
    if (!sharedDomain) {
      warnings.push({
        code: "unresolved-reference",
        message: formatDfdLocalDomainMissingSharedMessage(localDomain.id),
        severity: "warning",
        path: diagram.path,
        field: "Domains.id",
        context: { rowIndex: localDomain.rowIndex + 1 }
      });
      continue;
    }

    compareDfdLocalDomainField(diagram.path, localDomain, sharedDomain, "name", warnings);
    compareDfdLocalDomainField(diagram.path, localDomain, sharedDomain, "kind", warnings);
    compareDfdLocalDomainField(diagram.path, localDomain, sharedDomain, "parent", warnings);
  }
}

function buildSharedDomainLookup(index: ModelingVaultIndex): Map<string, DomainEntry> {
  const sharedDomains = new Map<string, DomainEntry>();

  for (const domainsModel of Object.values(index.domainsById)) {
    for (const domain of domainsModel.domains) {
      if (!sharedDomains.has(domain.id)) {
        sharedDomains.set(domain.id, domain);
      }
    }
  }

  return sharedDomains;
}

function compareDfdLocalDomainField(
  path: string,
  localDomain: DomainEntry,
  sharedDomain: DomainEntry,
  field: "name" | "kind" | "parent",
  warnings: ValidationWarning[]
): void {
  const localValue = localDomain[field]?.trim();
  if (!localValue) {
    return;
  }

  const sharedValue = sharedDomain[field]?.trim() ?? "";
  if (localValue === sharedValue) {
    return;
  }

  warnings.push({
    code: "invalid-structure",
    message: formatDfdLocalDomainFieldMismatchMessage(
      localDomain.id,
      field,
      localValue,
      sharedValue
    ),
    severity: "warning",
    path,
    field: `Domains.${field}`,
    context: { rowIndex: localDomain.rowIndex + 1 }
  });
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
