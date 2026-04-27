import {
  FuzzySuggestModal,
  MarkdownView,
  Notice,
  type App,
  type Editor,
  type EditorPosition,
  type FuzzyMatch,
  type TFile
} from "obsidian";
import {
  getQualifiedMemberCandidates,
  parseQualifiedRef,
  normalizeReferenceTarget,
  resolveDfdObjectReference,
  resolveErEntityReference,
  resolveObjectModelReference
} from "../core/reference-resolver";
import type { ModelingVaultIndex } from "../core/vault-index";
import { parseFrontmatter } from "../parsers/frontmatter-parser";
import { parseErEntityFile } from "../parsers/er-entity-parser";
import {
  getMarkdownTableCellRanges,
  splitMarkdownTableRow
} from "../parsers/markdown-table";
import type {
  AppProcessModel,
  ClassRelationEdge,
  CodeSetModel,
  DataObjectModel,
  DfdObjectModel,
  ErEntity,
  MessageModel,
  MappingModel,
  ObjectModel,
  RuleModel,
  ScreenModel
} from "../types/models";

const NO_COMPLETION_NOTICE =
  "No Model Weave completion is available at the current cursor position.";
const MARKDOWN_ONLY_NOTICE =
  "Model Weave completion is available only in Markdown editors.";
const TARGET_TABLE_NOT_RESOLVED_NOTICE =
  "Target table is not resolved for the current relation block.";
const CLASS_RELATION_KIND_OPTIONS = [
  "association",
  "dependency",
  "inheritance",
  "implementation",
  "aggregation",
  "composition"
] as const;
const SCREEN_ACTION_KIND_OPTIONS = [
  "ui_action",
  "field_event",
  "screen_event",
  "form_event",
  "system_event",
  "shortcut",
  "auto",
  "other"
] as const;
const SCREEN_ACTION_EVENT_OPTIONS = [
  "load",
  "unload",
  "click",
  "change",
  "input",
  "focus",
  "blur",
  "submit",
  "select",
  "keydown",
  "timer",
  "message",
  "other"
] as const;
const SCREEN_TYPE_OPTIONS = [
  "entry",
  "list",
  "detail",
  "confirm",
  "complete",
  "dialog",
  "dashboard",
  "admin",
  "other"
] as const;
const SCREEN_LAYOUT_KIND_OPTIONS = [
  "header",
  "body",
  "detail",
  "footer",
  "section",
  "form_area",
  "table_area",
  "action_area",
  "search_area",
  "result_area",
  "message_area",
  "other"
] as const;
const SCREEN_FIELD_KIND_OPTIONS = [
  "window",
  "form",
  "panel",
  "section",
  "table",
  "list",
  "input",
  "textarea",
  "select",
  "checkbox",
  "radio",
  "button",
  "link",
  "label",
  "hidden",
  "computed",
  "table_input",
  "table_select",
  "other"
] as const;
const SCREEN_FIELD_DATA_TYPE_OPTIONS = [
  "string",
  "number",
  "integer",
  "decimal",
  "boolean",
  "date",
  "datetime",
  "time",
  "array",
  "object",
  "binary",
  "other"
] as const;
const SCREEN_REQUIRED_OPTIONS = ["Y", "N"] as const;
const SCREEN_MESSAGE_SEVERITY_OPTIONS = [
  "info",
  "success",
  "warning",
  "error",
  "confirm",
  "other"
] as const;
const DATA_OBJECT_KIND_OPTIONS = [
  "data",
  "dto",
  "request",
  "response",
  "payload",
  "file",
  "form",
  "query",
  "result",
  "report",
  "message",
  "other"
] as const;
const DATA_OBJECT_FORMAT_OPTIONS = [
  "object",
  "json",
  "xml",
  "csv",
  "tsv",
  "fixed",
  "delimited",
  "excel",
  "edi",
  "binary",
  "form",
  "query",
  "other"
] as const;
const DATA_OBJECT_ENCODING_OPTIONS = ["UTF-8", "Shift_JIS", "EUC-JP", "ISO-8859-1"] as const;
const DATA_OBJECT_LINE_ENDING_OPTIONS = ["LF", "CRLF", "CR"] as const;
const DATA_OBJECT_HAS_HEADER_OPTIONS = ["true", "false"] as const;
const DATA_OBJECT_FORMAT_KEY_OPTIONS = [
  "data_format",
  "encoding",
  "delimiter",
  "quote",
  "escape",
  "line_ending",
  "has_header",
  "record_length",
  "record_type_position",
  "padding",
  "numeric_padding",
  "sheet",
  "template"
] as const;
const DATA_OBJECT_FORMAT_VALUE_OPTIONS: Record<string, readonly string[]> = {
  data_format: DATA_OBJECT_FORMAT_OPTIONS,
  encoding: DATA_OBJECT_ENCODING_OPTIONS,
  line_ending: DATA_OBJECT_LINE_ENDING_OPTIONS,
  has_header: DATA_OBJECT_HAS_HEADER_OPTIONS,
  padding: ["space", "zero", "none"],
  numeric_padding: ["zero", "space", "none"],
  quote: ["double_quote", "single_quote", "none"],
  escape: ["backslash", "double_quote", "none"]
};
const DATA_OBJECT_RECORD_OCCURRENCE_OPTIONS = ["1", "0..1", "1..*", "0..*"] as const;
const DATA_OBJECT_REQUIRED_OPTIONS = ["Y", "N"] as const;
const DATA_OBJECT_FIELD_TYPE_OPTIONS = [
  "string",
  "number",
  "integer",
  "decimal",
  "boolean",
  "date",
  "datetime",
  "time",
  "array",
  "object",
  "binary",
  "other"
] as const;
const DATA_OBJECT_FIELD_FORMAT_OPTIONS = [
  "yyyyMMdd",
  "yyyy/MM/dd",
  "zero_pad_left",
  "space_pad_right",
  "fixed:",
  "decimal_0",
  "decimal_2",
  "half_width",
  "half_width_kana",
  "full_width"
] as const;
const CODESET_KIND_OPTIONS = [
  "enum",
  "status",
  "master_code",
  "system_code",
  "external_code",
  "ui_options",
  "other"
] as const;

type CompletionKind =
  | "er-target-table"
  | "er-local-column"
  | "er-target-column"
  | "er-diagram-object"
  | "dfd-diagram-object"
  | "dfd-diagram-flow-from"
  | "dfd-diagram-flow-to"
  | "dfd-diagram-flow-data"
  | "data-object-field-ref"
  | "data-object-option"
  | "data-object-frontmatter"
  | "screen-option"
  | "screen-frontmatter"
  | "class-diagram-object"
  | "class-diagram-relation-picker"
  | "class-relation-to"
  | "class-relation-kind"
  | "screen-field-ref"
  | "screen-field-layout"
  | "screen-field-kind"
  | "screen-field-data-type"
  | "screen-field-required"
  | "screen-action-target"
  | "screen-action-kind"
  | "screen-action-event"
  | "screen-action-invoke"
  | "screen-action-transition"
  | "screen-rule-ref"
  | "screen-message-severity"
  | "app-process-input-data"
  | "app-process-input-source"
  | "app-process-output-data"
  | "app-process-output-target"
  | "app-process-trigger-source"
  | "app-process-transition-to"
  | "rule-input-data"
  | "rule-input-source"
  | "rule-reference-ref"
  | "rule-message-ref"
  | "mapping-scope-ref"
  | "mapping-source-ref"
  | "mapping-target-ref"
  | "mapping-rule-ref"
  | "codeset-active";

interface CompletionSuggestion {
  label: string;
  insertText: string;
  resolveKey?: string;
  kind?: "er_entity" | "class" | "dfd_object" | "data_object" | "column" | "kind" | "reference";
  detail?: string;
  rowValues?: Record<string, string>;
}

interface CompletionRequest {
  kind: CompletionKind;
  replaceFrom: EditorPosition;
  replaceTo: EditorPosition;
  suggestions: CompletionSuggestion[];
  placeholder: string;
  initialQuery?: string;
  tableColumnIndex?: number;
}

interface TableCellContext {
  columnIndex: number;
  replaceFrom: EditorPosition;
  replaceTo: EditorPosition;
}

export function openModelWeaveCompletion(
  app: App,
  getIndex: () => ModelingVaultIndex | null
): void {
  const activeView = app.workspace.getActiveViewOfType(MarkdownView);
  const file = activeView?.file ?? null;
  const editor = activeView?.editor;

  if (!file || file.extension !== "md" || !editor) {
    new Notice(MARKDOWN_ONLY_NOTICE);
    return;
  }

  const request = resolveCompletionRequest(file, editor, getIndex());
  if ("notice" in request) {
    new Notice(request.notice);
    return;
  }

  if (request.suggestions.length === 0) {
    new Notice(NO_COMPLETION_NOTICE);
    return;
  }

  const modal = new ModelWeaveCompletionModal(app, editor, request);
  modal.open();
  modal.applyInitialQuery();
}

class ModelWeaveCompletionModal extends FuzzySuggestModal<CompletionSuggestion> {
  constructor(
    app: App,
    private readonly editor: Editor,
    private readonly request: CompletionRequest
  ) {
    super(app);
    this.setPlaceholder(request.placeholder);
    this.emptyStateText = "No matching Model Weave candidates.";
  }

  getItems(): CompletionSuggestion[] {
    return this.request.suggestions;
  }

  getItemText(item: CompletionSuggestion): string {
    return [item.label, item.insertText, item.resolveKey, item.detail]
      .filter((value): value is string => Boolean(value))
      .join(" ");
  }

  renderSuggestion(item: FuzzyMatch<CompletionSuggestion>, el: HTMLElement): void {
    const suggestion = item.item;
    el.createDiv({ text: suggestion.label });
    if (suggestion.detail) {
      const detail = el.createDiv({ text: suggestion.detail });
      detail.style.fontSize = "12px";
      detail.style.color = "var(--text-muted)";
    }
  }

  onChooseItem(item: CompletionSuggestion): void {
    const liveEditor =
      this.app.workspace.getActiveViewOfType(MarkdownView)?.editor ?? this.editor;
    const cursor = replaceSuggestionText(liveEditor, this.request, item);
    restoreCompletionCursor(liveEditor, cursor);
  }

  applyInitialQuery(): void {
    if (!this.request.initialQuery) {
      return;
    }

    this.inputEl.value = this.request.initialQuery;
    this.inputEl.dispatchEvent(new Event("input"));
  }
}

function resolveCompletionRequest(
  file: TFile,
  editor: Editor,
  index: ModelingVaultIndex | null
): CompletionRequest | { notice: string } {
  const content = editor.getValue();
  const type = getFrontmatterType(content);
  if (!type) {
    return { notice: NO_COMPLETION_NOTICE };
  }

  const cursor = editor.getCursor();
  const lines = content.split(/\r?\n/);
  const line = lines[cursor.line] ?? "";

  if (type === "er_entity") {
    const targetTableRequest = getTargetTableCompletion(cursor, line, index);
    if (targetTableRequest) {
      return targetTableRequest;
    }

    const mappingRequest = getErMappingCompletion(file, content, lines, cursor, line, index);
    if (mappingRequest) {
      return mappingRequest;
    }
  }

  if (type === "er_diagram" || type === "class_diagram") {
    if (type === "class_diagram") {
      const relationPickerRequest = getClassDiagramRelationsCompletion(
        lines,
        cursor,
        line,
        content,
        index
      );
      if (relationPickerRequest) {
        return relationPickerRequest;
      }
    }

    const request = getDiagramObjectsRefCompletion(lines, cursor, line, type, index);
    if (request) {
      return request;
    }
  }

  if (type === "dfd_diagram") {
    const objectRequest = getDfdDiagramObjectsRefCompletion(
      lines,
      cursor,
      line,
      index
    );
    if (objectRequest) {
      return objectRequest;
    }

    const flowRequest = getDfdDiagramFlowCompletion(lines, cursor, line, index);
    if (flowRequest) {
      return flowRequest;
    }
  }

  if (type === "data_object") {
    const request = getDataObjectCompletion(content, lines, cursor, line, index);
    if (request) {
      return request;
    }
  }

  if (type === "screen") {
    const request = getScreenCompletion(content, lines, cursor, line, index);
    if (request) {
      return request;
    }
  }

  if (type === "app_process") {
    const request = getAppProcessCompletion(lines, cursor, line, index);
    if (request) {
      return request;
    }
  }

  if (type === "rule") {
    const request = getRuleCompletion(lines, cursor, line, index);
    if (request) {
      return request;
    }
  }

  if (type === "mapping") {
    const request = getMappingCompletion(lines, cursor, line, index);
    if (request) {
      return request;
    }
  }

  if (type === "codeset") {
    const request = getCodeSetCompletion(content, lines, cursor, line);
    if (request) {
      return request;
    }
  }

  if (type === "class") {
    const request = getClassRelationsCompletion(lines, cursor, line, index);
    if (request) {
      return request;
    }
  }

  return { notice: NO_COMPLETION_NOTICE };
}

function getTargetTableCompletion(
  cursor: EditorPosition,
  line: string,
  index: ModelingVaultIndex | null
): CompletionRequest | null {
  const match = line.match(/^(\s*-\s*target_table\s*:\s*)(.*)$/);
  if (!match) {
    return null;
  }

  const prefixLength = match[1].length;
  if (cursor.ch < prefixLength || !index) {
    return null;
  }

  const suggestions = Object.values(index.erEntitiesById)
    .sort((left, right) => left.physicalName.localeCompare(right.physicalName))
    .map((entity) => toErEntitySuggestion(entity));

  return {
    kind: "er-target-table",
    replaceFrom: { line: cursor.line, ch: prefixLength },
    replaceTo: { line: cursor.line, ch: line.length },
    suggestions,
    placeholder: "Complete ER target_table",
    initialQuery: normalizeCompletionQuery(line.slice(prefixLength))
  };
}

function getErMappingCompletion(
  file: TFile,
  content: string,
  lines: string[],
  cursor: EditorPosition,
  line: string,
  index: ModelingVaultIndex | null
): CompletionRequest | { notice: string } | null {
  if (!line.trim().startsWith("|")) {
    return null;
  }

  if (getSectionNameAtLine(lines, cursor.line) !== "Relations") {
    return null;
  }

  const tableHeaderIndex = findNearestLine(lines, cursor.line, (candidate) => {
    const row = parseMarkdownTableRow(candidate);
    return (
      row !== null &&
      row.length >= 3 &&
      row[0] === "local_column" &&
      row[1] === "target_column" &&
      row[2] === "notes"
    );
  });
  if (tableHeaderIndex < 0 || cursor.line <= tableHeaderIndex + 1) {
    return null;
  }

  const cell = getTableCellContext(line, cursor.line, cursor.ch);
  if (!cell || cell.columnIndex > 1) {
    return null;
  }

  const currentEntity = parseErEntityFile(content, file.path).file;
  if (!currentEntity) {
    return { notice: NO_COMPLETION_NOTICE };
  }

  if (cell.columnIndex === 0) {
    return {
      kind: "er-local-column",
      replaceFrom: cell.replaceFrom,
      replaceTo: cell.replaceTo,
      suggestions: currentEntity.columns
        .map((column) => column.physicalName)
        .filter((value): value is string => Boolean(value))
        .filter(onlyUnique)
        .sort()
        .map((physicalName) => ({
          label: physicalName,
          insertText: physicalName,
          resolveKey: physicalName,
          kind: "column"
        })),
      placeholder: "Complete local column",
      initialQuery: extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch)
    };
  }

  const targetTableRef = findCurrentRelationTargetTable(lines, cursor.line);
  if (!targetTableRef || !index) {
    return { notice: TARGET_TABLE_NOT_RESOLVED_NOTICE };
  }

  const targetEntity = resolveErEntityReference(targetTableRef, index);
  if (!targetEntity) {
    return { notice: TARGET_TABLE_NOT_RESOLVED_NOTICE };
  }

  return {
    kind: "er-target-column",
    replaceFrom: cell.replaceFrom,
    replaceTo: cell.replaceTo,
    suggestions: targetEntity.columns
      .map((column) => column.physicalName)
      .filter((value): value is string => Boolean(value))
      .filter(onlyUnique)
      .sort()
      .map((physicalName) => ({
        label: physicalName,
        insertText: physicalName,
        resolveKey: physicalName,
        kind: "column"
      })),
    placeholder: "Complete target column",
    initialQuery: extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch)
  };
}

function getClassDiagramRelationsCompletion(
  lines: string[],
  cursor: EditorPosition,
  line: string,
  content: string,
  index: ModelingVaultIndex | null
): CompletionRequest | { notice: string } | null {
  if (!line.trim().startsWith("|") || !index) {
    return null;
  }

  if (getSectionNameAtLine(lines, cursor.line) !== "Relations") {
    return null;
  }

  const tableHeaderIndex = findNearestLine(lines, cursor.line, (candidate) => {
    const row = parseMarkdownTableRow(candidate);
    return (
      row !== null &&
      row.length >= 8 &&
      row[0] === "id" &&
      row[1] === "from" &&
      row[2] === "to" &&
      row[3] === "kind"
    );
  });
  if (tableHeaderIndex < 0 || cursor.line <= tableHeaderIndex + 1) {
    return null;
  }

  if (isMarkdownTableSeparator(line)) {
    return null;
  }

  const cell = getTableCellContext(line, cursor.line, cursor.ch);
  if (!cell) {
    return null;
  }

  const suggestions = getClassDiagramRelationSuggestions(content, index);
  if (suggestions.length === 0) {
    return { notice: "No class relations are available for the current diagram." };
  }

  return {
    kind: "class-diagram-relation-picker",
    replaceFrom: { line: cursor.line, ch: 0 },
    replaceTo: { line: cursor.line, ch: line.length },
    suggestions,
    placeholder: "Pick a class relation for this diagram row"
  };
}

function getDiagramObjectsRefCompletion(
  lines: string[],
  cursor: EditorPosition,
  line: string,
  type: "er_diagram" | "class_diagram",
  index: ModelingVaultIndex | null
): CompletionRequest | null {
  if (!line.trim().startsWith("|") || !index) {
    return null;
  }

  if (getSectionNameAtLine(lines, cursor.line) !== "Objects") {
    return null;
  }

  const tableHeaderIndex = findNearestLine(lines, cursor.line, (candidate) => {
    const row = parseMarkdownTableRow(candidate);
    return row !== null && row.length >= 2 && row[0] === "ref" && row[1] === "notes";
  });
  if (tableHeaderIndex < 0 || cursor.line <= tableHeaderIndex + 1) {
    return null;
  }

  if (isMarkdownTableSeparator(line)) {
    return null;
  }

  const cell = getTableCellContext(line, cursor.line, cursor.ch);
  if (!cell || cell.columnIndex !== 0) {
    return null;
  }

  if (type === "er_diagram") {
    return {
      kind: "er-diagram-object",
      replaceFrom: cell.replaceFrom,
      replaceTo: cell.replaceTo,
      suggestions: Object.values(index.erEntitiesById)
        .sort((left, right) => left.physicalName.localeCompare(right.physicalName))
        .map((entity) => toErEntitySuggestion(entity)),
      placeholder: "Complete ER diagram object",
      initialQuery: normalizeCompletionQuery(
        extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch)
      ),
      tableColumnIndex: 0
    };
  }

  return {
    kind: "class-diagram-object",
    replaceFrom: cell.replaceFrom,
    replaceTo: cell.replaceTo,
    suggestions: Object.values(index.objectsById)
      .sort((left, right) => getObjectId(left).localeCompare(getObjectId(right)))
      .map((object) => toClassObjectSuggestion(object)),
    placeholder: "Complete class diagram object",
    initialQuery: normalizeCompletionQuery(
      extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch)
    ),
    tableColumnIndex: 0
  };
}

function getDfdDiagramObjectsRefCompletion(
  lines: string[],
  cursor: EditorPosition,
  line: string,
  index: ModelingVaultIndex | null
): CompletionRequest | null {
  if (!line.trim().startsWith("|") || !index) {
    return null;
  }

  if (getSectionNameAtLine(lines, cursor.line) !== "Objects") {
    return null;
  }

  const tableHeaderIndex = findNearestLine(lines, cursor.line, (candidate) => {
    const row = parseMarkdownTableRow(candidate);
    return row !== null && row.length >= 2 && row[0] === "ref" && row[1] === "notes";
  });
  if (tableHeaderIndex < 0 || cursor.line <= tableHeaderIndex + 1) {
    return null;
  }

  if (isMarkdownTableSeparator(line)) {
    return null;
  }

  const cell = getTableCellContext(line, cursor.line, cursor.ch);
  if (!cell || cell.columnIndex !== 0) {
    return null;
  }

  return {
    kind: "dfd-diagram-object",
    replaceFrom: cell.replaceFrom,
    replaceTo: cell.replaceTo,
    suggestions: Object.values(index.dfdObjectsById)
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((object) => toDfdObjectSuggestion(object)),
    placeholder: "Complete DFD diagram object",
    initialQuery: normalizeCompletionQuery(
      extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch)
    ),
    tableColumnIndex: 0
  };
}

function getDfdDiagramFlowCompletion(
  lines: string[],
  cursor: EditorPosition,
  line: string,
  index: ModelingVaultIndex | null
): CompletionRequest | null {
  if (!line.trim().startsWith("|") || !index) {
    return null;
  }

  if (getSectionNameAtLine(lines, cursor.line) !== "Flows") {
    return null;
  }

  const tableHeaderIndex = findNearestLine(lines, cursor.line, (candidate) => {
    const row = parseMarkdownTableRow(candidate);
    return (
      row !== null &&
      row.length >= 5 &&
      row[0] === "id" &&
      row[1] === "from" &&
      row[2] === "to"
    );
  });
  if (tableHeaderIndex < 0 || cursor.line <= tableHeaderIndex + 1) {
    return null;
  }

  if (isMarkdownTableSeparator(line)) {
    return null;
  }

  const cell = getTableCellContext(line, cursor.line, cursor.ch);
  if (!cell || (cell.columnIndex !== 1 && cell.columnIndex !== 2 && cell.columnIndex !== 3)) {
    return null;
  }

  if (cell.columnIndex === 3) {
    return {
      kind: "dfd-diagram-flow-data",
      replaceFrom: cell.replaceFrom,
      replaceTo: cell.replaceTo,
      suggestions: Object.values(index.dataObjectsById)
        .sort((left, right) => left.id.localeCompare(right.id))
        .map((object) => toDataObjectSuggestion(object)),
      placeholder: "Complete DFD flow data",
      initialQuery: normalizeCompletionQuery(
        extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch)
      ),
      tableColumnIndex: 3
    };
  }

  const preferredObjects = getDiagramObjectRefs(lines.join("\n"))
    .map((ref) => resolveDfdObjectReference(ref, index))
    .filter((object): object is DfdObjectModel => Boolean(object));
  const preferredIds = new Set(preferredObjects.map((object) => object.id));
  const remainingObjects = Object.values(index.dfdObjectsById).filter(
    (object) => !preferredIds.has(object.id)
  );
  const orderedSuggestions = [
    ...preferredObjects
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((object) => toDfdObjectSuggestion(object, "in diagram")),
    ...remainingObjects
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((object) => toDfdObjectSuggestion(object, "in vault"))
  ];

  return {
    kind: cell.columnIndex === 1 ? "dfd-diagram-flow-from" : "dfd-diagram-flow-to",
    replaceFrom: cell.replaceFrom,
    replaceTo: cell.replaceTo,
    suggestions: orderedSuggestions,
    placeholder:
      cell.columnIndex === 1 ? "Complete DFD flow source" : "Complete DFD flow target",
    initialQuery: normalizeCompletionQuery(
      extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch)
    ),
    tableColumnIndex: cell.columnIndex
  };
}

function getDataObjectCompletion(
  content: string,
  lines: string[],
  cursor: EditorPosition,
  line: string,
  index: ModelingVaultIndex | null
): CompletionRequest | null {
  const frontmatterRequest = getDataObjectFrontmatterCompletion(content, cursor, line);
  if (frontmatterRequest) {
    return frontmatterRequest;
  }

  if (!line.trim().startsWith("|") || !index || isMarkdownTableSeparator(line)) {
    return null;
  }

  const section = getSectionNameAtLine(lines, cursor.line);
  const cell = getTableCellContext(line, cursor.line, cursor.ch);
  if (!cell) {
    return null;
  }

  if (section === "Format") {
    if (!hasTableHeader(lines, cursor.line, ["key", "value", "notes"])) {
      return null;
    }
      if (cell.columnIndex === 0) {
        return buildOptionCompletionRequest(
          "data-object-option",
          cell,
          line,
          DATA_OBJECT_FORMAT_KEY_OPTIONS,
          "Complete data object format key",
          0
        );
      }
      if (cell.columnIndex === 1) {
        const row = parseMarkdownTableRow(line);
        const key = row?.[0]?.trim() ?? "";
        const options = DATA_OBJECT_FORMAT_VALUE_OPTIONS[key];
        if (!options || options.length === 0) {
          return null;
        }
        return buildOptionCompletionRequest(
          "data-object-option",
          cell,
          line,
          options,
          `Complete data object format value for ${key}`,
          1
        );
      }
    }

  if (section === "Records") {
    if (!hasTableHeader(lines, cursor.line, ["record_type", "name", "occurrence", "notes"])) {
      return null;
    }
    if (cell.columnIndex === 2) {
      return buildOptionCompletionRequest(
        "data-object-option",
        cell,
        line,
        DATA_OBJECT_RECORD_OCCURRENCE_OPTIONS,
        "Complete data object occurrence",
        2
      );
    }
  }

  if (section === "Fields") {
    const header = getNearestTableHeader(lines, cursor.line);
    if (!header) {
      return null;
    }

    const headerIndex = new Map(header.map((column, index) => [column, index]));
    const isFileLayout =
      headerIndex.has("record_type") ||
      headerIndex.has("no") ||
      headerIndex.has("position") ||
      headerIndex.has("field_format");

    const refColumnIndex = headerIndex.get("ref");
    if (typeof refColumnIndex === "number" && cell.columnIndex === refColumnIndex) {
      const cellValue = extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch);
      const qualifiedMemberRequest = getQualifiedMemberCompletionRequest(
        cursor,
        cell,
        cellValue,
        index,
        "Complete data object field reference"
      );
      if (qualifiedMemberRequest) {
        return qualifiedMemberRequest;
      }

      return {
        kind: "data-object-field-ref",
        replaceFrom: cell.replaceFrom,
        replaceTo: cell.replaceTo,
        suggestions: buildDataObjectReferenceSuggestions(index),
        placeholder: "Complete data object field reference",
        initialQuery: normalizeCompletionQuery(cellValue),
        tableColumnIndex: refColumnIndex
      };
    }

    const requiredColumnIndex = headerIndex.get("required");
    if (typeof requiredColumnIndex === "number" && cell.columnIndex === requiredColumnIndex) {
      return buildOptionCompletionRequest(
        "data-object-option",
        cell,
        line,
        DATA_OBJECT_REQUIRED_OPTIONS,
        "Complete data object required flag",
        requiredColumnIndex
      );
    }

    const typeColumnIndex = headerIndex.get("type");
    if (typeof typeColumnIndex === "number" && cell.columnIndex === typeColumnIndex) {
      return buildOptionCompletionRequest(
        "data-object-option",
        cell,
        line,
        DATA_OBJECT_FIELD_TYPE_OPTIONS,
        "Complete data object field type",
        typeColumnIndex
      );
    }

    const fieldFormatColumnIndex = headerIndex.get("field_format");
    if (
      isFileLayout &&
      typeof fieldFormatColumnIndex === "number" &&
      cell.columnIndex === fieldFormatColumnIndex
    ) {
      return buildOptionCompletionRequest(
        "data-object-option",
        cell,
        line,
        DATA_OBJECT_FIELD_FORMAT_OPTIONS,
        "Complete data object field format",
        fieldFormatColumnIndex
      );
    }
  }

  return null;
}

function getScreenCompletion(
  content: string,
  lines: string[],
  cursor: EditorPosition,
  line: string,
  index: ModelingVaultIndex | null
): CompletionRequest | null {
  const frontmatterRequest = getScreenFrontmatterCompletion(content, lines, cursor, line);
  if (frontmatterRequest) {
    return frontmatterRequest;
  }

  if (!line.trim().startsWith("|") || !index) {
    return null;
  }

  const section = getSectionNameAtLine(lines, cursor.line);
  const cell = getTableCellContext(line, cursor.line, cursor.ch);
  if (!cell || isMarkdownTableSeparator(line)) {
    return null;
  }

  if (section === "Layout") {
    if (!hasTableHeader(lines, cursor.line, ["id", "label", "kind", "purpose", "notes"])) {
      return null;
    }
    if (cell.columnIndex === 2) {
      return buildOptionCompletionRequest(
        "screen-option",
        cell,
        line,
        SCREEN_LAYOUT_KIND_OPTIONS,
        "Complete screen layout kind",
        2
      );
    }
  }

  if (section === "Fields") {
    if (
      !hasTableHeader(lines, cursor.line, [
        "id",
        "label",
        "kind",
        "layout",
        "data_type",
        "required",
        "ref",
        "rule",
        "notes"
      ])
    ) {
      return null;
    }

    if (cell.columnIndex === 2) {
      return buildOptionCompletionRequest(
        "screen-field-kind",
        cell,
        line,
        SCREEN_FIELD_KIND_OPTIONS,
        "Complete screen field kind",
        2
      );
    }
    if (cell.columnIndex === 3) {
      return {
        kind: "screen-field-layout",
        replaceFrom: cell.replaceFrom,
        replaceTo: cell.replaceTo,
        suggestions: getScreenLayoutSuggestions(lines),
        placeholder: "Complete screen layout",
        initialQuery: extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch),
        tableColumnIndex: 3
      };
    }
    if (cell.columnIndex === 4) {
      return buildOptionCompletionRequest(
        "screen-field-data-type",
        cell,
        line,
        SCREEN_FIELD_DATA_TYPE_OPTIONS,
        "Complete screen field data type",
        4
      );
    }
    if (cell.columnIndex === 5) {
      return buildOptionCompletionRequest(
        "screen-field-required",
        cell,
        line,
        SCREEN_REQUIRED_OPTIONS,
        "Complete screen field required flag",
        5
      );
    }
    if (cell.columnIndex === 6) {
      const cellValue = extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch);
      const qualifiedMemberRequest = getQualifiedMemberCompletionRequest(
        cursor,
        cell,
        cellValue,
        index,
        "Complete screen field reference"
      );
      if (qualifiedMemberRequest) {
        return qualifiedMemberRequest;
      }
      return {
        kind: "screen-field-ref",
        replaceFrom: cell.replaceFrom,
        replaceTo: cell.replaceTo,
        suggestions: buildStructuredReferenceSuggestions(index),
        placeholder: "Complete screen field ref",
        initialQuery: normalizeCompletionQuery(cellValue),
        tableColumnIndex: 6
      };
    }
    if (cell.columnIndex === 7) {
      return {
        kind: "screen-rule-ref",
        replaceFrom: cell.replaceFrom,
        replaceTo: cell.replaceTo,
        suggestions: buildRuleReferenceSuggestions(index),
        placeholder: "Complete screen field rule",
        initialQuery: normalizeCompletionQuery(
          extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch)
        ),
        tableColumnIndex: 7
      };
    }
  }

  if (section === "Actions") {
    if (
      !hasTableHeader(lines, cursor.line, [
        "id",
        "label",
        "kind",
        "target",
        "event",
        "invoke",
        "transition",
        "rule",
        "notes"
      ])
    ) {
      return null;
    }

    if (cell.columnIndex === 2) {
      return buildOptionCompletionRequest(
        "screen-action-kind",
        cell,
        line,
        SCREEN_ACTION_KIND_OPTIONS,
        "Complete screen action kind",
        2
      );
    }
    if (cell.columnIndex === 3) {
      return {
        kind: "screen-action-target",
        replaceFrom: cell.replaceFrom,
        replaceTo: cell.replaceTo,
        suggestions: getScreenFieldTargetSuggestions(lines),
        placeholder: "Complete screen action target",
        initialQuery: extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch),
        tableColumnIndex: 3
      };
    }
    if (cell.columnIndex === 4) {
      return buildOptionCompletionRequest(
        "screen-action-event",
        cell,
        line,
        SCREEN_ACTION_EVENT_OPTIONS,
        "Complete screen action event",
        4
      );
    }
    if (cell.columnIndex === 5) {
      const appProcessSuggestions = Object.values(index.appProcessesById)
        .sort((left, right) => left.id.localeCompare(right.id))
        .map((process) => toAppProcessSuggestion(process));
      return {
        kind: "screen-action-invoke",
        replaceFrom: cell.replaceFrom,
        replaceTo: cell.replaceTo,
        suggestions: [...getScreenLocalProcessSuggestions(lines), ...appProcessSuggestions],
        placeholder: "Complete screen invoke reference",
        initialQuery: normalizeCompletionQuery(
          extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch)
        ),
        tableColumnIndex: 5
      };
    }
    if (cell.columnIndex === 6) {
      return {
        kind: "screen-action-transition",
        replaceFrom: cell.replaceFrom,
        replaceTo: cell.replaceTo,
        suggestions: Object.values(index.screensById)
          .sort((left, right) => left.id.localeCompare(right.id))
          .map((screen) => toScreenSuggestion(screen)),
        placeholder: "Complete screen transition reference",
        initialQuery: normalizeCompletionQuery(
          extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch)
        ),
        tableColumnIndex: 6
      };
    }
    if (cell.columnIndex === 7) {
      return {
        kind: "screen-rule-ref",
        replaceFrom: cell.replaceFrom,
        replaceTo: cell.replaceTo,
        suggestions: buildRuleReferenceSuggestions(index),
        placeholder: "Complete screen action rule",
        initialQuery: normalizeCompletionQuery(
          extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch)
        ),
        tableColumnIndex: 7
      };
    }
  }

  if (section === "Messages") {
    if (!hasTableHeader(lines, cursor.line, ["id", "text", "severity", "timing", "notes"])) {
      return null;
    }
    if (cell.columnIndex === 1) {
      const cellValue = extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch);
      return {
        kind: "rule-message-ref",
        replaceFrom: cell.replaceFrom,
        replaceTo: cell.replaceTo,
        suggestions: Object.values(index.messagesById)
          .sort((left, right) => left.id.localeCompare(right.id))
          .map((messageSet) => toMessageSuggestion(messageSet)),
        placeholder: "Complete screen message reference",
        initialQuery: normalizeCompletionQuery(cellValue),
        tableColumnIndex: 1
      };
    }
    if (cell.columnIndex === 2) {
      return buildOptionCompletionRequest(
        "screen-message-severity",
        cell,
        line,
        SCREEN_MESSAGE_SEVERITY_OPTIONS,
        "Complete message severity",
        2
      );
    }
  }

  return null;
}

function getScreenFrontmatterCompletion(
  content: string,
  lines: string[],
  cursor: EditorPosition,
  line: string
): CompletionRequest | null {
  if (!isLineInsideFrontmatter(content, cursor.line)) {
    return null;
  }

  const frontmatterKey = getFrontmatterKeyAtLine(line);
  if (frontmatterKey !== "screen_type") {
    return null;
  }

  const separatorIndex = line.indexOf(":");
  if (separatorIndex < 0) {
    return null;
  }

  return {
    kind: "screen-frontmatter",
    replaceFrom: { line: cursor.line, ch: separatorIndex + 1 },
    replaceTo: { line: cursor.line, ch: lines[cursor.line]?.length ?? line.length },
    suggestions: SCREEN_TYPE_OPTIONS.map((option) => ({
      label: option,
      insertText: option,
      resolveKey: option,
      kind: "kind"
    })),
    placeholder: "Complete screen screen_type",
    initialQuery: line.slice(separatorIndex + 1).trim()
  };
}

function getScreenLayoutSuggestions(lines: string[]): CompletionSuggestion[] {
  const layouts = new Map<string, string>();
  let inLayout = false;
  let headerSeen = false;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    const headingMatch = trimmed.match(/^##\s+(.+)$/);
    if (headingMatch) {
      inLayout = headingMatch[1].trim() === "Layout";
      headerSeen = false;
      continue;
    }
    if (!inLayout || !trimmed.startsWith("|") || isMarkdownTableSeparator(trimmed)) {
      continue;
    }
    const row = parseMarkdownTableRow(trimmed);
    if (!row || row.length < 2) {
      continue;
    }
    if (!headerSeen) {
      headerSeen = row[0] === "id" && row[1] === "label";
      continue;
    }
    const id = row[0]?.trim();
    const label = row[1]?.trim();
    if (id) {
      layouts.set(id, label || id);
    }
  }

  return [...layouts.entries()].map(([id, label]) => ({
    label: `${id} / ${label}`,
    insertText: id,
    resolveKey: id,
    detail: "screen layout",
    kind: "reference"
  }));
}

function getScreenLocalProcessSuggestions(lines: string[]): CompletionSuggestion[] {
  const suggestions: CompletionSuggestion[] = [];
  let inLocalProcesses = false;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    const headingMatch = trimmed.match(/^##\s+(.+)$/);
    if (headingMatch) {
      inLocalProcesses = headingMatch[1].trim() === "Local Processes";
      continue;
    }
    if (!inLocalProcesses) {
      continue;
    }
    const localProcessMatch = trimmed.match(/^###\s+(.+)$/);
    if (!localProcessMatch) {
      continue;
    }
    const heading = localProcessMatch[1].trim();
    suggestions.push({
      label: heading,
      insertText: buildAliasedWikilink(`#${heading}`, heading),
      resolveKey: `#${heading}`,
      detail: "screen local process",
      kind: "reference"
    });
  }

  return suggestions;
}

function getAppProcessCompletion(
  lines: string[],
  cursor: EditorPosition,
  line: string,
  index: ModelingVaultIndex | null
): CompletionRequest | null {
  if (!line.trim().startsWith("|") || !index) {
    return null;
  }

  const section = getSectionNameAtLine(lines, cursor.line);
  const cell = getTableCellContext(line, cursor.line, cursor.ch);
  if (!cell || isMarkdownTableSeparator(line)) {
    return null;
  }

  if (section === "Inputs") {
    if (!hasTableHeader(lines, cursor.line, ["id", "data", "source", "required", "notes"])) {
      return null;
    }
    if (cell.columnIndex === 1 || cell.columnIndex === 2) {
      const cellValue = extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch);
      if (cell.columnIndex === 2) {
        const qualifiedMemberRequest = getQualifiedMemberCompletionRequest(
          cursor,
          cell,
          cellValue,
          index,
          "Complete app_process input source"
        );
        if (qualifiedMemberRequest) {
          return qualifiedMemberRequest;
        }
      }
      return {
        kind: cell.columnIndex === 1 ? "app-process-input-data" : "app-process-input-source",
        replaceFrom: cell.replaceFrom,
        replaceTo: cell.replaceTo,
        suggestions: buildStructuredReferenceSuggestions(index),
        placeholder:
          cell.columnIndex === 1 ? "Complete app_process input data" : "Complete app_process input source",
        initialQuery: normalizeCompletionQuery(cellValue),
        tableColumnIndex: cell.columnIndex
      };
    }
  }

  if (section === "Outputs") {
    if (!hasTableHeader(lines, cursor.line, ["id", "data", "target", "notes"])) {
      return null;
    }
    if (cell.columnIndex === 1 || cell.columnIndex === 2) {
      const cellValue = extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch);
      if (cell.columnIndex === 2) {
        const qualifiedMemberRequest = getQualifiedMemberCompletionRequest(
          cursor,
          cell,
          cellValue,
          index,
          "Complete app_process output target"
        );
        if (qualifiedMemberRequest) {
          return qualifiedMemberRequest;
        }
      }
      return {
        kind: cell.columnIndex === 1 ? "app-process-output-data" : "app-process-output-target",
        replaceFrom: cell.replaceFrom,
        replaceTo: cell.replaceTo,
        suggestions: buildStructuredReferenceSuggestions(index),
        placeholder:
          cell.columnIndex === 1 ? "Complete app_process output data" : "Complete app_process output target",
        initialQuery: normalizeCompletionQuery(cellValue),
        tableColumnIndex: cell.columnIndex
      };
    }
  }

  if (section === "Triggers") {
    if (!hasTableHeader(lines, cursor.line, ["id", "kind", "source", "event", "notes"])) {
      return null;
    }
    if (cell.columnIndex === 2) {
      const cellValue = extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch);
      const qualifiedMemberRequest = getQualifiedMemberCompletionRequest(
        cursor,
        cell,
        cellValue,
        index,
        "Complete app_process trigger source"
      );
      if (qualifiedMemberRequest) {
        return qualifiedMemberRequest;
      }
      return {
        kind: "app-process-trigger-source",
        replaceFrom: cell.replaceFrom,
        replaceTo: cell.replaceTo,
        suggestions: buildStructuredReferenceSuggestions(index),
        placeholder: "Complete app_process trigger source",
        initialQuery: normalizeCompletionQuery(cellValue),
        tableColumnIndex: 2
      };
    }
  }

  if (section === "Transitions") {
    if (!hasTableHeader(lines, cursor.line, ["id", "event", "to", "condition", "notes"])) {
      return null;
    }
    if (cell.columnIndex === 2) {
      return {
        kind: "app-process-transition-to",
        replaceFrom: cell.replaceFrom,
        replaceTo: cell.replaceTo,
        suggestions: Object.values(index.screensById)
          .sort((left, right) => left.id.localeCompare(right.id))
          .map((screen) => toScreenSuggestion(screen)),
        placeholder: "Complete transition screen reference",
        initialQuery: normalizeCompletionQuery(
          extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch)
        ),
        tableColumnIndex: 2
      };
    }
  }

  return null;
}

function getRuleCompletion(
  lines: string[],
  cursor: EditorPosition,
  line: string,
  index: ModelingVaultIndex | null
): CompletionRequest | null {
  if (!line.trim().startsWith("|") || !index) {
    return null;
  }

  const section = getSectionNameAtLine(lines, cursor.line);
  const cell = getTableCellContext(line, cursor.line, cursor.ch);
  if (!cell || isMarkdownTableSeparator(line)) {
    return null;
  }

  if (section === "Inputs") {
    if (!hasTableHeader(lines, cursor.line, ["id", "data", "source", "required", "notes"])) {
      return null;
    }
    if (cell.columnIndex === 1 || cell.columnIndex === 2) {
      const cellValue = extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch);
      const qualifiedMemberRequest = getQualifiedMemberCompletionRequest(
        cursor,
        cell,
        cellValue,
        index,
        cell.columnIndex === 1 ? "Complete rule input data" : "Complete rule input source"
      );
      if (qualifiedMemberRequest) {
        return qualifiedMemberRequest;
      }
      return {
        kind: cell.columnIndex === 1 ? "rule-input-data" : "rule-input-source",
        replaceFrom: cell.replaceFrom,
        replaceTo: cell.replaceTo,
        suggestions: buildStructuredReferenceSuggestions(index),
        placeholder: cell.columnIndex === 1 ? "Complete rule input data" : "Complete rule input source",
        initialQuery: normalizeCompletionQuery(cellValue),
        tableColumnIndex: cell.columnIndex
      };
    }
  }

  if (section === "References") {
    if (!hasTableHeader(lines, cursor.line, ["ref", "usage", "notes"])) {
      return null;
    }
    if (cell.columnIndex === 0) {
      const cellValue = extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch);
      const qualifiedMemberRequest = getQualifiedMemberCompletionRequest(
        cursor,
        cell,
        cellValue,
        index,
        "Complete rule reference"
      );
      if (qualifiedMemberRequest) {
        return qualifiedMemberRequest;
      }
      return {
        kind: "rule-reference-ref",
        replaceFrom: cell.replaceFrom,
        replaceTo: cell.replaceTo,
        suggestions: buildRuleReferenceableSuggestions(index),
        placeholder: "Complete rule reference",
        initialQuery: normalizeCompletionQuery(cellValue),
        tableColumnIndex: 0
      };
    }
  }

  if (section === "Messages") {
    if (!hasTableHeader(lines, cursor.line, ["condition", "message", "severity", "notes"])) {
      return null;
    }
    if (cell.columnIndex === 2) {
      return buildOptionCompletionRequest(
        "rule-message-ref",
        cell,
        line,
        ["error", "warning", "info", "confirm"],
        "Complete rule message severity",
        2
      );
    }
    if (cell.columnIndex === 1) {
      const cellValue = extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch);
      return {
        kind: "rule-message-ref",
        replaceFrom: cell.replaceFrom,
        replaceTo: cell.replaceTo,
        suggestions: buildGenericFileSuggestions(index),
        placeholder: "Complete rule message reference",
        initialQuery: normalizeCompletionQuery(cellValue),
        tableColumnIndex: 1
      };
    }
  }

  return null;
}

function getMappingCompletion(
  lines: string[],
  cursor: EditorPosition,
  line: string,
  index: ModelingVaultIndex | null
): CompletionRequest | null {
  if (!line.trim().startsWith("|") || !index) {
    return null;
  }

  const section = getSectionNameAtLine(lines, cursor.line);
  const cell = getTableCellContext(line, cursor.line, cursor.ch);
  if (!cell || isMarkdownTableSeparator(line)) {
    return null;
  }

  if (section === "Scope") {
    if (!hasTableHeader(lines, cursor.line, ["role", "ref", "notes"])) {
      return null;
    }
    if (cell.columnIndex === 0) {
      return buildOptionCompletionRequest(
        "mapping-scope-ref",
        cell,
        line,
        ["source", "target", "intermediate", "reference", "rule", "process"],
        "Complete mapping scope role",
        0
      );
    }
    if (cell.columnIndex === 1) {
      const cellValue = extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch);
      const qualifiedMemberRequest = getQualifiedMemberCompletionRequest(
        cursor,
        cell,
        cellValue,
        index,
        "Complete mapping scope ref"
      );
      if (qualifiedMemberRequest) {
        return qualifiedMemberRequest;
      }
      return {
        kind: "mapping-scope-ref",
        replaceFrom: cell.replaceFrom,
        replaceTo: cell.replaceTo,
        suggestions: buildRuleReferenceableSuggestions(index),
        placeholder: "Complete mapping scope ref",
        initialQuery: normalizeCompletionQuery(cellValue),
        tableColumnIndex: 1
      };
    }
  }

  if (section === "Mappings") {
    if (!hasTableHeader(lines, cursor.line, ["source_ref", "target_ref", "transform", "rule", "required", "notes"])) {
      return null;
    }
    if (cell.columnIndex === 0 || cell.columnIndex === 1) {
      const cellValue = extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch);
      const qualifiedMemberRequest = getQualifiedMemberCompletionRequest(
        cursor,
        cell,
        cellValue,
        index,
        cell.columnIndex === 0 ? "Complete mapping source_ref" : "Complete mapping target_ref"
      );
      if (qualifiedMemberRequest) {
        return qualifiedMemberRequest;
      }
      return {
        kind: cell.columnIndex === 0 ? "mapping-source-ref" : "mapping-target-ref",
        replaceFrom: cell.replaceFrom,
        replaceTo: cell.replaceTo,
        suggestions: buildStructuredReferenceSuggestions(index),
        placeholder: cell.columnIndex === 0 ? "Complete mapping source_ref" : "Complete mapping target_ref",
        initialQuery: normalizeCompletionQuery(cellValue),
        tableColumnIndex: cell.columnIndex
      };
    }
    if (cell.columnIndex === 3) {
      return {
        kind: "mapping-rule-ref",
        replaceFrom: cell.replaceFrom,
        replaceTo: cell.replaceTo,
        suggestions: [
          ...buildRuleReferenceSuggestions(index),
          ...Object.values(index.codesetsById)
            .sort((left, right) => left.id.localeCompare(right.id))
            .map((codeset) => toCodeSetSuggestion(codeset))
        ],
        placeholder: "Complete mapping rule",
        initialQuery: normalizeCompletionQuery(
          extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch)
        ),
        tableColumnIndex: 3
      };
    }
    if (cell.columnIndex === 4) {
      return buildOptionCompletionRequest(
        "mapping-rule-ref",
        cell,
        line,
        ["Y", "N"],
        "Complete mapping required",
        4
      );
    }
  }

  return null;
}

function getCodeSetCompletion(
  content: string,
  lines: string[],
  cursor: EditorPosition,
  line: string
): CompletionRequest | null {
  const frontmatterRequest = getCodeSetFrontmatterCompletion(content, cursor, line);
  if (frontmatterRequest) {
    return frontmatterRequest;
  }

  if (!line.trim().startsWith("|")) {
    return null;
  }

  const section = getSectionNameAtLine(lines, cursor.line);
  if (section !== "Values") {
    return null;
  }

  const cell = getTableCellContext(line, cursor.line, cursor.ch);
  if (!cell || isMarkdownTableSeparator(line)) {
    return null;
  }
  if (!hasTableHeader(lines, cursor.line, ["code", "label", "sort_order", "active", "notes"])) {
    return null;
  }
  if (cell.columnIndex === 3) {
    return buildOptionCompletionRequest(
      "codeset-active",
      cell,
      line,
      ["Y", "N"],
      "Complete codeset active",
      3
    );
  }
  return null;
}

function getCodeSetFrontmatterCompletion(
  content: string,
  cursor: EditorPosition,
  line: string
): CompletionRequest | null {
  if (!isLineInsideFrontmatter(content, cursor.line)) {
    return null;
  }

  const frontmatterKey = getFrontmatterKeyAtLine(line);
  if (frontmatterKey !== "kind") {
    return null;
  }

  const separatorIndex = line.indexOf(":");
  if (separatorIndex < 0) {
    return null;
  }

  return {
    kind: "codeset-active",
    replaceFrom: { line: cursor.line, ch: separatorIndex + 1 },
    replaceTo: { line: cursor.line, ch: line.length },
    suggestions: CODESET_KIND_OPTIONS.map((option) => ({
      label: option,
      insertText: option,
      resolveKey: option,
      kind: "kind"
    })),
    placeholder: "Complete codeset kind",
    initialQuery: line.slice(separatorIndex + 1).trim()
  };
}

function buildStructuredReferenceSuggestions(index: ModelingVaultIndex): CompletionSuggestion[] {
  return [
    ...Object.values(index.dataObjectsById)
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((object) => toDataObjectSuggestion(object)),
    ...Object.values(index.codesetsById)
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((codeset) => toCodeSetSuggestion(codeset)),
    ...Object.values(index.rulesById)
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((rule) => toRuleSuggestion(rule)),
    ...Object.values(index.mappingsById)
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((mapping) => toMappingSuggestion(mapping)),
    ...Object.values(index.screensById)
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((screen) => toScreenSuggestion(screen)),
    ...Object.values(index.appProcessesById)
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((process) => toAppProcessSuggestion(process)),
    ...Object.values(index.erEntitiesById)
      .sort((left, right) => left.logicalName.localeCompare(right.logicalName))
      .map((entity) => toLinkedReferenceSuggestionForEntity(entity)),
    ...Object.values(index.objectsById)
      .sort((left, right) => getObjectId(left).localeCompare(getObjectId(right)))
      .map((object) => toLinkedReferenceSuggestionForClass(object))
  ];
}

function buildRuleReferenceSuggestions(index: ModelingVaultIndex): CompletionSuggestion[] {
  return Object.values(index.rulesById)
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((rule) => toRuleSuggestion(rule));
}

function buildRuleReferenceableSuggestions(index: ModelingVaultIndex): CompletionSuggestion[] {
  return [
    ...buildRuleReferenceSuggestions(index),
    ...Object.values(index.codesetsById)
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((codeset) => toCodeSetSuggestion(codeset)),
    ...Object.values(index.messagesById)
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((messageSet) => toMessageSuggestion(messageSet)),
    ...Object.values(index.dataObjectsById)
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((object) => toDataObjectSuggestion(object)),
    ...Object.values(index.screensById)
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((screen) => toScreenSuggestion(screen)),
    ...Object.values(index.appProcessesById)
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((process) => toAppProcessSuggestion(process)),
    ...Object.values(index.mappingsById)
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((mapping) => toMappingSuggestion(mapping)),
    ...Object.values(index.erEntitiesById)
      .sort((left, right) => left.logicalName.localeCompare(right.logicalName))
      .map((entity) => toLinkedReferenceSuggestionForEntity(entity)),
    ...Object.values(index.objectsById)
      .sort((left, right) => getObjectId(left).localeCompare(getObjectId(right)))
      .map((object) => toLinkedReferenceSuggestionForClass(object))
  ];
}

function buildDataObjectReferenceSuggestions(index: ModelingVaultIndex): CompletionSuggestion[] {
  return [
    ...Object.values(index.erEntitiesById)
      .sort((left, right) => left.logicalName.localeCompare(right.logicalName))
      .map((entity) => toLinkedReferenceSuggestionForEntity(entity)),
    ...Object.values(index.objectsById)
      .sort((left, right) => getObjectId(left).localeCompare(getObjectId(right)))
      .map((object) => toLinkedReferenceSuggestionForClass(object)),
    ...Object.values(index.dataObjectsById)
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((object) => toDataObjectSuggestion(object)),
    ...Object.values(index.codesetsById)
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((codeset) => toCodeSetSuggestion(codeset)),
    ...Object.values(index.screensById)
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((screen) => toScreenSuggestion(screen)),
    ...Object.values(index.appProcessesById)
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((process) => toAppProcessSuggestion(process)),
    ...Object.values(index.dfdObjectsById)
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((object) => toDfdObjectSuggestion(object))
  ];
}

function buildGenericFileSuggestions(index: ModelingVaultIndex): CompletionSuggestion[] {
  return buildRuleReferenceableSuggestions(index);
}

function getScreenFieldTargetSuggestions(lines: string[]): CompletionSuggestion[] {
  const fields = new Map<string, string>();
  let inFields = false;
  let headerSeen = false;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    const headingMatch = trimmed.match(/^##\s+(.+)$/);
    if (headingMatch) {
      inFields = headingMatch[1].trim() === "Fields";
      headerSeen = false;
      continue;
    }
    if (!inFields || !trimmed.startsWith("|") || isMarkdownTableSeparator(trimmed)) {
      continue;
    }
    const row = parseMarkdownTableRow(trimmed);
    if (!row || row.length < 2) {
      continue;
    }
    if (!headerSeen) {
      headerSeen = row[0] === "id" && row[1] === "label";
      continue;
    }
    const id = row[0]?.trim();
    const label = row[1]?.trim();
    if (id) {
      fields.set(id, label || id);
    }
  }

  return [...fields.entries()].map(([id, label]) => ({
    label: `${id} / ${label}`,
    insertText: id,
    resolveKey: id,
    detail: "screen field target",
    kind: "reference"
  }));
}

function hasTableHeader(
  lines: string[],
  cursorLine: number,
  expectedHeader: string[]
): boolean {
  const tableHeaderIndex = findNearestLine(lines, cursorLine, (candidate) => {
    const row = parseMarkdownTableRow(candidate);
    return (
      row !== null &&
      expectedHeader.every((header, index) => row[index] === header)
    );
  });
  return tableHeaderIndex >= 0 && cursorLine > tableHeaderIndex + 1;
}

function getNearestTableHeader(lines: string[], cursorLine: number): string[] | null {
  const tableHeaderIndex = findNearestLine(lines, cursorLine, (candidate) => {
    const row = parseMarkdownTableRow(candidate);
    return row !== null && row.length > 0;
  });
  if (tableHeaderIndex < 0 || cursorLine <= tableHeaderIndex + 1) {
    return null;
  }

  const header = parseMarkdownTableRow(lines[tableHeaderIndex] ?? "");
  return header && header.length > 0 ? header : null;
}

function buildOptionCompletionRequest(
  kind: CompletionKind,
  cell: TableCellContext,
  line: string,
  options: readonly string[],
  placeholder: string,
  tableColumnIndex: number
): CompletionRequest {
  return {
    kind,
    replaceFrom: cell.replaceFrom,
    replaceTo: cell.replaceTo,
    suggestions: options.map((option) => ({
      label: option,
      insertText: option,
      resolveKey: option,
      kind: "kind"
    })),
    placeholder,
    initialQuery: extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch),
    tableColumnIndex
  };
}

function getQualifiedMemberCompletionRequest(
  cursor: EditorPosition,
  cell: TableCellContext,
  cellValue: string,
  index: ModelingVaultIndex,
  placeholder: string
): CompletionRequest | null {
  const qualified = parseQualifiedRef(cellValue);
  if (!qualified) {
    return null;
  }

  const normalizedCellValue = cellValue.trim();
  const dotIndex = normalizedCellValue.lastIndexOf(".");
  if (dotIndex < 0) {
    return null;
  }

  const memberStartInCell = normalizedCellValue.slice(0, dotIndex + 1).length;
  const memberQuery = normalizedCellValue.slice(dotIndex + 1).trim();
  const memberCandidates = getQualifiedMemberCandidates(qualified.baseRefRaw, index);
  if (memberCandidates.length === 0) {
    return null;
  }

  const rawCellStart = cell.replaceFrom.ch;
  const rawTrimmedStart = lineTrimmedOffset(cellValue);
  const replaceFromCh = rawCellStart + rawTrimmedStart + memberStartInCell;
  const replaceToCh = cell.replaceTo.ch;
  if (cursor.ch < replaceFromCh - 1) {
    return null;
  }

  return {
    kind: "data-object-field-ref",
    replaceFrom: { line: cursor.line, ch: replaceFromCh },
    replaceTo: { line: cursor.line, ch: replaceToCh },
    suggestions: memberCandidates
      .sort((left, right) => left.memberId.localeCompare(right.memberId))
      .map((candidate) => ({
        label: candidate.displayName
          ? `${candidate.memberId} — ${candidate.displayName}`
          : candidate.memberId,
        insertText: candidate.memberId,
        resolveKey: `${candidate.ownerId}.${candidate.memberId}`,
        detail: `${candidate.memberKind} · ${candidate.sourceSection}`,
        kind: "reference" as const
      })),
    placeholder,
    initialQuery: memberQuery
  };
}

function getClassDiagramRelationSuggestions(
  content: string,
  index: ModelingVaultIndex
): CompletionSuggestion[] {
  const objectRefs = getDiagramObjectRefs(content);
  const diagramObjects = objectRefs
    .map((ref) => resolveObjectModelReference(ref, index))
    .filter((object): object is ObjectModel => Boolean(object));
  const diagramObjectIds = new Set(diagramObjects.map((object) => getObjectId(object)));
  const seen = new Set<string>();
  const suggestions: CompletionSuggestion[] = [];

  for (const object of diagramObjects) {
    for (const relation of object.relations) {
      const targetObject =
        index.objectsById[relation.targetClass] ??
        resolveObjectModelReference(relation.targetClass, index);
      const key = [
        relation.id ?? "",
        relation.sourceClass,
        relation.targetClass,
        relation.kind,
        relation.label ?? "",
        relation.fromMultiplicity ?? "",
        relation.toMultiplicity ?? ""
      ].join("|");
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);

      const insideDiagram = diagramObjectIds.has(relation.targetClass);
      suggestions.push(
        toClassDiagramRelationSuggestion(relation, object, targetObject, insideDiagram)
      );
    }
  }

  return suggestions.sort((left, right) => {
    const leftPriority = left.detail?.includes("in diagram") ? 0 : 1;
    const rightPriority = right.detail?.includes("in diagram") ? 0 : 1;
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }
    return left.label.localeCompare(right.label);
  });
}

function getClassRelationsCompletion(
  lines: string[],
  cursor: EditorPosition,
  line: string,
  index: ModelingVaultIndex | null
): CompletionRequest | null {
  if (!line.trim().startsWith("|") || !index) {
    return null;
  }

  if (getSectionNameAtLine(lines, cursor.line) !== "Relations") {
    return null;
  }

  const tableHeaderIndex = findNearestLine(lines, cursor.line, (candidate) => {
    const row = parseMarkdownTableRow(candidate);
    return (
      row !== null &&
      row.length >= 7 &&
      row[0] === "id" &&
      row[1] === "to" &&
      row[2] === "kind"
    );
  });
  if (tableHeaderIndex < 0 || cursor.line <= tableHeaderIndex + 1) {
    return null;
  }

  if (isMarkdownTableSeparator(line)) {
    return null;
  }

  const cell = getTableCellContext(line, cursor.line, cursor.ch);
  if (!cell) {
    return null;
  }

  if (cell.columnIndex === 1) {
    const suggestions = Object.values(index.objectsById)
      .sort((left, right) => getObjectId(left).localeCompare(getObjectId(right)))
      .map((object) => ({
        label: `${getObjectId(object)} — ${object.name}`,
        insertText: buildAliasedWikilink(
          toFileLinkTarget(object.path),
          object.name || getObjectId(object)
        ),
        resolveKey: getObjectId(object),
        detail: object.kind,
        kind: "class" as const
      }));

    return {
      kind: "class-relation-to",
      replaceFrom: cell.replaceFrom,
      replaceTo: cell.replaceTo,
      suggestions,
      placeholder: "Complete class relation to",
      initialQuery: extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch),
      tableColumnIndex: 1
    };
  }

  if (cell.columnIndex === 2) {
    return {
      kind: "class-relation-kind",
      replaceFrom: cell.replaceFrom,
      replaceTo: cell.replaceTo,
      suggestions: CLASS_RELATION_KIND_OPTIONS.map((kind) => ({
        label: kind,
        insertText: kind,
        resolveKey: kind,
        kind: "kind"
      })),
      placeholder: "Complete class relation kind",
      initialQuery: extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch),
      tableColumnIndex: 2
    };
  }

  return null;
}

function getFrontmatterType(content: string): string | undefined {
  const parsed = parseFrontmatter(content);
  const type = parsed.file.frontmatter?.type;
  return typeof type === "string" && type.trim() ? type.trim() : undefined;
}

function getDataObjectFrontmatterCompletion(
  content: string,
  cursor: EditorPosition,
  line: string
): CompletionRequest | null {
  if (!isLineInsideFrontmatter(content, cursor.line)) {
    return null;
  }

  const frontmatterKey = getFrontmatterKeyAtLine(line);
  if (!frontmatterKey) {
    return null;
  }

  const optionsByKey: Record<string, readonly string[]> = {
    data_format: DATA_OBJECT_FORMAT_OPTIONS,
    kind: DATA_OBJECT_KIND_OPTIONS,
    encoding: DATA_OBJECT_ENCODING_OPTIONS,
    line_ending: DATA_OBJECT_LINE_ENDING_OPTIONS,
    has_header: DATA_OBJECT_HAS_HEADER_OPTIONS
  };

  const options = optionsByKey[frontmatterKey];
  if (!options) {
    return null;
  }

  const separatorIndex = line.indexOf(":");
  if (separatorIndex < 0) {
    return null;
  }

  const replaceFrom = { line: cursor.line, ch: separatorIndex + 1 };
  const replaceTo = { line: cursor.line, ch: line.length };

  return {
    kind: "data-object-frontmatter",
    replaceFrom,
    replaceTo,
    suggestions: options.map((option) => ({
      label: option,
      insertText: option,
      resolveKey: option,
      kind: "kind"
    })),
    placeholder: `Complete data_object ${frontmatterKey}`,
    initialQuery: line.slice(separatorIndex + 1).trim()
  };
}

function isLineInsideFrontmatter(content: string, lineIndex: number): boolean {
  const lines = content.split(/\r?\n/);
  if ((lines[0] ?? "").trim() !== "---") {
    return false;
  }

  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index].trim() === "---") {
      return lineIndex > 0 && lineIndex < index;
    }
  }

  return false;
}

function getFrontmatterKeyAtLine(line: string): string | null {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_-]*)\s*:/);
  return match ? match[1] : null;
}

function getSectionNameAtLine(lines: string[], lineIndex: number): string | null {
  for (let index = lineIndex; index >= 0; index -= 1) {
    const trimmed = lines[index].trim();
    const match = trimmed.match(/^##\s+(.+)$/);
    if (match) {
      return match[1].trim();
    }
  }

  return null;
}

function findNearestLine(
  lines: string[],
  startIndex: number,
  predicate: (line: string) => boolean
): number {
  for (let index = startIndex; index >= 0; index -= 1) {
    const candidate = lines[index] ?? "";
    if (predicate(candidate)) {
      return index;
    }
    if (index !== startIndex && /^##\s+/.test(candidate.trim())) {
      break;
    }
  }

  return -1;
}

function findCurrentRelationTargetTable(lines: string[], startIndex: number): string | null {
  const blockStartIndex = findCurrentRelationBlockStart(lines, startIndex);
  if (blockStartIndex < 0) {
    return null;
  }

  for (let index = blockStartIndex + 1; index <= startIndex; index += 1) {
    const trimmed = (lines[index] ?? "").trim();
    if (/^###\s+/.test(trimmed)) {
      break;
    }

    const match = trimmed.match(/^-\s*target_table\s*:\s*(.*)$/);
    if (match) {
      const value = match[1].trim();
      return value ? normalizeReferenceTarget(value) : null;
    }
  }

  return null;
}

function findCurrentRelationBlockStart(lines: string[], startIndex: number): number {
  for (let index = startIndex; index >= 0; index -= 1) {
    const trimmed = (lines[index] ?? "").trim();
    if (/^###\s+/.test(trimmed)) {
      return index;
    }
    if (/^##\s+/.test(trimmed) && index !== startIndex) {
      break;
    }
  }

  return -1;
}

function getTableCellContext(
  line: string,
  lineNumber: number,
  cursorCh: number
): TableCellContext | null {
  const ranges = getMarkdownTableCellRanges(line);
  if (!ranges || ranges.length === 0) {
    return null;
  }

  for (const range of ranges) {
    const inCell =
      (cursorCh >= range.rawStart && cursorCh < range.rawEnd) ||
      cursorCh === range.rawEnd ||
      (cursorCh === range.rawStart - 1 && range.columnIndex > 0);
    if (!inCell) {
      continue;
    }

    return {
      columnIndex: range.columnIndex,
      replaceFrom: { line: lineNumber, ch: range.contentStart },
      replaceTo: { line: lineNumber, ch: range.contentEnd }
    };
  }

  return null;
}

function parseMarkdownTableRow(line: string): string[] | null {
  return splitMarkdownTableRow(line);
}

function isMarkdownTableSeparator(line: string): boolean {
  const cells = parseMarkdownTableRow(line);
  if (!cells || cells.length === 0) {
    return false;
  }

  return cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function getObjectId(object: { frontmatter: Record<string, unknown>; name: string }): string {
  const explicitId = object.frontmatter.id;
  if (typeof explicitId === "string" && explicitId.trim()) {
    return explicitId.trim();
  }

  return object.name;
}

function onlyUnique(value: string, index: number, array: string[]): boolean {
  return array.indexOf(value) === index;
}

function toErEntitySuggestion(entity: {
  id: string;
  logicalName: string;
  physicalName: string;
  path: string;
}): CompletionSuggestion {
  const linkTarget = toFileLinkTarget(entity.path);
  const displayName = entity.logicalName || entity.physicalName || entity.id;
  return {
    label: `${entity.logicalName} / ${entity.physicalName}`,
    insertText: buildAliasedWikilink(linkTarget, displayName),
    resolveKey: linkTarget,
    detail: `${entity.id} · ${entity.path}`,
    kind: "er_entity"
  };
}

function toLinkedReferenceSuggestionForEntity(entity: ErEntity): CompletionSuggestion {
  const linkTarget = toFileLinkTarget(entity.path);
  const displayName = entity.logicalName || entity.physicalName || entity.id;
  return {
    label: `${displayName} / ${entity.physicalName}`,
    insertText: buildAliasedWikilink(linkTarget, displayName),
    resolveKey: linkTarget,
    detail: `er_entity · ${entity.id} · ${entity.path}`,
    kind: "er_entity"
  };
}

function toClassObjectSuggestion(object: {
  frontmatter: Record<string, unknown>;
  name: string;
  kind: string;
  path: string;
}): CompletionSuggestion {
  const linkTarget = toFileLinkTarget(object.path);
  const displayName = object.name || getObjectId(object);
  return {
    label: `${getObjectId(object)} / ${object.name}`,
    insertText: buildAliasedWikilink(linkTarget, displayName),
    resolveKey: linkTarget,
    detail: object.kind,
    kind: "class"
  };
}

function toLinkedReferenceSuggestionForClass(object: ObjectModel): CompletionSuggestion {
  const linkTarget = toFileLinkTarget(object.path);
  const displayName = object.name || getObjectId(object);
  return {
    label: `${displayName} / ${getObjectId(object)}`,
    insertText: buildAliasedWikilink(linkTarget, displayName),
    resolveKey: linkTarget,
    detail: `class · ${object.kind} · ${object.path}`,
    kind: "class"
  };
}

function toDfdObjectSuggestion(
  object: DfdObjectModel,
  scopeDetail?: string
): CompletionSuggestion {
  const linkTarget = toFileLinkTarget(object.path);
  return {
    label: `${object.id} / ${object.name}`,
    insertText: buildAliasedWikilink(linkTarget, object.name || object.id),
    resolveKey: linkTarget,
    detail: scopeDetail ? `${object.kind} · ${scopeDetail}` : object.kind,
    kind: "dfd_object"
  };
}

function toDataObjectSuggestion(object: DataObjectModel): CompletionSuggestion {
  const linkTarget = toFileLinkTarget(object.path);
  return {
    label: `${object.id} / ${object.name}`,
    insertText: buildAliasedWikilink(linkTarget, object.name || object.id),
    resolveKey: linkTarget,
    detail: object.kind ?? "data_object",
    kind: "data_object"
  };
}

function toScreenSuggestion(screen: ScreenModel): CompletionSuggestion {
  const linkTarget = toFileLinkTarget(screen.path);
  return {
    label: `${screen.id} / ${screen.name}`,
    insertText: buildAliasedWikilink(linkTarget, screen.name || screen.id),
    resolveKey: linkTarget,
    detail: screen.screenType ?? "screen",
    kind: "reference"
  };
}

function toAppProcessSuggestion(process: AppProcessModel): CompletionSuggestion {
  const linkTarget = toFileLinkTarget(process.path);
  return {
    label: `${process.id} / ${process.name}`,
    insertText: buildAliasedWikilink(linkTarget, process.name || process.id),
    resolveKey: linkTarget,
    detail: process.kind ?? "app_process",
    kind: "reference"
  };
}

function toCodeSetSuggestion(codeset: CodeSetModel): CompletionSuggestion {
  const linkTarget = toFileLinkTarget(codeset.path);
  return {
    label: `${codeset.id} / ${codeset.name}`,
    insertText: buildAliasedWikilink(linkTarget, codeset.name || codeset.id),
    resolveKey: linkTarget,
    detail: codeset.kind ?? "codeset",
    kind: "reference"
  };
}

function toMessageSuggestion(messageSet: MessageModel): CompletionSuggestion {
  const linkTarget = toFileLinkTarget(messageSet.path);
  return {
    label: `${messageSet.id} / ${messageSet.name}`,
    insertText: buildAliasedWikilink(linkTarget, messageSet.name || messageSet.id),
    resolveKey: linkTarget,
    detail: messageSet.kind ?? "message",
    kind: "reference"
  };
}

function toRuleSuggestion(rule: RuleModel): CompletionSuggestion {
  const linkTarget = toFileLinkTarget(rule.path);
  return {
    label: `${rule.id} / ${rule.name}`,
    insertText: buildAliasedWikilink(linkTarget, rule.name || rule.id),
    resolveKey: linkTarget,
    detail: rule.kind ?? "rule",
    kind: "reference"
  };
}

function toMappingSuggestion(mapping: MappingModel): CompletionSuggestion {
  const linkTarget = toFileLinkTarget(mapping.path);
  return {
    label: `${mapping.id} / ${mapping.name}`,
    insertText: buildAliasedWikilink(linkTarget, mapping.name || mapping.id),
    resolveKey: linkTarget,
    detail: mapping.kind ?? "mapping",
    kind: "reference"
  };
}

function toFileLinkTarget(path: string): string {
  return path.replace(/\\/g, "/").replace(/\.md$/i, "");
}

function normalizeCompletionQuery(value: string): string {
  const trimmed = value.trim();
  const withoutOpening = trimmed.startsWith("[[") ? trimmed.slice(2) : trimmed;
  const withoutClosing = withoutOpening.endsWith("]]")
    ? withoutOpening.slice(0, -2)
    : withoutOpening;
  const normalized = withoutClosing.replace(/\\\|/g, "|");
  let escaped = false;
  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === "|") {
      return normalized.slice(0, index).trim();
    }
  }
  return normalized.trim();
}

function lineTrimmedOffset(value: string): number {
  const match = value.match(/^\s*/);
  return match ? match[0].length : 0;
}

function getDiagramObjectRefs(content: string): string[] {
  const lines = content.split(/\r?\n/);
  const refs: string[] = [];
  let inObjectsSection = false;
  let headerSeen = false;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    const headingMatch = trimmed.match(/^##\s+(.+)$/);
    if (headingMatch) {
      inObjectsSection = headingMatch[1].trim() === "Objects";
      headerSeen = false;
      continue;
    }

    if (!inObjectsSection || !trimmed.startsWith("|")) {
      continue;
    }

    if (isMarkdownTableSeparator(trimmed)) {
      continue;
    }

    const row = parseMarkdownTableRow(trimmed);
    if (!row || row.length < 2) {
      continue;
    }

    if (!headerSeen) {
      headerSeen = row[0] === "ref" && row[1] === "notes";
      continue;
    }

    if (row[0]) {
      refs.push(row[0]);
    }
  }

  return refs;
}

function extractLineText(line: string, from: number, to: number): string {
  return line.slice(from, to).trim();
}

function replaceSuggestionText(
  editor: Editor,
  request: CompletionRequest,
  suggestion: CompletionSuggestion
): EditorPosition {
  const insertText = suggestion.insertText;
  if (
    request.tableColumnIndex !== undefined &&
      (
        request.kind === "er-diagram-object" ||
        request.kind === "dfd-diagram-object" ||
        request.kind === "dfd-diagram-flow-from" ||
        request.kind === "dfd-diagram-flow-to" ||
        request.kind === "dfd-diagram-flow-data" ||
        request.kind === "data-object-field-ref" ||
        request.kind === "data-object-option" ||
        request.kind === "screen-option" ||
        request.kind === "class-diagram-object" ||
        request.kind === "class-relation-to" ||
        request.kind === "class-relation-kind" ||
        request.kind === "screen-field-ref" ||
        request.kind === "screen-field-layout" ||
        request.kind === "screen-field-kind" ||
        request.kind === "screen-field-data-type" ||
        request.kind === "screen-field-required" ||
        request.kind === "screen-action-target" ||
        request.kind === "screen-action-kind" ||
        request.kind === "screen-action-event" ||
        request.kind === "screen-action-invoke" ||
        request.kind === "screen-action-transition" ||
        request.kind === "screen-rule-ref" ||
        request.kind === "screen-message-severity" ||
          request.kind === "app-process-input-data" ||
          request.kind === "app-process-input-source" ||
          request.kind === "app-process-output-data" ||
          request.kind === "app-process-output-target" ||
          request.kind === "app-process-trigger-source" ||
          request.kind === "app-process-transition-to" ||
          request.kind === "rule-input-data" ||
          request.kind === "rule-input-source" ||
          request.kind === "rule-reference-ref" ||
          request.kind === "rule-message-ref" ||
          request.kind === "mapping-scope-ref" ||
          request.kind === "mapping-source-ref" ||
          request.kind === "mapping-target-ref" ||
          request.kind === "mapping-rule-ref" ||
          request.kind === "codeset-active"
      )
  ) {
    return replaceMarkdownTableCell(editor, request, insertText);
  }

  if (request.kind === "class-diagram-relation-picker") {
    if (suggestion.rowValues) {
      return replaceClassDiagramRelationRow(
        editor,
        request.replaceFrom.line,
        suggestion.rowValues
      );
    }
  }

  editor.replaceRange(insertText, request.replaceFrom, request.replaceTo);
  return {
    line: request.replaceFrom.line,
    ch: request.replaceFrom.ch + insertText.length
  };
}

function restoreCompletionCursor(editor: Editor, cursor: EditorPosition): void {
  focusMarkdownEditor(editor);
  editor.setSelection(cursor, cursor);
  editor.setCursor(cursor);

  const defer =
    typeof window !== "undefined" && typeof window.requestAnimationFrame === "function"
      ? window.requestAnimationFrame.bind(window)
      : (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0);

  defer(() => {
    focusMarkdownEditor(editor);
    editor.setSelection(cursor, cursor);
    editor.setCursor(cursor);
  });
}

function focusMarkdownEditor(editor: Editor): void {
  const editorWithFocus = editor as Editor & {
    focus?: () => void;
    cm?: { focus?: () => void };
  };

  editorWithFocus.focus?.();
  editorWithFocus.cm?.focus?.();
}

function replaceClassDiagramRelationRow(
  editor: Editor,
  lineNumber: number,
  rowValues: Record<string, string>
): EditorPosition {
  const line = editor.getLine(lineNumber);
  const existingCells = parseMarkdownTableRow(line) ?? [];
  const cells = new Array(8).fill("");
  for (let index = 0; index < Math.min(existingCells.length, cells.length); index += 1) {
    cells[index] = existingCells[index] ?? "";
  }

  const existingId = cells[0].trim();
  if (!existingId) {
    const preferredId =
      normalizeRelationId(rowValues.id) ??
      buildFallbackRelationId(rowValues.from ?? "", rowValues.to ?? "", rowValues.kind ?? "");
    cells[0] = ensureUniqueClassDiagramRelationId(editor, lineNumber, preferredId);
  }
  cells[1] = rowValues.from ?? cells[1];
  cells[2] = rowValues.to ?? cells[2];
  cells[3] = rowValues.kind ?? cells[3];
  cells[4] = rowValues.label ?? cells[4];
  cells[5] = rowValues.from_multiplicity ?? cells[5];
  cells[6] = rowValues.to_multiplicity ?? cells[6];

  const nextLine = `| ${cells.join(" | ")} |`;
  editor.replaceRange(
    nextLine,
    { line: lineNumber, ch: 0 },
    { line: lineNumber, ch: line.length }
  );

  return {
    line: lineNumber,
    ch: nextLine.length
  };
}

function toClassDiagramRelationSuggestion(
  relation: ClassRelationEdge,
  sourceObject: ObjectModel,
  targetObject: ObjectModel | null,
  insideDiagram: boolean
): CompletionSuggestion {
  const labelPart = relation.label ? ` | ${relation.label}` : "";
  const multiplicityPart =
    relation.fromMultiplicity || relation.toMultiplicity
      ? ` [${relation.fromMultiplicity ?? ""} -> ${relation.toMultiplicity ?? ""}]`
      : "";

  return {
    label: `${relation.sourceClass} -> ${relation.targetClass} | ${relation.kind}${labelPart}${multiplicityPart}`,
    insertText: relation.id ?? `${relation.sourceClass}->${relation.targetClass}`,
    detail: insideDiagram ? "target in diagram" : "target outside diagram",
    kind: "class",
    rowValues: {
      id: relation.id ?? "",
      from: toObjectDiagramWikilink(sourceObject),
      to: targetObject
        ? toObjectDiagramWikilink(targetObject)
        : toReferenceWikilink(relation.targetClass),
      kind: relation.kind,
      label: relation.label ?? "",
      from_multiplicity: relation.fromMultiplicity ?? "",
      to_multiplicity: relation.toMultiplicity ?? ""
    }
  };
}

function toObjectDiagramWikilink(object: { path: string; name?: string; frontmatter?: Record<string, unknown> }): string {
  const displayName =
    object.name ||
    (typeof object.frontmatter?.id === "string" && object.frontmatter.id.trim()) ||
    getFileStem(object.path);
  return buildAliasedWikilink(toFileLinkTarget(object.path), displayName);
}

function toReferenceWikilink(reference: string): string {
  return buildAliasedWikilink(normalizeReferenceTarget(reference), normalizeReferenceTarget(reference).split("/").pop() ?? normalizeReferenceTarget(reference));
}

function normalizeRelationId(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function buildFallbackRelationId(from: string, to: string, kind: string): string {
  const source = sanitizeRelationIdPart(from) || "FROM";
  const target = sanitizeRelationIdPart(to) || "TO";
  const relationKind = sanitizeRelationIdPart(kind);
  return relationKind
    ? `REL-${source}-${relationKind}-${target}`
    : `REL-${source}-${target}`;
}

function sanitizeRelationIdPart(value: string): string {
  return value
    .trim()
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase();
}

function ensureUniqueClassDiagramRelationId(
  editor: Editor,
  lineNumber: number,
  preferredId: string
): string {
  const existingIds = collectExistingClassDiagramRelationIds(editor, lineNumber);
  if (!existingIds.has(preferredId)) {
    return preferredId;
  }

  let suffix = 2;
  while (existingIds.has(`${preferredId}-${suffix}`)) {
    suffix += 1;
  }

  return `${preferredId}-${suffix}`;
}

function collectExistingClassDiagramRelationIds(
  editor: Editor,
  lineNumber: number
): Set<string> {
  const lines = editor.getValue().split(/\r?\n/);
  const headerRowIndex = findNearestLine(lines, lineNumber, (candidate) => {
    const row = parseMarkdownTableRow(candidate);
    return (
      row !== null &&
      row.length >= 8 &&
      row[0] === "id" &&
      row[1] === "from" &&
      row[2] === "to" &&
      row[3] === "kind"
    );
  });
  if (headerRowIndex < 0) {
    return new Set();
  }

  const ids = new Set<string>();
  for (let index = headerRowIndex + 2; index < lines.length; index += 1) {
    const candidate = lines[index] ?? "";
    const trimmed = candidate.trim();
    if (/^##\s+/.test(trimmed)) {
      break;
    }
    if (!trimmed.startsWith("|") || isMarkdownTableSeparator(trimmed)) {
      continue;
    }

    if (index === lineNumber) {
      continue;
    }

    const row = parseMarkdownTableRow(trimmed);
    const id = row?.[0]?.trim();
    if (id) {
      ids.add(id);
    }
  }

  return ids;
}

function replaceMarkdownTableCell(
  editor: Editor,
  request: CompletionRequest,
  insertText: string
): EditorPosition {
  const lineNumber = request.replaceFrom.line;
  const line = editor.getLine(lineNumber);
  const ranges = getMarkdownTableCellRanges(line);

  const columnIndex = request.tableColumnIndex ?? 0;
  if (!ranges || columnIndex >= ranges.length) {
    editor.replaceRange(insertText, request.replaceFrom, request.replaceTo);
    return {
      line: request.replaceFrom.line,
      ch: request.replaceFrom.ch + insertText.length
    };
  }

  const range = ranges[columnIndex];
  const nextLine = `${line.slice(0, range.rawStart)} ${insertText} ${line.slice(range.rawEnd)}`;

  editor.replaceRange(
    nextLine,
    { line: lineNumber, ch: 0 },
    { line: lineNumber, ch: line.length }
  );

  return {
    line: lineNumber,
    ch: range.rawStart + 1 + insertText.length
  };
}

function buildAliasedWikilink(target: string, displayName: string): string {
  return `[[${target}\\|${escapeWikilinkAlias(displayName)}]]`;
}

function escapeWikilinkAlias(value: string): string {
  return value.replace(/\|/g, "\\|");
}

function getFileStem(path: string): string {
  return path.replace(/\\/g, "/").split("/").pop()?.replace(/\.md$/i, "") ?? path;
}
