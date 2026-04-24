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
  ClassRelationEdge,
  DataObjectModel,
  DfdObjectModel,
  ErEntity,
  ObjectModel
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
  | "class-diagram-object"
  | "class-diagram-relation-picker"
  | "class-relation-to"
  | "class-relation-kind";

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
    const request = getDataObjectFieldsRefCompletion(lines, cursor, line, index);
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

function getDataObjectFieldsRefCompletion(
  lines: string[],
  cursor: EditorPosition,
  line: string,
  index: ModelingVaultIndex | null
): CompletionRequest | null {
  if (!line.trim().startsWith("|") || !index) {
    return null;
  }

  if (getSectionNameAtLine(lines, cursor.line) !== "Fields") {
    return null;
  }

  const tableHeaderIndex = findNearestLine(lines, cursor.line, (candidate) => {
    const row = parseMarkdownTableRow(candidate);
    return (
      row !== null &&
      row.length >= 5 &&
      row[0] === "name" &&
      row[1] === "type" &&
      row[2] === "required" &&
      row[3] === "ref" &&
      row[4] === "notes"
    );
  });
  if (tableHeaderIndex < 0 || cursor.line <= tableHeaderIndex + 1) {
    return null;
  }

  if (isMarkdownTableSeparator(line)) {
    return null;
  }

  const cell = getTableCellContext(line, cursor.line, cursor.ch);
  if (!cell || cell.columnIndex !== 3) {
    return null;
  }

  const suggestions: CompletionSuggestion[] = [
    ...Object.values(index.erEntitiesById)
      .sort((left, right) => left.logicalName.localeCompare(right.logicalName))
      .map((entity) => toLinkedReferenceSuggestionForEntity(entity)),
    ...Object.values(index.objectsById)
      .sort((left, right) => getObjectId(left).localeCompare(getObjectId(right)))
      .map((object) => toLinkedReferenceSuggestionForClass(object)),
    ...Object.values(index.dataObjectsById)
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((object) => toDataObjectSuggestion(object)),
    ...Object.values(index.dfdObjectsById)
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((object) => toDfdObjectSuggestion(object))
  ];

  return {
    kind: "data-object-field-ref",
    replaceFrom: cell.replaceFrom,
    replaceTo: cell.replaceTo,
    suggestions,
    placeholder: "Complete data object field reference",
    initialQuery: normalizeCompletionQuery(
      extractLineText(line, cell.replaceFrom.ch, cell.replaceTo.ch)
    ),
    tableColumnIndex: 3
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
        request.kind === "class-diagram-object" ||
        request.kind === "class-relation-to" ||
        request.kind === "class-relation-kind"
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
