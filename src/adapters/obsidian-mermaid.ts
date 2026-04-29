import { loadMermaid } from "obsidian";

export interface MermaidAdapter {
  render: (
    id: string,
    source: string
  ) => Promise<{
    svg: string;
    bindFunctions?: (element: Element) => void;
  }>;
}

// Adapter boundary for Obsidian-provided Mermaid loading.
// Keep core/render preparation on plain strings and view models; only the
// Obsidian plugin layer should care that Mermaid comes from Obsidian.
export async function loadMermaidAdapter(): Promise<MermaidAdapter> {
  return loadMermaid();
}
