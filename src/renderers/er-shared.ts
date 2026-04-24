import type { ErColumn } from "../types/models";

const SVG_NS = "http://www.w3.org/2000/svg";
const DEFAULT_COLUMN_LIMIT = 5;
const ER_LABEL_BG = "#ffffff";
const ER_LABEL_BORDER = "#e5e7eb";
const ER_LABEL_TEXT = "#111827";

export function getVisibleErColumns(
  columns: ErColumn[],
  options?: {
    highlightedColumns?: string[];
    limit?: number;
  }
): string[] {
  const highlighted = new Set(
    (options?.highlightedColumns ?? []).map((value) => value.trim()).filter(Boolean)
  );
  const limit = options?.limit ?? DEFAULT_COLUMN_LIMIT;
  const prioritized = [...columns].sort((left, right) => {
    const leftScore = getColumnPriority(left, highlighted);
    const rightScore = getColumnPriority(right, highlighted);

    if (leftScore !== rightScore) {
      return rightScore - leftScore;
    }

    return columns.indexOf(left) - columns.indexOf(right);
  });

  const visible = prioritized.slice(0, limit).map(formatErColumnLabel);
  if (columns.length > limit) {
    visible.push("...");
  }

  return visible;
}

export function createErCardinalityBadge(
  x: number,
  y: number,
  value: string
): SVGGElement {
  const group = document.createElementNS(SVG_NS, "g");
  const width = Math.max(34, value.length * 8 + 12);
  const height = 20;

  const rect = document.createElementNS(SVG_NS, "rect");
  rect.setAttribute("x", String(x - width / 2));
  rect.setAttribute("y", String(y - height / 2));
  rect.setAttribute("width", String(width));
  rect.setAttribute("height", String(height));
  rect.setAttribute("rx", "10");
  rect.setAttribute("fill", ER_LABEL_BG);
  rect.setAttribute("stroke", ER_LABEL_BORDER);
  group.appendChild(rect);

  const text = document.createElementNS(SVG_NS, "text");
  text.setAttribute("x", String(x));
  text.setAttribute("y", String(y + 4));
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("font-size", "11px");
  text.setAttribute("font-weight", "600");
  text.setAttribute("fill", ER_LABEL_TEXT);
  text.textContent = value;
  group.appendChild(text);

  return group;
}

export function formatErColumnLabel(column: ErColumn): string {
  const parts = [`${column.logicalName} / ${column.physicalName}`, `: ${column.dataType}`];
  if (column.pk) {
    parts.push(" [PK]");
  }
  return parts.join("");
}

function getColumnPriority(column: ErColumn, highlighted: Set<string>): number {
  if (
    highlighted.has(column.physicalName) ||
    highlighted.has(column.logicalName)
  ) {
    return column.pk ? 5 : 4;
  }

  if (column.pk) {
    return 3;
  }

  const name = `${column.logicalName} ${column.physicalName}`.toLowerCase();
  if (name.includes("id") || name.includes("_cd") || name.includes("code")) {
    return 2;
  }

  return 1;
}
