import { ItemView, MarkdownRenderer, WorkspaceLeaf } from "obsidian";
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
import { exportDiagramRenderableAsPng } from "../export/png-export";
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
    this.renderCurrentState();
    return Promise.resolve();
  }

  onClose(): Promise<void> {
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
                createScreenPreviewDiagram(buildScreenPreviewData(state), {
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
    this.contentEl.setCssProps({
      "--model-weave-font-size": fontVars.base,
      "--model-weave-font-size-small": fontVars.small,
      "--model-weave-font-size-large": fontVars.large,
      "--model-weave-font-size-title": fontVars.title,
      "--mw-content-gap": `${this.getDensitySpacing().contentGap}px`
    });
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
        this.viewerPreferences.localSourceRoot
      )
    );
    this.renderImpactSummarySection(
      shell.bottomPane,
      state.impactSummary,
      state.onCopyImpactSummary,
      state.onOpenImpactModel
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
        ...getDfdDetailLabels(this.t),
        ...getClassDetailLabels(this.t),
        showMermaidRenderDebug: this.viewerPreferences.showMermaidRenderDebug
      });
        this.appendRendererSelection(mermaidRoot, state.rendererSelection);
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

  private renderDomainsState(
    state: Extract<PreviewState, { mode: "domains" }>
  ): void {
    const shell = this.createViewerSplitShell(`domains:${state.model.path}`, 0.62);
    shell.bottomPane.addClass("model-weave-summary-details");
    this.activeScrollContainer = shell.bottomPane;

    this.renderDomainMermaidDiagram(
      shell.topPane,
      state.model.domains,
      shell.bottomPane,
      state.colorScheme
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

    this.renderDomainMermaidDiagram(
      shell.topPane,
      state.resolved.domains,
      shell.bottomPane,
      state.colorScheme
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
      this.viewerPreferences.localSourceRoot
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
    colorScheme?: ResolvedColorScheme
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

    this.renderDomainDiagramModeSelector(container);
    container.appendChild(
      renderDomainsMermaidDiagram(domains, {
        title: this.getDomainDiagramModeLabel(this.domainsDiagramMode),
        mode: this.domainsDiagramMode,
        renderFailedMessage: this.t("domains.preview.diagramRenderFailed"),
        fitVerticalAlign: "top",
        sourcePanelContainer,
        sourcePanelPlacement: sourcePanelContainer ? "prepend" : undefined,
        ...getMermaidSourceLabels(this.t),
        viewportState: this.domainsMermaidViewportState,
        showMermaidRenderDebug: this.viewerPreferences.showMermaidRenderDebug,
        colorScheme
      })
    );
  }

  private renderDomainDiagramModeSelector(container: HTMLElement): void {
    const selector = container.createDiv({
      cls: "model-weave-render-mode-toolbar-host"
    });
    selector.createEl("span", {
      text: this.t("domains.preview.viewMode"),
      cls: "model-weave-summary-muted"
    });

    for (const mode of ["mindmap", "area", "tree"] as const) {
      const button = selector.createEl("button", {
        text: this.getDomainDiagramModeLabel(mode),
        cls: "model-weave-secondary-button"
      });
      button.type = "button";
      button.setAttribute("aria-pressed", String(this.domainsDiagramMode === mode));
      if (this.domainsDiagramMode === mode) {
        button.addClass("is-active");
      }
      button.addEventListener("click", () => {
        if (this.domainsDiagramMode === mode) {
          return;
        }
        this.domainsDiagramMode = mode;
        this.renderCurrentState();
        this.restoreCurrentScrollPosition();
      });
    }
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
      } else if (state.businessFlow) {
        if (this.screenPreviewViewportState.viewMode === "fit") {
          resetGraphViewportState(this.screenPreviewViewportState);
        }
        shell.topPane.appendChild(
          renderAppProcessBusinessFlow(state.businessFlow, {
            sourcePanelContainer: shell.bottomPane,
            sourcePanelPlacement: "prepend",
            ...getMermaidSourceLabels(this.t),
            showMermaidRenderDebug: this.viewerPreferences.showMermaidRenderDebug,
            colorScheme: state.colorScheme,
            viewportState: this.screenPreviewViewportState,
            onViewportStateChange: this.createScreenPreviewViewportStateHandler(
              state.filePath
            )
          })
        );
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

    const sourceLinks = renderSourceLinks(
      state.sourceLinks,
      this.viewerPreferences.localSourceRoot
    );
    if (sourceLinks) {
      container.appendChild(sourceLinks);
    }

    this.renderImpactSummarySection(
      container,
      state.impactSummary,
      state.onCopyImpactSummary,
      state.onOpenImpactModel
    );

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
      section.appendChild(
        renderAppProcessBusinessFlow(state.businessFlow, {
          viewportState: this.screenPreviewViewportState,
          colorScheme: state.colorScheme,
          onViewportStateChange: this.createScreenPreviewViewportStateHandler(
            state.filePath
          )
        })
      );
    }

    if (state.sections.length > 0) {
      const sections = this.createCollapsibleSection(
        container,
        "detectedSections",
        "Detected sections",
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
        getAppProcessBusinessFlowColorSchemeTargets(state.businessFlow)
      );
    }
  }

  private renderScreenSummaryDetails(
    container: HTMLElement,
    state: Extract<PreviewState, { mode: "summary" }>
  ): void {
    container.createEl("h2", { text: state.title });

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

    const sourceLinks = renderSourceLinks(
      state.sourceLinks,
      this.viewerPreferences.localSourceRoot
    );
    if (sourceLinks) {
      container.appendChild(sourceLinks);
    }

    this.renderImpactSummarySection(
      container,
      state.impactSummary,
      state.onCopyImpactSummary,
      state.onOpenImpactModel
    );

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
        "Detected sections",
        false
      );
      const list = sections.createEl("ul", { cls: "model-weave-summary-list" });
      for (const section of state.sections) {
        const item = list.createEl("li", { text: section.label });
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
      table.title,
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
        text: "No rows",
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
      "Invoked processes": "summary.count.invokedProcesses",
      "Outgoing screens": "summary.count.outgoingScreens"
    };
    const key = keyByLabel[label];
    return key ? this.t(key) : label;
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
      title,
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

  private renderImpactSummarySection(
    container: HTMLElement,
    summary: ImpactSummary | undefined,
    onCopyImpactSummary: (() => void) | null | undefined,
    onOpenImpactModel?:
      | ((filePath: string, navigation?: { openInNewLeaf?: boolean }) => void)
      | null
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

    this.renderDetailCard(section, [
      {
        label: this.t("relationship.referencesFromThisObject"),
        value: String(summary.outboundRelationships.length)
      },
      {
        label: this.t("relationship.referencedByThisObject"),
        value: String(summary.inboundRelationships.length)
      },
      ...(summary.modelType === "codeset"
        ? [
            {
              label: this.t("relationship.valueUsage"),
              value: String(summary.valueUsages.length)
            }
          ]
        : []),
      {
        label: this.t("relationship.unresolvedReferences"),
        value: String(summary.unresolvedOutbound.length)
      },
      {
        label: this.t("relationship.relatedSourceLinks"),
        value: String(summary.relatedSourceLinks.length)
      }
    ]);

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
        this.viewerPreferences.localSourceRoot
      )
    );
    this.renderImpactSummarySection(
      shell.bottomPane,
      state.impactSummary,
      state.onCopyImpactSummary,
      state.onOpenImpactModel
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
        ...getClassDetailLabels(this.t),
        showMermaidRenderDebug: this.viewerPreferences.showMermaidRenderDebug
      });
    this.moveDetailSections(diagramRoot, shell.bottomPane);
    shell.topPane.appendChild(diagramRoot);
  }

  private renderDiagramState(state: Extract<PreviewState, { mode: "diagram" }>): void {
    const filePath = state.diagram.diagram.path;
    const shell = this.createViewerSplitShell(`diagram:${filePath}`, 0.64);
    shell.bottomPane.addClass("model-weave-collection-diagram-lower-pane");
    const lowerSlots = this.createCollectionDiagramLowerPaneSlots(shell.bottomPane);
    this.activeScrollContainer = shell.bottomPane;
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
        ...getDfdDetailLabels(this.t),
        ...getClassDetailLabels(this.t),
        showMermaidRenderDebug: this.viewerPreferences.showMermaidRenderDebug
      });
      this.appendRendererSelection(diagramRoot, state.rendererSelection);
      this.moveDetailSections(diagramRoot, lowerSlots.details);
      this.renderImpactSummarySection(
        lowerSlots.impact,
        state.impactSummary,
        state.onCopyImpactSummary,
        state.onOpenImpactModel
      );
      this.renderAppliedColorScheme(
        lowerSlots.impact,
        state.colorScheme,
        this.getDiagramColorSchemeTargets(state.diagram)
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

  private isDfdDiagramModel(diagram: ResolvedDiagram["diagram"]): diagram is DfdDiagramModel {
    return diagram.schema === "dfd_diagram";
  }

  private createCollectionDiagramLowerPaneSlots(container: HTMLElement): {
    source: HTMLElement;
    diagnostics: HTMLElement;
    details: HTMLElement;
    impact: HTMLElement;
  } {
    const source = container.createDiv({
      cls: "model-weave-lower-pane-slot model-weave-lower-pane-source-slot"
    });
    const diagnostics = container.createDiv({
      cls: "model-weave-lower-pane-slot model-weave-lower-pane-diagnostics-slot"
    });
    const details = container.createDiv({
      cls: "model-weave-lower-pane-slot model-weave-lower-pane-details-slot"
    });
    const impact = container.createDiv({
      cls: "model-weave-lower-pane-slot model-weave-lower-pane-impact-slot"
    });
    return { source, diagnostics, details, impact };
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
  state: Extract<PreviewState, { mode: "summary" }>
): ScreenPreviewData {
  return {
    title: state.title,
    sourcePath: state.filePath,
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
    : createZoomToolbar("Wheel: zoom / Drag background: pan");
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
    : [{ label: "未分類 [unassigned]", items: [] }];

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

  if (notes.length > 0) {
    const t = createModelWeaveTranslator(toModelWeaveUiLanguage(language));
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

  if (warnings.length > 0) {
    const t = createModelWeaveTranslator(toModelWeaveUiLanguage(language));
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

  if (errors.length > 0) {
    const t = createModelWeaveTranslator(toModelWeaveUiLanguage(language));
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
    text: `${title} (${diagnostics.length})`
  });
  summary.addClass("model-weave-diagnostics-summary");
  summary.addClass("model-weave-preview-section-title");
  summary.addClass(summaryModifierClass);

  const list = details.createEl("ul", { cls: "model-weave-diagnostics-list" });

  for (const diagnostic of diagnostics) {
    const item = list.createEl("li", { cls: "model-weave-diagnostics-item" });
    item.textContent = localizeDiagnosticMessage(diagnostic.message, language);
    if (onOpenDiagnostic) {
      item.addClass("model-weave-diagnostics-item-clickable");
      item.addClass("model-weave-clickable");
      item.title = createModelWeaveTranslator(toModelWeaveUiLanguage(language))("diagnostics.openInEditor");
      item.tabIndex = 0;
      item.onclick = () => {
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed) {
          return;
        }
        onOpenDiagnostic(diagnostic);
      };
      item.onkeydown = (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenDiagnostic(diagnostic);
        }
      };
    }
  }
}

function toModelWeaveUiLanguage(language: string | undefined): ModelWeaveUiLanguage {
  if (language === "en" || language === "ja" || language === "auto") {
    return language;
  }
  return "auto";
}
