import type { ResolvedDiagram } from "../types/models";

export function renderFlowDiagram(diagram: ResolvedDiagram): HTMLElement {
  const root = activeDocument.createElement("section");
  root.className = "mdspec-diagram mdspec-diagram--flow";

  const title = activeDocument.createElement("h2");
  title.textContent = `${diagram.diagram.name} (flow)`;
  root.appendChild(title);

  const list = activeDocument.createElement("ol");
  list.className = "mdspec-flow";

  for (const node of diagram.nodes) {
    const item = activeDocument.createElement("li");
    item.textContent = getNodeLabel(node);
    list.appendChild(item);
  }

  if (list.childElementCount === 0) {
    const empty = activeDocument.createElement("p");
    empty.textContent = "No objects referenced.";
    root.appendChild(empty);
  } else {
    root.appendChild(list);
  }

  if (diagram.edges.length > 0) {
    const relations = activeDocument.createElement("ul");
    for (const edge of diagram.edges) {
      const item = activeDocument.createElement("li");
      item.textContent = `${edge.source} -> ${edge.target}${edge.label ? ` (${edge.label})` : ""}`;
      relations.appendChild(item);
    }

    root.appendChild(relations);
  }

  return root;
}

function getNodeLabel(node: ResolvedDiagram["nodes"][number]): string {
  if (!node.object) {
    return node.ref ?? node.id;
  }

  return node.object.fileType === "er-entity"
    ? node.object.logicalName
    : node.object.name;
}
