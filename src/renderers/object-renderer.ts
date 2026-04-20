import type { ObjectModel } from "../types/models";

export function renderObjectModel(model: ObjectModel): HTMLElement {
  const root = document.createElement("section");
  root.className = `mdspec-object mdspec-object--${model.kind}`;

  const header = document.createElement("header");
  header.className = "mdspec-object__header";

  const title = document.createElement("h2");
  title.textContent = model.name;

  const badge = document.createElement("span");
  badge.className = "mdspec-badge";
  badge.textContent = model.kind;

  header.append(title, badge);
  root.appendChild(header);

  if (model.description) {
    root.appendChild(createSection("Summary", createParagraph(model.description)));
  }

  const variant = document.createElement("p");
  variant.className = "mdspec-object__variant";
  variant.textContent = describeObjectKind(model.kind);
  root.appendChild(variant);

  root.appendChild(createMembersSection("Attributes", model.attributes.map((attribute) => {
    const detail = attribute.type ? `: ${attribute.type}` : "";
    const note = attribute.description ? ` - ${attribute.description}` : "";
    return `${attribute.name}${detail}${note}`;
  })));

  root.appendChild(createMembersSection("Methods", model.methods.map((method) => {
    const parameters = method.parameters
      .map((parameter) =>
        `${parameter.name}${parameter.type ? `: ${parameter.type}` : ""}`
      )
      .join(", ");
    const returnType = method.returnType ? ` ${method.returnType}` : "";
    const note = method.description ? ` - ${method.description}` : "";
    return `${method.name}(${parameters})${returnType}${note}`;
  })));

  return root;
}

function describeObjectKind(kind: ObjectModel["kind"]): string {
  switch (kind) {
    case "class":
      return "Class-style object";
    case "entity":
      return "Entity-style object";
    case "interface":
      return "Interface contract";
    case "enum":
      return "Enum definition";
    case "component":
      return "Component boundary";
    default:
      return "Reserved kind preview";
  }
}

function createMembersSection(title: string, items: string[]): HTMLElement {
  const section = document.createElement("section");
  section.className = "mdspec-section";

  const heading = document.createElement("h3");
  heading.textContent = title;
  section.appendChild(heading);

  if (items.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No items.";
    section.appendChild(empty);
    return section;
  }

  const list = document.createElement("ul");
  for (const item of items) {
    const entry = document.createElement("li");
    entry.textContent = item;
    list.appendChild(entry);
  }

  section.appendChild(list);
  return section;
}

function createSection(title: string, content: HTMLElement): HTMLElement {
  const section = document.createElement("section");
  section.className = "mdspec-section";

  const heading = document.createElement("h3");
  heading.textContent = title;

  section.append(heading, content);
  return section;
}

function createParagraph(text: string): HTMLElement {
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  return paragraph;
}
