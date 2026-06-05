export function sanitizeMermaidId(input: string): string {
  const normalized = (input || "node").replace(/[^A-Za-z0-9_]/g, "_");
  if (/^[A-Za-z_]/.test(normalized)) {
    return normalized;
  }
  return `N_${normalized}`;
}

export function ensureUniqueMermaidId(
  baseId: string,
  usedIds: Set<string>
): string {
  let candidate = baseId || "node";
  let index = 2;
  while (usedIds.has(candidate)) {
    candidate = `${baseId}_${index}`;
    index += 1;
  }
  usedIds.add(candidate);
  return candidate;
}

export function escapeMermaidLabel(input: string): string {
  return splitMermaidTextLines(input)
    .map(escapeMermaidTextSegment)
    .join("<br/>");
}

export function escapeMermaidEdgeLabel(input: string): string {
  return escapeMermaidTextSegment(input)
    .replace(/[[\]{}()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function toMermaidQuotedLabel(input: string): string {
  return `"${splitMermaidTextLines(input)
    .map(escapeMermaidQuotedTextSegment)
    .join("<br/>")}"`;
}

export function formatMermaidMember(input: string): string {
  return escapeMermaidTextSegment(input)
    .replace(/\s+/g, " ")
    .trim();
}

function splitMermaidTextLines(input: string): string[] {
  return String(input).replace(/\r\n?/g, "\n").split("\n");
}

function escapeMermaidTextSegment(input: string): string {
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/\|/g, "/")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\[/g, "&#91;")
    .replace(/\]/g, "&#93;");
}

function escapeMermaidQuotedTextSegment(input: string): string {
  return String(input)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\[/g, "#91;")
    .replace(/\]/g, "#93;");
}
