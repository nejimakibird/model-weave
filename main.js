"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => ModelingToolPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian6 = require("obsidian");

// src/core/dfd-object-scene.ts
function buildDfdObjectScene(object) {
  const nodes = /* @__PURE__ */ new Map();
  const warnings = [];
  nodes.set(object.id, {
    id: object.id,
    ref: object.id,
    kind: object.kind,
    object
  });
  const diagram = {
    fileType: "dfd-diagram",
    schema: "dfd_diagram",
    path: object.path,
    title: `${object.name} related`,
    frontmatter: {
      type: "dfd_diagram",
      id: `${object.id}-related`,
      name: `${object.name} related`
    },
    sections: {},
    id: `${object.id}-related`,
    name: `${object.name} related`,
    kind: "dfd",
    objectRefs: Array.from(nodes.keys()),
    nodes: Array.from(nodes.values()).map(({ object: ignored, ...node }) => node),
    edges: [],
    flows: []
  };
  return {
    diagram,
    nodes: Array.from(nodes.values()),
    edges: [],
    missingObjects: [],
    warnings
  };
}

// src/core/reference-resolver.ts
function normalizeReferenceTarget(reference) {
  const parsed = parseReferenceValue(reference);
  const target = parsed?.target?.trim();
  if (target) {
    return target;
  }
  return reference.trim().replace(/\.md$/i, "").replace(/\\/g, "/");
}
function parseReferenceValue(reference) {
  const trimmed = reference.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith("[[") && trimmed.endsWith("]]")) {
    const inner = trimmed.slice(2, -2).trim();
    const [targetPart, aliasPart] = splitWikilinkParts(inner);
    return {
      raw: trimmed,
      kind: "wikilink",
      target: normalizeLinkTarget(unescapeWikilinkTarget(targetPart ?? "")),
      display: unescapeReferenceLabel(aliasPart?.trim() || "") || void 0
    };
  }
  const markdownLinkMatch = trimmed.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
  if (markdownLinkMatch) {
    const [, label, target] = markdownLinkMatch;
    return {
      raw: trimmed,
      kind: "markdown_link",
      target: isExternalLinkTarget(target) ? void 0 : normalizeLinkTarget(target),
      display: label.trim() || void 0,
      isExternal: isExternalLinkTarget(target)
    };
  }
  return {
    raw: trimmed,
    kind: "raw",
    target: normalizeLinkTarget(trimmed)
  };
}
function buildReferenceCandidates(reference) {
  const normalized = normalizeReferenceTarget(reference);
  if (!normalized) {
    return [];
  }
  const basename = getBasename(normalized);
  return Array.from(
    new Set(
      [reference.trim(), normalized, basename].filter(
        (value) => Boolean(value && value.trim())
      )
    )
  );
}
function resolveObjectModelReference(reference, index) {
  for (const candidate of buildReferenceCandidates(reference)) {
    const direct = index.objectsById[candidate];
    if (direct) {
      return direct;
    }
  }
  const model = findModelByReference(reference, index);
  return model?.fileType === "object" ? model : null;
}
function resolveErEntityReference(reference, index) {
  for (const candidate of buildReferenceCandidates(reference)) {
    const byId = index.erEntitiesById[candidate];
    if (byId) {
      return byId;
    }
    const byPhysicalName = index.erEntitiesByPhysicalName[candidate];
    if (byPhysicalName) {
      return byPhysicalName;
    }
  }
  const model = findModelByReference(reference, index);
  return model?.fileType === "er-entity" ? model : null;
}
function resolveDfdObjectReference(reference, index) {
  for (const candidate of buildReferenceCandidates(reference)) {
    const direct = index.dfdObjectsById[candidate];
    if (direct) {
      return direct;
    }
  }
  const model = findModelByReference(reference, index);
  return model?.fileType === "dfd-object" ? model : null;
}
function resolveDataObjectReference(reference, index) {
  for (const candidate of buildReferenceCandidates(reference)) {
    const direct = index.dataObjectsById[candidate];
    if (direct) {
      return direct;
    }
  }
  const model = findModelByReference(reference, index);
  return model?.fileType === "data-object" ? model : null;
}
function findModelByReference(reference, index) {
  const candidates = buildReferenceCandidates(reference);
  for (const candidate of candidates) {
    const directPath = index.modelsByFilePath[candidate];
    if (directPath) {
      return directPath;
    }
    const markdownPath = `${candidate}.md`;
    if (index.modelsByFilePath[markdownPath]) {
      return index.modelsByFilePath[markdownPath];
    }
  }
  for (const candidate of candidates) {
    const normalizedCandidate = candidate.replace(/\\/g, "/");
    const withExtension = normalizedCandidate.endsWith(".md") ? normalizedCandidate : `${normalizedCandidate}.md`;
    for (const [path, model] of Object.entries(index.modelsByFilePath)) {
      const normalizedPath = path.replace(/\\/g, "/");
      if (normalizedPath === withExtension || normalizedPath.endsWith(`/${withExtension}`) || getBasename(normalizedPath) === getBasename(normalizedCandidate)) {
        return model;
      }
    }
  }
  return null;
}
function resolveReferenceIdentity(reference, index) {
  const parsed = parseReferenceValue(reference);
  const model = findModelByReference(reference, index);
  return {
    raw: reference.trim(),
    parsed,
    target: parsed?.target,
    displayLabel: parsed?.display,
    resolvedFile: model?.path,
    resolvedId: getResolvedModelId(model),
    resolvedModelType: model?.fileType,
    resolvedModel: model
  };
}
function buildReferenceIdentityKeys(identity) {
  const targetBasename = identity.target ? getBasename(identity.target) : void 0;
  const rawBasename = identity.raw ? getBasename(normalizeLinkTarget(identity.raw)) : void 0;
  return Array.from(
    new Set(
      [
        identity.resolvedFile ? `file:${identity.resolvedFile}` : null,
        identity.resolvedId ? `id:${identity.resolvedId}` : null,
        identity.target ? `target:${identity.target}` : null,
        identity.parsed?.target ? `target:${identity.parsed.target}` : null,
        targetBasename ? `basename:${targetBasename}` : null,
        identity.raw ? `raw:${normalizeLinkTarget(identity.raw)}` : null,
        rawBasename ? `basename:${rawBasename}` : null
      ].filter((value) => Boolean(value))
    )
  );
}
function getReferenceDisplayName(reference, resolvedModel) {
  const parsed = parseReferenceValue(reference);
  if (parsed?.display) {
    return parsed.display;
  }
  if (resolvedModel) {
    return getReferencedModelDisplayName(resolvedModel);
  }
  if (parsed?.target) {
    return getBasename(parsed.target);
  }
  return parsed?.raw ?? reference.trim();
}
function getReferencedModelDisplayName(model) {
  switch (model.fileType) {
    case "data-object":
    case "dfd-object":
    case "dfd-diagram":
    case "object":
      return model.name;
    case "er-entity":
      return model.logicalName || model.physicalName || model.id;
    case "diagram":
      return model.name;
    case "relations":
      return model.title ?? model.path;
    case "markdown":
    default:
      return typeof model.frontmatter.name === "string" && model.frontmatter.name || typeof model.frontmatter.title === "string" && model.frontmatter.title || getBasename(model.path);
  }
}
function getResolvedModelId(model) {
  if (!model) {
    return void 0;
  }
  switch (model.fileType) {
    case "object":
      return typeof model.frontmatter.id === "string" && model.frontmatter.id.trim() ? model.frontmatter.id.trim() : model.name;
    case "er-entity":
    case "dfd-object":
    case "dfd-diagram":
    case "data-object":
      return model.id;
    case "diagram":
      return model.name;
    case "relations":
      return typeof model.frontmatter.id === "string" && model.frontmatter.id.trim() ? model.frontmatter.id.trim() : model.title;
    case "markdown":
    default:
      return void 0;
  }
}
function getBasename(path) {
  const normalized = path.replace(/\\/g, "/");
  const leaf = normalized.split("/").pop() ?? normalized;
  return leaf.replace(/\.md$/i, "");
}
function normalizeLinkTarget(value) {
  const withoutHeading = value.trim().split("#", 1)[0].trim();
  const withoutBlock = withoutHeading.split("^", 1)[0].trim();
  return withoutBlock.replace(/\.md$/i, "").replace(/\\/g, "/");
}
function isExternalLinkTarget(value) {
  const trimmed = value.trim();
  return /^[A-Za-z][A-Za-z0-9+.-]*:/.test(trimmed);
}
function splitWikilinkParts(value) {
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === "|") {
      return [value.slice(0, index), value.slice(index + 1)];
    }
    if (char === "\\" && value[index + 1] === "|") {
      return [value.slice(0, index), value.slice(index + 2)];
    }
  }
  return [value];
}
function unescapeReferenceLabel(value) {
  return value.replace(/\\\|/g, "|").trim();
}
function unescapeWikilinkTarget(value) {
  return value.replace(/\\\|/g, "|").trim();
}

// src/core/object-context-resolver.ts
function resolveObjectContext(object, index) {
  return object.fileType === "er-entity" ? resolveErEntityContext(object, index) : resolveClassLikeContext(object, index);
}
function resolveClassLikeContext(object, index) {
  const warnings = [];
  const seen = /* @__PURE__ */ new Set();
  const relatedObjects = [];
  const objectId = getObjectId(object);
  for (const relation of object.relations) {
    const relationKey = buildClassRelationKey(relation);
    if (seen.has(relationKey)) {
      continue;
    }
    seen.add(relationKey);
    const relatedReference = relation.targetClass;
    const relatedObject = resolveObjectModelReference(relatedReference, index) ?? void 0;
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
    const relatedObject = resolveObjectModelReference(relatedReference, index) ?? void 0;
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
function resolveErEntityContext(object, index) {
  const warnings = [];
  const seen = /* @__PURE__ */ new Set();
  const relatedObjects = [];
  const allEntities = Object.values(index.erEntitiesById);
  for (const relation of object.outboundRelations) {
    const relationKey = relation.id ?? `${object.id}:${relation.targetEntity}:${relation.kind}`;
    if (seen.has(relationKey)) {
      continue;
    }
    seen.add(relationKey);
    const relatedObject = resolveErEntityReference(relation.targetEntity, index) ?? void 0;
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
function getObjectId(object) {
  const explicitId = object.frontmatter.id;
  if (typeof explicitId === "string" && explicitId.trim()) {
    return explicitId.trim();
  }
  return object.name;
}
function buildRelationKey(relation) {
  return `${relation.source}:${relation.kind}:${relation.target}:${relation.label ?? ""}`;
}
function buildClassRelationKey(relation) {
  return relation.id ?? `${relation.sourceClass}:${relation.targetClass}:${relation.kind}:${relation.label ?? ""}`;
}

// src/core/current-file-diagnostics.ts
var CLASS_RELATION_KINDS = /* @__PURE__ */ new Set([
  "association",
  "dependency",
  "inheritance",
  "implementation",
  "aggregation",
  "composition"
]);
function buildCurrentObjectDiagnostics(model, index, context, warnings) {
  const diagnostics = warnings.map(
    (warning) => normalizeDiagnosticSeverity(warning)
  );
  if (model.fileType === "object") {
    diagnostics.push(...buildClassDiagnostics(model, index));
  } else if (model.fileType === "dfd-object") {
    diagnostics.push(...buildDfdObjectDiagnostics(model));
  } else if (model.fileType === "data-object") {
    diagnostics.push(...buildDataObjectDiagnostics(model, index));
  } else {
    diagnostics.push(...buildErEntityDiagnostics(model, index));
  }
  if (context) {
    diagnostics.push(...context.warnings.map((warning) => normalizeDiagnosticSeverity(warning)));
  }
  return dedupeDiagnostics(diagnostics);
}
function buildDfdObjectDiagnostics(model) {
  const diagnostics = [];
  if (!model.id) {
    diagnostics.push({
      code: "invalid-structure",
      message: 'required frontmatter "id" is missing',
      severity: "error",
      path: model.path,
      field: "id",
      context: {
        section: "frontmatter"
      }
    });
  }
  return diagnostics;
}
function buildDataObjectDiagnostics(model, index) {
  const diagnostics = [];
  for (const field of model.fields) {
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
    diagnostics.push({
      code: "unresolved-reference",
      message: `unresolved field reference "${ref}"`,
      severity: "warning",
      path: model.path,
      field: "Fields",
      context: {
        section: "Fields"
      }
    });
  }
  return diagnostics;
}
function buildCurrentDiagramDiagnostics(diagram, warnings) {
  return dedupeDiagnostics(warnings.map((warning) => normalizeDiagnosticSeverity(warning)));
}
function buildClassDiagnostics(model, index) {
  const diagnostics = [];
  for (const relation of model.relations) {
    if (!resolveObjectModelReference(relation.targetClass, index)) {
      diagnostics.push({
        code: "unresolved-reference",
        message: `unresolved class relation target "${relation.targetClass}"`,
        severity: "warning",
        path: model.path,
        field: "Relations",
        context: {
          relatedId: relation.id,
          section: "Relations"
        }
      });
    }
    if (!CLASS_RELATION_KINDS.has(relation.kind)) {
      diagnostics.push({
        code: "invalid-kind",
        message: `invalid class relation kind "${relation.kind}"`,
        severity: "warning",
        path: model.path,
        field: "Relations",
        context: {
          relatedId: relation.id,
          section: "Relations"
        }
      });
    }
  }
  return diagnostics;
}
function buildErEntityDiagnostics(entity, index) {
  const diagnostics = [];
  const localColumnNames = new Set(entity.columns.map((column) => column.physicalName));
  if (entity.relationBlocks.length === 0) {
    diagnostics.push({
      code: "section-missing",
      message: 'No relations are defined in "## Relations".',
      severity: "info",
      path: entity.path,
      field: "Relations",
      context: {
        section: "Relations"
      }
    });
  }
  for (const relationBlock of entity.relationBlocks) {
    if (!relationBlock.cardinality) {
      diagnostics.push({
        code: "section-missing",
        message: `relation "${relationBlock.id}" does not specify cardinality`,
        severity: "info",
        path: entity.path,
        field: "Relations",
        context: {
          relatedId: relationBlock.id,
          section: "Relations"
        }
      });
    }
    if (!relationBlock.targetTable) {
      diagnostics.push({
        code: "unresolved-reference",
        message: `relation "${relationBlock.id}" does not resolve target_table`,
        severity: "warning",
        path: entity.path,
        field: "Relations",
        context: {
          relatedId: relationBlock.id,
          section: "Relations"
        }
      });
      continue;
    }
    const targetEntity = resolveErEntityReference(relationBlock.targetTable, index);
    if (!targetEntity) {
      diagnostics.push({
        code: "unresolved-reference",
        message: `relation "${relationBlock.id}" target_table "${relationBlock.targetTable}" could not be resolved`,
        severity: "warning",
        path: entity.path,
        field: "Relations",
        context: {
          relatedId: relationBlock.id,
          section: "Relations"
        }
      });
      continue;
    }
    const targetColumnNames = new Set(
      targetEntity.columns.map((column) => column.physicalName)
    );
    for (const mapping of relationBlock.mappings) {
      if (mapping.localColumn && !localColumnNames.has(mapping.localColumn)) {
        diagnostics.push({
          code: "unresolved-reference",
          message: `relation "${relationBlock.id}" local column "${mapping.localColumn}" does not exist in the current entity`,
          severity: "warning",
          path: entity.path,
          field: "Relations",
          context: {
            relatedId: relationBlock.id,
            section: "Relations"
          }
        });
      }
      if (mapping.targetColumn && !targetColumnNames.has(mapping.targetColumn)) {
        diagnostics.push({
          code: "unresolved-reference",
          message: `relation "${relationBlock.id}" target column "${mapping.targetColumn}" does not exist in "${targetEntity.physicalName}"`,
          severity: "warning",
          path: entity.path,
          field: "Relations",
          context: {
            relatedId: relationBlock.id,
            section: "Relations"
          }
        });
      }
    }
  }
  return diagnostics;
}
function normalizeDiagnosticSeverity(warning) {
  if (warning.severity === "info" || warning.severity === "error") {
    return warning;
  }
  if (warning.code === "frontmatter-parse-error" || warning.code === "unknown-schema" || warning.code === "invalid-table-column" || warning.code === "invalid-table-row" || warning.code === "missing-name" || warning.code === "missing-kind") {
    return { ...warning, severity: "error" };
  }
  if (warning.code === "invalid-structure" && typeof warning.field === "string" && ["type", "id", "name", "logical_name", "physical_name", "kind"].includes(warning.field)) {
    return { ...warning, severity: "error" };
  }
  return warning;
}
function dedupeDiagnostics(warnings) {
  return warnings.filter(
    (warning, index) => warnings.findIndex(
      (entry) => entry.code === warning.code && entry.message === warning.message && entry.severity === warning.severity && entry.path === warning.path && entry.field === warning.field
    ) === index
  );
}

// src/core/relation-resolver.ts
function resolveDiagramRelations(diagram, index) {
  if (diagram.kind === "er") {
    return resolveErDiagramRelations(diagram, index);
  }
  if (diagram.kind === "dfd") {
    return resolveDfdDiagramRelations(diagram, index);
  }
  const warnings = [];
  const presentObjectIds = /* @__PURE__ */ new Set();
  const deduped = dedupeDiagramNodes(
    diagram,
    (objectRef) => resolveObjectModelReference(objectRef, index) ?? void 0,
    (object, objectRef) => object ? getObjectId2(object) : objectRef,
    (object, objectRef) => object ? getObjectId2(object) : `ref:${objectRef}`,
    (object, objectRef) => getClassDiagramNodeDisplayName(objectRef, object),
    (objectRef) => `unresolved object ref "${objectRef}"`,
    "Objects"
  );
  for (const node of deduped.nodes) {
    if (node.object) {
      presentObjectIds.add(getObjectId2(node.object));
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
function resolveErDiagramRelations(diagram, index) {
  const warnings = [];
  const presentEntityPhysicalNames = /* @__PURE__ */ new Set();
  const deduped = dedupeDiagramNodes(
    diagram,
    (objectRef) => resolveErEntityReference(objectRef, index) ?? void 0,
    (entity, objectRef) => entity?.id ?? objectRef,
    (entity, objectRef) => entity?.id ?? `ref:${objectRef}`,
    (entity, objectRef) => getErDiagramNodeDisplayName(objectRef, entity),
    (objectRef) => `unresolved ER entity ref "${objectRef}"`,
    "Objects"
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
function resolveDfdDiagramRelations(diagram, index) {
  const warnings = [];
  const deduped = dedupeDiagramNodes(
    diagram,
    (objectRef) => resolveDfdObjectReference(objectRef, index) ?? void 0,
    (object, objectRef) => object?.id ?? objectRef,
    (object, objectRef) => object?.id ?? `ref:${objectRef}`,
    (object, objectRef) => getDfdDiagramNodeDisplayName(objectRef, object),
    (objectRef) => `unresolved DFD object ref "${objectRef}"`,
    "Objects"
  );
  const presentObjectIds = new Set(
    deduped.nodes.map((node) => node.object?.id).filter((id) => Boolean(id))
  );
  const edges = [];
  diagram.flows.forEach((flow, rowIndex) => {
    const sourceObject = resolveDfdObjectReference(flow.from, index);
    const targetObject = resolveDfdObjectReference(flow.to, index);
    const context = {
      section: "Flows",
      rowIndex: rowIndex + 1,
      relatedId: flow.id
    };
    if (!sourceObject) {
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
    if (!targetObject) {
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
    if (!presentObjectIds.has(sourceObject.id)) {
      warnings.push({
        code: "unresolved-reference",
        message: `flow source "${sourceObject.id}" is not listed in "Objects"`,
        severity: "error",
        path: diagram.path,
        field: "Flows",
        context
      });
      return;
    }
    if (!presentObjectIds.has(targetObject.id)) {
      warnings.push({
        code: "unresolved-reference",
        message: `flow target "${targetObject.id}" is not listed in "Objects"`,
        severity: "error",
        path: diagram.path,
        field: "Flows",
        context
      });
      return;
    }
    if (sourceObject.id === targetObject.id) {
      warnings.push({
        code: "invalid-structure",
        message: `DFD flow "${flow.id ?? rowIndex + 1}" is a self-loop`,
        severity: "warning",
        path: diagram.path,
        field: "Flows",
        context
      });
    }
    if (sourceObject.kind === "external" && targetObject.kind === "external") {
      warnings.push(createDfdFlowShapeWarning(diagram.path, context, "external -> external"));
    } else if (sourceObject.kind === "external" && targetObject.kind === "datastore") {
      warnings.push(createDfdFlowShapeWarning(diagram.path, context, "external -> datastore"));
    } else if (sourceObject.kind === "datastore" && targetObject.kind === "datastore") {
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
      source: sourceObject.id,
      target: targetObject.id,
      kind: "flow",
      label: flowData.label,
      metadata: {
        notes: flow.notes,
        rowIndex,
        sourceKind: sourceObject.kind,
        targetKind: targetObject.kind,
        dataRaw: flow.data,
        dataReference: flowData.reference,
        dataModelPath: flowData.model?.path
      }
    });
  });
  return {
    diagram,
    nodes: deduped.nodes,
    edges,
    missingObjects: deduped.missingObjects,
    warnings: [...warnings, ...deduped.warnings]
  };
}
function resolveDfdFlowDataDisplay(rawValue, index) {
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
  const model = reference.target ? resolveDataObjectReference(reference.target, index) ?? findModelByReference(reference.target, index) : null;
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
function dedupeDiagramNodes(diagram, resolveObject, buildResolvedId, buildCanonicalKey, buildDisplayName, buildUnresolvedMessage, field = "objectRefs") {
  const nodes = [];
  const missingObjects = [];
  const warnings = [];
  const seenKeys = /* @__PURE__ */ new Set();
  const seenMissingRefs = /* @__PURE__ */ new Set();
  const duplicateCounts = /* @__PURE__ */ new Map();
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
    const summary = Array.from(duplicateCounts.values()).map((entry) => `${entry.displayRef} x${entry.count}`).join(", ");
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
function resolveEdges(diagram, index, presentObjectIds, warnings) {
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
    const sourceId = getObjectId2(sourceObject);
    const targetId = getObjectId2(targetObject);
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
      message: 'diagram relations are empty; using auto-collected class relations from "Objects"',
      severity: "info",
      path: diagram.path,
      field: "relations"
    });
    return autoAggregatedEdges;
  }
  const edges = [];
  const seenRelationIds = /* @__PURE__ */ new Set();
  for (const objectId of presentObjectIds) {
    const relations = index.relationsByObjectId[objectId] ?? [];
    for (const relation of relations) {
      const relationKey = relation.id ?? buildRelationKey2(relation);
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
      if (presentObjectIds.has(getObjectId2(sourceObject)) && presentObjectIds.has(getObjectId2(targetObject))) {
        edges.push(toDiagramEdge(relation, sourceObject, targetObject));
      }
    }
  }
  return edges;
}
function resolveClassDiagramEdgesFromObjects(diagram, index, presentObjectIds, warnings) {
  const edges = [];
  const seenRelationIds = /* @__PURE__ */ new Set();
  for (const objectId of presentObjectIds) {
    const object = index.objectsById[objectId];
    if (!object) {
      continue;
    }
    for (const relation of object.relations) {
      const sourceObject = resolveObjectModelReference(relation.sourceClass, index);
      const targetObject = resolveObjectModelReference(relation.targetClass, index);
      const relationKey = buildClassRelationKey2(relation);
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
      const sourceId = getObjectId2(sourceObject);
      const targetId = getObjectId2(targetObject);
      if (!presentObjectIds.has(sourceId) || !presentObjectIds.has(targetId)) {
        continue;
      }
      seenRelationIds.add(relationKey);
      edges.push(toClassDiagramEdge(relation, sourceObject, targetObject));
    }
  }
  return edges;
}
function toDiagramEdge(relation, sourceObject, targetObject) {
  return {
    id: relation.id,
    source: getObjectId2(sourceObject),
    target: getObjectId2(targetObject),
    kind: relation.kind,
    label: relation.label,
    metadata: {
      sourceCardinality: relation.sourceCardinality,
      targetCardinality: relation.targetCardinality
    }
  };
}
function toClassDiagramEdge(relation, sourceObject, targetObject) {
  return {
    id: relation.id,
    source: getObjectId2(sourceObject),
    target: getObjectId2(targetObject),
    kind: relation.kind,
    label: relation.label,
    metadata: {
      notes: relation.notes,
      sourceCardinality: relation.fromMultiplicity,
      targetCardinality: relation.toMultiplicity
    }
  };
}
function buildRelationKey2(relation) {
  return `${relation.source}:${relation.kind}:${relation.target}:${relation.label ?? ""}`;
}
function buildClassRelationKey2(relation) {
  return relation.id ?? `${relation.sourceClass}:${relation.targetClass}:${relation.kind}:${relation.label ?? ""}`;
}
function resolveErEdges(diagram, index, presentEntityPhysicalNames, warnings) {
  const edges = [];
  const seenRelationIds = /* @__PURE__ */ new Set();
  const presentEntityIds = /* @__PURE__ */ new Set();
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
function getObjectId2(object) {
  const explicitId = object.frontmatter.id;
  if (typeof explicitId === "string" && explicitId.trim()) {
    return explicitId.trim();
  }
  return object.name;
}
function getClassDiagramNodeDisplayName(reference, object) {
  if (object) {
    return object.name || getObjectId2(object);
  }
  const parsed = parseReferenceValue(reference);
  if (parsed?.target) {
    return parsed.target.split("/").pop() ?? parsed.target;
  }
  return parsed?.display || parsed?.raw || reference.trim();
}
function getErDiagramNodeDisplayName(reference, entity) {
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
function getDfdDiagramNodeDisplayName(reference, object) {
  if (object) {
    return object.name || object.id;
  }
  const parsed = parseReferenceValue(reference);
  if (parsed?.target) {
    return parsed.target.split("/").pop() ?? parsed.target;
  }
  return parsed?.raw || reference.trim();
}
function toErDiagramEdge(sourceEntity, targetEntity, relation) {
  const mappingSummary = relation.mappings.map((mapping) => `${mapping.localColumn} -> ${mapping.targetColumn}`).join(" / ");
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
function createDfdFlowShapeWarning(path, context, shape) {
  return {
    code: "invalid-structure",
    message: `DFD flow shape "${shape}" may be unusual`,
    severity: "warning",
    path,
    field: "Flows",
    context
  };
}

// src/core/schema-detector.ts
var SCHEMA_TO_FILE_TYPE = {
  model_object_v1: "object",
  model_relations_v1: "relations"
};
var TYPE_TO_FILE_TYPE = {
  class: "object",
  dfd_object: "dfd-object",
  dfd_diagram: "dfd-diagram",
  er_entity: "er-entity",
  er_diagram: "diagram",
  class_diagram: "diagram"
};
function detectFileType(value) {
  const schema = typeof value === "string" ? value : value?.schema;
  if (!schema) {
    if (typeof value !== "string") {
      const type = typeof value?.type === "string" ? value.type.trim() : "";
      if (type && TYPE_TO_FILE_TYPE[type]) {
        return TYPE_TO_FILE_TYPE[type];
      }
    }
    return "markdown";
  }
  return SCHEMA_TO_FILE_TYPE[schema] ?? "markdown";
}

// src/editor/model-weave-editor-suggest.ts
var import_obsidian = require("obsidian");

// src/parsers/frontmatter-parser.ts
function parseFrontmatter(markdown) {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const warnings = [];
  if (!normalized.startsWith("---\n")) {
    return {
      file: {
        body: normalized
      },
      warnings
    };
  }
  const lines = normalized.split("\n");
  let closingIndex = -1;
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index].trim() === "---") {
      closingIndex = index;
      break;
    }
  }
  if (closingIndex === -1) {
    warnings.push(createWarning("frontmatter parse error: missing closing delimiter"));
    return {
      file: {
        body: normalized
      },
      warnings
    };
  }
  const frontmatterLines = lines.slice(1, closingIndex);
  const body = lines.slice(closingIndex + 1).join("\n");
  const parsed = parseYamlLikeFrontmatter(frontmatterLines);
  warnings.push(...parsed.warnings);
  return {
    file: {
      frontmatter: parsed.frontmatter,
      body
    },
    warnings
  };
}
function parseYamlLikeFrontmatter(lines) {
  const warnings = [];
  const frontmatter = {};
  let activeListKey = null;
  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const listItemMatch = rawLine.match(/^\s*-\s+(.+)$/);
    if (listItemMatch) {
      if (!activeListKey) {
        warnings.push(
          createWarning(
            `frontmatter parse error: unexpected list item "${trimmed}"`
          )
        );
        continue;
      }
      const currentValue = frontmatter[activeListKey];
      if (!Array.isArray(currentValue)) {
        frontmatter[activeListKey] = [];
      }
      frontmatter[activeListKey].push(
        parseScalarValue(listItemMatch[1].trim())
      );
      continue;
    }
    activeListKey = null;
    const keyValueMatch = rawLine.match(/^\s*([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!keyValueMatch) {
      warnings.push(
        createWarning(`frontmatter parse error: malformed line "${trimmed}"`)
      );
      continue;
    }
    const [, key, rawValue] = keyValueMatch;
    const value = rawValue.trim();
    if (!value) {
      frontmatter[key] = [];
      activeListKey = key;
      continue;
    }
    frontmatter[key] = parseScalarValue(value);
  }
  return {
    frontmatter,
    warnings
  };
}
function parseScalarValue(value) {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  if (/^\[(.*)\]$/.test(value)) {
    const inner = value.slice(1, -1).trim();
    if (!inner) {
      return [];
    }
    return inner.split(",").map((entry) => stripQuotes(entry.trim()));
  }
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }
  return stripQuotes(value);
}
function stripQuotes(value) {
  if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }
  return value;
}
function createWarning(message) {
  return {
    code: "frontmatter-parse-error",
    message,
    severity: "warning"
  };
}

// src/core/internal-edge-adapters.ts
function toClassRelationEdge(relation, sourceClass = relation.source, targetClass = relation.target) {
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
function erRelationBlockToInternalEdge(relationBlock, sourceEntity) {
  const sourceName = typeof sourceEntity === "string" ? sourceEntity : sourceEntity.id;
  return {
    domain: "er",
    id: relationBlock.id,
    source: sourceName,
    target: relationBlock.targetTable ?? "",
    sourceEntity: sourceName,
    targetEntity: relationBlock.targetTable ?? "",
    kind: relationBlock.kind ?? "fk",
    label: relationBlock.id,
    notes: relationBlock.notes ?? void 0,
    cardinality: relationBlock.cardinality ?? void 0,
    mappings: relationBlock.mappings.map((mapping) => ({
      localColumn: mapping.localColumn,
      targetColumn: mapping.targetColumn,
      notes: mapping.notes ?? void 0
    }))
  };
}
function classDiagramEdgeToInternalEdge(edge) {
  return {
    domain: "class",
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceClass: edge.source,
    targetClass: edge.target,
    kind: edge.kind ?? "association",
    label: edge.label,
    notes: typeof edge.metadata?.notes === "string" ? edge.metadata.notes : void 0,
    fromMultiplicity: typeof edge.metadata?.sourceCardinality === "string" ? edge.metadata.sourceCardinality : void 0,
    toMultiplicity: typeof edge.metadata?.targetCardinality === "string" ? edge.metadata.targetCardinality : void 0
  };
}
function erDiagramEdgeToInternalEdge(edge) {
  const mappings = [];
  if (Array.isArray(edge.metadata?.mappings)) {
    for (const mapping of edge.metadata.mappings) {
      if (!mapping || typeof mapping !== "object") {
        continue;
      }
      const candidate = mapping;
      const localColumn = candidate.localColumn;
      const targetColumn = candidate.targetColumn;
      if (typeof localColumn !== "string" || typeof targetColumn !== "string") {
        continue;
      }
      mappings.push({
        localColumn,
        targetColumn,
        notes: typeof candidate.notes === "string" ? candidate.notes : void 0
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
    notes: typeof edge.metadata?.notes === "string" ? edge.metadata.notes : void 0,
    cardinality: typeof edge.metadata?.cardinality === "string" ? edge.metadata.cardinality : void 0,
    mappings: mappings.length > 0 ? mappings : hasColumnMapping(edge) ? [
      {
        localColumn: String(edge.metadata?.sourceColumn),
        targetColumn: String(edge.metadata?.targetColumn),
        notes: typeof edge.metadata?.mappingNotes === "string" ? edge.metadata.mappingNotes : void 0
      }
    ] : []
  };
}
function getErEdgeLabel(edge) {
  if (typeof edge.metadata?.logicalName === "string") {
    return edge.metadata.logicalName;
  }
  if (typeof edge.metadata?.physicalName === "string") {
    return edge.metadata.physicalName;
  }
  return edge.label;
}
function hasColumnMapping(edge) {
  return typeof edge.metadata?.sourceColumn === "string" && typeof edge.metadata?.targetColumn === "string";
}

// src/parsers/markdown-sections.ts
var SECTION_HEADINGS = {
  "# Summary": "Summary",
  "## Summary": "Summary",
  "## Overview": "Overview",
  "## Attributes": "Attributes",
  "## Methods": "Methods",
  "## Notes": "Notes",
  "## Relations": "Relations",
  "## Flows": "Flows",
  "## Objects": "Objects",
  "## Columns": "Columns",
  "## Indexes": "Indexes"
};
function extractMarkdownSections(body) {
  const normalized = body.replace(/\r\n/g, "\n");
  const sections = {};
  let currentSection = null;
  for (const line of normalized.split("\n")) {
    const trimmed = line.trim();
    const nextSection = SECTION_HEADINGS[trimmed];
    if (nextSection) {
      currentSection = nextSection;
      sections[currentSection] = [];
      continue;
    }
    if (/^#{1,6}\s+/.test(trimmed)) {
      currentSection = null;
      continue;
    }
    if (currentSection) {
      sections[currentSection].push(line);
    }
  }
  return sections;
}

// src/parsers/markdown-table.ts
function parseMarkdownTable(lines, expectedHeaders, path, sectionName) {
  if (!lines) {
    return { rows: [], warnings: [] };
  }
  const normalizedLines = lines.map((line) => line.trim()).filter((line) => line.startsWith("|"));
  if (normalizedLines.length < 2) {
    return {
      rows: [],
      warnings: normalizedLines.length === 0 ? [] : [
        createWarning2(
          "invalid-table-row",
          `table in section "${sectionName}" is incomplete`,
          path,
          sectionName
        )
      ]
    };
  }
  const headers = splitMarkdownTableRow(normalizedLines[0]) ?? [];
  const warnings = [];
  if (!sameHeaders(headers, expectedHeaders)) {
    warnings.push(
      createWarning2(
        "invalid-table-column",
        `table columns in section "${sectionName}" do not match expected headers`,
        path,
        sectionName
      )
    );
  }
  const rows = [];
  for (const rowLine of normalizedLines.slice(2)) {
    const values = splitMarkdownTableRow(rowLine) ?? [];
    if (values.length !== headers.length) {
      warnings.push(
        createWarning2(
          "invalid-table-row",
          `table row in section "${sectionName}" has ${values.length} columns, expected ${headers.length}`,
          path,
          sectionName
        )
      );
      continue;
    }
    const row = {};
    for (const [index, header] of headers.entries()) {
      row[header] = values[index] ?? "";
    }
    rows.push(row);
  }
  return { rows, warnings };
}
function splitMarkdownTableRow(line) {
  const ranges = getMarkdownTableCellRanges(line);
  if (!ranges) {
    return null;
  }
  return ranges.map((range) => line.slice(range.contentStart, range.contentEnd).trim());
}
function getMarkdownTableCellRanges(line) {
  const trimmedLine = line.trim();
  if (!trimmedLine.startsWith("|")) {
    return null;
  }
  const separatorIndexes = findMarkdownTableSeparators(line);
  if (separatorIndexes.length === 0) {
    return null;
  }
  const trailingPipeIndex = separatorIndexes[separatorIndexes.length - 1];
  const effectiveSeparators = trailingPipeIndex === line.length - 1 ? separatorIndexes : [...separatorIndexes, line.length];
  if (effectiveSeparators.length < 2) {
    return null;
  }
  const cells = [];
  for (let columnIndex = 0; columnIndex < effectiveSeparators.length - 1; columnIndex += 1) {
    const rawStart = effectiveSeparators[columnIndex] + 1;
    const rawEnd = effectiveSeparators[columnIndex + 1];
    let contentStart = rawStart;
    let contentEnd = rawEnd;
    while (contentStart < rawEnd && /\s/.test(line[contentStart] ?? "")) {
      contentStart += 1;
    }
    while (contentEnd > rawStart && /\s/.test(line[contentEnd - 1] ?? "")) {
      contentEnd -= 1;
    }
    if (contentStart > contentEnd) {
      contentStart = rawStart;
      contentEnd = rawStart;
    }
    cells.push({
      columnIndex,
      rawStart,
      rawEnd,
      contentStart,
      contentEnd
    });
  }
  return cells;
}
function findMarkdownTableSeparators(line) {
  const separators = [];
  let escaped = false;
  let wikilinkDepth = 0;
  let markdownLinkTextDepth = 0;
  let markdownLinkTargetDepth = 0;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === "[" && next === "[") {
      wikilinkDepth += 1;
      index += 1;
      continue;
    }
    if (char === "]" && next === "]" && wikilinkDepth > 0) {
      wikilinkDepth -= 1;
      index += 1;
      continue;
    }
    if (wikilinkDepth === 0 && markdownLinkTargetDepth === 0 && char === "[") {
      markdownLinkTextDepth += 1;
      continue;
    }
    if (markdownLinkTextDepth > 0 && char === "]" && next === "(") {
      markdownLinkTextDepth -= 1;
      markdownLinkTargetDepth = 1;
      index += 1;
      continue;
    }
    if (markdownLinkTargetDepth > 0) {
      if (char === "(") {
        markdownLinkTargetDepth += 1;
        continue;
      }
      if (char === ")") {
        markdownLinkTargetDepth -= 1;
        continue;
      }
    }
    if (char === "|" && wikilinkDepth === 0 && markdownLinkTextDepth === 0 && markdownLinkTargetDepth === 0) {
      separators.push(index);
      continue;
    }
  }
  return separators;
}
function sameHeaders(actual, expected) {
  if (actual.length !== expected.length) {
    return false;
  }
  return actual.every((header, index) => header === expected[index]);
}
function createWarning2(code, message, path, field) {
  return {
    code,
    message,
    severity: "warning",
    path,
    field
  };
}

// src/parsers/er-entity-parser.ts
var COLUMN_HEADERS = [
  "logical_name",
  "physical_name",
  "data_type",
  "length",
  "scale",
  "not_null",
  "pk",
  "encrypted",
  "default_value",
  "notes"
];
var INDEX_HEADERS = [
  "index_name",
  "index_type",
  "unique",
  "columns",
  "notes"
];
var RELATION_MAPPING_HEADERS = [
  "local_column",
  "target_column",
  "notes"
];
function parseErEntityFile(markdown, path) {
  const frontmatterResult = parseFrontmatter(markdown);
  const warnings = [...frontmatterResult.warnings];
  const frontmatter = frontmatterResult.file.frontmatter ?? {};
  if (detectFileType(frontmatter) !== "er-entity") {
    warnings.push(
      createWarning3(
        "invalid-structure",
        'ER entity parser expected frontmatter type "er_entity"',
        path,
        "type"
      )
    );
    return { file: null, warnings };
  }
  const body = frontmatterResult.file.body;
  const sections = extractMarkdownSections(body);
  const id = getRequiredString(frontmatter, "id", warnings, path);
  const logicalName = getRequiredString(frontmatter, "logical_name", warnings, path);
  const physicalName = getRequiredString(frontmatter, "physical_name", warnings, path);
  if (!sections.Columns) {
    warnings.push(
      createInfoWarning("section-missing", 'section missing: "Columns"', path, "Columns")
    );
  }
  const columnTable = parseMarkdownTable(
    sections.Columns,
    [...COLUMN_HEADERS],
    path,
    "Columns"
  );
  const indexTable = parseMarkdownTable(
    sections.Indexes,
    [...INDEX_HEADERS],
    path,
    "Indexes"
  );
  warnings.push(...columnTable.warnings, ...indexTable.warnings);
  const columns = columnTable.rows.map((row) => toErColumn(row, warnings, path));
  const indexes = indexTable.rows.map((row) => toErIndex(row));
  const relationBlocks = parseRelationBlocks(body, warnings, path);
  const fallbackId = id || getFileStem(path) || "UNTITLED-ER-ENTITY";
  const fallbackLogicalName = logicalName || physicalName || fallbackId;
  const fallbackPhysicalName = physicalName || logicalName || fallbackId;
  const baseEntity = {
    fileType: "er-entity",
    path,
    filePath: path,
    title: buildTitle(fallbackLogicalName, fallbackPhysicalName),
    frontmatter,
    sections,
    id: fallbackId,
    logicalName: fallbackLogicalName,
    physicalName: fallbackPhysicalName,
    schemaName: getOptionalString(frontmatter, "schema_name"),
    dbms: getOptionalString(frontmatter, "dbms"),
    columns,
    indexes,
    relationBlocks,
    outboundRelations: []
  };
  baseEntity.outboundRelations = relationBlocks.map(
    (relationBlock) => erRelationBlockToInternalEdge(relationBlock, baseEntity)
  );
  return {
    file: baseEntity,
    warnings
  };
}
function getFileStem(path) {
  return path.replace(/\\/g, "/").split("/").pop()?.replace(/\.md$/i, "") ?? "";
}
function parseRelationBlocks(body, warnings, path) {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const relationsSectionLines = extractRelationsSectionLines(lines);
  if (relationsSectionLines.length === 0) {
    return [];
  }
  const blocks = [];
  let currentId = null;
  let currentLines = [];
  const flushBlock = () => {
    if (!currentId) {
      return;
    }
    blocks.push(parseRelationBlock(currentId, currentLines, warnings, path));
  };
  for (const line of relationsSectionLines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^###\s+(.+)$/);
    if (match) {
      flushBlock();
      currentId = match[1].trim();
      currentLines = [];
      continue;
    }
    if (currentId) {
      currentLines.push(line);
    }
  }
  flushBlock();
  return blocks;
}
function extractRelationsSectionLines(lines) {
  let inRelations = false;
  const collected = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!inRelations) {
      if (trimmed === "## Relations") {
        inRelations = true;
      }
      continue;
    }
    if (/^##\s+/.test(trimmed)) {
      break;
    }
    collected.push(line);
  }
  return collected;
}
function parseRelationBlock(id, lines, warnings, path) {
  const metadata = {};
  const tableLines = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const metadataMatch = trimmed.match(/^-\s+([a-zA-Z_]+)\s*:\s*(.+)$/);
    if (metadataMatch) {
      metadata[metadataMatch[1]] = metadataMatch[2].trim();
      continue;
    }
    if (trimmed.startsWith("|")) {
      tableLines.push(trimmed);
    }
  }
  const targetTableRaw = metadata.target_table?.trim() ?? null;
  const targetTable = targetTableRaw ? normalizeReferenceTarget(targetTableRaw) : null;
  const kind = metadata.kind?.trim() ?? null;
  const cardinality = metadata.cardinality?.trim() ?? null;
  const notes = metadata.notes?.trim() ?? null;
  if (!targetTableRaw) {
    warnings.push(
      createWarning3(
        "invalid-structure",
        `relation block "${id}" missing required field "target_table"`,
        path,
        "Relations"
      )
    );
  }
  const mappingTable = parseMarkdownTable(
    tableLines,
    [...RELATION_MAPPING_HEADERS],
    path,
    `Relations:${id}`
  );
  warnings.push(...mappingTable.warnings);
  const mappings = mappingTable.rows.map((row) => toRelationMapping(row));
  return {
    id,
    targetTable,
    kind,
    cardinality,
    notes,
    mappings
  };
}
function toRelationMapping(row) {
  return {
    localColumn: row.local_column ?? "",
    targetColumn: row.target_column ?? "",
    notes: toNullableString(row.notes)
  };
}
function toErColumn(row, warnings, path) {
  return {
    logicalName: row.logical_name ?? "",
    physicalName: row.physical_name ?? "",
    dataType: row.data_type ?? "",
    length: parseNullableNumber(row.length, warnings, path, "length"),
    scale: parseNullableNumber(row.scale, warnings, path, "scale"),
    notNull: parseYN(row.not_null),
    pk: parseYN(row.pk),
    encrypted: parseYN(row.encrypted),
    defaultValue: toNullableString(row.default_value),
    notes: toNullableString(row.notes)
  };
}
function toErIndex(row) {
  return {
    indexName: row.index_name ?? "",
    indexType: row.index_type ?? "",
    unique: parseYN(row.unique),
    columns: row.columns ?? "",
    notes: toNullableString(row.notes)
  };
}
function parseNullableNumber(value, warnings, path, field) {
  const normalized = toNullableString(value);
  if (normalized === null) {
    return null;
  }
  const parsed = Number(normalized);
  if (Number.isFinite(parsed)) {
    return parsed;
  }
  warnings.push(
    createWarning3(
      "invalid-numeric-value",
      `failed to parse numeric value "${normalized}" for "${field}"`,
      path,
      field
    )
  );
  return null;
}
function parseYN(value) {
  return (value ?? "").trim().toUpperCase() === "Y";
}
function buildTitle(logicalName, physicalName) {
  return `${logicalName} / ${physicalName}`;
}
function getRequiredString(frontmatter, key, warnings, path) {
  const value = getOptionalString(frontmatter, key);
  if (value) {
    return value;
  }
  warnings.push(
    createWarning3(
      key === "id" ? "missing-name" : "invalid-structure",
      `missing required field "${key}"`,
      path,
      key
    )
  );
  return null;
}
function getOptionalString(frontmatter, key) {
  const value = frontmatter[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
function toNullableString(value) {
  const normalized = value?.trim() ?? "";
  return normalized ? normalized : null;
}
function createWarning3(code, message, path, field) {
  return {
    code,
    message,
    severity: "warning",
    path,
    field
  };
}
function createInfoWarning(code, message, path, field) {
  return {
    code,
    message,
    severity: "info",
    path,
    field
  };
}

// src/editor/model-weave-editor-suggest.ts
var NO_COMPLETION_NOTICE = "No Model Weave completion is available at the current cursor position.";
var MARKDOWN_ONLY_NOTICE = "Model Weave completion is available only in Markdown editors.";
var TARGET_TABLE_NOT_RESOLVED_NOTICE = "Target table is not resolved for the current relation block.";
var CLASS_RELATION_KIND_OPTIONS = [
  "association",
  "dependency",
  "inheritance",
  "implementation",
  "aggregation",
  "composition"
];
function openModelWeaveCompletion(app, getIndex) {
  const activeView = app.workspace.getActiveViewOfType(import_obsidian.MarkdownView);
  const file = activeView?.file ?? null;
  const editor = activeView?.editor;
  if (!file || file.extension !== "md" || !editor) {
    new import_obsidian.Notice(MARKDOWN_ONLY_NOTICE);
    return;
  }
  const request = resolveCompletionRequest(file, editor, getIndex());
  if ("notice" in request) {
    new import_obsidian.Notice(request.notice);
    return;
  }
  if (request.suggestions.length === 0) {
    new import_obsidian.Notice(NO_COMPLETION_NOTICE);
    return;
  }
  const modal = new ModelWeaveCompletionModal(app, editor, request);
  modal.open();
  modal.applyInitialQuery();
}
var ModelWeaveCompletionModal = class extends import_obsidian.FuzzySuggestModal {
  constructor(app, editor, request) {
    super(app);
    this.editor = editor;
    this.request = request;
    this.setPlaceholder(request.placeholder);
    this.emptyStateText = "No matching Model Weave candidates.";
  }
  getItems() {
    return this.request.suggestions;
  }
  getItemText(item) {
    return [item.label, item.insertText, item.resolveKey, item.detail].filter((value) => Boolean(value)).join(" ");
  }
  renderSuggestion(item, el) {
    const suggestion = item.item;
    el.createDiv({ text: suggestion.label });
    if (suggestion.detail) {
      const detail = el.createDiv({ text: suggestion.detail });
      detail.style.fontSize = "12px";
      detail.style.color = "var(--text-muted)";
    }
  }
  onChooseItem(item) {
    const liveEditor = this.app.workspace.getActiveViewOfType(import_obsidian.MarkdownView)?.editor ?? this.editor;
    const cursor = replaceSuggestionText(liveEditor, this.request, item);
    restoreCompletionCursor(liveEditor, cursor);
  }
  applyInitialQuery() {
    if (!this.request.initialQuery) {
      return;
    }
    this.inputEl.value = this.request.initialQuery;
    this.inputEl.dispatchEvent(new Event("input"));
  }
};
function resolveCompletionRequest(file, editor, index) {
  const content = editor.getValue();
  const type = getFrontmatterType(content);
  if (!type) {
    return { notice: NO_COMPLETION_NOTICE };
  }
  const cursor = editor.getCursor();
  const lines = content.split(/\r?\n/);
  const line = lines[cursor.line] ?? "";
  if (type === "er_entity") {
    const targetTableRequest = getTargetTableCompletion(cursor, line, index);
    if (targetTableRequest) {
      return targetTableRequest;
    }
    const mappingRequest = getErMappingCompletion(file, content, lines, cursor, line, index);
    if (mappingRequest) {
      return mappingRequest;
    }
  }
  if (type === "er_diagram" || type === "class_diagram") {
    if (type === "class_diagram") {
      const relationPickerRequest = getClassDiagramRelationsCompletion(
        lines,
        cursor,
        line,
        content,
        index
      );
      if (relationPickerRequest) {
        return relationPickerRequest;
      }
    }
    const request = getDiagramObjectsRefCompletion(lines, cursor, line, type, index);
    if (request) {
      return request;
    }
  }
  if (type === "dfd_diagram") {
    const objectRequest = getDfdDiagramObjectsRefCompletion(
      lines,
      cursor,
      line,
      index
    );
    if (objectRequest) {
      return objectRequest;
    }
    const flowRequest = getDfdDiagramFlowCompletion(lines, cursor, line, index);
    if (flowRequest) {
      return flowRequest;
    }
  }
  if (type === "data_object") {
    const request = getDataObjectFieldsRefCompletion(lines, cursor, line, index);
    if (request) {
      return request;
    }
  }
  if (type === "class") {
    const request = getClassRelationsCompletion(lines, cursor, line, index);
    if (request) {
      return request;
    }
  }
  return { notice: NO_COMPLETION_NOTICE };
}
function getTargetTableCompletion(cursor, line, index) {
  const match = line.match(/^(\s*-\s*target_table\s*:\s*)(.*)$/);
  if (!match) {
    return null;
  }
  const prefixLength = match[1].length;
  if (cursor.ch < prefixLength || !index) {
    return null;
  }
  const suggestions = Object.values(index.erEntitiesById).sort((left, right) => left.physicalName.localeCompare(right.physicalName)).map((entity) => toErEntitySuggestion(entity));
  return {
    kind: "er-target-table",
    replaceFrom: { line: cursor.line, ch: prefixLength },
    replaceTo: { line: cursor.line, ch: line.length },
    suggestions,
    placeholder: "Complete ER target_table",
    initialQuery: normalizeCompletionQuery(line.slice(prefixLength))
  };
}
function getErMappingCompletion(file, content, lines, cursor, line, index) {
  if (!line.trim().startsWith("|")) {
    return null;
  }
  if (getSectionNameAtLine(lines, cursor.line) !== "Relations") {
    return null;
  }
  const tableHeaderIndex = findNearestLine(lines, cursor.line, (candidate) => {
    const row = parseMarkdownTableRow(candidate);
    return row !== null && row.length >= 3 && row[0] === "local_column" && row[1] === "target_column" && row[2] === "notes";
  });
  if (tableHeaderIndex < 0 || cursor.line <= tableHeaderIndex + 1) {
    return null;
  }
  const cell = getTableCellContext(line, cursor.line, cursor.ch);
  if (!cell || cell.columnIndex > 1) {
    return null;
  }
  const currentEntity = parseErEntityFile(content, file.path).file;
  if (!currentEntity) {
    return { notice: NO_COMPLETION_NOTICE };
  }
  if (cell.columnIndex === 0) {
    return {
      kind: "er-local-column",
      replaceFrom: cell.replaceFrom,
      replaceTo: cell.replaceTo,
      suggestions: currentEntity.columns.map((column) => column.physicalName).filter((value) => Boolean(value)).filter(onlyUnique).sort().map((physicalName) => ({
        label: physicalName,
        insertText: physicalName,
        resolveKey: physicalName,
        kind: "column"
      })),
      placeholder: "Complete local column",
      initialQuery: extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch)
    };
  }
  const targetTableRef = findCurrentRelationTargetTable(lines, cursor.line);
  if (!targetTableRef || !index) {
    return { notice: TARGET_TABLE_NOT_RESOLVED_NOTICE };
  }
  const targetEntity = resolveErEntityReference(targetTableRef, index);
  if (!targetEntity) {
    return { notice: TARGET_TABLE_NOT_RESOLVED_NOTICE };
  }
  return {
    kind: "er-target-column",
    replaceFrom: cell.replaceFrom,
    replaceTo: cell.replaceTo,
    suggestions: targetEntity.columns.map((column) => column.physicalName).filter((value) => Boolean(value)).filter(onlyUnique).sort().map((physicalName) => ({
      label: physicalName,
      insertText: physicalName,
      resolveKey: physicalName,
      kind: "column"
    })),
    placeholder: "Complete target column",
    initialQuery: extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch)
  };
}
function getClassDiagramRelationsCompletion(lines, cursor, line, content, index) {
  if (!line.trim().startsWith("|") || !index) {
    return null;
  }
  if (getSectionNameAtLine(lines, cursor.line) !== "Relations") {
    return null;
  }
  const tableHeaderIndex = findNearestLine(lines, cursor.line, (candidate) => {
    const row = parseMarkdownTableRow(candidate);
    return row !== null && row.length >= 8 && row[0] === "id" && row[1] === "from" && row[2] === "to" && row[3] === "kind";
  });
  if (tableHeaderIndex < 0 || cursor.line <= tableHeaderIndex + 1) {
    return null;
  }
  if (isMarkdownTableSeparator(line)) {
    return null;
  }
  const cell = getTableCellContext(line, cursor.line, cursor.ch);
  if (!cell) {
    return null;
  }
  const suggestions = getClassDiagramRelationSuggestions(content, index);
  if (suggestions.length === 0) {
    return { notice: "No class relations are available for the current diagram." };
  }
  return {
    kind: "class-diagram-relation-picker",
    replaceFrom: { line: cursor.line, ch: 0 },
    replaceTo: { line: cursor.line, ch: line.length },
    suggestions,
    placeholder: "Pick a class relation for this diagram row"
  };
}
function getDiagramObjectsRefCompletion(lines, cursor, line, type, index) {
  if (!line.trim().startsWith("|") || !index) {
    return null;
  }
  if (getSectionNameAtLine(lines, cursor.line) !== "Objects") {
    return null;
  }
  const tableHeaderIndex = findNearestLine(lines, cursor.line, (candidate) => {
    const row = parseMarkdownTableRow(candidate);
    return row !== null && row.length >= 2 && row[0] === "ref" && row[1] === "notes";
  });
  if (tableHeaderIndex < 0 || cursor.line <= tableHeaderIndex + 1) {
    return null;
  }
  if (isMarkdownTableSeparator(line)) {
    return null;
  }
  const cell = getTableCellContext(line, cursor.line, cursor.ch);
  if (!cell || cell.columnIndex !== 0) {
    return null;
  }
  if (type === "er_diagram") {
    return {
      kind: "er-diagram-object",
      replaceFrom: cell.replaceFrom,
      replaceTo: cell.replaceTo,
      suggestions: Object.values(index.erEntitiesById).sort((left, right) => left.physicalName.localeCompare(right.physicalName)).map((entity) => toErEntitySuggestion(entity)),
      placeholder: "Complete ER diagram object",
      initialQuery: normalizeCompletionQuery(
        extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch)
      ),
      tableColumnIndex: 0
    };
  }
  return {
    kind: "class-diagram-object",
    replaceFrom: cell.replaceFrom,
    replaceTo: cell.replaceTo,
    suggestions: Object.values(index.objectsById).sort((left, right) => getObjectId3(left).localeCompare(getObjectId3(right))).map((object) => toClassObjectSuggestion(object)),
    placeholder: "Complete class diagram object",
    initialQuery: normalizeCompletionQuery(
      extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch)
    ),
    tableColumnIndex: 0
  };
}
function getDfdDiagramObjectsRefCompletion(lines, cursor, line, index) {
  if (!line.trim().startsWith("|") || !index) {
    return null;
  }
  if (getSectionNameAtLine(lines, cursor.line) !== "Objects") {
    return null;
  }
  const tableHeaderIndex = findNearestLine(lines, cursor.line, (candidate) => {
    const row = parseMarkdownTableRow(candidate);
    return row !== null && row.length >= 2 && row[0] === "ref" && row[1] === "notes";
  });
  if (tableHeaderIndex < 0 || cursor.line <= tableHeaderIndex + 1) {
    return null;
  }
  if (isMarkdownTableSeparator(line)) {
    return null;
  }
  const cell = getTableCellContext(line, cursor.line, cursor.ch);
  if (!cell || cell.columnIndex !== 0) {
    return null;
  }
  return {
    kind: "dfd-diagram-object",
    replaceFrom: cell.replaceFrom,
    replaceTo: cell.replaceTo,
    suggestions: Object.values(index.dfdObjectsById).sort((left, right) => left.id.localeCompare(right.id)).map((object) => toDfdObjectSuggestion(object)),
    placeholder: "Complete DFD diagram object",
    initialQuery: normalizeCompletionQuery(
      extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch)
    ),
    tableColumnIndex: 0
  };
}
function getDfdDiagramFlowCompletion(lines, cursor, line, index) {
  if (!line.trim().startsWith("|") || !index) {
    return null;
  }
  if (getSectionNameAtLine(lines, cursor.line) !== "Flows") {
    return null;
  }
  const tableHeaderIndex = findNearestLine(lines, cursor.line, (candidate) => {
    const row = parseMarkdownTableRow(candidate);
    return row !== null && row.length >= 5 && row[0] === "id" && row[1] === "from" && row[2] === "to";
  });
  if (tableHeaderIndex < 0 || cursor.line <= tableHeaderIndex + 1) {
    return null;
  }
  if (isMarkdownTableSeparator(line)) {
    return null;
  }
  const cell = getTableCellContext(line, cursor.line, cursor.ch);
  if (!cell || cell.columnIndex !== 1 && cell.columnIndex !== 2 && cell.columnIndex !== 3) {
    return null;
  }
  if (cell.columnIndex === 3) {
    return {
      kind: "dfd-diagram-flow-data",
      replaceFrom: cell.replaceFrom,
      replaceTo: cell.replaceTo,
      suggestions: Object.values(index.dataObjectsById).sort((left, right) => left.id.localeCompare(right.id)).map((object) => toDataObjectSuggestion(object)),
      placeholder: "Complete DFD flow data",
      initialQuery: normalizeCompletionQuery(
        extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch)
      ),
      tableColumnIndex: 3
    };
  }
  const preferredObjects = getDiagramObjectRefs(lines.join("\n")).map((ref) => resolveDfdObjectReference(ref, index)).filter((object) => Boolean(object));
  const preferredIds = new Set(preferredObjects.map((object) => object.id));
  const remainingObjects = Object.values(index.dfdObjectsById).filter(
    (object) => !preferredIds.has(object.id)
  );
  const orderedSuggestions = [
    ...preferredObjects.sort((left, right) => left.id.localeCompare(right.id)).map((object) => toDfdObjectSuggestion(object, "in diagram")),
    ...remainingObjects.sort((left, right) => left.id.localeCompare(right.id)).map((object) => toDfdObjectSuggestion(object, "in vault"))
  ];
  return {
    kind: cell.columnIndex === 1 ? "dfd-diagram-flow-from" : "dfd-diagram-flow-to",
    replaceFrom: cell.replaceFrom,
    replaceTo: cell.replaceTo,
    suggestions: orderedSuggestions,
    placeholder: cell.columnIndex === 1 ? "Complete DFD flow source" : "Complete DFD flow target",
    initialQuery: normalizeCompletionQuery(
      extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch)
    ),
    tableColumnIndex: cell.columnIndex
  };
}
function getDataObjectFieldsRefCompletion(lines, cursor, line, index) {
  if (!line.trim().startsWith("|") || !index) {
    return null;
  }
  if (getSectionNameAtLine(lines, cursor.line) !== "Fields") {
    return null;
  }
  const tableHeaderIndex = findNearestLine(lines, cursor.line, (candidate) => {
    const row = parseMarkdownTableRow(candidate);
    return row !== null && row.length >= 5 && row[0] === "name" && row[1] === "type" && row[2] === "required" && row[3] === "ref" && row[4] === "notes";
  });
  if (tableHeaderIndex < 0 || cursor.line <= tableHeaderIndex + 1) {
    return null;
  }
  if (isMarkdownTableSeparator(line)) {
    return null;
  }
  const cell = getTableCellContext(line, cursor.line, cursor.ch);
  if (!cell || cell.columnIndex !== 3) {
    return null;
  }
  const suggestions = [
    ...Object.values(index.erEntitiesById).sort((left, right) => left.logicalName.localeCompare(right.logicalName)).map((entity) => toLinkedReferenceSuggestionForEntity(entity)),
    ...Object.values(index.objectsById).sort((left, right) => getObjectId3(left).localeCompare(getObjectId3(right))).map((object) => toLinkedReferenceSuggestionForClass(object)),
    ...Object.values(index.dataObjectsById).sort((left, right) => left.id.localeCompare(right.id)).map((object) => toDataObjectSuggestion(object)),
    ...Object.values(index.dfdObjectsById).sort((left, right) => left.id.localeCompare(right.id)).map((object) => toDfdObjectSuggestion(object))
  ];
  return {
    kind: "data-object-field-ref",
    replaceFrom: cell.replaceFrom,
    replaceTo: cell.replaceTo,
    suggestions,
    placeholder: "Complete data object field reference",
    initialQuery: normalizeCompletionQuery(
      extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch)
    ),
    tableColumnIndex: 3
  };
}
function getClassDiagramRelationSuggestions(content, index) {
  const objectRefs = getDiagramObjectRefs(content);
  const diagramObjects = objectRefs.map((ref) => resolveObjectModelReference(ref, index)).filter((object) => Boolean(object));
  const diagramObjectIds = new Set(diagramObjects.map((object) => getObjectId3(object)));
  const seen = /* @__PURE__ */ new Set();
  const suggestions = [];
  for (const object of diagramObjects) {
    for (const relation of object.relations) {
      const targetObject = index.objectsById[relation.targetClass] ?? resolveObjectModelReference(relation.targetClass, index);
      const key = [
        relation.id ?? "",
        relation.sourceClass,
        relation.targetClass,
        relation.kind,
        relation.label ?? "",
        relation.fromMultiplicity ?? "",
        relation.toMultiplicity ?? ""
      ].join("|");
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      const insideDiagram = diagramObjectIds.has(relation.targetClass);
      suggestions.push(
        toClassDiagramRelationSuggestion(relation, object, targetObject, insideDiagram)
      );
    }
  }
  return suggestions.sort((left, right) => {
    const leftPriority = left.detail?.includes("in diagram") ? 0 : 1;
    const rightPriority = right.detail?.includes("in diagram") ? 0 : 1;
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }
    return left.label.localeCompare(right.label);
  });
}
function getClassRelationsCompletion(lines, cursor, line, index) {
  if (!line.trim().startsWith("|") || !index) {
    return null;
  }
  if (getSectionNameAtLine(lines, cursor.line) !== "Relations") {
    return null;
  }
  const tableHeaderIndex = findNearestLine(lines, cursor.line, (candidate) => {
    const row = parseMarkdownTableRow(candidate);
    return row !== null && row.length >= 7 && row[0] === "id" && row[1] === "to" && row[2] === "kind";
  });
  if (tableHeaderIndex < 0 || cursor.line <= tableHeaderIndex + 1) {
    return null;
  }
  if (isMarkdownTableSeparator(line)) {
    return null;
  }
  const cell = getTableCellContext(line, cursor.line, cursor.ch);
  if (!cell) {
    return null;
  }
  if (cell.columnIndex === 1) {
    const suggestions = Object.values(index.objectsById).sort((left, right) => getObjectId3(left).localeCompare(getObjectId3(right))).map((object) => ({
      label: `${getObjectId3(object)} \u2014 ${object.name}`,
      insertText: buildAliasedWikilink(
        toFileLinkTarget(object.path),
        object.name || getObjectId3(object)
      ),
      resolveKey: getObjectId3(object),
      detail: object.kind,
      kind: "class"
    }));
    return {
      kind: "class-relation-to",
      replaceFrom: cell.replaceFrom,
      replaceTo: cell.replaceTo,
      suggestions,
      placeholder: "Complete class relation to",
      initialQuery: extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch),
      tableColumnIndex: 1
    };
  }
  if (cell.columnIndex === 2) {
    return {
      kind: "class-relation-kind",
      replaceFrom: cell.replaceFrom,
      replaceTo: cell.replaceTo,
      suggestions: CLASS_RELATION_KIND_OPTIONS.map((kind) => ({
        label: kind,
        insertText: kind,
        resolveKey: kind,
        kind: "kind"
      })),
      placeholder: "Complete class relation kind",
      initialQuery: extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch),
      tableColumnIndex: 2
    };
  }
  return null;
}
function getFrontmatterType(content) {
  const parsed = parseFrontmatter(content);
  const type = parsed.file.frontmatter?.type;
  return typeof type === "string" && type.trim() ? type.trim() : void 0;
}
function getSectionNameAtLine(lines, lineIndex) {
  for (let index = lineIndex; index >= 0; index -= 1) {
    const trimmed = lines[index].trim();
    const match = trimmed.match(/^##\s+(.+)$/);
    if (match) {
      return match[1].trim();
    }
  }
  return null;
}
function findNearestLine(lines, startIndex, predicate) {
  for (let index = startIndex; index >= 0; index -= 1) {
    const candidate = lines[index] ?? "";
    if (predicate(candidate)) {
      return index;
    }
    if (index !== startIndex && /^##\s+/.test(candidate.trim())) {
      break;
    }
  }
  return -1;
}
function findCurrentRelationTargetTable(lines, startIndex) {
  const blockStartIndex = findCurrentRelationBlockStart(lines, startIndex);
  if (blockStartIndex < 0) {
    return null;
  }
  for (let index = blockStartIndex + 1; index <= startIndex; index += 1) {
    const trimmed = (lines[index] ?? "").trim();
    if (/^###\s+/.test(trimmed)) {
      break;
    }
    const match = trimmed.match(/^-\s*target_table\s*:\s*(.*)$/);
    if (match) {
      const value = match[1].trim();
      return value ? normalizeReferenceTarget(value) : null;
    }
  }
  return null;
}
function findCurrentRelationBlockStart(lines, startIndex) {
  for (let index = startIndex; index >= 0; index -= 1) {
    const trimmed = (lines[index] ?? "").trim();
    if (/^###\s+/.test(trimmed)) {
      return index;
    }
    if (/^##\s+/.test(trimmed) && index !== startIndex) {
      break;
    }
  }
  return -1;
}
function getTableCellContext(line, lineNumber, cursorCh) {
  const ranges = getMarkdownTableCellRanges(line);
  if (!ranges || ranges.length === 0) {
    return null;
  }
  for (const range of ranges) {
    const inCell = cursorCh >= range.rawStart && cursorCh < range.rawEnd || cursorCh === range.rawEnd || cursorCh === range.rawStart - 1 && range.columnIndex > 0;
    if (!inCell) {
      continue;
    }
    return {
      columnIndex: range.columnIndex,
      replaceFrom: { line: lineNumber, ch: range.contentStart },
      replaceTo: { line: lineNumber, ch: range.contentEnd }
    };
  }
  return null;
}
function parseMarkdownTableRow(line) {
  return splitMarkdownTableRow(line);
}
function isMarkdownTableSeparator(line) {
  const cells = parseMarkdownTableRow(line);
  if (!cells || cells.length === 0) {
    return false;
  }
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}
function getObjectId3(object) {
  const explicitId = object.frontmatter.id;
  if (typeof explicitId === "string" && explicitId.trim()) {
    return explicitId.trim();
  }
  return object.name;
}
function onlyUnique(value, index, array) {
  return array.indexOf(value) === index;
}
function toErEntitySuggestion(entity) {
  const linkTarget = toFileLinkTarget(entity.path);
  const displayName = entity.logicalName || entity.physicalName || entity.id;
  return {
    label: `${entity.logicalName} / ${entity.physicalName}`,
    insertText: buildAliasedWikilink(linkTarget, displayName),
    resolveKey: linkTarget,
    detail: `${entity.id} \xB7 ${entity.path}`,
    kind: "er_entity"
  };
}
function toLinkedReferenceSuggestionForEntity(entity) {
  const linkTarget = toFileLinkTarget(entity.path);
  const displayName = entity.logicalName || entity.physicalName || entity.id;
  return {
    label: `${displayName} / ${entity.physicalName}`,
    insertText: buildAliasedWikilink(linkTarget, displayName),
    resolveKey: linkTarget,
    detail: `er_entity \xB7 ${entity.id} \xB7 ${entity.path}`,
    kind: "er_entity"
  };
}
function toClassObjectSuggestion(object) {
  const linkTarget = toFileLinkTarget(object.path);
  const displayName = object.name || getObjectId3(object);
  return {
    label: `${getObjectId3(object)} / ${object.name}`,
    insertText: buildAliasedWikilink(linkTarget, displayName),
    resolveKey: linkTarget,
    detail: object.kind,
    kind: "class"
  };
}
function toLinkedReferenceSuggestionForClass(object) {
  const linkTarget = toFileLinkTarget(object.path);
  const displayName = object.name || getObjectId3(object);
  return {
    label: `${displayName} / ${getObjectId3(object)}`,
    insertText: buildAliasedWikilink(linkTarget, displayName),
    resolveKey: linkTarget,
    detail: `class \xB7 ${object.kind} \xB7 ${object.path}`,
    kind: "class"
  };
}
function toDfdObjectSuggestion(object, scopeDetail) {
  const linkTarget = toFileLinkTarget(object.path);
  return {
    label: `${object.id} / ${object.name}`,
    insertText: buildAliasedWikilink(linkTarget, object.name || object.id),
    resolveKey: linkTarget,
    detail: scopeDetail ? `${object.kind} \xB7 ${scopeDetail}` : object.kind,
    kind: "dfd_object"
  };
}
function toDataObjectSuggestion(object) {
  const linkTarget = toFileLinkTarget(object.path);
  return {
    label: `${object.id} / ${object.name}`,
    insertText: buildAliasedWikilink(linkTarget, object.name || object.id),
    resolveKey: linkTarget,
    detail: object.kind ?? "data_object",
    kind: "data_object"
  };
}
function toFileLinkTarget(path) {
  return path.replace(/\\/g, "/").replace(/\.md$/i, "");
}
function normalizeCompletionQuery(value) {
  const trimmed = value.trim();
  const withoutOpening = trimmed.startsWith("[[") ? trimmed.slice(2) : trimmed;
  const withoutClosing = withoutOpening.endsWith("]]") ? withoutOpening.slice(0, -2) : withoutOpening;
  const normalized = withoutClosing.replace(/\\\|/g, "|");
  let escaped = false;
  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === "|") {
      return normalized.slice(0, index).trim();
    }
  }
  return normalized.trim();
}
function getDiagramObjectRefs(content) {
  const lines = content.split(/\r?\n/);
  const refs = [];
  let inObjectsSection = false;
  let headerSeen = false;
  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    const headingMatch = trimmed.match(/^##\s+(.+)$/);
    if (headingMatch) {
      inObjectsSection = headingMatch[1].trim() === "Objects";
      headerSeen = false;
      continue;
    }
    if (!inObjectsSection || !trimmed.startsWith("|")) {
      continue;
    }
    if (isMarkdownTableSeparator(trimmed)) {
      continue;
    }
    const row = parseMarkdownTableRow(trimmed);
    if (!row || row.length < 2) {
      continue;
    }
    if (!headerSeen) {
      headerSeen = row[0] === "ref" && row[1] === "notes";
      continue;
    }
    if (row[0]) {
      refs.push(row[0]);
    }
  }
  return refs;
}
function extractLineText(line, from, to) {
  return line.slice(from, to).trim();
}
function replaceSuggestionText(editor, request, suggestion) {
  const insertText = suggestion.insertText;
  if (request.tableColumnIndex !== void 0 && (request.kind === "er-diagram-object" || request.kind === "dfd-diagram-object" || request.kind === "dfd-diagram-flow-from" || request.kind === "dfd-diagram-flow-to" || request.kind === "dfd-diagram-flow-data" || request.kind === "data-object-field-ref" || request.kind === "class-diagram-object" || request.kind === "class-relation-to" || request.kind === "class-relation-kind")) {
    return replaceMarkdownTableCell(editor, request, insertText);
  }
  if (request.kind === "class-diagram-relation-picker") {
    if (suggestion.rowValues) {
      return replaceClassDiagramRelationRow(
        editor,
        request.replaceFrom.line,
        suggestion.rowValues
      );
    }
  }
  editor.replaceRange(insertText, request.replaceFrom, request.replaceTo);
  return {
    line: request.replaceFrom.line,
    ch: request.replaceFrom.ch + insertText.length
  };
}
function restoreCompletionCursor(editor, cursor) {
  focusMarkdownEditor(editor);
  editor.setSelection(cursor, cursor);
  editor.setCursor(cursor);
  const defer = typeof window !== "undefined" && typeof window.requestAnimationFrame === "function" ? window.requestAnimationFrame.bind(window) : (callback) => window.setTimeout(() => callback(0), 0);
  defer(() => {
    focusMarkdownEditor(editor);
    editor.setSelection(cursor, cursor);
    editor.setCursor(cursor);
  });
}
function focusMarkdownEditor(editor) {
  const editorWithFocus = editor;
  editorWithFocus.focus?.();
  editorWithFocus.cm?.focus?.();
}
function replaceClassDiagramRelationRow(editor, lineNumber, rowValues) {
  const line = editor.getLine(lineNumber);
  const existingCells = parseMarkdownTableRow(line) ?? [];
  const cells = new Array(8).fill("");
  for (let index = 0; index < Math.min(existingCells.length, cells.length); index += 1) {
    cells[index] = existingCells[index] ?? "";
  }
  const existingId = cells[0].trim();
  if (!existingId) {
    const preferredId = normalizeRelationId(rowValues.id) ?? buildFallbackRelationId(rowValues.from ?? "", rowValues.to ?? "", rowValues.kind ?? "");
    cells[0] = ensureUniqueClassDiagramRelationId(editor, lineNumber, preferredId);
  }
  cells[1] = rowValues.from ?? cells[1];
  cells[2] = rowValues.to ?? cells[2];
  cells[3] = rowValues.kind ?? cells[3];
  cells[4] = rowValues.label ?? cells[4];
  cells[5] = rowValues.from_multiplicity ?? cells[5];
  cells[6] = rowValues.to_multiplicity ?? cells[6];
  const nextLine = `| ${cells.join(" | ")} |`;
  editor.replaceRange(
    nextLine,
    { line: lineNumber, ch: 0 },
    { line: lineNumber, ch: line.length }
  );
  return {
    line: lineNumber,
    ch: nextLine.length
  };
}
function toClassDiagramRelationSuggestion(relation, sourceObject, targetObject, insideDiagram) {
  const labelPart = relation.label ? ` | ${relation.label}` : "";
  const multiplicityPart = relation.fromMultiplicity || relation.toMultiplicity ? ` [${relation.fromMultiplicity ?? ""} -> ${relation.toMultiplicity ?? ""}]` : "";
  return {
    label: `${relation.sourceClass} -> ${relation.targetClass} | ${relation.kind}${labelPart}${multiplicityPart}`,
    insertText: relation.id ?? `${relation.sourceClass}->${relation.targetClass}`,
    detail: insideDiagram ? "target in diagram" : "target outside diagram",
    kind: "class",
    rowValues: {
      id: relation.id ?? "",
      from: toObjectDiagramWikilink(sourceObject),
      to: targetObject ? toObjectDiagramWikilink(targetObject) : toReferenceWikilink(relation.targetClass),
      kind: relation.kind,
      label: relation.label ?? "",
      from_multiplicity: relation.fromMultiplicity ?? "",
      to_multiplicity: relation.toMultiplicity ?? ""
    }
  };
}
function toObjectDiagramWikilink(object) {
  const displayName = object.name || typeof object.frontmatter?.id === "string" && object.frontmatter.id.trim() || getFileStem2(object.path);
  return buildAliasedWikilink(toFileLinkTarget(object.path), displayName);
}
function toReferenceWikilink(reference) {
  return buildAliasedWikilink(normalizeReferenceTarget(reference), normalizeReferenceTarget(reference).split("/").pop() ?? normalizeReferenceTarget(reference));
}
function normalizeRelationId(value) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
function buildFallbackRelationId(from, to, kind) {
  const source = sanitizeRelationIdPart(from) || "FROM";
  const target = sanitizeRelationIdPart(to) || "TO";
  const relationKind = sanitizeRelationIdPart(kind);
  return relationKind ? `REL-${source}-${relationKind}-${target}` : `REL-${source}-${target}`;
}
function sanitizeRelationIdPart(value) {
  return value.trim().replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").toUpperCase();
}
function ensureUniqueClassDiagramRelationId(editor, lineNumber, preferredId) {
  const existingIds = collectExistingClassDiagramRelationIds(editor, lineNumber);
  if (!existingIds.has(preferredId)) {
    return preferredId;
  }
  let suffix = 2;
  while (existingIds.has(`${preferredId}-${suffix}`)) {
    suffix += 1;
  }
  return `${preferredId}-${suffix}`;
}
function collectExistingClassDiagramRelationIds(editor, lineNumber) {
  const lines = editor.getValue().split(/\r?\n/);
  const headerRowIndex = findNearestLine(lines, lineNumber, (candidate) => {
    const row = parseMarkdownTableRow(candidate);
    return row !== null && row.length >= 8 && row[0] === "id" && row[1] === "from" && row[2] === "to" && row[3] === "kind";
  });
  if (headerRowIndex < 0) {
    return /* @__PURE__ */ new Set();
  }
  const ids = /* @__PURE__ */ new Set();
  for (let index = headerRowIndex + 2; index < lines.length; index += 1) {
    const candidate = lines[index] ?? "";
    const trimmed = candidate.trim();
    if (/^##\s+/.test(trimmed)) {
      break;
    }
    if (!trimmed.startsWith("|") || isMarkdownTableSeparator(trimmed)) {
      continue;
    }
    if (index === lineNumber) {
      continue;
    }
    const row = parseMarkdownTableRow(trimmed);
    const id = row?.[0]?.trim();
    if (id) {
      ids.add(id);
    }
  }
  return ids;
}
function replaceMarkdownTableCell(editor, request, insertText) {
  const lineNumber = request.replaceFrom.line;
  const line = editor.getLine(lineNumber);
  const ranges = getMarkdownTableCellRanges(line);
  const columnIndex = request.tableColumnIndex ?? 0;
  if (!ranges || columnIndex >= ranges.length) {
    editor.replaceRange(insertText, request.replaceFrom, request.replaceTo);
    return {
      line: request.replaceFrom.line,
      ch: request.replaceFrom.ch + insertText.length
    };
  }
  const range = ranges[columnIndex];
  const nextLine = `${line.slice(0, range.rawStart)} ${insertText} ${line.slice(range.rawEnd)}`;
  editor.replaceRange(
    nextLine,
    { line: lineNumber, ch: 0 },
    { line: lineNumber, ch: line.length }
  );
  return {
    line: lineNumber,
    ch: range.rawStart + 1 + insertText.length
  };
}
function buildAliasedWikilink(target, displayName) {
  return `[[${target}\\|${escapeWikilinkAlias(displayName)}]]`;
}
function escapeWikilinkAlias(value) {
  return value.replace(/\|/g, "\\|");
}
function getFileStem2(path) {
  return path.replace(/\\/g, "/").split("/").pop()?.replace(/\.md$/i, "") ?? path;
}

// src/export/png-export.ts
var import_obsidian3 = require("obsidian");

// src/renderers/dfd-renderer.ts
var import_obsidian2 = require("obsidian");

// src/renderers/dfd-mermaid.ts
function buildDfdMermaidSource(diagram) {
  const lines = [
    "flowchart LR",
    "  classDef dfdExternal fill:#fff8e1,stroke:#7c5c00,color:#2f2400,stroke-width:1.5px",
    "  classDef dfdProcess fill:#e9f2ff,stroke:#2f5b9a,color:#12243d,stroke-width:1.5px",
    "  classDef dfdDatastore fill:#eef7ee,stroke:#3b6b47,color:#17311e,stroke-width:1.5px"
  ];
  const nodeIds = /* @__PURE__ */ new Map();
  for (const node of diagram.nodes) {
    const object = node.object;
    const mermaidId = toMermaidNodeId(node.id);
    nodeIds.set(node.id, mermaidId);
    lines.push(`  ${mermaidId}${toMermaidNodeDeclaration(node, object)}`);
  }
  for (const edge of diagram.edges) {
    const from = nodeIds.get(edge.source);
    const to = nodeIds.get(edge.target);
    if (!from || !to) {
      continue;
    }
    const label = sanitizeMermaidEdgeLabel(edge.label);
    if (label) {
      lines.push(`  ${from} -->|${label}| ${to}`);
    } else {
      lines.push(`  ${from} --> ${to}`);
    }
  }
  return lines.join("\n");
}
function toMermaidNodeId(value) {
  const normalized = value.replace(/[^A-Za-z0-9_]/g, "_");
  if (/^[A-Za-z_]/.test(normalized)) {
    return normalized;
  }
  return `N_${normalized}`;
}
function toMermaidNodeDeclaration(node, object) {
  const label = escapeMermaidLabel(node.label ?? object?.name ?? node.ref ?? node.id);
  switch (object?.kind) {
    case "datastore":
      return `[("${label}")]:::dfdDatastore`;
    case "process":
      return `["${label}"]:::dfdProcess`;
    case "external":
    default:
      return `["${label}"]:::dfdExternal`;
  }
}
function escapeMermaidLabel(value) {
  return value.replace(/"/g, '\\"').replace(/\r?\n/g, "<br/>");
}
function sanitizeMermaidEdgeLabel(value) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.replace(/\|/g, "/").replace(/[\[\]\(\)]/g, " ").replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
}

// src/renderers/graph-view-shared.ts
function resetGraphViewportState(state, initialZoom = 1) {
  state.zoom = initialZoom;
  state.panX = 0;
  state.panY = 0;
  state.viewMode = "fit";
  state.hasAutoFitted = false;
  state.hasUserInteracted = false;
}
function getConnectionPoints(source, target) {
  const sourceCenterX = source.x + source.width / 2;
  const sourceCenterY = source.y + source.height / 2;
  const targetCenterX = target.x + target.width / 2;
  const targetCenterY = target.y + target.height / 2;
  const horizontal = Math.abs(targetCenterX - sourceCenterX) >= Math.abs(targetCenterY - sourceCenterY);
  const startX = horizontal ? sourceCenterX < targetCenterX ? source.x + source.width : source.x : sourceCenterX;
  const startY = horizontal ? sourceCenterY : sourceCenterY < targetCenterY ? source.y + source.height : source.y;
  const endX = horizontal ? sourceCenterX < targetCenterX ? target.x : target.x + target.width : targetCenterX;
  const endY = horizontal ? targetCenterY : sourceCenterY < targetCenterY ? target.y : target.y + target.height;
  return {
    startX,
    startY,
    endX,
    endY,
    midX: (startX + endX) / 2,
    midY: (startY + endY) / 2
  };
}
function computeSceneBounds(nodes, labels, padding = 24) {
  const allRects = [...nodes, ...labels];
  if (allRects.length === 0) {
    return {
      minX: 0,
      minY: 0,
      maxX: padding * 2,
      maxY: padding * 2,
      width: padding * 2,
      height: padding * 2
    };
  }
  const minX = Math.min(...allRects.map((rect) => rect.x)) - padding;
  const minY = Math.min(...allRects.map((rect) => rect.y)) - padding;
  const maxX = Math.max(...allRects.map((rect) => rect.x + rect.width)) + padding;
  const maxY = Math.max(...allRects.map((rect) => rect.y + rect.height)) + padding;
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}
function estimateBadgeBounds(centerX, centerY, value, options) {
  const charWidth = options?.charWidth ?? 8;
  const minWidth = options?.minWidth ?? 52;
  const height = options?.height ?? 20;
  const width = Math.max(minWidth, value.length * charWidth + 12);
  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height
  };
}
function estimateEdgeLabelBounds(edges, layoutById, getLabel, labelOffsetY = -8) {
  const bounds = [];
  for (const edge of edges) {
    const source = layoutById[edge.source];
    const target = layoutById[edge.target];
    if (!source || !target) {
      continue;
    }
    const label = getLabel(edge);
    if (!label) {
      continue;
    }
    const points = getConnectionPoints(source, target);
    bounds.push(estimateBadgeBounds(points.midX, points.midY + labelOffsetY, label));
  }
  return bounds;
}
function attachGraphViewportInteractions(canvas, surface, toolbar, scene, options) {
  const minZoom = options?.minZoom ?? 0.45;
  const maxZoom = options?.maxZoom ?? 2.4;
  const initialZoom = options?.initialZoom ?? 1;
  const nodeSelector = options?.nodeSelector;
  const state = options?.viewportState ?? {
    zoom: initialZoom,
    panX: 0,
    panY: 0,
    viewMode: "fit",
    hasAutoFitted: false,
    hasUserInteracted: false
  };
  let isPanning = false;
  let pointerId = null;
  let startClientX = 0;
  let startClientY = 0;
  let startPanX = 0;
  let startPanY = 0;
  const applyTransform = () => {
    surface.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
    toolbar.zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;
  };
  const notifyViewportStateChange = () => {
    options?.onViewportStateChange?.(state);
  };
  const fitToView = () => {
    const viewportWidth = canvas.clientWidth;
    const viewportHeight = canvas.clientHeight;
    if (viewportWidth <= 0 || viewportHeight <= 0) {
      return false;
    }
    const scaleX = viewportWidth / scene.width;
    const scaleY = viewportHeight / scene.height;
    const nextZoom = clamp(Math.min(scaleX, scaleY), minZoom, maxZoom);
    state.zoom = nextZoom;
    state.panX = Math.max(0, (viewportWidth - scene.width * nextZoom) / 2);
    state.panY = Math.max(0, (viewportHeight - scene.height * nextZoom) / 2);
    state.viewMode = "fit";
    applyTransform();
    notifyViewportStateChange();
    return true;
  };
  const autoFitToView = () => {
    if (state.hasUserInteracted) {
      return;
    }
    const didFit = fitToView();
    if (didFit) {
      state.hasAutoFitted = true;
    }
  };
  const zoomAtPoint = (nextZoom, clientX, clientY) => {
    const clampedZoom = clamp(nextZoom, minZoom, maxZoom);
    const rect = canvas.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    const worldX = (localX - state.panX) / state.zoom;
    const worldY = (localY - state.panY) / state.zoom;
    state.zoom = clampedZoom;
    state.panX = localX - worldX * clampedZoom;
    state.panY = localY - worldY * clampedZoom;
    applyTransform();
    notifyViewportStateChange();
  };
  canvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      state.hasUserInteracted = true;
      state.hasAutoFitted = true;
      state.viewMode = "manual";
      const delta = event.deltaY < 0 ? 1.12 : 1 / 1.12;
      zoomAtPoint(state.zoom * delta, event.clientX, event.clientY);
    },
    { passive: false }
  );
  canvas.addEventListener("pointerdown", (event) => {
    const target = event.target;
    if (nodeSelector && target?.closest(nodeSelector)) {
      return;
    }
    state.hasUserInteracted = true;
    state.hasAutoFitted = true;
    state.viewMode = "manual";
    isPanning = true;
    pointerId = event.pointerId;
    startClientX = event.clientX;
    startClientY = event.clientY;
    startPanX = state.panX;
    startPanY = state.panY;
    canvas.style.cursor = "grabbing";
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!isPanning || pointerId !== event.pointerId) {
      return;
    }
    const dx = event.clientX - startClientX;
    const dy = event.clientY - startClientY;
    state.panX = startPanX + dx;
    state.panY = startPanY + dy;
    applyTransform();
    notifyViewportStateChange();
  });
  const stopPanning = (event) => {
    if (!isPanning || pointerId !== event.pointerId) {
      return;
    }
    isPanning = false;
    pointerId = null;
    canvas.style.cursor = "grab";
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  };
  canvas.addEventListener("pointerup", stopPanning);
  canvas.addEventListener("pointercancel", stopPanning);
  canvas.addEventListener("pointerleave", (event) => {
    if (isPanning && pointerId === event.pointerId) {
      stopPanning(event);
    }
  });
  toolbar.zoomOutButton.addEventListener("click", () => {
    state.hasUserInteracted = true;
    state.hasAutoFitted = true;
    state.viewMode = "manual";
    state.zoom = clamp(state.zoom / 1.12, minZoom, maxZoom);
    applyTransform();
    notifyViewportStateChange();
  });
  toolbar.zoomInButton.addEventListener("click", () => {
    state.hasUserInteracted = true;
    state.hasAutoFitted = true;
    state.viewMode = "manual";
    state.zoom = clamp(state.zoom * 1.12, minZoom, maxZoom);
    applyTransform();
    notifyViewportStateChange();
  });
  toolbar.fitButton.addEventListener("click", () => {
    state.hasUserInteracted = false;
    if (fitToView()) {
      state.hasAutoFitted = true;
    }
  });
  toolbar.resetButton.addEventListener("click", () => {
    state.hasUserInteracted = true;
    state.hasAutoFitted = true;
    state.viewMode = "manual";
    state.zoom = initialZoom;
    state.panX = 0;
    state.panY = 0;
    applyTransform();
    notifyViewportStateChange();
  });
  requestAnimationFrame(() => {
    if (!state.hasAutoFitted) {
      autoFitToView();
    } else {
      applyTransform();
      notifyViewportStateChange();
    }
  });
  const resizeObserver = new ResizeObserver(() => {
    if (!state.hasAutoFitted || state.viewMode === "fit") {
      autoFitToView();
      return;
    }
    applyTransform();
    notifyViewportStateChange();
  });
  resizeObserver.observe(canvas);
}
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// src/renderers/zoom-toolbar.ts
function createZoomToolbar(helpText) {
  const toolbar = document.createElement("div");
  toolbar.style.display = "flex";
  toolbar.style.justifyContent = "space-between";
  toolbar.style.alignItems = "center";
  toolbar.style.gap = "12px";
  toolbar.style.margin = "8px 0 10px";
  const help = document.createElement("div");
  help.style.fontSize = "12px";
  help.style.color = "var(--text-muted)";
  help.textContent = helpText;
  const controls = document.createElement("div");
  controls.style.display = "flex";
  controls.style.alignItems = "center";
  controls.style.gap = "6px";
  const zoomOutButton = createToolbarButton("\u2212");
  const fitButton = createToolbarButton("Fit");
  const zoomLabel = document.createElement("span");
  zoomLabel.style.fontSize = "12px";
  zoomLabel.style.minWidth = "52px";
  zoomLabel.style.textAlign = "center";
  zoomLabel.textContent = "100%";
  const zoomInButton = createToolbarButton("+");
  const resetButton = createToolbarButton("100%");
  controls.append(
    zoomOutButton,
    fitButton,
    zoomLabel,
    zoomInButton,
    resetButton
  );
  toolbar.append(help, controls);
  return {
    root: toolbar,
    zoomOutButton,
    fitButton,
    zoomLabel,
    zoomInButton,
    resetButton
  };
}
function createToolbarButton(label) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.style.border = "1px solid var(--background-modifier-border)";
  button.style.borderRadius = "6px";
  button.style.background = "var(--background-primary)";
  button.style.padding = "2px 8px";
  button.style.cursor = "pointer";
  button.style.fontSize = "11px";
  return button;
}

// src/renderers/dfd-renderer.ts
var SVG_NS = "http://www.w3.org/2000/svg";
var NODE_WIDTH = 240;
var COLUMN_GAP = 132;
var STACK_GAP = 52;
var CANVAS_PADDING = 72;
var MAIN_LANE_Y = 140;
var AUX_LANE_Y = 300;
var STORE_LANE_Y = 470;
var RETURN_TOP_GAP = 88;
var RETURN_BOTTOM_GAP = 86;
var MIN_ZOOM = 0.4;
var MAX_ZOOM = 2.4;
var INITIAL_ZOOM = 1;
var DFD_MERMAID_RENDER_FLAG = "__modelWeaveRenderReady";
function renderDfdDiagram(diagram, options) {
  const shell = createMermaidShell(diagram, options);
  const ready = renderMermaidIntoShell(shell, diagram, options).catch((error) => {
    console.warn("[model-weave] DFD Mermaid render failed; falling back to custom renderer", {
      error,
      diagramId: "id" in diagram.diagram ? diagram.diagram.id : diagram.diagram.path
    });
    const fallback = renderDfdDiagramFallback(diagram, options);
    shell.root.replaceChildren(...Array.from(fallback.childNodes));
  });
  shell.root[DFD_MERMAID_RENDER_FLAG] = ready;
  return shell.root;
}
function getDfdRenderReadyPromise(element) {
  return element[DFD_MERMAID_RENDER_FLAG] ?? null;
}
function createMermaidShell(diagram, options) {
  const root = document.createElement("section");
  root.className = "mdspec-diagram mdspec-diagram--dfd";
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.flex = "1 1 auto";
  root.style.minHeight = "0";
  if (!options?.hideTitle) {
    const title = document.createElement("h2");
    title.textContent = `${diagram.diagram.name} (dfd)`;
    title.style.flex = "0 0 auto";
    root.appendChild(title);
  }
  const canvas = document.createElement("div");
  canvas.className = "mdspec-dfd-canvas";
  canvas.style.position = "relative";
  canvas.style.overflow = "hidden";
  canvas.style.padding = "0";
  canvas.style.border = "1px solid var(--background-modifier-border)";
  canvas.style.borderRadius = "8px";
  canvas.style.background = "#ffffff";
  canvas.style.flex = "1 1 auto";
  if (!options?.forExport) {
    canvas.style.minHeight = "420px";
  }
  canvas.style.cursor = "grab";
  canvas.style.userSelect = "none";
  canvas.style.touchAction = "none";
  const toolbar = options?.forExport ? null : createZoomToolbar("Wheel: zoom / Drag background: pan");
  if (toolbar) {
    root.appendChild(toolbar.root);
  }
  const viewport = document.createElement("div");
  viewport.style.position = "relative";
  viewport.style.width = "100%";
  viewport.style.height = "100%";
  viewport.style.minHeight = "0";
  viewport.style.overflow = "hidden";
  const surface = document.createElement("div");
  surface.className = "mdspec-dfd-surface";
  surface.dataset.modelWeaveExportSurface = "true";
  surface.style.position = "absolute";
  surface.style.left = "0";
  surface.style.top = "0";
  surface.style.width = "1px";
  surface.style.height = "1px";
  surface.style.transformOrigin = "0 0";
  surface.style.willChange = "transform";
  viewport.appendChild(surface);
  canvas.appendChild(viewport);
  root.appendChild(canvas);
  if (!options?.hideDetails) {
    root.appendChild(createFlowDetails(diagram.edges));
  }
  return {
    root,
    canvas,
    surface,
    toolbar
  };
}
async function renderMermaidIntoShell(shell, diagram, options) {
  const mermaid = await (0, import_obsidian2.loadMermaid)();
  const source = buildDfdMermaidSource(diagram);
  const renderId = `model_weave_dfd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const rendered = await mermaid.render(renderId, source);
  const { canvas, surface, toolbar } = shell;
  surface.empty();
  surface.innerHTML = rendered.svg;
  surface.style.background = "#ffffff";
  surface.style.display = "block";
  surface.dataset.modelWeaveRenderer = "mermaid";
  const svg = surface.querySelector("svg");
  if (!svg) {
    throw new Error("Mermaid SVG was not generated.");
  }
  if (typeof rendered.bindFunctions === "function") {
    rendered.bindFunctions(surface);
  }
  const sceneSize = readMermaidSceneSize(svg);
  if (!sceneSize) {
    throw new Error("Mermaid SVG has no measurable bounds.");
  }
  surface.dataset.modelWeaveSceneWidth = `${sceneSize.width}`;
  surface.dataset.modelWeaveSceneHeight = `${sceneSize.height}`;
  surface.style.width = `${sceneSize.width}px`;
  surface.style.height = `${sceneSize.height}px`;
  svg.setAttribute("width", `${sceneSize.width}`);
  svg.setAttribute("height", `${sceneSize.height}`);
  svg.style.width = `${sceneSize.width}px`;
  svg.style.height = `${sceneSize.height}px`;
  svg.style.display = "block";
  if (options?.forExport) {
    return;
  }
  if (toolbar) {
    attachGraphViewportInteractions(
      canvas,
      surface,
      toolbar,
      sceneSize,
      {
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
        initialZoom: INITIAL_ZOOM,
        nodeSelector: ".node, g.node, foreignObject",
        viewportState: options?.viewportState,
        onViewportStateChange: options?.onViewportStateChange
      }
    );
  }
}
function readMermaidSceneSize(svg) {
  const viewBox = svg.viewBox?.baseVal;
  if (viewBox && Number.isFinite(viewBox.width) && Number.isFinite(viewBox.height) && viewBox.width > 0 && viewBox.height > 0) {
    return { width: viewBox.width, height: viewBox.height };
  }
  const width = parseFloat(svg.getAttribute("width") ?? "");
  const height = parseFloat(svg.getAttribute("height") ?? "");
  if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
    return { width, height };
  }
  try {
    const bbox = svg.getBBox();
    if (Number.isFinite(bbox.width) && Number.isFinite(bbox.height) && bbox.width > 0 && bbox.height > 0) {
      return { width: bbox.width, height: bbox.height };
    }
  } catch {
  }
  const rect = svg.getBoundingClientRect();
  if (Number.isFinite(rect.width) && Number.isFinite(rect.height) && rect.width > 0 && rect.height > 0) {
    return { width: rect.width, height: rect.height };
  }
  return null;
}
function renderDfdDiagramFallback(diagram, options) {
  const root = document.createElement("section");
  root.className = "mdspec-diagram mdspec-diagram--dfd";
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.flex = "1 1 auto";
  root.style.minHeight = "0";
  if (!options?.hideTitle) {
    const title = document.createElement("h2");
    title.textContent = `${diagram.diagram.name} (dfd)`;
    title.style.flex = "0 0 auto";
    root.appendChild(title);
  }
  const layout = createDfdLayout(
    diagram.nodes,
    diagram.edges
  );
  const sceneBounds = createSceneBounds(layout);
  const canvas = document.createElement("div");
  canvas.className = "mdspec-dfd-canvas";
  canvas.style.position = "relative";
  canvas.style.overflow = "hidden";
  canvas.style.padding = "0";
  canvas.style.border = "1px solid var(--background-modifier-border)";
  canvas.style.borderRadius = "8px";
  canvas.style.background = "#ffffff";
  canvas.style.flex = "1 1 auto";
  if (!options?.forExport) {
    canvas.style.minHeight = "420px";
  }
  canvas.style.cursor = "grab";
  canvas.style.userSelect = "none";
  canvas.style.touchAction = "none";
  const toolbar = options?.forExport ? null : createZoomToolbar("Wheel: zoom / Drag background: pan");
  if (toolbar) {
    root.appendChild(toolbar.root);
  }
  const viewport = document.createElement("div");
  viewport.style.position = "relative";
  viewport.style.width = "100%";
  viewport.style.height = "100%";
  viewport.style.minHeight = "0";
  viewport.style.overflow = "hidden";
  const surface = document.createElement("div");
  surface.className = "mdspec-dfd-surface";
  surface.dataset.modelWeaveExportSurface = "true";
  surface.dataset.modelWeaveRenderer = "custom";
  surface.dataset.modelWeaveSceneWidth = `${sceneBounds.width}`;
  surface.dataset.modelWeaveSceneHeight = `${sceneBounds.height}`;
  surface.style.position = "absolute";
  surface.style.left = "0";
  surface.style.top = "0";
  surface.style.width = `${sceneBounds.width}px`;
  surface.style.height = `${sceneBounds.height}px`;
  surface.style.transformOrigin = "0 0";
  surface.style.willChange = "transform";
  const svg = createSvgSurface(sceneBounds.width, sceneBounds.height);
  svg.appendChild(createMarkerDefinitions());
  for (const route of layout.routes) {
    svg.appendChild(renderEdge(route));
  }
  surface.appendChild(svg);
  for (const box of layout.nodes) {
    surface.appendChild(createNodeBox(box, options));
  }
  viewport.appendChild(surface);
  canvas.appendChild(viewport);
  root.appendChild(canvas);
  if (toolbar) {
    attachGraphViewportInteractions(canvas, surface, toolbar, sceneBounds, {
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      initialZoom: INITIAL_ZOOM,
      nodeSelector: ".mdspec-dfd-node",
      viewportState: options?.viewportState,
      onViewportStateChange: options?.onViewportStateChange
    });
  }
  if (!options?.hideDetails) {
    root.appendChild(createFlowDetails(diagram.edges));
  }
  return root;
}
function createDfdLayout(nodes, edges) {
  const metas = assignDfdRanks(nodes, edges);
  const laneStacks = /* @__PURE__ */ new Map();
  const layouts = [];
  const byId = {};
  let maxX = CANVAS_PADDING;
  let maxY = CANVAS_PADDING;
  const orderedNodes = [...nodes].sort((left, right) => {
    const leftMeta = metas.get(left.id);
    const rightMeta = metas.get(right.id);
    if (!leftMeta || !rightMeta) {
      return left.id.localeCompare(right.id);
    }
    if (leftMeta.rank !== rightMeta.rank) {
      return leftMeta.rank - rightMeta.rank;
    }
    if (leftMeta.lane !== rightMeta.lane) {
      return laneOrder(leftMeta.lane) - laneOrder(rightMeta.lane);
    }
    return left.id.localeCompare(right.id);
  });
  for (const node of orderedNodes) {
    const meta = metas.get(node.id);
    if (!meta) {
      continue;
    }
    const width = NODE_WIDTH;
    const height = measureNodeHeight(node.object);
    const stackKey = `${meta.rank}:${meta.lane}`;
    const stackIndex = laneStacks.get(stackKey) ?? 0;
    laneStacks.set(stackKey, stackIndex + 1);
    const x = CANVAS_PADDING + meta.rank * (NODE_WIDTH + COLUMN_GAP);
    const y = getLaneBaseY(meta.lane) + stackIndex * (height + STACK_GAP);
    const layout = { node, x, y, width, height };
    layouts.push(layout);
    byId[node.id] = layout;
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
  }
  const routes = buildDfdOrthogonalEdges(edges, byId, metas);
  for (const route of routes) {
    for (const point of route.points) {
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
  }
  return {
    nodes: layouts,
    byId,
    routes,
    width: maxX + CANVAS_PADDING,
    height: maxY + CANVAS_PADDING
  };
}
function createSceneBounds(layout) {
  const nodeBounds = layout.nodes.map((item) => ({
    x: item.x,
    y: item.y,
    width: item.width,
    height: item.height
  }));
  const routeBounds = layout.routes.map((route) => {
    const xs = route.points.map((point) => point.x);
    const ys = route.points.map((point) => point.y);
    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(1, Math.max(...xs) - Math.min(...xs)),
      height: Math.max(1, Math.max(...ys) - Math.min(...ys))
    };
  });
  const labelBounds = layout.routes.map((route) => {
    const label = getEdgeLabel(route.edge);
    if (!label) {
      return null;
    }
    return estimateBadgeBounds(route.labelX, route.labelY, label, { minWidth: 56 });
  }).filter((value) => Boolean(value));
  return computeSceneBounds([...nodeBounds, ...routeBounds], labelBounds, CANVAS_PADDING);
}
function assignDfdRanks(nodes, edges) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const outgoing = /* @__PURE__ */ new Map();
  const incoming = /* @__PURE__ */ new Map();
  for (const node of nodes) {
    outgoing.set(node.id, []);
    incoming.set(node.id, []);
  }
  for (const edge of edges) {
    outgoing.get(edge.source)?.push(edge);
    incoming.get(edge.target)?.push(edge);
  }
  const metas = /* @__PURE__ */ new Map();
  for (const node of nodes) {
    const kind = node.object?.kind ?? "unknown";
    if (kind === "external") {
      metas.set(node.id, { rank: 0, lane: "main", kind });
    }
  }
  for (const edge of edges) {
    const targetNode = nodeById.get(edge.target);
    const sourceMeta = metas.get(edge.source);
    if (!targetNode || targetNode.object?.kind !== "process" || metas.has(edge.target)) {
      continue;
    }
    if (sourceMeta?.kind === "external") {
      metas.set(edge.target, { rank: 1, lane: "main", kind: "process" });
      continue;
    }
    if (sourceMeta?.kind === "process") {
      metas.set(edge.target, {
        rank: sourceMeta.rank + 1,
        lane: "main",
        kind: "process"
      });
    }
  }
  const processes = nodes.filter((node) => node.object?.kind === "process");
  const centerProcessId = pickCenterProcess(processes, incoming, outgoing);
  for (const process of processes) {
    if (!metas.has(process.id)) {
      metas.set(process.id, {
        rank: process.id === centerProcessId ? 1 : 2,
        lane: "main",
        kind: "process"
      });
    }
  }
  for (const process of processes) {
    const meta = metas.get(process.id);
    if (!meta) {
      continue;
    }
    const outgoingEdges = outgoing.get(process.id) ?? [];
    const returnishCount = outgoingEdges.filter((edge) => {
      const targetMeta = metas.get(edge.target);
      const targetKind = nodeById.get(edge.target)?.object?.kind;
      if (targetKind === "external") {
        return true;
      }
      return Boolean(targetMeta && targetMeta.rank <= meta.rank);
    }).length;
    if (returnishCount > 0 && returnishCount >= Math.ceil(outgoingEdges.length / 2)) {
      meta.lane = meta.rank <= 1 ? "main" : "aux";
    }
  }
  for (const node of nodes) {
    if (node.object?.kind !== "datastore") {
      continue;
    }
    const relatedRanks = [
      ...(incoming.get(node.id) ?? []).map((edge) => metas.get(edge.source)?.rank),
      ...(outgoing.get(node.id) ?? []).map((edge) => metas.get(edge.target)?.rank)
    ].filter((value) => typeof value === "number");
    const rank = relatedRanks.length > 0 ? Math.max(...relatedRanks) + 1 : Math.max(2, processes.length);
    metas.set(node.id, { rank, lane: "store", kind: "datastore" });
  }
  for (const node of nodes) {
    if (!metas.has(node.id)) {
      metas.set(node.id, {
        rank: 1,
        lane: "main",
        kind: node.object?.kind ?? "unknown"
      });
    }
  }
  return metas;
}
function pickCenterProcess(processes, incoming, outgoing) {
  if (processes.length === 0) {
    return null;
  }
  return [...processes].sort((left, right) => {
    const leftScore = (incoming.get(left.id)?.length ?? 0) + (outgoing.get(left.id)?.length ?? 0);
    const rightScore = (incoming.get(right.id)?.length ?? 0) + (outgoing.get(right.id)?.length ?? 0);
    if (leftScore !== rightScore) {
      return rightScore - leftScore;
    }
    return left.id.localeCompare(right.id);
  })[0]?.id ?? null;
}
function buildDfdOrthogonalEdges(edges, layoutById, metas) {
  const routes = [];
  for (const edge of edges) {
    const source = layoutById[edge.source];
    const target = layoutById[edge.target];
    const sourceMeta = metas.get(edge.source);
    const targetMeta = metas.get(edge.target);
    if (!source || !target || !sourceMeta || !targetMeta) {
      continue;
    }
    const isReturn = classifyDfdFlowDirection(sourceMeta, targetMeta);
    const candidate = selectBestRouteCandidate(
      edge,
      source,
      target,
      sourceMeta,
      targetMeta,
      layoutById,
      routes,
      isReturn
    );
    routes.push(finalizeRouteCandidate(candidate));
  }
  return routes;
}
function classifyDfdFlowDirection(sourceMeta, targetMeta) {
  if (targetMeta.kind === "external") {
    return true;
  }
  return targetMeta.rank <= sourceMeta.rank;
}
function selectBestRouteCandidate(edge, source, target, sourceMeta, targetMeta, layoutById, acceptedRoutes, isReturn) {
  const portPairs = getPortCandidatePairs(source, target);
  const candidates = [];
  for (const [fromSide, toSide] of portPairs) {
    const sourcePort = getPortAnchor(source, fromSide);
    const targetPort = getPortAnchor(target, toSide);
    candidates.push(
      createDirectCandidate(edge, sourcePort, targetPort, "direct-hvh", isReturn),
      createDirectCandidate(edge, sourcePort, targetPort, "direct-vhv", isReturn)
    );
    if (isReturn || shouldConsiderLaneRoute(sourceMeta, targetMeta)) {
      candidates.push(
        createLaneCandidate(edge, sourcePort, targetPort, "lane-top", isReturn),
        createLaneCandidate(edge, sourcePort, targetPort, "lane-bottom", isReturn)
      );
    }
  }
  const scored = candidates.map((candidate) => ({
    candidate,
    score: scoreRouteCandidate(
      candidate,
      source,
      target,
      sourceMeta,
      targetMeta,
      layoutById,
      acceptedRoutes
    )
  }));
  scored.sort((left, right) => left.score - right.score);
  const best = scored[0];
  return {
    ...best.candidate,
    score: best.score
  };
}
function shouldConsiderLaneRoute(sourceMeta, targetMeta) {
  return sourceMeta.rank === targetMeta.rank || Math.abs(sourceMeta.rank - targetMeta.rank) > 1;
}
function getPortCandidatePairs(source, target) {
  const sourceCenterX = source.x + source.width / 2;
  const sourceCenterY = source.y + source.height / 2;
  const targetCenterX = target.x + target.width / 2;
  const targetCenterY = target.y + target.height / 2;
  const dx = targetCenterX - sourceCenterX;
  const dy = targetCenterY - sourceCenterY;
  const horizontalPrimary = dx >= 0 ? ["right", "left"] : ["left", "right"];
  const verticalPrimary = dy >= 0 ? ["bottom", "top"] : ["top", "bottom"];
  const pairs = Math.abs(dx) >= Math.abs(dy) ? [horizontalPrimary, verticalPrimary] : [verticalPrimary, horizontalPrimary];
  return dedupePortPairs([
    ...pairs,
    ["right", "left"],
    ["left", "right"],
    ["bottom", "top"],
    ["top", "bottom"]
  ]);
}
function dedupePortPairs(pairs) {
  const seen = /* @__PURE__ */ new Set();
  const result = [];
  for (const pair of pairs) {
    const key = `${pair[0]}:${pair[1]}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(pair);
  }
  return result;
}
function getPortAnchor(layout, side) {
  const stub = 18;
  switch (side) {
    case "left":
      return {
        side,
        boundary: { x: layout.x, y: layout.y + layout.height / 2 },
        outer: { x: layout.x - stub, y: layout.y + layout.height / 2 }
      };
    case "right":
      return {
        side,
        boundary: { x: layout.x + layout.width, y: layout.y + layout.height / 2 },
        outer: { x: layout.x + layout.width + stub, y: layout.y + layout.height / 2 }
      };
    case "top":
      return {
        side,
        boundary: { x: layout.x + layout.width / 2, y: layout.y },
        outer: { x: layout.x + layout.width / 2, y: layout.y - stub }
      };
    case "bottom":
    default:
      return {
        side,
        boundary: { x: layout.x + layout.width / 2, y: layout.y + layout.height },
        outer: { x: layout.x + layout.width / 2, y: layout.y + layout.height + stub }
      };
  }
}
function createDirectCandidate(edge, sourcePort, targetPort, routeKind, isReturn) {
  const points = routeKind === "direct-hvh" ? [
    sourcePort.boundary,
    sourcePort.outer,
    { x: (sourcePort.outer.x + targetPort.outer.x) / 2, y: sourcePort.outer.y },
    { x: (sourcePort.outer.x + targetPort.outer.x) / 2, y: targetPort.outer.y },
    targetPort.outer,
    targetPort.boundary
  ] : [
    sourcePort.boundary,
    sourcePort.outer,
    { x: sourcePort.outer.x, y: (sourcePort.outer.y + targetPort.outer.y) / 2 },
    { x: targetPort.outer.x, y: (sourcePort.outer.y + targetPort.outer.y) / 2 },
    targetPort.outer,
    targetPort.boundary
  ];
  return {
    edge,
    points: simplifyOrthogonalPoints(points),
    isReturn,
    routeKind,
    score: 0
  };
}
function createLaneCandidate(edge, sourcePort, targetPort, routeKind, isReturn) {
  const laneY = routeKind === "lane-top" ? Math.min(sourcePort.outer.y, targetPort.outer.y) - RETURN_TOP_GAP : Math.max(sourcePort.outer.y, targetPort.outer.y) + RETURN_BOTTOM_GAP;
  return {
    edge,
    points: simplifyOrthogonalPoints([
      sourcePort.boundary,
      sourcePort.outer,
      { x: sourcePort.outer.x, y: laneY },
      { x: targetPort.outer.x, y: laneY },
      targetPort.outer,
      targetPort.boundary
    ]),
    isReturn,
    routeKind,
    score: 0
  };
}
function simplifyOrthogonalPoints(points) {
  const compact = [];
  for (const point of points) {
    const previous = compact[compact.length - 1];
    if (previous && previous.x === point.x && previous.y === point.y) {
      continue;
    }
    compact.push(point);
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (let index = 1; index < compact.length - 1; index += 1) {
      const prev = compact[index - 1];
      const current = compact[index];
      const next = compact[index + 1];
      const sameX = prev.x === current.x && current.x === next.x;
      const sameY = prev.y === current.y && current.y === next.y;
      if (sameX || sameY) {
        compact.splice(index, 1);
        changed = true;
        break;
      }
    }
  }
  return compact;
}
function scoreRouteCandidate(candidate, source, target, sourceMeta, targetMeta, layoutById, acceptedRoutes) {
  let score = 0;
  score += computePolylineLength(candidate.points);
  score += (candidate.points.length - 2) * 10;
  if (candidate.routeKind === "lane-top" || candidate.routeKind === "lane-bottom") {
    score += candidate.isReturn ? 12 : 40;
  } else if (candidate.isReturn) {
    score += 8;
  }
  if (sourceMeta.rank < targetMeta.rank && (candidate.routeKind === "direct-hvh" || candidate.routeKind === "direct-vhv")) {
    score -= 6;
  }
  score += evaluateNodeCrossingPenalty(candidate.points, layoutById, source.node.id, target.node.id);
  score += evaluateExistingRoutePenalty(candidate.points, acceptedRoutes);
  score += evaluatePortPreferencePenalty(candidate, source, target);
  return score;
}
function computePolylineLength(points) {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    total += Math.abs(points[index].x - points[index - 1].x) + Math.abs(points[index].y - points[index - 1].y);
  }
  return total;
}
function evaluateNodeCrossingPenalty(points, layoutById, sourceId, targetId) {
  let penalty = 0;
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    for (const [nodeId, layout] of Object.entries(layoutById)) {
      if (nodeId === sourceId || nodeId === targetId) {
        continue;
      }
      if (segmentIntersectsExpandedRect(start, end, layout, 10)) {
        penalty += 180;
      }
    }
  }
  return penalty;
}
function segmentIntersectsExpandedRect(start, end, rect, padding) {
  const left = rect.x - padding;
  const right = rect.x + rect.width + padding;
  const top = rect.y - padding;
  const bottom = rect.y + rect.height + padding;
  if (start.x === end.x) {
    const x = start.x;
    if (x < left || x > right) {
      return false;
    }
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);
    return maxY >= top && minY <= bottom;
  }
  if (start.y === end.y) {
    const y = start.y;
    if (y < top || y > bottom) {
      return false;
    }
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    return maxX >= left && minX <= right;
  }
  return false;
}
function evaluateExistingRoutePenalty(points, acceptedRoutes) {
  let penalty = 0;
  const candidateSegments = toSegments(points);
  for (const route of acceptedRoutes) {
    const existingSegments = toSegments(route.points);
    for (const candidate of candidateSegments) {
      for (const existing of existingSegments) {
        penalty += scoreSegmentProximity(candidate, existing);
      }
    }
  }
  return penalty;
}
function toSegments(points) {
  const segments = [];
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    if (start.x === end.x) {
      segments.push({
        orientation: "vertical",
        fixed: start.x,
        start: Math.min(start.y, end.y),
        end: Math.max(start.y, end.y)
      });
    } else if (start.y === end.y) {
      segments.push({
        orientation: "horizontal",
        fixed: start.y,
        start: Math.min(start.x, end.x),
        end: Math.max(start.x, end.x)
      });
    }
  }
  return segments;
}
function scoreSegmentProximity(left, right) {
  if (left.orientation !== right.orientation) {
    return 0;
  }
  const overlap = Math.min(left.end, right.end) - Math.max(left.start, right.start);
  if (overlap <= 0) {
    return 0;
  }
  const distance = Math.abs(left.fixed - right.fixed);
  if (distance === 0) {
    return 48;
  }
  if (distance < 18) {
    return 18;
  }
  if (distance < 32) {
    return 6;
  }
  return 0;
}
function evaluatePortPreferencePenalty(candidate, source, target) {
  const firstStep = candidate.points[1];
  const beforeEnd = candidate.points[candidate.points.length - 2];
  const sourceCenterX = source.x + source.width / 2;
  const sourceCenterY = source.y + source.height / 2;
  const targetCenterX = target.x + target.width / 2;
  const targetCenterY = target.y + target.height / 2;
  const dx = targetCenterX - sourceCenterX;
  const dy = targetCenterY - sourceCenterY;
  let penalty = 0;
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx >= 0 && firstStep.x <= sourceCenterX || dx < 0 && firstStep.x >= sourceCenterX) {
      penalty += 30;
    }
    if (dx >= 0 && beforeEnd.x >= targetCenterX || dx < 0 && beforeEnd.x <= targetCenterX) {
      penalty += 30;
    }
  } else {
    if (dy >= 0 && firstStep.y <= sourceCenterY || dy < 0 && firstStep.y >= sourceCenterY) {
      penalty += 30;
    }
    if (dy >= 0 && beforeEnd.y >= targetCenterY || dy < 0 && beforeEnd.y <= targetCenterY) {
      penalty += 30;
    }
  }
  return penalty;
}
function finalizeRouteCandidate(candidate) {
  const labelPosition = computeLabelPosition(candidate.points, candidate.isReturn);
  return {
    edge: candidate.edge,
    d: toOrthogonalPath(candidate.points),
    points: candidate.points,
    labelX: labelPosition.x,
    labelY: labelPosition.y,
    isReturn: candidate.isReturn
  };
}
function computeLabelPosition(points, isReturn) {
  const segments = toSegments(points);
  if (segments.length === 0) {
    return { x: 0, y: 0 };
  }
  const longest = [...segments].sort((left, right) => right.end - right.start - (left.end - left.start))[0];
  if (longest.orientation === "horizontal") {
    return {
      x: (longest.start + longest.end) / 2,
      y: longest.fixed + (isReturn ? -16 : -12)
    };
  }
  return {
    x: longest.fixed + 14,
    y: (longest.start + longest.end) / 2
  };
}
function toOrthogonalPath(points) {
  if (points.length === 0) {
    return "";
  }
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}
function laneOrder(lane) {
  switch (lane) {
    case "main":
      return 0;
    case "aux":
      return 1;
    case "store":
    default:
      return 2;
  }
}
function getLaneBaseY(lane) {
  switch (lane) {
    case "main":
      return MAIN_LANE_Y;
    case "aux":
      return AUX_LANE_Y;
    case "store":
    default:
      return STORE_LANE_Y;
  }
}
function measureNodeHeight(object) {
  if (!object) {
    return 88;
  }
  switch (object.kind) {
    case "process":
      return 104;
    case "datastore":
      return 92;
    case "external":
    default:
      return 88;
  }
}
function createSvgSurface(width, height) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.style.position = "absolute";
  svg.style.inset = "0";
  svg.style.pointerEvents = "none";
  svg.style.overflow = "visible";
  return svg;
}
function createMarkerDefinitions() {
  const defs = document.createElementNS(SVG_NS, "defs");
  const marker = document.createElementNS(SVG_NS, "marker");
  marker.setAttribute("id", "mdspec-dfd-arrow");
  marker.setAttribute("markerWidth", "12");
  marker.setAttribute("markerHeight", "12");
  marker.setAttribute("refX", "10");
  marker.setAttribute("refY", "6");
  marker.setAttribute("orient", "auto");
  marker.setAttribute("markerUnits", "strokeWidth");
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", "M 0 0 L 10 6 L 0 12 z");
  path.setAttribute("fill", "var(--text-muted)");
  path.setAttribute("stroke", "var(--text-muted)");
  path.setAttribute("stroke-width", "1.2");
  marker.appendChild(path);
  defs.appendChild(marker);
  return defs;
}
function renderEdge(route) {
  const group = document.createElementNS(SVG_NS, "g");
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", route.d);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", route.isReturn ? "var(--text-accent)" : "var(--text-muted)");
  path.setAttribute("stroke-width", route.isReturn ? "2.2" : "2");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("marker-end", "url(#mdspec-dfd-arrow)");
  group.appendChild(path);
  const label = getEdgeLabel(route.edge);
  if (label) {
    group.appendChild(createEdgeBadge(route.labelX, route.labelY, label));
  }
  return group;
}
function getEdgeLabel(edge) {
  return typeof edge.label === "string" && edge.label.trim() ? edge.label.trim() : null;
}
function createEdgeBadge(x, y, value) {
  const group = document.createElementNS(SVG_NS, "g");
  const badge = estimateBadgeBounds(x, y, value, { minWidth: 56 });
  const rect = document.createElementNS(SVG_NS, "rect");
  rect.setAttribute("x", String(badge.x));
  rect.setAttribute("y", String(badge.y));
  rect.setAttribute("width", String(badge.width));
  rect.setAttribute("height", String(badge.height));
  rect.setAttribute("rx", "10");
  rect.setAttribute("fill", "var(--background-primary)");
  rect.setAttribute("stroke", "var(--background-modifier-border)");
  group.appendChild(rect);
  const text = document.createElementNS(SVG_NS, "text");
  text.setAttribute("x", String(x));
  text.setAttribute("y", String(y + 4));
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("font-size", "11px");
  text.setAttribute("font-weight", "600");
  text.setAttribute("fill", "var(--text-normal)");
  text.textContent = value;
  group.appendChild(text);
  return group;
}
function createNodeBox(layout, options) {
  const box = document.createElement("article");
  box.className = "mdspec-dfd-node";
  box.style.position = "absolute";
  box.style.left = `${layout.x}px`;
  box.style.top = `${layout.y}px`;
  box.style.width = `${layout.width}px`;
  box.style.minHeight = `${layout.height}px`;
  box.style.boxSizing = "border-box";
  box.style.background = "var(--background-primary-alt)";
  box.style.color = "var(--text-normal)";
  box.style.overflow = "hidden";
  box.style.cursor = layout.node.object ? "pointer" : "default";
  applyDfdNodeShape(box, layout.node.object?.kind);
  if (!layout.node.object) {
    box.textContent = layout.node.label ?? layout.node.ref ?? layout.node.id;
    box.style.padding = "16px";
    return box;
  }
  if (options?.onOpenObject) {
    box.setAttribute("role", "button");
    box.tabIndex = 0;
    box.addEventListener("click", (event) => {
      options.onOpenObject?.(layout.node.id, {
        openInNewLeaf: event.ctrlKey || event.metaKey
      });
    });
    box.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        options.onOpenObject?.(layout.node.id, { openInNewLeaf: false });
      }
    });
    box.addEventListener("pointerdown", (event) => event.stopPropagation());
  }
  const object = layout.node.object;
  const kind = document.createElement("div");
  kind.textContent = object.kind;
  kind.style.fontSize = "11px";
  kind.style.textTransform = "uppercase";
  kind.style.letterSpacing = "0.08em";
  kind.style.color = "var(--text-muted)";
  kind.style.marginBottom = "8px";
  const title = document.createElement("div");
  title.textContent = layout.node.label ?? object.name;
  title.style.fontWeight = "700";
  title.style.fontSize = "16px";
  title.style.lineHeight = "1.35";
  const id = document.createElement("div");
  id.textContent = object.id;
  id.style.marginTop = "8px";
  id.style.fontSize = "11px";
  id.style.color = "var(--text-muted)";
  id.style.wordBreak = "break-all";
  box.style.padding = "14px 16px";
  box.append(kind, title, id);
  return box;
}
function applyDfdNodeShape(box, kind) {
  box.style.border = "2px solid var(--text-normal)";
  box.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.08)";
  switch (kind) {
    case "process":
      box.style.borderRadius = "16px";
      break;
    case "datastore":
      box.style.borderRadius = "8px";
      box.style.boxShadow = "inset 6px 0 0 rgba(0,0,0,0.08), 0 2px 8px rgba(0, 0, 0, 0.08)";
      break;
    case "external":
    default:
      box.style.borderRadius = "4px";
      break;
  }
}
function createFlowDetails(edges) {
  const section = document.createElement("details");
  section.className = "mdspec-section";
  section.style.marginTop = "10px";
  section.open = false;
  const summary = document.createElement("summary");
  summary.textContent = `Displayed flows (${edges.length})`;
  summary.style.cursor = "pointer";
  summary.style.fontWeight = "600";
  summary.style.padding = "4px 0";
  section.appendChild(summary);
  if (edges.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No flows are currently used for rendering.";
    empty.style.margin = "8px 0 0";
    empty.style.color = "var(--text-muted)";
    section.appendChild(empty);
    return section;
  }
  const list = document.createElement("ul");
  list.style.listStyle = "none";
  list.style.margin = "8px 0 0";
  list.style.padding = "0";
  for (const edge of edges) {
    const item = document.createElement("li");
    item.style.padding = "6px 8px";
    item.style.border = "1px solid var(--background-modifier-border-hover)";
    item.style.borderRadius = "8px";
    item.style.marginBottom = "6px";
    item.style.background = "var(--background-primary-alt)";
    item.style.fontSize = "12px";
    item.textContent = `${edge.id ?? "-"} / ${edge.source} -> ${edge.target} / ${edge.label ?? "-"}${edge.metadata?.notes ? ` / ${String(edge.metadata.notes)}` : ""}`;
    list.appendChild(item);
  }
  section.appendChild(list);
  return section;
}

// src/export/png-export.ts
var EXPORT_FOLDER = "exports";
var EXPORT_PADDING = 32;
var EXPORT_SCALE = 2;
var OFFSCREEN_ROOT_ID = "model-weave-export-root";
var DiagramExportError = class extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
    this.name = "DiagramExportError";
  }
};
async function exportDiagramRenderableAsPng(app, renderable) {
  const rendered = await Promise.resolve(renderable.render());
  const mounted = mountOffscreenExportRoot(rendered);
  try {
    const dfdReady = getDfdRenderReadyPromise(rendered);
    if (dfdReady) {
      await dfdReady;
    }
    await waitForAnimationFrame();
    const snapshot = buildDomDiagramExportSnapshot(mounted.mount, renderable.filePath);
    if (!snapshot) {
      throw new DiagramExportError(
        "The current diagram has no measurable export bounds.",
        "bounds-invalid"
      );
    }
    return exportDiagramSnapshotAsPng(app, snapshot);
  } finally {
    mounted.dispose();
  }
}
function buildDomDiagramExportSnapshot(container, filePath) {
  const surface = container.querySelector(
    '[data-model-weave-export-surface="true"]'
  );
  if (!surface) {
    console.warn("[model-weave] PNG export: target surface not found", { filePath });
    return null;
  }
  const sceneWidth = readSceneSize(surface.dataset.modelWeaveSceneWidth, surface.style.width);
  const sceneHeight = readSceneSize(
    surface.dataset.modelWeaveSceneHeight,
    surface.style.height
  );
  console.debug("[model-weave] PNG export: snapshot target", {
    filePath,
    tagName: surface.tagName,
    className: surface.className,
    dataset: {
      sceneWidth: surface.dataset.modelWeaveSceneWidth,
      sceneHeight: surface.dataset.modelWeaveSceneHeight
    },
    bounds: {
      width: sceneWidth,
      height: sceneHeight
    }
  });
  if (!sceneWidth || !sceneHeight) {
    console.warn("[model-weave] PNG export: invalid scene bounds", {
      filePath,
      sceneWidth,
      sceneHeight,
      datasetWidth: surface.dataset.modelWeaveSceneWidth,
      datasetHeight: surface.dataset.modelWeaveSceneHeight,
      styleWidth: surface.style.width,
      styleHeight: surface.style.height
    });
    return null;
  }
  return {
    filePath,
    surface,
    sceneWidth,
    sceneHeight,
    renderer: surface.dataset.modelWeaveRenderer
  };
}
async function exportDiagramSnapshotAsPng(app, snapshot) {
  console.debug("[model-weave] PNG export: start", {
    filePath: snapshot.filePath,
    sceneWidth: snapshot.sceneWidth,
    sceneHeight: snapshot.sceneHeight
  });
  const arrayBuffer = await renderSnapshotToPng(snapshot);
  try {
    await ensureFolder(app, EXPORT_FOLDER);
    const exportPath = `${EXPORT_FOLDER}/${toExportFileName(snapshot.filePath)}.png`;
    const existing = app.vault.getAbstractFileByPath(exportPath);
    if (existing instanceof import_obsidian3.TFile) {
      await app.vault.modifyBinary(existing, arrayBuffer);
    } else {
      await app.vault.createBinary(exportPath, arrayBuffer);
    }
    console.debug("[model-weave] PNG export: saved", {
      filePath: snapshot.filePath,
      exportPath,
      byteLength: arrayBuffer.byteLength
    });
    return exportPath;
  } catch (error) {
    console.error("[model-weave] PNG export: save failed", {
      filePath: snapshot.filePath,
      error
    });
    throw new DiagramExportError("Failed to save PNG export.", "save-failed");
  }
}
async function renderSnapshotToPng(snapshot) {
  if (snapshot.renderer === "mermaid") {
    return renderMermaidSnapshotToPng(snapshot);
  }
  const exportWidth = snapshot.sceneWidth + EXPORT_PADDING * 2;
  const exportHeight = snapshot.sceneHeight + EXPORT_PADDING * 2;
  if (!Number.isFinite(exportWidth) || !Number.isFinite(exportHeight) || exportWidth <= 0 || exportHeight <= 0) {
    throw new DiagramExportError(
      "The current diagram has no measurable export bounds.",
      "bounds-invalid"
    );
  }
  const wrapper = document.createElement("div");
  wrapper.style.width = `${exportWidth}px`;
  wrapper.style.height = `${exportHeight}px`;
  wrapper.style.background = "#ffffff";
  wrapper.style.position = "relative";
  wrapper.style.overflow = "hidden";
  wrapper.style.fontFamily = "Inter, Segoe UI, Helvetica Neue, Arial, sans-serif";
  const clone = snapshot.surface.cloneNode(true);
  prepareSurfaceClone(clone, snapshot, exportWidth, exportHeight);
  wrapper.appendChild(clone);
  const svg = buildExportSvg(wrapper, exportWidth, exportHeight);
  const serialized = new XMLSerializer().serializeToString(svg);
  const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;
  try {
    const image = await loadImage(svgUrl);
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(exportWidth * EXPORT_SCALE);
    canvas.height = Math.ceil(exportHeight * EXPORT_SCALE);
    const context = canvas.getContext("2d");
    if (!context) {
      throw new DiagramExportError(
        "Canvas rendering context is not available.",
        "render-failed"
      );
    }
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(EXPORT_SCALE, 0, 0, EXPORT_SCALE, 0, 0);
    context.drawImage(image, 0, 0, exportWidth, exportHeight);
    const pngBlob = await canvasToBlob(canvas);
    const arrayBuffer = await pngBlob.arrayBuffer();
    if (arrayBuffer.byteLength <= 0) {
      throw new DiagramExportError("Failed to encode PNG image.", "encode-failed");
    }
    console.debug("[model-weave] PNG export: rasterized", {
      filePath: snapshot.filePath,
      exportWidth,
      exportHeight,
      pngByteLength: arrayBuffer.byteLength
    });
    return arrayBuffer;
  } catch (error) {
    console.error("[model-weave] PNG export: render failed", {
      filePath: snapshot.filePath,
      exportWidth,
      exportHeight,
      error
    });
    if (error instanceof DiagramExportError) {
      throw error;
    }
    throw new DiagramExportError("Failed to render diagram PNG.", "render-failed");
  }
}
async function renderMermaidSnapshotToPng(snapshot) {
  const svg = snapshot.surface.querySelector("svg");
  if (!svg) {
    throw new DiagramExportError("Mermaid SVG export source was not found.", "render-failed");
  }
  const contentBounds = measureMermaidContentBounds(svg);
  if (!contentBounds) {
    console.warn("[model-weave] PNG export: Mermaid bbox unavailable, falling back to scene size", {
      filePath: snapshot.filePath
    });
    return renderSnapshotToPng({
      ...snapshot,
      renderer: "custom"
    });
  }
  const exportWidth = contentBounds.width + EXPORT_PADDING * 2;
  const exportHeight = contentBounds.height + EXPORT_PADDING * 2;
  const viewBoxX = contentBounds.x - EXPORT_PADDING;
  const viewBoxY = contentBounds.y - EXPORT_PADDING;
  const clone = svg.cloneNode(true);
  inlineSvgStyles(svg, clone);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  clone.setAttribute("width", `${exportWidth}`);
  clone.setAttribute("height", `${exportHeight}`);
  clone.setAttribute(
    "viewBox",
    `${viewBoxX} ${viewBoxY} ${exportWidth} ${exportHeight}`
  );
  clone.style.width = `${exportWidth}px`;
  clone.style.height = `${exportHeight}px`;
  clone.style.display = "block";
  const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  background.setAttribute("x", String(viewBoxX));
  background.setAttribute("y", String(viewBoxY));
  background.setAttribute("width", String(exportWidth));
  background.setAttribute("height", String(exportHeight));
  background.setAttribute("fill", "#ffffff");
  clone.insertBefore(background, clone.firstChild);
  const serialized = new XMLSerializer().serializeToString(clone);
  const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;
  try {
    const image = await loadImage(svgUrl);
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(exportWidth * EXPORT_SCALE);
    canvas.height = Math.ceil(exportHeight * EXPORT_SCALE);
    const context = canvas.getContext("2d");
    if (!context) {
      throw new DiagramExportError(
        "Canvas rendering context is not available.",
        "render-failed"
      );
    }
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(EXPORT_SCALE, 0, 0, EXPORT_SCALE, 0, 0);
    context.drawImage(image, 0, 0, exportWidth, exportHeight);
    const pngBlob = await canvasToBlob(canvas);
    const arrayBuffer = await pngBlob.arrayBuffer();
    if (arrayBuffer.byteLength <= 0) {
      throw new DiagramExportError("Failed to encode PNG image.", "encode-failed");
    }
    console.debug("[model-weave] PNG export: rasterized Mermaid", {
      filePath: snapshot.filePath,
      exportWidth,
      exportHeight,
      contentBounds,
      pngByteLength: arrayBuffer.byteLength
    });
    return arrayBuffer;
  } catch (error) {
    console.error("[model-weave] PNG export: Mermaid render failed", {
      filePath: snapshot.filePath,
      exportWidth,
      exportHeight,
      contentBounds,
      error
    });
    if (error instanceof DiagramExportError) {
      throw error;
    }
    throw new DiagramExportError("Failed to render Mermaid diagram PNG.", "render-failed");
  }
}
function mountOffscreenExportRoot(root) {
  const host = document.createElement("div");
  host.id = OFFSCREEN_ROOT_ID;
  host.style.position = "fixed";
  host.style.left = "-100000px";
  host.style.top = "0";
  host.style.width = "1px";
  host.style.height = "1px";
  host.style.overflow = "hidden";
  host.style.pointerEvents = "none";
  host.style.opacity = "1";
  host.style.zIndex = "-1";
  host.style.background = "#ffffff";
  host.appendChild(root);
  document.body.appendChild(host);
  return {
    mount: host,
    dispose: () => host.remove()
  };
}
function prepareSurfaceClone(clone, snapshot, exportWidth, exportHeight) {
  inlineComputedStyles(snapshot.surface, clone);
  clone.style.transform = "none";
  clone.style.left = `${EXPORT_PADDING}px`;
  clone.style.top = `${EXPORT_PADDING}px`;
  clone.style.position = "absolute";
  clone.style.margin = "0";
  clone.style.willChange = "auto";
  clone.style.display = "block";
  clone.style.width = `${snapshot.sceneWidth}px`;
  clone.style.height = `${snapshot.sceneHeight}px`;
  clone.style.minWidth = `${snapshot.sceneWidth}px`;
  clone.style.minHeight = `${snapshot.sceneHeight}px`;
  for (const toolbar of Array.from(clone.querySelectorAll(".mdspec-zoom-toolbar"))) {
    toolbar.remove();
  }
  for (const details of Array.from(
    clone.querySelectorAll(
      ".mdspec-related-list, .mdspec-connections, .mdspec-relations-table"
    )
  )) {
    details.remove();
  }
  const root = clone.closest("section");
  if (root instanceof HTMLElement) {
    root.style.background = "#ffffff";
  }
  const svgs = Array.from(clone.querySelectorAll("svg"));
  for (const svg of svgs) {
    svg.setAttribute("width", `${exportWidth}`);
    svg.setAttribute("height", `${exportHeight}`);
  }
}
function buildExportSvg(wrapper, exportWidth, exportHeight) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  svg.setAttribute("width", `${exportWidth}`);
  svg.setAttribute("height", `${exportHeight}`);
  svg.setAttribute("viewBox", `0 0 ${exportWidth} ${exportHeight}`);
  const foreignObject = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "foreignObject"
  );
  foreignObject.setAttribute("x", "0");
  foreignObject.setAttribute("y", "0");
  foreignObject.setAttribute("width", `${exportWidth}`);
  foreignObject.setAttribute("height", `${exportHeight}`);
  foreignObject.appendChild(wrapper);
  svg.appendChild(foreignObject);
  return svg;
}
function readSceneSize(datasetValue, styleValue) {
  const preferred = Number.parseFloat(datasetValue ?? "");
  if (Number.isFinite(preferred) && preferred > 0) {
    return preferred;
  }
  const fallback = Number.parseFloat(styleValue);
  return Number.isFinite(fallback) && fallback > 0 ? fallback : null;
}
function measureMermaidContentBounds(svg) {
  const candidates = [
    svg.querySelector("g.output"),
    svg.querySelector("g.root"),
    svg.querySelector("g.flowchart"),
    svg.querySelector("svg > g"),
    svg.querySelector("g")
  ].filter((value) => Boolean(value));
  for (const candidate of candidates) {
    const bbox = safeGetBBox(candidate);
    if (bbox) {
      return bbox;
    }
  }
  const svgBox = safeGetBBox(svg);
  if (svgBox) {
    return svgBox;
  }
  const rect = svg.getBoundingClientRect();
  if (Number.isFinite(rect.width) && Number.isFinite(rect.height) && rect.width > 0 && rect.height > 0) {
    return {
      x: 0,
      y: 0,
      width: rect.width,
      height: rect.height
    };
  }
  return null;
}
function safeGetBBox(element) {
  try {
    const bbox = element.getBBox();
    if (Number.isFinite(bbox.width) && Number.isFinite(bbox.height) && bbox.width > 0 && bbox.height > 0) {
      return {
        x: bbox.x,
        y: bbox.y,
        width: bbox.width,
        height: bbox.height
      };
    }
  } catch (error) {
    console.warn("[model-weave] PNG export: getBBox failed", { error });
  }
  return null;
}
async function ensureFolder(app, folderPath) {
  const existing = app.vault.getAbstractFileByPath(folderPath);
  if (existing) {
    return;
  }
  await app.vault.createFolder(folderPath);
}
function toExportFileName(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  const basename = normalized.split("/").pop() ?? normalized;
  return basename.replace(/\.md$/i, "") || "diagram";
}
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new DiagramExportError("Failed to render diagram image.", "render-failed"));
    image.src = url;
  });
}
function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      reject(new DiagramExportError("Failed to encode PNG image.", "encode-failed"));
    }, "image/png");
  });
}
function inlineComputedStyles(source, target) {
  const computed = window.getComputedStyle(source);
  applyComputedStyle(target.style, computed);
  const sourceChildren = Array.from(source.children);
  const targetChildren = Array.from(target.children);
  for (let index = 0; index < sourceChildren.length; index += 1) {
    const sourceChild = sourceChildren[index];
    const targetChild = targetChildren[index];
    if (sourceChild instanceof HTMLElement && targetChild instanceof HTMLElement) {
      inlineComputedStyles(sourceChild, targetChild);
      continue;
    }
    if (sourceChild instanceof SVGElement && targetChild instanceof SVGElement) {
      inlineSvgStyles(sourceChild, targetChild);
    }
  }
}
function inlineSvgStyles(source, target) {
  const computed = window.getComputedStyle(source);
  applyComputedStyle(target.style, computed);
  const sourceChildren = Array.from(source.children);
  const targetChildren = Array.from(target.children);
  for (let index = 0; index < sourceChildren.length; index += 1) {
    const sourceChild = sourceChildren[index];
    const targetChild = targetChildren[index];
    if (sourceChild instanceof SVGElement && targetChild instanceof SVGElement) {
      inlineSvgStyles(sourceChild, targetChild);
    } else if (sourceChild instanceof HTMLElement && targetChild instanceof HTMLElement) {
      inlineComputedStyles(sourceChild, targetChild);
    }
  }
}
function applyComputedStyle(style, computed) {
  for (let index = 0; index < computed.length; index += 1) {
    const property = computed.item(index);
    const value = computed.getPropertyValue(property);
    const priority = computed.getPropertyPriority(property);
    if (value) {
      style.setProperty(property, value, priority);
    }
  }
}
function waitForAnimationFrame() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

// src/templates/model-weave-templates.ts
var MODEL_WEAVE_TEMPLATES = {
  class: `---
type: class
id: CLS-
name:
kind: class
package:
stereotype:
tags:
  - Class
---

# 

## Summary



## Attributes

| name | type | visibility | static | notes |
|---|---|---|---|---|

## Methods

| name | parameters | returns | visibility | static | notes |
|---|---|---|---|---|---|

## Relations

| id | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|

## Notes

- `,
  classDiagram: `---
type: class_diagram
id: CLASSD-
name:
tags:
  - Class
  - Diagram
---

# 

## Summary



## Objects

| ref | notes |
|---|---|

## Relations

| id | from | to | kind | label | from_multiplicity | to_multiplicity | notes |
|---|---|---|---|---|---|---|---|

## Notes

- `,
  erEntity: `---
type: er_entity
id: ENT-
logical_name:
physical_name:
schema_name:
dbms:
tags:
  - ER
  - Entity
---

#  / 

## Overview

- purpose:
- notes:

## Columns

| logical_name | physical_name | data_type | length | scale | not_null | pk | encrypted | default_value | notes |
|---|---|---|---:|---:|---|---|---|---|---|

## Indexes

| index_name | index_type | unique | columns | notes |
|---|---|---|---|---|

## Relations

### REL-
- target_table: [[]]
- kind: fk
- cardinality:
- notes:

| local_column | target_column | notes |
|---|---|---|

## Notes

- `,
  erDiagram: `---
type: er_diagram
id: ERD-
name:
tags:
  - ER
  - Diagram
---

# 

## Summary



## Objects

| ref | notes |
|---|---|

## Notes

- `,
  dfdObject: `---
type: dfd_object
id: DFD-
name:
kind: process
tags:
  - DFD
---

# 

## Summary

## Notes
`,
  dfdDiagram: `---
type: dfd_diagram
id: DFD-
name:
level: 0
tags:
  - DFD
  - Diagram
---

# 

## Summary

## Objects

| ref | notes |
|---|---|
|  |  |

## Flows

| id | from | to | data | notes |
|---|---|---|---|---|
|  |  |  |  |  |

## Notes
`,
  dataObject: `---
type: data_object
id: DATA-
name:
kind: message
tags:
  - Data
---

# 

## Summary

## Fields

| name | type | required | ref | notes |
|---|---|---|---|---|
|  |  |  |  |  |

## Notes
`
};
var MODEL_WEAVE_RELATION_TEMPLATES = {
  erRelationBlock: [
    "### REL-",
    "- target_table: [[]]",
    "- kind: fk",
    "- cardinality:",
    "- notes:",
    "",
    "| local_column | target_column | notes |",
    "|---|---|---|"
  ]
};

// src/types/enums.ts
var CORE_OBJECT_KINDS = [
  "class",
  "entity",
  "interface",
  "enum",
  "component"
];
var RESERVED_OBJECT_KINDS = [
  "actor",
  "usecase"
];
var CORE_RELATION_KINDS = [
  "association",
  "dependency",
  "composition",
  "aggregation",
  "inheritance",
  "implementation",
  "reference",
  "flow"
];
var RESERVED_RELATION_KINDS = [
  "include",
  "extend",
  "transition",
  "message"
];

// src/parsers/object-parser.ts
var ATTRIBUTE_TABLE_HEADERS = [
  "name",
  "type",
  "visibility",
  "static",
  "notes"
];
var METHOD_TABLE_HEADERS = [
  "name",
  "parameters",
  "returns",
  "visibility",
  "static",
  "notes"
];
var LEGACY_RELATION_TABLE_HEADERS = [
  "id",
  "from",
  "to",
  "kind",
  "label",
  "from_multiplicity",
  "to_multiplicity",
  "notes"
];
var SPEC04_RELATION_TABLE_HEADERS = [
  "id",
  "to",
  "kind",
  "label",
  "from_multiplicity",
  "to_multiplicity",
  "notes"
];
function parseObjectFile(markdown, path) {
  const frontmatterResult = parseFrontmatter(markdown);
  const warnings = [...frontmatterResult.warnings];
  const frontmatter = frontmatterResult.file.frontmatter ?? {};
  const schema = getString(frontmatter, "schema");
  const type = getString(frontmatter, "type");
  const acceptsClassType = type === "class";
  if (detectFileType(frontmatter) !== "object" || !acceptsClassType && schema !== "model_object_v1") {
    warnings.push(
      createWarning4(
        "unknown-schema",
        `object parser expected schema "model_object_v1" or type "class" but received schema "${schema ?? "none"}" / type "${type ?? "none"}"`,
        path,
        acceptsClassType ? "type" : "schema"
      )
    );
    return {
      file: null,
      warnings
    };
  }
  const sections = extractMarkdownSections(frontmatterResult.file.body);
  const name = getString(frontmatter, "name");
  const rawKind = getString(frontmatter, "kind") ?? (acceptsClassType ? "class" : void 0);
  const summary = joinSectionLines(sections.Summary);
  const attributes = acceptsClassType ? parseAttributeTable(sections.Attributes, warnings, path) : parseAttributes(sections.Attributes, warnings, path);
  const methods = acceptsClassType ? parseMethodTable(sections.Methods, warnings, path) : parseMethods(sections.Methods, warnings, path);
  const relations = parseRelationsTable(
    sections.Relations,
    warnings,
    path,
    getClassObjectId(frontmatter, name)
  );
  if (!name) {
    warnings.push(
      createWarning4("missing-name", 'missing required field "name"', path, "name")
    );
  }
  if (!rawKind) {
    warnings.push(
      createWarning4("missing-kind", 'missing required field "kind"', path, "kind")
    );
  } else if (isReservedObjectKind(rawKind)) {
    warnings.push(
      createInfoWarning2(
        "reserved-kind-used",
        `reserved kind used: "${rawKind}"`,
        path,
        "kind"
      )
    );
  } else if (!isCoreObjectKind(rawKind)) {
    warnings.push(
      createWarning4("invalid-kind", `invalid kind "${rawKind}"`, path, "kind")
    );
  }
  const file = {
    fileType: "object",
    schema: "model_object_v1",
    path,
    title: getString(frontmatter, "title"),
    frontmatter,
    sections,
    name: name ?? getString(frontmatter, "id") ?? "unknown",
    kind: normalizeObjectKind(rawKind),
    description: summary || void 0,
    attributes,
    methods,
    relations
  };
  return {
    file,
    warnings
  };
}
function parseAttributes(lines, warnings, path) {
  if (!lines) {
    return [];
  }
  const attributes = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const match = trimmed.match(/^-\s+([^:]+?)\s*:\s*(.+?)(?:\s+-\s+(.+))?$/);
    if (!match) {
      warnings.push(
        createWarning4(
          "invalid-attribute-line",
          `malformed attribute line: "${trimmed}"`,
          path,
          "Attributes"
        )
      );
      continue;
    }
    const [, name, type, note] = match;
    attributes.push({
      name: name.trim(),
      type: type.trim(),
      description: note?.trim(),
      raw: trimmed
    });
  }
  return attributes;
}
function parseMethods(lines, warnings, path) {
  if (!lines) {
    return [];
  }
  const methods = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const match = trimmed.match(
      /^-\s+([A-Za-z_][\w]*)\(([^)]*)\)\s+([^\-].*?)(?:\s+-\s+(.+))?$/
    );
    if (!match) {
      warnings.push(
        createWarning4(
          "invalid-method-line",
          `malformed method line: "${trimmed}"`,
          path,
          "Methods"
        )
      );
      continue;
    }
    const [, name, rawParameters, rawReturnType, note] = match;
    methods.push({
      name,
      parameters: parseMethodParameters(rawParameters),
      returnType: rawReturnType.trim(),
      description: note?.trim(),
      raw: trimmed
    });
  }
  return methods;
}
function parseMethodParameters(rawParameters) {
  const trimmed = rawParameters.trim();
  if (!trimmed) {
    return [];
  }
  return trimmed.split(",").map((parameter) => {
    const value = parameter.trim();
    const match = value.match(/^([A-Za-z_][\w]*)(\?)?\s*:\s*(.+)$/);
    if (!match) {
      return {
        name: value,
        required: true
      };
    }
    const [, name, optionalFlag, type] = match;
    return {
      name,
      type: type.trim(),
      required: optionalFlag !== "?"
    };
  });
}
function parseAttributeTable(lines, warnings, path) {
  const table = parseMarkdownTable(
    lines,
    [...ATTRIBUTE_TABLE_HEADERS],
    path,
    "Attributes"
  );
  warnings.push(...table.warnings);
  return table.rows.map((row) => ({
    name: getTableValue(row, "name"),
    type: optionalTableValue(row, "type"),
    visibility: normalizeVisibility(optionalTableValue(row, "visibility")),
    description: optionalTableValue(row, "notes"),
    raw: JSON.stringify(row)
  }));
}
function parseMethodTable(lines, warnings, path) {
  const table = parseMarkdownTable(
    lines,
    [...METHOD_TABLE_HEADERS],
    path,
    "Methods"
  );
  warnings.push(...table.warnings);
  return table.rows.map((row) => ({
    name: getTableValue(row, "name"),
    parameters: parseMethodParameters(getTableValue(row, "parameters")),
    returnType: optionalTableValue(row, "returns"),
    visibility: normalizeVisibility(optionalTableValue(row, "visibility")),
    isStatic: normalizeBoolean(optionalTableValue(row, "static")),
    description: optionalTableValue(row, "notes"),
    raw: JSON.stringify(row)
  }));
}
function parseRelationsTable(lines, warnings, path, currentClassId) {
  const relations = [];
  const table = parseClassRelationsTable(lines, path);
  warnings.push(...table.warnings);
  for (const row of table.rows) {
    const id = getTableValue(row, "id");
    const to = normalizeReferenceTarget(getTableValue(row, "to"));
    const kind = getTableValue(row, "kind");
    const from = table.format === "legacy" ? normalizeReferenceTarget(getTableValue(row, "from")) : normalizeReferenceTarget(currentClassId);
    if (!id || !from || !to || !kind) {
      warnings.push(
        createWarning4(
          "invalid-table-row",
          `Relations row is missing required values: ${JSON.stringify(row)}`,
          path,
          "Relations"
        )
      );
      continue;
    }
    if (table.format === "legacy") {
      if (from === normalizeReferenceTarget(currentClassId)) {
        warnings.push(
          createInfoWarning2(
            "legacy-class-relation-format",
            `Legacy class relation format with explicit "from" was accepted for relation "${id}".`,
            path,
            "Relations"
          )
        );
      } else {
        warnings.push(
          createWarning4(
            "legacy-class-relation-from-mismatch",
            `Legacy class relation "from" does not match the current class id for relation "${id}".`,
            path,
            "Relations"
          )
        );
      }
    }
    relations.push({
      domain: "class",
      id,
      source: from,
      target: to,
      sourceClass: from,
      targetClass: to,
      kind,
      label: optionalTableValue(row, "label"),
      fromMultiplicity: optionalTableValue(row, "from_multiplicity"),
      toMultiplicity: optionalTableValue(row, "to_multiplicity"),
      notes: optionalTableValue(row, "notes")
    });
  }
  return relations;
}
function parseClassRelationsTable(lines, path) {
  if (!lines) {
    return { rows: [], warnings: [], format: "spec04" };
  }
  const normalizedLines = lines.map((line) => line.trim()).filter((line) => line.startsWith("|"));
  if (normalizedLines.length < 2) {
    return {
      rows: [],
      warnings: normalizedLines.length === 0 ? [] : [
        createWarning4(
          "invalid-table-row",
          'table in section "Relations" is incomplete',
          path,
          "Relations"
        )
      ],
      format: "spec04"
    };
  }
  const headers = splitMarkdownTableRow(normalizedLines[0]) ?? [];
  const format = sameHeaders2(headers, [...SPEC04_RELATION_TABLE_HEADERS]) ? "spec04" : sameHeaders2(headers, [...LEGACY_RELATION_TABLE_HEADERS]) ? "legacy" : "spec04";
  const warnings = [];
  if (!sameHeaders2(headers, [...SPEC04_RELATION_TABLE_HEADERS]) && !sameHeaders2(headers, [...LEGACY_RELATION_TABLE_HEADERS])) {
    warnings.push(
      createWarning4(
        "invalid-table-column",
        'table columns in section "Relations" do not match supported class relation headers',
        path,
        "Relations"
      )
    );
  }
  const rows = [];
  for (const rowLine of normalizedLines.slice(2)) {
    const values = splitMarkdownTableRow(rowLine) ?? [];
    if (values.every((value) => !value.trim())) {
      continue;
    }
    if (values.length !== headers.length) {
      warnings.push(
        createWarning4(
          "invalid-table-row",
          `table row in section "Relations" has ${values.length} columns, expected ${headers.length}`,
          path,
          "Relations"
        )
      );
      continue;
    }
    const row = {};
    for (const [index, header] of headers.entries()) {
      row[header] = values[index] ?? "";
    }
    rows.push(row);
  }
  return { rows, warnings, format };
}
function sameHeaders2(actual, expected) {
  if (actual.length !== expected.length) {
    return false;
  }
  return actual.every((header, index) => header === expected[index]);
}
function getTableValue(row, key) {
  return row[key]?.trim() ?? "";
}
function optionalTableValue(row, key) {
  const value = getTableValue(row, key);
  return value || void 0;
}
function normalizeVisibility(value) {
  switch (value) {
    case "public":
    case "protected":
    case "private":
    case "package":
      return value;
    default:
      return void 0;
  }
}
function normalizeBoolean(value) {
  if (!value) {
    return void 0;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "y" || normalized === "yes") {
    return true;
  }
  if (normalized === "false" || normalized === "n" || normalized === "no") {
    return false;
  }
  return void 0;
}
function joinSectionLines(lines) {
  if (!lines) {
    return "";
  }
  return lines.map((line) => line.trim()).filter(Boolean).join("\n");
}
function getString(frontmatter, key) {
  const value = frontmatter[key];
  return typeof value === "string" && value.trim() ? value.trim() : void 0;
}
function normalizeObjectKind(kind) {
  if (kind && (isCoreObjectKind(kind) || isReservedObjectKind(kind))) {
    return kind;
  }
  return "class";
}
function getClassObjectId(frontmatter, name) {
  return getString(frontmatter, "id") ?? name ?? "unknown";
}
function isCoreObjectKind(kind) {
  return CORE_OBJECT_KINDS.includes(kind);
}
function isReservedObjectKind(kind) {
  return RESERVED_OBJECT_KINDS.includes(kind);
}
function createWarning4(code, message, path, field) {
  return {
    code,
    message,
    severity: "warning",
    path,
    field
  };
}
function createInfoWarning2(code, message, path, field) {
  return {
    code,
    message,
    severity: "info",
    path,
    field
  };
}

// src/parsers/relations-parser.ts
function parseRelationsFile(markdown, path) {
  const frontmatterResult = parseFrontmatter(markdown);
  const warnings = [...frontmatterResult.warnings];
  const frontmatter = frontmatterResult.file.frontmatter ?? {};
  const schema = getString2(frontmatter, "schema");
  if (detectFileType(frontmatter) !== "relations" || schema !== "model_relations_v1") {
    warnings.push(
      createWarning5(
        "unknown-schema",
        `relations parser expected schema "model_relations_v1" but received "${schema ?? "none"}"`,
        path,
        "schema"
      )
    );
    return {
      file: null,
      warnings
    };
  }
  const sections = extractMarkdownSections(frontmatterResult.file.body);
  if (!sections.Relations) {
    warnings.push(
      createInfoWarning3(
        "section-missing",
        'section missing: "Relations"',
        path,
        "Relations"
      )
    );
  }
  const relations = parseRelationsSection(sections.Relations, warnings, path);
  return {
    file: {
      fileType: "relations",
      schema: "model_relations_v1",
      path,
      title: getString2(frontmatter, "title"),
      frontmatter,
      sections,
      relations
    },
    warnings
  };
}
function parseRelationsSection(lines, warnings, path) {
  if (!lines) {
    return [];
  }
  const relations = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const record = parseRelationRecord(trimmed);
    if (!record) {
      warnings.push(
        createWarning5(
          "invalid-relation-record",
          `malformed relation record: "${trimmed}"`,
          path,
          "Relations"
        )
      );
      continue;
    }
    const missingFields = ["id", "from", "to", "kind"].filter(
      (field) => !record[field]
    );
    if (missingFields.length > 0) {
      warnings.push(
        createWarning5(
          "invalid-relation-record",
          `malformed relation record: missing ${missingFields.join(", ")}`,
          path,
          "Relations"
        )
      );
      continue;
    }
    const rawKind = record.kind;
    if (isReservedRelationKind(rawKind)) {
      warnings.push(
        createInfoWarning3(
          "reserved-relation-kind-used",
          `reserved kind used: "${rawKind}"`,
          path,
          "kind"
        )
      );
    } else if (!isCoreRelationKind(rawKind)) {
      warnings.push(
        createWarning5(
          "invalid-relation-kind",
          `invalid relation kind "${rawKind}"`,
          path,
          "kind"
        )
      );
    }
    relations.push({
      id: record.id,
      source: record.from,
      target: record.to,
      kind: normalizeRelationKind(rawKind),
      label: typeof record.label === "string" ? record.label : void 0,
      sourceCardinality: typeof record.from_multiplicity === "string" ? record.from_multiplicity : void 0,
      targetCardinality: typeof record.to_multiplicity === "string" ? record.to_multiplicity : void 0,
      metadata: {
        raw: trimmed
      }
    });
  }
  return relations;
}
function parseRelationRecord(line) {
  const bulletMatch = line.match(/^-\s+(.+)$/);
  if (!bulletMatch) {
    return null;
  }
  const record = {};
  for (const part of bulletMatch[1].split(",")) {
    const segment = part.trim();
    if (!segment) {
      continue;
    }
    const match = segment.match(/^([A-Za-z_][\w]*)\s*:\s*(.+)$/);
    if (!match) {
      return null;
    }
    const [, key, value] = match;
    record[key] = value.trim();
  }
  return record;
}
function getString2(frontmatter, key) {
  const value = frontmatter[key];
  return typeof value === "string" && value.trim() ? value.trim() : void 0;
}
function isCoreRelationKind(kind) {
  return CORE_RELATION_KINDS.includes(kind);
}
function isReservedRelationKind(kind) {
  return RESERVED_RELATION_KINDS.includes(kind);
}
function normalizeRelationKind(kind) {
  if (isCoreRelationKind(kind) || isReservedRelationKind(kind)) {
    return kind;
  }
  return "association";
}
function createWarning5(code, message, path, field) {
  return {
    code,
    message,
    severity: "warning",
    path,
    field
  };
}
function createInfoWarning3(code, message, path, field) {
  return {
    code,
    message,
    severity: "info",
    path,
    field
  };
}

// src/parsers/diagram-parser.ts
var ER_DIAGRAM_OBJECT_HEADERS = ["ref", "notes"];
var CLASS_DIAGRAM_OBJECT_HEADERS = ["ref", "notes"];
var CLASS_DIAGRAM_RELATION_HEADERS = [
  "id",
  "from",
  "to",
  "kind",
  "label",
  "from_multiplicity",
  "to_multiplicity",
  "notes"
];
function parseDiagramFile(markdown, path) {
  const frontmatterResult = parseFrontmatter(markdown);
  const warnings = [...frontmatterResult.warnings];
  const frontmatter = frontmatterResult.file.frontmatter ?? {};
  const type = getString3(frontmatter, "type");
  const acceptsErDiagramType = type === "er_diagram";
  const acceptsClassDiagramType = type === "class_diagram";
  if (detectFileType(frontmatter) !== "diagram" || !acceptsErDiagramType && !acceptsClassDiagramType) {
    warnings.push(
      createWarning6(
        "unknown-schema",
        `diagram parser expected type "er_diagram" or "class_diagram" but received type "${type ?? "none"}"`,
        path,
        "type"
      )
    );
    return {
      file: null,
      warnings
    };
  }
  const sections = extractMarkdownSections(frontmatterResult.file.body);
  const name = getString3(frontmatter, "name");
  const objectRows = acceptsErDiagramType ? parseErDiagramObjects(sections.Objects, warnings, path) : acceptsClassDiagramType ? parseClassDiagramObjects(sections.Objects, warnings, path) : null;
  const objectRefs = objectRows ? objectRows.map((row) => row.ref) : [];
  const classDiagramRelations = acceptsClassDiagramType ? parseClassDiagramRelations(sections.Relations, warnings, path) : [];
  const nodes = objectRows ? objectRows.map(
    (row) => ({
      id: row.ref,
      ref: row.ref,
      metadata: row.notes ? { notes: row.notes } : void 0
    })
  ) : objectRefs.map((ref) => ({
    id: normalizeReferenceTarget(ref),
    ref
  }));
  if (!name) {
    warnings.push(
      createWarning6("missing-name", 'missing required field "name"', path, "name")
    );
  }
  if (!sections.Objects) {
    warnings.push(
      createInfoWarning4(
        "section-missing",
        'section missing: "Objects"',
        path,
        "Objects"
      )
    );
  }
  return {
    file: {
      fileType: "diagram",
      schema: acceptsErDiagramType ? "er_diagram" : "class_diagram",
      path,
      title: getString3(frontmatter, "title"),
      frontmatter,
      sections,
      name: name ?? getString3(frontmatter, "id") ?? "unknown",
      kind: acceptsErDiagramType ? "er" : "class",
      objectRefs,
      nodes,
      edges: acceptsClassDiagramType ? classDiagramRelations.map(classRelationToDiagramEdge) : []
    },
    warnings
  };
}
function parseErDiagramObjects(lines, warnings, path) {
  const table = parseMarkdownTable(
    lines,
    [...ER_DIAGRAM_OBJECT_HEADERS],
    path,
    "Objects"
  );
  warnings.push(...table.warnings);
  const objects = [];
  for (const row of table.rows) {
    const ref = row.ref?.trim();
    if (!ref) {
      warnings.push(
        createWarning6(
          "invalid-object-ref",
          'table row in section "Objects" is missing "ref"',
          path,
          "Objects"
        )
      );
      continue;
    }
    const notes = row.notes?.trim();
    objects.push({
      ref,
      notes: notes ? notes : void 0
    });
  }
  return objects;
}
function parseClassDiagramObjects(lines, warnings, path) {
  const table = parseMarkdownTable(
    lines,
    [...CLASS_DIAGRAM_OBJECT_HEADERS],
    path,
    "Objects"
  );
  warnings.push(...table.warnings);
  const objects = [];
  for (const row of table.rows) {
    const rawRef = row.ref?.trim();
    if (!rawRef) {
      warnings.push(
        createWarning6(
          "invalid-object-ref",
          'table row in section "Objects" is missing "ref"',
          path,
          "Objects"
        )
      );
      continue;
    }
    objects.push({
      ref: normalizeReferenceTarget(rawRef),
      notes: row.notes?.trim() || void 0
    });
  }
  return objects;
}
function parseClassDiagramRelations(lines, warnings, path) {
  if (!hasNonEmptyTableDataRows(lines)) {
    return [];
  }
  const table = parseMarkdownTable(
    lines,
    [...CLASS_DIAGRAM_RELATION_HEADERS],
    path,
    "Relations"
  );
  warnings.push(...table.warnings);
  const relations = [];
  for (const row of table.rows) {
    const id = row.id?.trim();
    const from = normalizeReferenceTarget(row.from?.trim() ?? "");
    const to = normalizeReferenceTarget(row.to?.trim() ?? "");
    const kind = row.kind?.trim();
    if (!id || !from || !to || !kind) {
      warnings.push(
        createWarning6(
          "invalid-table-row",
          `table row in section "Relations" is missing required values`,
          path,
          "Relations"
        )
      );
      continue;
    }
    relations.push({
      domain: "class",
      id,
      source: from,
      target: to,
      sourceClass: from,
      targetClass: to,
      kind,
      label: row.label?.trim() || void 0,
      fromMultiplicity: row.from_multiplicity?.trim() || void 0,
      toMultiplicity: row.to_multiplicity?.trim() || void 0,
      notes: row.notes?.trim() || void 0
    });
  }
  return relations;
}
function hasNonEmptyTableDataRows(lines) {
  if (!lines) {
    return false;
  }
  const tableLines = lines.map((line) => line.trim()).filter((line) => line.startsWith("|"));
  if (tableLines.length <= 2) {
    return false;
  }
  return tableLines.slice(2).some(
    (line) => line.replace(/^\|/, "").replace(/\|$/, "").split("|").some((cell) => cell.trim().length > 0)
  );
}
function classRelationToDiagramEdge(relation) {
  return {
    id: relation.id,
    source: relation.sourceClass,
    target: relation.targetClass,
    kind: relation.kind,
    label: relation.label,
    metadata: {
      notes: relation.notes,
      sourceCardinality: relation.fromMultiplicity,
      targetCardinality: relation.toMultiplicity
    }
  };
}
function getString3(frontmatter, key) {
  const value = frontmatter[key];
  return typeof value === "string" && value.trim() ? value.trim() : void 0;
}
function createWarning6(code, message, path, field) {
  return {
    code,
    message,
    severity: "warning",
    path,
    field
  };
}
function createInfoWarning4(code, message, path, field) {
  return {
    code,
    message,
    severity: "info",
    path,
    field
  };
}

// src/parsers/dfd-diagram-parser.ts
var OBJECT_HEADERS = ["ref", "notes"];
var FLOW_HEADERS = ["id", "from", "to", "data", "notes"];
function parseDfdDiagramFile(markdown, path) {
  const frontmatterResult = parseFrontmatter(markdown);
  const frontmatter = frontmatterResult.file.frontmatter ?? {};
  const sections = extractMarkdownSections(frontmatterResult.file.body);
  const warnings = frontmatterResult.warnings.map((warning) => ({
    ...warning,
    path: warning.path ?? path
  }));
  const id = typeof frontmatter.id === "string" ? frontmatter.id.trim() : "";
  const name = typeof frontmatter.name === "string" ? frontmatter.name.trim() : "";
  const level = typeof frontmatter.level === "string" || typeof frontmatter.level === "number" ? String(frontmatter.level).trim() : void 0;
  if (frontmatter.type !== "dfd_diagram") {
    warnings.push(createWarning7(path, "type", 'expected type "dfd_diagram"'));
  }
  if (!id) {
    warnings.push(createWarning7(path, "id", 'required frontmatter "id" is missing'));
  }
  if (!name) {
    warnings.push(createWarning7(path, "name", 'required frontmatter "name" is missing'));
  }
  const objectsTable = parseMarkdownTable(sections.Objects, OBJECT_HEADERS, path, "Objects");
  const flowsTable = parseMarkdownTable(sections.Flows, FLOW_HEADERS, path, "Flows");
  warnings.push(...objectsTable.warnings, ...flowsTable.warnings);
  const fallbackTitle = name || id || getFileStem3(path) || "Untitled DFD Diagram";
  const objectRefs = objectsTable.rows.map((row) => row.ref?.trim() ?? "").filter(Boolean);
  const nodes = objectRefs.map((ref) => ({
    id: ref,
    ref,
    kind: "process"
  }));
  const flows = [];
  const edges = [];
  flowsTable.rows.forEach((row, rowIndex) => {
    const from = row.from?.trim() ?? "";
    const to = row.to?.trim() ?? "";
    const data = row.data?.trim() ?? "";
    const notes = row.notes?.trim() ?? "";
    const flowId = row.id?.trim() ?? "";
    flows.push({
      id: flowId || void 0,
      from,
      to,
      data: data || void 0,
      dataRef: data ? parseReferenceValue(data) ?? void 0 : void 0,
      notes: notes || void 0,
      rowIndex
    });
    edges.push({
      id: flowId || void 0,
      source: from,
      target: to,
      kind: "flow",
      label: data || void 0,
      metadata: {
        notes: notes || void 0,
        rowIndex
      }
    });
  });
  return {
    file: {
      fileType: "dfd-diagram",
      schema: "dfd_diagram",
      path,
      title: fallbackTitle,
      frontmatter,
      sections,
      id,
      name: name || fallbackTitle,
      kind: "dfd",
      level,
      description: joinSectionLines2(sections.Summary),
      objectRefs,
      nodes,
      edges,
      flows
    },
    warnings
  };
}
function getFileStem3(path) {
  return path.replace(/\\/g, "/").split("/").pop()?.replace(/\.md$/i, "") ?? "";
}
function joinSectionLines2(lines) {
  const value = (lines ?? []).join("\n").trim();
  return value || void 0;
}
function createWarning7(path, field, message) {
  return {
    code: "invalid-structure",
    message,
    severity: "warning",
    path,
    field
  };
}

// src/parsers/dfd-object-parser.ts
var DFD_OBJECT_KINDS = /* @__PURE__ */ new Set(["external", "process", "datastore"]);
function parseDfdObjectFile(markdown, path) {
  const frontmatterResult = parseFrontmatter(markdown);
  const frontmatter = frontmatterResult.file.frontmatter ?? {};
  const sections = extractMarkdownSections(frontmatterResult.file.body);
  const warnings = frontmatterResult.warnings.map((warning) => ({
    ...warning,
    path: warning.path ?? path
  }));
  const id = typeof frontmatter.id === "string" ? frontmatter.id.trim() : "";
  const name = typeof frontmatter.name === "string" ? frontmatter.name.trim() : "";
  const rawKind = typeof frontmatter.kind === "string" ? frontmatter.kind.trim() : "";
  if (frontmatter.type !== "dfd_object") {
    warnings.push(createWarning8(path, "type", 'expected type "dfd_object"'));
  }
  if (!id) {
    warnings.push(createWarning8(path, "id", 'required frontmatter "id" is missing'));
  }
  if (!name) {
    warnings.push(createWarning8(path, "name", 'required frontmatter "name" is missing'));
  }
  if (!rawKind) {
    warnings.push(createWarning8(path, "kind", 'required frontmatter "kind" is missing'));
  } else if (!DFD_OBJECT_KINDS.has(rawKind)) {
    warnings.push({
      code: "invalid-kind",
      message: `invalid dfd_object kind "${rawKind}"`,
      severity: "warning",
      path,
      field: "kind"
    });
  }
  const fallbackName = name || id || getFileStem4(path) || "Untitled DFD Object";
  const normalizedKind = DFD_OBJECT_KINDS.has(rawKind) ? rawKind : "process";
  return {
    file: {
      fileType: "dfd-object",
      schema: "dfd_object",
      path,
      title: fallbackName,
      frontmatter,
      sections,
      id,
      name: fallbackName,
      kind: normalizedKind,
      summary: joinSectionLines3(sections.Summary),
      notes: normalizeNotes(sections.Notes)
    },
    warnings
  };
}
function getFileStem4(path) {
  return path.replace(/\\/g, "/").split("/").pop()?.replace(/\.md$/i, "") ?? "";
}
function joinSectionLines3(lines) {
  const value = (lines ?? []).join("\n").trim();
  return value || void 0;
}
function normalizeNotes(lines) {
  const notes = (lines ?? []).map((line) => line.trim()).filter(Boolean).map((line) => line.replace(/^-\s+/, ""));
  return notes.length > 0 ? notes : void 0;
}
function createWarning8(path, field, message) {
  return {
    code: "invalid-structure",
    message,
    severity: "warning",
    path,
    field
  };
}

// src/parsers/data-object-parser.ts
var FIELD_HEADERS = ["name", "type", "required", "ref", "notes"];
function parseDataObjectFile(markdown, path) {
  const frontmatterResult = parseFrontmatter(markdown);
  const frontmatter = frontmatterResult.file.frontmatter ?? {};
  const sections = extractMarkdownSections(frontmatterResult.file.body);
  const warnings = frontmatterResult.warnings.map((warning) => ({
    ...warning,
    path: warning.path ?? path
  }));
  const id = typeof frontmatter.id === "string" ? frontmatter.id.trim() : "";
  const name = typeof frontmatter.name === "string" ? frontmatter.name.trim() : "";
  const kind = typeof frontmatter.kind === "string" ? frontmatter.kind.trim() : "";
  if (frontmatter.type !== "data_object") {
    warnings.push(createWarning9(path, "type", 'expected type "data_object"'));
  }
  if (!id) {
    warnings.push(createWarning9(path, "id", 'required frontmatter "id" is missing'));
  }
  if (!name) {
    warnings.push(createWarning9(path, "name", 'required frontmatter "name" is missing'));
  }
  const fieldsTable = parseMarkdownTable(sections.Fields, FIELD_HEADERS, path, "Fields");
  warnings.push(...fieldsTable.warnings);
  const fallbackName = name || id || getFileStem5(path) || "Untitled Data Object";
  const fields = fieldsTable.rows.map((row) => ({
    name: row.name?.trim() ?? "",
    type: row.type?.trim() || void 0,
    required: row.required?.trim() || void 0,
    ref: row.ref?.trim() || void 0,
    notes: row.notes?.trim() || void 0
  }));
  return {
    file: {
      fileType: "data-object",
      schema: "data_object",
      path,
      title: fallbackName,
      frontmatter,
      sections,
      id,
      name: fallbackName,
      kind: kind || void 0,
      summary: joinSectionLines4(sections.Summary),
      notes: normalizeNotes2(sections.Notes),
      fields
    },
    warnings
  };
}
function getFileStem5(path) {
  return path.replace(/\\/g, "/").split("/").pop()?.replace(/\.md$/i, "") ?? "";
}
function joinSectionLines4(lines) {
  const value = (lines ?? []).join("\n").trim();
  return value || void 0;
}
function normalizeNotes2(lines) {
  const notes = (lines ?? []).map((line) => line.trim()).filter(Boolean).map((line) => line.replace(/^-\s+/, ""));
  return notes.length > 0 ? notes : void 0;
}
function createWarning9(path, field, message) {
  return {
    code: "invalid-structure",
    message,
    severity: "warning",
    path,
    field
  };
}

// src/core/validator.ts
var RESERVED_OBJECT_KINDS2 = /* @__PURE__ */ new Set(["actor", "usecase"]);
var RESERVED_RELATION_KINDS2 = /* @__PURE__ */ new Set([
  "include",
  "extend",
  "transition",
  "message"
]);
var RESERVED_DIAGRAM_KINDS = /* @__PURE__ */ new Set(["usecase", "activity", "sequence"]);
function validateVaultIndex(index) {
  const warnings = [];
  const idRegistry = /* @__PURE__ */ new Map();
  for (const [objectId, object] of Object.entries(index.objectsById)) {
    registerId(idRegistry, objectId, object.path, warnings);
    validateFilenameMatchesId(objectId, object.path, warnings);
    validateReservedObjectKind(object, objectId, warnings);
  }
  for (const [entityId, entity] of Object.entries(index.erEntitiesById)) {
    registerId(idRegistry, entityId, entity.path, warnings);
    validateFilenameMatchesId(entityId, entity.path, warnings);
  }
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
      if (RESERVED_RELATION_KINDS2.has(relation.kind)) {
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
function validateDiagram(diagram, index, warnings) {
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
    if (diagram.kind === "dfd" && (!resolveDfdObjectReference(objectRef, index) || identity.resolvedModelType !== "dfd-object") || diagram.kind !== "dfd" && !resolveObjectModelReference(objectRef, index) && !resolveErEntityReference(objectRef, index)) {
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
      diagram.objectRefs.flatMap(
        (objectRef) => buildReferenceIdentityKeys(resolveReferenceIdentity(objectRef, index))
      )
    );
    for (const edge of diagram.edges) {
      const sourceIdentity = edge.source ? resolveReferenceIdentity(edge.source, index) : null;
      const sourceResolved = !!edge.source && !!resolveDfdObjectReference(edge.source, index) && sourceIdentity?.resolvedModelType === "dfd-object";
      if (!sourceResolved) {
        warnings.push({
          code: "unresolved-reference",
          message: `unresolved flow source "${edge.source}"`,
          severity: "warning",
          path: diagram.path,
          field: "Flows"
        });
      } else if (!buildReferenceIdentityKeys(sourceIdentity).some(
        (key) => objectRefIdentityKeys.has(key)
      )) {
        warnings.push({
          code: "unresolved-reference",
          message: `flow source "${edge.source}" is not listed in "Objects"`,
          severity: "warning",
          path: diagram.path,
          field: "Flows"
        });
      }
      const targetIdentity = edge.target ? resolveReferenceIdentity(edge.target, index) : null;
      const targetResolved = !!edge.target && !!resolveDfdObjectReference(edge.target, index) && targetIdentity?.resolvedModelType === "dfd-object";
      if (!targetResolved) {
        warnings.push({
          code: "unresolved-reference",
          message: `unresolved flow target "${edge.target}"`,
          severity: "warning",
          path: diagram.path,
          field: "Flows"
        });
      } else if (!buildReferenceIdentityKeys(targetIdentity).some(
        (key) => objectRefIdentityKeys.has(key)
      )) {
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
function validateDataObject(dataObject, index, warnings) {
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
function validateReservedObjectKind(object, objectId, warnings) {
  if (!RESERVED_OBJECT_KINDS2.has(object.kind)) {
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
function validateRelationEndpoints(source, target, path, index, warnings) {
  if (!resolveObjectModelReference(source, index) || !resolveObjectModelReference(target, index)) {
    warnings.push({
      code: "unresolved-reference",
      message: `unresolved relation endpoint: "${source}" -> "${target}"`,
      severity: "warning",
      path,
      field: "relations"
    });
  }
}
function registerId(registry, id, path, warnings) {
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
function validateFilenameMatchesId(id, path, warnings) {
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
function dedupeWarnings(warnings) {
  return warnings.filter((warning, index) => {
    return warnings.findIndex(
      (entry) => entry.code === warning.code && entry.message === warning.message && entry.path === warning.path && entry.field === warning.field
    ) === index;
  });
}

// src/core/vault-index.ts
function buildVaultIndex(files) {
  const index = {
    sourceFilesByPath: {},
    objectsById: {},
    dataObjectsById: {},
    dfdObjectsById: {},
    erEntitiesById: {},
    erEntitiesByPhysicalName: {},
    relationsFilesById: {},
    diagramsById: {},
    modelsByFilePath: {},
    relationsById: {},
    relationsByObjectId: {},
    warningsByFilePath: {}
  };
  for (const file of files) {
    index.sourceFilesByPath[file.path] = file;
    indexSingleFile(index, file);
  }
  rebuildReferenceLookups(index);
  for (const warning of validateVaultIndex(index)) {
    pushWarning(index.warningsByFilePath, warning.path ?? "vault", warning);
  }
  return index;
}
function indexSingleFile(index, file) {
  const parseResult = parseVaultFile(file);
  for (const warning of parseResult.warnings) {
    pushWarning(index.warningsByFilePath, file.path, {
      ...warning,
      path: warning.path ?? file.path
    });
  }
  if (!parseResult.file) {
    return;
  }
  index.modelsByFilePath[file.path] = parseResult.file;
  switch (parseResult.file.fileType) {
    case "object": {
      const objectId = getModelId(parseResult.file);
      addModelById(
        index.objectsById,
        objectId,
        parseResult.file,
        index.warningsByFilePath,
        file.path
      );
      break;
    }
    case "relations": {
      const relationsFileId = getModelId(parseResult.file);
      addModelById(
        index.relationsFilesById,
        relationsFileId,
        parseResult.file,
        index.warningsByFilePath,
        file.path
      );
      for (const relation of parseResult.file.relations) {
        if (relation.id) {
          addModelById(
            index.relationsById,
            relation.id,
            relation,
            index.warningsByFilePath,
            file.path
          );
        }
      }
      break;
    }
    case "diagram": {
      const diagramId = getModelId(parseResult.file);
      addModelById(
        index.diagramsById,
        diagramId,
        parseResult.file,
        index.warningsByFilePath,
        file.path
      );
      break;
    }
    case "dfd-object": {
      addModelById(
        index.dfdObjectsById,
        parseResult.file.id,
        parseResult.file,
        index.warningsByFilePath,
        file.path
      );
      break;
    }
    case "data-object": {
      addModelById(
        index.dataObjectsById,
        parseResult.file.id,
        parseResult.file,
        index.warningsByFilePath,
        file.path
      );
      break;
    }
    case "dfd-diagram": {
      addModelById(
        index.diagramsById,
        parseResult.file.id,
        parseResult.file,
        index.warningsByFilePath,
        file.path
      );
      break;
    }
    case "er-entity": {
      addModelById(
        index.erEntitiesById,
        parseResult.file.id,
        parseResult.file,
        index.warningsByFilePath,
        file.path
      );
      addModelById(
        index.erEntitiesByPhysicalName,
        parseResult.file.physicalName,
        parseResult.file,
        index.warningsByFilePath,
        file.path
      );
      break;
    }
    case "markdown":
      break;
  }
}
function rebuildReferenceLookups(index) {
  index.relationsByObjectId = {};
  for (const model of Object.values(index.modelsByFilePath)) {
    if (model.fileType === "relations") {
      for (const relation of model.relations) {
        const sourceObject = resolveObjectModelReference(relation.source, index);
        const targetObject = resolveObjectModelReference(relation.target, index);
        addRelationForObject(
          index.relationsByObjectId,
          getRelationObjectKey(relation.source, sourceObject),
          relation
        );
        addRelationForObject(
          index.relationsByObjectId,
          getRelationObjectKey(relation.target, targetObject),
          relation
        );
      }
    }
  }
}
function parseVaultFile(file) {
  const frontmatterResult = parseFrontmatter(file.content);
  const frontmatter = frontmatterResult.file.frontmatter;
  if (frontmatter?.type === "data_object") {
    return parseDataObjectFile(file.content, file.path);
  }
  const fileType = detectFileType(frontmatter);
  switch (fileType) {
    case "object":
      return parseObjectFile(file.content, file.path);
    case "dfd-object":
      return parseDfdObjectFile(file.content, file.path);
    case "relations":
      return parseRelationsFile(file.content, file.path);
    case "diagram":
      return parseDiagramFile(file.content, file.path);
    case "dfd-diagram":
      return parseDfdDiagramFile(file.content, file.path);
    case "er-entity":
      return parseErEntityFile(file.content, file.path);
    case "markdown":
    default:
      return {
        file: createMarkdownModel(file.path, frontmatterResult.file.body, frontmatter),
        warnings: frontmatterResult.warnings
      };
  }
}
function createMarkdownModel(path, body, frontmatter) {
  return {
    fileType: "markdown",
    path,
    title: typeof frontmatter?.title === "string" ? frontmatter.title : void 0,
    frontmatter: frontmatter ?? {},
    sections: extractMarkdownSections(body),
    content: body
  };
}
function addModelById(target, id, model, warningsByFilePath, path) {
  if (!target[id]) {
    target[id] = model;
    return;
  }
  pushWarning(warningsByFilePath, path, {
    code: "invalid-structure",
    message: `duplicate id detected: "${id}"`,
    severity: "warning",
    path,
    field: "id"
  });
}
function addRelationForObject(relationsByObjectId, objectId, relation) {
  if (!objectId.trim()) {
    return;
  }
  if (!relationsByObjectId[objectId]) {
    relationsByObjectId[objectId] = [];
  }
  relationsByObjectId[objectId].push(relation);
}
function getRelationObjectKey(rawReference, object) {
  if (object) {
    return getModelId(object);
  }
  return rawReference.trim();
}
function getModelId(model) {
  if ("id" in model && typeof model.id === "string" && model.id.trim()) {
    return model.id.trim();
  }
  const explicitId = model.frontmatter.id;
  if (typeof explicitId === "string" && explicitId.trim()) {
    return explicitId.trim();
  }
  if ("name" in model && typeof model.name === "string" && model.name.trim()) {
    return model.name.trim();
  }
  return getBasename2(model.path);
}
function getBasename2(path) {
  const slashNormalized = path.replace(/\\/g, "/");
  const rawName = slashNormalized.split("/").pop() ?? path;
  return rawName.replace(/\.md$/i, "");
}
function pushWarning(warningsByFilePath, path, warning) {
  if (!warningsByFilePath[path]) {
    warningsByFilePath[path] = [];
  }
  const exists = warningsByFilePath[path].some(
    (entry) => entry.code === warning.code && entry.message === warning.message && entry.field === warning.field
  );
  if (!exists) {
    warningsByFilePath[path].push(warning);
  }
}

// src/utils/model-navigation.ts
var import_obsidian4 = require("obsidian");
async function openModelObjectNote(app, index, objectId, options = {}) {
  const model = index.objectsById[objectId] ?? index.erEntitiesById[objectId] ?? index.dfdObjectsById[objectId];
  if (!model) {
    return {
      ok: false,
      reason: `Object "${objectId}" was not found in the current index.`
    };
  }
  const file = app.vault.getAbstractFileByPath(model.path);
  if (!(file instanceof import_obsidian4.TFile)) {
    return {
      ok: false,
      reason: `Note for object "${objectId}" could not be opened.`
    };
  }
  const leaf = options.openInNewLeaf ? app.workspace.getLeaf(true) : findExistingMarkdownLeaf(app, options.sourcePath) ?? app.workspace.getMostRecentLeaf();
  if (!leaf) {
    return {
      ok: false,
      reason: `No target tab was available to open "${objectId}".`
    };
  }
  await leaf.openFile(file);
  return { ok: true };
}
function findExistingMarkdownLeaf(app, sourcePath) {
  if (!sourcePath) {
    return null;
  }
  const markdownLeaves = app.workspace.getLeavesOfType("markdown");
  for (const leaf of markdownLeaves) {
    const viewFile = leaf.view.file ?? null;
    if (viewFile?.path === sourcePath) {
      return leaf;
    }
  }
  return null;
}

// src/views/modeling-preview-view.ts
var import_obsidian5 = require("obsidian");

// src/core/object-subgraph-builder.ts
function buildObjectSubgraphScene(context) {
  const centerId = getFocusObjectId(context.object);
  const nodes = /* @__PURE__ */ new Map();
  const edges = /* @__PURE__ */ new Map();
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
    const edge = toDiagramEdge2(entry, centerId);
    if (!edge) {
      continue;
    }
    const edgeKey = edge.id ?? `${edge.source}:${edge.target}:${edge.kind ?? ""}:${edge.label ?? ""}`;
    edges.set(edgeKey, edge);
  }
  const kind = context.object.fileType === "er-entity" ? "er" : "class";
  const diagram = {
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
function toDiagramEdge2(entry, centerId) {
  const relatedId = entry.relatedObjectId;
  if (entry.relation && "domain" in entry.relation && entry.relation.domain === "er") {
    const relation2 = entry.relation;
    const sourceId2 = entry.direction === "incoming" ? relatedId : centerId;
    const targetId2 = entry.direction === "incoming" ? centerId : relatedId;
    return {
      id: relation2.id,
      source: sourceId2,
      target: targetId2,
      kind: "association",
      label: relation2.label,
      metadata: {
        cardinality: relation2.cardinality,
        sourceColumn: relation2.mappings[0]?.localColumn,
        targetColumn: relation2.mappings[0]?.targetColumn,
        logicalName: relation2.label,
        physicalName: relation2.id,
        kind: relation2.kind,
        mappingSummary: relation2.mappings.map((mapping) => `${mapping.localColumn} -> ${mapping.targetColumn}`).join(" / "),
        mappings: relation2.mappings
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
    kind: relation.kind,
    label: relation.label,
    metadata: {
      notes: relation.notes,
      sourceCardinality: relation.fromMultiplicity,
      targetCardinality: relation.toMultiplicity
    }
  };
}
function normalizeClassRelation(relation) {
  if ("domain" in relation && relation.domain === "class") {
    return relation;
  }
  return toClassRelationEdge(relation);
}
function getGraphTitle(object) {
  return object.fileType === "er-entity" ? object.logicalName : object.name;
}
function getObjectId4(object) {
  const explicitId = object.frontmatter.id;
  if (typeof explicitId === "string" && explicitId.trim()) {
    return explicitId.trim();
  }
  return object.name;
}
function getFocusObjectId(object) {
  return object.fileType === "er-entity" ? object.id : getObjectId4(object);
}

// src/renderers/graph-layout.ts
function buildGraphLayout(nodes, edges, options) {
  if (nodes.length === 0) {
    return {
      nodes: [],
      byId: {},
      width: options.canvasPadding * 2,
      height: options.canvasPadding * 2
    };
  }
  const nodeSizes = /* @__PURE__ */ new Map();
  const originalIndex = /* @__PURE__ */ new Map();
  for (const [index, node] of nodes.entries()) {
    nodeSizes.set(node.id, {
      width: options.getWidth(node),
      height: options.getHeight(node)
    });
    originalIndex.set(node.id, index);
  }
  const maxWidth = Math.max(...nodes.map((node) => nodeSizes.get(node.id)?.width ?? 0));
  const maxHeight = Math.max(...nodes.map((node) => nodeSizes.get(node.id)?.height ?? 0));
  const columnCount = clamp2(
    deriveColumnCount(nodes.length),
    options.minColumns ?? 1,
    options.maxColumns ?? 4
  );
  const rowCount = Math.ceil(nodes.length / columnCount);
  const cellWidth = maxWidth + options.columnGap;
  const cellHeight = maxHeight + options.rowGap;
  const degrees = buildDegreeMap(nodes, edges);
  const neighborMap = buildNeighborMap(nodes, edges, originalIndex);
  const sortedNodes = [...nodes].sort((left, right) => {
    const degreeDelta = (degrees.get(right.id) ?? 0) - (degrees.get(left.id) ?? 0);
    if (degreeDelta !== 0) {
      return degreeDelta;
    }
    const barycenterDelta = getNeighborBarycenter(left.id, neighborMap) - getNeighborBarycenter(right.id, neighborMap);
    if (barycenterDelta !== 0) {
      return barycenterDelta;
    }
    return (originalIndex.get(left.id) ?? 0) - (originalIndex.get(right.id) ?? 0);
  });
  const slots = buildSlots(columnCount, rowCount);
  const slotAssignments = /* @__PURE__ */ new Map();
  for (const [index, node] of sortedNodes.entries()) {
    const slot = slots[index];
    if (slot) {
      slotAssignments.set(node.id, slot);
    }
  }
  optimizeAssignments(slotAssignments, nodes, edges, columnCount);
  const layouts = [];
  const byId = {};
  for (const node of nodes) {
    const slot = slotAssignments.get(node.id);
    if (!slot) {
      continue;
    }
    const size = nodeSizes.get(node.id) ?? { width: maxWidth, height: maxHeight };
    const x = options.canvasPadding + slot.col * cellWidth + Math.max(0, (maxWidth - size.width) / 2);
    const y = options.canvasPadding + slot.row * cellHeight + Math.max(0, (maxHeight - size.height) / 2);
    const layout = {
      node,
      x,
      y,
      width: size.width,
      height: size.height
    };
    layouts.push(layout);
    byId[node.id] = layout;
  }
  return {
    nodes: layouts,
    byId,
    width: options.canvasPadding * 2 + columnCount * maxWidth + Math.max(0, columnCount - 1) * options.columnGap,
    height: options.canvasPadding * 2 + rowCount * maxHeight + Math.max(0, rowCount - 1) * options.rowGap
  };
}
function deriveColumnCount(nodeCount) {
  if (nodeCount >= 10) {
    return 4;
  }
  if (nodeCount >= 5) {
    return 3;
  }
  if (nodeCount >= 2) {
    return 2;
  }
  return 1;
}
function buildDegreeMap(nodes, edges) {
  const degrees = /* @__PURE__ */ new Map();
  for (const node of nodes) {
    degrees.set(node.id, 0);
  }
  for (const edge of edges) {
    degrees.set(edge.source, (degrees.get(edge.source) ?? 0) + 1);
    degrees.set(edge.target, (degrees.get(edge.target) ?? 0) + 1);
  }
  return degrees;
}
function buildNeighborMap(nodes, edges, originalIndex) {
  const neighborMap = /* @__PURE__ */ new Map();
  for (const node of nodes) {
    neighborMap.set(node.id, []);
  }
  for (const edge of edges) {
    neighborMap.get(edge.source)?.push(originalIndex.get(edge.target) ?? 0);
    neighborMap.get(edge.target)?.push(originalIndex.get(edge.source) ?? 0);
  }
  return neighborMap;
}
function getNeighborBarycenter(nodeId, neighborMap) {
  const indices = neighborMap.get(nodeId) ?? [];
  if (indices.length === 0) {
    return Number.MAX_SAFE_INTEGER;
  }
  return indices.reduce((sum, value) => sum + value, 0) / indices.length;
}
function buildSlots(columnCount, rowCount) {
  const centerColumn = (columnCount - 1) / 2;
  const centerRow = (rowCount - 1) / 2;
  const slots = [];
  for (let row = 0; row < rowCount; row += 1) {
    for (let col = 0; col < columnCount; col += 1) {
      const centerDistance = Math.abs(col - centerColumn) * 1.2 + Math.abs(row - centerRow);
      slots.push({ col, row, centerDistance });
    }
  }
  return slots.sort((left, right) => {
    if (left.centerDistance !== right.centerDistance) {
      return left.centerDistance - right.centerDistance;
    }
    if (left.row !== right.row) {
      return left.row - right.row;
    }
    return left.col - right.col;
  });
}
function optimizeAssignments(assignments, nodes, edges, columnCount) {
  const orderedIds = [...nodes.map((node) => node.id)].sort((left, right) => {
    const leftSlot = assignments.get(left);
    const rightSlot = assignments.get(right);
    if (!leftSlot || !rightSlot) {
      return 0;
    }
    if (leftSlot.row !== rightSlot.row) {
      return leftSlot.row - rightSlot.row;
    }
    return leftSlot.col - rightSlot.col;
  });
  for (let pass = 0; pass < 2; pass += 1) {
    for (let index = 0; index < orderedIds.length - 1; index += 1) {
      const leftId = orderedIds[index];
      const rightId = orderedIds[index + 1];
      const leftSlot = assignments.get(leftId);
      const rightSlot = assignments.get(rightId);
      if (!leftSlot || !rightSlot) {
        continue;
      }
      const rowGap = Math.abs(leftSlot.row - rightSlot.row);
      const colGap = Math.abs(leftSlot.col - rightSlot.col);
      if (rowGap + colGap !== 1) {
        continue;
      }
      const currentCost = estimateLayoutCost(assignments, edges, columnCount);
      assignments.set(leftId, rightSlot);
      assignments.set(rightId, leftSlot);
      const swappedCost = estimateLayoutCost(assignments, edges, columnCount);
      if (swappedCost >= currentCost) {
        assignments.set(leftId, leftSlot);
        assignments.set(rightId, rightSlot);
      }
    }
  }
}
function estimateLayoutCost(assignments, edges, columnCount) {
  let cost = 0;
  for (const edge of edges) {
    const source = assignments.get(edge.source);
    const target = assignments.get(edge.target);
    if (!source || !target) {
      continue;
    }
    const dx = Math.abs(source.col - target.col);
    const dy = Math.abs(source.row - target.row);
    cost += dx * 3 + dy * 2;
    if (dx > Math.max(1, columnCount - 2)) {
      cost += 2;
    }
  }
  return cost;
}
function clamp2(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// src/renderers/class-renderer.ts
var SVG_NS2 = "http://www.w3.org/2000/svg";
var NODE_WIDTH2 = 300;
var HEADER_HEIGHT = 38;
var SECTION_TITLE_HEIGHT = 24;
var ROW_HEIGHT = 20;
var NODE_PADDING = 12;
var COLUMN_GAP2 = 96;
var ROW_GAP = 92;
var CANVAS_PADDING2 = 48;
var DEFAULT_ATTRIBUTE_LIMIT = 5;
var DEFAULT_METHOD_LIMIT = 5;
var MIN_ZOOM2 = 0.45;
var MAX_ZOOM2 = 2.4;
var INITIAL_ZOOM2 = 1;
var DIAGRAM_BORDER = "#d1d5db";
var DIAGRAM_LABEL_BG = "#ffffff";
var DIAGRAM_LABEL_BORDER = "#e5e7eb";
var DIAGRAM_LABEL_TEXT = "#111827";
var DIAGRAM_EDGE = "#374151";
var CLASS_NODE_BG = "#f8fafc";
var CLASS_NODE_BORDER = "#6b8ec6";
var CLASS_HEADER_BORDER = "#d1d5db";
var CLASS_TEXT = "#111827";
var CLASS_MUTED_TEXT = "#4b5563";
var CLASS_SECTION_DIVIDER = "#d1d5db";
var CLASS_DETAIL_BG = "#f8fafc";
var CLASS_DETAIL_BORDER = "#d1d5db";
function renderClassDiagram(diagram, options) {
  const root = document.createElement("section");
  root.className = "mdspec-diagram mdspec-diagram--class";
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.flex = "1 1 auto";
  root.style.minHeight = "0";
  if (!options?.hideTitle) {
    const title = document.createElement("h2");
    title.textContent = `${diagram.diagram.name} (class)`;
    title.style.flex = "0 0 auto";
    root.appendChild(title);
  }
  const layout = createLayout(
    diagram.nodes,
    diagram.edges
  );
  const sceneBounds = createSceneBounds2(diagram.edges, layout.byId);
  const canvas = document.createElement("div");
  canvas.className = "mdspec-class-canvas";
  canvas.style.position = "relative";
  canvas.style.overflow = "hidden";
  canvas.style.padding = "0";
  canvas.style.border = `1px solid ${DIAGRAM_BORDER}`;
  canvas.style.borderRadius = "8px";
  canvas.style.background = "#ffffff";
  canvas.style.flex = "1 1 auto";
  if (!options?.forExport) {
    canvas.style.minHeight = "420px";
  }
  canvas.style.height = "auto";
  canvas.style.cursor = "grab";
  canvas.style.userSelect = "none";
  canvas.style.touchAction = "none";
  const toolbar = options?.forExport ? null : createZoomToolbar("Wheel: zoom / Drag background: pan");
  if (toolbar) {
    root.appendChild(toolbar.root);
  }
  const viewport = document.createElement("div");
  viewport.className = "mdspec-class-viewport";
  viewport.style.position = "relative";
  viewport.style.width = "100%";
  viewport.style.height = "100%";
  viewport.style.minHeight = "0";
  viewport.style.overflow = "hidden";
  const surface = document.createElement("div");
  surface.className = "mdspec-class-surface";
  surface.dataset.modelWeaveExportSurface = "true";
  surface.dataset.modelWeaveSceneWidth = `${sceneBounds.width}`;
  surface.dataset.modelWeaveSceneHeight = `${sceneBounds.height}`;
  surface.style.position = "absolute";
  surface.style.left = "0";
  surface.style.top = "0";
  surface.style.width = `${sceneBounds.width}px`;
  surface.style.height = `${sceneBounds.height}px`;
  surface.style.transformOrigin = "0 0";
  surface.style.willChange = "transform";
  const svg = createSvgSurface2(sceneBounds.width, sceneBounds.height);
  svg.appendChild(createMarkerDefinitions2());
  for (const edge of diagram.edges) {
    const edgeGroup = renderEdge2(edge, layout.byId);
    if (edgeGroup) {
      svg.appendChild(edgeGroup);
    }
  }
  surface.appendChild(svg);
  for (const box of layout.nodes) {
    surface.appendChild(createNodeBox2(box, options));
  }
  viewport.appendChild(surface);
  canvas.appendChild(viewport);
  root.appendChild(canvas);
  if (toolbar) {
    attachGraphViewportInteractions(canvas, surface, toolbar, sceneBounds, {
      minZoom: MIN_ZOOM2,
      maxZoom: MAX_ZOOM2,
      initialZoom: INITIAL_ZOOM2,
      nodeSelector: ".mdspec-class-node",
      viewportState: options?.viewportState,
      onViewportStateChange: options?.onViewportStateChange
    });
  }
  if (!options?.hideDetails) {
    root.appendChild(createConnectionsTable(diagram));
  }
  return root;
}
function createLayout(nodes, edges) {
  return buildGraphLayout(nodes, edges, {
    getWidth: () => NODE_WIDTH2,
    getHeight: (node) => measureNodeHeight2(node.object),
    canvasPadding: CANVAS_PADDING2,
    columnGap: COLUMN_GAP2,
    rowGap: ROW_GAP,
    maxColumns: 4
  });
}
function createSceneBounds2(edges, layoutById) {
  const nodeBounds = Object.values(layoutById).map((layout) => ({
    x: layout.x,
    y: layout.y,
    width: layout.width,
    height: layout.height
  }));
  const labelBounds = estimateEdgeLabelBounds(
    edges,
    layoutById,
    getMinimalEdgeLabel
  );
  return computeSceneBounds(nodeBounds, labelBounds, CANVAS_PADDING2);
}
function measureNodeHeight2(object) {
  if (!object || object.fileType !== "object") {
    return HEADER_HEIGHT + NODE_PADDING * 2 + ROW_HEIGHT;
  }
  const attributeRows = Math.max(getVisibleAttributes(object).length, 1);
  const methodRows = Math.max(getVisibleMethods(object).length, 1);
  return HEADER_HEIGHT + SECTION_TITLE_HEIGHT + attributeRows * ROW_HEIGHT + SECTION_TITLE_HEIGHT + methodRows * ROW_HEIGHT + NODE_PADDING * 2;
}
function createSvgSurface2(width, height) {
  const svg = document.createElementNS(SVG_NS2, "svg");
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.style.position = "absolute";
  svg.style.inset = "0";
  svg.style.pointerEvents = "none";
  svg.style.overflow = "visible";
  return svg;
}
function createMarkerDefinitions2() {
  const defs = document.createElementNS(SVG_NS2, "defs");
  defs.appendChild(
    createTriangleMarker("mdspec-arrow-solid", DIAGRAM_EDGE, DIAGRAM_EDGE)
  );
  defs.appendChild(createTriangleMarker("mdspec-arrow-open", "none", DIAGRAM_EDGE));
  defs.appendChild(
    createDiamondMarker("mdspec-diamond-open", "none", DIAGRAM_EDGE)
  );
  defs.appendChild(
    createDiamondMarker(
      "mdspec-diamond-solid",
      DIAGRAM_EDGE,
      DIAGRAM_EDGE
    )
  );
  return defs;
}
function createTriangleMarker(id, fill, stroke) {
  const marker = document.createElementNS(SVG_NS2, "marker");
  marker.setAttribute("id", id);
  marker.setAttribute("markerWidth", "12");
  marker.setAttribute("markerHeight", "12");
  marker.setAttribute("refX", "10");
  marker.setAttribute("refY", "6");
  marker.setAttribute("orient", "auto");
  marker.setAttribute("markerUnits", "strokeWidth");
  const path = document.createElementNS(SVG_NS2, "path");
  path.setAttribute("d", "M 0 0 L 10 6 L 0 12 z");
  path.setAttribute("fill", fill);
  path.setAttribute("stroke", stroke);
  path.setAttribute("stroke-width", "1.2");
  marker.appendChild(path);
  return marker;
}
function createDiamondMarker(id, fill, stroke) {
  const marker = document.createElementNS(SVG_NS2, "marker");
  marker.setAttribute("id", id);
  marker.setAttribute("markerWidth", "14");
  marker.setAttribute("markerHeight", "14");
  marker.setAttribute("refX", "12");
  marker.setAttribute("refY", "7");
  marker.setAttribute("orient", "auto");
  marker.setAttribute("markerUnits", "strokeWidth");
  const path = document.createElementNS(SVG_NS2, "path");
  path.setAttribute("d", "M 0 7 L 4 0 L 12 7 L 4 14 z");
  path.setAttribute("fill", fill);
  path.setAttribute("stroke", stroke);
  path.setAttribute("stroke-width", "1.2");
  marker.appendChild(path);
  return marker;
}
function renderEdge2(edge, layoutById) {
  const source = layoutById[edge.source];
  const target = layoutById[edge.target];
  if (!source || !target) {
    return null;
  }
  const group = document.createElementNS(SVG_NS2, "g");
  const { startX, startY, endX, endY, midX, midY } = getConnectionPoints(
    source,
    target
  );
  const line = document.createElementNS(SVG_NS2, "line");
  line.setAttribute("x1", String(startX));
  line.setAttribute("y1", String(startY));
  line.setAttribute("x2", String(endX));
  line.setAttribute("y2", String(endY));
  line.setAttribute("stroke", DIAGRAM_EDGE);
  line.setAttribute("stroke-width", "2");
  line.setAttribute("stroke-dasharray", getDashPattern(edge.kind));
  const markers = getMarkerAttributes(edge.kind);
  if (markers.start) {
    line.setAttribute("marker-start", markers.start);
  }
  if (markers.end) {
    line.setAttribute("marker-end", markers.end);
  }
  group.appendChild(line);
  const edgeLabel = getMinimalEdgeLabel(edge);
  if (edgeLabel) {
    group.appendChild(createEdgeBadge2(midX, midY - 8, edgeLabel));
  }
  return group;
}
function getMinimalEdgeLabel(edge) {
  const internalEdge = classDiagramEdgeToInternalEdge(edge);
  switch (internalEdge.kind) {
    case "inheritance":
      return "inheritance";
    case "implementation":
      return "implementation";
    case "dependency":
      return "dependency";
    case "composition":
      return "composition";
    case "aggregation":
      return "aggregation";
    case "association":
      return "association";
    default:
      return internalEdge.kind ?? null;
  }
}
function createEdgeBadge2(x, y, value) {
  const group = document.createElementNS(SVG_NS2, "g");
  const width = Math.max(52, value.length * 8 + 12);
  const height = 20;
  const rect = document.createElementNS(SVG_NS2, "rect");
  rect.setAttribute("x", String(x - width / 2));
  rect.setAttribute("y", String(y - height / 2));
  rect.setAttribute("width", String(width));
  rect.setAttribute("height", String(height));
  rect.setAttribute("rx", "10");
  rect.setAttribute("fill", DIAGRAM_LABEL_BG);
  rect.setAttribute("stroke", DIAGRAM_LABEL_BORDER);
  group.appendChild(rect);
  const text = document.createElementNS(SVG_NS2, "text");
  text.setAttribute("x", String(x));
  text.setAttribute("y", String(y + 4));
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("font-size", "11px");
  text.setAttribute("font-weight", "600");
  text.setAttribute("fill", DIAGRAM_LABEL_TEXT);
  text.textContent = value;
  group.appendChild(text);
  return group;
}
function getDashPattern(kind) {
  switch (kind) {
    case "dependency":
    case "implementation":
      return "8 6";
    default:
      return "0";
  }
}
function getMarkerAttributes(kind) {
  switch (kind) {
    case "inheritance":
      return { end: "url(#mdspec-arrow-open)" };
    case "implementation":
      return { end: "url(#mdspec-arrow-open)" };
    case "dependency":
      return { end: "url(#mdspec-arrow-solid)" };
    case "aggregation":
      return { start: "url(#mdspec-diamond-open)" };
    case "composition":
      return { start: "url(#mdspec-diamond-solid)" };
    case "association":
    case "reference":
    case "flow":
    default:
      return { end: "url(#mdspec-arrow-solid)" };
  }
}
function createNodeBox2(layout, options) {
  const box = document.createElement("article");
  box.className = "mdspec-class-node";
  box.style.position = "absolute";
  box.style.left = `${layout.x}px`;
  box.style.top = `${layout.y}px`;
  box.style.width = `${layout.width}px`;
  box.style.minHeight = `${layout.height}px`;
  box.style.boxSizing = "border-box";
  box.style.border = `1px solid ${CLASS_NODE_BORDER}`;
  box.style.borderRadius = "8px";
  box.style.background = CLASS_NODE_BG;
  box.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.08)";
  box.style.overflow = "hidden";
  box.style.cursor = layout.node.object ? "pointer" : "default";
  box.style.color = CLASS_TEXT;
  if (!layout.node.object) {
    box.appendChild(createFallbackNode(layout.node.label ?? layout.node.ref ?? layout.node.id));
    return box;
  }
  if (options?.onOpenObject) {
    box.setAttribute("role", "button");
    box.setAttribute("tabindex", "0");
    box.title = `Open ${layout.node.label ?? (layout.node.object.fileType === "object" ? layout.node.object.name : layout.node.object.logicalName)}`;
    box.addEventListener("click", (event) => {
      if (event.defaultPrevented) {
        return;
      }
      options.onOpenObject?.(layout.node.id, {
        openInNewLeaf: event.ctrlKey || event.metaKey
      });
    });
    box.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        options.onOpenObject?.(layout.node.id, { openInNewLeaf: false });
      }
    });
    box.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
    });
  }
  const object = layout.node.object;
  if (object.fileType !== "object") {
    box.appendChild(createFallbackNode(layout.node.label ?? object.logicalName));
    return box;
  }
  const header = document.createElement("header");
  header.style.padding = "10px 12px";
  header.style.borderBottom = `1px solid ${CLASS_HEADER_BORDER}`;
  header.style.background = getHeaderBackground(object.kind);
  const kind = document.createElement("div");
  kind.style.fontSize = "11px";
  kind.style.textTransform = "uppercase";
  kind.style.letterSpacing = "0.08em";
  kind.style.color = CLASS_MUTED_TEXT;
  kind.textContent = object.kind;
  const title = document.createElement("div");
  title.style.fontWeight = "700";
  title.style.fontSize = "16px";
  title.style.lineHeight = "1.3";
  title.textContent = layout.node.label ?? object.name;
  header.append(kind, title);
  box.appendChild(header);
  box.appendChild(createNodeSection("Attributes", getVisibleAttributes(object)));
  box.appendChild(createNodeSection("Methods", getVisibleMethods(object)));
  return box;
}
function getVisibleAttributes(object) {
  const visible = object.attributes.slice(0, DEFAULT_ATTRIBUTE_LIMIT).map((attribute) => {
    const detail = attribute.type ? `: ${attribute.type}` : "";
    return `${attribute.name}${detail}`;
  });
  if (object.attributes.length > DEFAULT_ATTRIBUTE_LIMIT) {
    visible.push("...");
  }
  return visible;
}
function getVisibleMethods(object) {
  const visible = object.methods.slice(0, DEFAULT_METHOD_LIMIT).map((method) => {
    const parameters = method.parameters.map(
      (parameter) => `${parameter.name}${parameter.type ? `: ${parameter.type}` : ""}`
    ).join(", ");
    const returnType = method.returnType ? ` ${method.returnType}` : "";
    return `${method.name}(${parameters})${returnType}`;
  });
  if (object.methods.length > DEFAULT_METHOD_LIMIT) {
    visible.push("...");
  }
  return visible;
}
function createNodeSection(title, items) {
  const section = document.createElement("section");
  section.style.padding = "8px 12px 10px";
  section.style.borderTop = `1px solid ${CLASS_SECTION_DIVIDER}`;
  const heading = document.createElement("div");
  heading.style.fontSize = "11px";
  heading.style.fontWeight = "600";
  heading.style.textTransform = "uppercase";
  heading.style.letterSpacing = "0.06em";
  heading.style.color = CLASS_MUTED_TEXT;
  heading.style.marginBottom = "6px";
  heading.textContent = title;
  section.appendChild(heading);
  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.style.fontSize = "12px";
    empty.style.color = "#6b7280";
    empty.textContent = "None";
    section.appendChild(empty);
    return section;
  }
  const list = document.createElement("ul");
  list.style.margin = "0";
  list.style.paddingLeft = "18px";
  list.style.fontSize = "12px";
  list.style.lineHeight = "1.45";
  for (const item of items) {
    const entry = document.createElement("li");
    entry.textContent = item;
    list.appendChild(entry);
  }
  section.appendChild(list);
  return section;
}
function getHeaderBackground(kind) {
  switch (kind) {
    case "interface":
      return "#e8f7fb";
    case "enum":
      return "#fff4e5";
    case "component":
      return "#edf8f0";
    case "entity":
      return "#eef5ff";
    case "class":
    default:
      return "#eaf3ff";
  }
}
function createConnectionsTable(diagram) {
  const section = document.createElement("details");
  section.className = "mdspec-section";
  section.style.marginTop = "10px";
  section.style.flex = "0 0 auto";
  section.open = false;
  const summary = document.createElement("summary");
  summary.textContent = `Displayed relations (${diagram.edges.length})`;
  summary.style.cursor = "pointer";
  summary.style.fontWeight = "600";
  summary.style.padding = "4px 0";
  section.appendChild(summary);
  if (diagram.edges.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No relations are currently used for rendering.";
    empty.style.margin = "8px 0 0";
    empty.style.color = "var(--text-muted)";
    section.appendChild(empty);
    return section;
  }
  const list = document.createElement("ul");
  list.style.listStyle = "none";
  list.style.margin = "8px 0 0";
  list.style.padding = "0";
  list.style.maxWidth = "720px";
  const sortedEdges = [...diagram.edges].sort(compareClassEdges);
  for (const edge of sortedEdges) {
    const internalEdge = classDiagramEdgeToInternalEdge(edge);
    const details = buildEdgeDetails(internalEdge);
    const item = document.createElement("li");
    item.style.padding = "6px 8px";
    item.style.border = `1px solid ${CLASS_DETAIL_BORDER}`;
    item.style.borderRadius = "8px";
    item.style.marginBottom = "6px";
    item.style.background = CLASS_DETAIL_BG;
    item.style.fontSize = "12px";
    item.style.lineHeight = "1.45";
    item.style.color = CLASS_TEXT;
    item.textContent = `${internalEdge.id || "-"} / ${internalEdge.sourceClass} -> ${internalEdge.targetClass} / ${internalEdge.kind || "-"} / ${internalEdge.label || "-"}${details ? ` / ${details}` : ""}${internalEdge.notes ? ` / ${internalEdge.notes}` : ""}`;
    list.appendChild(item);
  }
  section.appendChild(list);
  return section;
}
function buildEdgeDetails(edge) {
  const parts = [];
  if (edge.fromMultiplicity) {
    parts.push(`from: ${edge.fromMultiplicity}`);
  }
  if (edge.toMultiplicity) {
    parts.push(`to: ${edge.toMultiplicity}`);
  }
  return parts.join(" / ");
}
function createFallbackNode(id) {
  const box = document.createElement("div");
  box.className = "mdspec-fallback";
  box.style.padding = "16px";
  box.textContent = `Unresolved object: ${id}`;
  return box;
}
function compareClassEdges(left, right) {
  const leftEdge = classDiagramEdgeToInternalEdge(left);
  const rightEdge = classDiagramEdgeToInternalEdge(right);
  const sourceCompare = leftEdge.sourceClass.localeCompare(rightEdge.sourceClass);
  if (sourceCompare !== 0) {
    return sourceCompare;
  }
  const targetCompare = leftEdge.targetClass.localeCompare(rightEdge.targetClass);
  if (targetCompare !== 0) {
    return targetCompare;
  }
  return (leftEdge.id || "").localeCompare(rightEdge.id || "");
}

// src/renderers/component-renderer.ts
function renderComponentDiagram(diagram) {
  const root = document.createElement("section");
  root.className = "mdspec-diagram mdspec-diagram--component";
  const title = document.createElement("h2");
  title.textContent = `${diagram.diagram.name} (component)`;
  root.appendChild(title);
  const grid = document.createElement("div");
  grid.className = "mdspec-component-grid";
  for (const node of diagram.nodes) {
    const box = document.createElement("article");
    box.className = "mdspec-component";
    const heading = document.createElement("h3");
    heading.textContent = getNodeLabel(node);
    box.appendChild(heading);
    const description = document.createElement("p");
    description.textContent = getNodeDescription(node);
    box.appendChild(description);
    grid.appendChild(box);
  }
  if (grid.childElementCount === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No components resolved.";
    root.appendChild(empty);
  } else {
    root.appendChild(grid);
  }
  return root;
}
function getNodeLabel(node) {
  if (!node.object) {
    return node.ref ?? node.id;
  }
  return node.object.fileType === "er-entity" ? node.object.logicalName : node.object.name;
}
function getNodeDescription(node) {
  if (!node.object) {
    return "No component description available.";
  }
  if (node.object.fileType === "er-entity") {
    return node.object.physicalName;
  }
  if (node.object.fileType === "dfd-object") {
    return node.object.kind;
  }
  return node.object.description ?? "No component description available.";
}

// src/renderers/er-shared.ts
var SVG_NS3 = "http://www.w3.org/2000/svg";
var DEFAULT_COLUMN_LIMIT = 5;
var ER_LABEL_BG = "#ffffff";
var ER_LABEL_BORDER = "#e5e7eb";
var ER_LABEL_TEXT = "#111827";
function getVisibleErColumns(columns, options) {
  const highlighted = new Set(
    (options?.highlightedColumns ?? []).map((value) => value.trim()).filter(Boolean)
  );
  const limit = options?.limit ?? DEFAULT_COLUMN_LIMIT;
  const prioritized = [...columns].sort((left, right) => {
    const leftScore = getColumnPriority(left, highlighted);
    const rightScore = getColumnPriority(right, highlighted);
    if (leftScore !== rightScore) {
      return rightScore - leftScore;
    }
    return columns.indexOf(left) - columns.indexOf(right);
  });
  const visible = prioritized.slice(0, limit).map(formatErColumnLabel);
  if (columns.length > limit) {
    visible.push("...");
  }
  return visible;
}
function createErCardinalityBadge(x, y, value) {
  const group = document.createElementNS(SVG_NS3, "g");
  const width = Math.max(34, value.length * 8 + 12);
  const height = 20;
  const rect = document.createElementNS(SVG_NS3, "rect");
  rect.setAttribute("x", String(x - width / 2));
  rect.setAttribute("y", String(y - height / 2));
  rect.setAttribute("width", String(width));
  rect.setAttribute("height", String(height));
  rect.setAttribute("rx", "10");
  rect.setAttribute("fill", ER_LABEL_BG);
  rect.setAttribute("stroke", ER_LABEL_BORDER);
  group.appendChild(rect);
  const text = document.createElementNS(SVG_NS3, "text");
  text.setAttribute("x", String(x));
  text.setAttribute("y", String(y + 4));
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("font-size", "11px");
  text.setAttribute("font-weight", "600");
  text.setAttribute("fill", ER_LABEL_TEXT);
  text.textContent = value;
  group.appendChild(text);
  return group;
}
function formatErColumnLabel(column) {
  const parts = [`${column.logicalName} / ${column.physicalName}`, `: ${column.dataType}`];
  if (column.pk) {
    parts.push(" [PK]");
  }
  return parts.join("");
}
function getColumnPriority(column, highlighted) {
  if (highlighted.has(column.physicalName) || highlighted.has(column.logicalName)) {
    return column.pk ? 5 : 4;
  }
  if (column.pk) {
    return 3;
  }
  const name = `${column.logicalName} ${column.physicalName}`.toLowerCase();
  if (name.includes("id") || name.includes("_cd") || name.includes("code")) {
    return 2;
  }
  return 1;
}

// src/renderers/er-renderer.ts
var SVG_NS4 = "http://www.w3.org/2000/svg";
var NODE_WIDTH3 = 280;
var HEADER_HEIGHT2 = 40;
var SECTION_TITLE_HEIGHT2 = 24;
var ROW_HEIGHT2 = 20;
var NODE_PADDING2 = 12;
var COLUMN_GAP3 = 96;
var ROW_GAP2 = 92;
var CANVAS_PADDING3 = 48;
var MIN_ZOOM3 = 0.45;
var MAX_ZOOM3 = 2.4;
var INITIAL_ZOOM3 = 1;
var DIAGRAM_BORDER2 = "#d1d5db";
var DIAGRAM_EDGE2 = "#374151";
var ER_NODE_BG = "#ffffff";
var ER_NODE_BORDER = "#3a7a4f";
var ER_HEADER_BG = "#eef8f0";
var ER_HEADER_BORDER = "#d1d5db";
var ER_TEXT = "#111827";
var ER_MUTED_TEXT = "#4b5563";
var ER_SECTION_DIVIDER = "#d1d5db";
var ER_DETAIL_BG = "#f8fafc";
var ER_DETAIL_BORDER = "#d1d5db";
function renderErDiagram(diagram, options) {
  const root = document.createElement("section");
  root.className = "mdspec-diagram mdspec-diagram--er";
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.flex = "1 1 auto";
  root.style.minHeight = "0";
  if (!options?.hideTitle) {
    const title = document.createElement("h2");
    title.textContent = `${diagram.diagram.name} (ER)`;
    title.style.flex = "0 0 auto";
    root.appendChild(title);
  }
  const layout = createLayout2(
    diagram.nodes,
    diagram.edges
  );
  const sceneBounds = createSceneBounds3(diagram.edges, layout.byId);
  const canvas = document.createElement("div");
  canvas.className = "mdspec-er-canvas";
  canvas.style.position = "relative";
  canvas.style.overflow = "hidden";
  canvas.style.padding = "0";
  canvas.style.border = `1px solid ${DIAGRAM_BORDER2}`;
  canvas.style.borderRadius = "8px";
  canvas.style.background = "#ffffff";
  canvas.style.flex = "1 1 auto";
  if (!options?.forExport) {
    canvas.style.minHeight = "420px";
  }
  canvas.style.height = "auto";
  canvas.style.cursor = "grab";
  canvas.style.userSelect = "none";
  canvas.style.touchAction = "none";
  const toolbar = options?.forExport ? null : createZoomToolbar("Wheel: zoom / Drag background: pan");
  if (toolbar) {
    root.appendChild(toolbar.root);
  }
  const viewport = document.createElement("div");
  viewport.className = "mdspec-er-viewport";
  viewport.style.position = "relative";
  viewport.style.width = "100%";
  viewport.style.height = "100%";
  viewport.style.minHeight = "0";
  viewport.style.overflow = "hidden";
  const surface = document.createElement("div");
  surface.className = "mdspec-er-surface";
  surface.dataset.modelWeaveExportSurface = "true";
  surface.dataset.modelWeaveSceneWidth = `${sceneBounds.width}`;
  surface.dataset.modelWeaveSceneHeight = `${sceneBounds.height}`;
  surface.style.position = "absolute";
  surface.style.left = "0";
  surface.style.top = "0";
  surface.style.width = `${sceneBounds.width}px`;
  surface.style.height = `${sceneBounds.height}px`;
  surface.style.transformOrigin = "0 0";
  surface.style.willChange = "transform";
  const svg = createSvgSurface3(sceneBounds.width, sceneBounds.height);
  svg.appendChild(createMarkerDefinitions3());
  for (const edge of diagram.edges) {
    const edgeGroup = renderEdge3(edge, layout.byId);
    if (edgeGroup) {
      svg.appendChild(edgeGroup);
    }
  }
  surface.appendChild(svg);
  for (const box of layout.nodes) {
    surface.appendChild(createEntityBox(box, options));
  }
  viewport.appendChild(surface);
  canvas.appendChild(viewport);
  root.appendChild(canvas);
  if (toolbar) {
    attachGraphViewportInteractions(canvas, surface, toolbar, sceneBounds, {
      minZoom: MIN_ZOOM3,
      maxZoom: MAX_ZOOM3,
      initialZoom: INITIAL_ZOOM3,
      nodeSelector: ".mdspec-er-node",
      viewportState: options?.viewportState,
      onViewportStateChange: options?.onViewportStateChange
    });
  }
  if (!options?.hideDetails) {
    root.appendChild(createRelationTable(diagram));
  }
  return root;
}
function createLayout2(nodes, edges) {
  return buildGraphLayout(nodes, edges, {
    getWidth: () => NODE_WIDTH3,
    getHeight: (node) => measureNodeHeight3(node.object),
    canvasPadding: CANVAS_PADDING3,
    columnGap: COLUMN_GAP3,
    rowGap: ROW_GAP2,
    maxColumns: 4
  });
}
function createSceneBounds3(edges, layoutById) {
  const nodeBounds = Object.values(layoutById).map((layout) => ({
    x: layout.x,
    y: layout.y,
    width: layout.width,
    height: layout.height
  }));
  const labelBounds = estimateEdgeLabelBounds(
    edges,
    layoutById,
    (edge) => erDiagramEdgeToInternalEdge(edge).cardinality ?? null
  );
  return computeSceneBounds(nodeBounds, labelBounds, CANVAS_PADDING3);
}
function measureNodeHeight3(object) {
  if (!object) {
    return HEADER_HEIGHT2 + NODE_PADDING2 * 2 + ROW_HEIGHT2;
  }
  const attributeRows = object.fileType === "er-entity" ? Math.max(getVisibleErColumns(object.columns).length, 1) : Math.max(object.attributes.length, 1);
  return HEADER_HEIGHT2 + SECTION_TITLE_HEIGHT2 + attributeRows * ROW_HEIGHT2 + NODE_PADDING2 * 2 + 16;
}
function createSvgSurface3(width, height) {
  const svg = document.createElementNS(SVG_NS4, "svg");
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.style.position = "absolute";
  svg.style.inset = "0";
  svg.style.pointerEvents = "none";
  svg.style.overflow = "visible";
  return svg;
}
function createMarkerDefinitions3() {
  const defs = document.createElementNS(SVG_NS4, "defs");
  defs.appendChild(
    createTriangleMarker2("mdspec-er-arrow", DIAGRAM_EDGE2, DIAGRAM_EDGE2)
  );
  defs.appendChild(
    createDiamondMarker2("mdspec-er-diamond-open", "none", DIAGRAM_EDGE2)
  );
  defs.appendChild(
    createDiamondMarker2(
      "mdspec-er-diamond-solid",
      DIAGRAM_EDGE2,
      DIAGRAM_EDGE2
    )
  );
  return defs;
}
function createTriangleMarker2(id, fill, stroke) {
  const marker = document.createElementNS(SVG_NS4, "marker");
  marker.setAttribute("id", id);
  marker.setAttribute("markerWidth", "12");
  marker.setAttribute("markerHeight", "12");
  marker.setAttribute("refX", "10");
  marker.setAttribute("refY", "6");
  marker.setAttribute("orient", "auto");
  marker.setAttribute("markerUnits", "strokeWidth");
  const path = document.createElementNS(SVG_NS4, "path");
  path.setAttribute("d", "M 0 0 L 10 6 L 0 12 z");
  path.setAttribute("fill", fill);
  path.setAttribute("stroke", stroke);
  path.setAttribute("stroke-width", "1.2");
  marker.appendChild(path);
  return marker;
}
function createDiamondMarker2(id, fill, stroke) {
  const marker = document.createElementNS(SVG_NS4, "marker");
  marker.setAttribute("id", id);
  marker.setAttribute("markerWidth", "14");
  marker.setAttribute("markerHeight", "14");
  marker.setAttribute("refX", "12");
  marker.setAttribute("refY", "7");
  marker.setAttribute("orient", "auto");
  marker.setAttribute("markerUnits", "strokeWidth");
  const path = document.createElementNS(SVG_NS4, "path");
  path.setAttribute("d", "M 0 7 L 4 0 L 12 7 L 4 14 z");
  path.setAttribute("fill", fill);
  path.setAttribute("stroke", stroke);
  path.setAttribute("stroke-width", "1.2");
  marker.appendChild(path);
  return marker;
}
function renderEdge3(edge, layoutById) {
  const source = layoutById[edge.source];
  const target = layoutById[edge.target];
  if (!source || !target) {
    return null;
  }
  const group = document.createElementNS(SVG_NS4, "g");
  const { startX, startY, endX, endY, midX, midY } = getConnectionPoints(
    source,
    target
  );
  const line = document.createElementNS(SVG_NS4, "line");
  line.setAttribute("x1", String(startX));
  line.setAttribute("y1", String(startY));
  line.setAttribute("x2", String(endX));
  line.setAttribute("y2", String(endY));
  line.setAttribute("stroke", DIAGRAM_EDGE2);
  line.setAttribute("stroke-width", "2");
  line.setAttribute("stroke-dasharray", getDashPattern2(edge.kind));
  const markers = getMarkerAttributes2(edge.kind);
  if (markers.start) {
    line.setAttribute("marker-start", markers.start);
  }
  if (markers.end) {
    line.setAttribute("marker-end", markers.end);
  }
  group.appendChild(line);
  const internalEdge = erDiagramEdgeToInternalEdge(edge);
  const cardinality = internalEdge.cardinality ?? null;
  if (cardinality) {
    group.appendChild(createErCardinalityBadge(midX, midY - 8, cardinality));
  }
  return group;
}
function getDashPattern2(kind) {
  switch (kind) {
    case "dependency":
    case "implementation":
      return "8 6";
    default:
      return "0";
  }
}
function getMarkerAttributes2(kind) {
  switch (kind) {
    case "composition":
      return { start: "url(#mdspec-er-diamond-solid)" };
    case "aggregation":
      return { start: "url(#mdspec-er-diamond-open)" };
    case "association":
    case "reference":
    case "flow":
    case "dependency":
    case "implementation":
    case "inheritance":
    default:
      return { end: "url(#mdspec-er-arrow)" };
  }
}
function createEntityBox(layout, options) {
  const box = document.createElement("article");
  box.className = "mdspec-er-node";
  box.style.position = "absolute";
  box.style.left = `${layout.x}px`;
  box.style.top = `${layout.y}px`;
  box.style.width = `${layout.width}px`;
  box.style.minHeight = `${layout.height}px`;
  box.style.boxSizing = "border-box";
  box.style.border = `1px solid ${ER_NODE_BORDER}`;
  box.style.borderRadius = "8px";
  box.style.background = ER_NODE_BG;
  box.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.08)";
  box.style.overflow = "hidden";
  box.style.cursor = layout.node.object ? "pointer" : "default";
  box.style.color = ER_TEXT;
  if (!layout.node.object) {
    box.appendChild(createFallbackNode2(layout.node.label ?? layout.node.ref ?? layout.node.id));
    return box;
  }
  if (options?.onOpenObject) {
    box.setAttribute("role", "button");
    box.setAttribute("tabindex", "0");
    box.title = `Open ${layout.node.label ?? (layout.node.object.fileType === "er-entity" ? layout.node.object.logicalName : layout.node.object.name)}`;
    box.addEventListener("click", (event) => {
      if (event.defaultPrevented) {
        return;
      }
      options.onOpenObject?.(layout.node.id, {
        openInNewLeaf: event.ctrlKey || event.metaKey
      });
    });
    box.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        options.onOpenObject?.(layout.node.id, { openInNewLeaf: false });
      }
    });
    box.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
    });
  }
  const object = layout.node.object;
  const header = document.createElement("header");
  header.style.padding = "10px 12px";
  header.style.borderBottom = `1px solid ${ER_HEADER_BORDER}`;
  header.style.background = ER_HEADER_BG;
  const kind = document.createElement("div");
  kind.style.fontSize = "11px";
  kind.style.textTransform = "uppercase";
  kind.style.letterSpacing = "0.08em";
  kind.style.color = ER_MUTED_TEXT;
  kind.textContent = object.fileType === "er-entity" ? "er_entity" : "entity";
  const title = document.createElement("div");
  title.style.fontWeight = "700";
  title.style.fontSize = "16px";
  title.style.lineHeight = "1.3";
  title.textContent = layout.node.label ?? (object.fileType === "er-entity" ? object.logicalName : object.name);
  header.append(kind, title);
  box.appendChild(header);
  if (object.fileType === "er-entity") {
    const physical = document.createElement("div");
    physical.style.padding = "8px 12px 0";
    physical.style.fontFamily = "var(--font-monospace)";
    physical.style.fontSize = "12px";
    physical.style.color = ER_MUTED_TEXT;
    physical.textContent = object.physicalName;
    box.appendChild(physical);
    box.appendChild(createAttributeSection(getVisibleErColumns(object.columns)));
    return box;
  }
  box.appendChild(
    createAttributeSection(
      object.attributes.map((attribute) => {
        const detail = attribute.type ? `: ${attribute.type}` : "";
        return `${attribute.name}${detail}`;
      })
    )
  );
  return box;
}
function createAttributeSection(items) {
  const section = document.createElement("section");
  section.style.padding = "8px 12px 10px";
  section.style.borderTop = `1px solid ${ER_SECTION_DIVIDER}`;
  const heading = document.createElement("div");
  heading.style.fontSize = "11px";
  heading.style.fontWeight = "600";
  heading.style.textTransform = "uppercase";
  heading.style.letterSpacing = "0.06em";
  heading.style.color = ER_MUTED_TEXT;
  heading.style.marginBottom = "6px";
  heading.textContent = "Columns";
  section.appendChild(heading);
  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.style.fontSize = "12px";
    empty.style.color = "#6b7280";
    empty.textContent = "None";
    section.appendChild(empty);
    return section;
  }
  const list = document.createElement("ul");
  list.style.margin = "0";
  list.style.paddingLeft = "18px";
  list.style.fontSize = "12px";
  list.style.lineHeight = "1.45";
  for (const item of items) {
    const entry = document.createElement("li");
    entry.textContent = item;
    list.appendChild(entry);
  }
  section.appendChild(list);
  return section;
}
function createRelationTable(diagram) {
  const section = document.createElement("details");
  section.className = "mdspec-section";
  section.style.marginTop = "10px";
  section.style.flex = "0 0 auto";
  section.open = false;
  const summary = document.createElement("summary");
  summary.textContent = `Resolved relations (${diagram.edges.length})`;
  summary.style.cursor = "pointer";
  summary.style.fontWeight = "600";
  summary.style.padding = "4px 0";
  section.appendChild(summary);
  if (diagram.edges.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "\u8868\u793A\u5BFE\u8C61\u306E relation \u306F\u3042\u308A\u307E\u305B\u3093\u3002";
    empty.style.margin = "8px 0 0";
    empty.style.color = "var(--text-muted)";
    section.appendChild(empty);
    return section;
  }
  const list = document.createElement("ul");
  list.style.listStyle = "none";
  list.style.margin = "8px 0 0";
  list.style.padding = "0";
  list.style.maxWidth = "720px";
  const sortedEdges = [...diagram.edges].sort(compareErEdges);
  for (const edge of sortedEdges) {
    const internalEdge = erDiagramEdgeToInternalEdge(edge);
    const columns = internalEdge.mappings.map((mapping) => `${mapping.localColumn} -> ${mapping.targetColumn}`).join(" / ");
    const item = document.createElement("li");
    item.style.padding = "6px 8px";
    item.style.border = `1px solid ${ER_DETAIL_BORDER}`;
    item.style.borderRadius = "8px";
    item.style.marginBottom = "6px";
    item.style.background = ER_DETAIL_BG;
    item.style.fontSize = "12px";
    item.style.lineHeight = "1.45";
    item.style.color = ER_TEXT;
    item.textContent = `${internalEdge.id || "-"} / ${internalEdge.sourceEntity} -> ${internalEdge.targetEntity} / ${internalEdge.kind || "-"} / ${internalEdge.cardinality || "-"}${internalEdge.notes ? ` / ${internalEdge.notes}` : ""} / ${columns || "-"}`;
    list.appendChild(item);
  }
  section.appendChild(list);
  return section;
}
function compareErEdges(left, right) {
  const leftEdge = erDiagramEdgeToInternalEdge(left);
  const rightEdge = erDiagramEdgeToInternalEdge(right);
  const sourceCompare = leftEdge.sourceEntity.localeCompare(rightEdge.sourceEntity);
  if (sourceCompare !== 0) {
    return sourceCompare;
  }
  const targetCompare = leftEdge.targetEntity.localeCompare(rightEdge.targetEntity);
  if (targetCompare !== 0) {
    return targetCompare;
  }
  return (leftEdge.id || "").localeCompare(rightEdge.id || "");
}
function createFallbackNode2(id) {
  const box = document.createElement("div");
  box.className = "mdspec-fallback";
  box.style.padding = "16px";
  box.textContent = `Unresolved entity: ${id}`;
  return box;
}

// src/renderers/flow-renderer.ts
function renderFlowDiagram(diagram) {
  const root = document.createElement("section");
  root.className = "mdspec-diagram mdspec-diagram--flow";
  const title = document.createElement("h2");
  title.textContent = `${diagram.diagram.name} (flow)`;
  root.appendChild(title);
  const list = document.createElement("ol");
  list.className = "mdspec-flow";
  for (const node of diagram.nodes) {
    const item = document.createElement("li");
    item.textContent = getNodeLabel2(node);
    list.appendChild(item);
  }
  if (list.childElementCount === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No objects referenced.";
    root.appendChild(empty);
  } else {
    root.appendChild(list);
  }
  if (diagram.edges.length > 0) {
    const relations = document.createElement("ul");
    for (const edge of diagram.edges) {
      const item = document.createElement("li");
      item.textContent = `${edge.source} -> ${edge.target}${edge.label ? ` (${edge.label})` : ""}`;
      relations.appendChild(item);
    }
    root.appendChild(relations);
  }
  return root;
}
function getNodeLabel2(node) {
  if (!node.object) {
    return node.ref ?? node.id;
  }
  return node.object.fileType === "er-entity" ? node.object.logicalName : node.object.name;
}

// src/renderers/diagram-renderer.ts
function renderDiagramModel(diagram, options) {
  switch (diagram.diagram.kind) {
    case "class":
      return renderClassDiagram(diagram, options);
    case "er":
      return renderErDiagram(diagram, options);
    case "dfd":
      return renderDfdDiagram(diagram, options);
    case "flow":
      return renderFlowDiagram(diagram);
    case "component":
      return renderComponentDiagram(diagram);
    default:
      return createReservedKindFallback(diagram.diagram.kind);
  }
}
function createReservedKindFallback(kind) {
  const root = document.createElement("section");
  root.className = "mdspec-fallback";
  const title = document.createElement("h2");
  title.textContent = "Diagram preview is not available";
  const message = document.createElement("p");
  message.textContent = `Reserved diagram kind "${kind}" is not rendered in v1.`;
  root.append(title, message);
  return root;
}

// src/renderers/object-context-renderer.ts
var MINI_GRAPH_MIN_HEIGHT = 360;
function renderObjectContext(context, options) {
  const root = document.createElement("section");
  root.className = "mdspec-object-context";
  root.style.marginTop = "10px";
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.flex = "1 1 auto";
  root.style.minHeight = "0";
  const titleRow = document.createElement("div");
  titleRow.style.display = "flex";
  titleRow.style.alignItems = "center";
  titleRow.style.justifyContent = "space-between";
  titleRow.style.gap = "8px";
  const title = document.createElement("h3");
  title.textContent = "Related Objects";
  title.style.margin = "0";
  titleRow.appendChild(title);
  const count = document.createElement("span");
  count.textContent = `${context.relatedObjects.length} linked`;
  count.style.fontSize = "11px";
  count.style.color = "var(--text-muted)";
  titleRow.appendChild(count);
  root.appendChild(titleRow);
  root.appendChild(createMiniGraph(context, options));
  root.appendChild(createRelatedList(context, options));
  return root;
}
function createMiniGraph(context, options) {
  const subgraph = buildObjectSubgraphScene(context);
  const graph = renderDiagramModel(subgraph, {
    onOpenObject: options?.onOpenObject,
    hideTitle: true,
    hideDetails: true,
    viewportState: options?.viewportState,
    onViewportStateChange: options?.onViewportStateChange
  });
  graph.classList.add("mdspec-related-graph");
  graph.style.marginTop = "10px";
  graph.style.minHeight = `${MINI_GRAPH_MIN_HEIGHT}px`;
  return graph;
}
function createRelatedList(context, options) {
  const sortedEntries = [...context.relatedObjects].sort(
    (left, right) => compareRelatedEntries(left, right)
  );
  const details = document.createElement("details");
  details.className = "mdspec-related-list";
  details.style.marginTop = "10px";
  const summary = document.createElement("summary");
  summary.textContent = context.object.fileType === "er-entity" ? `Relation Details (${sortedEntries.length})` : `Connection Details (${sortedEntries.length})`;
  summary.style.cursor = "pointer";
  summary.style.fontWeight = "600";
  summary.style.padding = "6px 2px";
  details.appendChild(summary);
  const tableWrap = document.createElement("div");
  tableWrap.style.marginTop = "8px";
  tableWrap.style.maxHeight = "180px";
  tableWrap.style.overflow = "auto";
  if (sortedEntries.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "\u76F4\u63A5\u95A2\u4FC2\u3059\u308B\u30AA\u30D6\u30B8\u30A7\u30AF\u30C8\u306F\u3042\u308A\u307E\u305B\u3093\u3002";
    empty.style.margin = "8px 0 0";
    empty.style.color = "var(--text-muted)";
    details.appendChild(empty);
    return details;
  }
  const table = document.createElement("table");
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";
  table.style.fontSize = "12px";
  const headers = context.object.fileType === "er-entity" ? ["Related", "Direction", "Relation ID", "Source", "Target", "Kind", "Cardinality", "Mappings", "Notes"] : ["Related", "Direction", "Relation ID", "Source", "Target", "Kind", "Label", "Multiplicity", "Notes"];
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  for (const header of headers) {
    const cell = document.createElement("th");
    cell.textContent = header;
    cell.style.textAlign = "left";
    cell.style.padding = "6px 8px";
    cell.style.borderBottom = "1px solid var(--background-modifier-border)";
    headRow.appendChild(cell);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);
  const tbody = document.createElement("tbody");
  for (const entry of sortedEntries) {
    const row = document.createElement("tr");
    const values = context.object.fileType === "er-entity" ? buildErListRow(entry) : buildClassListRow(entry);
    values.forEach((value, index) => {
      const cell = document.createElement("td");
      cell.style.padding = "6px 8px";
      cell.style.borderBottom = "1px solid var(--background-modifier-border-hover)";
      cell.style.verticalAlign = "top";
      if (index === 0 && options?.onOpenObject) {
        const wrapper = document.createElement("div");
        wrapper.style.display = "flex";
        wrapper.style.alignItems = "center";
        wrapper.style.gap = "6px";
        const badge = createDirectionBadge(entry.direction);
        wrapper.appendChild(badge);
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = value;
        button.style.padding = "0";
        button.style.border = "0";
        button.style.background = "transparent";
        button.style.color = "var(--text-accent)";
        button.style.cursor = "pointer";
        button.addEventListener("click", () => {
          options.onOpenObject?.(entry.relatedObjectId, { openInNewLeaf: false });
        });
        wrapper.appendChild(button);
        cell.appendChild(wrapper);
      } else if (index === 1) {
        cell.appendChild(createDirectionBadge(entry.direction));
      } else if (index === 5) {
        cell.appendChild(createKindBadge(value));
      } else {
        cell.textContent = value;
      }
      row.appendChild(cell);
    });
    tbody.appendChild(row);
  }
  table.appendChild(tbody);
  tableWrap.appendChild(table);
  details.appendChild(tableWrap);
  return details;
}
function buildErListRow(entry) {
  const relation = entry.relation;
  const related = entry.relatedObject;
  const relatedName = related && related.fileType === "er-entity" ? `${related.logicalName} / ${related.physicalName}` : entry.relatedObjectId;
  const mappingSummary = relation.mappings.map((mapping) => `${mapping.localColumn} -> ${mapping.targetColumn}`).join(", ");
  return [
    relatedName,
    formatDirection(entry.direction),
    relation.id || "-",
    relation.sourceEntity,
    relation.targetEntity,
    relation.kind,
    relation.cardinality ?? "-",
    truncateValue(mappingSummary || "-", 72),
    relation.notes || "-"
  ];
}
function buildClassListRow(entry) {
  const relation = normalizeClassRelation2(entry.relation);
  const relatedName = entry.relatedObject?.fileType === "object" ? entry.relatedObject.name : entry.relatedObjectId;
  const multiplicity = [
    relation.fromMultiplicity ? `from ${relation.fromMultiplicity}` : "",
    relation.toMultiplicity ? `to ${relation.toMultiplicity}` : ""
  ].filter(Boolean).join(" / ");
  return [
    relatedName,
    formatDirection(entry.direction),
    relation.id || "-",
    relation.sourceClass,
    relation.targetClass,
    relation.kind,
    relation.label ?? "-",
    multiplicity || "-",
    relation.notes || "-"
  ];
}
function normalizeClassRelation2(relation) {
  if ("domain" in relation && relation.domain === "class") {
    return relation;
  }
  return toClassRelationEdge(relation);
}
function compareRelatedEntries(left, right) {
  if (left.direction !== right.direction) {
    return left.direction === "outgoing" ? -1 : 1;
  }
  const leftName = getStableRelatedName(left).toLowerCase();
  const rightName = getStableRelatedName(right).toLowerCase();
  if (leftName !== rightName) {
    return leftName.localeCompare(rightName);
  }
  const leftId = getRelationId(left).toLowerCase();
  const rightId = getRelationId(right).toLowerCase();
  return leftId.localeCompare(rightId);
}
function getStableRelatedName(entry) {
  if (!entry.relatedObject) {
    return entry.relatedObjectId;
  }
  if (entry.relatedObject.fileType === "er-entity") {
    return `${entry.relatedObject.logicalName}/${entry.relatedObject.physicalName}`;
  }
  return entry.relatedObject.name;
}
function getRelationId(entry) {
  const relation = entry.relation;
  if ("domain" in relation) {
    return relation.id || relation.label || relation.kind;
  }
  return relation.id || relation.label || relation.kind;
}
function formatDirection(direction) {
  return direction === "outgoing" ? "Outbound" : "Inbound";
}
function createDirectionBadge(direction) {
  const badge = document.createElement("span");
  badge.textContent = formatDirection(direction);
  badge.style.display = "inline-flex";
  badge.style.alignItems = "center";
  badge.style.padding = "2px 8px";
  badge.style.borderRadius = "999px";
  badge.style.fontSize = "11px";
  badge.style.fontWeight = "600";
  badge.style.whiteSpace = "nowrap";
  badge.style.background = direction === "outgoing" ? "color-mix(in srgb, var(--color-green) 18%, var(--background-primary-alt))" : "color-mix(in srgb, var(--color-orange) 18%, var(--background-primary-alt))";
  badge.style.color = "var(--text-normal)";
  return badge;
}
function createKindBadge(kind) {
  const badge = document.createElement("span");
  badge.textContent = kind || "-";
  badge.style.display = "inline-flex";
  badge.style.alignItems = "center";
  badge.style.padding = "2px 8px";
  badge.style.borderRadius = "999px";
  badge.style.fontSize = "11px";
  badge.style.fontWeight = "600";
  badge.style.whiteSpace = "nowrap";
  badge.style.background = getKindBadgeBackground(kind);
  badge.style.color = "var(--text-normal)";
  return badge;
}
function getKindBadgeBackground(kind) {
  switch (kind) {
    case "inheritance":
      return "color-mix(in srgb, var(--color-blue) 18%, var(--background-primary-alt))";
    case "implementation":
      return "color-mix(in srgb, var(--color-cyan) 18%, var(--background-primary-alt))";
    case "dependency":
      return "color-mix(in srgb, var(--color-yellow) 18%, var(--background-primary-alt))";
    case "composition":
      return "color-mix(in srgb, var(--color-red) 18%, var(--background-primary-alt))";
    case "aggregation":
      return "color-mix(in srgb, var(--color-orange) 18%, var(--background-primary-alt))";
    case "association":
      return "color-mix(in srgb, var(--color-green) 18%, var(--background-primary-alt))";
    case "fk":
      return "color-mix(in srgb, var(--color-purple) 18%, var(--background-primary-alt))";
    default:
      return "var(--background-secondary)";
  }
}
function truncateValue(value, maxLength) {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 3)}...`;
}

// src/renderers/object-renderer.ts
function renderObjectModel(model, context) {
  const root = document.createElement("section");
  root.className = "mdspec-object-focus";
  root.style.flex = "0 0 auto";
  const title = document.createElement("h2");
  title.textContent = getPrimaryTitle(model);
  title.style.margin = "0 0 6px 0";
  title.style.fontSize = "18px";
  root.appendChild(title);
  const meta = document.createElement("div");
  meta.style.display = "grid";
  meta.style.gridTemplateColumns = "96px 1fr";
  meta.style.gap = "4px 10px";
  meta.style.padding = "8px 10px";
  meta.style.border = "1px solid var(--background-modifier-border)";
  meta.style.borderRadius = "8px";
  meta.style.background = "var(--background-primary-alt)";
  meta.style.fontSize = "12px";
  if (model.fileType === "er-entity") {
    appendMeta(meta, "Logical Name", model.logicalName);
    appendMeta(meta, "Physical Name", model.physicalName);
    appendMeta(meta, "Type", "er_entity");
    appendMeta(meta, "Schema Name", model.schemaName ?? "-");
    appendMeta(meta, "DBMS", model.dbms ?? "-");
    appendMeta(meta, "Related Count", String(context?.relatedObjects.length ?? 0));
  } else if (model.fileType === "object") {
    appendMeta(meta, "Name", model.name);
    appendMeta(meta, "Type", "class");
    appendMeta(meta, "Kind", model.kind);
    appendMeta(meta, "Related Count", String(context?.relatedObjects.length ?? 0));
  } else {
    appendMeta(meta, "Name", model.name);
    appendMeta(meta, "Type", "dfd_object");
    appendMeta(meta, "Kind", model.kind);
  }
  root.appendChild(meta);
  return root;
}
function getPrimaryTitle(model) {
  return model.fileType === "er-entity" ? model.logicalName : model.name;
}
function appendMeta(container, label, value) {
  const key = document.createElement("div");
  key.textContent = label;
  key.style.fontWeight = "600";
  key.style.color = "var(--text-muted)";
  key.style.lineHeight = "1.3";
  const val = document.createElement("div");
  val.textContent = value;
  val.style.lineHeight = "1.3";
  container.append(key, val);
}

// src/views/view-icon.ts
var MODELING_VIEW_ICON = "git-branch";

// src/views/modeling-preview-view.ts
var MODELING_PREVIEW_VIEW_TYPE = "mdspec-preview";
var VIEWPORT_STATE_CACHE_LIMIT = 50;
var ModelingPreviewView = class extends import_obsidian5.ItemView {
  constructor(leaf) {
    super(leaf);
    this.diagramViewportState = {
      zoom: 1,
      panX: 0,
      panY: 0,
      viewMode: "fit",
      hasAutoFitted: false,
      hasUserInteracted: false
    };
    this.objectGraphViewportState = {
      zoom: 1,
      panX: 0,
      panY: 0,
      viewMode: "fit",
      hasAutoFitted: false,
      hasUserInteracted: false
    };
    this.state = {
      mode: "empty",
      message: "\u5BFE\u5FDC\u30D5\u30A1\u30A4\u30EB\u3092\u958B\u304F\u3068\u30D7\u30EC\u30D3\u30E5\u30FC\u304C\u8868\u793A\u3055\u308C\u307E\u3059\u3002",
      warnings: []
    };
    this.diagramFilePath = null;
    this.objectGraphFilePath = null;
    this.viewportStateCache = /* @__PURE__ */ new Map();
  }
  getViewType() {
    return MODELING_PREVIEW_VIEW_TYPE;
  }
  getDisplayText() {
    return "Modeling Preview";
  }
  getIcon() {
    return MODELING_VIEW_ICON;
  }
  async onOpen() {
    this.renderCurrentState();
  }
  async onClose() {
    this.clearView();
  }
  async exportCurrentDiagramAsPng() {
    const exportRenderable = this.buildCurrentDiagramExportRenderable();
    if (!exportRenderable) {
      return null;
    }
    return exportDiagramRenderableAsPng(this.app, exportRenderable);
  }
  updateContent(state, reason = "rerender") {
    this.persistActiveViewportState();
    this.prepareViewportState(state, reason);
    this.state = state;
    this.renderCurrentState();
  }
  persistActiveViewportState() {
    if (this.diagramFilePath) {
      this.rememberViewportState(this.diagramFilePath, this.diagramViewportState);
    }
    if (this.objectGraphFilePath) {
      this.rememberViewportState(this.objectGraphFilePath, this.objectGraphViewportState);
    }
  }
  prepareViewportState(state, reason) {
    if (state.mode === "diagram") {
      const nextFilePath = state.diagram.diagram.path;
      this.prepareFileViewportState(
        this.diagramViewportState,
        this.diagramFilePath,
        nextFilePath,
        reason
      );
      this.diagramFilePath = nextFilePath;
      return;
    }
    if (state.mode === "object" && state.context) {
      const objectPath = "filePath" in state.model ? state.model.filePath : state.model.path;
      this.prepareFileViewportState(
        this.objectGraphViewportState,
        this.objectGraphFilePath,
        objectPath,
        reason
      );
      this.objectGraphFilePath = objectPath;
      return;
    }
    if (state.mode === "dfd-object") {
      this.prepareFileViewportState(
        this.objectGraphViewportState,
        this.objectGraphFilePath,
        state.model.path,
        reason
      );
      this.objectGraphFilePath = state.model.path;
      return;
    }
    if (state.mode !== "object") {
      this.objectGraphFilePath = null;
    }
    this.diagramFilePath = null;
  }
  prepareFileViewportState(state, currentFilePath, nextFilePath, reason) {
    if (reason === "manual-fit" || currentFilePath === nextFilePath) {
      return;
    }
    const cached = this.viewportStateCache.get(nextFilePath);
    if (cached) {
      if (cached.viewMode === "fit") {
        resetGraphViewportState(state);
      } else {
        state.zoom = cached.zoom;
        state.panX = cached.panX;
        state.panY = cached.panY;
        state.viewMode = "manual";
        state.hasAutoFitted = true;
        state.hasUserInteracted = true;
      }
      cached.updatedAt = Date.now();
      return;
    }
    resetGraphViewportState(state);
  }
  rememberViewportState(filePath, state) {
    if (!state.hasAutoFitted && !state.hasUserInteracted) {
      return;
    }
    this.viewportStateCache.set(filePath, {
      filePath,
      viewMode: state.viewMode,
      zoom: state.zoom,
      panX: state.panX,
      panY: state.panY,
      updatedAt: Date.now()
    });
    this.pruneViewportStateCache();
  }
  pruneViewportStateCache() {
    if (this.viewportStateCache.size <= VIEWPORT_STATE_CACHE_LIMIT) {
      return;
    }
    const oldestEntries = [...this.viewportStateCache.entries()].sort(
      (left, right) => left[1].updatedAt - right[1].updatedAt
    );
    for (const [filePath] of oldestEntries.slice(
      0,
      this.viewportStateCache.size - VIEWPORT_STATE_CACHE_LIMIT
    )) {
      this.viewportStateCache.delete(filePath);
    }
  }
  getCurrentDiagramFilePath() {
    switch (this.state.mode) {
      case "diagram":
        return this.state.diagram.diagram.path;
      case "object":
        return this.state.context ? "filePath" in this.state.model ? this.state.model.filePath : this.state.model.path : null;
      case "dfd-object":
        return this.state.model.path;
      default:
        return null;
    }
  }
  buildCurrentDiagramExportRenderable() {
    const state = this.state;
    switch (state.mode) {
      case "diagram":
        return {
          filePath: state.diagram.diagram.path,
          render: () => renderDiagramModel(state.diagram, {
            hideTitle: true,
            hideDetails: true,
            forExport: true
          })
        };
      case "object": {
        const filePath = this.getCurrentDiagramFilePath();
        if (!filePath) {
          return null;
        }
        const context = state.context ?? {
          object: state.model,
          relatedObjects: [],
          warnings: []
        };
        const subgraph = buildObjectSubgraphScene(context);
        return {
          filePath,
          render: () => renderDiagramModel(subgraph, {
            hideTitle: true,
            hideDetails: true,
            forExport: true
          })
        };
      }
      case "dfd-object":
        return {
          filePath: state.model.path,
          render: () => renderDiagramModel(state.diagram, {
            hideTitle: true,
            hideDetails: true,
            forExport: true
          })
        };
      default:
        return null;
    }
  }
  createDiagramViewportStateHandler(filePath) {
    return (viewportState) => {
      if (this.state.mode !== "diagram" || this.diagramFilePath !== filePath || this.state.diagram.diagram.path !== filePath) {
        return;
      }
      this.rememberViewportState(filePath, viewportState);
    };
  }
  createObjectViewportStateHandler(filePath) {
    return (viewportState) => {
      if (this.state.mode !== "object" || this.objectGraphFilePath !== filePath) {
        return;
      }
      const currentPath = "filePath" in this.state.model ? this.state.model.filePath : this.state.model.path;
      if (currentPath !== filePath) {
        return;
      }
      this.rememberViewportState(filePath, viewportState);
    };
  }
  renderCurrentState() {
    this.clearView();
    switch (this.state.mode) {
      case "object":
        renderDiagnostics(
          this.contentEl,
          this.state.warnings,
          this.state.onOpenDiagnostic ?? void 0
        );
        this.renderObjectState(this.state);
        return;
      case "relations":
        renderDiagnostics(this.contentEl, this.state.warnings);
        this.renderRelationsState(this.state);
        return;
      case "dfd-object":
        renderDiagnostics(
          this.contentEl,
          this.state.warnings,
          this.state.onOpenDiagnostic ?? void 0
        );
        this.renderDfdObjectState(this.state);
        return;
      case "diagram":
        renderDiagnostics(
          this.contentEl,
          this.state.warnings,
          this.state.onOpenDiagnostic ?? void 0
        );
        this.renderDiagramState(this.state);
        return;
      case "empty":
      default:
        this.renderEmptyState(this.state.message);
    }
  }
  clearView() {
    this.contentEl.empty();
    this.contentEl.style.display = "flex";
    this.contentEl.style.flexDirection = "column";
    this.contentEl.style.height = "100%";
    this.contentEl.style.minHeight = "0";
    this.contentEl.style.gap = "10px";
    this.contentEl.style.overflow = "hidden";
    this.contentEl.style.paddingBottom = "12px";
  }
  renderEmptyState(message) {
    const section = document.createElement("section");
    section.style.display = "flex";
    section.style.flex = "1 1 auto";
    section.style.minHeight = "0";
    section.style.alignItems = "center";
    section.style.justifyContent = "center";
    section.style.border = "1px dashed var(--background-modifier-border)";
    section.style.borderRadius = "10px";
    section.style.background = "var(--background-primary-alt)";
    section.style.padding = "20px";
    const text = document.createElement("p");
    text.textContent = message;
    text.style.margin = "0";
    text.style.color = "var(--text-muted)";
    text.style.textAlign = "center";
    section.appendChild(text);
    this.contentEl.appendChild(section);
  }
  renderObjectState(state) {
    const objectPath = "filePath" in state.model ? state.model.filePath : state.model.path;
    this.contentEl.appendChild(renderObjectModel(state.model, state.context));
    if (state.context) {
      this.contentEl.appendChild(
        renderObjectContext(state.context, {
          onOpenObject: state.onOpenObject ?? void 0,
          viewportState: this.objectGraphViewportState,
          onViewportStateChange: this.createObjectViewportStateHandler(objectPath)
        })
      );
    }
  }
  renderRelationsState(state) {
    const model = state.model;
    this.contentEl.createEl("h2", {
      text: model.title ?? model.frontmatter.id?.toString() ?? "Relations"
    });
    if (model.relations.length === 0) {
      this.contentEl.createEl("p", { text: "No relations defined." });
      return;
    }
    const list = this.contentEl.createEl("ul");
    for (const relation of model.relations) {
      const label = relation.label ? ` (${relation.label})` : "";
      list.createEl("li", {
        text: `${relation.source} -[${relation.kind}]-> ${relation.target}${label}`
      });
    }
  }
  renderDfdObjectState(state) {
    this.contentEl.appendChild(renderObjectModel(state.model));
    this.contentEl.appendChild(
      renderDiagramModel(state.diagram, {
        hideTitle: true,
        hideDetails: false,
        onOpenObject: state.onOpenObject ?? void 0,
        viewportState: this.objectGraphViewportState,
        onViewportStateChange: this.createObjectViewportStateHandler(state.model.path)
      })
    );
  }
  renderDiagramState(state) {
    this.contentEl.appendChild(
      renderDiagramModel(state.diagram, {
        onOpenObject: state.onOpenObject ?? void 0,
        viewportState: this.diagramViewportState,
        onViewportStateChange: this.createDiagramViewportStateHandler(
          state.diagram.diagram.path
        )
      })
    );
  }
};
function renderDiagnostics(container, diagnostics, onOpenDiagnostic) {
  const notes = diagnostics.filter((diagnostic) => diagnostic.severity === "info");
  const warnings = diagnostics.filter((diagnostic) => diagnostic.severity === "warning");
  const errors = diagnostics.filter((diagnostic) => diagnostic.severity === "error");
  if (notes.length === 0 && warnings.length === 0 && errors.length === 0) {
    return;
  }
  if (notes.length > 0) {
    renderDiagnosticSection(container, "Notes", notes, onOpenDiagnostic, "var(--text-muted)");
  }
  if (warnings.length > 0) {
    renderDiagnosticSection(
      container,
      "Warnings",
      warnings,
      onOpenDiagnostic,
      "var(--text-warning)"
    );
  }
  if (errors.length > 0) {
    renderDiagnosticSection(
      container,
      "Errors",
      errors,
      onOpenDiagnostic,
      "var(--text-error)"
    );
  }
}
function renderDiagnosticSection(container, title, diagnostics, onOpenDiagnostic, color) {
  const details = container.createEl("details");
  details.className = "mdspec-diagnostic-section";
  details.open = title !== "Notes";
  details.style.fontSize = "12px";
  const summary = details.createEl("summary", {
    text: `${title} (${diagnostics.length})`
  });
  summary.style.cursor = "pointer";
  summary.style.color = color;
  const list = details.createEl("ul");
  list.style.margin = "8px 0 0";
  list.style.paddingLeft = "18px";
  for (const diagnostic of diagnostics) {
    const item = list.createEl("li");
    item.textContent = diagnostic.message;
    if (onOpenDiagnostic) {
      item.style.cursor = "pointer";
      item.style.borderRadius = "4px";
      item.style.padding = "2px 4px";
      item.title = "Open this diagnostic in the editor";
      item.tabIndex = 0;
      item.onmouseenter = () => {
        item.style.background = "var(--background-modifier-hover)";
      };
      item.onmouseleave = () => {
        item.style.background = "";
      };
      item.onclick = () => onOpenDiagnostic(diagnostic);
      item.onkeydown = (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenDiagnostic(diagnostic);
        }
      };
    }
  }
}

// src/main.ts
var LEGACY_PREVIEW_VIEW_TYPES = [
  "mdspec-object-preview",
  "mdspec-relations-preview",
  "mdspec-diagram-preview"
];
var UNSUPPORTED_MESSAGE = "This file format is not supported. Supported formats: class / class_diagram / er_entity / er_diagram / dfd_object / dfd_diagram";
var DEPRECATED_ER_RELATION_MESSAGE = "This file format is not supported. Use er_entity with ## Relations instead of the legacy er_relation format.";
var DEPRECATED_DIAGRAM_MESSAGE = "This file format is not supported. Migrate legacy diagram_v1 files to class_diagram or er_diagram.";
var MARKDOWN_ONLY_NOTICE2 = "Template insertion is available only for Markdown files.";
var NON_EMPTY_FILE_NOTICE = "Current file is not empty. Template insertion is available only for empty files.";
var ER_RELATION_TYPE_NOTICE = "ER relation block insertion is available only for er_entity files.";
var ModelingToolPlugin = class extends import_obsidian6.Plugin {
  constructor() {
    super(...arguments);
    this.index = null;
    this.previewLeaf = null;
  }
  async onload() {
    this.registerView(
      MODELING_PREVIEW_VIEW_TYPE,
      (leaf) => new ModelingPreviewView(leaf)
    );
    this.addCommand({
      id: "rebuild-modeling-index",
      name: "Rebuild modeling index",
      callback: async () => {
        await this.rebuildIndex();
        await this.syncPreviewToActiveFile(false, "rerender");
        new import_obsidian6.Notice("Modeling index rebuilt");
      }
    });
    this.addCommand({
      id: "open-modeling-preview",
      name: "Open modeling preview for active file",
      callback: async () => {
        await this.openPreviewForActiveFile();
      }
    });
    this.addCommand({
      id: "insert-class-template",
      name: "Insert Class Template",
      callback: async () => {
        await this.insertTemplateIntoActiveFile("class");
      }
    });
    this.addCommand({
      id: "insert-class-diagram-template",
      name: "Insert Class Diagram Template",
      callback: async () => {
        await this.insertTemplateIntoActiveFile("classDiagram");
      }
    });
    this.addCommand({
      id: "insert-er-entity-template",
      name: "Insert ER Entity Template",
      callback: async () => {
        await this.insertTemplateIntoActiveFile("erEntity");
      }
    });
    this.addCommand({
      id: "insert-er-diagram-template",
      name: "Insert ER Diagram Template",
      callback: async () => {
        await this.insertTemplateIntoActiveFile("erDiagram");
      }
    });
    this.addCommand({
      id: "insert-dfd-object-template",
      name: "Insert DFD Object Template",
      callback: async () => {
        await this.insertTemplateIntoActiveFile("dfdObject");
      }
    });
    this.addCommand({
      id: "insert-dfd-diagram-template",
      name: "Insert DFD Diagram Template",
      callback: async () => {
        await this.insertTemplateIntoActiveFile("dfdDiagram");
      }
    });
    this.addCommand({
      id: "insert-data-object-template",
      name: "Insert Data Object Template",
      callback: async () => {
        await this.insertTemplateIntoActiveFile("dataObject");
      }
    });
    this.addCommand({
      id: "insert-er-relation-block",
      name: "Insert ER Relation Block",
      callback: async () => {
        await this.insertErRelationBlock();
      }
    });
    this.addCommand({
      id: "complete-current-field",
      name: "Complete Current Field",
      callback: () => {
        openModelWeaveCompletion(this.app, () => this.index);
      }
    });
    this.addCommand({
      id: "export-current-diagram-as-png",
      name: "Export Current Diagram as PNG",
      callback: async () => {
        await this.exportCurrentDiagramAsPng();
      }
    });
    this.registerEvent(
      this.app.workspace.on("file-open", async () => {
        await this.syncPreviewToActiveFile(false, "external-file-open");
      })
    );
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", async (leaf) => {
        if (leaf && this.isPreviewLeaf(leaf)) {
          return;
        }
        await this.syncPreviewToActiveFile(false, "external-file-open");
      })
    );
    this.registerEvent(
      this.app.vault.on("modify", async () => {
        await this.rebuildIndex();
        await this.syncPreviewToActiveFile(false, "rerender");
      })
    );
    this.registerEvent(
      this.app.vault.on("create", async () => {
        await this.rebuildIndex();
        await this.syncPreviewToActiveFile(false, "rerender");
      })
    );
    this.registerEvent(
      this.app.vault.on("delete", async () => {
        await this.rebuildIndex();
        await this.syncPreviewToActiveFile(false, "rerender");
      })
    );
    this.registerEvent(
      this.app.vault.on("rename", async () => {
        await this.rebuildIndex();
        await this.syncPreviewToActiveFile(false, "rerender");
      })
    );
    await this.rebuildIndex();
    this.app.workspace.onLayoutReady(() => {
      void this.normalizePreviewLeaves().then(
        () => this.syncPreviewToActiveFile(true, "initial-open")
      );
    });
    console.info("[model-weave] plugin loaded");
  }
  onunload() {
    if (this.previewLeaf) {
      this.previewLeaf.detach();
      this.previewLeaf = null;
    }
    console.info("[model-weave] plugin unloaded");
  }
  async rebuildIndex() {
    const files = await Promise.all(
      this.app.vault.getMarkdownFiles().map(async (file) => ({
        path: file.path,
        content: await this.app.vault.cachedRead(file)
      }))
    );
    this.index = buildVaultIndex(files);
  }
  async openPreviewForActiveFile() {
    if (!this.index) {
      await this.rebuildIndex();
    }
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new import_obsidian6.Notice("No active markdown file");
      return;
    }
    await this.showPreviewForFile(file, void 0, true, "external-file-open");
  }
  async exportCurrentDiagramAsPng() {
    const view = await this.findExportableModelWeaveView();
    if (!view) {
      new import_obsidian6.Notice("No exportable Model Weave diagram is currently displayed.");
      return;
    }
    try {
      const exportPath = await view.exportCurrentDiagramAsPng();
      if (!exportPath) {
        new import_obsidian6.Notice("The current Model Weave view is not ready for export.");
        return;
      }
      new import_obsidian6.Notice(`Diagram exported: ${exportPath}`);
    } catch (error) {
      console.error("[model-weave] failed to export PNG", error);
      if (error instanceof DiagramExportError) {
        if (error.code === "bounds-invalid") {
          new import_obsidian6.Notice("The current diagram has no measurable export bounds.");
          return;
        }
        new import_obsidian6.Notice("Failed to export the current diagram as PNG.");
        return;
      }
      new import_obsidian6.Notice("Failed to export the current diagram as PNG.");
    }
  }
  async insertTemplateIntoActiveFile(templateKey) {
    const target = await this.getActiveMarkdownTarget();
    if (!target) {
      new import_obsidian6.Notice(MARKDOWN_ONLY_NOTICE2);
      return;
    }
    const currentContent = target.getContent();
    if (currentContent.trim().length > 0) {
      new import_obsidian6.Notice(NON_EMPTY_FILE_NOTICE);
      return;
    }
    await target.setContent(MODEL_WEAVE_TEMPLATES[templateKey]);
  }
  async insertErRelationBlock() {
    const target = await this.getActiveMarkdownTarget();
    if (!target) {
      new import_obsidian6.Notice(MARKDOWN_ONLY_NOTICE2);
      return;
    }
    if (this.getActiveFileType(target.file) !== "er_entity") {
      new import_obsidian6.Notice(ER_RELATION_TYPE_NOTICE);
      return;
    }
    const lineEnding = this.detectLineEnding(target.getContent());
    const block = MODEL_WEAVE_RELATION_TEMPLATES.erRelationBlock.join(lineEnding);
    const nextContent = this.appendErRelationBlock(target.getContent(), block, lineEnding);
    await target.setContent(nextContent);
  }
  async getActiveMarkdownTarget() {
    const file = this.app.workspace.getActiveFile();
    if (!file || file.extension !== "md") {
      return null;
    }
    const activeView = this.app.workspace.getActiveViewOfType(import_obsidian6.MarkdownView);
    if (activeView?.file?.path === file.path) {
      return {
        file,
        getContent: () => activeView.editor.getValue(),
        setContent: async (content) => {
          activeView.editor.setValue(content);
          await this.app.vault.modify(file, content);
        }
      };
    }
    const cachedContent = await this.app.vault.cachedRead(file);
    return {
      file,
      getContent: () => cachedContent,
      setContent: async (content) => {
        await this.app.vault.modify(file, content);
      }
    };
  }
  getActiveFileType(file) {
    const frontmatterType = this.app.metadataCache.getFileCache(file)?.frontmatter?.type;
    if (typeof frontmatterType === "string" && frontmatterType.trim()) {
      return frontmatterType.trim();
    }
    return void 0;
  }
  detectLineEnding(content) {
    return content.includes("\r\n") ? "\r\n" : "\n";
  }
  appendErRelationBlock(content, block, lineEnding) {
    const section = this.findSection(content, "Relations");
    if (section) {
      const after = content.slice(section.end);
      const sectionText = content.slice(section.start, section.end).replace(/\s*$/u, "");
      const updatedSection = `${sectionText}${lineEnding}${lineEnding}${block}${lineEnding}`;
      return `${content.slice(0, section.start)}${updatedSection}${after.replace(/^\s*/u, "")}`;
    }
    const relationsSection = `## Relations${lineEnding}${lineEnding}${block}${lineEnding}`;
    return this.insertSectionBeforeNotesOrEnd(content, relationsSection, lineEnding);
  }
  insertSectionBeforeNotesOrEnd(content, sectionContent, lineEnding) {
    const notesSection = this.findSection(content, "Notes");
    const trimmedSection = sectionContent.replace(/\s*$/u, "");
    if (notesSection) {
      const before = content.slice(0, notesSection.start).replace(/\s*$/u, "");
      const after = content.slice(notesSection.start).replace(/^\s*/u, "");
      return `${before}${lineEnding}${lineEnding}${trimmedSection}${lineEnding}${lineEnding}${after}`;
    }
    const trimmedContent = content.replace(/\s*$/u, "");
    if (!trimmedContent) {
      return `${trimmedSection}${lineEnding}`;
    }
    return `${trimmedContent}${lineEnding}${lineEnding}${trimmedSection}${lineEnding}`;
  }
  findSection(content, sectionName) {
    const headingRegex = new RegExp(`^##\\s+${sectionName}\\s*$`, "m");
    const headingMatch = headingRegex.exec(content);
    if (!headingMatch || headingMatch.index === void 0) {
      return null;
    }
    const start = headingMatch.index;
    const searchStart = start + headingMatch[0].length;
    const remainder = content.slice(searchStart);
    const nextHeadingMatch = /^##\s+/m.exec(remainder);
    const end = nextHeadingMatch && nextHeadingMatch.index !== void 0 ? searchStart + nextHeadingMatch.index : content.length;
    return { start, end };
  }
  async syncPreviewToActiveFile(openIfSupported = false, reason = "rerender") {
    const file = this.app.workspace.getActiveFile();
    const previewLeaf = this.getManagedPreviewLeaf();
    if (!file) {
      if (previewLeaf) {
        await this.updateEmptyState(previewLeaf, [], void 0, reason);
      }
      return;
    }
    if (!this.index) {
      await this.rebuildIndex();
    }
    const model = this.index?.modelsByFilePath[file.path];
    const fileType = model ? detectFileType(model.frontmatter) : "markdown";
    const isSupported = fileType === "object" || fileType === "er-entity" || fileType === "diagram" || fileType === "dfd-object" || fileType === "dfd-diagram";
    if (!previewLeaf && !openIfSupported) {
      return;
    }
    if (!isSupported) {
      if (previewLeaf) {
        await this.updateEmptyState(
          previewLeaf,
          [],
          await this.getEmptyStateMessage(file),
          reason
        );
      }
      return;
    }
    await this.showPreviewForFile(
      file,
      previewLeaf ?? void 0,
      openIfSupported,
      reason
    );
  }
  async showPreviewForFile(file, preferredLeaf, activate = true, reason = "rerender") {
    if (!this.index) {
      await this.rebuildIndex();
    }
    if (!this.index) {
      return;
    }
    const model = this.index.modelsByFilePath[file.path];
    const leaf = await this.ensurePreviewLeaf(preferredLeaf, activate);
    await leaf.loadIfDeferred();
    const view = leaf.view;
    if (!(view instanceof ModelingPreviewView)) {
      return;
    }
    if (!model) {
      view.updateContent({
        mode: "empty",
        message: await this.getEmptyStateMessage(file),
        warnings: []
      }, reason);
      return;
    }
    switch (detectFileType(model.frontmatter)) {
      case "object":
      case "er-entity": {
        const objectModel = model.fileType === "object" || model.fileType === "er-entity" ? model : null;
        const context = objectModel && this.index ? resolveObjectContext(objectModel, this.index) : null;
        const warnings = [
          ...this.index.warningsByFilePath[file.path] ?? [],
          ...context?.warnings ?? []
        ];
        if (objectModel) {
          const diagnostics = buildCurrentObjectDiagnostics(
            objectModel,
            this.index,
            context,
            warnings
          );
          view.updateContent({
            mode: "object",
            model: objectModel,
            context,
            warnings: diagnostics,
            onOpenDiagnostic: (diagnostic) => {
              void this.openDiagnosticLocation(file.path, diagnostic);
            },
            onOpenObject: (objectId, navigation) => {
              void this.openObjectNote(objectId, file.path, navigation);
            }
          }, reason);
        } else {
          view.updateContent({
            mode: "empty",
            message: UNSUPPORTED_MESSAGE,
            warnings: []
          }, reason);
        }
        return;
      }
      case "dfd-object": {
        const dfdObject = model.fileType === "dfd-object" ? model : null;
        const warnings = this.index.warningsByFilePath[file.path] ?? [];
        if (dfdObject) {
          const diagnostics = buildCurrentObjectDiagnostics(
            dfdObject,
            this.index,
            null,
            warnings
          );
          const diagram = buildDfdObjectScene(dfdObject);
          view.updateContent({
            mode: "dfd-object",
            model: dfdObject,
            diagram,
            warnings: [...diagnostics, ...diagram.warnings],
            onOpenDiagnostic: (diagnostic) => {
              void this.openDiagnosticLocation(file.path, diagnostic);
            },
            onOpenObject: (objectId, navigation) => {
              void this.openObjectNote(objectId, file.path, navigation);
            }
          }, reason);
        } else {
          view.updateContent({
            mode: "empty",
            message: UNSUPPORTED_MESSAGE,
            warnings: []
          }, reason);
        }
        return;
      }
      case "diagram": {
        const resolved = model.fileType === "diagram" && this.index ? resolveDiagramRelations(model, this.index) : null;
        const warnings = [
          ...this.index.warningsByFilePath[file.path] ?? [],
          ...resolved?.warnings ?? []
        ];
        const diagnostics = resolved ? buildCurrentDiagramDiagnostics(resolved, warnings) : warnings;
        view.updateContent(
          resolved ? {
            mode: "diagram",
            diagram: resolved,
            warnings: diagnostics,
            onOpenDiagnostic: (diagnostic) => {
              void this.openDiagnosticLocation(file.path, diagnostic);
            },
            onOpenObject: (objectId, navigation) => {
              void this.openObjectNote(objectId, file.path, navigation);
            }
          } : {
            mode: "empty",
            message: UNSUPPORTED_MESSAGE,
            warnings: []
          },
          reason
        );
        return;
      }
      case "dfd-diagram": {
        const resolved = model.fileType === "dfd-diagram" && this.index ? resolveDiagramRelations(model, this.index) : null;
        const warnings = [
          ...this.index.warningsByFilePath[file.path] ?? [],
          ...resolved?.warnings ?? []
        ];
        const diagnostics = resolved ? buildCurrentDiagramDiagnostics(resolved, warnings) : warnings;
        view.updateContent(
          resolved ? {
            mode: "diagram",
            diagram: resolved,
            warnings: diagnostics,
            onOpenDiagnostic: (diagnostic) => {
              void this.openDiagnosticLocation(file.path, diagnostic);
            },
            onOpenObject: (objectId, navigation) => {
              void this.openObjectNote(objectId, file.path, navigation);
            }
          } : {
            mode: "empty",
            message: UNSUPPORTED_MESSAGE,
            warnings: []
          },
          reason
        );
        return;
      }
      case "markdown":
      default:
        view.updateContent({
          mode: "empty",
          message: await this.getEmptyStateMessage(file),
          warnings: this.index.warningsByFilePath[file.path] ?? []
        }, reason);
    }
  }
  async updateEmptyState(leaf, warnings = [], message = UNSUPPORTED_MESSAGE, reason = "rerender") {
    await leaf.loadIfDeferred();
    if (leaf.view instanceof ModelingPreviewView) {
      leaf.view.updateContent({
        mode: "empty",
        message,
        warnings
      }, reason);
    }
  }
  async getEmptyStateMessage(file) {
    const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
    if (frontmatter?.type === "er_relation") {
      return DEPRECATED_ER_RELATION_MESSAGE;
    }
    if (frontmatter?.type === "diagram" || frontmatter?.schema === "diagram_v1" || typeof frontmatter?.diagram_kind === "string") {
      return DEPRECATED_DIAGRAM_MESSAGE;
    }
    const content = await this.app.vault.cachedRead(file);
    if (/^\s*---[\s\S]*?\btype\s*:\s*er_relation\b[\s\S]*?---/m.test(content)) {
      return DEPRECATED_ER_RELATION_MESSAGE;
    }
    if (/^\s*---[\s\S]*?\btype\s*:\s*diagram\b[\s\S]*?---/m.test(content) || /^\s*---[\s\S]*?\bschema\s*:\s*diagram_v1\b[\s\S]*?---/m.test(content) || /^\s*---[\s\S]*?\bdiagram_kind\s*:\s*[A-Za-z0-9_-]+\b[\s\S]*?---/m.test(content)) {
      return DEPRECATED_DIAGRAM_MESSAGE;
    }
    return UNSUPPORTED_MESSAGE;
  }
  async openObjectNote(objectId, sourcePath, navigation) {
    if (!this.index) {
      await this.rebuildIndex();
    }
    if (!this.index) {
      new import_obsidian6.Notice("Model index is not available");
      return;
    }
    const result = await openModelObjectNote(this.app, this.index, objectId, {
      sourcePath,
      openInNewLeaf: navigation?.openInNewLeaf ?? false
    });
    if (!result.ok) {
      new import_obsidian6.Notice(result.reason ?? `Could not open object "${objectId}"`);
      return;
    }
    await this.syncPreviewToActiveFile(false, "viewer-node-navigation");
  }
  async openDiagnosticLocation(filePath, diagnostic) {
    const targetPath = diagnostic.filePath ?? diagnostic.path ?? filePath;
    const abstractFile = this.app.vault.getAbstractFileByPath(targetPath);
    if (!(abstractFile instanceof import_obsidian6.TFile)) {
      return;
    }
    const activeMarkdownView = this.app.workspace.getActiveViewOfType(import_obsidian6.MarkdownView);
    let targetLeaf = activeMarkdownView?.file?.path === targetPath ? activeMarkdownView.leaf : this.findMarkdownLeafForPath(targetPath);
    if (!targetLeaf) {
      targetLeaf = this.app.workspace.getMostRecentLeaf();
      if (targetLeaf && this.isPreviewLeaf(targetLeaf)) {
        targetLeaf = this.app.workspace.getLeaf(true);
      }
    }
    if (!targetLeaf) {
      return;
    }
    if (targetLeaf.view.file?.path !== targetPath) {
      await targetLeaf.openFile(abstractFile);
    }
    this.app.workspace.setActiveLeaf(targetLeaf, { focus: true });
    const markdownView = targetLeaf.view instanceof import_obsidian6.MarkdownView ? targetLeaf.view : this.app.workspace.getActiveViewOfType(import_obsidian6.MarkdownView);
    const editor = markdownView?.editor;
    if (!editor) {
      return;
    }
    const content = editor.getValue();
    const targetLine = resolveDiagnosticLine(content, diagnostic);
    editor.setCursor({ line: targetLine, ch: 0 });
    editor.scrollIntoView(
      {
        from: { line: targetLine, ch: 0 },
        to: { line: targetLine, ch: 0 }
      },
      true
    );
  }
  findMarkdownLeafForPath(filePath) {
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      const viewFile = leaf.view.file ?? null;
      if (viewFile?.path === filePath) {
        return leaf;
      }
    }
    return null;
  }
  async ensurePreviewLeaf(preferredLeaf, activate = true) {
    const leaf = preferredLeaf ?? await this.findOrCreatePreviewLeaf();
    await leaf.setViewState({
      type: MODELING_PREVIEW_VIEW_TYPE,
      active: activate
    });
    this.previewLeaf = leaf;
    return leaf;
  }
  async findOrCreatePreviewLeaf() {
    const existing = this.getManagedPreviewLeaf();
    if (existing) {
      await this.closeDuplicatePreviewLeaves(existing);
      return existing;
    }
    const leaf = this.app.workspace.getRightLeaf(false) ?? this.app.workspace.getLeaf(true);
    this.previewLeaf = leaf;
    return leaf;
  }
  getManagedPreviewLeaf() {
    if (this.previewLeaf && this.isPreviewLeaf(this.previewLeaf)) {
      return this.previewLeaf;
    }
    const leaves = this.getAllPreviewLeaves();
    if (leaves.length === 0) {
      this.previewLeaf = null;
      return null;
    }
    this.previewLeaf = leaves[0];
    return this.previewLeaf;
  }
  async findExportableModelWeaveView() {
    const candidateLeaves = [];
    const activeLeaf = this.app.workspace.activeLeaf;
    if (activeLeaf) {
      candidateLeaves.push(activeLeaf);
    }
    if (this.previewLeaf) {
      candidateLeaves.push(this.previewLeaf);
    }
    candidateLeaves.push(...this.getAllPreviewLeaves());
    const orderedLeaves = Array.from(new Set(candidateLeaves));
    const loadedViews = [];
    for (const leaf of orderedLeaves) {
      if (!this.isPreviewLeaf(leaf)) {
        continue;
      }
      await leaf.loadIfDeferred();
      const view = leaf.view;
      if (view instanceof ModelingPreviewView) {
        loadedViews.push(view);
        if (this.isExportablePreviewView(view)) {
          this.previewLeaf = leaf;
          return view;
        }
      }
    }
    if (loadedViews.length > 0) {
      return loadedViews[0];
    }
    return null;
  }
  isExportablePreviewView(view) {
    const container = view.contentEl;
    if (!container?.isConnected) {
      return false;
    }
    if (container.getClientRects().length > 0) {
      return true;
    }
    return container.clientWidth > 0 || container.clientHeight > 0;
  }
  getAllPreviewLeaves() {
    const leaves = [
      ...this.app.workspace.getLeavesOfType(MODELING_PREVIEW_VIEW_TYPE),
      ...LEGACY_PREVIEW_VIEW_TYPES.flatMap(
        (viewType) => this.app.workspace.getLeavesOfType(viewType)
      )
    ];
    return Array.from(new Set(leaves));
  }
  async closeDuplicatePreviewLeaves(keepLeaf) {
    const duplicates = this.getAllPreviewLeaves().filter((leaf) => leaf !== keepLeaf);
    for (const leaf of duplicates) {
      await leaf.loadIfDeferred();
      leaf.detach();
    }
  }
  isPreviewLeaf(leaf) {
    const viewType = leaf.view.getViewType();
    return viewType === MODELING_PREVIEW_VIEW_TYPE || LEGACY_PREVIEW_VIEW_TYPES.includes(
      viewType
    );
  }
  async normalizePreviewLeaves() {
    const leaves = this.getAllPreviewLeaves();
    if (leaves.length === 0) {
      return;
    }
    const keepLeaf = leaves[0];
    await keepLeaf.loadIfDeferred();
    await keepLeaf.setViewState({
      type: MODELING_PREVIEW_VIEW_TYPE,
      active: false
    });
    this.previewLeaf = keepLeaf;
    await this.closeDuplicatePreviewLeaves(keepLeaf);
  }
};
function resolveDiagnosticLine(content, diagnostic) {
  if (typeof diagnostic.line === "number" && diagnostic.line >= 0) {
    return diagnostic.line;
  }
  if (typeof diagnostic.fromLine === "number" && diagnostic.fromLine >= 0) {
    return diagnostic.fromLine;
  }
  if (typeof diagnostic.toLine === "number" && diagnostic.toLine >= 0) {
    return diagnostic.toLine;
  }
  const lines = content.split(/\r?\n/);
  const frontmatterField = typeof diagnostic.field === "string" ? diagnostic.field : "";
  const section = resolveDiagnosticSection(diagnostic);
  if (frontmatterField && isFrontmatterField(frontmatterField)) {
    const frontmatterLine = findFrontmatterFieldLine(lines, frontmatterField);
    if (frontmatterLine >= 0) {
      return frontmatterLine;
    }
  }
  const relatedId = typeof diagnostic.context?.relatedId === "string" ? diagnostic.context.relatedId : null;
  if (section === "Relations" && relatedId) {
    const relationBlockLine = findLineIndex(lines, (line) => line.trim() === `### ${relatedId}`);
    if (relationBlockLine >= 0) {
      return relationBlockLine;
    }
    const relationRowLine = findLineIndex(lines, (line) => line.includes(`| ${relatedId} |`));
    if (relationRowLine >= 0) {
      return relationRowLine;
    }
  }
  if (section) {
    const sectionLine = findLineIndex(lines, (line) => line.trim() === `## ${section}`);
    if (sectionLine >= 0) {
      return sectionLine;
    }
  }
  return 0;
}
function resolveDiagnosticSection(diagnostic) {
  if (typeof diagnostic.section === "string" && diagnostic.section.trim()) {
    return diagnostic.section.trim();
  }
  const contextSection = typeof diagnostic.context?.section === "string" ? diagnostic.context.section : null;
  if (contextSection) {
    return contextSection;
  }
  const field = typeof diagnostic.field === "string" ? diagnostic.field : "";
  if (field.startsWith("Relations:")) {
    return "Relations";
  }
  const fieldToSection = {
    objectRefs: "Objects",
    relations: "Relations",
    relatedObjects: "Relations",
    Attributes: "Attributes",
    Methods: "Methods",
    Relations: "Relations",
    Objects: "Objects",
    Columns: "Columns",
    Indexes: "Indexes",
    Notes: "Notes",
    Summary: "Summary",
    Overview: "Overview"
  };
  return fieldToSection[field] ?? null;
}
function isFrontmatterField(field) {
  return [
    "type",
    "id",
    "name",
    "kind",
    "logical_name",
    "physical_name",
    "schema_name",
    "dbms",
    "package",
    "stereotype"
  ].includes(field);
}
function findFrontmatterFieldLine(lines, field) {
  if ((lines[0] ?? "").trim() !== "---") {
    return -1;
  }
  for (let index = 1; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (trimmed === "---") {
      break;
    }
    if (trimmed.startsWith(`${field}:`)) {
      return index;
    }
  }
  return -1;
}
function findLineIndex(lines, predicate) {
  for (let index = 0; index < lines.length; index += 1) {
    if (predicate(lines[index] ?? "")) {
      return index;
    }
  }
  return -1;
}
