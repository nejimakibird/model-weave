import type { FileType, GenericFrontmatter } from "../types/models";

const SCHEMA_TO_FILE_TYPE: Record<string, FileType> = {
  model_object_v1: "object",
  model_relations_v1: "relations",
  diagram_v1: "diagram"
};

export function detectFileType(schema?: string | null): FileType;
export function detectFileType(frontmatter?: GenericFrontmatter | null): FileType;
export function detectFileType(
  value?: string | GenericFrontmatter | null
): FileType {
  const schema = typeof value === "string" ? value : value?.schema;

  if (!schema) {
    return "markdown";
  }

  return SCHEMA_TO_FILE_TYPE[schema] ?? "markdown";
}
