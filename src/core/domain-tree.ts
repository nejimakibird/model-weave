import type { DomainEntry } from "../types/models";

export interface DomainTreeNode {
  domain: DomainEntry;
  children: DomainTreeNode[];
}

export function buildDomainTree(domains: DomainEntry[]): DomainTreeNode[] {
  const nodes = new Map<string, DomainTreeNode>();
  const roots: DomainTreeNode[] = [];

  for (const domain of domains) {
    nodes.set(domain.id, {
      domain,
      children: []
    });
  }

  for (const domain of domains) {
    const node = nodes.get(domain.id);
    if (!node) {
      continue;
    }

    const parent = domain.parent ? nodes.get(domain.parent) : undefined;
    if (!parent || domain.parent === domain.id || hasAncestor(parent, domain.id, nodes)) {
      roots.push(node);
      continue;
    }

    parent.children.push(node);
  }

  return roots;
}

function hasAncestor(
  node: DomainTreeNode,
  targetId: string,
  nodes: Map<string, DomainTreeNode>
): boolean {
  const seen = new Set<string>();
  let current: DomainTreeNode | undefined = node;

  while (current?.domain.parent) {
    if (current.domain.id === targetId || seen.has(current.domain.id)) {
      return true;
    }
    seen.add(current.domain.id);
    current = nodes.get(current.domain.parent);
  }

  return current?.domain.id === targetId;
}
