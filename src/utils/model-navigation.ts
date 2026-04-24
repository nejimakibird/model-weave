import { TFile } from "obsidian";
import type { App } from "obsidian";
import type { ModelingVaultIndex } from "../core/vault-index";

export interface OpenModelObjectOptions {
  openInNewLeaf?: boolean;
  sourcePath?: string;
}

export async function openModelObjectNote(
  app: App,
  index: ModelingVaultIndex,
  objectId: string,
  options: OpenModelObjectOptions = {}
): Promise<{ ok: boolean; reason?: string }> {
  const model =
    index.objectsById[objectId] ??
    index.erEntitiesById[objectId] ??
    index.dfdObjectsById[objectId];

  if (!model) {
    return {
      ok: false,
      reason: `Object "${objectId}" was not found in the current index.`
    };
  }

  const file = app.vault.getAbstractFileByPath(model.path);
  if (!(file instanceof TFile)) {
    return {
      ok: false,
      reason: `Note for object "${objectId}" could not be opened.`
    };
  }

  const leaf = options.openInNewLeaf
    ? app.workspace.getLeaf(true)
    : findExistingMarkdownLeaf(app, options.sourcePath) ??
      app.workspace.getMostRecentLeaf();

  if (!leaf) {
    return {
      ok: false,
      reason: `No target tab was available to open "${objectId}".`
    };
  }

  await leaf.openFile(file);

  return { ok: true };
}

function findExistingMarkdownLeaf(app: App, sourcePath?: string) {
  if (!sourcePath) {
    return null;
  }

  const markdownLeaves = app.workspace.getLeavesOfType("markdown");
  for (const leaf of markdownLeaves) {
    const viewFile = (leaf.view as { file?: TFile | null }).file ?? null;
    if (viewFile?.path === sourcePath) {
      return leaf;
    }
  }

  return null;
}
