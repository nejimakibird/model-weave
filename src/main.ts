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
import { resolveObjectContext } from "./core/object-context-resolver";
import {
  buildCurrentDiagramDiagnostics,
  buildCurrentObjectDiagnostics
} from "./core/current-file-diagnostics";
import { resolveDiagramRelations } from "./core/relation-resolver";
import {
  parseQualifiedRef,
  parseReferenceValue,
  resolveReferenceIdentity
} from "./core/reference-resolver";
import {
  resolveRenderMode,
  getSupportedRenderModes,
  type RenderMode,
  type ResolvedRenderMode
} from "./core/render-mode";
import { detectFileType } from "./core/schema-detector";
import { openModelWeaveCompletion } from "./editor/model-weave-editor-suggest";
import { DiagramExportError } from "./export/png-export";
import {
  DEFAULT_MODEL_WEAVE_SETTINGS,
  normalizeModelWeaveSettings,
  type ModelWeaveSettings,
  type ModelWeaveViewerPreferences
} from "./settings/model-weave-settings";
import {
  MODEL_WEAVE_TEMPLATES,
  MODEL_WEAVE_RELATION_TEMPLATES,
  type ModelWeaveTemplateKey
} from "./templates/model-weave-templates";
import { buildVaultIndex, type ModelingVaultIndex } from "./core/vault-index";
import {
  getMarkdownTableCellRanges,
  splitMarkdownTableRow
} from "./parsers/markdown-table";
import type { FileType, ValidationWarning } from "./types/models";
import { openModelObjectNote } from "./utils/model-navigation";
import {
  ModelingPreviewView,
  MODELING_PREVIEW_VIEW_TYPE,
  type PreviewUpdateReason
} from "./views/modeling-preview-view";

const LEGACY_PREVIEW_VIEW_TYPES = [
  "mdspec-object-preview",
  "mdspec-relations-preview",
  "mdspec-diagram-preview"
] as const;

const UNSUPPORTED_MESSAGE =
  "This file format is not supported. Supported formats: class / class_diagram / er_entity / er_diagram / dfd_object / dfd_diagram / data_object / app_process / screen / rule / codeset / message / mapping";
const DEPRECATED_ER_RELATION_MESSAGE =
  "This file format is not supported. Use er_entity with ## Relations instead of the legacy er_relation format.";
const DEPRECATED_DIAGRAM_MESSAGE =
  "This file format is not supported. Migrate legacy diagram_v1 files to class_diagram or er_diagram.";
const MARKDOWN_ONLY_NOTICE =
  "Template insertion is available only for Markdown files.";
const NON_EMPTY_FILE_NOTICE =
  "Current file is not empty. Template insertion is available only for empty files.";
const ER_RELATION_TYPE_NOTICE =
  "ER relation block insertion is available only for er_entity files.";

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

function isRenderModeOption(value: string): value is RenderMode {
  return value === "auto" || value === "custom" || value === "mermaid";
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

export default class ModelWeavePlugin extends Plugin {
  private index: ModelingVaultIndex | null = null;
  private previewLeaf: WorkspaceLeaf | null = null;
  private readonly rendererOverridesByFilePath = new Map<string, RenderMode>();
  private settings: ModelWeaveSettings = DEFAULT_MODEL_WEAVE_SETTINGS;

  async onload(): Promise<void> {
    this.settings = normalizeModelWeaveSettings(await this.loadData());

    this.registerView(
      MODELING_PREVIEW_VIEW_TYPE,
      (leaf) => new ModelingPreviewView(leaf, this.getViewerPreferences())
    );
    this.addSettingTab(new ModelWeaveSettingTab(this.app, this));

    this.addCommand({
      id: "rebuild-modeling-index",
      name: "Rebuild modeling index",
      callback: async () => {
        await this.rebuildIndex();
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
      name: "Insert ER entity template",
      callback: async () => {
        await this.insertTemplateIntoActiveFile("erEntity");
      }
    });

    this.addCommand({
      id: "insert-er-diagram-template",
      name: "Insert ER diagram template",
      callback: async () => {
        await this.insertTemplateIntoActiveFile("erDiagram");
      }
    });

    this.addCommand({
      id: "insert-dfd-object-template",
      name: "Insert DFD object template",
      callback: async () => {
        await this.insertTemplateIntoActiveFile("dfdObject");
      }
    });

    this.addCommand({
      id: "insert-dfd-diagram-template",
      name: "Insert DFD diagram template",
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
      id: "insert-er-relation-block",
      name: "Insert ER relation block",
      callback: async () => {
        await this.insertErRelationBlock();
      }
    });

    this.addCommand({
      id: "complete-current-field",
      name: "Complete current field",
      callback: () => {
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

  private async rebuildIndex(): Promise<void> {
    const files = await Promise.all(
      this.app.vault.getMarkdownFiles().map(async (file) => ({
        path: file.path,
        content: await this.app.vault.cachedRead(file)
      }))
    );

    this.index = buildVaultIndex(files);
  }

  getSettings(): ModelWeaveSettings {
    return this.settings;
  }

  getViewerPreferences(): ModelWeaveViewerPreferences {
    return {
      defaultZoom: this.settings.defaultZoom,
      fontSize: this.settings.fontSize,
      nodeDensity: this.settings.nodeDensity
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
      new Notice("No active markdown file");
      return;
    }

    await this.showPreviewForFile(file, undefined, true, "external-file-open");
  }

  private async exportCurrentDiagramAsPng(): Promise<void> {
    const view = await this.findExportableModelWeaveView();
    if (!view) {
      new Notice("No exportable Model Weave diagram is currently displayed.");
      return;
    }

    try {
      const exportPath = await view.exportCurrentDiagramAsPng();
      if (!exportPath) {
        new Notice("The current Model Weave view is not ready for export.");
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
    const frontmatterType = this.app.metadataCache.getFileCache(file)?.frontmatter?.type;
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

      const model = this.index?.modelsByFilePath[file.path];
      const fileType = model ? detectFileType(model.frontmatter) : "markdown";
      const isSupported =
        fileType === "object" ||
        fileType === "er-entity" ||
        fileType === "diagram" ||
        fileType === "dfd-object" ||
        fileType === "dfd-diagram" ||
        fileType === "data-object" ||
        fileType === "app-process" ||
        fileType === "screen" ||
        fileType === "rule" ||
        fileType === "codeset" ||
        fileType === "message" ||
        fileType === "mapping";

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
    reason: PreviewUpdateReason = "rerender"
  ): Promise<void> {
    if (!this.index) {
      await this.rebuildIndex();
    }

    if (!this.index) {
      return;
    }

    const model = this.index.modelsByFilePath[file.path];
    const leaf = await this.ensurePreviewLeaf(preferredLeaf, activate);
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

      switch (fileType) {
      case "object":
      case "er-entity": {
        const objectModel =
          model.fileType === "object" || model.fileType === "er-entity" ? model : null;
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
          const resolved =
            model.fileType === "dfd-diagram" && this.index
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
        case "data-object": {
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
              filePath: model.path,
              title: model.name || model.id || this.getPathBasename(model.path),
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
              message:
                "data_object is a supported Model Weave type. Use the Markdown editor as the source of truth; this preview shows diagnostics and detected structure.",
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
              const warnings = [
                ...(this.index.warningsByFilePath[file.path] ?? []),
                ...renderModeWarnings
              ];
            if (model.fileType === "app-process") {
              const diagnostics = buildCurrentObjectDiagnostics(
                model,
              this.index,
              null,
              warnings
            );
            view.updateContent({
              mode: "summary",
              rendererSelection,
              filePath: model.path,
              title: model.name || model.id || this.getPathBasename(model.path),
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
                  { label: "Transitions", value: model.transitions.length }
                ],
                tables: this.buildAppProcessSummaryTables(model, file.path),
                message:
                  "app_process is a supported Model Weave type. Use the Markdown editor as the source of truth; this preview shows diagnostics and detected structure.",
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
                  rendererSelection,
                filePath: model.path,
                title: model.name || model.id || this.getPathBasename(model.path),
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
                    { title: "Outgoing screens", items: outgoingScreens }
                  ],
                  message:
                    "screen is a supported Model Weave type. Use the Markdown editor as the source of truth; this preview shows diagnostics and detected structure.",
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
                filePath: model.path,
                title: model.name || model.id || this.getPathBasename(model.path),
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
                message:
                  "codeset is a supported Model Weave type. Use the Markdown editor as the source of truth; this preview shows diagnostics and detected structure.",
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
                filePath: model.path,
                title: model.name || model.id || this.getPathBasename(model.path),
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
                message:
                  "message is a supported Model Weave type. Use the Markdown editor as the source of truth; this preview shows diagnostics and detected structure.",
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
                filePath: model.path,
                title: model.name || model.id || this.getPathBasename(model.path),
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
                message:
                  "rule is a supported Model Weave type. Use the Markdown editor as the source of truth; this preview shows diagnostics and detected structure.",
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
                filePath: model.path,
                title: model.name || model.id || this.getPathBasename(model.path),
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
                message:
                  "mapping is a supported Model Weave type. Use the Markdown editor as the source of truth; this preview shows diagnostics and detected structure.",
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
    },
    filePath: string
  ): Array<{ label: string; line?: number; ch?: number }> {
    const lines = this.getFileLines(filePath);
    const sections: Array<{ label: string; line?: number; ch?: number }> = [];
    const orderedKeys = [
      "Summary",
      "Triggers",
      "Inputs",
      "Steps",
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
      if (key === "Inputs") {
        sections.push({ label: `Inputs: ${model.inputs.length} rows`, line, ch: 0 });
      } else if (key === "Outputs") {
        sections.push({ label: `Outputs: ${model.outputs.length} rows`, line, ch: 0 });
      } else if (key === "Triggers") {
        sections.push({ label: `Triggers: ${model.triggers.length} rows`, line, ch: 0 });
      } else if (key === "Transitions") {
        sections.push({ label: `Transitions: ${model.transitions.length} rows`, line, ch: 0 });
      } else {
        sections.push({ label: key, line, ch: 0 });
      }
    }
    return sections;
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
        title: "Layout Summary",
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
        title: "Fields summary",
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
        title: "Actions Summary",
        columns: ["id", "label", "target", "event", "invoke", "transition", "notes"],
        rows: actionsRows.map((row) => ({
          cells: [
            row.record.id ?? "",
            row.record.label ?? "",
            row.record.target ?? "",
            row.record.event ?? "",
            this.formatReferenceDisplay(row.record.invoke),
            this.formatReferenceDisplay(row.record.transition),
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
      items.push({
        label: `${action.label?.trim() || "(action)"} -> ${display}`,
        line: action.rowLine,
        ch: 0
      });
    }

      return items;
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
        toolbarOverride: this.rendererOverridesByFilePath.get(filePath) ?? null,
        frontmatterRenderMode: frontmatter.render_mode,
        settingsDefaultRenderMode: this.settings.defaultRenderMode
      });
    }

  private buildRendererSelectionState(
    filePath: string,
    resolved: ResolvedRenderMode,
    fileType: FileType,
    modelKind?: string | null
  ): {
    selectedMode: RenderMode;
    visibleSelectedMode: RenderMode;
    supportedModes: RenderMode[];
    effectiveMode: "custom" | "mermaid";
    actualRenderer: "custom" | "mermaid" | "table-text";
    source: "toolbar" | "frontmatter" | "settings" | "format_default" | "fallback";
    fallbackReason?: string;
    onSelectMode: (mode: RenderMode) => void;
  } {
      const supportedModes = getSupportedRenderModes(fileType, modelKind);
      const visibleSelectedMode = supportedModes.includes(resolved.selectedMode)
        ? resolved.selectedMode
        : "auto";

      return {
        selectedMode: resolved.selectedMode,
        visibleSelectedMode,
        supportedModes,
        effectiveMode: resolved.effectiveMode,
        actualRenderer: resolved.actualRenderer,
        source: resolved.source,
      fallbackReason: resolved.fallbackReason,
      onSelectMode: (mode) => {
        if (mode === "auto") {
          this.rendererOverridesByFilePath.delete(filePath);
        } else {
          this.rendererOverridesByFilePath.set(filePath, mode);
        }
        void this.syncPreviewToActiveFile(false, "rerender");
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
        label: "未分類 [unassigned]",
        subtitle: "layout 未指定または未定義",
        line: undefined,
        ch: 0,
        items: ungrouped
      });
    }

    return blocks;
  }

  private buildAppProcessSummaryTables(
    model: { triggers: Array<unknown>; transitions: Array<unknown> },
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

    return tables;
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
      new Notice("Model index is not available");
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
    activate = true
  ): Promise<WorkspaceLeaf> {
    const leaf = preferredLeaf ?? (await this.findOrCreatePreviewLeaf());

    await leaf.setViewState({
      type: MODELING_PREVIEW_VIEW_TYPE,
      active: activate
    });

    this.previewLeaf = leaf;
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

  return fieldToSection[field] ?? null;
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

    containerEl.empty();
    new Setting(containerEl).setName("General").setHeading();

    new Setting(containerEl)
      .setName("Default render mode")
      .setDesc(
        "Used only when neither the toolbar override nor frontmatter.render_mode specifies a renderer."
      )
      .addDropdown((dropdown) => {
        dropdown
          .addOption("auto", "Auto")
          .addOption("custom", "Custom")
          .addOption("mermaid", "Mermaid")
          .setValue(settings.defaultRenderMode)
          .onChange(async (value) => {
            if (!isRenderModeOption(value)) {
              return;
            }

            await this.plugin.updateSettings({
              defaultRenderMode: value
            });
          });
      });

    new Setting(containerEl)
      .setName("Default zoom")
      .setDesc(
        "Initial diagram zoom when no saved viewport state exists. Fit uses fit-to-view; 100% opens at actual scale."
      )
      .addDropdown((dropdown) => {
        dropdown
          .addOption("fit", "Fit")
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
      .setName("Font size")
      .setDesc("Adjusts the base preview text size across Model Weave viewers.")
      .addDropdown((dropdown) => {
        dropdown
          .addOption("small", "Small")
          .addOption("normal", "Normal")
          .addOption("large", "Large")
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
      .setName("Node density")
      .setDesc(
        "Controls diagram compactness where supported. Compact reduces padding and gaps; relaxed gives more breathing room."
      )
      .addDropdown((dropdown) => {
        dropdown
          .addOption("compact", "Compact")
          .addOption("normal", "Normal")
          .addOption("relaxed", "Relaxed")
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
      .setName("Refresh open Model Weave views")
      .setDesc("Re-render open Model Weave previews using the current settings.")
      .addButton((button) => {
        button.setButtonText("Refresh").onClick(async () => {
          await this.plugin.refreshOpenModelWeaveViews();
          new Notice("Refreshed open Model Weave views");
        });
      });
  }
}
