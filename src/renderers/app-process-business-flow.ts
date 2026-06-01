import type { AppProcessFlow, AppProcessStep } from "../types/models";
import { parseReferenceValue } from "../core/reference-resolver";
import type { GraphViewportState } from "./graph-view-shared";
import {
  createMermaidFallbackNotice,
  createMermaidShell,
  renderMermaidSourceIntoShell,
  setMermaidRenderReadyPromise
} from "./mermaid-shared";
import {
  escapeMermaidEdgeLabel,
  escapeMermaidLabel
} from "./mermaid-helpers";

export interface AppProcessBusinessFlowModel {
  title: string;
  steps: AppProcessStep[];
  flows: AppProcessFlow[];
  hasExplicitFlows: boolean;
}

export interface AppProcessBusinessFlowRenderOptions {
  forExport?: boolean;
  debug?: boolean;
  showMermaidRenderDebug?: boolean;
  sourcePanelContainer?: HTMLElement;
  sourcePanelPlacement?: "append" | "prepend";
  viewportState?: GraphViewportState;
  onViewportStateChange?: (state: GraphViewportState) => void;
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

  const source = buildAppProcessBusinessFlowMermaidSource(model);
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
    showRenderDebug:
      !options.forExport &&
      options.debug !== false &&
      options.showMermaidRenderDebug === true
  }).catch((error) => {
    shell.root.addClass("model-weave-mermaid-fallback-shell");
    shell.canvas.replaceChildren(
      createMermaidFallbackNotice(
        "Business Flow Mermaid preview could not be rendered. Use the summary tables below."
      )
    );
  });

  setMermaidRenderReadyPromise(shell.root, ready);
  return shell.root;
}

export function buildAppProcessBusinessFlowMermaidSource(
  model: AppProcessBusinessFlowModel
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
  const laneGroups = new Map<string, AppProcessStep[]>();
  const unlaned: AppProcessStep[] = [];

  for (const step of model.steps) {
    const lane = step.lane?.trim();
    if (!lane) {
      unlaned.push(step);
      continue;
    }
    const group = laneGroups.get(lane) ?? [];
    group.push(step);
    laneGroups.set(lane, group);
  }

  let laneIndex = 0;
  for (const [lane, steps] of laneGroups) {
    laneIndex += 1;
    lines.push(`  subgraph L${laneIndex}["${escapeMermaidLabel(lane)}"]`);
    for (const step of steps) {
      lines.push(`    ${buildStepNodeDeclaration(stepNodeIds.get(step), step)}`);
    }
    lines.push("  end");
  }

  for (const step of unlaned) {
    lines.push(`  ${buildStepNodeDeclaration(stepNodeIds.get(step), step)}`);
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
        ? `  ${fromId} -->|${escapeMermaidEdgeLabel(edge.label)}| ${toId}`
        : `  ${fromId} --> ${toId}`
    );
  }

  return lines.join("\n");
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
  return step.label?.trim() || step.id || "(step)";
}

function buildStepNodeDeclaration(
  nodeId: string | undefined,
  step: AppProcessStep
): string {
  const id = nodeId ?? "S";
  const label = escapeStepNodeLabel(getStepLabel(step));
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

function escapeStepNodeLabel(label: string): string {
  return escapeMermaidLabel(label)
    .replace(/\(/g, "&#40;")
    .replace(/\)/g, "&#41;")
    .replace(/\{/g, "&#123;")
    .replace(/\}/g, "&#125;")
    .replace(/\//g, "&#47;");
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
    return label;
  }

  return formatConditionLabel(flow.condition) ?? "";
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
