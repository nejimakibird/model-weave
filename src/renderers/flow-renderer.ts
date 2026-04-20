import type { ResolvedDiagram } from "../types/models";

export function renderFlowDiagram(diagram: ResolvedDiagram): HTMLElement {
  const root = document.createElement("section");
  root.className = "mdspec-diagram mdspec-diagram--flow";

  const title = document.createElement("h2");
  title.textContent = `${diagram.diagram.name} (flow)`;
  root.appendChild(title);

  const list = document.createElement("ol");
  list.className = "mdspec-flow";

  for (const node of diagram.nodes) {
    const item = document.createElement("li");
    item.textContent = node.object?.name ?? node.ref ?? node.id;
    list.appendChild(item);
  }

  if (list.childElementCount === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No objects referenced.";
    root.appendChild(empty);
  } else {
    root.appendChild(list);
  }

  if (diagram.edges.length > 0) {
    const relations = document.createElement("ul");
    for (const edge of diagram.edges) {
      const item = document.createElement("li");
      item.textContent = `${edge.source} -> ${edge.target}${edge.label ? ` (${edge.label})` : ""}`;
      relations.appendChild(item);
    }

    root.appendChild(relations);
  }

  return root;
}
