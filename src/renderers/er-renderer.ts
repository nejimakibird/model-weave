import type { ResolvedDiagram } from "../types/models";

export function renderErDiagram(diagram: ResolvedDiagram): HTMLElement {
  const root = document.createElement("section");
  root.className = "mdspec-diagram mdspec-diagram--er";

  const title = document.createElement("h2");
  title.textContent = `${diagram.diagram.name} (ER)`;
  root.appendChild(title);

  const entities = document.createElement("div");
  entities.className = "mdspec-diagram__entities";

  for (const node of diagram.nodes) {
    const entity = document.createElement("article");
    entity.className = "mdspec-entity";

    const heading = document.createElement("h3");
    heading.textContent = node.object?.name ?? node.ref ?? node.id;
    entity.appendChild(heading);

    const list = document.createElement("ul");
    for (const attribute of node.object?.attributes ?? []) {
      const item = document.createElement("li");
      item.textContent = `${attribute.name}${attribute.type ? `: ${attribute.type}` : ""}`;
      list.appendChild(item);
    }

    if (list.childElementCount === 0) {
      const empty = document.createElement("p");
      empty.textContent = "No attributes.";
      entity.appendChild(empty);
    } else {
      entity.appendChild(list);
    }

    entities.appendChild(entity);
  }

  root.appendChild(entities);
  root.appendChild(createRelationList(diagram));
  return root;
}

function createRelationList(diagram: ResolvedDiagram): HTMLElement {
  const section = document.createElement("section");
  const heading = document.createElement("h3");
  heading.textContent = "Resolved relations";
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
    const sourceMultiplicity =
      typeof edge.metadata?.sourceCardinality === "string"
        ? ` [${edge.metadata.sourceCardinality}]`
        : "";
    const targetMultiplicity =
      typeof edge.metadata?.targetCardinality === "string"
        ? ` [${edge.metadata.targetCardinality}]`
        : "";
    item.textContent =
      `${edge.source}${sourceMultiplicity} -[${edge.kind ?? "relation"}]-> ` +
      `${edge.target}${targetMultiplicity}`;
    list.appendChild(item);
  }

  section.appendChild(list);
  return section;
}
