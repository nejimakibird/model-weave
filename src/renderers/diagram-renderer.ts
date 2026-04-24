import type { ResolvedDiagram } from "../types/models";
import type { GraphViewportState } from "./graph-view-shared";
import { renderClassDiagram } from "./class-renderer";
import { renderComponentDiagram } from "./component-renderer";
import { renderDfdDiagram } from "./dfd-renderer";
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
    viewportState?: GraphViewportState;
    onViewportStateChange?: (state: GraphViewportState) => void;
  }
): HTMLElement {
  switch (diagram.diagram.kind) {
    case "class":
      return renderClassDiagram(diagram, options);
    case "er":
      return renderErDiagram(diagram, options);
    case "dfd":
      return renderDfdDiagram(diagram, options);
    case "flow":
      return renderFlowDiagram(diagram);
    case "component":
      return renderComponentDiagram(diagram);
    default:
      return createReservedKindFallback(diagram.diagram.kind);
  }
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
