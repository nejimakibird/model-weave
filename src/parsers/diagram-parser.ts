import {
  CORE_DIAGRAM_KINDS,
  RESERVED_DIAGRAM_KINDS
} from "../types/enums";
import type {
  DiagramKind,
  DiagramModel,
  DiagramNode,
  GenericFrontmatter,
  ParseResult,
  ValidationWarning
} from "../types/models";
import { detectFileType } from "../core/schema-detector";
import { parseFrontmatter } from "./frontmatter-parser";
import { extractMarkdownSections } from "./markdown-sections";

export function parseDiagramFile(
  markdown: string,
  path: string
): ParseResult<DiagramModel> {
  const frontmatterResult = parseFrontmatter(markdown);
  const warnings = [...frontmatterResult.warnings];
  const frontmatter = frontmatterResult.file.frontmatter ?? {};
  const schema = getString(frontmatter, "schema");

  if (detectFileType(frontmatter) !== "diagram" || schema !== "diagram_v1") {
    warnings.push(
      createWarning(
        "unknown-schema",
        `diagram parser expected schema "diagram_v1" but received "${schema ?? "none"}"`,
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
  const rawDiagramKind = getString(frontmatter, "diagram_kind");
  const objectRefs = parseObjectRefs(sections.Objects, warnings, path);
  const autoRelations = normalizeAutoRelations(frontmatter.auto_relations);
  const nodes = objectRefs.map((ref): DiagramNode => ({
    id: ref,
    ref
  }));

  if (!name) {
    warnings.push(
      createWarning("missing-name", 'missing required field "name"', path, "name")
    );
  }

  if (!rawDiagramKind) {
    warnings.push(
      createWarning(
        "missing-kind",
        'missing required field "diagram_kind"',
        path,
        "diagram_kind"
      )
    );
  } else if (isReservedDiagramKind(rawDiagramKind)) {
    warnings.push(
      createInfoWarning(
        "reserved-diagram-kind-used",
        `reserved kind used: "${rawDiagramKind}"`,
        path,
        "diagram_kind"
      )
    );
  } else if (!isCoreDiagramKind(rawDiagramKind)) {
    warnings.push(
      createWarning(
        "invalid-diagram-kind",
        `invalid diagram kind "${rawDiagramKind}"`,
        path,
        "diagram_kind"
      )
    );
  }

  if (!sections.Objects) {
    warnings.push(
      createInfoWarning(
        "section-missing",
        'section missing: "Objects"',
        path,
        "Objects"
      )
    );
  }

  return {
    file: {
      fileType: "diagram",
      schema: "diagram_v1",
      path,
      title: getString(frontmatter, "title"),
      frontmatter,
      sections,
      name: name ?? getString(frontmatter, "id") ?? "unknown",
      kind: normalizeDiagramKind(rawDiagramKind),
      objectRefs,
      autoRelations,
      nodes,
      edges: []
    },
    warnings
  };
}

function parseObjectRefs(
  lines: string[] | undefined,
  warnings: ValidationWarning[],
  path: string
): string[] {
  if (!lines) {
    return [];
  }

  const objectRefs: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const match = trimmed.match(/^-\s+ref\s*:\s*(.+)$/);
    if (!match) {
      warnings.push(
        createWarning(
          "invalid-object-ref",
          `malformed object ref: "${trimmed}"`,
          path,
          "Objects"
        )
      );
      continue;
    }

    const ref = match[1].trim();
    objectRefs.push(ref);
  }

  return objectRefs;
}

function getString(
  frontmatter: GenericFrontmatter,
  key: string
): string | undefined {
  const value = frontmatter[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function isCoreDiagramKind(kind: string): kind is DiagramKind {
  return (CORE_DIAGRAM_KINDS as readonly string[]).includes(kind);
}

function isReservedDiagramKind(kind: string): kind is DiagramKind {
  return (RESERVED_DIAGRAM_KINDS as readonly string[]).includes(kind);
}

function normalizeDiagramKind(kind?: string): DiagramKind {
  if (kind && (isCoreDiagramKind(kind) || isReservedDiagramKind(kind))) {
    return kind;
  }

  return "class";
}

function normalizeAutoRelations(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value.trim().toLowerCase() === "true";
  }

  return false;
}

function createWarning(
  code:
    | "missing-name"
    | "missing-kind"
    | "invalid-diagram-kind"
    | "invalid-object-ref"
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
  code: "reserved-diagram-kind-used" | "section-missing",
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
