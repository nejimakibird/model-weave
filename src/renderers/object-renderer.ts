import type { ResolvedObjectContext } from "../core/object-context-resolver";
import type { DfdObjectModel, ErEntity, ObjectModel } from "../types/models";

export function renderObjectModel(
  model: ObjectModel | ErEntity | DfdObjectModel,
  context?: ResolvedObjectContext | null
): HTMLElement {
  const root = document.createElement("section");
  root.addClass("model-weave-object-focus");

  const title = document.createElement("h2");
  title.textContent = getPrimaryTitle(model);
  title.addClass("model-weave-object-title");
  root.appendChild(title);

  const meta = document.createElement("div");
  meta.addClass("model-weave-object-meta");

  if (model.fileType === "er-entity") {
    appendMeta(meta, "Logical Name", model.logicalName);
    appendMeta(meta, "Physical Name", model.physicalName);
    appendMeta(meta, "Type", "er_entity");
    appendMeta(meta, "Schema Name", model.schemaName ?? "-");
    appendMeta(meta, "DBMS", model.dbms ?? "-");
    appendMeta(meta, "Related Count", String(context?.relatedObjects.length ?? 0));
  } else if (model.fileType === "object") {
    appendMeta(meta, "Name", model.name);
    appendMeta(meta, "Type", "class");
    appendMeta(meta, "Kind", model.kind);
    appendMeta(meta, "Related Count", String(context?.relatedObjects.length ?? 0));
  } else {
    appendMeta(meta, "Name", model.name);
    appendMeta(meta, "Type", "dfd_object");
    appendMeta(meta, "Kind", model.kind);
  }

  root.appendChild(meta);
  return root;
}

function getPrimaryTitle(model: ObjectModel | ErEntity | DfdObjectModel): string {
  return model.fileType === "er-entity" ? model.logicalName : model.name;
}

function appendMeta(container: HTMLElement, label: string, value: string): void {
  const key = document.createElement("div");
  key.textContent = label;
  key.addClass("model-weave-object-meta-key");

  const val = document.createElement("div");
  val.textContent = value;
  val.addClass("model-weave-object-meta-val");

  container.append(key, val);
}
