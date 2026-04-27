import type { FileType, GenericFrontmatter } from "../types/models";

const SCHEMA_TO_FILE_TYPE: Record<string, FileType> = {
  model_object_v1: "object",
  model_relations_v1: "relations"
};

const TYPE_TO_FILE_TYPE: Record<string, FileType> = {
  class: "object",
  data_object: "data-object",
  app_process: "app-process",
  screen: "screen",
  rule: "rule",
  codeset: "codeset",
  message: "message",
  mapping: "mapping",
  dfd_object: "dfd-object",
  dfd_diagram: "dfd-diagram",
  er_entity: "er-entity",
  er_diagram: "diagram",
  class_diagram: "diagram"
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
