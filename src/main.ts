import { MarkdownView, Notice, Plugin, TFile, WorkspaceLeaf } from "obsidian";
import { buildDfdObjectScene } from "./core/dfd-object-scene";
import { resolveObjectContext } from "./core/object-context-resolver";
import {
  buildCurrentDiagramDiagnostics,
  buildCurrentObjectDiagnostics
} from "./core/current-file-diagnostics";
import { resolveDiagramRelations } from "./core/relation-resolver";
import { detectFileType } from "./core/schema-detector";
import { openModelWeaveCompletion } from "./editor/model-weave-editor-suggest";
import { DiagramExportError } from "./export/png-export";
import {
  MODEL_WEAVE_TEMPLATES,
  MODEL_WEAVE_RELATION_TEMPLATES,
  type ModelWeaveTemplateKey
} from "./templates/model-weave-templates";
import { buildVaultIndex, type ModelingVaultIndex } from "./core/vault-index";
import type { ValidationWarning } from "./types/models";
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
  "This file format is not supported. Supported formats: class / class_diagram / er_entity / er_diagram / dfd_object / dfd_diagram";
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

export default class ModelingToolPlugin extends Plugin {
  private index: ModelingVaultIndex | null = null;
  private previewLeaf: WorkspaceLeaf | null = null;

  async onload(): Promise<void> {
    this.registerView(
      MODELING_PREVIEW_VIEW_TYPE,
      (leaf) => new ModelingPreviewView(leaf)
    );

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
      name: "Insert Class Template",
      callback: async () => {
        await this.insertTemplateIntoActiveFile("class");
      }
    });

    this.addCommand({
      id: "insert-class-diagram-template",
      name: "Insert Class Diagram Template",
      callback: async () => {
        await this.insertTemplateIntoActiveFile("classDiagram");
      }
    });

    this.addCommand({
      id: "insert-er-entity-template",
      name: "Insert ER Entity Template",
      callback: async () => {
        await this.insertTemplateIntoActiveFile("erEntity");
      }
    });

    this.addCommand({
      id: "insert-er-diagram-template",
      name: "Insert ER Diagram Template",
      callback: async () => {
        await this.insertTemplateIntoActiveFile("erDiagram");
      }
    });

    this.addCommand({
      id: "insert-dfd-object-template",
      name: "Insert DFD Object Template",
      callback: async () => {
        await this.insertTemplateIntoActiveFile("dfdObject");
      }
    });

    this.addCommand({
      id: "insert-dfd-diagram-template",
      name: "Insert DFD Diagram Template",
      callback: async () => {
        await this.insertTemplateIntoActiveFile("dfdDiagram");
      }
    });

    this.addCommand({
      id: "insert-data-object-template",
      name: "Insert Data Object Template",
      callback: async () => {
        await this.insertTemplateIntoActiveFile("dataObject");
      }
    });

    this.addCommand({
      id: "insert-er-relation-block",
      name: "Insert ER Relation Block",
      callback: async () => {
        await this.insertErRelationBlock();
      }
    });

    this.addCommand({
      id: "complete-current-field",
      name: "Complete Current Field",
      callback: () => {
        openModelWeaveCompletion(this.app, () => this.index);
      }
    });

    this.addCommand({
      id: "export-current-diagram-as-png",
      name: "Export Current Diagram as PNG",
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
    console.info("[model-weave] plugin loaded");
  }

  onunload(): void {
    if (this.previewLeaf) {
      this.previewLeaf.detach();
      this.previewLeaf = null;
    }

    console.info("[model-weave] plugin unloaded");
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
      console.error("[model-weave] failed to export PNG", error);
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
      fileType === "dfd-diagram";

    if (!previewLeaf && !openIfSupported) {
      return;
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

    if (!model) {
      view.updateContent({
        mode: "empty",
        message: await this.getEmptyStateMessage(file),
        warnings: []
      }, reason);
      return;
    }

    switch (detectFileType(model.frontmatter)) {
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
          ...(context?.warnings ?? [])
        ];

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
          const warnings = this.index.warningsByFilePath[file.path] ?? [];
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
    editor.setCursor({ line: targetLine, ch: 0 });
    editor.scrollIntoView(
      {
        from: { line: targetLine, ch: 0 },
        to: { line: targetLine, ch: 0 }
      },
      true
      );
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
    const activeLeaf = this.app.workspace.activeLeaf;
    if (activeLeaf) {
      candidateLeaves.push(activeLeaf);
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
