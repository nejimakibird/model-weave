import type { App } from "obsidian";
import type { ResolvedColorScheme, ResolvedDiagram } from "../types/models";
import type { RenderMode } from "../core/render-mode";
import { modelWeaveText } from "../i18n/language";
import type {
  GraphFitVerticalAlign,
  GraphViewportState
} from "./graph-view-shared";
import {
  renderClassMermaidDetailDiagram,
  renderClassMermaidDiagram,
  renderErMermaidDetailDiagram,
  renderErMermaidDiagram
} from "./class-er-mermaid";
import { renderClassDiagram, type ClassDetailLabels } from "./class-renderer";
import { renderComponentDiagram } from "./component-renderer";
import { renderDfdMermaidDiagram, type DfdDetailLabels } from "./dfd-mermaid";
import { renderErDiagram } from "./er-renderer";
import { renderFlowDiagram } from "./flow-renderer";

export function renderDiagramModel(
  diagram: ResolvedDiagram,
  options?: {
    onOpenObject?: (
      objectId: string,
      navigation?: { openInNewLeaf?: boolean }
    ) => void;
    app?: App;
    interactionSourcePath?: string;
    hideTitle?: boolean;
    hideDetails?: boolean;
    forExport?: boolean;
    renderMode?: RenderMode;
    fitVerticalAlign?: GraphFitVerticalAlign;
    viewportState?: GraphViewportState;
    onViewportStateChange?: (state: GraphViewportState) => void;
    sourcePanelContainer?: HTMLElement;
    sourcePanelPlacement?: "append" | "prepend";
    sourcePanelTitle?: string;
    sourcePanelCopyLabel?: string;
    showMermaidRenderDebug?: boolean;
    onExportPng?: () => void | Promise<void>;
    onExportAndOpenPng?: () => void | Promise<void>;
    exportPngLabel?: string;
    exportPngTitle?: string;
    exportAndOpenPngLabel?: string;
    exportAndOpenPngTitle?: string;
    colorScheme?: ResolvedColorScheme;
    dfdDetailLabels?: DfdDetailLabels;
    classDetailLabels?: ClassDetailLabels;
  }
): HTMLElement {
  switch (diagram.diagram.kind) {
    case "class":
      return renderClassDiagramByMode(diagram, options);
    case "er":
      return renderErDiagramByMode(diagram, options);
    case "dfd":
      return renderDfdMermaidDiagram(diagram, options);
    case "flow":
      return renderFlowDiagram(diagram);
    case "component":
      return renderComponentDiagram(diagram);
    default:
      return createReservedKindFallback(diagram.diagram.kind);
  }
}

function renderClassDiagramByMode(
  diagram: ResolvedDiagram,
  options?: {
    onOpenObject?: (
      objectId: string,
      navigation?: { openInNewLeaf?: boolean }
    ) => void;
    app?: App;
    interactionSourcePath?: string;
    hideTitle?: boolean;
    hideDetails?: boolean;
    forExport?: boolean;
    renderMode?: RenderMode;
    fitVerticalAlign?: GraphFitVerticalAlign;
    viewportState?: GraphViewportState;
    onViewportStateChange?: (state: GraphViewportState) => void;
    sourcePanelContainer?: HTMLElement;
    sourcePanelPlacement?: "append" | "prepend";
    sourcePanelTitle?: string;
    sourcePanelCopyLabel?: string;
    showMermaidRenderDebug?: boolean;
    onExportPng?: () => void | Promise<void>;
    onExportAndOpenPng?: () => void | Promise<void>;
    exportPngLabel?: string;
    exportPngTitle?: string;
    exportAndOpenPngLabel?: string;
    exportAndOpenPngTitle?: string;
    classDetailLabels?: ClassDetailLabels;
  }
): HTMLElement {
  const mode = options?.renderMode;
  if (mode === "mermaid-detail") {
    return renderClassMermaidDetailDiagram(diagram, options);
  }
  if (mode === "mermaid") {
    return renderClassMermaidDiagram(diagram, options);
  }
  return renderClassDiagram(diagram, options);
}

function renderErDiagramByMode(
  diagram: ResolvedDiagram,
  options?: {
    onOpenObject?: (
      objectId: string,
      navigation?: { openInNewLeaf?: boolean }
    ) => void;
    app?: App;
    interactionSourcePath?: string;
    hideTitle?: boolean;
    hideDetails?: boolean;
    forExport?: boolean;
    renderMode?: RenderMode;
    fitVerticalAlign?: GraphFitVerticalAlign;
    viewportState?: GraphViewportState;
    onViewportStateChange?: (state: GraphViewportState) => void;
    sourcePanelContainer?: HTMLElement;
    sourcePanelPlacement?: "append" | "prepend";
    sourcePanelTitle?: string;
    sourcePanelCopyLabel?: string;
    showMermaidRenderDebug?: boolean;
    onExportPng?: () => void | Promise<void>;
    onExportAndOpenPng?: () => void | Promise<void>;
    exportPngLabel?: string;
    exportPngTitle?: string;
    exportAndOpenPngLabel?: string;
    exportAndOpenPngTitle?: string;
  }
): HTMLElement {
  const mode = options?.renderMode;
  if (mode === "mermaid-detail") {
    return renderErMermaidDetailDiagram(diagram, options);
  }
  if (mode === "mermaid") {
    return renderErMermaidDiagram(diagram, options);
  }
  return renderErDiagram(diagram, options);
}

function createReservedKindFallback(kind: string): HTMLElement {
  const root = activeDocument.createElement("section");
  root.className = "mdspec-fallback";

  const title = activeDocument.createElement("h2");
  title.textContent = modelWeaveText(
    "Diagram preview is not available",
    "Diagram preview は利用できません"
  );

  const message = activeDocument.createElement("p");
  message.textContent = modelWeaveText(
    `Reserved diagram kind "${kind}" is not rendered in v1.`,
    `予約済み diagram kind "${kind}" は v1 では描画されません。`
  );

  root.append(title, message);
  return root;
}
