import type { DiagramEdge } from "../types/models";

export interface GraphLayoutNode<TNode> {
  node: TNode;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GraphLayoutResult<TNode extends { id: string }> {
  nodes: Array<GraphLayoutNode<TNode>>;
  byId: Record<string, GraphLayoutNode<TNode>>;
  width: number;
  height: number;
}

interface LayoutSlot {
  col: number;
  row: number;
  centerDistance: number;
}

export function buildGraphLayout<TNode extends { id: string }>(
  nodes: TNode[],
  edges: Array<Pick<DiagramEdge, "source" | "target">>,
  options: {
    getWidth: (node: TNode) => number;
    getHeight: (node: TNode) => number;
    canvasPadding: number;
    columnGap: number;
    rowGap: number;
    minColumns?: number;
    maxColumns?: number;
  }
): GraphLayoutResult<TNode> {
  if (nodes.length === 0) {
    return {
      nodes: [],
      byId: {},
      width: options.canvasPadding * 2,
      height: options.canvasPadding * 2
    };
  }

  const nodeSizes = new Map<string, { width: number; height: number }>();
  const originalIndex = new Map<string, number>();
  for (const [index, node] of nodes.entries()) {
    nodeSizes.set(node.id, {
      width: options.getWidth(node),
      height: options.getHeight(node)
    });
    originalIndex.set(node.id, index);
  }

  const maxWidth = Math.max(...nodes.map((node) => nodeSizes.get(node.id)?.width ?? 0));
  const maxHeight = Math.max(...nodes.map((node) => nodeSizes.get(node.id)?.height ?? 0));
  const columnCount = clamp(
    deriveColumnCount(nodes.length),
    options.minColumns ?? 1,
    options.maxColumns ?? 4
  );
  const rowCount = Math.ceil(nodes.length / columnCount);
  const cellWidth = maxWidth + options.columnGap;
  const cellHeight = maxHeight + options.rowGap;

  const degrees = buildDegreeMap(nodes, edges);
  const neighborMap = buildNeighborMap(nodes, edges, originalIndex);
  const sortedNodes = [...nodes].sort((left, right) => {
    const degreeDelta = (degrees.get(right.id) ?? 0) - (degrees.get(left.id) ?? 0);
    if (degreeDelta !== 0) {
      return degreeDelta;
    }

    const barycenterDelta =
      getNeighborBarycenter(left.id, neighborMap) -
      getNeighborBarycenter(right.id, neighborMap);
    if (barycenterDelta !== 0) {
      return barycenterDelta;
    }

    return (originalIndex.get(left.id) ?? 0) - (originalIndex.get(right.id) ?? 0);
  });

  const slots = buildSlots(columnCount, rowCount);
  const slotAssignments = new Map<string, LayoutSlot>();
  for (const [index, node] of sortedNodes.entries()) {
    const slot = slots[index];
    if (slot) {
      slotAssignments.set(node.id, slot);
    }
  }

  optimizeAssignments(slotAssignments, nodes, edges, columnCount);

  const layouts: Array<GraphLayoutNode<TNode>> = [];
  const byId: Record<string, GraphLayoutNode<TNode>> = {};

  for (const node of nodes) {
    const slot = slotAssignments.get(node.id);
    if (!slot) {
      continue;
    }

    const size = nodeSizes.get(node.id) ?? { width: maxWidth, height: maxHeight };
    const x =
      options.canvasPadding +
      slot.col * cellWidth +
      Math.max(0, (maxWidth - size.width) / 2);
    const y =
      options.canvasPadding +
      slot.row * cellHeight +
      Math.max(0, (maxHeight - size.height) / 2);

    const layout: GraphLayoutNode<TNode> = {
      node,
      x,
      y,
      width: size.width,
      height: size.height
    };

    layouts.push(layout);
    byId[node.id] = layout;
  }

  return {
    nodes: layouts,
    byId,
    width: options.canvasPadding * 2 + columnCount * maxWidth + Math.max(0, columnCount - 1) * options.columnGap,
    height: options.canvasPadding * 2 + rowCount * maxHeight + Math.max(0, rowCount - 1) * options.rowGap
  };
}

function deriveColumnCount(nodeCount: number): number {
  if (nodeCount >= 10) {
    return 4;
  }
  if (nodeCount >= 5) {
    return 3;
  }
  if (nodeCount >= 2) {
    return 2;
  }
  return 1;
}

function buildDegreeMap<TNode extends { id: string }>(
  nodes: TNode[],
  edges: Array<Pick<DiagramEdge, "source" | "target">>
): Map<string, number> {
  const degrees = new Map<string, number>();
  for (const node of nodes) {
    degrees.set(node.id, 0);
  }

  for (const edge of edges) {
    degrees.set(edge.source, (degrees.get(edge.source) ?? 0) + 1);
    degrees.set(edge.target, (degrees.get(edge.target) ?? 0) + 1);
  }

  return degrees;
}

function buildNeighborMap<TNode extends { id: string }>(
  nodes: TNode[],
  edges: Array<Pick<DiagramEdge, "source" | "target">>,
  originalIndex: Map<string, number>
): Map<string, number[]> {
  const neighborMap = new Map<string, number[]>();
  for (const node of nodes) {
    neighborMap.set(node.id, []);
  }

  for (const edge of edges) {
    neighborMap.get(edge.source)?.push(originalIndex.get(edge.target) ?? 0);
    neighborMap.get(edge.target)?.push(originalIndex.get(edge.source) ?? 0);
  }

  return neighborMap;
}

function getNeighborBarycenter(
  nodeId: string,
  neighborMap: Map<string, number[]>
): number {
  const indices = neighborMap.get(nodeId) ?? [];
  if (indices.length === 0) {
    return Number.MAX_SAFE_INTEGER;
  }

  return indices.reduce((sum, value) => sum + value, 0) / indices.length;
}

function buildSlots(columnCount: number, rowCount: number): LayoutSlot[] {
  const centerColumn = (columnCount - 1) / 2;
  const centerRow = (rowCount - 1) / 2;
  const slots: LayoutSlot[] = [];

  for (let row = 0; row < rowCount; row += 1) {
    for (let col = 0; col < columnCount; col += 1) {
      const centerDistance =
        Math.abs(col - centerColumn) * 1.2 + Math.abs(row - centerRow);
      slots.push({ col, row, centerDistance });
    }
  }

  return slots.sort((left, right) => {
    if (left.centerDistance !== right.centerDistance) {
      return left.centerDistance - right.centerDistance;
    }

    if (left.row !== right.row) {
      return left.row - right.row;
    }

    return left.col - right.col;
  });
}

function optimizeAssignments<TNode extends { id: string }>(
  assignments: Map<string, LayoutSlot>,
  nodes: TNode[],
  edges: Array<Pick<DiagramEdge, "source" | "target">>,
  columnCount: number
): void {
  const orderedIds = [...nodes.map((node) => node.id)].sort((left, right) => {
    const leftSlot = assignments.get(left);
    const rightSlot = assignments.get(right);
    if (!leftSlot || !rightSlot) {
      return 0;
    }
    if (leftSlot.row !== rightSlot.row) {
      return leftSlot.row - rightSlot.row;
    }
    return leftSlot.col - rightSlot.col;
  });

  for (let pass = 0; pass < 2; pass += 1) {
    for (let index = 0; index < orderedIds.length - 1; index += 1) {
      const leftId = orderedIds[index];
      const rightId = orderedIds[index + 1];
      const leftSlot = assignments.get(leftId);
      const rightSlot = assignments.get(rightId);

      if (!leftSlot || !rightSlot) {
        continue;
      }

      const rowGap = Math.abs(leftSlot.row - rightSlot.row);
      const colGap = Math.abs(leftSlot.col - rightSlot.col);
      if (rowGap + colGap !== 1) {
        continue;
      }

      const currentCost = estimateLayoutCost(assignments, edges, columnCount);
      assignments.set(leftId, rightSlot);
      assignments.set(rightId, leftSlot);
      const swappedCost = estimateLayoutCost(assignments, edges, columnCount);

      if (swappedCost >= currentCost) {
        assignments.set(leftId, leftSlot);
        assignments.set(rightId, rightSlot);
      }
    }
  }
}

function estimateLayoutCost(
  assignments: Map<string, LayoutSlot>,
  edges: Array<Pick<DiagramEdge, "source" | "target">>,
  columnCount: number
): number {
  let cost = 0;

  for (const edge of edges) {
    const source = assignments.get(edge.source);
    const target = assignments.get(edge.target);
    if (!source || !target) {
      continue;
    }

    const dx = Math.abs(source.col - target.col);
    const dy = Math.abs(source.row - target.row);
    cost += dx * 3 + dy * 2;

    if (dx > Math.max(1, columnCount - 2)) {
      cost += 2;
    }
  }

  return cost;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
