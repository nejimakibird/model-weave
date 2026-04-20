import { ItemView, WorkspaceLeaf } from "obsidian";
import type { ObjectModel, ValidationWarning } from "../types/models";
import { renderObjectModel } from "../renderers/object-renderer";

export const OBJECT_PREVIEW_VIEW_TYPE = "mdspec-object-preview";

export class ObjectPreviewView extends ItemView {
  private model: ObjectModel | null = null;
  private warnings: ValidationWarning[] = [];

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string {
    return OBJECT_PREVIEW_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Object Preview";
  }

  async onOpen(): Promise<void> {
    this.render();
  }

  async onClose(): Promise<void> {
    this.contentEl.empty();
  }

  setPreview(model: ObjectModel | null, warnings: ValidationWarning[] = []): void {
    this.model = model;
    this.warnings = warnings;
    this.render();
  }

  private render(): void {
    this.contentEl.empty();
    renderWarningBar(this.contentEl, this.warnings);

    if (!this.model) {
      this.contentEl.createEl("p", { text: "No object model available for preview." });
      return;
    }

    this.contentEl.appendChild(renderObjectModel(this.model));
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
