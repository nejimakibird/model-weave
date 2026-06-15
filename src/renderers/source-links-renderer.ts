import { existsSync, statSync } from "fs";
import path from "path";
import { shell } from "electron";
import { Notice } from "obsidian";
import type { SourceLink } from "../types/models";
import {
  createModelWeaveTranslator,
  type ModelWeaveTranslator,
  type ModelWeaveUiLanguage
} from "../i18n/messages";

interface SourceLinkStatus {
  label: string;
  modifierClass: string;
  resolvedPath: string;
  openable: boolean;
  actionNote?: string;
}

type SourcePathKind =
  | "windowsDrive"
  | "windowsUnc"
  | "slashStyleWindowsUnc"
  | "posixAbsolute"
  | "fileUri"
  | "relative";

interface ClassifiedSourcePath {
  kind: SourcePathKind;
  normalizedPath: string;
}

interface ResolvedSourcePath {
  kind: SourcePathKind;
  rootPath: string;
  resolvedPath: string;
  usedSourceRoot: boolean;
  unsupportedSourceRoot?: boolean;
}

export function renderSourceLinks(
  sourceLinks: SourceLink[] | undefined,
  localSourceRoot: string,
  language: ModelWeaveUiLanguage = "auto"
): HTMLElement | null {
  const validSourceLinks = (sourceLinks ?? []).filter((sourceLink) =>
    sourceLink.path.trim()
  );
  if (validSourceLinks.length === 0) {
    return null;
  }
  const t = createModelWeaveTranslator(language);

  const section = activeDocument.createElement("section");
  section.addClass("model-weave-source-links");
  section.addClass("model-weave-preview-section");

  const title = activeDocument.createElement("h3");
  title.textContent = t("sourceLinks.title");
  title.addClass("model-weave-source-links-title");
  title.addClass("model-weave-preview-section-title");
  section.appendChild(title);

  section.createEl("p", {
    text: t("sourceLinks.help"),
    cls: "model-weave-source-links-help"
  });

  const tableWrap = activeDocument.createElement("div");
  tableWrap.addClass("model-weave-table-wrap");

  const table = activeDocument.createElement("table");
  table.addClass("model-weave-source-links-table");
  table.addClass("model-weave-data-table");

  const thead = table.createEl("thead");
  const headRow = thead.createEl("tr");
  for (const header of [
    t("sourceLinks.path"),
    t("sourceLinks.status"),
    t("sourceLinks.resolvedPath"),
    t("sourceLinks.notes"),
    t("sourceLinks.action")
  ]) {
    headRow.createEl("th", {
      text: header,
      cls: "model-weave-source-links-th"
    });
  }

  const tbody = table.createEl("tbody");
  for (const sourceLink of validSourceLinks) {
    const status = resolveSourceLinkStatus(sourceLink, localSourceRoot, t);
    const row = tbody.createEl("tr");
    row.createEl("td", {
      text: sourceLink.path,
      cls: "model-weave-source-links-td model-weave-source-links-path"
    });

    const statusCell = row.createEl("td", { cls: "model-weave-source-links-td" });
    const badge = statusCell.createEl("span", {
      text: status.label,
      cls: `model-weave-source-links-status ${status.modifierClass}`
    });
    badge.title = status.label;

    row.createEl("td", {
      text: status.resolvedPath,
      cls: "model-weave-source-links-td model-weave-source-links-resolved"
    });
    row.createEl("td", {
      text: sourceLink.notes ?? sourceLink.label ?? "-",
      cls: "model-weave-source-links-td"
    });

    const actionCell = row.createEl("td", { cls: "model-weave-source-links-td" });
    const copyButton = actionCell.createEl("button", {
      text: t("sourceLinks.copyPath"),
      cls: "model-weave-source-links-open"
    });
    copyButton.type = "button";
    copyButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      void navigator.clipboard?.writeText(status.resolvedPath);
    });
    const button = actionCell.createEl("button", {
      text: t("sourceLinks.open"),
      cls: "model-weave-source-links-open"
    });
    button.type = "button";
    button.disabled = !status.openable;
    button.title = t("sourceLinks.openWithDefaultApp");
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      void openResolvedSourcePath(status.resolvedPath, t);
    });
    if (status.actionNote) {
      actionCell.createEl("span", {
        text: status.actionNote,
        cls: "model-weave-source-links-action-note"
      });
    }
  }

  tableWrap.appendChild(table);
  section.appendChild(tableWrap);
  return section;
}

function resolveSourceLinkStatus(
  sourceLink: SourceLink,
  localSourceRoot: string,
  t: ModelWeaveTranslator
): SourceLinkStatus {
  const resolved = resolveSourceLinkPath(localSourceRoot, sourceLink.path);
  if (resolved.kind === "fileUri") {
    return {
      label: t("sourceLinks.unsupportedFileUri"),
      modifierClass: "model-weave-source-links-status-neutral",
      resolvedPath: resolved.resolvedPath,
      openable: false,
      actionNote: t("sourceLinks.useFilesystemPath")
    };
  }

  const { kind, rootPath, resolvedPath } = resolved;
  if (resolved.unsupportedSourceRoot) {
    return {
      label: t("sourceLinks.unsupportedSourceRoot"),
      modifierClass: "model-weave-source-links-status-neutral",
      resolvedPath,
      openable: true,
      actionNote: getPathKindNote(kind, t)
    };
  }

  if (
    resolved.usedSourceRoot &&
    !isResolvedPathInsideRoot(kind, rootPath, resolvedPath)
  ) {
    return {
      label: t("sourceLinks.outsideSourceRoot"),
      modifierClass: "model-weave-source-links-status-neutral",
      resolvedPath,
      openable: true
    };
  }

  const unconfiguredRelative =
    kind === "relative" && !resolved.usedSourceRoot && !localSourceRoot.trim();
  if (!sourcePathExists(resolvedPath)) {
    return {
      label: unconfiguredRelative
        ? t("sourceLinks.localSourceRootNotConfigured")
        : t("sourceLinks.missing"),
      modifierClass: unconfiguredRelative
        ? "model-weave-source-links-status-neutral"
        : "model-weave-source-links-status-missing",
      resolvedPath,
      openable: true,
      actionNote: getPathKindNote(kind, t)
    };
  }

  const stats = statSync(resolvedPath);
  return {
    label: stats.isFile()
      ? t("sourceLinks.available")
      : t("sourceLinks.availableDirectory"),
    modifierClass: "model-weave-source-links-status-available",
    resolvedPath,
    openable: true,
    actionNote: getPathKindNote(kind, t)
  };
}

export function classifySourceRootPath(input: string): ClassifiedSourcePath {
  const trimmed = input.trim();
  if (/^file:\/\//i.test(trimmed)) {
    return {
      kind: "fileUri",
      normalizedPath: trimmed
    };
  }
  if (/^\/\/[^/]+\/[^/]+/.test(trimmed)) {
    return {
      kind: "slashStyleWindowsUnc",
      normalizedPath: `\\\\${trimmed.slice(2).replace(/\//g, "\\")}`
    };
  }
  if (/^\\\\[^\\]+\\[^\\]+/.test(trimmed)) {
    return {
      kind: "windowsUnc",
      normalizedPath: trimmed
    };
  }
  if (/^[A-Za-z]:[\\/]/.test(trimmed)) {
    return {
      kind: "windowsDrive",
      normalizedPath: path.win32.normalize(trimmed)
    };
  }
  if (trimmed.startsWith("/")) {
    return {
      kind: "posixAbsolute",
      normalizedPath: path.posix.normalize(trimmed)
    };
  }
  return {
    kind: "relative",
    normalizedPath: trimmed
  };
}

export function normalizeSourceRootPath(input: string): string {
  return classifySourceRootPath(input).normalizedPath;
}

export function resolveSourceLinkPath(
  sourceRoot: string,
  sourceLinkPath: string
): ResolvedSourcePath {
  const linkPath = classifySourceRootPath(sourceLinkPath);
  if (linkPath.kind !== "relative") {
    return {
      kind: linkPath.kind === "slashStyleWindowsUnc" ? "windowsUnc" : linkPath.kind,
      rootPath: "",
      resolvedPath: linkPath.normalizedPath,
      usedSourceRoot: false
    };
  }

  const classified = classifySourceRootPath(sourceRoot);
  if (
    !sourceRoot.trim() ||
    classified.kind === "relative" ||
    classified.kind === "fileUri"
  ) {
    return {
      kind: "relative",
      rootPath: "",
      resolvedPath: sourceLinkPath,
      usedSourceRoot: false,
      unsupportedSourceRoot: Boolean(sourceRoot.trim())
    };
  }

  const cleanedRelativePath = sourceLinkPath.replace(/^[/\\]+/, "");
  const pathApi =
    classified.kind === "windowsDrive" ||
    classified.kind === "windowsUnc" ||
    classified.kind === "slashStyleWindowsUnc"
      ? path.win32
      : path.posix;
  const rootPath = classified.normalizedPath;
  return {
    kind: classified.kind === "slashStyleWindowsUnc"
      ? "windowsUnc"
      : classified.kind,
    rootPath,
    resolvedPath: pathApi.normalize(pathApi.join(rootPath, cleanedRelativePath)),
    usedSourceRoot: true
  };
}

function isResolvedPathInsideRoot(
  kind: SourcePathKind,
  rootPath: string,
  resolvedPath: string
): boolean {
  const pathApi =
    kind === "windowsDrive" || kind === "windowsUnc" ? path.win32 : path.posix;
  const relativePath = pathApi.relative(rootPath, resolvedPath);
  return (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !pathApi.isAbsolute(relativePath))
  );
}

function sourcePathExists(resolvedPath: string): boolean {
  try {
    return existsSync(resolvedPath);
  } catch {
    return false;
  }
}

function isUncPathKind(kind: SourcePathKind): boolean {
  return kind === "windowsUnc" || kind === "slashStyleWindowsUnc";
}

function getPathKindNote(
  kind: SourcePathKind,
  t: ModelWeaveTranslator
): string | undefined {
  return isUncPathKind(kind)
    ? t("sourceLinks.uncPathNote")
    : undefined;
}

async function openResolvedSourcePath(
  resolvedPath: string,
  t: ModelWeaveTranslator
): Promise<void> {
  try {
    if (typeof shell.openPath !== "function") {
      new Notice(t("sourceLinks.openUnavailable"));
      return;
    }

    const result = await shell.openPath(resolvedPath);
    if (result) {
      new Notice(t("sourceLinks.openFailed", { message: result }));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    new Notice(t("sourceLinks.openFailed", { message }));
  }
}
