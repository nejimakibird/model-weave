import { ItemView, WorkspaceLeaf } from "obsidian";
import type { ErRelation, RelationsFileModel, ValidationWarning } from "../types/models";
import { MODELING_VIEW_ICON } from "./view-icon";

export const RELATIONS_PREVIEW_VIEW_TYPE = "mdspec-relations-preview";

export class RelationsPreviewView extends ItemView {
  private model: RelationsFileModel | ErRelation | null = null;
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

  getIcon(): string {
    return MODELING_VIEW_ICON;
  }

  async onOpen(): Promise<void> {
    this.render();
  }

  async onClose(): Promise<void> {
    this.contentEl.empty();
  }

  setPreview(
    model: RelationsFileModel | ErRelation | null,
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
      this.contentEl.createEl("p", {
        text: "このファイル形式は未対応です。対応形式: relations / er_relation / diagram / model_object"
      });
      return;
    }

    this.contentEl.createEl("h2", {
      text: this.model.title ?? this.model.frontmatter.id?.toString() ?? "Relations"
    });

    if (this.model.fileType === "er-relation") {
      const list = this.contentEl.createEl("ul");
      list.createEl("li", { text: `Logical Name: ${this.model.logicalName}` });
      list.createEl("li", { text: `Physical Name: ${this.model.physicalName}` });
      list.createEl("li", { text: `From: ${this.model.fromEntity}.${this.model.fromColumn}` });
      list.createEl("li", { text: `To: ${this.model.toEntity}.${this.model.toColumn}` });
      list.createEl("li", { text: `Cardinality: ${this.model.cardinality}` });
      return;
    }

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
