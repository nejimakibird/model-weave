import type { ResolvedObjectContext } from "../core/object-context-resolver";
import type { ModelWeaveUiLanguage } from "../i18n/messages";
import type { DfdObjectModel, ErEntity, ObjectModel } from "../types/models";
import { renderSourceLinks } from "./source-links-renderer";

export function renderObjectModel(
  model: ObjectModel | ErEntity | DfdObjectModel,
  context?: ResolvedObjectContext | null,
  localSourceRoot = "",
  language: ModelWeaveUiLanguage = "auto"
): HTMLElement {
  const root = activeDocument.createElement("section");
  root.addClass("model-weave-object-focus");
  root.addClass("model-weave-summary-details");
  root.addClass("model-weave-preview-section");

  const title = activeDocument.createElement("h2");
  title.textContent = getPrimaryTitle(model);
  title.addClass("model-weave-object-title");
  title.addClass("model-weave-preview-section-title");
  root.appendChild(title);

  const meta = activeDocument.createElement("div");
  meta.addClass("model-weave-object-meta");
  meta.addClass("model-weave-detail-card");

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
  const sourceLinks = renderSourceLinks(model.sourceLinks, localSourceRoot, language);
  if (sourceLinks) {
    root.appendChild(sourceLinks);
  }
  return root;
}

function getPrimaryTitle(model: ObjectModel | ErEntity | DfdObjectModel): string {
  return model.fileType === "er-entity" ? model.logicalName : model.name;
}

function appendMeta(container: HTMLElement, label: string, value: string): void {
  const row = activeDocument.createElement("div");
  row.addClass("model-weave-detail-card-row");

  const key = activeDocument.createElement("div");
  key.textContent = label;
  key.addClass("model-weave-object-meta-key");
  key.addClass("model-weave-detail-card-label");

  const val = activeDocument.createElement("div");
  val.textContent = value;
  val.addClass("model-weave-object-meta-val");
  val.addClass("model-weave-detail-card-value");

  row.append(key, val);
  container.appendChild(row);
}
