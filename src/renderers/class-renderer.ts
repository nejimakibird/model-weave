import type { ResolvedDiagram } from "../types/models";
import { renderObjectModel } from "./object-renderer";

export function renderClassDiagram(diagram: ResolvedDiagram): HTMLElement {
  const root = document.createElement("section");
  root.className = "mdspec-diagram mdspec-diagram--class";

  const title = document.createElement("h2");
  title.textContent = `${diagram.diagram.name} (class)`;
  root.appendChild(title);

  const grid = document.createElement("div");
  grid.className = "mdspec-diagram__grid";

  for (const node of diagram.nodes) {
    const card = document.createElement("div");
    card.className = "mdspec-diagram__node";
    if (node.object) {
      card.appendChild(renderObjectModel(node.object));
    } else {
      card.appendChild(createFallbackNode(node.ref ?? node.id));
    }
    grid.appendChild(card);
  }

  root.appendChild(grid);
  root.appendChild(createEdgesSection(diagram));
  return root;
}

function createEdgesSection(diagram: ResolvedDiagram): HTMLElement {
  const section = document.createElement("section");
  section.className = "mdspec-section";

  const heading = document.createElement("h3");
  heading.textContent = "Relations";
  section.appendChild(heading);

  if (diagram.edges.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No relations resolved.";
    section.appendChild(empty);
    return section;
  }

  const list = document.createElement("ul");
  for (const edge of diagram.edges) {
    const item = document.createElement("li");
    item.textContent = `${edge.source} -[${edge.kind ?? "relation"}]-> ${edge.target}`;
    list.appendChild(item);
  }

  section.appendChild(list);
  return section;
}

function createFallbackNode(id: string): HTMLElement {
  const box = document.createElement("div");
  box.className = "mdspec-fallback";
  box.textContent = `Unresolved object: ${id}`;
  return box;
}
