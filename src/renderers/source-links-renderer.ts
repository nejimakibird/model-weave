import { existsSync, statSync } from "fs";
import path from "path";
import { shell } from "electron";
import { Notice, Platform } from "obsidian";
import type { SourceLink } from "../types/models";
import {
  createModelWeaveTranslator,
  type ModelWeaveTranslator,
  type ModelWeaveUiLanguage
} from "../i18n/messages";

type SourceLinkStatusKind =
  | "available"
  | "missing"
  | "root-not-configured"
  | "neutral";

interface SourceLinkStatus {
  kind: SourceLinkStatusKind;
  label: string;
  modifierClass: string;
  resolvedPath: string;
  openable: boolean;
  actionNote?: string;
}

interface SourceLinkCopyEntry {
  sourceLink: SourceLink;
  status: SourceLinkStatus;
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
  const t = createModelWeaveTranslator(language);

  const section = activeWindow.createEl("section");
  section.addClass("model-weave-source-links");
  section.addClass("model-weave-preview-section");

  const title = activeWindow.createEl("h3");
  title.textContent = t("sourceLinks.title");
  title.addClass("model-weave-source-links-title");
  title.addClass("model-weave-preview-section-title");
  section.appendChild(title);

  const statuses = validSourceLinks.map((sourceLink) =>
    resolveSourceLinkStatus(sourceLink, localSourceRoot, t)
  );
  const copyEntries = validSourceLinks.map((sourceLink, index) => ({
    sourceLink,
    status: statuses[index]
  }));
  renderSourceLinksSummary(section, statuses, t);
  renderSourceLinksBulkActions(section, copyEntries, t);

  if (validSourceLinks.length === 0) {
    section.createEl("p", {
      text: t("sourceLinks.noLinks"),
      cls: "model-weave-source-links-help"
    });
    return section;
  }

  section.createEl("p", {
    text: t("sourceLinks.help"),
    cls: "model-weave-source-links-help"
  });

  const tableWrap = activeWindow.createDiv();
  tableWrap.addClass("model-weave-table-wrap");

  const table = activeWindow.createEl("table");
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
  validSourceLinks.forEach((sourceLink, index) => {
    const status = statuses[index];
    const row = tbody.createEl("tr");
    row.createEl("td", {
      text: sourceLink.path,
      cls: "model-weave-source-links-td model-weave-source-links-path"
    });

    const statusCell = row.createEl("td", { cls: "model-weave-source-links-td" });
    const badge = statusCell.createSpan({
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
      actionCell.createSpan({
        text: status.actionNote,
        cls: "model-weave-source-links-action-note"
      });
    }
  });

  tableWrap.appendChild(table);
  section.appendChild(tableWrap);
  return section;
}


function renderSourceLinksSummary(
  section: HTMLElement,
  statuses: SourceLinkStatus[],
  t: ModelWeaveTranslator
): void {
  const counts = {
    total: statuses.length,
    available: statuses.filter((status) => status.kind === "available").length,
    missing: statuses.filter((status) => status.kind === "missing").length,
    rootNotConfigured: statuses.filter((status) => status.kind === "root-not-configured").length
  };
  const summary = section.createDiv({ cls: "model-weave-source-links-summary" });
  renderSourceLinksSummaryChip(summary, t("sourceLinks.summary.total"), counts.total);
  renderSourceLinksSummaryChip(summary, t("sourceLinks.summary.available"), counts.available, counts.available > 0 ? "available" : undefined);
  renderSourceLinksSummaryChip(summary, t("sourceLinks.summary.missing"), counts.missing, counts.missing > 0 ? "missing" : undefined);
  renderSourceLinksSummaryChip(
    summary,
    t("sourceLinks.summary.rootNotConfigured"),
    counts.rootNotConfigured,
    counts.rootNotConfigured > 0 ? "warning" : undefined
  );
}

function renderSourceLinksSummaryChip(
  container: HTMLElement,
  label: string,
  value: number,
  modifier?: string
): void {
  const chip = container.createDiv({ cls: "model-weave-source-links-summary-chip" });
  if (modifier) {
    chip.addClass(`model-weave-source-links-summary-chip-${modifier}`);
  }
  chip.createSpan({ text: label, cls: "model-weave-source-links-summary-label" });
  chip.createSpan({ text: String(value), cls: "model-weave-source-links-summary-value" });
}

function renderSourceLinksBulkActions(
  section: HTMLElement,
  entries: SourceLinkCopyEntry[],
  t: ModelWeaveTranslator
): void {
  const actions = section.createDiv({ cls: "model-weave-source-links-bulk-actions" });
  appendBulkCopyButton(
    actions,
    t("sourceLinks.copyAllPaths"),
    entries.map((entry) => entry.sourceLink.path)
  );
  appendBulkCopyButton(
    actions,
    t("sourceLinks.copyAvailablePaths"),
    entries
      .filter((entry) => entry.status.kind === "available")
      .map((entry) => entry.status.resolvedPath || entry.sourceLink.path)
  );
  appendBulkCopyButton(
    actions,
    t("sourceLinks.copyAsMarkdown"),
    entries.map((entry) => formatSourceLinkMarkdownLine(entry.sourceLink))
  );
  appendBulkCopyButton(
    actions,
    t("sourceLinks.copyMissingPaths"),
    entries
      .filter((entry) => entry.status.kind === "missing")
      .map((entry) => entry.sourceLink.path)
  );
}

function appendBulkCopyButton(
  container: HTMLElement,
  label: string,
  lines: string[]
): void {
  const button = container.createEl("button", {
    text: label,
    cls: "model-weave-source-links-bulk-copy"
  });
  button.type = "button";
  button.disabled = lines.length === 0;
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (lines.length === 0) {
      return;
    }
    void navigator.clipboard?.writeText(lines.join("\n"));
  });
}

function formatSourceLinkMarkdownLine(sourceLink: SourceLink): string {
  const note = (sourceLink.notes ?? sourceLink.label ?? "").replace(/\s+/g, " ").trim();
  return note ? `- ${sourceLink.path} — ${note}` : `- ${sourceLink.path}`;
}

function resolveSourceLinkStatus(
  sourceLink: SourceLink,
  localSourceRoot: string,
  t: ModelWeaveTranslator
): SourceLinkStatus {
  const resolved = resolveSourceLinkPath(localSourceRoot, sourceLink.path);
  if (resolved.kind === "fileUri") {
    return {
      kind: "neutral",
      label: t("sourceLinks.unsupportedFileUri"),
      modifierClass: "model-weave-source-links-status-neutral",
      resolvedPath: resolved.resolvedPath,
      openable: false,
      actionNote: t("sourceLinks.useFilesystemPath")
    };
  }

  const { kind, rootPath, resolvedPath } = resolved;
  if (!Platform.isDesktop) {
    return {
      kind: "neutral",
      label: t("sourceLinks.openUnavailable"),
      modifierClass: "model-weave-source-links-status-neutral",
      resolvedPath,
      openable: false
    };
  }

  if (resolved.unsupportedSourceRoot) {
    return {
      kind: "neutral",
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
      kind: "neutral",
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
      kind: unconfiguredRelative ? "root-not-configured" : "missing",
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
    kind: "available",
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
  if (!Platform.isDesktop) {
    return false;
  }

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
  if (!Platform.isDesktop) {
    new Notice(t("sourceLinks.openUnavailable"));
    return;
  }

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
