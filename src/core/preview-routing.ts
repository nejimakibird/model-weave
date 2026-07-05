import type { FileType, ParsedFileModel } from "../types/models";

export function isDfdLikeDiagramPreviewFileType(
  fileType: FileType
): fileType is "dfd-diagram" | "flow-diagram" {
  return fileType === "dfd-diagram" || fileType === "flow-diagram";
}

export function isDiagramPreviewRouteFileType(fileType: FileType): boolean {
  return fileType === "diagram" || isDfdLikeDiagramPreviewFileType(fileType);
}

export type DfdLikeDiagramPreviewModel = Extract<
  ParsedFileModel,
  { fileType: "dfd-diagram" | "flow-diagram" }
>;

export function isDfdLikeDiagramPreviewModel(
  model: ParsedFileModel
): model is DfdLikeDiagramPreviewModel {
  return isDfdLikeDiagramPreviewFileType(model.fileType);
}
