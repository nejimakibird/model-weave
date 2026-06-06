import type { ResolvedDiagram } from "../types/models";

export function renderComponentDiagram(diagram: ResolvedDiagram): HTMLElement {
  const root = activeDocument.createElement("section");
  root.className = "mdspec-diagram mdspec-diagram--component";

  const title = activeDocument.createElement("h2");
  title.textContent = `${diagram.diagram.name} (component)`;
  root.appendChild(title);

  const grid = activeDocument.createElement("div");
  grid.className = "mdspec-component-grid";

  for (const node of diagram.nodes) {
    const box = activeDocument.createElement("article");
    box.className = "mdspec-component";

    const heading = activeDocument.createElement("h3");
    heading.textContent = getNodeLabel(node);
    box.appendChild(heading);

    const description = activeDocument.createElement("p");
    description.textContent = getNodeDescription(node);
    box.appendChild(description);

    grid.appendChild(box);
  }

  if (grid.childElementCount === 0) {
    const empty = activeDocument.createElement("p");
    empty.textContent = "No components resolved.";
    root.appendChild(empty);
  } else {
    root.appendChild(grid);
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

function getNodeDescription(node: ResolvedDiagram["nodes"][number]): string {
  if (!node.object) {
    return "No component description available.";
  }

  if (node.object.fileType === "er-entity") {
    return node.object.physicalName;
  }

  if (node.object.fileType === "dfd-object") {
    return node.object.kind;
  }

  return node.object.description ?? "No component description available.";
}
