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
  const mermaid: unknown = await loadMermaid();
  if (!isMermaidAdapter(mermaid)) {
    throw new Error("Obsidian Mermaid adapter is unavailable.");
  }
  return mermaid;
}

function isMermaidAdapter(value: unknown): value is MermaidAdapter {
  return (
    typeof value === "object" &&
    value !== null &&
    "render" in value &&
    typeof value.render === "function"
  );
}
