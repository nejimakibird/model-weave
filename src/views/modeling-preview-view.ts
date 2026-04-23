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
      onOpenDiagnostic?: ((diagnostic: ValidationWarning) => void) | null;
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
      onOpenDiagnostic?: ((diagnostic: ValidationWarning) => void) | null;
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

    switch (this.state.mode) {
      case "object":
        renderDiagnostics(
          this.contentEl,
          this.state.warnings,
          this.state.onOpenDiagnostic ?? undefined
        );
        this.renderObjectState(this.state);
        return;
      case "relations":
        renderDiagnostics(this.contentEl, this.state.warnings);
        this.renderRelationsState(this.state);
        return;
      case "diagram":
        renderDiagnostics(
          this.contentEl,
          this.state.warnings,
          this.state.onOpenDiagnostic ?? undefined
        );
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

function renderDiagnostics(
  container: HTMLElement,
  diagnostics: ValidationWarning[],
  onOpenDiagnostic?: (diagnostic: ValidationWarning) => void
): void {
  const notes = diagnostics.filter((diagnostic) => diagnostic.severity === "info");
  const warnings = diagnostics.filter((diagnostic) => diagnostic.severity === "warning");
  const errors = diagnostics.filter((diagnostic) => diagnostic.severity === "error");

  if (notes.length === 0 && warnings.length === 0 && errors.length === 0) {
    return;
  }

  if (notes.length > 0) {
    renderDiagnosticSection(container, "Notes", notes, onOpenDiagnostic, "var(--text-muted)");
  }

  if (warnings.length > 0) {
    renderDiagnosticSection(
      container,
      "Warnings",
      warnings,
      onOpenDiagnostic,
      "var(--text-warning)"
    );
  }

  if (errors.length > 0) {
    renderDiagnosticSection(
      container,
      "Errors",
      errors,
      onOpenDiagnostic,
      "var(--text-error)"
    );
  }
}

function renderDiagnosticSection(
  container: HTMLElement,
  title: string,
  diagnostics: ValidationWarning[],
  onOpenDiagnostic: ((diagnostic: ValidationWarning) => void) | undefined,
  color: string
): void {
  const details = container.createEl("details");
  details.className = "mdspec-diagnostic-section";
  details.open = title !== "Notes";
  details.style.fontSize = "12px";

  const summary = details.createEl("summary", {
    text: `${title} (${diagnostics.length})`
  });
  summary.style.cursor = "pointer";
  summary.style.color = color;

  const list = details.createEl("ul");
  list.style.margin = "8px 0 0";
  list.style.paddingLeft = "18px";

  for (const diagnostic of diagnostics) {
    const item = list.createEl("li");
    item.textContent = diagnostic.message;
    if (onOpenDiagnostic) {
      item.style.cursor = "pointer";
      item.style.borderRadius = "4px";
      item.style.padding = "2px 4px";
      item.title = "Open this diagnostic in the editor";
      item.tabIndex = 0;
      item.onmouseenter = () => {
        item.style.background = "var(--background-modifier-hover)";
      };
      item.onmouseleave = () => {
        item.style.background = "";
      };
      item.onclick = () => onOpenDiagnostic(diagnostic);
      item.onkeydown = (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenDiagnostic(diagnostic);
        }
      };
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
