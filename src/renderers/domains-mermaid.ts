import type { App } from "obsidian";
import { buildDomainTree, type DomainTreeNode } from "../core/domain-tree";
import { resolveColorStyle } from "../core/color-scheme";
import { modelWeaveText } from "../i18n/language";
import { attachMermaidNodeInteractions, type GraphInteractionTarget } from "../views/mermaid-node-interactions";
import type {
  DomainEntry,
  ResolvedColorScheme,
  ResolvedColorStyle
} from "../types/models";
import type {
  GraphFitVerticalAlign,
  GraphViewportState
} from "./graph-view-shared";
import {
  createMermaidFallbackNotice,
  createMermaidShell,
  renderMermaidSourceIntoShell,
  setMermaidRenderReadyPromise
} from "./mermaid-shared";
import {
  ensureUniqueMermaidId,
  sanitizeMermaidId
} from "./mermaid-helpers";

export type DomainsMermaidMode = "mindmap" | "area" | "tree";

export interface DomainsMermaidRenderOptions {
  title: string;
  mode?: DomainsMermaidMode;
  renderFailedMessage?: string;
  fitVerticalAlign?: GraphFitVerticalAlign;
  sourcePanelContainer?: HTMLElement;
  sourcePanelPlacement?: "append" | "prepend";
  sourcePanelTitle?: string;
  sourcePanelCopyLabel?: string;
  viewportState?: GraphViewportState;
  onViewportStateChange?: (state: GraphViewportState) => void;
  onExportPng?: () => void | Promise<void>;
  onExportAndOpenPng?: () => void | Promise<void>;
  exportPngLabel?: string;
  exportPngTitle?: string;
  exportAndOpenPngLabel?: string;
  exportAndOpenPngTitle?: string;
  showMermaidRenderDebug?: boolean;
  colorScheme?: ResolvedColorScheme;
  forExport?: boolean;
  app?: App;
  interactionSourcePath?: string;
}

export function renderDomainsMermaidDiagram(
  domains: DomainEntry[],
  options: DomainsMermaidRenderOptions
): HTMLElement {
  const shell = createMermaidShell({
    className: "model-weave-domains-mermaid",
    title: options.title,
    forExport: options.forExport === true,
    onExportPng: options.onExportPng,
    onExportAndOpenPng: options.onExportAndOpenPng,
    exportPngLabel: options.exportPngLabel,
    exportPngTitle: options.exportPngTitle,
    exportAndOpenPngLabel: options.exportAndOpenPngLabel,
    exportAndOpenPngTitle: options.exportAndOpenPngTitle
  });
  const mode = options.mode ?? "area";
  shell.root.addClass(`model-weave-domains-mermaid-mode-${mode}`);
  const interactionTargets = buildDomainsMermaidInteractionTargets(
    domains,
    mode,
    options.interactionSourcePath ?? ""
  );

  const ready = renderMermaidSourceIntoShell(shell, {
    source: buildDomainsMermaidSource(domains, mode, options.colorScheme),
    renderIdPrefix: getDomainsMermaidRenderIdPrefix(mode),
    fitHorizontalAlign: "left",
    fitVerticalAlign: options.fitVerticalAlign,
    minZoom: 0.08,
    minFitScale: 0.08,
    viewportState: options.viewportState,
    onViewportStateChange: options.onViewportStateChange,
    staticRender: options.forExport === true,
    showSourcePanel: options.forExport === true ? false : undefined,
    sourcePanelContainer: options.sourcePanelContainer,
    sourcePanelPlacement: options.sourcePanelPlacement,
    sourcePanelTitle: options.sourcePanelTitle,
    sourcePanelCopyLabel: options.sourcePanelCopyLabel,
    showRenderDebug: options.forExport === true
      ? false
      : options.showMermaidRenderDebug === true
  }).then(() => {
    if (options.forExport !== true && options.app && interactionTargets.length > 0) {
      attachMermaidNodeInteractions({
        app: options.app,
        rootEl: shell.surface,
        targets: interactionTargets,
        source: "model-weave",
        nodeClassName: "model-weave-mermaid-interactive-node",
        dragThreshold: 6,
        hoverParent: (nodeEl, fallback) =>
          nodeEl.closest<HTMLElement>(
            ".model-weave-view-only-stage, .model-weave-domains-mermaid, .model-weave-mermaid-shell"
          ) ?? fallback,
        formatTitle: (target) => target.label
          ? `${target.label} (${target.targetType ?? "model"})`
          : target.linktext
      });
    }
  }).catch(() => {
    shell.root.addClass("model-weave-mermaid-fallback-shell");
    shell.canvas.replaceChildren(
      createMermaidFallbackNotice(
        options.renderFailedMessage ?? modelWeaveText(
          "Domain hierarchy diagram could not be rendered.",
          "Domain 階層図を描画できませんでした。"
        )
      )
    );
  });

  setMermaidRenderReadyPromise(shell.root, ready);
  return shell.root;
}


function buildDomainsMermaidInteractionTargets(
  domains: DomainEntry[],
  mode: DomainsMermaidMode,
  sourcePath: string
): GraphInteractionTarget[] {
  if (!sourcePath) {
    return [];
  }

  if (mode === "mindmap") {
    return domains.map((domain) => ({
      mermaidId: toDomainMermaidId(domain.id),
      linktext: sourcePath,
      sourcePath,
      label: getDomainMindmapLabel(domain),
      kind: "domain-node",
      targetType: "domain",
      filePath: sourcePath,
      modelId: domain.id,
      modelType: "domain"
    }));
  }

  const idMap = createDomainMermaidIds(domains);
  return domains.map((domain) => ({
    mermaidId: idMap.get(domain) ?? toDomainMermaidId(domain.id),
    linktext: sourcePath,
    sourcePath,
    label: getDomainMermaidLabel(domain),
    kind: "domain-node",
    targetType: "domain",
    filePath: sourcePath,
    modelId: domain.id,
    modelType: "domain"
  }));
}

function buildDomainsMermaidSource(
  domains: DomainEntry[],
  mode: DomainsMermaidMode,
  colorScheme?: ResolvedColorScheme
): string {
  if (mode === "mindmap") {
    return buildDomainMindmapMermaid(domains);
  }

  if (mode === "tree") {
    return buildDomainTreeViewMermaid(domains, colorScheme);
  }

  return buildDomainHierarchyMermaid(domains, colorScheme);
}

function getDomainsMermaidRenderIdPrefix(mode: DomainsMermaidMode): string {
  if (mode === "mindmap") {
    return "model_weave_domains_mindmap";
  }

  if (mode === "tree") {
    return "model_weave_domains_tree";
  }

  return "model_weave_domains";
}

export function buildDomainHierarchyMermaid(
  domains: DomainEntry[],
  colorScheme?: ResolvedColorScheme
): string {
  const roots = buildDomainTree(domains);
  const idMap = createDomainMermaidIds(domains);
  const lines = ["flowchart TB", ""];
  const nodeStyles: string[] = [];

  for (const root of roots) {
    appendDomainNodeLines(lines, root, idMap, 0, colorScheme, nodeStyles);
  }

  if (nodeStyles.length > 0) {
    lines.push("", ...nodeStyles);
  }

  return lines.join("\n").trimEnd();
}

export function buildDomainTreeViewMermaid(
  domains: DomainEntry[],
  colorScheme?: ResolvedColorScheme
): string {
  const roots = buildDomainTree(domains);
  const idMap = createDomainMermaidIds(domains);
  const lines = ["flowchart TB"];
  const edges: string[] = [];
  const colorClasses = new Map<string, ResolvedColorStyle>();
  const nodeClasses: string[] = [];

  for (const domain of domains) {
    const mermaidId = idMap.get(domain) ?? toDomainMermaidId(domain.id);
    const label = escapeDomainMermaidLabel(getDomainMermaidLabel(domain));
    lines.push(`  ${mermaidId}["${label}"]`);

    if (colorScheme) {
      const className = toDomainColorClassName(domain.kind);
      colorClasses.set(
        className,
        resolveColorStyle(colorScheme, "domain", domain.kind)
      );
      nodeClasses.push(`  class ${mermaidId} ${className}`);
    }
  }

  for (const root of roots) {
    appendDomainTreeViewEdgeLines(edges, root, idMap, new Set<string>());
  }

  if (edges.length > 0) {
    lines.push("", ...edges);
  }

  if (colorClasses.size > 0) {
    lines.push("");
    for (const [className, style] of colorClasses) {
      lines.push(`  classDef ${className} ${formatMermaidClassDefStyle(style)}`);
    }
    lines.push("", ...nodeClasses);
  }

  return lines.join("\n").trimEnd();
}

export function buildDomainMindmapMermaid(domains: DomainEntry[]): string {
  const roots = buildDomainTree(domains);
  const lines = ["mindmap"];

  if (roots.length === 0) {
    return lines.join("\n");
  }

  if (roots.length === 1) {
    appendDomainMindmapRootLines(lines, roots[0]);
    return lines.join("\n");
  }

  lines.push("  root((Domains))");
  for (const root of roots) {
    appendDomainMindmapNodeLines(lines, root, 2, new Set<string>());
  }

  return lines.join("\n");
}

function appendDomainMindmapRootLines(
  lines: string[],
  root: DomainTreeNode
): void {
  lines.push(`  root((${escapeDomainMindmapLabel(getDomainMindmapLabel(root.domain))}))`);
  const visited = new Set<string>([root.domain.id]);
  for (const child of root.children) {
    appendDomainMindmapNodeLines(lines, child, 2, visited);
  }
}

function appendDomainMindmapNodeLines(
  lines: string[],
  node: DomainTreeNode,
  depth: number,
  visited: Set<string>
): void {
  if (visited.has(node.domain.id)) {
    return;
  }

  const indent = "  ".repeat(depth);
  lines.push(`${indent}${escapeDomainMindmapLabel(getDomainMindmapLabel(node.domain))}`);

  const nextVisited = new Set(visited);
  nextVisited.add(node.domain.id);
  for (const child of node.children) {
    appendDomainMindmapNodeLines(lines, child, depth + 1, nextVisited);
  }
}

function appendDomainTreeViewEdgeLines(
  lines: string[],
  node: DomainTreeNode,
  idMap: Map<DomainEntry, string>,
  visited: Set<string>
): void {
  if (visited.has(node.domain.id)) {
    return;
  }

  const parentId = idMap.get(node.domain) ?? toDomainMermaidId(node.domain.id);
  const nextVisited = new Set(visited);
  nextVisited.add(node.domain.id);

  for (const child of node.children) {
    const childId = idMap.get(child.domain) ?? toDomainMermaidId(child.domain.id);
    lines.push(`  ${parentId} --> ${childId}`);
    appendDomainTreeViewEdgeLines(lines, child, idMap, nextVisited);
  }
}

function appendDomainNodeLines(
  lines: string[],
  node: DomainTreeNode,
  idMap: Map<DomainEntry, string>,
  depth: number,
  colorScheme: ResolvedColorScheme | undefined,
  nodeStyles: string[]
): void {
  const indent = "  ".repeat(depth);
  const mermaidId = idMap.get(node.domain) ?? toDomainMermaidId(node.domain.id);
  const label = escapeDomainMermaidLabel(getDomainMermaidLabel(node.domain));

  if (colorScheme) {
    nodeStyles.push(
      `  style ${mermaidId} ${formatMermaidClassDefStyle(
        resolveColorStyle(colorScheme, "domain", node.domain.kind)
      )}`
    );
  }

  if (node.children.length === 0) {
    lines.push(`${indent}${mermaidId}["${label}"]`);
    return;
  }

  lines.push(`${indent}subgraph ${mermaidId}["${label}"]`);
  for (const child of node.children) {
    appendDomainNodeLines(lines, child, idMap, depth + 1, colorScheme, nodeStyles);
  }
  lines.push(`${indent}end`);
}

function createDomainMermaidIds(domains: DomainEntry[]): Map<DomainEntry, string> {
  const usedIds = new Set<string>();
  const idMap = new Map<DomainEntry, string>();

  for (const domain of domains) {
    idMap.set(
      domain,
      ensureUniqueMermaidId(toDomainMermaidId(domain.id), usedIds)
    );
  }

  return idMap;
}

function toDomainMermaidId(id: string): string {
  return `domain_${sanitizeMermaidId(id)}`;
}

function toDomainColorClassName(kind: string | undefined): string {
  const suffix = kind?.trim() ? kind.trim() : "default";
  return `kind_domain_${sanitizeMermaidId(suffix)}`;
}

function formatMermaidClassDefStyle(style: ResolvedColorStyle): string {
  return [
    style.fill ? `fill:${style.fill}` : undefined,
    style.stroke ? `stroke:${style.stroke}` : undefined,
    style.text ? `color:${style.text}` : undefined
  ].filter((entry): entry is string => Boolean(entry)).join(",");
}

function getDomainMermaidLabel(domain: DomainEntry): string {
  const label = domain.name?.trim() || domain.id;
  return domain.kind?.trim() ? `${label} [${domain.kind.trim()}]` : label;
}

function getDomainMindmapLabel(domain: DomainEntry): string {
  const label = domain.name?.trim() || domain.id;
  return domain.kind?.trim() ? `${label}（${domain.kind.trim()}）` : label;
}

function escapeDomainMermaidLabel(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) =>
      line
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"')
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
    )
    .join("<br/>");
}

function escapeDomainMindmapLabel(value: string): string {
  // Mermaid mindmap uses parentheses for node shapes, so normalize them in labels.
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/\n/g, " ")
    .replace(/\(/g, "（")
    .replace(/\)/g, "）")
    .replace(/\s+/g, " ")
    .trim();
}
