export const FILE_TYPES = [
  "object",
  "relations",
  "diagram",
  "er-entity",
  "markdown"
] as const;

export const CORE_OBJECT_KINDS = [
  "class",
  "entity",
  "interface",
  "enum",
  "component"
] as const;

export const RESERVED_OBJECT_KINDS = [
  "actor",
  "usecase"
] as const;

export const CORE_RELATION_KINDS = [
  "association",
  "dependency",
  "composition",
  "aggregation",
  "inheritance",
  "implementation",
  "reference",
  "flow"
] as const;

export const RESERVED_RELATION_KINDS = [
  "include",
  "extend",
  "transition",
  "message"
] as const;

export const CORE_DIAGRAM_KINDS = [
  "class",
  "er",
  "flow",
  "component"
] as const;

export const RESERVED_DIAGRAM_KINDS = [
  "usecase",
  "activity",
  "sequence"
] as const;
