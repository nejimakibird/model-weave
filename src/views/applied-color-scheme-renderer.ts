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
    "colorScheme.field.fill",
    "colorScheme.field.stroke",
    "colorScheme.field.text",
    "colorScheme.preview.swatch",
    "colorScheme.field.notes",
    "colorScheme.field.source"
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
      attr: { colspan: "8" },
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
    color.kind,
    color.fill ?? t("domains.value.none"),
    color.stroke ?? t("domains.value.none"),
    color.text ?? t("domains.value.none")
  ]) {
    tableRow.createEl("td", { text: value });
  }

  const swatchCell = tableRow.createEl("td");
  const swatch = swatchCell.createSpan({
    cls: "model-weave-color-swatch"
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
