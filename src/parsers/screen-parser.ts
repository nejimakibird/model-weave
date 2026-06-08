import { parseFrontmatter } from "./frontmatter-parser";
import { extractMarkdownSections } from "./markdown-sections";
import { splitMarkdownTableRow } from "./markdown-table";
import { parseSourceLinks } from "./source-links-parser";
import type {
  ScreenAction,
  ScreenLegacyTransition,
  ScreenLocalProcess,
  ScreenMessage,
  ScreenModel,
  ValidationWarning
} from "../types/models";

const LAYOUT_HEADERS = ["id", "label", "kind", "purpose", "notes"];
const FIELD_HEADERS = [
  "id",
  "label",
  "kind",
  "layout",
  "data_type",
  "required",
  "ref",
  "rule",
  "notes"
];
const FIELD_HEADERS_WITH_CONDITION = [
  "id",
  "label",
  "kind",
  "layout",
  "data_type",
  "required",
  "ref",
  "condition",
  "rule",
  "notes"
];
const FIELD_HEADERS_WITH_RULE_BEFORE_CONDITION = [
  "id",
  "label",
  "kind",
  "layout",
  "data_type",
  "required",
  "ref",
  "rule",
  "condition",
  "notes"
];
const LEGACY_FIELD_HEADERS = [
  "id",
  "label",
  "kind",
  "data_type",
  "required",
  "ref",
  "rule",
  "notes"
];
const LEGACY_FIELD_HEADERS_WITH_CONDITION = [
  "id",
  "label",
  "kind",
  "data_type",
  "required",
  "ref",
  "condition",
  "rule",
  "notes"
];
const LEGACY_FIELD_HEADERS_WITH_RULE_BEFORE_CONDITION = [
  "id",
  "label",
  "kind",
  "data_type",
  "required",
  "ref",
  "rule",
  "condition",
  "notes"
];
const ACTION_HEADERS = [
  "id",
  "label",
  "kind",
  "target",
  "event",
  "invoke",
  "transition",
  "rule",
  "notes"
];
const ACTION_HEADERS_WITH_CONDITION = [
  "id",
  "label",
  "kind",
  "target",
  "event",
  "condition",
  "invoke",
  "transition",
  "rule",
  "notes"
];
const ACTION_HEADERS_WITH_CONDITION_AFTER_RULE = [
  "id",
  "label",
  "kind",
  "target",
  "event",
  "invoke",
  "transition",
  "rule",
  "condition",
  "notes"
];
const MESSAGE_HEADERS = ["id", "text", "severity", "timing", "notes"];
const MESSAGE_HEADERS_WITH_CONDITION = [
  "id",
  "text",
  "severity",
  "timing",
  "condition",
  "notes"
];
const LEGACY_MESSAGE_HEADERS = ["ref", "timing", "notes"];
const LEGACY_TRANSITION_HEADERS = ["id", "event", "to", "condition", "notes"];
const LOCAL_PROCESS_STEP_HEADERS = [
  "id",
  "label",
  "kind",
  "condition",
  "input",
  "output",
  "rule",
  "invoke",
  "screen",
  "notes"
];
const LOCAL_PROCESS_ERROR_HEADERS = [
  "id",
  "condition",
  "message",
  "notes"
];

export function parseScreenFile(
  markdown: string,
  path: string
): {
  file: ScreenModel | null;
  warnings: ValidationWarning[];
} {
  const normalizedMarkdown = markdown.replace(/\r\n/g, "\n");
  const frontmatterResult = parseFrontmatter(normalizedMarkdown);
  const frontmatter = frontmatterResult.file.frontmatter ?? {};
  const body = frontmatterResult.file.body;
  const sections = extractMarkdownSections(body);
  const warnings: ValidationWarning[] = frontmatterResult.warnings.map((warning) => ({
    ...warning,
    path: warning.path ?? path
  }));

  const id = typeof frontmatter.id === "string" ? frontmatter.id.trim() : "";
  const name = typeof frontmatter.name === "string" ? frontmatter.name.trim() : "";
  const screenType =
    typeof frontmatter.screen_type === "string"
      ? frontmatter.screen_type.trim()
      : "";

  if (frontmatter.type !== "screen") {
    warnings.push(createWarning(path, "type", 'expected type "screen"'));
  }
  if (!id) {
    warnings.push(createWarning(path, "id", 'required frontmatter "id" is missing'));
  }
  if (!name) {
    warnings.push(createWarning(path, "name", 'required frontmatter "name" is missing'));
  }

  const bodyLines = body.split("\n");
  const bodyStartLine = getBodyStartLine(normalizedMarkdown);
  const sectionLines = getSectionLineNumbers(bodyLines, bodyStartLine);

  const layoutTable = readSectionTable(bodyLines, bodyStartLine, "Layout");
  const fieldsTable = readSectionTable(bodyLines, bodyStartLine, "Fields");
  const actionsTable = readSectionTable(bodyLines, bodyStartLine, "Actions");
  const messagesTable = readSectionTable(bodyLines, bodyStartLine, "Messages");
  const transitionsTable = readSectionTable(bodyLines, bodyStartLine, "Transitions");
  const localProcesses = collectLocalProcesses(bodyLines, bodyStartLine);

  const layoutHeaders = layoutTable.headers;
  if (layoutHeaders.length > 0 && !sameHeaders(layoutHeaders, LAYOUT_HEADERS)) {
    warnings.push(createWarning(path, "Layout", 'table columns in section "Layout" do not match expected headers'));
  }

  const fieldHeaders = fieldsTable.headers;
  const isCanonicalFields = sameHeaders(fieldHeaders, FIELD_HEADERS);
  const isCanonicalFieldsWithCondition = sameHeaders(fieldHeaders, FIELD_HEADERS_WITH_CONDITION);
  const isCanonicalFieldsWithRuleBeforeCondition = sameHeaders(fieldHeaders, FIELD_HEADERS_WITH_RULE_BEFORE_CONDITION);
  const isLegacyFields = sameHeaders(fieldHeaders, LEGACY_FIELD_HEADERS);
  const isLegacyFieldsWithCondition = sameHeaders(fieldHeaders, LEGACY_FIELD_HEADERS_WITH_CONDITION);
  const isLegacyFieldsWithRuleBeforeCondition = sameHeaders(fieldHeaders, LEGACY_FIELD_HEADERS_WITH_RULE_BEFORE_CONDITION);
  if (
    fieldHeaders.length > 0 &&
    !isCanonicalFields &&
    !isCanonicalFieldsWithCondition &&
    !isCanonicalFieldsWithRuleBeforeCondition &&
    !isLegacyFields &&
    !isLegacyFieldsWithCondition &&
    !isLegacyFieldsWithRuleBeforeCondition
  ) {
    warnings.push(createWarning(path, "Fields", 'table columns in section "Fields" do not match expected screen field headers'));
  }

  const actionHeaders = actionsTable.headers;
  if (
    actionHeaders.length > 0 &&
    !sameHeaders(actionHeaders, ACTION_HEADERS) &&
    !sameHeaders(actionHeaders, ACTION_HEADERS_WITH_CONDITION) &&
    !sameHeaders(actionHeaders, ACTION_HEADERS_WITH_CONDITION_AFTER_RULE)
  ) {
    warnings.push(createWarning(path, "Actions", 'table columns in section "Actions" do not match expected headers'));
  }

  const messageHeaders = messagesTable.headers;
  const isCanonicalMessages = sameHeaders(messageHeaders, MESSAGE_HEADERS);
  const isCanonicalMessagesWithCondition = sameHeaders(messageHeaders, MESSAGE_HEADERS_WITH_CONDITION);
  const isLegacyMessages = sameHeaders(messageHeaders, LEGACY_MESSAGE_HEADERS);
  if (
    messageHeaders.length > 0 &&
    !isCanonicalMessages &&
    !isCanonicalMessagesWithCondition &&
    !isLegacyMessages
  ) {
    warnings.push(createWarning(path, "Messages", 'table columns in section "Messages" do not match expected headers'));
  }

  const transitionHeaders = transitionsTable.headers;
  if (transitionHeaders.length > 0 && !sameHeaders(transitionHeaders, LEGACY_TRANSITION_HEADERS)) {
    warnings.push(createWarning(path, "Transitions", 'table columns in section "Transitions" do not match expected legacy headers'));
  }

  const fallbackName = name || id || getFileStem(path) || "Untitled Screen";

  return {
    file: {
      fileType: "screen",
      schema: "screen",
      path,
      title: fallbackName,
      frontmatter,
      sections,
      sourceLinks: parseSourceLinks(sections["Source Links"]),
      id,
      name: fallbackName,
      screenType: screenType || undefined,
      summary: joinSectionLines(sections.Summary),
      layouts: layoutTable.rows
        .map((row) => ({
          id: row.record.id?.trim() ?? "",
          label: row.record.label?.trim() || undefined,
          kind: row.record.kind?.trim() || undefined,
          purpose: row.record.purpose?.trim() || undefined,
          notes: row.record.notes?.trim() || undefined,
          rowLine: row.rowLine
        }))
        .filter((row) => !isEmptyRow(Object.values(row))),
      fields: fieldsTable.rows
        .map((row) => {
          const record = row.record;
          return {
            id: record.id?.trim() ?? "",
            label: record.label?.trim() || undefined,
            kind: record.kind?.trim() || undefined,
            layout: record.layout?.trim() || undefined,
            dataType: record.data_type?.trim() || undefined,
            required: record.required?.trim() || undefined,
            ref: record.ref?.trim() || undefined,
            rule: record.rule?.trim() || undefined,
            condition: record.condition?.trim() || undefined,
            notes: record.notes?.trim() || undefined,
            rowLine: row.rowLine
          };
        })
        .filter((row) => !isEmptyRow(Object.values(row))),
      actions: actionsTable.rows
        .map((row) => mapActionRow(row.record, row.rowLine))
        .filter((row) => !isEmptyRow(Object.values(row))),
      messages: messagesTable.rows
        .map((row) => mapMessageRow(row.record, row.rowLine, isLegacyMessages))
        .filter((row) => !isEmptyRow(Object.values(row))),
      localProcesses,
      legacyTransitions: transitionsTable.rows
        .map((row) => mapLegacyTransitionRow(row.record, row.rowLine))
        .filter((row) => !isEmptyRow(Object.values(row))),
      notes: normalizeNotes(sections.Notes),
      sectionLines
    },
    warnings
  };
}

function getBodyStartLine(markdown: string): number {
  if (!markdown.startsWith("---\n")) {
    return 0;
  }

  const lines = markdown.split("\n");
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index].trim() === "---") {
      return index + 1;
    }
  }

  return 0;
}

function getSectionLineNumbers(bodyLines: string[], bodyStartLine: number): Record<string, number> {
  const lines: Record<string, number> = {};

  for (let index = 0; index < bodyLines.length; index += 1) {
    const trimmed = bodyLines[index].trim();
    if (trimmed === "# Summary") {
      lines.Summary = bodyStartLine + index;
      continue;
    }

    const match = trimmed.match(/^##\s+(.+)$/);
    if (!match) {
      continue;
    }

    const sectionName = match[1].trim();
    lines[sectionName] = bodyStartLine + index;
  }

  return lines;
}

function readSectionTable(
  bodyLines: string[],
  bodyStartLine: number,
  sectionName: string
): {
  headers: string[];
  rows: Array<{ record: Record<string, string>; rowLine: number }>;
} {
  const sectionBody = getSectionBodyLines(bodyLines, sectionName);
  const tableLines = sectionBody
    .map((entry) => ({ ...entry, trimmed: entry.text.trim() }))
    .filter((entry) => entry.trimmed.startsWith("|"));

  if (tableLines.length < 2) {
    return { headers: [], rows: [] };
  }

  const headers = splitMarkdownTableRow(tableLines[0].trimmed) ?? [];
  if (headers.length === 0) {
    return { headers: [], rows: [] };
  }

  const rows: Array<{ record: Record<string, string>; rowLine: number }> = [];

  for (const rowLine of tableLines.slice(2)) {
    const values = splitMarkdownTableRow(rowLine.trimmed) ?? [];
    if (values.length !== headers.length) {
      continue;
    }

    const record: Record<string, string> = {};
    for (const [index, header] of headers.entries()) {
      record[header] = values[index] ?? "";
    }

    if (Object.values(record).every((value) => !value.trim())) {
      continue;
    }

    rows.push({
      record,
      rowLine: bodyStartLine + rowLine.index
    });
  }

  return { headers, rows };
}

function getSectionBodyLines(bodyLines: string[], sectionName: string): Array<{ index: number; text: string }> {
  const entries: Array<{ index: number; text: string }> = [];
  let inSection = false;

  for (let index = 0; index < bodyLines.length; index += 1) {
    const line = bodyLines[index];
    const trimmed = line.trim();

    if (sectionName === "Summary" && trimmed === "# Summary") {
      inSection = true;
      continue;
    }

    const topLevelHeading = trimmed.match(/^##\s+(.+)$/);
    if (topLevelHeading) {
      const current = topLevelHeading[1].trim();
      if (inSection && current !== sectionName) {
        break;
      }
      inSection = current === sectionName;
      continue;
    }

    if (inSection) {
      entries.push({ index, text: line });
    }
  }

  return entries;
}

function collectLocalProcesses(
  bodyLines: string[],
  bodyStartLine: number
): ScreenLocalProcess[] {
  const localProcessLines = getSectionBodyLines(bodyLines, "Local Processes");
  const processes: ScreenLocalProcess[] = [];

  for (let index = 0; index < localProcessLines.length; index += 1) {
    const entry = localProcessLines[index];
    const headingMatch = entry.text.trim().match(/^###\s+(.+)$/);
    if (!headingMatch) {
      continue;
    }

    const heading = headingMatch[1].trim();
    let summary: string | undefined;
    const processLines = getLocalProcessBodyLines(localProcessLines, index + 1);
    const stepsTable = readLocalProcessSubsectionTable(
      processLines,
      bodyStartLine,
      "Steps",
      LOCAL_PROCESS_STEP_HEADERS
    );
    const errorsTable = readLocalProcessSubsectionTable(
      processLines,
      bodyStartLine,
      "Errors",
      LOCAL_PROCESS_ERROR_HEADERS
    );

    for (let nextIndex = 0; nextIndex < processLines.length; nextIndex += 1) {
      const nextLine = processLines[nextIndex].text.trim();
      if (/^####\s+Summary$/.test(nextLine)) {
        const collected: string[] = [];
        for (let bodyIndex = nextIndex + 1; bodyIndex < processLines.length; bodyIndex += 1) {
          const bodyLine = processLines[bodyIndex].text.trim();
          if (/^####\s+/.test(bodyLine)) {
            break;
          }
          if (bodyLine) {
            collected.push(bodyLine);
          }
        }
        summary = collected.join(" ").trim() || undefined;
        break;
      }
    }

    processes.push({
      id: heading,
      heading,
      summary,
      steps: stepsTable.rows
        .map((row) => mapLocalProcessStepRow(row.record, row.rowLine))
        .filter((row) => !isEmptyRow(Object.values(row))),
      errors: errorsTable.rows
        .map((row) => mapLocalProcessErrorRow(row.record, row.rowLine))
        .filter((row) => !isEmptyRow(Object.values(row))),
      line: bodyStartLine + entry.index
    });
  }

  return processes;
}

function getLocalProcessBodyLines(
  localProcessLines: Array<{ index: number; text: string }>,
  startIndex: number
): Array<{ index: number; text: string }> {
  const entries: Array<{ index: number; text: string }> = [];
  for (let index = startIndex; index < localProcessLines.length; index += 1) {
    const entry = localProcessLines[index];
    if (/^###\s+/.test(entry.text.trim())) {
      break;
    }
    entries.push(entry);
  }
  return entries;
}

function readLocalProcessSubsectionTable(
  processLines: Array<{ index: number; text: string }>,
  bodyStartLine: number,
  subsectionName: string,
  expectedHeaders: string[]
): {
  headers: string[];
  rows: Array<{ record: Record<string, string>; rowLine: number }>;
} {
  const subsectionLines: Array<{ index: number; text: string }> = [];
  let inSubsection = false;

  for (const entry of processLines) {
    const trimmed = entry.text.trim();
    const headingMatch = trimmed.match(/^####\s+(.+)$/);
    if (headingMatch) {
      if (inSubsection) {
        break;
      }
      inSubsection = headingMatch[1].trim() === subsectionName;
      continue;
    }
    if (inSubsection) {
      subsectionLines.push(entry);
    }
  }

  const table = readTableFromEntries(subsectionLines, bodyStartLine);
  if (table.headers.length > 0 && !sameHeaders(table.headers, expectedHeaders)) {
    return { headers: table.headers, rows: [] };
  }
  return table;
}

function readTableFromEntries(
  entries: Array<{ index: number; text: string }>,
  bodyStartLine: number
): {
  headers: string[];
  rows: Array<{ record: Record<string, string>; rowLine: number }>;
} {
  const tableLines = entries
    .map((entry) => ({ ...entry, trimmed: entry.text.trim() }))
    .filter((entry) => entry.trimmed.startsWith("|"));

  if (tableLines.length < 2) {
    return { headers: [], rows: [] };
  }

  const headers = splitMarkdownTableRow(tableLines[0].trimmed) ?? [];
  if (headers.length === 0) {
    return { headers: [], rows: [] };
  }

  const rows: Array<{ record: Record<string, string>; rowLine: number }> = [];
  for (const rowLine of tableLines.slice(2)) {
    const values = splitMarkdownTableRow(rowLine.trimmed) ?? [];
    if (values.length !== headers.length) {
      continue;
    }
    const record: Record<string, string> = {};
    for (const [index, header] of headers.entries()) {
      record[header] = values[index] ?? "";
    }
    if (Object.values(record).every((value) => !value.trim())) {
      continue;
    }
    rows.push({
      record,
      rowLine: bodyStartLine + rowLine.index
    });
  }
  return { headers, rows };
}

function mapActionRow(record: Record<string, string>, rowLine: number): ScreenAction {
  return {
    id: record.id?.trim() || undefined,
    label: record.label?.trim() || undefined,
    kind: record.kind?.trim() || undefined,
    target: record.target?.trim() || undefined,
    event: record.event?.trim() || undefined,
    invoke: record.invoke?.trim() || undefined,
    transition: record.transition?.trim() || undefined,
    rule: record.rule?.trim() || undefined,
    condition: record.condition?.trim() || undefined,
    notes: record.notes?.trim() || undefined,
    rowLine
  };
}

function mapMessageRow(
  record: Record<string, string>,
  rowLine: number,
  isLegacyMessages: boolean
): ScreenMessage {
  if (isLegacyMessages) {
    return {
      id: undefined,
      text: record.ref?.trim() || undefined,
      severity: undefined,
      timing: record.timing?.trim() || undefined,
      notes: record.notes?.trim() || undefined,
      rowLine
    };
  }

  return {
    id: record.id?.trim() || undefined,
    text: record.text?.trim() || undefined,
    severity: record.severity?.trim() || undefined,
    timing: record.timing?.trim() || undefined,
    condition: record.condition?.trim() || undefined,
    notes: record.notes?.trim() || undefined,
    rowLine
  };
}

function mapLocalProcessStepRow(
  record: Record<string, string>,
  rowLine: number
) {
  return {
    id: record.id?.trim() || undefined,
    label: record.label?.trim() || undefined,
    kind: record.kind?.trim() || undefined,
    condition: record.condition?.trim() || undefined,
    input: record.input?.trim() || undefined,
    output: record.output?.trim() || undefined,
    rule: record.rule?.trim() || undefined,
    invoke: record.invoke?.trim() || undefined,
    screen: record.screen?.trim() || undefined,
    notes: record.notes?.trim() || undefined,
    rowLine
  };
}

function mapLocalProcessErrorRow(
  record: Record<string, string>,
  rowLine: number
) {
  return {
    id: record.id?.trim() || undefined,
    condition: record.condition?.trim() || undefined,
    message: record.message?.trim() || undefined,
    notes: record.notes?.trim() || undefined,
    rowLine
  };
}

function mapLegacyTransitionRow(
  record: Record<string, string>,
  rowLine: number
): ScreenLegacyTransition {
  return {
    id: record.id?.trim() || undefined,
    event: record.event?.trim() || undefined,
    to: record.to?.trim() || undefined,
    condition: record.condition?.trim() || undefined,
    notes: record.notes?.trim() || undefined,
    rowLine
  };
}

function sameHeaders(actual: string[], expected: string[]): boolean {
  if (actual.length !== expected.length) {
    return false;
  }

  return actual.every((header, index) => header === expected[index]);
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

function isEmptyRow(values: unknown[]): boolean {
  return values.every((value) => {
    if (value === undefined || value === null) {
      return true;
    }
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return !String(value).trim();
    }
    return false;
  });
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
