import { ItemView, WorkspaceLeaf } from "obsidian";
import type { ErEntity, ObjectModel, ValidationWarning } from "../types/models";
import type { ResolvedObjectContext } from "../core/object-context-resolver";
import { renderObjectModel } from "../renderers/object-renderer";
import { renderObjectContext } from "../renderers/object-context-renderer";
import { modelWeaveText } from "../i18n/language";
import { localizeDiagnosticMessage } from "../core/current-file-diagnostics";
import { MODELING_VIEW_ICON } from "./view-icon";

export const OBJECT_PREVIEW_VIEW_TYPE = "mdspec-object-preview";

export class ObjectPreviewView extends ItemView {
  private model: ObjectModel | ErEntity | null = null;
  private context: ResolvedObjectContext | null = null;
  private warnings: ValidationWarning[] = [];
  private onOpenObject:
    | ((objectId: string, navigation?: { openInNewLeaf?: boolean }) => void)
    | null = null;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string {
    return OBJECT_PREVIEW_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Object preview";
  }

  getIcon(): string {
    return MODELING_VIEW_ICON;
  }

  onOpen(): Promise<void> {
    this.contentEl.addClass("model-weave-object-preview-root");
    this.contentEl.addClass("model-weave-summary-details");
    this.render();
    return Promise.resolve();
  }

  onClose(): Promise<void> {
    this.contentEl.empty();
    return Promise.resolve();
  }

  setPreview(
    model: ObjectModel | ErEntity | null,
    context: ResolvedObjectContext | null = null,
    onOpenObject:
      | ((objectId: string, navigation?: { openInNewLeaf?: boolean }) => void)
      | null = null,
    warnings: ValidationWarning[] = []
  ): void {
    this.model = model;
    this.context = context;
    this.onOpenObject = onOpenObject;
    this.warnings = warnings;
    this.render();
  }

  private render(): void {
    this.contentEl.empty();
    this.contentEl.addClass("model-weave-object-preview-root");
    this.contentEl.addClass("model-weave-summary-details");
    renderWarningBar(this.contentEl, this.warnings);

    if (!this.model) {
      this.contentEl.createEl("p", {
        text: modelWeaveText(
          "This file format is not supported. Supported formats: class / class_diagram / er_entity / er_diagram",
          "このファイル形式は未対応です。対応形式: class / class_diagram / er_entity / er_diagram"
        )
      });
      return;
    }

    this.contentEl.appendChild(renderObjectModel(this.model, this.context));

    if (this.context) {
      this.contentEl.appendChild(
        renderObjectContext(this.context, {
          onOpenObject: this.onOpenObject ?? undefined,
          app: this.app,
          interactionSourcePath: this.model.path
        })
      );
    }
  }
}

function renderWarningBar(container: HTMLElement, warnings: ValidationWarning[]): void {
  if (warnings.length === 0) {
    return;
  }

  const bar = container.createDiv({ cls: "mdspec-warning-bar" });
  bar.createEl("strong", { text: `Warnings (${warnings.length})` });

  const list = bar.createEl("ul");
  for (const warning of warnings) {
    list.createEl("li", { text: localizeDiagnosticMessage(warning.message) });
  }
}
