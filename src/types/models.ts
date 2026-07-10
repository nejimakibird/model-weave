import {
  CORE_DIAGRAM_KINDS,
  DFD_OBJECT_KINDS,
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
import type { AppProcessBusinessFlowDirection } from "../core/app-process-business-flow-direction";

export type FileType = (typeof FILE_TYPES)[number];
export type DfdObjectKind = (typeof DFD_OBJECT_KINDS)[number];
export type DfdDiagramObjectKind = DfdObjectKind | "other";
export type FlowDiagramObjectKind =
  | "screen"
  | "process"
  | "app_process"
  | "context"
  | "work_object"
  | "session"
  | "store"
  | "datastore"
  | "external"
  | "unknown";

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
  type?: string;
  render_mode?: string;
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
  sourceLinks: SourceLink[];
}

export interface SourceLink {
  path: string;
  label?: string;
  notes?: string;
}

export interface ObjectModel extends BaseFileModel<"object"> {
  schema: "model_object_v1";
  name: string;
  kind: ObjectKind;
  description?: string;
  attributes: AttributeModel[];
  methods: MethodModel[];
  relations: ClassRelationEdge[];
}

export interface DfdObjectModel extends BaseFileModel<"dfd-object"> {
  schema: "dfd_object";
  id: string;
  name: string;
  kind: DfdObjectKind;
  summary?: string;
  notes?: string[];
}

export interface DataObjectField {
  name: string;
  fieldMode?: "standard" | "file_layout";
  label?: string;
  type?: string;
  length?: string;
  required?: string;
  path?: string;
  recordType?: string;
  no?: string;
  position?: string;
  fieldFormat?: string;
  ref?: string;
  notes?: string;
  rowLine?: number;
}

export interface DataObjectFormatEntry {
  key: string;
  value?: string;
  notes?: string;
  rowLine?: number;
}

export interface DataObjectRecord {
  recordType: string;
  name?: string;
  occurrence?: string;
  notes?: string;
  rowLine?: number;
}

export interface QualifiedMemberCandidate {
  ownerModelType: string;
  ownerId: string;
  ownerPath: string;
  memberKind: string;
  memberId: string;
  displayName?: string;
  sourceSection: string;
}

export interface ParsedReferenceValue {
  raw: string;
  kind: "raw" | "wikilink" | "markdown_link";
  target?: string;
  display?: string;
  isExternal?: boolean;
}

export interface DataObjectModel extends BaseFileModel<"data-object"> {
  schema: "data_object";
  id: string;
  name: string;
  kind?: string;
  dataFormat?: string;
  encoding?: string;
  delimiter?: string;
  lineEnding?: string;
  hasHeader?: string;
  recordLength?: string;
  summary?: string;
  notes?: string[];
  formatEntries: DataObjectFormatEntry[];
  records: DataObjectRecord[];
  fields: DataObjectField[];
  fieldMode: "standard" | "file_layout";
  sectionLines?: Record<string, number>;
}

export interface AppProcessInput {
  id: string;
  data?: string;
  source?: string;
  required?: string;
  notes?: string;
}

export interface AppProcessOutput {
  id: string;
  data?: string;
  target?: string;
  notes?: string;
}

export interface AppProcessTrigger {
  id: string;
  kind?: string;
  source?: string;
  event?: string;
  notes?: string;
}

export interface AppProcessTransition {
  id: string;
  event?: string;
  to?: string;
  condition?: string;
  notes?: string;
}

export interface AppProcessStep {
  id: string;
  domain?: string;
  lane?: string;
  label?: string;
  kind?: string;
  input?: string;
  output?: string;
  rule?: string;
  invoke?: string;
  screen?: string;
  notes?: string;
}

export interface AppProcessFlow {
  from: string;
  to: string;
  condition?: string;
  label?: string;
  notes?: string;
}

export interface AppProcessModel extends BaseFileModel<"app-process"> {
  schema: "app_process";
  id: string;
  name: string;
  kind?: string;
  flowDirection?: AppProcessBusinessFlowDirection;
  summary?: string;
  domains: DomainEntry[];
  domainSources: DomainSourceRef[];
  inputs: AppProcessInput[];
  outputs: AppProcessOutput[];
  triggers: AppProcessTrigger[];
  transitions: AppProcessTransition[];
  steps?: AppProcessStep[];
  flows?: AppProcessFlow[];
  hasExplicitFlows?: boolean;
  notes?: string[];
}

export interface ScreenField {
  id: string;
  label?: string;
  kind?: string;
  layout?: string;
  dataType?: string;
  required?: string;
  ref?: string;
  rule?: string;
  condition?: string;
  notes?: string;
  rowLine?: number;
}

export interface ScreenLayout {
  id: string;
  label?: string;
  kind?: string;
  purpose?: string;
  notes?: string;
  rowLine?: number;
}

export interface ScreenAction {
  id?: string;
  label?: string;
  kind?: string;
  target?: string;
  event?: string;
  invoke?: string;
  transition?: string;
  rule?: string;
  condition?: string;
  notes?: string;
  rowLine?: number;
}

export interface ScreenMessage {
  id?: string;
  text?: string;
  severity?: string;
  timing?: string;
  condition?: string;
  notes?: string;
  rowLine?: number;
}

export interface ScreenLocalProcessStep {
  id?: string;
  label?: string;
  kind?: string;
  condition?: string;
  input?: string;
  output?: string;
  rule?: string;
  invoke?: string;
  screen?: string;
  notes?: string;
  rowLine?: number;
}

export interface ScreenLocalProcessError {
  id?: string;
  condition?: string;
  message?: string;
  notes?: string;
  rowLine?: number;
}

export interface ScreenLocalProcess {
  id: string;
  heading: string;
  summary?: string;
  steps?: ScreenLocalProcessStep[];
  errors?: ScreenLocalProcessError[];
  line?: number;
}

export interface ScreenLegacyTransition {
  id?: string;
  event?: string;
  to?: string;
  condition?: string;
  notes?: string;
  rowLine?: number;
}

export interface ScreenModel extends BaseFileModel<"screen"> {
  schema: "screen";
  id: string;
  name: string;
  screenType?: string;
  summary?: string;
  layouts: ScreenLayout[];
  fields: ScreenField[];
  actions: ScreenAction[];
  messages: ScreenMessage[];
  localProcesses: ScreenLocalProcess[];
  legacyTransitions: ScreenLegacyTransition[];
  notes?: string[];
  sectionLines?: Record<string, number>;
}

export interface CodeSetValue {
  code: string;
  label?: string;
  sortOrder?: string;
  active?: string;
  notes?: string;
}

export interface CodeSetModel extends BaseFileModel<"codeset"> {
  schema: "codeset";
  id: string;
  name: string;
  kind?: string;
  summary?: string;
  values: CodeSetValue[];
  notes?: string[];
}

export interface MessageEntry {
  messageId: string;
  text?: string;
  severity?: string;
  timing?: string;
  audience?: string;
  active?: string;
  notes?: string;
}

export interface MessageModel extends BaseFileModel<"message"> {
  schema: "message";
  id: string;
  name: string;
  kind?: string;
  summary?: string;
  messages: MessageEntry[];
  notes?: string[];
}

export interface RuleInput {
  id: string;
  data?: string;
  source?: string;
  required?: string;
  notes?: string;
}

export interface RuleReference {
  ref?: string;
  usage?: string;
  notes?: string;
}

export interface RuleMessage {
  condition?: string;
  message?: string;
  severity?: string;
  notes?: string;
}

export interface RuleModel extends BaseFileModel<"rule"> {
  schema: "rule";
  id: string;
  name: string;
  kind?: string;
  summary?: string;
  inputs: RuleInput[];
  references: RuleReference[];
  messages: RuleMessage[];
  notes?: string[];
}

export interface MappingScopeEntry {
  role?: string;
  ref?: string;
  notes?: string;
}

export interface MappingRow {
  sourceRef?: string;
  targetRef?: string;
  transform?: string;
  rule?: string;
  required?: string;
  notes?: string;
}

export interface MappingModel extends BaseFileModel<"mapping"> {
  schema: "mapping";
  id: string;
  name: string;
  kind?: string;
  source?: string;
  target?: string;
  summary?: string;
  scope: MappingScopeEntry[];
  mappings: MappingRow[];
  notes?: string[];
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

export interface InternalEdgeBase {
  id?: string;
  source: string;
  target: string;
  kind?: string;
  label?: string;
  notes?: string;
}

export interface ErEdgeMapping {
  localColumn: string;
  targetColumn: string;
  notes?: string;
}

export interface ErRelationEdge extends InternalEdgeBase {
  domain: "er";
  sourceEntity: string;
  targetEntity: string;
  kind: string;
  cardinality?: string;
  mappings: ErEdgeMapping[];
}

export interface ClassRelationEdge extends InternalEdgeBase {
  domain: "class";
  sourceClass: string;
  targetClass: string;
  kind: string;
  fromMultiplicity?: string;
  toMultiplicity?: string;
}

export type InternalEdge = ErRelationEdge | ClassRelationEdge;

export interface RelationsFileModel extends BaseFileModel<"relations"> {
  schema: "model_relations_v1";
  relations: RelationModel[];
}

export interface DiagramNode {
  id: string;
  ref?: string;
  label?: string;
  kind?: ObjectKind | DfdDiagramObjectKind | FlowDiagramObjectKind;
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
  schema: "er_diagram" | "class_diagram";
  name: string;
  kind: DiagramKind;
  description?: string;
  objectRefs: string[];
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export interface DfdFlowModel {
  id?: string;
  from: string;
  to: string;
  kind?: string;
  trigger?: string;
  data?: string;
  dataRef?: ParsedReferenceValue;
  condition?: string;
  notes?: string;
  rowIndex: number;
}

export interface DomainEntry {
  id: string;
  name?: string;
  kind?: string;
  parent?: string;
  description?: string;
  rowIndex: number;
}

export interface DomainsModel extends BaseFileModel<"domains"> {
  schema: "domains";
  id: string;
  name: string;
  description?: string;
  domains: DomainEntry[];
}

export interface ColorSchemeEntry {
  target?: string;
  kind: string;
  fill?: string;
  stroke?: string;
  text?: string;
  notes?: string;
  rowIndex: number;
}

export interface ColorSchemeModel extends BaseFileModel<"color-scheme"> {
  schema: "color_scheme";
  id: string;
  name: string;
  colors: ColorSchemeEntry[];
}

export interface ResolvedColorStyle {
  fill?: string;
  stroke?: string;
  text?: string;
}

export interface ResolvedColorScheme {
  id: string;
  name: string;
  sourcePath?: string;
  entries: ColorSchemeEntry[];
  defaultStyle: ResolvedColorStyle;
}

export interface DomainSourceRef {
  ref: string;
  notes?: string;
  rowIndex: number;
}

export interface DomainDiagramModel extends BaseFileModel<"domain-diagram"> {
  schema: "domain_diagram";
  id: string;
  name: string;
  domainSources: DomainSourceRef[];
}

export interface DomainDiagramSourceSummary {
  ref: DomainSourceRef;
  resolvedPath?: string;
  resolvedId?: string;
  status: "ok" | "unresolved" | "invalid-type" | "empty";
  domainCount: number;
}

export interface DomainMergeConflict {
  domainId: string;
  field: "duplicate" | "name" | "kind" | "parent";
  earlierSourcePath: string;
  laterSourcePath: string;
  earlierValue?: string;
  laterValue?: string;
  effectiveSourcePath: string;
  severity: ValidationWarningSeverity;
}

export interface ResolvedDomainDiagram {
  diagram: DomainDiagramModel;
  domains: DomainEntry[];
  sourceSummaries: DomainDiagramSourceSummary[];
  conflicts: DomainMergeConflict[];
  warnings: ValidationWarning[];
}

export interface AppProcessDomainPlacement {
  stepId: string;
  stepLabel?: string;
  domainId: string;
  lane?: string;
  status: "resolved" | "unresolved";
  domain?: DomainEntry;
}

export interface ResolvedAppProcessDomainPlacement {
  process: AppProcessModel;
  domains: DomainEntry[];
  sourceSummaries: DomainDiagramSourceSummary[];
  conflicts: DomainMergeConflict[];
  placements: AppProcessDomainPlacement[];
  warnings: ValidationWarning[];
}

export interface DfdDiagramObjectEntry {
  id?: string;
  label?: string;
  kind?: DfdDiagramObjectKind | FlowDiagramObjectKind;
  ref?: string;
  domain?: string;
  notes?: string;
  rowIndex: number;
  compatibilityMode?: "legacy_ref_only" | "explicit";
}

export interface DfdDiagramModel extends BaseFileModel<"dfd-diagram"> {
  schema: "dfd_diagram";
  id: string;
  name: string;
  kind: "dfd";
  level?: string;
  description?: string;
  domainSources: DomainSourceRef[];
  domainSourceSummaries?: DomainDiagramSourceSummary[];
  domains?: DomainEntry[];
  objectRefs: string[];
  objectEntries: DfdDiagramObjectEntry[];
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  flows: DfdFlowModel[];
}

export interface FlowDiagramModel extends BaseFileModel<"flow-diagram"> {
  schema: "flow_diagram";
  id: string;
  name: string;
  kind: "screen_communication";
  description?: string;
  domainSources: DomainSourceRef[];
  domainSourceSummaries?: DomainDiagramSourceSummary[];
  domains?: DomainEntry[];
  objectRefs: string[];
  objectEntries: DfdDiagramObjectEntry[];
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  flows: DfdFlowModel[];
}

export interface ErColumn {
  logicalName: string;
  physicalName: string;
  dataType: string;
  length: number | null;
  scale: number | null;
  notNull: boolean;
  pk: boolean;
  encrypted: boolean;
  defaultValue: string | null;
  notes: string | null;
}

export interface ErIndex {
  indexName: string;
  indexType: string;
  unique: boolean;
  columns: string;
  notes: string | null;
}

export interface ErEntityRelationMapping {
  localColumn: string;
  targetColumn: string;
  notes: string | null;
}

export interface ErEntityRelationBlock {
  id: string;
  targetTable: string | null;
  kind: string | null;
  cardinality: string | null;
  notes: string | null;
  mappings: ErEntityRelationMapping[];
}

export interface ErEntity extends BaseFileModel<"er-entity"> {
  id: string;
  filePath: string;
  logicalName: string;
  physicalName: string;
  schemaName: string | null;
  dbms: string | null;
  columns: ErColumn[];
  indexes: ErIndex[];
  relationBlocks: ErEntityRelationBlock[];
  outboundRelations: ErRelationEdge[];
}

export interface MarkdownFileModel extends BaseFileModel<"markdown"> {
  content: string;
}

export type ParsedFileModel =
  | ObjectModel
  | DataObjectModel
  | AppProcessModel
  | ScreenModel
  | CodeSetModel
  | MessageModel
  | RuleModel
  | MappingModel
  | ColorSchemeModel
  | DomainsModel
  | DomainDiagramModel
  | DfdObjectModel
  | RelationsFileModel
  | DiagramModel
  | DfdDiagramModel
  | FlowDiagramModel
  | ErEntity
  | MarkdownFileModel;

export type ImpactReferenceDirection = "outbound" | "inbound";

export interface ImpactReference {
  direction: ImpactReferenceDirection;
  sourcePath: string;
  sourceId?: string;
  sourceType: ParsedFileModel["fileType"];
  sourceLabel: string;
  targetRaw: string;
  targetPath?: string;
  targetId?: string;
  targetType?: ParsedFileModel["fileType"];
  targetLabel: string;
  relationKind: string;
  section?: string;
  field?: string;
  sourceContext?: string;
  notes?: string;
}

export interface ImpactSourceLink {
  ownerPath: string;
  ownerId?: string;
  ownerType: ParsedFileModel["fileType"];
  ownerLabel: string;
  path: string;
  label?: string;
  notes: string[];
  relationKind: "self" | "inbound" | "outbound";
}

export interface ImpactRelationship {
  direction: ImpactReferenceDirection;
  modelPath: string;
  modelId?: string;
  modelType: ParsedFileModel["fileType"];
  modelLabel: string;
  usageCount: number;
  usages: ImpactReference[];
  sourceLinks: ImpactSourceLink[];
}

export interface ImpactValueUsage {
  member: string;
  memberLabel?: string;
  relationships: ImpactRelationship[];
}

export interface ImpactSummary {
  modelPath: string;
  modelId?: string;
  modelType: ParsedFileModel["fileType"];
  modelLabel: string;
  outboundRelationships: ImpactRelationship[];
  inboundRelationships: ImpactRelationship[];
  valueUsages: ImpactValueUsage[];
  unresolvedOutbound: ImpactReference[];
  relatedSourceLinks: ImpactSourceLink[];
}

export interface ValidationWarning {
  code: ValidationWarningCode;
  message: string;
  severity: ValidationWarningSeverity;
  path?: string;
  filePath?: string;
  line?: number;
  fromLine?: number;
  toLine?: number;
  section?: string;
  field?: string;
  context?: Record<string, unknown>;
}

export interface ParseResult<TParsed extends ParsedFileModel = ParsedFileModel> {
  file: TParsed | null;
  warnings: ValidationWarning[];
}

export interface ResolvedDiagram {
  diagram: DiagramModel | DfdDiagramModel | FlowDiagramModel;
  nodes: Array<
    DiagramNode & {
      object?: ObjectModel | ErEntity | DfdObjectModel;
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
