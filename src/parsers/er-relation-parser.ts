import type {
  ErRelation,
  GenericFrontmatter,
  ParseResult,
  ValidationWarning
} from "../types/models";
import { detectFileType } from "../core/schema-detector";
import { parseFrontmatter } from "./frontmatter-parser";
import { extractMarkdownSections } from "./markdown-sections";

export function parseErRelationFile(
  markdown: string,
  path: string
): ParseResult<ErRelation> {
  const frontmatterResult = parseFrontmatter(markdown);
  const warnings = [...frontmatterResult.warnings];
  const frontmatter = frontmatterResult.file.frontmatter ?? {};

  if (detectFileType(frontmatter) !== "er-relation") {
    warnings.push(
      createWarning(
        "invalid-structure",
        'ER relation parser expected frontmatter type "er_relation"',
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
  const fromEntity = getRequiredString(frontmatter, "from_entity", warnings, path);
  const fromColumn = getRequiredString(frontmatter, "from_column", warnings, path);
  const toEntity = getRequiredString(frontmatter, "to_entity", warnings, path);
  const toColumn = getRequiredString(frontmatter, "to_column", warnings, path);
  const cardinality = getRequiredString(frontmatter, "cardinality", warnings, path);

  if (
    !id ||
    !logicalName ||
    !physicalName ||
    !fromEntity ||
    !fromColumn ||
    !toEntity ||
    !toColumn ||
    !cardinality
  ) {
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

function getRequiredString(
  frontmatter: GenericFrontmatter,
  key: string,
  warnings: ValidationWarning[],
  path: string
): string | null {
  const value = frontmatter[key];
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  warnings.push(
    createWarning("invalid-structure", `missing required field "${key}"`, path, key)
  );
  return null;
}

function createWarning(
  code: "invalid-structure",
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
