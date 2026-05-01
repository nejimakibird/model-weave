import { ItemView, WorkspaceLeaf } from "obsidian";
import type { ResolvedDiagram, ValidationWarning } from "../types/models";
import { renderDiagramModel } from "../renderers/diagram-renderer";
import { MODELING_VIEW_ICON } from "./view-icon";

export const DIAGRAM_PREVIEW_VIEW_TYPE = "mdspec-diagram-preview";

export class DiagramPreviewView extends ItemView {
  private diagram: ResolvedDiagram | null = null;
  private warnings: ValidationWarning[] = [];
  private onOpenObject:
    | ((objectId: string, navigation?: { openInNewLeaf?: boolean }) => void)
    | null = null;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string {
    return DIAGRAM_PREVIEW_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Diagram preview";
  }

  getIcon(): string {
    return MODELING_VIEW_ICON;
  }

  onOpen(): Promise<void> {
    this.render();
    return Promise.resolve();
  }

  onClose(): Promise<void> {
    this.contentEl.empty();
    return Promise.resolve();
  }

  setPreview(
    diagram: ResolvedDiagram | null,
    onOpenObject:
      | ((objectId: string, navigation?: { openInNewLeaf?: boolean }) => void)
      | null = null,
    warnings: ValidationWarning[] = []
  ): void {
    this.diagram = diagram;
    this.onOpenObject = onOpenObject;
    this.warnings = warnings;
    this.render();
  }

  private render(): void {
    this.contentEl.empty();
    this.contentEl.addClass("model-weave-diagram-preview-root");
    renderWarningBar(this.contentEl, this.warnings);

    if (!this.diagram) {
      this.contentEl.createEl("p", {
        text: "このファイル形式は未対応です。対応形式: class / class_diagram / er_entity / er_diagram"
      });
      return;
    }

    this.contentEl.appendChild(
      renderDiagramModel(this.diagram, {
        onOpenObject: this.onOpenObject ?? undefined
      })
    );
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
