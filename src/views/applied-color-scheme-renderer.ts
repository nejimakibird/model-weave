import type { AppliedColorSchemeRow } from "../core/color-scheme";
import type { ModelWeaveTranslator } from "../i18n/messages";
import type { ResolvedColorScheme } from "../types/models";

export interface AppliedColorSchemeLegendGroup {
  target: string;
  label: string;
  rows: AppliedColorSchemeRow[];
}

export function renderAppliedColorSchemeSectionContent(
  container: HTMLElement,
  colorScheme: ResolvedColorScheme,
  rows: AppliedColorSchemeRow[],
  targets: string[],
  t: ModelWeaveTranslator
): void {
  container.createEl("p", {
    text: formatAppliedColorSchemeSummary(colorScheme, targets, t),
    cls: "model-weave-summary-muted"
  });

  if (rows.length === 0) {
    container.createEl("p", {
      text: t("colorScheme.preview.noneApplied"),
      cls: "model-weave-summary-muted"
    });
    return;
  }

  const legend = container.createDiv({ cls: "model-weave-color-legend" });
  for (const group of groupAppliedColorSchemeRows(rows, t)) {
    const groupEl = legend.createDiv({
      cls: "model-weave-color-legend-group",
      attr: { "data-target": group.target }
    });
    groupEl.createDiv({
      text: group.label,
      cls: "model-weave-color-legend-group-title"
    });
    const items = groupEl.createDiv({ cls: "model-weave-color-legend-items" });
    for (const row of group.rows) {
      renderAppliedColorLegendItem(items, row, group.target, t);
    }
  }
}

export function groupAppliedColorSchemeRows(
  rows: AppliedColorSchemeRow[],
  t: ModelWeaveTranslator
): AppliedColorSchemeLegendGroup[] {
  const groups = new Map<string, AppliedColorSchemeLegendGroup>();
  const seen = new Set<string>();
  for (const row of rows) {
    const target = row.entry.target?.trim() || t("domains.value.none");
    const key = target + ":" + row.entry.kind;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    const group = groups.get(target) ?? { target, label: target, rows: [] };
    group.rows.push(row);
    groups.set(target, group);
  }
  return [...groups.values()];
}

function formatAppliedColorSchemeSummary(
  colorScheme: ResolvedColorScheme,
  targets: string[],
  t: ModelWeaveTranslator
): string {
  const schemeType = colorScheme.sourcePath
    ? t("colorScheme.preview.configured")
    : t("colorScheme.preview.builtIn");
  const schemeName = colorScheme.sourcePath
    ? colorScheme.name + " (" + colorScheme.sourcePath + ")"
    : colorScheme.name;
  const targetList = targets.length > 0
    ? targets.join(", ")
    : t("domains.value.none");
  return schemeType + ": " + schemeName + " / " + t("colorScheme.preview.targets") + ": " + targetList;
}

function renderAppliedColorLegendItem(
  items: HTMLElement,
  row: AppliedColorSchemeRow,
  target: string,
  t: ModelWeaveTranslator
): void {
  const color = row.entry;
  const item = items.createDiv({
    cls: "model-weave-color-legend-item",
    attr: {
      "data-target": target,
      "data-kind": color.kind,
      "aria-label": formatAppliedColorSchemeSwatchTitle(row, target, t)
    }
  });
  const swatch = item.createSpan({
    cls: "model-weave-color-legend-swatch",
    attr: { "aria-hidden": "true" }
  });
  if (color.fill) {
    swatch.style.backgroundColor = color.fill;
  }
  if (color.stroke) {
    swatch.style.borderColor = color.stroke;
  }
  if (color.text) {
    swatch.style.color = color.text;
  }
  swatch.textContent = "Aa";
  item.createSpan({ text: color.kind, cls: "model-weave-color-legend-kind" });
  item.createSpan({
    text: row.source === "built-in"
      ? t("colorScheme.preview.builtIn")
      : t("colorScheme.preview.configured"),
    cls: "model-weave-color-legend-source"
  });
}

function formatAppliedColorSchemeSwatchTitle(
  row: AppliedColorSchemeRow,
  target: string,
  t: ModelWeaveTranslator
): string {
  const color = row.entry;
  return [
    "fill: " + (color.fill ?? t("domains.value.none")),
    "stroke: " + (color.stroke ?? t("domains.value.none")),
    "text: " + (color.text ?? t("domains.value.none")),
    "source: " + row.source,
    "target: " + target,
    "kind: " + color.kind
  ].join("\n");
}
