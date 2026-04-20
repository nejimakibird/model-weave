import type {
  ErColumn,
  ErEntity,
  ErIndex,
  GenericFrontmatter,
  ParseResult,
  ValidationWarning
} from "../types/models";
import { detectFileType } from "../core/schema-detector";
import { parseFrontmatter } from "./frontmatter-parser";
import { extractMarkdownSections } from "./markdown-sections";
import { parseMarkdownTable } from "./markdown-table";

const COLUMN_HEADERS = [
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
] as const;

const INDEX_HEADERS = [
  "index_name",
  "index_type",
  "unique",
  "columns",
  "notes"
] as const;

export function parseErEntityFile(
  markdown: string,
  path: string
): ParseResult<ErEntity> {
  const frontmatterResult = parseFrontmatter(markdown);
  const warnings = [...frontmatterResult.warnings];
  const frontmatter = frontmatterResult.file.frontmatter ?? {};

  if (detectFileType(frontmatter) !== "er-entity") {
    warnings.push(
      createWarning(
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
    warnings.push(createInfoWarning("section-missing", 'section missing: "Columns"', path, "Columns"));
  }
  if (!sections.Indexes) {
    warnings.push(createInfoWarning("section-missing", 'section missing: "Indexes"', path, "Indexes"));
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

function toErColumn(
  row: Record<string, string>,
  warnings: ValidationWarning[],
  path: string
): ErColumn {
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

function toErIndex(row: Record<string, string>): ErIndex {
  return {
    indexName: row.index_name ?? "",
    indexType: row.index_type ?? "",
    unique: parseYN(row.unique),
    columns: row.columns ?? "",
    notes: toNullableString(row.notes)
  };
}

function parseNullableNumber(
  value: string | undefined,
  warnings: ValidationWarning[],
  path: string,
  field: string
): number | null {
  const normalized = toNullableString(value);
  if (normalized === null) {
    return null;
  }

  const parsed = Number(normalized);
  if (Number.isFinite(parsed)) {
    return parsed;
  }

  warnings.push(
    createWarning(
      "invalid-numeric-value",
      `failed to parse numeric value "${normalized}" for "${field}"`,
      path,
      field
    )
  );
  return null;
}

function parseYN(value: string | undefined): boolean {
  return (value ?? "").trim().toUpperCase() === "Y";
}

function buildTitle(logicalName: string, physicalName: string): string {
  return `${logicalName} / ${physicalName}`;
}

function getRequiredString(
  frontmatter: GenericFrontmatter,
  key: string,
  warnings: ValidationWarning[],
  path: string
): string | null {
  const value = getOptionalString(frontmatter, key);
  if (value) {
    return value;
  }

  warnings.push(
    createWarning(
      key === "id" ? "missing-name" : "invalid-structure",
      `missing required field "${key}"`,
      path,
      key
    )
  );
  return null;
}

function getOptionalString(
  frontmatter: GenericFrontmatter,
  key: string
): string | null {
  const value = frontmatter[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toNullableString(value: string | undefined): string | null {
  const normalized = value?.trim() ?? "";
  return normalized ? normalized : null;
}

function createWarning(
  code: "invalid-structure" | "missing-name" | "invalid-numeric-value",
  message: string,
  path: string,
  field: string
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
  code: "section-missing",
  message: string,
  path: string,
  field: string
): ValidationWarning {
  return {
    code,
    message,
    severity: "info",
    path,
    field
  };
}
