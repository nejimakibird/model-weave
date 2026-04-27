import type {
  AppProcessModel,
  CodeSetModel,
  DataObjectModel,
  DiagramModel,
  DfdDiagramModel,
  DfdObjectModel,
  ErEntity,
  MessageModel,
  MappingModel,
  MarkdownFileModel,
  ObjectModel,
  ParsedFileModel,
  QualifiedMemberCandidate,
  RelationModel,
  RelationsFileModel,
  RuleModel,
  ScreenModel,
  ValidationWarning
} from "../types/models";
import { detectFileType } from "./schema-detector";
import { parseFrontmatter } from "../parsers/frontmatter-parser";
import { extractMarkdownSections } from "../parsers/markdown-sections";
import { parseObjectFile } from "../parsers/object-parser";
import { parseRelationsFile } from "../parsers/relations-parser";
import { parseDiagramFile } from "../parsers/diagram-parser";
import { parseDfdDiagramFile } from "../parsers/dfd-diagram-parser";
import { parseDfdObjectFile } from "../parsers/dfd-object-parser";
import { parseDataObjectFile } from "../parsers/data-object-parser";
import { parseErEntityFile } from "../parsers/er-entity-parser";
import { parseAppProcessFile } from "../parsers/app-process-parser";
import { parseScreenFile } from "../parsers/screen-parser";
import { parseCodeSetFile } from "../parsers/codeset-parser";
import { parseMessageFile } from "../parsers/message-parser";
import { parseRuleFile } from "../parsers/rule-parser";
import { parseMappingFile } from "../parsers/mapping-parser";
import { resolveObjectModelReference } from "./reference-resolver";
import { validateVaultIndex } from "./validator";

export interface VaultFileInput {
  path: string;
  content: string;
}

export interface ModelingVaultIndex {
  sourceFilesByPath: Record<string, VaultFileInput>;
  objectsById: Record<string, ObjectModel>;
  appProcessesById: Record<string, AppProcessModel>;
  screensById: Record<string, ScreenModel>;
  codesetsById: Record<string, CodeSetModel>;
  messagesById: Record<string, MessageModel>;
  rulesById: Record<string, RuleModel>;
  mappingsById: Record<string, MappingModel>;
  dataObjectsById: Record<string, DataObjectModel>;
  dfdObjectsById: Record<string, DfdObjectModel>;
  erEntitiesById: Record<string, ErEntity>;
  erEntitiesByPhysicalName: Record<string, ErEntity>;
  relationsFilesById: Record<string, RelationsFileModel>;
  diagramsById: Record<string, DiagramModel | DfdDiagramModel>;
  modelsByFilePath: Record<string, ParsedFileModel>;
  relationsById: Record<string, RelationModel>;
  relationsByObjectId: Record<string, RelationModel[]>;
  membersByOwnerId: Record<string, QualifiedMemberCandidate[]>;
  membersByOwnerPath: Record<string, QualifiedMemberCandidate[]>;
  warningsByFilePath: Record<string, ValidationWarning[]>;
}

export function buildVaultIndex(files: VaultFileInput[]): ModelingVaultIndex {
  const index: ModelingVaultIndex = {
    sourceFilesByPath: {},
    objectsById: {},
    appProcessesById: {},
    screensById: {},
    codesetsById: {},
    messagesById: {},
    rulesById: {},
    mappingsById: {},
    dataObjectsById: {},
    dfdObjectsById: {},
    erEntitiesById: {},
    erEntitiesByPhysicalName: {},
    relationsFilesById: {},
    diagramsById: {},
    modelsByFilePath: {},
    relationsById: {},
    relationsByObjectId: {},
    membersByOwnerId: {},
    membersByOwnerPath: {},
    warningsByFilePath: {}
  };

  for (const file of files) {
    index.sourceFilesByPath[file.path] = file;
    indexSingleFile(index, file);
  }

  rebuildReferenceLookups(index);
  rebuildMemberLookups(index);

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
    case "app-process": {
      addModelById(
        index.appProcessesById,
        parseResult.file.id,
        parseResult.file,
        index.warningsByFilePath,
        file.path
      );
      break;
    }
    case "screen": {
      addModelById(
        index.screensById,
        parseResult.file.id,
        parseResult.file,
        index.warningsByFilePath,
        file.path
      );
      break;
    }
    case "codeset": {
      addModelById(
        index.codesetsById,
        parseResult.file.id,
        parseResult.file,
        index.warningsByFilePath,
        file.path
      );
      break;
    }
    case "message": {
      addModelById(
        index.messagesById,
        parseResult.file.id,
        parseResult.file,
        index.warningsByFilePath,
        file.path
      );
      break;
    }
    case "rule": {
      addModelById(
        index.rulesById,
        parseResult.file.id,
        parseResult.file,
        index.warningsByFilePath,
        file.path
      );
      break;
    }
    case "mapping": {
      addModelById(
        index.mappingsById,
        parseResult.file.id,
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
    case "dfd-object": {
      addModelById(
        index.dfdObjectsById,
        parseResult.file.id,
        parseResult.file,
        index.warningsByFilePath,
        file.path
      );
      break;
    }
    case "data-object": {
      addModelById(
        index.dataObjectsById,
        parseResult.file.id,
        parseResult.file,
        index.warningsByFilePath,
        file.path
      );
      break;
    }
    case "dfd-diagram": {
      addModelById(
        index.diagramsById,
        parseResult.file.id,
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
    case "markdown":
      break;
  }
}

function rebuildReferenceLookups(index: ModelingVaultIndex): void {
  index.relationsByObjectId = {};

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
  }
}

function rebuildMemberLookups(index: ModelingVaultIndex): void {
  index.membersByOwnerId = {};
  index.membersByOwnerPath = {};

  for (const model of Object.values(index.modelsByFilePath)) {
    switch (model.fileType) {
      case "data-object":
        indexDataObjectMembers(index, model);
        break;
      case "app-process":
        indexAppProcessMembers(index, model);
        break;
      case "screen":
        indexScreenMembers(index, model);
        break;
      case "codeset":
        indexCodeSetMembers(index, model);
        break;
      case "message":
        indexMessageMembers(index, model);
        break;
      case "rule":
        indexRuleMembers(index, model);
        break;
      case "er-entity":
        indexErEntityMembers(index, model);
        break;
      case "object":
        indexClassMembers(index, model);
        break;
      default:
        break;
    }
  }
}

function parseVaultFile(file: VaultFileInput): {
  file: ParsedFileModel | null;
  warnings: ValidationWarning[];
} {
  const frontmatterResult = parseFrontmatter(file.content);
  const frontmatter = frontmatterResult.file.frontmatter;
  if (frontmatter?.type === "data_object") {
    return parseDataObjectFile(file.content, file.path);
  }
  if (frontmatter?.type === "app_process") {
    return parseAppProcessFile(file.content, file.path);
  }
  if (frontmatter?.type === "screen") {
    return parseScreenFile(file.content, file.path);
  }
  if (frontmatter?.type === "codeset") {
    return parseCodeSetFile(file.content, file.path);
  }
  if (frontmatter?.type === "message") {
    return parseMessageFile(file.content, file.path);
  }
  if (frontmatter?.type === "rule") {
    return parseRuleFile(file.content, file.path);
  }
  if (frontmatter?.type === "mapping") {
    return parseMappingFile(file.content, file.path);
  }
  const fileType = detectFileType(frontmatter);

  switch (fileType) {
    case "object":
      return parseObjectFile(file.content, file.path);
    case "dfd-object":
      return parseDfdObjectFile(file.content, file.path);
    case "app-process":
      return parseAppProcessFile(file.content, file.path);
    case "screen":
      return parseScreenFile(file.content, file.path);
    case "codeset":
      return parseCodeSetFile(file.content, file.path);
    case "message":
      return parseMessageFile(file.content, file.path);
    case "rule":
      return parseRuleFile(file.content, file.path);
    case "mapping":
      return parseMappingFile(file.content, file.path);
    case "relations":
      return parseRelationsFile(file.content, file.path);
    case "diagram":
      return parseDiagramFile(file.content, file.path);
    case "dfd-diagram":
      return parseDfdDiagramFile(file.content, file.path);
    case "er-entity":
      return parseErEntityFile(file.content, file.path);
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

function indexDataObjectMembers(
  index: ModelingVaultIndex,
  model: DataObjectModel
): void {
  const ownerId = getModelId(model);
  for (const field of model.fields) {
    const memberId = field.name?.trim();
    if (!memberId) {
      continue;
    }

    const displayName = field.recordType?.trim()
      ? `${field.label?.trim() || memberId} (${field.recordType.trim()})`
      : field.label?.trim() || memberId;

    addMemberCandidate(index, {
      ownerModelType: "data_object",
      ownerId,
      ownerPath: model.path,
      memberKind: "field",
      memberId,
      displayName,
      sourceSection: "Fields"
    });
  }
}

function indexAppProcessMembers(
  index: ModelingVaultIndex,
  model: AppProcessModel
): void {
  const ownerId = getModelId(model);

  for (const input of model.inputs) {
    const memberId = input.id?.trim();
    if (!memberId) {
      continue;
    }

    addMemberCandidate(index, {
      ownerModelType: "app_process",
      ownerId,
      ownerPath: model.path,
      memberKind: "input",
      memberId,
      displayName: memberId,
      sourceSection: "Inputs"
    });
  }

  for (const output of model.outputs) {
    const memberId = output.id?.trim();
    if (!memberId) {
      continue;
    }

    addMemberCandidate(index, {
      ownerModelType: "app_process",
      ownerId,
      ownerPath: model.path,
      memberKind: "output",
      memberId,
      displayName: memberId,
      sourceSection: "Outputs"
    });
  }
}

function indexScreenMembers(
  index: ModelingVaultIndex,
  model: ScreenModel
): void {
  const ownerId = getModelId(model);

  for (const field of model.fields) {
    const memberId = field.id?.trim();
    if (!memberId) {
      continue;
    }

    addMemberCandidate(index, {
      ownerModelType: "screen",
      ownerId,
      ownerPath: model.path,
      memberKind: "field",
      memberId,
      displayName: field.label?.trim() || memberId,
      sourceSection: "Fields"
    });
  }

  for (const action of model.actions) {
    const memberId = action.id?.trim();
    if (!memberId) {
      continue;
    }

    addMemberCandidate(index, {
      ownerModelType: "screen",
      ownerId,
      ownerPath: model.path,
      memberKind: "action",
      memberId,
      displayName: action.label?.trim() || memberId,
      sourceSection: "Actions"
    });
  }
}

function indexCodeSetMembers(
  index: ModelingVaultIndex,
  model: CodeSetModel
): void {
  const ownerId = getModelId(model);

  for (const value of model.values) {
    const memberId = value.code?.trim();
    if (!memberId) {
      continue;
    }

    addMemberCandidate(index, {
      ownerModelType: "codeset",
      ownerId,
      ownerPath: model.path,
      memberKind: "code",
      memberId,
      displayName: value.label?.trim() || memberId,
      sourceSection: "Values"
    });
  }
}

function indexMessageMembers(
  index: ModelingVaultIndex,
  model: MessageModel
): void {
  const ownerId = getModelId(model);

  for (const message of model.messages) {
    const memberId = message.messageId?.trim();
    if (!memberId) {
      continue;
    }

    addMemberCandidate(index, {
      ownerModelType: "message",
      ownerId,
      ownerPath: model.path,
      memberKind: "message",
      memberId,
      displayName: message.text?.trim() || memberId,
      sourceSection: "Messages"
    });
  }
}

function indexRuleMembers(
  index: ModelingVaultIndex,
  model: RuleModel
): void {
  const ownerId = getModelId(model);

  for (const input of model.inputs) {
    const memberId = input.id?.trim();
    if (!memberId) {
      continue;
    }

    addMemberCandidate(index, {
      ownerModelType: "rule",
      ownerId,
      ownerPath: model.path,
      memberKind: "input",
      memberId,
      displayName: memberId,
      sourceSection: "Inputs"
    });
  }
}

function indexErEntityMembers(
  index: ModelingVaultIndex,
  model: ErEntity
): void {
  const ownerId = getModelId(model);
  for (const column of model.columns) {
    const memberId = column.physicalName?.trim();
    if (!memberId) {
      continue;
    }

    addMemberCandidate(index, {
      ownerModelType: "er_entity",
      ownerId,
      ownerPath: model.path,
      memberKind: "column",
      memberId,
      displayName: column.logicalName?.trim() || memberId,
      sourceSection: "Columns"
    });
  }
}

function indexClassMembers(
  index: ModelingVaultIndex,
  model: ObjectModel
): void {
  const ownerId = getModelId(model);

  for (const attribute of model.attributes) {
    const memberId = attribute.name?.trim();
    if (!memberId) {
      continue;
    }

    addMemberCandidate(index, {
      ownerModelType: "class",
      ownerId,
      ownerPath: model.path,
      memberKind: "attribute",
      memberId,
      displayName: memberId,
      sourceSection: "Attributes"
    });
  }

  for (const method of model.methods) {
    const memberId = method.name?.trim();
    if (!memberId) {
      continue;
    }

    addMemberCandidate(index, {
      ownerModelType: "class",
      ownerId,
      ownerPath: model.path,
      memberKind: "method",
      memberId,
      displayName: memberId,
      sourceSection: "Methods"
    });
  }
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

function addMemberCandidate(
  index: ModelingVaultIndex,
  candidate: QualifiedMemberCandidate
): void {
  if (!candidate.ownerId.trim() || !candidate.ownerPath.trim() || !candidate.memberId.trim()) {
    return;
  }

  pushMemberCandidate(index.membersByOwnerId, candidate.ownerId, candidate);
  pushMemberCandidate(index.membersByOwnerPath, candidate.ownerPath, candidate);
}

function pushMemberCandidate(
  target: Record<string, QualifiedMemberCandidate[]>,
  key: string,
  candidate: QualifiedMemberCandidate
): void {
  if (!target[key]) {
    target[key] = [];
  }

  const exists = target[key].some(
    (entry) =>
      entry.ownerPath === candidate.ownerPath &&
      entry.memberKind === candidate.memberKind &&
      entry.memberId === candidate.memberId &&
      entry.sourceSection === candidate.sourceSection &&
      entry.displayName === candidate.displayName
  );

  if (!exists) {
    target[key].push(candidate);
  }
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
  model:
    | ObjectModel
    | AppProcessModel
    | ScreenModel
    | CodeSetModel
    | MessageModel
    | RuleModel
    | MappingModel
    | RelationsFileModel
    | DiagramModel
    | DataObjectModel
    | DfdObjectModel
    | DfdDiagramModel
    | ErEntity
): string {
  if ("id" in model && typeof model.id === "string" && model.id.trim()) {
    return model.id.trim();
  }

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
