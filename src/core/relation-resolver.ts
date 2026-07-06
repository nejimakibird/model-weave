import type {
  ClassRelationEdge,
  DiagramEdge,
  DiagramModel,
  DiagramNode,
  DfdDiagramModel,
  DfdDiagramObjectEntry,
  DfdFlowModel,
  DfdObjectModel,
  FlowDiagramModel,
  DomainDiagramSourceSummary,
  DomainEntry,
  DomainsModel,
  ErEntity,
  ErRelationEdge,
  ObjectModel,
  ParsedFileModel,
  RelationModel,
  ResolvedDiagram,
  ValidationWarning
} from "../types/models";
import {
  formatDfdLocalDomainOverridesSourceMessage,
  formatDfdObjectUnknownDomainMessage,
  formatDfdObjectDomainWithoutLocalDomainsMessage,
  formatDfdObjectUnknownLocalDomainMessage,
  formatDomainDiagramEmptySourceMessage,
  formatDomainDiagramInvalidSourceTypeMessage,
  formatDomainDiagramUnresolvedSourceMessage
} from "./domain-diagnostics";
import { mergeDomainDiagramSources } from "./domain-diagram-resolver";
import { validateDomainEntries } from "../parsers/domains-parser";
import {
  buildReferenceIdentityKeys,
  extractWikilinkReferences,
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
  kind: string;
}

export function resolveDiagramRelations(
  diagram: DiagramModel | DfdDiagramModel | FlowDiagramModel,
  index: ModelingVaultIndex
): ResolvedDiagram {
  if (diagram.kind === "er") {
    return resolveErDiagramRelations(diagram, index);
  }

  if (diagram.kind === "dfd" || diagram.schema === "flow_diagram") {
    return resolveDfdDiagramRelations(diagram as DfdDiagramModel | FlowDiagramModel, index);
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
  diagram: DfdDiagramModel | FlowDiagramModel,
  index: ModelingVaultIndex
): ResolvedDiagram {
  const warnings: ValidationWarning[] = [];
  const isFlowDiagram = diagram.schema === "flow_diagram";
  const domainResolution = isFlowDiagram
    ? { warnings: [], sourceSummaries: [], domains: [] }
    : resolveDfdDiagramDomains(diagram, index);
  warnings.push(...domainResolution.warnings);
  const resolvedDiagram: DfdDiagramModel | FlowDiagramModel = isFlowDiagram
    ? diagram
    : {
        ...diagram,
        domainSourceSummaries: domainResolution.sourceSummaries,
        domains: domainResolution.domains
      };
  const objectResolution = resolveDfdDiagramObjects(resolvedDiagram, index, {
    hasDomainSources: diagram.schema === "dfd_diagram" && diagram.domainSources.length > 0
  });
  const hasUnreadableFlowObjects = isFlowDiagram && hasInvalidDfdLikeSectionHeader(diagram.path, index, "Objects");
  const edges: DiagramEdge[] = [];

  diagram.flows.forEach((flow, rowIndex) => {
    const context = {
      section: "Flows",
      rowIndex: rowIndex + 1,
      relatedId: flow.id
    };
    const sourceEntry = isFlowDiagram
      ? objectResolution.byId.get(flow.from.trim()) ?? null
      : resolveDfdFlowEndpoint(flow.from, objectResolution, index);
    const targetEntry = isFlowDiagram
      ? objectResolution.byId.get(flow.to.trim()) ?? null
      : resolveDfdFlowEndpoint(flow.to, objectResolution, index);

    if (!sourceEntry) {
      if (hasUnreadableFlowObjects) {
        return;
      }
      const listedObject = isFlowDiagram ? null : resolveDfdObjectReference(flow.from, index);
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
        message: isFlowDiagram
          ? "Flow Diagram flow source \"" + flow.from + "\" is not defined in the local ## Objects table."
          : "unresolved DFD flow source \"" + flow.from + "\"",
        severity: "error",
        path: diagram.path,
        field: isFlowDiagram ? "Flows.from" : "Flows",
        context: isFlowDiagram ? { ...context, referenceKind: "local-object-id" } : context
      });
      return;
    }

    if (!targetEntry) {
      if (hasUnreadableFlowObjects) {
        return;
      }
      const listedObject = isFlowDiagram ? null : resolveDfdObjectReference(flow.to, index);
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
        message: isFlowDiagram
          ? "Flow Diagram flow target \"" + flow.to + "\" is not defined in the local ## Objects table."
          : "unresolved DFD flow target \"" + flow.to + "\"",
        severity: "error",
        path: diagram.path,
        field: isFlowDiagram ? "Flows.to" : "Flows",
        context: isFlowDiagram ? { ...context, referenceKind: "local-object-id" } : context
      });
      return;
    }

    if (sourceEntry.node.id === targetEntry.node.id) {
      warnings.push({
        code: "invalid-structure",
        message: `${isFlowDiagram ? "Flow Diagram" : "DFD"} flow "${flow.id ?? rowIndex + 1}" is a self-loop`,
        severity: "warning",
        path: diagram.path,
        field: "Flows",
        context
      });
    }

    if (!isFlowDiagram) {
      if (sourceEntry.kind === "external" && targetEntry.kind === "external") {
        warnings.push(createDfdFlowShapeWarning(diagram.path, context, "external -> external"));
      } else if (sourceEntry.kind === "external" && targetEntry.kind === "datastore") {
        warnings.push(createDfdFlowShapeWarning(diagram.path, context, "external -> datastore"));
      } else if (sourceEntry.kind === "datastore" && targetEntry.kind === "datastore") {
        warnings.push(createDfdFlowShapeWarning(diagram.path, context, "datastore -> datastore"));
      }
    }

    const flowData = resolveDfdFlowDataDisplay(flow.data, index);
    warnings.push(...resolveDfdFlowDataReferenceWarnings(
      diagram,
      flow.data,
      index,
      context
    ));

    edges.push({
      id: flow.id,
      source: sourceEntry.node.id,
      target: targetEntry.node.id,
      kind: "flow",
      label: isFlowDiagram ? buildFlowDiagramEdgeLabel(flow, flowData.label) : flowData.label,
      metadata: {
        notes: flow.notes,
        flowKind: flow.kind,
        trigger: flow.trigger,
        condition: flow.condition,
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
    diagram: resolvedDiagram,
    nodes: objectResolution.nodes,
    edges,
    missingObjects: objectResolution.missingObjects,
    warnings: [...warnings, ...objectResolution.warnings]
  };
}

function hasInvalidDfdLikeSectionHeader(
  path: string,
  index: ModelingVaultIndex,
  section: string
): boolean {
  return (index.warningsByFilePath[path] ?? []).some((warning) =>
    warning.code === "invalid-table-column" &&
    getDiagnosticSectionName(warning) === section.toLowerCase()
  );
}

function getDiagnosticSectionName(warning: ValidationWarning): string | null {
  const contextSection = typeof warning.context?.section === "string" ? warning.context.section : "";
  const section = contextSection || warning.message.match(/section "([^"]+)"/i)?.[1] || warning.section || warning.field || "";
  const normalized = section.split(".")[0]?.split(":")[0]?.trim().toLowerCase();
  return normalized || null;
}

function resolveDfdDiagramDomains(
  diagram: DfdDiagramModel,
  index: ModelingVaultIndex
): {
  domains: DomainEntry[];
  sourceSummaries: DomainDiagramSourceSummary[];
  warnings: ValidationWarning[];
} {
  const warnings: ValidationWarning[] = [];
  const sourceSummaries: DomainDiagramSourceSummary[] = [];
  const effectiveById = new Map<string, { domain: DomainEntry; sourcePath: string }>();
  const order: string[] = [];
  const validSources: Array<{ source: DomainsModel; ref?: string }> = [];

  for (const sourceRef of diagram.domainSources) {
    const resolved = findModelByReference(sourceRef.ref, index);
    if (!resolved) {
      sourceSummaries.push({
        ref: sourceRef,
        status: "unresolved",
        domainCount: 0
      });
      warnings.push(createDfdDomainSourceWarning(
        diagram.path,
        sourceRef.rowIndex,
        formatDomainDiagramUnresolvedSourceMessage(sourceRef.ref),
        "unresolved-reference"
      ));
      continue;
    }

    if (resolved.fileType !== "domains") {
      sourceSummaries.push({
        ref: sourceRef,
        resolvedPath: resolved.path,
        status: "invalid-type",
        domainCount: 0
      });
      warnings.push(createDfdDomainSourceWarning(
        diagram.path,
        sourceRef.rowIndex,
        formatDomainDiagramInvalidSourceTypeMessage(sourceRef.ref, resolved.fileType),
        "invalid-structure"
      ));
      continue;
    }

    sourceSummaries.push({
      ref: sourceRef,
      resolvedPath: resolved.path,
      resolvedId: resolved.id,
      status: resolved.domains.length > 0 ? "ok" : "empty",
      domainCount: resolved.domains.length
    });

    if (resolved.domains.length === 0) {
      warnings.push(createDfdDomainSourceWarning(
        diagram.path,
        sourceRef.rowIndex,
        formatDomainDiagramEmptySourceMessage(sourceRef.ref),
        "invalid-structure"
      ));
    }

    validSources.push({ source: resolved, ref: sourceRef.ref });
  }

  const sourceMerge = mergeDomainDiagramSources(validSources, diagram.path);
  warnings.push(...sourceMerge.warnings);
  for (const domain of sourceMerge.domains) {
    order.push(domain.id);
    effectiveById.set(domain.id, {
      domain: { ...domain },
      sourcePath: diagram.path
    });
  }

  for (const domain of diagram.domains ?? []) {
    const previous = effectiveById.get(domain.id);
    if (!previous) {
      order.push(domain.id);
      effectiveById.set(domain.id, { domain: { ...domain }, sourcePath: diagram.path });
      continue;
    }

    for (const field of ["name", "kind", "parent"] as const) {
      const localValue = domain[field]?.trim() ?? "";
      const sourceValue = previous.domain[field]?.trim() ?? "";
      if (localValue && sourceValue && localValue !== sourceValue) {
        warnings.push({
          code: "invalid-structure",
          message: formatDfdLocalDomainOverridesSourceMessage(
            domain.id,
            field,
            localValue,
            sourceValue
          ),
          severity: "warning",
          path: diagram.path,
          field: `Domains.${field}`,
          context: { rowIndex: domain.rowIndex + 1 }
        });
      }
    }

    effectiveById.set(domain.id, { domain: { ...domain }, sourcePath: diagram.path });
  }

  const domains = order
    .map((id) => effectiveById.get(id)?.domain)
    .filter((domain): domain is DomainEntry => Boolean(domain));
  warnings.push(...validateDomainEntries(diagram.path, domains));

  return { domains, sourceSummaries, warnings };
}

function createDfdDomainSourceWarning(
  path: string,
  rowIndex: number,
  message: string,
  code: ValidationWarning["code"]
): ValidationWarning {
  return {
    code,
    message,
    severity: "warning",
    path,
    field: "Domain Sources.ref",
    context: { rowIndex: rowIndex + 1 }
  };
}

function resolveDfdDiagramObjects(
  diagram: DfdDiagramModel | FlowDiagramModel,
  index: ModelingVaultIndex,
  domainContext: {
    hasDomainSources: boolean;
  }
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
  const localDomainIds = new Set((diagram.schema === "dfd_diagram" ? diagram.domains ?? [] : []).map((domain) => domain.id));

  for (const entry of entries) {
    const ref = entry.ref?.trim();
    const resolvedObject = ref ? resolveDfdObjectReference(ref, index) ?? undefined : undefined;
    const resolvedIdentity = ref ? resolveReferenceIdentity(ref, index) : undefined;
    if (!ref) {
      if (diagram.schema === "dfd_diagram") {
        warnings.push({
          code: "invalid-structure",
          message: `DFD local object "${entry.id ?? entry.label ?? entry.rowIndex + 1}" is treated as an inline object without ref.`,
          severity: "info",
          path: diagram.path,
          field: "Objects",
          context: { rowIndex: entry.rowIndex + 1 }
        });
      }
    } else if (!resolvedObject && !resolvedIdentity?.resolvedModel) {
      missingObjects.push(ref);
      warnings.push({
        code: "unresolved-reference",
        message: diagram.schema === "flow_diagram"
          ? `unresolved Flow Diagram object ref "${ref}"`
          : `unresolved DFD object ref "${ref}"`,
        severity: "warning",
        path: diagram.path,
        field: "Objects",
        context: { rowIndex: entry.rowIndex + 1 }
      });
    }

    const effectiveKind = entry.kind ?? resolvedObject?.kind ?? (diagram.schema === "flow_diagram" ? "unknown" : "other");
    if (diagram.schema === "dfd_diagram" && !entry.kind && !resolvedObject?.kind) {
      warnings.push({
        code: "invalid-structure",
        message: `DFD object "${entry.id ?? ref ?? entry.rowIndex + 1}" has no kind, and it could not be inferred from ref.`,
        severity: "warning",
        path: diagram.path,
        field: "Objects",
        context: { rowIndex: entry.rowIndex + 1 }
      });
    }

    const resolvedLabel = getDfdDiagramNodeDisplayName(entry, resolvedObject);
    const nodeId = entry.id?.trim() || resolvedObject?.id || ref || `dfd-object-${entry.rowIndex + 1}`;
    const domain = entry.domain?.trim();
    if (diagram.schema === "dfd_diagram" && domain && localDomainIds.size === 0 && !domainContext.hasDomainSources) {
      warnings.push({
        code: "unresolved-reference",
        message: formatDfdObjectDomainWithoutLocalDomainsMessage(
          entry.id ?? ref ?? String(entry.rowIndex + 1),
          domain
        ),
        severity: "warning",
        path: diagram.path,
        field: "Objects.domain",
        context: { rowIndex: entry.rowIndex + 1 }
      });
    } else if (diagram.schema === "dfd_diagram" && domain && !localDomainIds.has(domain)) {
      warnings.push({
        code: "unresolved-reference",
        message: domainContext.hasDomainSources
          ? formatDfdObjectUnknownDomainMessage(
              entry.id ?? ref ?? String(entry.rowIndex + 1),
              domain
            )
          : formatDfdObjectUnknownLocalDomainMessage(
              entry.id ?? ref ?? String(entry.rowIndex + 1),
              domain
            ),
        severity: "warning",
        path: diagram.path,
        field: "Objects.domain",
        context: { rowIndex: entry.rowIndex + 1 }
      });
    }

    const node: DiagramNode & { object?: DfdObjectModel } = {
      id: nodeId,
      ref,
      label: resolvedLabel,
      kind: effectiveKind,
      metadata: {
        notes: entry.notes,
        domain,
        rowIndex: entry.rowIndex,
        local: !ref,
        refReference: resolvedIdentity?.parsed,
        refModelPath: resolvedIdentity?.resolvedModel?.path,
        refModelType: resolvedIdentity?.resolvedModel?.fileType,
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

function buildFlowDiagramEdgeLabel(flow: DfdFlowModel, dataLabel: string | undefined): string | undefined {
  const kind = flow.kind?.trim();
  const trigger = flow.trigger?.trim();
  const data = dataLabel?.trim();

  if (trigger && data) {
    return `${trigger} / ${data}`;
  }
  if (kind && data) {
    return `${kind} / ${data}`;
  }
  return data || trigger || kind || undefined;
}

function resolveDfdFlowDataReferenceWarnings(
  diagram: DfdDiagramModel | FlowDiagramModel,
  rawValue: string | undefined,
  index: ModelingVaultIndex,
  context: { section: string; rowIndex: number; relatedId?: string }
): ValidationWarning[] {
  const wikilinks = rawValue ? extractWikilinkReferences(rawValue) : [];
  if (wikilinks.length === 0) {
    return [];
  }

  const diagramLabel = diagram.schema === "flow_diagram" ? "Flow Diagram" : "DFD";
  return wikilinks
    .filter((reference) => !resolveReferenceIdentity(reference, index).resolvedModel)
    .map((reference) => ({
      code: "unresolved-reference",
      message: `${diagramLabel} flow data reference "${reference}" could not be resolved. Check the data/model id or file name.`,
      severity: "warning",
      path: diagram.path,
      field: "data",
      context: {
        ...context,
        referenceValue: reference
      }
    }));
}

function resolveDfdFlowDataDisplay(
  rawValue: string | undefined,
  index: ModelingVaultIndex
): {
  label?: string;
  reference?: ReturnType<typeof parseReferenceValue>;
  model?: ParsedFileModel | null;
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
      reference
    };
  }

  return { label: getReferenceDisplayName(trimmed), reference };
}

function dedupeDiagramNodes<TObject extends ObjectModel | ErEntity | DfdObjectModel>(
  diagram: DiagramModel | DfdDiagramModel | FlowDiagramModel,
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
      const sourceIdentity = sourceObject ? undefined : resolveReferenceIdentity(edge.source, index);
      const targetIdentity = targetObject ? undefined : resolveReferenceIdentity(edge.target, index);
      const sourceEndpointExists = Boolean(sourceObject || sourceIdentity?.resolvedModel);
      const targetEndpointExists = Boolean(targetObject || targetIdentity?.resolvedModel);

      if (sourceEndpointExists && targetEndpointExists) {
        pushClassRelationTargetNotDiagramCompatibleWarnings(
          warnings,
          diagram.path,
          [
            { reference: edge.source, object: sourceObject, identity: sourceIdentity },
            { reference: edge.target, object: targetObject, identity: targetIdentity }
          ]
        );
        return false;
      }

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
        const sourceIdentity = sourceObject
          ? undefined
          : resolveReferenceIdentity(relation.source, index);
        const targetIdentity = targetObject
          ? undefined
          : resolveReferenceIdentity(relation.target, index);
        const sourceEndpointExists = Boolean(sourceObject || sourceIdentity?.resolvedModel);
        const targetEndpointExists = Boolean(targetObject || targetIdentity?.resolvedModel);

        if (sourceEndpointExists && targetEndpointExists) {
          pushClassRelationTargetNotDiagramCompatibleWarnings(
            warnings,
            diagram.path,
            [
              { reference: relation.source, object: sourceObject, identity: sourceIdentity },
              { reference: relation.target, object: targetObject, identity: targetIdentity }
            ]
          );
          seenRelationIds.add(relationKey);
          continue;
        }

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

      const sourceIdentity = sourceObject
        ? undefined
        : resolveReferenceIdentity(relation.sourceClass, index);
      const targetIdentity = targetObject
        ? undefined
        : resolveReferenceIdentity(relation.targetClass, index);
      const sourceEndpointExists = Boolean(sourceObject || sourceIdentity?.resolvedModel);
      const targetEndpointExists = Boolean(targetObject || targetIdentity?.resolvedModel);

      if (!sourceObject || !targetObject) {
        if (sourceEndpointExists && targetEndpointExists) {
          pushClassRelationTargetNotDiagramCompatibleWarnings(
            warnings,
            diagram.path,
            [
              { reference: relation.sourceClass, object: sourceObject, identity: sourceIdentity },
              { reference: relation.targetClass, object: targetObject, identity: targetIdentity }
            ]
          );
          seenRelationIds.add(relationKey);
          continue;
        }

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

function pushClassRelationTargetNotDiagramCompatibleWarnings(
  warnings: ValidationWarning[],
  path: string,
  endpoints: Array<{
    reference: string;
    object: ObjectModel | null;
    identity?: ReturnType<typeof resolveReferenceIdentity>;
  }>
): void {
  for (const endpoint of endpoints) {
    if (endpoint.object || !endpoint.identity?.resolvedModel) {
      continue;
    }

    warnings.push({
      code: "class-relation-target-not-diagram-compatible",
      message: formatClassRelationTargetNotDiagramCompatibleMessage(
        getReferenceDiagnosticLabel(endpoint.reference, endpoint.identity)
      ),
      severity: "warning",
      path,
      field: "relations"
    });
  }
}

function getReferenceDiagnosticLabel(
  reference: string,
  identity?: ReturnType<typeof resolveReferenceIdentity>
): string {
  return (
    identity?.resolvedId ??
    identity?.target ??
    parseReferenceValue(reference)?.target ??
    reference.trim()
  );
}

function formatClassRelationTargetNotDiagramCompatibleMessage(target: string): string {
  return `class relation target "${target}" exists, but is not compatible with Class Diagram rendering and was excluded. Consider representing non-structural cross-model relationships with Mapping.`;
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
