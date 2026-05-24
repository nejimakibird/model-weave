import { existsSync, statSync } from "fs";
import path from "path";
import { Notice } from "obsidian";
import type { SourceLink } from "../types/models";

const electron = require("electron") as {
  shell?: {
    openPath?: (path: string) => Promise<string>;
  };
};

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
  localSourceRoot: string
): HTMLElement | null {
  const validSourceLinks = (sourceLinks ?? []).filter((sourceLink) =>
    sourceLink.path.trim()
  );
  if (validSourceLinks.length === 0) {
    return null;
  }

  const section = document.createElement("section");
  section.addClass("model-weave-source-links");

  const title = document.createElement("h3");
  title.textContent = "Source Links";
  title.addClass("model-weave-source-links-title");
  section.appendChild(title);

  section.createEl("p", {
    text: "Open uses your OS/default app and may fail for UNC/WSL paths or unsupported file associations.",
    cls: "model-weave-source-links-help"
  });

  const table = document.createElement("table");
  table.addClass("model-weave-source-links-table");

  const thead = table.createEl("thead");
  const headRow = thead.createEl("tr");
  for (const header of ["Path", "Status", "Resolved Path", "Notes", "Action"]) {
    headRow.createEl("th", {
      text: header,
      cls: "model-weave-source-links-th"
    });
  }

  const tbody = table.createEl("tbody");
  for (const sourceLink of validSourceLinks) {
    const status = resolveSourceLinkStatus(sourceLink, localSourceRoot);
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
      text: "Copy Path",
      cls: "model-weave-source-links-open"
    });
    copyButton.type = "button";
    copyButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      void navigator.clipboard?.writeText(status.resolvedPath);
    });
    const button = actionCell.createEl("button", {
      text: "Open",
      cls: "model-weave-source-links-open"
    });
    button.type = "button";
    button.disabled = !status.openable;
    button.title = "Open with default app";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      void openResolvedSourcePath(status.resolvedPath);
    });
    if (status.actionNote) {
      actionCell.createEl("span", {
        text: status.actionNote,
        cls: "model-weave-source-links-action-note"
      });
    }
  }

  section.appendChild(table);
  return section;
}

function resolveSourceLinkStatus(
  sourceLink: SourceLink,
  localSourceRoot: string
): SourceLinkStatus {
  const resolved = resolveSourceLinkPath(localSourceRoot, sourceLink.path);
  if (resolved.kind === "fileUri") {
    return {
      label: "unsupported file URI",
      modifierClass: "model-weave-source-links-status-neutral",
      resolvedPath: resolved.resolvedPath,
      openable: false,
      actionNote: "Use a filesystem path instead of a file URI"
    };
  }

  const { kind, rootPath, resolvedPath } = resolved;
  if (resolved.unsupportedSourceRoot) {
    return {
      label: "unsupported source root",
      modifierClass: "model-weave-source-links-status-neutral",
      resolvedPath,
      openable: true,
      actionNote: getPathKindNote(kind)
    };
  }

  if (
    resolved.usedSourceRoot &&
    !isResolvedPathInsideRoot(kind, rootPath, resolvedPath)
  ) {
    return {
      label: "outside source root",
      modifierClass: "model-weave-source-links-status-neutral",
      resolvedPath,
      openable: true
    };
  }

  const unconfiguredRelative =
    kind === "relative" && !resolved.usedSourceRoot && !localSourceRoot.trim();
  if (!sourcePathExists(resolvedPath)) {
    return {
      label: unconfiguredRelative ? "Local source root is not configured" : "missing",
      modifierClass: unconfiguredRelative
        ? "model-weave-source-links-status-neutral"
        : "model-weave-source-links-status-missing",
      resolvedPath,
      openable: true,
      actionNote: getPathKindNote(kind)
    };
  }

  const stats = statSync(resolvedPath);
  return {
    label: stats.isFile() ? "available" : "available directory",
    modifierClass: "model-weave-source-links-status-available",
    resolvedPath,
    openable: true,
    actionNote: getPathKindNote(kind)
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

function getPathKindNote(kind: SourcePathKind): string | undefined {
  return isUncPathKind(kind)
    ? "UNC/WSL path. Open may depend on your OS and app support."
    : undefined;
}

async function openResolvedSourcePath(resolvedPath: string): Promise<void> {
  try {
    if (typeof electron.shell?.openPath !== "function") {
      new Notice("Could not open Source Link: OS open is not available.");
      return;
    }

    const result = await electron.shell.openPath(resolvedPath);
    if (result) {
      new Notice(`Could not open Source Link: ${result}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    new Notice(`Could not open Source Link: ${message}`);
  }
}
