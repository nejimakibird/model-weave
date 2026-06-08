import type { FileType } from "../types/models";

export const SUPPORTED_MODEL_WEAVE_FORMATS = [
  "class",
  "class_diagram",
  "er_entity",
  "er_diagram",
  "dfd_object",
  "dfd_diagram",
  "data_object",
  "app_process",
  "screen",
  "rule",
  "codeset",
  "message",
  "mapping",
  "color_scheme",
  "domains",
  "domain_diagram"
] as const;

export const SUPPORTED_MODEL_WEAVE_FORMAT_LIST =
  SUPPORTED_MODEL_WEAVE_FORMATS.join(" / ");

const SUPPORTED_MODEL_WEAVE_FILE_TYPES = new Set<FileType>([
  "object",
  "er-entity",
  "diagram",
  "dfd-object",
  "dfd-diagram",
  "data-object",
  "app-process",
  "screen",
  "rule",
  "codeset",
  "message",
  "mapping",
  "color-scheme",
  "domains",
  "domain-diagram"
]);

export function isModelWeavePreviewSupportedFileType(
  fileType: FileType
): boolean {
  return SUPPORTED_MODEL_WEAVE_FILE_TYPES.has(fileType);
}
