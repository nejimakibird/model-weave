import type { FileType, GenericFrontmatter } from "../types/models";

const SCHEMA_TO_FILE_TYPE: Record<string, FileType> = {
  model_object_v1: "object",
  model_relations_v1: "relations",
  diagram_v1: "diagram"
};

const TYPE_TO_FILE_TYPE: Record<string, FileType> = {
  er_entity: "er-entity",
  er_relation: "er-relation"
};

export function detectFileType(schema?: string | null): FileType;
export function detectFileType(frontmatter?: GenericFrontmatter | null): FileType;
export function detectFileType(
  value?: string | GenericFrontmatter | null
): FileType {
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
