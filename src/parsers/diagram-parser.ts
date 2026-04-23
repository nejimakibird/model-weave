import type {
  ClassRelationEdge,
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
  const type = getString(frontmatter, "type");
  const acceptsErDiagramType = type === "er_diagram";
  const acceptsClassDiagramType = type === "class_diagram";

  if (detectFileType(frontmatter) !== "diagram" || (!acceptsErDiagramType && !acceptsClassDiagramType)) {
    warnings.push(
      createWarning(
        "unknown-schema",
        `diagram parser expected type "er_diagram" or "class_diagram" but received type "${type ?? "none"}"`,
        path,
        "type"
      )
    );

    return {
      file: null,
      warnings
    };
  }

  const sections = extractMarkdownSections(frontmatterResult.file.body);
  const name = getString(frontmatter, "name");
  const objectRows = acceptsErDiagramType
    ? parseErDiagramObjects(sections.Objects, warnings, path)
    : acceptsClassDiagramType
      ? parseClassDiagramObjects(sections.Objects, warnings, path)
      : null;
  const objectRefs = objectRows
    ? objectRows.map((row) => row.ref)
    : [];
  const classDiagramRelations = acceptsClassDiagramType
    ? parseClassDiagramRelations(sections.Relations, warnings, path)
      : [];
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
      schema: acceptsErDiagramType ? "er_diagram" : "class_diagram",
      path,
      title: getString(frontmatter, "title"),
      frontmatter,
      sections,
      name: name ?? getString(frontmatter, "id") ?? "unknown",
      kind: acceptsErDiagramType ? "er" : "class",
      objectRefs,
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

function createWarning(
  code:
    | "missing-name"
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
  code: "section-missing",
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
