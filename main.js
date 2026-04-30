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
  default: () => ModelWeavePlugin
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
    objectEntries: [
      {
        id: object.id,
        label: object.name,
        kind: object.kind,
        ref: object.id,
        rowIndex: 0,
        compatibilityMode: "explicit"
      }
    ],
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
function parseQualifiedRef(reference) {
  const trimmed = reference.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith("[[")) {
    const closeIndex = trimmed.indexOf("]]");
    if (closeIndex >= 0) {
      const baseRefRaw = trimmed.slice(0, closeIndex + 2);
      const remainder = trimmed.slice(closeIndex + 2);
      const memberRef = parseQualifiedMemberSuffix(remainder);
      return {
        raw: trimmed,
        baseRefRaw,
        memberRef: memberRef || void 0,
        hasMemberRef: Boolean(memberRef)
      };
    }
  }
  const markdownLinkMatch = trimmed.match(/^\[[^\]]+\]\([^)]+\)/);
  if (markdownLinkMatch) {
    const baseRefRaw = markdownLinkMatch[0];
    const remainder = trimmed.slice(baseRefRaw.length);
    const memberRef = parseQualifiedMemberSuffix(remainder);
    return {
      raw: trimmed,
      baseRefRaw,
      memberRef: memberRef || void 0,
      hasMemberRef: Boolean(memberRef)
    };
  }
  const rawMatch = trimmed.match(/^(.+)\.([A-Za-z0-9_-]+)$/);
  if (rawMatch && !isExternalLinkTarget(trimmed)) {
    return {
      raw: trimmed,
      baseRefRaw: rawMatch[1].trim(),
      memberRef: rawMatch[2],
      hasMemberRef: true
    };
  }
  return {
    raw: trimmed,
    baseRefRaw: trimmed,
    memberRef: void 0,
    hasMemberRef: false
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
    const byId = index.objectsById[candidate] ?? index.appProcessesById[candidate] ?? index.screensById[candidate] ?? index.codesetsById[candidate] ?? index.messagesById[candidate] ?? index.rulesById[candidate] ?? index.mappingsById[candidate] ?? index.dataObjectsById[candidate] ?? index.dfdObjectsById[candidate] ?? index.erEntitiesById[candidate] ?? index.erEntitiesByPhysicalName[candidate] ?? index.relationsFilesById[candidate] ?? index.diagramsById[candidate];
    if (byId) {
      return byId;
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
function getQualifiedMemberCandidates(baseReference, index) {
  const identity = resolveReferenceIdentity(baseReference, index);
  const merged = [];
  const seen = /* @__PURE__ */ new Set();
  const addCandidates = (candidates) => {
    for (const candidate of candidates ?? []) {
      const key = [
        candidate.ownerPath,
        candidate.memberKind,
        candidate.memberId,
        candidate.sourceSection,
        candidate.displayName ?? ""
      ].join("|");
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      merged.push(candidate);
    }
  };
  if (identity.resolvedId) {
    addCandidates(index.membersByOwnerId[identity.resolvedId]);
  }
  if (identity.resolvedFile) {
    addCandidates(index.membersByOwnerPath[identity.resolvedFile]);
  }
  return merged;
}
function resolveQualifiedMemberReference(reference, index) {
  const qualified = parseQualifiedRef(reference) ?? {
    raw: reference.trim(),
    baseRefRaw: reference.trim(),
    memberRef: void 0,
    hasMemberRef: false
  };
  const baseIdentity = resolveReferenceIdentity(qualified.baseRefRaw, index);
  const member = qualified.memberRef && baseIdentity.resolvedModel ? getQualifiedMemberCandidates(qualified.baseRefRaw, index).find(
    (candidate) => candidate.memberId === qualified.memberRef
  ) ?? null : null;
  return {
    qualified,
    baseIdentity,
    member
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
    case "app-process":
    case "screen":
    case "codeset":
    case "message":
    case "rule":
    case "mapping":
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
    case "app-process":
    case "screen":
    case "codeset":
    case "message":
    case "rule":
    case "mapping":
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
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed.startsWith("#") || trimmed.startsWith("^")) {
    return trimmed;
  }
  const withoutHeading = trimmed.split("#", 1)[0].trim();
  const withoutBlock = withoutHeading.split("^", 1)[0].trim();
  return withoutBlock.replace(/\.md$/i, "").replace(/\\/g, "/");
}
function isExternalLinkTarget(value) {
  const trimmed = value.trim();
  return /^[A-Za-z][A-Za-z0-9+.-]*:/.test(trimmed);
}
function parseQualifiedMemberSuffix(value) {
  const match = value.match(/^\.\s*([A-Za-z0-9_-]+)\s*$/);
  return match?.[1] ?? null;
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
  } else if (model.fileType === "app-process") {
    diagnostics.push(...buildAppProcessDiagnostics(model, index));
  } else if (model.fileType === "screen") {
    diagnostics.push(...buildScreenDiagnostics(model, index));
  } else if (model.fileType === "codeset") {
    diagnostics.push(...buildCodeSetDiagnostics(model));
  } else if (model.fileType === "message") {
    diagnostics.push(...buildMessageDiagnostics(model));
  } else if (model.fileType === "rule") {
    diagnostics.push(...buildRuleDiagnostics(model, index));
  } else if (model.fileType === "mapping") {
    diagnostics.push(...buildMappingDiagnostics(model, index));
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
function buildCodeSetDiagnostics(model) {
  const diagnostics = [];
  const codes = /* @__PURE__ */ new Set();
  const sortOrders = /* @__PURE__ */ new Set();
  if (!model.kind?.trim()) {
    diagnostics.push(createSectionWarning(model.path, "kind", "kind is empty"));
  }
  if (model.values.length === 0) {
    diagnostics.push(createSectionWarning(model.path, "Values", "values are empty"));
    return diagnostics;
  }
  for (const value of model.values) {
    const code = value.code?.trim();
    if (!code) {
      diagnostics.push(createSectionError(model.path, "Values", "values.code is empty"));
    } else {
      if (codes.has(code)) {
        diagnostics.push(createSectionError(model.path, "Values", `duplicate code "${code}"`));
      }
      codes.add(code);
    }
    if (!value.label?.trim()) {
      diagnostics.push(createSectionWarning(model.path, "Values", `label is empty for code "${code ?? "(blank)"}"`));
    }
    const active = value.active?.trim();
    if (!active) {
      diagnostics.push(createSectionWarning(model.path, "Values", `active is empty for code "${code ?? "(blank)"}"`));
    } else if (active !== "Y" && active !== "N") {
      diagnostics.push(createSectionWarning(model.path, "Values", `active must be Y or N for code "${code ?? "(blank)"}"`));
    } else if (active === "N") {
      diagnostics.push(createSectionInfo(model.path, "Values", `inactive code "${code ?? "(blank)"}" is defined`));
    }
    const sortOrder = value.sortOrder?.trim();
    if (sortOrder) {
      if (!/^-?\d+(\.\d+)?$/.test(sortOrder)) {
        diagnostics.push(createSectionWarning(model.path, "Values", `sort_order is not numeric for code "${code ?? "(blank)"}"`));
      }
      if (sortOrders.has(sortOrder)) {
        diagnostics.push(createSectionWarning(model.path, "Values", `duplicate sort_order "${sortOrder}"`));
      }
      sortOrders.add(sortOrder);
    } else {
      diagnostics.push(createSectionInfo(model.path, "Values", `sort_order is empty for code "${code ?? "(blank)"}"`));
    }
    if (!value.notes?.trim()) {
      diagnostics.push(createSectionInfo(model.path, "Values", `notes are empty for code "${code ?? "(blank)"}"`));
    }
  }
  return diagnostics;
}
function buildMessageDiagnostics(model) {
  const diagnostics = [];
  const messageIds = /* @__PURE__ */ new Set();
  if (!model.kind?.trim()) {
    diagnostics.push(createSectionWarning(model.path, "kind", "kind is empty"));
  }
  if (model.messages.length === 0) {
    diagnostics.push(createSectionWarning(model.path, "Messages", "messages are empty"));
    return diagnostics;
  }
  for (const entry of model.messages) {
    const messageId = entry.messageId?.trim();
    if (!messageId) {
      diagnostics.push(createSectionError(model.path, "Messages", "messages.message_id is empty"));
    } else {
      if (messageIds.has(messageId)) {
        diagnostics.push(createSectionError(model.path, "Messages", `duplicate message_id "${messageId}"`));
      }
      messageIds.add(messageId);
    }
    if (!entry.text?.trim()) {
      diagnostics.push(createSectionError(model.path, "Messages", `text is empty for message_id "${messageId ?? "(blank)"}"`));
    }
    const severity = entry.severity?.trim();
    if (!severity) {
      diagnostics.push(createSectionWarning(model.path, "Messages", `severity is empty for message_id "${messageId ?? "(blank)"}"`));
    } else if (!["info", "success", "warning", "error", "confirm", "other"].includes(severity)) {
      diagnostics.push(createSectionWarning(model.path, "Messages", `severity is invalid for message_id "${messageId ?? "(blank)"}"`));
    }
    if (!entry.timing?.trim()) {
      diagnostics.push(createSectionWarning(model.path, "Messages", `timing is empty for message_id "${messageId ?? "(blank)"}"`));
    }
    if (!entry.audience?.trim()) {
      diagnostics.push(createSectionWarning(model.path, "Messages", `audience is empty for message_id "${messageId ?? "(blank)"}"`));
    }
    const active = entry.active?.trim();
    if (!active) {
      diagnostics.push(createSectionWarning(model.path, "Messages", `active is empty for message_id "${messageId ?? "(blank)"}"`));
    } else if (active !== "Y" && active !== "N") {
      diagnostics.push(createSectionWarning(model.path, "Messages", `active must be Y or N for message_id "${messageId ?? "(blank)"}"`));
    } else if (active === "N") {
      diagnostics.push(createSectionInfo(model.path, "Messages", `inactive message "${messageId ?? "(blank)"}" is defined`));
    }
    if (!entry.notes?.trim()) {
      diagnostics.push(createSectionInfo(model.path, "Messages", `notes are empty for message_id "${messageId ?? "(blank)"}"`));
    }
  }
  return diagnostics;
}
function buildRuleDiagnostics(model, index) {
  const diagnostics = [];
  const inputIds = /* @__PURE__ */ new Set();
  if (!model.summary?.trim()) {
    diagnostics.push(createSectionWarning(model.path, "Summary", "summary is empty"));
  }
  if (model.inputs.length === 0) {
    diagnostics.push(createSectionWarning(model.path, "Inputs", "inputs are empty"));
  }
  if (!(model.sections.Conditions ?? []).some((line) => line.trim())) {
    diagnostics.push(createSectionWarning(model.path, "Conditions", "conditions are empty"));
  }
  for (const input of model.inputs) {
    const id = input.id?.trim();
    if (id) {
      if (inputIds.has(id)) {
        diagnostics.push(createSectionWarning(model.path, "Inputs", `duplicate input id "${id}"`));
      }
      inputIds.add(id);
    }
    diagnostics.push(
      ...buildReferenceWarnings(model.path, "Inputs", input.data, index, "unresolved rule input data reference"),
      ...buildReferenceWarnings(model.path, "Inputs", input.source, index, "unresolved rule input source reference")
    );
  }
  for (const reference of model.references) {
    diagnostics.push(
      ...buildReferenceWarnings(model.path, "References", reference.ref, index, "unresolved rule reference")
    );
  }
  for (const message of model.messages) {
    diagnostics.push(
      ...buildReferenceWarnings(model.path, "Messages", message.message, index, "unresolved message reference")
    );
  }
  return diagnostics;
}
function buildMappingDiagnostics(model, index) {
  const diagnostics = [];
  const targetRefs = /* @__PURE__ */ new Set();
  for (const scope of model.scope) {
    diagnostics.push(
      ...buildReferenceWarnings(model.path, "Scope", scope.ref, index, "unresolved scope reference")
    );
  }
  for (const row of model.mappings) {
    const targetRef = row.targetRef?.trim();
    const sourceRef = row.sourceRef?.trim();
    const transform = row.transform?.trim();
    const required = row.required?.trim();
    if (!targetRef) {
      diagnostics.push(createSectionWarning(model.path, "Mappings", "target_ref is empty"));
    } else {
      if (targetRefs.has(targetRef)) {
        diagnostics.push(createSectionWarning(model.path, "Mappings", `duplicate target_ref "${targetRef}"`));
      }
      targetRefs.add(targetRef);
    }
    if (!sourceRef && !transform) {
      diagnostics.push(createSectionWarning(model.path, "Mappings", "source_ref is empty and transform is also empty"));
    }
    if (sourceRef) {
      diagnostics.push(
        ...buildReferenceWarnings(model.path, "Mappings", sourceRef, index, "unresolved mapping source_ref")
      );
    }
    if (targetRef) {
      diagnostics.push(
        ...buildReferenceWarnings(model.path, "Mappings", targetRef, index, "unresolved mapping target_ref")
      );
    }
    if (row.rule?.trim()) {
      diagnostics.push(
        ...buildReferenceWarnings(model.path, "Mappings", row.rule, index, "unresolved mapping rule reference")
      );
    }
    if (required && required !== "Y" && required !== "N") {
      diagnostics.push(createSectionWarning(model.path, "Mappings", `required must be Y or N for target_ref "${targetRef ?? "(blank)"}"`));
    }
  }
  return diagnostics;
}
function buildAppProcessDiagnostics(model, index) {
  const diagnostics = [];
  const inputIds = /* @__PURE__ */ new Set();
  const outputIds = /* @__PURE__ */ new Set();
  for (const input of model.inputs) {
    const id = input.id?.trim();
    if (id) {
      if (inputIds.has(id)) {
        diagnostics.push(createSectionWarning(model.path, "Inputs", `duplicate input id "${id}"`));
      }
      inputIds.add(id);
    }
    diagnostics.push(
      ...buildReferenceWarnings(model.path, "Inputs", input.data, index, "unresolved input data reference"),
      ...buildReferenceWarnings(model.path, "Inputs", input.source, index, "unresolved input source reference")
    );
  }
  for (const output of model.outputs) {
    const id = output.id?.trim();
    if (id) {
      if (outputIds.has(id)) {
        diagnostics.push(createSectionWarning(model.path, "Outputs", `duplicate output id "${id}"`));
      }
      outputIds.add(id);
    }
    diagnostics.push(
      ...buildReferenceWarnings(model.path, "Outputs", output.data, index, "unresolved output data reference"),
      ...buildReferenceWarnings(model.path, "Outputs", output.target, index, "unresolved output target reference")
    );
  }
  for (const trigger of model.triggers) {
    diagnostics.push(
      ...buildReferenceWarnings(model.path, "Triggers", trigger.source, index, "unresolved trigger source reference")
    );
  }
  for (const transition of model.transitions) {
    diagnostics.push(
      ...buildReferenceWarnings(model.path, "Transitions", transition.to, index, "unresolved transition target reference", "screen")
    );
  }
  return diagnostics;
}
function buildScreenDiagnostics(model, index) {
  const diagnostics = [];
  const layoutIds = /* @__PURE__ */ new Set();
  const fieldIds = /* @__PURE__ */ new Set();
  const actionIds = /* @__PURE__ */ new Set();
  for (const layout of model.layouts) {
    const id = layout.id?.trim();
    if (!id) {
      continue;
    }
    if (layoutIds.has(id)) {
      diagnostics.push(createSectionError(model.path, "Layout", `duplicate layout id "${id}"`));
    }
    layoutIds.add(id);
  }
  for (const field of model.fields) {
    const id = field.id?.trim();
    if (!id) {
      diagnostics.push({
        code: "invalid-structure",
        message: "field id is empty",
        severity: "error",
        path: model.path,
        field: "Fields",
        line: field.rowLine,
        context: { section: "Fields" }
      });
    } else {
      if (fieldIds.has(id)) {
        diagnostics.push(createSectionWarning(model.path, "Fields", `duplicate field id "${id}"`));
      }
      fieldIds.add(id);
    }
    const layoutId = field.layout?.trim();
    if (layoutId && layoutIds.size > 0 && !layoutIds.has(layoutId)) {
      diagnostics.push(createSectionWarning(model.path, "Fields", `field layout "${layoutId}" does not match any Layout.id`));
    } else if (!layoutId && layoutIds.size > 0) {
      diagnostics.push(createSectionWarning(model.path, "Fields", `layout is empty for field "${id || field.label || "(field)"}"`));
    }
    diagnostics.push(
      ...buildReferenceWarnings(model.path, "Fields", field.ref, index, "unresolved field ref"),
      ...buildReferenceWarnings(model.path, "Fields", field.rule, index, "unresolved field rule reference")
    );
  }
  const targetEventPairs = /* @__PURE__ */ new Set();
  let hasTransitionAction = false;
  for (const action of model.actions) {
    const id = action.id?.trim();
    if (id) {
      if (actionIds.has(id)) {
        diagnostics.push(createSectionWarning(model.path, "Actions", `duplicate action id "${id}"`));
      }
      actionIds.add(id);
    }
    const target = action.target?.trim();
    const isScreenEvent = action.kind?.trim() === "screen_event";
    if (!target && isScreenEvent) {
      diagnostics.push(createSectionInfo(model.path, "Actions", "action target is empty for screen_event"));
    } else if (target && !fieldIds.has(target)) {
      diagnostics.push(createSectionWarning(model.path, "Actions", `action target "${target}" does not match any Fields.id`));
    }
    const pair = `${target ?? ""}|${action.event?.trim() ?? ""}`;
    if (target && action.event?.trim()) {
      if (targetEventPairs.has(pair)) {
        diagnostics.push({
          code: "invalid-structure",
          message: `duplicate action target/event pair "${target}" + "${action.event}"`,
          severity: "warning",
          path: model.path,
          field: "Actions",
          context: { section: "Actions" }
        });
      }
      targetEventPairs.add(pair);
    }
    const localProcessTarget = resolveScreenLocalProcessTarget(action.invoke, model);
    if (localProcessTarget.kind === "resolved") {
    } else if (localProcessTarget.kind === "unresolved-local") {
      diagnostics.push(
        createSectionWarning(
          model.path,
          "Actions",
          `unresolved local process invoke reference "${action.invoke?.trim() ?? ""}"`
        )
      );
    } else {
      diagnostics.push(
        ...buildReferenceWarnings(
          model.path,
          "Actions",
          action.invoke,
          index,
          "unresolved action invoke reference",
          "app-process"
        )
      );
    }
    const transition = action.transition?.trim();
    if (transition) {
      hasTransitionAction = true;
      if (!action.label?.trim()) {
        diagnostics.push(
          createSectionInfo(
            model.path,
            "Actions",
            "transition preview label uses fallback because action label is empty"
          )
        );
      }
      const resolvedTransition = resolveReferenceIdentity(transition, index);
      if (resolvedTransition.resolvedModel?.fileType === "screen" && resolvedTransition.resolvedModel.path === model.path) {
        diagnostics.push(
          createSectionWarning(
            model.path,
            "Actions",
            `action transition "${transition}" points to the current screen`
          )
        );
      }
    }
    diagnostics.push(
      ...buildReferenceWarnings(model.path, "Actions", action.transition, index, "unresolved action transition reference", "screen"),
      ...buildReferenceWarnings(model.path, "Actions", action.rule, index, "unresolved action rule reference")
    );
  }
  for (const message of model.messages) {
    diagnostics.push(
      ...buildReferenceWarnings(model.path, "Messages", message.text, index, "unresolved screen message reference")
    );
  }
  if (!hasTransitionAction) {
    diagnostics.push(
      createSectionInfo(
        model.path,
        "Actions",
        "no actions.transition defined for this screen"
      )
    );
  }
  if (model.legacyTransitions.length > 0 || model.sections.Transitions) {
    diagnostics.push(
      createSectionWarning(
        model.path,
        "Transitions",
        'legacy "Transitions" section detected; migrate to Actions.transition'
      )
    );
  }
  return diagnostics;
}
function resolveLocalHeadingTarget(value) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = parseReferenceValue(trimmed);
  if (!parsed?.target?.startsWith("#")) {
    return null;
  }
  const heading = parsed.target.slice(1).trim();
  return heading || null;
}
function resolveScreenLocalProcessTarget(value, model) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return { kind: "not-local" };
  }
  const localHeadingTarget = resolveLocalHeadingTarget(trimmed);
  if (localHeadingTarget) {
    const exists = model.localProcesses.some(
      (process) => normalizeLocalProcessId(process.id) === normalizeLocalProcessId(localHeadingTarget)
    );
    return exists ? { kind: "resolved", processId: localHeadingTarget } : { kind: "unresolved-local", processId: localHeadingTarget };
  }
  const plainId = normalizeLocalProcessId(trimmed);
  if (!plainId) {
    return { kind: "not-local" };
  }
  const plainExists = model.localProcesses.some(
    (process) => normalizeLocalProcessId(process.id) === plainId
  );
  if (plainExists) {
    return { kind: "resolved", processId: trimmed };
  }
  const looksLocalProcessId = /^PROC[-_A-Z0-9]+$/i.test(trimmed);
  if (looksLocalProcessId) {
    return { kind: "unresolved-local", processId: trimmed };
  }
  return { kind: "not-local" };
}
function normalizeLocalProcessId(value) {
  return value?.trim().replace(/^#+/, "").trim().toUpperCase() ?? "";
}
function buildReferenceWarnings(path, section, ref, index, messagePrefix, expectedFileType) {
  const value = ref?.trim();
  if (!value) {
    return [];
  }
  const qualified = parseQualifiedRef(value);
  if (qualified?.hasMemberRef) {
    const resolved2 = resolveQualifiedMemberReference(value, index);
    if (!resolved2.baseIdentity.resolvedModel) {
      return [createSectionWarning(path, section, `${messagePrefix} "${value}"`)];
    }
    if (expectedFileType && resolved2.baseIdentity.resolvedModel.fileType !== expectedFileType) {
      return [createSectionWarning(path, section, `${messagePrefix} "${value}"`)];
    }
    if (!resolved2.member) {
      return [
        createSectionWarning(
          path,
          section,
          `unresolved member ref: ${qualified.memberRef} in ${resolved2.baseIdentity.resolvedId ?? qualified.baseRefRaw}`
        )
      ];
    }
    return [];
  }
  const parsed = parseReferenceValue(value);
  if (parsed?.isExternal || parsed?.kind === "raw") {
    return [];
  }
  const resolved = resolveReferenceIdentity(value, index);
  if (!resolved.resolvedModel) {
    return [createSectionWarning(path, section, `${messagePrefix} "${value}"`)];
  }
  if (expectedFileType && resolved.resolvedModel.fileType !== expectedFileType) {
    return [createSectionWarning(path, section, `${messagePrefix} "${value}"`)];
  }
  return [];
}
function createSectionWarning(path, section, message) {
  return {
    code: "invalid-structure",
    message,
    severity: "warning",
    path,
    field: section,
    context: { section }
  };
}
function createSectionInfo(path, section, message) {
  return {
    code: "invalid-structure",
    message,
    severity: "info",
    path,
    field: section,
    context: { section }
  };
}
function createSectionError(path, section, message) {
  return {
    code: "invalid-structure",
    message,
    severity: "error",
    path,
    field: section,
    context: { section }
  };
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
  const fieldNameOccurrences = /* @__PURE__ */ new Map();
  const fieldNumbersByRecordType = /* @__PURE__ */ new Map();
  const fieldPositionsByRecordType = /* @__PURE__ */ new Map();
  const recordTypes = /* @__PURE__ */ new Set();
  if (!model.dataFormat?.trim()) {
    diagnostics.push(createSectionWarning(model.path, "data_format", "data_format is empty"));
  }
  if (!model.kind?.trim()) {
    diagnostics.push(createSectionWarning(model.path, "kind", "kind is empty"));
  }
  if (model.dataFormat?.trim() === "fixed" && !model.recordLength?.trim()) {
    diagnostics.push(createSectionError(model.path, "record_length", "record_length is required when data_format is fixed"));
  }
  if (["csv", "tsv", "delimited"].includes(model.dataFormat?.trim() ?? "") && !model.delimiter?.trim()) {
    diagnostics.push(createSectionWarning(model.path, "delimiter", "delimiter is empty for delimited data_format"));
  }
  for (const record of model.records) {
    const recordType = record.recordType?.trim();
    if (!recordType) {
      continue;
    }
    if (recordTypes.has(recordType)) {
      diagnostics.push(createSectionError(model.path, "Records", `duplicate record_type "${recordType}"`));
    }
    recordTypes.add(recordType);
  }
  for (const field of model.fields) {
    const fieldName = field.name?.trim();
    if (!fieldName) {
      diagnostics.push({
        code: "invalid-structure",
        message: "field name is empty",
        severity: "error",
        path: model.path,
        field: "Fields",
        line: field.rowLine,
        context: {
          section: "Fields"
        }
      });
      continue;
    }
    if (!field.label?.trim()) {
      diagnostics.push(createFieldWarning(model.path, field.rowLine, `label is empty for field "${fieldName}"`));
    }
    if (!field.type?.trim()) {
      diagnostics.push(createFieldWarning(model.path, field.rowLine, `type is empty for field "${fieldName}"`));
    }
    if (field.required?.trim() && !["Y", "N"].includes(field.required.trim())) {
      diagnostics.push(createFieldWarning(model.path, field.rowLine, `required must be Y or N for field "${fieldName}"`));
    }
    if (field.length?.trim() && !/^\d+$/.test(field.length.trim())) {
      diagnostics.push(createFieldWarning(model.path, field.rowLine, `length is not numeric for field "${fieldName}"`));
    }
    fieldNameOccurrences.set(fieldName, (fieldNameOccurrences.get(fieldName) ?? 0) + 1);
    if (model.fieldMode === "file_layout") {
      const recordType = field.recordType?.trim();
      if (model.records.length > 0 && recordType && !recordTypes.has(recordType)) {
        diagnostics.push(createFieldError(model.path, field.rowLine, `record_type "${recordType}" is not defined in Records`));
      }
      if (model.dataFormat?.trim() === "fixed" && !field.position?.trim()) {
        diagnostics.push(createFieldError(model.path, field.rowLine, `position is required for fixed format field "${fieldName}"`));
      }
      const noKey = recordType || "__default__";
      if (field.no?.trim()) {
        if (!fieldNumbersByRecordType.has(noKey)) {
          fieldNumbersByRecordType.set(noKey, /* @__PURE__ */ new Set());
        }
        const numbers = fieldNumbersByRecordType.get(noKey);
        if (numbers.has(field.no.trim())) {
          diagnostics.push(createFieldWarning(model.path, field.rowLine, `duplicate no "${field.no.trim()}" in record_type "${recordType || "(default)"}"`));
        }
        numbers.add(field.no.trim());
      }
      if (field.position?.trim()) {
        if (!fieldPositionsByRecordType.has(noKey)) {
          fieldPositionsByRecordType.set(noKey, /* @__PURE__ */ new Set());
        }
        const positions = fieldPositionsByRecordType.get(noKey);
        if (positions.has(field.position.trim())) {
          diagnostics.push(createFieldWarning(model.path, field.rowLine, `duplicate position "${field.position.trim()}" in record_type "${recordType || "(default)"}"`));
        }
        positions.add(field.position.trim());
      }
    }
    const ref = field.ref?.trim();
    if (!ref) {
      continue;
    }
    const qualified = parseQualifiedRef(ref);
    if (qualified?.hasMemberRef) {
      const resolved2 = resolveQualifiedMemberReference(ref, index);
      if (!resolved2.baseIdentity.resolvedModel) {
        diagnostics.push({
          code: "unresolved-reference",
          message: `unresolved field reference "${ref}"`,
          severity: "warning",
          path: model.path,
          field: "Fields",
          line: field.rowLine,
          context: {
            section: "Fields"
          }
        });
        continue;
      }
      if (!resolved2.member) {
        diagnostics.push({
          code: "unresolved-reference",
          message: `unresolved member ref: ${qualified.memberRef} in ${resolved2.baseIdentity.resolvedId ?? resolved2.baseIdentity.resolvedFile ?? qualified.baseRefRaw}`,
          severity: "warning",
          path: model.path,
          field: "Fields",
          line: field.rowLine,
          context: {
            section: "Fields"
          }
        });
      }
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
      line: field.rowLine,
      context: {
        section: "Fields"
      }
    });
  }
  for (const [fieldName, count] of fieldNameOccurrences.entries()) {
    if (count > 1) {
      diagnostics.push(createSectionWarning(model.path, "Fields", `duplicate field name "${fieldName}"`));
    }
  }
  return diagnostics;
}
function createFieldWarning(path, line, message) {
  return {
    code: "invalid-structure",
    message,
    severity: "warning",
    path,
    field: "Fields",
    line,
    context: { section: "Fields" }
  };
}
function createFieldError(path, line, message) {
  return {
    code: "invalid-structure",
    message,
    severity: "error",
    path,
    field: "Fields",
    line,
    context: { section: "Fields" }
  };
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
  const relationIds = /* @__PURE__ */ new Set();
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
    const relationId = relationBlock.id?.trim() ?? "";
    if (!relationId) {
      diagnostics.push(createSectionError(entity.path, "Relations", "invalid ER relation id: (empty)"));
    } else {
      if (isIncompleteErRelationId(relationId)) {
        diagnostics.push(createSectionError(entity.path, "Relations", `ER relation id looks incomplete: ${relationId}`));
      }
      if (relationIds.has(relationId)) {
        diagnostics.push(createSectionError(entity.path, "Relations", `duplicate ER relation id: ${relationId}`));
      } else {
        relationIds.add(relationId);
      }
    }
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
function isIncompleteErRelationId(id) {
  const normalized = id.trim().toUpperCase();
  return !normalized || normalized === "REL" || normalized === "REL-" || normalized === "REL--" || normalized === "REL-NEW" || normalized === "REL-TODO";
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
  const presentEntities = [];
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
function resolveDfdDiagramRelations(diagram, index) {
  const warnings = [];
  const objectResolution = resolveDfdDiagramObjects(diagram, index);
  const edges = [];
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
function resolveDfdDiagramObjects(diagram, index) {
  const warnings = [];
  const nodes = [];
  const missingObjects = [];
  const byId = /* @__PURE__ */ new Map();
  const byReferenceKey = /* @__PURE__ */ new Map();
  const entries = diagram.objectEntries.length > 0 ? diagram.objectEntries : diagram.objectRefs.map((ref, rowIndex) => ({
    ref,
    rowIndex,
    compatibilityMode: "legacy_ref_only"
  }));
  for (const entry of entries) {
    const ref = entry.ref?.trim();
    const resolvedObject = ref ? resolveDfdObjectReference(ref, index) ?? void 0 : void 0;
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
    const node = {
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
    const registryEntry = {
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
    ].filter((value) => Boolean(value && value.trim()));
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
function resolveDfdFlowEndpoint(value, registry, index) {
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
function resolveErEdges(diagram, index, presentEntities, warnings) {
  const edges = [];
  const seenRelationIds = /* @__PURE__ */ new Set();
  const presentEntityIds = new Set(presentEntities.map((entity) => entity.id));
  const presentEntityKeys = /* @__PURE__ */ new Set();
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
      const targetIsPresent = presentEntityIds.has(targetEntity.id) || buildErEntityCanonicalKeys(targetEntity).some((key) => presentEntityKeys.has(key));
      if (!targetIsPresent) {
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
function buildErEntityCanonicalKeys(entity) {
  const keys = /* @__PURE__ */ new Set();
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
function getDfdDiagramNodeDisplayName(entry, object) {
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

// src/core/render-mode.ts
var VALID_RENDER_MODES = /* @__PURE__ */ new Set(["auto", "custom", "mermaid"]);
var TABLE_TEXT_FORMATS = /* @__PURE__ */ new Set([
  "data-object",
  "app-process",
  "rule",
  "codeset",
  "message",
  "mapping"
]);
function resolveRenderMode(input) {
  const diagnostics = [];
  const toolbarMode = normalizeRenderMode(input.toolbarOverride);
  const frontmatterMode = normalizeRenderMode(input.frontmatterRenderMode);
  const settingsMode = normalizeRenderMode(input.settingsDefaultRenderMode);
  if (typeof input.frontmatterRenderMode === "string" && input.frontmatterRenderMode.trim().length > 0 && !frontmatterMode) {
    diagnostics.push(
      createRenderModeWarning(
        input.filePath,
        `Unknown render_mode value "${input.frontmatterRenderMode}". Falling back to auto.`,
        "render_mode"
      )
    );
  }
  const selectedSource = toolbarMode ? "toolbar" : frontmatterMode ? "frontmatter" : settingsMode ? "settings" : "format_default";
  const selectedMode = toolbarMode ?? frontmatterMode ?? settingsMode ?? "auto";
  const formatDefaultMode = getFormatDefaultRenderMode(input.formatType);
  if (selectedMode === "auto") {
    return {
      selectedMode,
      effectiveMode: formatDefaultMode,
      actualRenderer: getRendererImplementation(
        input.formatType,
        formatDefaultMode,
        input.modelKind
      ),
      source: selectedSource,
      diagnostics: appendReducedOverviewNote(
        diagnostics,
        input.formatType,
        input.modelKind,
        formatDefaultMode,
        input.filePath
      )
    };
  }
  const fallbackMode = getFallbackRenderMode(input.formatType, input.modelKind);
  const supportedModes = getForcedRenderModes(input.formatType, input.modelKind);
  if (!supportedModes.includes(selectedMode)) {
    diagnostics.push(
      createRenderModeWarning(
        input.filePath,
        `${capitalizeRenderMode(selectedMode)} renderer is not supported for ${input.formatType} yet. Falling back to auto (${fallbackMode}).`,
        "render_mode"
      )
    );
    return {
      selectedMode,
      effectiveMode: fallbackMode,
      actualRenderer: getRendererImplementation(
        input.formatType,
        fallbackMode,
        input.modelKind
      ),
      source: "fallback",
      fallbackReason: `unsupported:${selectedMode}`,
      diagnostics: appendReducedOverviewNote(
        diagnostics,
        input.formatType,
        input.modelKind,
        fallbackMode,
        input.filePath
      )
    };
  }
  return {
    selectedMode,
    effectiveMode: selectedMode,
    actualRenderer: getRendererImplementation(
      input.formatType,
      selectedMode,
      input.modelKind
    ),
    source: selectedSource,
    diagnostics: appendReducedOverviewNote(
      diagnostics,
      input.formatType,
      input.modelKind,
      selectedMode,
      input.filePath
    )
  };
}
function getFormatDefaultRenderMode(formatType) {
  switch (formatType) {
    case "dfd-diagram":
      return "mermaid";
    default:
      return "custom";
  }
}
function getSupportedRenderModes(formatType, modelKind) {
  if (formatType === "dfd-diagram") {
    return ["auto"];
  }
  return ["auto", ...getForcedRenderModes(formatType, modelKind)];
}
function getForcedRenderModes(formatType, modelKind) {
  switch (formatType) {
    case "diagram":
      return modelKind === "class" || modelKind === "er" ? ["custom", "mermaid"] : ["custom"];
    case "object":
    case "er-entity":
      return ["custom", "mermaid"];
    case "dfd-diagram":
      return ["mermaid"];
    case "dfd-object":
      return [];
    case "screen":
      return [];
    case "data-object":
    case "app-process":
    case "rule":
    case "codeset":
    case "message":
    case "mapping":
      return [];
    case "markdown":
      return [];
    default:
      return ["custom"];
  }
}
function normalizeRenderMode(value) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return VALID_RENDER_MODES.has(normalized) ? normalized : null;
}
function getFallbackRenderMode(formatType, modelKind) {
  const supported = getForcedRenderModes(formatType, modelKind);
  if (supported.includes(getFormatDefaultRenderMode(formatType))) {
    return getFormatDefaultRenderMode(formatType);
  }
  return supported[0] ?? "custom";
}
function getRendererImplementation(formatType, mode, modelKind) {
  if (mode === "mermaid" && (formatType === "dfd-diagram" || formatType === "object" || formatType === "er-entity" || formatType === "diagram" && (modelKind === "class" || modelKind === "er"))) {
    return "mermaid";
  }
  if (TABLE_TEXT_FORMATS.has(formatType)) {
    return "table-text";
  }
  return "custom";
}
function createRenderModeWarning(filePath, message, field) {
  return {
    code: "invalid-structure",
    message,
    severity: "warning",
    filePath,
    field,
    section: "frontmatter"
  };
}
function capitalizeRenderMode(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
function appendReducedOverviewNote(diagnostics, formatType, modelKind, effectiveMode, filePath) {
  if (effectiveMode !== "mermaid" || !(formatType === "object" || formatType === "er-entity" || formatType === "diagram" && (modelKind === "class" || modelKind === "er"))) {
    return diagnostics;
  }
  return [
    ...diagnostics,
    {
      code: "invalid-structure",
      message: "Mermaid mode shows reduced overview only.",
      severity: "info",
      filePath,
      section: "frontmatter",
      field: "render_mode"
    }
  ];
}

// src/core/schema-detector.ts
var SCHEMA_TO_FILE_TYPE = {
  model_object_v1: "object",
  model_relations_v1: "relations"
};
var TYPE_TO_FILE_TYPE = {
  class: "object",
  data_object: "data-object",
  app_process: "app-process",
  screen: "screen",
  rule: "rule",
  codeset: "codeset",
  message: "message",
  mapping: "mapping",
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
  "## Layout": "Layout",
  "## Fields": "Fields",
  "## Actions": "Actions",
  "## Messages": "Messages",
  "## Format": "Format",
  "## Records": "Records",
  "## References": "References",
  "## Conditions": "Conditions",
  "## Values": "Values",
  "## Scope": "Scope",
  "## Mappings": "Mappings",
  "## Rules": "Rules",
  "## Triggers": "Triggers",
  "## Inputs": "Inputs",
  "## Steps": "Steps",
  "## Outputs": "Outputs",
  "## Transitions": "Transitions",
  "## Errors": "Errors",
  "## Local Processes": "Local Processes",
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
  const seenIds = /* @__PURE__ */ new Set();
  const flushBlock = () => {
    if (!currentId) {
      return;
    }
    if (isIncompleteErRelationId2(currentId)) {
      warnings.push(
        createWarning3(
          "invalid-structure",
          `ER relation id looks incomplete: ${currentId}`,
          path,
          "Relations"
        )
      );
    }
    if (seenIds.has(currentId)) {
      warnings.push(
        createWarning3(
          "invalid-structure",
          `duplicate ER relation id: ${currentId}`,
          path,
          "Relations"
        )
      );
    } else {
      seenIds.add(currentId);
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
function isIncompleteErRelationId2(id) {
  const trimmed = id.trim();
  if (!trimmed) {
    return true;
  }
  const normalized = trimmed.toUpperCase();
  return normalized === "REL" || normalized === "REL-" || normalized === "REL--" || normalized === "REL-NEW" || normalized === "REL-TODO";
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
var SCREEN_ACTION_KIND_OPTIONS = [
  "ui_action",
  "field_event",
  "screen_event",
  "form_event",
  "system_event",
  "shortcut",
  "auto",
  "other"
];
var SCREEN_ACTION_EVENT_OPTIONS = [
  "load",
  "unload",
  "click",
  "change",
  "input",
  "focus",
  "blur",
  "submit",
  "select",
  "keydown",
  "timer",
  "message",
  "other"
];
var SCREEN_TYPE_OPTIONS = [
  "entry",
  "list",
  "detail",
  "confirm",
  "complete",
  "dialog",
  "dashboard",
  "admin",
  "other"
];
var SCREEN_LAYOUT_KIND_OPTIONS = [
  "header",
  "body",
  "detail",
  "footer",
  "section",
  "form_area",
  "table_area",
  "action_area",
  "search_area",
  "result_area",
  "message_area",
  "other"
];
var SCREEN_FIELD_KIND_OPTIONS = [
  "window",
  "form",
  "panel",
  "section",
  "table",
  "list",
  "input",
  "textarea",
  "select",
  "checkbox",
  "radio",
  "button",
  "link",
  "label",
  "hidden",
  "computed",
  "table_input",
  "table_select",
  "other"
];
var SCREEN_FIELD_DATA_TYPE_OPTIONS = [
  "string",
  "number",
  "integer",
  "decimal",
  "boolean",
  "date",
  "datetime",
  "time",
  "array",
  "object",
  "binary",
  "other"
];
var SCREEN_REQUIRED_OPTIONS = ["Y", "N"];
var SCREEN_MESSAGE_SEVERITY_OPTIONS = [
  "info",
  "success",
  "warning",
  "error",
  "confirm",
  "other"
];
var DATA_OBJECT_KIND_OPTIONS = [
  "data",
  "dto",
  "request",
  "response",
  "payload",
  "file",
  "form",
  "query",
  "result",
  "report",
  "message",
  "other"
];
var DATA_OBJECT_FORMAT_OPTIONS = [
  "object",
  "json",
  "xml",
  "csv",
  "tsv",
  "fixed",
  "delimited",
  "excel",
  "edi",
  "binary",
  "form",
  "query",
  "other"
];
var DATA_OBJECT_ENCODING_OPTIONS = ["UTF-8", "Shift_JIS", "EUC-JP", "ISO-8859-1"];
var DATA_OBJECT_LINE_ENDING_OPTIONS = ["LF", "CRLF", "CR"];
var DATA_OBJECT_HAS_HEADER_OPTIONS = ["true", "false"];
var DATA_OBJECT_FORMAT_KEY_OPTIONS = [
  "data_format",
  "encoding",
  "delimiter",
  "quote",
  "escape",
  "line_ending",
  "has_header",
  "record_length",
  "record_type_position",
  "padding",
  "numeric_padding",
  "sheet",
  "template"
];
var DATA_OBJECT_FORMAT_VALUE_OPTIONS = {
  data_format: DATA_OBJECT_FORMAT_OPTIONS,
  encoding: DATA_OBJECT_ENCODING_OPTIONS,
  line_ending: DATA_OBJECT_LINE_ENDING_OPTIONS,
  has_header: DATA_OBJECT_HAS_HEADER_OPTIONS,
  padding: ["space", "zero", "none"],
  numeric_padding: ["zero", "space", "none"],
  quote: ["double_quote", "single_quote", "none"],
  escape: ["backslash", "double_quote", "none"]
};
var DATA_OBJECT_RECORD_OCCURRENCE_OPTIONS = ["1", "0..1", "1..*", "0..*"];
var DATA_OBJECT_REQUIRED_OPTIONS = ["Y", "N"];
var DATA_OBJECT_FIELD_TYPE_OPTIONS = [
  "string",
  "number",
  "integer",
  "decimal",
  "boolean",
  "date",
  "datetime",
  "time",
  "array",
  "object",
  "binary",
  "other"
];
var DATA_OBJECT_FIELD_FORMAT_OPTIONS = [
  "yyyyMMdd",
  "yyyy/MM/dd",
  "zero_pad_left",
  "space_pad_right",
  "fixed:",
  "decimal_0",
  "decimal_2",
  "half_width",
  "half_width_kana",
  "full_width"
];
var CODESET_KIND_OPTIONS = [
  "enum",
  "status",
  "master_code",
  "system_code",
  "external_code",
  "ui_options",
  "other"
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
    const request = getDataObjectCompletion(content, lines, cursor, line, index);
    if (request) {
      return request;
    }
  }
  if (type === "screen") {
    const request = getScreenCompletion(content, lines, cursor, line, index);
    if (request) {
      return request;
    }
  }
  if (type === "app_process") {
    const request = getAppProcessCompletion(lines, cursor, line, index);
    if (request) {
      return request;
    }
  }
  if (type === "rule") {
    const request = getRuleCompletion(lines, cursor, line, index);
    if (request) {
      return request;
    }
  }
  if (type === "mapping") {
    const request = getMappingCompletion(lines, cursor, line, index);
    if (request) {
      return request;
    }
  }
  if (type === "codeset") {
    const request = getCodeSetCompletion(content, lines, cursor, line);
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
function getDataObjectCompletion(content, lines, cursor, line, index) {
  const frontmatterRequest = getDataObjectFrontmatterCompletion(content, cursor, line);
  if (frontmatterRequest) {
    return frontmatterRequest;
  }
  if (!line.trim().startsWith("|") || !index || isMarkdownTableSeparator(line)) {
    return null;
  }
  const section = getSectionNameAtLine(lines, cursor.line);
  const cell = getTableCellContext(line, cursor.line, cursor.ch);
  if (!cell) {
    return null;
  }
  if (section === "Format") {
    if (!hasTableHeader(lines, cursor.line, ["key", "value", "notes"])) {
      return null;
    }
    if (cell.columnIndex === 0) {
      return buildOptionCompletionRequest(
        "data-object-option",
        cell,
        line,
        DATA_OBJECT_FORMAT_KEY_OPTIONS,
        "Complete data object format key",
        0
      );
    }
    if (cell.columnIndex === 1) {
      const row = parseMarkdownTableRow(line);
      const key = row?.[0]?.trim() ?? "";
      const options = DATA_OBJECT_FORMAT_VALUE_OPTIONS[key];
      if (!options || options.length === 0) {
        return null;
      }
      return buildOptionCompletionRequest(
        "data-object-option",
        cell,
        line,
        options,
        `Complete data object format value for ${key}`,
        1
      );
    }
  }
  if (section === "Records") {
    if (!hasTableHeader(lines, cursor.line, ["record_type", "name", "occurrence", "notes"])) {
      return null;
    }
    if (cell.columnIndex === 2) {
      return buildOptionCompletionRequest(
        "data-object-option",
        cell,
        line,
        DATA_OBJECT_RECORD_OCCURRENCE_OPTIONS,
        "Complete data object occurrence",
        2
      );
    }
  }
  if (section === "Fields") {
    const header = getNearestTableHeader(lines, cursor.line);
    if (!header) {
      return null;
    }
    const headerIndex = new Map(header.map((column, index2) => [column, index2]));
    const isFileLayout = headerIndex.has("record_type") || headerIndex.has("no") || headerIndex.has("position") || headerIndex.has("field_format");
    const refColumnIndex = headerIndex.get("ref");
    if (typeof refColumnIndex === "number" && cell.columnIndex === refColumnIndex) {
      const cellValue = extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch);
      const qualifiedMemberRequest = getQualifiedMemberCompletionRequest(
        cursor,
        cell,
        cellValue,
        index,
        "Complete data object field reference"
      );
      if (qualifiedMemberRequest) {
        return qualifiedMemberRequest;
      }
      return {
        kind: "data-object-field-ref",
        replaceFrom: cell.replaceFrom,
        replaceTo: cell.replaceTo,
        suggestions: buildDataObjectReferenceSuggestions(index),
        placeholder: "Complete data object field reference",
        initialQuery: normalizeCompletionQuery(cellValue),
        tableColumnIndex: refColumnIndex
      };
    }
    const requiredColumnIndex = headerIndex.get("required");
    if (typeof requiredColumnIndex === "number" && cell.columnIndex === requiredColumnIndex) {
      return buildOptionCompletionRequest(
        "data-object-option",
        cell,
        line,
        DATA_OBJECT_REQUIRED_OPTIONS,
        "Complete data object required flag",
        requiredColumnIndex
      );
    }
    const typeColumnIndex = headerIndex.get("type");
    if (typeof typeColumnIndex === "number" && cell.columnIndex === typeColumnIndex) {
      return buildOptionCompletionRequest(
        "data-object-option",
        cell,
        line,
        DATA_OBJECT_FIELD_TYPE_OPTIONS,
        "Complete data object field type",
        typeColumnIndex
      );
    }
    const fieldFormatColumnIndex = headerIndex.get("field_format");
    if (isFileLayout && typeof fieldFormatColumnIndex === "number" && cell.columnIndex === fieldFormatColumnIndex) {
      return buildOptionCompletionRequest(
        "data-object-option",
        cell,
        line,
        DATA_OBJECT_FIELD_FORMAT_OPTIONS,
        "Complete data object field format",
        fieldFormatColumnIndex
      );
    }
  }
  return null;
}
function getScreenCompletion(content, lines, cursor, line, index) {
  const frontmatterRequest = getScreenFrontmatterCompletion(content, lines, cursor, line);
  if (frontmatterRequest) {
    return frontmatterRequest;
  }
  if (!line.trim().startsWith("|") || !index) {
    return null;
  }
  const section = getSectionNameAtLine(lines, cursor.line);
  const cell = getTableCellContext(line, cursor.line, cursor.ch);
  if (!cell || isMarkdownTableSeparator(line)) {
    return null;
  }
  if (section === "Layout") {
    if (!hasTableHeader(lines, cursor.line, ["id", "label", "kind", "purpose", "notes"])) {
      return null;
    }
    if (cell.columnIndex === 2) {
      return buildOptionCompletionRequest(
        "screen-option",
        cell,
        line,
        SCREEN_LAYOUT_KIND_OPTIONS,
        "Complete screen layout kind",
        2
      );
    }
  }
  if (section === "Fields") {
    if (!hasTableHeader(lines, cursor.line, [
      "id",
      "label",
      "kind",
      "layout",
      "data_type",
      "required",
      "ref",
      "rule",
      "notes"
    ])) {
      return null;
    }
    if (cell.columnIndex === 2) {
      return buildOptionCompletionRequest(
        "screen-field-kind",
        cell,
        line,
        SCREEN_FIELD_KIND_OPTIONS,
        "Complete screen field kind",
        2
      );
    }
    if (cell.columnIndex === 3) {
      return {
        kind: "screen-field-layout",
        replaceFrom: cell.replaceFrom,
        replaceTo: cell.replaceTo,
        suggestions: getScreenLayoutSuggestions(lines),
        placeholder: "Complete screen layout",
        initialQuery: extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch),
        tableColumnIndex: 3
      };
    }
    if (cell.columnIndex === 4) {
      return buildOptionCompletionRequest(
        "screen-field-data-type",
        cell,
        line,
        SCREEN_FIELD_DATA_TYPE_OPTIONS,
        "Complete screen field data type",
        4
      );
    }
    if (cell.columnIndex === 5) {
      return buildOptionCompletionRequest(
        "screen-field-required",
        cell,
        line,
        SCREEN_REQUIRED_OPTIONS,
        "Complete screen field required flag",
        5
      );
    }
    if (cell.columnIndex === 6) {
      const cellValue = extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch);
      const qualifiedMemberRequest = getQualifiedMemberCompletionRequest(
        cursor,
        cell,
        cellValue,
        index,
        "Complete screen field reference"
      );
      if (qualifiedMemberRequest) {
        return qualifiedMemberRequest;
      }
      return {
        kind: "screen-field-ref",
        replaceFrom: cell.replaceFrom,
        replaceTo: cell.replaceTo,
        suggestions: buildStructuredReferenceSuggestions(index),
        placeholder: "Complete screen field ref",
        initialQuery: normalizeCompletionQuery(cellValue),
        tableColumnIndex: 6
      };
    }
    if (cell.columnIndex === 7) {
      return {
        kind: "screen-rule-ref",
        replaceFrom: cell.replaceFrom,
        replaceTo: cell.replaceTo,
        suggestions: buildRuleReferenceSuggestions(index),
        placeholder: "Complete screen field rule",
        initialQuery: normalizeCompletionQuery(
          extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch)
        ),
        tableColumnIndex: 7
      };
    }
  }
  if (section === "Actions") {
    if (!hasTableHeader(lines, cursor.line, [
      "id",
      "label",
      "kind",
      "target",
      "event",
      "invoke",
      "transition",
      "rule",
      "notes"
    ])) {
      return null;
    }
    if (cell.columnIndex === 2) {
      return buildOptionCompletionRequest(
        "screen-action-kind",
        cell,
        line,
        SCREEN_ACTION_KIND_OPTIONS,
        "Complete screen action kind",
        2
      );
    }
    if (cell.columnIndex === 3) {
      return {
        kind: "screen-action-target",
        replaceFrom: cell.replaceFrom,
        replaceTo: cell.replaceTo,
        suggestions: getScreenFieldTargetSuggestions(lines),
        placeholder: "Complete screen action target",
        initialQuery: extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch),
        tableColumnIndex: 3
      };
    }
    if (cell.columnIndex === 4) {
      return buildOptionCompletionRequest(
        "screen-action-event",
        cell,
        line,
        SCREEN_ACTION_EVENT_OPTIONS,
        "Complete screen action event",
        4
      );
    }
    if (cell.columnIndex === 5) {
      const appProcessSuggestions = Object.values(index.appProcessesById).sort((left, right) => left.id.localeCompare(right.id)).map((process) => toAppProcessSuggestion(process));
      return {
        kind: "screen-action-invoke",
        replaceFrom: cell.replaceFrom,
        replaceTo: cell.replaceTo,
        suggestions: [...getScreenLocalProcessSuggestions(lines), ...appProcessSuggestions],
        placeholder: "Complete screen invoke reference",
        initialQuery: normalizeCompletionQuery(
          extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch)
        ),
        tableColumnIndex: 5
      };
    }
    if (cell.columnIndex === 6) {
      return {
        kind: "screen-action-transition",
        replaceFrom: cell.replaceFrom,
        replaceTo: cell.replaceTo,
        suggestions: Object.values(index.screensById).sort((left, right) => left.id.localeCompare(right.id)).map((screen) => toScreenSuggestion(screen)),
        placeholder: "Complete screen transition reference",
        initialQuery: normalizeCompletionQuery(
          extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch)
        ),
        tableColumnIndex: 6
      };
    }
    if (cell.columnIndex === 7) {
      return {
        kind: "screen-rule-ref",
        replaceFrom: cell.replaceFrom,
        replaceTo: cell.replaceTo,
        suggestions: buildRuleReferenceSuggestions(index),
        placeholder: "Complete screen action rule",
        initialQuery: normalizeCompletionQuery(
          extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch)
        ),
        tableColumnIndex: 7
      };
    }
  }
  if (section === "Messages") {
    if (!hasTableHeader(lines, cursor.line, ["id", "text", "severity", "timing", "notes"])) {
      return null;
    }
    if (cell.columnIndex === 1) {
      const cellValue = extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch);
      return {
        kind: "rule-message-ref",
        replaceFrom: cell.replaceFrom,
        replaceTo: cell.replaceTo,
        suggestions: Object.values(index.messagesById).sort((left, right) => left.id.localeCompare(right.id)).map((messageSet) => toMessageSuggestion(messageSet)),
        placeholder: "Complete screen message reference",
        initialQuery: normalizeCompletionQuery(cellValue),
        tableColumnIndex: 1
      };
    }
    if (cell.columnIndex === 2) {
      return buildOptionCompletionRequest(
        "screen-message-severity",
        cell,
        line,
        SCREEN_MESSAGE_SEVERITY_OPTIONS,
        "Complete message severity",
        2
      );
    }
  }
  return null;
}
function getScreenFrontmatterCompletion(content, lines, cursor, line) {
  if (!isLineInsideFrontmatter(content, cursor.line)) {
    return null;
  }
  const frontmatterKey = getFrontmatterKeyAtLine(line);
  if (frontmatterKey !== "screen_type") {
    return null;
  }
  const separatorIndex = line.indexOf(":");
  if (separatorIndex < 0) {
    return null;
  }
  return {
    kind: "screen-frontmatter",
    replaceFrom: { line: cursor.line, ch: separatorIndex + 1 },
    replaceTo: { line: cursor.line, ch: lines[cursor.line]?.length ?? line.length },
    suggestions: SCREEN_TYPE_OPTIONS.map((option) => ({
      label: option,
      insertText: option,
      resolveKey: option,
      kind: "kind"
    })),
    placeholder: "Complete screen screen_type",
    initialQuery: line.slice(separatorIndex + 1).trim()
  };
}
function getScreenLayoutSuggestions(lines) {
  const layouts = /* @__PURE__ */ new Map();
  let inLayout = false;
  let headerSeen = false;
  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    const headingMatch = trimmed.match(/^##\s+(.+)$/);
    if (headingMatch) {
      inLayout = headingMatch[1].trim() === "Layout";
      headerSeen = false;
      continue;
    }
    if (!inLayout || !trimmed.startsWith("|") || isMarkdownTableSeparator(trimmed)) {
      continue;
    }
    const row = parseMarkdownTableRow(trimmed);
    if (!row || row.length < 2) {
      continue;
    }
    if (!headerSeen) {
      headerSeen = row[0] === "id" && row[1] === "label";
      continue;
    }
    const id = row[0]?.trim();
    const label = row[1]?.trim();
    if (id) {
      layouts.set(id, label || id);
    }
  }
  return [...layouts.entries()].map(([id, label]) => ({
    label: `${id} / ${label}`,
    insertText: id,
    resolveKey: id,
    detail: "screen layout",
    kind: "reference"
  }));
}
function getScreenLocalProcessSuggestions(lines) {
  const suggestions = [];
  let inLocalProcesses = false;
  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    const headingMatch = trimmed.match(/^##\s+(.+)$/);
    if (headingMatch) {
      inLocalProcesses = headingMatch[1].trim() === "Local Processes";
      continue;
    }
    if (!inLocalProcesses) {
      continue;
    }
    const localProcessMatch = trimmed.match(/^###\s+(.+)$/);
    if (!localProcessMatch) {
      continue;
    }
    const heading = localProcessMatch[1].trim();
    suggestions.push({
      label: heading,
      insertText: buildAliasedWikilink(`#${heading}`, heading),
      resolveKey: `#${heading}`,
      detail: "screen local process",
      kind: "reference"
    });
  }
  return suggestions;
}
function getAppProcessCompletion(lines, cursor, line, index) {
  if (!line.trim().startsWith("|") || !index) {
    return null;
  }
  const section = getSectionNameAtLine(lines, cursor.line);
  const cell = getTableCellContext(line, cursor.line, cursor.ch);
  if (!cell || isMarkdownTableSeparator(line)) {
    return null;
  }
  if (section === "Inputs") {
    if (!hasTableHeader(lines, cursor.line, ["id", "data", "source", "required", "notes"])) {
      return null;
    }
    if (cell.columnIndex === 1 || cell.columnIndex === 2) {
      const cellValue = extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch);
      if (cell.columnIndex === 2) {
        const qualifiedMemberRequest = getQualifiedMemberCompletionRequest(
          cursor,
          cell,
          cellValue,
          index,
          "Complete app_process input source"
        );
        if (qualifiedMemberRequest) {
          return qualifiedMemberRequest;
        }
      }
      return {
        kind: cell.columnIndex === 1 ? "app-process-input-data" : "app-process-input-source",
        replaceFrom: cell.replaceFrom,
        replaceTo: cell.replaceTo,
        suggestions: buildStructuredReferenceSuggestions(index),
        placeholder: cell.columnIndex === 1 ? "Complete app_process input data" : "Complete app_process input source",
        initialQuery: normalizeCompletionQuery(cellValue),
        tableColumnIndex: cell.columnIndex
      };
    }
  }
  if (section === "Outputs") {
    if (!hasTableHeader(lines, cursor.line, ["id", "data", "target", "notes"])) {
      return null;
    }
    if (cell.columnIndex === 1 || cell.columnIndex === 2) {
      const cellValue = extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch);
      if (cell.columnIndex === 2) {
        const qualifiedMemberRequest = getQualifiedMemberCompletionRequest(
          cursor,
          cell,
          cellValue,
          index,
          "Complete app_process output target"
        );
        if (qualifiedMemberRequest) {
          return qualifiedMemberRequest;
        }
      }
      return {
        kind: cell.columnIndex === 1 ? "app-process-output-data" : "app-process-output-target",
        replaceFrom: cell.replaceFrom,
        replaceTo: cell.replaceTo,
        suggestions: buildStructuredReferenceSuggestions(index),
        placeholder: cell.columnIndex === 1 ? "Complete app_process output data" : "Complete app_process output target",
        initialQuery: normalizeCompletionQuery(cellValue),
        tableColumnIndex: cell.columnIndex
      };
    }
  }
  if (section === "Triggers") {
    if (!hasTableHeader(lines, cursor.line, ["id", "kind", "source", "event", "notes"])) {
      return null;
    }
    if (cell.columnIndex === 2) {
      const cellValue = extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch);
      const qualifiedMemberRequest = getQualifiedMemberCompletionRequest(
        cursor,
        cell,
        cellValue,
        index,
        "Complete app_process trigger source"
      );
      if (qualifiedMemberRequest) {
        return qualifiedMemberRequest;
      }
      return {
        kind: "app-process-trigger-source",
        replaceFrom: cell.replaceFrom,
        replaceTo: cell.replaceTo,
        suggestions: buildStructuredReferenceSuggestions(index),
        placeholder: "Complete app_process trigger source",
        initialQuery: normalizeCompletionQuery(cellValue),
        tableColumnIndex: 2
      };
    }
  }
  if (section === "Transitions") {
    if (!hasTableHeader(lines, cursor.line, ["id", "event", "to", "condition", "notes"])) {
      return null;
    }
    if (cell.columnIndex === 2) {
      return {
        kind: "app-process-transition-to",
        replaceFrom: cell.replaceFrom,
        replaceTo: cell.replaceTo,
        suggestions: Object.values(index.screensById).sort((left, right) => left.id.localeCompare(right.id)).map((screen) => toScreenSuggestion(screen)),
        placeholder: "Complete transition screen reference",
        initialQuery: normalizeCompletionQuery(
          extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch)
        ),
        tableColumnIndex: 2
      };
    }
  }
  return null;
}
function getRuleCompletion(lines, cursor, line, index) {
  if (!line.trim().startsWith("|") || !index) {
    return null;
  }
  const section = getSectionNameAtLine(lines, cursor.line);
  const cell = getTableCellContext(line, cursor.line, cursor.ch);
  if (!cell || isMarkdownTableSeparator(line)) {
    return null;
  }
  if (section === "Inputs") {
    if (!hasTableHeader(lines, cursor.line, ["id", "data", "source", "required", "notes"])) {
      return null;
    }
    if (cell.columnIndex === 1 || cell.columnIndex === 2) {
      const cellValue = extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch);
      const qualifiedMemberRequest = getQualifiedMemberCompletionRequest(
        cursor,
        cell,
        cellValue,
        index,
        cell.columnIndex === 1 ? "Complete rule input data" : "Complete rule input source"
      );
      if (qualifiedMemberRequest) {
        return qualifiedMemberRequest;
      }
      return {
        kind: cell.columnIndex === 1 ? "rule-input-data" : "rule-input-source",
        replaceFrom: cell.replaceFrom,
        replaceTo: cell.replaceTo,
        suggestions: buildStructuredReferenceSuggestions(index),
        placeholder: cell.columnIndex === 1 ? "Complete rule input data" : "Complete rule input source",
        initialQuery: normalizeCompletionQuery(cellValue),
        tableColumnIndex: cell.columnIndex
      };
    }
  }
  if (section === "References") {
    if (!hasTableHeader(lines, cursor.line, ["ref", "usage", "notes"])) {
      return null;
    }
    if (cell.columnIndex === 0) {
      const cellValue = extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch);
      const qualifiedMemberRequest = getQualifiedMemberCompletionRequest(
        cursor,
        cell,
        cellValue,
        index,
        "Complete rule reference"
      );
      if (qualifiedMemberRequest) {
        return qualifiedMemberRequest;
      }
      return {
        kind: "rule-reference-ref",
        replaceFrom: cell.replaceFrom,
        replaceTo: cell.replaceTo,
        suggestions: buildRuleReferenceableSuggestions(index),
        placeholder: "Complete rule reference",
        initialQuery: normalizeCompletionQuery(cellValue),
        tableColumnIndex: 0
      };
    }
  }
  if (section === "Messages") {
    if (!hasTableHeader(lines, cursor.line, ["condition", "message", "severity", "notes"])) {
      return null;
    }
    if (cell.columnIndex === 2) {
      return buildOptionCompletionRequest(
        "rule-message-ref",
        cell,
        line,
        ["error", "warning", "info", "confirm"],
        "Complete rule message severity",
        2
      );
    }
    if (cell.columnIndex === 1) {
      const cellValue = extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch);
      return {
        kind: "rule-message-ref",
        replaceFrom: cell.replaceFrom,
        replaceTo: cell.replaceTo,
        suggestions: buildGenericFileSuggestions(index),
        placeholder: "Complete rule message reference",
        initialQuery: normalizeCompletionQuery(cellValue),
        tableColumnIndex: 1
      };
    }
  }
  return null;
}
function getMappingCompletion(lines, cursor, line, index) {
  if (!line.trim().startsWith("|") || !index) {
    return null;
  }
  const section = getSectionNameAtLine(lines, cursor.line);
  const cell = getTableCellContext(line, cursor.line, cursor.ch);
  if (!cell || isMarkdownTableSeparator(line)) {
    return null;
  }
  if (section === "Scope") {
    if (!hasTableHeader(lines, cursor.line, ["role", "ref", "notes"])) {
      return null;
    }
    if (cell.columnIndex === 0) {
      return buildOptionCompletionRequest(
        "mapping-scope-ref",
        cell,
        line,
        ["source", "target", "intermediate", "reference", "rule", "process"],
        "Complete mapping scope role",
        0
      );
    }
    if (cell.columnIndex === 1) {
      const cellValue = extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch);
      const qualifiedMemberRequest = getQualifiedMemberCompletionRequest(
        cursor,
        cell,
        cellValue,
        index,
        "Complete mapping scope ref"
      );
      if (qualifiedMemberRequest) {
        return qualifiedMemberRequest;
      }
      return {
        kind: "mapping-scope-ref",
        replaceFrom: cell.replaceFrom,
        replaceTo: cell.replaceTo,
        suggestions: buildRuleReferenceableSuggestions(index),
        placeholder: "Complete mapping scope ref",
        initialQuery: normalizeCompletionQuery(cellValue),
        tableColumnIndex: 1
      };
    }
  }
  if (section === "Mappings") {
    if (!hasTableHeader(lines, cursor.line, ["source_ref", "target_ref", "transform", "rule", "required", "notes"])) {
      return null;
    }
    if (cell.columnIndex === 0 || cell.columnIndex === 1) {
      const cellValue = extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch);
      const qualifiedMemberRequest = getQualifiedMemberCompletionRequest(
        cursor,
        cell,
        cellValue,
        index,
        cell.columnIndex === 0 ? "Complete mapping source_ref" : "Complete mapping target_ref"
      );
      if (qualifiedMemberRequest) {
        return qualifiedMemberRequest;
      }
      return {
        kind: cell.columnIndex === 0 ? "mapping-source-ref" : "mapping-target-ref",
        replaceFrom: cell.replaceFrom,
        replaceTo: cell.replaceTo,
        suggestions: buildStructuredReferenceSuggestions(index),
        placeholder: cell.columnIndex === 0 ? "Complete mapping source_ref" : "Complete mapping target_ref",
        initialQuery: normalizeCompletionQuery(cellValue),
        tableColumnIndex: cell.columnIndex
      };
    }
    if (cell.columnIndex === 3) {
      return {
        kind: "mapping-rule-ref",
        replaceFrom: cell.replaceFrom,
        replaceTo: cell.replaceTo,
        suggestions: [
          ...buildRuleReferenceSuggestions(index),
          ...Object.values(index.codesetsById).sort((left, right) => left.id.localeCompare(right.id)).map((codeset) => toCodeSetSuggestion(codeset))
        ],
        placeholder: "Complete mapping rule",
        initialQuery: normalizeCompletionQuery(
          extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch)
        ),
        tableColumnIndex: 3
      };
    }
    if (cell.columnIndex === 4) {
      return buildOptionCompletionRequest(
        "mapping-rule-ref",
        cell,
        line,
        ["Y", "N"],
        "Complete mapping required",
        4
      );
    }
  }
  return null;
}
function getCodeSetCompletion(content, lines, cursor, line) {
  const frontmatterRequest = getCodeSetFrontmatterCompletion(content, cursor, line);
  if (frontmatterRequest) {
    return frontmatterRequest;
  }
  if (!line.trim().startsWith("|")) {
    return null;
  }
  const section = getSectionNameAtLine(lines, cursor.line);
  if (section !== "Values") {
    return null;
  }
  const cell = getTableCellContext(line, cursor.line, cursor.ch);
  if (!cell || isMarkdownTableSeparator(line)) {
    return null;
  }
  if (!hasTableHeader(lines, cursor.line, ["code", "label", "sort_order", "active", "notes"])) {
    return null;
  }
  if (cell.columnIndex === 3) {
    return buildOptionCompletionRequest(
      "codeset-active",
      cell,
      line,
      ["Y", "N"],
      "Complete codeset active",
      3
    );
  }
  return null;
}
function getCodeSetFrontmatterCompletion(content, cursor, line) {
  if (!isLineInsideFrontmatter(content, cursor.line)) {
    return null;
  }
  const frontmatterKey = getFrontmatterKeyAtLine(line);
  if (frontmatterKey !== "kind") {
    return null;
  }
  const separatorIndex = line.indexOf(":");
  if (separatorIndex < 0) {
    return null;
  }
  return {
    kind: "codeset-active",
    replaceFrom: { line: cursor.line, ch: separatorIndex + 1 },
    replaceTo: { line: cursor.line, ch: line.length },
    suggestions: CODESET_KIND_OPTIONS.map((option) => ({
      label: option,
      insertText: option,
      resolveKey: option,
      kind: "kind"
    })),
    placeholder: "Complete codeset kind",
    initialQuery: line.slice(separatorIndex + 1).trim()
  };
}
function buildStructuredReferenceSuggestions(index) {
  return [
    ...Object.values(index.dataObjectsById).sort((left, right) => left.id.localeCompare(right.id)).map((object) => toDataObjectSuggestion(object)),
    ...Object.values(index.codesetsById).sort((left, right) => left.id.localeCompare(right.id)).map((codeset) => toCodeSetSuggestion(codeset)),
    ...Object.values(index.rulesById).sort((left, right) => left.id.localeCompare(right.id)).map((rule) => toRuleSuggestion(rule)),
    ...Object.values(index.mappingsById).sort((left, right) => left.id.localeCompare(right.id)).map((mapping) => toMappingSuggestion(mapping)),
    ...Object.values(index.screensById).sort((left, right) => left.id.localeCompare(right.id)).map((screen) => toScreenSuggestion(screen)),
    ...Object.values(index.appProcessesById).sort((left, right) => left.id.localeCompare(right.id)).map((process) => toAppProcessSuggestion(process)),
    ...Object.values(index.erEntitiesById).sort((left, right) => left.logicalName.localeCompare(right.logicalName)).map((entity) => toLinkedReferenceSuggestionForEntity(entity)),
    ...Object.values(index.objectsById).sort((left, right) => getObjectId3(left).localeCompare(getObjectId3(right))).map((object) => toLinkedReferenceSuggestionForClass(object))
  ];
}
function buildRuleReferenceSuggestions(index) {
  return Object.values(index.rulesById).sort((left, right) => left.id.localeCompare(right.id)).map((rule) => toRuleSuggestion(rule));
}
function buildRuleReferenceableSuggestions(index) {
  return [
    ...buildRuleReferenceSuggestions(index),
    ...Object.values(index.codesetsById).sort((left, right) => left.id.localeCompare(right.id)).map((codeset) => toCodeSetSuggestion(codeset)),
    ...Object.values(index.messagesById).sort((left, right) => left.id.localeCompare(right.id)).map((messageSet) => toMessageSuggestion(messageSet)),
    ...Object.values(index.dataObjectsById).sort((left, right) => left.id.localeCompare(right.id)).map((object) => toDataObjectSuggestion(object)),
    ...Object.values(index.screensById).sort((left, right) => left.id.localeCompare(right.id)).map((screen) => toScreenSuggestion(screen)),
    ...Object.values(index.appProcessesById).sort((left, right) => left.id.localeCompare(right.id)).map((process) => toAppProcessSuggestion(process)),
    ...Object.values(index.mappingsById).sort((left, right) => left.id.localeCompare(right.id)).map((mapping) => toMappingSuggestion(mapping)),
    ...Object.values(index.erEntitiesById).sort((left, right) => left.logicalName.localeCompare(right.logicalName)).map((entity) => toLinkedReferenceSuggestionForEntity(entity)),
    ...Object.values(index.objectsById).sort((left, right) => getObjectId3(left).localeCompare(getObjectId3(right))).map((object) => toLinkedReferenceSuggestionForClass(object))
  ];
}
function buildDataObjectReferenceSuggestions(index) {
  return [
    ...Object.values(index.erEntitiesById).sort((left, right) => left.logicalName.localeCompare(right.logicalName)).map((entity) => toLinkedReferenceSuggestionForEntity(entity)),
    ...Object.values(index.objectsById).sort((left, right) => getObjectId3(left).localeCompare(getObjectId3(right))).map((object) => toLinkedReferenceSuggestionForClass(object)),
    ...Object.values(index.dataObjectsById).sort((left, right) => left.id.localeCompare(right.id)).map((object) => toDataObjectSuggestion(object)),
    ...Object.values(index.codesetsById).sort((left, right) => left.id.localeCompare(right.id)).map((codeset) => toCodeSetSuggestion(codeset)),
    ...Object.values(index.screensById).sort((left, right) => left.id.localeCompare(right.id)).map((screen) => toScreenSuggestion(screen)),
    ...Object.values(index.appProcessesById).sort((left, right) => left.id.localeCompare(right.id)).map((process) => toAppProcessSuggestion(process)),
    ...Object.values(index.dfdObjectsById).sort((left, right) => left.id.localeCompare(right.id)).map((object) => toDfdObjectSuggestion(object))
  ];
}
function buildGenericFileSuggestions(index) {
  return buildRuleReferenceableSuggestions(index);
}
function getScreenFieldTargetSuggestions(lines) {
  const fields = /* @__PURE__ */ new Map();
  let inFields = false;
  let headerSeen = false;
  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    const headingMatch = trimmed.match(/^##\s+(.+)$/);
    if (headingMatch) {
      inFields = headingMatch[1].trim() === "Fields";
      headerSeen = false;
      continue;
    }
    if (!inFields || !trimmed.startsWith("|") || isMarkdownTableSeparator(trimmed)) {
      continue;
    }
    const row = parseMarkdownTableRow(trimmed);
    if (!row || row.length < 2) {
      continue;
    }
    if (!headerSeen) {
      headerSeen = row[0] === "id" && row[1] === "label";
      continue;
    }
    const id = row[0]?.trim();
    const label = row[1]?.trim();
    if (id) {
      fields.set(id, label || id);
    }
  }
  return [...fields.entries()].map(([id, label]) => ({
    label: `${id} / ${label}`,
    insertText: id,
    resolveKey: id,
    detail: "screen field target",
    kind: "reference"
  }));
}
function hasTableHeader(lines, cursorLine, expectedHeader) {
  const tableHeaderIndex = findNearestLine(lines, cursorLine, (candidate) => {
    const row = parseMarkdownTableRow(candidate);
    return row !== null && expectedHeader.every((header, index) => row[index] === header);
  });
  return tableHeaderIndex >= 0 && cursorLine > tableHeaderIndex + 1;
}
function getNearestTableHeader(lines, cursorLine) {
  const tableHeaderIndex = findNearestLine(lines, cursorLine, (candidate) => {
    const row = parseMarkdownTableRow(candidate);
    return row !== null && row.length > 0;
  });
  if (tableHeaderIndex < 0 || cursorLine <= tableHeaderIndex + 1) {
    return null;
  }
  const header = parseMarkdownTableRow(lines[tableHeaderIndex] ?? "");
  return header && header.length > 0 ? header : null;
}
function buildOptionCompletionRequest(kind, cell, line, options, placeholder, tableColumnIndex) {
  return {
    kind,
    replaceFrom: cell.replaceFrom,
    replaceTo: cell.replaceTo,
    suggestions: options.map((option) => ({
      label: option,
      insertText: option,
      resolveKey: option,
      kind: "kind"
    })),
    placeholder,
    initialQuery: extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch),
    tableColumnIndex
  };
}
function getQualifiedMemberCompletionRequest(cursor, cell, cellValue, index, placeholder) {
  const qualified = parseQualifiedRef(cellValue);
  if (!qualified) {
    return null;
  }
  const normalizedCellValue = cellValue.trim();
  const dotIndex = normalizedCellValue.lastIndexOf(".");
  if (dotIndex < 0) {
    return null;
  }
  const memberStartInCell = normalizedCellValue.slice(0, dotIndex + 1).length;
  const memberQuery = normalizedCellValue.slice(dotIndex + 1).trim();
  const memberCandidates = getQualifiedMemberCandidates(qualified.baseRefRaw, index);
  if (memberCandidates.length === 0) {
    return null;
  }
  const rawCellStart = cell.replaceFrom.ch;
  const rawTrimmedStart = lineTrimmedOffset(cellValue);
  const replaceFromCh = rawCellStart + rawTrimmedStart + memberStartInCell;
  const replaceToCh = cell.replaceTo.ch;
  if (cursor.ch < replaceFromCh - 1) {
    return null;
  }
  return {
    kind: "data-object-field-ref",
    replaceFrom: { line: cursor.line, ch: replaceFromCh },
    replaceTo: { line: cursor.line, ch: replaceToCh },
    suggestions: memberCandidates.sort((left, right) => left.memberId.localeCompare(right.memberId)).map((candidate) => ({
      label: candidate.displayName ? `${candidate.memberId} \u2014 ${candidate.displayName}` : candidate.memberId,
      insertText: candidate.memberId,
      resolveKey: `${candidate.ownerId}.${candidate.memberId}`,
      detail: `${candidate.memberKind} \xB7 ${candidate.sourceSection}`,
      kind: "reference"
    })),
    placeholder,
    initialQuery: memberQuery
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
function getDataObjectFrontmatterCompletion(content, cursor, line) {
  if (!isLineInsideFrontmatter(content, cursor.line)) {
    return null;
  }
  const frontmatterKey = getFrontmatterKeyAtLine(line);
  if (!frontmatterKey) {
    return null;
  }
  const optionsByKey = {
    data_format: DATA_OBJECT_FORMAT_OPTIONS,
    kind: DATA_OBJECT_KIND_OPTIONS,
    encoding: DATA_OBJECT_ENCODING_OPTIONS,
    line_ending: DATA_OBJECT_LINE_ENDING_OPTIONS,
    has_header: DATA_OBJECT_HAS_HEADER_OPTIONS
  };
  const options = optionsByKey[frontmatterKey];
  if (!options) {
    return null;
  }
  const separatorIndex = line.indexOf(":");
  if (separatorIndex < 0) {
    return null;
  }
  const replaceFrom = { line: cursor.line, ch: separatorIndex + 1 };
  const replaceTo = { line: cursor.line, ch: line.length };
  return {
    kind: "data-object-frontmatter",
    replaceFrom,
    replaceTo,
    suggestions: options.map((option) => ({
      label: option,
      insertText: option,
      resolveKey: option,
      kind: "kind"
    })),
    placeholder: `Complete data_object ${frontmatterKey}`,
    initialQuery: line.slice(separatorIndex + 1).trim()
  };
}
function isLineInsideFrontmatter(content, lineIndex) {
  const lines = content.split(/\r?\n/);
  if ((lines[0] ?? "").trim() !== "---") {
    return false;
  }
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index].trim() === "---") {
      return lineIndex > 0 && lineIndex < index;
    }
  }
  return false;
}
function getFrontmatterKeyAtLine(line) {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_-]*)\s*:/);
  return match ? match[1] : null;
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
function toScreenSuggestion(screen) {
  const linkTarget = toFileLinkTarget(screen.path);
  return {
    label: `${screen.id} / ${screen.name}`,
    insertText: buildAliasedWikilink(linkTarget, screen.name || screen.id),
    resolveKey: linkTarget,
    detail: screen.screenType ?? "screen",
    kind: "reference"
  };
}
function toAppProcessSuggestion(process) {
  const linkTarget = toFileLinkTarget(process.path);
  return {
    label: `${process.id} / ${process.name}`,
    insertText: buildAliasedWikilink(linkTarget, process.name || process.id),
    resolveKey: linkTarget,
    detail: process.kind ?? "app_process",
    kind: "reference"
  };
}
function toCodeSetSuggestion(codeset) {
  const linkTarget = toFileLinkTarget(codeset.path);
  return {
    label: `${codeset.id} / ${codeset.name}`,
    insertText: buildAliasedWikilink(linkTarget, codeset.name || codeset.id),
    resolveKey: linkTarget,
    detail: codeset.kind ?? "codeset",
    kind: "reference"
  };
}
function toMessageSuggestion(messageSet) {
  const linkTarget = toFileLinkTarget(messageSet.path);
  return {
    label: `${messageSet.id} / ${messageSet.name}`,
    insertText: buildAliasedWikilink(linkTarget, messageSet.name || messageSet.id),
    resolveKey: linkTarget,
    detail: messageSet.kind ?? "message",
    kind: "reference"
  };
}
function toRuleSuggestion(rule) {
  const linkTarget = toFileLinkTarget(rule.path);
  return {
    label: `${rule.id} / ${rule.name}`,
    insertText: buildAliasedWikilink(linkTarget, rule.name || rule.id),
    resolveKey: linkTarget,
    detail: rule.kind ?? "rule",
    kind: "reference"
  };
}
function toMappingSuggestion(mapping) {
  const linkTarget = toFileLinkTarget(mapping.path);
  return {
    label: `${mapping.id} / ${mapping.name}`,
    insertText: buildAliasedWikilink(linkTarget, mapping.name || mapping.id),
    resolveKey: linkTarget,
    detail: mapping.kind ?? "mapping",
    kind: "reference"
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
function lineTrimmedOffset(value) {
  const match = value.match(/^\s*/);
  return match ? match[0].length : 0;
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
  if (request.tableColumnIndex !== void 0 && (request.kind === "er-diagram-object" || request.kind === "dfd-diagram-object" || request.kind === "dfd-diagram-flow-from" || request.kind === "dfd-diagram-flow-to" || request.kind === "dfd-diagram-flow-data" || request.kind === "data-object-field-ref" || request.kind === "data-object-option" || request.kind === "screen-option" || request.kind === "class-diagram-object" || request.kind === "class-relation-to" || request.kind === "class-relation-kind" || request.kind === "screen-field-ref" || request.kind === "screen-field-layout" || request.kind === "screen-field-kind" || request.kind === "screen-field-data-type" || request.kind === "screen-field-required" || request.kind === "screen-action-target" || request.kind === "screen-action-kind" || request.kind === "screen-action-event" || request.kind === "screen-action-invoke" || request.kind === "screen-action-transition" || request.kind === "screen-rule-ref" || request.kind === "screen-message-severity" || request.kind === "app-process-input-data" || request.kind === "app-process-input-source" || request.kind === "app-process-output-data" || request.kind === "app-process-output-target" || request.kind === "app-process-trigger-source" || request.kind === "app-process-transition-to" || request.kind === "rule-input-data" || request.kind === "rule-input-source" || request.kind === "rule-reference-ref" || request.kind === "rule-message-ref" || request.kind === "mapping-scope-ref" || request.kind === "mapping-source-ref" || request.kind === "mapping-target-ref" || request.kind === "mapping-rule-ref" || request.kind === "codeset-active")) {
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

// src/adapters/obsidian-mermaid.ts
var import_obsidian2 = require("obsidian");
async function loadMermaidAdapter() {
  return (0, import_obsidian2.loadMermaid)();
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
    surface.setCssStyles({
      transform: `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`
    });
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
    canvas.toggleClass("model-weave-is-grabbing", true);
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
    canvas.toggleClass("model-weave-is-grabbing", false);
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
  toolbar.className = "mdspec-zoom-toolbar model-weave-zoom-toolbar";
  const help = document.createElement("div");
  help.addClass("model-weave-zoom-toolbar-help");
  help.textContent = helpText;
  const controls = document.createElement("div");
  controls.addClass("model-weave-zoom-toolbar-controls");
  const zoomOutButton = createToolbarButton("\u2212");
  const fitButton = createToolbarButton("Fit");
  const zoomLabel = document.createElement("span");
  zoomLabel.addClass("model-weave-zoom-toolbar-label");
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
  button.addClass("model-weave-zoom-toolbar-button");
  return button;
}

// src/renderers/mermaid-shared.ts
var MODEL_WEAVE_MERMAID_RENDER_FLAG = "__modelWeaveRenderReady";
var MIN_ZOOM = 0.4;
var MAX_ZOOM = 2.25;
var INITIAL_ZOOM = 1;
function createMermaidShell(options) {
  const root = document.createElement("section");
  root.className = `${options.className} model-weave-mermaid-shell`;
  if (options.title) {
    const title = document.createElement("h2");
    title.textContent = options.title;
    title.addClass("model-weave-mermaid-title");
    root.appendChild(title);
  }
  const canvas = document.createElement("div");
  canvas.addClass("model-weave-graph-canvas");
  if (!options.forExport) {
    canvas.addClass("model-weave-graph-canvas-interactive");
  }
  const toolbar = options.forExport ? null : createZoomToolbar("Wheel: zoom / Drag background: pan");
  if (toolbar) {
    root.appendChild(toolbar.root);
  }
  const viewport = document.createElement("div");
  viewport.addClass("model-weave-graph-viewport");
  const surface = document.createElement("div");
  surface.addClass("model-weave-graph-surface");
  surface.dataset.modelWeaveExportSurface = "true";
  viewport.appendChild(surface);
  canvas.appendChild(viewport);
  root.appendChild(canvas);
  return { root, canvas, surface, toolbar };
}
async function renderMermaidSourceIntoShell(shell, options) {
  const mermaid = await loadMermaidAdapter();
  const renderId = `${options.renderIdPrefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const rendered = await mermaid.render(renderId, options.source);
  const { canvas, surface, toolbar } = shell;
  surface.empty();
  const svg = appendRenderedSvg(surface, rendered.svg);
  surface.dataset.modelWeaveRenderer = "mermaid";
  if (typeof rendered.bindFunctions === "function") {
    rendered.bindFunctions(surface);
  }
  const sceneSize = readMermaidSceneSize(svg);
  if (!sceneSize) {
    throw new Error("Mermaid SVG has no measurable bounds.");
  }
  surface.dataset.modelWeaveSceneWidth = `${sceneSize.width}`;
  surface.dataset.modelWeaveSceneHeight = `${sceneSize.height}`;
  surface.setCssStyles({
    width: `${sceneSize.width}px`,
    height: `${sceneSize.height}px`
  });
  svg.setAttribute("width", `${sceneSize.width}`);
  svg.setAttribute("height", `${sceneSize.height}`);
  svg.setCssStyles({
    width: `${sceneSize.width}px`,
    height: `${sceneSize.height}px`,
    display: "block"
  });
  if (toolbar) {
    attachGraphViewportInteractions(canvas, surface, toolbar, sceneSize, {
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      initialZoom: INITIAL_ZOOM,
      nodeSelector: options.nodeSelector ?? ".node, g.node, foreignObject",
      viewportState: options.viewportState,
      onViewportStateChange: options.onViewportStateChange
    });
  }
}
function appendRenderedSvg(surface, svgMarkup) {
  const parser = new DOMParser();
  const documentRoot = parser.parseFromString(svgMarkup, "image/svg+xml");
  const parseError = documentRoot.querySelector("parsererror");
  if (parseError) {
    throw new Error("Mermaid SVG could not be parsed.");
  }
  const parsedSvg = documentRoot.documentElement;
  if (!parsedSvg || parsedSvg.tagName.toLowerCase() !== "svg") {
    throw new Error("Mermaid SVG was not generated.");
  }
  scrubSvgElementTree(parsedSvg);
  const importedSvg = surface.ownerDocument.importNode(
    parsedSvg,
    true
  );
  surface.appendChild(importedSvg);
  return importedSvg;
}
function scrubSvgElementTree(root) {
  const elements = [root, ...Array.from(root.querySelectorAll("*"))];
  for (const element of elements) {
    if (element.tagName.toLowerCase() === "script") {
      element.remove();
      continue;
    }
    for (const attribute of Array.from(element.attributes)) {
      const attributeName = attribute.name.toLowerCase();
      const attributeValue = attribute.value.trim().toLowerCase();
      if (attributeName.startsWith("on")) {
        element.removeAttribute(attribute.name);
        continue;
      }
      if ((attributeName === "href" || attributeName === "xlink:href") && attributeValue.startsWith("javascript:")) {
        element.removeAttribute(attribute.name);
      }
    }
  }
}
function setMermaidRenderReadyPromise(element, ready) {
  element[MODEL_WEAVE_MERMAID_RENDER_FLAG] = ready;
}
function getMermaidRenderReadyPromise(element) {
  return element[MODEL_WEAVE_MERMAID_RENDER_FLAG] ?? null;
}
function createMermaidFallbackNotice(message) {
  const notice = document.createElement("div");
  notice.addClass("model-weave-mermaid-fallback");
  notice.textContent = message;
  return notice;
}
function readMermaidSceneSize(svg) {
  const viewBox = svg.viewBox?.baseVal;
  if (viewBox && Number.isFinite(viewBox.width) && Number.isFinite(viewBox.height)) {
    return {
      minX: viewBox.x,
      minY: viewBox.y,
      maxX: viewBox.x + Math.max(1, viewBox.width),
      maxY: viewBox.y + Math.max(1, viewBox.height),
      width: Math.max(1, viewBox.width),
      height: Math.max(1, viewBox.height)
    };
  }
  const width = parseFloat(svg.getAttribute("width") ?? "");
  const height = parseFloat(svg.getAttribute("height") ?? "");
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }
  return {
    minX: 0,
    minY: 0,
    maxX: width,
    maxY: height,
    width,
    height
  };
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
    const mermaidReady = getMermaidRenderReadyPromise(rendered);
    if (mermaidReady) {
      await mermaidReady;
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
    return null;
  }
  const sceneWidth = readSceneSize(surface.dataset.modelWeaveSceneWidth, surface.style.width);
  const sceneHeight = readSceneSize(
    surface.dataset.modelWeaveSceneHeight,
    surface.style.height
  );
  if (!sceneWidth || !sceneHeight) {
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
    return exportPath;
  } catch (error) {
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
    return arrayBuffer;
  } catch (error) {
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
    return arrayBuffer;
  } catch (error) {
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

// src/settings/model-weave-settings.ts
var DEFAULT_MODEL_WEAVE_SETTINGS = {
  defaultRenderMode: "auto",
  defaultZoom: "fit",
  fontSize: "normal",
  nodeDensity: "normal"
};
var VALID_DEFAULT_ZOOMS = /* @__PURE__ */ new Set(["fit", "100"]);
var VALID_FONT_SIZES = /* @__PURE__ */ new Set([
  "small",
  "normal",
  "large"
]);
var VALID_NODE_DENSITIES = /* @__PURE__ */ new Set([
  "compact",
  "normal",
  "relaxed"
]);
var VALID_RENDER_MODES2 = /* @__PURE__ */ new Set(["auto", "custom", "mermaid"]);
function normalizeModelWeaveSettings(value) {
  const raw = isRecord(value) ? value : {};
  return {
    defaultRenderMode: normalizeEnumValue(
      raw.defaultRenderMode,
      VALID_RENDER_MODES2,
      DEFAULT_MODEL_WEAVE_SETTINGS.defaultRenderMode
    ),
    defaultZoom: normalizeEnumValue(
      raw.defaultZoom,
      VALID_DEFAULT_ZOOMS,
      DEFAULT_MODEL_WEAVE_SETTINGS.defaultZoom
    ),
    fontSize: normalizeEnumValue(
      raw.fontSize,
      VALID_FONT_SIZES,
      DEFAULT_MODEL_WEAVE_SETTINGS.fontSize
    ),
    nodeDensity: normalizeEnumValue(
      raw.nodeDensity,
      VALID_NODE_DENSITIES,
      DEFAULT_MODEL_WEAVE_SETTINGS.nodeDensity
    )
  };
}
function normalizeEnumValue(value, allowed, fallback) {
  if (typeof value !== "string") {
    return fallback;
  }
  return allowed.has(value) ? value : fallback;
}
function isRecord(value) {
  return typeof value === "object" && value !== null;
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
id:
name:
kind:
data_format: object
tags:
  - DataObject
---

# 

## Summary

## Fields

| name | label | type | length | required | path | ref | notes |
|---|---|---|---:|---|---|---|---|
|  |  |  |  |  |  |  |  |

## Notes
`,
  dataObjectFileLayout: `---
type: data_object
id:
name:
kind: file
data_format:
encoding:
delimiter:
line_ending:
has_header:
record_length:
tags:
  - DataObject
  - File
---

# 

## Summary

## Format

| key | value | notes |
|---|---|---|
|  |  |  |

## Records

| record_type | name | occurrence | notes |
|---|---|---|---|
|  |  |  |  |

## Fields

| record_type | no | name | label | type | length | required | position | field_format | ref | notes |
|---|---:|---|---|---|---:|---|---|---|---|---|
|  |  |  |  |  |  |  |  |  |  |  |

## Notes
`,
  appProcess: `---
type: app_process
id: PROC-
name:
kind:
tags:
  - AppProcess
---

# 

## Summary

## Triggers

| id | kind | source | event | notes |
|---|---|---|---|---|
|  |  |  |  |  |

## Inputs

| id | data | source | required | notes |
|---|---|---|---|---|
|  |  |  |  |  |

## Outputs

| id | data | target | notes |
|---|---|---|---|
|  |  |  |  |

## Transitions

| id | event | to | condition | notes |
|---|---|---|---|---|
|  |  |  |  |  |

## Steps

## Errors

## Notes
`,
  screen: `---
type: screen
id: SCR-
name:
screen_type:
tags:
  - Screen
---

# 

## Summary

## Layout

| id | label | kind | purpose | notes |
|---|---|---|---|---|
|  |  |  |  |  |

## Fields

| id | label | kind | layout | data_type | required | ref | rule | notes |
|---|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |  |

## Actions

| id | label | kind | target | event | invoke | transition | rule | notes |
|---|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |  |

## Messages

| id | text | severity | timing | notes |
|---|---|---|---|---|
|  |  |  |  |  |

## Notes

## Local Processes
`,
  codeSet: `---
type: codeset
id:
name:
kind:
tags:
  - CodeSet
---

# 

## Summary

## Values

| code | label | sort_order | active | notes |
|---|---|---:|---|---|

## Notes
`,
  message: `---
type: message
id:
name:
kind:
tags:
  - Message
---

# 

## Summary

## Messages

| message_id | text | severity | timing | audience | active | notes |
|---|---|---|---|---|---|---|

## Notes
`,
  rule: `---
type: rule
id:
name:
kind:
tags:
  - Rule
---

# 

## Summary

## Inputs

| id | data | source | required | notes |
|---|---|---|---|---|

## References

| ref | usage | notes |
|---|---|---|

## Conditions

## Messages

| condition | message | severity | notes |
|---|---|---|---|

## Notes
`,
  mapping: `---
type: mapping
id:
name:
kind:
source:
target:
tags:
  - Mapping
---

# 

## Summary

## Scope

| role | ref | notes |
|---|---|---|

## Mappings

| source_ref | target_ref | transform | rule | required | notes |
|---|---|---|---|---|---|

## Rules

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
var FLOW_HEADERS = ["id", "from", "to", "data", "notes"];
var LEGACY_OBJECT_HEADERS = ["ref", "notes"];
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
  const objectsTable = parseDfdObjectsTable(sections.Objects, path);
  const flowsTable = parseMarkdownTable(sections.Flows, FLOW_HEADERS, path, "Flows");
  warnings.push(...objectsTable.warnings, ...flowsTable.warnings);
  const fallbackTitle = name || id || getFileStem3(path) || "Untitled DFD Diagram";
  const objectEntries = objectsTable.rows;
  const objectRefs = objectEntries.map((row) => row.id?.trim() || row.ref?.trim() || "").filter(Boolean);
  const nodes = objectEntries.map((entry) => ({
    id: entry.id?.trim() || entry.ref?.trim() || `object-${entry.rowIndex + 1}`,
    ref: entry.ref?.trim() || void 0,
    label: entry.label?.trim() || void 0,
    kind: entry.kind
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
      objectEntries,
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
function parseDfdObjectsTable(lines, path) {
  if (!lines) {
    return { rows: [], warnings: [] };
  }
  const normalizedLines = lines.map((line) => line.trim()).filter((line) => line.startsWith("|"));
  if (normalizedLines.length < 2) {
    return {
      rows: [],
      warnings: normalizedLines.length === 0 ? [] : [createWarning7(path, "Objects", 'table in section "Objects" is incomplete')]
    };
  }
  const headers = splitMarkdownTableRow(normalizedLines[0]) ?? [];
  const warnings = [];
  const hasLegacyHeaders = sameHeaders3(headers, LEGACY_OBJECT_HEADERS);
  const hasLocalHeaders = headers.includes("id") && headers.includes("label") && headers.includes("kind") && headers.includes("ref");
  if (!hasLegacyHeaders && !hasLocalHeaders) {
    warnings.push(
      createWarning7(
        path,
        "Objects",
        'table columns in section "Objects" do not match supported DFD object headers'
      )
    );
  }
  if (hasLegacyHeaders) {
    warnings.push({
      code: "invalid-structure",
      message: "Old ref-only DFD Objects format detected; compatibility mode used.",
      severity: "info",
      path,
      field: "Objects"
    });
  }
  const rows = [];
  const seenIds = /* @__PURE__ */ new Set();
  normalizedLines.slice(2).forEach((rowLine, rowIndex) => {
    const values = splitMarkdownTableRow(rowLine) ?? [];
    if (values.length !== headers.length) {
      warnings.push(
        createWarning7(
          path,
          "Objects",
          `table row in section "Objects" has ${values.length} columns, expected ${headers.length}`
        )
      );
      return;
    }
    const row = {};
    for (const [headerIndex, header] of headers.entries()) {
      row[header] = values[headerIndex] ?? "";
    }
    const id = row.id?.trim() || "";
    const label = row.label?.trim() || "";
    const kind = row.kind?.trim() || "";
    const ref = row.ref?.trim() || "";
    const notes = row.notes?.trim() || "";
    if (!id && !ref) {
      warnings.push({
        code: "invalid-structure",
        message: 'DFD Objects row must have "id" or "ref".',
        severity: "error",
        path,
        field: "Objects",
        context: { rowIndex: rowIndex + 1 }
      });
      return;
    }
    if (id) {
      if (seenIds.has(id)) {
        warnings.push({
          code: "invalid-structure",
          message: `duplicate DFD Objects.id "${id}"`,
          severity: "error",
          path,
          field: "Objects",
          context: { rowIndex: rowIndex + 1 }
        });
      } else {
        seenIds.add(id);
      }
    }
    if (kind && !isSupportedDfdDiagramObjectKind(kind)) {
      warnings.push({
        code: "invalid-structure",
        message: `unknown DFD object kind "${kind}"`,
        severity: "warning",
        path,
        field: "Objects",
        context: { rowIndex: rowIndex + 1 }
      });
    }
    rows.push({
      id: id || void 0,
      label: label || void 0,
      kind: kind ? normalizeDfdDiagramObjectKind(kind) : void 0,
      ref: ref || void 0,
      notes: notes || void 0,
      rowIndex,
      compatibilityMode: hasLegacyHeaders ? "legacy_ref_only" : "explicit"
    });
  });
  return { rows, warnings };
}
function normalizeDfdDiagramObjectKind(value) {
  switch (value) {
    case "external":
    case "process":
    case "datastore":
      return value;
    default:
      return "other";
  }
}
function isSupportedDfdDiagramObjectKind(value) {
  return value === "external" || value === "process" || value === "datastore" || value === "other";
}
function sameHeaders3(actual, expected) {
  return actual.length === expected.length && actual.every((header, index) => header === expected[index]);
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
var FORMAT_HEADERS = ["key", "value", "notes"];
var RECORD_HEADERS = ["record_type", "name", "occurrence", "notes"];
var FILE_LAYOUT_HINTS = /* @__PURE__ */ new Set(["record_type", "no", "position", "field_format"]);
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
  const dataFormat = typeof frontmatter.data_format === "string" ? frontmatter.data_format.trim() : "";
  const encoding = typeof frontmatter.encoding === "string" ? frontmatter.encoding.trim() : "";
  const delimiter = typeof frontmatter.delimiter === "string" ? frontmatter.delimiter.trim() : "";
  const lineEnding = typeof frontmatter.line_ending === "string" ? frontmatter.line_ending.trim() : "";
  const hasHeader = typeof frontmatter.has_header === "string" || typeof frontmatter.has_header === "boolean" ? String(frontmatter.has_header).trim() : "";
  const recordLength = typeof frontmatter.record_length === "string" || typeof frontmatter.record_length === "number" ? String(frontmatter.record_length).trim() : "";
  if (frontmatter.type !== "data_object") {
    warnings.push(createWarning9(path, "type", 'expected type "data_object"'));
  }
  if (!id) {
    warnings.push(createWarning9(path, "id", 'required frontmatter "id" is missing'));
  }
  if (!name) {
    warnings.push(createWarning9(path, "name", 'required frontmatter "name" is missing'));
  }
  const lines = normalizeLines(markdown);
  const bodyStartLine = getBodyStartLine(lines);
  const sectionRanges = getSectionRanges(lines, bodyStartLine);
  const formatTable = parseSectionTable(lines, sectionRanges.Format, path, "Format");
  const recordsTable = parseSectionTable(lines, sectionRanges.Records, path, "Records");
  const fieldsTable = parseSectionTable(lines, sectionRanges.Fields, path, "Fields");
  warnings.push(...formatTable.warnings, ...recordsTable.warnings, ...fieldsTable.warnings);
  const formatEntries = formatTable.rows.map((row) => ({
    key: row.record.key?.trim() ?? "",
    value: row.record.value?.trim() || void 0,
    notes: row.record.notes?.trim() || void 0,
    rowLine: row.line
  }));
  const records = recordsTable.rows.map((row) => ({
    recordType: row.record.record_type?.trim() ?? "",
    name: row.record.name?.trim() || void 0,
    occurrence: row.record.occurrence?.trim() || void 0,
    notes: row.record.notes?.trim() || void 0,
    rowLine: row.line
  }));
  const fieldMode = detectFieldMode(fieldsTable.header);
  if (fieldMode === "file_layout" && hasStandardAndFileLayoutColumns(fieldsTable.header)) {
    warnings.push(
      createSectionWarning2(
        path,
        "Fields",
        "Fields table mixes standard and file layout columns; parsed as file_layout"
      )
    );
  }
  const fields = fieldsTable.rows.map(
    (row) => fieldMode === "file_layout" ? {
      fieldMode,
      recordType: row.record.record_type?.trim() || void 0,
      no: row.record.no?.trim() || void 0,
      name: row.record.name?.trim() ?? "",
      label: row.record.label?.trim() || void 0,
      type: row.record.type?.trim() || void 0,
      length: row.record.length?.trim() || void 0,
      required: row.record.required?.trim() || void 0,
      position: row.record.position?.trim() || void 0,
      fieldFormat: row.record.field_format?.trim() || void 0,
      ref: row.record.ref?.trim() || void 0,
      notes: row.record.notes?.trim() || void 0,
      rowLine: row.line
    } : {
      fieldMode,
      name: row.record.name?.trim() ?? "",
      label: row.record.label?.trim() || void 0,
      type: row.record.type?.trim() || void 0,
      length: row.record.length?.trim() || void 0,
      required: row.record.required?.trim() || void 0,
      path: row.record.path?.trim() || void 0,
      ref: row.record.ref?.trim() || void 0,
      notes: row.record.notes?.trim() || void 0,
      rowLine: row.line
    }
  );
  const fallbackName = name || id || getFileStem5(path) || "Untitled Data Object";
  const sectionLines = Object.fromEntries(
    Object.entries(sectionRanges).filter(([, range]) => range).map(([key, range]) => [key, range?.headingLine ?? bodyStartLine])
  );
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
      dataFormat: dataFormat || void 0,
      encoding: encoding || void 0,
      delimiter: delimiter || void 0,
      lineEnding: lineEnding || void 0,
      hasHeader: hasHeader || void 0,
      recordLength: recordLength || void 0,
      summary: joinSectionLines4(sections.Summary),
      notes: normalizeNotes2(sections.Notes),
      formatEntries,
      records,
      fields,
      fieldMode,
      sectionLines
    },
    warnings
  };
}
function normalizeLines(markdown) {
  return markdown.replace(/\r\n/g, "\n").split("\n");
}
function getBodyStartLine(lines) {
  if ((lines[0] ?? "").trim() !== "---") {
    return 0;
  }
  for (let index = 1; index < lines.length; index += 1) {
    if ((lines[index] ?? "").trim() === "---") {
      return index + 1;
    }
  }
  return 0;
}
function getSectionRanges(lines, bodyStartLine) {
  const sectionNames = ["Summary", "Format", "Records", "Fields", "Notes"];
  const ranges = {
    Summary: null,
    Format: null,
    Records: null,
    Fields: null,
    Notes: null
  };
  const headings = [];
  for (let index = bodyStartLine; index < lines.length; index += 1) {
    const match = (lines[index] ?? "").trim().match(/^##\s+(.+)$/);
    if (!match) {
      continue;
    }
    const name = match[1].trim();
    if (sectionNames.includes(name)) {
      headings.push({ name, line: index });
    }
  }
  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index];
    const nextLine = headings[index + 1]?.line ?? lines.length;
    ranges[heading.name] = {
      headingLine: heading.line,
      endLine: nextLine
    };
  }
  return ranges;
}
function parseSectionTable(lines, range, path, section) {
  const warnings = [];
  if (!range) {
    return { header: [], rows: [], warnings };
  }
  let header = [];
  const rows = [];
  for (let index = range.headingLine + 1; index < range.endLine; index += 1) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) {
      continue;
    }
    const cells = splitMarkdownTableRow(line);
    if (!cells || cells.length === 0) {
      continue;
    }
    if (isSeparatorRow(cells)) {
      continue;
    }
    if (header.length === 0) {
      header = cells.map((cell) => cell.trim());
      continue;
    }
    const record = {};
    for (let columnIndex = 0; columnIndex < header.length; columnIndex += 1) {
      record[header[columnIndex]] = cells[columnIndex] ?? "";
    }
    if (Object.values(record).every((value) => !value.trim())) {
      continue;
    }
    if (cells.length > header.length) {
      warnings.push(
        createSectionWarning2(
          path,
          section,
          `table row in section "${section}" has ${cells.length} columns, expected ${header.length}`
        )
      );
    }
    rows.push({ record, line: index });
  }
  if (section === "Format" && header.length > 0 && !matchesHeader(header, FORMAT_HEADERS)) {
    warnings.push(
      createSectionWarning2(path, section, "Format table should use: key | value | notes")
    );
  }
  if (section === "Records" && header.length > 0 && !matchesHeader(header, RECORD_HEADERS)) {
    warnings.push(
      createSectionWarning2(
        path,
        section,
        "Records table should use: record_type | name | occurrence | notes"
      )
    );
  }
  return { header, rows, warnings };
}
function detectFieldMode(header) {
  return header.some((cell) => FILE_LAYOUT_HINTS.has(cell)) ? "file_layout" : "standard";
}
function hasStandardAndFileLayoutColumns(header) {
  const hasFileLayout = header.some((cell) => FILE_LAYOUT_HINTS.has(cell));
  const hasStandardOnly = header.some((cell) => ["path"].includes(cell));
  return hasFileLayout && hasStandardOnly;
}
function matchesHeader(header, expected) {
  return expected.every((value, index) => header[index] === value);
}
function isSeparatorRow(cells) {
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
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
function createSectionWarning2(path, section, message) {
  return {
    code: "invalid-structure",
    message,
    severity: "warning",
    path,
    field: section,
    context: {
      section
    }
  };
}

// src/parsers/app-process-parser.ts
var INPUT_HEADERS = ["id", "data", "source", "required", "notes"];
var OUTPUT_HEADERS = ["id", "data", "target", "notes"];
var TRIGGER_HEADERS = ["id", "kind", "source", "event", "notes"];
var TRANSITION_HEADERS = ["id", "event", "to", "condition", "notes"];
function parseAppProcessFile(markdown, path) {
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
  if (frontmatter.type !== "app_process") {
    warnings.push(createWarning10(path, "type", 'expected type "app_process"'));
  }
  if (!id) {
    warnings.push(createWarning10(path, "id", 'required frontmatter "id" is missing'));
  }
  if (!name) {
    warnings.push(createWarning10(path, "name", 'required frontmatter "name" is missing'));
  }
  const inputsTable = parseMarkdownTable(sections.Inputs, INPUT_HEADERS, path, "Inputs");
  const outputsTable = parseMarkdownTable(sections.Outputs, OUTPUT_HEADERS, path, "Outputs");
  const triggersTable = parseMarkdownTable(
    sections.Triggers,
    TRIGGER_HEADERS,
    path,
    "Triggers"
  );
  const transitionsTable = parseMarkdownTable(
    sections.Transitions,
    TRANSITION_HEADERS,
    path,
    "Transitions"
  );
  warnings.push(
    ...inputsTable.warnings,
    ...outputsTable.warnings,
    ...triggersTable.warnings,
    ...transitionsTable.warnings
  );
  const fallbackName = name || id || getFileStem6(path) || "Untitled App Process";
  return {
    file: {
      fileType: "app-process",
      schema: "app_process",
      path,
      title: fallbackName,
      frontmatter,
      sections,
      id,
      name: fallbackName,
      kind: kind || void 0,
      summary: joinSectionLines5(sections.Summary),
      inputs: inputsTable.rows.map((row) => ({
        id: row.id?.trim() ?? "",
        data: row.data?.trim() || void 0,
        source: row.source?.trim() || void 0,
        required: row.required?.trim() || void 0,
        notes: row.notes?.trim() || void 0
      })).filter((row) => !isEmptyRow(Object.values(row))),
      outputs: outputsTable.rows.map((row) => ({
        id: row.id?.trim() ?? "",
        data: row.data?.trim() || void 0,
        target: row.target?.trim() || void 0,
        notes: row.notes?.trim() || void 0
      })).filter((row) => !isEmptyRow(Object.values(row))),
      triggers: triggersTable.rows.map((row) => ({
        id: row.id?.trim() ?? "",
        kind: row.kind?.trim() || void 0,
        source: row.source?.trim() || void 0,
        event: row.event?.trim() || void 0,
        notes: row.notes?.trim() || void 0
      })).filter((row) => !isEmptyRow(Object.values(row))),
      transitions: transitionsTable.rows.map((row) => ({
        id: row.id?.trim() ?? "",
        event: row.event?.trim() || void 0,
        to: row.to?.trim() || void 0,
        condition: row.condition?.trim() || void 0,
        notes: row.notes?.trim() || void 0
      })).filter((row) => !isEmptyRow(Object.values(row))),
      notes: normalizeNotes3(sections.Notes)
    },
    warnings
  };
}
function getFileStem6(path) {
  return path.replace(/\\/g, "/").split("/").pop()?.replace(/\.md$/i, "") ?? "";
}
function joinSectionLines5(lines) {
  const value = (lines ?? []).join("\n").trim();
  return value || void 0;
}
function normalizeNotes3(lines) {
  const notes = (lines ?? []).map((line) => line.trim()).filter(Boolean).map((line) => line.replace(/^-\s+/, ""));
  return notes.length > 0 ? notes : void 0;
}
function isEmptyRow(values) {
  return values.every((value) => !value?.trim());
}
function createWarning10(path, field, message) {
  return {
    code: "invalid-structure",
    message,
    severity: "warning",
    path,
    field
  };
}

// src/parsers/screen-parser.ts
var LAYOUT_HEADERS = ["id", "label", "kind", "purpose", "notes"];
var FIELD_HEADERS = [
  "id",
  "label",
  "kind",
  "layout",
  "data_type",
  "required",
  "ref",
  "rule",
  "notes"
];
var LEGACY_FIELD_HEADERS = [
  "id",
  "label",
  "kind",
  "data_type",
  "required",
  "ref",
  "rule",
  "notes"
];
var ACTION_HEADERS = [
  "id",
  "label",
  "kind",
  "target",
  "event",
  "invoke",
  "transition",
  "rule",
  "notes"
];
var MESSAGE_HEADERS = ["id", "text", "severity", "timing", "notes"];
var LEGACY_MESSAGE_HEADERS = ["ref", "timing", "notes"];
var LEGACY_TRANSITION_HEADERS = ["id", "event", "to", "condition", "notes"];
function parseScreenFile(markdown, path) {
  const normalizedMarkdown = markdown.replace(/\r\n/g, "\n");
  const frontmatterResult = parseFrontmatter(normalizedMarkdown);
  const frontmatter = frontmatterResult.file.frontmatter ?? {};
  const body = frontmatterResult.file.body;
  const sections = extractMarkdownSections(body);
  const warnings = frontmatterResult.warnings.map((warning) => ({
    ...warning,
    path: warning.path ?? path
  }));
  const id = typeof frontmatter.id === "string" ? frontmatter.id.trim() : "";
  const name = typeof frontmatter.name === "string" ? frontmatter.name.trim() : "";
  const screenType = typeof frontmatter.screen_type === "string" ? frontmatter.screen_type.trim() : "";
  if (frontmatter.type !== "screen") {
    warnings.push(createWarning11(path, "type", 'expected type "screen"'));
  }
  if (!id) {
    warnings.push(createWarning11(path, "id", 'required frontmatter "id" is missing'));
  }
  if (!name) {
    warnings.push(createWarning11(path, "name", 'required frontmatter "name" is missing'));
  }
  const bodyLines = body.split("\n");
  const bodyStartLine = getBodyStartLine2(normalizedMarkdown);
  const sectionLines = getSectionLineNumbers(bodyLines, bodyStartLine);
  const layoutTable = readSectionTable(bodyLines, bodyStartLine, "Layout");
  const fieldsTable = readSectionTable(bodyLines, bodyStartLine, "Fields");
  const actionsTable = readSectionTable(bodyLines, bodyStartLine, "Actions");
  const messagesTable = readSectionTable(bodyLines, bodyStartLine, "Messages");
  const transitionsTable = readSectionTable(bodyLines, bodyStartLine, "Transitions");
  const localProcesses = collectLocalProcesses(bodyLines, bodyStartLine);
  const layoutHeaders = layoutTable.headers;
  if (layoutHeaders.length > 0 && !sameHeaders4(layoutHeaders, LAYOUT_HEADERS)) {
    warnings.push(createWarning11(path, "Layout", 'table columns in section "Layout" do not match expected headers'));
  }
  const fieldHeaders = fieldsTable.headers;
  const isCanonicalFields = sameHeaders4(fieldHeaders, FIELD_HEADERS);
  const isLegacyFields = sameHeaders4(fieldHeaders, LEGACY_FIELD_HEADERS);
  if (fieldHeaders.length > 0 && !isCanonicalFields && !isLegacyFields) {
    warnings.push(createWarning11(path, "Fields", 'table columns in section "Fields" do not match expected screen field headers'));
  }
  const actionHeaders = actionsTable.headers;
  if (actionHeaders.length > 0 && !sameHeaders4(actionHeaders, ACTION_HEADERS)) {
    warnings.push(createWarning11(path, "Actions", 'table columns in section "Actions" do not match expected headers'));
  }
  const messageHeaders = messagesTable.headers;
  const isCanonicalMessages = sameHeaders4(messageHeaders, MESSAGE_HEADERS);
  const isLegacyMessages = sameHeaders4(messageHeaders, LEGACY_MESSAGE_HEADERS);
  if (messageHeaders.length > 0 && !isCanonicalMessages && !isLegacyMessages) {
    warnings.push(createWarning11(path, "Messages", 'table columns in section "Messages" do not match expected headers'));
  }
  const transitionHeaders = transitionsTable.headers;
  if (transitionHeaders.length > 0 && !sameHeaders4(transitionHeaders, LEGACY_TRANSITION_HEADERS)) {
    warnings.push(createWarning11(path, "Transitions", 'table columns in section "Transitions" do not match expected legacy headers'));
  }
  const fallbackName = name || id || getFileStem7(path) || "Untitled Screen";
  return {
    file: {
      fileType: "screen",
      schema: "screen",
      path,
      title: fallbackName,
      frontmatter,
      sections,
      id,
      name: fallbackName,
      screenType: screenType || void 0,
      summary: joinSectionLines6(sections.Summary),
      layouts: layoutTable.rows.map((row) => ({
        id: row.record.id?.trim() ?? "",
        label: row.record.label?.trim() || void 0,
        kind: row.record.kind?.trim() || void 0,
        purpose: row.record.purpose?.trim() || void 0,
        notes: row.record.notes?.trim() || void 0,
        rowLine: row.rowLine
      })).filter((row) => !isEmptyRow2(Object.values(row))),
      fields: fieldsTable.rows.map((row) => {
        const record = row.record;
        return {
          id: record.id?.trim() ?? "",
          label: record.label?.trim() || void 0,
          kind: record.kind?.trim() || void 0,
          layout: record.layout?.trim() || void 0,
          dataType: record.data_type?.trim() || void 0,
          required: record.required?.trim() || void 0,
          ref: record.ref?.trim() || void 0,
          rule: record.rule?.trim() || void 0,
          notes: record.notes?.trim() || void 0,
          rowLine: row.rowLine
        };
      }).filter((row) => !isEmptyRow2(Object.values(row))),
      actions: actionsTable.rows.map((row) => mapActionRow(row.record, row.rowLine)).filter((row) => !isEmptyRow2(Object.values(row))),
      messages: messagesTable.rows.map((row) => mapMessageRow(row.record, row.rowLine, isLegacyMessages)).filter((row) => !isEmptyRow2(Object.values(row))),
      localProcesses,
      legacyTransitions: transitionsTable.rows.map((row) => mapLegacyTransitionRow(row.record, row.rowLine)).filter((row) => !isEmptyRow2(Object.values(row))),
      notes: normalizeNotes4(sections.Notes),
      sectionLines
    },
    warnings
  };
}
function getBodyStartLine2(markdown) {
  if (!markdown.startsWith("---\n")) {
    return 0;
  }
  const lines = markdown.split("\n");
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index].trim() === "---") {
      return index + 1;
    }
  }
  return 0;
}
function getSectionLineNumbers(bodyLines, bodyStartLine) {
  const lines = {};
  for (let index = 0; index < bodyLines.length; index += 1) {
    const trimmed = bodyLines[index].trim();
    if (trimmed === "# Summary") {
      lines.Summary = bodyStartLine + index;
      continue;
    }
    const match = trimmed.match(/^##\s+(.+)$/);
    if (!match) {
      continue;
    }
    const sectionName = match[1].trim();
    lines[sectionName] = bodyStartLine + index;
  }
  return lines;
}
function readSectionTable(bodyLines, bodyStartLine, sectionName) {
  const sectionBody = getSectionBodyLines(bodyLines, sectionName);
  const tableLines = sectionBody.map((entry) => ({ ...entry, trimmed: entry.text.trim() })).filter((entry) => entry.trimmed.startsWith("|"));
  if (tableLines.length < 2) {
    return { headers: [], rows: [] };
  }
  const headers = splitMarkdownTableRow(tableLines[0].trimmed) ?? [];
  if (headers.length === 0) {
    return { headers: [], rows: [] };
  }
  const rows = [];
  for (const rowLine of tableLines.slice(2)) {
    const values = splitMarkdownTableRow(rowLine.trimmed) ?? [];
    if (values.length !== headers.length) {
      continue;
    }
    const record = {};
    for (const [index, header] of headers.entries()) {
      record[header] = values[index] ?? "";
    }
    if (Object.values(record).every((value) => !value.trim())) {
      continue;
    }
    rows.push({
      record,
      rowLine: bodyStartLine + rowLine.index
    });
  }
  return { headers, rows };
}
function getSectionBodyLines(bodyLines, sectionName) {
  const entries = [];
  let inSection = false;
  for (let index = 0; index < bodyLines.length; index += 1) {
    const line = bodyLines[index];
    const trimmed = line.trim();
    if (sectionName === "Summary" && trimmed === "# Summary") {
      inSection = true;
      continue;
    }
    const topLevelHeading = trimmed.match(/^##\s+(.+)$/);
    if (topLevelHeading) {
      const current = topLevelHeading[1].trim();
      if (inSection && current !== sectionName) {
        break;
      }
      inSection = current === sectionName;
      continue;
    }
    if (inSection) {
      entries.push({ index, text: line });
    }
  }
  return entries;
}
function collectLocalProcesses(bodyLines, bodyStartLine) {
  const localProcessLines = getSectionBodyLines(bodyLines, "Local Processes");
  const processes = [];
  for (let index = 0; index < localProcessLines.length; index += 1) {
    const entry = localProcessLines[index];
    const headingMatch = entry.text.trim().match(/^###\s+(.+)$/);
    if (!headingMatch) {
      continue;
    }
    const heading = headingMatch[1].trim();
    let summary;
    for (let nextIndex = index + 1; nextIndex < localProcessLines.length; nextIndex += 1) {
      const nextLine = localProcessLines[nextIndex].text.trim();
      if (/^###\s+/.test(nextLine)) {
        break;
      }
      if (/^####\s+Summary$/.test(nextLine)) {
        const collected = [];
        for (let bodyIndex = nextIndex + 1; bodyIndex < localProcessLines.length; bodyIndex += 1) {
          const bodyLine = localProcessLines[bodyIndex].text.trim();
          if (/^###\s+/.test(bodyLine) || /^####\s+/.test(bodyLine)) {
            break;
          }
          if (bodyLine) {
            collected.push(bodyLine);
          }
        }
        summary = collected.join(" ").trim() || void 0;
        break;
      }
    }
    processes.push({
      id: heading,
      heading,
      summary,
      line: bodyStartLine + entry.index
    });
  }
  return processes;
}
function mapActionRow(record, rowLine) {
  return {
    id: record.id?.trim() || void 0,
    label: record.label?.trim() || void 0,
    kind: record.kind?.trim() || void 0,
    target: record.target?.trim() || void 0,
    event: record.event?.trim() || void 0,
    invoke: record.invoke?.trim() || void 0,
    transition: record.transition?.trim() || void 0,
    rule: record.rule?.trim() || void 0,
    notes: record.notes?.trim() || void 0,
    rowLine
  };
}
function mapMessageRow(record, rowLine, isLegacyMessages) {
  if (isLegacyMessages) {
    return {
      id: void 0,
      text: record.ref?.trim() || void 0,
      severity: void 0,
      timing: record.timing?.trim() || void 0,
      notes: record.notes?.trim() || void 0,
      rowLine
    };
  }
  return {
    id: record.id?.trim() || void 0,
    text: record.text?.trim() || void 0,
    severity: record.severity?.trim() || void 0,
    timing: record.timing?.trim() || void 0,
    notes: record.notes?.trim() || void 0,
    rowLine
  };
}
function mapLegacyTransitionRow(record, rowLine) {
  return {
    id: record.id?.trim() || void 0,
    event: record.event?.trim() || void 0,
    to: record.to?.trim() || void 0,
    condition: record.condition?.trim() || void 0,
    notes: record.notes?.trim() || void 0,
    rowLine
  };
}
function sameHeaders4(actual, expected) {
  if (actual.length !== expected.length) {
    return false;
  }
  return actual.every((header, index) => header === expected[index]);
}
function getFileStem7(path) {
  return path.replace(/\\/g, "/").split("/").pop()?.replace(/\.md$/i, "") ?? "";
}
function joinSectionLines6(lines) {
  const value = (lines ?? []).join("\n").trim();
  return value || void 0;
}
function normalizeNotes4(lines) {
  const notes = (lines ?? []).map((line) => line.trim()).filter(Boolean).map((line) => line.replace(/^-\s+/, ""));
  return notes.length > 0 ? notes : void 0;
}
function isEmptyRow2(values) {
  return values.every((value) => !String(value ?? "").trim());
}
function createWarning11(path, field, message) {
  return {
    code: "invalid-structure",
    message,
    severity: "warning",
    path,
    field
  };
}

// src/parsers/codeset-parser.ts
var VALUE_HEADERS = ["code", "label", "sort_order", "active", "notes"];
function parseCodeSetFile(markdown, path) {
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
  if (frontmatter.type !== "codeset") {
    warnings.push(createWarning12(path, "type", 'expected type "codeset"'));
  }
  if (!id) {
    warnings.push(createWarning12(path, "id", 'required frontmatter "id" is missing'));
  }
  if (!name) {
    warnings.push(createWarning12(path, "name", 'required frontmatter "name" is missing'));
  }
  const valuesTable = parseMarkdownTable(sections.Values, VALUE_HEADERS, path, "Values");
  warnings.push(...valuesTable.warnings);
  const fallbackName = name || id || getFileStem8(path) || "Untitled CodeSet";
  return {
    file: {
      fileType: "codeset",
      schema: "codeset",
      path,
      title: fallbackName,
      frontmatter,
      sections,
      id,
      name: fallbackName,
      kind: kind || void 0,
      summary: joinSectionLines7(sections.Summary),
      values: valuesTable.rows.map((row) => ({
        code: row.code?.trim() ?? "",
        label: row.label?.trim() || void 0,
        sortOrder: row.sort_order?.trim() || void 0,
        active: row.active?.trim() || void 0,
        notes: row.notes?.trim() || void 0
      })).filter((row) => !isEmptyRow3(Object.values(row))),
      notes: normalizeNotes5(sections.Notes)
    },
    warnings
  };
}
function getFileStem8(path) {
  return path.replace(/\\/g, "/").split("/").pop()?.replace(/\.md$/i, "") ?? "";
}
function joinSectionLines7(lines) {
  const value = (lines ?? []).join("\n").trim();
  return value || void 0;
}
function normalizeNotes5(lines) {
  const notes = (lines ?? []).map((line) => line.trim()).filter(Boolean).map((line) => line.replace(/^-\s+/, ""));
  return notes.length > 0 ? notes : void 0;
}
function isEmptyRow3(values) {
  return values.every((value) => !value?.trim());
}
function createWarning12(path, field, message) {
  return {
    code: "invalid-structure",
    message,
    severity: "warning",
    path,
    field
  };
}

// src/parsers/message-parser.ts
var MESSAGE_HEADERS2 = [
  "message_id",
  "text",
  "severity",
  "timing",
  "audience",
  "active",
  "notes"
];
function parseMessageFile(markdown, path) {
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
  if (frontmatter.type !== "message") {
    warnings.push(createWarning13(path, "type", 'expected type "message"'));
  }
  if (!id) {
    warnings.push(createWarning13(path, "id", 'required frontmatter "id" is missing'));
  }
  if (!name) {
    warnings.push(createWarning13(path, "name", 'required frontmatter "name" is missing'));
  }
  const messagesTable = parseMarkdownTable(sections.Messages, MESSAGE_HEADERS2, path, "Messages");
  warnings.push(...messagesTable.warnings);
  const fallbackName = name || id || getFileStem9(path) || "Untitled Message Set";
  return {
    file: {
      fileType: "message",
      schema: "message",
      path,
      title: fallbackName,
      frontmatter,
      sections,
      id,
      name: fallbackName,
      kind: kind || void 0,
      summary: joinSectionLines8(sections.Summary),
      messages: messagesTable.rows.map((row) => ({
        messageId: row.message_id?.trim() ?? "",
        text: row.text?.trim() || void 0,
        severity: row.severity?.trim() || void 0,
        timing: row.timing?.trim() || void 0,
        audience: row.audience?.trim() || void 0,
        active: row.active?.trim() || void 0,
        notes: row.notes?.trim() || void 0
      })).filter((row) => !isEmptyRow4(Object.values(row))),
      notes: normalizeNotes6(sections.Notes)
    },
    warnings
  };
}
function getFileStem9(path) {
  return path.replace(/\\/g, "/").split("/").pop()?.replace(/\.md$/i, "") ?? "";
}
function joinSectionLines8(lines) {
  const value = (lines ?? []).join("\n").trim();
  return value || void 0;
}
function normalizeNotes6(lines) {
  const notes = (lines ?? []).map((line) => line.trim()).filter(Boolean).map((line) => line.replace(/^-\s+/, ""));
  return notes.length > 0 ? notes : void 0;
}
function isEmptyRow4(values) {
  return values.every((value) => !value?.trim());
}
function createWarning13(path, field, message) {
  return {
    code: "invalid-structure",
    message,
    severity: "warning",
    path,
    field
  };
}

// src/parsers/rule-parser.ts
var INPUT_HEADERS2 = ["id", "data", "source", "required", "notes"];
var REFERENCE_HEADERS = ["ref", "usage", "notes"];
var MESSAGE_HEADERS3 = ["condition", "message", "severity", "notes"];
function parseRuleFile(markdown, path) {
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
  if (frontmatter.type !== "rule") {
    warnings.push(createWarning14(path, "type", 'expected type "rule"'));
  }
  if (!id) {
    warnings.push(createWarning14(path, "id", 'required frontmatter "id" is missing'));
  }
  if (!name) {
    warnings.push(createWarning14(path, "name", 'required frontmatter "name" is missing'));
  }
  const inputsTable = parseMarkdownTable(sections.Inputs, INPUT_HEADERS2, path, "Inputs");
  const referencesTable = parseMarkdownTable(
    sections.References,
    REFERENCE_HEADERS,
    path,
    "References"
  );
  const messagesTable = parseMarkdownTable(sections.Messages, MESSAGE_HEADERS3, path, "Messages");
  warnings.push(...inputsTable.warnings, ...referencesTable.warnings, ...messagesTable.warnings);
  const fallbackName = name || id || getFileStem10(path) || "Untitled Rule";
  return {
    file: {
      fileType: "rule",
      schema: "rule",
      path,
      title: fallbackName,
      frontmatter,
      sections,
      id,
      name: fallbackName,
      kind: kind || void 0,
      summary: joinSectionLines9(sections.Summary),
      inputs: inputsTable.rows.map((row) => ({
        id: row.id?.trim() ?? "",
        data: row.data?.trim() || void 0,
        source: row.source?.trim() || void 0,
        required: row.required?.trim() || void 0,
        notes: row.notes?.trim() || void 0
      })).filter((row) => !isEmptyRow5(Object.values(row))),
      references: referencesTable.rows.map((row) => ({
        ref: row.ref?.trim() || void 0,
        usage: row.usage?.trim() || void 0,
        notes: row.notes?.trim() || void 0
      })).filter((row) => !isEmptyRow5(Object.values(row))),
      messages: messagesTable.rows.map((row) => ({
        condition: row.condition?.trim() || void 0,
        message: row.message?.trim() || void 0,
        severity: row.severity?.trim() || void 0,
        notes: row.notes?.trim() || void 0
      })).filter((row) => !isEmptyRow5(Object.values(row))),
      notes: normalizeNotes7(sections.Notes)
    },
    warnings
  };
}
function getFileStem10(path) {
  return path.replace(/\\/g, "/").split("/").pop()?.replace(/\.md$/i, "") ?? "";
}
function joinSectionLines9(lines) {
  const value = (lines ?? []).join("\n").trim();
  return value || void 0;
}
function normalizeNotes7(lines) {
  const notes = (lines ?? []).map((line) => line.trim()).filter(Boolean).map((line) => line.replace(/^-\s+/, ""));
  return notes.length > 0 ? notes : void 0;
}
function isEmptyRow5(values) {
  return values.every((value) => !value?.trim());
}
function createWarning14(path, field, message) {
  return {
    code: "invalid-structure",
    message,
    severity: "warning",
    path,
    field
  };
}

// src/parsers/mapping-parser.ts
var SCOPE_HEADERS = ["role", "ref", "notes"];
var MAPPING_HEADERS = ["source_ref", "target_ref", "transform", "rule", "required", "notes"];
function parseMappingFile(markdown, path) {
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
  const source = typeof frontmatter.source === "string" ? frontmatter.source.trim() : "";
  const target = typeof frontmatter.target === "string" ? frontmatter.target.trim() : "";
  if (frontmatter.type !== "mapping") {
    warnings.push(createWarning15(path, "type", 'expected type "mapping"'));
  }
  if (!id) {
    warnings.push(createWarning15(path, "id", 'required frontmatter "id" is missing'));
  }
  if (!name) {
    warnings.push(createWarning15(path, "name", 'required frontmatter "name" is missing'));
  }
  const scopeTable = parseMarkdownTable(sections.Scope, SCOPE_HEADERS, path, "Scope");
  const mappingsTable = parseMarkdownTable(sections.Mappings, MAPPING_HEADERS, path, "Mappings");
  warnings.push(...scopeTable.warnings, ...mappingsTable.warnings);
  const fallbackName = name || id || getFileStem11(path) || "Untitled Mapping";
  return {
    file: {
      fileType: "mapping",
      schema: "mapping",
      path,
      title: fallbackName,
      frontmatter,
      sections,
      id,
      name: fallbackName,
      kind: kind || void 0,
      source: source || void 0,
      target: target || void 0,
      summary: joinSectionLines10(sections.Summary),
      scope: scopeTable.rows.map((row) => ({
        role: row.role?.trim() || void 0,
        ref: row.ref?.trim() || void 0,
        notes: row.notes?.trim() || void 0
      })).filter((row) => !isEmptyRow6(Object.values(row))),
      mappings: mappingsTable.rows.map((row) => ({
        sourceRef: row.source_ref?.trim() || void 0,
        targetRef: row.target_ref?.trim() || void 0,
        transform: row.transform?.trim() || void 0,
        rule: row.rule?.trim() || void 0,
        required: row.required?.trim() || void 0,
        notes: row.notes?.trim() || void 0
      })).filter((row) => !isEmptyRow6(Object.values(row))),
      notes: normalizeNotes8(sections.Notes)
    },
    warnings
  };
}
function getFileStem11(path) {
  return path.replace(/\\/g, "/").split("/").pop()?.replace(/\.md$/i, "") ?? "";
}
function joinSectionLines10(lines) {
  const value = (lines ?? []).join("\n").trim();
  return value || void 0;
}
function normalizeNotes8(lines) {
  const notes = (lines ?? []).map((line) => line.trim()).filter(Boolean).map((line) => line.replace(/^-\s+/, ""));
  return notes.length > 0 ? notes : void 0;
}
function isEmptyRow6(values) {
  return values.every((value) => !value?.trim());
}
function createWarning15(path, field, message) {
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
  if (diagram.kind === "dfd") {
    const dfdDiagram = diagram;
    const objectEntries = dfdDiagram.objectEntries.length > 0 ? dfdDiagram.objectEntries : dfdDiagram.objectRefs.map((objectRef, rowIndex) => ({
      ref: objectRef,
      rowIndex,
      compatibilityMode: "legacy_ref_only"
    }));
    const objectIdentityKeys = /* @__PURE__ */ new Set();
    const objectIds = /* @__PURE__ */ new Set();
    for (const entry of objectEntries) {
      if (entry.id?.trim()) {
        objectIds.add(entry.id.trim());
      }
      const ref = entry.ref?.trim();
      if (!ref) {
        continue;
      }
      const identity = resolveReferenceIdentity(ref, index);
      if (!resolveDfdObjectReference(ref, index) || identity.resolvedModelType !== "dfd-object") {
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
      } else {
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
          (key) => objectIdentityKeys.has(key)
        )) {
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
        (key) => objectIdentityKeys.has(key)
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
  } else {
    for (const objectRef of diagram.objectRefs) {
      if (!resolveObjectModelReference(objectRef, index) && !resolveErEntityReference(objectRef, index)) {
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
function validateErRelationIds(index, warnings) {
  const relationIdRegistry = /* @__PURE__ */ new Map();
  for (const entity of Object.values(index.erEntitiesById)) {
    for (const relation of entity.relationBlocks) {
      const relationId = relation.id?.trim() ?? "";
      if (!relationId) {
        continue;
      }
      if (isIncompleteErRelationId3(relationId)) {
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
function isIncompleteErRelationId3(id) {
  const normalized = id.trim().toUpperCase();
  return !normalized || normalized === "REL" || normalized === "REL-" || normalized === "REL--" || normalized === "REL-NEW" || normalized === "REL-TODO";
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
    appProcessesById: {},
    screensById: {},
    codesetsById: {},
    messagesById: {},
    rulesById: {},
    mappingsById: {},
    dataObjectsById: {},
    dfdObjectsById: {},
    erEntitiesById: {},
    erEntitiesByPhysicalName: {},
    relationsFilesById: {},
    diagramsById: {},
    modelsByFilePath: {},
    relationsById: {},
    relationsByObjectId: {},
    membersByOwnerId: {},
    membersByOwnerPath: {},
    warningsByFilePath: {}
  };
  for (const file of files) {
    index.sourceFilesByPath[file.path] = file;
    indexSingleFile(index, file);
  }
  rebuildReferenceLookups(index);
  rebuildMemberLookups(index);
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
    case "app-process": {
      addModelById(
        index.appProcessesById,
        parseResult.file.id,
        parseResult.file,
        index.warningsByFilePath,
        file.path
      );
      break;
    }
    case "screen": {
      addModelById(
        index.screensById,
        parseResult.file.id,
        parseResult.file,
        index.warningsByFilePath,
        file.path
      );
      break;
    }
    case "codeset": {
      addModelById(
        index.codesetsById,
        parseResult.file.id,
        parseResult.file,
        index.warningsByFilePath,
        file.path
      );
      break;
    }
    case "message": {
      addModelById(
        index.messagesById,
        parseResult.file.id,
        parseResult.file,
        index.warningsByFilePath,
        file.path
      );
      break;
    }
    case "rule": {
      addModelById(
        index.rulesById,
        parseResult.file.id,
        parseResult.file,
        index.warningsByFilePath,
        file.path
      );
      break;
    }
    case "mapping": {
      addModelById(
        index.mappingsById,
        parseResult.file.id,
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
function rebuildMemberLookups(index) {
  index.membersByOwnerId = {};
  index.membersByOwnerPath = {};
  for (const model of Object.values(index.modelsByFilePath)) {
    switch (model.fileType) {
      case "data-object":
        indexDataObjectMembers(index, model);
        break;
      case "app-process":
        indexAppProcessMembers(index, model);
        break;
      case "screen":
        indexScreenMembers(index, model);
        break;
      case "codeset":
        indexCodeSetMembers(index, model);
        break;
      case "message":
        indexMessageMembers(index, model);
        break;
      case "rule":
        indexRuleMembers(index, model);
        break;
      case "er-entity":
        indexErEntityMembers(index, model);
        break;
      case "object":
        indexClassMembers(index, model);
        break;
      default:
        break;
    }
  }
}
function parseVaultFile(file) {
  const frontmatterResult = parseFrontmatter(file.content);
  const frontmatter = frontmatterResult.file.frontmatter;
  if (frontmatter?.type === "data_object") {
    return parseDataObjectFile(file.content, file.path);
  }
  if (frontmatter?.type === "app_process") {
    return parseAppProcessFile(file.content, file.path);
  }
  if (frontmatter?.type === "screen") {
    return parseScreenFile(file.content, file.path);
  }
  if (frontmatter?.type === "codeset") {
    return parseCodeSetFile(file.content, file.path);
  }
  if (frontmatter?.type === "message") {
    return parseMessageFile(file.content, file.path);
  }
  if (frontmatter?.type === "rule") {
    return parseRuleFile(file.content, file.path);
  }
  if (frontmatter?.type === "mapping") {
    return parseMappingFile(file.content, file.path);
  }
  const fileType = detectFileType(frontmatter);
  switch (fileType) {
    case "object":
      return parseObjectFile(file.content, file.path);
    case "dfd-object":
      return parseDfdObjectFile(file.content, file.path);
    case "app-process":
      return parseAppProcessFile(file.content, file.path);
    case "screen":
      return parseScreenFile(file.content, file.path);
    case "codeset":
      return parseCodeSetFile(file.content, file.path);
    case "message":
      return parseMessageFile(file.content, file.path);
    case "rule":
      return parseRuleFile(file.content, file.path);
    case "mapping":
      return parseMappingFile(file.content, file.path);
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
function indexDataObjectMembers(index, model) {
  const ownerId = getModelId(model);
  for (const field of model.fields) {
    const memberId = field.name?.trim();
    if (!memberId) {
      continue;
    }
    const displayName = field.recordType?.trim() ? `${field.label?.trim() || memberId} (${field.recordType.trim()})` : field.label?.trim() || memberId;
    addMemberCandidate(index, {
      ownerModelType: "data_object",
      ownerId,
      ownerPath: model.path,
      memberKind: "field",
      memberId,
      displayName,
      sourceSection: "Fields"
    });
  }
}
function indexAppProcessMembers(index, model) {
  const ownerId = getModelId(model);
  for (const input of model.inputs) {
    const memberId = input.id?.trim();
    if (!memberId) {
      continue;
    }
    addMemberCandidate(index, {
      ownerModelType: "app_process",
      ownerId,
      ownerPath: model.path,
      memberKind: "input",
      memberId,
      displayName: memberId,
      sourceSection: "Inputs"
    });
  }
  for (const output of model.outputs) {
    const memberId = output.id?.trim();
    if (!memberId) {
      continue;
    }
    addMemberCandidate(index, {
      ownerModelType: "app_process",
      ownerId,
      ownerPath: model.path,
      memberKind: "output",
      memberId,
      displayName: memberId,
      sourceSection: "Outputs"
    });
  }
}
function indexScreenMembers(index, model) {
  const ownerId = getModelId(model);
  for (const field of model.fields) {
    const memberId = field.id?.trim();
    if (!memberId) {
      continue;
    }
    addMemberCandidate(index, {
      ownerModelType: "screen",
      ownerId,
      ownerPath: model.path,
      memberKind: "field",
      memberId,
      displayName: field.label?.trim() || memberId,
      sourceSection: "Fields"
    });
  }
  for (const action of model.actions) {
    const memberId = action.id?.trim();
    if (!memberId) {
      continue;
    }
    addMemberCandidate(index, {
      ownerModelType: "screen",
      ownerId,
      ownerPath: model.path,
      memberKind: "action",
      memberId,
      displayName: action.label?.trim() || memberId,
      sourceSection: "Actions"
    });
  }
}
function indexCodeSetMembers(index, model) {
  const ownerId = getModelId(model);
  for (const value of model.values) {
    const memberId = value.code?.trim();
    if (!memberId) {
      continue;
    }
    addMemberCandidate(index, {
      ownerModelType: "codeset",
      ownerId,
      ownerPath: model.path,
      memberKind: "code",
      memberId,
      displayName: value.label?.trim() || memberId,
      sourceSection: "Values"
    });
  }
}
function indexMessageMembers(index, model) {
  const ownerId = getModelId(model);
  for (const message of model.messages) {
    const memberId = message.messageId?.trim();
    if (!memberId) {
      continue;
    }
    addMemberCandidate(index, {
      ownerModelType: "message",
      ownerId,
      ownerPath: model.path,
      memberKind: "message",
      memberId,
      displayName: message.text?.trim() || memberId,
      sourceSection: "Messages"
    });
  }
}
function indexRuleMembers(index, model) {
  const ownerId = getModelId(model);
  for (const input of model.inputs) {
    const memberId = input.id?.trim();
    if (!memberId) {
      continue;
    }
    addMemberCandidate(index, {
      ownerModelType: "rule",
      ownerId,
      ownerPath: model.path,
      memberKind: "input",
      memberId,
      displayName: memberId,
      sourceSection: "Inputs"
    });
  }
}
function indexErEntityMembers(index, model) {
  const ownerId = getModelId(model);
  for (const column of model.columns) {
    const memberId = column.physicalName?.trim();
    if (!memberId) {
      continue;
    }
    addMemberCandidate(index, {
      ownerModelType: "er_entity",
      ownerId,
      ownerPath: model.path,
      memberKind: "column",
      memberId,
      displayName: column.logicalName?.trim() || memberId,
      sourceSection: "Columns"
    });
  }
}
function indexClassMembers(index, model) {
  const ownerId = getModelId(model);
  for (const attribute of model.attributes) {
    const memberId = attribute.name?.trim();
    if (!memberId) {
      continue;
    }
    addMemberCandidate(index, {
      ownerModelType: "class",
      ownerId,
      ownerPath: model.path,
      memberKind: "attribute",
      memberId,
      displayName: memberId,
      sourceSection: "Attributes"
    });
  }
  for (const method of model.methods) {
    const memberId = method.name?.trim();
    if (!memberId) {
      continue;
    }
    addMemberCandidate(index, {
      ownerModelType: "class",
      ownerId,
      ownerPath: model.path,
      memberKind: "method",
      memberId,
      displayName: memberId,
      sourceSection: "Methods"
    });
  }
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
function addMemberCandidate(index, candidate) {
  if (!candidate.ownerId.trim() || !candidate.ownerPath.trim() || !candidate.memberId.trim()) {
    return;
  }
  pushMemberCandidate(index.membersByOwnerId, candidate.ownerId, candidate);
  pushMemberCandidate(index.membersByOwnerPath, candidate.ownerPath, candidate);
}
function pushMemberCandidate(target, key, candidate) {
  if (!target[key]) {
    target[key] = [];
  }
  const exists = target[key].some(
    (entry) => entry.ownerPath === candidate.ownerPath && entry.memberKind === candidate.memberKind && entry.memberId === candidate.memberId && entry.sourceSection === candidate.sourceSection && entry.displayName === candidate.displayName
  );
  if (!exists) {
    target[key].push(candidate);
  }
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

// src/renderers/dfd-mermaid.ts
function renderDfdMermaidDiagram(diagram, options) {
  const shell = createMermaidShell({
    className: "mdspec-diagram mdspec-diagram--dfd",
    title: options?.hideTitle ? void 0 : `${diagram.diagram.name} (dfd)`,
    forExport: options?.forExport
  });
  if (!options?.hideDetails) {
    shell.root.appendChild(createFlowDetails(diagram.edges));
  }
  const ready = renderMermaidSourceIntoShell(shell, {
    source: buildDfdMermaidSource(diagram),
    renderIdPrefix: "model_weave_dfd",
    viewportState: options?.viewportState,
    onViewportStateChange: options?.onViewportStateChange
  }).catch((error) => {
    shell.root.replaceChildren(
      createMermaidFallbackNotice(
        "DFD Mermaid rendering failed. Check diagnostics and Mermaid compatibility for this diagram."
      )
    );
  });
  setMermaidRenderReadyPromise(shell.root, ready);
  return shell.root;
}
function buildDfdMermaidSource(diagram) {
  const lines = [
    "flowchart LR",
    "  classDef dfdExternal fill:#fff8e1,stroke:#7c5c00,color:#2f2400,stroke-width:1.5px",
    "  classDef dfdProcess fill:#e9f2ff,stroke:#2f5b9a,color:#12243d,stroke-width:1.5px",
    "  classDef dfdDatastore fill:#eef7ee,stroke:#3b6b47,color:#17311e,stroke-width:1.5px",
    "  classDef dfdOther fill:#f5f7fb,stroke:#5f6b7a,color:#1f2937,stroke-width:1.5px"
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
function toMermaidNodeId(value) {
  const normalized = value.replace(/[^A-Za-z0-9_]/g, "_");
  if (/^[A-Za-z_]/.test(normalized)) {
    return normalized;
  }
  return `N_${normalized}`;
}
function toMermaidNodeDeclaration(node, object) {
  const label = escapeMermaidLabel(node.label ?? object?.name ?? node.ref ?? node.id);
  const kind = object?.kind ?? node.kind;
  switch (kind) {
    case "datastore":
      return `[("${label}")]:::dfdDatastore`;
    case "process":
      return `["${label}"]:::dfdProcess`;
    case "other":
      return `["${label}"]:::dfdOther`;
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
var SVG_NS = "http://www.w3.org/2000/svg";
var NODE_WIDTH = 300;
var HEADER_HEIGHT = 38;
var SECTION_TITLE_HEIGHT = 24;
var ROW_HEIGHT = 20;
var NODE_PADDING = 12;
var COLUMN_GAP = 96;
var ROW_GAP = 92;
var CANVAS_PADDING = 48;
var DEFAULT_ATTRIBUTE_LIMIT = 5;
var DEFAULT_METHOD_LIMIT = 5;
var MIN_ZOOM2 = 0.45;
var MAX_ZOOM2 = 2.4;
var INITIAL_ZOOM2 = 1;
var DIAGRAM_LABEL_BG = "#ffffff";
var DIAGRAM_LABEL_BORDER = "#e5e7eb";
var DIAGRAM_LABEL_TEXT = "#111827";
var DIAGRAM_EDGE = "#374151";
function renderClassDiagram(diagram, options) {
  const root = document.createElement("section");
  root.addClass("model-weave-diagram-shell");
  if (!options?.hideTitle) {
    const title = document.createElement("h2");
    title.textContent = `${diagram.diagram.name} (class)`;
    title.addClass("model-weave-diagram-title");
    root.appendChild(title);
  }
  const layout = createLayout(
    diagram.nodes,
    diagram.edges
  );
  const sceneBounds = createSceneBounds(diagram.edges, layout.byId);
  const canvas = document.createElement("div");
  canvas.addClass("model-weave-diagram-canvas");
  if (!options?.forExport) {
    canvas.addClass("model-weave-diagram-canvas-interactive");
  }
  const toolbar = options?.forExport ? null : createZoomToolbar("Wheel: zoom / Drag background: pan");
  if (toolbar) {
    root.appendChild(toolbar.root);
  }
  const viewport = document.createElement("div");
  viewport.addClass("model-weave-diagram-viewport");
  const surface = document.createElement("div");
  surface.addClass("model-weave-diagram-surface");
  surface.dataset.modelWeaveExportSurface = "true";
  surface.dataset.modelWeaveSceneWidth = `${sceneBounds.width}`;
  surface.dataset.modelWeaveSceneHeight = `${sceneBounds.height}`;
  surface.setCssStyles({
    width: `${sceneBounds.width}px`,
    height: `${sceneBounds.height}px`
  });
  const svg = createSvgSurface(sceneBounds.width, sceneBounds.height);
  svg.appendChild(createMarkerDefinitions());
  for (const edge of diagram.edges) {
    const edgeGroup = renderEdge(edge, layout.byId);
    if (edgeGroup) {
      svg.appendChild(edgeGroup);
    }
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
      minZoom: MIN_ZOOM2,
      maxZoom: MAX_ZOOM2,
      initialZoom: INITIAL_ZOOM2,
      nodeSelector: ".model-weave-node",
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
    getWidth: () => NODE_WIDTH,
    getHeight: (node) => measureNodeHeight(node.object),
    canvasPadding: CANVAS_PADDING,
    columnGap: COLUMN_GAP,
    rowGap: ROW_GAP,
    maxColumns: 4
  });
}
function createSceneBounds(edges, layoutById) {
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
  return computeSceneBounds(nodeBounds, labelBounds, CANVAS_PADDING);
}
function measureNodeHeight(object) {
  if (!object || object.fileType !== "object") {
    return HEADER_HEIGHT + NODE_PADDING * 2 + ROW_HEIGHT;
  }
  const attributeRows = Math.max(getVisibleAttributes(object).length, 1);
  const methodRows = Math.max(getVisibleMethods(object).length, 1);
  return HEADER_HEIGHT + SECTION_TITLE_HEIGHT + attributeRows * ROW_HEIGHT + SECTION_TITLE_HEIGHT + methodRows * ROW_HEIGHT + NODE_PADDING * 2;
}
function createSvgSurface(width, height) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("class", "model-weave-diagram-svg");
  return svg;
}
function createMarkerDefinitions() {
  const defs = document.createElementNS(SVG_NS, "defs");
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
  const marker = document.createElementNS(SVG_NS, "marker");
  marker.setAttribute("id", id);
  marker.setAttribute("markerWidth", "12");
  marker.setAttribute("markerHeight", "12");
  marker.setAttribute("refX", "10");
  marker.setAttribute("refY", "6");
  marker.setAttribute("orient", "auto");
  marker.setAttribute("markerUnits", "strokeWidth");
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", "M 0 0 L 10 6 L 0 12 z");
  path.setAttribute("fill", fill);
  path.setAttribute("stroke", stroke);
  path.setAttribute("stroke-width", "1.2");
  marker.appendChild(path);
  return marker;
}
function createDiamondMarker(id, fill, stroke) {
  const marker = document.createElementNS(SVG_NS, "marker");
  marker.setAttribute("id", id);
  marker.setAttribute("markerWidth", "14");
  marker.setAttribute("markerHeight", "14");
  marker.setAttribute("refX", "12");
  marker.setAttribute("refY", "7");
  marker.setAttribute("orient", "auto");
  marker.setAttribute("markerUnits", "strokeWidth");
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", "M 0 7 L 4 0 L 12 7 L 4 14 z");
  path.setAttribute("fill", fill);
  path.setAttribute("stroke", stroke);
  path.setAttribute("stroke-width", "1.2");
  marker.appendChild(path);
  return marker;
}
function renderEdge(edge, layoutById) {
  const source = layoutById[edge.source];
  const target = layoutById[edge.target];
  if (!source || !target) {
    return null;
  }
  const group = document.createElementNS(SVG_NS, "g");
  const { startX, startY, endX, endY, midX, midY } = getConnectionPoints(
    source,
    target
  );
  const line = document.createElementNS(SVG_NS, "line");
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
    group.appendChild(createEdgeBadge(midX, midY - 8, edgeLabel));
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
function createEdgeBadge(x, y, value) {
  const group = document.createElementNS(SVG_NS, "g");
  const width = Math.max(52, value.length * 8 + 12);
  const height = 20;
  const rect = document.createElementNS(SVG_NS, "rect");
  rect.setAttribute("x", String(x - width / 2));
  rect.setAttribute("y", String(y - height / 2));
  rect.setAttribute("width", String(width));
  rect.setAttribute("height", String(height));
  rect.setAttribute("rx", "10");
  rect.setAttribute("fill", DIAGRAM_LABEL_BG);
  rect.setAttribute("stroke", DIAGRAM_LABEL_BORDER);
  group.appendChild(rect);
  const text = document.createElementNS(SVG_NS, "text");
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
function createNodeBox(layout, options) {
  const box = document.createElement("article");
  box.addClass("model-weave-node");
  box.addClass(
    layout.node.object?.fileType === "object" && layout.node.object.kind === "interface" ? "model-weave-node-interface" : "model-weave-node-class"
  );
  box.setCssStyles({
    left: `${layout.x}px`,
    top: `${layout.y}px`,
    width: `${layout.width}px`,
    minHeight: `${layout.height}px`
  });
  if (!layout.node.object) {
    box.appendChild(createFallbackNode(layout.node.label ?? layout.node.ref ?? layout.node.id));
    return box;
  }
  if (options?.onOpenObject) {
    box.addClass("model-weave-node-clickable");
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
  header.addClass("model-weave-node-header");
  header.addClass(getHeaderModifierClass(object.kind));
  const kind = document.createElement("div");
  kind.addClass("model-weave-node-kind");
  kind.textContent = object.kind;
  const title = document.createElement("div");
  title.addClass("model-weave-node-title");
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
  section.addClass("model-weave-node-section");
  const heading = document.createElement("div");
  heading.addClass("model-weave-node-section-heading");
  heading.textContent = title;
  section.appendChild(heading);
  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.addClass("model-weave-node-empty");
    empty.textContent = "None";
    section.appendChild(empty);
    return section;
  }
  const list = document.createElement("ul");
  list.addClass("model-weave-node-list");
  for (const item of items) {
    const entry = document.createElement("li");
    entry.textContent = item;
    list.appendChild(entry);
  }
  section.appendChild(list);
  return section;
}
function getHeaderModifierClass(kind) {
  switch (kind) {
    case "interface":
      return "model-weave-node-header-interface";
    case "enum":
      return "model-weave-node-header-enum";
    case "component":
      return "model-weave-node-header-component";
    case "entity":
      return "model-weave-node-header-entity";
    case "class":
    default:
      return "model-weave-node-header-class";
  }
}
function createConnectionsTable(diagram) {
  const section = document.createElement("details");
  section.addClass("model-weave-diagram-details");
  section.open = false;
  const summary = document.createElement("summary");
  summary.textContent = `Displayed relations (${diagram.edges.length})`;
  summary.addClass("model-weave-diagram-details-summary");
  section.appendChild(summary);
  if (diagram.edges.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No relations are currently used for rendering.";
    empty.addClass("model-weave-diagram-details-empty");
    section.appendChild(empty);
    return section;
  }
  const list = document.createElement("ul");
  list.addClass("model-weave-diagram-details-list");
  const sortedEdges = [...diagram.edges].sort(compareClassEdges);
  for (const edge of sortedEdges) {
    const internalEdge = classDiagramEdgeToInternalEdge(edge);
    const details = buildEdgeDetails(internalEdge);
    const item = document.createElement("li");
    item.addClass("model-weave-diagram-details-item");
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
  box.addClass("model-weave-node-empty");
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

// src/renderers/er-shared.ts
var SVG_NS2 = "http://www.w3.org/2000/svg";
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
  const group = document.createElementNS(SVG_NS2, "g");
  const width = Math.max(34, value.length * 8 + 12);
  const height = 20;
  const rect = document.createElementNS(SVG_NS2, "rect");
  rect.setAttribute("x", String(x - width / 2));
  rect.setAttribute("y", String(y - height / 2));
  rect.setAttribute("width", String(width));
  rect.setAttribute("height", String(height));
  rect.setAttribute("rx", "10");
  rect.setAttribute("fill", ER_LABEL_BG);
  rect.setAttribute("stroke", ER_LABEL_BORDER);
  group.appendChild(rect);
  const text = document.createElementNS(SVG_NS2, "text");
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
var SVG_NS3 = "http://www.w3.org/2000/svg";
var NODE_WIDTH2 = 280;
var HEADER_HEIGHT2 = 40;
var SECTION_TITLE_HEIGHT2 = 24;
var ROW_HEIGHT2 = 20;
var NODE_PADDING2 = 12;
var COLUMN_GAP2 = 96;
var ROW_GAP2 = 92;
var CANVAS_PADDING2 = 48;
var MIN_ZOOM3 = 0.45;
var MAX_ZOOM3 = 2.4;
var INITIAL_ZOOM3 = 1;
var DIAGRAM_EDGE2 = "#374151";
var ER_EDGE_STROKE_WIDTH = 2;
var ER_NODE_BORDER_WIDTH = 1;
var ER_ARROW_MARKER_WIDTH = 14;
var ER_ARROW_MARKER_HEIGHT = 14;
var ER_ARROW_TIP_X = 12;
var ER_ARROW_TIP_Y = 7;
var ER_ARROW_EXTRA_PADDING = 6;
var ER_DIAMOND_MARKER_WIDTH = 14;
var ER_DIAMOND_MARKER_HEIGHT = 14;
var ER_DIAMOND_TIP_X = 12;
var ER_DIAMOND_TIP_Y = 7;
var ER_DIAMOND_EXTRA_PADDING = 4;
var ER_MIN_EDGE_VISIBLE_LENGTH = 14;
function renderErDiagram(diagram, options) {
  const root = document.createElement("section");
  root.addClass("model-weave-diagram-shell");
  if (!options?.hideTitle) {
    const title = document.createElement("h2");
    title.textContent = `${diagram.diagram.name} (ER)`;
    title.addClass("model-weave-diagram-title");
    root.appendChild(title);
  }
  const layout = createLayout2(
    diagram.nodes,
    diagram.edges
  );
  const sceneBounds = createSceneBounds2(diagram.edges, layout.byId);
  const canvas = document.createElement("div");
  canvas.addClass("model-weave-diagram-canvas");
  if (!options?.forExport) {
    canvas.addClass("model-weave-diagram-canvas-interactive");
  }
  const toolbar = options?.forExport ? null : createZoomToolbar("Wheel: zoom / Drag background: pan");
  if (toolbar) {
    root.appendChild(toolbar.root);
  }
  const viewport = document.createElement("div");
  viewport.addClass("model-weave-diagram-viewport");
  const surface = document.createElement("div");
  surface.addClass("model-weave-diagram-surface");
  surface.dataset.modelWeaveExportSurface = "true";
  surface.dataset.modelWeaveSceneWidth = `${sceneBounds.width}`;
  surface.dataset.modelWeaveSceneHeight = `${sceneBounds.height}`;
  surface.setCssStyles({
    width: `${sceneBounds.width}px`,
    height: `${sceneBounds.height}px`
  });
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
      nodeSelector: ".model-weave-node",
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
    getWidth: () => NODE_WIDTH2,
    getHeight: (node) => measureNodeHeight2(node.object),
    canvasPadding: CANVAS_PADDING2,
    columnGap: COLUMN_GAP2,
    rowGap: ROW_GAP2,
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
    (edge) => erDiagramEdgeToInternalEdge(edge).cardinality ?? null
  );
  return computeSceneBounds(nodeBounds, labelBounds, CANVAS_PADDING2);
}
function measureNodeHeight2(object) {
  if (!object) {
    return HEADER_HEIGHT2 + NODE_PADDING2 * 2 + ROW_HEIGHT2;
  }
  const attributeRows = object.fileType === "er-entity" ? Math.max(getVisibleErColumns(object.columns).length, 1) : Math.max(object.attributes.length, 1);
  return HEADER_HEIGHT2 + SECTION_TITLE_HEIGHT2 + attributeRows * ROW_HEIGHT2 + NODE_PADDING2 * 2 + 16;
}
function createSvgSurface2(width, height) {
  const svg = document.createElementNS(SVG_NS3, "svg");
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("class", "model-weave-diagram-svg");
  return svg;
}
function createMarkerDefinitions2() {
  const defs = document.createElementNS(SVG_NS3, "defs");
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
  const marker = document.createElementNS(SVG_NS3, "marker");
  marker.setAttribute("id", id);
  marker.setAttribute("markerWidth", String(ER_ARROW_MARKER_WIDTH));
  marker.setAttribute("markerHeight", String(ER_ARROW_MARKER_HEIGHT));
  marker.setAttribute("refX", String(ER_ARROW_TIP_X));
  marker.setAttribute("refY", String(ER_ARROW_TIP_Y));
  marker.setAttribute("orient", "auto");
  marker.setAttribute("markerUnits", "userSpaceOnUse");
  const path = document.createElementNS(SVG_NS3, "path");
  path.setAttribute(
    "d",
    `M 0 0 L ${ER_ARROW_TIP_X} ${ER_ARROW_TIP_Y} L 0 ${ER_ARROW_MARKER_HEIGHT} z`
  );
  path.setAttribute("fill", fill);
  path.setAttribute("stroke", stroke);
  path.setAttribute("stroke-width", "1.2");
  marker.appendChild(path);
  return marker;
}
function createDiamondMarker2(id, fill, stroke) {
  const marker = document.createElementNS(SVG_NS3, "marker");
  marker.setAttribute("id", id);
  marker.setAttribute("markerWidth", String(ER_DIAMOND_MARKER_WIDTH));
  marker.setAttribute("markerHeight", String(ER_DIAMOND_MARKER_HEIGHT));
  marker.setAttribute("refX", String(ER_DIAMOND_TIP_X));
  marker.setAttribute("refY", String(ER_DIAMOND_TIP_Y));
  marker.setAttribute("orient", "auto");
  marker.setAttribute("markerUnits", "strokeWidth");
  const path = document.createElementNS(SVG_NS3, "path");
  path.setAttribute(
    "d",
    `M 0 ${ER_DIAMOND_TIP_Y} L 4 0 L ${ER_DIAMOND_TIP_X} ${ER_DIAMOND_TIP_Y} L 4 ${ER_DIAMOND_MARKER_HEIGHT} z`
  );
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
  const group = document.createElementNS(SVG_NS3, "g");
  const basePoints = getConnectionPoints(source, target);
  const markers = getMarkerAttributes2(edge.kind);
  const { startX, startY, endX, endY, midX, midY } = insetConnectionPoints(
    basePoints,
    markers
  );
  const line = document.createElementNS(SVG_NS3, "line");
  line.setAttribute("x1", String(startX));
  line.setAttribute("y1", String(startY));
  line.setAttribute("x2", String(endX));
  line.setAttribute("y2", String(endY));
  line.setAttribute("stroke", DIAGRAM_EDGE2);
  line.setAttribute("stroke-width", String(ER_EDGE_STROKE_WIDTH));
  line.setAttribute("stroke-dasharray", getDashPattern2(edge.kind));
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
function insetConnectionPoints(points, markers) {
  const dx = points.endX - points.startX;
  const dy = points.endY - points.startY;
  const length = Math.hypot(dx, dy);
  if (length <= 1e-3) {
    return points;
  }
  const ux = dx / length;
  const uy = dy / length;
  const desiredStartInset = getMarkerClearance(markers.start);
  const desiredEndInset = getMarkerClearance(markers.end);
  const maxInsetPerSide = Math.max(0, (length - ER_MIN_EDGE_VISIBLE_LENGTH) / 2);
  const startInset = Math.min(desiredStartInset, maxInsetPerSide);
  const endInset = Math.min(desiredEndInset, maxInsetPerSide);
  const usableLength = length - startInset - endInset;
  if (usableLength <= 8) {
    return points;
  }
  const startX = points.startX + ux * startInset;
  const startY = points.startY + uy * startInset;
  const endX = points.endX - ux * endInset;
  const endY = points.endY - uy * endInset;
  return {
    startX,
    startY,
    endX,
    endY,
    midX: (startX + endX) / 2,
    midY: (startY + endY) / 2
  };
}
function getMarkerClearance(markerRef) {
  if (!markerRef) {
    return 0;
  }
  if (markerRef.includes("mdspec-er-arrow")) {
    return ER_ARROW_TIP_X + ER_EDGE_STROKE_WIDTH + ER_NODE_BORDER_WIDTH + ER_ARROW_EXTRA_PADDING;
  }
  if (markerRef.includes("mdspec-er-diamond-open") || markerRef.includes("mdspec-er-diamond-solid")) {
    return ER_DIAMOND_TIP_X + ER_EDGE_STROKE_WIDTH + ER_NODE_BORDER_WIDTH + ER_DIAMOND_EXTRA_PADDING;
  }
  return ER_EDGE_STROKE_WIDTH + ER_NODE_BORDER_WIDTH + ER_ARROW_EXTRA_PADDING;
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
  box.addClass("model-weave-node");
  box.addClass("model-weave-node-er");
  box.setCssStyles({
    left: `${layout.x}px`,
    top: `${layout.y}px`,
    width: `${layout.width}px`,
    minHeight: `${layout.height}px`
  });
  if (!layout.node.object) {
    box.appendChild(createFallbackNode2(layout.node.label ?? layout.node.ref ?? layout.node.id));
    return box;
  }
  if (options?.onOpenObject) {
    box.addClass("model-weave-node-clickable");
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
  header.addClass("model-weave-node-header");
  header.addClass("model-weave-node-header-er");
  const kind = document.createElement("div");
  kind.addClass("model-weave-node-kind");
  kind.textContent = object.fileType === "er-entity" ? "er_entity" : "entity";
  const title = document.createElement("div");
  title.addClass("model-weave-node-title");
  title.addClass("model-weave-node-er-logical");
  title.textContent = layout.node.label ?? (object.fileType === "er-entity" ? object.logicalName : object.name);
  header.append(kind, title);
  box.appendChild(header);
  if (object.fileType === "er-entity") {
    const physical = document.createElement("div");
    physical.addClass("model-weave-node-er-physical");
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
  section.addClass("model-weave-node-section");
  const heading = document.createElement("div");
  heading.addClass("model-weave-node-section-heading");
  heading.textContent = "Columns";
  section.appendChild(heading);
  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.addClass("model-weave-node-empty");
    empty.textContent = "None";
    section.appendChild(empty);
    return section;
  }
  const list = document.createElement("ul");
  list.addClass("model-weave-node-list");
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
  section.addClass("model-weave-diagram-details");
  section.open = false;
  const summary = document.createElement("summary");
  summary.textContent = `Resolved relations (${diagram.edges.length})`;
  summary.addClass("model-weave-diagram-details-summary");
  section.appendChild(summary);
  if (diagram.edges.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "\u8868\u793A\u5BFE\u8C61\u306E relation \u306F\u3042\u308A\u307E\u305B\u3093\u3002";
    empty.addClass("model-weave-diagram-details-empty");
    section.appendChild(empty);
    return section;
  }
  const list = document.createElement("ul");
  list.addClass("model-weave-diagram-details-list");
  const sortedEdges = [...diagram.edges].sort(compareErEdges);
  for (const edge of sortedEdges) {
    const internalEdge = erDiagramEdgeToInternalEdge(edge);
    const columns = internalEdge.mappings.map((mapping) => `${mapping.localColumn} -> ${mapping.targetColumn}`).join(" / ");
    const item = document.createElement("li");
    item.addClass("model-weave-diagram-details-item");
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
  box.addClass("model-weave-node-empty");
  box.textContent = `Unresolved entity: ${id}`;
  return box;
}

// src/renderers/class-er-mermaid.ts
var CLASS_NODE_CLASS = "mwClass";
var ER_NODE_CLASS = "mwEntity";
function renderClassMermaidDiagram(diagram, options) {
  return renderReducedMermaidDiagram({
    className: "mdspec-diagram mdspec-diagram--class",
    title: options?.hideTitle ? void 0 : `${diagram.diagram.name} (class / mermaid)`,
    renderIdPrefix: "model_weave_class",
    source: buildClassOverviewMermaidSource(diagram),
    options,
    fallback: () => renderClassDiagram(diagram, options),
    fallbackMessage: "Mermaid class overview could not be rendered. Falling back to the custom class renderer."
  });
}
function renderErMermaidDiagram(diagram, options) {
  return renderReducedMermaidDiagram({
    className: "mdspec-diagram mdspec-diagram--er",
    title: options?.hideTitle ? void 0 : `${diagram.diagram.name} (er / mermaid)`,
    renderIdPrefix: "model_weave_er",
    source: buildErOverviewMermaidSource(diagram),
    options,
    fallback: () => renderErDiagram(diagram, options),
    fallbackMessage: "Mermaid ER overview could not be rendered. Falling back to the custom ER renderer."
  });
}
function renderReducedMermaidDiagram(config) {
  const shell = createMermaidShell({
    className: config.className,
    title: config.title,
    forExport: config.options?.forExport
  });
  const ready = renderMermaidSourceIntoShell(shell, {
    source: config.source,
    renderIdPrefix: config.renderIdPrefix,
    nodeSelector: ".node, g.node, foreignObject",
    viewportState: config.options?.viewportState,
    onViewportStateChange: config.options?.onViewportStateChange
  }).catch((error) => {
    const fallback = config.fallback();
    const notice = createMermaidFallbackNotice(config.fallbackMessage);
    shell.root.replaceChildren(notice, ...Array.from(fallback.childNodes));
  });
  setMermaidRenderReadyPromise(shell.root, ready);
  return shell.root;
}
function buildClassOverviewMermaidSource(diagram) {
  const lines = [
    "flowchart LR",
    `  classDef ${CLASS_NODE_CLASS} fill:#eef4ff,stroke:#4a6fa3,color:#132238,stroke-width:1.4px`
  ];
  const nodeIds = /* @__PURE__ */ new Map();
  for (const node of diagram.nodes) {
    const object = node.object && node.object.fileType === "object" ? node.object : void 0;
    const mermaidId = toMermaidNodeId(node.id);
    nodeIds.set(node.id, mermaidId);
    lines.push(`  ${mermaidId}["${buildClassNodeLabel(node.label, object, node.id)}"]:::${CLASS_NODE_CLASS}`);
  }
  for (const edge of diagram.edges) {
    const from = nodeIds.get(edge.source);
    const to = nodeIds.get(edge.target);
    if (!from || !to) {
      continue;
    }
    const label = sanitizeEdgeLabel(buildClassEdgeLabel(edge));
    lines.push(label ? `  ${from} -->|${label}| ${to}` : `  ${from} --> ${to}`);
  }
  return lines.join("\n");
}
function buildErOverviewMermaidSource(diagram) {
  const lines = [
    "flowchart LR",
    `  classDef ${ER_NODE_CLASS} fill:#eef8ef,stroke:#467454,color:#18311d,stroke-width:1.4px`
  ];
  const nodeIds = /* @__PURE__ */ new Map();
  for (const node of diagram.nodes) {
    const entity = node.object && node.object.fileType === "er-entity" ? node.object : void 0;
    const mermaidId = toMermaidNodeId(node.id);
    nodeIds.set(node.id, mermaidId);
    lines.push(`  ${mermaidId}["${buildErNodeLabel(node.label, entity, node.id)}"]:::${ER_NODE_CLASS}`);
  }
  for (const edge of diagram.edges) {
    const from = nodeIds.get(edge.source);
    const to = nodeIds.get(edge.target);
    if (!from || !to) {
      continue;
    }
    const label = sanitizeEdgeLabel(buildErEdgeLabel(edge));
    lines.push(label ? `  ${from} -->|${label}| ${to}` : `  ${from} --> ${to}`);
  }
  return lines.join("\n");
}
function buildClassNodeLabel(explicitLabel, object, fallbackId) {
  return escapeMermaidLabel2(explicitLabel?.trim() || object?.name || fallbackId);
}
function buildErNodeLabel(explicitLabel, entity, fallbackId) {
  if (!entity) {
    return escapeMermaidLabel2(explicitLabel?.trim() || fallbackId);
  }
  const lines = [entity.logicalName || explicitLabel?.trim() || fallbackId];
  if (entity.physicalName) {
    lines.push(entity.physicalName);
  }
  return escapeMermaidLabel2(lines.join("<br/>"));
}
function buildClassEdgeLabel(edge) {
  const internal = classDiagramEdgeToInternalEdge(edge);
  const base = internal.label?.trim() || internal.kind || null;
  const multiplicity = internal.fromMultiplicity || internal.toMultiplicity ? `${internal.fromMultiplicity ?? "-"}\u2192${internal.toMultiplicity ?? "-"}` : null;
  if (base && multiplicity) {
    return `${base} (${multiplicity})`;
  }
  return base ?? multiplicity;
}
function buildErEdgeLabel(edge) {
  const internal = erDiagramEdgeToInternalEdge(edge);
  return internal.cardinality?.trim() || internal.label?.trim() || internal.id?.trim() || internal.kind?.trim() || null;
}
function sanitizeEdgeLabel(value) {
  if (!value) {
    return null;
  }
  return value.replace(/\|/g, "/").replace(/[\[\]\(\)]/g, " ").replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
}
function escapeMermaidLabel2(value) {
  return value.replace(/"/g, '\\"').replace(/\r?\n/g, "<br/>");
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
      return options?.renderMode === "mermaid" ? renderClassMermaidDiagram(diagram, options) : renderClassDiagram(diagram, options);
    case "er":
      return options?.renderMode === "mermaid" ? renderErMermaidDiagram(diagram, options) : renderErDiagram(diagram, options);
    case "dfd":
      return renderDfdMermaidDiagram(diagram, options);
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
function renderObjectContext(context, options) {
  const root = document.createElement("section");
  root.addClass("model-weave-object-context");
  const titleRow = document.createElement("div");
  titleRow.addClass("model-weave-object-context-title-row");
  const title = document.createElement("h3");
  title.textContent = "Related Objects";
  title.addClass("model-weave-object-context-title");
  titleRow.appendChild(title);
  const count = document.createElement("span");
  count.textContent = `${context.relatedObjects.length} linked`;
  count.addClass("model-weave-object-context-count");
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
  graph.addClass("model-weave-object-context-graph");
  return graph;
}
function createRelatedList(context, options) {
  const sortedEntries = [...context.relatedObjects].sort(
    (left, right) => compareRelatedEntries(left, right)
  );
  const details = document.createElement("details");
  details.addClass("model-weave-object-context-list");
  const summary = document.createElement("summary");
  summary.textContent = context.object.fileType === "er-entity" ? `Relation Details (${sortedEntries.length})` : `Connection Details (${sortedEntries.length})`;
  summary.addClass("model-weave-object-context-summary");
  details.appendChild(summary);
  const tableWrap = document.createElement("div");
  tableWrap.addClass("model-weave-object-context-table-wrap");
  if (sortedEntries.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "\u76F4\u63A5\u95A2\u4FC2\u3059\u308B\u30AA\u30D6\u30B8\u30A7\u30AF\u30C8\u306F\u3042\u308A\u307E\u305B\u3093\u3002";
    empty.addClass("model-weave-object-context-empty");
    details.appendChild(empty);
    return details;
  }
  const table = document.createElement("table");
  table.addClass("model-weave-object-context-table");
  const headers = context.object.fileType === "er-entity" ? ["Related", "Direction", "Relation ID", "Source", "Target", "Kind", "Cardinality", "Mappings", "Notes"] : ["Related", "Direction", "Relation ID", "Source", "Target", "Kind", "Label", "Multiplicity", "Notes"];
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  for (const header of headers) {
    const cell = document.createElement("th");
    cell.textContent = header;
    cell.addClass("model-weave-object-context-th");
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
      cell.addClass("model-weave-object-context-td");
      if (index === 0 && options?.onOpenObject) {
        const wrapper = document.createElement("div");
        wrapper.addClass("model-weave-object-context-link-wrap");
        const badge = createDirectionBadge(entry.direction);
        wrapper.appendChild(badge);
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = value;
        button.addClass("model-weave-object-context-link");
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
  badge.addClass("model-weave-badge");
  badge.addClass(getDirectionBadgeClass(direction));
  return badge;
}
function createKindBadge(kind) {
  const badge = document.createElement("span");
  badge.textContent = kind || "-";
  badge.addClass("model-weave-badge");
  badge.addClass(getKindBadgeClass(kind));
  return badge;
}
function getDirectionBadgeClass(direction) {
  return direction === "outgoing" ? "model-weave-badge-outgoing" : "model-weave-badge-incoming";
}
function getKindBadgeClass(kind) {
  switch (kind) {
    case "inheritance":
      return "model-weave-badge-inheritance";
    case "implementation":
      return "model-weave-badge-implementation";
    case "dependency":
      return "model-weave-badge-dependency";
    case "composition":
      return "model-weave-badge-composition";
    case "aggregation":
      return "model-weave-badge-aggregation";
    case "association":
      return "model-weave-badge-association";
    case "fk":
      return "model-weave-badge-fk";
    default:
      return "model-weave-badge-default";
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
  root.addClass("model-weave-object-focus");
  const title = document.createElement("h2");
  title.textContent = getPrimaryTitle(model);
  title.addClass("model-weave-object-title");
  root.appendChild(title);
  const meta = document.createElement("div");
  meta.addClass("model-weave-object-meta");
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
  key.addClass("model-weave-object-meta-key");
  const val = document.createElement("div");
  val.textContent = value;
  val.addClass("model-weave-object-meta-val");
  container.append(key, val);
}

// src/views/view-icon.ts
var MODELING_VIEW_ICON = "git-branch";

// src/views/modeling-preview-view.ts
var MODELING_PREVIEW_VIEW_TYPE = "mdspec-preview";
var VIEWPORT_STATE_CACHE_LIMIT = 50;
var DEFAULT_VIEWER_PREFERENCES = {
  defaultZoom: "fit",
  fontSize: "normal",
  nodeDensity: "normal"
};
var ModelingPreviewView = class extends import_obsidian5.ItemView {
  constructor(leaf, viewerPreferences = DEFAULT_VIEWER_PREFERENCES) {
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
    this.screenPreviewViewportState = {
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
    this.screenPreviewFilePath = null;
    this.viewportStateCache = /* @__PURE__ */ new Map();
    this.collapsibleState = /* @__PURE__ */ new Map();
    this.scrollStateByFilePath = /* @__PURE__ */ new Map();
    this.splitRatioByKey = /* @__PURE__ */ new Map();
    this.activeScrollContainer = null;
    this.getCollapsibleOpenState = (key, defaultOpen) => {
      return this.collapsibleState.get(key) ?? defaultOpen;
    };
    this.setCollapsibleOpenState = (key, open) => {
      this.collapsibleState.set(key, open);
    };
    this.viewerPreferences = { ...viewerPreferences };
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
  applyViewerSettings(viewerPreferences) {
    this.viewerPreferences = { ...viewerPreferences };
  }
  refreshForSettingsChange() {
    this.renderCurrentState();
    this.restoreCurrentScrollPosition();
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
    this.persistCurrentScrollPosition();
    this.prepareViewportState(state, reason);
    this.state = state;
    this.renderCurrentState();
    this.restoreCurrentScrollPosition();
  }
  getCurrentFilePath() {
    switch (this.state.mode) {
      case "diagram":
        return this.state.diagram.diagram.path;
      case "object":
        return "filePath" in this.state.model ? this.state.model.filePath : this.state.model.path;
      case "dfd-object":
        return this.state.model.path;
      case "summary":
        return this.state.filePath;
      default:
        return null;
    }
  }
  persistActiveViewportState() {
    if (this.diagramFilePath) {
      this.rememberViewportState(this.diagramFilePath, this.diagramViewportState);
    }
    if (this.objectGraphFilePath) {
      this.rememberViewportState(this.objectGraphFilePath, this.objectGraphViewportState);
    }
    if (this.screenPreviewFilePath) {
      this.rememberViewportState(this.screenPreviewFilePath, this.screenPreviewViewportState);
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
    if (state.mode === "summary" && (state.layoutBlocks?.length ?? 0) > 0) {
      this.prepareFileViewportState(
        this.screenPreviewViewportState,
        this.screenPreviewFilePath,
        state.filePath,
        reason
      );
      this.screenPreviewFilePath = state.filePath;
      return;
    }
    if (state.mode !== "object") {
      this.objectGraphFilePath = null;
    }
    if (state.mode !== "summary" || (state.layoutBlocks?.length ?? 0) === 0) {
      this.screenPreviewFilePath = null;
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
    if (this.viewerPreferences.defaultZoom === "100") {
      state.zoom = 1;
      state.panX = 0;
      state.panY = 0;
      state.viewMode = "manual";
      state.hasAutoFitted = true;
      state.hasUserInteracted = false;
    }
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
            forExport: true,
            renderMode: state.rendererSelection?.effectiveMode
          })
        };
      case "object": {
        const filePath = this.getCurrentDiagramFilePath();
        if (!filePath) {
          return null;
        }
        if (state.rendererSelection?.actualRenderer === "mermaid") {
          const context2 = state.context ?? {
            object: state.model,
            relatedObjects: [],
            warnings: []
          };
          const subgraph2 = buildObjectSubgraphScene(context2);
          return {
            filePath,
            render: () => renderDiagramModel(subgraph2, {
              hideTitle: true,
              hideDetails: true,
              forExport: true,
              renderMode: "mermaid"
            })
          };
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
      case "summary":
        if ((state.layoutBlocks?.length ?? 0) > 0) {
          return {
            filePath: state.filePath,
            render: () => createScreenPreviewDiagram(buildScreenPreviewData(state), {
              forExport: true
            })
          };
        }
        return null;
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
  createScreenPreviewViewportStateHandler(filePath) {
    return (viewportState) => {
      if (this.state.mode !== "summary" || this.screenPreviewFilePath !== filePath || this.state.filePath !== filePath) {
        return;
      }
      this.rememberViewportState(filePath, viewportState);
    };
  }
  renderCurrentState() {
    this.clearView();
    switch (this.state.mode) {
      case "object":
        this.renderObjectState(this.state);
        return;
      case "relations":
        this.renderRelationsState(this.state);
        return;
      case "summary":
        this.renderSummaryState(this.state);
        return;
      case "dfd-object":
        this.renderDfdObjectState(this.state);
        return;
      case "diagram":
        this.renderDiagramState(this.state);
        return;
      case "empty":
      default:
        this.renderEmptyState(this.state.message);
    }
  }
  clearView() {
    this.contentEl.empty();
    this.activeScrollContainer = null;
    this.contentEl.classList.remove(
      "model-weave-viewer-root",
      "mw-font-small",
      "mw-font-normal",
      "mw-font-large",
      "mw-density-compact",
      "mw-density-normal",
      "mw-density-relaxed"
    );
    this.contentEl.classList.add("model-weave-viewer-root");
    this.contentEl.classList.add(`mw-font-${this.viewerPreferences.fontSize}`);
    this.contentEl.classList.add(`mw-density-${this.viewerPreferences.nodeDensity}`);
    const fontVars = this.getFontSizeVariables();
    this.contentEl.style.setProperty("--model-weave-font-size", fontVars.base);
    this.contentEl.style.setProperty("--model-weave-font-size-small", fontVars.small);
    this.contentEl.style.setProperty("--model-weave-font-size-large", fontVars.large);
    this.contentEl.style.setProperty("--model-weave-font-size-title", fontVars.title);
    this.contentEl.style.display = "flex";
    this.contentEl.style.flexDirection = "column";
    this.contentEl.style.height = "100%";
    this.contentEl.style.minHeight = "0";
    this.contentEl.style.gap = `${this.getDensitySpacing().contentGap}px`;
    this.contentEl.style.overflow = "hidden";
    this.contentEl.style.paddingBottom = "12px";
    this.contentEl.style.fontSize = "var(--model-weave-font-size)";
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
    const shell = this.createViewerSplitShell(`object:${objectPath}`, 0.62);
    this.activeScrollContainer = shell.bottomPane;
    renderDiagnostics(
      shell.bottomPane,
      state.warnings,
      state.onOpenDiagnostic ?? void 0,
      this.getCollapsibleOpenState,
      this.setCollapsibleOpenState
    );
    shell.bottomPane.appendChild(renderObjectModel(state.model, state.context));
    if (!state.context) {
      return;
    }
    if (state.rendererSelection?.actualRenderer === "mermaid") {
      const contextRoot2 = renderObjectContext(state.context, {
        onOpenObject: state.onOpenObject ?? void 0,
        viewportState: this.objectGraphViewportState,
        onViewportStateChange: this.createObjectViewportStateHandler(objectPath)
      });
      const relatedList2 = Array.from(contextRoot2.children).find(
        (child) => child instanceof HTMLElement && (child.classList.contains("model-weave-object-context-list") || child.classList.contains("mdspec-related-list"))
      );
      if (relatedList2) {
        relatedList2.remove();
        shell.bottomPane.appendChild(relatedList2);
      }
      const subgraph = buildObjectSubgraphScene(state.context);
      const mermaidRoot = renderDiagramModel(subgraph, {
        hideTitle: true,
        hideDetails: true,
        renderMode: "mermaid",
        viewportState: this.objectGraphViewportState,
        onViewportStateChange: this.createObjectViewportStateHandler(objectPath)
      });
      this.appendRendererSelection(mermaidRoot, state.rendererSelection);
      shell.topPane.appendChild(mermaidRoot);
      return;
    }
    const contextRoot = renderObjectContext(state.context, {
      onOpenObject: state.onOpenObject ?? void 0,
      viewportState: this.objectGraphViewportState,
      onViewportStateChange: this.createObjectViewportStateHandler(objectPath)
    });
    contextRoot.style.marginTop = "0";
    const relatedList = Array.from(contextRoot.children).find(
      (child) => child instanceof HTMLElement && (child.classList.contains("model-weave-object-context-list") || child.classList.contains("mdspec-related-list"))
    );
    if (relatedList) {
      relatedList.remove();
      shell.bottomPane.appendChild(relatedList);
    }
    this.appendRendererSelection(contextRoot, state.rendererSelection);
    shell.topPane.appendChild(contextRoot);
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
  renderSummaryState(state) {
    if ((state.layoutBlocks?.length ?? 0) > 0) {
      const shell = this.createViewerSplitShell(`summary:${state.filePath}`, 0.48);
      this.activeScrollContainer = shell.bottomPane;
      shell.topPane.appendChild(
        createScreenPreviewDiagram(buildScreenPreviewData(state), {
          viewportState: this.screenPreviewViewportState,
          onViewportStateChange: this.createScreenPreviewViewportStateHandler(
            state.filePath
          ),
          onNavigateToLocation: state.onNavigateToLocation,
          onOpenLinkedFile: state.onOpenLinkedFile
        })
      );
      this.renderSummaryDetails(shell.bottomPane, state);
      return;
    }
    const wrapper = this.contentEl.createDiv();
    wrapper.style.display = "flex";
    wrapper.style.flexDirection = "column";
    wrapper.style.gap = "12px";
    wrapper.style.padding = "4px 0 12px";
    wrapper.style.overflow = "auto";
    wrapper.style.fontSize = "var(--model-weave-font-size)";
    this.activeScrollContainer = wrapper;
    this.renderSummaryDetails(wrapper, state);
  }
  renderSummaryDetails(container, state) {
    container.createEl("h2", { text: state.title });
    const message = container.createEl("p", { text: state.message });
    message.style.margin = "0";
    message.style.color = "var(--text-muted)";
    message.style.fontSize = "var(--model-weave-font-size)";
    renderDiagnostics(
      container,
      state.warnings,
      void 0,
      this.getCollapsibleOpenState,
      this.setCollapsibleOpenState
    );
    if (state.metadata.length > 0) {
      const list = container.createEl("ul");
      list.style.margin = "0";
      for (const entry of state.metadata) {
        list.createEl("li", { text: `${entry.label}: ${entry.value}` });
      }
    }
    if (state.counts.length > 0) {
      const counts = container.createDiv();
      counts.createEl("h3", { text: "Counts" });
      const list = counts.createEl("ul");
      list.style.margin = "0";
      for (const entry of state.counts) {
        list.createEl("li", { text: `${entry.label}: ${entry.value}` });
      }
    }
    if (state.sections.length > 0) {
      const sections = this.createCollapsibleSection(
        container,
        "detectedSections",
        "Detected Sections",
        true
      );
      const list = sections.createEl("ul");
      list.style.margin = "0";
      for (const section of state.sections) {
        const item = list.createEl("li", { text: section.label });
        this.bindLocationNavigation(item, state.onNavigateToLocation, section);
      }
    }
    for (const textSection of state.textSections ?? []) {
      if (textSection.lines.length === 0) {
        continue;
      }
      const section = this.createCollapsibleSection(
        container,
        `text:${textSection.title}`,
        textSection.title,
        true
      );
      for (const line of textSection.lines) {
        const paragraph = section.createEl("p", { text: line });
        paragraph.style.margin = "0 0 8px";
        paragraph.style.whiteSpace = "pre-wrap";
        paragraph.style.color = "var(--text-normal)";
        paragraph.style.fontSize = "var(--model-weave-font-size)";
      }
    }
    for (const table of state.tables ?? []) {
      const section = this.createCollapsibleSection(
        container,
        `summary:${table.title}`,
        table.title,
        true
      );
      const tableEl = section.createEl("table");
      tableEl.style.width = "100%";
      tableEl.style.borderCollapse = "collapse";
      tableEl.style.fontSize = "var(--model-weave-font-size)";
      const thead = tableEl.createEl("thead");
      const headRow = thead.createEl("tr");
      for (const column of table.columns) {
        const th = headRow.createEl("th", { text: column });
        th.style.textAlign = "left";
        th.style.padding = "6px";
        th.style.borderBottom = "1px solid var(--background-modifier-border)";
      }
      const tbody = tableEl.createEl("tbody");
      for (const row of table.rows) {
        const tr = tbody.createEl("tr");
        tr.style.cursor = row.line !== void 0 ? "pointer" : "";
        this.bindLocationNavigation(tr, state.onNavigateToLocation, row);
        for (const cell of row.cells) {
          const td = tr.createEl("td", { text: cell });
          td.style.padding = "6px";
          td.style.borderBottom = "1px solid var(--background-modifier-border-hover)";
          td.style.verticalAlign = "top";
        }
      }
    }
    if ((state.localProcesses?.length ?? 0) > 0) {
      const localProcesses = this.createCollapsibleSection(
        container,
        "localProcesses",
        "Local Processes",
        true
      );
      const list = localProcesses.createEl("ul");
      list.style.margin = "0";
      for (const process of state.localProcesses ?? []) {
        const item = list.createEl("li", { text: process.label });
        this.bindLocationNavigation(item, state.onNavigateToLocation, process);
      }
    }
    if ((state.navigationLists?.length ?? 0) > 0) {
      for (const navigationList of state.navigationLists ?? []) {
        const section = this.createCollapsibleSection(
          container,
          `navigation:${navigationList.title}`,
          navigationList.title,
          true
        );
        const list = section.createEl("ul");
        list.style.margin = "0";
        for (const itemInfo of navigationList.items) {
          const item = list.createEl("li", { text: itemInfo.label });
          this.bindLocationNavigation(item, state.onNavigateToLocation, itemInfo);
        }
      }
    }
    if ((state.relatedReferences?.length ?? 0) > 0) {
      const related = this.createCollapsibleSection(
        container,
        "relatedReferences",
        "Related References",
        true
      );
      const list = related.createEl("ul");
      list.style.margin = "0";
      for (const reference of state.relatedReferences ?? []) {
        const label = typeof reference.count === "number" && reference.count > 1 ? `${reference.label} \u2014 ${reference.count} occurrences` : reference.label;
        const item = list.createEl("li", { text: label });
        this.bindLocationNavigation(item, state.onNavigateToLocation, reference);
      }
    }
  }
  createCollapsibleSection(container, key, title, defaultOpen) {
    const details = container.createEl("details");
    details.open = this.getCollapsibleOpenState(key, defaultOpen);
    details.addEventListener("toggle", () => {
      this.setCollapsibleOpenState(key, details.open);
    });
    const summary = details.createEl("summary", { text: title });
    summary.style.cursor = "pointer";
    summary.style.fontSize = "var(--model-weave-font-size)";
    return details.createDiv();
  }
  bindLocationNavigation(element, onNavigate, location) {
    if (!onNavigate || typeof location.line !== "number") {
      return;
    }
    element.tabIndex = 0;
    element.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      onNavigate({ line: location.line, ch: location.ch });
    };
    element.onkeydown = (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        event.stopPropagation();
        onNavigate({ line: location.line, ch: location.ch });
      }
    };
  }
  persistCurrentScrollPosition() {
    const filePath = this.getCurrentFilePath();
    if (!filePath || !this.activeScrollContainer) {
      return;
    }
    this.scrollStateByFilePath.set(filePath, this.activeScrollContainer.scrollTop);
  }
  restoreCurrentScrollPosition() {
    const filePath = this.getCurrentFilePath();
    if (!filePath || !this.activeScrollContainer) {
      return;
    }
    const nextScrollTop = this.scrollStateByFilePath.get(filePath);
    if (typeof nextScrollTop === "number") {
      this.activeScrollContainer.scrollTop = nextScrollTop;
    }
  }
  renderDfdObjectState(state) {
    const shell = this.createViewerSplitShell(`dfd-object:${state.model.path}`, 0.62);
    this.activeScrollContainer = shell.bottomPane;
    renderDiagnostics(
      shell.bottomPane,
      state.warnings,
      state.onOpenDiagnostic ?? void 0,
      this.getCollapsibleOpenState,
      this.setCollapsibleOpenState
    );
    shell.bottomPane.appendChild(renderObjectModel(state.model));
    const diagramRoot = renderDiagramModel(state.diagram, {
      hideTitle: true,
      hideDetails: false,
      onOpenObject: state.onOpenObject ?? void 0,
      viewportState: this.objectGraphViewportState,
      onViewportStateChange: this.createObjectViewportStateHandler(state.model.path)
    });
    this.moveDetailSections(diagramRoot, shell.bottomPane);
    shell.topPane.appendChild(diagramRoot);
  }
  renderDiagramState(state) {
    const filePath = state.diagram.diagram.path;
    const shell = this.createViewerSplitShell(`diagram:${filePath}`, 0.64);
    this.activeScrollContainer = shell.bottomPane;
    renderDiagnostics(
      shell.bottomPane,
      state.warnings,
      state.onOpenDiagnostic ?? void 0,
      this.getCollapsibleOpenState,
      this.setCollapsibleOpenState
    );
    const diagramRoot = renderDiagramModel(state.diagram, {
      onOpenObject: state.onOpenObject ?? void 0,
      renderMode: state.rendererSelection?.effectiveMode,
      viewportState: this.diagramViewportState,
      onViewportStateChange: this.createDiagramViewportStateHandler(filePath)
    });
    this.appendRendererSelection(diagramRoot, state.rendererSelection);
    this.moveDetailSections(diagramRoot, shell.bottomPane);
    shell.topPane.appendChild(diagramRoot);
  }
  moveDetailSections(source, target) {
    let detailWrapper = target.querySelector(".model-weave-lower-scroll");
    if (!detailWrapper) {
      detailWrapper = target.createDiv({ cls: "model-weave-lower-scroll" });
    }
    const details = Array.from(source.children).filter(
      (child) => child instanceof HTMLElement && child.matches(
        "details, .mdspec-related-list, .model-weave-object-context-list"
      )
    );
    for (const detail of details) {
      detail.remove();
      detail.addClass("model-weave-detail-panel");
      detailWrapper.appendChild(detail);
    }
  }
  appendRendererSelection(container, selection) {
    if (!selection || !selection.onSelectMode || (selection.supportedModes?.length ?? 0) < 2) {
      return;
    }
    const toolbar = container.querySelector(".mdspec-zoom-toolbar");
    if (!toolbar) {
      return;
    }
    toolbar.style.display = "flex";
    toolbar.style.alignItems = "center";
    toolbar.style.gap = "8px";
    toolbar.querySelector(".mdspec-renderer-select-group")?.remove();
    const wrapper = document.createElement("div");
    wrapper.className = "mdspec-renderer-select-group";
    wrapper.style.display = "flex";
    wrapper.style.alignItems = "center";
    wrapper.style.gap = "6px";
    wrapper.style.marginLeft = "auto";
    wrapper.style.paddingLeft = "8px";
    wrapper.style.borderLeft = "1px solid var(--background-modifier-border)";
    const title = document.createElement("span");
    title.style.fontSize = "var(--model-weave-font-size-small)";
    title.style.fontWeight = "600";
    title.style.color = "var(--text-muted)";
    title.textContent = "Renderer";
    const meta = document.createElement("span");
    meta.textContent = `selected ${selection.selectedMode} / effective ${selection.effectiveMode} / source ${selection.source}`;
    if (selection.fallbackReason) {
      meta.textContent += ` / ${selection.fallbackReason}`;
    }
    title.title = meta.textContent;
    wrapper.appendChild(title);
    const select = document.createElement("select");
    select.style.minWidth = "104px";
    select.style.border = "1px solid var(--background-modifier-border)";
    select.style.borderRadius = "6px";
    select.style.background = "var(--background-primary)";
    select.style.color = "var(--text-normal)";
    select.style.padding = "2px 8px";
    select.style.fontSize = "var(--model-weave-font-size-small)";
    select.title = meta.textContent;
    for (const mode of selection.supportedModes) {
      const option = document.createElement("option");
      option.value = mode;
      option.textContent = mode[0].toUpperCase() + mode.slice(1);
      option.selected = mode === selection.visibleSelectedMode;
      select.appendChild(option);
    }
    select.addEventListener("change", () => {
      selection.onSelectMode?.(select.value);
    });
    wrapper.appendChild(select);
    toolbar.appendChild(wrapper);
  }
  createViewerSplitShell(key, defaultTopRatio) {
    const density = this.getDensitySpacing();
    const root = this.contentEl.createDiv();
    root.style.display = "flex";
    root.style.flexDirection = "column";
    root.style.flex = "1 1 auto";
    root.style.minHeight = "0";
    root.style.overflow = "hidden";
    root.style.border = "1px solid var(--background-modifier-border)";
    root.style.borderRadius = "10px";
    root.style.background = "var(--background-primary)";
    const topPane = root.createDiv();
    topPane.style.display = "flex";
    topPane.style.flexDirection = "column";
    topPane.style.minHeight = "180px";
    topPane.style.minWidth = "0";
    topPane.style.overflow = "hidden";
    topPane.style.padding = `${density.topPanePadding}px`;
    topPane.style.gap = `${density.topPaneGap}px`;
    topPane.style.background = "var(--background-primary)";
    const handle = root.createDiv();
    handle.style.flex = "0 0 10px";
    handle.style.cursor = "row-resize";
    handle.style.position = "relative";
    handle.style.background = "var(--background-primary-alt)";
    handle.style.borderTop = "1px solid var(--background-modifier-border)";
    handle.style.borderBottom = "1px solid var(--background-modifier-border)";
    handle.style.touchAction = "none";
    const grip = handle.createDiv();
    grip.style.position = "absolute";
    grip.style.left = "50%";
    grip.style.top = "50%";
    grip.style.width = "42px";
    grip.style.height = "3px";
    grip.style.borderRadius = "999px";
    grip.style.background = "var(--background-modifier-border-hover)";
    grip.style.transform = "translate(-50%, -50%)";
    const bottomPane = root.createDiv();
    bottomPane.style.minHeight = "180px";
    bottomPane.style.minWidth = "0";
    bottomPane.style.overflow = "auto";
    bottomPane.style.padding = `${density.bottomPanePadding}px ${density.bottomPanePadding + 2}px ${density.bottomPanePadding + 4}px`;
    bottomPane.style.display = "flex";
    bottomPane.style.flexDirection = "column";
    bottomPane.style.gap = `${density.bottomPaneGap}px`;
    bottomPane.style.background = "var(--background-primary)";
    const minTop = 180;
    const minBottom = 180;
    const clampRatio = (ratio) => Math.min(0.8, Math.max(0.3, ratio));
    const applyRatio = (ratio) => {
      const bounded = clampRatio(ratio);
      const rootHeight = root.getBoundingClientRect().height;
      const available = rootHeight > 0 ? Math.max(rootHeight - 10, minTop + minBottom) : 0;
      if (available <= 0) {
        topPane.style.flex = `${bounded} 1 0`;
        bottomPane.style.flex = `${1 - bounded} 1 0`;
        this.splitRatioByKey.set(key, bounded);
        return;
      }
      const topPixels = Math.max(
        minTop,
        Math.min(available - minBottom, Math.round(available * bounded))
      );
      const bottomPixels = Math.max(minBottom, available - topPixels);
      topPane.style.flex = `0 0 ${topPixels}px`;
      bottomPane.style.flex = `0 0 ${bottomPixels}px`;
      this.splitRatioByKey.set(key, topPixels / available);
    };
    const initialRatio = clampRatio(
      this.splitRatioByKey.get(key) ?? defaultTopRatio
    );
    applyRatio(initialRatio);
    const resizeObserver = new ResizeObserver(() => {
      applyRatio(this.splitRatioByKey.get(key) ?? initialRatio);
    });
    resizeObserver.observe(root);
    handle.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const pointerId = event.pointerId;
      handle.setPointerCapture(pointerId);
      const rootRect = root.getBoundingClientRect();
      const available = Math.max(rootRect.height - 10, minTop + minBottom);
      const onMove = (moveEvent) => {
        const offset = moveEvent.clientY - rootRect.top;
        const topPixels = Math.max(
          minTop,
          Math.min(available - minBottom, offset)
        );
        applyRatio(topPixels / available);
      };
      const onUp = () => {
        handle.releasePointerCapture(pointerId);
        handle.removeEventListener("pointermove", onMove);
        handle.removeEventListener("pointerup", onUp);
        handle.removeEventListener("pointercancel", onUp);
      };
      handle.addEventListener("pointermove", onMove);
      handle.addEventListener("pointerup", onUp);
      handle.addEventListener("pointercancel", onUp);
    });
    return { root, topPane, bottomPane };
  }
  getFontSizeVariables() {
    switch (this.viewerPreferences.fontSize) {
      case "small":
        return {
          base: "12px",
          small: "11px",
          large: "13px",
          title: "15px"
        };
      case "large":
        return {
          base: "17px",
          small: "15px",
          large: "19px",
          title: "20px"
        };
      default:
        return {
          base: "14px",
          small: "12px",
          large: "16px",
          title: "17px"
        };
    }
  }
  getDensitySpacing() {
    switch (this.viewerPreferences.nodeDensity) {
      case "compact":
        return {
          contentGap: 8,
          topPanePadding: 8,
          topPaneGap: 8,
          bottomPanePadding: 8,
          bottomPaneGap: 10
        };
      case "relaxed":
        return {
          contentGap: 12,
          topPanePadding: 12,
          topPaneGap: 12,
          bottomPanePadding: 12,
          bottomPaneGap: 14
        };
      default:
        return {
          contentGap: 10,
          topPanePadding: 10,
          topPaneGap: 10,
          bottomPanePadding: 10,
          bottomPaneGap: 12
        };
    }
  }
};
var SCREEN_NODE_BG = "#ffffff";
var SCREEN_NODE_BORDER = "#3a7a4f";
var SCREEN_HEADER_BG = "#eef8f0";
var SCREEN_SECTION_DIVIDER = "#d1d5db";
var SCREEN_TEXT = "#111827";
var SCREEN_MUTED_TEXT = "#4b5563";
var SCREEN_CANVAS_BORDER = "#d1d5db";
var SCREEN_CANVAS_PADDING = 48;
var SCREEN_MIN_ZOOM = 0.45;
var SCREEN_MAX_ZOOM = 2.4;
var SCREEN_INITIAL_ZOOM = 1;
var SCREEN_CANVAS_MIN_HEIGHT = 420;
var SCREEN_BOX_WIDTH = 420;
var SCREEN_BOX_RADIUS = 12;
var SCREEN_BOX_HEADER_HEIGHT = 42;
var SCREEN_SECTION_HEADER_HEIGHT = 24;
var SCREEN_SECTION_PADDING = 10;
var SCREEN_SECTION_GAP = 8;
var SCREEN_FIELD_ROW_HEIGHT = 22;
var SCREEN_MAX_TITLE_CHARS = 34;
var SCREEN_MAX_SECTION_CHARS = 36;
var SCREEN_MAX_FIELD_CHARS = 40;
var SCREEN_TRANSITION_LANE_WIDTH = 168;
var SCREEN_TARGET_BOX_WIDTH = 240;
var SCREEN_TARGET_BOX_MIN_HEIGHT = 76;
var SCREEN_TARGET_BOX_HEADER_HEIGHT = 30;
var SCREEN_TARGET_BOX_GAP = 24;
var SCREEN_LABEL_PILL_WIDTH = 132;
var SCREEN_LABEL_PILL_HEIGHT = 24;
var SCREEN_LABEL_PILL_GAP = 8;
var SCREEN_LABEL_PILL_PADDING_X = 10;
var SCREEN_ARROW_COLOR = "#64748b";
var SCREEN_ARROW_LABEL_BG = "#ffffff";
var SCREEN_ARROW_LABEL_BORDER = "#cbd5e1";
var SCREEN_UNRESOLVED_BORDER = "#d97706";
var SCREEN_UNRESOLVED_BG = "#fff7ed";
var SCREEN_TARGET_BOX_SHADOW = "0 2px 8px rgba(15, 23, 42, 0.08)";
function buildScreenPreviewData(state) {
  return {
    title: state.title,
    blocks: state.layoutBlocks ?? [],
    transitions: state.screenPreviewTransitions ?? []
  };
}
function createScreenPreviewDiagram(data, options) {
  const root = document.createElement("section");
  root.className = "mdspec-diagram mdspec-diagram--screen";
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.flex = "1 1 auto";
  root.style.minHeight = "0";
  const scene = buildScreenPreviewScene(data);
  const canvas = document.createElement("div");
  canvas.className = "mdspec-screen-canvas";
  canvas.style.position = "relative";
  canvas.style.overflow = "hidden";
  canvas.style.padding = "0";
  canvas.style.border = `1px solid ${SCREEN_CANVAS_BORDER}`;
  canvas.style.borderRadius = "8px";
  canvas.style.background = "#ffffff";
  canvas.style.flex = "1 1 auto";
  if (!options?.forExport) {
    canvas.style.minHeight = `${SCREEN_CANVAS_MIN_HEIGHT}px`;
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
  viewport.className = "mdspec-screen-viewport";
  viewport.style.position = "relative";
  viewport.style.width = "100%";
  viewport.style.height = "100%";
  viewport.style.minHeight = "0";
  viewport.style.overflow = "hidden";
  const surface = document.createElement("div");
  surface.className = "mdspec-screen-surface";
  surface.dataset.modelWeaveExportSurface = "true";
  surface.dataset.modelWeaveRenderer = "custom";
  surface.dataset.modelWeaveSceneWidth = `${scene.width}`;
  surface.dataset.modelWeaveSceneHeight = `${scene.height}`;
  surface.style.position = "absolute";
  surface.style.left = "0";
  surface.style.top = "0";
  surface.style.width = `${scene.width}px`;
  surface.style.height = `${scene.height}px`;
  surface.style.transformOrigin = "0 0";
  surface.style.willChange = "transform";
  surface.style.background = "#ffffff";
  surface.appendChild(createScreenPreviewTransitionSvg(scene));
  surface.appendChild(createScreenPreviewMainBox(data, scene.mainBoxHeight, scene.mainBoxTop));
  for (const target of scene.targets) {
    surface.appendChild(createScreenPreviewTargetBox(target, options));
  }
  for (const target of scene.targets) {
    for (const pill of target.labelPills) {
      surface.appendChild(createScreenPreviewActionPill(pill, options?.onNavigateToLocation));
    }
  }
  viewport.appendChild(surface);
  canvas.appendChild(viewport);
  root.appendChild(canvas);
  if (toolbar) {
    attachGraphViewportInteractions(canvas, surface, toolbar, scene, {
      minZoom: SCREEN_MIN_ZOOM,
      maxZoom: SCREEN_MAX_ZOOM,
      initialZoom: SCREEN_INITIAL_ZOOM,
      viewportState: options?.viewportState,
      onViewportStateChange: options?.onViewportStateChange
    });
  }
  return root;
}
function buildScreenPreviewScene(data) {
  const blocks = data.blocks.length > 0 ? data.blocks : [{ label: "\u672A\u5206\u985E [unassigned]", items: [] }];
  const mainBoxHeight = SCREEN_BOX_HEADER_HEIGHT + blocks.reduce((sum, block) => {
    return sum + SCREEN_SECTION_HEADER_HEIGHT + SCREEN_SECTION_PADDING * 2 + block.items.length * SCREEN_FIELD_ROW_HEIGHT;
  }, 0) + Math.max(0, blocks.length - 1) * SCREEN_SECTION_GAP;
  const targetGroups = data.transitions;
  const targetHeights = targetGroups.map((target) => {
    const labelsHeight = target.actions.length * SCREEN_LABEL_PILL_HEIGHT + Math.max(0, target.actions.length - 1) * SCREEN_LABEL_PILL_GAP;
    return Math.max(
      SCREEN_TARGET_BOX_MIN_HEIGHT,
      labelsHeight + SCREEN_SECTION_PADDING * 2
    );
  });
  const targetStackHeight = targetHeights.reduce((sum, currentHeight) => sum + currentHeight, 0) + Math.max(0, targetHeights.length - 1) * SCREEN_TARGET_BOX_GAP;
  const contentHeight = Math.max(mainBoxHeight, targetStackHeight);
  const mainBoxTop = SCREEN_CANVAS_PADDING + (contentHeight - mainBoxHeight) / 2;
  const labelStartX = SCREEN_CANVAS_PADDING + SCREEN_BOX_WIDTH + 28;
  const targetX = labelStartX + SCREEN_TRANSITION_LANE_WIDTH;
  const width = SCREEN_CANVAS_PADDING * 2 + SCREEN_BOX_WIDTH + (targetGroups.length > 0 ? 28 + SCREEN_TRANSITION_LANE_WIDTH + SCREEN_TARGET_BOX_WIDTH : 0);
  const height = SCREEN_CANVAS_PADDING * 2 + contentHeight;
  const targets = [];
  let nextTargetY = SCREEN_CANVAS_PADDING + (contentHeight - targetStackHeight) / 2;
  targetGroups.forEach((target, index) => {
    const groupHeight = targetHeights[index] ?? SCREEN_TARGET_BOX_MIN_HEIGHT;
    const targetBoxY = nextTargetY + (groupHeight - SCREEN_TARGET_BOX_MIN_HEIGHT) / 2;
    const labelsHeight = target.actions.length * SCREEN_LABEL_PILL_HEIGHT + Math.max(0, target.actions.length - 1) * SCREEN_LABEL_PILL_GAP;
    const labelStartY = nextTargetY + (groupHeight - labelsHeight) / 2;
    const labelPills = target.actions.map((action, actionIndex) => ({
      action,
      x: labelStartX,
      y: labelStartY + actionIndex * (SCREEN_LABEL_PILL_HEIGHT + SCREEN_LABEL_PILL_GAP),
      width: SCREEN_LABEL_PILL_WIDTH,
      height: SCREEN_LABEL_PILL_HEIGHT
    }));
    targets.push({
      target,
      x: targetX,
      y: targetBoxY,
      width: SCREEN_TARGET_BOX_WIDTH,
      height: SCREEN_TARGET_BOX_MIN_HEIGHT,
      centerY: targetBoxY + SCREEN_TARGET_BOX_MIN_HEIGHT / 2,
      labelPills
    });
    nextTargetY += groupHeight + SCREEN_TARGET_BOX_GAP;
  });
  return {
    width,
    height,
    mainBoxHeight,
    mainBoxTop,
    targets
  };
}
function createScreenPreviewMainBox(data, height, top) {
  const box = document.createElement("div");
  box.className = "mdspec-screen-preview-box";
  box.style.position = "absolute";
  box.style.left = `${SCREEN_CANVAS_PADDING}px`;
  box.style.top = `${top}px`;
  box.style.width = `${SCREEN_BOX_WIDTH}px`;
  box.style.height = `${height}px`;
  box.style.border = `1px solid ${SCREEN_NODE_BORDER}`;
  box.style.borderRadius = `${SCREEN_BOX_RADIUS}px`;
  box.style.background = SCREEN_NODE_BG;
  box.style.boxShadow = SCREEN_TARGET_BOX_SHADOW;
  box.style.overflow = "hidden";
  box.style.color = SCREEN_TEXT;
  const header = document.createElement("header");
  header.style.padding = "10px 12px";
  header.style.borderBottom = `1px solid ${SCREEN_SECTION_DIVIDER}`;
  header.style.background = SCREEN_HEADER_BG;
  const kind = document.createElement("div");
  kind.style.fontSize = "var(--model-weave-font-size-small)";
  kind.style.textTransform = "uppercase";
  kind.style.letterSpacing = "0.08em";
  kind.style.color = SCREEN_MUTED_TEXT;
  kind.textContent = "screen";
  const title = document.createElement("div");
  title.style.fontWeight = "700";
  title.style.fontSize = "var(--model-weave-font-size-title)";
  title.style.lineHeight = "1.3";
  title.textContent = truncateScreenPreviewText(data.title, SCREEN_MAX_TITLE_CHARS);
  header.append(kind, title);
  box.appendChild(header);
  const body = document.createElement("div");
  body.style.display = "flex";
  body.style.flexDirection = "column";
  const blocks = data.blocks.length > 0 ? data.blocks : [{ label: "\u672A\u5206\u985E [unassigned]", items: [] }];
  blocks.forEach((block, index) => {
    const section = document.createElement("section");
    section.style.padding = `${SCREEN_SECTION_PADDING}px 12px ${SCREEN_SECTION_PADDING}px`;
    if (index > 0) {
      section.style.borderTop = `1px solid ${SCREEN_SECTION_DIVIDER}`;
    }
    const sectionHeading = document.createElement("div");
    sectionHeading.style.fontSize = "var(--model-weave-font-size-small)";
    sectionHeading.style.fontWeight = "600";
    sectionHeading.style.color = SCREEN_MUTED_TEXT;
    sectionHeading.style.marginBottom = "6px";
    sectionHeading.textContent = truncateScreenPreviewText(block.label, SCREEN_MAX_SECTION_CHARS);
    section.appendChild(sectionHeading);
    if (block.items.length === 0) {
      const empty = document.createElement("div");
      empty.style.fontSize = "var(--model-weave-font-size-small)";
      empty.style.color = SCREEN_MUTED_TEXT;
      empty.textContent = "None";
      section.appendChild(empty);
    } else {
      const list = document.createElement("ul");
      list.style.margin = "0";
      list.style.paddingLeft = "18px";
      list.style.fontSize = "var(--model-weave-font-size)";
      list.style.lineHeight = "1.45";
      for (const item of block.items) {
        const entry = document.createElement("li");
        entry.textContent = truncateScreenPreviewText(item.label, SCREEN_MAX_FIELD_CHARS);
        list.appendChild(entry);
      }
      section.appendChild(list);
    }
    body.appendChild(section);
  });
  box.appendChild(body);
  return box;
}
function createScreenPreviewTransitionSvg(scene) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", `${scene.width}`);
  svg.setAttribute("height", `${scene.height}`);
  svg.setAttribute("viewBox", `0 0 ${scene.width} ${scene.height}`);
  svg.style.position = "absolute";
  svg.style.left = "0";
  svg.style.top = "0";
  svg.style.overflow = "visible";
  svg.style.pointerEvents = "none";
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
  marker.setAttribute("id", "mdspec-screen-preview-arrow");
  marker.setAttribute("markerWidth", "10");
  marker.setAttribute("markerHeight", "10");
  marker.setAttribute("refX", "8");
  marker.setAttribute("refY", "5");
  marker.setAttribute("orient", "auto");
  marker.setAttribute("markerUnits", "userSpaceOnUse");
  const markerPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  markerPath.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
  markerPath.setAttribute("fill", SCREEN_ARROW_COLOR);
  marker.appendChild(markerPath);
  defs.appendChild(marker);
  svg.appendChild(defs);
  const sourceX = SCREEN_CANVAS_PADDING + SCREEN_BOX_WIDTH;
  const sourceY = scene.mainBoxTop + scene.mainBoxHeight / 2;
  for (const target of scene.targets) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", `${sourceX}`);
    line.setAttribute("y1", `${sourceY}`);
    line.setAttribute("x2", `${target.x}`);
    line.setAttribute("y2", `${target.centerY}`);
    line.setAttribute("stroke", SCREEN_ARROW_COLOR);
    line.setAttribute("stroke-width", "2");
    line.setAttribute("stroke-linecap", "round");
    line.setAttribute("marker-end", "url(#mdspec-screen-preview-arrow)");
    svg.appendChild(line);
  }
  return svg;
}
function createScreenPreviewTargetBox(target, options) {
  const box = document.createElement("div");
  box.className = "mdspec-screen-preview-target-box";
  box.style.position = "absolute";
  box.style.left = `${target.x}px`;
  box.style.top = `${target.y}px`;
  box.style.width = `${target.width}px`;
  box.style.height = `${target.height}px`;
  box.style.border = `1px solid ${target.target.unresolved ? SCREEN_UNRESOLVED_BORDER : SCREEN_NODE_BORDER}`;
  box.style.borderRadius = "10px";
  box.style.background = target.target.unresolved ? SCREEN_UNRESOLVED_BG : SCREEN_NODE_BG;
  box.style.boxShadow = SCREEN_TARGET_BOX_SHADOW;
  box.style.overflow = "hidden";
  box.style.color = SCREEN_TEXT;
  const header = document.createElement("header");
  header.style.padding = "8px 12px";
  header.style.borderBottom = `1px solid ${SCREEN_SECTION_DIVIDER}`;
  header.style.background = target.target.unresolved ? "#ffedd5" : SCREEN_HEADER_BG;
  header.style.minHeight = `${SCREEN_TARGET_BOX_HEADER_HEIGHT}px`;
  const kind = document.createElement("div");
  kind.style.fontSize = "var(--model-weave-font-size-small)";
  kind.style.textTransform = "uppercase";
  kind.style.letterSpacing = "0.08em";
  kind.style.color = SCREEN_MUTED_TEXT;
  kind.textContent = target.target.unresolved ? "unresolved screen" : "screen";
  const title = document.createElement("div");
  title.style.fontWeight = "700";
  title.style.fontSize = "var(--model-weave-font-size-large)";
  title.style.lineHeight = "1.3";
  title.textContent = truncateScreenPreviewText(target.target.targetLabel, SCREEN_MAX_SECTION_CHARS);
  if (target.target.targetTitle) {
    title.title = target.target.targetTitle;
  }
  header.append(kind, title);
  box.appendChild(header);
  const body = document.createElement("div");
  body.style.padding = "10px 12px";
  body.style.fontSize = "var(--model-weave-font-size-small)";
  body.style.color = SCREEN_MUTED_TEXT;
  body.style.display = "flex";
  body.style.flexDirection = "column";
  body.style.gap = "4px";
  if (target.target.selfTarget) {
    body.createEl("div", { text: "self transition" });
  } else if (target.target.unresolved) {
    body.createEl("div", { text: "transition target not resolved" });
  } else {
    body.createEl("div", { text: "Open target screen" });
  }
  if (target.target.actions.length > 1) {
    body.createEl("div", { text: `${target.target.actions.length} actions` });
  }
  box.appendChild(body);
  if (target.target.targetPath && options?.onOpenLinkedFile) {
    box.tabIndex = 0;
    box.style.cursor = "pointer";
    box.title = target.target.targetTitle || target.target.targetLabel;
    const openTarget = (openInNewLeaf) => {
      options.onOpenLinkedFile?.(target.target.targetPath, { openInNewLeaf });
    };
    box.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      openTarget(Boolean(event.metaKey || event.ctrlKey));
    };
    box.onauxclick = (event) => {
      if (event.button !== 1) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      openTarget(true);
    };
    box.onkeydown = (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        event.stopPropagation();
        openTarget(Boolean(event.ctrlKey || event.metaKey));
      }
    };
  }
  return box;
}
function createScreenPreviewActionPill(pill, onNavigateToLocation) {
  const element = document.createElement("button");
  element.type = "button";
  element.className = "mdspec-screen-preview-action-pill";
  element.style.position = "absolute";
  element.style.left = `${pill.x}px`;
  element.style.top = `${pill.y}px`;
  element.style.width = `${pill.width}px`;
  element.style.height = `${pill.height}px`;
  element.style.padding = `0 ${SCREEN_LABEL_PILL_PADDING_X}px`;
  element.style.border = `1px solid ${SCREEN_ARROW_LABEL_BORDER}`;
  element.style.borderRadius = "999px";
  element.style.background = SCREEN_ARROW_LABEL_BG;
  element.style.color = SCREEN_TEXT;
  element.style.boxShadow = "0 1px 4px rgba(15, 23, 42, 0.08)";
  element.style.fontSize = "var(--model-weave-font-size-small)";
  element.style.lineHeight = `${pill.height - 2}px`;
  element.style.whiteSpace = "nowrap";
  element.style.overflow = "hidden";
  element.style.textOverflow = "ellipsis";
  element.style.cursor = onNavigateToLocation && typeof pill.action.line === "number" ? "pointer" : "default";
  element.textContent = truncateScreenPreviewText(pill.action.label, 18);
  if (pill.action.title) {
    element.title = pill.action.title;
  }
  if (onNavigateToLocation && typeof pill.action.line === "number") {
    element.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      onNavigateToLocation({ line: pill.action.line, ch: pill.action.ch });
    };
    element.onkeydown = (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        event.stopPropagation();
        onNavigateToLocation({ line: pill.action.line, ch: pill.action.ch });
      }
    };
  } else {
    element.disabled = true;
  }
  return element;
}
function truncateScreenPreviewText(value, maxChars) {
  const normalized = value.trim();
  if (normalized.length <= maxChars) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, maxChars - 1))}\u2026`;
}
function renderDiagnostics(container, diagnostics, onOpenDiagnostic, getOpenState, setOpenState) {
  const notes = diagnostics.filter((diagnostic) => diagnostic.severity === "info");
  const warnings = diagnostics.filter((diagnostic) => diagnostic.severity === "warning");
  const errors = diagnostics.filter((diagnostic) => diagnostic.severity === "error");
  if (notes.length === 0 && warnings.length === 0 && errors.length === 0) {
    return;
  }
  if (notes.length > 0) {
    renderDiagnosticSection(
      container,
      "Notes",
      notes,
      onOpenDiagnostic,
      "var(--text-muted)",
      getOpenState,
      setOpenState
    );
  }
  if (warnings.length > 0) {
    renderDiagnosticSection(
      container,
      "Warnings",
      warnings,
      onOpenDiagnostic,
      "var(--text-warning)",
      getOpenState,
      setOpenState
    );
  }
  if (errors.length > 0) {
    renderDiagnosticSection(
      container,
      "Errors",
      errors,
      onOpenDiagnostic,
      "var(--text-error)",
      getOpenState,
      setOpenState
    );
  }
}
function renderDiagnosticSection(container, title, diagnostics, onOpenDiagnostic, color, getOpenState, setOpenState) {
  const details = container.createEl("details");
  details.className = "mdspec-diagnostic-section";
  const key = title.toLowerCase();
  details.open = getOpenState ? getOpenState(key, title !== "Notes") : title !== "Notes";
  if (setOpenState) {
    details.addEventListener("toggle", () => {
      setOpenState(key, details.open);
    });
  }
  details.style.fontSize = "var(--model-weave-font-size)";
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
var UNSUPPORTED_MESSAGE = "This file format is not supported. Supported formats: class / class_diagram / er_entity / er_diagram / dfd_object / dfd_diagram / data_object / app_process / screen / rule / codeset / message / mapping";
var DEPRECATED_ER_RELATION_MESSAGE = "This file format is not supported. Use er_entity with ## Relations instead of the legacy er_relation format.";
var DEPRECATED_DIAGRAM_MESSAGE = "This file format is not supported. Migrate legacy diagram_v1 files to class_diagram or er_diagram.";
var MARKDOWN_ONLY_NOTICE2 = "Template insertion is available only for Markdown files.";
var NON_EMPTY_FILE_NOTICE = "Current file is not empty. Template insertion is available only for empty files.";
var ER_RELATION_TYPE_NOTICE = "ER relation block insertion is available only for er_entity files.";
var ModelWeavePlugin = class extends import_obsidian6.Plugin {
  constructor() {
    super(...arguments);
    this.index = null;
    this.previewLeaf = null;
    this.rendererOverridesByFilePath = /* @__PURE__ */ new Map();
    this.settings = DEFAULT_MODEL_WEAVE_SETTINGS;
  }
  async onload() {
    this.settings = normalizeModelWeaveSettings(await this.loadData());
    this.registerView(
      MODELING_PREVIEW_VIEW_TYPE,
      (leaf) => new ModelingPreviewView(leaf, this.getViewerPreferences())
    );
    this.addSettingTab(new ModelWeaveSettingTab(this.app, this));
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
      id: "insert-data-object-file-layout-template",
      name: "Insert Data Object File Layout Template",
      callback: async () => {
        await this.insertTemplateIntoActiveFile("dataObjectFileLayout");
      }
    });
    this.addCommand({
      id: "insert-app-process-template",
      name: "Insert App Process Template",
      callback: async () => {
        await this.insertTemplateIntoActiveFile("appProcess");
      }
    });
    this.addCommand({
      id: "insert-screen-template",
      name: "Insert Screen Template",
      callback: async () => {
        await this.insertTemplateIntoActiveFile("screen");
      }
    });
    this.addCommand({
      id: "insert-codeset-template",
      name: "Insert CodeSet Template",
      callback: async () => {
        await this.insertTemplateIntoActiveFile("codeSet");
      }
    });
    this.addCommand({
      id: "insert-message-template",
      name: "Insert Message Template",
      callback: async () => {
        await this.insertTemplateIntoActiveFile("message");
      }
    });
    this.addCommand({
      id: "insert-rule-template",
      name: "Insert Rule Template",
      callback: async () => {
        await this.insertTemplateIntoActiveFile("rule");
      }
    });
    this.addCommand({
      id: "insert-mapping-template",
      name: "Insert Mapping Template",
      callback: async () => {
        await this.insertTemplateIntoActiveFile("mapping");
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
  }
  onunload() {
    if (this.previewLeaf) {
      this.previewLeaf.detach();
      this.previewLeaf = null;
    }
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
  getSettings() {
    return this.settings;
  }
  getViewerPreferences() {
    return {
      defaultZoom: this.settings.defaultZoom,
      fontSize: this.settings.fontSize,
      nodeDensity: this.settings.nodeDensity
    };
  }
  async updateSettings(partial, options) {
    this.settings = normalizeModelWeaveSettings({
      ...this.settings,
      ...partial
    });
    await this.saveData(this.settings);
    if (options?.refreshViews === false) {
      return;
    }
    await this.refreshOpenModelWeaveViews();
  }
  async refreshOpenModelWeaveViews() {
    const leaves = this.app.workspace.getLeavesOfType(MODELING_PREVIEW_VIEW_TYPE);
    for (const leaf of leaves) {
      await leaf.loadIfDeferred();
      const view = leaf.view;
      if (!(view instanceof ModelingPreviewView)) {
        continue;
      }
      view.applyViewerSettings(this.getViewerPreferences());
      const currentFilePath = view.getCurrentFilePath();
      if (!currentFilePath) {
        view.refreshForSettingsChange();
        continue;
      }
      const target = this.app.vault.getAbstractFileByPath(currentFilePath);
      if (target instanceof import_obsidian6.TFile) {
        await this.showPreviewForFile(target, leaf, false, "rerender");
      } else {
        view.refreshForSettingsChange();
      }
    }
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
    const isSupported = fileType === "object" || fileType === "er-entity" || fileType === "diagram" || fileType === "dfd-object" || fileType === "dfd-diagram" || fileType === "data-object" || fileType === "app-process" || fileType === "screen" || fileType === "rule" || fileType === "codeset" || fileType === "message" || fileType === "mapping";
    if (!previewLeaf && !openIfSupported) {
      return;
    }
    if (previewLeaf && reason === "external-file-open") {
      await previewLeaf.loadIfDeferred();
      const currentView = previewLeaf.view;
      if (currentView instanceof ModelingPreviewView && currentView.getCurrentFilePath() === file.path) {
        return;
      }
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
    view.applyViewerSettings(this.getViewerPreferences());
    if (!model) {
      view.updateContent({
        mode: "empty",
        message: await this.getEmptyStateMessage(file),
        warnings: []
      }, reason);
      return;
    }
    const fileType = detectFileType(model.frontmatter);
    const renderMode = this.resolveFileRenderMode(
      file.path,
      fileType,
      model.frontmatter,
      "kind" in model && typeof model.kind === "string" ? model.kind : null
    );
    const renderModeWarnings = renderMode.diagnostics;
    const rendererSelection = this.buildRendererSelectionState(
      file.path,
      renderMode,
      fileType,
      "kind" in model && typeof model.kind === "string" ? model.kind : null
    );
    switch (fileType) {
      case "object":
      case "er-entity": {
        const objectModel = model.fileType === "object" || model.fileType === "er-entity" ? model : null;
        const context = objectModel && this.index ? resolveObjectContext(objectModel, this.index) : null;
        const warnings = [
          ...this.index.warningsByFilePath[file.path] ?? [],
          ...renderModeWarnings,
          ...context?.warnings ?? []
        ];
        if (renderMode.actualRenderer === "mermaid" && context && !context.relatedObjects.some((entry) => entry.direction === "outgoing")) {
          warnings.push({
            code: "invalid-structure",
            message: "Mermaid overview: no outbound relations to display.",
            severity: "info",
            filePath: file.path,
            section: "Relations"
          });
        }
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
            rendererSelection,
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
        const warnings = [
          ...this.index.warningsByFilePath[file.path] ?? [],
          ...renderModeWarnings
        ];
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
            rendererSelection,
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
          ...renderModeWarnings,
          ...resolved?.warnings ?? []
        ];
        const diagnostics = resolved ? buildCurrentDiagramDiagnostics(resolved, warnings) : warnings;
        view.updateContent(
          resolved ? {
            mode: "diagram",
            diagram: resolved,
            warnings: diagnostics,
            rendererSelection,
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
          ...renderModeWarnings,
          ...resolved?.warnings ?? []
        ];
        const diagnostics = resolved ? buildCurrentDiagramDiagnostics(resolved, warnings) : warnings;
        view.updateContent(
          resolved ? {
            mode: "diagram",
            diagram: resolved,
            warnings: diagnostics,
            rendererSelection,
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
      case "data-object": {
        const warnings = [
          ...this.index.warningsByFilePath[file.path] ?? [],
          ...renderModeWarnings
        ];
        if (model.fileType === "data-object") {
          const diagnostics = buildCurrentObjectDiagnostics(
            model,
            this.index,
            null,
            warnings
          );
          view.updateContent({
            mode: "summary",
            rendererSelection,
            filePath: model.path,
            title: model.name || model.id || this.getPathBasename(model.path),
            metadata: [
              { label: "type", value: "data_object" },
              { label: "id", value: model.id || "(missing)" },
              { label: "name", value: model.name || "(missing)" },
              ...model.kind ? [{ label: "kind", value: model.kind }] : [],
              ...model.dataFormat ? [{ label: "data_format", value: model.dataFormat }] : [],
              { label: "path", value: model.path }
            ],
            sections: this.describeDataObjectSections(model, file.path),
            counts: [
              { label: "Format entries", value: model.formatEntries.length },
              { label: "Records", value: model.records.length },
              { label: "Fields", value: model.fields.length }
            ],
            tables: this.buildDataObjectSummaryTables(model, file.path),
            message: "data_object is a supported Model Weave type. Use the Markdown editor as the source of truth; this preview shows diagnostics and detected structure.",
            warnings: diagnostics,
            onNavigateToLocation: (location) => {
              void this.openFileLocation(file.path, location.line, location.ch ?? 0);
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
      case "app-process": {
        const warnings = [
          ...this.index.warningsByFilePath[file.path] ?? [],
          ...renderModeWarnings
        ];
        if (model.fileType === "app-process") {
          const diagnostics = buildCurrentObjectDiagnostics(
            model,
            this.index,
            null,
            warnings
          );
          view.updateContent({
            mode: "summary",
            rendererSelection,
            filePath: model.path,
            title: model.name || model.id || this.getPathBasename(model.path),
            metadata: [
              { label: "type", value: "app_process" },
              { label: "id", value: model.id || "(missing)" },
              { label: "name", value: model.name || "(missing)" },
              ...model.kind ? [{ label: "kind", value: model.kind }] : [],
              { label: "path", value: model.path }
            ],
            sections: this.describeAppProcessSections(model, file.path),
            counts: [
              { label: "Triggers", value: model.triggers.length },
              { label: "Inputs", value: model.inputs.length },
              { label: "Outputs", value: model.outputs.length },
              { label: "Transitions", value: model.transitions.length }
            ],
            tables: this.buildAppProcessSummaryTables(model, file.path),
            message: "app_process is a supported Model Weave type. Use the Markdown editor as the source of truth; this preview shows diagnostics and detected structure.",
            warnings: diagnostics,
            onNavigateToLocation: (location) => {
              void this.openFileLocation(file.path, location.line, location.ch ?? 0);
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
      case "screen": {
        const warnings = [
          ...this.index.warningsByFilePath[file.path] ?? [],
          ...renderModeWarnings
        ];
        if (model.fileType === "screen") {
          const diagnostics = buildCurrentObjectDiagnostics(
            model,
            this.index,
            null,
            warnings
          );
          const localProcesses = model.localProcesses.length > 0 ? model.localProcesses.map((process) => ({
            label: process.heading,
            line: process.line,
            ch: 0
          })) : this.collectScreenLocalProcesses(file.path);
          const invokedProcesses = this.collectScreenInvokedProcesses(model);
          const outgoingScreens = this.collectScreenOutgoingScreens(model);
          const screenPreviewTransitions = this.buildScreenPreviewTransitions(model);
          view.updateContent({
            mode: "summary",
            rendererSelection,
            filePath: model.path,
            title: model.name || model.id || this.getPathBasename(model.path),
            metadata: [
              { label: "type", value: "screen" },
              { label: "id", value: model.id || "(missing)" },
              { label: "name", value: model.name || "(missing)" },
              ...model.screenType ? [{ label: "screen_type", value: model.screenType }] : [],
              { label: "path", value: model.path }
            ],
            sections: this.describeScreenSections(model, file.path),
            counts: [
              { label: "Layouts", value: model.layouts.length },
              { label: "Fields", value: model.fields.length },
              { label: "Actions", value: model.actions.length },
              { label: "Messages", value: model.messages.length },
              {
                label: "Local Processes",
                value: localProcesses.length
              },
              { label: "Invoked Processes", value: invokedProcesses.length },
              { label: "Outgoing Screens", value: outgoingScreens.length }
            ],
            tables: this.buildScreenSummaryTables(model, file.path),
            layoutBlocks: this.buildScreenLayoutBlocks(model),
            screenPreviewTransitions,
            localProcesses,
            navigationLists: [
              { title: "Invoked Processes", items: invokedProcesses },
              { title: "Outgoing Screens", items: outgoingScreens }
            ],
            message: "screen is a supported Model Weave type. Use the Markdown editor as the source of truth; this preview shows diagnostics and detected structure.",
            warnings: diagnostics,
            onNavigateToLocation: (location) => {
              void this.openFileLocation(file.path, location.line, location.ch ?? 0);
            },
            onOpenLinkedFile: (targetPath, navigation) => {
              void this.openReferencedFile(
                targetPath,
                navigation?.openInNewLeaf ?? false
              );
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
      case "codeset": {
        const warnings = [
          ...this.index.warningsByFilePath[file.path] ?? [],
          ...renderModeWarnings
        ];
        if (model.fileType === "codeset") {
          const diagnostics = buildCurrentObjectDiagnostics(
            model,
            this.index,
            null,
            warnings
          );
          view.updateContent({
            mode: "summary",
            rendererSelection,
            filePath: model.path,
            title: model.name || model.id || this.getPathBasename(model.path),
            metadata: [
              { label: "type", value: "codeset" },
              { label: "id", value: model.id || "(missing)" },
              { label: "name", value: model.name || "(missing)" },
              ...model.kind ? [{ label: "kind", value: model.kind }] : [],
              { label: "path", value: model.path }
            ],
            sections: this.describeCodeSetSections(model, file.path),
            counts: [{ label: "Values", value: model.values.length }],
            textSections: [
              ...model.summary?.trim() ? [{ title: "Summary", lines: [model.summary.trim()] }] : [],
              ...(model.notes ?? []).length > 0 ? [{ title: "Notes", lines: model.notes ?? [] }] : []
            ],
            tables: this.buildCodeSetSummaryTables(file.path),
            message: "codeset is a supported Model Weave type. Use the Markdown editor as the source of truth; this preview shows diagnostics and detected structure.",
            warnings: diagnostics,
            onNavigateToLocation: (location) => {
              void this.openFileLocation(file.path, location.line, location.ch ?? 0);
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
      case "message": {
        const warnings = [
          ...this.index.warningsByFilePath[file.path] ?? [],
          ...renderModeWarnings
        ];
        if (model.fileType === "message") {
          const diagnostics = buildCurrentObjectDiagnostics(
            model,
            this.index,
            null,
            warnings
          );
          view.updateContent({
            mode: "summary",
            rendererSelection,
            filePath: model.path,
            title: model.name || model.id || this.getPathBasename(model.path),
            metadata: [
              { label: "type", value: "message" },
              { label: "id", value: model.id || "(missing)" },
              { label: "name", value: model.name || "(missing)" },
              ...model.kind ? [{ label: "kind", value: model.kind }] : [],
              { label: "path", value: model.path }
            ],
            sections: this.describeMessageSections(model, file.path),
            counts: [{ label: "Messages", value: model.messages.length }],
            textSections: [
              ...model.summary?.trim() ? [{ title: "Summary", lines: [model.summary.trim()] }] : [],
              ...(model.notes ?? []).length > 0 ? [{ title: "Notes", lines: model.notes ?? [] }] : []
            ],
            tables: this.buildMessageSummaryTables(file.path),
            message: "message is a supported Model Weave type. Use the Markdown editor as the source of truth; this preview shows diagnostics and detected structure.",
            warnings: diagnostics,
            onNavigateToLocation: (location) => {
              void this.openFileLocation(file.path, location.line, location.ch ?? 0);
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
      case "rule": {
        const warnings = [
          ...this.index.warningsByFilePath[file.path] ?? [],
          ...renderModeWarnings
        ];
        if (model.fileType === "rule") {
          const diagnostics = buildCurrentObjectDiagnostics(
            model,
            this.index,
            null,
            warnings
          );
          view.updateContent({
            mode: "summary",
            rendererSelection,
            filePath: model.path,
            title: model.name || model.id || this.getPathBasename(model.path),
            metadata: [
              { label: "type", value: "rule" },
              { label: "id", value: model.id || "(missing)" },
              { label: "name", value: model.name || "(missing)" },
              ...model.kind ? [{ label: "kind", value: model.kind }] : [],
              { label: "path", value: model.path }
            ],
            sections: this.describeRuleSections(model, file.path),
            counts: [
              { label: "Inputs", value: model.inputs.length },
              { label: "References", value: model.references.length },
              { label: "Messages", value: model.messages.length }
            ],
            tables: this.buildRuleSummaryTables(model, file.path),
            message: "rule is a supported Model Weave type. Use the Markdown editor as the source of truth; this preview shows diagnostics and detected structure.",
            warnings: diagnostics,
            onNavigateToLocation: (location) => {
              void this.openFileLocation(file.path, location.line, location.ch ?? 0);
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
      case "mapping": {
        const warnings = [
          ...this.index.warningsByFilePath[file.path] ?? [],
          ...renderModeWarnings
        ];
        if (model.fileType === "mapping") {
          const diagnostics = buildCurrentObjectDiagnostics(
            model,
            this.index,
            null,
            warnings
          );
          view.updateContent({
            mode: "summary",
            rendererSelection,
            filePath: model.path,
            title: model.name || model.id || this.getPathBasename(model.path),
            metadata: [
              { label: "type", value: "mapping" },
              { label: "id", value: model.id || "(missing)" },
              { label: "name", value: model.name || "(missing)" },
              ...model.kind ? [{ label: "kind", value: model.kind }] : [],
              ...model.source ? [{ label: "source", value: this.formatReferenceDisplay(model.source) }] : [],
              ...model.target ? [{ label: "target", value: this.formatReferenceDisplay(model.target) }] : [],
              { label: "path", value: model.path }
            ],
            sections: this.describeMappingSections(model, file.path),
            counts: [
              { label: "Scope", value: model.scope.length },
              { label: "Mappings", value: model.mappings.length }
            ],
            tables: this.buildMappingSummaryTables(file.path),
            message: "mapping is a supported Model Weave type. Use the Markdown editor as the source of truth; this preview shows diagnostics and detected structure.",
            warnings: diagnostics,
            onNavigateToLocation: (location) => {
              void this.openFileLocation(file.path, location.line, location.ch ?? 0);
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
  describeDataObjectSections(model, filePath) {
    const lines = this.getFileLines(filePath);
    const sections = [];
    const orderedKeys = ["Summary", "Format", "Records", "Fields", "Notes"];
    for (const key of orderedKeys) {
      if (!(key in model.sections)) {
        continue;
      }
      const line = this.findHeadingLine(lines, key);
      if (key === "Format") {
        sections.push({ label: `Format: ${model.formatEntries.length} rows`, line, ch: 0 });
      } else if (key === "Records") {
        sections.push({ label: `Records: ${model.records.length} rows`, line, ch: 0 });
      } else if (key === "Fields") {
        sections.push({ label: `Fields: ${model.fields.length} rows`, line, ch: 0 });
      } else {
        sections.push({ label: key, line, ch: 0 });
      }
    }
    return sections;
  }
  buildDataObjectSummaryTables(model, filePath) {
    const formatRows = this.readTableRows(filePath, "Format");
    const recordRows = this.readTableRows(filePath, "Records");
    const fieldRows = this.readTableRows(filePath, "Fields");
    const tables = [];
    if (model.formatEntries.length > 0) {
      tables.push({
        title: "Format Summary",
        columns: ["key", "value", "notes"],
        rows: formatRows.map((row) => ({
          cells: [row.record.key ?? "", row.record.value ?? "", row.record.notes ?? ""],
          line: row.line,
          ch: row.ch
        }))
      });
    }
    if (model.records.length > 0) {
      tables.push({
        title: "Records Summary",
        columns: ["record_type", "name", "occurrence", "notes"],
        rows: recordRows.map((row) => ({
          cells: [
            row.record.record_type ?? "",
            row.record.name ?? "",
            row.record.occurrence ?? "",
            row.record.notes ?? ""
          ],
          line: row.line,
          ch: row.ch
        }))
      });
    }
    if (model.fieldMode === "file_layout") {
      tables.push({
        title: "Fields Summary",
        columns: ["record_type", "no", "name", "label", "type", "length", "position", "field_format", "ref", "notes"],
        rows: fieldRows.map((row) => ({
          cells: [
            row.record.record_type ?? "",
            row.record.no ?? "",
            row.record.name ?? "",
            row.record.label ?? "",
            row.record.type ?? "",
            row.record.length ?? "",
            row.record.position ?? "",
            row.record.field_format ?? "",
            this.formatReferenceDisplay(row.record.ref),
            row.record.notes ?? ""
          ],
          line: row.line,
          ch: row.ch
        }))
      });
    } else {
      tables.push({
        title: "Fields Summary",
        columns: ["name", "label", "type", "length", "required", "ref", "notes"],
        rows: fieldRows.map((row) => ({
          cells: [
            row.record.name ?? "",
            row.record.label ?? "",
            row.record.type ?? "",
            row.record.length ?? "",
            row.record.required ?? "",
            this.formatReferenceDisplay(row.record.ref),
            row.record.notes ?? ""
          ],
          line: row.line,
          ch: row.ch
        }))
      });
    }
    return tables;
  }
  getPathBasename(path) {
    const slashNormalized = path.replace(/\\/g, "/");
    const lastSegment = slashNormalized.split("/").pop() ?? slashNormalized;
    return lastSegment.replace(/\.md$/i, "");
  }
  describeScreenSections(model, filePath) {
    const lines = this.getFileLines(filePath);
    const sections = [];
    const orderedKeys = [
      "Summary",
      "Layout",
      "Fields",
      "Actions",
      "Messages",
      "Notes",
      "Local Processes",
      "Transitions"
    ];
    for (const key of orderedKeys) {
      if (!(key in model.sections)) {
        continue;
      }
      const line = this.findHeadingLine(lines, key);
      if (key === "Layout") {
        sections.push({ label: `Layout: ${model.layouts.length} rows`, line, ch: 0 });
      } else if (key === "Fields") {
        sections.push({ label: `Fields: ${model.fields.length} rows`, line, ch: 0 });
      } else if (key === "Actions") {
        sections.push({ label: `Actions: ${model.actions.length} rows`, line, ch: 0 });
      } else if (key === "Messages") {
        sections.push({ label: `Messages: ${model.messages.length} rows`, line, ch: 0 });
      } else if (key === "Local Processes") {
        sections.push({
          label: model.localProcesses.length > 0 ? `Local Processes: ${model.localProcesses.length} headings` : "Local Processes",
          line,
          ch: 0
        });
      } else if (key === "Transitions") {
        sections.push({
          label: model.legacyTransitions.length > 0 ? `Transitions (legacy): ${model.legacyTransitions.length} rows` : "Transitions (legacy)",
          line,
          ch: 0
        });
      } else {
        sections.push({ label: key, line, ch: 0 });
      }
    }
    return sections;
  }
  describeAppProcessSections(model, filePath) {
    const lines = this.getFileLines(filePath);
    const sections = [];
    const orderedKeys = [
      "Summary",
      "Triggers",
      "Inputs",
      "Steps",
      "Outputs",
      "Transitions",
      "Errors",
      "Notes"
    ];
    for (const key of orderedKeys) {
      if (!(key in model.sections)) {
        continue;
      }
      const line = this.findHeadingLine(lines, key);
      if (key === "Inputs") {
        sections.push({ label: `Inputs: ${model.inputs.length} rows`, line, ch: 0 });
      } else if (key === "Outputs") {
        sections.push({ label: `Outputs: ${model.outputs.length} rows`, line, ch: 0 });
      } else if (key === "Triggers") {
        sections.push({ label: `Triggers: ${model.triggers.length} rows`, line, ch: 0 });
      } else if (key === "Transitions") {
        sections.push({ label: `Transitions: ${model.transitions.length} rows`, line, ch: 0 });
      } else {
        sections.push({ label: key, line, ch: 0 });
      }
    }
    return sections;
  }
  describeCodeSetSections(model, filePath) {
    const lines = this.getFileLines(filePath);
    const orderedKeys = ["Summary", "Values", "Notes"];
    const sections = [];
    for (const key of orderedKeys) {
      if (!(key in model.sections)) {
        continue;
      }
      const line = this.findHeadingLine(lines, key);
      if (key === "Values") {
        sections.push({ label: `Values: ${model.values.length} rows`, line, ch: 0 });
      } else {
        sections.push({ label: key, line, ch: 0 });
      }
    }
    return sections;
  }
  describeMessageSections(model, filePath) {
    const lines = this.getFileLines(filePath);
    const orderedKeys = ["Summary", "Messages", "Notes"];
    const sections = [];
    for (const key of orderedKeys) {
      if (!(key in model.sections)) {
        continue;
      }
      const line = this.findHeadingLine(lines, key);
      if (key === "Messages") {
        sections.push({ label: `Messages: ${model.messages.length} rows`, line, ch: 0 });
      } else {
        sections.push({ label: key, line, ch: 0 });
      }
    }
    return sections;
  }
  describeRuleSections(model, filePath) {
    const lines = this.getFileLines(filePath);
    const orderedKeys = ["Summary", "Inputs", "References", "Conditions", "Messages", "Notes"];
    const sections = [];
    for (const key of orderedKeys) {
      if (!(key in model.sections)) {
        continue;
      }
      const line = this.findHeadingLine(lines, key);
      if (key === "Inputs") {
        sections.push({ label: `Inputs: ${model.inputs.length} rows`, line, ch: 0 });
      } else if (key === "References") {
        sections.push({ label: `References: ${model.references.length} rows`, line, ch: 0 });
      } else if (key === "Messages") {
        sections.push({ label: `Messages: ${model.messages.length} rows`, line, ch: 0 });
      } else {
        sections.push({ label: key, line, ch: 0 });
      }
    }
    return sections;
  }
  describeMappingSections(model, filePath) {
    const lines = this.getFileLines(filePath);
    const orderedKeys = ["Summary", "Scope", "Mappings", "Rules", "Notes"];
    const sections = [];
    for (const key of orderedKeys) {
      if (!(key in model.sections)) {
        continue;
      }
      const line = this.findHeadingLine(lines, key);
      if (key === "Scope") {
        sections.push({ label: `Scope: ${model.scope.length} rows`, line, ch: 0 });
      } else if (key === "Mappings") {
        sections.push({ label: `Mappings: ${model.mappings.length} rows`, line, ch: 0 });
      } else {
        sections.push({ label: key, line, ch: 0 });
      }
    }
    return sections;
  }
  buildScreenSummaryTables(model, filePath) {
    const layoutRows = this.readTableRows(filePath, "Layout");
    const fieldsRows = this.readTableRows(filePath, "Fields");
    const actionsRows = this.readTableRows(filePath, "Actions");
    const messagesRows = this.readTableRows(filePath, "Messages");
    const tables = [
      {
        title: "Layout Summary",
        columns: ["id", "label", "kind", "purpose", "notes"],
        rows: layoutRows.map((row) => ({
          cells: [
            row.record.id ?? "",
            row.record.label ?? "",
            row.record.kind ?? "",
            row.record.purpose ?? "",
            row.record.notes ?? ""
          ],
          line: row.line,
          ch: row.ch
        }))
      },
      {
        title: "Fields Summary",
        columns: ["id", "label", "kind", "layout", "ref", "notes"],
        rows: fieldsRows.map((row) => ({
          cells: [
            row.record.id ?? "",
            row.record.label ?? "",
            row.record.kind ?? "",
            row.record.layout ?? "",
            this.formatReferenceDisplay(row.record.ref),
            row.record.notes ?? ""
          ],
          line: row.line,
          ch: row.ch
        }))
      },
      {
        title: "Actions Summary",
        columns: ["id", "label", "target", "event", "invoke", "transition", "notes"],
        rows: actionsRows.map((row) => ({
          cells: [
            row.record.id ?? "",
            row.record.label ?? "",
            row.record.target ?? "",
            row.record.event ?? "",
            this.formatReferenceDisplay(row.record.invoke),
            this.formatReferenceDisplay(row.record.transition),
            row.record.notes ?? ""
          ],
          line: row.line,
          ch: row.ch
        }))
      }
    ];
    if (model.messages.length > 0) {
      tables.push({
        title: "Messages Summary",
        columns: ["id", "text", "severity", "timing", "notes"],
        rows: messagesRows.map((row) => ({
          cells: [
            row.record.id ?? "",
            this.formatReferenceDisplay(row.record.text),
            row.record.severity ?? "",
            row.record.timing ?? "",
            row.record.notes ?? ""
          ],
          line: row.line,
          ch: row.ch
        }))
      });
    }
    return tables;
  }
  collectScreenInvokedProcesses(model) {
    const seen = /* @__PURE__ */ new Set();
    const items = [];
    for (const action of model.actions) {
      const invoke = action.invoke?.trim();
      if (!invoke) {
        continue;
      }
      const display = this.formatReferenceDisplay(invoke);
      const key = `${action.label?.trim() ?? ""}|${display}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      items.push({
        label: `${action.label?.trim() || "(action)"} -> ${display}`,
        line: action.rowLine,
        ch: 0
      });
    }
    return items;
  }
  collectScreenOutgoingScreens(model) {
    const seen = /* @__PURE__ */ new Set();
    const items = [];
    for (const action of model.actions) {
      const transition = action.transition?.trim();
      if (!transition) {
        continue;
      }
      const display = this.formatReferenceDisplay(transition);
      const key = `${action.label?.trim() ?? ""}|${display}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      items.push({
        label: `${action.label?.trim() || "(action)"} -> ${display}`,
        line: action.rowLine,
        ch: 0
      });
    }
    return items;
  }
  resolveFileRenderMode(filePath, fileType, frontmatter, modelKind = null) {
    return resolveRenderMode({
      filePath,
      formatType: fileType,
      modelKind: modelKind ?? (typeof frontmatter.kind === "string" ? frontmatter.kind : null),
      toolbarOverride: this.rendererOverridesByFilePath.get(filePath) ?? null,
      frontmatterRenderMode: frontmatter.render_mode,
      settingsDefaultRenderMode: this.settings.defaultRenderMode
    });
  }
  buildRendererSelectionState(filePath, resolved, fileType, modelKind) {
    const supportedModes = getSupportedRenderModes(fileType, modelKind);
    const visibleSelectedMode = supportedModes.includes(resolved.selectedMode) ? resolved.selectedMode : "auto";
    return {
      selectedMode: resolved.selectedMode,
      visibleSelectedMode,
      supportedModes,
      effectiveMode: resolved.effectiveMode,
      actualRenderer: resolved.actualRenderer,
      source: resolved.source,
      fallbackReason: resolved.fallbackReason,
      onSelectMode: (mode) => {
        if (mode === "auto") {
          this.rendererOverridesByFilePath.delete(filePath);
        } else {
          this.rendererOverridesByFilePath.set(filePath, mode);
        }
        void this.syncPreviewToActiveFile(false, "rerender");
      }
    };
  }
  buildScreenPreviewTransitions(model) {
    const groups = /* @__PURE__ */ new Map();
    for (const action of model.actions) {
      const transition = action.transition?.trim();
      if (!transition) {
        continue;
      }
      const labelInfo = this.buildScreenActionPreviewLabel(action);
      const resolved = this.index ? resolveReferenceIdentity(transition, this.index) : { resolvedModel: null };
      const resolvedModel = resolved.resolvedModel?.fileType === "screen" ? resolved.resolvedModel : null;
      const targetPath = resolvedModel?.path;
      const targetLabel = resolvedModel?.name?.trim() || resolvedModel?.id?.trim() || this.formatReferenceDisplay(transition) || transition;
      const targetTitle = targetPath ? `${targetLabel}
${targetPath}` : `${targetLabel}
${transition}`;
      const key = targetPath ? `path:${targetPath}` : `raw:${transition}`;
      const group = groups.get(key) ?? {
        key,
        targetLabel,
        targetTitle,
        targetPath,
        unresolved: !targetPath,
        selfTarget: targetPath === model.path,
        actions: []
      };
      group.actions.push({
        label: labelInfo.shortLabel,
        fullLabel: labelInfo.fullLabel,
        title: [
          labelInfo.fullLabel,
          action.id?.trim() ? `id: ${action.id.trim()}` : "",
          action.target?.trim() ? `target: ${action.target.trim()}` : "",
          action.event?.trim() ? `event: ${action.event.trim()}` : "",
          `transition: ${targetLabel}`
        ].filter(Boolean).join("\n"),
        line: action.rowLine,
        ch: 0
      });
      groups.set(key, group);
    }
    return [...groups.values()];
  }
  buildScreenActionPreviewLabel(action) {
    const label = action.label?.trim();
    if (label) {
      return { shortLabel: label, fullLabel: label };
    }
    const id = action.id?.trim();
    if (id) {
      return { shortLabel: id, fullLabel: id };
    }
    const target = action.target?.trim();
    const event = action.event?.trim();
    if (target && event) {
      const fullLabel = `${target}.${event}`;
      return { shortLabel: fullLabel, fullLabel };
    }
    if (event) {
      return { shortLabel: event, fullLabel: event };
    }
    return { shortLabel: "(action)", fullLabel: "(action)" };
  }
  buildScreenLayoutBlocks(model) {
    const layoutMap = new Map(
      model.layouts.map((layout) => [layout.id.trim(), layout]).filter(([layoutId]) => Boolean(layoutId))
    );
    const fieldsByLayout = /* @__PURE__ */ new Map();
    const ungrouped = [];
    for (const field of model.fields) {
      const item = {
        label: field.label?.trim() || field.id,
        line: field.rowLine,
        ch: 0
      };
      const layoutId = field.layout?.trim();
      if (!layoutId || !layoutMap.has(layoutId)) {
        ungrouped.push(item);
        continue;
      }
      const group = fieldsByLayout.get(layoutId) ?? [];
      group.push(item);
      fieldsByLayout.set(layoutId, group);
    }
    const blocks = model.layouts.map((layout) => ({
      label: layout.label?.trim() ? `${layout.label.trim()} [${layout.id}]` : `[${layout.id}]`,
      subtitle: [layout.kind?.trim(), layout.purpose?.trim()].filter(Boolean).join(" / ") || void 0,
      line: layout.rowLine,
      ch: 0,
      items: fieldsByLayout.get(layout.id.trim()) ?? []
    }));
    if (ungrouped.length > 0) {
      blocks.push({
        label: "\u672A\u5206\u985E [unassigned]",
        subtitle: "layout \u672A\u6307\u5B9A\u307E\u305F\u306F\u672A\u5B9A\u7FA9",
        line: void 0,
        ch: 0,
        items: ungrouped
      });
    }
    return blocks;
  }
  buildAppProcessSummaryTables(model, filePath) {
    const inputRows = this.readTableRows(filePath, "Inputs");
    const outputRows = this.readTableRows(filePath, "Outputs");
    const triggerRows = this.readTableRows(filePath, "Triggers");
    const transitionRows = this.readTableRows(filePath, "Transitions");
    const tables = [];
    if (model.triggers.length > 0) {
      tables.push({
        title: "Triggers Summary",
        columns: ["id", "kind", "source", "event", "notes"],
        rows: triggerRows.map((row) => ({
          cells: [
            row.record.id ?? "",
            row.record.kind ?? "",
            this.formatReferenceDisplay(row.record.source),
            row.record.event ?? "",
            row.record.notes ?? ""
          ],
          line: row.line,
          ch: row.ch
        }))
      });
    }
    tables.push({
      title: "Inputs Summary",
      columns: ["id", "data", "source", "required", "notes"],
      rows: inputRows.map((row) => ({
        cells: [
          row.record.id ?? "",
          this.formatReferenceDisplay(row.record.data),
          this.formatReferenceDisplay(row.record.source),
          row.record.required ?? "",
          row.record.notes ?? ""
        ],
        line: row.line,
        ch: row.ch
      }))
    });
    tables.push({
      title: "Outputs Summary",
      columns: ["id", "data", "target", "notes"],
      rows: outputRows.map((row) => ({
        cells: [
          row.record.id ?? "",
          this.formatReferenceDisplay(row.record.data),
          this.formatReferenceDisplay(row.record.target),
          row.record.notes ?? ""
        ],
        line: row.line,
        ch: row.ch
      }))
    });
    if (model.transitions.length > 0) {
      tables.push({
        title: "Transitions Summary",
        columns: ["id", "event", "to", "condition", "notes"],
        rows: transitionRows.map((row) => ({
          cells: [
            row.record.id ?? "",
            row.record.event ?? "",
            this.formatReferenceDisplay(row.record.to),
            row.record.condition ?? "",
            row.record.notes ?? ""
          ],
          line: row.line,
          ch: row.ch
        }))
      });
    }
    return tables;
  }
  buildCodeSetSummaryTables(filePath) {
    const valueRows = this.readTableRows(filePath, "Values");
    return [
      {
        title: "Values Summary",
        columns: ["code", "label", "sort_order", "active", "notes"],
        rows: valueRows.map((row) => ({
          cells: [
            row.record.code ?? "",
            row.record.label ?? "",
            row.record.sort_order ?? "",
            row.record.active ?? "",
            row.record.notes ?? ""
          ],
          line: row.line,
          ch: row.ch
        }))
      }
    ];
  }
  buildMessageSummaryTables(filePath) {
    const messageRows = this.readTableRows(filePath, "Messages");
    return [
      {
        title: "Messages Summary",
        columns: ["message_id", "text", "severity", "timing", "audience", "active", "notes"],
        rows: messageRows.map((row) => ({
          cells: [
            row.record.message_id ?? "",
            row.record.text ?? "",
            row.record.severity ?? "",
            row.record.timing ?? "",
            row.record.audience ?? "",
            row.record.active ?? "",
            row.record.notes ?? ""
          ],
          line: row.line,
          ch: row.ch
        }))
      }
    ];
  }
  buildRuleSummaryTables(model, filePath) {
    const inputRows = this.readTableRows(filePath, "Inputs");
    const referenceRows = this.readTableRows(filePath, "References");
    const messageRows = this.readTableRows(filePath, "Messages");
    const tables = [
      {
        title: "Inputs Summary",
        columns: ["id", "data", "source", "required", "notes"],
        rows: inputRows.map((row) => ({
          cells: [
            row.record.id ?? "",
            this.formatReferenceDisplay(row.record.data),
            this.formatReferenceDisplay(row.record.source),
            row.record.required ?? "",
            row.record.notes ?? ""
          ],
          line: row.line,
          ch: row.ch
        }))
      },
      {
        title: "References Summary",
        columns: ["ref", "usage", "notes"],
        rows: referenceRows.map((row) => ({
          cells: [
            this.formatReferenceDisplay(row.record.ref),
            row.record.usage ?? "",
            row.record.notes ?? ""
          ],
          line: row.line,
          ch: row.ch
        }))
      }
    ];
    if (model.messages.length > 0) {
      tables.push({
        title: "Messages Summary",
        columns: ["severity", "message", "condition", "notes"],
        rows: messageRows.map((row) => ({
          cells: [
            row.record.severity ?? "",
            this.formatReferenceDisplay(row.record.message),
            row.record.condition ?? "",
            row.record.notes ?? ""
          ],
          line: row.line,
          ch: row.ch
        }))
      });
    }
    return tables;
  }
  buildMappingSummaryTables(filePath) {
    const scopeRows = this.readTableRows(filePath, "Scope");
    const mappingRows = this.readTableRows(filePath, "Mappings");
    return [
      {
        title: "Scope Summary",
        columns: ["role", "ref", "notes"],
        rows: scopeRows.map((row) => ({
          cells: [
            row.record.role ?? "",
            this.formatReferenceDisplay(row.record.ref),
            row.record.notes ?? ""
          ],
          line: row.line,
          ch: row.ch
        }))
      },
      {
        title: "Mappings Summary",
        columns: ["target_ref", "source_ref", "transform", "rule", "required", "notes"],
        rows: mappingRows.map((row) => ({
          cells: [
            this.formatReferenceDisplay(row.record.target_ref),
            this.formatReferenceDisplay(row.record.source_ref),
            row.record.transform ?? "",
            this.formatReferenceDisplay(row.record.rule),
            row.record.required ?? "",
            row.record.notes ?? ""
          ],
          line: row.line,
          ch: row.ch
        }))
      }
    ];
  }
  collectScreenLocalProcesses(filePath) {
    const lines = this.getFileLines(filePath);
    const sectionLine = this.findHeadingLine(lines, "Local Processes");
    if (sectionLine === void 0) {
      return [];
    }
    const results = [];
    for (let index = sectionLine + 1; index < lines.length; index += 1) {
      const line = lines[index] ?? "";
      const trimmed = line.trim();
      if (/^##\s+/.test(trimmed)) {
        break;
      }
      const match = trimmed.match(/^###\s+(.+)$/);
      if (!match) {
        continue;
      }
      results.push({
        label: match[1].trim(),
        line: index,
        ch: Math.max(0, line.indexOf("###"))
      });
    }
    return results;
  }
  formatReferenceDisplay(value) {
    const trimmed = value?.trim();
    if (!trimmed) {
      return "";
    }
    const qualified = parseQualifiedRef(trimmed);
    if (qualified?.hasMemberRef) {
      const baseLabel = this.formatBaseReferenceDisplay(qualified.baseRefRaw);
      return qualified.memberRef ? `${baseLabel}.${qualified.memberRef}` : baseLabel;
    }
    return this.formatBaseReferenceDisplay(trimmed);
  }
  formatBaseReferenceDisplay(value) {
    const parsed = parseReferenceValue(value);
    if (!parsed) {
      return value;
    }
    if (parsed.display?.trim()) {
      return parsed.display.trim();
    }
    if (parsed.target?.trim()) {
      return this.getPathBasename(parsed.target.trim());
    }
    return parsed.raw || value;
  }
  getFileLines(filePath) {
    const content = this.index?.sourceFilesByPath[filePath]?.content ?? "";
    return content.split(/\r?\n/);
  }
  findHeadingLine(lines, sectionName) {
    const heading = `## ${sectionName}`;
    for (let index = 0; index < lines.length; index += 1) {
      if ((lines[index] ?? "").trim() === heading) {
        return index;
      }
    }
    return void 0;
  }
  readTableRows(filePath, sectionName, filterColumns) {
    const lines = this.getFileLines(filePath);
    const sectionLine = this.findHeadingLine(lines, sectionName);
    if (sectionLine === void 0) {
      return [];
    }
    let header = null;
    const rows = [];
    for (let index = sectionLine + 1; index < lines.length; index += 1) {
      const line = lines[index] ?? "";
      const trimmed = line.trim();
      if (/^##\s+/.test(trimmed)) {
        break;
      }
      if (!trimmed.startsWith("|")) {
        continue;
      }
      if (this.isMarkdownSeparatorLine(line)) {
        continue;
      }
      const values = splitMarkdownTableRow(line);
      if (!values) {
        continue;
      }
      if (!header) {
        header = values;
        continue;
      }
      const record = {};
      for (let columnIndex = 0; columnIndex < header.length; columnIndex += 1) {
        record[header[columnIndex]] = values[columnIndex] ?? "";
      }
      if (Object.values(record).every((value) => !value.trim())) {
        continue;
      }
      if (filterColumns) {
        const filtered = {};
        for (const key of filterColumns) {
          filtered[key] = record[key] ?? "";
        }
        rows.push({
          record: filtered,
          line: index,
          ch: getMarkdownTableCellRanges(line)?.[0]?.contentStart ?? 0
        });
      } else {
        rows.push({
          record,
          line: index,
          ch: getMarkdownTableCellRanges(line)?.[0]?.contentStart ?? 0
        });
      }
    }
    return rows;
  }
  isMarkdownSeparatorLine(line) {
    const cells = splitMarkdownTableRow(line);
    return Boolean(cells && cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell)));
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
    await this.openFileLocation(targetPath, targetLine, 0, targetLeaf);
  }
  async openFileLocation(filePath, line, ch = 0, preferredLeaf) {
    const abstractFile = this.app.vault.getAbstractFileByPath(filePath);
    if (!(abstractFile instanceof import_obsidian6.TFile)) {
      return;
    }
    const activeMarkdownView = this.app.workspace.getActiveViewOfType(import_obsidian6.MarkdownView);
    let targetLeaf = preferredLeaf ?? (activeMarkdownView?.file?.path === filePath ? activeMarkdownView.leaf : this.findMarkdownLeafForPath(filePath));
    if (!targetLeaf) {
      targetLeaf = this.app.workspace.getMostRecentLeaf();
      if (targetLeaf && this.isPreviewLeaf(targetLeaf)) {
        targetLeaf = this.app.workspace.getLeaf(true);
      }
    }
    if (!targetLeaf) {
      return;
    }
    if (targetLeaf.view.file?.path !== filePath) {
      await targetLeaf.openFile(abstractFile);
    }
    this.app.workspace.setActiveLeaf(targetLeaf, { focus: true });
    const markdownView = targetLeaf.view instanceof import_obsidian6.MarkdownView ? targetLeaf.view : this.app.workspace.getActiveViewOfType(import_obsidian6.MarkdownView);
    const editor = markdownView?.editor;
    if (!editor) {
      return;
    }
    editor.setCursor({ line, ch });
    editor.scrollIntoView(
      {
        from: { line, ch },
        to: { line, ch }
      },
      true
    );
    editor.focus?.();
    editor.cm?.focus?.();
  }
  async openReferencedFile(filePath, openInNewLeaf = false) {
    const preferredLeaf = openInNewLeaf ? this.app.workspace.getLeaf(true) : void 0;
    await this.openFileLocation(filePath, 0, 0, preferredLeaf);
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
    const activeLeaf = this.app.workspace.getMostRecentLeaf();
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
var ModelWeaveSettingTab = class extends import_obsidian6.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    const settings = this.plugin.getSettings();
    containerEl.empty();
    containerEl.createEl("h2", { text: "Model Weave" });
    new import_obsidian6.Setting(containerEl).setName("Default render mode").setDesc(
      "Used only when neither the toolbar override nor frontmatter.render_mode specifies a renderer."
    ).addDropdown((dropdown) => {
      dropdown.addOption("auto", "Auto").addOption("custom", "Custom").addOption("mermaid", "Mermaid").setValue(settings.defaultRenderMode).onChange(async (value) => {
        await this.plugin.updateSettings({
          defaultRenderMode: value
        });
      });
    });
    new import_obsidian6.Setting(containerEl).setName("Default zoom").setDesc(
      "Initial diagram zoom when no saved viewport state exists. Fit uses fit-to-view; 100% opens at actual scale."
    ).addDropdown((dropdown) => {
      dropdown.addOption("fit", "Fit").addOption("100", "100%").setValue(settings.defaultZoom).onChange(async (value) => {
        await this.plugin.updateSettings({
          defaultZoom: value
        });
      });
    });
    new import_obsidian6.Setting(containerEl).setName("Font size").setDesc("Adjusts the base preview text size across Model Weave viewers.").addDropdown((dropdown) => {
      dropdown.addOption("small", "Small").addOption("normal", "Normal").addOption("large", "Large").setValue(settings.fontSize).onChange(async (value) => {
        await this.plugin.updateSettings({
          fontSize: value
        });
      });
    });
    new import_obsidian6.Setting(containerEl).setName("Node density").setDesc(
      "Controls diagram compactness where supported. Compact reduces padding and gaps; relaxed gives more breathing room."
    ).addDropdown((dropdown) => {
      dropdown.addOption("compact", "Compact").addOption("normal", "Normal").addOption("relaxed", "Relaxed").setValue(settings.nodeDensity).onChange(async (value) => {
        await this.plugin.updateSettings({
          nodeDensity: value
        });
      });
    });
    new import_obsidian6.Setting(containerEl).setName("Refresh open Model Weave views").setDesc("Re-render open Model Weave previews using the current settings.").addButton((button) => {
      button.setButtonText("Refresh").onClick(async () => {
        await this.plugin.refreshOpenModelWeaveViews();
        new import_obsidian6.Notice("Refreshed open Model Weave views");
      });
    });
  }
};
