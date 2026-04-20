import type { ResolvedObjectContext } from "../core/object-context-resolver";
import type { ErEntity, ObjectModel } from "../types/models";

export function renderObjectModel(
  model: ObjectModel | ErEntity,
  context?: ResolvedObjectContext | null
): HTMLElement {
  const root = document.createElement("section");
  root.className = "mdspec-object-focus";
  root.style.flex = "0 0 auto";

  const title = document.createElement("h2");
  title.textContent = getPrimaryTitle(model);
  title.style.margin = "0 0 6px 0";
  title.style.fontSize = "18px";
  root.appendChild(title);

  const meta = document.createElement("div");
  meta.style.display = "grid";
  meta.style.gridTemplateColumns = "96px 1fr";
  meta.style.gap = "4px 10px";
  meta.style.padding = "8px 10px";
  meta.style.border = "1px solid var(--background-modifier-border)";
  meta.style.borderRadius = "8px";
  meta.style.background = "var(--background-primary-alt)";
  meta.style.fontSize = "12px";

  if (model.fileType === "er-entity") {
    appendMeta(meta, "Logical Name", model.logicalName);
    appendMeta(meta, "Physical Name", model.physicalName);
    appendMeta(meta, "Type", "er_entity");
    appendMeta(meta, "Schema Name", model.schemaName ?? "-");
    appendMeta(meta, "DBMS", model.dbms ?? "-");
    appendMeta(meta, "Related Count", String(context?.relatedObjects.length ?? 0));
  } else {
    appendMeta(meta, "Name", model.name);
    appendMeta(meta, "Type", "class");
    appendMeta(meta, "Kind", model.kind);
    appendMeta(meta, "Related Count", String(context?.relatedObjects.length ?? 0));
  }

  root.appendChild(meta);
  return root;
}

function getPrimaryTitle(model: ObjectModel | ErEntity): string {
  return model.fileType === "er-entity" ? model.logicalName : model.name;
}

function appendMeta(container: HTMLElement, label: string, value: string): void {
  const key = document.createElement("div");
  key.textContent = label;
  key.style.fontWeight = "600";
  key.style.color = "var(--text-muted)";
  key.style.lineHeight = "1.3";

  const val = document.createElement("div");
  val.textContent = value;
  val.style.lineHeight = "1.3";

  container.append(key, val);
}
