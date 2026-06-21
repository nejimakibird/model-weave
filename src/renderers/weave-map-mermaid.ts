import type { WeaveMapLayer, WeaveMapModel, WeaveMapNode } from "../types/weave-map";
import type { ResolvedColorScheme } from "../types/models";
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

interface WeaveMapLayerStyle {
  fill: string;
  stroke: string;
  color: string;
}

const DEFAULT_WEAVE_MAP_LAYER_STYLES: Record<WeaveMapLayer, WeaveMapLayerStyle> = {
  UI: { fill: "#eef6ff", stroke: "#b8d4f0", color: "#1f2937" },
  Process: { fill: "#eefaf1", stroke: "#b7dfc2", color: "#1f2937" },
  Rule: { fill: "#fff8e6", stroke: "#ead38a", color: "#1f2937" },
  "Rule / State": { fill: "#fff8e6", stroke: "#ead38a", color: "#1f2937" },
  "UI / Message": { fill: "#fdf2f8", stroke: "#f0b8d4", color: "#1f2937" },
  Data: { fill: "#eef6ff", stroke: "#b8d4f0", color: "#1f2937" },
  Mapping: { fill: "#f5efff", stroke: "#d6c2f0", color: "#1f2937" },
  Implementation: { fill: "#f3f4f6", stroke: "#cbd5e1", color: "#1f2937" },
  "Data Flow": { fill: "#ecfeff", stroke: "#a5dbe2", color: "#1f2937" },
  Relationship: { fill: "#f8fafc", stroke: "#cbd5e1", color: "#1f2937" },
  Source: { fill: "#effaf0", stroke: "#9fd3a8", color: "#1f2937" },
  Warning: { fill: "#fff1f1", stroke: "#f0b4b4", color: "#1f2937" },
  Other: { fill: "#f7f7f7", stroke: "#d4d4d8", color: "#1f2937" }
};

export interface WeaveMapMermaidSourceOptions {
  colorScheme?: ResolvedColorScheme;
}

export function buildWeaveMapMermaidSource(
  model: WeaveMapModel,
  options: WeaveMapMermaidSourceOptions = {}
): string {
  const nodeIds = createWeaveMapNodeMermaidIds(model.nodes);
  const orderedLayers = getOrderedLayers(model.nodes);
  const lines = [
    "flowchart LR",
    `  ${buildWeaveMapClassDef("weaveFocus", "#fff3cd", "#d39e00", 2.4)}`,
    `  ${buildWeaveMapClassDef("weaveNode", "#f5f7fb", "#7c8a9a")}`,
    `  ${buildWeaveMapClassDef("weaveSource", "#e8f5e9", "#388e3c")}`,
    `  ${buildWeaveMapClassDef("weaveUnresolved", "#ffebee", "#c62828", 2)}`,
    `  ${buildWeaveMapClassDef("weaveWarning", "#fff8e1", "#f57f17", 2)}`,
    ""
  ];

  for (const layer of orderedLayers) {
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

  for (const layer of orderedLayers) {
    lines.push(`  ${buildLayerStyleLine(layer, options.colorScheme)}`);
  }

  if (orderedLayers.length > 0) {
    lines.push("");
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

export function createWeaveMapNodeMermaidIds(nodes: WeaveMapNode[]): Map<string, string> {
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

function buildLayerStyleLine(
  layer: WeaveMapLayer,
  colorScheme: ResolvedColorScheme | undefined
): string {
  const style = resolveWeaveMapLayerStyle(layer, colorScheme);
  return `style layer_${sanitizeMermaidId(layer)} fill:${style.fill},stroke:${style.stroke},stroke-width:1px,color:${style.color}`;
}

function resolveWeaveMapLayerStyle(
  layer: WeaveMapLayer,
  colorScheme: ResolvedColorScheme | undefined
): WeaveMapLayerStyle {
  const fallback = DEFAULT_WEAVE_MAP_LAYER_STYLES[layer] ?? DEFAULT_WEAVE_MAP_LAYER_STYLES.Other;
  const override = colorScheme?.entries.find((entry) =>
    (entry.target?.trim().toLowerCase() ?? "") === "weave_map" &&
    entry.kind.trim().toLowerCase() === getWeaveMapLayerColorKind(layer)
  );
  if (!override) {
    return fallback;
  }

  return {
    fill: override.fill ?? fallback.fill,
    stroke: override.stroke ?? fallback.stroke,
    color: override.text ?? fallback.color
  };
}

export function getWeaveMapLayerColorKind(layer: WeaveMapLayer): string {
  switch (layer) {
    case "UI":
      return "ui";
    case "Process":
      return "process";
    case "Rule":
      return "rule";
    case "Rule / State":
      return "rule_state";
    case "UI / Message":
      return "ui_message";
    case "Data":
      return "data";
    case "Mapping":
      return "mapping";
    case "Implementation":
      return "implementation";
    case "Data Flow":
      return "data_flow";
    case "Relationship":
      return "relationship";
    case "Source":
      return "source";
    case "Warning":
      return "warning";
    case "Other":
      return "other";
  }
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
