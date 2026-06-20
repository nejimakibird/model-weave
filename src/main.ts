import {
  App,
  MarkdownView,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
  WorkspaceLeaf
} from "obsidian";
import { buildDfdObjectScene } from "./core/dfd-object-scene";
import { buildDomainRelationshipSummaries } from "./core/domain-relationships";
import { resolveAppProcessDomainPlacement } from "./core/app-process-domain-resolver";
import { resolveDomainDiagram } from "./core/domain-diagram-resolver";
import { resolveDefaultColorScheme } from "./core/color-scheme";
import { resolveObjectContext } from "./core/object-context-resolver";
import {
  buildCurrentDiagramDiagnostics,
  buildCurrentObjectDiagnostics
} from "./core/current-file-diagnostics";
import {
  buildImpactSummary,
  formatImpactSummaryAsMarkdown
} from "./core/impact-analyzer";
import { buildWeaveMapModel } from "./core/weave-map";
import { resolveDiagramRelations } from "./core/relation-resolver";
import {
  parseQualifiedRef,
  parseReferenceValue,
  resolveReferenceIdentity
} from "./core/reference-resolver";
import {
  resolveRenderMode,
  getSupportedRenderModes,
  type AnyRenderMode,
  type EffectiveRenderMode,
  type ResolvedRenderMode
} from "./core/render-mode";
import { detectFileType } from "./core/schema-detector";
import {
  isModelWeavePreviewSupportedFileType,
  SUPPORTED_MODEL_WEAVE_FORMAT_LIST
} from "./core/supported-formats";
import { openModelWeaveCompletion } from "./editor/model-weave-editor-suggest";
import { modelWeaveText } from "./i18n/language";
import { DiagramExportError } from "./export/png-export";
import {
  DEFAULT_MODEL_WEAVE_SETTINGS,
  DOMAIN_VIEW_MODE_SETTING_OPTIONS,
  normalizeModelWeaveSettings,
  type ModelWeaveSettings,
  type ModelWeaveViewerPreferences
} from "./settings/model-weave-settings";
import {
  MODEL_WEAVE_TEMPLATES,
  MODEL_WEAVE_RELATION_TEMPLATES,
  type ModelWeaveTemplateKey
} from "./templates/model-weave-templates";
import {
  buildVaultIndex,
  ensureVaultValidation,
  ensureMemberLookups,
  ensureRelationLookups,
  replaceVaultIndexFile,
  type ModelingVaultIndex
} from "./core/vault-index";
import {
  getMarkdownTableCellRanges,
  splitMarkdownTableRow
} from "./parsers/markdown-table";
import type {
  AppProcessModel,
  FileType,
  GenericFrontmatter,
  ImpactSummary,
  ParsedFileModel,
  ResolvedColorScheme,
  ValidationWarning
} from "./types/models";
import { openModelObjectNote } from "./utils/model-navigation";
import { buildWeaveMapMermaidSource } from "./renderers/weave-map-mermaid";
import {
  ModelingPreviewView,
  MODELING_PREVIEW_VIEW_TYPE,
  type PreviewUpdateReason
} from "./views/modeling-preview-view";
import { createModelWeaveTranslator } from "./i18n/messages";

const LEGACY_PREVIEW_VIEW_TYPES = [
  "mdspec-object-preview",
  "mdspec-relations-preview",
  "mdspec-diagram-preview"
] as const;

const UNSUPPORTED_MESSAGE =
  modelWeaveText(
    `This file format is not supported. Supported formats: ${SUPPORTED_MODEL_WEAVE_FORMAT_LIST}`,
    `このファイル形式はサポートされていません。対応形式: ${SUPPORTED_MODEL_WEAVE_FORMAT_LIST}`
  );
const DEPRECATED_ER_RELATION_MESSAGE =
  modelWeaveText(
    "This file format is not supported. Use er_entity with ## Relations instead of the legacy er_relation format.",
    "このファイル形式はサポートされていません。旧 er_relation 形式ではなく、er_entity の ## Relations を使ってください。"
  );
const DEPRECATED_DIAGRAM_MESSAGE =
  modelWeaveText(
    "This file format is not supported. Migrate legacy diagram_v1 files to class_diagram or er_diagram.",
    "このファイル形式はサポートされていません。旧 diagram_v1 ファイルは class_diagram または er_diagram に移行してください。"
  );
const MARKDOWN_ONLY_NOTICE =
  modelWeaveText(
    "Template insertion is available only for Markdown files.",
    "テンプレート挿入は Markdown ファイルでのみ利用できます。"
  );
const NON_EMPTY_FILE_NOTICE =
  modelWeaveText(
    "Current file is not empty. Template insertion is available only for empty files.",
    "現在のファイルは空ではありません。テンプレート挿入は空のファイルでのみ利用できます。"
  );
const ER_RELATION_TYPE_NOTICE =
  modelWeaveText(
    "ER relation block insertion is available only for er_entity files.",
    "ER relation block の挿入は er_entity ファイルでのみ利用できます。"
  );

const MODEL_WEAVE_DEFAULT_ZOOM_OPTIONS: readonly ModelWeaveSettings["defaultZoom"][] = [
  "fit",
  "100"
];
const MODEL_WEAVE_FONT_SIZE_OPTIONS: readonly ModelWeaveSettings["fontSize"][] = [
  "small",
  "normal",
  "large"
];
const MODEL_WEAVE_NODE_DENSITY_OPTIONS: readonly ModelWeaveSettings["nodeDensity"][] = [
  "compact",
  "normal",
  "relaxed"
];
const MODEL_WEAVE_UI_LANGUAGE_OPTIONS: readonly ModelWeaveSettings["uiLanguage"][] = [
  "auto",
  "en",
  "ja"
];
const CLASS_RENDER_MODE_OPTIONS: readonly ModelWeaveSettings["defaultClassRenderMode"][] = [
  "custom",
  "mermaid",
  "mermaid-detail"
];
const ER_RENDER_MODE_OPTIONS: readonly ModelWeaveSettings["defaultErRenderMode"][] = [
  "custom",
  "mermaid",
  "mermaid-detail"
];
const DFD_RENDER_MODE_OPTIONS: readonly ModelWeaveSettings["defaultDfdRenderMode"][] = [
  "mermaid"
];
const PROCESS_RENDER_MODE_OPTIONS: readonly ModelWeaveSettings["defaultProcessRenderMode"][] = [
  "custom"
];
const SCREEN_RENDER_MODE_OPTIONS: readonly ModelWeaveSettings["defaultScreenRenderMode"][] = [
  "custom"
];
const DOMAIN_VIEW_MODE_OPTIONS: readonly ModelWeaveSettings["defaultDomainsViewMode"][] = [
  "mindmap",
  "area",
  "tree"
];

function isClassRenderModeOption(
  value: string
): value is ModelWeaveSettings["defaultClassRenderMode"] {
  return CLASS_RENDER_MODE_OPTIONS.some((candidate) => candidate === value);
}

function isErRenderModeOption(
  value: string
): value is ModelWeaveSettings["defaultErRenderMode"] {
  return ER_RENDER_MODE_OPTIONS.some((candidate) => candidate === value);
}

function isDfdRenderModeOption(
  value: string
): value is ModelWeaveSettings["defaultDfdRenderMode"] {
  return DFD_RENDER_MODE_OPTIONS.some((candidate) => candidate === value);
}

function isProcessRenderModeOption(
  value: string
): value is ModelWeaveSettings["defaultProcessRenderMode"] {
  return PROCESS_RENDER_MODE_OPTIONS.some((candidate) => candidate === value);
}

function isScreenRenderModeOption(
  value: string
): value is ModelWeaveSettings["defaultScreenRenderMode"] {
  return SCREEN_RENDER_MODE_OPTIONS.some((candidate) => candidate === value);
}

function isDomainViewModeOption(
  value: string
): value is ModelWeaveSettings["defaultDomainsViewMode"] {
  return DOMAIN_VIEW_MODE_OPTIONS.some((candidate) => candidate === value);
}

function isDefaultZoomOption(
  value: string
): value is ModelWeaveSettings["defaultZoom"] {
  return MODEL_WEAVE_DEFAULT_ZOOM_OPTIONS.some((candidate) => candidate === value);
}

function isFontSizeOption(
  value: string
): value is ModelWeaveSettings["fontSize"] {
  return MODEL_WEAVE_FONT_SIZE_OPTIONS.some((candidate) => candidate === value);
}

function isNodeDensityOption(
  value: string
): value is ModelWeaveSettings["nodeDensity"] {
  return MODEL_WEAVE_NODE_DENSITY_OPTIONS.some((candidate) => candidate === value);
}

function isUiLanguageOption(
  value: string
): value is ModelWeaveSettings["uiLanguage"] {
  return MODEL_WEAVE_UI_LANGUAGE_OPTIONS.some((candidate) => candidate === value);
}

function getFrontmatterValue(frontmatter: unknown, key: string): unknown {
  if (typeof frontmatter !== "object" || frontmatter === null) {
    return undefined;
  }
  return (frontmatter as Record<string, unknown>)[key];
}

export default class ModelWeavePlugin extends Plugin {
  private index: ModelingVaultIndex | null = null;
  private previewLeaf: WorkspaceLeaf | null = null;
  private readonly rendererOverridesByFilePath = new Map<string, AnyRenderMode>();
  private rendererOverrideFilePath: string | null = null;
  private settings: ModelWeaveSettings = DEFAULT_MODEL_WEAVE_SETTINGS;

  async onload(): Promise<void> {
    this.settings = normalizeModelWeaveSettings(await this.loadData());

    this.registerView(
      MODELING_PREVIEW_VIEW_TYPE,
      (leaf) => new ModelingPreviewView(leaf, this.getViewerPreferences(), {
        onOpenPreviewInMainPane: (filePath: string) => {
          void this.openPreviewForPathInPane(filePath, "main");
        },
        onOpenPreviewInNewPane: (filePath: string) => {
          void this.openPreviewForPathInPane(filePath, "new");
        },
        onOpenModelFile: (filePath: string) => {
          void this.openReferencedFile(filePath);
        }
      })
    );
    this.registerHoverLinkSource("model-weave", {
      display: "Model Weave",
      defaultMod: false
    });
    this.addSettingTab(new ModelWeaveSettingTab(this.app, this));

    this.addCommand({
      id: "rebuild-modeling-index",
      name: "Rebuild modeling index",
      callback: async () => {
        await this.rebuildIndex({ parseMode: "full" });
        await this.syncPreviewToActiveFile(false, "rerender");
        new Notice("Modeling index rebuilt");
      }
    });

    this.addCommand({
      id: "open-modeling-preview",
      name: "Open modeling preview for active file",
      callback: async () => {
        await this.openPreviewForActiveFile();
      }
    });

    this.addCommand({
      id: "open-modeling-preview-in-main-pane",
      name: "Open modeling preview in main pane",
      callback: async () => {
        await this.openPreviewForCurrentFileInPane("main");
      }
    });

    this.addCommand({
      id: "open-modeling-preview-in-new-pane",
      name: "Open modeling preview in new pane",
      callback: async () => {
        await this.openPreviewForCurrentFileInPane("new");
      }
    });

    this.addCommand({
      id: "insert-class-template",
      name: "Insert class template",
      callback: async () => {
        await this.insertTemplateIntoActiveFile("class");
      }
    });

    this.addCommand({
      id: "insert-class-diagram-template",
      name: "Insert class diagram template",
      callback: async () => {
        await this.insertTemplateIntoActiveFile("classDiagram");
      }
    });

    this.addCommand({
      id: "insert-er-entity-template",
      name: "Insert entity template",
      callback: async () => {
        await this.insertTemplateIntoActiveFile("erEntity");
      }
    });

    this.addCommand({
      id: "insert-er-diagram-template",
      name: "Insert entity diagram template",
      callback: async () => {
        await this.insertTemplateIntoActiveFile("erDiagram");
      }
    });

    this.addCommand({
      id: "insert-dfd-object-template",
      name: "Insert data flow object template",
      callback: async () => {
        await this.insertTemplateIntoActiveFile("dfdObject");
      }
    });

    this.addCommand({
      id: "insert-dfd-diagram-template",
      name: "Insert data flow diagram template",
      callback: async () => {
        await this.insertTemplateIntoActiveFile("dfdDiagram");
      }
    });

    this.addCommand({
      id: "insert-data-object-template",
      name: "Insert data object template",
      callback: async () => {
        await this.insertTemplateIntoActiveFile("dataObject");
      }
    });

    this.addCommand({
      id: "insert-data-object-file-layout-template",
      name: "Insert data object file layout template",
      callback: async () => {
        await this.insertTemplateIntoActiveFile("dataObjectFileLayout");
      }
    });

    this.addCommand({
      id: "insert-app-process-template",
      name: "Insert app process template",
      callback: async () => {
        await this.insertTemplateIntoActiveFile("appProcess");
      }
    });

      this.addCommand({
        id: "insert-screen-template",
        name: "Insert screen template",
        callback: async () => {
          await this.insertTemplateIntoActiveFile("screen");
        }
      });

      this.addCommand({
        id: "insert-codeset-template",
        name: "Insert codeset template",
        callback: async () => {
          await this.insertTemplateIntoActiveFile("codeSet");
        }
      });

      this.addCommand({
        id: "insert-message-template",
        name: "Insert message template",
        callback: async () => {
          await this.insertTemplateIntoActiveFile("message");
        }
      });

      this.addCommand({
        id: "insert-rule-template",
        name: "Insert rule template",
        callback: async () => {
          await this.insertTemplateIntoActiveFile("rule");
        }
      });

      this.addCommand({
        id: "insert-mapping-template",
        name: "Insert mapping template",
        callback: async () => {
          await this.insertTemplateIntoActiveFile("mapping");
        }
      });

      this.addCommand({
        id: "insert-domains-template",
        name: "Insert domains template",
        callback: async () => {
          await this.insertTemplateIntoActiveFile("domains");
        }
      });

      this.addCommand({
        id: "insert-domain-diagram-template",
        name: "Insert domain diagram template",
        callback: async () => {
          await this.insertTemplateIntoActiveFile("domainDiagram");
        }
      });

      this.addCommand({
        id: "insert-color-scheme-template",
        name: "Insert color scheme template",
        callback: async () => {
          await this.insertTemplateIntoActiveFile("colorScheme");
        }
      });

    this.addCommand({
      id: "insert-er-relation-block",
      name: "Insert entity relation block",
      callback: async () => {
        await this.insertErRelationBlock();
      }
    });

    this.addCommand({
      id: "complete-current-field",
      name: "Complete current field",
      callback: async () => {
        await this.ensureMemberLookupIndex();
        openModelWeaveCompletion(this.app, () => this.index);
      }
    });

    this.addCommand({
      id: "export-current-diagram-as-png",
      name: "Export current diagram as PNG",
      callback: async () => {
        await this.exportCurrentDiagramAsPng();
      }
    });

    this.registerEvent(
      this.app.workspace.on("file-open", async () => {
        await this.syncPreviewToActiveFile(false, "external-file-open");
      })
    );

    this.registerEvent(
      this.app.workspace.on("active-leaf-change", async (leaf) => {
        if (leaf && this.isPreviewLeaf(leaf)) {
          return;
        }
        await this.syncPreviewToActiveFile(false, "external-file-open");
      })
    );

    this.registerEvent(
      this.app.vault.on("modify", async () => {
        await this.rebuildIndex();
        await this.syncPreviewToActiveFile(false, "rerender");
      })
    );
    this.registerEvent(
      this.app.vault.on("create", async () => {
        await this.rebuildIndex();
        await this.syncPreviewToActiveFile(false, "rerender");
      })
    );
    this.registerEvent(
      this.app.vault.on("delete", async () => {
        await this.rebuildIndex();
        await this.syncPreviewToActiveFile(false, "rerender");
      })
    );
    this.registerEvent(
      this.app.vault.on("rename", async () => {
        await this.rebuildIndex();
        await this.syncPreviewToActiveFile(false, "rerender");
      })
    );

    await this.rebuildIndex();
    this.app.workspace.onLayoutReady(() => {
      void this.normalizePreviewLeaves().then(() =>
        this.syncPreviewToActiveFile(true, "initial-open")
      );
    });
  }

  onunload(): void {
    if (this.previewLeaf) {
      this.previewLeaf.detach();
      this.previewLeaf = null;
    }
  }

  private async rebuildIndex(
    options: { parseMode?: "shallow" | "full" } = {}
  ): Promise<void> {
    const parseMode = options.parseMode ?? "shallow";
    const markdownFiles = this.app.vault.getMarkdownFiles();
    const files = parseMode === "full"
      ? await Promise.all(
          markdownFiles.map(async (file) => ({
            path: file.path,
            content: await this.app.vault.cachedRead(file)
          }))
        )
      : markdownFiles.map((file) => ({
          path: file.path,
          frontmatter: this.getCachedFrontmatter(file)
        }));

    this.index = buildVaultIndex(files, {
      parseMode,
      resolveRelations: parseMode === "full",
      indexMembers: parseMode === "full",
      validate: parseMode === "full"
    });
  }

  private getCachedFrontmatter(file: TFile): GenericFrontmatter | undefined {
    const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
    return frontmatter ? { ...frontmatter } : undefined;
  }

  private async ensureFullModelForFile(file: TFile): Promise<ParsedFileModel | null> {
    if (!this.index) {
      return null;
    }
    if (this.index.state.fullParsedFilePaths[file.path]) {
      return this.index.modelsByFilePath[file.path] ?? null;
    }

    const content = await this.app.vault.cachedRead(file);
    replaceVaultIndexFile(this.index, { path: file.path, content }, "full");
    return this.index.modelsByFilePath[file.path] ?? null;
  }

  private async ensureFullParsedFiles(
    shouldParse: (model: ParsedFileModel) => boolean
  ): Promise<void> {
    if (!this.index) {
      return;
    }

    const candidates = Object.values(this.index.modelsByFilePath)
      .filter(shouldParse)
      .map((model) => model.path);
    for (const filePath of candidates) {
      if (this.index.state.fullParsedFilePaths[filePath]) {
        continue;
      }
      const file = this.app.vault.getAbstractFileByPath(filePath);
      if (file instanceof TFile) {
        await this.ensureFullModelForFile(file);
      }
    }
  }

  private async ensureStandaloneDomainsValidationReady(): Promise<void> {
    if (!this.index) {
      return;
    }

    await this.ensureFullParsedFiles(
      (candidate) => candidate.fileType === "domains" || candidate.fileType === "dfd-diagram"
    );
    ensureVaultValidation(this.index);
  }

  private async ensureRelationLookupIndex(): Promise<void> {
    if (!this.index || this.index.state.relationLookupsBuilt) {
      return;
    }
    await this.ensureFullParsedFiles((model) => model.fileType === "relations");
    if (this.index) {
      ensureRelationLookups(this.index);
    }
  }

  private async ensureMemberLookupIndex(): Promise<void> {
    if (!this.index || this.index.state.memberLookupsBuilt) {
      return;
    }
    await this.ensureFullParsedFiles((model) =>
      [
        "object",
        "data-object",
        "app-process",
        "screen",
        "codeset",
        "message",
        "rule",
        "er-entity"
      ].includes(model.fileType)
    );
    if (this.index) {
      ensureMemberLookups(this.index);
    }
  }

  private async ensureImpactIndexReady(): Promise<void> {
    if (!this.index || !this.settings.enableRelationshipView) {
      return;
    }

    await this.ensureFullParsedFiles((model) =>
      [
        "object",
        "er-entity",
        "diagram",
        "dfd-object",
        "dfd-diagram",
        "data-object",
        "app-process",
        "screen",
        "rule",
        "codeset",
        "message",
        "mapping",
        "color-scheme"
      ].includes(model.fileType)
    );
    if (this.index) {
      ensureMemberLookups(this.index);
    }
  }

  private buildImpactPreviewProps(
    model: ParsedFileModel
  ): {
    impactSummary?: ImpactSummary;
    weaveMapMermaidSource?: string;
    colorScheme?: ResolvedColorScheme;
    onCopyImpactSummary?: (() => void) | null;
    onOpenImpactModel?: ((filePath: string, navigation?: { openInNewLeaf?: boolean }) => void) | null;
  } {
    if (
      !this.settings.enableRelationshipView ||
      !this.index ||
      model.fileType === "markdown" ||
      model.fileType === "relations"
    ) {
      return {};
    }

    const impactSummary = buildImpactSummary(model, this.index);
    const colorScheme = resolveDefaultColorScheme(
      this.index,
      this.settings.defaultColorSchemeRef
    ).colorScheme;
    const weaveMapMermaidSource = this.buildWeaveMapMermaidSource(
      impactSummary,
      colorScheme
    );
    return {
      impactSummary,
      weaveMapMermaidSource,
      colorScheme,
      onCopyImpactSummary: () => {
        void this.copyImpactSummary(impactSummary);
      },
      onOpenImpactModel: (filePath, navigation) => {
        void this.openReferencedFile(filePath, Boolean(navigation?.openInNewLeaf));
      }
    };
  }

  private buildWeaveMapMermaidSource(
    summary: ImpactSummary,
    colorScheme?: ResolvedColorScheme
  ): string | undefined {
    try {
      return buildWeaveMapMermaidSource(buildWeaveMapModel(summary), {
        colorScheme
      });
    } catch {
      return undefined;
    }
  }

  private async copyImpactSummary(summary: ImpactSummary): Promise<void> {
    try {
      await navigator.clipboard.writeText(formatImpactSummaryAsMarkdown(summary));
      new Notice("Relationship summary copied");
    } catch {
      new Notice("Failed to copy relationship summary");
    }
  }

  getSettings(): ModelWeaveSettings {
    return this.settings;
  }

  getViewerPreferences(): ModelWeaveViewerPreferences {
    return {
      defaultZoom: this.settings.defaultZoom,
      fontSize: this.settings.fontSize,
      nodeDensity: this.settings.nodeDensity,
      defaultDomainsViewMode: this.settings.defaultDomainsViewMode,
      defaultDomainDiagramViewMode: this.settings.defaultDomainDiagramViewMode,
      localSourceRoot: this.settings.localSourceRoot,
      uiLanguage: this.settings.uiLanguage,
      showMermaidRenderDebug: this.settings.showMermaidRenderDebug
    };
  }

  async updateSettings(
    partial: Partial<ModelWeaveSettings>,
    options?: { refreshViews?: boolean }
  ): Promise<void> {
    this.settings = normalizeModelWeaveSettings({
      ...this.settings,
      ...partial
    });
    await this.saveData(this.settings);
    if (options?.refreshViews === false) {
      return;
    }
    await this.refreshOpenModelWeaveViews();
  }

  async refreshOpenModelWeaveViews(): Promise<void> {
    const leaves = this.app.workspace.getLeavesOfType(MODELING_PREVIEW_VIEW_TYPE);
    for (const leaf of leaves) {
      await leaf.loadIfDeferred();
      const view = leaf.view;
      if (!(view instanceof ModelingPreviewView)) {
        continue;
      }

      view.applyViewerSettings(this.getViewerPreferences());
      const currentFilePath = view.getCurrentFilePath();
      if (!currentFilePath) {
        view.refreshForSettingsChange();
        continue;
      }

      const target = this.app.vault.getAbstractFileByPath(currentFilePath);
      if (target instanceof TFile) {
        await this.showPreviewForFile(target, leaf, false, "rerender");
      } else {
        view.refreshForSettingsChange();
      }
    }
  }

  private async openPreviewForActiveFile(): Promise<void> {
    if (!this.index) {
      await this.rebuildIndex();
    }

    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new Notice(modelWeaveText("No active Markdown file.", "アクティブな Markdown ファイルがありません。"));
      return;
    }

    await this.showPreviewForFile(file, undefined, true, "external-file-open");
  }

  private async openPreviewForCurrentFileInPane(target: "main" | "new"): Promise<void> {
    if (!this.index) {
      await this.rebuildIndex();
    }

    const file = this.getCurrentPreviewCommandFile();
    if (!file) {
      new Notice(modelWeaveText("No active Model Weave file.", "アクティブな Model Weave ファイルがありません。"));
      return;
    }

    await this.openPreviewForFileInPane(file, target);
  }

  private async openPreviewForPathInPane(filePath: string, target: "main" | "new"): Promise<void> {
    if (!this.index) {
      await this.rebuildIndex();
    }

    const abstractFile = this.app.vault.getAbstractFileByPath(filePath);
    if (!(abstractFile instanceof TFile)) {
      new Notice(modelWeaveText("Preview source file was not found.", "Preview の元ファイルが見つかりません。"));
      return;
    }

    await this.openPreviewForFileInPane(abstractFile, target);
  }

  private async openPreviewForFileInPane(file: TFile, target: "main" | "new"): Promise<void> {
    const leaf = target === "new"
      ? this.app.workspace.getLeaf(true)
      : this.app.workspace.getLeaf(false);

    await this.showPreviewForFile(file, leaf, true, "initial-open", {
      managePreviewLeaf: false
    });
    this.app.workspace.setActiveLeaf(leaf, { focus: true });
  }

  private getCurrentPreviewCommandFile(): TFile | null {
    const activePreviewPath = this.getActivePreviewFilePath();
    if (activePreviewPath) {
      const previewFile = this.app.vault.getAbstractFileByPath(activePreviewPath);
      if (previewFile instanceof TFile) {
        return previewFile;
      }
    }

    const activeFile = this.app.workspace.getActiveFile();
    if (activeFile) {
      return activeFile;
    }

    const managedPreviewPath = this.getManagedPreviewFilePath();
    if (managedPreviewPath) {
      const previewFile = this.app.vault.getAbstractFileByPath(managedPreviewPath);
      if (previewFile instanceof TFile) {
        return previewFile;
      }
    }

    return null;
  }

  private getActivePreviewFilePath(): string | null {
    const mostRecentLeaf = this.app.workspace.getMostRecentLeaf();
    if (!mostRecentLeaf || !this.isPreviewLeaf(mostRecentLeaf)) {
      return null;
    }

    const view = mostRecentLeaf.view;
    return view instanceof ModelingPreviewView ? view.getCurrentFilePath() : null;
  }

  private getManagedPreviewFilePath(): string | null {
    if (!this.previewLeaf || !this.isPreviewLeaf(this.previewLeaf)) {
      return null;
    }

    const view = this.previewLeaf.view;
    return view instanceof ModelingPreviewView ? view.getCurrentFilePath() : null;
  }

  private async exportCurrentDiagramAsPng(): Promise<void> {
    const view = await this.findExportableModelWeaveView();
    if (!view) {
      new Notice(modelWeaveText(
        "No exportable diagram is currently displayed.",
        "現在、エクスポートできる diagram は表示されていません。"
      ));
      return;
    }

    try {
      const exportPath = await view.exportCurrentDiagramAsPng();
      if (!exportPath) {
        new Notice("The current view is not ready for export.");
        return;
      }

      new Notice(`Diagram exported: ${exportPath}`);
    } catch (error) {
      if (error instanceof DiagramExportError) {
        if (error.code === "bounds-invalid") {
          new Notice("The current diagram has no measurable export bounds.");
          return;
        }

        new Notice("Failed to export the current diagram as PNG.");
        return;
      }

      new Notice("Failed to export the current diagram as PNG.");
    }
  }

  private async insertTemplateIntoActiveFile(
    templateKey: ModelWeaveTemplateKey
  ): Promise<void> {
    const target = await this.getActiveMarkdownTarget();
    if (!target) {
      new Notice(MARKDOWN_ONLY_NOTICE);
      return;
    }

    const currentContent = target.getContent();
    if (currentContent.trim().length > 0) {
      new Notice(NON_EMPTY_FILE_NOTICE);
      return;
    }

    await target.setContent(MODEL_WEAVE_TEMPLATES[templateKey]);
  }

  private async insertErRelationBlock(): Promise<void> {
    const target = await this.getActiveMarkdownTarget();
    if (!target) {
      new Notice(MARKDOWN_ONLY_NOTICE);
      return;
    }

    if (this.getActiveFileType(target.file) !== "er_entity") {
      new Notice(ER_RELATION_TYPE_NOTICE);
      return;
    }

    const lineEnding = this.detectLineEnding(target.getContent());
    const block = MODEL_WEAVE_RELATION_TEMPLATES.erRelationBlock.join(lineEnding);
    const nextContent = this.appendErRelationBlock(target.getContent(), block, lineEnding);
    await target.setContent(nextContent);
  }

  private async getActiveMarkdownTarget():
    Promise<
    | {
        file: TFile;
        getContent: () => string;
        setContent: (content: string) => Promise<void>;
      }
    | null
  > {
    const file = this.app.workspace.getActiveFile();
    if (!file || file.extension !== "md") {
      return null;
    }

    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (activeView?.file?.path === file.path) {
      return {
        file,
        getContent: () => activeView.editor.getValue(),
        setContent: async (content: string) => {
          activeView.editor.setValue(content);
          await this.app.vault.modify(file, content);
        }
      };
    }

    const cachedContent = await this.app.vault.cachedRead(file);
    return {
      file,
      getContent: () => cachedContent,
      setContent: async (content: string) => {
        await this.app.vault.modify(file, content);
      }
    };
  }

  private getActiveFileType(file: TFile): string | undefined {
    const frontmatterType = getFrontmatterValue(
      this.app.metadataCache.getFileCache(file)?.frontmatter,
      "type"
    );
    if (typeof frontmatterType === "string" && frontmatterType.trim()) {
      return frontmatterType.trim();
    }

    return undefined;
  }

  private detectLineEnding(content: string): string {
    return content.includes("\r\n") ? "\r\n" : "\n";
  }

  private appendErRelationBlock(
    content: string,
    block: string,
    lineEnding: string
  ): string {
    const section = this.findSection(content, "Relations");
    if (section) {
      const after = content.slice(section.end);
      const sectionText = content.slice(section.start, section.end).replace(/\s*$/u, "");
      const updatedSection = `${sectionText}${lineEnding}${lineEnding}${block}${lineEnding}`;
      return `${content.slice(0, section.start)}${updatedSection}${after.replace(/^\s*/u, "")}`;
    }

    const relationsSection = `## Relations${lineEnding}${lineEnding}${block}${lineEnding}`;
    return this.insertSectionBeforeNotesOrEnd(content, relationsSection, lineEnding);
  }

  private insertSectionBeforeNotesOrEnd(
    content: string,
    sectionContent: string,
    lineEnding: string
  ): string {
    const notesSection = this.findSection(content, "Notes");
    const trimmedSection = sectionContent.replace(/\s*$/u, "");

    if (notesSection) {
      const before = content.slice(0, notesSection.start).replace(/\s*$/u, "");
      const after = content.slice(notesSection.start).replace(/^\s*/u, "");
      return `${before}${lineEnding}${lineEnding}${trimmedSection}${lineEnding}${lineEnding}${after}`;
    }

    const trimmedContent = content.replace(/\s*$/u, "");
    if (!trimmedContent) {
      return `${trimmedSection}${lineEnding}`;
    }

    return `${trimmedContent}${lineEnding}${lineEnding}${trimmedSection}${lineEnding}`;
  }

  private findSection(
    content: string,
    sectionName: string
  ): { start: number; end: number } | null {
    const headingRegex = new RegExp(`^##\\s+${sectionName}\\s*$`, "m");
    const headingMatch = headingRegex.exec(content);
    if (!headingMatch || headingMatch.index === undefined) {
      return null;
    }

    const start = headingMatch.index;
    const searchStart = start + headingMatch[0].length;
    const remainder = content.slice(searchStart);
    const nextHeadingMatch = /^##\s+/m.exec(remainder);
    const end = nextHeadingMatch && nextHeadingMatch.index !== undefined
      ? searchStart + nextHeadingMatch.index
      : content.length;

    return { start, end };
  }

  private async syncPreviewToActiveFile(
    openIfSupported = false,
    reason: PreviewUpdateReason = "rerender"
  ): Promise<void> {
    const file = this.app.workspace.getActiveFile();
    const previewLeaf = this.getManagedPreviewLeaf();

    if (!file) {
      if (previewLeaf) {
        await this.updateEmptyState(previewLeaf, [], undefined, reason);
      }
      return;
    }

    if (!this.index) {
      await this.rebuildIndex();
    }

      if (
        this.rendererOverrideFilePath !== null &&
        this.rendererOverrideFilePath !== file.path
      ) {
        this.rendererOverridesByFilePath.clear();
        this.rendererOverrideFilePath = null;
      }

      const model = this.index?.modelsByFilePath[file.path];
      const fileType = model ? detectFileType(model.frontmatter) : "markdown";
      const isSupported = isModelWeavePreviewSupportedFileType(fileType);

    if (!previewLeaf && !openIfSupported) {
      return;
    }

    if (previewLeaf && reason === "external-file-open") {
      await previewLeaf.loadIfDeferred();
      const currentView = previewLeaf.view;
      if (
        currentView instanceof ModelingPreviewView &&
        currentView.getCurrentFilePath() === file.path
      ) {
        return;
      }
    }

    if (!isSupported) {
      if (previewLeaf) {
        await this.updateEmptyState(
          previewLeaf,
          [],
          await this.getEmptyStateMessage(file),
          reason
        );
      }
      return;
    }

    await this.showPreviewForFile(
      file,
      previewLeaf ?? undefined,
      openIfSupported,
      reason
    );
  }

  private async showPreviewForFile(
    file: TFile,
    preferredLeaf?: WorkspaceLeaf,
    activate = true,
    reason: PreviewUpdateReason = "rerender",
    options?: { managePreviewLeaf?: boolean }
  ): Promise<void> {
    if (!this.index) {
      await this.rebuildIndex();
    }

    if (!this.index) {
      return;
    }

    const model = await this.ensureFullModelForFile(file);
    const leaf = await this.ensurePreviewLeaf(
      preferredLeaf,
      activate,
      options?.managePreviewLeaf ?? true
    );
    await leaf.loadIfDeferred();
    const view = leaf.view;
    if (!(view instanceof ModelingPreviewView)) {
      return;
    }
    view.applyViewerSettings(this.getViewerPreferences());

      if (!model) {
        view.updateContent({
          mode: "empty",
          message: await this.getEmptyStateMessage(file),
          warnings: []
        }, reason);
        return;
      }

      const fileType = detectFileType(model.frontmatter);
      const renderMode = this.resolveFileRenderMode(
        file.path,
        fileType,
        model.frontmatter,
        "kind" in model && typeof model.kind === "string" ? model.kind : null
      );
      const renderModeWarnings = renderMode.diagnostics;
      const rendererSelection = this.buildRendererSelectionState(
        file.path,
        renderMode,
        fileType,
        "kind" in model && typeof model.kind === "string" ? model.kind : null
      );
      await this.ensureImpactIndexReady();
      const impactPreviewProps = this.buildImpactPreviewProps(
        this.index.modelsByFilePath[file.path] ?? model
      );

      switch (fileType) {
      case "object":
      case "er-entity": {
        const objectModel =
          model.fileType === "object" || model.fileType === "er-entity" ? model : null;
          if (objectModel?.fileType === "object") {
            await this.ensureFullParsedFiles((candidate) => candidate.fileType === "object");
            await this.ensureRelationLookupIndex();
          } else if (objectModel?.fileType === "er-entity") {
            await this.ensureFullParsedFiles((candidate) => candidate.fileType === "er-entity");
          }
          const context =
            objectModel && this.index
              ? resolveObjectContext(objectModel, this.index)
              : null;
          const warnings = [
            ...(this.index.warningsByFilePath[file.path] ?? []),
            ...renderModeWarnings,
            ...(context?.warnings ?? [])
          ];
          if (
            renderMode.actualRenderer === "mermaid" &&
            context &&
            !context.relatedObjects.some((entry) => entry.direction === "outgoing")
          ) {
            warnings.push({
              code: "invalid-structure",
              message: "Mermaid overview: no outbound relations to display.",
              severity: "info",
              filePath: file.path,
              section: "Relations"
            });
          }

          if (objectModel) {
          const diagnostics = buildCurrentObjectDiagnostics(
            objectModel,
            this.index,
            context,
            warnings
          );
          view.updateContent({
              mode: "object",
              model: objectModel,
              context,
              ...impactPreviewProps,
              warnings: diagnostics,
              rendererSelection,
              onOpenDiagnostic: (diagnostic) => {
                void this.openDiagnosticLocation(file.path, diagnostic);
              },
            onOpenObject: (objectId, navigation) => {
              void this.openObjectNote(objectId, file.path, navigation);
            }
          }, reason);
        } else {
          view.updateContent({
            mode: "empty",
            message: UNSUPPORTED_MESSAGE,
            warnings: []
          }, reason);
        }
          return;
        }
        case "dfd-object": {
          const dfdObject = model.fileType === "dfd-object" ? model : null;
          const warnings = [
            ...(this.index.warningsByFilePath[file.path] ?? []),
            ...renderModeWarnings
          ];
          if (dfdObject) {
            const diagnostics = buildCurrentObjectDiagnostics(
              dfdObject,
              this.index,
              null,
              warnings
            );
            const diagram = buildDfdObjectScene(dfdObject);
            view.updateContent({
                mode: "dfd-object",
                model: dfdObject,
                diagram,
                ...impactPreviewProps,
                warnings: [...diagnostics, ...diagram.warnings],
                rendererSelection,
                onOpenDiagnostic: (diagnostic) => {
                  void this.openDiagnosticLocation(file.path, diagnostic);
                },
              onOpenObject: (objectId, navigation) => {
                void this.openObjectNote(objectId, file.path, navigation);
              }
            }, reason);
          } else {
            view.updateContent({
              mode: "empty",
              message: UNSUPPORTED_MESSAGE,
              warnings: []
            }, reason);
          }
          return;
        }
        case "diagram": {
          if (model.fileType === "diagram") {
            if (model.kind === "er") {
              await this.ensureFullParsedFiles((candidate) => candidate.fileType === "er-entity");
            } else {
              await this.ensureFullParsedFiles((candidate) => candidate.fileType === "object");
              await this.ensureRelationLookupIndex();
            }
          }
          const resolved =
            model.fileType === "diagram" && this.index
              ? resolveDiagramRelations(model, this.index)
              : null;
            const warnings = [
              ...(this.index.warningsByFilePath[file.path] ?? []),
              ...renderModeWarnings,
              ...(resolved?.warnings ?? [])
            ];
        const diagnostics = resolved
          ? buildCurrentDiagramDiagnostics(resolved, warnings)
          : warnings;
        view.updateContent(
          resolved
            ? {
                    mode: "diagram",
                    diagram: resolved,
                    ...impactPreviewProps,
                    warnings: diagnostics,
                    rendererSelection,
                    onOpenDiagnostic: (diagnostic) => {
                      void this.openDiagnosticLocation(file.path, diagnostic);
                    },
                onOpenObject: (objectId, navigation) => {
                  void this.openObjectNote(objectId, file.path, navigation);
                }
              }
            : {
                mode: "empty",
                message: UNSUPPORTED_MESSAGE,
                warnings: []
              },
          reason
          );
          return;
        }
        case "dfd-diagram": {
          if (model.fileType === "dfd-diagram") {
            await this.ensureFullParsedFiles((candidate) =>
              candidate.fileType === "dfd-object" ||
              candidate.fileType === "color-scheme" ||
              candidate.fileType === "domains"
            );
          }
          const colorSchemeResult = resolveDefaultColorScheme(
            this.index,
            this.settings.defaultColorSchemeRef
          );
          const resolved =
            model.fileType === "dfd-diagram" && this.index
              ? resolveDiagramRelations(model, this.index)
              : null;
          const warnings = [
            ...(this.index.warningsByFilePath[file.path] ?? []),
            ...renderModeWarnings,
            ...colorSchemeResult.warnings,
            ...(resolved?.warnings ?? [])
          ];
          const diagnostics = resolved
            ? buildCurrentDiagramDiagnostics(resolved, warnings)
            : warnings;
          view.updateContent(
            resolved
              ? {
                  mode: "diagram",
                  diagram: resolved,
                  ...impactPreviewProps,
                  warnings: diagnostics,
                  colorScheme: colorSchemeResult.colorScheme,
                  rendererSelection,
                  onOpenDiagnostic: (diagnostic) => {
                    void this.openDiagnosticLocation(file.path, diagnostic);
                  },
                  onOpenObject: (objectId, navigation) => {
                    void this.openObjectNote(objectId, file.path, navigation);
                  }
                }
              : {
                  mode: "empty",
                  message: UNSUPPORTED_MESSAGE,
                  warnings: []
                },
            reason
          );
          return;
        }
        case "data-object": {
          await this.ensureMemberLookupIndex();
          const warnings = [
            ...(this.index.warningsByFilePath[file.path] ?? []),
            ...renderModeWarnings
          ];
          if (model.fileType === "data-object") {
            const diagnostics = buildCurrentObjectDiagnostics(
              model,
              this.index,
              null,
              warnings
            );
            view.updateContent({
              mode: "summary",
              rendererSelection,
              ...impactPreviewProps,
              filePath: model.path,
              title: model.name || model.id || this.getPathBasename(model.path),
              sourceLinks: model.sourceLinks,
              metadata: [
                { label: "type", value: "data_object" },
                { label: "id", value: model.id || "(missing)" },
                { label: "name", value: model.name || "(missing)" },
                ...(model.kind ? [{ label: "kind", value: model.kind }] : []),
                ...(model.dataFormat ? [{ label: "data_format", value: model.dataFormat }] : []),
                { label: "path", value: model.path }
              ],
              sections: this.describeDataObjectSections(model, file.path),
              counts: [
                { label: "Format entries", value: model.formatEntries.length },
                { label: "Records", value: model.records.length },
                { label: "Fields", value: model.fields.length }
              ],
              tables: this.buildDataObjectSummaryTables(model, file.path),
              warnings: diagnostics,
              onNavigateToLocation: (location) => {
                void this.openFileLocation(file.path, location.line, location.ch ?? 0);
              }
            }, reason);
          } else {
            view.updateContent({
              mode: "empty",
              message: UNSUPPORTED_MESSAGE,
              warnings: []
            }, reason);
          }
          return;
        }
          case "app-process": {
              await this.ensureMemberLookupIndex();
              await this.ensureFullParsedFiles((candidate) =>
                candidate.fileType === "color-scheme" ||
                candidate.fileType === "domains"
              );
              const colorSchemeResult = resolveDefaultColorScheme(
                this.index,
                this.settings.defaultColorSchemeRef
              );
              const warnings = [
                ...(this.index.warningsByFilePath[file.path] ?? []),
                ...renderModeWarnings,
                ...colorSchemeResult.warnings
              ];
            if (model.fileType === "app-process") {
              const domainPlacement = resolveAppProcessDomainPlacement(
                model,
                this.index
              );
              const diagnostics = buildCurrentObjectDiagnostics(
                model,
              this.index,
              null,
              [
                ...warnings,
                ...this.buildAppProcessBusinessFlowWarnings(model),
                ...domainPlacement.warnings
              ]
            );
            view.updateContent({
              mode: "summary",
              rendererSelection,
              ...impactPreviewProps,
              filePath: model.path,
              title: model.name || model.id || this.getPathBasename(model.path),
              sourceLinks: model.sourceLinks,
                metadata: [
                  { label: "type", value: "app_process" },
                  { label: "id", value: model.id || "(missing)" },
                  { label: "name", value: model.name || "(missing)" },
                  ...(model.kind ? [{ label: "kind", value: model.kind }] : []),
                  { label: "path", value: model.path }
                ],
                sections: this.describeAppProcessSections(model, file.path),
                counts: [
                  { label: "Triggers", value: model.triggers.length },
                  { label: "Inputs", value: model.inputs.length },
                  { label: "Outputs", value: model.outputs.length },
                  { label: "Transitions", value: model.transitions.length },
                  ...(model.steps?.length
                    ? [{ label: "Steps", value: model.steps.length }]
                    : []),
                  ...(model.hasExplicitFlows
                    ? [{ label: "Flows", value: model.flows?.length ?? 0 }]
                    : []),
                  ...(model.domains.length > 0
                    ? [{ label: "Domains", value: model.domains.length }]
                    : []),
                  ...(model.domainSources.length > 0
                    ? [{ label: "Domain Sources", value: model.domainSources.length }]
                    : [])
                ],
                textSections: this.buildAppProcessTextSections(model),
                tables: this.buildAppProcessSummaryTables(model, file.path),
                appProcessDomainPlacement: domainPlacement,
                businessFlow:
                  (model.steps?.length ?? 0) > 0
                    ? {
                        title: model.name || model.id,
                        steps: model.steps ?? [],
                        flows: model.flows ?? [],
                        hasExplicitFlows: Boolean(model.hasExplicitFlows),
                        domains: domainPlacement.domains.length > 0
                          ? domainPlacement.domains
                          : model.domains
                      }
                    : undefined,
              colorScheme: colorSchemeResult.colorScheme,
              warnings: diagnostics,
              onNavigateToLocation: (location) => {
                void this.openFileLocation(file.path, location.line, location.ch ?? 0);
              }
            }, reason);
          } else {
            view.updateContent({
              mode: "empty",
              message: UNSUPPORTED_MESSAGE,
              warnings: []
            }, reason);
          }
          return;
        }
            case "screen": {
                  await this.ensureMemberLookupIndex();
                  const warnings = [
                    ...(this.index.warningsByFilePath[file.path] ?? []),
                    ...renderModeWarnings
                  ];
               if (model.fileType === "screen") {
                const diagnostics = buildCurrentObjectDiagnostics(
                  model,
                this.index,
                null,
                warnings
              );
              const localProcesses = model.localProcesses.length > 0
                ? model.localProcesses.map((process) => ({
                    label: process.heading,
                    line: process.line,
                    ch: 0
                  }))
                : this.collectScreenLocalProcesses(file.path);
              const invokedProcesses = this.collectScreenInvokedProcesses(model);
              const outgoingScreens = this.collectScreenOutgoingScreens(model);
              const screenPreviewTransitions = this.buildScreenPreviewTransitions(model);
              view.updateContent({
                  mode: "summary",
                  summaryKind: "screen",
                  rendererSelection,
                  ...impactPreviewProps,
                filePath: model.path,
                title: model.name || model.id || this.getPathBasename(model.path),
                sourceLinks: model.sourceLinks,
                  metadata: [
                  { label: "type", value: "screen" },
                  { label: "id", value: model.id || "(missing)" },
                  { label: "name", value: model.name || "(missing)" },
                  ...(model.screenType
                    ? [{ label: "screen_type", value: model.screenType }]
                    : []),
                    { label: "path", value: model.path }
                  ],
                  sections: this.describeScreenSections(model, file.path),
                  counts: [
                    { label: "Layouts", value: model.layouts.length },
                    { label: "Fields", value: model.fields.length },
                    { label: "Actions", value: model.actions.length },
                    { label: "Messages", value: model.messages.length },
                    {
                      label: "Local processes",
                      value: localProcesses.length
                    },
                    { label: "Invoked processes", value: invokedProcesses.length },
                    { label: "Outgoing screens", value: outgoingScreens.length }
                  ],
                  tables: this.buildScreenSummaryTables(model, file.path),
                  layoutBlocks: this.buildScreenLayoutBlocks(model),
                  screenPreviewTransitions,
                  localProcesses,
                  navigationLists: [
                    { title: "Invoked processes", items: invokedProcesses },
                    { title: "Transitions / Outgoing screens", items: outgoingScreens }
                  ],
                warnings: diagnostics,
                onNavigateToLocation: (location) => {
                void this.openFileLocation(file.path, location.line, location.ch ?? 0);
                },
                onOpenLinkedFile: (targetPath, navigation) => {
                  void this.openReferencedFile(
                    targetPath,
                    navigation?.openInNewLeaf ?? false
                  );
                }
              }, reason);
          } else {
            view.updateContent({
              mode: "empty",
              message: UNSUPPORTED_MESSAGE,
              warnings: []
            }, reason);
            }
            return;
          }
          case "codeset": {
              const warnings = [
                ...(this.index.warningsByFilePath[file.path] ?? []),
                ...renderModeWarnings
              ];
            if (model.fileType === "codeset") {
              const diagnostics = buildCurrentObjectDiagnostics(
                model,
                this.index,
                null,
                warnings
              );
              view.updateContent({
                  mode: "summary",
                  rendererSelection,
                ...impactPreviewProps,
                filePath: model.path,
                title: model.name || model.id || this.getPathBasename(model.path),
                sourceLinks: model.sourceLinks,
                metadata: [
                  { label: "type", value: "codeset" },
                  { label: "id", value: model.id || "(missing)" },
                  { label: "name", value: model.name || "(missing)" },
                  ...(model.kind ? [{ label: "kind", value: model.kind }] : []),
                  { label: "path", value: model.path }
                ],
                sections: this.describeCodeSetSections(model, file.path),
                counts: [{ label: "Values", value: model.values.length }],
                textSections: [
                  ...(model.summary?.trim()
                    ? [{ title: "Summary", lines: [model.summary.trim()] }]
                    : []),
                  ...((model.notes ?? []).length > 0
                    ? [{ title: "Notes", lines: model.notes ?? [] }]
                    : [])
                ],
                tables: this.buildCodeSetSummaryTables(file.path),
                warnings: diagnostics,
                onNavigateToLocation: (location) => {
                  void this.openFileLocation(file.path, location.line, location.ch ?? 0);
                }
                }, reason);
              } else {
                view.updateContent({
                  mode: "empty",
                  message: UNSUPPORTED_MESSAGE,
                  warnings: []
                }, reason);
              }
              return;
            }
          case "message": {
              const warnings = [
                ...(this.index.warningsByFilePath[file.path] ?? []),
                ...renderModeWarnings
              ];
            if (model.fileType === "message") {
              const diagnostics = buildCurrentObjectDiagnostics(
                model,
                this.index,
                null,
                warnings
              );
              view.updateContent({
                  mode: "summary",
                  rendererSelection,
                ...impactPreviewProps,
                filePath: model.path,
                title: model.name || model.id || this.getPathBasename(model.path),
                sourceLinks: model.sourceLinks,
                metadata: [
                  { label: "type", value: "message" },
                  { label: "id", value: model.id || "(missing)" },
                  { label: "name", value: model.name || "(missing)" },
                  ...(model.kind ? [{ label: "kind", value: model.kind }] : []),
                  { label: "path", value: model.path }
                ],
                sections: this.describeMessageSections(model, file.path),
                counts: [{ label: "Messages", value: model.messages.length }],
                textSections: [
                  ...(model.summary?.trim()
                    ? [{ title: "Summary", lines: [model.summary.trim()] }]
                    : []),
                  ...((model.notes ?? []).length > 0
                    ? [{ title: "Notes", lines: model.notes ?? [] }]
                    : [])
                ],
                tables: this.buildMessageSummaryTables(file.path),
                warnings: diagnostics,
                onNavigateToLocation: (location) => {
                  void this.openFileLocation(file.path, location.line, location.ch ?? 0);
                }
              }, reason);
            } else {
              view.updateContent({
                mode: "empty",
                message: UNSUPPORTED_MESSAGE,
                warnings: []
              }, reason);
            }
            return;
          }
          case "rule": {
              await this.ensureMemberLookupIndex();
              const warnings = [
                ...(this.index.warningsByFilePath[file.path] ?? []),
                ...renderModeWarnings
              ];
            if (model.fileType === "rule") {
              const diagnostics = buildCurrentObjectDiagnostics(
                model,
                this.index,
                null,
                warnings
              );
              view.updateContent({
                  mode: "summary",
                  rendererSelection,
                ...impactPreviewProps,
                filePath: model.path,
                title: model.name || model.id || this.getPathBasename(model.path),
                sourceLinks: model.sourceLinks,
                metadata: [
                  { label: "type", value: "rule" },
                  { label: "id", value: model.id || "(missing)" },
                  { label: "name", value: model.name || "(missing)" },
                  ...(model.kind ? [{ label: "kind", value: model.kind }] : []),
                  { label: "path", value: model.path }
                ],
                sections: this.describeRuleSections(model, file.path),
                counts: [
                  { label: "Inputs", value: model.inputs.length },
                  { label: "References", value: model.references.length },
                  { label: "Messages", value: model.messages.length }
                ],
                tables: this.buildRuleSummaryTables(model, file.path),
                warnings: diagnostics,
                onNavigateToLocation: (location) => {
                  void this.openFileLocation(file.path, location.line, location.ch ?? 0);
                }
              }, reason);
            } else {
              view.updateContent({
                mode: "empty",
                message: UNSUPPORTED_MESSAGE,
                warnings: []
              }, reason);
            }
            return;
          }
          case "mapping": {
              await this.ensureMemberLookupIndex();
              const warnings = [
                ...(this.index.warningsByFilePath[file.path] ?? []),
                ...renderModeWarnings
              ];
            if (model.fileType === "mapping") {
              const diagnostics = buildCurrentObjectDiagnostics(
                model,
                this.index,
                null,
                warnings
              );
              view.updateContent({
                  mode: "summary",
                  rendererSelection,
                ...impactPreviewProps,
                filePath: model.path,
                title: model.name || model.id || this.getPathBasename(model.path),
                sourceLinks: model.sourceLinks,
                metadata: [
                  { label: "type", value: "mapping" },
                  { label: "id", value: model.id || "(missing)" },
                  { label: "name", value: model.name || "(missing)" },
                  ...(model.kind ? [{ label: "kind", value: model.kind }] : []),
                  ...(model.source ? [{ label: "source", value: this.formatReferenceDisplay(model.source) }] : []),
                  ...(model.target ? [{ label: "target", value: this.formatReferenceDisplay(model.target) }] : []),
                  { label: "path", value: model.path }
                ],
                sections: this.describeMappingSections(model, file.path),
                counts: [
                  { label: "Scope", value: model.scope.length },
                  { label: "Mappings", value: model.mappings.length }
                ],
                tables: this.buildMappingSummaryTables(file.path),
                warnings: diagnostics,
                onNavigateToLocation: (location) => {
                  void this.openFileLocation(file.path, location.line, location.ch ?? 0);
                }
              }, reason);
            } else {
              view.updateContent({
                mode: "empty",
                message: UNSUPPORTED_MESSAGE,
                warnings: []
              }, reason);
            }
            return;
          }
          case "color-scheme": {
            const warnings = [
              ...(this.index.warningsByFilePath[file.path] ?? []),
              ...renderModeWarnings
            ];
            if (model.fileType === "color-scheme") {
              view.updateContent({
                mode: "color-scheme",
                model,
                warnings,
                rendererSelection,
                onOpenDiagnostic: (diagnostic) => {
                  void this.openDiagnosticLocation(file.path, diagnostic);
                }
              }, reason);
            } else {
              view.updateContent({
                mode: "empty",
                message: UNSUPPORTED_MESSAGE,
                warnings: []
              }, reason);
            }
            return;
          }
          case "domains": {
            await this.ensureStandaloneDomainsValidationReady();
            await this.ensureFullParsedFiles((candidate) => candidate.fileType === "color-scheme");
            const colorSchemeResult = resolveDefaultColorScheme(
              this.index,
              this.settings.defaultColorSchemeRef
            );
            const warnings = [
              ...(this.index.warningsByFilePath[file.path] ?? []),
              ...renderModeWarnings,
              ...colorSchemeResult.warnings
            ];
            if (model.fileType === "domains") {
              const diagnostics = buildCurrentObjectDiagnostics(
                model,
                this.index,
                null,
                warnings
              );
              view.updateContent({
                mode: "domains",
                model,
                relationships: buildDomainRelationshipSummaries(model, this.index),
                warnings: diagnostics,
                colorScheme: colorSchemeResult.colorScheme,
                rendererSelection,
                onOpenDiagnostic: (diagnostic) => {
                  void this.openDiagnosticLocation(file.path, diagnostic);
                }
              }, reason);
            } else {
              view.updateContent({
                mode: "empty",
                message: UNSUPPORTED_MESSAGE,
                warnings: []
              }, reason);
            }
            return;
          }
          case "domain-diagram": {
            await this.ensureStandaloneDomainsValidationReady();
            await this.ensureFullParsedFiles((candidate) => candidate.fileType === "color-scheme");
            const colorSchemeResult = resolveDefaultColorScheme(
              this.index,
              this.settings.defaultColorSchemeRef
            );
            const warnings = [
              ...(this.index.warningsByFilePath[file.path] ?? []),
              ...renderModeWarnings,
              ...colorSchemeResult.warnings
            ];
            if (model.fileType === "domain-diagram") {
              const resolved = resolveDomainDiagram(model, this.index);
              const diagnostics = [
                ...warnings,
                ...resolved.warnings
              ];
              const mergedDomainsModel = {
                ...model,
                fileType: "domains" as const,
                schema: "domains" as const,
                domains: resolved.domains,
                description: undefined
              };
              view.updateContent({
                mode: "domain-diagram",
                resolved,
                relationships: buildDomainRelationshipSummaries(
                  mergedDomainsModel,
                  this.index
                ),
                warnings: diagnostics,
                colorScheme: colorSchemeResult.colorScheme,
                rendererSelection,
                onOpenDiagnostic: (diagnostic) => {
                  void this.openDiagnosticLocation(file.path, diagnostic);
                }
              }, reason);
            } else {
              view.updateContent({
                mode: "empty",
                message: UNSUPPORTED_MESSAGE,
                warnings: []
              }, reason);
            }
            return;
          }
          case "markdown":
        default:
        view.updateContent({
          mode: "empty",
          message: await this.getEmptyStateMessage(file),
          warnings: this.index.warningsByFilePath[file.path] ?? []
        }, reason);
    }
  }

  private async updateEmptyState(
    leaf: WorkspaceLeaf,
    warnings: ValidationWarning[] = [],
    message = UNSUPPORTED_MESSAGE,
    reason: PreviewUpdateReason = "rerender"
  ): Promise<void> {
    await leaf.loadIfDeferred();
    if (leaf.view instanceof ModelingPreviewView) {
      leaf.view.updateContent({
        mode: "empty",
        message,
        warnings
      }, reason);
    }
  }

  private async getEmptyStateMessage(file: TFile): Promise<string> {
    const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
    if (frontmatter?.type === "er_relation") {
      return DEPRECATED_ER_RELATION_MESSAGE;
    }
    if (
      frontmatter?.type === "diagram" ||
      frontmatter?.schema === "diagram_v1" ||
      typeof frontmatter?.diagram_kind === "string"
    ) {
      return DEPRECATED_DIAGRAM_MESSAGE;
    }

    const content = await this.app.vault.cachedRead(file);
    if (/^\s*---[\s\S]*?\btype\s*:\s*er_relation\b[\s\S]*?---/m.test(content)) {
      return DEPRECATED_ER_RELATION_MESSAGE;
    }
    if (
      /^\s*---[\s\S]*?\btype\s*:\s*diagram\b[\s\S]*?---/m.test(content) ||
      /^\s*---[\s\S]*?\bschema\s*:\s*diagram_v1\b[\s\S]*?---/m.test(content) ||
      /^\s*---[\s\S]*?\bdiagram_kind\s*:\s*[A-Za-z0-9_-]+\b[\s\S]*?---/m.test(content)
    ) {
      return DEPRECATED_DIAGRAM_MESSAGE;
    }

    return UNSUPPORTED_MESSAGE;
  }

  private describeDataObjectSections(
    model: {
      sections: Record<string, string[]>;
      formatEntries: Array<unknown>;
      records: Array<unknown>;
      fields: Array<unknown>;
    },
    filePath: string
  ): Array<{ label: string; line?: number; ch?: number }> {
    const lines = this.getFileLines(filePath);
    const sections: Array<{ label: string; line?: number; ch?: number }> = [];
    const orderedKeys = ["Summary", "Format", "Records", "Fields", "Notes"];

    for (const key of orderedKeys) {
      if (!(key in model.sections)) {
        continue;
      }
      const line = this.findHeadingLine(lines, key);
      if (key === "Format") {
        sections.push({ label: `Format: ${model.formatEntries.length} rows`, line, ch: 0 });
      } else if (key === "Records") {
        sections.push({ label: `Records: ${model.records.length} rows`, line, ch: 0 });
      } else if (key === "Fields") {
        sections.push({ label: `Fields: ${model.fields.length} rows`, line, ch: 0 });
      } else {
        sections.push({ label: key, line, ch: 0 });
      }
    }

    return sections;
  }

  private buildDataObjectSummaryTables(
    model: {
      fieldMode: "standard" | "file_layout";
      formatEntries: Array<unknown>;
      records: Array<unknown>;
    },
    filePath: string
  ): Array<{
    title: string;
    columns: string[];
    rows: Array<{ cells: string[]; line?: number; ch?: number }>;
  }> {
    const formatRows = this.readTableRows(filePath, "Format");
    const recordRows = this.readTableRows(filePath, "Records");
    const fieldRows = this.readTableRows(filePath, "Fields");
    const tables: Array<{
      title: string;
      columns: string[];
      rows: Array<{ cells: string[]; line?: number; ch?: number }>;
    }> = [];

    if (model.formatEntries.length > 0) {
      tables.push({
        title: "Format summary",
        columns: ["key", "value", "notes"],
        rows: formatRows.map((row) => ({
          cells: [row.record.key ?? "", row.record.value ?? "", row.record.notes ?? ""],
          line: row.line,
          ch: row.ch
        }))
      });
    }

    if (model.records.length > 0) {
      tables.push({
        title: "Records summary",
        columns: ["record_type", "name", "occurrence", "notes"],
        rows: recordRows.map((row) => ({
          cells: [
            row.record.record_type ?? "",
            row.record.name ?? "",
            row.record.occurrence ?? "",
            row.record.notes ?? ""
          ],
          line: row.line,
          ch: row.ch
        }))
      });
    }

    if (model.fieldMode === "file_layout") {
      tables.push({
        title: "Fields summary",
        columns: ["record_type", "no", "name", "label", "type", "length", "position", "field_format", "ref", "notes"],
        rows: fieldRows.map((row) => ({
          cells: [
            row.record.record_type ?? "",
            row.record.no ?? "",
            row.record.name ?? "",
            row.record.label ?? "",
            row.record.type ?? "",
            row.record.length ?? "",
            row.record.position ?? "",
            row.record.field_format ?? "",
            this.formatReferenceDisplay(row.record.ref),
            row.record.notes ?? ""
          ],
          line: row.line,
          ch: row.ch
        }))
      });
    } else {
      tables.push({
        title: "Fields summary",
        columns: ["name", "label", "type", "length", "required", "ref", "notes"],
        rows: fieldRows.map((row) => ({
          cells: [
            row.record.name ?? "",
            row.record.label ?? "",
            row.record.type ?? "",
            row.record.length ?? "",
            row.record.required ?? "",
            this.formatReferenceDisplay(row.record.ref),
            row.record.notes ?? ""
          ],
          line: row.line,
          ch: row.ch
        }))
      });
    }

    return tables;
  }

  private getPathBasename(path: string): string {
    const slashNormalized = path.replace(/\\/g, "/");
    const lastSegment = slashNormalized.split("/").pop() ?? slashNormalized;
    return lastSegment.replace(/\.md$/i, "");
  }

  private describeScreenSections(
    model: {
      sections: Record<string, string[]>;
      layouts: Array<unknown>;
      fields: Array<unknown>;
      actions: Array<unknown>;
      messages: Array<unknown>;
      localProcesses: Array<unknown>;
      legacyTransitions: Array<unknown>;
    },
    filePath: string
  ): Array<{ label: string; line?: number; ch?: number }> {
    const lines = this.getFileLines(filePath);
    const sections: Array<{ label: string; line?: number; ch?: number }> = [];
    const orderedKeys = [
      "Summary",
      "Layout",
      "Fields",
      "Actions",
      "Messages",
      "Notes",
      "Local Processes",
      "Transitions"
    ];

    for (const key of orderedKeys) {
      if (!(key in model.sections)) {
        continue;
      }
      const line = this.findHeadingLine(lines, key);
      if (key === "Layout") {
        sections.push({ label: `Layout: ${model.layouts.length} rows`, line, ch: 0 });
      } else if (key === "Fields") {
        sections.push({ label: `Fields: ${model.fields.length} rows`, line, ch: 0 });
      } else if (key === "Actions") {
        sections.push({ label: `Actions: ${model.actions.length} rows`, line, ch: 0 });
      } else if (key === "Messages") {
        sections.push({ label: `Messages: ${model.messages.length} rows`, line, ch: 0 });
      } else if (key === "Local Processes") {
        sections.push({
          label:
            model.localProcesses.length > 0
              ? `Local Processes: ${model.localProcesses.length} headings`
              : "Local Processes",
          line,
          ch: 0
        });
      } else if (key === "Transitions") {
        sections.push({
          label:
            model.legacyTransitions.length > 0
              ? `Transitions (legacy): ${model.legacyTransitions.length} rows`
              : "Transitions (legacy)",
          line,
          ch: 0
        });
      } else {
        sections.push({ label: key, line, ch: 0 });
      }
    }
    return sections;
  }

  private describeAppProcessSections(
    model: {
      sections: Record<string, string[]>;
      inputs: Array<unknown>;
      outputs: Array<unknown>;
      triggers: Array<unknown>;
      transitions: Array<unknown>;
      steps?: Array<unknown>;
      flows?: Array<unknown>;
    },
    filePath: string
  ): Array<{ label: string; line?: number; ch?: number }> {
    const lines = this.getFileLines(filePath);
    const sections: Array<{ label: string; line?: number; ch?: number }> = [];
    const orderedKeys = [
      "Summary",
      "Domains",
      "Domain Sources",
      "Triggers",
      "Inputs",
      "Steps",
      "Flows",
      "Outputs",
      "Transitions",
      "Errors",
      "Notes"
    ];
    for (const key of orderedKeys) {
      if (!(key in model.sections)) {
        continue;
      }
      const line = this.findHeadingLine(lines, key);
      if (key === "Domains") {
        sections.push({
          label: `Domains: ${model.sections.Domains?.length ?? 0} lines`,
          line,
          ch: 0
        });
      } else if (key === "Domain Sources") {
        sections.push({
          label: `Domain Sources: ${model.sections["Domain Sources"]?.length ?? 0} lines`,
          line,
          ch: 0
        });
      } else if (key === "Inputs") {
        sections.push({ label: `Inputs: ${model.inputs.length} rows`, line, ch: 0 });
      } else if (key === "Outputs") {
        sections.push({ label: `Outputs: ${model.outputs.length} rows`, line, ch: 0 });
      } else if (key === "Triggers") {
        sections.push({ label: `Triggers: ${model.triggers.length} rows`, line, ch: 0 });
      } else if (key === "Transitions") {
        sections.push({ label: `Transitions: ${model.transitions.length} rows`, line, ch: 0 });
      } else if (key === "Steps") {
        sections.push({
          label:
            (model.steps?.length ?? 0) > 0
              ? `Steps: ${model.steps?.length ?? 0} rows`
              : "Steps: prose",
          line,
          ch: 0
        });
      } else if (key === "Flows") {
        sections.push({ label: `Flows: ${model.flows?.length ?? 0} rows`, line, ch: 0 });
      } else {
        sections.push({ label: key, line, ch: 0 });
      }
    }
    return sections;
  }

  private buildAppProcessTextSections(
    model: AppProcessModel
  ): Array<{ title: string; lines: string[] }> {
    const sections: Array<{ title: string; lines: string[] }> = [];
    if (
      (model.steps?.length ?? 0) === 0 &&
      !this.sectionContainsMarkdownTable(model.sections.Steps)
    ) {
      const stepsLines = this.getReadableSectionLines(model.sections.Steps);
      if (stepsLines.length > 0) {
        sections.push({ title: "Steps", lines: stepsLines });
      }
    }
    return sections;
  }

  private getReadableSectionLines(lines: string[] | undefined): string[] {
    return (lines ?? []).map((line) => line.replace(/\s+$/u, ""));
  }

  private sectionContainsMarkdownTable(lines: string[] | undefined): boolean {
    const tableLines = (lines ?? [])
      .map((line) => line.trim())
      .filter((line) => line.startsWith("|"));
    if (tableLines.length < 2) {
      return false;
    }
    return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(tableLines[1]);
  }

  private describeCodeSetSections(
    model: {
      sections: Record<string, string[]>;
      values: Array<unknown>;
    },
    filePath: string
  ): Array<{ label: string; line?: number; ch?: number }> {
    const lines = this.getFileLines(filePath);
    const orderedKeys = ["Summary", "Values", "Notes"];
    const sections: Array<{ label: string; line?: number; ch?: number }> = [];

    for (const key of orderedKeys) {
      if (!(key in model.sections)) {
        continue;
      }
      const line = this.findHeadingLine(lines, key);
      if (key === "Values") {
        sections.push({ label: `Values: ${model.values.length} rows`, line, ch: 0 });
      } else {
        sections.push({ label: key, line, ch: 0 });
      }
    }

    return sections;
  }

  private describeMessageSections(
    model: {
      sections: Record<string, string[]>;
      messages: Array<unknown>;
    },
    filePath: string
  ): Array<{ label: string; line?: number; ch?: number }> {
    const lines = this.getFileLines(filePath);
    const orderedKeys = ["Summary", "Messages", "Notes"];
    const sections: Array<{ label: string; line?: number; ch?: number }> = [];

    for (const key of orderedKeys) {
      if (!(key in model.sections)) {
        continue;
      }
      const line = this.findHeadingLine(lines, key);
      if (key === "Messages") {
        sections.push({ label: `Messages: ${model.messages.length} rows`, line, ch: 0 });
      } else {
        sections.push({ label: key, line, ch: 0 });
      }
    }

    return sections;
  }

  private describeRuleSections(
    model: {
      sections: Record<string, string[]>;
      inputs: Array<unknown>;
      references: Array<unknown>;
      messages: Array<unknown>;
    },
    filePath: string
  ): Array<{ label: string; line?: number; ch?: number }> {
    const lines = this.getFileLines(filePath);
    const orderedKeys = ["Summary", "Inputs", "References", "Conditions", "Messages", "Notes"];
    const sections: Array<{ label: string; line?: number; ch?: number }> = [];

    for (const key of orderedKeys) {
      if (!(key in model.sections)) {
        continue;
      }
      const line = this.findHeadingLine(lines, key);
      if (key === "Inputs") {
        sections.push({ label: `Inputs: ${model.inputs.length} rows`, line, ch: 0 });
      } else if (key === "References") {
        sections.push({ label: `References: ${model.references.length} rows`, line, ch: 0 });
      } else if (key === "Messages") {
        sections.push({ label: `Messages: ${model.messages.length} rows`, line, ch: 0 });
      } else {
        sections.push({ label: key, line, ch: 0 });
      }
    }

    return sections;
  }

  private describeMappingSections(
    model: {
      sections: Record<string, string[]>;
      scope: Array<unknown>;
      mappings: Array<unknown>;
    },
    filePath: string
  ): Array<{ label: string; line?: number; ch?: number }> {
    const lines = this.getFileLines(filePath);
    const orderedKeys = ["Summary", "Scope", "Mappings", "Rules", "Notes"];
    const sections: Array<{ label: string; line?: number; ch?: number }> = [];

    for (const key of orderedKeys) {
      if (!(key in model.sections)) {
        continue;
      }
      const line = this.findHeadingLine(lines, key);
      if (key === "Scope") {
        sections.push({ label: `Scope: ${model.scope.length} rows`, line, ch: 0 });
      } else if (key === "Mappings") {
        sections.push({ label: `Mappings: ${model.mappings.length} rows`, line, ch: 0 });
      } else {
        sections.push({ label: key, line, ch: 0 });
      }
    }

    return sections;
  }

  private buildScreenSummaryTables(
    model: { layouts: Array<unknown>; messages: Array<unknown> },
    filePath: string
  ): Array<{
    title: string;
    columns: string[];
    rows: Array<{ cells: string[]; line?: number; ch?: number }>;
  }> {
    const layoutRows = this.readTableRows(filePath, "Layout");
    const fieldsRows = this.readTableRows(filePath, "Fields");
    const actionsRows = this.readTableRows(filePath, "Actions");
    const messagesRows = this.readTableRows(filePath, "Messages");

    const tables = [
      {
        title: "Structure / Layout",
        columns: ["id", "label", "kind", "purpose", "notes"],
        rows: layoutRows.map((row) => ({
          cells: [
            row.record.id ?? "",
            row.record.label ?? "",
            row.record.kind ?? "",
            row.record.purpose ?? "",
            row.record.notes ?? ""
          ],
          line: row.line,
          ch: row.ch
        }))
      },
      {
        title: "UI Elements / Fields",
        columns: ["id", "label", "kind", "layout", "ref", "notes"],
        rows: fieldsRows.map((row) => ({
          cells: [
            row.record.id ?? "",
            row.record.label ?? "",
            row.record.kind ?? "",
            row.record.layout ?? "",
            this.formatReferenceDisplay(row.record.ref),
            row.record.notes ?? ""
          ],
          line: row.line,
          ch: row.ch
        }))
      },
      {
        title: "Behavior / Actions",
        columns: [
          "id",
          "label",
          "target",
          "event",
          "invoke",
          "transition",
          "transition_status",
          "notes"
        ],
        rows: actionsRows.map((row) => ({
          cells: [
            row.record.id ?? "",
            row.record.label ?? "",
            row.record.target ?? "",
            row.record.event ?? "",
            this.formatReferenceDisplay(row.record.invoke),
            this.formatReferenceDisplay(row.record.transition),
            this.getScreenTransitionStatus(row.record.transition),
            row.record.notes ?? ""
          ],
          line: row.line,
          ch: row.ch
        }))
      }
    ];

    if (model.messages.length > 0) {
      tables.push({
        title: "Messages",
        columns: ["id", "text", "severity", "timing", "notes"],
        rows: messagesRows.map((row) => ({
          cells: [
            row.record.id ?? "",
            this.formatReferenceDisplay(row.record.text),
            row.record.severity ?? "",
            row.record.timing ?? "",
            row.record.notes ?? ""
          ],
          line: row.line,
          ch: row.ch
        }))
      });
    }

    return tables;
  }

  private collectScreenInvokedProcesses(
    model: {
      actions: Array<{
        label?: string;
        invoke?: string;
        rowLine?: number;
      }>;
    }
  ): Array<{ label: string; line?: number; ch?: number }> {
    const seen = new Set<string>();
    const items: Array<{ label: string; line?: number; ch?: number }> = [];

    for (const action of model.actions) {
      const invoke = action.invoke?.trim();
      if (!invoke) {
        continue;
      }
      const display = this.formatReferenceDisplay(invoke);
      const key = `${action.label?.trim() ?? ""}|${display}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      items.push({
        label: `${action.label?.trim() || "(action)"} -> ${display}`,
        line: action.rowLine,
        ch: 0
      });
    }

    return items;
  }

  private collectScreenOutgoingScreens(
      model: {
        actions: Array<{
        label?: string;
        transition?: string;
        rowLine?: number;
      }>;
    }
  ): Array<{ label: string; line?: number; ch?: number }> {
    const seen = new Set<string>();
    const items: Array<{ label: string; line?: number; ch?: number }> = [];

    for (const action of model.actions) {
      const transition = action.transition?.trim();
      if (!transition) {
        continue;
      }
      const display = this.formatReferenceDisplay(transition);
      const key = `${action.label?.trim() ?? ""}|${display}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      const status = this.getScreenTransitionStatus(transition);
      items.push({
        label: `${action.label?.trim() || "(action)"} -> ${display} [${status}]`,
        line: action.rowLine,
        ch: 0
      });
    }

      return items;
    }

  private getScreenTransitionStatus(transition: string | undefined): string {
    const target = transition?.trim();
    if (!target) {
      return "";
    }

    const resolved = this.index ? resolveReferenceIdentity(target, this.index) : null;
    if (!resolved?.resolvedModel) {
      return "unresolved";
    }

    return resolved.resolvedModel.fileType === "screen"
      ? "resolved"
      : "unresolved";
  }

  private resolveFileRenderMode(
    filePath: string,
    fileType: ReturnType<typeof detectFileType>,
    frontmatter: Record<string, unknown>,
    modelKind: string | null = null
  ): ResolvedRenderMode {
    return resolveRenderMode({
      filePath,
      formatType: fileType,
      modelKind:
        modelKind ??
        (typeof frontmatter.kind === "string" ? frontmatter.kind : null),
        toolbarOverride:
          this.rendererOverrideFilePath === filePath
            ? this.rendererOverridesByFilePath.get(filePath) ?? null
            : null,
        frontmatterRenderMode: frontmatter.render_mode,
        settingsDefaultRenderMode: this.getDefaultRenderModeForFormat(
          fileType,
          modelKind ??
            (typeof frontmatter.kind === "string" ? frontmatter.kind : null)
        )
      });
    }

  private getDefaultRenderModeForFormat(
    fileType: FileType,
    modelKind?: string | null
  ): AnyRenderMode {
    if (fileType === "diagram") {
      if (modelKind === "class") {
        return this.settings.defaultClassRenderMode;
      }
      if (modelKind === "er") {
        return this.settings.defaultErRenderMode;
      }
      return "custom";
    }

    switch (fileType) {
      case "object":
        return this.settings.defaultClassRenderMode;
      case "er-entity":
        return this.settings.defaultErRenderMode;
      case "dfd-diagram":
        return this.settings.defaultDfdRenderMode;
      case "dfd-object":
        return "custom";
      case "app-process":
        return this.settings.defaultProcessRenderMode;
      case "screen":
        return this.settings.defaultScreenRenderMode;
      case "domains":
        return this.settings.defaultDomainsViewMode;
      case "domain-diagram":
        return this.settings.defaultDomainDiagramViewMode;
      default:
        return "custom";
    }
  }

  private buildRendererSelectionState(
    filePath: string,
    resolved: ResolvedRenderMode,
    fileType: FileType,
    modelKind?: string | null
  ): {
    selectedMode: AnyRenderMode;
    visibleSelectedMode: AnyRenderMode;
    supportedModes: AnyRenderMode[];
    effectiveMode: EffectiveRenderMode;
    actualRenderer: "custom" | "mermaid" | "table-text";
    source: "toolbar" | "frontmatter" | "settings" | "format_default" | "fallback";
    fallbackReason?: string;
    onSelectMode: (mode: AnyRenderMode) => void;
  } {
      const supportedModes = getSupportedRenderModes(fileType, modelKind);
      const visibleSelectedMode = supportedModes.includes(resolved.selectedMode)
        ? resolved.selectedMode
        : supportedModes[0] ?? "custom";

      return {
        selectedMode: resolved.selectedMode,
        visibleSelectedMode,
        supportedModes,
        effectiveMode: resolved.effectiveMode,
        actualRenderer: resolved.actualRenderer,
        source: resolved.source,
      fallbackReason: resolved.fallbackReason,
      onSelectMode: (mode) => {
        this.rendererOverridesByFilePath.clear();
        this.rendererOverridesByFilePath.set(filePath, mode);
        this.rendererOverrideFilePath = filePath;
        void this.syncPreviewToActiveFile(false, "renderer-switch");
      }
    };
  }

  private buildScreenPreviewTransitions(
      model: {
      path: string;
      actions: Array<{
        id?: string;
        label?: string;
        target?: string;
        event?: string;
        transition?: string;
        rowLine?: number;
      }>;
    }
  ): Array<{
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
  }> {
    const groups = new Map<
      string,
      {
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
      }
    >();

    for (const action of model.actions) {
      const transition = action.transition?.trim();
      if (!transition) {
        continue;
      }

      const labelInfo = this.buildScreenActionPreviewLabel(action);
      const resolved = this.index
        ? resolveReferenceIdentity(transition, this.index)
        : { resolvedModel: null };
      const resolvedModel = resolved.resolvedModel?.fileType === "screen"
        ? resolved.resolvedModel
        : null;
      const targetPath = resolvedModel?.path;
      const targetLabel = resolvedModel?.name?.trim()
        || resolvedModel?.id?.trim()
        || this.formatReferenceDisplay(transition)
        || transition;
      const targetTitle = targetPath
        ? `${targetLabel}\n${targetPath}`
        : `${targetLabel}\n${transition}`;
      const key = targetPath ? `path:${targetPath}` : `raw:${transition}`;
      const group = groups.get(key) ?? {
        key,
        targetLabel,
        targetTitle,
        targetPath,
        unresolved: !targetPath,
        selfTarget: targetPath === model.path,
        actions: []
      };
      group.actions.push({
        label: labelInfo.shortLabel,
        fullLabel: labelInfo.fullLabel,
        title: [
          labelInfo.fullLabel,
          action.id?.trim() ? `id: ${action.id.trim()}` : "",
          action.target?.trim() ? `target: ${action.target.trim()}` : "",
          action.event?.trim() ? `event: ${action.event.trim()}` : "",
          `transition: ${targetLabel}`
        ].filter(Boolean).join("\n"),
        line: action.rowLine,
        ch: 0
      });
      groups.set(key, group);
    }

    return [...groups.values()];
  }

  private buildScreenActionPreviewLabel(action: {
    id?: string;
    label?: string;
    target?: string;
    event?: string;
  }): {
    shortLabel: string;
    fullLabel: string;
  } {
    const label = action.label?.trim();
    if (label) {
      return { shortLabel: label, fullLabel: label };
    }
    const id = action.id?.trim();
    if (id) {
      return { shortLabel: id, fullLabel: id };
    }
    const target = action.target?.trim();
    const event = action.event?.trim();
    if (target && event) {
      const fullLabel = `${target}.${event}`;
      return { shortLabel: fullLabel, fullLabel };
    }
    if (event) {
      return { shortLabel: event, fullLabel: event };
    }
    return { shortLabel: "(action)", fullLabel: "(action)" };
  }

  private buildScreenLayoutBlocks(
    model: {
      layouts: Array<{
        id: string;
        label?: string;
        kind?: string;
        purpose?: string;
        rowLine?: number;
      }>;
      fields: Array<{
        id: string;
        label?: string;
        layout?: string;
        rowLine?: number;
      }>;
    }
  ): Array<{
    label: string;
    subtitle?: string;
    line?: number;
    ch?: number;
    items: Array<{ label: string; line?: number; ch?: number }>;
  }> {
    const layoutMap = new Map(
      model.layouts
        .map((layout) => [layout.id.trim(), layout] as const)
        .filter(([layoutId]) => Boolean(layoutId))
    );
    const fieldsByLayout = new Map<string, Array<{ label: string; line?: number; ch?: number }>>();
    const ungrouped: Array<{ label: string; line?: number; ch?: number }> = [];

    for (const field of model.fields) {
      const item = {
        label: field.label?.trim() || field.id,
        line: field.rowLine,
        ch: 0
      };
      const layoutId = field.layout?.trim();
      if (!layoutId || !layoutMap.has(layoutId)) {
        ungrouped.push(item);
        continue;
      }
      const group = fieldsByLayout.get(layoutId) ?? [];
      group.push(item);
      fieldsByLayout.set(layoutId, group);
    }

    const blocks = model.layouts.map((layout) => ({
      label: layout.label?.trim()
        ? `${layout.label.trim()} [${layout.id}]`
        : `[${layout.id}]`,
      subtitle: [layout.kind?.trim(), layout.purpose?.trim()].filter(Boolean).join(" / ") || undefined,
      line: layout.rowLine,
      ch: 0,
      items: fieldsByLayout.get(layout.id.trim()) ?? []
    }));

    if (ungrouped.length > 0) {
      blocks.push({
        label: "Unassigned",
        subtitle: "Layout is missing or undefined",
        line: undefined,
        ch: 0,
        items: ungrouped
      });
    }

    return blocks;
  }

  private buildAppProcessSummaryTables(
    model: {
      triggers: Array<unknown>;
      transitions: Array<unknown>;
      steps?: Array<unknown>;
      flows?: Array<unknown>;
      hasExplicitFlows?: boolean;
    },
    filePath: string
  ): Array<{
    title: string;
    columns: string[];
    rows: Array<{ cells: string[]; line?: number; ch?: number }>;
  }> {
    const inputRows = this.readTableRows(filePath, "Inputs");
    const outputRows = this.readTableRows(filePath, "Outputs");
    const triggerRows = this.readTableRows(filePath, "Triggers");
    const transitionRows = this.readTableRows(filePath, "Transitions");
    const stepRows = this.readTableRows(filePath, "Steps");
    const flowRows = this.readTableRows(filePath, "Flows");
    const domainRows = this.readTableRows(filePath, "Domains");
    const domainSourceRows = this.readTableRows(filePath, "Domain Sources");

    const tables: Array<{
      title: string;
      columns: string[];
      rows: Array<{ cells: string[]; line?: number; ch?: number }>;
    }> = [];

    if (model.triggers.length > 0) {
      tables.push({
        title: "Triggers Summary",
        columns: ["id", "kind", "source", "event", "notes"],
        rows: triggerRows.map((row) => ({
          cells: [
            row.record.id ?? "",
            row.record.kind ?? "",
            this.formatReferenceDisplay(row.record.source),
            row.record.event ?? "",
            row.record.notes ?? ""
          ],
          line: row.line,
          ch: row.ch
        }))
      });
    }

    if ((model.steps?.length ?? 0) > 0) {
      tables.push({
        title: "Steps Summary",
        columns: ["id", "domain", "lane", "label", "kind", "input", "output", "rule", "invoke", "screen", "notes"],
        rows: stepRows.map((row) => ({
          cells: [
            row.record.id ?? "",
            row.record.domain ?? "",
            row.record.lane ?? "",
            row.record.label ?? "",
            row.record.kind ?? "",
            this.formatReferenceDisplay(row.record.input),
            this.formatReferenceDisplay(row.record.output),
            this.formatReferenceDisplay(row.record.rule),
            this.formatReferenceDisplay(row.record.invoke),
            this.formatReferenceDisplay(row.record.screen),
            row.record.notes ?? ""
          ],
          line: row.line,
          ch: row.ch
        }))
      });
    }

    if (domainSourceRows.length > 0) {
      tables.push({
        title: "Domain Sources Summary",
        columns: ["ref", "notes"],
        rows: domainSourceRows.map((row) => ({
          cells: [
            this.formatReferenceDisplay(row.record.ref),
            row.record.notes ?? ""
          ],
          line: row.line,
          ch: row.ch
        }))
      });
    }

    if (domainRows.length > 0) {
      tables.push({
        title: "Domains Summary",
        columns: ["id", "name", "kind", "parent", "description"],
        rows: domainRows.map((row) => ({
          cells: [
            row.record.id ?? "",
            row.record.name ?? "",
            row.record.kind ?? "",
            row.record.parent ?? "",
            row.record.description ?? ""
          ],
          line: row.line,
          ch: row.ch
        }))
      });
    }

    tables.push({
      title: "Inputs Summary",
      columns: ["id", "data", "source", "required", "notes"],
      rows: inputRows.map((row) => ({
        cells: [
          row.record.id ?? "",
          this.formatReferenceDisplay(row.record.data),
          this.formatReferenceDisplay(row.record.source),
          row.record.required ?? "",
          row.record.notes ?? ""
        ],
        line: row.line,
        ch: row.ch
      }))
    });

    tables.push({
      title: "Outputs Summary",
      columns: ["id", "data", "target", "notes"],
      rows: outputRows.map((row) => ({
        cells: [
          row.record.id ?? "",
          this.formatReferenceDisplay(row.record.data),
          this.formatReferenceDisplay(row.record.target),
          row.record.notes ?? ""
        ],
        line: row.line,
        ch: row.ch
      }))
    });

    if (model.transitions.length > 0) {
      tables.push({
        title: "Transitions Summary",
        columns: ["id", "event", "to", "condition", "notes"],
        rows: transitionRows.map((row) => ({
          cells: [
            row.record.id ?? "",
            row.record.event ?? "",
            this.formatReferenceDisplay(row.record.to),
            row.record.condition ?? "",
            row.record.notes ?? ""
          ],
          line: row.line,
          ch: row.ch
        }))
      });
    }

    if (model.hasExplicitFlows) {
      tables.push({
        title: "Flows Summary",
        columns: ["from", "to", "condition", "label", "notes"],
        rows: flowRows.map((row) => ({
          cells: [
            row.record.from ?? "",
            row.record.to ?? "",
            row.record.condition ?? "",
            row.record.label ?? "",
            row.record.notes ?? ""
          ],
          line: row.line,
          ch: row.ch
        }))
      });
    }

    return tables;
  }

  private buildAppProcessBusinessFlowWarnings(model: AppProcessModel): ValidationWarning[] {
    const steps = model.steps ?? [];
    if (steps.length === 0 || !model.hasExplicitFlows) {
      return [];
    }

    const stepIds = new Set(steps.map((step) => step.id).filter(Boolean));
    const warnings: ValidationWarning[] = [];
    for (const flow of model.flows ?? []) {
      if (!flow.from || !stepIds.has(flow.from)) {
        warnings.push({
          code: "unresolved-reference",
          message: flow.from
            ? modelWeaveText(
                `app_process Flow.from references missing step "${flow.from}"`,
                `app_process Flow.from が存在しない step "${flow.from}" を参照しています。`
              )
            : modelWeaveText(
                "app_process Flow.from is missing a step id",
                "app_process Flow.from の step id がありません。"
              ),
          severity: "warning",
          path: model.path,
          field: "Flows.from"
        });
      }
      if (!flow.to || !stepIds.has(flow.to)) {
        warnings.push({
          code: "unresolved-reference",
          message: flow.to
            ? modelWeaveText(
                `app_process Flow.to references missing step "${flow.to}"`,
                `app_process Flow.to が存在しない step "${flow.to}" を参照しています。`
              )
            : modelWeaveText(
                "app_process Flow.to is missing a step id",
                "app_process Flow.to の step id がありません。"
              ),
          severity: "warning",
          path: model.path,
          field: "Flows.to"
        });
      }
    }
    return warnings;
  }

  private buildCodeSetSummaryTables(
    filePath: string
  ): Array<{
    title: string;
    columns: string[];
    rows: Array<{ cells: string[]; line?: number; ch?: number }>;
  }> {
    const valueRows = this.readTableRows(filePath, "Values");
    return [
      {
        title: "Values Summary",
        columns: ["code", "label", "sort_order", "active", "notes"],
        rows: valueRows.map((row) => ({
          cells: [
            row.record.code ?? "",
            row.record.label ?? "",
            row.record.sort_order ?? "",
            row.record.active ?? "",
            row.record.notes ?? ""
          ],
          line: row.line,
          ch: row.ch
        }))
      }
      ];
  }

  private buildMessageSummaryTables(
    filePath: string
  ): Array<{
    title: string;
    columns: string[];
    rows: Array<{ cells: string[]; line?: number; ch?: number }>;
  }> {
    const messageRows = this.readTableRows(filePath, "Messages");
    return [
      {
        title: "Messages Summary",
        columns: ["message_id", "text", "severity", "timing", "audience", "active", "notes"],
        rows: messageRows.map((row) => ({
          cells: [
            row.record.message_id ?? "",
            row.record.text ?? "",
            row.record.severity ?? "",
            row.record.timing ?? "",
            row.record.audience ?? "",
            row.record.active ?? "",
            row.record.notes ?? ""
          ],
          line: row.line,
          ch: row.ch
        }))
      }
    ];
  }

  private buildRuleSummaryTables(
    model: { messages: Array<unknown> },
    filePath: string
  ): Array<{
    title: string;
    columns: string[];
    rows: Array<{ cells: string[]; line?: number; ch?: number }>;
  }> {
    const inputRows = this.readTableRows(filePath, "Inputs");
    const referenceRows = this.readTableRows(filePath, "References");
    const messageRows = this.readTableRows(filePath, "Messages");

    const tables = [
      {
        title: "Inputs Summary",
        columns: ["id", "data", "source", "required", "notes"],
        rows: inputRows.map((row) => ({
          cells: [
            row.record.id ?? "",
            this.formatReferenceDisplay(row.record.data),
            this.formatReferenceDisplay(row.record.source),
            row.record.required ?? "",
            row.record.notes ?? ""
          ],
          line: row.line,
          ch: row.ch
        }))
      },
      {
        title: "References Summary",
        columns: ["ref", "usage", "notes"],
        rows: referenceRows.map((row) => ({
          cells: [
            this.formatReferenceDisplay(row.record.ref),
            row.record.usage ?? "",
            row.record.notes ?? ""
          ],
          line: row.line,
          ch: row.ch
        }))
      }
    ];

    if (model.messages.length > 0) {
      tables.push({
        title: "Messages Summary",
        columns: ["severity", "message", "condition", "notes"],
        rows: messageRows.map((row) => ({
          cells: [
            row.record.severity ?? "",
            this.formatReferenceDisplay(row.record.message),
            row.record.condition ?? "",
            row.record.notes ?? ""
          ],
          line: row.line,
          ch: row.ch
        }))
      });
    }

    return tables;
  }

  private buildMappingSummaryTables(
    filePath: string
  ): Array<{
    title: string;
    columns: string[];
    rows: Array<{ cells: string[]; line?: number; ch?: number }>;
  }> {
    const scopeRows = this.readTableRows(filePath, "Scope");
    const mappingRows = this.readTableRows(filePath, "Mappings");

    return [
      {
        title: "Scope Summary",
        columns: ["role", "ref", "notes"],
        rows: scopeRows.map((row) => ({
          cells: [
            row.record.role ?? "",
            this.formatReferenceDisplay(row.record.ref),
            row.record.notes ?? ""
          ],
          line: row.line,
          ch: row.ch
        }))
      },
      {
        title: "Mappings Summary",
        columns: ["target_ref", "source_ref", "transform", "rule", "required", "notes"],
        rows: mappingRows.map((row) => ({
          cells: [
            this.formatReferenceDisplay(row.record.target_ref),
            this.formatReferenceDisplay(row.record.source_ref),
            row.record.transform ?? "",
            this.formatReferenceDisplay(row.record.rule),
            row.record.required ?? "",
            row.record.notes ?? ""
          ],
          line: row.line,
          ch: row.ch
        }))
      }
    ];
  }

  private collectScreenLocalProcesses(
    filePath: string
  ): Array<{ label: string; line?: number; ch?: number }> {
    const lines = this.getFileLines(filePath);
    const sectionLine = this.findHeadingLine(lines, "Local Processes");
    if (sectionLine === undefined) {
      return [];
    }

    const results: Array<{ label: string; line?: number; ch?: number }> = [];
    for (let index = sectionLine + 1; index < lines.length; index += 1) {
      const line = lines[index] ?? "";
      const trimmed = line.trim();
      if (/^##\s+/.test(trimmed)) {
        break;
      }

      const match = trimmed.match(/^###\s+(.+)$/);
      if (!match) {
        continue;
      }

      results.push({
        label: match[1].trim(),
        line: index,
        ch: Math.max(0, line.indexOf("###"))
      });
    }

    return results;
  }

  private formatReferenceDisplay(value: string | undefined): string {
    const trimmed = value?.trim();
    if (!trimmed) {
      return "";
    }

    const qualified = parseQualifiedRef(trimmed);
    if (qualified?.hasMemberRef) {
      const baseLabel = this.formatBaseReferenceDisplay(qualified.baseRefRaw);
      return qualified.memberRef ? `${baseLabel}.${qualified.memberRef}` : baseLabel;
    }

    return this.formatBaseReferenceDisplay(trimmed);
  }

  private formatBaseReferenceDisplay(value: string): string {
    const parsed = parseReferenceValue(value);
    if (!parsed) {
      return value;
    }

    if (parsed.display?.trim()) {
      return parsed.display.trim();
    }

    if (parsed.target?.trim()) {
      return this.getPathBasename(parsed.target.trim());
    }

    return parsed.raw || value;
  }

  private getFileLines(filePath: string): string[] {
    const content = this.index?.sourceFilesByPath[filePath]?.content ?? "";
    return content.split(/\r?\n/);
  }

  private findHeadingLine(lines: string[], sectionName: string): number | undefined {
    const heading = `## ${sectionName}`;
    for (let index = 0; index < lines.length; index += 1) {
      if ((lines[index] ?? "").trim() === heading) {
        return index;
      }
    }
    return undefined;
  }

  private readTableRows(
    filePath: string,
    sectionName: string,
    filterColumns?: string[]
  ): Array<{
    record: Record<string, string>;
    line: number;
    ch: number;
  }> {
    const lines = this.getFileLines(filePath);
    const sectionLine = this.findHeadingLine(lines, sectionName);
    if (sectionLine === undefined) {
      return [];
    }

    let header: string[] | null = null;
    const rows: Array<{ record: Record<string, string>; line: number; ch: number }> = [];

    for (let index = sectionLine + 1; index < lines.length; index += 1) {
      const line = lines[index] ?? "";
      const trimmed = line.trim();
      if (/^##\s+/.test(trimmed)) {
        break;
      }
      if (!trimmed.startsWith("|")) {
        continue;
      }
      if (this.isMarkdownSeparatorLine(line)) {
        continue;
      }

      const values = splitMarkdownTableRow(line);
      if (!values) {
        continue;
      }

      if (!header) {
        header = values;
        continue;
      }

      const record: Record<string, string> = {};
      for (let columnIndex = 0; columnIndex < header.length; columnIndex += 1) {
        record[header[columnIndex]] = values[columnIndex] ?? "";
      }

      if (Object.values(record).every((value) => !value.trim())) {
        continue;
      }

      if (filterColumns) {
        const filtered: Record<string, string> = {};
        for (const key of filterColumns) {
          filtered[key] = record[key] ?? "";
        }
        rows.push({
          record: filtered,
          line: index,
          ch: getMarkdownTableCellRanges(line)?.[0]?.contentStart ?? 0
        });
      } else {
        rows.push({
          record,
          line: index,
          ch: getMarkdownTableCellRanges(line)?.[0]?.contentStart ?? 0
        });
      }
    }

    return rows;
  }

  private isMarkdownSeparatorLine(line: string): boolean {
    const cells = splitMarkdownTableRow(line);
    return Boolean(cells && cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell)));
  }

  private async openObjectNote(
    objectId: string,
    sourcePath?: string,
    navigation?: { openInNewLeaf?: boolean }
  ): Promise<void> {
    if (!this.index) {
      await this.rebuildIndex();
    }

    if (!this.index) {
      new Notice(modelWeaveText(
        "Model index is not available",
        "Model index が利用できません。インデックスを再構築してください。"
      ));
      return;
    }

    const result = await openModelObjectNote(this.app, this.index, objectId, {
      sourcePath,
      openInNewLeaf: navigation?.openInNewLeaf ?? false
    });
    if (!result.ok) {
      new Notice(result.reason ?? `Could not open object "${objectId}"`);
      return;
    }

    await this.syncPreviewToActiveFile(false, "viewer-node-navigation");
  }

  private async openDiagnosticLocation(
    filePath: string,
    diagnostic: ValidationWarning
  ): Promise<void> {
    const targetPath = diagnostic.filePath ?? diagnostic.path ?? filePath;
    const abstractFile = this.app.vault.getAbstractFileByPath(targetPath);
    if (!(abstractFile instanceof TFile)) {
      return;
    }

    const activeMarkdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
    let targetLeaf: WorkspaceLeaf | null =
      activeMarkdownView?.file?.path === targetPath
        ? activeMarkdownView.leaf
        : this.findMarkdownLeafForPath(targetPath);

    if (!targetLeaf) {
      targetLeaf = this.app.workspace.getMostRecentLeaf();
      if (targetLeaf && this.isPreviewLeaf(targetLeaf)) {
        targetLeaf = this.app.workspace.getLeaf(true);
      }
    }

    if (!targetLeaf) {
      return;
    }

    if ((targetLeaf.view as { file?: TFile | null }).file?.path !== targetPath) {
      await targetLeaf.openFile(abstractFile);
    }

    this.app.workspace.setActiveLeaf(targetLeaf, { focus: true });

    const markdownView =
      targetLeaf.view instanceof MarkdownView
        ? targetLeaf.view
        : this.app.workspace.getActiveViewOfType(MarkdownView);
    const editor = markdownView?.editor;
    if (!editor) {
      return;
    }

    const content = editor.getValue();
    const targetLine = resolveDiagnosticLine(content, diagnostic);
    await this.openFileLocation(targetPath, targetLine, 0, targetLeaf);
  }

  private async openFileLocation(
    filePath: string,
    line: number,
    ch = 0,
    preferredLeaf?: WorkspaceLeaf | null
  ): Promise<void> {
    const abstractFile = this.app.vault.getAbstractFileByPath(filePath);
    if (!(abstractFile instanceof TFile)) {
      return;
    }

    const activeMarkdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
    let targetLeaf: WorkspaceLeaf | null =
      preferredLeaf ??
      (activeMarkdownView?.file?.path === filePath
        ? activeMarkdownView.leaf
        : this.findMarkdownLeafForPath(filePath));

    if (!targetLeaf) {
      targetLeaf = this.app.workspace.getMostRecentLeaf();
      if (targetLeaf && this.isPreviewLeaf(targetLeaf)) {
        targetLeaf = this.app.workspace.getLeaf(true);
      }
    }

    if (!targetLeaf) {
      return;
    }

    if ((targetLeaf.view as { file?: TFile | null }).file?.path !== filePath) {
      await targetLeaf.openFile(abstractFile);
    }

    this.app.workspace.setActiveLeaf(targetLeaf, { focus: true });

    const markdownView =
      targetLeaf.view instanceof MarkdownView
        ? targetLeaf.view
        : this.app.workspace.getActiveViewOfType(MarkdownView);
    const editor = markdownView?.editor;
    if (!editor) {
      return;
    }

    editor.setCursor({ line, ch });
    editor.scrollIntoView(
      {
        from: { line, ch },
        to: { line, ch }
      },
      true
    );
    (
      editor as MarkdownView["editor"] & {
        focus?: () => void;
        cm?: { focus?: () => void };
      }
    ).focus?.();
    (
      editor as MarkdownView["editor"] & {
        cm?: { focus?: () => void };
      }
    ).cm?.focus?.();
  }

  private async openReferencedFile(
    filePath: string,
    openInNewLeaf = false
  ): Promise<void> {
    const preferredLeaf = openInNewLeaf
      ? this.app.workspace.getLeaf(true)
      : undefined;
    await this.openFileLocation(filePath, 0, 0, preferredLeaf);
  }

  private findMarkdownLeafForPath(filePath: string): WorkspaceLeaf | null {
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      const viewFile = (leaf.view as { file?: TFile | null }).file ?? null;
      if (viewFile?.path === filePath) {
        return leaf;
      }
    }

    return null;
  }

  private async ensurePreviewLeaf(
    preferredLeaf?: WorkspaceLeaf,
    activate = true,
    managePreviewLeaf = true
  ): Promise<WorkspaceLeaf> {
    const leaf = preferredLeaf ?? (await this.findOrCreatePreviewLeaf());

    await leaf.setViewState({
      type: MODELING_PREVIEW_VIEW_TYPE,
      active: activate
    });

    if (managePreviewLeaf) {
      this.previewLeaf = leaf;
    }
    return leaf;
  }

  private async findOrCreatePreviewLeaf(): Promise<WorkspaceLeaf> {
    const existing = this.getManagedPreviewLeaf();
    if (existing) {
      await this.closeDuplicatePreviewLeaves(existing);
      return existing;
    }

    const leaf =
      this.app.workspace.getRightLeaf(false) ??
      this.app.workspace.getLeaf(true);
    this.previewLeaf = leaf;
    return leaf;
  }

  private getManagedPreviewLeaf(): WorkspaceLeaf | null {
    if (this.previewLeaf && this.isPreviewLeaf(this.previewLeaf)) {
      return this.previewLeaf;
    }

    const leaves = this.getAllPreviewLeaves();
    if (leaves.length === 0) {
      this.previewLeaf = null;
      return null;
    }

    this.previewLeaf = leaves[0];
    return this.previewLeaf;
  }

  private async findExportableModelWeaveView(): Promise<ModelingPreviewView | null> {
    const candidateLeaves: WorkspaceLeaf[] = [];
    const mostRecentLeaf = this.app.workspace.getMostRecentLeaf();
    if (mostRecentLeaf) {
      candidateLeaves.push(mostRecentLeaf);
    }
    if (this.previewLeaf) {
      candidateLeaves.push(this.previewLeaf);
    }
    candidateLeaves.push(...this.getAllPreviewLeaves());

    const orderedLeaves = Array.from(new Set(candidateLeaves));
    const loadedViews: ModelingPreviewView[] = [];

    for (const leaf of orderedLeaves) {
      if (!this.isPreviewLeaf(leaf)) {
        continue;
      }

      await leaf.loadIfDeferred();
      const view = leaf.view;
      if (view instanceof ModelingPreviewView) {
        loadedViews.push(view);
        if (this.isExportablePreviewView(view)) {
          this.previewLeaf = leaf;
          return view;
        }
      }
    }

    if (loadedViews.length > 0) {
      return loadedViews[0];
    }

    return null;
  }

  private isExportablePreviewView(view: ModelingPreviewView): boolean {
    const container = view.contentEl;
    if (!container?.isConnected) {
      return false;
    }

    if (container.getClientRects().length > 0) {
      return true;
    }

    return container.clientWidth > 0 || container.clientHeight > 0;
  }

  private getAllPreviewLeaves(): WorkspaceLeaf[] {
    const leaves = [
      ...this.app.workspace.getLeavesOfType(MODELING_PREVIEW_VIEW_TYPE),
      ...LEGACY_PREVIEW_VIEW_TYPES.flatMap((viewType) =>
        this.app.workspace.getLeavesOfType(viewType)
      )
    ];

    return Array.from(new Set(leaves));
  }

  private async closeDuplicatePreviewLeaves(keepLeaf: WorkspaceLeaf): Promise<void> {
    const duplicates = this.getAllPreviewLeaves().filter((leaf) => leaf !== keepLeaf);
    for (const leaf of duplicates) {
      await leaf.loadIfDeferred();
      leaf.detach();
    }
  }

  private isPreviewLeaf(leaf: WorkspaceLeaf): boolean {
    const viewType = leaf.view.getViewType();
    return (
      viewType === MODELING_PREVIEW_VIEW_TYPE ||
      LEGACY_PREVIEW_VIEW_TYPES.includes(
        viewType as (typeof LEGACY_PREVIEW_VIEW_TYPES)[number]
      )
    );
  }

  private async normalizePreviewLeaves(): Promise<void> {
    const leaves = this.getAllPreviewLeaves();
    if (leaves.length === 0) {
      return;
    }

    const keepLeaf = leaves[0];
    await keepLeaf.loadIfDeferred();
    await keepLeaf.setViewState({
      type: MODELING_PREVIEW_VIEW_TYPE,
      active: false
    });
    this.previewLeaf = keepLeaf;
    await this.closeDuplicatePreviewLeaves(keepLeaf);
  }
}

function resolveDiagnosticLine(content: string, diagnostic: ValidationWarning): number {
  if (typeof diagnostic.line === "number" && diagnostic.line >= 0) {
    return diagnostic.line;
  }

    if (typeof diagnostic.fromLine === "number" && diagnostic.fromLine >= 0) {
      return diagnostic.fromLine;
    }
    if (typeof diagnostic.toLine === "number" && diagnostic.toLine >= 0) {
      return diagnostic.toLine;
    }

  const lines = content.split(/\r?\n/);
  const frontmatterField = typeof diagnostic.field === "string" ? diagnostic.field : "";
  const section = resolveDiagnosticSection(diagnostic);

  if (frontmatterField && isFrontmatterField(frontmatterField)) {
    const frontmatterLine = findFrontmatterFieldLine(lines, frontmatterField);
    if (frontmatterLine >= 0) {
      return frontmatterLine;
    }
  }

  const relatedId =
    typeof diagnostic.context?.relatedId === "string" ? diagnostic.context.relatedId : null;
  if (section === "Relations" && relatedId) {
    const relationBlockLine = findLineIndex(lines, (line) => line.trim() === `### ${relatedId}`);
    if (relationBlockLine >= 0) {
      return relationBlockLine;
    }

    const relationRowLine = findLineIndex(lines, (line) => line.includes(`| ${relatedId} |`));
    if (relationRowLine >= 0) {
      return relationRowLine;
    }
  }

  if (section) {
    const sectionLine = findLineIndex(lines, (line) => line.trim() === `## ${section}`);
    if (sectionLine >= 0) {
      const rowIndex = getDiagnosticRowIndex(diagnostic);
      if (typeof rowIndex === "number") {
        const rowLine = findDiagnosticTableRowLine(lines, sectionLine, rowIndex);
        if (rowLine >= 0) {
          return rowLine;
        }
      }
      return sectionLine;
    }
  }

  return 0;
}

function resolveDiagnosticSection(diagnostic: ValidationWarning): string | null {
  if (typeof diagnostic.section === "string" && diagnostic.section.trim()) {
    return diagnostic.section.trim();
  }

  const contextSection =
    typeof diagnostic.context?.section === "string" ? diagnostic.context.section : null;
  if (contextSection) {
    return contextSection;
  }

  const field = typeof diagnostic.field === "string" ? diagnostic.field : "";
  if (field.startsWith("Relations:")) {
    return "Relations";
  }

  const fieldToSection: Record<string, string> = {
    objectRefs: "Objects",
    relations: "Relations",
    relatedObjects: "Relations",
    Attributes: "Attributes",
    Methods: "Methods",
    Relations: "Relations",
    Objects: "Objects",
    Columns: "Columns",
    Indexes: "Indexes",
    Notes: "Notes",
    Summary: "Summary",
    Overview: "Overview"
  };

  if (fieldToSection[field]) {
    return fieldToSection[field];
  }

  const fieldSection = field.split(".")[0]?.trim();
  return fieldSection || null;
}

function getDiagnosticRowIndex(diagnostic: ValidationWarning): number | null {
  const rawRowIndex = diagnostic.context?.rowIndex;
  if (typeof rawRowIndex === "number" && Number.isFinite(rawRowIndex)) {
    return rawRowIndex;
  }
  if (typeof rawRowIndex === "string") {
    const parsed = Number.parseInt(rawRowIndex, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function findDiagnosticTableRowLine(
  lines: string[],
  sectionLine: number,
  rowIndex: number
): number {
  if (rowIndex < 1) {
    return -1;
  }

  let tableRow = 0;
  let tableStarted = false;
  for (let index = sectionLine + 1; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (trimmed.startsWith("## ")) {
      return -1;
    }
    if (!trimmed.startsWith("|")) {
      continue;
    }
    tableStarted = true;
    if (/^\|?\s*:?-{3,}:?/.test(trimmed)) {
      continue;
    }
    tableRow += 1;
    if (tableRow === rowIndex + 1) {
      return index;
    }
  }

  return tableStarted ? sectionLine : -1;
}

function isFrontmatterField(field: string): boolean {
  return [
    "type",
    "id",
    "name",
    "kind",
    "logical_name",
    "physical_name",
    "schema_name",
    "dbms",
    "package",
    "stereotype"
  ].includes(field);
}

function findFrontmatterFieldLine(lines: string[], field: string): number {
  if ((lines[0] ?? "").trim() !== "---") {
    return -1;
  }

  for (let index = 1; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (trimmed === "---") {
      break;
    }
    if (trimmed.startsWith(`${field}:`)) {
      return index;
    }
  }

  return -1;
}

function findLineIndex(lines: string[], predicate: (line: string) => boolean): number {
  for (let index = 0; index < lines.length; index += 1) {
    if (predicate(lines[index] ?? "")) {
      return index;
    }
  }

  return -1;
}

class ModelWeaveSettingTab extends PluginSettingTab {
  private readonly plugin: ModelWeavePlugin;

  constructor(app: App, plugin: ModelWeavePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    const settings = this.plugin.getSettings();
    const t = createModelWeaveTranslator(settings.uiLanguage);

    containerEl.empty();

    new Setting(containerEl)
      .setName(t("settings.uiLanguage.name"))
      .setDesc(t("settings.uiLanguage.desc"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption("auto", t("settings.option.auto"))
          .addOption("en", t("settings.option.english"))
          .addOption("ja", t("settings.option.japanese"))
          .setValue(settings.uiLanguage)
          .onChange(async (value) => {
            if (!isUiLanguageOption(value)) {
              return;
            }

            await this.plugin.updateSettings({
              uiLanguage: value
            });
            this.display();
          });
      });

    new Setting(containerEl).setName(t("settings.section.viewer")).setHeading();

    new Setting(containerEl)
      .setName(t("settings.defaultClassRenderMode.name"))
      .setDesc(t("settings.defaultClassRenderMode.desc"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption("custom", t("settings.option.custom"))
          .addOption("mermaid", t("settings.option.mermaid"))
          .addOption("mermaid-detail", t("settings.option.mermaidDetail"))
          .setValue(settings.defaultClassRenderMode)
          .onChange(async (value) => {
            if (!isClassRenderModeOption(value)) {
              return;
            }

            await this.plugin.updateSettings({
              defaultClassRenderMode: value
            });
          });
      });

    new Setting(containerEl)
      .setName(t("settings.defaultErRenderMode.name"))
      .setDesc(t("settings.defaultErRenderMode.desc"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption("custom", t("settings.option.custom"))
          .addOption("mermaid", t("settings.option.mermaid"))
          .addOption("mermaid-detail", t("settings.option.mermaidDetail"))
          .setValue(settings.defaultErRenderMode)
          .onChange(async (value) => {
            if (!isErRenderModeOption(value)) {
              return;
            }

            await this.plugin.updateSettings({
              defaultErRenderMode: value
            });
          });
      });

    new Setting(containerEl)
      .setName(t("settings.defaultDfdRenderMode.name"))
      .setDesc(t("settings.defaultDfdRenderMode.desc"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption("mermaid", t("settings.option.mermaid"))
          .setValue(settings.defaultDfdRenderMode)
          .onChange(async (value) => {
            if (!isDfdRenderModeOption(value)) {
              return;
            }

            await this.plugin.updateSettings({
              defaultDfdRenderMode: value
            });
          });
      });

    new Setting(containerEl)
      .setName(t("settings.defaultProcessRenderMode.name"))
      .setDesc(t("settings.defaultProcessRenderMode.desc"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption("custom", t("settings.option.custom"))
          .setValue(settings.defaultProcessRenderMode)
          .onChange(async (value) => {
            if (!isProcessRenderModeOption(value)) {
              return;
            }

            await this.plugin.updateSettings({
              defaultProcessRenderMode: value
            });
          });
      });

    new Setting(containerEl)
      .setName(t("settings.defaultScreenRenderMode.name"))
      .setDesc(t("settings.defaultScreenRenderMode.desc"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption("custom", t("settings.option.custom"))
          .setValue(settings.defaultScreenRenderMode)
          .onChange(async (value) => {
            if (!isScreenRenderModeOption(value)) {
              return;
            }

            await this.plugin.updateSettings({
              defaultScreenRenderMode: value
            });
          });
      });

    new Setting(containerEl)
      .setName(t("settings.defaultDomainsViewMode.name"))
      .setDesc(t("settings.defaultDomainsViewMode.desc"))
      .addDropdown((dropdown) => {
        for (const option of DOMAIN_VIEW_MODE_SETTING_OPTIONS) {
          dropdown.addOption(option.value, option.label);
        }
        dropdown.setValue(settings.defaultDomainsViewMode)
          .onChange(async (value) => {
            if (!isDomainViewModeOption(value)) {
              return;
            }

            await this.plugin.updateSettings({
              defaultDomainsViewMode: value
            });
          });
      });

    new Setting(containerEl)
      .setName(t("settings.defaultDomainDiagramViewMode.name"))
      .setDesc(t("settings.defaultDomainDiagramViewMode.desc"))
      .addDropdown((dropdown) => {
        for (const option of DOMAIN_VIEW_MODE_SETTING_OPTIONS) {
          dropdown.addOption(option.value, option.label);
        }
        dropdown.setValue(settings.defaultDomainDiagramViewMode)
          .onChange(async (value) => {
            if (!isDomainViewModeOption(value)) {
              return;
            }

            await this.plugin.updateSettings({
              defaultDomainDiagramViewMode: value
            });
          });
      });

    new Setting(containerEl)
      .setName(t("settings.defaultZoom.name"))
      .setDesc(t("settings.defaultZoom.desc"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption("fit", t("settings.option.fit"))
          .addOption("100", "100%")
          .setValue(settings.defaultZoom)
          .onChange(async (value) => {
            if (!isDefaultZoomOption(value)) {
              return;
            }

            await this.plugin.updateSettings({
              defaultZoom: value
            });
          });
      });

    new Setting(containerEl)
      .setName(t("settings.fontSize.name"))
      .setDesc(t("settings.fontSize.desc"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption("small", t("settings.option.small"))
          .addOption("normal", t("settings.option.normal"))
          .addOption("large", t("settings.option.large"))
          .setValue(settings.fontSize)
          .onChange(async (value) => {
            if (!isFontSizeOption(value)) {
              return;
            }

            await this.plugin.updateSettings({
              fontSize: value
            });
          });
      });

    new Setting(containerEl)
      .setName(t("settings.nodeDensity.name"))
      .setDesc(t("settings.nodeDensity.desc"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption("compact", t("settings.option.compact"))
          .addOption("normal", t("settings.option.normal"))
          .addOption("relaxed", t("settings.option.relaxed"))
          .setValue(settings.nodeDensity)
          .onChange(async (value) => {
            if (!isNodeDensityOption(value)) {
              return;
            }

            await this.plugin.updateSettings({
              nodeDensity: value
            });
          });
      });

    new Setting(containerEl)
      .setName(t("settings.relationshipView.name"))
      .setDesc(t("settings.relationshipView.desc"))
      .addToggle((toggle) => {
        toggle
          .setValue(settings.enableRelationshipView)
          .onChange(async (value) => {
            await this.plugin.updateSettings({
              enableRelationshipView: value
            });
          });
      });

    new Setting(containerEl)
      .setName(t("settings.showMermaidRenderDebug.name"))
      .setDesc(t("settings.showMermaidRenderDebug.desc"))
      .addToggle((toggle) => {
        toggle
          .setValue(settings.showMermaidRenderDebug)
          .onChange(async (value) => {
            await this.plugin.updateSettings({
              showMermaidRenderDebug: value
            });
          });
      });

    new Setting(containerEl)
      .setName(t("settings.localSourceRoot.name"))
      .setDesc(t("settings.localSourceRoot.desc"))
      .addText((text) => {
        text
          .setPlaceholder("/path/to/source/checkout")
          .setValue(settings.localSourceRoot)
          .onChange(async (value) => {
            await this.plugin.updateSettings({
              localSourceRoot: value
            });
          });
      });

    new Setting(containerEl)
      .setName(t("settings.defaultColorScheme.name"))
      .setDesc(t("settings.defaultColorScheme.desc"))
      .addText((text) => {
        text
          .setPlaceholder("[[color-scheme-default]]")
          .setValue(settings.defaultColorSchemeRef ?? "")
          .onChange(async (value) => {
            await this.plugin.updateSettings({
              defaultColorSchemeRef: value
            });
          });
      });

    new Setting(containerEl)
      .setName(t("settings.refreshOpenViews.name"))
      .setDesc(t("settings.refreshOpenViews.desc"))
      .addButton((button) => {
        button.setButtonText(t("settings.refreshOpenViews.button")).onClick(async () => {
          await this.plugin.refreshOpenModelWeaveViews();
          new Notice(t("settings.refreshOpenViews.notice"));
        });
      });
  }
}
