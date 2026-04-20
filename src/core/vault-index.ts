import type {
  DiagramModel,
  ErEntity,
  ErRelation,
  MarkdownFileModel,
  ObjectModel,
  ParsedFileModel,
  RelationModel,
  RelationsFileModel,
  ValidationWarning
} from "../types/models";
import { detectFileType } from "./schema-detector";
import { parseFrontmatter } from "../parsers/frontmatter-parser";
import { extractMarkdownSections } from "../parsers/markdown-sections";
import { parseObjectFile } from "../parsers/object-parser";
import { parseRelationsFile } from "../parsers/relations-parser";
import { parseDiagramFile } from "../parsers/diagram-parser";
import { parseErEntityFile } from "../parsers/er-entity-parser";
import { parseErRelationFile } from "../parsers/er-relation-parser";
import {
  resolveErEntityReference,
  resolveObjectModelReference
} from "./reference-resolver";
import { validateVaultIndex } from "./validator";

export interface VaultFileInput {
  path: string;
  content: string;
}

export interface ModelingVaultIndex {
  sourceFilesByPath: Record<string, VaultFileInput>;
  objectsById: Record<string, ObjectModel>;
  erEntitiesById: Record<string, ErEntity>;
  erEntitiesByPhysicalName: Record<string, ErEntity>;
  relationsFilesById: Record<string, RelationsFileModel>;
  diagramsById: Record<string, DiagramModel>;
  erRelationsById: Record<string, ErRelation>;
  modelsByFilePath: Record<string, ParsedFileModel>;
  relationsById: Record<string, RelationModel>;
  relationsByObjectId: Record<string, RelationModel[]>;
  erRelationsByEntityPhysicalName: Record<string, ErRelation[]>;
  warningsByFilePath: Record<string, ValidationWarning[]>;
}

export function buildVaultIndex(files: VaultFileInput[]): ModelingVaultIndex {
  const index: ModelingVaultIndex = {
    sourceFilesByPath: {},
    objectsById: {},
    erEntitiesById: {},
    erEntitiesByPhysicalName: {},
    relationsFilesById: {},
    diagramsById: {},
    erRelationsById: {},
    modelsByFilePath: {},
    relationsById: {},
    relationsByObjectId: {},
    erRelationsByEntityPhysicalName: {},
    warningsByFilePath: {}
  };

  for (const file of files) {
    index.sourceFilesByPath[file.path] = file;
    indexSingleFile(index, file);
  }

  rebuildReferenceLookups(index);

  for (const warning of validateVaultIndex(index)) {
    pushWarning(index.warningsByFilePath, warning.path ?? "vault", warning);
  }

  return index;
}

export function updateVaultIndexFile(
  previousIndex: ModelingVaultIndex,
  file: VaultFileInput
): ModelingVaultIndex {
  const nextFiles = Object.values(previousIndex.sourceFilesByPath).filter(
    (entry) => entry.path !== file.path
  );
  nextFiles.push(file);

  return buildVaultIndex(nextFiles);
}

export function removeVaultIndexFile(
  previousIndex: ModelingVaultIndex,
  filePath: string
): ModelingVaultIndex {
  const nextFiles = Object.values(previousIndex.sourceFilesByPath).filter(
    (entry) => entry.path !== filePath
  );

  return buildVaultIndex(nextFiles);
}

function indexSingleFile(index: ModelingVaultIndex, file: VaultFileInput): void {
  const parseResult = parseVaultFile(file);

  for (const warning of parseResult.warnings) {
    pushWarning(index.warningsByFilePath, file.path, {
      ...warning,
      path: warning.path ?? file.path
    });
  }

  if (!parseResult.file) {
    return;
  }

  index.modelsByFilePath[file.path] = parseResult.file;

  switch (parseResult.file.fileType) {
    case "object": {
      const objectId = getModelId(parseResult.file);
      addModelById(
        index.objectsById,
        objectId,
        parseResult.file,
        index.warningsByFilePath,
        file.path
      );
      break;
    }
    case "relations": {
      const relationsFileId = getModelId(parseResult.file);
      addModelById(
        index.relationsFilesById,
        relationsFileId,
        parseResult.file,
        index.warningsByFilePath,
        file.path
      );

      for (const relation of parseResult.file.relations) {
        if (relation.id) {
          addModelById(
            index.relationsById,
            relation.id,
            relation,
            index.warningsByFilePath,
            file.path
          );
        }
      }
      break;
    }
    case "diagram": {
      const diagramId = getModelId(parseResult.file);
      addModelById(
        index.diagramsById,
        diagramId,
        parseResult.file,
        index.warningsByFilePath,
        file.path
      );
      break;
    }
    case "er-entity": {
      addModelById(
        index.erEntitiesById,
        parseResult.file.id,
        parseResult.file,
        index.warningsByFilePath,
        file.path
      );
      addModelById(
        index.erEntitiesByPhysicalName,
        parseResult.file.physicalName,
        parseResult.file,
        index.warningsByFilePath,
        file.path
      );
      break;
    }
    case "er-relation": {
      addModelById(
        index.erRelationsById,
        parseResult.file.id,
        parseResult.file,
        index.warningsByFilePath,
        file.path
      );
      break;
    }
    case "markdown":
      break;
  }
}

function rebuildReferenceLookups(index: ModelingVaultIndex): void {
  index.relationsByObjectId = {};
  index.erRelationsByEntityPhysicalName = {};

  for (const model of Object.values(index.modelsByFilePath)) {
    if (model.fileType === "relations") {
      for (const relation of model.relations) {
        const sourceObject = resolveObjectModelReference(relation.source, index);
        const targetObject = resolveObjectModelReference(relation.target, index);

        addRelationForObject(
          index.relationsByObjectId,
          getRelationObjectKey(relation.source, sourceObject),
          relation
        );
        addRelationForObject(
          index.relationsByObjectId,
          getRelationObjectKey(relation.target, targetObject),
          relation
        );
      }
    }

    if (model.fileType === "er-relation") {
      const sourceEntity = resolveErEntityReference(model.fromEntity, index);
      const targetEntity = resolveErEntityReference(model.toEntity, index);

      addErRelationForEntity(
        index.erRelationsByEntityPhysicalName,
        sourceEntity?.physicalName ?? model.fromEntity,
        model
      );
      addErRelationForEntity(
        index.erRelationsByEntityPhysicalName,
        targetEntity?.physicalName ?? model.toEntity,
        model
      );
    }
  }
}

function parseVaultFile(file: VaultFileInput): {
  file: ParsedFileModel | null;
  warnings: ValidationWarning[];
} {
  const frontmatterResult = parseFrontmatter(file.content);
  const frontmatter = frontmatterResult.file.frontmatter;
  const fileType = detectFileType(frontmatter);

  switch (fileType) {
    case "object":
      return parseObjectFile(file.content, file.path);
    case "relations":
      return parseRelationsFile(file.content, file.path);
    case "diagram":
      return parseDiagramFile(file.content, file.path);
    case "er-entity":
      return parseErEntityFile(file.content, file.path);
    case "er-relation":
      return parseErRelationFile(file.content, file.path);
    case "markdown":
    default:
      return {
        file: createMarkdownModel(file.path, frontmatterResult.file.body, frontmatter),
        warnings: frontmatterResult.warnings
      };
  }
}

function createMarkdownModel(
  path: string,
  body: string,
  frontmatter?: Record<string, unknown>
): MarkdownFileModel {
  return {
    fileType: "markdown",
    path,
    title: typeof frontmatter?.title === "string" ? frontmatter.title : undefined,
    frontmatter: (frontmatter ?? {}) as MarkdownFileModel["frontmatter"],
    sections: extractMarkdownSections(body),
    content: body
  };
}

function addModelById<T>(
  target: Record<string, T>,
  id: string,
  model: T,
  warningsByFilePath: Record<string, ValidationWarning[]>,
  path: string
): void {
  if (!target[id]) {
    target[id] = model;
    return;
  }

  pushWarning(warningsByFilePath, path, {
    code: "invalid-structure",
    message: `duplicate id detected: "${id}"`,
    severity: "warning",
    path,
    field: "id"
  });
}

function addRelationForObject(
  relationsByObjectId: Record<string, RelationModel[]>,
  objectId: string,
  relation: RelationModel
): void {
  if (!objectId.trim()) {
    return;
  }

  if (!relationsByObjectId[objectId]) {
    relationsByObjectId[objectId] = [];
  }

  relationsByObjectId[objectId].push(relation);
}

function addErRelationForEntity(
  relationsByEntityPhysicalName: Record<string, ErRelation[]>,
  physicalName: string,
  relation: ErRelation
): void {
  if (!relationsByEntityPhysicalName[physicalName]) {
    relationsByEntityPhysicalName[physicalName] = [];
  }

  relationsByEntityPhysicalName[physicalName].push(relation);
}

function getRelationObjectKey(
  rawReference: string,
  object?: ObjectModel | null
): string {
  if (object) {
    return getModelId(object);
  }

  return rawReference.trim();
}

function getModelId(
  model: ObjectModel | RelationsFileModel | DiagramModel
): string {
  const explicitId = model.frontmatter.id;
  if (typeof explicitId === "string" && explicitId.trim()) {
    return explicitId.trim();
  }

  if ("name" in model && typeof model.name === "string" && model.name.trim()) {
    return model.name.trim();
  }

  return getBasename(model.path);
}

function getBasename(path: string): string {
  const slashNormalized = path.replace(/\\/g, "/");
  const rawName = slashNormalized.split("/").pop() ?? path;
  return rawName.replace(/\.md$/i, "");
}

function pushWarning(
  warningsByFilePath: Record<string, ValidationWarning[]>,
  path: string,
  warning: ValidationWarning
): void {
  if (!warningsByFilePath[path]) {
    warningsByFilePath[path] = [];
  }

  const exists = warningsByFilePath[path].some(
    (entry) =>
      entry.code === warning.code &&
      entry.message === warning.message &&
      entry.field === warning.field
  );

  if (!exists) {
    warningsByFilePath[path].push(warning);
  }
}
