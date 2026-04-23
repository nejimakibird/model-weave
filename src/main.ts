import { Notice, Plugin, TFile, WorkspaceLeaf } from "obsidian";
import { resolveObjectContext } from "./core/object-context-resolver";
import { resolveDiagramRelations } from "./core/relation-resolver";
import { detectFileType } from "./core/schema-detector";
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
  "This file format is not supported. Supported formats: class / class_diagram / er_entity / er_diagram";
const DEPRECATED_ER_RELATION_MESSAGE =
  "This file format is not supported. Use er_entity with ## Relations instead of the legacy er_relation format.";
const DEPRECATED_DIAGRAM_MESSAGE =
  "This file format is not supported. Migrate legacy diagram_v1 files to class_diagram or er_diagram.";

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
      fileType === "object" || fileType === "er-entity" || fileType === "diagram";

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
          view.updateContent({
            mode: "object",
            model: objectModel,
            context,
            warnings,
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
        view.updateContent(
          resolved
            ? {
                mode: "diagram",
                diagram: resolved,
                warnings,
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
