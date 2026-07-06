import type { AppliedColorSchemeRow } from "../core/color-scheme";
import type { ModelWeaveTranslator } from "../i18n/messages";
import type { ResolvedColorScheme } from "../types/models";

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

  const tableWrap = container.createDiv({ cls: "model-weave-table-wrap" });
  const table = tableWrap.createEl("table", {
    cls: "model-weave-summary-table model-weave-data-table"
  });
  const headerRow = table.createEl("thead").createEl("tr");
  for (const key of [
    "colorScheme.field.target",
    "colorScheme.field.kind",
    "colorScheme.preview.compactSwatch",
    "colorScheme.preview.compactNotes",
    "colorScheme.preview.compactSource"
  ]) {
    headerRow.createEl("th", {
      text: t(key),
      cls: "model-weave-summary-th"
    });
  }

  const tbody = table.createEl("tbody");
  if (rows.length === 0) {
    const row = tbody.createEl("tr");
    row.createEl("td", {
      text: t("colorScheme.preview.empty"),
      attr: { colspan: "5" },
      cls: "model-weave-summary-muted"
    });
    return;
  }

  for (const row of rows) {
    renderAppliedColorSchemeTableRow(tbody, row, t);
  }
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
    ? `${colorScheme.name} (${colorScheme.sourcePath})`
    : colorScheme.name;
  const targetList = targets.length > 0
    ? targets.join(", ")
    : t("domains.value.none");
  return `${schemeType}: ${schemeName} / ${t("colorScheme.preview.targets")}: ${targetList}`;
}

function renderAppliedColorSchemeTableRow(
  tbody: HTMLElement,
  row: AppliedColorSchemeRow,
  t: ModelWeaveTranslator
): void {
  const tableRow = tbody.createEl("tr");
  const color = row.entry;
  for (const value of [
    color.target ?? t("domains.value.none"),
    color.kind
  ]) {
    tableRow.createEl("td", { text: value });
  }

  const swatchCell = tableRow.createEl("td");
  const swatchTitle = formatAppliedColorSchemeSwatchTitle(row, t);
  const swatch = swatchCell.createSpan({
    cls: "model-weave-color-swatch",
    attr: {
      "aria-label": swatchTitle
    }
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

  tableRow.createEl("td", { text: color.notes ?? "" });
  tableRow.createEl("td", {
    text: row.source === "built-in"
      ? t("colorScheme.preview.builtIn")
      : t("colorScheme.preview.configured")
  });
}

function formatAppliedColorSchemeSwatchTitle(
  row: AppliedColorSchemeRow,
  t: ModelWeaveTranslator
): string {
  const color = row.entry;
  return [
    `fill: ${color.fill ?? t("domains.value.none")}`,
    `stroke: ${color.stroke ?? t("domains.value.none")}`,
    `text: ${color.text ?? t("domains.value.none")}`
  ].join("\n");
}
