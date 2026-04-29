import type {
  DiagramNode,
  DfdDiagramModel,
  DfdObjectModel,
  ResolvedDiagram
} from "../types/models";

export function buildDfdObjectScene(
  object: DfdObjectModel
): ResolvedDiagram {
  const nodes = new Map<string, DiagramNode & { object?: DfdObjectModel }>();
  const warnings: ResolvedDiagram["warnings"] = [];

  nodes.set(object.id, {
    id: object.id,
    ref: object.id,
    kind: object.kind,
    object
  });

  const diagram: DfdDiagramModel = {
    fileType: "dfd-diagram",
    schema: "dfd_diagram",
    path: object.path,
    title: `${object.name} related`,
    frontmatter: {
      type: "dfd_diagram",
      id: `${object.id}-related`,
      name: `${object.name} related`
    },
    sections: {},
    id: `${object.id}-related`,
    name: `${object.name} related`,
    kind: "dfd",
    objectRefs: Array.from(nodes.keys()),
    objectEntries: [
      {
        id: object.id,
        label: object.name,
        kind: object.kind,
        ref: object.id,
        rowIndex: 0,
        compatibilityMode: "explicit"
      }
    ],
    nodes: Array.from(nodes.values()).map(({ object: ignored, ...node }) => node),
    edges: [],
    flows: []
  };

  return {
    diagram,
    nodes: Array.from(nodes.values()),
    edges: [],
    missingObjects: [],
    warnings
  };
}
