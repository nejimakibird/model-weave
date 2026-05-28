import type { AppProcessFlow, AppProcessStep } from "../types/models";
import type { GraphFitMetrics, GraphViewportState } from "./graph-view-shared";
import {
  createMermaidFallbackNotice,
  createMermaidShell,
  renderMermaidSourceIntoShell,
  setMermaidRenderReadyPromise
} from "./mermaid-shared";

const SHOW_APP_PROCESS_BUSINESS_FLOW_DEBUG = true;

export interface AppProcessBusinessFlowModel {
  title: string;
  steps: AppProcessStep[];
  flows: AppProcessFlow[];
  hasExplicitFlows: boolean;
}

export interface AppProcessBusinessFlowRenderOptions {
  forExport?: boolean;
  debug?: boolean;
  debugContainer?: HTMLElement;
  viewportState?: GraphViewportState;
  onViewportStateChange?: (state: GraphViewportState) => void;
}

export function renderAppProcessBusinessFlow(
  model: AppProcessBusinessFlowModel,
  options: AppProcessBusinessFlowRenderOptions = {}
): HTMLElement {
  const shell = createMermaidShell({
    className: "model-weave-app-process-business-flow",
    title: "Business Flow",
    forExport: options.forExport
  });

  const source = buildAppProcessBusinessFlowMermaidSource(model);
  const debug =
    SHOW_APP_PROCESS_BUSINESS_FLOW_DEBUG &&
    !options.forExport &&
    options.debug !== false
      ? createBusinessFlowDebugSection(source)
      : null;
  if (debug) {
    (options.debugContainer ?? shell.root).appendChild(debug.root);
  }

  const ready = renderMermaidSourceIntoShell(shell, {
    source,
    renderIdPrefix: "model_weave_app_process_flow",
    fitHorizontalAlign: "left",
    fitVerticalAlign: "top",
    minZoom: 0.02,
    minFitScale: 0.03,
    viewportState: options.viewportState,
    onViewportStateChange: options.onViewportStateChange,
    onFitMetrics: (metrics) => {
      updateBusinessFlowDebug(debug, { fit: metrics });
    }
  }).then(() => {
    updateBusinessFlowDebug(debug, {
      status: "rendered",
      svg: readBusinessFlowSvgInfo(shell.surface)
    });
  }).catch((error) => {
    shell.root.addClass("model-weave-mermaid-fallback-shell");
    shell.canvas.replaceChildren(
      createMermaidFallbackNotice(
        "Business Flow Mermaid preview could not be rendered. Use the summary tables below."
      )
    );
    updateBusinessFlowDebug(debug, {
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
      svg: readBusinessFlowSvgInfo(shell.surface)
    });
  });

  updateBusinessFlowDebug(debug, { status: "generated" });
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
      lines.push(`    ${stepNodeIds.get(step)}["${escapeMermaidLabel(getStepLabel(step))}"]`);
    }
    lines.push("  end");
  }

  for (const step of unlaned) {
    lines.push(`  ${stepNodeIds.get(step)}["${escapeMermaidLabel(getStepLabel(step))}"]`);
  }

  const subflowNodeIds = model.steps
    .filter(isSubflowStep)
    .map((step) => stepNodeIds.get(step))
    .filter((nodeId): nodeId is string => Boolean(nodeId));
  if (subflowNodeIds.length > 0) {
    lines.push(`  class ${subflowNodeIds.join(",")} modelWeaveSubflowNode`);
    lines.push("  classDef modelWeaveSubflowNode stroke-width:2px,stroke-dasharray: 5 3");
  }

  const edges = model.hasExplicitFlows
    ? model.flows.map((flow) => ({
        fromId: stepNodeIdsByStepId.get(flow.from),
        toId: stepNodeIdsByStepId.get(flow.to),
        label: getFlowLabel(flow)
      }))
    : model.steps.slice(0, -1).map((step, index) => ({
        fromId: stepNodeIds.get(step),
        toId: stepNodeIds.get(model.steps[index + 1]!),
        label: ""
      }));

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

function getStepLabel(step: AppProcessStep): string {
  return step.label?.trim() || step.id || "(step)";
}

function isSubflowStep(step: AppProcessStep): boolean {
  const kind = step.kind?.trim().toLowerCase();
  return kind === "flow" || kind === "subflow";
}

function getFlowLabel(flow: AppProcessFlow): string {
  const parts = [flow.label?.trim(), flow.condition?.trim()].filter(
    (part): part is string => Boolean(part)
  );
  return parts.join(" / ");
}

function escapeMermaidLabel(value: string): string {
  return value
    .replace(/"/g, '\\"')
    .replace(/\|/g, "/")
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeMermaidEdgeLabel(value: string): string {
  return value
    .replace(/["|]/g, "/")
    .replace(/[[\]{}()<>]/g, " ")
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface BusinessFlowDebugElements {
  root: HTMLElement;
  status: HTMLElement;
  error: HTMLElement;
  svgInfo: HTMLElement;
  fitInfo: HTMLElement;
}

function createBusinessFlowDebugSection(source: string): BusinessFlowDebugElements {
  const root = document.createElement("details");
  root.addClass("model-weave-preview-section");
  root.addClass("model-weave-business-flow-debug");

  const summary = document.createElement("summary");
  summary.textContent = "Business Flow Debug";
  summary.addClass("model-weave-preview-section-title");
  root.appendChild(summary);

  const status = root.createEl("p", {
    text: "Render status: generated",
    cls: "model-weave-summary-muted"
  });
  const error = root.createEl("p", {
    text: "Render error: -",
    cls: "model-weave-summary-muted"
  });
  const svgInfo = root.createEl("p", {
    text: "SVG: not rendered",
    cls: "model-weave-summary-muted"
  });
  const fitInfo = root.createEl("p", {
    text: "Fit: not measured",
    cls: "model-weave-summary-muted"
  });

  root.createEl("h4", { text: "Generated Mermaid source" });
  const pre = root.createEl("pre", { cls: "model-weave-business-flow-debug-source" });
  pre.createEl("code", { text: source });

  return { root, status, error, svgInfo, fitInfo };
}

function updateBusinessFlowDebug(
  debug: BusinessFlowDebugElements | null,
  update: {
    status?: "generated" | "rendered" | "failed";
    error?: string;
    svg?: BusinessFlowSvgInfo;
    fit?: GraphFitMetrics;
  }
): void {
  if (!debug) {
    return;
  }
  if (update.status) {
    debug.status.textContent = `Render status: ${update.status}`;
  }
  if (update.error) {
    debug.error.textContent = `Render error: ${update.error}`;
  }
  if (update.svg) {
    debug.svgInfo.textContent = [
      `SVG exists: ${update.svg.exists ? "yes" : "no"}`,
      `width: ${update.svg.width || "-"}`,
      `height: ${update.svg.height || "-"}`,
      `viewBox: ${update.svg.viewBox || "-"}`,
      `child elements: ${update.svg.childElementCount}`
    ].join(" / ");
  }
  if (update.fit) {
    debug.fitInfo.textContent = [
      `Fit bounds source: ${update.fit.boundsSource}`,
      `viewport: ${formatFitNumber(update.fit.viewportWidth)}x${formatFitNumber(update.fit.viewportHeight)}`,
      `bounds: ${formatFitNumber(update.fit.boundsX)},${formatFitNumber(update.fit.boundsY)} ${formatFitNumber(update.fit.boundsWidth)}x${formatFitNumber(update.fit.boundsHeight)}`,
      `computed scale: ${formatFitPercent(update.fit.computedScale)}`,
      `applied scale: ${formatFitPercent(update.fit.appliedScale)}`,
      `pan: ${formatFitNumber(update.fit.panX)},${formatFitNumber(update.fit.panY)}`,
      update.fit.warning ? `warning: ${update.fit.warning}` : null
    ].filter((part): part is string => Boolean(part)).join(" / ");
  }
}

function formatFitNumber(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2).replace(/\.00$/, "") : "-";
}

function formatFitPercent(value: number): string {
  return Number.isFinite(value) ? `${Math.round(value * 100)}%` : "-";
}

interface BusinessFlowSvgInfo {
  exists: boolean;
  width: string;
  height: string;
  viewBox: string;
  childElementCount: number;
}

function readBusinessFlowSvgInfo(surface: HTMLElement): BusinessFlowSvgInfo {
  const svg = surface.querySelector("svg");
  if (!svg) {
    return {
      exists: false,
      width: "",
      height: "",
      viewBox: "",
      childElementCount: 0
    };
  }
  return {
    exists: true,
    width: svg.getAttribute("width") ?? "",
    height: svg.getAttribute("height") ?? "",
    viewBox: svg.getAttribute("viewBox") ?? "",
    childElementCount: svg.querySelectorAll("*").length
  };
}
