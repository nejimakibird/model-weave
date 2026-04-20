import type { GenericFrontmatter, ValidationWarning } from "../types/models";

export interface FrontmatterParseOutput {
  frontmatter?: GenericFrontmatter;
  body: string;
}

export interface FrontmatterParseResult {
  file: FrontmatterParseOutput;
  warnings: ValidationWarning[];
}

export function parseFrontmatter(markdown: string): FrontmatterParseResult {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const warnings: ValidationWarning[] = [];

  if (!normalized.startsWith("---\n")) {
    return {
      file: {
        body: normalized
      },
      warnings
    };
  }

  const lines = normalized.split("\n");
  let closingIndex = -1;

  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index].trim() === "---") {
      closingIndex = index;
      break;
    }
  }

  if (closingIndex === -1) {
    warnings.push(createWarning("frontmatter parse error: missing closing delimiter"));

    return {
      file: {
        body: normalized
      },
      warnings
    };
  }

  const frontmatterLines = lines.slice(1, closingIndex);
  const body = lines.slice(closingIndex + 1).join("\n");
  const parsed = parseYamlLikeFrontmatter(frontmatterLines);

  warnings.push(...parsed.warnings);

  return {
    file: {
      frontmatter: parsed.frontmatter,
      body
    },
    warnings
  };
}

function parseYamlLikeFrontmatter(
  lines: string[]
): {
  frontmatter?: GenericFrontmatter;
  warnings: ValidationWarning[];
} {
  const warnings: ValidationWarning[] = [];
  const frontmatter: GenericFrontmatter = {};
  let activeListKey: string | null = null;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const listItemMatch = rawLine.match(/^\s*-\s+(.+)$/);
    if (listItemMatch) {
      if (!activeListKey) {
        warnings.push(
          createWarning(
            `frontmatter parse error: unexpected list item "${trimmed}"`
          )
        );
        continue;
      }

      const currentValue = frontmatter[activeListKey];
      if (!Array.isArray(currentValue)) {
        frontmatter[activeListKey] = [];
      }

      (frontmatter[activeListKey] as unknown[]).push(
        parseScalarValue(listItemMatch[1].trim())
      );
      continue;
    }

    activeListKey = null;

    const keyValueMatch = rawLine.match(/^\s*([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!keyValueMatch) {
      warnings.push(
        createWarning(`frontmatter parse error: malformed line "${trimmed}"`)
      );
      continue;
    }

    const [, key, rawValue] = keyValueMatch;
    const value = rawValue.trim();

    if (!value) {
      frontmatter[key] = [];
      activeListKey = key;
      continue;
    }

    frontmatter[key] = parseScalarValue(value);
  }

  return {
    frontmatter,
    warnings
  };
}

function parseScalarValue(value: string): unknown {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  if (/^\[(.*)\]$/.test(value)) {
    const inner = value.slice(1, -1).trim();
    if (!inner) {
      return [];
    }

    return inner.split(",").map((entry) => stripQuotes(entry.trim()));
  }

  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }

  return stripQuotes(value);
}

function stripQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function createWarning(message: string): ValidationWarning {
  return {
    code: "frontmatter-parse-error",
    message,
    severity: "warning"
  };
}
