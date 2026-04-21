import {
  CORE_DIAGRAM_KINDS,
  RESERVED_DIAGRAM_KINDS
} from "../types/enums";
import type {
  ClassRelationEdge,
  DiagramKind,
  DiagramEdge,
  DiagramModel,
  DiagramNode,
  GenericFrontmatter,
  ParseResult,
  ValidationWarning
} from "../types/models";
import { normalizeReferenceTarget } from "../core/reference-resolver";
import { detectFileType } from "../core/schema-detector";
import { parseFrontmatter } from "./frontmatter-parser";
import { extractMarkdownSections } from "./markdown-sections";
import { parseMarkdownTable } from "./markdown-table";

const ER_DIAGRAM_OBJECT_HEADERS = ["ref", "notes"] as const;
const CLASS_DIAGRAM_OBJECT_HEADERS = ["ref", "notes"] as const;
const CLASS_DIAGRAM_RELATION_HEADERS = [
  "id",
  "from",
  "to",
  "kind",
  "label",
  "from_multiplicity",
  "to_multiplicity",
  "notes"
] as const;

export function parseDiagramFile(
  markdown: string,
  path: string
): ParseResult<DiagramModel> {
  const frontmatterResult = parseFrontmatter(markdown);
  const warnings = [...frontmatterResult.warnings];
  const frontmatter = frontmatterResult.file.frontmatter ?? {};
  const schema = getString(frontmatter, "schema");
  const type = getString(frontmatter, "type");
  const acceptsErDiagramType = type === "er_diagram";
  const acceptsClassDiagramType = type === "class_diagram";

  if (
    detectFileType(frontmatter) !== "diagram" ||
    (!acceptsErDiagramType && !acceptsClassDiagramType && schema !== "diagram_v1")
  ) {
    warnings.push(
      createWarning(
        "unknown-schema",
        `diagram parser expected schema "diagram_v1" or type "er_diagram" / "class_diagram" but received schema "${schema ?? "none"}" / type "${type ?? "none"}"`,
        path,
        acceptsErDiagramType || acceptsClassDiagramType ? "type" : "schema"
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
  const objectRows = acceptsErDiagramType
    ? parseErDiagramObjects(sections.Objects, warnings, path)
    : acceptsClassDiagramType
      ? parseClassDiagramObjects(sections.Objects, warnings, path)
      : null;
  const objectRefs = objectRows
    ? objectRows.map((row) => row.ref)
    : parseObjectRefs(sections.Objects, warnings, path);
  const classDiagramRelations = acceptsClassDiagramType
    ? parseClassDiagramRelations(sections.Relations, warnings, path)
    : [];
  const autoRelations = normalizeAutoRelations(frontmatter.auto_relations);
  const nodes = objectRows
    ? objectRows.map(
        (row): DiagramNode => ({
          id: row.ref,
          ref: row.ref,
          metadata: row.notes ? { notes: row.notes } : undefined
        })
      )
    : objectRefs.map((ref): DiagramNode => ({
        id: normalizeReferenceTarget(ref),
        ref
      }));

  if (!name) {
    warnings.push(
      createWarning("missing-name", 'missing required field "name"', path, "name")
    );
  }

  if (!acceptsErDiagramType && !acceptsClassDiagramType && !rawDiagramKind) {
    warnings.push(
      createWarning(
        "missing-kind",
        'missing required field "diagram_kind"',
        path,
        "diagram_kind"
      )
    );
  } else if (
    !acceptsErDiagramType &&
    !acceptsClassDiagramType &&
    rawDiagramKind &&
    isReservedDiagramKind(rawDiagramKind)
  ) {
    warnings.push(
      createInfoWarning(
        "reserved-diagram-kind-used",
        `reserved kind used: "${rawDiagramKind}"`,
        path,
        "diagram_kind"
      )
    );
  } else if (
    !acceptsErDiagramType &&
    !acceptsClassDiagramType &&
    rawDiagramKind &&
    !isCoreDiagramKind(rawDiagramKind)
  ) {
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
      kind: acceptsErDiagramType
        ? "er"
        : acceptsClassDiagramType
          ? "class"
          : normalizeDiagramKind(rawDiagramKind),
      objectRefs,
      autoRelations,
      nodes,
      edges: acceptsClassDiagramType
        ? classDiagramRelations.map(classRelationToDiagramEdge)
        : []
    },
    warnings
  };
}

function parseErDiagramObjects(
  lines: string[] | undefined,
  warnings: ValidationWarning[],
  path: string
): Array<{ ref: string; notes?: string }> {
  const table = parseMarkdownTable(
    lines,
    [...ER_DIAGRAM_OBJECT_HEADERS],
    path,
    "Objects"
  );
  warnings.push(...table.warnings);

  const objects: Array<{ ref: string; notes?: string }> = [];
  for (const row of table.rows) {
    const ref = row.ref?.trim();
    if (!ref) {
      warnings.push(
        createWarning(
          "invalid-object-ref",
          'table row in section "Objects" is missing "ref"',
          path,
          "Objects"
        )
      );
      continue;
    }

    const notes = row.notes?.trim();
    objects.push({
      ref,
      notes: notes ? notes : undefined
    });
  }

  return objects;
}

function parseClassDiagramObjects(
  lines: string[] | undefined,
  warnings: ValidationWarning[],
  path: string
): Array<{ ref: string; notes?: string }> {
  const table = parseMarkdownTable(
    lines,
    [...CLASS_DIAGRAM_OBJECT_HEADERS],
    path,
    "Objects"
  );
  warnings.push(...table.warnings);

  const objects: Array<{ ref: string; notes?: string }> = [];
  for (const row of table.rows) {
    const rawRef = row.ref?.trim();
    if (!rawRef) {
      warnings.push(
        createWarning(
          "invalid-object-ref",
          'table row in section "Objects" is missing "ref"',
          path,
          "Objects"
        )
      );
      continue;
    }

    objects.push({
      ref: normalizeReferenceTarget(rawRef),
      notes: row.notes?.trim() || undefined
    });
  }

  return objects;
}

function parseClassDiagramRelations(
  lines: string[] | undefined,
  warnings: ValidationWarning[],
  path: string
): ClassRelationEdge[] {
  const table = parseMarkdownTable(
    lines,
    [...CLASS_DIAGRAM_RELATION_HEADERS],
    path,
    "Relations"
  );
  warnings.push(...table.warnings);

  const relations: ClassRelationEdge[] = [];
  for (const row of table.rows) {
    const id = row.id?.trim();
    const from = normalizeReferenceTarget(row.from?.trim() ?? "");
    const to = normalizeReferenceTarget(row.to?.trim() ?? "");
    const kind = row.kind?.trim();

    if (!id || !from || !to || !kind) {
      warnings.push(
        createWarning(
          "invalid-table-row",
          `table row in section "Relations" is missing required values`,
          path,
          "Relations"
        )
      );
      continue;
    }

    relations.push({
      domain: "class",
      id,
      source: from,
      target: to,
      sourceClass: from,
      targetClass: to,
      kind,
      label: row.label?.trim() || undefined,
      fromMultiplicity: row.from_multiplicity?.trim() || undefined,
      toMultiplicity: row.to_multiplicity?.trim() || undefined,
      notes: row.notes?.trim() || undefined
    });
  }

  return relations;
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
    objectRefs.push(normalizeReferenceTarget(ref));
  }

  return objectRefs;
}

function classRelationToDiagramEdge(relation: ClassRelationEdge): DiagramEdge {
  return {
    id: relation.id,
    source: relation.sourceClass,
    target: relation.targetClass,
    kind: relation.kind as DiagramEdge["kind"],
    label: relation.label,
    metadata: {
      notes: relation.notes,
      sourceCardinality: relation.fromMultiplicity,
      targetCardinality: relation.toMultiplicity
    }
  };
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
    | "invalid-table-row"
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
