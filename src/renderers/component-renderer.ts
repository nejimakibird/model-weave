import type { ResolvedDiagram } from "../types/models";

export function renderComponentDiagram(diagram: ResolvedDiagram): HTMLElement {
  const root = document.createElement("section");
  root.className = "mdspec-diagram mdspec-diagram--component";

  const title = document.createElement("h2");
  title.textContent = `${diagram.diagram.name} (component)`;
  root.appendChild(title);

  const grid = document.createElement("div");
  grid.className = "mdspec-component-grid";

  for (const node of diagram.nodes) {
    const box = document.createElement("article");
    box.className = "mdspec-component";

    const heading = document.createElement("h3");
    heading.textContent = node.object?.name ?? node.ref ?? node.id;
    box.appendChild(heading);

    const description = document.createElement("p");
    description.textContent =
      node.object?.description ?? "No component description available.";
    box.appendChild(description);

    grid.appendChild(box);
  }

  if (grid.childElementCount === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No components resolved.";
    root.appendChild(empty);
  } else {
    root.appendChild(grid);
  }

  return root;
}
