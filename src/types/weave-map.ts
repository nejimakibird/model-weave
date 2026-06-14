export type WeaveMapNodeStatus =
  | "focus"
  | "ok"
  | "source"
  | "unresolved"
  | "warning";

export type WeaveMapEdgeStatus =
  | "ok"
  | "source"
  | "unresolved"
  | "warning";

export type WeaveMapLayer =
  | "UI"
  | "Process"
  | "Rule"
  | "Rule / State"
  | "UI / Message"
  | "Data"
  | "Mapping"
  | "Implementation"
  | "Data Flow"
  | "Relationship"
  | "Source"
  | "Warning"
  | "Other";

export interface WeaveMapNode {
  id: string;
  label: string;
  modelType: string;
  layer: WeaveMapLayer;
  path?: string;
  modelId?: string;
  status: WeaveMapNodeStatus;
  notes?: string;
}

export interface WeaveMapEdge {
  id: string;
  from: string;
  to: string;
  relationType: string;
  label?: string;
  status: WeaveMapEdgeStatus;
  notes?: string;
}

export interface WeaveMapModel {
  focusNodeId: string;
  nodes: WeaveMapNode[];
  edges: WeaveMapEdge[];
}
