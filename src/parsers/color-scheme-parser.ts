import { extractMarkdownSections } from "./markdown-sections";
import { parseFrontmatter } from "./frontmatter-parser";
import { parseMarkdownTable } from "./markdown-table";
import { parseSourceLinks } from "./source-links-parser";
import {
  formatColorSchemeDuplicateEntryMessage,
  formatColorSchemeInvalidColorMessage,
  formatColorSchemeKindRequiredMessage
} from "../core/color-scheme";
import type {
  ColorSchemeEntry,
  ColorSchemeModel,
  ValidationWarning
} from "../types/models";

const COLOR_HEADERS = ["target", "kind", "fill", "stroke", "text", "notes"];
const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function parseColorSchemeFile(
  markdown: string,
  path: string
): {
  file: ColorSchemeModel | null;
  warnings: ValidationWarning[];
} {
  const frontmatterResult = parseFrontmatter(markdown);
  const frontmatter = frontmatterResult.file.frontmatter ?? {};
  const sections = extractMarkdownSections(frontmatterResult.file.body);
  const warnings: ValidationWarning[] = frontmatterResult.warnings.map((warning) => ({
    ...warning,
    path: warning.path ?? path
  }));

  const id = typeof frontmatter.id === "string" ? frontmatter.id.trim() : "";
  const name = typeof frontmatter.name === "string" ? frontmatter.name.trim() : "";
  const title = typeof frontmatter.title === "string" ? frontmatter.title.trim() : "";

  if (frontmatter.type !== "color_scheme") {
    warnings.push(createWarning(path, "type", 'expected type "color_scheme"'));
  }
  if (!id) {
    warnings.push(createWarning(path, "id", 'required frontmatter "id" is missing'));
  }

  const colorTable = parseMarkdownTable(sections.Colors, COLOR_HEADERS, path, "Colors");
  warnings.push(...colorTable.warnings);

  const colors: ColorSchemeEntry[] = [];
  const hasInvalidColorHeader = colorTable.warnings.some((warning) =>
    warning.code === "invalid-table-column" && warning.field === "Colors"
  );
  const seenKeys = new Set<string>();
  if (!hasInvalidColorHeader) {
    colorTable.rows.forEach((row, rowIndex) => {
      const target = row.target?.trim() ?? "";
      const kind = row.kind?.trim() ?? "";
      const fill = row.fill?.trim() ?? "";
      const stroke = row.stroke?.trim() ?? "";
      const text = row.text?.trim() ?? "";
      const notes = row.notes?.trim() ?? "";

      if (!kind) {
        warnings.push({
          code: "invalid-structure",
          message: formatColorSchemeKindRequiredMessage(),
          severity: "error",
          path,
          field: "Colors.kind",
          context: { rowIndex: rowIndex + 1 }
        });
        return;
      }

      for (const [field, value] of [
        ["fill", fill],
        ["stroke", stroke],
        ["text", text]
      ] as const) {
        if (value && !HEX_COLOR_PATTERN.test(value)) {
          warnings.push({
            code: "invalid-structure",
            message: formatColorSchemeInvalidColorMessage(field, value),
            severity: "warning",
            path,
            field: `Colors.${field}`,
            context: { rowIndex: rowIndex + 1 }
          });
        }
      }

      const key = `${target.toLowerCase()}::${kind.toLowerCase()}`;
      if (seenKeys.has(key)) {
        warnings.push({
          code: "invalid-structure",
          message: formatColorSchemeDuplicateEntryMessage(target, kind),
          severity: "warning",
          path,
          field: "Colors.kind",
          context: { rowIndex: rowIndex + 1 }
        });
      }
      seenKeys.add(key);

      colors.push({
        target: target || undefined,
        kind,
        fill: fill || undefined,
        stroke: stroke || undefined,
        text: text || undefined,
        notes: notes || undefined,
        rowIndex
      });
    });
  }
  const fallbackTitle = name || title || id || getFileStem(path) || "Untitled Color Scheme";

  return {
    file: {
      fileType: "color-scheme",
      schema: "color_scheme",
      path,
      title: fallbackTitle,
      frontmatter,
      sections,
      sourceLinks: parseSourceLinks(sections["Source Links"]),
      id,
      name: name || title || fallbackTitle,
      colors
    },
    warnings
  };
}

function createWarning(
  path: string,
  field: string,
  message: string
): ValidationWarning {
  return {
    code: "invalid-structure",
    message,
    severity: "warning",
    path,
    field
  };
}

function getFileStem(path: string): string {
  return path.replace(/\\/g, "/").split("/").pop()?.replace(/\.md$/i, "") ?? "";
}
