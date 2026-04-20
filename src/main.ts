import {
  Notice,
  Plugin,
  TFile,
  WorkspaceLeaf
} from "obsidian";
import { buildVaultIndex, type ModelingVaultIndex } from "./core/vault-index";
import { resolveObjectContext } from "./core/object-context-resolver";
import { resolveDiagramRelations } from "./core/relation-resolver";
import { detectFileType } from "./core/schema-detector";
import { openModelObjectNote } from "./utils/model-navigation";
import { DiagramPreviewView, DIAGRAM_PREVIEW_VIEW_TYPE } from "./views/diagram-preview-view";
import { ObjectPreviewView, OBJECT_PREVIEW_VIEW_TYPE } from "./views/object-preview-view";
import { RelationsPreviewView, RELATIONS_PREVIEW_VIEW_TYPE } from "./views/relations-preview-view";

export default class ModelingToolPlugin extends Plugin {
  private index: ModelingVaultIndex | null = null;
  private previewLeaf: WorkspaceLeaf | null = null;

  async onload(): Promise<void> {
    this.registerView(
      OBJECT_PREVIEW_VIEW_TYPE,
      (leaf) => new ObjectPreviewView(leaf)
    );
    this.registerView(
      RELATIONS_PREVIEW_VIEW_TYPE,
      (leaf) => new RelationsPreviewView(leaf)
    );
    this.registerView(
      DIAGRAM_PREVIEW_VIEW_TYPE,
      (leaf) => new DiagramPreviewView(leaf)
    );

    this.addCommand({
      id: "rebuild-modeling-index",
      name: "Rebuild modeling index",
      callback: async () => {
        await this.rebuildIndex();
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
        if (this.previewLeaf) {
          await this.refreshOpenPreview();
        }
      })
    );

    this.registerEvent(
      this.app.vault.on("modify", async () => {
        await this.rebuildIndex();
      })
    );
    this.registerEvent(
      this.app.vault.on("create", async () => {
        await this.rebuildIndex();
      })
    );
    this.registerEvent(
      this.app.vault.on("delete", async () => {
        await this.rebuildIndex();
      })
    );
    this.registerEvent(
      this.app.vault.on("rename", async () => {
        await this.rebuildIndex();
      })
    );

    await this.rebuildIndex();
    console.info("[modeling-tool-obsidian] plugin loaded");
  }

  onunload(): void {
    if (this.previewLeaf) {
      this.previewLeaf.detach();
      this.previewLeaf = null;
    }

    console.info("[modeling-tool-obsidian] plugin unloaded");
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

    await this.showPreviewForFile(file);
  }

  private async refreshOpenPreview(): Promise<void> {
    const file = this.app.workspace.getActiveFile();
    if (!file || !this.previewLeaf) {
      return;
    }

    await this.showPreviewForFile(file, this.previewLeaf);
  }

  private async showPreviewForFile(
    file: TFile,
    preferredLeaf?: WorkspaceLeaf
  ): Promise<void> {
    if (!this.index) {
      await this.rebuildIndex();
    }

    if (!this.index) {
      return;
    }

    const model = this.index.modelsByFilePath[file.path];
    if (!model) {
      new Notice("No parsed model for the active file");
      return;
    }

    switch (detectFileType(model.frontmatter)) {
      case "object":
        await this.showObjectPreview(model.path, preferredLeaf);
        return;
      case "relations":
        await this.showRelationsPreview(model.path, preferredLeaf);
        return;
      case "diagram":
        await this.showDiagramPreview(model.path, preferredLeaf);
        return;
      case "er-entity":
        await this.showObjectPreview(model.path, preferredLeaf);
        return;
      case "er-relation":
        await this.showRelationsPreview(model.path, preferredLeaf);
        return;
      case "markdown":
      default:
        new Notice("Active file is not a supported modeling document");
    }
  }

  private async showObjectPreview(
    path: string,
    preferredLeaf?: WorkspaceLeaf
  ): Promise<void> {
    const leaf = await this.ensureLeaf(OBJECT_PREVIEW_VIEW_TYPE, preferredLeaf);
    const view = leaf.view;
    const model = this.index?.modelsByFilePath[path];

    if (view instanceof ObjectPreviewView) {
      const objectModel =
        model?.fileType === "object" || model?.fileType === "er-entity"
          ? model
          : null;
      const context =
        objectModel && this.index
          ? resolveObjectContext(objectModel, this.index)
          : null;
      const warnings = [
        ...(this.index?.warningsByFilePath[path] ?? []),
        ...(context?.warnings ?? [])
      ];
      view.setPreview(
        objectModel,
        context,
        objectModel
          ? (objectId, navigation) => {
              void this.openObjectNote(objectId, path, navigation);
            }
          : null,
        warnings
      );
    }
  }

  private async showRelationsPreview(
    path: string,
    preferredLeaf?: WorkspaceLeaf
  ): Promise<void> {
    const leaf = await this.ensureLeaf(RELATIONS_PREVIEW_VIEW_TYPE, preferredLeaf);
    const view = leaf.view;
    const model = this.index?.modelsByFilePath[path];

    if (view instanceof RelationsPreviewView) {
      view.setPreview(
        model?.fileType === "relations" || model?.fileType === "er-relation"
          ? model
          : null,
        this.index?.warningsByFilePath[path] ?? []
      );
    }
  }

  private async showDiagramPreview(
    path: string,
    preferredLeaf?: WorkspaceLeaf
  ): Promise<void> {
    const leaf = await this.ensureLeaf(DIAGRAM_PREVIEW_VIEW_TYPE, preferredLeaf);
    const view = leaf.view;
    const model = this.index?.modelsByFilePath[path];

    if (view instanceof DiagramPreviewView) {
      const resolved =
        model?.fileType === "diagram" && this.index
          ? resolveDiagramRelations(model, this.index)
          : null;
      const warnings = [
        ...(this.index?.warningsByFilePath[path] ?? []),
        ...(resolved?.warnings ?? [])
      ];
      view.setPreview(
        resolved,
        resolved
          ? (objectId, navigation) => {
              void this.openObjectNote(objectId, path, navigation);
            }
          : null,
        warnings
      );
    }
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
    }
  }

  private async ensureLeaf(
    viewType: string,
    preferredLeaf?: WorkspaceLeaf
  ): Promise<WorkspaceLeaf> {
    const leaf =
      preferredLeaf ??
      this.previewLeaf ??
      this.app.workspace.getRightLeaf(false) ??
      this.app.workspace.getLeaf(true);

    await leaf.setViewState({
      type: viewType,
      active: true
    });

    this.previewLeaf = leaf;
    return leaf;
  }
}
