import { ItemView, WorkspaceLeaf } from "obsidian";
import type { ResolvedObjectContext } from "../core/object-context-resolver";
import { renderDiagramModel } from "../renderers/diagram-renderer";
import {
  resetGraphViewportState,
  type GraphViewportState
} from "../renderers/graph-view-shared";
import { renderObjectContext } from "../renderers/object-context-renderer";
import { renderObjectModel } from "../renderers/object-renderer";
import type {
  ErEntity,
  ObjectModel,
  RelationsFileModel,
  ResolvedDiagram,
  ValidationWarning
} from "../types/models";
import { MODELING_VIEW_ICON } from "./view-icon";

export const MODELING_PREVIEW_VIEW_TYPE = "mdspec-preview";

export type PreviewUpdateReason =
  | "initial-open"
  | "external-file-open"
  | "viewer-node-navigation"
  | "rerender"
  | "manual-fit";

type PreviewState =
  | {
      mode: "empty";
      message: string;
      warnings: ValidationWarning[];
    }
  | {
      mode: "object";
      model: ObjectModel | ErEntity;
      context: ResolvedObjectContext | null;
      warnings: ValidationWarning[];
      onOpenObject?:
        | ((objectId: string, navigation?: { openInNewLeaf?: boolean }) => void)
        | null;
    }
  | {
      mode: "relations";
      model: RelationsFileModel;
      warnings: ValidationWarning[];
    }
  | {
      mode: "diagram";
      diagram: ResolvedDiagram;
      warnings: ValidationWarning[];
      onOpenObject?:
        | ((objectId: string, navigation?: { openInNewLeaf?: boolean }) => void)
        | null;
    };

export class ModelingPreviewView extends ItemView {
  private readonly diagramViewportState: GraphViewportState = {
    zoom: 1,
    panX: 0,
    panY: 0,
    hasAutoFitted: false,
    hasUserInteracted: false
  };
  private readonly objectGraphViewportState: GraphViewportState = {
    zoom: 1,
    panX: 0,
    panY: 0,
    hasAutoFitted: false,
    hasUserInteracted: false
  };
  private state: PreviewState = {
    mode: "empty",
    message: "対応ファイルを開くとプレビューが表示されます。",
    warnings: []
  };
  private diagramGraphKey: string | null = null;
  private objectGraphKey: string | null = null;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string {
    return MODELING_PREVIEW_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Modeling Preview";
  }

  getIcon(): string {
    return MODELING_VIEW_ICON;
  }

  async onOpen(): Promise<void> {
    this.renderCurrentState();
  }

  async onClose(): Promise<void> {
    this.clearView();
  }

  updateContent(state: PreviewState, reason: PreviewUpdateReason = "rerender"): void {
    this.prepareViewportState(state, reason);
    this.state = state;
    this.renderCurrentState();
  }

  private prepareViewportState(
    state: PreviewState,
    reason: PreviewUpdateReason
  ): void {
    if (state.mode === "diagram") {
      const nextKey = `${state.mode}:${state.diagram.diagram.path}`;
      if (shouldAutoFitForReason(reason, this.diagramGraphKey, nextKey)) {
        resetGraphViewportState(this.diagramViewportState);
      }
      this.diagramGraphKey = nextKey;
      return;
    }

    if (state.mode === "object" && state.context) {
      const objectPath =
        "filePath" in state.model ? state.model.filePath : state.model.path;
      const nextKey = `${state.mode}:${objectPath}`;
      if (shouldAutoFitForReason(reason, this.objectGraphKey, nextKey)) {
        resetGraphViewportState(this.objectGraphViewportState);
      }
      this.objectGraphKey = nextKey;
      return;
    }

    if (state.mode !== "object") {
      this.objectGraphKey = null;
    }
    this.diagramGraphKey = null;
  }

  private renderCurrentState(): void {
    this.clearView();
    renderWarningBar(this.contentEl, this.state.warnings);

    switch (this.state.mode) {
      case "object":
        this.renderObjectState(this.state);
        return;
      case "relations":
        this.renderRelationsState(this.state);
        return;
      case "diagram":
        this.renderDiagramState(this.state);
        return;
      case "empty":
      default:
        this.renderEmptyState(this.state.message);
    }
  }

  private clearView(): void {
    this.contentEl.empty();
    this.contentEl.style.display = "flex";
    this.contentEl.style.flexDirection = "column";
    this.contentEl.style.height = "100%";
    this.contentEl.style.minHeight = "0";
    this.contentEl.style.gap = "10px";
    this.contentEl.style.overflow = "hidden";
    this.contentEl.style.paddingBottom = "12px";
  }

  private renderEmptyState(message: string): void {
    const section = document.createElement("section");
    section.style.display = "flex";
    section.style.flex = "1 1 auto";
    section.style.minHeight = "0";
    section.style.alignItems = "center";
    section.style.justifyContent = "center";
    section.style.border = "1px dashed var(--background-modifier-border)";
    section.style.borderRadius = "10px";
    section.style.background = "var(--background-primary-alt)";
    section.style.padding = "20px";

    const text = document.createElement("p");
    text.textContent = message;
    text.style.margin = "0";
    text.style.color = "var(--text-muted)";
    text.style.textAlign = "center";
    section.appendChild(text);

    this.contentEl.appendChild(section);
  }

  private renderObjectState(state: Extract<PreviewState, { mode: "object" }>): void {
    this.contentEl.appendChild(renderObjectModel(state.model, state.context));

    if (state.context) {
      this.contentEl.appendChild(
        renderObjectContext(state.context, {
          onOpenObject: state.onOpenObject ?? undefined,
          viewportState: this.objectGraphViewportState
        })
      );
    }
  }

  private renderRelationsState(
    state: Extract<PreviewState, { mode: "relations" }>
  ): void {
    const model = state.model;
    this.contentEl.createEl("h2", {
      text: model.title ?? model.frontmatter.id?.toString() ?? "Relations"
    });

    if (model.relations.length === 0) {
      this.contentEl.createEl("p", { text: "No relations defined." });
      return;
    }

    const list = this.contentEl.createEl("ul");
    for (const relation of model.relations) {
      const label = relation.label ? ` (${relation.label})` : "";
      list.createEl("li", {
        text: `${relation.source} -[${relation.kind}]-> ${relation.target}${label}`
      });
    }
  }

  private renderDiagramState(state: Extract<PreviewState, { mode: "diagram" }>): void {
    this.contentEl.appendChild(
      renderDiagramModel(state.diagram, {
        onOpenObject: state.onOpenObject ?? undefined,
        viewportState: this.diagramViewportState
      })
    );
  }
}

function renderWarningBar(container: HTMLElement, warnings: ValidationWarning[]): void {
  const actionableWarnings = warnings.filter(
    (warning) => warning.severity === "warning"
  );
  const notes = warnings.filter((warning) => warning.severity === "info");

  if (actionableWarnings.length === 0 && notes.length === 0) {
    return;
  }

  if (actionableWarnings.length > 0) {
    const bar = container.createDiv({ cls: "mdspec-warning-bar" });
    bar.createEl("strong", {
      text: `Warnings (${actionableWarnings.length})`
    });

    const list = bar.createEl("ul");
    for (const warning of actionableWarnings) {
      list.createEl("li", { text: warning.message });
    }
  }

  if (notes.length > 0) {
    const details = container.createEl("details");
    details.className = "mdspec-warning-notes";
    details.style.fontSize = "12px";
    details.style.color = "var(--text-muted)";

    const summary = details.createEl("summary", {
      text: `Notes (${notes.length})`
    });
    summary.style.cursor = "pointer";

    const list = details.createEl("ul");
    for (const note of notes) {
      list.createEl("li", { text: note.message });
    }
  }
}

function shouldAutoFitForReason(
  reason: PreviewUpdateReason,
  currentKey: string | null,
  nextKey: string
): boolean {
  switch (reason) {
    case "manual-fit":
      return true;
    case "initial-open":
      return true;
    case "external-file-open":
      return currentKey !== nextKey;
    case "viewer-node-navigation":
    case "rerender":
    default:
      return false;
  }
}
