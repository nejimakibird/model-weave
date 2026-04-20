import { ItemView, WorkspaceLeaf } from "obsidian";
import type { RelationsFileModel, ValidationWarning } from "../types/models";

export const RELATIONS_PREVIEW_VIEW_TYPE = "mdspec-relations-preview";

export class RelationsPreviewView extends ItemView {
  private model: RelationsFileModel | null = null;
  private warnings: ValidationWarning[] = [];

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string {
    return RELATIONS_PREVIEW_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Relations Preview";
  }

  async onOpen(): Promise<void> {
    this.render();
  }

  async onClose(): Promise<void> {
    this.contentEl.empty();
  }

  setPreview(
    model: RelationsFileModel | null,
    warnings: ValidationWarning[] = []
  ): void {
    this.model = model;
    this.warnings = warnings;
    this.render();
  }

  private render(): void {
    this.contentEl.empty();
    renderWarningBar(this.contentEl, this.warnings);

    if (!this.model) {
      this.contentEl.createEl("p", { text: "No relations model available for preview." });
      return;
    }

    this.contentEl.createEl("h2", { text: this.model.title ?? this.model.frontmatter.id?.toString() ?? "Relations" });

    if (this.model.relations.length === 0) {
      this.contentEl.createEl("p", { text: "No relations defined." });
      return;
    }

    const list = this.contentEl.createEl("ul");
    for (const relation of this.model.relations) {
      const label = relation.label ? ` (${relation.label})` : "";
      list.createEl("li", {
        text: `${relation.source} -[${relation.kind}]-> ${relation.target}${label}`
      });
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
