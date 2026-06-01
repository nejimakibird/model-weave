import type { ResolvedDiagram } from "../types/models";
import type { EffectiveRenderMode, RenderMode } from "../core/render-mode";
import type {
  GraphFitVerticalAlign,
  GraphViewportState
} from "./graph-view-shared";
import {
  renderClassMermaidDetailDiagram,
  renderClassMermaidDiagram,
  renderErMermaidDiagram
} from "./class-er-mermaid";
import { renderClassDiagram } from "./class-renderer";
import { renderComponentDiagram } from "./component-renderer";
import { renderDfdMermaidDiagram } from "./dfd-mermaid";
import { renderErDiagram } from "./er-renderer";
import { renderFlowDiagram } from "./flow-renderer";

export function renderDiagramModel(
  diagram: ResolvedDiagram,
  options?: {
    onOpenObject?: (
      objectId: string,
      navigation?: { openInNewLeaf?: boolean }
    ) => void;
    hideTitle?: boolean;
    hideDetails?: boolean;
    forExport?: boolean;
    renderMode?: RenderMode;
    fitVerticalAlign?: GraphFitVerticalAlign;
    viewportState?: GraphViewportState;
    onViewportStateChange?: (state: GraphViewportState) => void;
  }
): HTMLElement {
  switch (diagram.diagram.kind) {
    case "class":
      return renderClassDiagramByMode(diagram, options);
    case "er":
      return options?.renderMode === "mermaid"
        ? renderErMermaidDiagram(diagram, options)
        : renderErDiagram(diagram, options);
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
    hideTitle?: boolean;
    hideDetails?: boolean;
    forExport?: boolean;
    renderMode?: RenderMode;
    fitVerticalAlign?: GraphFitVerticalAlign;
    viewportState?: GraphViewportState;
    onViewportStateChange?: (state: GraphViewportState) => void;
  }
): HTMLElement {
  const mode = options?.renderMode as EffectiveRenderMode | undefined;
  if (mode === "mermaid-detail") {
    return renderClassMermaidDetailDiagram(diagram, options);
  }
  if (mode === "mermaid") {
    return renderClassMermaidDiagram(diagram, options);
  }
  return renderClassDiagram(diagram, options);
}

function createReservedKindFallback(kind: string): HTMLElement {
  const root = document.createElement("section");
  root.className = "mdspec-fallback";

  const title = document.createElement("h2");
  title.textContent = "Diagram preview is not available";

  const message = document.createElement("p");
  message.textContent = `Reserved diagram kind "${kind}" is not rendered in v1.`;

  root.append(title, message);
  return root;
}
