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
  WeaveMapNode,
  WeaveMapSourceLinkMode
} from "../types/weave-map";

export interface BuildWeaveMapModelOptions {
  sourceLinkMode?: WeaveMapSourceLinkMode;
}

export function buildWeaveMapModel(
  summary: ImpactSummary,
  options: BuildWeaveMapModelOptions = {}
): WeaveMapModel {
  const sourceLinkMode = options.sourceLinkMode ?? "compact";
  const focusNodeId = createFocusNodeId(summary);
  const nodes = new Map<string, WeaveMapNode>();
  const edges = new Map<string, WeaveMapEdgeAccumulator>();
  const countedNodes = new Map<string, CountedNodeAccumulator>();

  const addNode = (node: WeaveMapNode): WeaveMapNode => {
    const existing = nodes.get(node.id);
    if (existing) {
      return existing;
    }
    nodes.set(node.id, node);
    return node;
  };
  const addCountedNode = (node: WeaveMapNode, notes?: string): WeaveMapNode => {
    const existing = nodes.get(node.id);
    const accumulator = countedNodes.get(node.id);
    if (existing && accumulator) {
      accumulator.count += 1;
      if (notes) {
        accumulator.notes.add(notes);
      }
      existing.label = appendCount(accumulator.baseLabel, accumulator.count);
      existing.notes = mergeNotes(accumulator.notes);
      return existing;
    }
    if (existing) {
      return existing;
    }

    const noteSet = new Set<string>();
    if (notes) {
      noteSet.add(notes);
    }
    countedNodes.set(node.id, {
      node,
      baseLabel: node.label,
      count: 1,
      notes: noteSet
    });
    nodes.set(node.id, node);
    return node;
  };
  const addEdge = (edge: WeaveMapEdge): void => {
    const key = createEdgeAggregationKey(edge);
    const existing = edges.get(key);
    if (existing) {
      existing.count += 1;
      if (edge.notes) {
        existing.notes.add(edge.notes);
      }
      existing.edge.label = appendCount(existing.baseLabel, existing.count);
      existing.edge.notes = mergeNotes(existing.notes);
      return;
    }

    const notes = new Set<string>();
    if (edge.notes) {
      notes.add(edge.notes);
    }
    edges.set(key, {
      edge,
      baseLabel: edge.label || edge.relationType,
      count: 1,
      notes
    });
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
    addEdge({
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
    addEdge({
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
    const unresolvedNodeId = createUnresolvedNodeId(reference);
    const notes = formatReferenceNotes(reference);
    addCountedNode({
      id: unresolvedNodeId,
      label: reference.targetRaw || reference.targetLabel,
      modelType: "unresolved",
      layer: "Warning",
      status: "unresolved",
      notes
    }, notes);
    addEdge({
      id: createEdgeId("unresolved", focusNodeId, unresolvedNodeId, index),
      from: focusNodeId,
      to: unresolvedNodeId,
      relationType: "unresolved",
      label: reference.relationKind || "unresolved",
      status: "unresolved",
      notes
    });
  });

  if (sourceLinkMode === "compact") {
    const sourceLinksByNode = new Map<string, {
      nodeId: string;
      notes: string[];
      count: number;
    }>();

    summary.relatedSourceLinks.forEach((sourceLink) => {
      const sourceNodeId = createSourceNodeId(sourceLink);
      const notes = formatSourceLinkNotes(sourceLink);
      addCountedNode({
        id: sourceNodeId,
        label: sourceLink.label || sourceLink.path,
        modelType: "source-link",
        layer: "Source",
        path: sourceLink.path,
        status: "source",
        notes
      }, notes);

      const entry = sourceLinksByNode.get(sourceNodeId);
      if (entry) {
        entry.count += 1;
        if (notes) {
          entry.notes.push(notes);
        }
        return;
      }
      sourceLinksByNode.set(sourceNodeId, {
        nodeId: sourceNodeId,
        notes: notes ? [notes] : [],
        count: 1
      });
    });

    Array.from(sourceLinksByNode.values()).forEach((entry, index) => {
      const edgeLabel = appendCount("source links", entry.count);
      addEdge({
        id: createEdgeId("source", focusNodeId, entry.nodeId, index),
        from: focusNodeId,
        to: entry.nodeId,
        relationType: "source-link",
        label: edgeLabel,
        status: "source",
        notes: mergeNotes(new Set(entry.notes))
      });
    });
  } else {
    summary.relatedSourceLinks.forEach((sourceLink, index) => {
      const sourceNodeId = createSourceNodeId(sourceLink);
      const notes = formatSourceLinkNotes(sourceLink);
      addCountedNode({
        id: sourceNodeId,
        label: sourceLink.label || sourceLink.path,
        modelType: "source-link",
        layer: "Source",
        path: sourceLink.path,
        status: "source",
        notes
      }, notes);

      const ownerNodeId = findSourceOwnerNodeId(sourceLink, nodes) ?? focusNodeId;
      addEdge({
        id: createEdgeId("source", ownerNodeId, sourceNodeId, index),
        from: ownerNodeId,
        to: sourceNodeId,
        relationType: "source-link",
        label: sourceLink.relationKind,
        status: "source",
        notes
      });
    });
  }

  return {
    focusNodeId,
    nodes: Array.from(nodes.values()),
    edges: Array.from(edges.values()).map((entry) => entry.edge)
  };
}

interface WeaveMapEdgeAccumulator {
  edge: WeaveMapEdge;
  baseLabel: string;
  count: number;
  notes: Set<string>;
}

interface CountedNodeAccumulator {
  node: WeaveMapNode;
  baseLabel: string;
  count: number;
  notes: Set<string>;
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
  return `node:model:${modelId || modelPath}`;
}

function createSourceNodeId(sourceLink: ImpactSourceLink): string {
  return `node:source:${sourceLink.path.trim()}`;
}

function createUnresolvedNodeId(reference: ImpactReference): string {
  return `node:unresolved:${getReferenceTargetIdentity(reference)}`;
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

function getReferenceTargetIdentity(reference: ImpactReference): string {
  return (
    reference.targetPath ||
    reference.targetId ||
    reference.targetRaw ||
    reference.targetLabel
  ).trim();
}

function createEdgeAggregationKey(edge: WeaveMapEdge): string {
  return [
    edge.from,
    edge.to,
    edge.status,
    edge.relationType,
    edge.label ?? ""
  ].join("\u0000");
}

function appendCount(label: string, count: number): string {
  return count > 1 ? `${label} × ${count}` : label;
}

function mergeNotes(notes: Set<string>): string | undefined {
  const merged = Array.from(notes).filter((note) => note.trim());
  return merged.length > 0 ? merged.join("; ") : undefined;
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
