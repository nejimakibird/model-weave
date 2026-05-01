import type {
  DiagramEdge,
  ErEntity,
  ObjectModel,
  ResolvedDiagram
} from "../types/models";
import {
  classDiagramEdgeToInternalEdge,
  erDiagramEdgeToInternalEdge
} from "../core/internal-edge-adapters";
import { toMermaidNodeId } from "./dfd-mermaid";
import {
  createMermaidFallbackNotice,
  createMermaidShell,
  renderMermaidSourceIntoShell,
  setMermaidRenderReadyPromise
} from "./mermaid-shared";
import { renderClassDiagram } from "./class-renderer";
import { renderErDiagram } from "./er-renderer";
import type { GraphViewportState } from "./graph-view-shared";

interface MermaidRendererOptions {
  hideTitle?: boolean;
  hideDetails?: boolean;
  forExport?: boolean;
  viewportState?: GraphViewportState;
  onViewportStateChange?: (state: GraphViewportState) => void;
}

const CLASS_NODE_CLASS = "mwClass";
const ER_NODE_CLASS = "mwEntity";

export function renderClassMermaidDiagram(
  diagram: ResolvedDiagram,
  options?: MermaidRendererOptions
): HTMLElement {
  return renderReducedMermaidDiagram({
    className: "mdspec-diagram mdspec-diagram--class",
    title: options?.hideTitle ? undefined : `${diagram.diagram.name} (class / mermaid)`,
    renderIdPrefix: "model_weave_class",
    source: buildClassOverviewMermaidSource(diagram),
    options,
    fallback: () => renderClassDiagram(diagram, options),
    fallbackMessage:
      "Mermaid class overview could not be rendered. Falling back to the custom class renderer."
  });
}

export function renderErMermaidDiagram(
  diagram: ResolvedDiagram,
  options?: MermaidRendererOptions
): HTMLElement {
  return renderReducedMermaidDiagram({
    className: "mdspec-diagram mdspec-diagram--er",
    title: options?.hideTitle ? undefined : `${diagram.diagram.name} (er / mermaid)`,
    renderIdPrefix: "model_weave_er",
    source: buildErOverviewMermaidSource(diagram),
    options,
    fallback: () => renderErDiagram(diagram, options),
    fallbackMessage:
      "Mermaid ER overview could not be rendered. Falling back to the custom ER renderer."
  });
}

export function renderClassMermaidObject(
  object: ObjectModel,
  options?: MermaidRendererOptions
): HTMLElement {
  return renderReducedMermaidDiagram({
    className: "mdspec-diagram mdspec-diagram--class",
    title: options?.hideTitle ? undefined : `${object.name} (class / mermaid)`,
    renderIdPrefix: "model_weave_class_object",
    source: buildSingleClassMermaidSource(object),
    options,
    fallback: () => createFallbackObjectNotice("Class Mermaid overview could not be rendered."),
    fallbackMessage: "Mermaid class overview could not be rendered for this object."
  });
}

export function renderErMermaidObject(
  entity: ErEntity,
  options?: MermaidRendererOptions
): HTMLElement {
  return renderReducedMermaidDiagram({
    className: "mdspec-diagram mdspec-diagram--er",
    title: options?.hideTitle ? undefined : `${entity.logicalName} (er / mermaid)`,
    renderIdPrefix: "model_weave_er_object",
    source: buildSingleErMermaidSource(entity),
    options,
    fallback: () => createFallbackObjectNotice("ER Mermaid overview could not be rendered."),
    fallbackMessage: "Mermaid ER overview could not be rendered for this entity."
  });
}

function renderReducedMermaidDiagram(config: {
  className: string;
  title?: string;
  renderIdPrefix: string;
  source: string;
  options?: MermaidRendererOptions;
  fallback: () => HTMLElement;
  fallbackMessage: string;
}): HTMLElement {
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
  }).catch(() => {
    const fallback = config.fallback();
    const notice = createMermaidFallbackNotice(config.fallbackMessage);
    shell.root.replaceChildren(notice, ...Array.from(fallback.childNodes));
  });

  setMermaidRenderReadyPromise(shell.root, ready);
  return shell.root;
}

function buildClassOverviewMermaidSource(diagram: ResolvedDiagram): string {
  const lines: string[] = [
    "flowchart LR",
    `  classDef ${CLASS_NODE_CLASS} fill:#eef4ff,stroke:#4a6fa3,color:#132238,stroke-width:1.4px`
  ];

  const nodeIds = new Map<string, string>();
  for (const node of diagram.nodes) {
    const object = node.object && node.object.fileType === "object" ? node.object : undefined;
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

function buildErOverviewMermaidSource(diagram: ResolvedDiagram): string {
  const lines: string[] = [
    "flowchart LR",
    `  classDef ${ER_NODE_CLASS} fill:#eef8ef,stroke:#467454,color:#18311d,stroke-width:1.4px`
  ];

  const nodeIds = new Map<string, string>();
  for (const node of diagram.nodes) {
    const entity = node.object && node.object.fileType === "er-entity" ? node.object : undefined;
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

function buildSingleClassMermaidSource(object: ObjectModel): string {
  const lines: string[] = [
    "flowchart LR",
    `  classDef ${CLASS_NODE_CLASS} fill:#eef4ff,stroke:#4a6fa3,color:#132238,stroke-width:1.4px`
  ];
  const fallbackId = object.frontmatter.id?.toString() || object.name;
  const id = toMermaidNodeId(fallbackId);
  lines.push(`  ${id}["${buildClassNodeLabel(undefined, object, fallbackId)}"]:::${CLASS_NODE_CLASS}`);
  return lines.join("\n");
}

function buildSingleErMermaidSource(entity: ErEntity): string {
  const lines: string[] = [
    "flowchart LR",
    `  classDef ${ER_NODE_CLASS} fill:#eef8ef,stroke:#467454,color:#18311d,stroke-width:1.4px`
  ];
  const id = toMermaidNodeId(entity.id || entity.logicalName);
  lines.push(`  ${id}["${buildErNodeLabel(undefined, entity, entity.id)}"]:::${ER_NODE_CLASS}`);
  return lines.join("\n");
}

function buildClassNodeLabel(
  explicitLabel: string | undefined,
  object: ObjectModel | undefined,
  fallbackId: string
): string {
  return escapeMermaidLabel(explicitLabel?.trim() || object?.name || fallbackId);
}

function buildErNodeLabel(
  explicitLabel: string | undefined,
  entity: ErEntity | undefined,
  fallbackId: string
): string {
  if (!entity) {
    return escapeMermaidLabel(explicitLabel?.trim() || fallbackId);
  }

  const lines = [entity.logicalName || explicitLabel?.trim() || fallbackId];
  if (entity.physicalName) {
    lines.push(entity.physicalName);
  }
  return escapeMermaidLabel(lines.join("<br/>"));
}

function buildClassEdgeLabel(edge: DiagramEdge): string | null {
  const internal = classDiagramEdgeToInternalEdge(edge);
  const base = internal.label?.trim() || internal.kind || null;
  const multiplicity =
    internal.fromMultiplicity || internal.toMultiplicity
      ? `${internal.fromMultiplicity ?? "-"}→${internal.toMultiplicity ?? "-"}`
      : null;
  if (base && multiplicity) {
    return `${base} (${multiplicity})`;
  }
  return base ?? multiplicity;
}

function buildErEdgeLabel(edge: DiagramEdge): string | null {
  const internal = erDiagramEdgeToInternalEdge(edge);
  return (
    internal.cardinality?.trim() ||
    internal.label?.trim() ||
    internal.id?.trim() ||
    internal.kind?.trim() ||
    null
  );
}

function sanitizeEdgeLabel(value: string | null): string | null {
  if (!value) {
    return null;
  }
  return value
    .replace(/\|/g, "/")
    .replace(/[[\]()]/g, " ")
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeMermaidLabel(value: string): string {
  return value.replace(/"/g, '\\"').replace(/\r?\n/g, "<br/>");
}

function createFallbackObjectNotice(message: string): HTMLElement {
  const root = document.createElement("section");
  root.addClass("model-weave-mermaid-shell");
  root.addClass("model-weave-mermaid-fallback-shell");
  root.appendChild(createMermaidFallbackNotice(message));
  return root;
}
