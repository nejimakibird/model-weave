import {
  CORE_DIAGRAM_KINDS,
  CORE_OBJECT_KINDS,
  CORE_RELATION_KINDS,
  FILE_TYPES,
  RESERVED_DIAGRAM_KINDS,
  RESERVED_OBJECT_KINDS,
  RESERVED_RELATION_KINDS
} from "./enums";
import type {
  ValidationWarningCode,
  ValidationWarningSeverity
} from "./warnings";

export type FileType = (typeof FILE_TYPES)[number];

export type CoreObjectKind = (typeof CORE_OBJECT_KINDS)[number];
export type ReservedObjectKind = (typeof RESERVED_OBJECT_KINDS)[number];
export type ObjectKind = CoreObjectKind | ReservedObjectKind;

export type CoreRelationKind = (typeof CORE_RELATION_KINDS)[number];
export type ReservedRelationKind = (typeof RESERVED_RELATION_KINDS)[number];
export type RelationKind = CoreRelationKind | ReservedRelationKind;

export type CoreDiagramKind = (typeof CORE_DIAGRAM_KINDS)[number];
export type ReservedDiagramKind = (typeof RESERVED_DIAGRAM_KINDS)[number];
export type DiagramKind = CoreDiagramKind | ReservedDiagramKind;

export interface GenericFrontmatter {
  schema?: string;
  name?: string;
  title?: string;
  kind?: string;
  aliases?: string[];
  tags?: string[];
  [key: string]: unknown;
}

export interface AttributeModel {
  name: string;
  type?: string;
  visibility?: "public" | "protected" | "private" | "package";
  required?: boolean;
  multiplicity?: string;
  defaultValue?: string;
  description?: string;
  raw?: string;
}

export interface MethodParameterModel {
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  description?: string;
}

export interface MethodModel {
  name: string;
  parameters: MethodParameterModel[];
  returnType?: string;
  visibility?: "public" | "protected" | "private" | "package";
  description?: string;
  isStatic?: boolean;
  raw?: string;
}

export type SectionMap = Record<string, string[]>;

interface BaseFileModel<TFileType extends FileType> {
  fileType: TFileType;
  path: string;
  title?: string;
  frontmatter: GenericFrontmatter;
  sections: SectionMap;
}

export interface ObjectModel extends BaseFileModel<"object"> {
  schema: "model_object_v1";
  name: string;
  kind: ObjectKind;
  description?: string;
  attributes: AttributeModel[];
  methods: MethodModel[];
}

export interface RelationModel {
  id?: string;
  kind: RelationKind;
  source: string;
  target: string;
  label?: string;
  description?: string;
  sourceCardinality?: string;
  targetCardinality?: string;
  metadata?: Record<string, unknown>;
}

export interface RelationsFileModel extends BaseFileModel<"relations"> {
  schema: "model_relations_v1";
  relations: RelationModel[];
}

export interface DiagramNode {
  id: string;
  ref?: string;
  label?: string;
  kind?: ObjectKind;
  metadata?: Record<string, unknown>;
}

export interface DiagramEdge {
  id?: string;
  source: string;
  target: string;
  kind?: RelationKind;
  label?: string;
  metadata?: Record<string, unknown>;
}

export interface DiagramModel extends BaseFileModel<"diagram"> {
  schema: "diagram_v1";
  name: string;
  kind: DiagramKind;
  description?: string;
  objectRefs: string[];
  autoRelations: boolean;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export interface MarkdownFileModel extends BaseFileModel<"markdown"> {
  content: string;
}

export type ParsedFileModel =
  | ObjectModel
  | RelationsFileModel
  | DiagramModel
  | MarkdownFileModel;

export interface ValidationWarning {
  code: ValidationWarningCode;
  message: string;
  severity: ValidationWarningSeverity;
  path?: string;
  line?: number;
  field?: string;
  context?: Record<string, unknown>;
}

export interface ParseResult<TParsed extends ParsedFileModel = ParsedFileModel> {
  file: TParsed | null;
  warnings: ValidationWarning[];
}

export interface ResolvedDiagram {
  diagram: DiagramModel;
  nodes: Array<
    DiagramNode & {
      object?: ObjectModel;
    }
  >;
  edges: DiagramEdge[];
  missingObjects: string[];
  warnings: ValidationWarning[];
}

export interface VaultIndex {
  byPath: Record<string, ParsedFileModel>;
  objectsByName: Record<string, ObjectModel>;
  diagramsByName: Record<string, DiagramModel>;
  relationsFilesByPath: Record<string, RelationsFileModel>;
  markdownFilesByPath: Record<string, MarkdownFileModel>;
}

export interface TemplateDefinition {
  id: string;
  label: string;
  fileType: FileType;
  schema: string;
  kind?: ObjectKind | RelationKind | DiagramKind;
  description?: string;
  frontmatter?: Partial<GenericFrontmatter>;
  body?: string;
}

export interface CompletionItemModel {
  label: string;
  insertText: string;
  detail?: string;
  documentation?: string;
  kind:
    | "schema"
    | "object-kind"
    | "relation-kind"
    | "diagram-kind"
    | "template"
    | "field"
    | "reference";
  sortText?: string;
}

export interface PreviewRenderResult {
  content: string;
  warnings: ValidationWarning[];
  mimeType?: "text/plain" | "text/markdown" | "text/html";
}

export interface RendererContext {
  index: VaultIndex;
  filePath?: string;
}

export type ObjectRenderer = (
  model: ObjectModel,
  context: RendererContext
) => PreviewRenderResult;

export type DiagramRenderer = (
  diagram: ResolvedDiagram,
  context: RendererContext
) => PreviewRenderResult;
