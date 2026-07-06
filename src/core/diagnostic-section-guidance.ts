import type { FileType, ValidationWarning } from "../types/models";

export interface DiagnosticSectionGuidance {
  fileType: FileType | null;
  section: string | null;
  supported: boolean;
  expectedHeader?: string;
  sectionKind?: string;
  manualFix?: {
    en: string;
    ja: string;
  };
  copyExpectedHeaderAvailable: boolean;
}

const SOURCE_LINKS_HEADER = "| path | notes |";
const DOMAIN_SOURCES_HEADER = "ref | notes";
const DOMAIN_HEADER = "id | name | kind | parent | description";

const SECTION_HEADERS: Partial<Record<FileType, Record<string, string>>> = {
  "app-process": {
    inputs: "id | data | source | required | notes",
    outputs: "id | data | target | notes",
    triggers: "id | kind | source | event | notes",
    transitions: "id | event | to | condition | notes",
    steps: "id | domain | label | kind | input | output | rule | invoke | screen | notes",
    flows: "from | to | condition | label | notes",
    domains: DOMAIN_HEADER,
    "domain sources": DOMAIN_SOURCES_HEADER,
    "source links": SOURCE_LINKS_HEADER
  },
  codeset: {
    values: "code | label | sort_order | active | notes",
    "source links": SOURCE_LINKS_HEADER
  },
  "color-scheme": {
    colors: "| target | kind | fill | stroke | text | notes |",
    "source links": SOURCE_LINKS_HEADER
  },
  "data-object": {
    format: "key | value | notes",
    records: "record_type | name | occurrence | notes",
    fields: "name | label | type | length | required | path | ref | notes",
    "source links": SOURCE_LINKS_HEADER
  },
  diagram: {
    objects: "ref | notes",
    relations: "id | from | to | kind | label | from_multiplicity | to_multiplicity | notes",
    "source links": SOURCE_LINKS_HEADER
  },
  "dfd-diagram": {
    objects: "id | label | kind | ref | domain | notes",
    flows: "id | from | to | data | notes",
    domains: DOMAIN_HEADER,
    "domain sources": DOMAIN_SOURCES_HEADER,
    "source links": SOURCE_LINKS_HEADER
  },
  "dfd-object": {
    "source links": SOURCE_LINKS_HEADER
  },
  "flow-diagram": {
    objects: "id | label | kind | ref | domain | notes",
    flows: "id | from | to | kind | trigger | data | condition | notes",
    "source links": SOURCE_LINKS_HEADER
  },
  "domain-diagram": {
    "domain sources": DOMAIN_SOURCES_HEADER,
    "source links": SOURCE_LINKS_HEADER
  },
  domains: {
    domains: DOMAIN_HEADER,
    "source links": SOURCE_LINKS_HEADER
  },
  "er-entity": {
    columns: "logical_name | physical_name | data_type | length | scale | not_null | pk | encrypted | default_value | notes",
    indexes: "index_name | index_type | unique | columns | notes",
    relations: "local_column | target_column | notes",
    "source links": SOURCE_LINKS_HEADER
  },
  mapping: {
    scope: "role | ref | notes",
    mappings: "source_ref | target_ref | transform | rule | required | notes",
    "source links": SOURCE_LINKS_HEADER
  },
  message: {
    messages: "id | text | severity | audience | notes",
    "source links": SOURCE_LINKS_HEADER
  },
  object: {
    attributes: "name | type | visibility | static | notes",
    methods: "name | parameters | returns | visibility | static | notes",
    relations: "id | to | kind | label | from_multiplicity | to_multiplicity | notes",
    "source links": SOURCE_LINKS_HEADER
  },
  relations: {
    "source links": SOURCE_LINKS_HEADER
  },
  rule: {
    inputs: "id | data | source | required | notes",
    references: "ref | usage | notes",
    conditions: "id | expression | severity | message | notes",
    outputs: "id | data | target | notes",
    "source links": SOURCE_LINKS_HEADER
  },
  screen: {
    layout: "id | label | kind | purpose | notes",
    fields: "id | label | kind | layout | data_type | required | ref | condition | rule | notes",
    actions: "id | label | kind | target | event | condition | invoke | transition | rule | notes",
    messages: "id | text | severity | timing | condition | notes",
    transitions: "id | event | to | condition | notes",
    steps: "id | label | kind | condition | input | output | rule | invoke | screen | notes",
    errors: "id | condition | message | notes",
    "source links": SOURCE_LINKS_HEADER
  }
};

const FILE_TYPE_ALIASES: Record<string, FileType> = {
  app_process: "app-process",
  appprocess: "app-process",
  class: "object",
  class_diagram: "diagram",
  classdiagram: "diagram",
  color_scheme: "color-scheme",
  colorscheme: "color-scheme",
  data_object: "data-object",
  dataobject: "data-object",
  dfd_diagram: "dfd-diagram",
  dfddiagram: "dfd-diagram",
  flow_diagram: "flow-diagram",
  flowdiagram: "flow-diagram",
  dfd_object: "dfd-object",
  dfdobject: "dfd-object",
  domain_diagram: "domain-diagram",
  domaindiagram: "domain-diagram",
  er_diagram: "diagram",
  erdiagram: "diagram",
  er_entity: "er-entity",
  erentity: "er-entity",
  model_object_v1: "object",
  model_relations_v1: "relations"
};

export function attachDiagnosticModelContext(
  diagnostic: ValidationWarning,
  fileType: FileType
): ValidationWarning {
  const section = getDiagnosticSectionName(diagnostic);
  return {
    ...diagnostic,
    context: {
      ...diagnostic.context,
      fileType,
      ...(section ? { section } : {})
    }
  };
}

export function resolveDiagnosticSectionGuidance(
  diagnostic: ValidationWarning
): DiagnosticSectionGuidance | null {
  if (!isTableHeaderDiagnostic(diagnostic)) {
    return null;
  }
  const fileType = normalizeFileType(getDiagnosticStringValue(diagnostic.context?.fileType));
  const section = getDiagnosticSectionName(diagnostic);
  return resolveSectionGuidance(fileType, section);
}

export function resolveSectionGuidance(
  fileType: string | null | undefined,
  sectionName: string | null | undefined
): DiagnosticSectionGuidance | null {
  const normalizedFileType = normalizeFileType(fileType);
  const normalizedSection = normalizeSectionName(sectionName);
  if (!normalizedFileType || !normalizedSection) {
    return null;
  }

  const expectedHeader = SECTION_HEADERS[normalizedFileType]?.[normalizedSection] ??
    getCommonExpectedHeader(normalizedFileType, normalizedSection);
  if (expectedHeader) {
    return {
      fileType: normalizedFileType,
      section: sectionName?.trim() || normalizedSection,
      supported: true,
      expectedHeader,
      sectionKind: normalizedSection,
      copyExpectedHeaderAvailable: true
    };
  }

  return {
    fileType: normalizedFileType,
    section: sectionName?.trim() || normalizedSection,
    supported: false,
    sectionKind: normalizedSection,
    manualFix: getUnsupportedSectionManualFix(normalizedFileType, normalizedSection),
    copyExpectedHeaderAvailable: false
  };
}

export function getExpectedHeaderForDiagnostic(diagnostic: ValidationWarning): string | null {
  const guidance = resolveDiagnosticSectionGuidance(diagnostic);
  return guidance?.copyExpectedHeaderAvailable ? guidance.expectedHeader ?? null : null;
}

function getUnsupportedSectionManualFix(
  fileType: FileType,
  section: string
): DiagnosticSectionGuidance["manualFix"] | undefined {
  if (fileType === "rule" && (section === "messages" || section === "message")) {
    return {
      en: 'Section "Messages" is not supported for rule files. Put rule messages in the message column of ## Conditions, or define reusable text in a separate type: message file.',
      ja: "rule ファイルでは ## Messages セクションはサポートされていません。rule のメッセージは ## Conditions の message 列に記述するか、再利用する文言は type: message ファイルとして定義してください。"
    };
  }
  if (fileType === "app-process" && (section === "messages" || section === "message")) {
    return {
      en: 'Section "Messages" is not supported for app_process files. Use ## Errors, Transitions.notes, or define reusable text in a separate type: message file.',
      ja: "app_process ファイルでは ## Messages セクションはサポートされていません。## Errors、Transitions.notes、または再利用する文言を type: message ファイルとして定義することを検討してください。"
    };
  }
  return undefined;
}

function getDiagnosticSectionName(diagnostic: ValidationWarning): string | null {
  const contextSection = getDiagnosticStringValue(diagnostic.context?.section);
  if (contextSection) {
    return getSectionFromField(contextSection) ?? contextSection;
  }
  const quoted = diagnostic.message.match(/section "([^"]+)"/i)?.[1];
  return quoted ?? diagnostic.section ?? getSectionFromField(diagnostic.field);
}

function getSectionFromField(field: string | undefined): string | null {
  const section = field?.split(".")[0]?.split(":")[0]?.trim();
  return section || null;
}

function isTableHeaderDiagnostic(diagnostic: ValidationWarning): boolean {
  return diagnostic.code === "invalid-table-column" ||
    /table columns in section/i.test(diagnostic.message) ||
    /table should use:/i.test(diagnostic.message) ||
    /do not match expected .*headers/i.test(diagnostic.message) ||
    /do not match supported .*headers/i.test(diagnostic.message);
}

function normalizeSectionName(sectionName: string | null | undefined): string | null {
  const value = sectionName?.trim().toLowerCase();
  return value ? value.replace(/\s+/g, " ") : null;
}

function normalizeFileType(value: string | null | undefined): FileType | null {
  if (!value) {
    return null;
  }
  const raw = value.trim();
  if (!raw) {
    return null;
  }
  const lower = raw.toLowerCase();
  const alias = FILE_TYPE_ALIASES[lower];
  if (alias) {
    return alias;
  }
  const normalized = lower.replace(/_/g, "-");
  return isKnownFileType(normalized) ? normalized : null;
}

function getCommonExpectedHeader(fileType: FileType, section: string): string | null {
  if (fileType === "markdown") {
    return null;
  }
  if (section === "source links") {
    return SOURCE_LINKS_HEADER;
  }
  if (section === "domain sources" && (
    fileType === "app-process" ||
    fileType === "dfd-diagram" ||
    fileType === "domain-diagram"
  )) {
    return DOMAIN_SOURCES_HEADER;
  }
  return null;
}

function isKnownFileType(value: string): value is FileType {
  return [
    "object",
    "relations",
    "diagram",
    "data-object",
    "app-process",
    "screen",
    "rule",
    "codeset",
    "message",
    "mapping",
    "color-scheme",
    "domains",
    "domain-diagram",
    "dfd-object",
    "dfd-diagram",
    "flow-diagram",
    "er-entity",
    "markdown"
  ].includes(value);
}

function getDiagnosticStringValue(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean).join(" | ") || null;
  }
  return null;
}
