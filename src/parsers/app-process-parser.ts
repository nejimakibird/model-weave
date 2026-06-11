import { parseFrontmatter } from "./frontmatter-parser";
import { parseMarkdownTable, splitMarkdownTableRow } from "./markdown-table";
import { extractMarkdownSections } from "./markdown-sections";
import { parseSourceLinks } from "./source-links-parser";
import { parseDomainEntries, validateDomainEntries } from "./domains-parser";
import { formatDomainDiagramMissingRefMessage } from "../core/domain-diagnostics";
import type {
  AppProcessModel,
  DomainSourceRef,
  ValidationWarning
} from "../types/models";

const INPUT_HEADERS = ["id", "data", "source", "required", "notes"];
const OUTPUT_HEADERS = ["id", "data", "target", "notes"];
const TRIGGER_HEADERS = ["id", "kind", "source", "event", "notes"];
const TRANSITION_HEADERS = ["id", "event", "to", "condition", "notes"];
const LEGACY_STEP_HEADERS = ["id", "lane", "label", "kind", "input", "output", "rule", "invoke", "screen", "notes"];
const DOMAIN_STEP_HEADERS = ["id", "domain", "label", "kind", "input", "output", "rule", "invoke", "screen", "notes"];
const TRANSITIONAL_STEP_HEADERS = ["id", "domain", "lane", "label", "kind", "input", "output", "rule", "invoke", "screen", "notes"];
const FLOW_HEADERS = ["from", "to", "condition", "label", "notes"];
const DOMAIN_SOURCE_HEADERS = ["ref"];
const DOMAIN_SOURCE_WITH_NOTES_HEADERS = ["ref", "notes"];

export function parseAppProcessFile(
  markdown: string,
  path: string
): {
  file: AppProcessModel | null;
  warnings: ValidationWarning[];
} {
  const frontmatterResult = parseFrontmatter(markdown);
  const frontmatter = frontmatterResult.file.frontmatter ?? {};
  const sections = extractMarkdownSections(frontmatterResult.file.body);
  const warnings: ValidationWarning[] = frontmatterResult.warnings.map((warning) => ({
    ...warning,
    path: warning.path ?? path
  }));

  const id = typeof frontmatter.id === "string" ? frontmatter.id.trim() : "";
  const name = typeof frontmatter.name === "string" ? frontmatter.name.trim() : "";
  const kind = typeof frontmatter.kind === "string" ? frontmatter.kind.trim() : "";

  if (frontmatter.type !== "app_process") {
    warnings.push(createWarning(path, "type", 'expected type "app_process"'));
  }
  if (!id) {
    warnings.push(createWarning(path, "id", 'required frontmatter "id" is missing'));
  }
  if (!name) {
    warnings.push(createWarning(path, "name", 'required frontmatter "name" is missing'));
  }

  const inputsTable = parseMarkdownTable(sections.Inputs, INPUT_HEADERS, path, "Inputs");
  const outputsTable = parseMarkdownTable(sections.Outputs, OUTPUT_HEADERS, path, "Outputs");
  const triggersTable = parseMarkdownTable(
    sections.Triggers,
    TRIGGER_HEADERS,
    path,
    "Triggers"
  );
  const transitionsTable = parseMarkdownTable(
    sections.Transitions,
    TRANSITION_HEADERS,
    path,
    "Transitions"
  );
  const domainsTable = parseDomainEntries(sections.Domains, path);
  const hasStructuredSteps = hasMarkdownTable(sections.Steps);
  const stepsTable = hasStructuredSteps
    ? parseAppProcessStepsTable(sections.Steps, path)
    : { rows: [], warnings: [] };
  const flowsTable = hasMarkdownTable(sections.Flows)
    ? parseMarkdownTable(sections.Flows, FLOW_HEADERS, path, "Flows")
    : { rows: [], warnings: [] };
  const domainSourcesTable =
    "Domain Sources" in sections
      ? parseAppProcessDomainSourcesTable(sections["Domain Sources"], path)
      : { rows: [], warnings: [] };
  const steps = stepsTable.rows
    .map((row) => ({
      id: row.id?.trim() ?? "",
      domain: row.domain?.trim() || undefined,
      lane: row.lane?.trim() || undefined,
      label: row.label?.trim() || undefined,
      kind: row.kind?.trim() || undefined,
      input: row.input?.trim() || undefined,
      output: row.output?.trim() || undefined,
      rule: row.rule?.trim() || undefined,
      invoke: row.invoke?.trim() || undefined,
      screen: row.screen?.trim() || undefined,
      notes: row.notes?.trim() || undefined
    }))
    .filter((row) => !isEmptyRow(Object.values(row)));
  const flows = flowsTable.rows
    .map((row) => ({
      from: row.from?.trim() ?? "",
      to: row.to?.trim() ?? "",
      condition: row.condition?.trim() || undefined,
      label: row.label?.trim() || undefined,
      notes: row.notes?.trim() || undefined
    }))
    .filter((row) => !isEmptyRow(Object.values(row)));

  warnings.push(
    ...inputsTable.warnings,
    ...outputsTable.warnings,
    ...triggersTable.warnings,
    ...transitionsTable.warnings,
    ...domainsTable.warnings,
    ...validateDomainEntries(path, domainsTable.rows),
    ...stepsTable.warnings,
    ...flowsTable.warnings,
    ...domainSourcesTable.warnings
  );

  const fallbackName = name || id || getFileStem(path) || "Untitled App Process";

  return {
    file: {
      fileType: "app-process",
      schema: "app_process",
      path,
      title: fallbackName,
      frontmatter,
      sections,
      sourceLinks: parseSourceLinks(sections["Source Links"]),
      domains: domainsTable.rows,
      domainSources: domainSourcesTable.rows,
      id,
      name: fallbackName,
      kind: kind || undefined,
      summary: joinSectionLines(sections.Summary),
      inputs: inputsTable.rows
        .map((row) => ({
          id: row.id?.trim() ?? "",
          data: row.data?.trim() || undefined,
          source: row.source?.trim() || undefined,
          required: row.required?.trim() || undefined,
          notes: row.notes?.trim() || undefined
        }))
        .filter((row) => !isEmptyRow(Object.values(row))),
      outputs: outputsTable.rows
        .map((row) => ({
          id: row.id?.trim() ?? "",
          data: row.data?.trim() || undefined,
          target: row.target?.trim() || undefined,
          notes: row.notes?.trim() || undefined
        }))
        .filter((row) => !isEmptyRow(Object.values(row))),
      triggers: triggersTable.rows
        .map((row) => ({
          id: row.id?.trim() ?? "",
          kind: row.kind?.trim() || undefined,
          source: row.source?.trim() || undefined,
          event: row.event?.trim() || undefined,
          notes: row.notes?.trim() || undefined
        }))
        .filter((row) => !isEmptyRow(Object.values(row))),
      transitions: transitionsTable.rows
        .map((row) => ({
          id: row.id?.trim() ?? "",
          event: row.event?.trim() || undefined,
          to: row.to?.trim() || undefined,
          condition: row.condition?.trim() || undefined,
          notes: row.notes?.trim() || undefined
        }))
        .filter((row) => !isEmptyRow(Object.values(row))),
      steps,
      flows,
      hasExplicitFlows: hasStructuredSteps && flows.length > 0,
      notes: normalizeNotes(sections.Notes)
    },
    warnings
  };
}

function parseAppProcessDomainSourcesTable(
  lines: string[] | undefined,
  path: string
): {
  rows: DomainSourceRef[];
  warnings: ValidationWarning[];
} {
  if (!lines) {
    return { rows: [], warnings: [] };
  }

  const normalizedLines = lines
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|"));

  if (normalizedLines.length < 2) {
    return {
      rows: [],
      warnings:
        normalizedLines.length === 0
          ? []
          : [createTableWarning(
              "invalid-table-row",
              path,
              "Domain Sources",
              'table in section "Domain Sources" is incomplete'
            )]
    };
  }

  const headers = splitMarkdownTableRow(normalizedLines[0]) ?? [];
  const warnings: ValidationWarning[] = [];
  if (
    !sameHeaders(headers, DOMAIN_SOURCE_HEADERS) &&
    !sameHeaders(headers, DOMAIN_SOURCE_WITH_NOTES_HEADERS)
  ) {
    warnings.push(
      createTableWarning(
        "invalid-table-column",
        path,
        "Domain Sources",
        'table columns in section "Domain Sources" do not match supported app_process Domain Sources headers'
      )
    );
  }

  const rows: DomainSourceRef[] = [];
  normalizedLines.slice(2).forEach((rowLine, rowIndex) => {
    const values = splitMarkdownTableRow(rowLine) ?? [];
    if (values.length !== headers.length) {
      warnings.push(
        createTableWarning(
          "invalid-table-row",
          path,
          "Domain Sources",
          `table row in section "Domain Sources" has ${values.length} columns, expected ${headers.length}`
        )
      );
      return;
    }

    const row: Record<string, string> = {};
    for (const [index, header] of headers.entries()) {
      row[header] = values[index] ?? "";
    }
    const ref = row.ref?.trim() ?? "";
    if (!ref) {
      warnings.push({
        code: "invalid-structure",
        message: formatDomainDiagramMissingRefMessage(),
        severity: "error",
        path,
        field: "Domain Sources.ref",
        context: { rowIndex: rowIndex + 1 }
      });
      return;
    }

    rows.push({
      ref,
      notes: row.notes?.trim() || undefined,
      rowIndex
    });
  });

  return { rows, warnings };
}

function getFileStem(path: string): string {
  return path.replace(/\\/g, "/").split("/").pop()?.replace(/\.md$/i, "") ?? "";
}

function joinSectionLines(lines: string[] | undefined): string | undefined {
  const value = (lines ?? []).join("\n").trim();
  return value || undefined;
}

function normalizeNotes(lines: string[] | undefined): string[] | undefined {
  const notes = (lines ?? [])
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^-\s+/, ""));
  return notes.length > 0 ? notes : undefined;
}

function hasMarkdownTable(lines: string[] | undefined): boolean {
  const tableLines = (lines ?? []).map((line) => line.trim()).filter((line) => line.startsWith("|"));
  if (tableLines.length < 2) {
    return false;
  }
  return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(tableLines[1]);
}

function parseAppProcessStepsTable(
  lines: string[] | undefined,
  path: string
): {
  rows: Array<Record<string, string>>;
  warnings: ValidationWarning[];
} {
  if (!lines) {
    return { rows: [], warnings: [] };
  }

  const normalizedLines = lines
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|"));

  if (normalizedLines.length < 2) {
    return {
      rows: [],
      warnings:
        normalizedLines.length === 0
          ? []
          : [createTableWarning("invalid-table-row", path, "Steps", 'table in section "Steps" is incomplete')]
    };
  }

  const headers = splitMarkdownTableRow(normalizedLines[0]) ?? [];
  const warnings: ValidationWarning[] = [];
  if (!isSupportedStepHeaders(headers)) {
    warnings.push(
      createTableWarning(
        "invalid-table-column",
        path,
        "Steps",
        'table columns in section "Steps" do not match supported app_process step headers'
      )
    );
  }

  const rows: Array<Record<string, string>> = [];
  normalizedLines.slice(2).forEach((rowLine, rowIndex) => {
    const values = splitMarkdownTableRow(rowLine) ?? [];
    if (values.length !== headers.length) {
      warnings.push(
        createTableWarning(
          "invalid-table-row",
          path,
          "Steps",
          `table row in section "Steps" has ${values.length} columns, expected ${headers.length}`
        )
      );
      return;
    }

    const row: Record<string, string> = {};
    for (const [index, header] of headers.entries()) {
      row[header] = values[index] ?? "";
    }
    const domain = row.domain?.trim() ?? "";
    const lane = row.lane?.trim() ?? "";
    if (domain && lane) {
      warnings.push({
        code: "invalid-structure",
        message: `Step "${row.id?.trim() || row.label?.trim() || rowIndex + 1}" has both domain and lane. domain is used and lane is ignored.`,
        severity: "warning",
        path,
        field: "Steps.domain",
        context: { rowIndex: rowIndex + 1 }
      });
    }
    rows.push(row);
  });

  return { rows, warnings };
}

function isSupportedStepHeaders(headers: string[]): boolean {
  return (
    sameHeaders(headers, LEGACY_STEP_HEADERS) ||
    sameHeaders(headers, DOMAIN_STEP_HEADERS) ||
    sameHeaders(headers, TRANSITIONAL_STEP_HEADERS)
  );
}

function sameHeaders(actual: string[], expected: string[]): boolean {
  return (
    actual.length === expected.length &&
    actual.every((header, index) => header === expected[index])
  );
}

function isEmptyRow(values: Array<string | undefined>): boolean {
  return values.every((value) => !value?.trim());
}

function createTableWarning(
  code: "invalid-table-column" | "invalid-table-row",
  path: string,
  field: string,
  message: string
): ValidationWarning {
  return {
    code,
    message,
    severity: "warning",
    path,
    field
  };
}

function createWarning(
  path: string,
  field: string,
  message: string
): ValidationWarning {
  return {
    code: "invalid-structure",
    message,
    severity: "warning",
    path,
    field
  };
}
