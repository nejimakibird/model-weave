import {
  CORE_OBJECT_KINDS,
  RESERVED_OBJECT_KINDS
} from "../types/enums";
import type {
  AttributeModel,
  ClassRelationEdge,
  GenericFrontmatter,
  MethodModel,
  MethodParameterModel,
  ObjectKind,
  ObjectModel,
  ParseResult,
  ValidationWarning
} from "../types/models";
import { normalizeReferenceTarget } from "../core/reference-resolver";
import { detectFileType } from "../core/schema-detector";
import { parseFrontmatter } from "./frontmatter-parser";
import { parseMarkdownTable, splitMarkdownTableRow } from "./markdown-table";
import { extractMarkdownSections } from "./markdown-sections";

const ATTRIBUTE_TABLE_HEADERS = [
  "name",
  "type",
  "visibility",
  "static",
  "notes"
] as const;

const METHOD_TABLE_HEADERS = [
  "name",
  "parameters",
  "returns",
  "visibility",
  "static",
  "notes"
] as const;

const LEGACY_RELATION_TABLE_HEADERS = [
  "id",
  "from",
  "to",
  "kind",
  "label",
  "from_multiplicity",
  "to_multiplicity",
  "notes"
] as const;

const SPEC04_RELATION_TABLE_HEADERS = [
  "id",
  "to",
  "kind",
  "label",
  "from_multiplicity",
  "to_multiplicity",
  "notes"
] as const;

export function parseObjectFile(
  markdown: string,
  path: string
): ParseResult<ObjectModel> {
  const frontmatterResult = parseFrontmatter(markdown);
  const warnings = [...frontmatterResult.warnings];
  const frontmatter = frontmatterResult.file.frontmatter ?? {};
  const schema = getString(frontmatter, "schema");
  const type = getString(frontmatter, "type");
  const acceptsClassType = type === "class";

  if (
    detectFileType(frontmatter) !== "object" ||
    (!acceptsClassType && schema !== "model_object_v1")
  ) {
    warnings.push(
      createWarning(
        "unknown-schema",
        `object parser expected schema "model_object_v1" or type "class" but received schema "${schema ?? "none"}" / type "${type ?? "none"}"`,
        path,
        acceptsClassType ? "type" : "schema"
      )
    );

    return {
      file: null,
      warnings
    };
  }

  const sections = extractMarkdownSections(frontmatterResult.file.body);
  const name = getString(frontmatter, "name");
  const rawKind = getString(frontmatter, "kind") ?? (acceptsClassType ? "class" : undefined);
  const summary = joinSectionLines(sections.Summary);
  const attributes = acceptsClassType
    ? parseAttributeTable(sections.Attributes, warnings, path)
    : parseAttributes(sections.Attributes, warnings, path);
  const methods = acceptsClassType
    ? parseMethodTable(sections.Methods, warnings, path)
    : parseMethods(sections.Methods, warnings, path);
  const relations = parseRelationsTable(
    sections.Relations,
    warnings,
    path,
    getClassObjectId(frontmatter, name)
  );

  if (!name) {
    warnings.push(
      createWarning("missing-name", 'missing required field "name"', path, "name")
    );
  }

  if (!rawKind) {
    warnings.push(
      createWarning("missing-kind", 'missing required field "kind"', path, "kind")
    );
  } else if (isReservedObjectKind(rawKind)) {
    warnings.push(
      createInfoWarning(
        "reserved-kind-used",
        `reserved kind used: "${rawKind}"`,
        path,
        "kind"
      )
    );
  } else if (!isCoreObjectKind(rawKind)) {
    warnings.push(
      createWarning("invalid-kind", `invalid kind "${rawKind}"`, path, "kind")
    );
  }

  const file: ObjectModel = {
    fileType: "object",
    schema: "model_object_v1",
    path,
    title: getString(frontmatter, "title"),
    frontmatter,
    sections,
    name: name ?? getString(frontmatter, "id") ?? "unknown",
    kind: normalizeObjectKind(rawKind),
    description: summary || undefined,
    attributes,
    methods,
    relations
  };

  return {
    file,
    warnings
  };
}

function parseAttributes(
  lines: string[] | undefined,
  warnings: ValidationWarning[],
  path: string
): AttributeModel[] {
  if (!lines) {
    return [];
  }

  const attributes: AttributeModel[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const match = trimmed.match(/^-\s+([^:]+?)\s*:\s*(.+?)(?:\s+-\s+(.+))?$/);
    if (!match) {
      warnings.push(
        createWarning(
          "invalid-attribute-line",
          `malformed attribute line: "${trimmed}"`,
          path,
          "Attributes"
        )
      );
      continue;
    }

    const [, name, type, note] = match;
    attributes.push({
      name: name.trim(),
      type: type.trim(),
      description: note?.trim(),
      raw: trimmed
    });
  }

  return attributes;
}

function parseMethods(
  lines: string[] | undefined,
  warnings: ValidationWarning[],
  path: string
): MethodModel[] {
  if (!lines) {
    return [];
  }

  const methods: MethodModel[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const match = trimmed.match(
      /^-\s+([A-Za-z_][\w]*)\(([^)]*)\)\s+([^-].*?)(?:\s+-\s+(.+))?$/
    );

    if (!match) {
      warnings.push(
        createWarning(
          "invalid-method-line",
          `malformed method line: "${trimmed}"`,
          path,
          "Methods"
        )
      );
      continue;
    }

    const [, name, rawParameters, rawReturnType, note] = match;
    methods.push({
      name,
      parameters: parseMethodParameters(rawParameters),
      returnType: rawReturnType.trim(),
      description: note?.trim(),
      raw: trimmed
    });
  }

  return methods;
}

function parseMethodParameters(rawParameters: string): MethodParameterModel[] {
  const trimmed = rawParameters.trim();
  if (!trimmed) {
    return [];
  }

  return trimmed.split(",").map((parameter): MethodParameterModel => {
    const value = parameter.trim();
    const match = value.match(/^([A-Za-z_][\w]*)(\?)?\s*:\s*(.+)$/);

    if (!match) {
      return {
        name: value,
        required: true
      };
    }

    const [, name, optionalFlag, type] = match;

    return {
      name,
      type: type.trim(),
      required: optionalFlag !== "?"
    };
  });
}

function parseAttributeTable(
  lines: string[] | undefined,
  warnings: ValidationWarning[],
  path: string
): AttributeModel[] {
  const table = parseMarkdownTable(
    lines,
    [...ATTRIBUTE_TABLE_HEADERS],
    path,
    "Attributes"
  );
  warnings.push(...table.warnings);

  return table.rows.map((row) => ({
    name: getTableValue(row, "name"),
    type: optionalTableValue(row, "type"),
    visibility: normalizeVisibility(optionalTableValue(row, "visibility")),
    description: optionalTableValue(row, "notes"),
    raw: JSON.stringify(row)
  }));
}

function parseMethodTable(
  lines: string[] | undefined,
  warnings: ValidationWarning[],
  path: string
): MethodModel[] {
  const table = parseMarkdownTable(
    lines,
    [...METHOD_TABLE_HEADERS],
    path,
    "Methods"
  );
  warnings.push(...table.warnings);

  return table.rows.map((row) => ({
    name: getTableValue(row, "name"),
    parameters: parseMethodParameters(getTableValue(row, "parameters")),
    returnType: optionalTableValue(row, "returns"),
    visibility: normalizeVisibility(optionalTableValue(row, "visibility")),
    isStatic: normalizeBoolean(optionalTableValue(row, "static")),
    description: optionalTableValue(row, "notes"),
    raw: JSON.stringify(row)
  }));
}

function parseRelationsTable(
  lines: string[] | undefined,
  warnings: ValidationWarning[],
  path: string,
  currentClassId: string
): ClassRelationEdge[] {
  const relations: ClassRelationEdge[] = [];
  const table = parseClassRelationsTable(lines, path);
  warnings.push(...table.warnings);

  for (const row of table.rows) {
    const id = getTableValue(row, "id");
    const to = normalizeReferenceTarget(getTableValue(row, "to"));
    const kind = getTableValue(row, "kind");
    const from = table.format === "legacy"
      ? normalizeReferenceTarget(getTableValue(row, "from"))
      : normalizeReferenceTarget(currentClassId);

    if (!id || !from || !to || !kind) {
      warnings.push(
        createWarning(
          "invalid-table-row",
          `Relations row is missing required values: ${JSON.stringify(row)}`,
          path,
          "Relations"
        )
      );
      continue;
    }

    if (table.format === "legacy") {
      if (from === normalizeReferenceTarget(currentClassId)) {
        warnings.push(
          createInfoWarning(
            "legacy-class-relation-format",
            `Legacy class relation format with explicit "from" was accepted for relation "${id}".`,
            path,
            "Relations"
          )
        );
      } else {
        warnings.push(
          createWarning(
            "legacy-class-relation-from-mismatch",
            `Legacy class relation "from" does not match the current class id for relation "${id}".`,
            path,
            "Relations"
          )
        );
      }
    }

    relations.push({
      domain: "class",
      id,
      source: from,
      target: to,
      sourceClass: from,
      targetClass: to,
      kind,
      label: optionalTableValue(row, "label"),
      fromMultiplicity: optionalTableValue(row, "from_multiplicity"),
      toMultiplicity: optionalTableValue(row, "to_multiplicity"),
      notes: optionalTableValue(row, "notes")
    });
  }

  return relations;
}

function parseClassRelationsTable(
  lines: string[] | undefined,
  path: string
): {
  rows: Array<Record<string, string>>;
  warnings: ValidationWarning[];
  format: "spec04" | "legacy";
} {
  if (!lines) {
    return { rows: [], warnings: [], format: "spec04" };
  }

  const normalizedLines = lines
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|"));

  if (normalizedLines.length < 2) {
    return {
      rows: [],
      warnings: normalizedLines.length === 0
        ? []
        : [
            createWarning(
              "invalid-table-row",
              'table in section "Relations" is incomplete',
              path,
              "Relations"
            )
          ],
      format: "spec04"
    };
  }

    const headers = splitMarkdownTableRow(normalizedLines[0]) ?? [];
    const format = sameHeaders(headers, [...SPEC04_RELATION_TABLE_HEADERS])
      ? "spec04"
      : sameHeaders(headers, [...LEGACY_RELATION_TABLE_HEADERS])
      ? "legacy"
      : "spec04";
  const warnings: ValidationWarning[] = [];

  if (
    !sameHeaders(headers, [...SPEC04_RELATION_TABLE_HEADERS]) &&
    !sameHeaders(headers, [...LEGACY_RELATION_TABLE_HEADERS])
  ) {
    warnings.push(
      createWarning(
        "invalid-table-column",
        'table columns in section "Relations" do not match supported class relation headers',
        path,
        "Relations"
      )
    );
  }

    const rows: Array<Record<string, string>> = [];

    for (const rowLine of normalizedLines.slice(2)) {
      const values = splitMarkdownTableRow(rowLine) ?? [];
      if (values.every((value) => !value.trim())) {
        continue;
      }
      if (values.length !== headers.length) {
        warnings.push(
          createWarning(
          "invalid-table-row",
          `table row in section "Relations" has ${values.length} columns, expected ${headers.length}`,
          path,
          "Relations"
        )
      );
      continue;
    }

    const row: Record<string, string> = {};
    for (const [index, header] of headers.entries()) {
      row[header] = values[index] ?? "";
    }
    rows.push(row);
  }

    return { rows, warnings, format };
  }

function sameHeaders(actual: string[], expected: string[]): boolean {
  if (actual.length !== expected.length) {
    return false;
  }

  return actual.every((header, index) => header === expected[index]);
}

function getTableValue(row: Record<string, string>, key: string): string {
  return row[key]?.trim() ?? "";
}

function optionalTableValue(
  row: Record<string, string>,
  key: string
): string | undefined {
  const value = getTableValue(row, key);
  return value || undefined;
}

function normalizeVisibility(
  value: string | undefined
): AttributeModel["visibility"] {
  switch (value) {
    case "public":
    case "protected":
    case "private":
    case "package":
      return value;
    default:
      return undefined;
  }
}

function normalizeBoolean(value: string | undefined): boolean | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "y" || normalized === "yes") {
    return true;
  }

  if (normalized === "false" || normalized === "n" || normalized === "no") {
    return false;
  }

  return undefined;
}

function joinSectionLines(lines?: string[]): string {
  if (!lines) {
    return "";
  }

  return lines.map((line) => line.trim()).filter(Boolean).join("\n");
}

function getString(
  frontmatter: GenericFrontmatter,
  key: string
): string | undefined {
  const value = frontmatter[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeObjectKind(kind?: string): ObjectKind {
  if (kind && (isCoreObjectKind(kind) || isReservedObjectKind(kind))) {
    return kind;
  }

  return "class";
}

function getClassObjectId(frontmatter: GenericFrontmatter, name?: string): string {
  return getString(frontmatter, "id") ?? name ?? "unknown";
}

function isCoreObjectKind(kind: string): kind is ObjectKind {
  return CORE_OBJECT_KINDS.some((candidate) => candidate === kind);
}

function isReservedObjectKind(kind: string): kind is ObjectKind {
  return RESERVED_OBJECT_KINDS.some((candidate) => candidate === kind);
}

function createWarning(
  code:
    | "missing-name"
    | "missing-kind"
    | "invalid-kind"
    | "invalid-attribute-line"
    | "invalid-method-line"
    | "invalid-table-column"
    | "invalid-table-row"
    | "unknown-schema"
    | "legacy-class-relation-from-mismatch",
  message: string,
  path: string,
  field?: string
): ValidationWarning {
  return {
    code,
    message,
    severity: "warning",
    path,
    field
  };
}

function createInfoWarning(
  code: "reserved-kind-used" | "legacy-class-relation-format",
  message: string,
  path: string,
  field?: string
): ValidationWarning {
  return {
    code,
    message,
    severity: "info",
    path,
    field
  };
}
