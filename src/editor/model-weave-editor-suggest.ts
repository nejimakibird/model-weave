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
import { normalizeReferenceTarget, resolveErEntityReference } from "../core/reference-resolver";
import type { ModelingVaultIndex } from "../core/vault-index";
import { parseFrontmatter } from "../parsers/frontmatter-parser";
import { parseErEntityFile } from "../parsers/er-entity-parser";

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

type CompletionKind =
  | "er-target-table"
  | "er-local-column"
  | "er-target-column"
  | "er-diagram-object"
  | "class-diagram-object"
  | "class-relation-to"
  | "class-relation-kind";

interface CompletionSuggestion {
  label: string;
  insertText: string;
  resolveKey?: string;
  kind?: "er_entity" | "class" | "column" | "kind";
  detail?: string;
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
    const cursor = replaceSuggestionText(liveEditor, this.request, item.insertText);
    liveEditor.setCursor(cursor);
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
    const request = getDiagramObjectsRefCompletion(lines, cursor, line, type, index);
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
        insertText: getObjectId(object),
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
  const pipeIndexes: number[] = [];
  for (let index = 0; index < line.length; index += 1) {
    if (line[index] === "|") {
      pipeIndexes.push(index);
    }
  }

  if (pipeIndexes.length > 0 && pipeIndexes[pipeIndexes.length - 1] < line.length) {
    pipeIndexes.push(line.length);
  }

  if (pipeIndexes.length < 2) {
    return null;
  }

  for (let columnIndex = 0; columnIndex < pipeIndexes.length - 1; columnIndex += 1) {
    const rawStart = pipeIndexes[columnIndex] + 1;
    const rawEnd = pipeIndexes[columnIndex + 1];
    const inCell =
      (cursorCh >= rawStart && cursorCh < rawEnd) ||
      cursorCh === rawEnd ||
      (cursorCh === pipeIndexes[columnIndex] && columnIndex > 0);
    if (!inCell) {
      continue;
    }

    let contentStart = rawStart;
    let contentEnd = rawEnd;

    while (contentStart < rawEnd && /\s/.test(line[contentStart] ?? "")) {
      contentStart += 1;
    }
    while (contentEnd > rawStart && /\s/.test(line[contentEnd - 1] ?? "")) {
      contentEnd -= 1;
    }

    if (contentStart > contentEnd) {
      contentStart = rawStart;
      contentEnd = rawStart;
    }

    return {
      columnIndex,
      replaceFrom: { line: lineNumber, ch: contentStart },
      replaceTo: { line: lineNumber, ch: contentEnd }
    };
  }

  return null;
}

function parseMarkdownTableRow(line: string): string[] | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) {
    return null;
  }

  return trimmed
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());
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
  return {
    label: `${entity.logicalName} / ${entity.physicalName}`,
    insertText: `[[${linkTarget}]]`,
    resolveKey: linkTarget,
    detail: `${entity.id} · ${entity.path}`,
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
  return {
    label: `${getObjectId(object)} / ${object.name}`,
    insertText: `[[${linkTarget}]]`,
    resolveKey: linkTarget,
    detail: object.kind,
    kind: "class"
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
  return withoutClosing.split("|", 1)[0].trim();
}

function extractLineText(line: string, from: number, to: number): string {
  return line.slice(from, to).trim();
}

function replaceSuggestionText(
  editor: Editor,
  request: CompletionRequest,
  insertText: string
): EditorPosition {
  if (
    request.tableColumnIndex !== undefined &&
    (
      request.kind === "er-diagram-object" ||
      request.kind === "class-diagram-object" ||
      request.kind === "class-relation-to" ||
      request.kind === "class-relation-kind"
    )
  ) {
    return replaceMarkdownTableCell(editor, request, insertText);
  }

  editor.replaceRange(insertText, request.replaceFrom, request.replaceTo);
  return {
    line: request.replaceFrom.line,
    ch: request.replaceFrom.ch + insertText.length
  };
}

function replaceMarkdownTableCell(
  editor: Editor,
  request: CompletionRequest,
  insertText: string
): EditorPosition {
  const lineNumber = request.replaceFrom.line;
  const line = editor.getLine(lineNumber);
  const pipeIndexes: number[] = [];

  for (let index = 0; index < line.length; index += 1) {
    if (line[index] === "|") {
      pipeIndexes.push(index);
    }
  }

  const columnIndex = request.tableColumnIndex ?? 0;
  if (pipeIndexes.length < columnIndex + 2) {
    editor.replaceRange(insertText, request.replaceFrom, request.replaceTo);
    return {
      line: request.replaceFrom.line,
      ch: request.replaceFrom.ch + insertText.length
    };
  }

  const rawStart = pipeIndexes[columnIndex] + 1;
  const rawEnd = pipeIndexes[columnIndex + 1];
  const nextLine = `${line.slice(0, rawStart)} ${insertText} ${line.slice(rawEnd)}`;

  editor.replaceRange(
    nextLine,
    { line: lineNumber, ch: 0 },
    { line: lineNumber, ch: line.length }
  );

  return {
    line: lineNumber,
    ch: rawStart + 1 + insertText.length
  };
}
