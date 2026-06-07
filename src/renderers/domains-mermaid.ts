import { buildDomainTree, type DomainTreeNode } from "../core/domain-tree";
import { modelWeaveText } from "../i18n/language";
import type { DomainEntry } from "../types/models";
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

export interface DomainsMermaidRenderOptions {
  title: string;
  mode?: "mindmap" | "area";
  renderFailedMessage?: string;
  fitVerticalAlign?: GraphFitVerticalAlign;
  sourcePanelContainer?: HTMLElement;
  sourcePanelPlacement?: "append" | "prepend";
  viewportState?: GraphViewportState;
  onViewportStateChange?: (state: GraphViewportState) => void;
  showMermaidRenderDebug?: boolean;
}

export function renderDomainsMermaidDiagram(
  domains: DomainEntry[],
  options: DomainsMermaidRenderOptions
): HTMLElement {
  const shell = createMermaidShell({
    className: "model-weave-domains-mermaid",
    title: options.title
  });
  const mode = options.mode ?? "area";

  const ready = renderMermaidSourceIntoShell(shell, {
    source: mode === "mindmap"
      ? buildDomainMindmapMermaid(domains)
      : buildDomainHierarchyMermaid(domains),
    renderIdPrefix: mode === "mindmap"
      ? "model_weave_domains_mindmap"
      : "model_weave_domains",
    fitHorizontalAlign: "left",
    fitVerticalAlign: options.fitVerticalAlign,
    minZoom: 0.08,
    minFitScale: 0.08,
    viewportState: options.viewportState,
    onViewportStateChange: options.onViewportStateChange,
    sourcePanelContainer: options.sourcePanelContainer,
    sourcePanelPlacement: options.sourcePanelPlacement,
    showRenderDebug: options.showMermaidRenderDebug === true
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

export function buildDomainHierarchyMermaid(domains: DomainEntry[]): string {
  const roots = buildDomainTree(domains);
  const idMap = createDomainMermaidIds(domains);
  const lines = ["flowchart TB", ""];

  for (const root of roots) {
    appendDomainNodeLines(lines, root, idMap, 0);
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

function appendDomainNodeLines(
  lines: string[],
  node: DomainTreeNode,
  idMap: Map<DomainEntry, string>,
  depth: number
): void {
  const indent = "  ".repeat(depth);
  const mermaidId = idMap.get(node.domain) ?? toDomainMermaidId(node.domain.id);
  const label = escapeDomainMermaidLabel(getDomainMermaidLabel(node.domain));

  if (node.children.length === 0) {
    lines.push(`${indent}${mermaidId}["${label}"]`);
    return;
  }

  lines.push(`${indent}subgraph ${mermaidId}["${label}"]`);
  for (const child of node.children) {
    appendDomainNodeLines(lines, child, idMap, depth + 1);
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
