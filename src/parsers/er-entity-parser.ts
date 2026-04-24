import { erRelationBlockToInternalEdge } from "../core/internal-edge-adapters";
import { detectFileType } from "../core/schema-detector";
import { normalizeReferenceTarget } from "../core/reference-resolver";
import { parseFrontmatter } from "./frontmatter-parser";
import { extractMarkdownSections } from "./markdown-sections";
import { parseMarkdownTable } from "./markdown-table";
import type {
  ErColumn,
  ErEntity,
  ErEntityRelationBlock,
  ErEntityRelationMapping,
  ErIndex,
  GenericFrontmatter,
  ParseResult,
  ValidationWarning
} from "../types/models";

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

const RELATION_MAPPING_HEADERS = [
  "local_column",
  "target_column",
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

  const body = frontmatterResult.file.body;
  const sections = extractMarkdownSections(body);
  const id = getRequiredString(frontmatter, "id", warnings, path);
  const logicalName = getRequiredString(frontmatter, "logical_name", warnings, path);
  const physicalName = getRequiredString(frontmatter, "physical_name", warnings, path);

  if (!sections.Columns) {
    warnings.push(
      createInfoWarning("section-missing", 'section missing: "Columns"', path, "Columns")
    );
  }

  const columnTable = parseMarkdownTable(
    sections.Columns,
    [...COLUMN_HEADERS],
    path,
    "Columns"
  );
  const indexTable = parseMarkdownTable(
    sections.Indexes,
    [...INDEX_HEADERS],
    path,
    "Indexes"
  );
  warnings.push(...columnTable.warnings, ...indexTable.warnings);

  const columns = columnTable.rows.map((row) => toErColumn(row, warnings, path));
  const indexes = indexTable.rows.map((row) => toErIndex(row));
  const relationBlocks = parseRelationBlocks(body, warnings, path);

  const fallbackId = id || getFileStem(path) || "UNTITLED-ER-ENTITY";
  const fallbackLogicalName =
    logicalName || physicalName || fallbackId;
  const fallbackPhysicalName =
    physicalName || logicalName || fallbackId;

  const baseEntity: ErEntity = {
    fileType: "er-entity",
    path,
    filePath: path,
    title: buildTitle(fallbackLogicalName, fallbackPhysicalName),
    frontmatter,
    sections,
    id: fallbackId,
    logicalName: fallbackLogicalName,
    physicalName: fallbackPhysicalName,
    schemaName: getOptionalString(frontmatter, "schema_name"),
    dbms: getOptionalString(frontmatter, "dbms"),
    columns,
    indexes,
    relationBlocks,
    outboundRelations: []
  };

  baseEntity.outboundRelations = relationBlocks.map((relationBlock) =>
    erRelationBlockToInternalEdge(relationBlock, baseEntity)
  );

  return {
    file: baseEntity,
    warnings
  };
}

function getFileStem(path: string): string {
  return path.replace(/\\/g, "/").split("/").pop()?.replace(/\.md$/i, "") ?? "";
}

function parseRelationBlocks(
  body: string,
  warnings: ValidationWarning[],
  path: string
): ErEntityRelationBlock[] {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const relationsSectionLines = extractRelationsSectionLines(lines);
  if (relationsSectionLines.length === 0) {
    return [];
  }

  const blocks: ErEntityRelationBlock[] = [];
  let currentId: string | null = null;
  let currentLines: string[] = [];

  const flushBlock = (): void => {
    if (!currentId) {
      return;
    }

    blocks.push(parseRelationBlock(currentId, currentLines, warnings, path));
  };

  for (const line of relationsSectionLines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^###\s+(.+)$/);
    if (match) {
      flushBlock();
      currentId = match[1].trim();
      currentLines = [];
      continue;
    }

    if (currentId) {
      currentLines.push(line);
    }
  }

  flushBlock();
  return blocks;
}

function extractRelationsSectionLines(lines: string[]): string[] {
  let inRelations = false;
  const collected: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!inRelations) {
      if (trimmed === "## Relations") {
        inRelations = true;
      }
      continue;
    }

    if (/^##\s+/.test(trimmed)) {
      break;
    }

    collected.push(line);
  }

  return collected;
}

function parseRelationBlock(
  id: string,
  lines: string[],
  warnings: ValidationWarning[],
  path: string
): ErEntityRelationBlock {
  const metadata: Record<string, string> = {};
  const tableLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const metadataMatch = trimmed.match(/^-\s+([a-zA-Z_]+)\s*:\s*(.+)$/);
    if (metadataMatch) {
      metadata[metadataMatch[1]] = metadataMatch[2].trim();
      continue;
    }

    if (trimmed.startsWith("|")) {
      tableLines.push(trimmed);
    }
  }

  const targetTableRaw = metadata.target_table?.trim() ?? null;
  const targetTable = targetTableRaw ? normalizeReferenceTarget(targetTableRaw) : null;
  const kind = metadata.kind?.trim() ?? null;
  const cardinality = metadata.cardinality?.trim() ?? null;
  const notes = metadata.notes?.trim() ?? null;

  if (!targetTableRaw) {
    warnings.push(
      createWarning(
        "invalid-structure",
        `relation block "${id}" missing required field "target_table"`,
        path,
        "Relations"
      )
    );
  }
  const mappingTable = parseMarkdownTable(
    tableLines,
    [...RELATION_MAPPING_HEADERS],
    path,
    `Relations:${id}`
  );
  warnings.push(...mappingTable.warnings);

  const mappings = mappingTable.rows.map((row) => toRelationMapping(row));
  return {
    id,
    targetTable,
    kind,
    cardinality,
    notes,
    mappings
  };
}

function toRelationMapping(row: Record<string, string>): ErEntityRelationMapping {
  return {
    localColumn: row.local_column ?? "",
    targetColumn: row.target_column ?? "",
    notes: toNullableString(row.notes)
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
