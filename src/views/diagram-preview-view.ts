import { ItemView, WorkspaceLeaf } from "obsidian";
import type { ResolvedDiagram, ValidationWarning } from "../types/models";
import { renderDiagramModel } from "../renderers/diagram-renderer";

export const DIAGRAM_PREVIEW_VIEW_TYPE = "mdspec-diagram-preview";

export class DiagramPreviewView extends ItemView {
  private diagram: ResolvedDiagram | null = null;
  private warnings: ValidationWarning[] = [];

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string {
    return DIAGRAM_PREVIEW_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Diagram Preview";
  }

  async onOpen(): Promise<void> {
    this.render();
  }

  async onClose(): Promise<void> {
    this.contentEl.empty();
  }

  setPreview(
    diagram: ResolvedDiagram | null,
    warnings: ValidationWarning[] = []
  ): void {
    this.diagram = diagram;
    this.warnings = warnings;
    this.render();
  }

  private render(): void {
    this.contentEl.empty();
    renderWarningBar(this.contentEl, this.warnings);

    if (!this.diagram) {
      this.contentEl.createEl("p", { text: "No diagram model available for preview." });
      return;
    }

    this.contentEl.appendChild(renderDiagramModel(this.diagram));
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
