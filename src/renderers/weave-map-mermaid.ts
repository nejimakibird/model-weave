import type { WeaveMapLayer, WeaveMapModel, WeaveMapNode } from "../types/weave-map";
import {
  ensureUniqueMermaidId,
  escapeMermaidEdgeLabel,
  escapeMermaidLabel,
  sanitizeMermaidId
} from "./mermaid-helpers";

const WEAVE_MAP_LAYER_ORDER: WeaveMapLayer[] = [
  "UI",
  "Process",
  "Rule",
  "Rule / State",
  "UI / Message",
  "Data",
  "Mapping",
  "Implementation",
  "Data Flow",
  "Relationship",
  "Source",
  "Warning",
  "Other"
];

export function buildWeaveMapMermaidSource(model: WeaveMapModel): string {
  const nodeIds = createNodeMermaidIds(model.nodes);
  const lines = [
    "flowchart LR",
    `  ${buildWeaveMapClassDef("weaveFocus", "#fff3cd", "#d39e00", 2.4)}`,
    `  ${buildWeaveMapClassDef("weaveNode", "#f5f7fb", "#7c8a9a")}`,
    `  ${buildWeaveMapClassDef("weaveSource", "#e8f5e9", "#388e3c")}`,
    `  ${buildWeaveMapClassDef("weaveUnresolved", "#ffebee", "#c62828", 2)}`,
    `  ${buildWeaveMapClassDef("weaveWarning", "#fff8e1", "#f57f17", 2)}`,
    ""
  ];

  for (const layer of getOrderedLayers(model.nodes)) {
    const layerNodes = model.nodes.filter((node) => node.layer === layer);
    if (layerNodes.length === 0) {
      continue;
    }

    const subgraphId = `layer_${sanitizeMermaidId(layer)}`;
    lines.push(`  subgraph ${subgraphId}["${escapeMermaidLabel(layer)}"]`);
    for (const node of layerNodes) {
      const mermaidId = nodeIds.get(node.id) ?? sanitizeMermaidId(node.id);
      lines.push(`    ${mermaidId}["${buildNodeLabel(node)}"]`);
    }
    lines.push("  end", "");
  }

  for (const edge of model.edges) {
    const from = nodeIds.get(edge.from) ?? sanitizeMermaidId(edge.from);
    const to = nodeIds.get(edge.to) ?? sanitizeMermaidId(edge.to);
    const label = sanitizeEdgeLabel(edge.label || edge.relationType);
    const arrow = edge.status === "unresolved" ? "-.->" : "-->";
    lines.push(`  ${from} ${arrow}|${label}| ${to}`);
  }

  if (model.edges.length > 0) {
    lines.push("");
  }

  for (const node of model.nodes) {
    const mermaidId = nodeIds.get(node.id) ?? sanitizeMermaidId(node.id);
    lines.push(`  class ${mermaidId} ${getNodeClassName(node)}`);
  }

  return lines.join("\n").trimEnd();
}

function createNodeMermaidIds(nodes: WeaveMapNode[]): Map<string, string> {
  const usedIds = new Set<string>();
  const ids = new Map<string, string>();
  for (const node of nodes) {
    ids.set(node.id, ensureUniqueMermaidId(`n_${sanitizeMermaidId(node.id)}`, usedIds));
  }
  return ids;
}

function getOrderedLayers(nodes: WeaveMapNode[]): WeaveMapLayer[] {
  const presentLayers = new Set(nodes.map((node) => node.layer));
  const ordered = WEAVE_MAP_LAYER_ORDER.filter((layer) => presentLayers.has(layer));
  const extra = Array.from(presentLayers).filter((layer) => !WEAVE_MAP_LAYER_ORDER.includes(layer));
  return [...ordered, ...extra];
}

function buildNodeLabel(node: WeaveMapNode): string {
  return escapeMermaidLabel(`${node.layer}\n${node.label}`);
}

function sanitizeEdgeLabel(label: string): string {
  return escapeMermaidEdgeLabel(label) || "relates";
}

function getNodeClassName(node: WeaveMapNode): string {
  if (node.status === "focus") {
    return "weaveFocus";
  }
  if (node.status === "source") {
    return "weaveSource";
  }
  if (node.status === "unresolved") {
    return "weaveUnresolved";
  }
  if (node.status === "warning") {
    return "weaveWarning";
  }
  return "weaveNode";
}

function buildWeaveMapClassDef(
  className: string,
  fill: string,
  stroke: string,
  strokeWidth = 1.4
): string {
  return `classDef ${className} fill:${fill},stroke:${stroke},color:#111111,stroke-width:${strokeWidth}px`;
}
