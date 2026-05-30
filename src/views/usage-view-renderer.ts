export interface UsageViewDetail {
  label: string;
  meta?: string;
  notes?: string;
  title?: string;
}

export interface GroupedSourceLink {
  relationKind: string;
  ownerLabel: string;
  ownerPath?: string;
  path: string;
  label?: string;
  notes: string[];
}

export interface UsageViewItem {
  label: string;
  type: string;
  path: string;
  usageCount: number;
  openTargetPath?: string;
  details: UsageViewDetail[];
  sourceLinks: GroupedSourceLink[];
}

export interface UsageViewSection {
  id: string;
  title: string;
  emptyText: string;
  items: UsageViewItem[];
}

export interface UsageViewRendererOptions {
  openLabel: string;
  sourceLinkLabel: string;
  formatUsageCount: (count: number) => string;
  formatNoteCount: (count: number) => string;
  getOpenState?: (key: string, defaultOpen: boolean) => boolean;
  setOpenState?: (key: string, open: boolean) => void;
  onOpenItem?: (
    filePath: string,
    navigation?: { openInNewLeaf?: boolean }
  ) => void;
}

export function renderUsageViewSections(
  container: HTMLElement,
  sections: UsageViewSection[],
  options: UsageViewRendererOptions
): void {
  for (const section of sections) {
    renderUsageViewSection(container, section, options);
  }
}

export function renderUsageDetailSection(
  container: HTMLElement,
  id: string,
  title: string,
  emptyText: string,
  details: UsageViewDetail[],
  options: Pick<UsageViewRendererOptions, "getOpenState" | "setOpenState">
): void {
  const body = createCollapsibleSection(container, id, title, false, options);
  if (details.length === 0) {
    body.createEl("p", { text: emptyText, cls: "model-weave-summary-muted" });
    return;
  }

  const list = body.createEl("ul", { cls: "model-weave-summary-list" });
  for (const detail of details) {
    const item = list.createEl("li", {
      text: `${detail.label}${detail.meta ? ` (${detail.meta})` : ""}`
    });
    item.title = detail.title ?? detail.notes ?? detail.label;
  }
}

export function renderGroupedSourceLinkSection(
  container: HTMLElement,
  id: string,
  title: string,
  emptyText: string,
  sourceLinks: GroupedSourceLink[],
  options: Pick<
    UsageViewRendererOptions,
    "formatNoteCount" | "getOpenState" | "setOpenState"
  >
): void {
  const body = createCollapsibleSection(container, id, title, false, options);
  if (sourceLinks.length === 0) {
    body.createEl("p", { text: emptyText, cls: "model-weave-summary-muted" });
    return;
  }

  const list = body.createEl("ul", { cls: "model-weave-summary-list" });
  for (const sourceLink of sourceLinks) {
    renderGroupedSourceLink(list, sourceLink, options);
  }
}

function renderUsageViewSection(
  container: HTMLElement,
  section: UsageViewSection,
  options: UsageViewRendererOptions
): void {
  const body = createCollapsibleSection(container, section.id, section.title, false, options);
  if (section.items.length === 0) {
    body.createEl("p", { text: section.emptyText, cls: "model-weave-summary-muted" });
    return;
  }

  const list = body.createEl("ul", {
    cls: "model-weave-summary-list model-weave-impact-relationship-list"
  });
  for (const usageItem of section.items) {
    renderUsageItem(list, usageItem, options);
  }
}

function renderUsageItem(
  list: HTMLElement,
  usageItem: UsageViewItem,
  options: UsageViewRendererOptions
): void {
  const item = list.createEl("li", { cls: "model-weave-impact-relationship" });
  const details = item.createEl("details", {
    cls: "model-weave-impact-relationship-item"
  });
  const row = details.createEl("summary", {
    cls: "model-weave-impact-relationship-summary"
  });
  const rowContent = row.createSpan({
    cls: "model-weave-impact-relationship-summary-content"
  });
  rowContent.createSpan({
    cls: "model-weave-impact-relationship-title",
    text: `${usageItem.label} (${usageItem.type}; ${options.formatUsageCount(usageItem.usageCount)})`
  });

  if (options.onOpenItem) {
    const openButton = rowContent.createEl("button", {
      text: options.openLabel,
      cls: "model-weave-impact-open-button"
    });
    openButton.type = "button";
    openButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      options.onOpenItem?.(usageItem.openTargetPath ?? usageItem.path, {
        openInNewLeaf: Boolean(event.ctrlKey || event.metaKey)
      });
    });
    openButton.addEventListener("auxclick", (event) => {
      if (event.button !== 1) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      options.onOpenItem?.(usageItem.openTargetPath ?? usageItem.path, {
        openInNewLeaf: true
      });
    });
  }

  details.createDiv({
    cls: "model-weave-impact-relationship-path",
    text: usageItem.path
  });

  const detailList = details.createEl("ul", {
    cls: "model-weave-summary-list model-weave-impact-usage-list"
  });
  for (const detail of usageItem.details) {
    const detailItem = detailList.createEl("li", {
      cls: "model-weave-impact-usage-item"
    });
    detailItem.createDiv({
      text: detail.label,
      cls: "model-weave-impact-usage-main"
    });
    if (detail.meta) {
      detailItem.createDiv({
        text: detail.meta,
        cls: "model-weave-impact-usage-meta"
      });
    }
    if (detail.notes) {
      detailItem.createDiv({
        text: detail.notes,
        cls: "model-weave-impact-usage-meta"
      });
    }
    detailItem.title = detail.title ?? detail.notes ?? detail.label;
  }

  if (usageItem.sourceLinks.length > 0) {
    const linkList = details.createEl("ul", {
      cls: "model-weave-summary-list model-weave-impact-source-link-list"
    });
    for (const link of usageItem.sourceLinks) {
      renderGroupedSourceLink(linkList, link, options, options.sourceLinkLabel);
    }
  }
}

function renderGroupedSourceLink(
  list: HTMLElement,
  sourceLink: GroupedSourceLink,
  options: Pick<UsageViewRendererOptions, "formatNoteCount">,
  prefix?: string
): void {
  const label = sourceLink.label ? `${sourceLink.label}: ` : "";
  const noteSuffix =
    sourceLink.notes.length > 0
      ? ` (${options.formatNoteCount(sourceLink.notes.length)})`
      : "";
  const rowText = prefix
    ? `${prefix}: ${label}${sourceLink.path}${noteSuffix}`
    : `[${sourceLink.relationKind}] ${sourceLink.ownerLabel}: ${label}${sourceLink.path}${noteSuffix}`;
  const item = list.createEl("li", {
    cls: "model-weave-impact-source-link-group"
  });
  item.title =
    sourceLink.notes.length > 0
      ? sourceLink.notes.join("\n")
      : sourceLink.ownerPath ?? sourceLink.path;

  if (sourceLink.notes.length === 0) {
    item.setText(rowText);
    return;
  }

  const details = item.createEl("details", {
    cls: "model-weave-impact-source-link-details"
  });
  details.createEl("summary", { text: rowText });
  const noteList = details.createEl("ul", {
    cls: "model-weave-summary-list model-weave-impact-source-link-note-list"
  });
  for (const note of sourceLink.notes) {
    noteList.createEl("li", { text: note });
  }
}

function createCollapsibleSection(
  container: HTMLElement,
  key: string,
  title: string,
  defaultOpen: boolean,
  options: Pick<UsageViewRendererOptions, "getOpenState" | "setOpenState">
): HTMLElement {
  const details = container.createEl("details");
  details.addClass("model-weave-preview-section");
  details.open = options.getOpenState
    ? options.getOpenState(key, defaultOpen)
    : defaultOpen;
  if (options.setOpenState) {
    details.addEventListener("toggle", () => {
      options.setOpenState?.(key, details.open);
    });
  }

  const summary = details.createEl("summary", { text: title });
  summary.addClass("model-weave-summary-heading");
  summary.addClass("model-weave-preview-section-title");

  return details.createDiv();
}
