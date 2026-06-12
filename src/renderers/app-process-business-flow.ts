import type {
  AppProcessFlow,
  AppProcessStep,
  DomainEntry,
  ResolvedColorScheme,
  ResolvedColorStyle
} from "../types/models";
import { buildDomainTree, type DomainTreeNode } from "../core/domain-tree";
import { resolveColorStyle } from "../core/color-scheme";
import { parseReferenceValue } from "../core/reference-resolver";
import type { GraphViewportState } from "./graph-view-shared";
import {
  createMermaidFallbackNotice,
  createMermaidShell,
  renderMermaidSourceIntoShell,
  setMermaidRenderReadyPromise
} from "./mermaid-shared";
import {
  escapeMermaidLabel,
  sanitizeMermaidId,
  toMermaidQuotedLabel
} from "./mermaid-helpers";
import { decodeEscapedDisplayText } from "../utils/display-text";
import { modelWeaveText } from "../i18n/language";

export interface AppProcessBusinessFlowModel {
  title: string;
  steps: AppProcessStep[];
  flows: AppProcessFlow[];
  hasExplicitFlows: boolean;
  domains?: DomainEntry[];
}

export interface AppProcessBusinessFlowRenderOptions {
  forExport?: boolean;
  debug?: boolean;
  showMermaidRenderDebug?: boolean;
  sourcePanelContainer?: HTMLElement;
  sourcePanelPlacement?: "append" | "prepend";
  sourcePanelTitle?: string;
  sourcePanelCopyLabel?: string;
  viewportState?: GraphViewportState;
  onViewportStateChange?: (state: GraphViewportState) => void;
  colorScheme?: ResolvedColorScheme;
}

export function renderAppProcessBusinessFlow(
  model: AppProcessBusinessFlowModel,
  options: AppProcessBusinessFlowRenderOptions = {}
): HTMLElement {
  const shell = createMermaidShell({
    className: "model-weave-app-process-business-flow",
    title: `${model.title} (app_process / business flow)`,
    forExport: options.forExport
  });

  const source = buildAppProcessBusinessFlowMermaidSource(
    model,
    options.colorScheme
  );
  const ready = renderMermaidSourceIntoShell(shell, {
    source,
    renderIdPrefix: "model_weave_app_process_flow",
    fitHorizontalAlign: "left",
    fitVerticalAlign: "top",
    minZoom: 0.02,
    minFitScale: 0.03,
    viewportState: options.viewportState,
    onViewportStateChange: options.onViewportStateChange,
    showSourcePanel: !options.forExport,
    sourcePanelContainer: options.sourcePanelContainer ?? shell.root,
    sourcePanelPlacement: options.sourcePanelPlacement,
    sourcePanelTitle: options.sourcePanelTitle,
    sourcePanelCopyLabel: options.sourcePanelCopyLabel,
    showRenderDebug:
      !options.forExport &&
      options.debug !== false &&
      options.showMermaidRenderDebug === true
  }).catch((error) => {
    shell.root.addClass("model-weave-mermaid-fallback-shell");
    shell.canvas.replaceChildren(
      createMermaidFallbackNotice(
        modelWeaveText(
          "Business Flow Mermaid preview could not be rendered. Use the summary tables below.",
          "Business Flow Mermaid プレビューを描画できませんでした。下のサマリテーブルを確認してください。"
        )
      )
    );
  });

  setMermaidRenderReadyPromise(shell.root, ready);
  return shell.root;
}

export function buildAppProcessBusinessFlowMermaidSource(
  model: AppProcessBusinessFlowModel,
  colorScheme?: ResolvedColorScheme
): string {
  const stepNodeIds = new Map<AppProcessStep, string>();
  const stepNodeIdsByStepId = new Map<string, string>();
  model.steps.forEach((step, index) => {
    const nodeId = `S${index + 1}`;
    stepNodeIds.set(step, nodeId);
    if (step.id) {
      stepNodeIdsByStepId.set(step.id, nodeId);
    }
  });

  const lines = ["flowchart LR"];
  const colorClasses = new Map<string, ResolvedColorStyle>();
  const domainStyles: string[] = [];
  const nodeClasses: string[] = [];
  const localDomains = model.domains ?? [];
  const localDomainsById = new Map(localDomains.map((domain) => [domain.id, domain]));
  const domainStepGroups = new Map<string, AppProcessStep[]>();
  const flatPlacementGroups = new Map<string, AppProcessStep[]>();
  const ungrouped: AppProcessStep[] = [];

  for (const step of model.steps) {
    const domainId = step.domain?.trim();
    if (domainId && localDomainsById.has(domainId)) {
      const group = domainStepGroups.get(domainId) ?? [];
      group.push(step);
      domainStepGroups.set(domainId, group);
      continue;
    }

    const flatPlacement = getStepFlatPlacementGroup(step);
    if (!flatPlacement) {
      ungrouped.push(step);
      continue;
    }
    const group = flatPlacementGroups.get(flatPlacement) ?? [];
    group.push(step);
    flatPlacementGroups.set(flatPlacement, group);
  }

  const includedDomains = getIncludedDomains(localDomains, domainStepGroups);
  for (const root of buildDomainTree(includedDomains)) {
    appendAppProcessDomainSubgraph(
      lines,
      root,
      domainStepGroups,
      stepNodeIds,
      nodeClasses,
      colorClasses,
      domainStyles,
      colorScheme,
      1
    );
  }

  let groupIndex = 0;
  for (const [placement, steps] of flatPlacementGroups) {
    groupIndex += 1;
    lines.push(`  subgraph L${groupIndex}["${escapeMermaidLabel(placement)}"]`);
    for (const step of steps) {
      lines.push(`    ${buildStepNodeDeclaration(stepNodeIds.get(step), step)}`);
      appendStepColorClass(
        nodeClasses,
        colorClasses,
        stepNodeIds.get(step),
        step,
        colorScheme
      );
    }
    lines.push("  end");
  }

  for (const step of ungrouped) {
    lines.push(`  ${buildStepNodeDeclaration(stepNodeIds.get(step), step)}`);
    appendStepColorClass(
      nodeClasses,
      colorClasses,
      stepNodeIds.get(step),
      step,
      colorScheme
    );
  }

  const explicitEdges = model.hasExplicitFlows
    ? buildExplicitFlowEdges(model.flows, stepNodeIdsByStepId)
    : [];
  const implicitEdges = buildImplicitStepOrderEdges(
    model.steps,
    stepNodeIds,
    getExplicitFlowSourceStepIds(model.flows, stepNodeIdsByStepId)
  );
  const edges = [...implicitEdges, ...explicitEdges];

  for (const edge of edges) {
    const { fromId, toId } = edge;
    if (!fromId || !toId) {
      continue;
    }
    lines.push(
      edge.label
        ? `  ${fromId} -->|${toMermaidQuotedLabel(edge.label)}| ${toId}`
        : `  ${fromId} --> ${toId}`
    );
  }

  if (colorClasses.size > 0) {
    lines.push("");
    for (const [className, style] of colorClasses) {
      lines.push(`  classDef ${className} ${formatMermaidClassDefStyle(style)}`);
    }
    lines.push("", ...nodeClasses);
  }

  if (domainStyles.length > 0) {
    lines.push("", ...domainStyles);
  }

  return lines.join("\n");
}

export function getAppProcessBusinessFlowColorSchemeTargets(
  model: AppProcessBusinessFlowModel
): string[] {
  const targets = ["app_process"];
  if (hasResolvedAppProcessDomainGroups(model)) {
    targets.push("domain");
  }
  return targets;
}

function hasResolvedAppProcessDomainGroups(
  model: AppProcessBusinessFlowModel
): boolean {
  const domainIds = new Set(
    (model.domains ?? [])
      .map((domain) => domain.id.trim())
      .filter(Boolean)
  );
  if (domainIds.size === 0) {
    return false;
  }

  return model.steps.some((step) => {
    const domainId = step.domain?.trim();
    return Boolean(domainId && domainIds.has(domainId));
  });
}

function getIncludedDomains(
  localDomains: DomainEntry[],
  domainStepGroups: Map<string, AppProcessStep[]>
): DomainEntry[] {
  const domainsById = new Map(localDomains.map((domain) => [domain.id, domain]));
  const includedIds = new Set<string>();

  for (const domainId of domainStepGroups.keys()) {
    let current = domainsById.get(domainId);
    const seen = new Set<string>();
    while (current && !seen.has(current.id)) {
      includedIds.add(current.id);
      seen.add(current.id);
      current = current.parent ? domainsById.get(current.parent) : undefined;
    }
  }

  return localDomains.filter((domain) => includedIds.has(domain.id));
}

function appendAppProcessDomainSubgraph(
  lines: string[],
  domainNode: DomainTreeNode,
  domainStepGroups: Map<string, AppProcessStep[]>,
  stepNodeIds: Map<AppProcessStep, string>,
  nodeClasses: string[],
  colorClasses: Map<string, ResolvedColorStyle>,
  domainStyles: string[],
  colorScheme: ResolvedColorScheme | undefined,
  depth: number
): boolean {
  const childLines: string[] = [];
  for (const child of domainNode.children) {
    appendAppProcessDomainSubgraph(
      childLines,
      child,
      domainStepGroups,
      stepNodeIds,
      nodeClasses,
      colorClasses,
      domainStyles,
      colorScheme,
      depth + 1
    );
  }

  const steps = domainStepGroups.get(domainNode.domain.id) ?? [];
  if (steps.length === 0 && childLines.length === 0) {
    return false;
  }

  const indent = "  ".repeat(depth);
  lines.push(`${indent}subgraph ${toAppProcessDomainSubgraphId(domainNode.domain.id)}["${buildAppProcessDomainLabel(domainNode.domain)}"]`);
  lines.push(...childLines);
  for (const step of steps) {
    lines.push(`${indent}  ${buildStepNodeDeclaration(stepNodeIds.get(step), step)}`);
    appendStepColorClass(
      nodeClasses,
      colorClasses,
      stepNodeIds.get(step),
      step,
      colorScheme
    );
  }
  lines.push(`${indent}end`);
  if (colorScheme) {
    domainStyles.push(
      `  style ${toAppProcessDomainSubgraphId(domainNode.domain.id)} ${formatMermaidClassDefStyle(
        resolveColorStyle(colorScheme, "domain", domainNode.domain.kind)
      )}`
    );
  }
  return true;
}

function toAppProcessDomainSubgraphId(domainId: string): string {
  return `domain_${sanitizeMermaidId(domainId)}`;
}

function buildAppProcessDomainLabel(domain: DomainEntry): string {
  return escapeMermaidLabel(domain.name?.trim() || domain.id);
}

function getStepFlatPlacementGroup(step: AppProcessStep): string | null {
  const domain = step.domain?.trim();
  if (domain) {
    return domain;
  }

  const lane = step.lane?.trim();
  return lane || null;
}

function appendStepColorClass(
  nodeClasses: string[],
  colorClasses: Map<string, ResolvedColorStyle>,
  nodeId: string | undefined,
  step: AppProcessStep,
  colorScheme: ResolvedColorScheme | undefined
): void {
  if (!colorScheme || !nodeId) {
    return;
  }

  const className = toAppProcessColorClassName(step.kind);
  colorClasses.set(
    className,
    resolveColorStyle(colorScheme, "app_process", step.kind)
  );
  nodeClasses.push(`  class ${nodeId} ${className}`);
}

function toAppProcessColorClassName(kind: string | undefined): string {
  const suffix = kind?.trim() ? kind.trim() : "default";
  return `kind_app_process_${sanitizeMermaidId(suffix)}`;
}

function formatMermaidClassDefStyle(style: ResolvedColorStyle): string {
  return [
    style.fill ? `fill:${style.fill}` : undefined,
    style.stroke ? `stroke:${style.stroke}` : undefined,
    style.text ? `color:${style.text}` : undefined
  ].filter((entry): entry is string => Boolean(entry)).join(",");
}

function buildExplicitFlowEdges(
  flows: AppProcessFlow[],
  stepNodeIdsByStepId: Map<string, string>
): Array<{ fromId: string; toId: string; label: string }> {
  return flows
    .map((flow) => ({
      fromId: stepNodeIdsByStepId.get(flow.from),
      toId: stepNodeIdsByStepId.get(flow.to),
      label: getFlowLabel(flow)
    }))
    .filter(
      (edge): edge is { fromId: string; toId: string; label: string } =>
        Boolean(edge.fromId && edge.toId)
    );
}

function buildImplicitStepOrderEdges(
  steps: AppProcessStep[],
  stepNodeIds: Map<AppProcessStep, string>,
  suppressedSourceStepIds: Set<string>
): Array<{ fromId: string; toId: string; label: string }> {
  return steps
    .slice(0, -1)
    .filter((step) => !suppressedSourceStepIds.has(step.id))
    .map((step, index) => ({
      fromId: stepNodeIds.get(step),
      toId: stepNodeIds.get(getNextStep(steps, step)!),
      label: ""
    }))
    .filter(
      (edge): edge is { fromId: string; toId: string; label: string } =>
        Boolean(edge.fromId && edge.toId)
    );
}

function getExplicitFlowSourceStepIds(
  flows: AppProcessFlow[],
  stepNodeIdsByStepId: Map<string, string>
): Set<string> {
  return new Set(
    flows
      .filter((flow) =>
        Boolean(
          flow.from &&
          flow.to &&
          stepNodeIdsByStepId.has(flow.from) &&
          stepNodeIdsByStepId.has(flow.to)
        )
      )
      .map((flow) => flow.from)
  );
}

function getNextStep(
  steps: AppProcessStep[],
  step: AppProcessStep
): AppProcessStep | undefined {
  const index = steps.indexOf(step);
  return index >= 0 ? steps[index + 1] : undefined;
}

function getStepLabel(step: AppProcessStep): string {
  return decodeEscapedDisplayText(step.label?.trim()) || step.id || "(step)";
}

function buildStepNodeDeclaration(
  nodeId: string | undefined,
  step: AppProcessStep
): string {
  const id = nodeId ?? "S";
  const label = toMermaidQuotedLabel(getStepLabel(step));
  switch (getStepShapeKind(step)) {
    case "terminal":
      return `${id}([${label}])`;
    case "decision":
      return `${id}{${label}}`;
    case "input":
      return `${id}[/${label}/]`;
    case "subflow":
      return `${id}[[${label}]]`;
    case "process":
    default:
      return `${id}[${label}]`;
  }
}

function getStepShapeKind(
  step: AppProcessStep
): "terminal" | "process" | "decision" | "input" | "subflow" {
  const kind = step.kind?.trim().toLowerCase();
  switch (kind) {
    case "start":
    case "end":
      return "terminal";
    case "decision":
      return "decision";
    case "input":
    case "screen":
      return "input";
    case "flow":
    case "subflow":
      return "subflow";
    case "process":
    default:
      return "process";
  }
}

function getFlowLabel(flow: AppProcessFlow): string {
  const label = flow.label?.trim();
  if (label) {
    return decodeEscapedDisplayText(label);
  }

  return decodeEscapedDisplayText(formatConditionLabel(flow.condition) ?? "");
}

function formatConditionLabel(condition: string | undefined): string | null {
  const trimmed = condition?.trim();
  if (!trimmed) {
    return null;
  }

  const formatted = trimmed.replace(
    /\[\[([^\]]+)\]\](\.\s*[A-Za-z0-9_-]+)?/g,
    (match, inner: string, suffix: string | undefined) => {
      const display = formatReferenceDisplayLabel(`[[${inner}]]`);
      if (!display) {
        return match;
      }
      return `${display}${suffix ? suffix.replace(/\s+/g, "") : ""}`;
    }
  );

  if (formatted !== trimmed) {
    return formatted;
  }

  return formatReferenceDisplayLabel(trimmed) ?? trimmed;
}

function formatReferenceDisplayLabel(reference: string): string | null {
  const parsed = parseReferenceValue(reference);
  if (!parsed || parsed.kind === "raw") {
    return null;
  }

  const display = parsed.display?.trim();
  if (display) {
    return display;
  }

  const target = parsed.target?.trim();
  if (!target) {
    return null;
  }

  return target
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .pop()
    ?.replace(/\.md$/i, "") ?? null;
}
