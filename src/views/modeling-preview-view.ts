import { ItemView, WorkspaceLeaf } from "obsidian";
import type { RenderMode, RenderModeSource } from "../core/render-mode";
import type { ResolvedObjectContext } from "../core/object-context-resolver";
import { buildObjectSubgraphScene } from "../core/object-subgraph-builder";
import { exportDiagramRenderableAsPng } from "../export/png-export";
import { renderDiagramModel } from "../renderers/diagram-renderer";
import {
  attachGraphViewportInteractions,
  resetGraphViewportState,
  type GraphViewportState
} from "../renderers/graph-view-shared";
import { renderObjectContext } from "../renderers/object-context-renderer";
import { renderObjectModel } from "../renderers/object-renderer";
import { createZoomToolbar } from "../renderers/zoom-toolbar";
import type { ModelWeaveViewerPreferences } from "../settings/model-weave-settings";
import type {
  DfdObjectModel,
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

interface RendererSelectionState {
  selectedMode: RenderMode;
  visibleSelectedMode: RenderMode;
  supportedModes: RenderMode[];
  effectiveMode: "custom" | "mermaid";
  actualRenderer: "custom" | "mermaid" | "table-text";
  source: RenderModeSource;
  fallbackReason?: string;
  onSelectMode?: ((mode: RenderMode) => void) | null;
}

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
      rendererSelection?: RendererSelectionState;
      onOpenDiagnostic?: ((diagnostic: ValidationWarning) => void) | null;
      onOpenObject?:
        | ((objectId: string, navigation?: { openInNewLeaf?: boolean }) => void)
        | null;
    }
    | {
        mode: "dfd-object";
        model: DfdObjectModel;
        diagram: ResolvedDiagram;
        warnings: ValidationWarning[];
        rendererSelection?: RendererSelectionState;
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
      mode: "summary";
      filePath: string;
      title: string;
      rendererSelection?: RendererSelectionState;
      metadata: Array<{ label: string; value: string }>;
      sections: Array<{ label: string; line?: number; ch?: number }>;
      counts: Array<{ label: string; value: number }>;
      textSections?: Array<{
        title: string;
        lines: string[];
      }>;
      tables?: Array<{
        title: string;
        columns: string[];
        rows: Array<{ cells: string[]; line?: number; ch?: number }>;
      }>;
      layoutBlocks?: Array<{
        label: string;
        subtitle?: string;
        line?: number;
        ch?: number;
        items: Array<{ label: string; line?: number; ch?: number }>;
      }>;
      localProcesses?: Array<{ label: string; line?: number; ch?: number }>;
        navigationLists?: Array<{
          title: string;
          items: Array<{ label: string; line?: number; ch?: number }>;
        }>;
        screenPreviewTransitions?: Array<{
          key: string;
          targetLabel: string;
          targetTitle?: string;
          targetPath?: string;
          unresolved?: boolean;
          selfTarget?: boolean;
          actions: Array<{
            label: string;
            fullLabel: string;
            title?: string;
            line?: number;
            ch?: number;
          }>;
        }>;
        relatedReferences?: Array<{ label: string; line?: number; ch?: number; count?: number }>;
        message: string;
        warnings: ValidationWarning[];
        onNavigateToLocation?: ((location: { line: number; ch?: number }) => void) | null;
        onOpenLinkedFile?:
          | ((filePath: string, navigation?: { openInNewLeaf?: boolean }) => void)
          | null;
      }
  | {
      mode: "diagram";
      diagram: ResolvedDiagram;
      warnings: ValidationWarning[];
      rendererSelection?: RendererSelectionState;
      onOpenDiagnostic?: ((diagnostic: ValidationWarning) => void) | null;
      onOpenObject?:
        | ((objectId: string, navigation?: { openInNewLeaf?: boolean }) => void)
        | null;
    };

interface CachedViewportState {
  filePath: string;
  viewMode: "fit" | "manual";
  zoom: number;
  panX: number;
  panY: number;
  updatedAt: number;
}

const VIEWPORT_STATE_CACHE_LIMIT = 50;
const DEFAULT_VIEWER_PREFERENCES: ModelWeaveViewerPreferences = {
  defaultZoom: "fit",
  fontSize: "normal",
  nodeDensity: "normal"
};

export class ModelingPreviewView extends ItemView {
  private readonly diagramViewportState: GraphViewportState = {
    zoom: 1,
    panX: 0,
    panY: 0,
    viewMode: "fit",
    hasAutoFitted: false,
    hasUserInteracted: false
  };
  private readonly objectGraphViewportState: GraphViewportState = {
    zoom: 1,
    panX: 0,
    panY: 0,
    viewMode: "fit",
    hasAutoFitted: false,
    hasUserInteracted: false
  };
  private readonly screenPreviewViewportState: GraphViewportState = {
    zoom: 1,
    panX: 0,
    panY: 0,
    viewMode: "fit",
    hasAutoFitted: false,
    hasUserInteracted: false
  };
  private state: PreviewState = {
    mode: "empty",
    message: "対応ファイルを開くとプレビューが表示されます。",
    warnings: []
  };
  private diagramFilePath: string | null = null;
  private objectGraphFilePath: string | null = null;
  private screenPreviewFilePath: string | null = null;
  private readonly viewportStateCache = new Map<string, CachedViewportState>();
  private readonly collapsibleState = new Map<string, boolean>();
  private readonly scrollStateByFilePath = new Map<string, number>();
  private readonly splitRatioByKey = new Map<string, number>();
  private activeScrollContainer: HTMLElement | null = null;
  private viewerPreferences: ModelWeaveViewerPreferences;

  constructor(
    leaf: WorkspaceLeaf,
    viewerPreferences: ModelWeaveViewerPreferences = DEFAULT_VIEWER_PREFERENCES
  ) {
    super(leaf);
    this.viewerPreferences = { ...viewerPreferences };
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

  applyViewerSettings(viewerPreferences: ModelWeaveViewerPreferences): void {
    this.viewerPreferences = { ...viewerPreferences };
  }

  refreshForSettingsChange(): void {
    this.renderCurrentState();
    this.restoreCurrentScrollPosition();
  }

  async exportCurrentDiagramAsPng(): Promise<string | null> {
    const exportRenderable = this.buildCurrentDiagramExportRenderable();
    if (!exportRenderable) {
      return null;
    }

    return exportDiagramRenderableAsPng(this.app, exportRenderable);
  }

  updateContent(state: PreviewState, reason: PreviewUpdateReason = "rerender"): void {
    this.persistActiveViewportState();
    this.persistCurrentScrollPosition();
    this.prepareViewportState(state, reason);
    this.state = state;
    this.renderCurrentState();
    this.restoreCurrentScrollPosition();
  }

  getCurrentFilePath(): string | null {
    switch (this.state.mode) {
      case "diagram":
        return this.state.diagram.diagram.path;
      case "object":
        return "filePath" in this.state.model ? this.state.model.filePath : this.state.model.path;
      case "dfd-object":
        return this.state.model.path;
      case "summary":
        return this.state.filePath;
      default:
        return null;
    }
  }

  private persistActiveViewportState(): void {
    if (this.diagramFilePath) {
      this.rememberViewportState(this.diagramFilePath, this.diagramViewportState);
    }
    if (this.objectGraphFilePath) {
      this.rememberViewportState(this.objectGraphFilePath, this.objectGraphViewportState);
    }
    if (this.screenPreviewFilePath) {
      this.rememberViewportState(this.screenPreviewFilePath, this.screenPreviewViewportState);
    }
  }

  private prepareViewportState(
    state: PreviewState,
    reason: PreviewUpdateReason
  ): void {
    if (state.mode === "diagram") {
      const nextFilePath = state.diagram.diagram.path;
      this.prepareFileViewportState(
        this.diagramViewportState,
        this.diagramFilePath,
        nextFilePath,
        reason
      );
      this.diagramFilePath = nextFilePath;
      return;
    }

    if (state.mode === "object" && state.context) {
      const objectPath =
        "filePath" in state.model ? state.model.filePath : state.model.path;
      this.prepareFileViewportState(
        this.objectGraphViewportState,
        this.objectGraphFilePath,
        objectPath,
        reason
      );
      this.objectGraphFilePath = objectPath;
      return;
    }

      if (state.mode === "dfd-object") {
        this.prepareFileViewportState(
          this.objectGraphViewportState,
          this.objectGraphFilePath,
          state.model.path,
        reason
      );
        this.objectGraphFilePath = state.model.path;
        return;
      }

      if (state.mode === "summary" && (state.layoutBlocks?.length ?? 0) > 0) {
        this.prepareFileViewportState(
          this.screenPreviewViewportState,
          this.screenPreviewFilePath,
          state.filePath,
          reason
        );
        this.screenPreviewFilePath = state.filePath;
        return;
      }

      if (state.mode !== "object") {
        this.objectGraphFilePath = null;
      }
      if (state.mode !== "summary" || (state.layoutBlocks?.length ?? 0) === 0) {
        this.screenPreviewFilePath = null;
      }
      this.diagramFilePath = null;
    }

  private prepareFileViewportState(
    state: GraphViewportState,
    currentFilePath: string | null,
    nextFilePath: string,
    reason: PreviewUpdateReason
  ): void {
    if (reason === "manual-fit" || currentFilePath === nextFilePath) {
      return;
    }

    const cached = this.viewportStateCache.get(nextFilePath);
    if (cached) {
      if (cached.viewMode === "fit") {
        resetGraphViewportState(state);
      } else {
        state.zoom = cached.zoom;
        state.panX = cached.panX;
        state.panY = cached.panY;
        state.viewMode = "manual";
        state.hasAutoFitted = true;
        state.hasUserInteracted = true;
      }
      cached.updatedAt = Date.now();
      return;
    }

    resetGraphViewportState(state);
    if (this.viewerPreferences.defaultZoom === "100") {
      state.zoom = 1;
      state.panX = 0;
      state.panY = 0;
      state.viewMode = "manual";
      state.hasAutoFitted = true;
      state.hasUserInteracted = false;
    }
  }

  private rememberViewportState(filePath: string, state: GraphViewportState): void {
    if (
      !state.hasAutoFitted &&
      !state.hasUserInteracted
    ) {
      return;
    }

    this.viewportStateCache.set(filePath, {
      filePath,
      viewMode: state.viewMode,
      zoom: state.zoom,
      panX: state.panX,
      panY: state.panY,
      updatedAt: Date.now()
    });
    this.pruneViewportStateCache();
  }

  private pruneViewportStateCache(): void {
    if (this.viewportStateCache.size <= VIEWPORT_STATE_CACHE_LIMIT) {
      return;
    }

    const oldestEntries = [...this.viewportStateCache.entries()].sort(
      (left, right) => left[1].updatedAt - right[1].updatedAt
    );
    for (const [filePath] of oldestEntries.slice(
      0,
      this.viewportStateCache.size - VIEWPORT_STATE_CACHE_LIMIT
    )) {
      this.viewportStateCache.delete(filePath);
    }
  }

  private getCurrentDiagramFilePath(): string | null {
    switch (this.state.mode) {
      case "diagram":
        return this.state.diagram.diagram.path;
      case "object":
        return this.state.context
          ? ("filePath" in this.state.model
            ? this.state.model.filePath
            : this.state.model.path)
          : null;
      case "dfd-object":
        return this.state.model.path;
      default:
        return null;
    }
  }

  private buildCurrentDiagramExportRenderable():
    | {
        filePath: string;
        render: () => HTMLElement;
      }
    | null {
    const state = this.state;
      switch (state.mode) {
        case "diagram":
            return {
              filePath: state.diagram.diagram.path,
              render: () =>
              renderDiagramModel(state.diagram, {
                hideTitle: true,
                hideDetails: true,
                forExport: true,
                renderMode: state.rendererSelection?.effectiveMode
              })
          };
      case "object": {
        const filePath = this.getCurrentDiagramFilePath();
        if (!filePath) {
          return null;
        }

        if (state.rendererSelection?.actualRenderer === "mermaid") {
          const context: ResolvedObjectContext =
            state.context ?? {
              object: state.model,
              relatedObjects: [],
              warnings: []
            };
          const subgraph = buildObjectSubgraphScene(context);
          return {
            filePath,
            render: () =>
              renderDiagramModel(subgraph, {
                hideTitle: true,
                hideDetails: true,
                forExport: true,
                renderMode: "mermaid"
              })
          };
        }

        const context: ResolvedObjectContext =
          state.context ?? {
            object: state.model,
            relatedObjects: [],
            warnings: []
          };
        const subgraph = buildObjectSubgraphScene(context);
        return {
          filePath,
              render: () =>
              renderDiagramModel(subgraph, {
                hideTitle: true,
                hideDetails: true,
                forExport: true
            })
        };
      }
        case "dfd-object":
            return {
              filePath: state.model.path,
              render: () =>
                renderDiagramModel(state.diagram, {
                  hideTitle: true,
                  hideDetails: true,
                  forExport: true
                })
            };
        case "summary":
          if ((state.layoutBlocks?.length ?? 0) > 0) {
            return {
              filePath: state.filePath,
              render: () =>
                createScreenPreviewDiagram(buildScreenPreviewData(state), {
                  forExport: true
                })
            };
          }
          return null;
        default:
          return null;
      }
    }

  private createDiagramViewportStateHandler(
    filePath: string
  ): (state: GraphViewportState) => void {
    return (viewportState) => {
      if (
        this.state.mode !== "diagram" ||
        this.diagramFilePath !== filePath ||
        this.state.diagram.diagram.path !== filePath
      ) {
        return;
      }

      this.rememberViewportState(filePath, viewportState);
    };
  }

    private createObjectViewportStateHandler(
      filePath: string
    ): (state: GraphViewportState) => void {
    return (viewportState) => {
      if (
        this.state.mode !== "object" ||
        this.objectGraphFilePath !== filePath
      ) {
        return;
      }

      const currentPath =
        "filePath" in this.state.model ? this.state.model.filePath : this.state.model.path;
      if (currentPath !== filePath) {
        return;
      }

        this.rememberViewportState(filePath, viewportState);
      };
    }

    private createScreenPreviewViewportStateHandler(
      filePath: string
    ): (state: GraphViewportState) => void {
      return (viewportState) => {
        if (
          this.state.mode !== "summary" ||
          this.screenPreviewFilePath !== filePath ||
          this.state.filePath !== filePath
        ) {
          return;
        }

        this.rememberViewportState(filePath, viewportState);
      };
    }

  private renderCurrentState(): void {
    this.clearView();

    switch (this.state.mode) {
      case "object":
        this.renderObjectState(this.state);
        return;
      case "relations":
        this.renderRelationsState(this.state);
        return;
      case "summary":
        this.renderSummaryState(this.state);
        return;
      case "dfd-object":
        this.renderDfdObjectState(this.state);
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
    this.activeScrollContainer = null;
    this.contentEl.classList.remove(
      "model-weave-viewer-root",
      "mw-font-small",
      "mw-font-normal",
      "mw-font-large",
      "mw-density-compact",
      "mw-density-normal",
      "mw-density-relaxed"
    );
    this.contentEl.classList.add("model-weave-viewer-root");
    this.contentEl.classList.add(`mw-font-${this.viewerPreferences.fontSize}`);
    this.contentEl.classList.add(`mw-density-${this.viewerPreferences.nodeDensity}`);
    const fontVars = this.getFontSizeVariables();
    this.contentEl.style.setProperty("--model-weave-font-size", fontVars.base);
    this.contentEl.style.setProperty("--model-weave-font-size-small", fontVars.small);
    this.contentEl.style.setProperty("--model-weave-font-size-large", fontVars.large);
    this.contentEl.style.setProperty("--model-weave-font-size-title", fontVars.title);
    this.contentEl.setCssStyles({
      gap: `${this.getDensitySpacing().contentGap}px`
    });
  }

  private renderEmptyState(message: string): void {
    const section = document.createElement("section");
    section.addClass("model-weave-viewer-empty");

    const text = document.createElement("p");
    text.textContent = message;
    text.addClass("model-weave-viewer-empty-text");
    section.appendChild(text);

    this.contentEl.appendChild(section);
  }

  private renderObjectState(state: Extract<PreviewState, { mode: "object" }>): void {
    const objectPath =
      "filePath" in state.model ? state.model.filePath : state.model.path;
    const shell = this.createViewerSplitShell(`object:${objectPath}`, 0.62);
    this.activeScrollContainer = shell.bottomPane;
      renderDiagnostics(
        shell.bottomPane,
      state.warnings,
      state.onOpenDiagnostic ?? undefined,
      this.getCollapsibleOpenState,
      this.setCollapsibleOpenState
    );
    shell.bottomPane.appendChild(renderObjectModel(state.model, state.context));

    if (!state.context) {
      return;
    }

    if (state.rendererSelection?.actualRenderer === "mermaid") {
      const contextRoot = renderObjectContext(state.context, {
        onOpenObject: state.onOpenObject ?? undefined,
        viewportState: this.objectGraphViewportState,
        onViewportStateChange: this.createObjectViewportStateHandler(objectPath)
      });
      const relatedList = Array.from(contextRoot.children).find(
        (child) =>
          child instanceof HTMLElement &&
          (child.classList.contains("model-weave-object-context-list") ||
            child.classList.contains("mdspec-related-list"))
      );
      if (relatedList) {
        relatedList.remove();
        shell.bottomPane.appendChild(relatedList);
      }

      const subgraph = buildObjectSubgraphScene(state.context);
      const mermaidRoot = renderDiagramModel(subgraph, {
        hideTitle: true,
        hideDetails: true,
        renderMode: "mermaid",
        viewportState: this.objectGraphViewportState,
        onViewportStateChange: this.createObjectViewportStateHandler(objectPath)
      });
        this.appendRendererSelection(mermaidRoot, state.rendererSelection);
        shell.topPane.appendChild(mermaidRoot);
        return;
    }

    const contextRoot = renderObjectContext(state.context, {
      onOpenObject: state.onOpenObject ?? undefined,
      viewportState: this.objectGraphViewportState,
      onViewportStateChange: this.createObjectViewportStateHandler(objectPath)
    });
    contextRoot.style.marginTop = "0";

    const relatedList = Array.from(contextRoot.children).find(
      (child) =>
        child instanceof HTMLElement &&
        (child.classList.contains("model-weave-object-context-list") ||
          child.classList.contains("mdspec-related-list"))
    );
    if (relatedList) {
      relatedList.remove();
      shell.bottomPane.appendChild(relatedList);
    }

      this.appendRendererSelection(contextRoot, state.rendererSelection);
      shell.topPane.appendChild(contextRoot);
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

  private renderSummaryState(
    state: Extract<PreviewState, { mode: "summary" }>
  ): void {
    if ((state.layoutBlocks?.length ?? 0) > 0) {
      const shell = this.createViewerSplitShell(`summary:${state.filePath}`, 0.48);
      this.activeScrollContainer = shell.bottomPane;
          shell.topPane.appendChild(
          createScreenPreviewDiagram(buildScreenPreviewData(state), {
            viewportState: this.screenPreviewViewportState,
            onViewportStateChange: this.createScreenPreviewViewportStateHandler(
              state.filePath
            ),
            onNavigateToLocation: state.onNavigateToLocation,
            onOpenLinkedFile: state.onOpenLinkedFile
          })
        );
      this.renderSummaryDetails(shell.bottomPane, state);
      return;
    }

      const wrapper = this.contentEl.createDiv();
      wrapper.addClass("model-weave-summary-section");
      this.activeScrollContainer = wrapper;
        this.renderSummaryDetails(wrapper, state);
    }

  private renderSummaryDetails(
    container: HTMLElement,
    state: Extract<PreviewState, { mode: "summary" }>
  ): void {
    container.createEl("h2", { text: state.title });

      container.createEl("p", {
        text: state.message,
        cls: "model-weave-summary-muted"
      });

    renderDiagnostics(
      container,
      state.warnings,
      undefined,
      this.getCollapsibleOpenState,
      this.setCollapsibleOpenState
    );

    if (state.metadata.length > 0) {
      const list = container.createEl("ul", { cls: "model-weave-summary-list" });
      for (const entry of state.metadata) {
        list.createEl("li", { text: `${entry.label}: ${entry.value}` });
      }
    }

    if (state.counts.length > 0) {
      const counts = container.createDiv();
      counts.createEl("h3", { text: "Counts" });
      const list = counts.createEl("ul", { cls: "model-weave-summary-list" });
      for (const entry of state.counts) {
        list.createEl("li", { text: `${entry.label}: ${entry.value}` });
      }
    }

    if (state.sections.length > 0) {
      const sections = this.createCollapsibleSection(
        container,
        "detectedSections",
        "Detected Sections",
        true
      );
      const list = sections.createEl("ul", { cls: "model-weave-summary-list" });
      for (const section of state.sections) {
        const item = list.createEl("li", { text: section.label });
        this.bindLocationNavigation(item, state.onNavigateToLocation, section);
      }
    }

    for (const textSection of state.textSections ?? []) {
      if (textSection.lines.length === 0) {
        continue;
      }

      const section = this.createCollapsibleSection(
        container,
        `text:${textSection.title}`,
        textSection.title,
        true
      );

      for (const line of textSection.lines) {
        section.createEl("p", {
          text: line,
          cls: "model-weave-summary-paragraph"
        });
      }
    }

    for (const table of state.tables ?? []) {
      const section = this.createCollapsibleSection(
        container,
        `summary:${table.title}`,
        table.title,
        true
      );

      const tableEl = section.createEl("table", {
        cls: "model-weave-summary-table"
      });

      const thead = tableEl.createEl("thead");
      const headRow = thead.createEl("tr");
      for (const column of table.columns) {
        headRow.createEl("th", {
          text: column,
          cls: "model-weave-summary-th"
        });
      }

      const tbody = tableEl.createEl("tbody");
      for (const row of table.rows) {
        const tr = tbody.createEl("tr");
        if (row.line !== undefined) {
          tr.addClass("model-weave-clickable");
        }
        this.bindLocationNavigation(tr, state.onNavigateToLocation, row);
        for (const cell of row.cells) {
          tr.createEl("td", {
            text: cell,
            cls: "model-weave-summary-td"
          });
        }
      }
    }

    if ((state.localProcesses?.length ?? 0) > 0) {
      const localProcesses = this.createCollapsibleSection(
        container,
        "localProcesses",
        "Local Processes",
        true
      );
      const list = localProcesses.createEl("ul", { cls: "model-weave-summary-list" });
      for (const process of state.localProcesses ?? []) {
        const item = list.createEl("li", { text: process.label });
        this.bindLocationNavigation(item, state.onNavigateToLocation, process);
      }
    }

    if ((state.navigationLists?.length ?? 0) > 0) {
      for (const navigationList of state.navigationLists ?? []) {
        const section = this.createCollapsibleSection(
          container,
          `navigation:${navigationList.title}`,
          navigationList.title,
          true
        );
        const list = section.createEl("ul", { cls: "model-weave-summary-list" });
        for (const itemInfo of navigationList.items) {
          const item = list.createEl("li", { text: itemInfo.label });
          this.bindLocationNavigation(item, state.onNavigateToLocation, itemInfo);
        }
      }
    }

    if ((state.relatedReferences?.length ?? 0) > 0) {
      const related = this.createCollapsibleSection(
        container,
        "relatedReferences",
        "Related References",
        true
      );
      const list = related.createEl("ul", { cls: "model-weave-summary-list" });
      for (const reference of state.relatedReferences ?? []) {
        const label =
          typeof reference.count === "number" && reference.count > 1
            ? `${reference.label} — ${reference.count} occurrences`
            : reference.label;
        const item = list.createEl("li", { text: label });
        this.bindLocationNavigation(item, state.onNavigateToLocation, reference);
      }
    }
  }

  private createCollapsibleSection(
    container: HTMLElement,
    key: string,
    title: string,
    defaultOpen: boolean
  ): HTMLElement {
    const details = container.createEl("details");
    details.open = this.getCollapsibleOpenState(key, defaultOpen);
    details.addEventListener("toggle", () => {
      this.setCollapsibleOpenState(key, details.open);
    });

    const summary = details.createEl("summary", { text: title });
    summary.addClass("model-weave-summary-heading");

    return details.createDiv();
  }

  private bindLocationNavigation(
    element: HTMLElement,
    onNavigate:
      | ((location: { line: number; ch?: number }) => void)
      | null
      | undefined,
    location: { line?: number; ch?: number }
  ): void {
    if (!onNavigate || typeof location.line !== "number") {
      return;
    }

    element.tabIndex = 0;
    element.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      onNavigate({ line: location.line!, ch: location.ch });
    };
    element.onkeydown = (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        event.stopPropagation();
        onNavigate({ line: location.line!, ch: location.ch });
      }
    };
  }

  private getCollapsibleOpenState = (key: string, defaultOpen: boolean): boolean => {
    return this.collapsibleState.get(key) ?? defaultOpen;
  };

  private setCollapsibleOpenState = (key: string, open: boolean): void => {
    this.collapsibleState.set(key, open);
  };

  private persistCurrentScrollPosition(): void {
    const filePath = this.getCurrentFilePath();
    if (!filePath || !this.activeScrollContainer) {
      return;
    }
    this.scrollStateByFilePath.set(filePath, this.activeScrollContainer.scrollTop);
  }

  private restoreCurrentScrollPosition(): void {
    const filePath = this.getCurrentFilePath();
    if (!filePath || !this.activeScrollContainer) {
      return;
    }

    const nextScrollTop = this.scrollStateByFilePath.get(filePath);
    if (typeof nextScrollTop === "number") {
      this.activeScrollContainer.scrollTop = nextScrollTop;
    }
  }

  private renderDfdObjectState(
    state: Extract<PreviewState, { mode: "dfd-object" }>
  ): void {
    const shell = this.createViewerSplitShell(`dfd-object:${state.model.path}`, 0.62);
    this.activeScrollContainer = shell.bottomPane;
      renderDiagnostics(
        shell.bottomPane,
      state.warnings,
      state.onOpenDiagnostic ?? undefined,
      this.getCollapsibleOpenState,
      this.setCollapsibleOpenState
    );
    shell.bottomPane.appendChild(renderObjectModel(state.model));

      const diagramRoot = renderDiagramModel(state.diagram, {
        hideTitle: true,
        hideDetails: false,
        onOpenObject: state.onOpenObject ?? undefined,
        viewportState: this.objectGraphViewportState,
        onViewportStateChange: this.createObjectViewportStateHandler(state.model.path)
      });
    this.moveDetailSections(diagramRoot, shell.bottomPane);
    shell.topPane.appendChild(diagramRoot);
  }

  private renderDiagramState(state: Extract<PreviewState, { mode: "diagram" }>): void {
    const filePath = state.diagram.diagram.path;
    const shell = this.createViewerSplitShell(`diagram:${filePath}`, 0.64);
    this.activeScrollContainer = shell.bottomPane;
      renderDiagnostics(
        shell.bottomPane,
      state.warnings,
      state.onOpenDiagnostic ?? undefined,
      this.getCollapsibleOpenState,
      this.setCollapsibleOpenState
    );

      const diagramRoot = renderDiagramModel(state.diagram, {
        onOpenObject: state.onOpenObject ?? undefined,
        renderMode: state.rendererSelection?.effectiveMode,
        viewportState: this.diagramViewportState,
        onViewportStateChange: this.createDiagramViewportStateHandler(filePath)
      });
      this.appendRendererSelection(diagramRoot, state.rendererSelection);
      this.moveDetailSections(diagramRoot, shell.bottomPane);
      shell.topPane.appendChild(diagramRoot);
  }

  private moveDetailSections(source: HTMLElement, target: HTMLElement): void {
    let detailWrapper = target.querySelector<HTMLElement>(".model-weave-lower-scroll");
    if (!detailWrapper) {
      detailWrapper = target.createDiv({ cls: "model-weave-lower-scroll" });
    }

    const details = Array.from(source.children).filter(
      (child) =>
        child instanceof HTMLElement &&
        child.matches(
          "details, .mdspec-related-list, .model-weave-object-context-list"
        )
    ) as HTMLElement[];

    for (const detail of details) {
      detail.remove();
      detail.addClass("model-weave-detail-panel");
      detailWrapper.appendChild(detail);
    }
  }

  private appendRendererSelection(
    container: HTMLElement,
    selection?: RendererSelectionState
  ): void {
    if (
      !selection ||
      !selection.onSelectMode ||
      (selection.supportedModes?.length ?? 0) < 2
    ) {
      return;
    }

    const toolbar = container.querySelector<HTMLElement>(".mdspec-zoom-toolbar");
    if (!toolbar) {
      return;
    }

    toolbar.style.display = "flex";
    toolbar.style.alignItems = "center";
    toolbar.style.gap = "8px";
    toolbar.querySelector(".mdspec-renderer-select-group")?.remove();

    const wrapper = document.createElement("div");
    wrapper.className = "mdspec-renderer-select-group";
    wrapper.style.display = "flex";
    wrapper.style.alignItems = "center";
    wrapper.style.gap = "6px";
    wrapper.style.marginLeft = "auto";
    wrapper.style.paddingLeft = "8px";
    wrapper.style.borderLeft = "1px solid var(--background-modifier-border)";

    const title = document.createElement("span");
      title.style.fontSize = "var(--model-weave-font-size-small)";
    title.style.fontWeight = "600";
    title.style.color = "var(--text-muted)";
    title.textContent = "Renderer";

    const meta = document.createElement("span");
    meta.textContent = `selected ${selection.selectedMode} / effective ${selection.effectiveMode} / source ${selection.source}`;
    if (selection.fallbackReason) {
      meta.textContent += ` / ${selection.fallbackReason}`;
    }

    title.title = meta.textContent;
    wrapper.appendChild(title);

    const select = document.createElement("select");
    select.style.minWidth = "104px";
    select.style.border = "1px solid var(--background-modifier-border)";
    select.style.borderRadius = "6px";
    select.style.background = "var(--background-primary)";
    select.style.color = "var(--text-normal)";
    select.style.padding = "2px 8px";
    select.style.fontSize = "var(--model-weave-font-size-small)";
    select.title = meta.textContent;
      for (const mode of selection.supportedModes) {
        const option = document.createElement("option");
        option.value = mode;
        option.textContent = mode[0].toUpperCase() + mode.slice(1);
        option.selected = mode === selection.visibleSelectedMode;
        select.appendChild(option);
      }
    select.addEventListener("change", () => {
      selection.onSelectMode?.(select.value as RenderMode);
    });
    wrapper.appendChild(select);

    toolbar.appendChild(wrapper);
  }

  private createViewerSplitShell(
    key: string,
    defaultTopRatio: number
  ): {
    root: HTMLElement;
    topPane: HTMLElement;
    bottomPane: HTMLElement;
      } {
      const density = this.getDensitySpacing();
      const root = this.contentEl.createDiv();
      root.addClass("model-weave-viewer-split-shell");

    const topPane = root.createDiv();
      topPane.addClass("model-weave-viewer-upper-pane");
      topPane.setCssStyles({
        padding: `${density.topPanePadding}px`,
        gap: `${density.topPaneGap}px`
      });

    const handle = root.createDiv();
    handle.addClass("model-weave-viewer-resize-handle");

    const grip = handle.createDiv();
    grip.addClass("model-weave-viewer-resize-grip");

    const bottomPane = root.createDiv();
      bottomPane.addClass("model-weave-viewer-lower-pane");
      bottomPane.addClass("model-weave-viewer-lower-scroll");
      bottomPane.setCssStyles({
        padding: `${density.bottomPanePadding}px ${density.bottomPanePadding + 2}px ${density.bottomPanePadding + 4}px`,
        gap: `${density.bottomPaneGap}px`
      });

    const minTop = 180;
    const minBottom = 180;
    const clampRatio = (ratio: number): number =>
      Math.min(0.8, Math.max(0.3, ratio));

    const applyRatio = (ratio: number): void => {
      const bounded = clampRatio(ratio);
      const rootHeight = root.getBoundingClientRect().height;
      const available =
        rootHeight > 0 ? Math.max(rootHeight - 10, minTop + minBottom) : 0;
      if (available <= 0) {
        topPane.style.flex = `${bounded} 1 0`;
        bottomPane.style.flex = `${1 - bounded} 1 0`;
        this.splitRatioByKey.set(key, bounded);
        return;
      }

      const topPixels = Math.max(
        minTop,
        Math.min(available - minBottom, Math.round(available * bounded))
      );
      const bottomPixels = Math.max(minBottom, available - topPixels);
      topPane.style.flex = `0 0 ${topPixels}px`;
      bottomPane.style.flex = `0 0 ${bottomPixels}px`;
      this.splitRatioByKey.set(key, topPixels / available);
    };

    const initialRatio = clampRatio(
      this.splitRatioByKey.get(key) ?? defaultTopRatio
    );
    applyRatio(initialRatio);

    const resizeObserver = new ResizeObserver(() => {
      applyRatio(this.splitRatioByKey.get(key) ?? initialRatio);
    });
    resizeObserver.observe(root);

    handle.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const pointerId = event.pointerId;
      handle.setPointerCapture(pointerId);
      const rootRect = root.getBoundingClientRect();
      const available = Math.max(rootRect.height - 10, minTop + minBottom);

      const onMove = (moveEvent: PointerEvent) => {
        const offset = moveEvent.clientY - rootRect.top;
        const topPixels = Math.max(
          minTop,
          Math.min(available - minBottom, offset)
        );
        applyRatio(topPixels / available);
      };

      const onUp = () => {
        handle.releasePointerCapture(pointerId);
        handle.removeEventListener("pointermove", onMove);
        handle.removeEventListener("pointerup", onUp);
        handle.removeEventListener("pointercancel", onUp);
      };

      handle.addEventListener("pointermove", onMove);
      handle.addEventListener("pointerup", onUp);
      handle.addEventListener("pointercancel", onUp);
    });

      return { root, topPane, bottomPane };
    }

  private getFontSizeVariables(): {
    base: string;
    small: string;
    large: string;
    title: string;
  } {
    switch (this.viewerPreferences.fontSize) {
      case "small":
        return {
          base: "12px",
          small: "11px",
          large: "13px",
          title: "15px"
        };
      case "large":
        return {
          base: "17px",
          small: "15px",
          large: "19px",
          title: "20px"
        };
      default:
        return {
          base: "14px",
          small: "12px",
          large: "16px",
          title: "17px"
        };
    }
  }

  private getDensitySpacing(): {
    contentGap: number;
    topPanePadding: number;
    topPaneGap: number;
    bottomPanePadding: number;
    bottomPaneGap: number;
  } {
    switch (this.viewerPreferences.nodeDensity) {
      case "compact":
        return {
          contentGap: 8,
          topPanePadding: 8,
          topPaneGap: 8,
          bottomPanePadding: 8,
          bottomPaneGap: 10
        };
      case "relaxed":
        return {
          contentGap: 12,
          topPanePadding: 12,
          topPaneGap: 12,
          bottomPanePadding: 12,
          bottomPaneGap: 14
        };
      default:
        return {
          contentGap: 10,
          topPanePadding: 10,
          topPaneGap: 10,
          bottomPanePadding: 10,
          bottomPaneGap: 12
        };
    }
  }
}

const SCREEN_NODE_BG = "#ffffff";
const SCREEN_NODE_BORDER = "#3a7a4f";
const SCREEN_HEADER_BG = "#eef8f0";
const SCREEN_SECTION_DIVIDER = "#d1d5db";
const SCREEN_TEXT = "#111827";
const SCREEN_MUTED_TEXT = "#4b5563";
const SCREEN_CANVAS_BORDER = "#d1d5db";
const SCREEN_CANVAS_PADDING = 48;
const SCREEN_MIN_ZOOM = 0.45;
const SCREEN_MAX_ZOOM = 2.4;
const SCREEN_INITIAL_ZOOM = 1;
const SCREEN_CANVAS_MIN_HEIGHT = 420;
const SCREEN_BOX_WIDTH = 420;
const SCREEN_BOX_RADIUS = 12;
const SCREEN_BOX_HEADER_HEIGHT = 42;
const SCREEN_SECTION_HEADER_HEIGHT = 24;
const SCREEN_SECTION_PADDING = 10;
const SCREEN_SECTION_GAP = 8;
const SCREEN_FIELD_ROW_HEIGHT = 22;
const SCREEN_MAX_TITLE_CHARS = 34;
const SCREEN_MAX_SECTION_CHARS = 36;
const SCREEN_MAX_FIELD_CHARS = 40;
const SCREEN_TRANSITION_LANE_WIDTH = 168;
const SCREEN_TARGET_BOX_WIDTH = 240;
const SCREEN_TARGET_BOX_MIN_HEIGHT = 76;
const SCREEN_TARGET_BOX_HEADER_HEIGHT = 30;
const SCREEN_TARGET_BOX_GAP = 24;
const SCREEN_LABEL_PILL_WIDTH = 132;
const SCREEN_LABEL_PILL_HEIGHT = 24;
const SCREEN_LABEL_PILL_GAP = 8;
const SCREEN_LABEL_PILL_PADDING_X = 10;
const SCREEN_ARROW_COLOR = "#64748b";
const SCREEN_ARROW_LABEL_BG = "#ffffff";
const SCREEN_ARROW_LABEL_BORDER = "#cbd5e1";
const SCREEN_UNRESOLVED_BORDER = "#d97706";
const SCREEN_UNRESOLVED_BG = "#fff7ed";
const SCREEN_TARGET_BOX_SHADOW = "0 2px 8px rgba(15, 23, 42, 0.08)";

interface ScreenPreviewBlockData {
  label: string;
  subtitle?: string;
  line?: number;
  ch?: number;
  items: Array<{ label: string; line?: number; ch?: number }>;
}

interface ScreenPreviewTransitionActionData {
  label: string;
  fullLabel: string;
  title?: string;
  line?: number;
  ch?: number;
}

interface ScreenPreviewTransitionTargetData {
  key: string;
  targetLabel: string;
  targetTitle?: string;
  targetPath?: string;
  unresolved?: boolean;
  selfTarget?: boolean;
  actions: ScreenPreviewTransitionActionData[];
}

interface ScreenPreviewData {
  title: string;
  blocks: ScreenPreviewBlockData[];
  transitions: ScreenPreviewTransitionTargetData[];
}

interface ScreenPreviewSceneTarget {
  target: ScreenPreviewTransitionTargetData;
  x: number;
  y: number;
  width: number;
  height: number;
  centerY: number;
  labelPills: Array<{
    action: ScreenPreviewTransitionActionData;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}

interface ScreenPreviewScene {
  width: number;
  height: number;
  mainBoxHeight: number;
  mainBoxTop: number;
  targets: ScreenPreviewSceneTarget[];
}

function buildScreenPreviewData(
  state: Extract<PreviewState, { mode: "summary" }>
): ScreenPreviewData {
  return {
    title: state.title,
    blocks: state.layoutBlocks ?? [],
    transitions: state.screenPreviewTransitions ?? []
  };
}

function createScreenPreviewDiagram(
  data: ScreenPreviewData,
  options?: {
    forExport?: boolean;
    viewportState?: GraphViewportState;
    onViewportStateChange?: (state: GraphViewportState) => void;
    onNavigateToLocation?: ((location: { line: number; ch?: number }) => void) | null;
    onOpenLinkedFile?:
      | ((filePath: string, navigation?: { openInNewLeaf?: boolean }) => void)
      | null;
    }
  ): HTMLElement {
  const root = document.createElement("section");
  root.className = "mdspec-diagram mdspec-diagram--screen";
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.flex = "1 1 auto";
  root.style.minHeight = "0";

  const scene = buildScreenPreviewScene(data);

  const canvas = document.createElement("div");
  canvas.className = "mdspec-screen-canvas";
  canvas.style.position = "relative";
  canvas.style.overflow = "hidden";
  canvas.style.padding = "0";
  canvas.style.border = `1px solid ${SCREEN_CANVAS_BORDER}`;
  canvas.style.borderRadius = "8px";
  canvas.style.background = "#ffffff";
  canvas.style.flex = "1 1 auto";
  if (!options?.forExport) {
    canvas.style.minHeight = `${SCREEN_CANVAS_MIN_HEIGHT}px`;
  }
  canvas.style.height = "auto";
  canvas.style.cursor = "grab";
  canvas.style.userSelect = "none";
  canvas.style.touchAction = "none";

  const toolbar = options?.forExport
    ? null
    : createZoomToolbar("Wheel: zoom / Drag background: pan");
  if (toolbar) {
    root.appendChild(toolbar.root);
  }

  const viewport = document.createElement("div");
  viewport.className = "mdspec-screen-viewport";
  viewport.style.position = "relative";
  viewport.style.width = "100%";
  viewport.style.height = "100%";
  viewport.style.minHeight = "0";
  viewport.style.overflow = "hidden";

  const surface = document.createElement("div");
  surface.className = "mdspec-screen-surface";
  surface.dataset.modelWeaveExportSurface = "true";
  surface.dataset.modelWeaveRenderer = "custom";
  surface.dataset.modelWeaveSceneWidth = `${scene.width}`;
  surface.dataset.modelWeaveSceneHeight = `${scene.height}`;
  surface.style.position = "absolute";
  surface.style.left = "0";
  surface.style.top = "0";
  surface.style.width = `${scene.width}px`;
  surface.style.height = `${scene.height}px`;
  surface.style.transformOrigin = "0 0";
  surface.style.willChange = "transform";
  surface.style.background = "#ffffff";

  surface.appendChild(createScreenPreviewTransitionSvg(scene));
  surface.appendChild(createScreenPreviewMainBox(data, scene.mainBoxHeight, scene.mainBoxTop));
  for (const target of scene.targets) {
    surface.appendChild(createScreenPreviewTargetBox(target, options));
  }
  for (const target of scene.targets) {
    for (const pill of target.labelPills) {
      surface.appendChild(createScreenPreviewActionPill(pill, options?.onNavigateToLocation));
    }
  }

  viewport.appendChild(surface);
  canvas.appendChild(viewport);
  root.appendChild(canvas);

  if (toolbar) {
    attachGraphViewportInteractions(canvas, surface, toolbar, scene, {
      minZoom: SCREEN_MIN_ZOOM,
      maxZoom: SCREEN_MAX_ZOOM,
      initialZoom: SCREEN_INITIAL_ZOOM,
      viewportState: options?.viewportState,
      onViewportStateChange: options?.onViewportStateChange
    });
  }

  return root;
}

function buildScreenPreviewScene(
  data: ScreenPreviewData
): ScreenPreviewScene {
  const blocks = data.blocks.length > 0
    ? data.blocks
    : [{ label: "未分類 [unassigned]", items: [] }];

  const mainBoxHeight =
    SCREEN_BOX_HEADER_HEIGHT +
    blocks.reduce((sum, block) => {
      return (
        sum +
        SCREEN_SECTION_HEADER_HEIGHT +
        SCREEN_SECTION_PADDING * 2 +
        block.items.length * SCREEN_FIELD_ROW_HEIGHT
      );
      }, 0) +
    Math.max(0, blocks.length - 1) * SCREEN_SECTION_GAP;

  const targetGroups = data.transitions;
  const targetHeights = targetGroups.map((target) => {
    const labelsHeight =
      target.actions.length * SCREEN_LABEL_PILL_HEIGHT +
      Math.max(0, target.actions.length - 1) * SCREEN_LABEL_PILL_GAP;
    return Math.max(
      SCREEN_TARGET_BOX_MIN_HEIGHT,
      labelsHeight + SCREEN_SECTION_PADDING * 2
    );
  });
  const targetStackHeight =
    targetHeights.reduce((sum, currentHeight) => sum + currentHeight, 0) +
    Math.max(0, targetHeights.length - 1) * SCREEN_TARGET_BOX_GAP;
  const contentHeight = Math.max(mainBoxHeight, targetStackHeight);
  const mainBoxTop = SCREEN_CANVAS_PADDING + (contentHeight - mainBoxHeight) / 2;

  const labelStartX = SCREEN_CANVAS_PADDING + SCREEN_BOX_WIDTH + 28;
  const targetX = labelStartX + SCREEN_TRANSITION_LANE_WIDTH;
  const width =
    SCREEN_CANVAS_PADDING * 2 +
    SCREEN_BOX_WIDTH +
    (targetGroups.length > 0
      ? 28 + SCREEN_TRANSITION_LANE_WIDTH + SCREEN_TARGET_BOX_WIDTH
      : 0);
  const height = SCREEN_CANVAS_PADDING * 2 + contentHeight;
  const targets: ScreenPreviewSceneTarget[] = [];

  let nextTargetY = SCREEN_CANVAS_PADDING + (contentHeight - targetStackHeight) / 2;
  targetGroups.forEach((target, index) => {
    const groupHeight = targetHeights[index] ?? SCREEN_TARGET_BOX_MIN_HEIGHT;
    const targetBoxY = nextTargetY + (groupHeight - SCREEN_TARGET_BOX_MIN_HEIGHT) / 2;
    const labelsHeight =
      target.actions.length * SCREEN_LABEL_PILL_HEIGHT +
      Math.max(0, target.actions.length - 1) * SCREEN_LABEL_PILL_GAP;
    const labelStartY = nextTargetY + (groupHeight - labelsHeight) / 2;
    const labelPills = target.actions.map((action, actionIndex) => ({
      action,
      x: labelStartX,
      y: labelStartY + actionIndex * (SCREEN_LABEL_PILL_HEIGHT + SCREEN_LABEL_PILL_GAP),
      width: SCREEN_LABEL_PILL_WIDTH,
      height: SCREEN_LABEL_PILL_HEIGHT
    }));

    targets.push({
      target,
      x: targetX,
      y: targetBoxY,
      width: SCREEN_TARGET_BOX_WIDTH,
      height: SCREEN_TARGET_BOX_MIN_HEIGHT,
      centerY: targetBoxY + SCREEN_TARGET_BOX_MIN_HEIGHT / 2,
      labelPills
    });

    nextTargetY += groupHeight + SCREEN_TARGET_BOX_GAP;
  });

  return {
    width,
    height,
    mainBoxHeight,
    mainBoxTop,
    targets
  };
}

function createScreenPreviewMainBox(
  data: ScreenPreviewData,
  height: number,
  top: number
): HTMLElement {
  const box = document.createElement("div");
  box.className = "mdspec-screen-preview-box";
  box.style.position = "absolute";
  box.style.left = `${SCREEN_CANVAS_PADDING}px`;
  box.style.top = `${top}px`;
  box.style.width = `${SCREEN_BOX_WIDTH}px`;
  box.style.height = `${height}px`;
  box.style.border = `1px solid ${SCREEN_NODE_BORDER}`;
  box.style.borderRadius = `${SCREEN_BOX_RADIUS}px`;
  box.style.background = SCREEN_NODE_BG;
  box.style.boxShadow = SCREEN_TARGET_BOX_SHADOW;
  box.style.overflow = "hidden";
  box.style.color = SCREEN_TEXT;

  const header = document.createElement("header");
  header.style.padding = "10px 12px";
  header.style.borderBottom = `1px solid ${SCREEN_SECTION_DIVIDER}`;
  header.style.background = SCREEN_HEADER_BG;

  const kind = document.createElement("div");
  kind.style.fontSize = "var(--model-weave-font-size-small)";
  kind.style.textTransform = "uppercase";
  kind.style.letterSpacing = "0.08em";
  kind.style.color = SCREEN_MUTED_TEXT;
  kind.textContent = "screen";

  const title = document.createElement("div");
  title.style.fontWeight = "700";
  title.style.fontSize = "var(--model-weave-font-size-title)";
  title.style.lineHeight = "1.3";
  title.textContent = truncateScreenPreviewText(data.title, SCREEN_MAX_TITLE_CHARS);

  header.append(kind, title);
  box.appendChild(header);

  const body = document.createElement("div");
  body.style.display = "flex";
  body.style.flexDirection = "column";

  const blocks = data.blocks.length > 0
    ? data.blocks
    : [{ label: "未分類 [unassigned]", items: [] }];

  blocks.forEach((block, index) => {
    const section = document.createElement("section");
    section.style.padding = `${SCREEN_SECTION_PADDING}px 12px ${SCREEN_SECTION_PADDING}px`;
    if (index > 0) {
      section.style.borderTop = `1px solid ${SCREEN_SECTION_DIVIDER}`;
    }

    const sectionHeading = document.createElement("div");
      sectionHeading.style.fontSize = "var(--model-weave-font-size-small)";
    sectionHeading.style.fontWeight = "600";
    sectionHeading.style.color = SCREEN_MUTED_TEXT;
    sectionHeading.style.marginBottom = "6px";
    sectionHeading.textContent = truncateScreenPreviewText(block.label, SCREEN_MAX_SECTION_CHARS);
    section.appendChild(sectionHeading);

    if (block.items.length === 0) {
      const empty = document.createElement("div");
        empty.style.fontSize = "var(--model-weave-font-size-small)";
      empty.style.color = SCREEN_MUTED_TEXT;
      empty.textContent = "None";
      section.appendChild(empty);
    } else {
      const list = document.createElement("ul");
      list.style.margin = "0";
      list.style.paddingLeft = "18px";
        list.style.fontSize = "var(--model-weave-font-size)";
      list.style.lineHeight = "1.45";
      for (const item of block.items) {
        const entry = document.createElement("li");
        entry.textContent = truncateScreenPreviewText(item.label, SCREEN_MAX_FIELD_CHARS);
        list.appendChild(entry);
      }
      section.appendChild(list);
    }

    body.appendChild(section);
  });

  box.appendChild(body);
  return box;
}

function createScreenPreviewTransitionSvg(scene: ScreenPreviewScene): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", `${scene.width}`);
  svg.setAttribute("height", `${scene.height}`);
  svg.setAttribute("viewBox", `0 0 ${scene.width} ${scene.height}`);
  svg.style.position = "absolute";
  svg.style.left = "0";
  svg.style.top = "0";
  svg.style.overflow = "visible";
  svg.style.pointerEvents = "none";

  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
  marker.setAttribute("id", "mdspec-screen-preview-arrow");
  marker.setAttribute("markerWidth", "10");
  marker.setAttribute("markerHeight", "10");
  marker.setAttribute("refX", "8");
  marker.setAttribute("refY", "5");
  marker.setAttribute("orient", "auto");
  marker.setAttribute("markerUnits", "userSpaceOnUse");

  const markerPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  markerPath.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
  markerPath.setAttribute("fill", SCREEN_ARROW_COLOR);
  marker.appendChild(markerPath);
  defs.appendChild(marker);
  svg.appendChild(defs);

  const sourceX = SCREEN_CANVAS_PADDING + SCREEN_BOX_WIDTH;
  const sourceY = scene.mainBoxTop + scene.mainBoxHeight / 2;
  for (const target of scene.targets) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", `${sourceX}`);
    line.setAttribute("y1", `${sourceY}`);
    line.setAttribute("x2", `${target.x}`);
    line.setAttribute("y2", `${target.centerY}`);
    line.setAttribute("stroke", SCREEN_ARROW_COLOR);
    line.setAttribute("stroke-width", "2");
    line.setAttribute("stroke-linecap", "round");
    line.setAttribute("marker-end", "url(#mdspec-screen-preview-arrow)");
    svg.appendChild(line);
  }

  return svg;
}

function createScreenPreviewTargetBox(
  target: ScreenPreviewSceneTarget,
  options?: {
    onOpenLinkedFile?:
      | ((filePath: string, navigation?: { openInNewLeaf?: boolean }) => void)
      | null;
  }
): HTMLElement {
  const box = document.createElement("div");
  box.className = "mdspec-screen-preview-target-box";
  box.style.position = "absolute";
  box.style.left = `${target.x}px`;
  box.style.top = `${target.y}px`;
  box.style.width = `${target.width}px`;
  box.style.height = `${target.height}px`;
  box.style.border = `1px solid ${target.target.unresolved ? SCREEN_UNRESOLVED_BORDER : SCREEN_NODE_BORDER}`;
  box.style.borderRadius = "10px";
  box.style.background = target.target.unresolved ? SCREEN_UNRESOLVED_BG : SCREEN_NODE_BG;
  box.style.boxShadow = SCREEN_TARGET_BOX_SHADOW;
  box.style.overflow = "hidden";
  box.style.color = SCREEN_TEXT;

  const header = document.createElement("header");
  header.style.padding = "8px 12px";
  header.style.borderBottom = `1px solid ${SCREEN_SECTION_DIVIDER}`;
  header.style.background = target.target.unresolved ? "#ffedd5" : SCREEN_HEADER_BG;
  header.style.minHeight = `${SCREEN_TARGET_BOX_HEADER_HEIGHT}px`;

  const kind = document.createElement("div");
  kind.style.fontSize = "var(--model-weave-font-size-small)";
  kind.style.textTransform = "uppercase";
  kind.style.letterSpacing = "0.08em";
  kind.style.color = SCREEN_MUTED_TEXT;
  kind.textContent = target.target.unresolved ? "unresolved screen" : "screen";

  const title = document.createElement("div");
  title.style.fontWeight = "700";
  title.style.fontSize = "var(--model-weave-font-size-large)";
  title.style.lineHeight = "1.3";
  title.textContent = truncateScreenPreviewText(target.target.targetLabel, SCREEN_MAX_SECTION_CHARS);
  if (target.target.targetTitle) {
    title.title = target.target.targetTitle;
  }

  header.append(kind, title);
  box.appendChild(header);

  const body = document.createElement("div");
  body.style.padding = "10px 12px";
  body.style.fontSize = "var(--model-weave-font-size-small)";
  body.style.color = SCREEN_MUTED_TEXT;
  body.style.display = "flex";
  body.style.flexDirection = "column";
  body.style.gap = "4px";
  if (target.target.selfTarget) {
    body.createEl("div", { text: "self transition" });
  } else if (target.target.unresolved) {
    body.createEl("div", { text: "transition target not resolved" });
  } else {
    body.createEl("div", { text: "Open target screen" });
  }
  if (target.target.actions.length > 1) {
    body.createEl("div", { text: `${target.target.actions.length} actions` });
  }
  box.appendChild(body);

  if (target.target.targetPath && options?.onOpenLinkedFile) {
    box.tabIndex = 0;
    box.style.cursor = "pointer";
    box.title = target.target.targetTitle || target.target.targetLabel;
    const openTarget = (openInNewLeaf: boolean) => {
      options.onOpenLinkedFile?.(target.target.targetPath!, { openInNewLeaf });
    };
    box.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      openTarget(Boolean(event.metaKey || event.ctrlKey));
    };
    box.onauxclick = (event) => {
      if (event.button !== 1) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      openTarget(true);
    };
    box.onkeydown = (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        event.stopPropagation();
        openTarget(Boolean(event.ctrlKey || event.metaKey));
      }
    };
  }

  return box;
}

function createScreenPreviewActionPill(
  pill: ScreenPreviewSceneTarget["labelPills"][number],
  onNavigateToLocation?: ((location: { line: number; ch?: number }) => void) | null
): HTMLElement {
  const element = document.createElement("button");
  element.type = "button";
  element.className = "mdspec-screen-preview-action-pill";
  element.style.position = "absolute";
  element.style.left = `${pill.x}px`;
  element.style.top = `${pill.y}px`;
  element.style.width = `${pill.width}px`;
  element.style.height = `${pill.height}px`;
  element.style.padding = `0 ${SCREEN_LABEL_PILL_PADDING_X}px`;
  element.style.border = `1px solid ${SCREEN_ARROW_LABEL_BORDER}`;
  element.style.borderRadius = "999px";
  element.style.background = SCREEN_ARROW_LABEL_BG;
  element.style.color = SCREEN_TEXT;
  element.style.boxShadow = "0 1px 4px rgba(15, 23, 42, 0.08)";
  element.style.fontSize = "var(--model-weave-font-size-small)";
  element.style.lineHeight = `${pill.height - 2}px`;
  element.style.whiteSpace = "nowrap";
  element.style.overflow = "hidden";
  element.style.textOverflow = "ellipsis";
  element.style.cursor = onNavigateToLocation && typeof pill.action.line === "number" ? "pointer" : "default";
  element.textContent = truncateScreenPreviewText(pill.action.label, 18);
  if (pill.action.title) {
    element.title = pill.action.title;
  }

  if (onNavigateToLocation && typeof pill.action.line === "number") {
    element.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      onNavigateToLocation({ line: pill.action.line!, ch: pill.action.ch });
    };
    element.onkeydown = (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        event.stopPropagation();
        onNavigateToLocation({ line: pill.action.line!, ch: pill.action.ch });
      }
    };
  } else {
    element.disabled = true;
  }

  return element;
}

function truncateScreenPreviewText(value: string, maxChars: number): string {
  const normalized = value.trim();
  if (normalized.length <= maxChars) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, maxChars - 1))}…`;
}

function renderDiagnostics(
  container: HTMLElement,
  diagnostics: ValidationWarning[],
  onOpenDiagnostic?: (diagnostic: ValidationWarning) => void,
  getOpenState?: (key: string, defaultOpen: boolean) => boolean,
  setOpenState?: (key: string, open: boolean) => void
): void {
  const notes = diagnostics.filter((diagnostic) => diagnostic.severity === "info");
  const warnings = diagnostics.filter((diagnostic) => diagnostic.severity === "warning");
  const errors = diagnostics.filter((diagnostic) => diagnostic.severity === "error");

  if (notes.length === 0 && warnings.length === 0 && errors.length === 0) {
    return;
  }

  if (notes.length > 0) {
    renderDiagnosticSection(
      container,
      "Notes",
      notes,
      onOpenDiagnostic,
      "var(--text-muted)",
      getOpenState,
      setOpenState
    );
  }

  if (warnings.length > 0) {
    renderDiagnosticSection(
      container,
      "Warnings",
      warnings,
      onOpenDiagnostic,
      "var(--text-warning)",
      getOpenState,
      setOpenState
    );
  }

  if (errors.length > 0) {
    renderDiagnosticSection(
      container,
      "Errors",
      errors,
      onOpenDiagnostic,
      "var(--text-error)",
      getOpenState,
      setOpenState
    );
  }
}

function renderDiagnosticSection(
  container: HTMLElement,
  title: string,
  diagnostics: ValidationWarning[],
  onOpenDiagnostic: ((diagnostic: ValidationWarning) => void) | undefined,
  color: string,
  getOpenState?: (key: string, defaultOpen: boolean) => boolean,
  setOpenState?: (key: string, open: boolean) => void
): void {
  const details = container.createEl("details");
  details.className = "mdspec-diagnostic-section";
  const key = title.toLowerCase();
  details.open = getOpenState ? getOpenState(key, title !== "Notes") : title !== "Notes";
  if (setOpenState) {
    details.addEventListener("toggle", () => {
      setOpenState(key, details.open);
    });
  }
  details.style.fontSize = "var(--model-weave-font-size)";

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
