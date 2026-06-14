import type {
  ImpactRelationship,
  ImpactReference,
  ImpactSourceLink,
  ImpactSummary
} from "../types/models";
import type {
  WeaveMapEdge,
  WeaveMapLayer,
  WeaveMapModel,
  WeaveMapNode
} from "../types/weave-map";

export function buildWeaveMapModel(summary: ImpactSummary): WeaveMapModel {
  const focusNodeId = createFocusNodeId(summary);
  const nodes = new Map<string, WeaveMapNode>();
  const edges: WeaveMapEdge[] = [];

  const addNode = (node: WeaveMapNode): WeaveMapNode => {
    const existing = nodes.get(node.id);
    if (existing) {
      return existing;
    }
    nodes.set(node.id, node);
    return node;
  };

  addNode({
    id: focusNodeId,
    label: summary.modelLabel || summary.modelId || summary.modelPath,
    modelType: summary.modelType,
    layer: getWeaveMapLayerForModelType(summary.modelType),
    path: summary.modelPath,
    modelId: summary.modelId,
    status: "focus"
  });

  summary.outboundRelationships.forEach((relationship, index) => {
    const targetNode = addNode(createModelNode(relationship));
    const relationType = getRelationshipRelationType(relationship, "outbound");
    edges.push({
      id: createEdgeId("outbound", focusNodeId, targetNode.id, index),
      from: focusNodeId,
      to: targetNode.id,
      relationType,
      label: relationType,
      status: "ok",
      notes: formatRelationshipNotes(relationship)
    });
  });

  summary.inboundRelationships.forEach((relationship, index) => {
    const sourceNode = addNode(createModelNode(relationship));
    const relationType = getRelationshipRelationType(relationship, "inbound");
    edges.push({
      id: createEdgeId("inbound", sourceNode.id, focusNodeId, index),
      from: sourceNode.id,
      to: focusNodeId,
      relationType,
      label: relationType,
      status: "ok",
      notes: formatRelationshipNotes(relationship)
    });
  });

  summary.unresolvedOutbound.forEach((reference, index) => {
    const unresolvedNodeId = `node:unresolved:${index}`;
    addNode({
      id: unresolvedNodeId,
      label: reference.targetRaw || reference.targetLabel,
      modelType: "unresolved",
      layer: "Warning",
      status: "unresolved",
      notes: formatReferenceNotes(reference)
    });
    edges.push({
      id: createEdgeId("unresolved", focusNodeId, unresolvedNodeId, index),
      from: focusNodeId,
      to: unresolvedNodeId,
      relationType: "unresolved",
      label: reference.relationKind || "unresolved",
      status: "unresolved",
      notes: formatReferenceNotes(reference)
    });
  });

  summary.relatedSourceLinks.forEach((sourceLink, index) => {
    const sourceNodeId = `node:source:${getSourceOwnerIdentity(sourceLink)}:${index}`;
    addNode({
      id: sourceNodeId,
      label: sourceLink.label || sourceLink.path,
      modelType: "source-link",
      layer: "Source",
      path: sourceLink.path,
      status: "source",
      notes: formatSourceLinkNotes(sourceLink)
    });

    const ownerNodeId = findSourceOwnerNodeId(sourceLink, nodes) ?? focusNodeId;
    edges.push({
      id: createEdgeId("source", ownerNodeId, sourceNodeId, index),
      from: ownerNodeId,
      to: sourceNodeId,
      relationType: "source-link",
      label: sourceLink.relationKind,
      status: "source",
      notes: formatSourceLinkNotes(sourceLink)
    });
  });

  return {
    focusNodeId,
    nodes: Array.from(nodes.values()),
    edges
  };
}

export function getWeaveMapLayerForModelType(modelType: string): WeaveMapLayer {
  switch (modelType) {
    case "screen":
      return "UI";
    case "app-process":
    case "app_process":
      return "Process";
    case "rule":
      return "Rule";
    case "codeset":
      return "Rule / State";
    case "message":
      return "UI / Message";
    case "data-object":
    case "data_object":
    case "er-entity":
    case "er_entity":
      return "Data";
    case "mapping":
      return "Mapping";
    case "object":
    case "class":
    case "class-diagram":
    case "class_diagram":
    case "diagram":
      return "Implementation";
    case "dfd-object":
    case "dfd_object":
    case "dfd-diagram":
    case "dfd_diagram":
      return "Data Flow";
    case "relations":
      return "Relationship";
    case "source-link":
    case "source_link":
      return "Source";
    case "unresolved":
      return "Warning";
    default:
      return "Other";
  }
}

function createFocusNodeId(summary: ImpactSummary): string {
  return `node:focus:${summary.modelPath || summary.modelId || summary.modelLabel}`;
}

function createModelNode(relationship: ImpactRelationship): WeaveMapNode {
  return {
    id: createModelNodeId(relationship.modelPath, relationship.modelId),
    label: relationship.modelLabel || relationship.modelId || relationship.modelPath,
    modelType: relationship.modelType,
    layer: getWeaveMapLayerForModelType(relationship.modelType),
    path: relationship.modelPath,
    modelId: relationship.modelId,
    status: "ok",
    notes: formatRelationshipNotes(relationship)
  };
}

function createModelNodeId(modelPath: string, modelId?: string): string {
  return `node:model:${modelPath || modelId}`;
}

function createEdgeId(
  relation: string,
  from: string,
  to: string,
  index: number
): string {
  return `edge:${relation}:${from}:${to}:${index}`;
}

function getRelationshipRelationType(
  relationship: ImpactRelationship,
  fallback: "inbound" | "outbound"
): string {
  return relationship.usages.find((usage) => usage.relationKind)?.relationKind ?? fallback;
}

function formatRelationshipNotes(relationship: ImpactRelationship): string | undefined {
  const parts = [`${relationship.usageCount} usage${relationship.usageCount === 1 ? "" : "s"}`];
  const sections = uniqueDefined(relationship.usages.map((usage) => usage.section));
  if (sections.length > 0) {
    parts.push(`sections: ${sections.join(", ")}`);
  }
  const fields = uniqueDefined(relationship.usages.map((usage) => usage.field));
  if (fields.length > 0) {
    parts.push(`fields: ${fields.join(", ")}`);
  }
  return parts.join("; ");
}

function formatReferenceNotes(reference: ImpactReference): string | undefined {
  const parts = [
    reference.section ? `section: ${reference.section}` : undefined,
    reference.field ? `field: ${reference.field}` : undefined,
    reference.sourceContext ? `context: ${reference.sourceContext}` : undefined,
    reference.notes
  ].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join("; ") : undefined;
}

function formatSourceLinkNotes(sourceLink: ImpactSourceLink): string | undefined {
  const parts = [
    `owner: ${sourceLink.ownerLabel}`,
    `path: ${sourceLink.path}`,
    ...sourceLink.notes
  ].filter((part) => part.trim());
  return parts.length > 0 ? parts.join("; ") : undefined;
}

function getSourceOwnerIdentity(sourceLink: ImpactSourceLink): string {
  return sourceLink.ownerPath || sourceLink.ownerId || sourceLink.ownerLabel;
}

function findSourceOwnerNodeId(
  sourceLink: ImpactSourceLink,
  nodes: Map<string, WeaveMapNode>
): string | undefined {
  for (const node of nodes.values()) {
    if (
      (sourceLink.ownerPath && node.path === sourceLink.ownerPath) ||
      (sourceLink.ownerId && node.modelId === sourceLink.ownerId)
    ) {
      return node.id;
    }
  }
  return undefined;
}

function uniqueDefined(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}
