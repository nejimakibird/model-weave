import {
  CORE_RELATION_KINDS,
  RESERVED_RELATION_KINDS
} from "../types/enums";
import type {
  GenericFrontmatter,
  ParseResult,
  RelationKind,
  RelationModel,
  RelationsFileModel,
  ValidationWarning
} from "../types/models";
import { detectFileType } from "../core/schema-detector";
import { parseFrontmatter } from "./frontmatter-parser";
import { extractMarkdownSections } from "./markdown-sections";

export function parseRelationsFile(
  markdown: string,
  path: string
): ParseResult<RelationsFileModel> {
  const frontmatterResult = parseFrontmatter(markdown);
  const warnings = [...frontmatterResult.warnings];
  const frontmatter = frontmatterResult.file.frontmatter ?? {};
  const schema = getString(frontmatter, "schema");

  if (
    detectFileType(frontmatter) !== "relations" ||
    schema !== "model_relations_v1"
  ) {
    warnings.push(
      createWarning(
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
      createInfoWarning(
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
      title: getString(frontmatter, "title"),
      frontmatter,
      sections,
      relations
    },
    warnings
  };
}

function parseRelationsSection(
  lines: string[] | undefined,
  warnings: ValidationWarning[],
  path: string
): RelationModel[] {
  if (!lines) {
    return [];
  }

  const relations: RelationModel[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const record = parseRelationRecord(trimmed);
    if (!record) {
      warnings.push(
        createWarning(
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
        createWarning(
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
        createInfoWarning(
          "reserved-relation-kind-used",
          `reserved kind used: "${rawKind}"`,
          path,
          "kind"
        )
      );
    } else if (!isCoreRelationKind(rawKind)) {
      warnings.push(
        createWarning(
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
      label: typeof record.label === "string" ? record.label : undefined,
      sourceCardinality:
        typeof record.from_multiplicity === "string"
          ? record.from_multiplicity
          : undefined,
      targetCardinality:
        typeof record.to_multiplicity === "string"
          ? record.to_multiplicity
          : undefined,
      metadata: {
        raw: trimmed
      }
    });
  }

  return relations;
}

function parseRelationRecord(line: string): Record<string, string> | null {
  const bulletMatch = line.match(/^-\s+(.+)$/);
  if (!bulletMatch) {
    return null;
  }

  const record: Record<string, string> = {};

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

function getString(
  frontmatter: GenericFrontmatter,
  key: string
): string | undefined {
  const value = frontmatter[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function isCoreRelationKind(kind: string): kind is RelationKind {
  return CORE_RELATION_KINDS.some((candidate) => candidate === kind);
}

function isReservedRelationKind(kind: string): kind is RelationKind {
  return RESERVED_RELATION_KINDS.some((candidate) => candidate === kind);
}

function normalizeRelationKind(kind: string): RelationKind {
  if (isCoreRelationKind(kind) || isReservedRelationKind(kind)) {
    return kind;
  }

  return "association";
}

function createWarning(
  code: "invalid-relation-kind" | "invalid-relation-record" | "unknown-schema",
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
  code: "reserved-relation-kind-used" | "section-missing",
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
