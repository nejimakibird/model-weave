export type AddAppProcessFlowStatus = "added" | "duplicate" | "missing-steps" | "invalid";

export interface AddAppProcessFlowInput {
  from: string;
  to: string;
}

export interface AddAppProcessFlowResult {
  updatedMarkdown: string;
  changed: boolean;
  status: AddAppProcessFlowStatus;
}

const FLOWS_HEADER = "| from | to | condition | label | notes |";
const FLOWS_SEPARATOR = "|---|---|---|---|---|";

interface SectionBounds {
  headingIndex: number;
  contentStartIndex: number;
  endIndex: number;
}

export function addAppProcessFlow(
  markdown: string,
  input: AddAppProcessFlowInput
): AddAppProcessFlowResult {
  const from = input.from.trim();
  const to = input.to.trim();
  if (!from || !to) {
    return unchanged(markdown, "invalid");
  }

  const newline = markdown.includes("\r\n") ? "\r\n" : "\n";
  const normalized = markdown.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const hadFinalNewline = normalized.endsWith("\n");
  if (hadFinalNewline) {
    lines.pop();
  }

  const steps = findSection(lines, "Steps");
  if (!steps) {
    return unchanged(markdown, "missing-steps");
  }

  const flows = findSection(lines, "Flows");
  if (flows) {
    if (hasDuplicateFlow(lines, flows, from, to)) {
      return unchanged(markdown, "duplicate");
    }
    const insertIndex = findExistingFlowsAppendIndex(lines, flows);
    lines.splice(insertIndex, 0, formatFlowRow(from, to));
  } else {
    const insertLines = [
      "",
      "## Flows",
      "",
      FLOWS_HEADER,
      FLOWS_SEPARATOR,
      formatFlowRow(from, to),
      ""
    ];
    lines.splice(steps.endIndex, 0, ...insertLines);
  }

  const updated = lines.join("\n") + (hadFinalNewline ? "\n" : "");
  return {
    updatedMarkdown: newline === "\r\n" ? updated.replace(/\n/g, "\r\n") : updated,
    changed: true,
    status: "added"
  };
}

function unchanged(
  markdown: string,
  status: Exclude<AddAppProcessFlowStatus, "added">
): AddAppProcessFlowResult {
  return {
    updatedMarkdown: markdown,
    changed: false,
    status
  };
}

function findSection(lines: string[], heading: string): SectionBounds | null {
  const target = heading.trim().toLowerCase();
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^##\s+(.+?)\s*$/);
    if (!match || match[1].trim().toLowerCase() !== target) {
      continue;
    }

    let endIndex = lines.length;
    for (let next = index + 1; next < lines.length; next += 1) {
      if (/^##\s+/.test(lines[next])) {
        endIndex = next;
        break;
      }
    }

    return {
      headingIndex: index,
      contentStartIndex: index + 1,
      endIndex
    };
  }

  return null;
}

function hasDuplicateFlow(
  lines: string[],
  flows: SectionBounds,
  from: string,
  to: string
): boolean {
  for (let index = flows.contentStartIndex; index < flows.endIndex; index += 1) {
    const cells = parseMarkdownTableRow(lines[index]);
    if (!cells || isSeparatorRow(cells)) {
      continue;
    }
    if (cells[0] === "from" && cells[1] === "to") {
      continue;
    }
    if (cells[0] === from && cells[1] === to) {
      return true;
    }
  }
  return false;
}

function findExistingFlowsAppendIndex(lines: string[], flows: SectionBounds): number {
  let appendIndex = flows.endIndex;
  for (let index = flows.contentStartIndex; index < flows.endIndex; index += 1) {
    if (parseMarkdownTableRow(lines[index])) {
      appendIndex = index + 1;
    }
  }
  return appendIndex;
}

function parseMarkdownTableRow(line: string): string[] | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) {
    return null;
  }
  return trimmed.slice(1, -1).split("|").map((cell) => cell.trim());
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function formatFlowRow(from: string, to: string): string {
  return "| " + from + " | " + to + " |  |  |  |";
}
