"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => ModelingToolPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian5 = require("obsidian");

// src/core/schema-detector.ts
var SCHEMA_TO_FILE_TYPE = {
  model_object_v1: "object",
  model_relations_v1: "relations",
  diagram_v1: "diagram"
};
var TYPE_TO_FILE_TYPE = {
  er_entity: "er-entity",
  er_relation: "er-relation"
};
function detectFileType(value) {
  const schema = typeof value === "string" ? value : value?.schema;
  if (!schema) {
    if (typeof value !== "string") {
      const type = typeof value?.type === "string" ? value.type.trim() : "";
      if (type && TYPE_TO_FILE_TYPE[type]) {
        return TYPE_TO_FILE_TYPE[type];
      }
    }
    return "markdown";
  }
  return SCHEMA_TO_FILE_TYPE[schema] ?? "markdown";
}

// src/parsers/frontmatter-parser.ts
function parseFrontmatter(markdown) {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const warnings = [];
  if (!normalized.startsWith("---\n")) {
    return {
      file: {
        body: normalized
      },
      warnings
    };
  }
  const lines = normalized.split("\n");
  let closingIndex = -1;
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index].trim() === "---") {
      closingIndex = index;
      break;
    }
  }
  if (closingIndex === -1) {
    warnings.push(createWarning("frontmatter parse error: missing closing delimiter"));
    return {
      file: {
        body: normalized
      },
      warnings
    };
  }
  const frontmatterLines = lines.slice(1, closingIndex);
  const body = lines.slice(closingIndex + 1).join("\n");
  const parsed = parseYamlLikeFrontmatter(frontmatterLines);
  warnings.push(...parsed.warnings);
  return {
    file: {
      frontmatter: parsed.frontmatter,
      body
    },
    warnings
  };
}
function parseYamlLikeFrontmatter(lines) {
  const warnings = [];
  const frontmatter = {};
  let activeListKey = null;
  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const listItemMatch = rawLine.match(/^\s*-\s+(.+)$/);
    if (listItemMatch) {
      if (!activeListKey) {
        warnings.push(
          createWarning(
            `frontmatter parse error: unexpected list item "${trimmed}"`
          )
        );
        continue;
      }
      const currentValue = frontmatter[activeListKey];
      if (!Array.isArray(currentValue)) {
        frontmatter[activeListKey] = [];
      }
      frontmatter[activeListKey].push(
        parseScalarValue(listItemMatch[1].trim())
      );
      continue;
    }
    activeListKey = null;
    const keyValueMatch = rawLine.match(/^\s*([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!keyValueMatch) {
      warnings.push(
        createWarning(`frontmatter parse error: malformed line "${trimmed}"`)
      );
      continue;
    }
    const [, key, rawValue] = keyValueMatch;
    const value = rawValue.trim();
    if (!value) {
      frontmatter[key] = [];
      activeListKey = key;
      continue;
    }
    frontmatter[key] = parseScalarValue(value);
  }
  return {
    frontmatter,
    warnings
  };
}
function parseScalarValue(value) {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  if (/^\[(.*)\]$/.test(value)) {
    const inner = value.slice(1, -1).trim();
    if (!inner) {
      return [];
    }
    return inner.split(",").map((entry) => stripQuotes(entry.trim()));
  }
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }
  return stripQuotes(value);
}
function stripQuotes(value) {
  if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }
  return value;
}
function createWarning(message) {
  return {
    code: "frontmatter-parse-error",
    message,
    severity: "warning"
  };
}

// src/parsers/markdown-sections.ts
var SECTION_HEADINGS = {
  "# Summary": "Summary",
  "## Overview": "Overview",
  "## Attributes": "Attributes",
  "## Methods": "Methods",
  "## Notes": "Notes",
  "## Relations": "Relations",
  "## Objects": "Objects",
  "## Columns": "Columns",
  "## Indexes": "Indexes"
};
function extractMarkdownSections(body) {
  const normalized = body.replace(/\r\n/g, "\n");
  const sections = {};
  let currentSection = null;
  for (const line of normalized.split("\n")) {
    const trimmed = line.trim();
    const nextSection = SECTION_HEADINGS[trimmed];
    if (nextSection) {
      currentSection = nextSection;
      sections[currentSection] = [];
      continue;
    }
    if (/^#{1,6}\s+/.test(trimmed)) {
      currentSection = null;
      continue;
    }
    if (currentSection) {
      sections[currentSection].push(line);
    }
  }
  return sections;
}

// src/types/enums.ts
var CORE_OBJECT_KINDS = [
  "class",
  "entity",
  "interface",
  "enum",
  "component"
];
var RESERVED_OBJECT_KINDS = [
  "actor",
  "usecase"
];
var CORE_RELATION_KINDS = [
  "association",
  "dependency",
  "composition",
  "aggregation",
  "inheritance",
  "implementation",
  "reference",
  "flow"
];
var RESERVED_RELATION_KINDS = [
  "include",
  "extend",
  "transition",
  "message"
];
var CORE_DIAGRAM_KINDS = [
  "class",
  "er",
  "flow",
  "component"
];
var RESERVED_DIAGRAM_KINDS = [
  "usecase",
  "activity",
  "sequence"
];

// src/parsers/object-parser.ts
function parseObjectFile(markdown, path) {
  const frontmatterResult = parseFrontmatter(markdown);
  const warnings = [...frontmatterResult.warnings];
  const frontmatter = frontmatterResult.file.frontmatter ?? {};
  const schema = getString(frontmatter, "schema");
  if (detectFileType(frontmatter) !== "object" || schema !== "model_object_v1") {
    warnings.push(
      createWarning2(
        "unknown-schema",
        `object parser expected schema "model_object_v1" but received "${schema ?? "none"}"`,
        path,
        "schema"
      )
    );
    return {
      file: null,
      warnings
    };
  }
  const sections = extractMarkdownSections(frontmatterResult.file.body);
  const name = getString(frontmatter, "name");
  const rawKind = getString(frontmatter, "kind");
  const summary = joinSectionLines(sections.Summary);
  const attributes = parseAttributes(sections.Attributes, warnings, path);
  const methods = parseMethods(sections.Methods, warnings, path);
  warnIfMissingSection(sections, "Summary", warnings, path);
  warnIfMissingSection(sections, "Attributes", warnings, path);
  warnIfMissingSection(sections, "Methods", warnings, path);
  warnIfMissingSection(sections, "Notes", warnings, path);
  if (!name) {
    warnings.push(
      createWarning2("missing-name", 'missing required field "name"', path, "name")
    );
  }
  if (!rawKind) {
    warnings.push(
      createWarning2("missing-kind", 'missing required field "kind"', path, "kind")
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
      createWarning2("invalid-kind", `invalid kind "${rawKind}"`, path, "kind")
    );
  }
  const file = {
    fileType: "object",
    schema: "model_object_v1",
    path,
    title: getString(frontmatter, "title"),
    frontmatter,
    sections,
    name: name ?? getString(frontmatter, "id") ?? "unknown",
    kind: normalizeObjectKind(rawKind),
    description: summary || void 0,
    attributes,
    methods
  };
  return {
    file,
    warnings
  };
}
function parseAttributes(lines, warnings, path) {
  if (!lines) {
    return [];
  }
  const attributes = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const match = trimmed.match(/^-\s+([^:]+?)\s*:\s*(.+?)(?:\s+-\s+(.+))?$/);
    if (!match) {
      warnings.push(
        createWarning2(
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
function parseMethods(lines, warnings, path) {
  if (!lines) {
    return [];
  }
  const methods = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const match = trimmed.match(
      /^-\s+([A-Za-z_][\w]*)\(([^)]*)\)\s+([^\-].*?)(?:\s+-\s+(.+))?$/
    );
    if (!match) {
      warnings.push(
        createWarning2(
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
function parseMethodParameters(rawParameters) {
  const trimmed = rawParameters.trim();
  if (!trimmed) {
    return [];
  }
  return trimmed.split(",").map((parameter) => {
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
function warnIfMissingSection(sections, sectionName, warnings, path) {
  if (sections[sectionName]) {
    return;
  }
  warnings.push(
    createInfoWarning(
      "section-missing",
      `section missing: "${sectionName}"`,
      path,
      sectionName
    )
  );
}
function joinSectionLines(lines) {
  if (!lines) {
    return "";
  }
  return lines.map((line) => line.trim()).filter(Boolean).join("\n");
}
function getString(frontmatter, key) {
  const value = frontmatter[key];
  return typeof value === "string" && value.trim() ? value.trim() : void 0;
}
function normalizeObjectKind(kind) {
  if (kind && (isCoreObjectKind(kind) || isReservedObjectKind(kind))) {
    return kind;
  }
  return "class";
}
function isCoreObjectKind(kind) {
  return CORE_OBJECT_KINDS.includes(kind);
}
function isReservedObjectKind(kind) {
  return RESERVED_OBJECT_KINDS.includes(kind);
}
function createWarning2(code, message, path, field) {
  return {
    code,
    message,
    severity: "warning",
    path,
    field
  };
}
function createInfoWarning(code, message, path, field) {
  return {
    code,
    message,
    severity: "info",
    path,
    field
  };
}

// src/parsers/relations-parser.ts
function parseRelationsFile(markdown, path) {
  const frontmatterResult = parseFrontmatter(markdown);
  const warnings = [...frontmatterResult.warnings];
  const frontmatter = frontmatterResult.file.frontmatter ?? {};
  const schema = getString2(frontmatter, "schema");
  if (detectFileType(frontmatter) !== "relations" || schema !== "model_relations_v1") {
    warnings.push(
      createWarning3(
        "unknown-schema",
        `relations parser expected schema "model_relations_v1" but received "${schema ?? "none"}"`,
        path,
        "schema"
      )
    );
    return {
      file: null,
      warnings
    };
  }
  const sections = extractMarkdownSections(frontmatterResult.file.body);
  if (!sections.Relations) {
    warnings.push(
      createInfoWarning2(
        "section-missing",
        'section missing: "Relations"',
        path,
        "Relations"
      )
    );
  }
  const relations = parseRelationsSection(sections.Relations, warnings, path);
  return {
    file: {
      fileType: "relations",
      schema: "model_relations_v1",
      path,
      title: getString2(frontmatter, "title"),
      frontmatter,
      sections,
      relations
    },
    warnings
  };
}
function parseRelationsSection(lines, warnings, path) {
  if (!lines) {
    return [];
  }
  const relations = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const record = parseRelationRecord(trimmed);
    if (!record) {
      warnings.push(
        createWarning3(
          "invalid-relation-record",
          `malformed relation record: "${trimmed}"`,
          path,
          "Relations"
        )
      );
      continue;
    }
    const missingFields = ["id", "from", "to", "kind"].filter(
      (field) => !record[field]
    );
    if (missingFields.length > 0) {
      warnings.push(
        createWarning3(
          "invalid-relation-record",
          `malformed relation record: missing ${missingFields.join(", ")}`,
          path,
          "Relations"
        )
      );
      continue;
    }
    const rawKind = record.kind;
    if (isReservedRelationKind(rawKind)) {
      warnings.push(
        createInfoWarning2(
          "reserved-relation-kind-used",
          `reserved kind used: "${rawKind}"`,
          path,
          "kind"
        )
      );
    } else if (!isCoreRelationKind(rawKind)) {
      warnings.push(
        createWarning3(
          "invalid-relation-kind",
          `invalid relation kind "${rawKind}"`,
          path,
          "kind"
        )
      );
    }
    relations.push({
      id: record.id,
      source: record.from,
      target: record.to,
      kind: normalizeRelationKind(rawKind),
      label: typeof record.label === "string" ? record.label : void 0,
      sourceCardinality: typeof record.from_multiplicity === "string" ? record.from_multiplicity : void 0,
      targetCardinality: typeof record.to_multiplicity === "string" ? record.to_multiplicity : void 0,
      metadata: {
        raw: trimmed
      }
    });
  }
  return relations;
}
function parseRelationRecord(line) {
  const bulletMatch = line.match(/^-\s+(.+)$/);
  if (!bulletMatch) {
    return null;
  }
  const record = {};
  for (const part of bulletMatch[1].split(",")) {
    const segment = part.trim();
    if (!segment) {
      continue;
    }
    const match = segment.match(/^([A-Za-z_][\w]*)\s*:\s*(.+)$/);
    if (!match) {
      return null;
    }
    const [, key, value] = match;
    record[key] = value.trim();
  }
  return record;
}
function getString2(frontmatter, key) {
  const value = frontmatter[key];
  return typeof value === "string" && value.trim() ? value.trim() : void 0;
}
function isCoreRelationKind(kind) {
  return CORE_RELATION_KINDS.includes(kind);
}
function isReservedRelationKind(kind) {
  return RESERVED_RELATION_KINDS.includes(kind);
}
function normalizeRelationKind(kind) {
  if (isCoreRelationKind(kind) || isReservedRelationKind(kind)) {
    return kind;
  }
  return "association";
}
function createWarning3(code, message, path, field) {
  return {
    code,
    message,
    severity: "warning",
    path,
    field
  };
}
function createInfoWarning2(code, message, path, field) {
  return {
    code,
    message,
    severity: "info",
    path,
    field
  };
}

// src/parsers/diagram-parser.ts
function parseDiagramFile(markdown, path) {
  const frontmatterResult = parseFrontmatter(markdown);
  const warnings = [...frontmatterResult.warnings];
  const frontmatter = frontmatterResult.file.frontmatter ?? {};
  const schema = getString3(frontmatter, "schema");
  if (detectFileType(frontmatter) !== "diagram" || schema !== "diagram_v1") {
    warnings.push(
      createWarning4(
        "unknown-schema",
        `diagram parser expected schema "diagram_v1" but received "${schema ?? "none"}"`,
        path,
        "schema"
      )
    );
    return {
      file: null,
      warnings
    };
  }
  const sections = extractMarkdownSections(frontmatterResult.file.body);
  const name = getString3(frontmatter, "name");
  const rawDiagramKind = getString3(frontmatter, "diagram_kind");
  const objectRefs = parseObjectRefs(sections.Objects, warnings, path);
  const autoRelations = normalizeAutoRelations(frontmatter.auto_relations);
  const nodes = objectRefs.map((ref) => ({
    id: ref,
    ref
  }));
  if (!name) {
    warnings.push(
      createWarning4("missing-name", 'missing required field "name"', path, "name")
    );
  }
  if (!rawDiagramKind) {
    warnings.push(
      createWarning4(
        "missing-kind",
        'missing required field "diagram_kind"',
        path,
        "diagram_kind"
      )
    );
  } else if (isReservedDiagramKind(rawDiagramKind)) {
    warnings.push(
      createInfoWarning3(
        "reserved-diagram-kind-used",
        `reserved kind used: "${rawDiagramKind}"`,
        path,
        "diagram_kind"
      )
    );
  } else if (!isCoreDiagramKind(rawDiagramKind)) {
    warnings.push(
      createWarning4(
        "invalid-diagram-kind",
        `invalid diagram kind "${rawDiagramKind}"`,
        path,
        "diagram_kind"
      )
    );
  }
  if (!sections.Objects) {
    warnings.push(
      createInfoWarning3(
        "section-missing",
        'section missing: "Objects"',
        path,
        "Objects"
      )
    );
  }
  return {
    file: {
      fileType: "diagram",
      schema: "diagram_v1",
      path,
      title: getString3(frontmatter, "title"),
      frontmatter,
      sections,
      name: name ?? getString3(frontmatter, "id") ?? "unknown",
      kind: normalizeDiagramKind(rawDiagramKind),
      objectRefs,
      autoRelations,
      nodes,
      edges: []
    },
    warnings
  };
}
function parseObjectRefs(lines, warnings, path) {
  if (!lines) {
    return [];
  }
  const objectRefs = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const match = trimmed.match(/^-\s+ref\s*:\s*(.+)$/);
    if (!match) {
      warnings.push(
        createWarning4(
          "invalid-object-ref",
          `malformed object ref: "${trimmed}"`,
          path,
          "Objects"
        )
      );
      continue;
    }
    const ref = match[1].trim();
    objectRefs.push(ref);
  }
  return objectRefs;
}
function getString3(frontmatter, key) {
  const value = frontmatter[key];
  return typeof value === "string" && value.trim() ? value.trim() : void 0;
}
function isCoreDiagramKind(kind) {
  return CORE_DIAGRAM_KINDS.includes(kind);
}
function isReservedDiagramKind(kind) {
  return RESERVED_DIAGRAM_KINDS.includes(kind);
}
function normalizeDiagramKind(kind) {
  if (kind && (isCoreDiagramKind(kind) || isReservedDiagramKind(kind))) {
    return kind;
  }
  return "class";
}
function normalizeAutoRelations(value) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return value.trim().toLowerCase() === "true";
  }
  return false;
}
function createWarning4(code, message, path, field) {
  return {
    code,
    message,
    severity: "warning",
    path,
    field
  };
}
function createInfoWarning3(code, message, path, field) {
  return {
    code,
    message,
    severity: "info",
    path,
    field
  };
}

// src/parsers/markdown-table.ts
function parseMarkdownTable(lines, expectedHeaders, path, sectionName) {
  if (!lines) {
    return { rows: [], warnings: [] };
  }
  const normalizedLines = lines.map((line) => line.trim()).filter((line) => line.startsWith("|"));
  if (normalizedLines.length < 2) {
    return {
      rows: [],
      warnings: normalizedLines.length === 0 ? [] : [
        createWarning5(
          "invalid-table-row",
          `table in section "${sectionName}" is incomplete`,
          path,
          sectionName
        )
      ]
    };
  }
  const headers = splitTableRow(normalizedLines[0]);
  const warnings = [];
  if (!sameHeaders(headers, expectedHeaders)) {
    warnings.push(
      createWarning5(
        "invalid-table-column",
        `table columns in section "${sectionName}" do not match expected headers`,
        path,
        sectionName
      )
    );
  }
  const rows = [];
  for (const rowLine of normalizedLines.slice(2)) {
    const values = splitTableRow(rowLine);
    if (values.length !== headers.length) {
      warnings.push(
        createWarning5(
          "invalid-table-row",
          `table row in section "${sectionName}" has ${values.length} columns, expected ${headers.length}`,
          path,
          sectionName
        )
      );
      continue;
    }
    const row = {};
    for (const [index, header] of headers.entries()) {
      row[header] = values[index] ?? "";
    }
    rows.push(row);
  }
  return { rows, warnings };
}
function splitTableRow(line) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}
function sameHeaders(actual, expected) {
  if (actual.length !== expected.length) {
    return false;
  }
  return actual.every((header, index) => header === expected[index]);
}
function createWarning5(code, message, path, field) {
  return {
    code,
    message,
    severity: "warning",
    path,
    field
  };
}

// src/parsers/er-entity-parser.ts
var COLUMN_HEADERS = [
  "logical_name",
  "physical_name",
  "data_type",
  "length",
  "scale",
  "not_null",
  "pk",
  "encrypted",
  "default_value",
  "notes"
];
var INDEX_HEADERS = [
  "index_name",
  "index_type",
  "unique",
  "columns",
  "notes"
];
function parseErEntityFile(markdown, path) {
  const frontmatterResult = parseFrontmatter(markdown);
  const warnings = [...frontmatterResult.warnings];
  const frontmatter = frontmatterResult.file.frontmatter ?? {};
  if (detectFileType(frontmatter) !== "er-entity") {
    warnings.push(
      createWarning6(
        "invalid-structure",
        'ER entity parser expected frontmatter type "er_entity"',
        path,
        "type"
      )
    );
    return { file: null, warnings };
  }
  const sections = extractMarkdownSections(frontmatterResult.file.body);
  const id = getRequiredString(frontmatter, "id", warnings, path);
  const logicalName = getRequiredString(frontmatter, "logical_name", warnings, path);
  const physicalName = getRequiredString(frontmatter, "physical_name", warnings, path);
  if (!sections.Columns) {
    warnings.push(createInfoWarning4("section-missing", 'section missing: "Columns"', path, "Columns"));
  }
  if (!sections.Indexes) {
    warnings.push(createInfoWarning4("section-missing", 'section missing: "Indexes"', path, "Indexes"));
  }
  const columnTable = parseMarkdownTable(sections.Columns, [...COLUMN_HEADERS], path, "Columns");
  const indexTable = parseMarkdownTable(sections.Indexes, [...INDEX_HEADERS], path, "Indexes");
  warnings.push(...columnTable.warnings, ...indexTable.warnings);
  const columns = columnTable.rows.map((row) => toErColumn(row, warnings, path));
  const indexes = indexTable.rows.map((row) => toErIndex(row));
  if (!id || !logicalName || !physicalName) {
    return { file: null, warnings };
  }
  return {
    file: {
      fileType: "er-entity",
      path,
      filePath: path,
      title: buildTitle(logicalName, physicalName),
      frontmatter,
      sections,
      id,
      logicalName,
      physicalName,
      schemaName: getOptionalString(frontmatter, "schema_name"),
      dbms: getOptionalString(frontmatter, "dbms"),
      columns,
      indexes
    },
    warnings
  };
}
function toErColumn(row, warnings, path) {
  return {
    logicalName: row.logical_name ?? "",
    physicalName: row.physical_name ?? "",
    dataType: row.data_type ?? "",
    length: parseNullableNumber(row.length, warnings, path, "length"),
    scale: parseNullableNumber(row.scale, warnings, path, "scale"),
    notNull: parseYN(row.not_null),
    pk: parseYN(row.pk),
    encrypted: parseYN(row.encrypted),
    defaultValue: toNullableString(row.default_value),
    notes: toNullableString(row.notes)
  };
}
function toErIndex(row) {
  return {
    indexName: row.index_name ?? "",
    indexType: row.index_type ?? "",
    unique: parseYN(row.unique),
    columns: row.columns ?? "",
    notes: toNullableString(row.notes)
  };
}
function parseNullableNumber(value, warnings, path, field) {
  const normalized = toNullableString(value);
  if (normalized === null) {
    return null;
  }
  const parsed = Number(normalized);
  if (Number.isFinite(parsed)) {
    return parsed;
  }
  warnings.push(
    createWarning6(
      "invalid-numeric-value",
      `failed to parse numeric value "${normalized}" for "${field}"`,
      path,
      field
    )
  );
  return null;
}
function parseYN(value) {
  return (value ?? "").trim().toUpperCase() === "Y";
}
function buildTitle(logicalName, physicalName) {
  return `${logicalName} / ${physicalName}`;
}
function getRequiredString(frontmatter, key, warnings, path) {
  const value = getOptionalString(frontmatter, key);
  if (value) {
    return value;
  }
  warnings.push(
    createWarning6(
      key === "id" ? "missing-name" : "invalid-structure",
      `missing required field "${key}"`,
      path,
      key
    )
  );
  return null;
}
function getOptionalString(frontmatter, key) {
  const value = frontmatter[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
function toNullableString(value) {
  const normalized = value?.trim() ?? "";
  return normalized ? normalized : null;
}
function createWarning6(code, message, path, field) {
  return {
    code,
    message,
    severity: "warning",
    path,
    field
  };
}
function createInfoWarning4(code, message, path, field) {
  return {
    code,
    message,
    severity: "info",
    path,
    field
  };
}

// src/parsers/er-relation-parser.ts
function parseErRelationFile(markdown, path) {
  const frontmatterResult = parseFrontmatter(markdown);
  const warnings = [...frontmatterResult.warnings];
  const frontmatter = frontmatterResult.file.frontmatter ?? {};
  if (detectFileType(frontmatter) !== "er-relation") {
    warnings.push(
      createWarning7(
        "invalid-structure",
        'ER relation parser expected frontmatter type "er_relation"',
        path,
        "type"
      )
    );
    return { file: null, warnings };
  }
  const sections = extractMarkdownSections(frontmatterResult.file.body);
  const id = getRequiredString2(frontmatter, "id", warnings, path);
  const logicalName = getRequiredString2(frontmatter, "logical_name", warnings, path);
  const physicalName = getRequiredString2(frontmatter, "physical_name", warnings, path);
  const fromEntity = getRequiredString2(frontmatter, "from_entity", warnings, path);
  const fromColumn = getRequiredString2(frontmatter, "from_column", warnings, path);
  const toEntity = getRequiredString2(frontmatter, "to_entity", warnings, path);
  const toColumn = getRequiredString2(frontmatter, "to_column", warnings, path);
  const cardinality = getRequiredString2(frontmatter, "cardinality", warnings, path);
  if (!id || !logicalName || !physicalName || !fromEntity || !fromColumn || !toEntity || !toColumn || !cardinality) {
    return { file: null, warnings };
  }
  return {
    file: {
      fileType: "er-relation",
      path,
      filePath: path,
      title: logicalName,
      frontmatter,
      sections,
      id,
      logicalName,
      physicalName,
      fromEntity,
      fromColumn,
      toEntity,
      toColumn,
      cardinality
    },
    warnings
  };
}
function getRequiredString2(frontmatter, key, warnings, path) {
  const value = frontmatter[key];
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  warnings.push(
    createWarning7("invalid-structure", `missing required field "${key}"`, path, key)
  );
  return null;
}
function createWarning7(code, message, path, field) {
  return {
    code,
    message,
    severity: "warning",
    path,
    field
  };
}

// src/core/validator.ts
var RESERVED_OBJECT_KINDS2 = /* @__PURE__ */ new Set(["actor", "usecase"]);
var RESERVED_RELATION_KINDS2 = /* @__PURE__ */ new Set([
  "include",
  "extend",
  "transition",
  "message"
]);
var RESERVED_DIAGRAM_KINDS2 = /* @__PURE__ */ new Set(["usecase", "activity", "sequence"]);
function validateVaultIndex(index) {
  const warnings = [];
  const idRegistry = /* @__PURE__ */ new Map();
  for (const [objectId, object] of Object.entries(index.objectsById)) {
    registerId(idRegistry, objectId, object.path, warnings);
    validateFilenameMatchesId(objectId, object.path, warnings);
    validateReservedObjectKind(object, objectId, warnings);
  }
  for (const [entityId, entity] of Object.entries(index.erEntitiesById)) {
    registerId(idRegistry, entityId, entity.path, warnings);
    validateFilenameMatchesId(entityId, entity.path, warnings);
  }
  for (const [fileId, relationsFile] of Object.entries(index.relationsFilesById)) {
    registerId(idRegistry, fileId, relationsFile.path, warnings);
    validateFilenameMatchesId(fileId, relationsFile.path, warnings);
    for (const relation of relationsFile.relations) {
      if (relation.id) {
        registerId(idRegistry, relation.id, relationsFile.path, warnings);
      }
      validateRelationEndpoints(relation.source, relation.target, relationsFile.path, index, warnings);
      if (RESERVED_RELATION_KINDS2.has(relation.kind)) {
        warnings.push({
          code: "reserved-relation-kind-used",
          message: `reserved kind used: "${relation.kind}"`,
          severity: "info",
          path: relationsFile.path,
          field: "kind"
        });
      }
    }
  }
  for (const [diagramId, diagram] of Object.entries(index.diagramsById)) {
    registerId(idRegistry, diagramId, diagram.path, warnings);
    validateFilenameMatchesId(diagramId, diagram.path, warnings);
    validateDiagram(diagram, index, warnings);
  }
  for (const relation of Object.values(index.erRelationsById)) {
    validateErRelationEndpoints(relation, index, warnings);
  }
  return dedupeWarnings(warnings);
}
function validateDiagram(diagram, index, warnings) {
  if (RESERVED_DIAGRAM_KINDS2.has(diagram.kind)) {
    warnings.push({
      code: "reserved-diagram-kind-used",
      message: `reserved kind used: "${diagram.kind}"`,
      severity: "info",
      path: diagram.path,
      field: "diagram_kind"
    });
  }
  for (const objectRef of diagram.objectRefs) {
    if (!index.objectsById[objectRef] && !index.erEntitiesById[objectRef]) {
      warnings.push({
        code: "unresolved-reference",
        message: `unresolved object ref "${objectRef}"`,
        severity: "warning",
        path: diagram.path,
        field: "objectRefs"
      });
    }
  }
}
function validateErRelationEndpoints(relation, index, warnings) {
  if (index.erEntitiesByPhysicalName[relation.fromEntity] && index.erEntitiesByPhysicalName[relation.toEntity]) {
    return;
  }
  warnings.push({
    code: "unresolved-reference",
    message: `unresolved ER relation endpoint: "${relation.fromEntity}" -> "${relation.toEntity}"`,
    severity: "warning",
    path: relation.path,
    field: "relations"
  });
}
function validateReservedObjectKind(object, objectId, warnings) {
  if (!RESERVED_OBJECT_KINDS2.has(object.kind)) {
    return;
  }
  warnings.push({
    code: "reserved-kind-used",
    message: `reserved kind used: "${object.kind}"`,
    severity: "info",
    path: object.path,
    field: objectId
  });
}
function validateRelationEndpoints(source, target, path, index, warnings) {
  if (!index.objectsById[source] || !index.objectsById[target]) {
    warnings.push({
      code: "unresolved-reference",
      message: `unresolved relation endpoint: "${source}" -> "${target}"`,
      severity: "warning",
      path,
      field: "relations"
    });
  }
}
function registerId(registry, id, path, warnings) {
  const existing = registry.get(id);
  if (!existing) {
    registry.set(id, path);
    return;
  }
  warnings.push({
    code: "invalid-structure",
    message: `duplicate id detected: "${id}"`,
    severity: "warning",
    path,
    field: "id"
  });
}
function validateFilenameMatchesId(id, path, warnings) {
  const baseName = path.replace(/\\/g, "/").split("/").pop()?.replace(/\.md$/i, "");
  if (!baseName || baseName === id) {
    return;
  }
  warnings.push({
    code: "invalid-structure",
    message: `filename and id mismatch: "${baseName}" != "${id}"`,
    severity: "info",
    path,
    field: "id"
  });
}
function dedupeWarnings(warnings) {
  return warnings.filter((warning, index) => {
    return warnings.findIndex(
      (entry) => entry.code === warning.code && entry.message === warning.message && entry.path === warning.path && entry.field === warning.field
    ) === index;
  });
}

// src/core/vault-index.ts
function buildVaultIndex(files) {
  const index = {
    sourceFilesByPath: {},
    objectsById: {},
    erEntitiesById: {},
    erEntitiesByPhysicalName: {},
    relationsFilesById: {},
    diagramsById: {},
    erRelationsById: {},
    modelsByFilePath: {},
    relationsById: {},
    relationsByObjectId: {},
    erRelationsByEntityPhysicalName: {},
    warningsByFilePath: {}
  };
  for (const file of files) {
    index.sourceFilesByPath[file.path] = file;
    indexSingleFile(index, file);
  }
  for (const warning of validateVaultIndex(index)) {
    pushWarning(index.warningsByFilePath, warning.path ?? "vault", warning);
  }
  return index;
}
function indexSingleFile(index, file) {
  const parseResult = parseVaultFile(file);
  for (const warning of parseResult.warnings) {
    pushWarning(index.warningsByFilePath, file.path, {
      ...warning,
      path: warning.path ?? file.path
    });
  }
  if (!parseResult.file) {
    return;
  }
  index.modelsByFilePath[file.path] = parseResult.file;
  switch (parseResult.file.fileType) {
    case "object": {
      const objectId = getModelId(parseResult.file);
      addModelById(
        index.objectsById,
        objectId,
        parseResult.file,
        index.warningsByFilePath,
        file.path
      );
      break;
    }
    case "relations": {
      const relationsFileId = getModelId(parseResult.file);
      addModelById(
        index.relationsFilesById,
        relationsFileId,
        parseResult.file,
        index.warningsByFilePath,
        file.path
      );
      for (const relation of parseResult.file.relations) {
        if (relation.id) {
          addModelById(
            index.relationsById,
            relation.id,
            relation,
            index.warningsByFilePath,
            file.path
          );
        }
        addRelationForObject(index.relationsByObjectId, relation.source, relation);
        addRelationForObject(index.relationsByObjectId, relation.target, relation);
      }
      break;
    }
    case "diagram": {
      const diagramId = getModelId(parseResult.file);
      addModelById(
        index.diagramsById,
        diagramId,
        parseResult.file,
        index.warningsByFilePath,
        file.path
      );
      break;
    }
    case "er-entity": {
      addModelById(
        index.erEntitiesById,
        parseResult.file.id,
        parseResult.file,
        index.warningsByFilePath,
        file.path
      );
      addModelById(
        index.erEntitiesByPhysicalName,
        parseResult.file.physicalName,
        parseResult.file,
        index.warningsByFilePath,
        file.path
      );
      break;
    }
    case "er-relation": {
      addModelById(
        index.erRelationsById,
        parseResult.file.id,
        parseResult.file,
        index.warningsByFilePath,
        file.path
      );
      addErRelationForEntity(
        index.erRelationsByEntityPhysicalName,
        parseResult.file.fromEntity,
        parseResult.file
      );
      addErRelationForEntity(
        index.erRelationsByEntityPhysicalName,
        parseResult.file.toEntity,
        parseResult.file
      );
      break;
    }
    case "markdown":
      break;
  }
}
function parseVaultFile(file) {
  const frontmatterResult = parseFrontmatter(file.content);
  const frontmatter = frontmatterResult.file.frontmatter;
  const fileType = detectFileType(frontmatter);
  switch (fileType) {
    case "object":
      return parseObjectFile(file.content, file.path);
    case "relations":
      return parseRelationsFile(file.content, file.path);
    case "diagram":
      return parseDiagramFile(file.content, file.path);
    case "er-entity":
      return parseErEntityFile(file.content, file.path);
    case "er-relation":
      return parseErRelationFile(file.content, file.path);
    case "markdown":
    default:
      return {
        file: createMarkdownModel(file.path, frontmatterResult.file.body, frontmatter),
        warnings: frontmatterResult.warnings
      };
  }
}
function createMarkdownModel(path, body, frontmatter) {
  return {
    fileType: "markdown",
    path,
    title: typeof frontmatter?.title === "string" ? frontmatter.title : void 0,
    frontmatter: frontmatter ?? {},
    sections: extractMarkdownSections(body),
    content: body
  };
}
function addModelById(target, id, model, warningsByFilePath, path) {
  if (!target[id]) {
    target[id] = model;
    return;
  }
  pushWarning(warningsByFilePath, path, {
    code: "invalid-structure",
    message: `duplicate id detected: "${id}"`,
    severity: "warning",
    path,
    field: "id"
  });
}
function addRelationForObject(relationsByObjectId, objectId, relation) {
  if (!relationsByObjectId[objectId]) {
    relationsByObjectId[objectId] = [];
  }
  relationsByObjectId[objectId].push(relation);
}
function addErRelationForEntity(relationsByEntityPhysicalName, physicalName, relation) {
  if (!relationsByEntityPhysicalName[physicalName]) {
    relationsByEntityPhysicalName[physicalName] = [];
  }
  relationsByEntityPhysicalName[physicalName].push(relation);
}
function getModelId(model) {
  const explicitId = model.frontmatter.id;
  if (typeof explicitId === "string" && explicitId.trim()) {
    return explicitId.trim();
  }
  if ("name" in model && typeof model.name === "string" && model.name.trim()) {
    return model.name.trim();
  }
  return getBasename(model.path);
}
function getBasename(path) {
  const slashNormalized = path.replace(/\\/g, "/");
  const rawName = slashNormalized.split("/").pop() ?? path;
  return rawName.replace(/\.md$/i, "");
}
function pushWarning(warningsByFilePath, path, warning) {
  if (!warningsByFilePath[path]) {
    warningsByFilePath[path] = [];
  }
  const exists = warningsByFilePath[path].some(
    (entry) => entry.code === warning.code && entry.message === warning.message && entry.field === warning.field
  );
  if (!exists) {
    warningsByFilePath[path].push(warning);
  }
}

// src/core/object-context-resolver.ts
function resolveObjectContext(object, index) {
  return object.fileType === "er-entity" ? resolveErEntityContext(object, index) : resolveClassLikeContext(object, index);
}
function resolveClassLikeContext(object, index) {
  const warnings = [];
  const allRelations = index.relationsByObjectId[getObjectId(object)] ?? [];
  const seen = /* @__PURE__ */ new Set();
  const relatedObjects = [];
  for (const relation of allRelations) {
    const relationKey = relation.id ?? buildRelationKey(relation);
    if (seen.has(relationKey)) {
      continue;
    }
    seen.add(relationKey);
    const outgoing = relation.source === getObjectId(object);
    const relatedObjectId = outgoing ? relation.target : relation.source;
    const relatedObject = index.objectsById[relatedObjectId];
    if (!relatedObject) {
      warnings.push({
        code: "unresolved-reference",
        message: `unresolved related object "${relatedObjectId}"`,
        severity: "warning",
        path: object.path,
        field: "relatedObjects"
      });
    }
    relatedObjects.push({
      relation,
      relatedObjectId,
      relatedObject,
      direction: outgoing ? "outgoing" : "incoming"
    });
  }
  return {
    object,
    relatedObjects,
    warnings
  };
}
function resolveErEntityContext(object, index) {
  const warnings = [];
  const allRelations = index.erRelationsByEntityPhysicalName[object.physicalName] ?? [];
  const seen = /* @__PURE__ */ new Set();
  const relatedObjects = [];
  for (const relation of allRelations) {
    const relationKey = relation.id;
    if (seen.has(relationKey)) {
      continue;
    }
    seen.add(relationKey);
    const outgoing = relation.fromEntity === object.physicalName;
    const relatedPhysicalName = outgoing ? relation.toEntity : relation.fromEntity;
    const relatedObject = index.erEntitiesByPhysicalName[relatedPhysicalName];
    const relatedObjectId = relatedObject?.id ?? relatedPhysicalName;
    if (!relatedObject) {
      warnings.push({
        code: "unresolved-reference",
        message: `unresolved related entity "${relatedPhysicalName}"`,
        severity: "warning",
        path: object.path,
        field: "relatedObjects"
      });
    }
    relatedObjects.push({
      relation,
      relatedObjectId,
      relatedObject,
      direction: outgoing ? "outgoing" : "incoming"
    });
  }
  return {
    object,
    relatedObjects,
    warnings
  };
}
function getObjectId(object) {
  const explicitId = object.frontmatter.id;
  if (typeof explicitId === "string" && explicitId.trim()) {
    return explicitId.trim();
  }
  return object.name;
}
function buildRelationKey(relation) {
  return `${relation.source}:${relation.kind}:${relation.target}:${relation.label ?? ""}`;
}

// src/core/relation-resolver.ts
function resolveDiagramRelations(diagram, index) {
  if (diagram.kind === "er") {
    return resolveErDiagramRelations(diagram, index);
  }
  const warnings = [];
  const resolvedNodes = [];
  const presentObjectIds = /* @__PURE__ */ new Set();
  for (const objectRef of diagram.objectRefs) {
    const object = index.objectsById[objectRef];
    if (!object) {
      warnings.push({
        code: "unresolved-reference",
        message: `unresolved object ref "${objectRef}"`,
        severity: "warning",
        path: diagram.path,
        field: "objectRefs"
      });
    } else {
      presentObjectIds.add(objectRef);
    }
    resolvedNodes.push({
      id: objectRef,
      ref: objectRef,
      object
    });
  }
  if (!diagram.autoRelations) {
    warnings.push({
      code: "invalid-structure",
      message: "autoRelations: false is treated as true in v1 preview",
      severity: "info",
      path: diagram.path,
      field: "autoRelations"
    });
  }
  const edges = resolveEdges(diagram, index, presentObjectIds, warnings);
  return {
    diagram,
    nodes: resolvedNodes,
    edges,
    missingObjects: diagram.objectRefs.filter((ref) => !index.objectsById[ref]),
    warnings
  };
}
function resolveErDiagramRelations(diagram, index) {
  const warnings = [];
  const resolvedNodes = [];
  const presentEntityPhysicalNames = /* @__PURE__ */ new Set();
  for (const objectRef of diagram.objectRefs) {
    const entity = index.erEntitiesById[objectRef];
    if (!entity) {
      warnings.push({
        code: "unresolved-reference",
        message: `unresolved ER entity ref "${objectRef}"`,
        severity: "warning",
        path: diagram.path,
        field: "objectRefs"
      });
    } else {
      presentEntityPhysicalNames.add(entity.physicalName);
    }
    resolvedNodes.push({
      id: objectRef,
      ref: objectRef,
      object: entity
    });
  }
  return {
    diagram,
    nodes: resolvedNodes,
    edges: resolveErEdges(diagram, index, presentEntityPhysicalNames, warnings),
    missingObjects: diagram.objectRefs.filter((ref) => !index.erEntitiesById[ref]),
    warnings
  };
}
function resolveEdges(diagram, index, presentObjectIds, warnings) {
  const edges = [];
  const seenRelationIds = /* @__PURE__ */ new Set();
  for (const objectId of presentObjectIds) {
    const relations = index.relationsByObjectId[objectId] ?? [];
    for (const relation of relations) {
      const relationKey = relation.id ?? buildRelationKey2(relation);
      if (seenRelationIds.has(relationKey)) {
        continue;
      }
      seenRelationIds.add(relationKey);
      if (!index.objectsById[relation.source] || !index.objectsById[relation.target]) {
        warnings.push({
          code: "unresolved-reference",
          message: `unresolved relation endpoint in relation "${relation.id ?? relationKey}"`,
          severity: "warning",
          path: diagram.path,
          field: "relations"
        });
        continue;
      }
      if (presentObjectIds.has(relation.source) && presentObjectIds.has(relation.target)) {
        edges.push(toDiagramEdge(relation));
      }
    }
  }
  return edges;
}
function toDiagramEdge(relation) {
  return {
    id: relation.id,
    source: relation.source,
    target: relation.target,
    kind: relation.kind,
    label: relation.label,
    metadata: {
      sourceCardinality: relation.sourceCardinality,
      targetCardinality: relation.targetCardinality
    }
  };
}
function buildRelationKey2(relation) {
  return `${relation.source}:${relation.kind}:${relation.target}:${relation.label ?? ""}`;
}
function resolveErEdges(diagram, index, presentEntityPhysicalNames, warnings) {
  const edges = [];
  const seenRelationIds = /* @__PURE__ */ new Set();
  for (const physicalName of presentEntityPhysicalNames) {
    const relations = index.erRelationsByEntityPhysicalName[physicalName] ?? [];
    for (const relation of relations) {
      if (seenRelationIds.has(relation.id)) {
        continue;
      }
      seenRelationIds.add(relation.id);
      const sourceEntity = index.erEntitiesByPhysicalName[relation.fromEntity];
      const targetEntity = index.erEntitiesByPhysicalName[relation.toEntity];
      if (!sourceEntity || !targetEntity) {
        warnings.push({
          code: "unresolved-reference",
          message: `unresolved ER relation endpoint in relation "${relation.id}"`,
          severity: "warning",
          path: diagram.path,
          field: "relations"
        });
        continue;
      }
      if (presentEntityPhysicalNames.has(sourceEntity.physicalName) && presentEntityPhysicalNames.has(targetEntity.physicalName)) {
        edges.push(toErDiagramEdge(relation, sourceEntity, targetEntity));
      }
    }
  }
  return edges;
}
function toErDiagramEdge(relation, sourceEntity, targetEntity) {
  return {
    id: relation.id,
    source: sourceEntity.id,
    target: targetEntity.id,
    kind: "association",
    label: relation.logicalName || relation.physicalName,
    metadata: {
      cardinality: relation.cardinality,
      sourceColumn: relation.fromColumn,
      targetColumn: relation.toColumn,
      logicalName: relation.logicalName,
      physicalName: relation.physicalName
    }
  };
}

// src/utils/model-navigation.ts
var import_obsidian = require("obsidian");
async function openModelObjectNote(app, index, objectId, options = {}) {
  const model = index.objectsById[objectId] ?? index.erEntitiesById[objectId];
  if (!model) {
    return {
      ok: false,
      reason: `Object "${objectId}" was not found in the current index.`
    };
  }
  const file = app.vault.getAbstractFileByPath(model.path);
  if (!(file instanceof import_obsidian.TFile)) {
    return {
      ok: false,
      reason: `Note for object "${objectId}" could not be opened.`
    };
  }
  const leaf = options.openInNewLeaf ? app.workspace.getLeaf(true) : findExistingMarkdownLeaf(app, options.sourcePath) ?? app.workspace.getMostRecentLeaf();
  if (!leaf) {
    return {
      ok: false,
      reason: `No target tab was available to open "${objectId}".`
    };
  }
  await leaf.openFile(file);
  return { ok: true };
}
function findExistingMarkdownLeaf(app, sourcePath) {
  if (!sourcePath) {
    return null;
  }
  const markdownLeaves = app.workspace.getLeavesOfType("markdown");
  for (const leaf of markdownLeaves) {
    const viewFile = leaf.view.file ?? null;
    if (viewFile?.path === sourcePath) {
      return leaf;
    }
  }
  return null;
}

// src/views/diagram-preview-view.ts
var import_obsidian2 = require("obsidian");

// src/renderers/graph-layout.ts
function buildGraphLayout(nodes, edges, options) {
  if (nodes.length === 0) {
    return {
      nodes: [],
      byId: {},
      width: options.canvasPadding * 2,
      height: options.canvasPadding * 2
    };
  }
  const nodeSizes = /* @__PURE__ */ new Map();
  const originalIndex = /* @__PURE__ */ new Map();
  for (const [index, node] of nodes.entries()) {
    nodeSizes.set(node.id, {
      width: options.getWidth(node),
      height: options.getHeight(node)
    });
    originalIndex.set(node.id, index);
  }
  const maxWidth = Math.max(...nodes.map((node) => nodeSizes.get(node.id)?.width ?? 0));
  const maxHeight = Math.max(...nodes.map((node) => nodeSizes.get(node.id)?.height ?? 0));
  const columnCount = clamp(
    deriveColumnCount(nodes.length),
    options.minColumns ?? 1,
    options.maxColumns ?? 4
  );
  const rowCount = Math.ceil(nodes.length / columnCount);
  const cellWidth = maxWidth + options.columnGap;
  const cellHeight = maxHeight + options.rowGap;
  const degrees = buildDegreeMap(nodes, edges);
  const neighborMap = buildNeighborMap(nodes, edges, originalIndex);
  const sortedNodes = [...nodes].sort((left, right) => {
    const degreeDelta = (degrees.get(right.id) ?? 0) - (degrees.get(left.id) ?? 0);
    if (degreeDelta !== 0) {
      return degreeDelta;
    }
    const barycenterDelta = getNeighborBarycenter(left.id, neighborMap) - getNeighborBarycenter(right.id, neighborMap);
    if (barycenterDelta !== 0) {
      return barycenterDelta;
    }
    return (originalIndex.get(left.id) ?? 0) - (originalIndex.get(right.id) ?? 0);
  });
  const slots = buildSlots(columnCount, rowCount);
  const slotAssignments = /* @__PURE__ */ new Map();
  for (const [index, node] of sortedNodes.entries()) {
    const slot = slots[index];
    if (slot) {
      slotAssignments.set(node.id, slot);
    }
  }
  optimizeAssignments(slotAssignments, nodes, edges, columnCount);
  const layouts = [];
  const byId = {};
  for (const node of nodes) {
    const slot = slotAssignments.get(node.id);
    if (!slot) {
      continue;
    }
    const size = nodeSizes.get(node.id) ?? { width: maxWidth, height: maxHeight };
    const x = options.canvasPadding + slot.col * cellWidth + Math.max(0, (maxWidth - size.width) / 2);
    const y = options.canvasPadding + slot.row * cellHeight + Math.max(0, (maxHeight - size.height) / 2);
    const layout = {
      node,
      x,
      y,
      width: size.width,
      height: size.height
    };
    layouts.push(layout);
    byId[node.id] = layout;
  }
  return {
    nodes: layouts,
    byId,
    width: options.canvasPadding * 2 + columnCount * maxWidth + Math.max(0, columnCount - 1) * options.columnGap,
    height: options.canvasPadding * 2 + rowCount * maxHeight + Math.max(0, rowCount - 1) * options.rowGap
  };
}
function deriveColumnCount(nodeCount) {
  if (nodeCount >= 10) {
    return 4;
  }
  if (nodeCount >= 5) {
    return 3;
  }
  if (nodeCount >= 2) {
    return 2;
  }
  return 1;
}
function buildDegreeMap(nodes, edges) {
  const degrees = /* @__PURE__ */ new Map();
  for (const node of nodes) {
    degrees.set(node.id, 0);
  }
  for (const edge of edges) {
    degrees.set(edge.source, (degrees.get(edge.source) ?? 0) + 1);
    degrees.set(edge.target, (degrees.get(edge.target) ?? 0) + 1);
  }
  return degrees;
}
function buildNeighborMap(nodes, edges, originalIndex) {
  const neighborMap = /* @__PURE__ */ new Map();
  for (const node of nodes) {
    neighborMap.set(node.id, []);
  }
  for (const edge of edges) {
    neighborMap.get(edge.source)?.push(originalIndex.get(edge.target) ?? 0);
    neighborMap.get(edge.target)?.push(originalIndex.get(edge.source) ?? 0);
  }
  return neighborMap;
}
function getNeighborBarycenter(nodeId, neighborMap) {
  const indices = neighborMap.get(nodeId) ?? [];
  if (indices.length === 0) {
    return Number.MAX_SAFE_INTEGER;
  }
  return indices.reduce((sum, value) => sum + value, 0) / indices.length;
}
function buildSlots(columnCount, rowCount) {
  const centerColumn = (columnCount - 1) / 2;
  const centerRow = (rowCount - 1) / 2;
  const slots = [];
  for (let row = 0; row < rowCount; row += 1) {
    for (let col = 0; col < columnCount; col += 1) {
      const centerDistance = Math.abs(col - centerColumn) * 1.2 + Math.abs(row - centerRow);
      slots.push({ col, row, centerDistance });
    }
  }
  return slots.sort((left, right) => {
    if (left.centerDistance !== right.centerDistance) {
      return left.centerDistance - right.centerDistance;
    }
    if (left.row !== right.row) {
      return left.row - right.row;
    }
    return left.col - right.col;
  });
}
function optimizeAssignments(assignments, nodes, edges, columnCount) {
  const orderedIds = [...nodes.map((node) => node.id)].sort((left, right) => {
    const leftSlot = assignments.get(left);
    const rightSlot = assignments.get(right);
    if (!leftSlot || !rightSlot) {
      return 0;
    }
    if (leftSlot.row !== rightSlot.row) {
      return leftSlot.row - rightSlot.row;
    }
    return leftSlot.col - rightSlot.col;
  });
  for (let pass = 0; pass < 2; pass += 1) {
    for (let index = 0; index < orderedIds.length - 1; index += 1) {
      const leftId = orderedIds[index];
      const rightId = orderedIds[index + 1];
      const leftSlot = assignments.get(leftId);
      const rightSlot = assignments.get(rightId);
      if (!leftSlot || !rightSlot) {
        continue;
      }
      const rowGap = Math.abs(leftSlot.row - rightSlot.row);
      const colGap = Math.abs(leftSlot.col - rightSlot.col);
      if (rowGap + colGap !== 1) {
        continue;
      }
      const currentCost = estimateLayoutCost(assignments, edges, columnCount);
      assignments.set(leftId, rightSlot);
      assignments.set(rightId, leftSlot);
      const swappedCost = estimateLayoutCost(assignments, edges, columnCount);
      if (swappedCost >= currentCost) {
        assignments.set(leftId, leftSlot);
        assignments.set(rightId, rightSlot);
      }
    }
  }
}
function estimateLayoutCost(assignments, edges, columnCount) {
  let cost = 0;
  for (const edge of edges) {
    const source = assignments.get(edge.source);
    const target = assignments.get(edge.target);
    if (!source || !target) {
      continue;
    }
    const dx = Math.abs(source.col - target.col);
    const dy = Math.abs(source.row - target.row);
    cost += dx * 3 + dy * 2;
    if (dx > Math.max(1, columnCount - 2)) {
      cost += 2;
    }
  }
  return cost;
}
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// src/renderers/zoom-toolbar.ts
function createZoomToolbar(helpText) {
  const toolbar = document.createElement("div");
  toolbar.style.display = "flex";
  toolbar.style.justifyContent = "space-between";
  toolbar.style.alignItems = "center";
  toolbar.style.gap = "12px";
  toolbar.style.margin = "8px 0 10px";
  const help = document.createElement("div");
  help.style.fontSize = "12px";
  help.style.color = "var(--text-muted)";
  help.textContent = helpText;
  const controls = document.createElement("div");
  controls.style.display = "flex";
  controls.style.alignItems = "center";
  controls.style.gap = "6px";
  const zoomOutButton = createToolbarButton("\u2212");
  const fitButton = createToolbarButton("Fit");
  const zoomLabel = document.createElement("span");
  zoomLabel.style.fontSize = "12px";
  zoomLabel.style.minWidth = "52px";
  zoomLabel.style.textAlign = "center";
  zoomLabel.textContent = "100%";
  const zoomInButton = createToolbarButton("+");
  const resetButton = createToolbarButton("100%");
  controls.append(
    zoomOutButton,
    fitButton,
    zoomLabel,
    zoomInButton,
    resetButton
  );
  toolbar.append(help, controls);
  return {
    root: toolbar,
    zoomOutButton,
    fitButton,
    zoomLabel,
    zoomInButton,
    resetButton
  };
}
function createToolbarButton(label) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.style.border = "1px solid var(--background-modifier-border)";
  button.style.borderRadius = "6px";
  button.style.background = "var(--background-primary)";
  button.style.padding = "2px 8px";
  button.style.cursor = "pointer";
  button.style.fontSize = "11px";
  return button;
}

// src/renderers/class-renderer.ts
var SVG_NS = "http://www.w3.org/2000/svg";
var NODE_WIDTH = 300;
var HEADER_HEIGHT = 38;
var SECTION_TITLE_HEIGHT = 24;
var ROW_HEIGHT = 20;
var NODE_PADDING = 12;
var COLUMN_GAP = 96;
var ROW_GAP = 92;
var CANVAS_PADDING = 48;
var DEFAULT_ATTRIBUTE_LIMIT = 5;
var DEFAULT_METHOD_LIMIT = 5;
var MIN_ZOOM = 0.45;
var MAX_ZOOM = 2.4;
var INITIAL_ZOOM = 1;
function renderClassDiagram(diagram, options) {
  const root = document.createElement("section");
  root.className = "mdspec-diagram mdspec-diagram--class";
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.flex = "1 1 auto";
  root.style.minHeight = "0";
  const title = document.createElement("h2");
  title.textContent = `${diagram.diagram.name} (class)`;
  title.style.flex = "0 0 auto";
  root.appendChild(title);
  const layout = createLayout(diagram.nodes, diagram.edges);
  const canvas = document.createElement("div");
  canvas.className = "mdspec-class-canvas";
  canvas.style.position = "relative";
  canvas.style.overflow = "hidden";
  canvas.style.padding = "0";
  canvas.style.border = "1px solid var(--background-modifier-border)";
  canvas.style.borderRadius = "8px";
  canvas.style.background = "var(--background-primary)";
  canvas.style.flex = "1 1 auto";
  canvas.style.minHeight = "420px";
  canvas.style.height = "auto";
  canvas.style.cursor = "grab";
  canvas.style.userSelect = "none";
  canvas.style.touchAction = "none";
  const toolbar = createZoomToolbar("Wheel: zoom / Drag background: pan");
  root.appendChild(toolbar.root);
  const viewport = document.createElement("div");
  viewport.className = "mdspec-class-viewport";
  viewport.style.position = "relative";
  viewport.style.width = "100%";
  viewport.style.height = "100%";
  viewport.style.minHeight = "0";
  viewport.style.overflow = "hidden";
  const surface = document.createElement("div");
  surface.className = "mdspec-class-surface";
  surface.style.position = "absolute";
  surface.style.left = "0";
  surface.style.top = "0";
  surface.style.width = `${layout.width}px`;
  surface.style.height = `${layout.height}px`;
  surface.style.transformOrigin = "0 0";
  surface.style.willChange = "transform";
  const svg = createSvgSurface(layout.width, layout.height);
  svg.appendChild(createMarkerDefinitions());
  for (const edge of diagram.edges) {
    const edgeGroup = renderEdge(edge, layout.byId);
    if (edgeGroup) {
      svg.appendChild(edgeGroup);
    }
  }
  surface.appendChild(svg);
  for (const box of layout.nodes) {
    surface.appendChild(createNodeBox(box, options));
  }
  viewport.appendChild(surface);
  canvas.appendChild(viewport);
  root.appendChild(canvas);
  const state = {
    zoom: INITIAL_ZOOM,
    panX: 0,
    panY: 0
  };
  let isPanning = false;
  let pointerId = null;
  let startClientX = 0;
  let startClientY = 0;
  let startPanX = 0;
  let startPanY = 0;
  const applyTransform = () => {
    surface.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
    toolbar.zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;
  };
  const fitToView = () => {
    const viewportWidth = canvas.clientWidth || layout.width;
    const viewportHeight = canvas.clientHeight || 720;
    const scaleX = viewportWidth / layout.width;
    const scaleY = viewportHeight / layout.height;
    const nextZoom = clamp2(Math.min(scaleX, scaleY), MIN_ZOOM, MAX_ZOOM);
    state.zoom = nextZoom;
    state.panX = Math.max(0, (viewportWidth - layout.width * nextZoom) / 2);
    state.panY = Math.max(0, (viewportHeight - layout.height * nextZoom) / 2);
    applyTransform();
  };
  const zoomAtPoint = (nextZoom, clientX, clientY) => {
    const clampedZoom = clamp2(nextZoom, MIN_ZOOM, MAX_ZOOM);
    const rect = canvas.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    const worldX = (localX - state.panX) / state.zoom;
    const worldY = (localY - state.panY) / state.zoom;
    state.zoom = clampedZoom;
    state.panX = localX - worldX * clampedZoom;
    state.panY = localY - worldY * clampedZoom;
    applyTransform();
  };
  canvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const delta = event.deltaY < 0 ? 1.12 : 1 / 1.12;
      zoomAtPoint(state.zoom * delta, event.clientX, event.clientY);
    },
    { passive: false }
  );
  canvas.addEventListener("pointerdown", (event) => {
    const target = event.target;
    if (target?.closest(".mdspec-class-node")) {
      return;
    }
    isPanning = true;
    pointerId = event.pointerId;
    startClientX = event.clientX;
    startClientY = event.clientY;
    startPanX = state.panX;
    startPanY = state.panY;
    canvas.style.cursor = "grabbing";
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!isPanning || pointerId !== event.pointerId) {
      return;
    }
    const dx = event.clientX - startClientX;
    const dy = event.clientY - startClientY;
    state.panX = startPanX + dx;
    state.panY = startPanY + dy;
    applyTransform();
  });
  const stopPanning = (event) => {
    if (!isPanning || pointerId !== event.pointerId) {
      return;
    }
    isPanning = false;
    pointerId = null;
    canvas.style.cursor = "grab";
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  };
  canvas.addEventListener("pointerup", stopPanning);
  canvas.addEventListener("pointercancel", stopPanning);
  canvas.addEventListener("pointerleave", (event) => {
    if (isPanning && pointerId === event.pointerId) {
      stopPanning(event);
    }
  });
  toolbar.zoomOutButton.addEventListener("click", () => {
    state.zoom = clamp2(state.zoom / 1.12, MIN_ZOOM, MAX_ZOOM);
    applyTransform();
  });
  toolbar.zoomInButton.addEventListener("click", () => {
    state.zoom = clamp2(state.zoom * 1.12, MIN_ZOOM, MAX_ZOOM);
    applyTransform();
  });
  toolbar.fitButton.addEventListener("click", () => fitToView());
  toolbar.resetButton.addEventListener("click", () => {
    state.zoom = INITIAL_ZOOM;
    state.panX = 0;
    state.panY = 0;
    applyTransform();
  });
  requestAnimationFrame(() => {
    fitToView();
    applyTransform();
  });
  const resizeObserver = new ResizeObserver(() => {
    fitToView();
  });
  resizeObserver.observe(canvas);
  root.appendChild(createConnectionsTable(diagram));
  return root;
}
function createLayout(nodes, edges) {
  return buildGraphLayout(nodes, edges, {
    getWidth: () => NODE_WIDTH,
    getHeight: (node) => measureNodeHeight(node.object),
    canvasPadding: CANVAS_PADDING,
    columnGap: COLUMN_GAP,
    rowGap: ROW_GAP,
    maxColumns: 4
  });
}
function measureNodeHeight(object) {
  if (!object || object.fileType !== "object") {
    return HEADER_HEIGHT + NODE_PADDING * 2 + ROW_HEIGHT;
  }
  const attributeRows = Math.max(getVisibleAttributes(object).length, 1);
  const methodRows = Math.max(getVisibleMethods(object).length, 1);
  return HEADER_HEIGHT + SECTION_TITLE_HEIGHT + attributeRows * ROW_HEIGHT + SECTION_TITLE_HEIGHT + methodRows * ROW_HEIGHT + NODE_PADDING * 2;
}
function createSvgSurface(width, height) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.style.position = "absolute";
  svg.style.inset = "0";
  svg.style.pointerEvents = "none";
  svg.style.overflow = "visible";
  return svg;
}
function createMarkerDefinitions() {
  const defs = document.createElementNS(SVG_NS, "defs");
  defs.appendChild(
    createTriangleMarker("mdspec-arrow-solid", "var(--text-muted)", "var(--text-muted)")
  );
  defs.appendChild(createTriangleMarker("mdspec-arrow-open", "none", "var(--text-muted)"));
  defs.appendChild(
    createDiamondMarker("mdspec-diamond-open", "none", "var(--text-muted)")
  );
  defs.appendChild(
    createDiamondMarker(
      "mdspec-diamond-solid",
      "var(--text-muted)",
      "var(--text-muted)"
    )
  );
  return defs;
}
function createTriangleMarker(id, fill, stroke) {
  const marker = document.createElementNS(SVG_NS, "marker");
  marker.setAttribute("id", id);
  marker.setAttribute("markerWidth", "12");
  marker.setAttribute("markerHeight", "12");
  marker.setAttribute("refX", "10");
  marker.setAttribute("refY", "6");
  marker.setAttribute("orient", "auto");
  marker.setAttribute("markerUnits", "strokeWidth");
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", "M 0 0 L 10 6 L 0 12 z");
  path.setAttribute("fill", fill);
  path.setAttribute("stroke", stroke);
  path.setAttribute("stroke-width", "1.2");
  marker.appendChild(path);
  return marker;
}
function createDiamondMarker(id, fill, stroke) {
  const marker = document.createElementNS(SVG_NS, "marker");
  marker.setAttribute("id", id);
  marker.setAttribute("markerWidth", "14");
  marker.setAttribute("markerHeight", "14");
  marker.setAttribute("refX", "12");
  marker.setAttribute("refY", "7");
  marker.setAttribute("orient", "auto");
  marker.setAttribute("markerUnits", "strokeWidth");
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", "M 0 7 L 4 0 L 12 7 L 4 14 z");
  path.setAttribute("fill", fill);
  path.setAttribute("stroke", stroke);
  path.setAttribute("stroke-width", "1.2");
  marker.appendChild(path);
  return marker;
}
function renderEdge(edge, layoutById) {
  const source = layoutById[edge.source];
  const target = layoutById[edge.target];
  if (!source || !target) {
    return null;
  }
  const group = document.createElementNS(SVG_NS, "g");
  const { startX, startY, endX, endY, midX, midY } = getConnectionPoints(
    source,
    target
  );
  const line = document.createElementNS(SVG_NS, "line");
  line.setAttribute("x1", String(startX));
  line.setAttribute("y1", String(startY));
  line.setAttribute("x2", String(endX));
  line.setAttribute("y2", String(endY));
  line.setAttribute("stroke", "var(--text-muted)");
  line.setAttribute("stroke-width", "2");
  line.setAttribute("stroke-dasharray", getDashPattern(edge.kind));
  const markers = getMarkerAttributes(edge.kind);
  if (markers.start) {
    line.setAttribute("marker-start", markers.start);
  }
  if (markers.end) {
    line.setAttribute("marker-end", markers.end);
  }
  group.appendChild(line);
  const edgeLabel = getMinimalEdgeLabel(edge);
  if (edgeLabel) {
    group.appendChild(createEdgeBadge(midX, midY - 8, edgeLabel));
  }
  return group;
}
function getMinimalEdgeLabel(edge) {
  switch (edge.kind) {
    case "inheritance":
      return "inheritance";
    case "implementation":
      return "implementation";
    case "dependency":
      return "dependency";
    case "composition":
      return "composition";
    case "aggregation":
      return "aggregation";
    case "association":
      return "association";
    default:
      return edge.kind ?? null;
  }
}
function createEdgeBadge(x, y, value) {
  const group = document.createElementNS(SVG_NS, "g");
  const width = Math.max(52, value.length * 8 + 12);
  const height = 20;
  const rect = document.createElementNS(SVG_NS, "rect");
  rect.setAttribute("x", String(x - width / 2));
  rect.setAttribute("y", String(y - height / 2));
  rect.setAttribute("width", String(width));
  rect.setAttribute("height", String(height));
  rect.setAttribute("rx", "10");
  rect.setAttribute("fill", "var(--background-primary)");
  rect.setAttribute("stroke", "var(--background-modifier-border)");
  group.appendChild(rect);
  const text = document.createElementNS(SVG_NS, "text");
  text.setAttribute("x", String(x));
  text.setAttribute("y", String(y + 4));
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("font-size", "11px");
  text.setAttribute("font-weight", "600");
  text.setAttribute("fill", "var(--text-normal)");
  text.textContent = value;
  group.appendChild(text);
  return group;
}
function getConnectionPoints(source, target) {
  const sourceCenterX = source.x + source.width / 2;
  const sourceCenterY = source.y + source.height / 2;
  const targetCenterX = target.x + target.width / 2;
  const targetCenterY = target.y + target.height / 2;
  const horizontal = Math.abs(targetCenterX - sourceCenterX) >= Math.abs(targetCenterY - sourceCenterY);
  const startX = horizontal ? sourceCenterX < targetCenterX ? source.x + source.width : source.x : sourceCenterX;
  const startY = horizontal ? sourceCenterY : sourceCenterY < targetCenterY ? source.y + source.height : source.y;
  const endX = horizontal ? sourceCenterX < targetCenterX ? target.x : target.x + target.width : targetCenterX;
  const endY = horizontal ? targetCenterY : sourceCenterY < targetCenterY ? target.y : target.y + target.height;
  return {
    startX,
    startY,
    endX,
    endY,
    midX: (startX + endX) / 2,
    midY: (startY + endY) / 2
  };
}
function getDashPattern(kind) {
  switch (kind) {
    case "dependency":
    case "implementation":
      return "8 6";
    default:
      return "0";
  }
}
function getMarkerAttributes(kind) {
  switch (kind) {
    case "inheritance":
      return { end: "url(#mdspec-arrow-open)" };
    case "implementation":
      return { end: "url(#mdspec-arrow-open)" };
    case "dependency":
      return { end: "url(#mdspec-arrow-solid)" };
    case "aggregation":
      return { start: "url(#mdspec-diamond-open)" };
    case "composition":
      return { start: "url(#mdspec-diamond-solid)" };
    case "association":
    case "reference":
    case "flow":
    default:
      return { end: "url(#mdspec-arrow-solid)" };
  }
}
function createNodeBox(layout, options) {
  const box = document.createElement("article");
  box.className = "mdspec-class-node";
  box.style.position = "absolute";
  box.style.left = `${layout.x}px`;
  box.style.top = `${layout.y}px`;
  box.style.width = `${layout.width}px`;
  box.style.minHeight = `${layout.height}px`;
  box.style.boxSizing = "border-box";
  box.style.border = "1px solid var(--background-modifier-border)";
  box.style.borderRadius = "8px";
  box.style.background = "var(--background-primary-alt)";
  box.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.08)";
  box.style.overflow = "hidden";
  box.style.cursor = layout.node.object ? "pointer" : "default";
  if (!layout.node.object) {
    box.appendChild(createFallbackNode(layout.node.ref ?? layout.node.id));
    return box;
  }
  if (options?.onOpenObject) {
    box.setAttribute("role", "button");
    box.setAttribute("tabindex", "0");
    box.title = `Open ${layout.node.object.fileType === "object" ? layout.node.object.name : layout.node.object.logicalName}`;
    box.addEventListener("click", (event) => {
      if (event.defaultPrevented) {
        return;
      }
      options.onOpenObject?.(layout.node.id, {
        openInNewLeaf: event.ctrlKey || event.metaKey
      });
    });
    box.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        options.onOpenObject?.(layout.node.id, { openInNewLeaf: false });
      }
    });
  }
  const object = layout.node.object;
  if (object.fileType !== "object") {
    box.appendChild(createFallbackNode(object.logicalName));
    return box;
  }
  const header = document.createElement("header");
  header.style.padding = "10px 12px";
  header.style.borderBottom = "1px solid var(--background-modifier-border)";
  header.style.background = getHeaderBackground(object.kind);
  const kind = document.createElement("div");
  kind.style.fontSize = "11px";
  kind.style.textTransform = "uppercase";
  kind.style.letterSpacing = "0.08em";
  kind.style.color = "var(--text-muted)";
  kind.textContent = object.kind;
  const title = document.createElement("div");
  title.style.fontWeight = "700";
  title.style.fontSize = "16px";
  title.style.lineHeight = "1.3";
  title.textContent = object.name;
  header.append(kind, title);
  box.appendChild(header);
  box.appendChild(createNodeSection("Attributes", getVisibleAttributes(object)));
  box.appendChild(createNodeSection("Methods", getVisibleMethods(object)));
  return box;
}
function getVisibleAttributes(object) {
  const visible = object.attributes.slice(0, DEFAULT_ATTRIBUTE_LIMIT).map((attribute) => {
    const detail = attribute.type ? `: ${attribute.type}` : "";
    return `${attribute.name}${detail}`;
  });
  if (object.attributes.length > DEFAULT_ATTRIBUTE_LIMIT) {
    visible.push("...");
  }
  return visible;
}
function getVisibleMethods(object) {
  const visible = object.methods.slice(0, DEFAULT_METHOD_LIMIT).map((method) => {
    const parameters = method.parameters.map(
      (parameter) => `${parameter.name}${parameter.type ? `: ${parameter.type}` : ""}`
    ).join(", ");
    const returnType = method.returnType ? ` ${method.returnType}` : "";
    return `${method.name}(${parameters})${returnType}`;
  });
  if (object.methods.length > DEFAULT_METHOD_LIMIT) {
    visible.push("...");
  }
  return visible;
}
function createNodeSection(title, items) {
  const section = document.createElement("section");
  section.style.padding = "8px 12px 10px";
  section.style.borderTop = "1px solid var(--background-modifier-border)";
  const heading = document.createElement("div");
  heading.style.fontSize = "11px";
  heading.style.fontWeight = "600";
  heading.style.textTransform = "uppercase";
  heading.style.letterSpacing = "0.06em";
  heading.style.color = "var(--text-muted)";
  heading.style.marginBottom = "6px";
  heading.textContent = title;
  section.appendChild(heading);
  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.style.fontSize = "12px";
    empty.style.color = "var(--text-faint)";
    empty.textContent = "None";
    section.appendChild(empty);
    return section;
  }
  const list = document.createElement("ul");
  list.style.margin = "0";
  list.style.paddingLeft = "18px";
  list.style.fontSize = "12px";
  list.style.lineHeight = "1.45";
  for (const item of items) {
    const entry = document.createElement("li");
    entry.textContent = item;
    list.appendChild(entry);
  }
  section.appendChild(list);
  return section;
}
function getHeaderBackground(kind) {
  switch (kind) {
    case "interface":
      return "color-mix(in srgb, var(--color-cyan) 12%, var(--background-primary-alt))";
    case "enum":
      return "color-mix(in srgb, var(--color-orange) 12%, var(--background-primary-alt))";
    case "component":
      return "color-mix(in srgb, var(--color-green) 12%, var(--background-primary-alt))";
    case "entity":
      return "color-mix(in srgb, var(--color-blue) 10%, var(--background-primary-alt))";
    case "class":
    default:
      return "color-mix(in srgb, var(--color-purple) 8%, var(--background-primary-alt))";
  }
}
function createConnectionsTable(diagram) {
  const section = document.createElement("details");
  section.className = "mdspec-section";
  section.style.marginTop = "10px";
  section.style.flex = "0 0 auto";
  section.open = false;
  const summary = document.createElement("summary");
  summary.textContent = `Resolved relations (${diagram.edges.length})`;
  summary.style.cursor = "pointer";
  summary.style.fontWeight = "600";
  summary.style.padding = "4px 0";
  section.appendChild(summary);
  if (diagram.edges.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No relations resolved.";
    empty.style.margin = "8px 0 0";
    section.appendChild(empty);
    return section;
  }
  const list = document.createElement("ul");
  list.style.listStyle = "none";
  list.style.margin = "8px 0 0";
  list.style.padding = "0";
  list.style.maxWidth = "720px";
  for (const edge of diagram.edges) {
    const relationName = edge.label ?? "";
    const relationType = edge.kind ?? "";
    const details = buildEdgeDetails(edge);
    const item = document.createElement("li");
    item.style.padding = "6px 8px";
    item.style.border = "1px solid var(--background-modifier-border-hover)";
    item.style.borderRadius = "8px";
    item.style.marginBottom = "6px";
    item.style.background = "var(--background-primary-alt)";
    item.style.fontSize = "12px";
    item.style.lineHeight = "1.45";
    item.textContent = `${edge.source} -> ${edge.target} / ${relationType || "-"} / ${relationName || "-"}${details ? ` / ${details}` : ""}`;
    list.appendChild(item);
  }
  section.appendChild(list);
  return section;
}
function buildEdgeDetails(edge) {
  const parts = [];
  if (typeof edge.metadata?.sourceCardinality === "string") {
    parts.push(`from: ${edge.metadata.sourceCardinality}`);
  }
  if (typeof edge.metadata?.targetCardinality === "string") {
    parts.push(`to: ${edge.metadata.targetCardinality}`);
  }
  return parts.join(" / ");
}
function createFallbackNode(id) {
  const box = document.createElement("div");
  box.className = "mdspec-fallback";
  box.style.padding = "16px";
  box.textContent = `Unresolved object: ${id}`;
  return box;
}
function clamp2(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// src/renderers/component-renderer.ts
function renderComponentDiagram(diagram) {
  const root = document.createElement("section");
  root.className = "mdspec-diagram mdspec-diagram--component";
  const title = document.createElement("h2");
  title.textContent = `${diagram.diagram.name} (component)`;
  root.appendChild(title);
  const grid = document.createElement("div");
  grid.className = "mdspec-component-grid";
  for (const node of diagram.nodes) {
    const box = document.createElement("article");
    box.className = "mdspec-component";
    const heading = document.createElement("h3");
    heading.textContent = getNodeLabel(node);
    box.appendChild(heading);
    const description = document.createElement("p");
    description.textContent = getNodeDescription(node);
    box.appendChild(description);
    grid.appendChild(box);
  }
  if (grid.childElementCount === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No components resolved.";
    root.appendChild(empty);
  } else {
    root.appendChild(grid);
  }
  return root;
}
function getNodeLabel(node) {
  if (!node.object) {
    return node.ref ?? node.id;
  }
  return node.object.fileType === "er-entity" ? node.object.logicalName : node.object.name;
}
function getNodeDescription(node) {
  if (!node.object) {
    return "No component description available.";
  }
  return node.object.fileType === "er-entity" ? node.object.physicalName : node.object.description ?? "No component description available.";
}

// src/renderers/er-renderer.ts
var SVG_NS2 = "http://www.w3.org/2000/svg";
var NODE_WIDTH2 = 280;
var HEADER_HEIGHT2 = 40;
var SECTION_TITLE_HEIGHT2 = 24;
var ROW_HEIGHT2 = 20;
var NODE_PADDING2 = 12;
var COLUMN_GAP2 = 96;
var ROW_GAP2 = 92;
var CANVAS_PADDING2 = 48;
var DEFAULT_COLUMN_LIMIT = 5;
var MIN_ZOOM2 = 0.45;
var MAX_ZOOM2 = 2.4;
var INITIAL_ZOOM2 = 1;
function renderErDiagram(diagram, options) {
  const root = document.createElement("section");
  root.className = "mdspec-diagram mdspec-diagram--er";
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.flex = "1 1 auto";
  root.style.minHeight = "0";
  const title = document.createElement("h2");
  title.textContent = `${diagram.diagram.name} (ER)`;
  title.style.flex = "0 0 auto";
  root.appendChild(title);
  const layout = createLayout2(diagram.nodes, diagram.edges);
  const canvas = document.createElement("div");
  canvas.className = "mdspec-er-canvas";
  canvas.style.position = "relative";
  canvas.style.overflow = "hidden";
  canvas.style.padding = "0";
  canvas.style.border = "1px solid var(--background-modifier-border)";
  canvas.style.borderRadius = "8px";
  canvas.style.background = "var(--background-primary)";
  canvas.style.flex = "1 1 auto";
  canvas.style.minHeight = "420px";
  canvas.style.height = "auto";
  canvas.style.cursor = "grab";
  canvas.style.userSelect = "none";
  canvas.style.touchAction = "none";
  const toolbar = createZoomToolbar("Wheel: zoom / Drag background: pan");
  root.appendChild(toolbar.root);
  const viewport = document.createElement("div");
  viewport.className = "mdspec-er-viewport";
  viewport.style.position = "relative";
  viewport.style.width = "100%";
  viewport.style.height = "100%";
  viewport.style.minHeight = "0";
  viewport.style.overflow = "hidden";
  const surface = document.createElement("div");
  surface.className = "mdspec-er-surface";
  surface.style.position = "absolute";
  surface.style.left = "0";
  surface.style.top = "0";
  surface.style.width = `${layout.width}px`;
  surface.style.height = `${layout.height}px`;
  surface.style.transformOrigin = "0 0";
  surface.style.willChange = "transform";
  const svg = createSvgSurface2(layout.width, layout.height);
  svg.appendChild(createMarkerDefinitions2());
  for (const edge of diagram.edges) {
    const edgeGroup = renderEdge2(edge, layout.byId);
    if (edgeGroup) {
      svg.appendChild(edgeGroup);
    }
  }
  surface.appendChild(svg);
  for (const box of layout.nodes) {
    surface.appendChild(createEntityBox(box, options));
  }
  viewport.appendChild(surface);
  canvas.appendChild(viewport);
  root.appendChild(canvas);
  const state = {
    zoom: INITIAL_ZOOM2,
    panX: 0,
    panY: 0
  };
  let isPanning = false;
  let pointerId = null;
  let startClientX = 0;
  let startClientY = 0;
  let startPanX = 0;
  let startPanY = 0;
  const applyTransform = () => {
    surface.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
    toolbar.zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;
  };
  const fitToView = () => {
    const viewportWidth = canvas.clientWidth || layout.width;
    const viewportHeight = canvas.clientHeight || 720;
    const scaleX = viewportWidth / layout.width;
    const scaleY = viewportHeight / layout.height;
    const nextZoom = clamp3(Math.min(scaleX, scaleY), MIN_ZOOM2, MAX_ZOOM2);
    state.zoom = nextZoom;
    state.panX = Math.max(0, (viewportWidth - layout.width * nextZoom) / 2);
    state.panY = Math.max(0, (viewportHeight - layout.height * nextZoom) / 2);
    applyTransform();
  };
  const zoomAtPoint = (nextZoom, clientX, clientY) => {
    const clampedZoom = clamp3(nextZoom, MIN_ZOOM2, MAX_ZOOM2);
    const rect = canvas.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    const worldX = (localX - state.panX) / state.zoom;
    const worldY = (localY - state.panY) / state.zoom;
    state.zoom = clampedZoom;
    state.panX = localX - worldX * clampedZoom;
    state.panY = localY - worldY * clampedZoom;
    applyTransform();
  };
  canvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const delta = event.deltaY < 0 ? 1.12 : 1 / 1.12;
      zoomAtPoint(state.zoom * delta, event.clientX, event.clientY);
    },
    { passive: false }
  );
  canvas.addEventListener("pointerdown", (event) => {
    const target = event.target;
    if (target?.closest(".mdspec-er-node")) {
      return;
    }
    isPanning = true;
    pointerId = event.pointerId;
    startClientX = event.clientX;
    startClientY = event.clientY;
    startPanX = state.panX;
    startPanY = state.panY;
    canvas.style.cursor = "grabbing";
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!isPanning || pointerId !== event.pointerId) {
      return;
    }
    const dx = event.clientX - startClientX;
    const dy = event.clientY - startClientY;
    state.panX = startPanX + dx;
    state.panY = startPanY + dy;
    applyTransform();
  });
  const stopPanning = (event) => {
    if (!isPanning || pointerId !== event.pointerId) {
      return;
    }
    isPanning = false;
    pointerId = null;
    canvas.style.cursor = "grab";
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  };
  canvas.addEventListener("pointerup", stopPanning);
  canvas.addEventListener("pointercancel", stopPanning);
  canvas.addEventListener("pointerleave", (event) => {
    if (isPanning && pointerId === event.pointerId) {
      stopPanning(event);
    }
  });
  toolbar.zoomOutButton.addEventListener("click", () => {
    state.zoom = clamp3(state.zoom / 1.12, MIN_ZOOM2, MAX_ZOOM2);
    applyTransform();
  });
  toolbar.zoomInButton.addEventListener("click", () => {
    state.zoom = clamp3(state.zoom * 1.12, MIN_ZOOM2, MAX_ZOOM2);
    applyTransform();
  });
  toolbar.fitButton.addEventListener("click", () => fitToView());
  toolbar.resetButton.addEventListener("click", () => {
    state.zoom = INITIAL_ZOOM2;
    state.panX = 0;
    state.panY = 0;
    applyTransform();
  });
  requestAnimationFrame(() => {
    fitToView();
    applyTransform();
  });
  const resizeObserver = new ResizeObserver(() => {
    fitToView();
  });
  resizeObserver.observe(canvas);
  root.appendChild(createRelationTable(diagram));
  return root;
}
function createLayout2(nodes, edges) {
  return buildGraphLayout(nodes, edges, {
    getWidth: () => NODE_WIDTH2,
    getHeight: (node) => measureNodeHeight2(node.object),
    canvasPadding: CANVAS_PADDING2,
    columnGap: COLUMN_GAP2,
    rowGap: ROW_GAP2,
    maxColumns: 4
  });
}
function measureNodeHeight2(object) {
  if (!object) {
    return HEADER_HEIGHT2 + NODE_PADDING2 * 2 + ROW_HEIGHT2;
  }
  const attributeRows = object.fileType === "er-entity" ? Math.max(getVisibleColumns(object.columns).length, 1) : Math.max(object.attributes.length, 1);
  return HEADER_HEIGHT2 + SECTION_TITLE_HEIGHT2 + attributeRows * ROW_HEIGHT2 + NODE_PADDING2 * 2 + 16;
}
function createSvgSurface2(width, height) {
  const svg = document.createElementNS(SVG_NS2, "svg");
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.style.position = "absolute";
  svg.style.inset = "0";
  svg.style.pointerEvents = "none";
  svg.style.overflow = "visible";
  return svg;
}
function createMarkerDefinitions2() {
  const defs = document.createElementNS(SVG_NS2, "defs");
  defs.appendChild(
    createTriangleMarker2("mdspec-er-arrow", "var(--text-muted)", "var(--text-muted)")
  );
  defs.appendChild(
    createDiamondMarker2("mdspec-er-diamond-open", "none", "var(--text-muted)")
  );
  defs.appendChild(
    createDiamondMarker2(
      "mdspec-er-diamond-solid",
      "var(--text-muted)",
      "var(--text-muted)"
    )
  );
  return defs;
}
function createTriangleMarker2(id, fill, stroke) {
  const marker = document.createElementNS(SVG_NS2, "marker");
  marker.setAttribute("id", id);
  marker.setAttribute("markerWidth", "12");
  marker.setAttribute("markerHeight", "12");
  marker.setAttribute("refX", "10");
  marker.setAttribute("refY", "6");
  marker.setAttribute("orient", "auto");
  marker.setAttribute("markerUnits", "strokeWidth");
  const path = document.createElementNS(SVG_NS2, "path");
  path.setAttribute("d", "M 0 0 L 10 6 L 0 12 z");
  path.setAttribute("fill", fill);
  path.setAttribute("stroke", stroke);
  path.setAttribute("stroke-width", "1.2");
  marker.appendChild(path);
  return marker;
}
function createDiamondMarker2(id, fill, stroke) {
  const marker = document.createElementNS(SVG_NS2, "marker");
  marker.setAttribute("id", id);
  marker.setAttribute("markerWidth", "14");
  marker.setAttribute("markerHeight", "14");
  marker.setAttribute("refX", "12");
  marker.setAttribute("refY", "7");
  marker.setAttribute("orient", "auto");
  marker.setAttribute("markerUnits", "strokeWidth");
  const path = document.createElementNS(SVG_NS2, "path");
  path.setAttribute("d", "M 0 7 L 4 0 L 12 7 L 4 14 z");
  path.setAttribute("fill", fill);
  path.setAttribute("stroke", stroke);
  path.setAttribute("stroke-width", "1.2");
  marker.appendChild(path);
  return marker;
}
function renderEdge2(edge, layoutById) {
  const source = layoutById[edge.source];
  const target = layoutById[edge.target];
  if (!source || !target) {
    return null;
  }
  const group = document.createElementNS(SVG_NS2, "g");
  const { startX, startY, endX, endY, midX, midY } = getConnectionPoints2(
    source,
    target
  );
  const line = document.createElementNS(SVG_NS2, "line");
  line.setAttribute("x1", String(startX));
  line.setAttribute("y1", String(startY));
  line.setAttribute("x2", String(endX));
  line.setAttribute("y2", String(endY));
  line.setAttribute("stroke", "var(--text-muted)");
  line.setAttribute("stroke-width", "2");
  line.setAttribute("stroke-dasharray", getDashPattern2(edge.kind));
  const markers = getMarkerAttributes2(edge.kind);
  if (markers.start) {
    line.setAttribute("marker-start", markers.start);
  }
  if (markers.end) {
    line.setAttribute("marker-end", markers.end);
  }
  group.appendChild(line);
  const cardinality = typeof edge.metadata?.cardinality === "string" ? edge.metadata.cardinality : null;
  if (cardinality) {
    group.appendChild(createEdgeBadge2(midX, midY - 8, cardinality));
  }
  return group;
}
function createEdgeBadge2(x, y, value) {
  const group = document.createElementNS(SVG_NS2, "g");
  const width = Math.max(34, value.length * 8 + 12);
  const height = 20;
  const rect = document.createElementNS(SVG_NS2, "rect");
  rect.setAttribute("x", String(x - width / 2));
  rect.setAttribute("y", String(y - height / 2));
  rect.setAttribute("width", String(width));
  rect.setAttribute("height", String(height));
  rect.setAttribute("rx", "10");
  rect.setAttribute("fill", "var(--background-primary)");
  rect.setAttribute("stroke", "var(--background-modifier-border)");
  group.appendChild(rect);
  const text = document.createElementNS(SVG_NS2, "text");
  text.setAttribute("x", String(x));
  text.setAttribute("y", String(y + 4));
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("font-size", "11px");
  text.setAttribute("font-weight", "600");
  text.setAttribute("fill", "var(--text-normal)");
  text.textContent = value;
  group.appendChild(text);
  return group;
}
function getConnectionPoints2(source, target) {
  const sourceCenterX = source.x + source.width / 2;
  const sourceCenterY = source.y + source.height / 2;
  const targetCenterX = target.x + target.width / 2;
  const targetCenterY = target.y + target.height / 2;
  const horizontal = Math.abs(targetCenterX - sourceCenterX) >= Math.abs(targetCenterY - sourceCenterY);
  const startX = horizontal ? sourceCenterX < targetCenterX ? source.x + source.width : source.x : sourceCenterX;
  const startY = horizontal ? sourceCenterY : sourceCenterY < targetCenterY ? source.y + source.height : source.y;
  const endX = horizontal ? sourceCenterX < targetCenterX ? target.x : target.x + target.width : targetCenterX;
  const endY = horizontal ? targetCenterY : sourceCenterY < targetCenterY ? target.y : target.y + target.height;
  return {
    startX,
    startY,
    endX,
    endY,
    midX: (startX + endX) / 2,
    midY: (startY + endY) / 2
  };
}
function getDashPattern2(kind) {
  switch (kind) {
    case "dependency":
    case "implementation":
      return "8 6";
    default:
      return "0";
  }
}
function getMarkerAttributes2(kind) {
  switch (kind) {
    case "composition":
      return { start: "url(#mdspec-er-diamond-solid)" };
    case "aggregation":
      return { start: "url(#mdspec-er-diamond-open)" };
    case "association":
    case "reference":
    case "flow":
    case "dependency":
    case "implementation":
    case "inheritance":
    default:
      return { end: "url(#mdspec-er-arrow)" };
  }
}
function createEntityBox(layout, options) {
  const box = document.createElement("article");
  box.className = "mdspec-er-node";
  box.style.position = "absolute";
  box.style.left = `${layout.x}px`;
  box.style.top = `${layout.y}px`;
  box.style.width = `${layout.width}px`;
  box.style.minHeight = `${layout.height}px`;
  box.style.boxSizing = "border-box";
  box.style.border = "1px solid var(--background-modifier-border)";
  box.style.borderRadius = "8px";
  box.style.background = "var(--background-primary-alt)";
  box.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.08)";
  box.style.overflow = "hidden";
  box.style.cursor = layout.node.object ? "pointer" : "default";
  if (!layout.node.object) {
    box.appendChild(createFallbackNode2(layout.node.ref ?? layout.node.id));
    return box;
  }
  if (options?.onOpenObject) {
    box.setAttribute("role", "button");
    box.setAttribute("tabindex", "0");
    box.title = `Open ${layout.node.object.fileType === "er-entity" ? layout.node.object.logicalName : layout.node.object.name}`;
    box.addEventListener("click", (event) => {
      if (event.defaultPrevented) {
        return;
      }
      options.onOpenObject?.(layout.node.id, {
        openInNewLeaf: event.ctrlKey || event.metaKey
      });
    });
    box.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        options.onOpenObject?.(layout.node.id, { openInNewLeaf: false });
      }
    });
  }
  const object = layout.node.object;
  const header = document.createElement("header");
  header.style.padding = "10px 12px";
  header.style.borderBottom = "1px solid var(--background-modifier-border)";
  header.style.background = "color-mix(in srgb, var(--color-blue) 10%, var(--background-primary-alt))";
  const kind = document.createElement("div");
  kind.style.fontSize = "11px";
  kind.style.textTransform = "uppercase";
  kind.style.letterSpacing = "0.08em";
  kind.style.color = "var(--text-muted)";
  kind.textContent = object.fileType === "er-entity" ? "er_entity" : "entity";
  const title = document.createElement("div");
  title.style.fontWeight = "700";
  title.style.fontSize = "16px";
  title.style.lineHeight = "1.3";
  title.textContent = object.fileType === "er-entity" ? object.logicalName : object.name;
  header.append(kind, title);
  box.appendChild(header);
  if (object.fileType === "er-entity") {
    const physical = document.createElement("div");
    physical.style.padding = "8px 12px 0";
    physical.style.fontFamily = "var(--font-monospace)";
    physical.style.fontSize = "12px";
    physical.style.color = "var(--text-muted)";
    physical.textContent = object.physicalName;
    box.appendChild(physical);
    box.appendChild(createAttributeSection(getVisibleColumns(object.columns)));
    return box;
  }
  box.appendChild(
    createAttributeSection(
      object.attributes.map((attribute) => {
        const detail = attribute.type ? `: ${attribute.type}` : "";
        return `${attribute.name}${detail}`;
      })
    )
  );
  return box;
}
function createAttributeSection(items) {
  const section = document.createElement("section");
  section.style.padding = "8px 12px 10px";
  section.style.borderTop = "1px solid var(--background-modifier-border)";
  const heading = document.createElement("div");
  heading.style.fontSize = "11px";
  heading.style.fontWeight = "600";
  heading.style.textTransform = "uppercase";
  heading.style.letterSpacing = "0.06em";
  heading.style.color = "var(--text-muted)";
  heading.style.marginBottom = "6px";
  heading.textContent = "Columns";
  section.appendChild(heading);
  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.style.fontSize = "12px";
    empty.style.color = "var(--text-faint)";
    empty.textContent = "None";
    section.appendChild(empty);
    return section;
  }
  const list = document.createElement("ul");
  list.style.margin = "0";
  list.style.paddingLeft = "18px";
  list.style.fontSize = "12px";
  list.style.lineHeight = "1.45";
  for (const item of items) {
    const entry = document.createElement("li");
    entry.textContent = item;
    list.appendChild(entry);
  }
  section.appendChild(list);
  return section;
}
function getVisibleColumns(columns) {
  const prioritized = [...columns].sort((left, right) => {
    const leftScore = getColumnPriority(left);
    const rightScore = getColumnPriority(right);
    if (leftScore !== rightScore) {
      return rightScore - leftScore;
    }
    return columns.indexOf(left) - columns.indexOf(right);
  });
  const visible = prioritized.slice(0, DEFAULT_COLUMN_LIMIT).map((column) => {
    const parts = [`${column.logicalName} / ${column.physicalName}`, `: ${column.dataType}`];
    if (column.pk) {
      parts.push(" [PK]");
    }
    return parts.join("");
  });
  if (columns.length > DEFAULT_COLUMN_LIMIT) {
    visible.push("...");
  }
  return visible;
}
function getColumnPriority(column) {
  if (column.pk) {
    return 3;
  }
  const name = `${column.logicalName} ${column.physicalName}`.toLowerCase();
  if (name.includes("id") || name.includes("_cd") || name.includes("code")) {
    return 2;
  }
  return 1;
}
function createRelationTable(diagram) {
  const section = document.createElement("details");
  section.className = "mdspec-section";
  section.style.marginTop = "10px";
  section.style.flex = "0 0 auto";
  section.open = false;
  const summary = document.createElement("summary");
  summary.textContent = `Resolved relations (${diagram.edges.length})`;
  summary.style.cursor = "pointer";
  summary.style.fontWeight = "600";
  summary.style.padding = "4px 0";
  section.appendChild(summary);
  if (diagram.edges.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No relations resolved.";
    empty.style.margin = "8px 0 0";
    section.appendChild(empty);
    return section;
  }
  const list = document.createElement("ul");
  list.style.listStyle = "none";
  list.style.margin = "8px 0 0";
  list.style.padding = "0";
  list.style.maxWidth = "720px";
  for (const edge of diagram.edges) {
    const relationName = typeof edge.metadata?.logicalName === "string" ? edge.metadata.logicalName : typeof edge.metadata?.physicalName === "string" ? edge.metadata.physicalName : edge.label ?? "";
    const cardinality = typeof edge.metadata?.cardinality === "string" ? edge.metadata.cardinality : "";
    const columns = typeof edge.metadata?.sourceColumn === "string" && typeof edge.metadata?.targetColumn === "string" ? `${edge.metadata.sourceColumn} -> ${edge.metadata.targetColumn}` : "";
    const item = document.createElement("li");
    item.style.padding = "6px 8px";
    item.style.border = "1px solid var(--background-modifier-border-hover)";
    item.style.borderRadius = "8px";
    item.style.marginBottom = "6px";
    item.style.background = "var(--background-primary-alt)";
    item.style.fontSize = "12px";
    item.style.lineHeight = "1.45";
    item.textContent = `${edge.source} -> ${edge.target} / ${relationName || "-"} / ${cardinality || "-"} / ${columns || "-"}`;
    list.appendChild(item);
  }
  section.appendChild(list);
  return section;
}
function createFallbackNode2(id) {
  const box = document.createElement("div");
  box.className = "mdspec-fallback";
  box.style.padding = "16px";
  box.textContent = `Unresolved entity: ${id}`;
  return box;
}
function clamp3(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// src/renderers/flow-renderer.ts
function renderFlowDiagram(diagram) {
  const root = document.createElement("section");
  root.className = "mdspec-diagram mdspec-diagram--flow";
  const title = document.createElement("h2");
  title.textContent = `${diagram.diagram.name} (flow)`;
  root.appendChild(title);
  const list = document.createElement("ol");
  list.className = "mdspec-flow";
  for (const node of diagram.nodes) {
    const item = document.createElement("li");
    item.textContent = getNodeLabel2(node);
    list.appendChild(item);
  }
  if (list.childElementCount === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No objects referenced.";
    root.appendChild(empty);
  } else {
    root.appendChild(list);
  }
  if (diagram.edges.length > 0) {
    const relations = document.createElement("ul");
    for (const edge of diagram.edges) {
      const item = document.createElement("li");
      item.textContent = `${edge.source} -> ${edge.target}${edge.label ? ` (${edge.label})` : ""}`;
      relations.appendChild(item);
    }
    root.appendChild(relations);
  }
  return root;
}
function getNodeLabel2(node) {
  if (!node.object) {
    return node.ref ?? node.id;
  }
  return node.object.fileType === "er-entity" ? node.object.logicalName : node.object.name;
}

// src/renderers/diagram-renderer.ts
function renderDiagramModel(diagram, options) {
  switch (diagram.diagram.kind) {
    case "class":
      return renderClassDiagram(diagram, options);
    case "er":
      return renderErDiagram(diagram, options);
    case "flow":
      return renderFlowDiagram(diagram);
    case "component":
      return renderComponentDiagram(diagram);
    default:
      return createReservedKindFallback(diagram.diagram.kind);
  }
}
function createReservedKindFallback(kind) {
  const root = document.createElement("section");
  root.className = "mdspec-fallback";
  const title = document.createElement("h2");
  title.textContent = "Diagram preview is not available";
  const message = document.createElement("p");
  message.textContent = `Reserved diagram kind "${kind}" is not rendered in v1.`;
  root.append(title, message);
  return root;
}

// src/views/diagram-preview-view.ts
var DIAGRAM_PREVIEW_VIEW_TYPE = "mdspec-diagram-preview";
var DiagramPreviewView = class extends import_obsidian2.ItemView {
  constructor(leaf) {
    super(leaf);
    this.diagram = null;
    this.warnings = [];
    this.onOpenObject = null;
  }
  getViewType() {
    return DIAGRAM_PREVIEW_VIEW_TYPE;
  }
  getDisplayText() {
    return "Diagram Preview";
  }
  async onOpen() {
    this.render();
  }
  async onClose() {
    this.contentEl.empty();
  }
  setPreview(diagram, onOpenObject = null, warnings = []) {
    this.diagram = diagram;
    this.onOpenObject = onOpenObject;
    this.warnings = warnings;
    this.render();
  }
  render() {
    this.contentEl.empty();
    this.contentEl.style.display = "flex";
    this.contentEl.style.flexDirection = "column";
    this.contentEl.style.height = "100%";
    this.contentEl.style.minHeight = "0";
    this.contentEl.style.overflow = "hidden";
    this.contentEl.style.paddingBottom = "12px";
    renderWarningBar(this.contentEl, this.warnings);
    if (!this.diagram) {
      this.contentEl.createEl("p", { text: "No diagram model available for preview." });
      return;
    }
    this.contentEl.appendChild(
      renderDiagramModel(this.diagram, {
        onOpenObject: this.onOpenObject ?? void 0
      })
    );
  }
};
function renderWarningBar(container, warnings) {
  if (warnings.length === 0) {
    return;
  }
  const bar = container.createDiv({ cls: "mdspec-warning-bar" });
  bar.createEl("strong", { text: `Warnings (${warnings.length})` });
  const list = bar.createEl("ul");
  for (const warning of warnings) {
    list.createEl("li", { text: warning.message });
  }
}

// src/views/object-preview-view.ts
var import_obsidian3 = require("obsidian");

// src/renderers/object-renderer.ts
function renderObjectModel(model, context) {
  const root = document.createElement("section");
  root.className = "mdspec-object-focus";
  root.style.flex = "0 0 auto";
  const title = document.createElement("h2");
  title.textContent = getPrimaryTitle(model);
  title.style.margin = "0 0 6px 0";
  title.style.fontSize = "18px";
  root.appendChild(title);
  const meta = document.createElement("div");
  meta.style.display = "grid";
  meta.style.gridTemplateColumns = "96px 1fr";
  meta.style.gap = "4px 10px";
  meta.style.padding = "8px 10px";
  meta.style.border = "1px solid var(--background-modifier-border)";
  meta.style.borderRadius = "8px";
  meta.style.background = "var(--background-primary-alt)";
  meta.style.fontSize = "12px";
  if (model.fileType === "er-entity") {
    appendMeta(meta, "Logical Name", model.logicalName);
    appendMeta(meta, "Physical Name", model.physicalName);
    appendMeta(meta, "Type", "er_entity");
    appendMeta(meta, "Schema Name", model.schemaName ?? "-");
    appendMeta(meta, "DBMS", model.dbms ?? "-");
    appendMeta(meta, "Related Count", String(context?.relatedObjects.length ?? 0));
  } else {
    appendMeta(meta, "Name", model.name);
    appendMeta(meta, "Type", "class");
    appendMeta(meta, "Kind", model.kind);
    appendMeta(meta, "Related Count", String(context?.relatedObjects.length ?? 0));
  }
  root.appendChild(meta);
  return root;
}
function getPrimaryTitle(model) {
  return model.fileType === "er-entity" ? model.logicalName : model.name;
}
function appendMeta(container, label, value) {
  const key = document.createElement("div");
  key.textContent = label;
  key.style.fontWeight = "600";
  key.style.color = "var(--text-muted)";
  key.style.lineHeight = "1.3";
  const val = document.createElement("div");
  val.textContent = value;
  val.style.lineHeight = "1.3";
  container.append(key, val);
}

// src/renderers/object-context-renderer.ts
var MINI_GRAPH_MIN_HEIGHT = 360;
var MINI_GRAPH_MAX_ENTRIES = 8;
var MIN_SCALE = 0.5;
var MAX_SCALE = 2.5;
var ZOOM_STEP = 0.15;
var VIEWPORT_PADDING = 28;
var BASE_CENTER_X = 280;
var BASE_CENTER_Y = 200;
var BASE_ORBIT_X = 190;
var BASE_ORBIT_Y = 138;
var CENTER_CARD_WIDTH = 168;
var RELATED_CARD_WIDTH = 144;
function renderObjectContext(context, options) {
  const root = document.createElement("section");
  root.className = "mdspec-object-context";
  root.style.marginTop = "10px";
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.flex = "1 1 auto";
  root.style.minHeight = "0";
  const titleRow = document.createElement("div");
  titleRow.style.display = "flex";
  titleRow.style.alignItems = "center";
  titleRow.style.justifyContent = "space-between";
  titleRow.style.gap = "8px";
  const title = document.createElement("h3");
  title.textContent = "Related Objects";
  title.style.margin = "0";
  titleRow.appendChild(title);
  const count = document.createElement("span");
  count.textContent = `${context.relatedObjects.length} linked`;
  count.style.fontSize = "11px";
  count.style.color = "var(--text-muted)";
  titleRow.appendChild(count);
  root.appendChild(titleRow);
  if (context.relatedObjects.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No related objects found.";
    empty.style.marginTop = "10px";
    root.appendChild(empty);
    return root;
  }
  root.appendChild(createMiniGraph(context, options));
  root.appendChild(createRelatedList(context, options));
  return root;
}
function createMiniGraph(context, options) {
  const wrapper = document.createElement("section");
  wrapper.className = "mdspec-related-graph";
  wrapper.style.marginTop = "10px";
  wrapper.style.border = "1px solid var(--background-modifier-border)";
  wrapper.style.borderRadius = "10px";
  wrapper.style.background = "var(--background-primary-alt)";
  wrapper.style.display = "flex";
  wrapper.style.flexDirection = "column";
  wrapper.style.flex = "1 1 auto";
  wrapper.style.minHeight = `${MINI_GRAPH_MIN_HEIGHT}px`;
  wrapper.style.overflow = "hidden";
  const toolbar = createZoomToolbar("Wheel: zoom / Drag background: pan");
  toolbar.root.style.padding = "8px 10px";
  toolbar.root.style.margin = "0";
  toolbar.root.style.borderBottom = "1px solid var(--background-modifier-border)";
  wrapper.appendChild(toolbar.root);
  const viewport = document.createElement("div");
  viewport.style.position = "relative";
  viewport.style.flex = "1 1 auto";
  viewport.style.minHeight = `${MINI_GRAPH_MIN_HEIGHT}px`;
  viewport.style.overflow = "auto";
  viewport.style.cursor = "grab";
  viewport.style.padding = "0";
  viewport.style.background = "radial-gradient(circle at center, color-mix(in srgb, var(--background-primary) 92%, transparent), var(--background-primary-alt))";
  wrapper.appendChild(viewport);
  const scene = document.createElement("div");
  scene.style.position = "relative";
  scene.style.transformOrigin = "top left";
  viewport.appendChild(scene);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.style.position = "absolute";
  svg.style.inset = "0";
  svg.style.pointerEvents = "none";
  scene.appendChild(svg);
  const centerCard = createFocusNode(context.object, true, options);
  centerCard.style.position = "absolute";
  centerCard.style.width = `${CENTER_CARD_WIDTH}px`;
  scene.appendChild(centerCard);
  const relatedCards = [];
  const entries = context.relatedObjects.slice(0, MINI_GRAPH_MAX_ENTRIES);
  for (const entry of entries) {
    const card = createRelatedNode(entry, options);
    card.style.position = "absolute";
    card.style.width = `${RELATED_CARD_WIDTH}px`;
    scene.appendChild(card);
    relatedCards.push({ entry, card });
  }
  let scale = 1;
  let isPanning = false;
  let panPointerId = null;
  let startX = 0;
  let startY = 0;
  let startScrollLeft = 0;
  let startScrollTop = 0;
  const applyScale = (nextScale, anchor) => {
    const clamped = clamp4(nextScale, MIN_SCALE, MAX_SCALE);
    if (Math.abs(clamped - scale) < 1e-3) {
      updateZoomLabel(toolbar.zoomLabel, scale);
      return;
    }
    const previousScale = scale;
    const fallbackAnchor = {
      x: viewport.clientWidth / 2,
      y: viewport.clientHeight / 2
    };
    const effectiveAnchor = anchor ?? fallbackAnchor;
    const contentX = (viewport.scrollLeft + effectiveAnchor.x) / previousScale;
    const contentY = (viewport.scrollTop + effectiveAnchor.y) / previousScale;
    scale = clamped;
    scene.style.width = `${GRAPH_BASE_WIDTH * scale}px`;
    scene.style.height = `${GRAPH_BASE_HEIGHT * scale}px`;
    layoutCards(centerCard, relatedCards, scale);
    renderMiniGraphConnections(scene, svg, centerCard, relatedCards, context.object);
    viewport.scrollLeft = contentX * scale - effectiveAnchor.x;
    viewport.scrollTop = contentY * scale - effectiveAnchor.y;
    updateZoomLabel(toolbar.zoomLabel, scale);
  };
  const fitToView = () => {
    layoutCards(centerCard, relatedCards, 1);
    const bounds = measureGraphBounds(scene, [centerCard, ...relatedCards.map(({ card }) => card)]);
    const availableWidth = Math.max(viewport.clientWidth - VIEWPORT_PADDING * 2, 120);
    const availableHeight = Math.max(viewport.clientHeight - VIEWPORT_PADDING * 2, 120);
    const fitScale = clamp4(
      Math.min(availableWidth / bounds.width, availableHeight / bounds.height, 1.4),
      MIN_SCALE,
      MAX_SCALE
    );
    scale = fitScale;
    scene.style.width = `${GRAPH_BASE_WIDTH * scale}px`;
    scene.style.height = `${GRAPH_BASE_HEIGHT * scale}px`;
    layoutCards(centerCard, relatedCards, scale);
    renderMiniGraphConnections(scene, svg, centerCard, relatedCards, context.object);
    const scaledBounds = measureGraphBounds(scene, [centerCard, ...relatedCards.map(({ card }) => card)]);
    viewport.scrollLeft = Math.max(
      0,
      scaledBounds.left + scaledBounds.width / 2 - viewport.clientWidth / 2
    );
    viewport.scrollTop = Math.max(
      0,
      scaledBounds.top + scaledBounds.height / 2 - viewport.clientHeight / 2
    );
    updateZoomLabel(toolbar.zoomLabel, scale);
  };
  toolbar.zoomOutButton.addEventListener("click", () => {
    applyScale(scale - ZOOM_STEP);
  });
  toolbar.zoomInButton.addEventListener("click", () => {
    applyScale(scale + ZOOM_STEP);
  });
  toolbar.fitButton.addEventListener("click", () => {
    fitToView();
  });
  toolbar.resetButton.addEventListener("click", () => {
    applyScale(1);
  });
  viewport.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const rect = viewport.getBoundingClientRect();
      const anchor = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
      const nextScale = scale + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP);
      applyScale(nextScale, anchor);
    },
    { passive: false }
  );
  viewport.addEventListener("pointerdown", (event) => {
    const target = event.target;
    if (!target || !(target === viewport || target === scene || target === svg)) {
      return;
    }
    isPanning = true;
    panPointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    startScrollLeft = viewport.scrollLeft;
    startScrollTop = viewport.scrollTop;
    viewport.style.cursor = "grabbing";
    viewport.setPointerCapture(event.pointerId);
  });
  viewport.addEventListener("pointermove", (event) => {
    if (!isPanning || panPointerId !== event.pointerId) {
      return;
    }
    viewport.scrollLeft = startScrollLeft - (event.clientX - startX);
    viewport.scrollTop = startScrollTop - (event.clientY - startY);
  });
  const stopPanning = (event) => {
    if (!isPanning || panPointerId !== event.pointerId) {
      return;
    }
    isPanning = false;
    panPointerId = null;
    viewport.style.cursor = "grab";
    if (viewport.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId);
    }
  };
  viewport.addEventListener("pointerup", stopPanning);
  viewport.addEventListener("pointercancel", stopPanning);
  const resizeObserver = new ResizeObserver(() => {
    renderMiniGraphConnections(scene, svg, centerCard, relatedCards, context.object);
  });
  resizeObserver.observe(viewport);
  resizeObserver.observe(scene);
  resizeObserver.observe(centerCard);
  relatedCards.forEach(({ card }) => {
    resizeObserver.observe(card);
  });
  queueMicrotask(() => {
    fitToView();
  });
  return wrapper;
}
function layoutCards(centerCard, relatedCards, scale) {
  centerCard.style.left = `${(BASE_CENTER_X - CENTER_CARD_WIDTH / 2) * scale}px`;
  centerCard.style.top = `${(BASE_CENTER_Y - 44) * scale}px`;
  centerCard.style.width = `${CENTER_CARD_WIDTH * scale}px`;
  relatedCards.forEach(({ card }, index) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / Math.max(relatedCards.length, 1);
    const x = BASE_CENTER_X + Math.cos(angle) * BASE_ORBIT_X;
    const y = BASE_CENTER_Y + Math.sin(angle) * BASE_ORBIT_Y;
    card.style.left = `${(x - RELATED_CARD_WIDTH / 2) * scale}px`;
    card.style.top = `${(y - 38) * scale}px`;
    card.style.width = `${RELATED_CARD_WIDTH * scale}px`;
  });
}
function renderMiniGraphConnections(scene, svg, centerCard, relatedCards, object) {
  if (!scene.isConnected) {
    return;
  }
  const width = scene.clientWidth;
  const height = scene.clientHeight;
  if (width === 0 || height === 0) {
    return;
  }
  svg.replaceChildren();
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const centerLayout = getNodeLayout(centerCard);
  for (const { entry, card } of relatedCards) {
    const relatedLayout = getNodeLayout(card);
    svg.appendChild(createConnectionLine(centerLayout, relatedLayout, object, entry));
  }
}
function getNodeLayout(card) {
  return {
    card,
    centerX: card.offsetLeft + card.offsetWidth / 2,
    centerY: card.offsetTop + card.offsetHeight / 2,
    width: card.offsetWidth
  };
}
function createConnectionLine(centerLayout, relatedLayout, object, entry) {
  const start = getConnectionPoint(centerLayout, relatedLayout);
  const end = getConnectionPoint(relatedLayout, centerLayout);
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", String(start.x));
  line.setAttribute("y1", String(start.y));
  line.setAttribute("x2", String(end.x));
  line.setAttribute("y2", String(end.y));
  line.setAttribute("stroke", "var(--background-modifier-border)");
  line.setAttribute("stroke-width", "2");
  group.appendChild(line);
  const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
  label.setAttribute("x", String((start.x + end.x) / 2));
  label.setAttribute("y", String((start.y + end.y) / 2 - 6));
  label.setAttribute("text-anchor", "middle");
  label.setAttribute("font-size", "10");
  label.setAttribute("fill", "var(--text-muted)");
  label.textContent = object.fileType === "er-entity" ? getErRelationCardinality(entry.relation) : getClassRelationType(entry.relation);
  group.appendChild(label);
  return group;
}
function getConnectionPoint(from, to) {
  const deltaX = to.centerX - from.centerX;
  const deltaY = to.centerY - from.centerY;
  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    return {
      x: from.centerX + Math.sign(deltaX || 1) * from.width * 0.48,
      y: from.centerY
    };
  }
  return {
    x: from.centerX,
    y: from.centerY + Math.sign(deltaY || 1) * from.card.offsetHeight * 0.48
  };
}
function measureGraphBounds(scene, cards) {
  if (cards.length === 0) {
    return {
      left: 0,
      top: 0,
      width: scene.clientWidth,
      height: scene.clientHeight
    };
  }
  let left = Number.POSITIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  for (const card of cards) {
    left = Math.min(left, card.offsetLeft);
    top = Math.min(top, card.offsetTop);
    right = Math.max(right, card.offsetLeft + card.offsetWidth);
    bottom = Math.max(bottom, card.offsetTop + card.offsetHeight);
  }
  return {
    left,
    top,
    width: right - left,
    height: bottom - top
  };
}
function updateZoomLabel(label, scale) {
  label.textContent = `${Math.round(scale * 100)}%`;
}
function createFocusNode(object, isCenter, options) {
  const card = document.createElement("article");
  card.style.border = "1px solid var(--background-modifier-border)";
  card.style.borderRadius = "8px";
  card.style.padding = "10px 12px";
  card.style.background = isCenter ? "color-mix(in srgb, var(--interactive-accent) 12%, var(--background-primary))" : "var(--background-primary)";
  card.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.08)";
  const type = document.createElement("div");
  type.style.fontSize = "10px";
  type.style.textTransform = "uppercase";
  type.style.letterSpacing = "0.08em";
  type.style.color = "var(--text-muted)";
  type.textContent = object.fileType === "er-entity" ? "er_entity" : object.kind;
  const title = document.createElement("div");
  title.style.fontWeight = "700";
  title.style.marginTop = "4px";
  title.style.fontSize = "14px";
  title.textContent = object.fileType === "er-entity" ? object.logicalName : object.name;
  const subtitle = document.createElement("div");
  subtitle.style.fontSize = "12px";
  subtitle.style.color = "var(--text-muted)";
  subtitle.style.marginTop = "4px";
  subtitle.textContent = object.fileType === "er-entity" ? object.physicalName : object.kind;
  card.append(type, title, subtitle);
  if (options?.onOpenObject) {
    const objectId = object.fileType === "er-entity" ? object.id : getObjectId2(object);
    wireClickable(card, objectId, options);
  }
  return card;
}
function createRelatedNode(entry, options) {
  const card = document.createElement("article");
  card.style.border = "1px solid var(--background-modifier-border)";
  card.style.borderRadius = "8px";
  card.style.padding = "8px 10px";
  card.style.background = "var(--background-primary)";
  card.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.06)";
  const object = entry.relatedObject;
  const title = document.createElement("div");
  title.style.fontWeight = "700";
  title.style.fontSize = "13px";
  title.textContent = object ? object.fileType === "er-entity" ? object.logicalName : object.name : entry.relatedObjectId;
  const subtitle = document.createElement("div");
  subtitle.style.fontSize = "11px";
  subtitle.style.color = "var(--text-muted)";
  subtitle.style.marginTop = "2px";
  subtitle.textContent = buildCardSubtitle(entry);
  const preview = document.createElement("div");
  preview.style.fontSize = "11px";
  preview.style.marginTop = "6px";
  preview.style.color = "var(--text-muted)";
  preview.textContent = buildCardPreview(entry);
  card.append(title, subtitle, preview);
  if (options?.onOpenObject) {
    wireClickable(card, entry.relatedObjectId, options);
  }
  return card;
}
function createRelatedList(context, options) {
  const details = document.createElement("details");
  details.className = "mdspec-related-list";
  details.style.marginTop = "10px";
  const summary = document.createElement("summary");
  summary.textContent = `Connections (${context.relatedObjects.length})`;
  summary.style.cursor = "pointer";
  summary.style.fontWeight = "600";
  summary.style.padding = "6px 2px";
  details.appendChild(summary);
  const tableWrap = document.createElement("div");
  tableWrap.style.marginTop = "8px";
  tableWrap.style.maxHeight = "180px";
  tableWrap.style.overflow = "auto";
  const table = document.createElement("table");
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";
  const headers = context.object.fileType === "er-entity" ? ["Related Entity", "Relation", "Cardinality", "Columns"] : ["Related Class", "Relation", "Type", "Details"];
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  for (const header of headers) {
    const cell = document.createElement("th");
    cell.textContent = header;
    cell.style.textAlign = "left";
    cell.style.padding = "6px 8px";
    cell.style.borderBottom = "1px solid var(--background-modifier-border)";
    headRow.appendChild(cell);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);
  const tbody = document.createElement("tbody");
  for (const entry of context.relatedObjects) {
    const row = document.createElement("tr");
    const values = context.object.fileType === "er-entity" ? buildErListRow(entry) : buildClassListRow(entry);
    values.forEach((value, index) => {
      const cell = document.createElement("td");
      cell.style.padding = "6px 8px";
      cell.style.borderBottom = "1px solid var(--background-modifier-border-hover)";
      cell.style.verticalAlign = "top";
      if (index === 0 && options?.onOpenObject) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = value;
        button.style.padding = "0";
        button.style.border = "0";
        button.style.background = "transparent";
        button.style.color = "var(--text-accent)";
        button.style.cursor = "pointer";
        button.addEventListener("click", () => {
          options.onOpenObject?.(entry.relatedObjectId, { openInNewLeaf: false });
        });
        cell.appendChild(button);
      } else {
        cell.textContent = value;
      }
      row.appendChild(cell);
    });
    tbody.appendChild(row);
  }
  table.appendChild(tbody);
  tableWrap.appendChild(table);
  details.appendChild(tableWrap);
  return details;
}
function buildErListRow(entry) {
  const relation = entry.relation;
  const relatedName = entry.relatedObject?.fileType === "er-entity" ? `${entry.relatedObject.logicalName} / ${entry.relatedObject.physicalName}` : entry.relatedObjectId;
  return [
    relatedName,
    relation.logicalName || relation.physicalName,
    relation.cardinality,
    `${relation.fromColumn} -> ${relation.toColumn}`
  ];
}
function buildClassListRow(entry) {
  const relation = entry.relation;
  const relatedName = entry.relatedObject?.fileType === "object" ? entry.relatedObject.name : entry.relatedObjectId;
  const details = [
    relation.sourceCardinality ? `from: ${relation.sourceCardinality}` : "",
    relation.targetCardinality ? `to: ${relation.targetCardinality}` : ""
  ].filter(Boolean).join(" / ");
  return [
    relatedName,
    relation.label ?? relation.kind,
    relation.kind,
    details
  ];
}
function buildCardSubtitle(entry) {
  const object = entry.relatedObject;
  if (!object) {
    return "unresolved";
  }
  if (object.fileType === "er-entity") {
    return object.physicalName;
  }
  return object.kind;
}
function buildCardPreview(entry) {
  const object = entry.relatedObject;
  if (!object) {
    return "Unresolved object";
  }
  if (object.fileType === "er-entity") {
    const pkColumns = object.columns.filter((column) => column.pk).slice(0, 2);
    if (pkColumns.length === 0) {
      return "PK: -";
    }
    const suffix = object.columns.filter((column) => column.pk).length > 2 ? ", ..." : "";
    return `PK: ${pkColumns.map((column) => column.physicalName).join(", ")}${suffix}`;
  }
  const attributePreview = object.attributes.slice(0, 2).map((attribute) => `+${attribute.name}`);
  const methodPreview = object.methods.slice(0, 2).map((method) => `+${method.name}()`);
  const items = [...attributePreview, ...methodPreview];
  if (object.attributes.length + object.methods.length > items.length) {
    items.push("...");
  }
  return items.join(" / ");
}
function getErRelationCardinality(relation) {
  const erRelation = relation;
  return erRelation.cardinality ?? "";
}
function getClassRelationType(relation) {
  const classRelation = relation;
  return classRelation.kind;
}
function wireClickable(element, objectId, options) {
  element.style.cursor = "pointer";
  element.setAttribute("role", "button");
  element.setAttribute("tabindex", "0");
  element.addEventListener("click", () => {
    options.onOpenObject?.(objectId, { openInNewLeaf: false });
  });
  element.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      options.onOpenObject?.(objectId, { openInNewLeaf: false });
    }
  });
}
function getObjectId2(object) {
  const explicitId = object.frontmatter.id;
  if (typeof explicitId === "string" && explicitId.trim()) {
    return explicitId.trim();
  }
  return object.name;
}
function clamp4(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
var GRAPH_BASE_WIDTH = 560;
var GRAPH_BASE_HEIGHT = 400;

// src/views/object-preview-view.ts
var OBJECT_PREVIEW_VIEW_TYPE = "mdspec-object-preview";
var ObjectPreviewView = class extends import_obsidian3.ItemView {
  constructor(leaf) {
    super(leaf);
    this.model = null;
    this.context = null;
    this.warnings = [];
    this.onOpenObject = null;
  }
  getViewType() {
    return OBJECT_PREVIEW_VIEW_TYPE;
  }
  getDisplayText() {
    return "Object Preview";
  }
  async onOpen() {
    this.contentEl.style.display = "flex";
    this.contentEl.style.flexDirection = "column";
    this.contentEl.style.height = "100%";
    this.contentEl.style.minHeight = "0";
    this.contentEl.style.gap = "10px";
    this.render();
  }
  async onClose() {
    this.contentEl.empty();
  }
  setPreview(model, context = null, onOpenObject = null, warnings = []) {
    this.model = model;
    this.context = context;
    this.onOpenObject = onOpenObject;
    this.warnings = warnings;
    this.render();
  }
  render() {
    this.contentEl.empty();
    this.contentEl.style.display = "flex";
    this.contentEl.style.flexDirection = "column";
    this.contentEl.style.height = "100%";
    this.contentEl.style.minHeight = "0";
    this.contentEl.style.gap = "10px";
    renderWarningBar2(this.contentEl, this.warnings);
    if (!this.model) {
      this.contentEl.createEl("p", { text: "No object model available for preview." });
      return;
    }
    this.contentEl.appendChild(renderObjectModel(this.model, this.context));
    if (this.context) {
      this.contentEl.appendChild(
        renderObjectContext(this.context, {
          onOpenObject: this.onOpenObject ?? void 0
        })
      );
    }
  }
};
function renderWarningBar2(container, warnings) {
  if (warnings.length === 0) {
    return;
  }
  const bar = container.createDiv({ cls: "mdspec-warning-bar" });
  bar.createEl("strong", { text: `Warnings (${warnings.length})` });
  const list = bar.createEl("ul");
  for (const warning of warnings) {
    list.createEl("li", { text: warning.message });
  }
}

// src/views/relations-preview-view.ts
var import_obsidian4 = require("obsidian");
var RELATIONS_PREVIEW_VIEW_TYPE = "mdspec-relations-preview";
var RelationsPreviewView = class extends import_obsidian4.ItemView {
  constructor(leaf) {
    super(leaf);
    this.model = null;
    this.warnings = [];
  }
  getViewType() {
    return RELATIONS_PREVIEW_VIEW_TYPE;
  }
  getDisplayText() {
    return "Relations Preview";
  }
  async onOpen() {
    this.render();
  }
  async onClose() {
    this.contentEl.empty();
  }
  setPreview(model, warnings = []) {
    this.model = model;
    this.warnings = warnings;
    this.render();
  }
  render() {
    this.contentEl.empty();
    renderWarningBar3(this.contentEl, this.warnings);
    if (!this.model) {
      this.contentEl.createEl("p", { text: "No relations model available for preview." });
      return;
    }
    this.contentEl.createEl("h2", {
      text: this.model.title ?? this.model.frontmatter.id?.toString() ?? "Relations"
    });
    if (this.model.fileType === "er-relation") {
      const list2 = this.contentEl.createEl("ul");
      list2.createEl("li", { text: `Logical Name: ${this.model.logicalName}` });
      list2.createEl("li", { text: `Physical Name: ${this.model.physicalName}` });
      list2.createEl("li", { text: `From: ${this.model.fromEntity}.${this.model.fromColumn}` });
      list2.createEl("li", { text: `To: ${this.model.toEntity}.${this.model.toColumn}` });
      list2.createEl("li", { text: `Cardinality: ${this.model.cardinality}` });
      return;
    }
    if (this.model.relations.length === 0) {
      this.contentEl.createEl("p", { text: "No relations defined." });
      return;
    }
    const list = this.contentEl.createEl("ul");
    for (const relation of this.model.relations) {
      const label = relation.label ? ` (${relation.label})` : "";
      list.createEl("li", {
        text: `${relation.source} -[${relation.kind}]-> ${relation.target}${label}`
      });
    }
  }
};
function renderWarningBar3(container, warnings) {
  if (warnings.length === 0) {
    return;
  }
  const bar = container.createDiv({ cls: "mdspec-warning-bar" });
  bar.createEl("strong", { text: `Warnings (${warnings.length})` });
  const list = bar.createEl("ul");
  for (const warning of warnings) {
    list.createEl("li", { text: warning.message });
  }
}

// src/main.ts
var ModelingToolPlugin = class extends import_obsidian5.Plugin {
  constructor() {
    super(...arguments);
    this.index = null;
    this.previewLeaf = null;
  }
  async onload() {
    this.registerView(
      OBJECT_PREVIEW_VIEW_TYPE,
      (leaf) => new ObjectPreviewView(leaf)
    );
    this.registerView(
      RELATIONS_PREVIEW_VIEW_TYPE,
      (leaf) => new RelationsPreviewView(leaf)
    );
    this.registerView(
      DIAGRAM_PREVIEW_VIEW_TYPE,
      (leaf) => new DiagramPreviewView(leaf)
    );
    this.addCommand({
      id: "rebuild-modeling-index",
      name: "Rebuild modeling index",
      callback: async () => {
        await this.rebuildIndex();
        new import_obsidian5.Notice("Modeling index rebuilt");
      }
    });
    this.addCommand({
      id: "open-modeling-preview",
      name: "Open modeling preview for active file",
      callback: async () => {
        await this.openPreviewForActiveFile();
      }
    });
    this.registerEvent(
      this.app.workspace.on("file-open", async () => {
        if (this.previewLeaf) {
          await this.refreshOpenPreview();
        }
      })
    );
    this.registerEvent(
      this.app.vault.on("modify", async () => {
        await this.rebuildIndex();
      })
    );
    this.registerEvent(
      this.app.vault.on("create", async () => {
        await this.rebuildIndex();
      })
    );
    this.registerEvent(
      this.app.vault.on("delete", async () => {
        await this.rebuildIndex();
      })
    );
    this.registerEvent(
      this.app.vault.on("rename", async () => {
        await this.rebuildIndex();
      })
    );
    await this.rebuildIndex();
    console.info("[modeling-tool-obsidian] plugin loaded");
  }
  onunload() {
    if (this.previewLeaf) {
      this.previewLeaf.detach();
      this.previewLeaf = null;
    }
    console.info("[modeling-tool-obsidian] plugin unloaded");
  }
  async rebuildIndex() {
    const files = await Promise.all(
      this.app.vault.getMarkdownFiles().map(async (file) => ({
        path: file.path,
        content: await this.app.vault.cachedRead(file)
      }))
    );
    this.index = buildVaultIndex(files);
  }
  async openPreviewForActiveFile() {
    if (!this.index) {
      await this.rebuildIndex();
    }
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new import_obsidian5.Notice("No active markdown file");
      return;
    }
    await this.showPreviewForFile(file);
  }
  async refreshOpenPreview() {
    const file = this.app.workspace.getActiveFile();
    if (!file || !this.previewLeaf) {
      return;
    }
    await this.showPreviewForFile(file, this.previewLeaf);
  }
  async showPreviewForFile(file, preferredLeaf) {
    if (!this.index) {
      await this.rebuildIndex();
    }
    if (!this.index) {
      return;
    }
    const model = this.index.modelsByFilePath[file.path];
    if (!model) {
      new import_obsidian5.Notice("No parsed model for the active file");
      return;
    }
    switch (detectFileType(model.frontmatter)) {
      case "object":
        await this.showObjectPreview(model.path, preferredLeaf);
        return;
      case "relations":
        await this.showRelationsPreview(model.path, preferredLeaf);
        return;
      case "diagram":
        await this.showDiagramPreview(model.path, preferredLeaf);
        return;
      case "er-entity":
        await this.showObjectPreview(model.path, preferredLeaf);
        return;
      case "er-relation":
        await this.showRelationsPreview(model.path, preferredLeaf);
        return;
      case "markdown":
      default:
        new import_obsidian5.Notice("Active file is not a supported modeling document");
    }
  }
  async showObjectPreview(path, preferredLeaf) {
    const leaf = await this.ensureLeaf(OBJECT_PREVIEW_VIEW_TYPE, preferredLeaf);
    const view = leaf.view;
    const model = this.index?.modelsByFilePath[path];
    if (view instanceof ObjectPreviewView) {
      const objectModel = model?.fileType === "object" || model?.fileType === "er-entity" ? model : null;
      const context = objectModel && this.index ? resolveObjectContext(objectModel, this.index) : null;
      const warnings = [
        ...this.index?.warningsByFilePath[path] ?? [],
        ...context?.warnings ?? []
      ];
      view.setPreview(
        objectModel,
        context,
        objectModel ? (objectId, navigation) => {
          void this.openObjectNote(objectId, path, navigation);
        } : null,
        warnings
      );
    }
  }
  async showRelationsPreview(path, preferredLeaf) {
    const leaf = await this.ensureLeaf(RELATIONS_PREVIEW_VIEW_TYPE, preferredLeaf);
    const view = leaf.view;
    const model = this.index?.modelsByFilePath[path];
    if (view instanceof RelationsPreviewView) {
      view.setPreview(
        model?.fileType === "relations" || model?.fileType === "er-relation" ? model : null,
        this.index?.warningsByFilePath[path] ?? []
      );
    }
  }
  async showDiagramPreview(path, preferredLeaf) {
    const leaf = await this.ensureLeaf(DIAGRAM_PREVIEW_VIEW_TYPE, preferredLeaf);
    const view = leaf.view;
    const model = this.index?.modelsByFilePath[path];
    if (view instanceof DiagramPreviewView) {
      const resolved = model?.fileType === "diagram" && this.index ? resolveDiagramRelations(model, this.index) : null;
      const warnings = [
        ...this.index?.warningsByFilePath[path] ?? [],
        ...resolved?.warnings ?? []
      ];
      view.setPreview(
        resolved,
        resolved ? (objectId, navigation) => {
          void this.openObjectNote(objectId, path, navigation);
        } : null,
        warnings
      );
    }
  }
  async openObjectNote(objectId, sourcePath, navigation) {
    if (!this.index) {
      await this.rebuildIndex();
    }
    if (!this.index) {
      new import_obsidian5.Notice("Model index is not available");
      return;
    }
    const result = await openModelObjectNote(this.app, this.index, objectId, {
      sourcePath,
      openInNewLeaf: navigation?.openInNewLeaf ?? false
    });
    if (!result.ok) {
      new import_obsidian5.Notice(result.reason ?? `Could not open object "${objectId}"`);
    }
  }
  async ensureLeaf(viewType, preferredLeaf) {
    const leaf = preferredLeaf ?? this.previewLeaf ?? this.app.workspace.getRightLeaf(false) ?? this.app.workspace.getLeaf(true);
    await leaf.setViewState({
      type: viewType,
      active: true
    });
    this.previewLeaf = leaf;
    return leaf;
  }
};
