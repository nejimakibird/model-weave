import { ItemView, MarkdownRenderer, Notice, WorkspaceLeaf } from "obsidian";
import { shell } from "electron";
import type {
  AnyRenderMode,
  DomainRenderMode,
  EffectiveRenderMode,
  RenderMode,
  RenderModeSource
} from "../core/render-mode";
import type { ResolvedObjectContext } from "../core/object-context-resolver";
import { buildObjectSubgraphScene } from "../core/object-subgraph-builder";
import type { DomainRelationshipSummary } from "../core/domain-relationships";
import { buildDomainTree, type DomainTreeNode } from "../core/domain-tree";
import { getAppliedColorSchemeRowsForTargets } from "../core/color-scheme";
import { buildWeaveMapModel } from "../core/weave-map";
import {
  buildDomDiagramExportSnapshot,
  DiagramExportError,
  exportDiagramRenderableAsPng,
  exportDiagramSnapshotAsPng
} from "../export/png-export";
import { renderDiagramModel } from "../renderers/diagram-renderer";
import {
  getAppProcessBusinessFlowColorSchemeTargets,
  renderAppProcessBusinessFlow,
  type AppProcessBusinessFlowModel
} from "../renderers/app-process-business-flow";
import {
  attachGraphViewportInteractions,
  resetGraphViewportState,
  type GraphViewportState
} from "../renderers/graph-view-shared";
import { renderObjectContext } from "../renderers/object-context-renderer";
import type { ObjectContextLabels } from "../renderers/object-context-renderer";
import { renderObjectModel } from "../renderers/object-renderer";
import {
  renderDomainsMermaidDiagram,
  type DomainsMermaidMode
} from "../renderers/domains-mermaid";
import {
  createMermaidShell,
  renderMermaidSourceIntoShell,
  type MermaidShellElements
} from "../renderers/mermaid-shared";
import { buildWeaveMapMermaidSource } from "../renderers/weave-map-mermaid";
import { renderSourceLinks } from "../renderers/source-links-renderer";
import { createZoomToolbar } from "../renderers/zoom-toolbar";
import {
  createModelWeaveTranslator,
  type ModelWeaveUiLanguage,
  type ModelWeaveTranslator
} from "../i18n/messages";
import { localizeDiagnosticMessage } from "../core/current-file-diagnostics";
import type { ModelWeaveViewerPreferences } from "../settings/model-weave-settings";
import type {
  DomainEntry,
  DomainDiagramSourceSummary,
  DomainMergeConflict,
  DomainsModel,
  ResolvedDomainDiagram,
  ResolvedColorScheme,
  ColorSchemeModel,
  ColorSchemeEntry,
  DfdDiagramModel,
  DfdObjectModel,
  ErEntity,
  ImpactReference,
  ImpactSourceLink,
  ImpactSummary,
  ObjectModel,
  RelationsFileModel,
  ResolvedAppProcessDomainPlacement,
  ResolvedDiagram,
  SourceLink,
  ValidationWarning
} from "../types/models";
import type { WeaveMapSourceLinkMode } from "../types/weave-map";
import {
  renderGroupedSourceLinkSection,
  renderUsageDetailSection,
  renderUsageViewSections,
  type GroupedSourceLink,
  type UsageViewDetail,
  type UsageViewSection
} from "./usage-view-renderer";
import { renderAppliedColorSchemeSectionContent } from "./applied-color-scheme-renderer";
import { MODELING_VIEW_ICON } from "./view-icon";

export const MODELING_PREVIEW_VIEW_TYPE = "mdspec-preview";

export type PreviewUpdateReason =
  | "initial-open"
  | "external-file-open"
  | "viewer-node-navigation"
  | "rerender"
  | "renderer-switch"
  | "manual-fit";

interface RendererSelectionState {
  selectedMode: AnyRenderMode;
  visibleSelectedMode: AnyRenderMode;
  supportedModes: AnyRenderMode[];
  effectiveMode: EffectiveRenderMode;
  actualRenderer: "custom" | "mermaid" | "table-text";
  source: RenderModeSource;
  fallbackReason?: string;
  onSelectMode?: ((mode: AnyRenderMode) => void) | null;
}

function isDomainRenderMode(value: AnyRenderMode | null | undefined): value is DomainRenderMode {
  return value === "mindmap" || value === "area" || value === "tree";
}

function isStandardRenderMode(value: AnyRenderMode | null | undefined): value is RenderMode {
  return value === "custom" || value === "mermaid" || value === "mermaid-detail";
}

function getStandardRenderMode(
  selection: RendererSelectionState | undefined,
  fallback?: RenderMode
): RenderMode | undefined {
  const mode = selection?.effectiveMode;
  return isStandardRenderMode(mode)
    ? mode
    : fallback;
}

function getDomainRenderModeFromSelection(
  selection: RendererSelectionState | undefined
): DomainRenderMode | null {
  return isDomainRenderMode(selection?.effectiveMode)
    ? selection.effectiveMode
    : null;
}

function getMermaidSourceLabels(t: ModelWeaveTranslator): {
  sourcePanelTitle: string;
  sourcePanelCopyLabel: string;
} {
  return {
    sourcePanelTitle: t("mermaid.source.title"),
    sourcePanelCopyLabel: t("mermaid.source.copy")
  };
}

function getGraphExportLabels(t: ModelWeaveTranslator): {
  exportPngLabel: string;
  exportPngTitle: string;
  exportAndOpenPngLabel: string;
  exportAndOpenPngTitle: string;
} {
  const exportLabel = t("graph.exportPng");
  const exportAndOpenLabel = t("graph.exportPngOpen");
  return {
    exportPngLabel: exportLabel,
    exportPngTitle: exportLabel,
    exportAndOpenPngLabel: exportAndOpenLabel,
    exportAndOpenPngTitle: exportAndOpenLabel
  };
}

function isDesktopVaultAdapter(
  adapter: unknown
): adapter is { getFullPath: (path: string) => string } {
  return (
    typeof adapter === "object" &&
    adapter !== null &&
    "getFullPath" in adapter &&
    typeof (adapter as { getFullPath?: unknown }).getFullPath === "function"
  );
}

function getDfdDetailLabels(t: ModelWeaveTranslator): {
  dfdDetailLabels: {
    displayedObjects: string;
    displayedFlows: string;
    noObjects: string;
    noFlows: string;
    domainPlacement: string;
    resolved: string;
    unresolved: string;
  };
} {
  return {
    dfdDetailLabels: {
      displayedObjects: t("dfd.preview.displayedObjects"),
      displayedFlows: t("dfd.preview.displayedFlows"),
      noObjects: t("dfd.preview.noObjects"),
      noFlows: t("dfd.preview.noFlows"),
      domainPlacement: t("dfd.preview.domainPlacement"),
      resolved: t("dfd.preview.resolved"),
      unresolved: t("dfd.preview.unresolved")
    }
  };
}

function getObjectContextLabels(t: ModelWeaveTranslator): ObjectContextLabels {
  return {
    title: t("objectContext.title"),
    linked: (count: number) => t("objectContext.linked", { count }),
    connectionDetails: t("objectContext.connectionDetails"),
    relationDetails: t("objectContext.relationDetails"),
    noDirectlyRelated: t("objectContext.noDirectlyRelated")
  };
}

function getClassDetailLabels(t: ModelWeaveTranslator): {
  classDetailLabels: {
    displayedRelations: string;
    noRelationsUsed: string;
  };
} {
  return {
    classDetailLabels: {
      displayedRelations: t("class.preview.displayedRelations"),
      noRelationsUsed: t("class.preview.noRelationsUsed")
    }
  };
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
      impactSummary?: ImpactSummary;
      weaveMapMermaidSource?: string;
      colorScheme?: ResolvedColorScheme;
      warnings: ValidationWarning[];
      rendererSelection?: RendererSelectionState;
      onCopyImpactSummary?: (() => void) | null;
      onOpenImpactModel?:
        | ((filePath: string, navigation?: { openInNewLeaf?: boolean }) => void)
        | null;
      onOpenDiagnostic?: ((diagnostic: ValidationWarning) => void) | null;
      onOpenObject?:
        | ((objectId: string, navigation?: { openInNewLeaf?: boolean }) => void)
        | null;
    }
    | {
        mode: "dfd-object";
        model: DfdObjectModel;
        diagram: ResolvedDiagram;
        impactSummary?: ImpactSummary;
        weaveMapMermaidSource?: string;
        colorScheme?: ResolvedColorScheme;
        warnings: ValidationWarning[];
        rendererSelection?: RendererSelectionState;
        onCopyImpactSummary?: (() => void) | null;
        onOpenImpactModel?:
          | ((filePath: string, navigation?: { openInNewLeaf?: boolean }) => void)
          | null;
        onOpenDiagnostic?: ((diagnostic: ValidationWarning) => void) | null;
        onOpenObject?:
          | ((objectId: string, navigation?: { openInNewLeaf?: boolean }) => void)
          | null;
      }
    | {
      mode: "domains";
      model: DomainsModel;
      relationships: DomainRelationshipSummary[];
      warnings: ValidationWarning[];
      colorScheme?: ResolvedColorScheme;
      rendererSelection?: RendererSelectionState;
      onOpenDiagnostic?: ((diagnostic: ValidationWarning) => void) | null;
    }
    | {
      mode: "domain-diagram";
      resolved: ResolvedDomainDiagram;
      relationships: DomainRelationshipSummary[];
      warnings: ValidationWarning[];
      colorScheme?: ResolvedColorScheme;
      rendererSelection?: RendererSelectionState;
      onOpenDiagnostic?: ((diagnostic: ValidationWarning) => void) | null;
    }
    | {
      mode: "color-scheme";
      model: ColorSchemeModel;
      warnings: ValidationWarning[];
      rendererSelection?: RendererSelectionState;
      onOpenDiagnostic?: ((diagnostic: ValidationWarning) => void) | null;
    }
    | {
      mode: "relations";
      model: RelationsFileModel;
      warnings: ValidationWarning[];
    }
    | {
      mode: "summary";
      summaryKind?: "screen";
      filePath: string;
      title: string;
      impactSummary?: ImpactSummary;
      weaveMapMermaidSource?: string;
      rendererSelection?: RendererSelectionState;
      onCopyImpactSummary?: (() => void) | null;
      onOpenImpactModel?:
        | ((filePath: string, navigation?: { openInNewLeaf?: boolean }) => void)
        | null;
      sourceLinks?: SourceLink[];
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
        businessFlow?: AppProcessBusinessFlowModel;
        appProcessDomainPlacement?: ResolvedAppProcessDomainPlacement;
        colorScheme?: ResolvedColorScheme;
        relatedReferences?: Array<{ label: string; line?: number; ch?: number; count?: number }>;
        message?: string;
        warnings: ValidationWarning[];
        onNavigateToLocation?: ((location: { line: number; ch?: number }) => void) | null;
        onOpenLinkedFile?:
          | ((filePath: string, navigation?: { openInNewLeaf?: boolean }) => void)
          | null;
      }
  | {
      mode: "diagram";
      diagram: ResolvedDiagram;
      impactSummary?: ImpactSummary;
      weaveMapMermaidSource?: string;
      warnings: ValidationWarning[];
      colorScheme?: ResolvedColorScheme;
      rendererSelection?: RendererSelectionState;
      onCopyImpactSummary?: (() => void) | null;
      onOpenImpactModel?:
        | ((filePath: string, navigation?: { openInNewLeaf?: boolean }) => void)
        | null;
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
  nodeDensity: "normal",
  defaultDomainsViewMode: "mindmap",
  defaultDomainDiagramViewMode: "mindmap",
  localSourceRoot: "",
  uiLanguage: "auto",
  showMermaidRenderDebug: false
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
  private readonly domainsMermaidViewportState: GraphViewportState = {
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
  private domainsDiagramMode: DomainsMermaidMode = "mindmap";
  private domainsDiagramModeFilePath: string | null = null;
  private domainsDiagramModeState: "domains" | "domain-diagram" | null = null;
  private activeScrollContainer: HTMLElement | null = null;
  private focusModeEnabled = false;
  private focusModePlaceholder: Comment | null = null;
  private viewOnlyEnabled = false;
  private viewOnlyTarget: HTMLElement | null = null;
  private viewOnlyPlaceholder: Comment | null = null;
  private viewOnlyStage: HTMLElement | null = null;
  private readonly handleFocusModeKeydown = (event: KeyboardEvent): void => {
    if (event.key !== "Escape" || !this.focusModeEnabled) {
      return;
    }

    event.preventDefault();
    this.setFocusMode(false);
  };
  private viewerPreferences: ModelWeaveViewerPreferences;
  private t: ModelWeaveTranslator;

  constructor(
    leaf: WorkspaceLeaf,
    viewerPreferences: ModelWeaveViewerPreferences = DEFAULT_VIEWER_PREFERENCES
  ) {
    super(leaf);
    this.viewerPreferences = { ...viewerPreferences };
    this.t = createModelWeaveTranslator(this.viewerPreferences.uiLanguage);
  }

  getViewType(): string {
    return MODELING_PREVIEW_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Modeling preview";
  }

  getIcon(): string {
    return MODELING_VIEW_ICON;
  }

  onOpen(): Promise<void> {
    this.contentEl.ownerDocument.addEventListener("keydown", this.handleFocusModeKeydown);
    this.renderCurrentState();
    return Promise.resolve();
  }

  onClose(): Promise<void> {
    this.contentEl.ownerDocument.removeEventListener("keydown", this.handleFocusModeKeydown);
    this.setFocusMode(false, { skipFit: true });
    this.clearView();
    return Promise.resolve();
  }

  applyViewerSettings(viewerPreferences: ModelWeaveViewerPreferences): void {
    this.viewerPreferences = { ...viewerPreferences };
    this.t = createModelWeaveTranslator(this.viewerPreferences.uiLanguage);
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

  private async exportCurrentDiagramAsPngWithNotice(): Promise<void> {
    try {
      const exportPath = await this.exportCurrentDiagramAsPng();
      if (!exportPath) {
        new Notice("The current view is not ready for export.");
        return;
      }

      new Notice(`Diagram exported: ${exportPath}`);
    } catch (error) {
      this.showPngExportFailureNotice(error);
    }
  }

  private async exportCurrentDiagramAsPngAndOpenWithNotice(): Promise<void> {
    try {
      const exportPath = await this.exportCurrentDiagramAsPng();
      if (!exportPath) {
        new Notice("The current view is not ready for export.");
        return;
      }

      new Notice(`Diagram exported: ${exportPath}`);
      await this.openExportedPng(exportPath);
    } catch (error) {
      this.showPngExportFailureNotice(error);
    }
  }

  private async exportWeaveMapPng(
    container: HTMLElement,
    filePath: string
  ): Promise<string | null> {
    const snapshot = buildDomDiagramExportSnapshot(
      container,
      filePath,
      "weave-map"
    );
    if (!snapshot) {
      return null;
    }

    return exportDiagramSnapshotAsPng(this.app, snapshot);
  }

  private async exportWeaveMapAsPng(container: HTMLElement, filePath: string): Promise<void> {
    try {
      const exportPath = await this.exportWeaveMapPng(container, filePath);
      if (!exportPath) {
        new Notice("The current diagram has no measurable export bounds.");
        return;
      }

      new Notice(`Diagram exported: ${exportPath}`);
    } catch (error) {
      this.showPngExportFailureNotice(error);
    }
  }

  private async exportWeaveMapAsPngAndOpen(
    container: HTMLElement,
    filePath: string
  ): Promise<void> {
    try {
      const exportPath = await this.exportWeaveMapPng(container, filePath);
      if (!exportPath) {
        new Notice("The current diagram has no measurable export bounds.");
        return;
      }

      new Notice(`Diagram exported: ${exportPath}`);
      await this.openExportedPng(exportPath);
    } catch (error) {
      this.showPngExportFailureNotice(error);
    }
  }

  private async openExportedPng(exportPath: string): Promise<void> {
    const adapter = this.app.vault.adapter;
    if (!isDesktopVaultAdapter(adapter)) {
      new Notice(this.t("graph.exportPngOpenUnavailable"));
      return;
    }

    try {
      if (typeof shell.openPath !== "function") {
        new Notice(this.t("graph.exportPngOpenUnavailable"));
        return;
      }

      const result = await shell.openPath(adapter.getFullPath(exportPath));
      if (result) {
        new Notice(this.t("graph.exportPngOpenFailed", { message: result }));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new Notice(this.t("graph.exportPngOpenFailed", { message }));
    }
  }

  private showPngExportFailureNotice(error: unknown): void {
    if (error instanceof DiagramExportError && error.code === "bounds-invalid") {
      new Notice("The current diagram has no measurable export bounds.");
      return;
    }

    new Notice("Failed to export the current diagram as PNG.");
  }

  updateContent(state: PreviewState, reason: PreviewUpdateReason = "rerender"): void {
    const previousFilePath = this.getCurrentFilePath();
    const nextFilePath = this.getFilePathForState(state);
    if (previousFilePath && nextFilePath && previousFilePath !== nextFilePath) {
      this.resetImpactCollapsibleState();
    }
    this.persistActiveViewportState();
    this.persistCurrentScrollPosition();
    this.prepareDomainsDiagramMode(state, nextFilePath);
    this.prepareViewportState(state, reason);
    this.state = state;
    this.renderCurrentState();
    this.restoreCurrentScrollPosition();
  }

  getCurrentFilePath(): string | null {
    return this.getFilePathForState(this.state);
  }

  private getFilePathForState(state: PreviewState): string | null {
    switch (state.mode) {
      case "diagram":
        return state.diagram.diagram.path;
      case "object":
        return "filePath" in state.model ? state.model.filePath : state.model.path;
      case "dfd-object":
        return state.model.path;
      case "domains":
        return state.model.path;
      case "domain-diagram":
        return state.resolved.diagram.path;
      case "color-scheme":
        return state.model.path;
      case "summary":
        return state.filePath;
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

      if (
        state.mode === "summary" &&
        ((state.layoutBlocks?.length ?? 0) > 0 ||
          (state.businessFlow?.steps.length ?? 0) > 0)
      ) {
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
      if (
        state.mode !== "summary" ||
        ((state.layoutBlocks?.length ?? 0) === 0 &&
          (state.businessFlow?.steps.length ?? 0) === 0)
      ) {
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
    if (reason === "manual-fit") {
      return;
    }

    if (reason === "renderer-switch") {
      this.viewportStateCache.delete(nextFilePath);
      resetGraphViewportState(state);
      return;
    }

    if (currentFilePath === nextFilePath) {
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

  private prepareDomainsDiagramMode(
    state: PreviewState,
    nextFilePath: string | null
  ): void {
    if (
      state.mode !== "domains" &&
      state.mode !== "domain-diagram"
    ) {
      this.domainsDiagramModeFilePath = null;
      this.domainsDiagramModeState = null;
      return;
    }

    if (
      this.domainsDiagramModeFilePath === nextFilePath &&
      this.domainsDiagramModeState === state.mode
    ) {
      return;
    }

    this.domainsDiagramMode = getDomainRenderModeFromSelection(state.rendererSelection) ??
      (state.mode === "domains"
        ? this.viewerPreferences.defaultDomainsViewMode
        : this.viewerPreferences.defaultDomainDiagramViewMode);
    this.domainsDiagramModeFilePath = nextFilePath;
    this.domainsDiagramModeState = state.mode;
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
        renderer?: string;
        render: () => HTMLElement;
      }
    | null {
    const state = this.state;
      switch (state.mode) {
        case "diagram":
            return {
              filePath: state.diagram.diagram.path,
              renderer: state.rendererSelection?.effectiveMode ?? "custom",
              render: () =>
                renderDiagramModel(state.diagram, {
                  hideTitle: true,
                  hideDetails: true,
                  forExport: true,
                  renderMode: getStandardRenderMode(state.rendererSelection),
                  colorScheme: state.colorScheme,
                  ...getMermaidSourceLabels(this.t)
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
            renderer: state.rendererSelection?.effectiveMode ?? "mermaid",
            render: () =>
              renderDiagramModel(subgraph, {
                hideTitle: true,
                hideDetails: true,
                forExport: true,
                fitVerticalAlign: "top",
                renderMode: getStandardRenderMode(state.rendererSelection, "mermaid"),
                ...getMermaidSourceLabels(this.t)
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
              renderer: state.rendererSelection?.effectiveMode ?? "custom",
              render: () =>
              renderDiagramModel(subgraph, {
                hideTitle: true,
                hideDetails: true,
                fitVerticalAlign: "top",
                forExport: true
            })
        };
      }
        case "dfd-object":
            return {
              filePath: state.model.path,
              renderer: state.rendererSelection?.effectiveMode ?? "custom",
              render: () =>
                renderDiagramModel(state.diagram, {
                  hideTitle: true,
                  hideDetails: true,
                  forExport: true
                })
            };
        case "domains":
          return this.buildDomainsDiagramExportRenderable(
            state.model.path,
            state.model.domains,
            state.colorScheme
          );
        case "domain-diagram":
          return this.buildDomainsDiagramExportRenderable(
            state.resolved.diagram.path,
            state.resolved.domains,
            state.colorScheme
          );
        case "summary":
          if ((state.layoutBlocks?.length ?? 0) > 0) {
            return {
              filePath: state.filePath,
              renderer: "custom",
              render: () =>
                createScreenPreviewDiagram(buildScreenPreviewData(state, this.t), {
                  forExport: true
                })
            };
          }
          if ((state.businessFlow?.steps.length ?? 0) > 0) {
            return {
              filePath: state.filePath,
              renderer: "business-flow",
              render: () =>
                renderAppProcessBusinessFlow(state.businessFlow!, {
                  forExport: true,
                  debug: false,
                  colorScheme: state.colorScheme
                })
            };
          }
          return null;
        default:
          return null;
      }
    }

  private buildDomainsDiagramExportRenderable(
    filePath: string,
    domains: DomainEntry[],
    colorScheme?: ResolvedColorScheme
  ): {
    filePath: string;
    renderer?: string;
    render: () => HTMLElement;
  } | null {
    if (domains.length === 0) {
      return null;
    }

    const mode = this.domainsDiagramMode;
    return {
      filePath,
      renderer: mode,
      render: () =>
        renderDomainsMermaidDiagram(domains, {
          title: this.getDomainDiagramModeLabel(mode),
          mode,
          renderFailedMessage: this.t("domains.preview.diagramRenderFailed"),
          fitVerticalAlign: "top",
          colorScheme,
          forExport: true
        })
    };
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
      case "domains":
        this.renderDomainsState(this.state);
        return;
      case "domain-diagram":
        this.renderDomainDiagramState(this.state);
        return;
      case "color-scheme":
        this.renderColorSchemeState(this.state);
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
    this.setViewOnlyMode(false, { skipFit: true });
    this.contentEl.empty();
    this.activeScrollContainer = null;
    this.contentEl.classList.remove(
      "model-weave-viewer-root",
      "mw-font-small",
      "mw-font-normal",
      "mw-font-large",
      "mw-density-compact",
      "mw-density-normal",
      "mw-density-relaxed",
      "model-weave-viewer-view-only"
    );
    this.contentEl.classList.add("model-weave-viewer-root");
    this.contentEl.classList.toggle("model-weave-viewer-focus-mode", this.focusModeEnabled);
    this.contentEl.classList.toggle("model-weave-viewer-view-only", this.viewOnlyEnabled);
    this.contentEl.classList.add(`mw-font-${this.viewerPreferences.fontSize}`);
    this.contentEl.classList.add(`mw-density-${this.viewerPreferences.nodeDensity}`);
    const fontVars = this.getFontSizeVariables();
    this.contentEl.setCssProps({
      "--model-weave-font-size": fontVars.base,
      "--model-weave-font-size-small": fontVars.small,
      "--model-weave-font-size-large": fontVars.large,
      "--model-weave-font-size-title": fontVars.title,
      "--mw-content-gap": `${this.getDensitySpacing().contentGap}px`
    });
    this.appendViewerFocusToolbar();
    this.ensureViewOnlyStage();
  }

  private renderEmptyState(message: string): void {
    const doc = this.contentEl.ownerDocument;
    const section = doc.createElement("section");
    section.addClass("model-weave-viewer-empty");

    const text = doc.createElement("p");
    text.textContent = message;
    text.addClass("model-weave-viewer-empty-text");
    section.appendChild(text);

    this.contentEl.appendChild(section);
  }

  private renderObjectState(state: Extract<PreviewState, { mode: "object" }>): void {
    const objectPath =
      "filePath" in state.model ? state.model.filePath : state.model.path;
    const shell = this.createViewerSplitShell(`object:${objectPath}`, 0.62);
    shell.bottomPane.addClass("model-weave-summary-details");
    this.activeScrollContainer = shell.bottomPane;
    this.renderReviewSummaryPanel(shell.bottomPane, {
      model: state.model,
      warnings: state.warnings,
      impactSummary: state.impactSummary,
      sourceLinks: state.model.sourceLinks,
      weaveMapAvailable: Boolean(state.weaveMapMermaidSource)
    });
      renderDiagnostics(
        shell.bottomPane,
      state.warnings,
      state.onOpenDiagnostic ?? undefined,
      this.getCollapsibleOpenState,
      this.setCollapsibleOpenState,
      this.getDiagnosticLanguage()
    );
    shell.bottomPane.appendChild(
      renderObjectModel(
        state.model,
        state.context,
        this.viewerPreferences.localSourceRoot,
        this.viewerPreferences.uiLanguage
      )
    );
    this.renderImpactSummarySection(
      shell.bottomPane,
      state.impactSummary,
      state.onCopyImpactSummary,
      state.onOpenImpactModel,
      state.weaveMapMermaidSource,
      state.colorScheme
    );

    if (!state.context) {
      return;
    }

    if (state.rendererSelection?.actualRenderer === "mermaid") {
      const contextRoot = renderObjectContext(state.context, {
        onOpenObject: state.onOpenObject ?? undefined,
        viewportState: this.objectGraphViewportState,
        onViewportStateChange: this.createObjectViewportStateHandler(objectPath),
        labels: getObjectContextLabels(this.t)
      });
      const relatedList = Array.from(contextRoot.children).find(
        (child) =>
          child.instanceOf(HTMLElement) &&
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
        renderMode: getStandardRenderMode(state.rendererSelection, "mermaid"),
        fitVerticalAlign: "top",
        viewportState: this.objectGraphViewportState,
        onViewportStateChange: this.createObjectViewportStateHandler(objectPath),
        sourcePanelContainer: shell.bottomPane,
        sourcePanelPlacement: "prepend",
        ...getMermaidSourceLabels(this.t),
        ...getGraphExportLabels(this.t),
        onExportPng: () => this.exportCurrentDiagramAsPngWithNotice(),
        onExportAndOpenPng: () => this.exportCurrentDiagramAsPngAndOpenWithNotice(),
        ...getDfdDetailLabels(this.t),
        ...getClassDetailLabels(this.t),
        showMermaidRenderDebug: this.viewerPreferences.showMermaidRenderDebug
      });
      ensureGraphIdentityTitle(mermaidRoot, buildGraphIdentityTitle(state.model));
        this.appendRendererSelection(mermaidRoot, state.rendererSelection);
        this.appendViewerToolbarControls(mermaidRoot);
        shell.topPane.appendChild(mermaidRoot);
        return;
    }

    const contextRoot = renderObjectContext(state.context, {
      onOpenObject: state.onOpenObject ?? undefined,
      viewportState: this.objectGraphViewportState,
      onViewportStateChange: this.createObjectViewportStateHandler(objectPath),
      labels: getObjectContextLabels(this.t)
    });
    contextRoot.addClass("model-weave-object-context-no-margin");

    const relatedList = Array.from(contextRoot.children).find(
      (child) =>
        child.instanceOf(HTMLElement) &&
        (child.classList.contains("model-weave-object-context-list") ||
          child.classList.contains("mdspec-related-list"))
    );
    if (relatedList) {
      relatedList.remove();
      shell.bottomPane.appendChild(relatedList);
    }

    ensureGraphIdentityTitle(contextRoot, buildGraphIdentityTitle(state.model));
      this.appendRendererSelection(contextRoot, state.rendererSelection);
      this.appendViewerToolbarControls(contextRoot);
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

  private renderDomainsState(
    state: Extract<PreviewState, { mode: "domains" }>
  ): void {
    const shell = this.createViewerSplitShell(`domains:${state.model.path}`, 0.62);
    shell.bottomPane.addClass("model-weave-summary-details");
    this.activeScrollContainer = shell.bottomPane;
    this.renderReviewSummaryPanel(shell.bottomPane, {
      model: state.model,
      warnings: state.warnings,
      sourceLinks: state.model.sourceLinks,
      weaveMapAvailable: false
    });

    this.renderDomainMermaidDiagram(
      shell.topPane,
      state.model.domains,
      shell.bottomPane,
      state.colorScheme,
      buildGraphIdentityTitle(state.model)
    );
    this.renderDomainTree(shell.bottomPane, buildDomainTree(state.model.domains));

    renderDiagnostics(
      shell.bottomPane,
      state.warnings,
      state.onOpenDiagnostic ?? undefined,
      this.getCollapsibleOpenState,
      this.setCollapsibleOpenState,
      this.getDiagnosticLanguage()
    );

    this.renderDomainRelationships(shell.bottomPane, state.relationships);
    this.renderDomainDetails(shell.bottomPane, state.model);
    this.renderAppliedColorScheme(shell.bottomPane, state.colorScheme, ["domain"]);
  }

  private renderDomainDiagramState(
    state: Extract<PreviewState, { mode: "domain-diagram" }>
  ): void {
    const shell = this.createViewerSplitShell(
      `domain-diagram:${state.resolved.diagram.path}`,
      0.62
    );
    shell.bottomPane.addClass("model-weave-summary-details");
    this.activeScrollContainer = shell.bottomPane;
    this.renderReviewSummaryPanel(shell.bottomPane, {
      model: state.resolved.diagram,
      warnings: state.warnings,
      sourceLinks: state.resolved.diagram.sourceLinks,
      weaveMapAvailable: false
    });

    this.renderDomainMermaidDiagram(
      shell.topPane,
      state.resolved.domains,
      shell.bottomPane,
      state.colorScheme,
      buildGraphIdentityTitle(state.resolved.diagram)
    );
    this.renderDomainTree(shell.bottomPane, buildDomainTree(state.resolved.domains));

    renderDiagnostics(
      shell.bottomPane,
      state.warnings,
      state.onOpenDiagnostic ?? undefined,
      this.getCollapsibleOpenState,
      this.setCollapsibleOpenState,
      this.getDiagnosticLanguage()
    );

    this.renderDomainDiagramSourceSummary(
      shell.bottomPane,
      state.resolved.sourceSummaries
    );
    this.renderDomainDiagramConflictSummary(
      shell.bottomPane,
      state.resolved.conflicts
    );
    this.renderDomainRelationships(shell.bottomPane, state.relationships);
    this.renderDomainDiagramDetails(shell.bottomPane, state.resolved);
    this.renderAppliedColorScheme(shell.bottomPane, state.colorScheme, ["domain"]);
  }

  private renderDomainDiagramSourceSummary(
    container: HTMLElement,
    sources: DomainDiagramSourceSummary[]
  ): void {
    const section = this.createCollapsibleSection(
      container,
      "domain-diagram:sources",
      this.t("domainDiagram.preview.sources"),
      true
    );

    if (sources.length === 0) {
      section.createEl("p", {
        text: this.t("domainDiagram.preview.noSources"),
        cls: "model-weave-summary-muted"
      });
      return;
    }

    const list = section.createEl("div", { cls: "model-weave-summary-list" });
    for (const source of sources) {
      const card = list.createDiv({
        cls: "model-weave-preview-section model-weave-summary-metadata"
      });
      card.createEl("h3", {
        text: source.resolvedPath ?? source.ref.ref,
        cls: "model-weave-preview-section-title"
      });
      this.renderDetailCard(card, [
        { label: this.t("domainDiagram.field.ref"), value: source.ref.ref },
        {
          label: this.t("domainDiagram.field.status"),
          value: this.t(`domainDiagram.status.${source.status}`)
        },
        {
          label: this.t("domains.preview.count"),
          value: String(source.domainCount)
        },
        ...(source.ref.notes
          ? [{ label: this.t("domainDiagram.field.notes"), value: source.ref.notes }]
          : [])
      ]);
    }
  }

  private renderDomainDiagramConflictSummary(
    container: HTMLElement,
    conflicts: DomainMergeConflict[]
  ): void {
    const section = this.createCollapsibleSection(
      container,
      "domain-diagram:conflicts",
      this.t("domainDiagram.preview.conflicts"),
      true
    );

    if (conflicts.length === 0) {
      section.createEl("p", {
        text: this.t("domainDiagram.preview.noConflicts"),
        cls: "model-weave-summary-muted"
      });
      return;
    }

    const list = section.createEl("div", { cls: "model-weave-summary-list" });
    for (const conflict of conflicts) {
      const card = list.createDiv({
        cls: "model-weave-preview-section model-weave-summary-metadata"
      });
      card.createEl("h3", {
        text: `${this.t("domains.field.id")}: ${conflict.domainId}`,
        cls: "model-weave-preview-section-title"
      });
      this.renderDetailCard(card, [
        {
          label: this.t("domainDiagram.field.conflict"),
          value: conflict.field
        },
        {
          label: this.t("domainDiagram.field.earlier"),
          value: this.formatDomainConflictValue(conflict.earlierSourcePath, conflict.earlierValue)
        },
        {
          label: this.t("domainDiagram.field.later"),
          value: this.formatDomainConflictValue(conflict.laterSourcePath, conflict.laterValue)
        },
        {
          label: this.t("domainDiagram.field.effective"),
          value: conflict.effectiveSourcePath
        }
      ]);
    }
  }

  private renderAppProcessDomainPlacementSummary(
    container: HTMLElement,
    resolved: ResolvedAppProcessDomainPlacement
  ): void {
    if (
      resolved.process.domains.length === 0 &&
      resolved.sourceSummaries.length === 0 &&
      resolved.placements.length === 0
    ) {
      return;
    }

    const section = this.createCollapsibleSection(
      container,
      "app-process:domain-placement",
      this.t("appProcess.preview.domainSourcesPlacement"),
      true
    );
    section.createEl("p", {
      text: this.t("appProcess.preview.legacyLaneLayoutOnly"),
      cls: "model-weave-summary-muted"
    });

    if (resolved.process.domains.length > 0) {
      const localHeading = section.createEl("h3", {
        text: this.t("appProcess.preview.localDomains"),
        cls: "model-weave-preview-section-title"
      });
      localHeading.addClass("model-weave-summary-subtitle");
      const localList = section.createEl("ul", { cls: "model-weave-summary-list" });
      for (const domain of resolved.process.domains) {
        const label = [
          domain.name || domain.id,
          domain.kind ? `[${domain.kind}]` : "",
          domain.parent ? `parent: ${domain.parent}` : ""
        ].filter(Boolean).join(" ");
        localList.createEl("li", { text: `${domain.id}: ${label}` });
      }
    }

    if (resolved.sourceSummaries.length > 0) {
      const sourcesHeading = section.createEl("h3", {
        text: this.t("domainDiagram.preview.sources"),
        cls: "model-weave-preview-section-title"
      });
      sourcesHeading.addClass("model-weave-summary-subtitle");
      const sourceList = section.createEl("ul", { cls: "model-weave-summary-list" });
      for (const source of resolved.sourceSummaries) {
        const label = [
          source.resolvedPath ?? source.ref.ref,
          `status: ${source.status}`,
          `domains: ${source.domainCount}`
        ].join(" / ");
        sourceList.createEl("li", { text: label });
      }
    }

    if (resolved.placements.length > 0) {
      const placementsHeading = section.createEl("h3", {
        text: this.t("appProcess.preview.domainPlacement"),
        cls: "model-weave-preview-section-title"
      });
      placementsHeading.addClass("model-weave-summary-subtitle");
      const placementList = section.createEl("ul", { cls: "model-weave-summary-list" });
      for (const placement of resolved.placements) {
        const domainLabel = placement.domain
          ? [
              placement.domain.name || placement.domain.id,
              placement.domain.kind ? `[${placement.domain.kind}]` : ""
            ].filter(Boolean).join(" ")
          : "unresolved";
        const stepLabel = placement.stepLabel
          ? `${placement.stepLabel} [${placement.stepId}]`
          : placement.stepId;
        placementList.createEl("li", {
          text: `${stepLabel}: ${placement.domainId} (${domainLabel})`
        });
      }
    }
  }

  private renderDomainDiagramDetails(
    container: HTMLElement,
    resolved: ResolvedDomainDiagram
  ): void {
    const details = this.createCollapsibleSection(
      container,
      "domain-diagram:details",
      this.t("domains.preview.details"),
      true
    );
    const diagram = resolved.diagram;

    const overview = details.createDiv({
      cls: "model-weave-preview-section model-weave-summary-metadata"
    });
    overview.createEl("h3", {
      text: this.t("domains.preview.overview"),
      cls: "model-weave-preview-section-title"
    });
    this.renderDetailCard(overview, [
      { label: this.t("domains.field.type"), value: "domain_diagram" },
      { label: this.t("domains.field.id"), value: diagram.id || this.t("domains.value.none") },
      { label: this.t("domains.field.name"), value: diagram.name || this.t("domains.value.none") },
      {
        label: this.t("domainDiagram.preview.sourceCount"),
        value: String(resolved.sourceSummaries.length)
      },
      { label: this.t("domains.preview.count"), value: String(resolved.domains.length) },
      { label: this.t("domains.field.path"), value: diagram.path }
    ]);

    this.renderDomainTable(details, resolved.domains);
  }

  private formatDomainConflictValue(sourcePath: string, value?: string): string {
    const displayValue = value?.trim() || this.t("domains.value.none");
    return `${sourcePath}: ${displayValue}`;
  }

  private renderDomainRelationships(
    container: HTMLElement,
    relationships: DomainRelationshipSummary[]
  ): void {
    const section = this.createCollapsibleSection(
      container,
      "domains:relationships",
      this.t("domains.preview.relationships"),
      true
    );

    if (relationships.length === 0) {
      section.createEl("p", {
        text: this.t("domains.preview.empty"),
        cls: "model-weave-summary-muted"
      });
      return;
    }

    const list = section.createEl("div", { cls: "model-weave-summary-list" });
    for (const relationship of relationships) {
      const card = list.createDiv({
        cls: "model-weave-preview-section model-weave-summary-metadata"
      });
      card.createEl("h3", {
        text: `${this.t("domains.field.id")}: ${relationship.domain.id}`,
        cls: "model-weave-preview-section-title"
      });

      this.renderDetailCard(card, [
        {
          label: this.t("domains.field.name"),
          value: relationship.domain.name || relationship.domain.id
        },
        {
          label: this.t("domains.field.kind"),
          value: relationship.domain.kind || this.t("domains.value.none")
        },
        {
          label: this.t("domains.relationship.parent"),
          value: relationship.parentId || this.t("domains.relationship.none")
        },
        {
          label: this.t("domains.relationship.children"),
          value: this.formatDomainRelationshipValues(relationship.childIds)
        }
      ]);

      if (relationship.domain.description) {
        this.renderDomainRelationshipList(
          card,
          this.t("domains.field.description"),
          [relationship.domain.description]
        );
      }
      this.renderDomainRelationshipList(
        card,
        this.t("domains.relationship.definedIn"),
        relationship.definedIn.map((entry) => entry.path)
      );
      this.renderDomainRelationshipList(
        card,
        this.t("domains.relationship.conflicts"),
        relationship.conflicts.map((field) =>
          this.t("domains.relationship.conflictField", { field })
        )
      );
      this.renderDomainRelationshipList(
        card,
        this.t("domains.relationship.dfdLocalDomains"),
        relationship.dfdLocalDomainReferences.map((entry) => entry.path)
      );
      this.renderDomainRelationshipList(
        card,
        this.t("domains.relationship.dfdObjects"),
        relationship.dfdObjectReferences.map((entry) =>
          entry.label
            ? `${entry.path} / ${entry.objectId}: ${entry.label}`
            : `${entry.path} / ${entry.objectId}`
        )
      );
    }
  }

  private renderDomainRelationshipList(
    container: HTMLElement,
    label: string,
    values: string[]
  ): void {
    const block = container.createDiv({ cls: "model-weave-summary-metadata" });
    block.createEl("h4", {
      text: label,
      cls: "model-weave-preview-section-title"
    });

    if (values.length === 0) {
      block.createEl("p", {
        text: this.t("domains.relationship.none"),
        cls: "model-weave-summary-muted"
      });
      return;
    }

    const list = block.createEl("ul", { cls: "model-weave-summary-list" });
    for (const value of values) {
      list.createEl("li", { text: value });
    }
  }

  private formatDomainRelationshipValues(values: string[]): string {
    return values.length > 0
      ? values.join(", ")
      : this.t("domains.relationship.none");
  }

  private renderDomainDetails(container: HTMLElement, model: DomainsModel): void {
    const details = this.createCollapsibleSection(
      container,
      "domains:details",
      this.t("domains.preview.details"),
      true
    );

    const overview = details.createDiv({
      cls: "model-weave-preview-section model-weave-summary-metadata"
    });
    overview.createEl("h3", {
      text: this.t("domains.preview.overview"),
      cls: "model-weave-preview-section-title"
    });
    this.renderDetailCard(overview, [
      { label: this.t("domains.field.type"), value: "domains" },
      { label: this.t("domains.field.id"), value: model.id || this.t("domains.value.none") },
      { label: this.t("domains.field.name"), value: model.name || this.t("domains.value.none") },
      { label: this.t("domains.preview.count"), value: String(model.domains.length) },
      { label: this.t("domains.field.path"), value: model.path }
    ]);

    const sourceLinks = renderSourceLinks(
      model.sourceLinks,
      this.viewerPreferences.localSourceRoot,
      this.viewerPreferences.uiLanguage
    );
    if (sourceLinks) {
      details.appendChild(sourceLinks);
    }

    this.renderDomainTable(details, model.domains);
  }

  private renderColorSchemeState(
    state: Extract<PreviewState, { mode: "color-scheme" }>
  ): void {
    this.contentEl.createEl("h2", {
      text: state.model.title ?? state.model.name
    });

    renderDiagnostics(
      this.contentEl,
      state.warnings,
      state.onOpenDiagnostic ?? undefined,
      this.getCollapsibleOpenState,
      this.setCollapsibleOpenState,
      this.getDiagnosticLanguage()
    );

    const section = this.createCollapsibleSection(
      this.contentEl,
      "color-scheme:colors",
      this.t("colorScheme.preview.colors"),
      true
    );
    this.renderColorSchemeTable(section, state.model.colors);
  }

  private renderColorSchemeTable(
    container: HTMLElement,
    colors: ColorSchemeEntry[]
  ): void {
    const tableWrap = container.createDiv({ cls: "model-weave-table-wrap" });
    const table = tableWrap.createEl("table", {
      cls: "model-weave-summary-table model-weave-data-table"
    });
    const headerRow = table.createEl("thead").createEl("tr");
    for (const key of [
      "colorScheme.field.target",
      "colorScheme.field.kind",
      "colorScheme.field.fill",
      "colorScheme.field.stroke",
      "colorScheme.field.text",
      "colorScheme.preview.swatch",
      "colorScheme.field.notes"
    ]) {
      headerRow.createEl("th", {
        text: this.t(key),
        cls: "model-weave-summary-th"
      });
    }

    const tbody = table.createEl("tbody");
    if (colors.length === 0) {
      const row = tbody.createEl("tr");
      row.createEl("td", {
        text: this.t("colorScheme.preview.empty"),
        attr: { colspan: "7" },
        cls: "model-weave-summary-muted"
      });
      return;
    }

    for (const color of colors) {
      this.renderColorSchemeTableRow(tbody, color);
    }
  }

  private renderAppliedColorScheme(
    container: HTMLElement,
    colorScheme: ResolvedColorScheme | undefined,
    targets: string[]
  ): void {
    if (!colorScheme) {
      return;
    }

    const normalizedTargets = targets
      .map((target) => target.trim())
      .filter(Boolean);
    if (normalizedTargets.length === 0) {
      return;
    }

    const section = this.createCollapsibleSection(
      container,
      `color-scheme:applied:${normalizedTargets.join(":")}`,
      this.t("colorScheme.preview.applied"),
      false
    );

    renderAppliedColorSchemeSectionContent(
      section,
      colorScheme,
      getAppliedColorSchemeRowsForTargets(colorScheme, normalizedTargets),
      normalizedTargets,
      this.t
    );
  }

  private renderColorSchemeTableRow(
    tbody: HTMLElement,
    color: ColorSchemeEntry
  ): void {
    const row = tbody.createEl("tr");
    for (const value of [
      color.target ?? this.t("domains.value.none"),
      color.kind,
      color.fill ?? this.t("domains.value.none"),
      color.stroke ?? this.t("domains.value.none"),
      color.text ?? this.t("domains.value.none")
    ]) {
      row.createEl("td", { text: value });
    }

    const swatchCell = row.createEl("td");
    const swatch = swatchCell.createSpan({
      cls: "model-weave-color-swatch"
    });
    if (color.fill) {
      swatch.style.backgroundColor = color.fill;
    }
    if (color.stroke) {
      swatch.style.borderColor = color.stroke;
    }
    if (color.text) {
      swatch.style.color = color.text;
    }
    swatch.textContent = "Aa";

    row.createEl("td", { text: color.notes ?? "" });
  }

  private renderDomainTable(container: HTMLElement, domains: DomainEntry[]): void {
    const section = this.createCollapsibleSection(
      container,
      "domains:list",
      this.t("domains.preview.list"),
      true
    );

    section.addClass("model-weave-table-wrap");
    const table = section.createEl("table", {
      cls: "model-weave-summary-table model-weave-data-table"
    });
    const headerRow = table.createEl("thead").createEl("tr");
    for (const key of [
      "domains.field.id",
      "domains.field.name",
      "domains.field.kind",
      "domains.field.parent",
      "domains.field.description"
    ]) {
      headerRow.createEl("th", {
        text: this.t(key),
        cls: "model-weave-summary-th"
      });
    }

    const tbody = table.createEl("tbody");
    if (domains.length === 0) {
      const row = tbody.createEl("tr");
      row.createEl("td", {
        text: this.t("domains.preview.empty"),
        cls: "model-weave-summary-td model-weave-summary-empty-cell",
        attr: { colspan: "5" }
      });
      return;
    }

    for (const domain of domains) {
      const row = tbody.createEl("tr");
      for (const value of [
        domain.id,
        domain.name || domain.id,
        domain.kind,
        domain.parent,
        domain.description
      ]) {
        row.createEl("td", {
          text: value || this.t("domains.value.none"),
          cls: "model-weave-summary-td"
        });
      }
    }
  }

  private renderDomainTree(container: HTMLElement, roots: DomainTreeNode[]): void {
    const section = this.createCollapsibleSection(
      container,
      "domains:tree",
      this.t("domains.preview.tree"),
      true
    );

    if (roots.length === 0) {
      section.createEl("p", {
        text: this.t("domains.preview.empty"),
        cls: "model-weave-summary-muted"
      });
      return;
    }

    const list = section.createEl("ul", { cls: "model-weave-summary-list" });
    for (const root of roots) {
      this.renderDomainTreeNode(list, root, new Set<string>());
    }
  }

  private renderDomainTreeNode(
    list: HTMLElement,
    node: DomainTreeNode,
    visited: Set<string>
  ): void {
    const item = list.createEl("li", {
      text: this.getDomainLabel(node.domain)
    });
    if (visited.has(node.domain.id) || node.children.length === 0) {
      return;
    }

    const nextVisited = new Set(visited);
    nextVisited.add(node.domain.id);
    const childList = item.createEl("ul", { cls: "model-weave-summary-list" });
    for (const child of node.children) {
      this.renderDomainTreeNode(childList, child, nextVisited);
    }
  }

  private getDomainLabel(domain: DomainEntry): string {
    const displayName = domain.name || domain.id;
    return domain.kind ? `${displayName} (${domain.kind})` : displayName;
  }

  private getDiagnosticLanguage(): string | undefined {
    return this.viewerPreferences.uiLanguage === "auto"
      ? undefined
      : this.viewerPreferences.uiLanguage;
  }

  private renderDomainMermaidDiagram(
    container: HTMLElement,
    domains: DomainEntry[],
    sourcePanelContainer?: HTMLElement,
    colorScheme?: ResolvedColorScheme,
    graphTitle?: string
  ): void {
    if (domains.length === 0) {
      const section = this.createCollapsibleSection(
        container,
        "domains:diagram",
        this.t("domains.preview.diagram"),
        true
      );
      section.createEl("p", {
        text: this.t("domains.preview.diagramEmpty"),
        cls: "model-weave-summary-muted"
      });
      return;
    }

    const diagramRoot = renderDomainsMermaidDiagram(domains, {
        title: graphTitle ?? this.getDomainDiagramModeLabel(this.domainsDiagramMode),
        mode: this.domainsDiagramMode,
        renderFailedMessage: this.t("domains.preview.diagramRenderFailed"),
        fitVerticalAlign: "top",
        sourcePanelContainer,
        sourcePanelPlacement: sourcePanelContainer ? "prepend" : undefined,
        ...getMermaidSourceLabels(this.t),
        ...getGraphExportLabels(this.t),
        onExportPng: () => this.exportCurrentDiagramAsPngWithNotice(),
        onExportAndOpenPng: () => this.exportCurrentDiagramAsPngAndOpenWithNotice(),
        viewportState: this.domainsMermaidViewportState,
        showMermaidRenderDebug: this.viewerPreferences.showMermaidRenderDebug,
        colorScheme
      });
    ensureGraphIdentityTitle(diagramRoot, graphTitle ?? this.getDomainDiagramModeLabel(this.domainsDiagramMode));
    this.appendDomainDiagramModeSelector(diagramRoot);
    this.appendViewerToolbarControls(diagramRoot);
    container.appendChild(diagramRoot);
  }

  private appendDomainDiagramModeSelector(container: HTMLElement): void {
    const toolbar = container.querySelector<HTMLElement>(".mdspec-zoom-toolbar");
    if (!toolbar) {
      return;
    }

    toolbar.addClass("model-weave-render-mode-toolbar-host");
    toolbar.querySelector(".model-weave-domain-mode-select-group")?.remove();

    const doc = container.ownerDocument;
    const wrapper = doc.createElement("div");
    wrapper.className =
      "model-weave-domain-mode-select-group model-weave-render-mode-row";

    const label = doc.createElement("span");
    label.addClass("model-weave-render-mode-label");
    label.textContent = this.t("domains.preview.viewMode");
    wrapper.appendChild(label);

    const select = doc.createElement("select");
    select.addClass("model-weave-domain-mode-select");
    for (const mode of ["mindmap", "area", "tree"] as const) {
      const option = doc.createElement("option");
      option.value = mode;
      option.textContent = this.getDomainDiagramModeLabel(mode);
      option.selected = this.domainsDiagramMode === mode;
      select.appendChild(option);
    }
    select.addEventListener("change", () => {
      const nextMode = select.value as DomainsMermaidMode;
      if (this.domainsDiagramMode === nextMode) {
        return;
      }
      const shouldRestoreViewOnly =
        this.viewOnlyEnabled &&
        this.viewOnlyTarget?.classList.contains("model-weave-domains-mermaid");
      this.domainsDiagramMode = nextMode;
      if (this.domainsMermaidViewportState.viewMode === "fit") {
        resetGraphViewportState(this.domainsMermaidViewportState);
      }
      this.renderCurrentState();
      this.restoreCurrentScrollPosition();
      if (shouldRestoreViewOnly) {
        const view = this.contentEl.ownerDocument.defaultView;
        view?.requestAnimationFrame(() => {
          view.requestAnimationFrame(() => {
            const nextTarget = this.contentEl.querySelector<HTMLElement>(
              ".model-weave-domains-mermaid"
            );
            if (nextTarget) {
              this.setViewOnlyMode(true, { target: nextTarget });
            }
          });
        });
      }
    });
    wrapper.appendChild(select);
    toolbar.appendChild(wrapper);
  }

  private getDomainDiagramModeLabel(mode: DomainsMermaidMode): string {
    if (mode === "mindmap") {
      return this.t("domains.preview.mindmap");
    }

    if (mode === "tree") {
      return this.t("domains.preview.treeMode");
    }

    return this.t("domains.preview.area");
  }

  private renderSummaryState(
    state: Extract<PreviewState, { mode: "summary" }>
  ): void {
    const hasScreenPreview = (state.layoutBlocks?.length ?? 0) > 0;
    const hasBusinessFlow = (state.businessFlow?.steps.length ?? 0) > 0;

    if (hasScreenPreview || hasBusinessFlow) {
      const shell = this.createViewerSplitShell(`summary:${state.filePath}`, 0.48);
      this.activeScrollContainer = shell.bottomPane;

      if (hasScreenPreview) {
        const screenRoot = createScreenPreviewDiagram(
          buildScreenPreviewData(state, this.t),
          {
            viewportState: this.screenPreviewViewportState,
            onViewportStateChange: this.createScreenPreviewViewportStateHandler(
              state.filePath
            ),
            onNavigateToLocation: state.onNavigateToLocation,
            onOpenLinkedFile: state.onOpenLinkedFile
          }
        );
        ensureGraphIdentityTitle(screenRoot, buildSummaryGraphTitle(state));
        this.appendViewerToolbarControls(screenRoot);
        shell.topPane.appendChild(screenRoot);
      } else if (state.businessFlow) {
        if (this.screenPreviewViewportState.viewMode === "fit") {
          resetGraphViewportState(this.screenPreviewViewportState);
        }
        const businessFlowRoot = renderAppProcessBusinessFlow(state.businessFlow, {
            sourcePanelContainer: shell.bottomPane,
            sourcePanelPlacement: "prepend",
            ...getMermaidSourceLabels(this.t),
            ...getGraphExportLabels(this.t),
            onExportPng: () => this.exportCurrentDiagramAsPngWithNotice(),
            onExportAndOpenPng: () => this.exportCurrentDiagramAsPngAndOpenWithNotice(),
            showMermaidRenderDebug: this.viewerPreferences.showMermaidRenderDebug,
            colorScheme: state.colorScheme,
            viewportState: this.screenPreviewViewportState,
            onViewportStateChange: this.createScreenPreviewViewportStateHandler(
              state.filePath
            )
          });
        ensureGraphIdentityTitle(businessFlowRoot, buildSummaryGraphTitle(state));
        this.appendViewerToolbarControls(businessFlowRoot);
        shell.topPane.appendChild(businessFlowRoot);
        this.renderSummaryDetails(shell.bottomPane, state, {
          suppressBusinessFlowChart: true
        });
        return;
      }

      this.renderSummaryDetails(shell.bottomPane, state, {
        suppressBusinessFlowChart: hasBusinessFlow
      });
      return;
    }

    const wrapper = this.contentEl.createDiv();
    wrapper.addClass("model-weave-summary-section");
    wrapper.addClass("model-weave-summary-details");
    this.activeScrollContainer = wrapper;
    this.renderSummaryDetails(wrapper, state);
  }

  private renderSummaryDetails(
    container: HTMLElement,
    state: Extract<PreviewState, { mode: "summary" }>,
    options: { suppressBusinessFlowChart?: boolean } = {}
  ): void {
    container.addClass("model-weave-summary-details");

    if (state.summaryKind === "screen") {
      this.renderScreenSummaryDetails(container, state);
      return;
    }

    container.createEl("h2", { text: state.title });

    this.renderReviewSummaryPanel(container, {
      model: {
        title: state.title,
        fileType: state.businessFlow ? "app_process" : state.summaryKind,
        id: findSummaryMetadataValue(state, ["id", "model id", "model_id"])
      },
      warnings: state.warnings,
      impactSummary: state.impactSummary,
      sourceLinks: state.sourceLinks,
      weaveMapAvailable: Boolean(state.weaveMapMermaidSource)
    });

    if (state.message) {
      container.createEl("p", {
        text: state.message,
        cls: "model-weave-summary-muted"
      });
    }

    renderDiagnostics(
      container,
      state.warnings,
      undefined,
      this.getCollapsibleOpenState,
      this.setCollapsibleOpenState,
      this.getDiagnosticLanguage()
    );

    if (state.metadata.length > 0) {
      const metadata = container.createDiv({
        cls: "model-weave-preview-section model-weave-summary-metadata"
      });
      metadata.createEl("h3", {
        text: "Overview",
        cls: "model-weave-preview-section-title"
      });
      this.renderDetailCard(metadata, state.metadata);
    }

    this.renderImpactSummarySection(
      container,
      state.impactSummary,
      state.onCopyImpactSummary,
      state.onOpenImpactModel,
      state.weaveMapMermaidSource,
      state.colorScheme
    );

    const sourceLinks = renderSourceLinks(
      state.sourceLinks,
      this.viewerPreferences.localSourceRoot,
      this.viewerPreferences.uiLanguage
    );
    if (sourceLinks) {
      container.appendChild(sourceLinks);
    }

    if (state.appProcessDomainPlacement) {
      this.renderAppProcessDomainPlacementSummary(
        container,
        state.appProcessDomainPlacement
      );
    }

    if (state.counts.length > 0) {
      const counts = container.createDiv({
        cls: "model-weave-preview-section model-weave-summary-counts"
      });
      counts.createEl("h3", {
        text: this.t("summary.counts"),
        cls: "model-weave-preview-section-title"
      });
      const list = counts.createEl("ul", { cls: "model-weave-summary-list" });
      for (const entry of state.counts) {
        list.createEl("li", {
          text: `${this.localizeSummaryCountLabel(entry.label)}: ${entry.value}`
        });
      }
    }

    if (
      !options.suppressBusinessFlowChart &&
      state.businessFlow &&
      state.businessFlow.steps.length > 0
    ) {
      const section = container.createDiv({
        cls: "model-weave-preview-section model-weave-app-process-business-flow-section"
      });
      if (this.screenPreviewViewportState.viewMode === "fit") {
        resetGraphViewportState(this.screenPreviewViewportState);
      }
      const businessFlowRoot = renderAppProcessBusinessFlow(state.businessFlow, {
          viewportState: this.screenPreviewViewportState,
          colorScheme: state.colorScheme,
          ...getGraphExportLabels(this.t),
          onExportPng: () => this.exportCurrentDiagramAsPngWithNotice(),
          onExportAndOpenPng: () => this.exportCurrentDiagramAsPngAndOpenWithNotice(),
          onViewportStateChange: this.createScreenPreviewViewportStateHandler(
            state.filePath
          )
        });
      ensureGraphIdentityTitle(businessFlowRoot, buildSummaryGraphTitle(state));
      this.appendViewerToolbarControls(businessFlowRoot);
      section.appendChild(businessFlowRoot);
    }

    if (state.sections.length > 0) {
      const sections = this.createCollapsibleSection(
        container,
        "detectedSections",
        this.t("summary.detectedSections"),
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
        this.localizeSummarySectionTitle(textSection.title),
        true
      );

      const markdown = textSection.lines.join("\n").trim();
      if (!markdown) {
        continue;
      }
      const markdownContainer = section.createDiv({
        cls: "model-weave-summary-markdown"
      });
      void MarkdownRenderer.render(
        this.app,
        markdown,
        markdownContainer,
        state.filePath,
        this
      );
    }

    for (const table of state.tables ?? []) {
      this.renderSummaryTable(container, state, table, true);
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

    if (state.businessFlow && state.businessFlow.steps.length > 0) {
      this.renderAppliedColorScheme(
        container,
        state.colorScheme,
        this.getImpactColorSchemeTargets(
          getAppProcessBusinessFlowColorSchemeTargets(state.businessFlow),
          state.impactSummary
        )
      );
    }
  }

  private renderScreenSummaryDetails(
    container: HTMLElement,
    state: Extract<PreviewState, { mode: "summary" }>
  ): void {
    container.createEl("h2", { text: state.title });

    this.renderReviewSummaryPanel(container, {
      model: {
        title: state.title,
        fileType: "screen",
        id: findSummaryMetadataValue(state, ["id", "model id", "model_id"])
      },
      warnings: state.warnings,
      impactSummary: state.impactSummary,
      sourceLinks: state.sourceLinks,
      weaveMapAvailable: Boolean(state.weaveMapMermaidSource)
    });

    renderDiagnostics(
      container,
      state.warnings,
      undefined,
      this.getCollapsibleOpenState,
      this.setCollapsibleOpenState,
      this.getDiagnosticLanguage()
    );

    if (state.metadata.length > 0) {
      const overview = container.createDiv({
        cls: "model-weave-preview-section model-weave-screen-preview-section-overview"
      });
      overview.createEl("h3", {
        text: "Screen overview",
        cls: "model-weave-preview-section-title"
      });
      this.renderDetailCard(overview, state.metadata);
    }

    this.renderImpactSummarySection(
      container,
      state.impactSummary,
      state.onCopyImpactSummary,
      state.onOpenImpactModel,
      state.weaveMapMermaidSource,
      state.colorScheme
    );

    const sourceLinks = renderSourceLinks(
      state.sourceLinks,
      this.viewerPreferences.localSourceRoot,
      this.viewerPreferences.uiLanguage
    );
    if (sourceLinks) {
      container.appendChild(sourceLinks);
    }

    if (state.counts.length > 0) {
      const counts = container.createDiv({
        cls: "model-weave-preview-section model-weave-screen-preview-section-counts"
      });
      counts.createEl("h3", {
        text: this.t("summary.counts"),
        cls: "model-weave-preview-section-title"
      });
      const list = counts.createEl("ul", { cls: "model-weave-summary-list" });
      for (const entry of state.counts) {
        list.createEl("li", {
          text: `${this.localizeSummaryCountLabel(entry.label)}: ${entry.value}`
        });
      }
    }

    const tablesByTitle = new Map((state.tables ?? []).map((table) => [table.title, table]));
    this.renderSummaryTable(container, state, tablesByTitle.get("Structure / Layout"), true);
    this.renderSummaryTable(container, state, tablesByTitle.get("UI Elements / Fields"), true);
    this.renderSummaryTable(container, state, tablesByTitle.get("Behavior / Actions"), true);

    if ((state.localProcesses?.length ?? 0) > 0) {
      this.renderSummaryNavigationList(
        container,
        state,
        "Local processes",
        state.localProcesses ?? [],
        true
      );
    }

    const navigationLists = new Map(
      (state.navigationLists ?? []).map((navigationList) => [
        navigationList.title,
        navigationList.items
      ])
    );
    this.renderSummaryNavigationList(
      container,
      state,
      "Invoked processes",
      navigationLists.get("Invoked processes") ?? [],
      true
    );
    this.renderScreenTransitionSummary(container, state);
    this.renderSummaryNavigationList(
      container,
      state,
      "Transitions / Outgoing screens",
      navigationLists.get("Transitions / Outgoing screens") ?? [],
      true
    );
    this.renderSummaryTable(container, state, tablesByTitle.get("Messages"), true);

    if (state.sections.length > 0) {
      const sections = this.createCollapsibleSection(
        container,
        "detectedSections",
        this.t("summary.detectedSections"),
        false
      );
      const list = sections.createEl("ul", { cls: "model-weave-summary-list" });
      for (const section of state.sections) {
        const item = list.createEl("li", {
          text: this.localizeDetectedSectionLabel(section.label)
        });
        this.bindLocationNavigation(item, state.onNavigateToLocation, section);
      }
    }
  }

  private renderSummaryTable(
    container: HTMLElement,
    state: Extract<PreviewState, { mode: "summary" }>,
    table:
      | {
          title: string;
          columns: string[];
          rows: Array<{ cells: string[]; line?: number; ch?: number }>;
        }
      | undefined,
    defaultOpen: boolean
  ): void {
    if (!table) {
      return;
    }

    const section = this.createCollapsibleSection(
      container,
      `summary:${table.title}`,
      this.localizeSummarySectionTitle(table.title),
      defaultOpen
    );

    section.addClass("model-weave-table-wrap");
    const tableEl = section.createEl("table", {
      cls: "model-weave-summary-table model-weave-data-table"
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
    if (table.rows.length === 0) {
      const emptyRow = tbody.createEl("tr");
      emptyRow.createEl("td", {
        text: this.t("summary.noRows"),
        cls: "model-weave-summary-td model-weave-summary-empty-cell",
        attr: { colspan: `${Math.max(1, table.columns.length)}` }
      });
      return;
    }

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

  private renderDetailCard(
    container: HTMLElement,
    entries: Array<{ label: string; value: string }>
  ): void {
    const card = container.createDiv({ cls: "model-weave-detail-card" });
    for (const entry of entries) {
      const row = card.createDiv({ cls: "model-weave-detail-card-row" });
      row.createDiv({
        text: entry.label,
        cls: "model-weave-detail-card-label"
      });
      row.createDiv({
        text: entry.value,
        cls: "model-weave-detail-card-value"
      });
    }
  }

  private localizeSummaryCountLabel(label: string): string {
    const keyByLabel: Record<string, string> = {
      Triggers: "summary.count.triggers",
      Inputs: "summary.count.inputs",
      Outputs: "summary.count.outputs",
      Transitions: "summary.count.transitions",
      Steps: "summary.count.steps",
      Flows: "summary.count.flows",
      Domains: "summary.count.domains",
      "Domain Sources": "summary.count.domainSources",
      Layouts: "summary.count.layouts",
      Fields: "summary.count.fields",
      Actions: "summary.count.actions",
      Messages: "summary.count.messages",
      "Local processes": "summary.count.localProcesses",
      "Local Processes": "summary.count.localProcesses",
      "Invoked processes": "summary.count.invokedProcesses",
      "Invoked Processes": "summary.count.invokedProcesses",
      "Outgoing screens": "summary.count.outgoingScreens"
    };
    const key = keyByLabel[label];
    return key ? this.t(key) : label;
  }

  private localizeSummarySectionTitle(title: string): string {
    const keyByTitle: Record<string, string> = {
      Summary: "summary.section.summary",
      "Domain Sources Summary": "summary.section.domainSourcesSummary",
      "Domains Summary": "summary.section.domainsSummary",
      "Triggers Summary": "summary.section.triggersSummary",
      "Inputs Summary": "summary.section.inputsSummary",
      "Outputs Summary": "summary.section.outputsSummary",
      "Steps Summary": "summary.section.stepsSummary",
      "Flows Summary": "summary.section.flowsSummary",
      "Transitions Summary": "summary.section.transitionsSummary",
      "Structure / Layout": "summary.section.structureLayout",
      "UI Elements / Fields": "summary.section.uiElementsFields",
      "Behavior / Actions": "summary.section.behaviorActions",
      "Local processes": "summary.section.localProcesses",
      "Local Processes": "summary.section.localProcesses",
      "Invoked processes": "summary.section.invokedProcesses",
      "Invoked Processes": "summary.section.invokedProcesses",
      "Transitions / Outgoing screens": "summary.section.transitionsOutgoingScreens",
      "Transitions / Outgoing Screens": "summary.section.transitionsOutgoingScreens",
      "Transitions (legacy)": "summary.section.transitionsLegacy",
      Layout: "summary.section.layout",
      Fields: "summary.section.fields",
      Actions: "summary.section.actions",
      Messages: "summary.section.messages",
      Notes: "summary.section.notes"
    };
    const key = keyByTitle[title];
    return key ? this.t(key) : title;
  }

  private localizeDetectedSectionLabel(label: string): string {
    const countMatch = label.match(/^(.+):\s+(\d+)\s+(rows|headings)$/);
    if (countMatch) {
      const [, rawName, rawCount, rawUnit] = countMatch;
      const localizedName = this.localizeSummarySectionTitle(rawName);
      const unitKey =
        rawUnit === "headings" ? "summary.unit.headings" : "summary.unit.rows";
      return `${localizedName}: ${this.t(unitKey, { count: Number(rawCount) })}`;
    }
    const legacyMatch = label.match(/^Transitions \(legacy\):\s+(\d+)\s+rows$/);
    if (legacyMatch) {
      return `${this.localizeSummarySectionTitle("Transitions (legacy)")}: ${this.t("summary.unit.rows", { count: Number(legacyMatch[1]) })}`;
    }
    return this.localizeSummarySectionTitle(label);
  }

  private renderSummaryNavigationList(
    container: HTMLElement,
    state: Extract<PreviewState, { mode: "summary" }>,
    title: string,
    items: Array<{ label: string; line?: number; ch?: number }>,
    defaultOpen: boolean
  ): void {
    if (items.length === 0) {
      return;
    }

    const section = this.createCollapsibleSection(
      container,
      `navigation:${title}`,
      this.localizeSummarySectionTitle(title),
      defaultOpen
    );
    const list = section.createEl("ul", { cls: "model-weave-summary-list" });
    for (const itemInfo of items) {
      const item = list.createEl("li", { text: itemInfo.label });
      this.bindLocationNavigation(item, state.onNavigateToLocation, itemInfo);
    }
  }

  private renderScreenTransitionSummary(
    container: HTMLElement,
    state: Extract<PreviewState, { mode: "summary" }>
  ): void {
    const transitions = state.screenPreviewTransitions ?? [];
    if (transitions.length === 0) {
      return;
    }

    const section = this.createCollapsibleSection(
      container,
      "screenTransitionStatus",
      "Transition target status",
      true
    );
    const list = section.createEl("ul", { cls: "model-weave-summary-list" });
    for (const transition of transitions) {
      const status = transition.selfTarget
        ? "self"
        : transition.unresolved
          ? "unresolved"
          : "resolved";
      const item = list.createEl("li", {
        text: `${transition.targetLabel}: ${status} (${transition.actions.length} action${transition.actions.length === 1 ? "" : "s"})`
      });
      item.title = transition.targetTitle ?? transition.targetLabel;
      const firstAction = transition.actions.find(
        (action) => typeof action.line === "number"
      );
      this.bindLocationNavigation(item, state.onNavigateToLocation, firstAction ?? {});
    }
  }


  private renderReviewSummaryPanel(
    container: HTMLElement,
    options: {
      model: unknown;
      warnings: ValidationWarning[];
      impactSummary?: ImpactSummary;
      sourceLinks?: SourceLink[];
      weaveMapAvailable?: boolean;
    }
  ): void {
    const errors = options.warnings.filter((warning) => warning.severity === "error").length;
    const warnings = options.warnings.filter((warning) => warning.severity === "warning").length;
    const notes = options.warnings.filter((warning) => warning.severity === "info").length;
    const modelName = getModelDisplayName(options.model);
    const modelId = getModelId(options.model);
    const modelType = getModelType(options.model);
    const sourceLinkCount = options.impactSummary?.relatedSourceLinks.length ?? options.sourceLinks?.length ?? 0;

    const section = container.createDiv({
      cls: "model-weave-preview-section model-weave-review-summary"
    });
    section.createEl("h3", {
      text: this.t("review.summary.title"),
      cls: "model-weave-preview-section-title"
    });

    const chips = section.createDiv({ cls: "model-weave-review-summary-chips" });
    const addChip = (label: string, value: string | number, modifier?: string): void => {
      const chip = chips.createDiv({ cls: "model-weave-review-summary-chip" });
      if (modifier) {
        chip.addClass(`model-weave-review-summary-chip-${modifier}`);
      }
      chip.createSpan({ text: label, cls: "model-weave-review-summary-chip-label" });
      chip.createSpan({ text: String(value), cls: "model-weave-review-summary-chip-value" });
    };

    if (modelName) {
      addChip(this.t("review.summary.model"), modelName);
    }
    if (modelType) {
      addChip(this.t("review.summary.modelType"), modelType);
    }
    if (modelId && modelId !== modelName) {
      addChip(this.t("review.summary.modelId"), modelId);
    }
    addChip(this.t("review.summary.errors"), errors, errors > 0 ? "error" : undefined);
    addChip(this.t("review.summary.warnings"), warnings, warnings > 0 ? "warning" : undefined);
    addChip(this.t("review.summary.notes"), notes);

    if (options.impactSummary) {
      addChip(this.t("review.summary.incoming"), options.impactSummary.inboundRelationships.length);
      addChip(this.t("review.summary.outgoing"), options.impactSummary.outboundRelationships.length);
      addChip(
        this.t("review.summary.unresolved"),
        options.impactSummary.unresolvedOutbound.length,
        options.impactSummary.unresolvedOutbound.length > 0 ? "warning" : undefined
      );
    }

    addChip(this.t("review.summary.sourceLinks"), sourceLinkCount);
    addChip(
      this.t("review.summary.weaveMap"),
      options.weaveMapAvailable
        ? this.t("review.summary.available")
        : this.t("review.summary.notAvailable"),
      options.weaveMapAvailable ? "available" : undefined
    );
  }

  private renderImpactSummarySection(
    container: HTMLElement,
    summary: ImpactSummary | undefined,
    onCopyImpactSummary: (() => void) | null | undefined,
    onOpenImpactModel?:
      | ((filePath: string, navigation?: { openInNewLeaf?: boolean }) => void)
      | null,
    weaveMapMermaidSource?: string,
    colorScheme?: ResolvedColorScheme
  ): void {
    if (!summary) {
      return;
    }

    const section = container.createDiv({
      cls: "model-weave-preview-section model-weave-impact-summary"
    });
    const header = section.createDiv({ cls: "model-weave-impact-summary-header" });
    header.createEl("h3", {
      text: this.t("relationship.title"),
      cls: "model-weave-preview-section-title"
    });
    if (onCopyImpactSummary) {
      const copyButton = header.createEl("button", {
        text: this.t("relationship.copySummary"),
        cls: "mod-cta model-weave-impact-copy-button"
      });
      copyButton.type = "button";
      copyButton.addEventListener("click", (event) => {
        event.preventDefault();
        onCopyImpactSummary();
      });
    }

    this.renderImpactOverviewCards(section, summary);

    this.renderWeaveMapBlock(section, summary, weaveMapMermaidSource, colorScheme);

    renderUsageViewSections(
      section,
      this.createImpactUsageSections(summary),
      this.createUsageViewRendererOptions(onOpenImpactModel)
    );
    if (summary.modelType === "codeset") {
      renderUsageViewSections(
        section,
        [this.createImpactValueUsageSection(summary)],
        this.createUsageViewRendererOptions()
      );
    }
    renderUsageDetailSection(
      section,
      "impactUnresolved",
      this.t("relationship.unresolvedReferences"),
      this.t("relationship.noUnresolved"),
      summary.unresolvedOutbound.map((reference) =>
        this.createImpactUnresolvedDetail(reference)
      ),
      this.createUsageViewRendererOptions()
    );
    renderGroupedSourceLinkSection(
      section,
      "impactSourceLinks",
      this.t("relationship.relatedSourceLinks"),
      this.t("relationship.noRelatedSourceLinks"),
      summary.relatedSourceLinks.map((sourceLink) =>
        this.createGroupedSourceLink(sourceLink)
      ),
      this.createUsageViewRendererOptions()
    );
  }


  private renderImpactOverviewCards(container: HTMLElement, summary: ImpactSummary): void {
    const cards = container.createDiv({ cls: "model-weave-impact-overview-cards" });
    const addCard = (
      label: string,
      value: number,
      description: string,
      modifier?: string
    ): void => {
      const card = cards.createDiv({ cls: "model-weave-impact-overview-card" });
      if (modifier) {
        card.addClass(`model-weave-impact-overview-card-${modifier}`);
      }
      card.createDiv({ text: label, cls: "model-weave-impact-overview-card-label" });
      card.createDiv({ text: String(value), cls: "model-weave-impact-overview-card-value" });
      card.createDiv({ text: description, cls: "model-weave-impact-overview-card-description" });
    };

    addCard(
      this.t("relationship.overview.outgoing"),
      summary.outboundRelationships.length,
      this.t("relationship.referencesFromThisObject")
    );
    addCard(
      this.t("relationship.overview.incoming"),
      summary.inboundRelationships.length,
      this.t("relationship.referencedByThisObject")
    );
    addCard(
      this.t("relationship.overview.unresolved"),
      summary.unresolvedOutbound.length,
      this.t("relationship.unresolvedReferences"),
      summary.unresolvedOutbound.length > 0 ? "warning" : undefined
    );
    addCard(
      this.t("relationship.overview.sourceLinks"),
      summary.relatedSourceLinks.length,
      this.t("relationship.relatedSourceLinks")
    );
    if (summary.modelType === "codeset") {
      addCard(
        this.t("relationship.overview.valueUsage"),
        summary.valueUsages.length,
        this.t("relationship.valueUsage")
      );
    }
  }

  private renderWeaveMapBlock(
    container: HTMLElement,
    summary: ImpactSummary,
    initialMermaidSource: string | undefined,
    colorScheme: ResolvedColorScheme | undefined
  ): void {
    let sourceLinkMode: WeaveMapSourceLinkMode = "compact";
    let source = (
      this.buildWeaveMapMermaidSource(summary, sourceLinkMode, colorScheme) ??
      initialMermaidSource
    )?.trim();
    if (!source) {
      return;
    }

    const details = container.createEl("details", {
      cls: "model-weave-preview-section model-weave-impact-weave-map"
    });
    details.open = this.getCollapsibleOpenState("impactWeaveMap", false);
    details.addEventListener("toggle", () => {
      this.setCollapsibleOpenState("impactWeaveMap", details.open);
      if (details.open) {
        renderWeaveMap();
      }
    });
    details.createEl("summary", {
      text: `${this.t("relationship.weaveMap.title")} — ${summary.modelId || summary.modelLabel}`,
      cls: "model-weave-summary-heading model-weave-preview-section-title"
    });
    const section = details.createDiv({ cls: "model-weave-impact-weave-map-content" });
    section.createEl("p", {
      text: this.t("relationship.weaveMap.description"),
      cls: "model-weave-muted"
    });
    const modeSelector = section.createDiv({
      cls: "model-weave-render-mode-toolbar-host model-weave-impact-weave-map-mode"
    });
    modeSelector.createEl("span", {
      text: this.t("relationship.weaveMap.viewMode"),
      cls: "model-weave-summary-muted"
    });
    const modeButtons = new Map<WeaveMapSourceLinkMode, HTMLButtonElement>();
    const updateModeButtons = (): void => {
      for (const [mode, button] of modeButtons) {
        button.setAttribute("aria-pressed", String(sourceLinkMode === mode));
        button.toggleClass("is-active", sourceLinkMode === mode);
      }
    };
    const renderCurrentMode = (): void => {
      source = this.buildWeaveMapMermaidSource(summary, sourceLinkMode, colorScheme)?.trim();
      if (!source) {
        renderContainer.empty();
        sourcePanelContainer.empty();
        return;
      }
      rendered = false;
      rendering = false;
      renderContainer.empty();
      sourcePanelContainer.empty();
      renderWeaveMap();
    };
    for (const mode of ["compact", "full"] as const) {
      const button = modeSelector.createEl("button", {
        text: mode === "compact"
          ? this.t("relationship.weaveMap.compact")
          : this.t("relationship.weaveMap.full"),
        cls: "model-weave-secondary-button"
      });
      button.type = "button";
      modeButtons.set(mode, button);
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (sourceLinkMode === mode) {
          return;
        }
        sourceLinkMode = mode;
        updateModeButtons();
        renderCurrentMode();
      });
    }
    updateModeButtons();
    const renderContainer = section.createDiv({
      cls: "model-weave-impact-weave-map-body"
    });
    renderContainer.setCssStyles({
      height: "420px",
      minHeight: "360px",
      display: "flex",
      flexDirection: "column",
      position: "relative",
      overflow: "hidden"
    });
    const sourcePanelContainer = section.createDiv({
      cls: "model-weave-impact-weave-map-source"
    });

    let rendered = false;
    let rendering = false;
    const renderWeaveMap = (): void => {
      const currentSource = source;
      if (!currentSource || rendered || rendering) {
        return;
      }
      rendering = true;
      renderContainer.empty();
      const shell = createMermaidShell({
        className: "model-weave-impact-weave-map-render",
        title: buildWeaveMapGraphTitle(this.t, summary),
        ...getGraphExportLabels(this.t),
        onExportPng: () => this.exportWeaveMapAsPng(renderContainer, summary.modelPath),
        onExportAndOpenPng: () =>
          this.exportWeaveMapAsPngAndOpen(renderContainer, summary.modelPath)
      });
      shell.root.setCssStyles({
        flex: "1 1 auto",
        minHeight: "0",
        width: "100%",
        height: "100%"
      });
      shell.canvas.setCssStyles({
        minHeight: "0"
      });
      this.appendViewerToolbarControls(shell.root, shell.root);
      renderContainer.appendChild(shell.root);
      sourcePanelContainer.empty();
      void this.renderWeaveMapMermaid(shell, currentSource, sourcePanelContainer).then(
        () => {
          rendered = true;
          rendering = false;
        },
        () => {
          rendering = false;
        }
      );
    };
    if (details.open) {
      renderWeaveMap();
    }
  }

  private buildWeaveMapMermaidSource(
    summary: ImpactSummary,
    sourceLinkMode: WeaveMapSourceLinkMode,
    colorScheme: ResolvedColorScheme | undefined
  ): string | undefined {
    try {
      return buildWeaveMapMermaidSource(
        buildWeaveMapModel(summary, { sourceLinkMode }),
        { colorScheme }
      );
    } catch {
      return undefined;
    }
  }

  private async renderWeaveMapMermaid(
    shell: MermaidShellElements,
    source: string,
    container: HTMLElement
  ): Promise<void> {
    try {
      await this.waitForWeaveMapContainerReady(shell.root);
      await renderMermaidSourceIntoShell(shell, {
        source,
        renderIdPrefix: "model_weave_impact_weave_map",
        fitVerticalAlign: "top",
        sourcePanelContainer: container,
        sourcePanelPlacement: "append",
        ...getMermaidSourceLabels(this.t),
        showRenderDebug: this.viewerPreferences.showMermaidRenderDebug
      });
      await this.waitForWeaveMapSvgReady(shell.surface);
      await this.waitForNextAnimationFrame(shell.root);
      await this.waitForNextAnimationFrame(shell.root);
      shell.toolbar?.fitButton.click();
    } catch (error) {
      shell.root.addClass("model-weave-mermaid-fallback-shell");
      shell.surface.empty();
      shell.surface.createEl("p", {
        text: error instanceof Error ? error.message : String(error),
        cls: "model-weave-muted"
      });
      throw error;
    }
  }

  private async waitForWeaveMapSvgReady(surface: HTMLElement): Promise<void> {
    for (let index = 0; index < 6; index += 1) {
      await this.waitForNextAnimationFrame(surface);
      const svg = surface.querySelector("svg");
      if (!svg) {
        continue;
      }

      const rect = svg.getBoundingClientRect();
      const width = Number(svg.getAttribute("width") ?? 0);
      const height = Number(svg.getAttribute("height") ?? 0);
      const hasMeasuredSize =
        (Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0) ||
        (rect.width > 0 && rect.height > 0);
      if (hasMeasuredSize) {
        return;
      }
    }

    const svg = surface.querySelector("svg");
    if (!svg) {
      throw new Error("Mermaid SVG was not rendered.");
    }
    throw new Error("Mermaid SVG size could not be measured.");
  }

  private async waitForWeaveMapContainerReady(element: HTMLElement): Promise<void> {
    for (let index = 0; index < 6; index += 1) {
      await this.waitForNextAnimationFrame(element);
      const rect = element.getBoundingClientRect();
      if (element.isConnected && rect.width > 0 && rect.height > 0) {
        return;
      }
    }
  }

  private waitForNextAnimationFrame(element: HTMLElement): Promise<void> {
    const view = element.ownerDocument.defaultView;
    return new Promise((resolve) => {
      if (view?.requestAnimationFrame) {
        view.requestAnimationFrame(() => resolve());
        return;
      }
      globalThis.setTimeout(resolve, 0);
    });
  }

  private createImpactValueUsageSection(summary: ImpactSummary): UsageViewSection {
    return {
      id: "impactValueUsage",
      title: this.t("relationship.valueUsage"),
      emptyText: this.t("relationship.noValueUsage"),
      items: summary.valueUsages.map((valueUsage) => {
        const usageCount = valueUsage.relationships.reduce(
          (total, relationship) => total + relationship.usageCount,
          0
        );
        return {
          label: valueUsage.member,
          usageCount,
          summaryText: `${valueUsage.member} (${this.formatLocalizedCount(usageCount, "relationship.usage.one", "relationship.usage.other")})`,
          details: valueUsage.relationships.flatMap((relationship) =>
            relationship.usages.map((usage) =>
              this.createImpactValueUsageDetail(relationship, usage)
            )
          ),
          sourceLinks: []
        };
      })
    };
  }

  private createImpactUsageSections(summary: ImpactSummary): UsageViewSection[] {
    return [
      {
        id: "impactOutbound",
        title: this.t("relationship.referencesFromThisObject"),
        emptyText: this.t("relationship.noOutbound"),
        items: summary.outboundRelationships.map((relationship) => ({
          label: relationship.modelLabel,
          type: relationship.modelType,
          path: relationship.modelPath,
          usageCount: relationship.usageCount,
          openTargetPath: relationship.modelPath,
          details: relationship.usages.map((usage) =>
            this.createImpactRelationshipDetail(usage)
          ),
          sourceLinks: relationship.sourceLinks.map((sourceLink) =>
            this.createGroupedSourceLink(sourceLink)
          )
        }))
      },
      {
        id: "impactInbound",
        title: this.t("relationship.referencedByThisObject"),
        emptyText: this.t("relationship.noInbound"),
        items: summary.inboundRelationships.map((relationship) => ({
          label: relationship.modelLabel,
          type: relationship.modelType,
          path: relationship.modelPath,
          usageCount: relationship.usageCount,
          openTargetPath: relationship.modelPath,
          details: relationship.usages.map((usage) =>
            this.createImpactRelationshipDetail(usage)
          ),
          sourceLinks: relationship.sourceLinks.map((sourceLink) =>
            this.createGroupedSourceLink(sourceLink)
          )
        }))
      }
    ];
  }

  private createImpactRelationshipDetail(reference: ImpactReference): UsageViewDetail {
    const location = [reference.section, reference.field].filter(Boolean).join(".");
    return {
      label: `${location ? `${location}: ` : ""}${reference.targetRaw}`,
      meta: [reference.relationKind, reference.sourceContext]
        .filter(Boolean)
        .join("; "),
      notes: reference.notes,
      title: reference.notes ?? reference.targetPath ?? reference.targetRaw
    };
  }

  private createImpactValueUsageDetail(
    relationship: ImpactSummary["inboundRelationships"][number],
    reference: ImpactReference
  ): UsageViewDetail {
    const location = [reference.section, reference.field].filter(Boolean).join(".");
    const meta = [relationship.modelType, location, reference.sourceContext]
      .filter(Boolean)
      .join("; ");
    const label = `${relationship.modelLabel}${meta ? ` (${meta})` : ""}`;
    return {
      label,
      notes: reference.notes,
      title: reference.notes ?? reference.sourcePath
    };
  }

  private createImpactUnresolvedDetail(reference: ImpactReference): UsageViewDetail {
    const location = [reference.section, reference.field].filter(Boolean).join(".");
    const meta = [reference.relationKind, location || null].filter(Boolean).join("; ");
    return {
      label: reference.targetRaw,
      meta,
      notes: reference.notes,
      title: reference.notes ?? reference.targetRaw
    };
  }

  private createGroupedSourceLink(sourceLink: ImpactSourceLink): GroupedSourceLink {
    return {
      relationKind: sourceLink.relationKind,
      ownerLabel: sourceLink.ownerLabel,
      ownerPath: sourceLink.ownerPath,
      path: sourceLink.path,
      notes: sourceLink.notes,
      ...(sourceLink.label ? { label: sourceLink.label } : {})
    };
  }

  private createUsageViewRendererOptions(
    onOpenImpactModel?:
      | ((filePath: string, navigation?: { openInNewLeaf?: boolean }) => void)
      | null
  ) {
    return {
      openLabel: this.t("relationship.open"),
      sourceLinkLabel: this.t("relationship.sourceLink"),
      formatUsageCount: (count: number) =>
        this.formatLocalizedCount(
          count,
          "relationship.usage.one",
          "relationship.usage.other"
        ),
      formatNoteCount: (count: number) =>
        this.formatLocalizedCount(
          count,
          "relationship.note.one",
          "relationship.note.other"
        ),
      getOpenState: this.getCollapsibleOpenState,
      setOpenState: this.setCollapsibleOpenState,
      onOpenItem: onOpenImpactModel ?? undefined
    };
  }

  private createCollapsibleSection(
    container: HTMLElement,
    key: string,
    title: string,
    defaultOpen: boolean
  ): HTMLElement {
    const details = container.createEl("details");
    details.addClass("model-weave-preview-section");
    details.open = this.getCollapsibleOpenState(key, defaultOpen);
    details.addEventListener("toggle", () => {
      this.setCollapsibleOpenState(key, details.open);
    });

    const summary = details.createEl("summary", { text: title });
    summary.addClass("model-weave-summary-heading");
    summary.addClass("model-weave-preview-section-title");

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

  private formatLocalizedCount(
    count: number,
    singularKey: string,
    pluralKey: string
  ): string {
    const key = count === 1 ? singularKey : pluralKey;
    return `${count} ${this.t(key)}`;
  }

  private resetImpactCollapsibleState(): void {
    for (const key of [...this.collapsibleState.keys()]) {
      if (key.startsWith("impact")) {
        this.collapsibleState.delete(key);
      }
    }
  }

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
    this.renderReviewSummaryPanel(shell.bottomPane, {
      model: state.model,
      warnings: state.warnings,
      impactSummary: state.impactSummary,
      sourceLinks: state.model.sourceLinks,
      weaveMapAvailable: Boolean(state.weaveMapMermaidSource)
    });
      renderDiagnostics(
        shell.bottomPane,
      state.warnings,
      state.onOpenDiagnostic ?? undefined,
      this.getCollapsibleOpenState,
      this.setCollapsibleOpenState,
      this.getDiagnosticLanguage()
    );
    shell.bottomPane.appendChild(
      renderObjectModel(
        state.model,
        undefined,
        this.viewerPreferences.localSourceRoot,
        this.viewerPreferences.uiLanguage
      )
    );
    this.renderImpactSummarySection(
      shell.bottomPane,
      state.impactSummary,
      state.onCopyImpactSummary,
      state.onOpenImpactModel,
      state.weaveMapMermaidSource,
      state.colorScheme
    );

      const diagramRoot = renderDiagramModel(state.diagram, {
        hideTitle: true,
        hideDetails: false,
        fitVerticalAlign: "top",
        onOpenObject: state.onOpenObject ?? undefined,
        viewportState: this.objectGraphViewportState,
        onViewportStateChange: this.createObjectViewportStateHandler(state.model.path),
        sourcePanelContainer: shell.bottomPane,
        sourcePanelPlacement: "prepend",
        ...getMermaidSourceLabels(this.t),
        ...getGraphExportLabels(this.t),
        onExportPng: () => this.exportCurrentDiagramAsPngWithNotice(),
        onExportAndOpenPng: () => this.exportCurrentDiagramAsPngAndOpenWithNotice(),
        ...getClassDetailLabels(this.t),
        showMermaidRenderDebug: this.viewerPreferences.showMermaidRenderDebug
      });
    ensureGraphIdentityTitle(diagramRoot, buildGraphIdentityTitle(state.model));
    this.appendViewerToolbarControls(diagramRoot);
    this.moveDetailSections(diagramRoot, shell.bottomPane);
    shell.topPane.appendChild(diagramRoot);
  }

  private renderDiagramState(state: Extract<PreviewState, { mode: "diagram" }>): void {
    const filePath = state.diagram.diagram.path;
    const shell = this.createViewerSplitShell(`diagram:${filePath}`, 0.64);
    shell.bottomPane.addClass("model-weave-collection-diagram-lower-pane");
    const lowerSlots = this.createCollectionDiagramLowerPaneSlots(shell.bottomPane);
    this.activeScrollContainer = shell.bottomPane;
    this.renderReviewSummaryPanel(lowerSlots.review, {
      model: state.diagram.diagram,
      warnings: state.warnings,
      impactSummary: state.impactSummary,
      sourceLinks: state.diagram.diagram.sourceLinks,
      weaveMapAvailable: Boolean(state.weaveMapMermaidSource)
    });
      renderDiagnostics(
        lowerSlots.diagnostics,
      state.warnings,
      state.onOpenDiagnostic ?? undefined,
      this.getCollapsibleOpenState,
      this.setCollapsibleOpenState,
      this.getDiagnosticLanguage()
    );

      const diagramRoot = renderDiagramModel(state.diagram, {
        onOpenObject: state.onOpenObject ?? undefined,
        renderMode: getStandardRenderMode(state.rendererSelection),
        colorScheme: state.colorScheme,
        viewportState: this.diagramViewportState,
        onViewportStateChange: this.createDiagramViewportStateHandler(filePath),
        sourcePanelContainer: lowerSlots.source,
        ...getMermaidSourceLabels(this.t),
        ...getGraphExportLabels(this.t),
        onExportPng: () => this.exportCurrentDiagramAsPngWithNotice(),
        onExportAndOpenPng: () => this.exportCurrentDiagramAsPngAndOpenWithNotice(),
        ...getDfdDetailLabels(this.t),
        ...getClassDetailLabels(this.t),
        showMermaidRenderDebug: this.viewerPreferences.showMermaidRenderDebug
      });
      ensureGraphIdentityTitle(diagramRoot, buildGraphIdentityTitle(state.diagram.diagram));
      this.appendRendererSelection(diagramRoot, state.rendererSelection);
      this.appendViewerToolbarControls(diagramRoot);
      this.moveDetailSections(diagramRoot, lowerSlots.details);
      this.renderImpactSummarySection(
        lowerSlots.impact,
        state.impactSummary,
        state.onCopyImpactSummary,
        state.onOpenImpactModel,
        state.weaveMapMermaidSource,
        state.colorScheme
      );
      this.renderAppliedColorScheme(
        lowerSlots.impact,
        state.colorScheme,
        this.getImpactColorSchemeTargets(
          this.getDiagramColorSchemeTargets(state.diagram),
          state.impactSummary
        )
      );
      shell.topPane.appendChild(diagramRoot);
  }

  private getDiagramColorSchemeTargets(diagram: ResolvedDiagram): string[] {
    if (this.isDfdDiagramModel(diagram.diagram)) {
      return (diagram.diagram.domains?.length ?? 0) > 0
        ? ["dfd", "domain"]
        : ["dfd"];
    }

    return [];
  }

  private getImpactColorSchemeTargets(
    baseTargets: string[],
    impactSummary: ImpactSummary | undefined
  ): string[] {
    return impactSummary ? [...baseTargets, "weave_map"] : baseTargets;
  }

  private isDfdDiagramModel(diagram: ResolvedDiagram["diagram"]): diagram is DfdDiagramModel {
    return diagram.schema === "dfd_diagram";
  }

  private createCollectionDiagramLowerPaneSlots(container: HTMLElement): {
    review: HTMLElement;
    diagnostics: HTMLElement;
    impact: HTMLElement;
    details: HTMLElement;
    source: HTMLElement;
  } {
    const review = container.createDiv({
      cls: "model-weave-lower-pane-slot model-weave-lower-pane-review-slot"
    });
    const diagnostics = container.createDiv({
      cls: "model-weave-lower-pane-slot model-weave-lower-pane-diagnostics-slot"
    });
    const impact = container.createDiv({
      cls: "model-weave-lower-pane-slot model-weave-lower-pane-impact-slot"
    });
    const details = container.createDiv({
      cls: "model-weave-lower-pane-slot model-weave-lower-pane-details-slot"
    });
    const source = container.createDiv({
      cls: "model-weave-lower-pane-slot model-weave-lower-pane-source-slot"
    });
    return { review, diagnostics, impact, details, source };
  }

  private moveDetailSections(source: HTMLElement, target: HTMLElement): void {
    let detailWrapper = target.matches(".model-weave-lower-scroll, .model-weave-lower-pane-slot")
      ? target
      : target.querySelector<HTMLElement>(".model-weave-lower-scroll");
    if (!detailWrapper) {
      detailWrapper = target.createDiv({ cls: "model-weave-lower-scroll" });
    }

    const details = Array.from(source.children).filter(
      (child) =>
        child.instanceOf(HTMLElement) &&
        child.matches(
          "details, .mdspec-related-list, .model-weave-object-context-list"
        )
    ).filter((child): child is HTMLElement => child.instanceOf(HTMLElement));

    for (const detail of details) {
      detail.remove();
      detail.addClass("model-weave-detail-panel");
      detailWrapper.appendChild(detail);
    }
  }

  private appendViewerToolbarControls(
    container: HTMLElement,
    viewOnlyTarget: HTMLElement = container
  ): void {
    this.appendViewOnlyControl(container, viewOnlyTarget);
  }

  private appendViewerFocusToolbar(): void {
    const toolbar = this.contentEl.createDiv({
      cls: "model-weave-viewer-toolbar"
    });
    const button = toolbar.createEl("button", {
      cls: "model-weave-secondary-button model-weave-focus-mode-button"
    });
    button.type = "button";
    this.updateFocusModeButton(button);
    button.addEventListener("click", (event) => {
      event.preventDefault();
      this.setFocusMode(!this.focusModeEnabled);
    });
  }

  private appendViewOnlyControl(
    container: HTMLElement,
    viewOnlyTarget: HTMLElement
  ): void {
    const toolbar = container.querySelector<HTMLElement>(".mdspec-zoom-toolbar");
    if (!toolbar) {
      return;
    }

    const controls = toolbar.querySelector<HTMLElement>(".model-weave-zoom-toolbar-controls");
    if (!controls || controls.querySelector(".model-weave-view-only-button")) {
      return;
    }

    const button = container.ownerDocument.createElement("button");
    button.type = "button";
    button.addClass("model-weave-zoom-toolbar-button");
    button.addClass("model-weave-view-only-button");
    this.updateViewOnlyButton(button, viewOnlyTarget);
    button.addEventListener("click", (event) => {
      event.preventDefault();
      this.setViewOnlyMode(
        !(this.viewOnlyEnabled && this.viewOnlyTarget === viewOnlyTarget),
        { target: viewOnlyTarget }
      );
    });

    const exportButton = controls.querySelector<HTMLElement>(
      ".model-weave-zoom-toolbar-export-png"
    );
    controls.insertBefore(button, exportButton ?? null);
  }

  private updateFocusModeButton(button: HTMLButtonElement): void {
    const label = this.focusModeEnabled
      ? this.t("graph.focusModeExit")
      : this.t("graph.focusModeEnter");
    button.textContent = this.focusModeEnabled ? "Exit" : "Focus";
    button.setAttribute("aria-label", label);
    button.title = label;
    button.toggleClass("is-active", this.focusModeEnabled);
  }

  private updateViewOnlyButton(
    button: HTMLButtonElement,
    target: HTMLElement
  ): void {
    const isActive = this.viewOnlyEnabled && Boolean(this.viewOnlyTarget?.contains(button));
    const label = isActive
      ? this.t("graph.viewOnlyExit")
      : this.t("graph.viewOnlyEnter");
    button.textContent = isActive ? "Exit View" : "View";
    button.setAttribute("aria-label", label);
    button.title = label;
    button.toggleClass("is-active", isActive);
  }

  private setFocusMode(enabled: boolean, options?: { skipFit?: boolean }): void {
    if (this.focusModeEnabled === enabled) {
      return;
    }

    this.focusModeEnabled = enabled;
    if (enabled) {
      this.attachFocusModeOverlay();
    } else {
      this.detachFocusModeOverlay();
    }
    this.contentEl.classList.toggle("model-weave-viewer-focus-mode", enabled);
    this.contentEl
      .querySelectorAll<HTMLButtonElement>(".model-weave-focus-mode-button")
      .forEach((button) => this.updateFocusModeButton(button));

    if (!options?.skipFit) {
      this.scheduleActiveGraphFit();
    }
  }

  private setViewOnlyMode(
    enabled: boolean,
    options?: { target?: HTMLElement; skipFit?: boolean }
  ): void {
    const target = enabled ? options?.target ?? this.viewOnlyTarget : null;
    if (enabled && !target) {
      return;
    }

    this.detachViewOnlyTarget();
    this.viewOnlyEnabled = enabled;
    this.viewOnlyTarget = target;

    if (enabled && target && !this.attachViewOnlyTarget(target)) {
      this.viewOnlyEnabled = false;
      this.viewOnlyTarget = null;
    }

    this.contentEl.classList.toggle(
      "model-weave-viewer-view-only",
      this.viewOnlyEnabled
    );
    this.contentEl
      .querySelectorAll<HTMLButtonElement>(".model-weave-view-only-button")
      .forEach((button) => this.updateViewOnlyButton(button, button));

    if (!options?.skipFit) {
      this.scheduleActiveGraphFit();
    }
  }

  private attachViewOnlyTarget(target: HTMLElement): boolean {
    const parent = target.parentNode;
    if (!parent) {
      return false;
    }

    const stage = this.ensureViewOnlyStage();
    const placeholder = target.ownerDocument.createComment(
      "model-weave-view-only-placeholder"
    );
    parent.insertBefore(placeholder, target);
    target.addClass("model-weave-view-only-target");
    stage.appendChild(target);
    this.viewOnlyPlaceholder = placeholder;
    return true;
  }

  private detachViewOnlyTarget(): void {
    const target = this.viewOnlyTarget;
    const placeholder = this.viewOnlyPlaceholder;

    target?.removeClass("model-weave-view-only-target");
    if (target && placeholder?.parentNode) {
      placeholder.parentNode.insertBefore(target, placeholder);
      placeholder.remove();
    }

    this.viewOnlyPlaceholder = null;
  }

  private ensureViewOnlyStage(): HTMLElement {
    if (this.viewOnlyStage && this.viewOnlyStage.parentElement === this.contentEl) {
      return this.viewOnlyStage;
    }

    const stage = this.contentEl.createDiv({
      cls: "model-weave-view-only-stage"
    });
    this.viewOnlyStage = stage;
    return stage;
  }

  private attachFocusModeOverlay(): void {
    if (this.focusModePlaceholder) {
      return;
    }

    const parent = this.contentEl.parentNode;
    if (!parent) {
      return;
    }

    const doc = this.contentEl.ownerDocument;
    const placeholder = doc.createComment("model-weave-focus-mode-placeholder");
    parent.insertBefore(placeholder, this.contentEl);
    this.contentEl.setCssProps({
      "--mw-focus-overlay-top": this.getFocusOverlayTopOffset()
    });
    doc.body.appendChild(this.contentEl);
    doc.body.classList.add("model-weave-focus-mode-active");
    this.focusModePlaceholder = placeholder;
  }

  private getFocusOverlayTopOffset(): string {
    const titlebar = this.contentEl.ownerDocument.querySelector<HTMLElement>(
      ".titlebar"
    );
    const rect = titlebar?.getBoundingClientRect();
    if (!rect || rect.height <= 0) {
      return "0px";
    }

    return Math.max(0, Math.ceil(rect.bottom)).toString() + "px";
  }

  private detachFocusModeOverlay(): void {
    const placeholder = this.focusModePlaceholder;
    const doc = this.contentEl.ownerDocument;
    doc.body.classList.remove("model-weave-focus-mode-active");
    this.contentEl.setCssProps({
      "--mw-focus-overlay-top": "0px"
    });

    if (placeholder?.parentNode) {
      placeholder.parentNode.insertBefore(this.contentEl, placeholder);
      placeholder.remove();
    }

    this.focusModePlaceholder = null;
  }

  private scheduleActiveGraphFit(): void {
    const view = this.contentEl.ownerDocument.defaultView;
    if (!view) {
      return;
    }

    view.requestAnimationFrame(() => {
      view.requestAnimationFrame(() => {
        this.contentEl
          .querySelectorAll<HTMLButtonElement>(".model-weave-zoom-toolbar-fit")
          .forEach((button) => button.click());
      });
    });
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

    toolbar.addClass("model-weave-render-mode-toolbar-host");
    toolbar.querySelector(".mdspec-renderer-select-group")?.remove();

    const doc = container.ownerDocument;
    const wrapper = doc.createElement("div");
    wrapper.className =
      "mdspec-renderer-select-group model-weave-render-mode-row";

    const title = doc.createElement("span");
    title.addClass("model-weave-render-mode-label");
    title.textContent = "Renderer";

    const meta = doc.createElement("span");
    meta.textContent = `selected ${selection.selectedMode} / effective ${selection.effectiveMode} / source ${selection.source}`;
    if (selection.fallbackReason) {
      meta.textContent += ` / ${selection.fallbackReason}`;
    }

    title.title = meta.textContent;
    wrapper.appendChild(title);

    const select = doc.createElement("select");
    select.addClass("model-weave-render-mode-select");
    select.title = meta.textContent;
      for (const mode of selection.supportedModes) {
        const option = doc.createElement("option");
        option.value = mode;
        option.textContent = this.formatRenderModeLabel(mode);
        option.selected = mode === selection.visibleSelectedMode;
        select.appendChild(option);
      }
    select.addEventListener("change", () => {
      const selectedMode = selection.supportedModes.find((mode) => mode === select.value);
      if (selectedMode) {
        selection.onSelectMode?.(selectedMode);
      }
    });
    wrapper.appendChild(select);

    toolbar.appendChild(wrapper);
  }

  private formatRenderModeLabel(mode: AnyRenderMode): string {
    return mode
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
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
      topPane.setCssProps({
        "--mw-pane-padding": `${density.topPanePadding}px`,
        "--mw-pane-gap": `${density.topPaneGap}px`
      });

    const handle = root.createDiv();
    handle.addClass("model-weave-viewer-resize-handle");

    const grip = handle.createDiv();
    grip.addClass("model-weave-viewer-resize-grip");

    const bottomPane = root.createDiv();
      bottomPane.addClass("model-weave-viewer-lower-pane");
      bottomPane.addClass("model-weave-viewer-lower-scroll");
      bottomPane.setCssProps({
        "--mw-pane-padding": `${density.bottomPanePadding}px ${density.bottomPanePadding + 2}px ${density.bottomPanePadding + 4}px`,
        "--mw-pane-gap": `${density.bottomPaneGap}px`
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
        topPane.setCssProps({ "--mw-pane-flex": `${bounded} 1 0` });
        bottomPane.setCssProps({ "--mw-pane-flex": `${1 - bounded} 1 0` });
        this.splitRatioByKey.set(key, bounded);
        return;
      }

      const topPixels = Math.max(
        minTop,
        Math.min(available - minBottom, Math.round(available * bounded))
      );
      const bottomPixels = Math.max(minBottom, available - topPixels);
      topPane.setCssProps({ "--mw-pane-flex": `0 0 ${topPixels}px` });
      bottomPane.setCssProps({ "--mw-pane-flex": `0 0 ${bottomPixels}px` });
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

const SCREEN_CANVAS_PADDING = 48;
const SCREEN_MIN_ZOOM = 0.45;
const SCREEN_MAX_ZOOM = 2.4;
const SCREEN_INITIAL_ZOOM = 1;
const SCREEN_BOX_WIDTH = 420;
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
const SCREEN_TARGET_BOX_MIN_HEIGHT = 96;
const SCREEN_TARGET_BOX_HEADER_VERTICAL_PADDING = 16;
const SCREEN_TARGET_BOX_BODY_VERTICAL_PADDING = 20;
const SCREEN_TARGET_KIND_LINE_HEIGHT = 16;
const SCREEN_TARGET_TITLE_LINE_HEIGHT = 22;
const SCREEN_TARGET_ROW_LINE_HEIGHT = 16;
const SCREEN_TARGET_ROW_GAP = 4;
const SCREEN_TARGET_BOX_GAP = 24;
const SCREEN_LABEL_PILL_WIDTH = 132;
const SCREEN_LABEL_PILL_HEIGHT = 24;
const SCREEN_LABEL_PILL_GAP = 8;
const SCREEN_ARROW_COLOR = "#64748b";

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
  sourcePath?: string;
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
  contentTop: number;
  contentBottom: number;
  mainBoxHeight: number;
  mainBoxTop: number;
  targets: ScreenPreviewSceneTarget[];
}

function buildScreenPreviewData(
  state: Extract<PreviewState, { mode: "summary" }>,
  t?: ModelWeaveTranslator
): ScreenPreviewData {
  return {
    title: state.title,
    sourcePath: state.filePath,
    blocks: localizeScreenPreviewBlocks(state.layoutBlocks ?? [], t),
    transitions: state.screenPreviewTransitions ?? []
  };
}

function localizeScreenPreviewBlocks(
  blocks: NonNullable<Extract<PreviewState, { mode: "summary" }>["layoutBlocks"]>,
  t?: ModelWeaveTranslator
): NonNullable<Extract<PreviewState, { mode: "summary" }>["layoutBlocks"]> {
  if (!t) {
    return blocks;
  }
  return blocks.map((block) => ({
    ...block,
    label:
      block.label === "Unassigned" || block.label === LEGACY_SCREEN_UNASSIGNED_LABEL
        ? t("screen.preview.unassigned")
        : block.label,
    subtitle:
      block.subtitle === "Layout is missing or undefined" ||
      block.subtitle === LEGACY_SCREEN_LAYOUT_MISSING_SUBTITLE
        ? t("screen.preview.layoutMissing")
        : block.subtitle
  }));
}

const LEGACY_SCREEN_UNASSIGNED_LABEL = "\u672a\u5206\u985e [unassigned]";
const LEGACY_SCREEN_LAYOUT_MISSING_SUBTITLE =
  "layout \u672a\u6307\u5b9a\u307e\u305f\u306f\u672a\u5b9a\u7fa9";

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
  const root = activeDocument.createElement("section");
  root.className = "mdspec-diagram mdspec-diagram--screen";
  root.addClass("model-weave-screen-preview");
  root.addClass("model-weave-screen-chart");

  const scene = buildScreenPreviewScene(data);

  const canvas = activeDocument.createElement("div");
  canvas.className = "mdspec-screen-canvas";
  canvas.addClass("model-weave-screen-preview-layout-block");
  if (!options?.forExport) {
    canvas.addClass("model-weave-screen-preview-layout-block-interactive");
  }

  const toolbar = options?.forExport
    ? null
    : createZoomToolbar("Ctrl/Meta + wheel: zoom / Drag background: pan");
  if (toolbar) {
    root.appendChild(toolbar.root);
  }

  const viewport = activeDocument.createElement("div");
  viewport.className = "mdspec-screen-viewport";
  viewport.addClass("model-weave-screen-preview-viewport");

  const surface = activeDocument.createElement("div");
  surface.className = "mdspec-screen-surface";
  surface.dataset.modelWeaveExportSurface = "true";
  surface.dataset.modelWeaveRenderer = "custom";
  surface.dataset.modelWeaveSceneWidth = `${scene.width}`;
  surface.dataset.modelWeaveSceneHeight = `${scene.height}`;
  surface.addClass("model-weave-screen-preview-surface");
  surface.setCssProps({
    "--mw-scene-width": `${scene.width}px`,
    "--mw-scene-height": `${scene.height}px`
  });

  surface.appendChild(createScreenPreviewTransitionSvg(scene));
  surface.appendChild(
    createScreenPreviewMainBox(data, scene.mainBoxHeight, scene.mainBoxTop, options)
  );
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
      fitVerticalAlign: "top",
      fitContentBounds: {
        top: scene.contentTop,
        bottom: scene.contentBottom
      },
      nodeSelector:
        ".model-weave-screen-card, .model-weave-screen-transition-label, .model-weave-screen-preview-card, .model-weave-screen-preview-target-box, .model-weave-screen-preview-edge-label",
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
    : [{ label: "Unassigned", items: [] }];

  const mainBoxHeight =
    SCREEN_BOX_HEADER_HEIGHT +
    blocks.reduce((sum, block) => sum + measureScreenPreviewBlockHeight(block), 0) +
    Math.max(0, blocks.length - 1) * SCREEN_SECTION_GAP;

  const targetGroups = data.transitions;
  const targetHeights = targetGroups.map((target) => {
    const targetBoxHeight = measureScreenPreviewTargetBoxHeight(target);
    const labelsHeight =
      target.actions.length * SCREEN_LABEL_PILL_HEIGHT +
      Math.max(0, target.actions.length - 1) * SCREEN_LABEL_PILL_GAP;
    return Math.max(
      targetBoxHeight,
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
    const targetBoxHeight = measureScreenPreviewTargetBoxHeight(target);
    const targetBoxY = nextTargetY + (groupHeight - targetBoxHeight) / 2;
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
      height: targetBoxHeight,
      centerY: targetBoxY + targetBoxHeight / 2,
      labelPills
    });

    nextTargetY += groupHeight + SCREEN_TARGET_BOX_GAP;
  });

  const contentTop = Math.min(
    mainBoxTop,
    ...targets.map((target) => target.y),
    ...targets.flatMap((target) => target.labelPills.map((pill) => pill.y))
  );
  const contentBottom = Math.max(
    mainBoxTop + mainBoxHeight,
    ...targets.map((target) => target.y + target.height),
    ...targets.flatMap((target) =>
      target.labelPills.map((pill) => pill.y + pill.height)
    )
  );

  return {
    width,
    height,
    contentTop,
    contentBottom,
    mainBoxHeight,
    mainBoxTop,
    targets
  };
}

export function measureScreenPreviewBlockHeight(block: { items: unknown[] }): number {
  const visibleRows = Math.max(1, block.items.length);
  return (
    SCREEN_SECTION_HEADER_HEIGHT +
    SCREEN_SECTION_PADDING * 2 +
    visibleRows * SCREEN_FIELD_ROW_HEIGHT
  );
}

function measureScreenPreviewTargetBoxHeight(
  target: ScreenPreviewTransitionTargetData
): number {
  const availableTextUnits = 24;
  const titleLines = estimateScreenPreviewLineCount(
    truncateScreenPreviewText(target.targetLabel, SCREEN_MAX_SECTION_CHARS),
    availableTextUnits
  );
  const bodyRows = [
    target.selfTarget
      ? "Self transition"
      : target.unresolved
        ? "Transition target not resolved"
        : "Open target screen",
    target.actions.length > 1 ? `${target.actions.length} actions` : ""
  ].filter((row) => row.length > 0);
  const bodyLines = bodyRows.reduce(
    (sum, row) => sum + estimateScreenPreviewLineCount(row, availableTextUnits),
    0
  );
  const bodyGap = Math.max(0, bodyRows.length - 1) * SCREEN_TARGET_ROW_GAP;

  return Math.max(
    SCREEN_TARGET_BOX_MIN_HEIGHT,
    SCREEN_TARGET_BOX_HEADER_VERTICAL_PADDING +
      SCREEN_TARGET_KIND_LINE_HEIGHT +
      titleLines * SCREEN_TARGET_TITLE_LINE_HEIGHT +
      SCREEN_TARGET_BOX_BODY_VERTICAL_PADDING +
      bodyLines * SCREEN_TARGET_ROW_LINE_HEIGHT +
      bodyGap
  );
}

function estimateScreenPreviewLineCount(
  text: string,
  availableUnitsPerLine: number
): number {
  const trimmed = text.trim();
  if (!trimmed) {
    return 1;
  }
  return Math.max(1, Math.ceil(measureScreenPreviewTextUnits(trimmed) / availableUnitsPerLine));
}

function measureScreenPreviewTextUnits(text: string): number {
  let units = 0;
  for (const char of text) {
    units += /[\u1100-\u11ff\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef]/u.test(char)
      ? 1.6
      : 1;
  }
  return units;
}

function createScreenPreviewMainBox(
  data: ScreenPreviewData,
  height: number,
  top: number,
  options?: {
    onOpenLinkedFile?:
      | ((filePath: string, navigation?: { openInNewLeaf?: boolean }) => void)
      | null;
  }
): HTMLElement {
  const box = activeDocument.createElement("div");
  box.className = "mdspec-screen-preview-box";
  box.addClass("model-weave-screen-preview-card");
  box.addClass("model-weave-screen-card");
  box.setCssProps({
    "--mw-node-x": `${SCREEN_CANVAS_PADDING}px`,
    "--mw-node-y": `${top}px`,
    "--mw-node-width": `${SCREEN_BOX_WIDTH}px`,
    "--mw-node-height": `${height}px`
  });

  const header = activeDocument.createElement("header");
  header.addClass("model-weave-screen-preview-header");
  header.addClass("model-weave-screen-card-header");

  const kind = activeDocument.createElement("div");
  kind.addClass("model-weave-screen-preview-muted");
  kind.textContent = "Screen";

  const title = activeDocument.createElement("div");
  title.addClass("model-weave-screen-preview-title");
  title.addClass("model-weave-screen-card-title");
  title.textContent = truncateScreenPreviewText(data.title, SCREEN_MAX_TITLE_CHARS);

  header.append(kind, title);
  box.appendChild(header);

  const body = activeDocument.createElement("div");
  body.addClass("model-weave-screen-preview-sections");
  body.addClass("model-weave-screen-card-body");

  const blocks = data.blocks.length > 0
    ? data.blocks
    : [{ label: "Unassigned", items: [] }];

  blocks.forEach((block, index) => {
    const section = activeDocument.createElement("section");
    section.addClass("model-weave-screen-preview-section");
    section.addClass("model-weave-screen-card-section");
    if (index > 0) {
      section.addClass("model-weave-screen-preview-section-bordered");
    }

    const sectionHeading = activeDocument.createElement("div");
    sectionHeading.addClass("model-weave-screen-preview-section-title");
    sectionHeading.textContent = truncateScreenPreviewText(block.label, SCREEN_MAX_SECTION_CHARS);
    section.appendChild(sectionHeading);

    if (block.items.length === 0) {
      const empty = activeDocument.createElement("div");
      empty.addClass("model-weave-screen-preview-empty");
      empty.textContent = "None";
      section.appendChild(empty);
    } else {
      const list = activeDocument.createElement("ul");
      list.addClass("model-weave-screen-preview-list");
      for (const item of block.items) {
        const entry = activeDocument.createElement("li");
        entry.textContent = truncateScreenPreviewText(item.label, SCREEN_MAX_FIELD_CHARS);
        list.appendChild(entry);
      }
      section.appendChild(list);
    }

    body.appendChild(section);
  });

  box.appendChild(body);

  if (data.sourcePath && options?.onOpenLinkedFile) {
    box.tabIndex = 0;
    box.setAttribute("role", "button");
    box.addClass("model-weave-screen-preview-clickable");
    box.title = `Open ${data.title}\n${data.sourcePath}`;
    const openSource = (openInNewLeaf: boolean) => {
      options.onOpenLinkedFile?.(data.sourcePath!, { openInNewLeaf });
    };
    box.addEventListener("click", (event) => {
      if (event.defaultPrevented) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      openSource(Boolean(event.ctrlKey || event.metaKey));
    });
    box.addEventListener("auxclick", (event) => {
      if (event.button !== 1) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      openSource(true);
    });
    box.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        event.stopPropagation();
        openSource(Boolean(event.ctrlKey || event.metaKey));
      }
    });
    box.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
    });
  }

  return box;
}

function createScreenPreviewTransitionSvg(scene: ScreenPreviewScene): SVGSVGElement {
  const svg = activeDocument.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", `${scene.width}`);
  svg.setAttribute("height", `${scene.height}`);
  svg.setAttribute("viewBox", `0 0 ${scene.width} ${scene.height}`);
  svg.addClass("model-weave-screen-preview-overlay");

  const defs = activeDocument.createElementNS("http://www.w3.org/2000/svg", "defs");
  const marker = activeDocument.createElementNS("http://www.w3.org/2000/svg", "marker");
  marker.setAttribute("id", "mdspec-screen-preview-arrow");
  marker.setAttribute("markerWidth", "10");
  marker.setAttribute("markerHeight", "10");
  marker.setAttribute("refX", "8");
  marker.setAttribute("refY", "5");
  marker.setAttribute("orient", "auto");
  marker.setAttribute("markerUnits", "userSpaceOnUse");

  const markerPath = activeDocument.createElementNS("http://www.w3.org/2000/svg", "path");
  markerPath.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
  markerPath.setAttribute("fill", SCREEN_ARROW_COLOR);
  marker.appendChild(markerPath);
  defs.appendChild(marker);
  svg.appendChild(defs);

  const sourceX = SCREEN_CANVAS_PADDING + SCREEN_BOX_WIDTH;
  const sourceY = scene.mainBoxTop + scene.mainBoxHeight / 2;
  for (const target of scene.targets) {
    const line = activeDocument.createElementNS("http://www.w3.org/2000/svg", "line");
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
  const box = activeDocument.createElement("div");
  box.className = "mdspec-screen-preview-target-box";
  box.addClass("model-weave-screen-preview-target-box");
  box.addClass("model-weave-screen-card");
  if (target.target.unresolved) {
    box.addClass("model-weave-screen-preview-target-box-unresolved");
  }
  box.setCssProps({
    "--mw-node-x": `${target.x}px`,
    "--mw-node-y": `${target.y}px`,
    "--mw-node-width": `${target.width}px`,
    "--mw-node-height": `${target.height}px`
  });

  const header = activeDocument.createElement("header");
  header.addClass("model-weave-screen-preview-target-header");
  header.addClass("model-weave-screen-card-header");
  if (target.target.unresolved) {
    header.addClass("model-weave-screen-preview-target-header-unresolved");
  }

  const kind = activeDocument.createElement("div");
  kind.addClass("model-weave-screen-preview-target-kind");
  kind.textContent = target.target.unresolved ? "unresolved screen" : "screen";

  const title = activeDocument.createElement("div");
  title.addClass("model-weave-screen-preview-target-title");
  title.addClass("model-weave-screen-card-title");
  title.textContent = truncateScreenPreviewText(target.target.targetLabel, SCREEN_MAX_SECTION_CHARS);
  if (target.target.targetTitle) {
    title.title = target.target.targetTitle;
  }

  header.append(kind, title);
  box.appendChild(header);

  const body = activeDocument.createElement("div");
  body.addClass("model-weave-screen-preview-target-body");
  body.addClass("model-weave-screen-card-body");
  if (target.target.selfTarget) {
    body.createEl("div", {
      text: "Self transition",
      cls: "model-weave-screen-preview-row"
    });
  } else if (target.target.unresolved) {
    body.createEl("div", {
      text: "Transition target not resolved",
      cls: "model-weave-screen-preview-row"
    });
  } else {
    body.createEl("div", {
      text: "Open target screen",
      cls: "model-weave-screen-preview-row"
    });
  }
  if (target.target.actions.length > 1) {
    body.createEl("div", {
      text: `${target.target.actions.length} actions`,
      cls: "model-weave-screen-preview-row"
    });
  }
  box.appendChild(body);

  if (target.target.targetPath && options?.onOpenLinkedFile) {
    box.tabIndex = 0;
    box.setAttribute("role", "button");
    box.addClass("model-weave-screen-preview-clickable");
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
    box.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
    });
  }

  return box;
}

function createScreenPreviewActionPill(
  pill: ScreenPreviewSceneTarget["labelPills"][number],
  _onNavigateToLocation?: ((location: { line: number; ch?: number }) => void) | null
): HTMLElement {
  const element = activeDocument.createElement("span");
  element.className = "model-weave-screen-preview-edge-label";
  element.addClass("model-weave-screen-transition-label");
  element.setCssProps({
    "--mw-node-x": `${pill.x}px`,
    "--mw-node-y": `${pill.y}px`,
    "--mw-node-width": `${pill.width}px`,
    "--mw-node-height": `${pill.height}px`
  });
  element.textContent = truncateScreenPreviewText(pill.action.label, 18);
  if (pill.action.title) {
    element.title = pill.action.title;
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
  setOpenState?: (key: string, open: boolean) => void,
  language?: string
): void {
  const notes = diagnostics.filter((diagnostic) => diagnostic.severity === "info");
  const warnings = diagnostics.filter((diagnostic) => diagnostic.severity === "warning");
  const errors = diagnostics.filter((diagnostic) => diagnostic.severity === "error");

  if (notes.length === 0 && warnings.length === 0 && errors.length === 0) {
    return;
  }

  const t = createModelWeaveTranslator(toModelWeaveUiLanguage(language));
  renderDiagnosticsPanelSummary(container, errors.length, warnings.length, notes.length, t);

  if (errors.length > 0) {
    renderDiagnosticSection(
      container,
      "errors",
      t("diagnostics.errors"),
      errors,
      onOpenDiagnostic,
      "model-weave-diagnostics-summary-error",
      getOpenState,
      setOpenState,
      language
    );
  }

  if (warnings.length > 0) {
    renderDiagnosticSection(
      container,
      "warnings",
      t("diagnostics.warnings"),
      warnings,
      onOpenDiagnostic,
      "model-weave-diagnostics-summary-warning",
      getOpenState,
      setOpenState,
      language
    );
  }

  if (notes.length > 0) {
    renderDiagnosticSection(
      container,
      "notes",
      t("diagnostics.notes"),
      notes,
      onOpenDiagnostic,
      "model-weave-diagnostics-summary-note",
      getOpenState,
      setOpenState,
      language
    );
  }
}

function renderDiagnosticsPanelSummary(
  container: HTMLElement,
  errorCount: number,
  warningCount: number,
  noteCount: number,
  t: ModelWeaveTranslator
): void {
  const summary = container.createDiv({ cls: "model-weave-diagnostics-panel-summary" });
  summary.createSpan({ text: t("diagnostics.summary"), cls: "model-weave-diagnostics-panel-title" });
  renderDiagnosticCountChip(summary, t("diagnostics.errors"), errorCount, "error");
  renderDiagnosticCountChip(summary, t("diagnostics.warnings"), warningCount, "warning");
  renderDiagnosticCountChip(summary, t("diagnostics.notes"), noteCount, "info");
}

function renderDiagnosticCountChip(
  container: HTMLElement,
  label: string,
  count: number,
  severity: ValidationWarning["severity"]
): void {
  const chip = container.createSpan({
    text: label + " " + String(count),
    cls: "model-weave-diagnostics-count-chip model-weave-diagnostics-count-" + severity
  });
  chip.setAttribute("aria-label", label + ": " + String(count));
}

function renderDiagnosticSection(
  container: HTMLElement,
  key: string,
  title: string,
  diagnostics: ValidationWarning[],
  onOpenDiagnostic: ((diagnostic: ValidationWarning) => void) | undefined,
  summaryModifierClass: string,
  getOpenState?: (key: string, defaultOpen: boolean) => boolean,
  setOpenState?: (key: string, open: boolean) => void,
  language?: string
): void {
  const t = createModelWeaveTranslator(toModelWeaveUiLanguage(language));
  const details = container.createEl("details");
  details.className = "mdspec-diagnostic-section";
  details.addClass("model-weave-preview-section");
  details.open = getOpenState ? getOpenState(key, key !== "notes") : key !== "notes";
  if (setOpenState) {
    details.addEventListener("toggle", () => {
      setOpenState(key, details.open);
    });
  }
  details.addClass("model-weave-diagnostics-details");

  const summary = details.createEl("summary", {
    text: title + " (" + String(diagnostics.length) + ")"
  });
  summary.addClass("model-weave-diagnostics-summary");
  summary.addClass("model-weave-preview-section-title");
  summary.addClass(summaryModifierClass);

  const list = details.createDiv({ cls: "model-weave-diagnostics-card-list" });

  for (const diagnostic of diagnostics) {
    renderDiagnosticCard(list, diagnostic, onOpenDiagnostic, t, language);
  }
}

function renderDiagnosticCard(
  container: HTMLElement,
  diagnostic: ValidationWarning,
  onOpenDiagnostic: ((diagnostic: ValidationWarning) => void) | undefined,
  t: ModelWeaveTranslator,
  language?: string
): void {
  const card = container.createDiv({
    cls: "model-weave-diagnostic-card model-weave-diagnostic-card-" + diagnostic.severity
  });

  const header = card.createDiv({ cls: "model-weave-diagnostic-card-header" });
  header.createSpan({
    text: getDiagnosticSeverityLabel(diagnostic.severity, t),
    cls: "model-weave-diagnostic-severity model-weave-diagnostic-severity-" + diagnostic.severity
  });
  header.createSpan({ text: diagnostic.code, cls: "model-weave-diagnostic-code" });

  const message = localizeDiagnosticMessage(diagnostic.message, language);
  card.createDiv({ text: message, cls: "model-weave-diagnostic-message" });

  const metadata = getDiagnosticMetadata(diagnostic, t);
  if (metadata.length > 0) {
    const metaList = card.createDiv({ cls: "model-weave-diagnostic-meta-list" });
    for (const entry of metadata) {
      const item = metaList.createDiv({ cls: "model-weave-diagnostic-meta" });
      item.createSpan({ text: entry.label, cls: "model-weave-diagnostic-meta-label" });
      item.createSpan({ text: entry.value, cls: "model-weave-diagnostic-meta-value" });
    }
  }

  const actions = card.createDiv({ cls: "model-weave-diagnostic-actions" });
  if (onOpenDiagnostic) {
    const openButton = actions.createEl("button", {
      text: t("diagnostics.openSource"),
      cls: "model-weave-secondary-button model-weave-diagnostic-action"
    });
    openButton.type = "button";
    openButton.title = t("diagnostics.openInEditor");
    openButton.addEventListener("click", (event) => {
      event.preventDefault();
      onOpenDiagnostic(diagnostic);
    });
  }

  renderDiagnosticCopyButton(
    actions,
    t("diagnostics.copyMessage"),
    message,
    "model-weave-diagnostic-action"
  );
  renderDiagnosticCopyButton(
    actions,
    t("diagnostics.copyMarkdown"),
    formatDiagnosticAsMarkdown(diagnostic, message, t),
    "model-weave-diagnostic-action"
  );

  const reference = getDiagnosticReferenceValue(diagnostic);
  if (reference) {
    renderDiagnosticCopyButton(
      actions,
      t("diagnostics.copyReference"),
      reference,
      "model-weave-diagnostic-action"
    );
  }
}

function renderDiagnosticCopyButton(
  container: HTMLElement,
  label: string,
  value: string,
  className: string
): void {
  const button = container.createEl("button", {
    text: label,
    cls: "model-weave-secondary-button " + className
  });
  button.type = "button";
  button.addEventListener("click", (event) => {
    event.preventDefault();
    void navigator.clipboard?.writeText(value);
  });
}

function getDiagnosticSeverityLabel(
  severity: ValidationWarning["severity"],
  t: ModelWeaveTranslator
): string {
  if (severity === "error") {
    return t("diagnostics.severity.error");
  }
  if (severity === "warning") {
    return t("diagnostics.severity.warning");
  }
  return t("diagnostics.severity.note");
}

function getDiagnosticMetadata(
  diagnostic: ValidationWarning,
  t: ModelWeaveTranslator
): { label: string; value: string }[] {
  const metadata: { label: string; value: string }[] = [];
  const file = diagnostic.filePath ?? diagnostic.path;
  if (file) {
    metadata.push({ label: t("diagnostics.meta.file"), value: file });
  }
  const section = getDiagnosticStringValue(diagnostic.context?.section) ?? diagnostic.section ?? diagnostic.field;
  if (section) {
    metadata.push({ label: t("diagnostics.meta.section"), value: section });
  }
  const line = diagnostic.line ?? diagnostic.fromLine;
  if (typeof line === "number") {
    metadata.push({ label: t("diagnostics.meta.line"), value: String(line) });
  }
  const row = getDiagnosticStringValue(diagnostic.context?.rowIndex);
  if (row) {
    metadata.push({ label: t("diagnostics.meta.row"), value: row });
  }
  const reference = getDiagnosticReferenceValue(diagnostic);
  if (reference) {
    metadata.push({ label: t("diagnostics.meta.reference"), value: reference });
  }
  return metadata;
}

function getDiagnosticReferenceValue(diagnostic: ValidationWarning): string | null {
  const contextReference = findDiagnosticContextValue(diagnostic.context, [
    "reference",
    "ref",
    "target",
    "targetRef",
    "sourceRef",
    "value"
  ]);
  if (contextReference) {
    return contextReference;
  }
  if (diagnostic.code !== "unresolved-reference" && !/reference/i.test(diagnostic.message)) {
    return null;
  }
  return getFirstQuotedDiagnosticValue(diagnostic.message);
}

function findDiagnosticContextValue(
  context: Record<string, unknown> | undefined,
  keys: string[]
): string | null {
  if (!context) {
    return null;
  }
  for (const key of keys) {
    const value = getDiagnosticStringValue(context[key]);
    if (value) {
      return value;
    }
  }
  return null;
}

function getDiagnosticStringValue(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}

function getFirstQuotedDiagnosticValue(message: string): string | null {
  const match = message.match(/"([^"]+)"/);
  return match?.[1] ?? null;
}

function formatDiagnosticAsMarkdown(
  diagnostic: ValidationWarning,
  localizedMessage: string,
  t: ModelWeaveTranslator
): string {
  const lines = [
    "- " + t("diagnostics.meta.severity") + ": " + getDiagnosticSeverityLabel(diagnostic.severity, t),
    "- " + t("diagnostics.meta.code") + ": " + diagnostic.code,
    "- " + t("diagnostics.meta.message") + ": " + localizedMessage
  ];
  for (const entry of getDiagnosticMetadata(diagnostic, t)) {
    lines.push("- " + entry.label + ": " + entry.value);
  }
  return lines.join("\n");
}

function toModelWeaveUiLanguage(language: string | undefined): ModelWeaveUiLanguage {
  if (language === "en" || language === "ja" || language === "auto") {
    return language;
  }
  return "auto";
}

function asModelRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? value as Record<string, unknown>
    : null;
}

function getStringField(value: unknown, key: string): string | undefined {
  const record = asModelRecord(value);
  const field = record?.[key];
  return typeof field === "string" && field.trim().length > 0
    ? field.trim()
    : undefined;
}

function getFrontmatterString(value: unknown, key: string): string | undefined {
  const frontmatter = asModelRecord(asModelRecord(value)?.frontmatter);
  const field = frontmatter?.[key];
  return typeof field === "string" && field.trim().length > 0
    ? field.trim()
    : undefined;
}

function getModelDisplayName(value: unknown): string | undefined {
  return (
    getStringField(value, "name") ??
    getStringField(value, "title") ??
    getStringField(value, "logicalName") ??
    getStringField(value, "physicalName") ??
    getFrontmatterString(value, "name") ??
    getFrontmatterString(value, "title") ??
    getModelId(value)
  );
}

function getModelId(value: unknown): string | undefined {
  return (
    getStringField(value, "id") ??
    getFrontmatterString(value, "id")
  );
}

function getModelType(value: unknown): string | undefined {
  return (
    getStringField(value, "fileType") ??
    getFrontmatterString(value, "type") ??
    getStringField(value, "schema") ??
    getFrontmatterString(value, "schema")
  );
}

function buildGraphIdentityTitle(
  value: unknown,
  fallbackName?: string,
  fallbackType?: string
): string {
  const modelId = getModelId(value);
  const modelType = getModelType(value) ?? fallbackType;
  const displayName = getModelDisplayName(value) ?? modelId ?? fallbackName ?? "Model";
  const suffixParts = [
    modelType,
    modelId && modelId !== displayName ? modelId : undefined
  ].filter((part): part is string => Boolean(part));

  return suffixParts.length > 0
    ? displayName + " (" + suffixParts.join(" / ") + ")"
    : displayName;
}

function findSummaryMetadataValue(
  state: Extract<PreviewState, { mode: "summary" }>,
  keys: string[]
): string | undefined {
  const normalizedKeys = new Set(keys.map((key) => key.toLowerCase()));
  for (const entry of state.metadata) {
    if (normalizedKeys.has(entry.label.toLowerCase())) {
      return entry.value;
    }
  }
  return undefined;
}

function buildSummaryGraphTitle(state: Extract<PreviewState, { mode: "summary" }>): string {
  const summaryType = state.summaryKind === "screen"
    ? "screen"
    : state.businessFlow
      ? "app_process"
      : undefined;
  return buildGraphIdentityTitle(
    {
      title: state.title,
      fileType: summaryType,
      path: state.filePath,
      id: findSummaryMetadataValue(state, ["id", "model id", "model_id"])
    },
    state.title,
    summaryType
  );
}

function buildWeaveMapGraphTitle(t: ModelWeaveTranslator, summary: ImpactSummary): string {
  const target = summary.modelId || summary.modelLabel || summary.modelPath;
  return t("relationship.weaveMap.title") + " — " + target;
}

function ensureGraphIdentityTitle(root: HTMLElement, title: string): void {
  const existingTitle = root.querySelector<HTMLElement>(
    ".model-weave-mermaid-title, .model-weave-graph-identity-title"
  );
  const titleElement = existingTitle ?? root.ownerDocument.createElement("h2");
  titleElement.textContent = title;
  titleElement.title = title;
  titleElement.addClass("model-weave-graph-identity-title");

  if (!existingTitle) {
    root.insertBefore(titleElement, root.firstChild);
  }
}
