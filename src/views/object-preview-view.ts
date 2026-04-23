import { ItemView, WorkspaceLeaf } from "obsidian";
import type { ErEntity, ObjectModel, ValidationWarning } from "../types/models";
import type { ResolvedObjectContext } from "../core/object-context-resolver";
import { renderObjectModel } from "../renderers/object-renderer";
import { renderObjectContext } from "../renderers/object-context-renderer";
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
    return "Object Preview";
  }

  getIcon(): string {
    return MODELING_VIEW_ICON;
  }

  async onOpen(): Promise<void> {
    this.contentEl.style.display = "flex";
    this.contentEl.style.flexDirection = "column";
    this.contentEl.style.height = "100%";
    this.contentEl.style.minHeight = "0";
    this.contentEl.style.gap = "10px";
    this.render();
  }

  async onClose(): Promise<void> {
    this.contentEl.empty();
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
    this.contentEl.style.display = "flex";
    this.contentEl.style.flexDirection = "column";
    this.contentEl.style.height = "100%";
    this.contentEl.style.minHeight = "0";
    this.contentEl.style.gap = "10px";
    renderWarningBar(this.contentEl, this.warnings);

    if (!this.model) {
      this.contentEl.createEl("p", {
        text: "このファイル形式は未対応です。対応形式: class / class_diagram / er_entity / er_diagram"
      });
      return;
    }

    this.contentEl.appendChild(renderObjectModel(this.model, this.context));

    if (this.context) {
      this.contentEl.appendChild(
        renderObjectContext(this.context, {
          onOpenObject: this.onOpenObject ?? undefined
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
    list.createEl("li", { text: warning.message });
  }
}
