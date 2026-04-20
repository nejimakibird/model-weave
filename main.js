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
var import_obsidian4 = require("obsidian");

// src/core/schema-detector.ts
var SCHEMA_TO_FILE_TYPE = {
  model_object_v1: "object",
  model_relations_v1: "relations",
  diagram_v1: "diagram"
};
function detectFileType(value) {
  const schema = typeof value === "string" ? value : value?.schema;
  if (!schema) {
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
  "## Attributes": "Attributes",
  "## Methods": "Methods",
  "## Notes": "Notes",
  "## Relations": "Relations",
  "## Objects": "Objects"
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
    if (!index.objectsById[objectRef]) {
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
    relationsFilesById: {},
    diagramsById: {},
    modelsByFilePath: {},
    relationsById: {},
    relationsByObjectId: {},
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

// src/core/relation-resolver.ts
function resolveDiagramRelations(diagram, index) {
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
function resolveEdges(diagram, index, presentObjectIds, warnings) {
  const edges = [];
  const seenRelationIds = /* @__PURE__ */ new Set();
  for (const objectId of presentObjectIds) {
    const relations = index.relationsByObjectId[objectId] ?? [];
    for (const relation of relations) {
      const relationKey = relation.id ?? buildRelationKey(relation);
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
function buildRelationKey(relation) {
  return `${relation.source}:${relation.kind}:${relation.target}:${relation.label ?? ""}`;
}

// src/views/diagram-preview-view.ts
var import_obsidian = require("obsidian");

// src/renderers/object-renderer.ts
function renderObjectModel(model) {
  const root = document.createElement("section");
  root.className = `mdspec-object mdspec-object--${model.kind}`;
  const header = document.createElement("header");
  header.className = "mdspec-object__header";
  const title = document.createElement("h2");
  title.textContent = model.name;
  const badge = document.createElement("span");
  badge.className = "mdspec-badge";
  badge.textContent = model.kind;
  header.append(title, badge);
  root.appendChild(header);
  if (model.description) {
    root.appendChild(createSection("Summary", createParagraph(model.description)));
  }
  const variant = document.createElement("p");
  variant.className = "mdspec-object__variant";
  variant.textContent = describeObjectKind(model.kind);
  root.appendChild(variant);
  root.appendChild(createMembersSection("Attributes", model.attributes.map((attribute) => {
    const detail = attribute.type ? `: ${attribute.type}` : "";
    const note = attribute.description ? ` - ${attribute.description}` : "";
    return `${attribute.name}${detail}${note}`;
  })));
  root.appendChild(createMembersSection("Methods", model.methods.map((method) => {
    const parameters = method.parameters.map(
      (parameter) => `${parameter.name}${parameter.type ? `: ${parameter.type}` : ""}`
    ).join(", ");
    const returnType = method.returnType ? ` ${method.returnType}` : "";
    const note = method.description ? ` - ${method.description}` : "";
    return `${method.name}(${parameters})${returnType}${note}`;
  })));
  return root;
}
function describeObjectKind(kind) {
  switch (kind) {
    case "class":
      return "Class-style object";
    case "entity":
      return "Entity-style object";
    case "interface":
      return "Interface contract";
    case "enum":
      return "Enum definition";
    case "component":
      return "Component boundary";
    default:
      return "Reserved kind preview";
  }
}
function createMembersSection(title, items) {
  const section = document.createElement("section");
  section.className = "mdspec-section";
  const heading = document.createElement("h3");
  heading.textContent = title;
  section.appendChild(heading);
  if (items.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No items.";
    section.appendChild(empty);
    return section;
  }
  const list = document.createElement("ul");
  for (const item of items) {
    const entry = document.createElement("li");
    entry.textContent = item;
    list.appendChild(entry);
  }
  section.appendChild(list);
  return section;
}
function createSection(title, content) {
  const section = document.createElement("section");
  section.className = "mdspec-section";
  const heading = document.createElement("h3");
  heading.textContent = title;
  section.append(heading, content);
  return section;
}
function createParagraph(text) {
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  return paragraph;
}

// src/renderers/class-renderer.ts
function renderClassDiagram(diagram) {
  const root = document.createElement("section");
  root.className = "mdspec-diagram mdspec-diagram--class";
  const title = document.createElement("h2");
  title.textContent = `${diagram.diagram.name} (class)`;
  root.appendChild(title);
  const grid = document.createElement("div");
  grid.className = "mdspec-diagram__grid";
  for (const node of diagram.nodes) {
    const card = document.createElement("div");
    card.className = "mdspec-diagram__node";
    if (node.object) {
      card.appendChild(renderObjectModel(node.object));
    } else {
      card.appendChild(createFallbackNode(node.ref ?? node.id));
    }
    grid.appendChild(card);
  }
  root.appendChild(grid);
  root.appendChild(createEdgesSection(diagram));
  return root;
}
function createEdgesSection(diagram) {
  const section = document.createElement("section");
  section.className = "mdspec-section";
  const heading = document.createElement("h3");
  heading.textContent = "Relations";
  section.appendChild(heading);
  if (diagram.edges.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No relations resolved.";
    section.appendChild(empty);
    return section;
  }
  const list = document.createElement("ul");
  for (const edge of diagram.edges) {
    const item = document.createElement("li");
    item.textContent = `${edge.source} -[${edge.kind ?? "relation"}]-> ${edge.target}`;
    list.appendChild(item);
  }
  section.appendChild(list);
  return section;
}
function createFallbackNode(id) {
  const box = document.createElement("div");
  box.className = "mdspec-fallback";
  box.textContent = `Unresolved object: ${id}`;
  return box;
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
    heading.textContent = node.object?.name ?? node.ref ?? node.id;
    box.appendChild(heading);
    const description = document.createElement("p");
    description.textContent = node.object?.description ?? "No component description available.";
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

// src/renderers/er-renderer.ts
function renderErDiagram(diagram) {
  const root = document.createElement("section");
  root.className = "mdspec-diagram mdspec-diagram--er";
  const title = document.createElement("h2");
  title.textContent = `${diagram.diagram.name} (ER)`;
  root.appendChild(title);
  const entities = document.createElement("div");
  entities.className = "mdspec-diagram__entities";
  for (const node of diagram.nodes) {
    const entity = document.createElement("article");
    entity.className = "mdspec-entity";
    const heading = document.createElement("h3");
    heading.textContent = node.object?.name ?? node.ref ?? node.id;
    entity.appendChild(heading);
    const list = document.createElement("ul");
    for (const attribute of node.object?.attributes ?? []) {
      const item = document.createElement("li");
      item.textContent = `${attribute.name}${attribute.type ? `: ${attribute.type}` : ""}`;
      list.appendChild(item);
    }
    if (list.childElementCount === 0) {
      const empty = document.createElement("p");
      empty.textContent = "No attributes.";
      entity.appendChild(empty);
    } else {
      entity.appendChild(list);
    }
    entities.appendChild(entity);
  }
  root.appendChild(entities);
  root.appendChild(createRelationList(diagram));
  return root;
}
function createRelationList(diagram) {
  const section = document.createElement("section");
  const heading = document.createElement("h3");
  heading.textContent = "Resolved relations";
  section.appendChild(heading);
  if (diagram.edges.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No relations resolved.";
    section.appendChild(empty);
    return section;
  }
  const list = document.createElement("ul");
  for (const edge of diagram.edges) {
    const item = document.createElement("li");
    const sourceMultiplicity = typeof edge.metadata?.sourceCardinality === "string" ? ` [${edge.metadata.sourceCardinality}]` : "";
    const targetMultiplicity = typeof edge.metadata?.targetCardinality === "string" ? ` [${edge.metadata.targetCardinality}]` : "";
    item.textContent = `${edge.source}${sourceMultiplicity} -[${edge.kind ?? "relation"}]-> ${edge.target}${targetMultiplicity}`;
    list.appendChild(item);
  }
  section.appendChild(list);
  return section;
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
    item.textContent = node.object?.name ?? node.ref ?? node.id;
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

// src/renderers/diagram-renderer.ts
function renderDiagramModel(diagram) {
  switch (diagram.diagram.kind) {
    case "class":
      return renderClassDiagram(diagram);
    case "er":
      return renderErDiagram(diagram);
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
var DiagramPreviewView = class extends import_obsidian.ItemView {
  constructor(leaf) {
    super(leaf);
    this.diagram = null;
    this.warnings = [];
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
  setPreview(diagram, warnings = []) {
    this.diagram = diagram;
    this.warnings = warnings;
    this.render();
  }
  render() {
    this.contentEl.empty();
    renderWarningBar(this.contentEl, this.warnings);
    if (!this.diagram) {
      this.contentEl.createEl("p", { text: "No diagram model available for preview." });
      return;
    }
    this.contentEl.appendChild(renderDiagramModel(this.diagram));
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
var import_obsidian2 = require("obsidian");
var OBJECT_PREVIEW_VIEW_TYPE = "mdspec-object-preview";
var ObjectPreviewView = class extends import_obsidian2.ItemView {
  constructor(leaf) {
    super(leaf);
    this.model = null;
    this.warnings = [];
  }
  getViewType() {
    return OBJECT_PREVIEW_VIEW_TYPE;
  }
  getDisplayText() {
    return "Object Preview";
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
    renderWarningBar2(this.contentEl, this.warnings);
    if (!this.model) {
      this.contentEl.createEl("p", { text: "No object model available for preview." });
      return;
    }
    this.contentEl.appendChild(renderObjectModel(this.model));
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
var import_obsidian3 = require("obsidian");
var RELATIONS_PREVIEW_VIEW_TYPE = "mdspec-relations-preview";
var RelationsPreviewView = class extends import_obsidian3.ItemView {
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
    this.contentEl.createEl("h2", { text: this.model.title ?? this.model.frontmatter.id?.toString() ?? "Relations" });
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
var ModelingToolPlugin = class extends import_obsidian4.Plugin {
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
        new import_obsidian4.Notice("Modeling index rebuilt");
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
      new import_obsidian4.Notice("No active markdown file");
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
      new import_obsidian4.Notice("No parsed model for the active file");
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
      case "markdown":
      default:
        new import_obsidian4.Notice("Active file is not a supported modeling document");
    }
  }
  async showObjectPreview(path, preferredLeaf) {
    const leaf = await this.ensureLeaf(OBJECT_PREVIEW_VIEW_TYPE, preferredLeaf);
    const view = leaf.view;
    const model = this.index?.modelsByFilePath[path];
    if (view instanceof ObjectPreviewView) {
      view.setPreview(
        model?.fileType === "object" ? model : null,
        this.index?.warningsByFilePath[path] ?? []
      );
    }
  }
  async showRelationsPreview(path, preferredLeaf) {
    const leaf = await this.ensureLeaf(RELATIONS_PREVIEW_VIEW_TYPE, preferredLeaf);
    const view = leaf.view;
    const model = this.index?.modelsByFilePath[path];
    if (view instanceof RelationsPreviewView) {
      view.setPreview(
        model?.fileType === "relations" ? model : null,
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
      view.setPreview(resolved, warnings);
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
