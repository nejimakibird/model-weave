import type { FlowDiagramModel, FlowDiagramViewMode } from "../types/models";

interface FlowDiagramViewModeEntry {
  mode: FlowDiagramViewMode;
  initializationKey: string;
}

export interface FlowDiagramViewModeSyncResult {
  mode: FlowDiagramViewMode;
  initializationChanged: boolean;
}

export function normalizeFlowDiagramViewMode(value: unknown): FlowDiagramViewMode | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "detail" || normalized === "screen" ? normalized : undefined;
}

export function resolveInitialFlowDiagramViewMode(
  diagram: Pick<FlowDiagramModel, "flowView" | "flowViewSpecified" | "flowViewRaw">,
  defaultViewMode?: unknown
): FlowDiagramViewMode {
  return diagram.flowViewSpecified
    ? diagram.flowView
    : normalizeFlowDiagramViewMode(defaultViewMode) ?? "detail";
}

export function buildFlowDiagramViewModeInitializationKey(
  diagram: Pick<FlowDiagramModel, "flowView" | "flowViewSpecified" | "flowViewRaw">,
  defaultViewMode?: unknown
): string {
  if (diagram.flowViewSpecified) {
    return `frontmatter:${diagram.flowView}`;
  }

  const defaultMode = normalizeFlowDiagramViewMode(defaultViewMode) ?? "detail";
  const rawValue = typeof diagram.flowViewRaw === "string" ? diagram.flowViewRaw.trim() : "";
  return rawValue
    ? `invalid:${rawValue}:settings:${defaultMode}`
    : `settings:${defaultMode}`;
}

export class FlowDiagramViewModeState {
  private readonly entriesByFilePath = new Map<string, FlowDiagramViewModeEntry>();

  synchronize(
    filePath: string,
    diagram: Pick<FlowDiagramModel, "flowView" | "flowViewSpecified" | "flowViewRaw">,
    defaultViewMode?: unknown
  ): FlowDiagramViewModeSyncResult {
    const initializationKey = buildFlowDiagramViewModeInitializationKey(diagram, defaultViewMode);
    const existing = this.entriesByFilePath.get(filePath);
    if (existing?.initializationKey === initializationKey) {
      return { mode: existing.mode, initializationChanged: false };
    }

    const mode = resolveInitialFlowDiagramViewMode(diagram, defaultViewMode);
    this.entriesByFilePath.set(filePath, { mode, initializationKey });
    return { mode, initializationChanged: true };
  }

  getOrInitialize(
    filePath: string,
    diagram: Pick<FlowDiagramModel, "flowView" | "flowViewSpecified" | "flowViewRaw">,
    defaultViewMode?: unknown
  ): FlowDiagramViewMode {
    return this.synchronize(filePath, diagram, defaultViewMode).mode;
  }

  set(filePath: string, mode: FlowDiagramViewMode): void {
    const existing = this.entriesByFilePath.get(filePath);
    if (!existing) {
      return;
    }
    existing.mode = mode;
  }
}
