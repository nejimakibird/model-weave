import {
  CORE_OBJECT_KINDS,
  RESERVED_OBJECT_KINDS
} from "../types/enums";
import type {
  AttributeModel,
  GenericFrontmatter,
  MethodModel,
  MethodParameterModel,
  ObjectKind,
  ObjectModel,
  ParseResult,
  ValidationWarning
} from "../types/models";
import { detectFileType } from "../core/schema-detector";
import { parseFrontmatter } from "./frontmatter-parser";
import { extractMarkdownSections } from "./markdown-sections";

export function parseObjectFile(
  markdown: string,
  path: string
): ParseResult<ObjectModel> {
  const frontmatterResult = parseFrontmatter(markdown);
  const warnings = [...frontmatterResult.warnings];
  const frontmatter = frontmatterResult.file.frontmatter ?? {};
  const schema = getString(frontmatter, "schema");

  if (detectFileType(frontmatter) !== "object" || schema !== "model_object_v1") {
    warnings.push(
      createWarning(
        "unknown-schema",
        `object parser expected schema "model_object_v1" but received "${schema ?? "none"}"`,
        path,
        "schema"
      )
    );

    return {
      file: null,
      warnings
    };
  }

  const sections = extractMarkdownSections(frontmatterResult.file.body);
  const name = getString(frontmatter, "name");
  const rawKind = getString(frontmatter, "kind");
  const summary = joinSectionLines(sections.Summary);
  const attributes = parseAttributes(sections.Attributes, warnings, path);
  const methods = parseMethods(sections.Methods, warnings, path);

  warnIfMissingSection(sections, "Summary", warnings, path);
  warnIfMissingSection(sections, "Attributes", warnings, path);
  warnIfMissingSection(sections, "Methods", warnings, path);
  warnIfMissingSection(sections, "Notes", warnings, path);

  if (!name) {
    warnings.push(
      createWarning("missing-name", 'missing required field "name"', path, "name")
    );
  }

  if (!rawKind) {
    warnings.push(
      createWarning("missing-kind", 'missing required field "kind"', path, "kind")
    );
  } else if (isReservedObjectKind(rawKind)) {
    warnings.push(
      createInfoWarning(
        "reserved-kind-used",
        `reserved kind used: "${rawKind}"`,
        path,
        "kind"
      )
    );
  } else if (!isCoreObjectKind(rawKind)) {
    warnings.push(
      createWarning("invalid-kind", `invalid kind "${rawKind}"`, path, "kind")
    );
  }

  const file: ObjectModel = {
    fileType: "object",
    schema: "model_object_v1",
    path,
    title: getString(frontmatter, "title"),
    frontmatter,
    sections,
    name: name ?? getString(frontmatter, "id") ?? "unknown",
    kind: normalizeObjectKind(rawKind),
    description: summary || undefined,
    attributes,
    methods
  };

  return {
    file,
    warnings
  };
}

function parseAttributes(
  lines: string[] | undefined,
  warnings: ValidationWarning[],
  path: string
): AttributeModel[] {
  if (!lines) {
    return [];
  }

  const attributes: AttributeModel[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const match = trimmed.match(/^-\s+([^:]+?)\s*:\s*(.+?)(?:\s+-\s+(.+))?$/);
    if (!match) {
      warnings.push(
        createWarning(
          "invalid-attribute-line",
          `malformed attribute line: "${trimmed}"`,
          path,
          "Attributes"
        )
      );
      continue;
    }

    const [, name, type, note] = match;
    attributes.push({
      name: name.trim(),
      type: type.trim(),
      description: note?.trim(),
      raw: trimmed
    });
  }

  return attributes;
}

function parseMethods(
  lines: string[] | undefined,
  warnings: ValidationWarning[],
  path: string
): MethodModel[] {
  if (!lines) {
    return [];
  }

  const methods: MethodModel[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const match = trimmed.match(
      /^-\s+([A-Za-z_][\w]*)\(([^)]*)\)\s+([^\-].*?)(?:\s+-\s+(.+))?$/
    );

    if (!match) {
      warnings.push(
        createWarning(
          "invalid-method-line",
          `malformed method line: "${trimmed}"`,
          path,
          "Methods"
        )
      );
      continue;
    }

    const [, name, rawParameters, rawReturnType, note] = match;
    methods.push({
      name,
      parameters: parseMethodParameters(rawParameters),
      returnType: rawReturnType.trim(),
      description: note?.trim(),
      raw: trimmed
    });
  }

  return methods;
}

function parseMethodParameters(rawParameters: string): MethodParameterModel[] {
  const trimmed = rawParameters.trim();
  if (!trimmed) {
    return [];
  }

  return trimmed.split(",").map((parameter): MethodParameterModel => {
    const value = parameter.trim();
    const match = value.match(/^([A-Za-z_][\w]*)(\?)?\s*:\s*(.+)$/);

    if (!match) {
      return {
        name: value,
        required: true
      };
    }

    const [, name, optionalFlag, type] = match;

    return {
      name,
      type: type.trim(),
      required: optionalFlag !== "?"
    };
  });
}

function warnIfMissingSection(
  sections: Record<string, string[]>,
  sectionName: string,
  warnings: ValidationWarning[],
  path: string
): void {
  if (sections[sectionName]) {
    return;
  }

  warnings.push(
    createInfoWarning(
      "section-missing",
      `section missing: "${sectionName}"`,
      path,
      sectionName
    )
  );
}

function joinSectionLines(lines?: string[]): string {
  if (!lines) {
    return "";
  }

  return lines.map((line) => line.trim()).filter(Boolean).join("\n");
}

function getString(
  frontmatter: GenericFrontmatter,
  key: string
): string | undefined {
  const value = frontmatter[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeObjectKind(kind?: string): ObjectKind {
  if (kind && (isCoreObjectKind(kind) || isReservedObjectKind(kind))) {
    return kind;
  }

  return "class";
}

function isCoreObjectKind(kind: string): kind is ObjectKind {
  return (CORE_OBJECT_KINDS as readonly string[]).includes(kind);
}

function isReservedObjectKind(kind: string): kind is ObjectKind {
  return (RESERVED_OBJECT_KINDS as readonly string[]).includes(kind);
}

function createWarning(
  code:
    | "missing-name"
    | "missing-kind"
    | "invalid-kind"
    | "invalid-attribute-line"
    | "invalid-method-line"
    | "unknown-schema",
  message: string,
  path: string,
  field?: string
): ValidationWarning {
  return {
    code,
    message,
    severity: "warning",
    path,
    field
  };
}

function createInfoWarning(
  code: "reserved-kind-used" | "section-missing",
  message: string,
  path: string,
  field?: string
): ValidationWarning {
  return {
    code,
    message,
    severity: "info",
    path,
    field
  };
}
