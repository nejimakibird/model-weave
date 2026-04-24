import {
  parseReferenceValue,
  resolveReferenceIdentity,
  resolveErEntityReference,
  resolveObjectModelReference
} from "./reference-resolver";
import type { ModelingVaultIndex } from "./vault-index";
import type { ResolvedObjectContext } from "./object-context-resolver";
import type {
  DataObjectModel,
  ErEntity,
  DfdObjectModel,
  ObjectModel,
  ResolvedDiagram,
  ValidationWarning
} from "../types/models";

const CLASS_RELATION_KINDS = new Set([
  "association",
  "dependency",
  "inheritance",
  "implementation",
  "aggregation",
  "composition"
]);

export function buildCurrentObjectDiagnostics(
  model: ObjectModel | ErEntity | DfdObjectModel | DataObjectModel,
  index: ModelingVaultIndex,
  context: ResolvedObjectContext | null,
  warnings: ValidationWarning[]
): ValidationWarning[] {
  const diagnostics = warnings.map((warning: ValidationWarning) =>
    normalizeDiagnosticSeverity(warning)
  );

  if (model.fileType === "object") {
    diagnostics.push(...buildClassDiagnostics(model, index));
  } else if (model.fileType === "dfd-object") {
    diagnostics.push(...buildDfdObjectDiagnostics(model));
  } else if (model.fileType === "data-object") {
    diagnostics.push(...buildDataObjectDiagnostics(model, index));
  } else {
    diagnostics.push(...buildErEntityDiagnostics(model, index));
  }

  if (context) {
    diagnostics.push(...context.warnings.map((warning) => normalizeDiagnosticSeverity(warning)));
  }

  return dedupeDiagnostics(diagnostics);
}

function buildDfdObjectDiagnostics(model: DfdObjectModel): ValidationWarning[] {
  const diagnostics: ValidationWarning[] = [];

  if (!model.id) {
    diagnostics.push({
      code: "invalid-structure",
      message: 'required frontmatter "id" is missing',
      severity: "error",
      path: model.path,
      field: "id",
      context: {
        section: "frontmatter"
      }
    });
  }

  return diagnostics;
}

function buildDataObjectDiagnostics(
  model: DataObjectModel,
  index: ModelingVaultIndex
): ValidationWarning[] {
  const diagnostics: ValidationWarning[] = [];

  for (const field of model.fields) {
    const ref = field.ref?.trim();
    if (!ref) {
      continue;
    }

    const parsed = parseReferenceValue(ref);
    if (parsed?.isExternal || parsed?.kind === "raw") {
      continue;
    }

    const resolved = resolveReferenceIdentity(ref, index);
    if (resolved.resolvedModel) {
      continue;
    }

    diagnostics.push({
      code: "unresolved-reference",
      message: `unresolved field reference "${ref}"`,
      severity: "warning",
      path: model.path,
      field: "Fields",
      context: {
        section: "Fields"
      }
    });
  }

  return diagnostics;
}

export function buildCurrentDiagramDiagnostics(
  diagram: ResolvedDiagram,
  warnings: ValidationWarning[]
): ValidationWarning[] {
  return dedupeDiagnostics(warnings.map((warning) => normalizeDiagnosticSeverity(warning)));
}

function buildClassDiagnostics(
  model: ObjectModel,
  index: ModelingVaultIndex
): ValidationWarning[] {
  const diagnostics: ValidationWarning[] = [];

  for (const relation of model.relations) {
    if (!resolveObjectModelReference(relation.targetClass, index)) {
      diagnostics.push({
        code: "unresolved-reference",
        message: `unresolved class relation target "${relation.targetClass}"`,
        severity: "warning",
        path: model.path,
        field: "Relations",
        context: {
          relatedId: relation.id,
          section: "Relations"
        }
      });
    }

    if (!CLASS_RELATION_KINDS.has(relation.kind)) {
      diagnostics.push({
        code: "invalid-kind",
        message: `invalid class relation kind "${relation.kind}"`,
        severity: "warning",
        path: model.path,
        field: "Relations",
        context: {
          relatedId: relation.id,
          section: "Relations"
        }
      });
    }
  }

  return diagnostics;
}

function buildErEntityDiagnostics(
  entity: ErEntity,
  index: ModelingVaultIndex
): ValidationWarning[] {
  const diagnostics: ValidationWarning[] = [];
  const localColumnNames = new Set(entity.columns.map((column) => column.physicalName));

  if (entity.relationBlocks.length === 0) {
    diagnostics.push({
      code: "section-missing",
      message: 'No relations are defined in "## Relations".',
      severity: "info",
      path: entity.path,
      field: "Relations",
      context: {
        section: "Relations"
      }
    });
  }

  for (const relationBlock of entity.relationBlocks) {
    if (!relationBlock.cardinality) {
      diagnostics.push({
        code: "section-missing",
        message: `relation "${relationBlock.id}" does not specify cardinality`,
        severity: "info",
        path: entity.path,
        field: "Relations",
        context: {
          relatedId: relationBlock.id,
          section: "Relations"
        }
      });
    }

    if (!relationBlock.targetTable) {
      diagnostics.push({
        code: "unresolved-reference",
        message: `relation "${relationBlock.id}" does not resolve target_table`,
        severity: "warning",
        path: entity.path,
        field: "Relations",
        context: {
          relatedId: relationBlock.id,
          section: "Relations"
        }
      });
      continue;
    }

    const targetEntity = resolveErEntityReference(relationBlock.targetTable, index);
    if (!targetEntity) {
      diagnostics.push({
        code: "unresolved-reference",
        message: `relation "${relationBlock.id}" target_table "${relationBlock.targetTable}" could not be resolved`,
        severity: "warning",
        path: entity.path,
        field: "Relations",
        context: {
          relatedId: relationBlock.id,
          section: "Relations"
        }
      });
      continue;
    }

    const targetColumnNames = new Set(
      targetEntity.columns.map((column) => column.physicalName)
    );

    for (const mapping of relationBlock.mappings) {
      if (mapping.localColumn && !localColumnNames.has(mapping.localColumn)) {
        diagnostics.push({
          code: "unresolved-reference",
          message: `relation "${relationBlock.id}" local column "${mapping.localColumn}" does not exist in the current entity`,
          severity: "warning",
          path: entity.path,
          field: "Relations",
          context: {
            relatedId: relationBlock.id,
            section: "Relations"
          }
        });
      }

      if (mapping.targetColumn && !targetColumnNames.has(mapping.targetColumn)) {
        diagnostics.push({
          code: "unresolved-reference",
          message: `relation "${relationBlock.id}" target column "${mapping.targetColumn}" does not exist in "${targetEntity.physicalName}"`,
          severity: "warning",
          path: entity.path,
          field: "Relations",
          context: {
            relatedId: relationBlock.id,
            section: "Relations"
          }
        });
      }
    }
  }

  return diagnostics;
}

function normalizeDiagnosticSeverity(warning: ValidationWarning): ValidationWarning {
  if (warning.severity === "info" || warning.severity === "error") {
    return warning;
  }

  if (
    warning.code === "frontmatter-parse-error" ||
    warning.code === "unknown-schema" ||
    warning.code === "invalid-table-column" ||
    warning.code === "invalid-table-row" ||
    warning.code === "missing-name" ||
    warning.code === "missing-kind"
  ) {
    return { ...warning, severity: "error" };
  }

  if (
    warning.code === "invalid-structure" &&
    typeof warning.field === "string" &&
    ["type", "id", "name", "logical_name", "physical_name", "kind"].includes(warning.field)
  ) {
    return { ...warning, severity: "error" };
  }

  return warning;
}

function dedupeDiagnostics(warnings: ValidationWarning[]): ValidationWarning[] {
  return warnings.filter((warning, index) =>
    warnings.findIndex((entry) =>
      entry.code === warning.code &&
      entry.message === warning.message &&
      entry.severity === warning.severity &&
      entry.path === warning.path &&
      entry.field === warning.field
    ) === index
  );
}
