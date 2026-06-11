import {
  formatDomainDiagramDuplicateDomainMessage,
  formatDomainDiagramEmptySourceMessage,
  formatDomainDiagramFieldConflictMessage,
  formatDomainDiagramInvalidSourceTypeMessage,
  formatDomainDiagramNoValidSourcesMessage,
  formatDomainDiagramUnresolvedSourceMessage
} from "./domain-diagnostics";
import { findModelByReference } from "./reference-resolver";
import type { ModelingVaultIndex } from "./vault-index";
import type {
  DomainDiagramModel,
  DomainDiagramSourceSummary,
  DomainEntry,
  DomainMergeConflict,
  DomainSourceRef,
  DomainsModel,
  ResolvedDomainDiagram,
  ValidationWarning
} from "../types/models";

const DOMAIN_CONFLICT_FIELDS = ["parent", "kind", "name"] as const;

export function resolveDomainDiagram(
  diagram: DomainDiagramModel,
  index: ModelingVaultIndex
): ResolvedDomainDiagram {
  const resolvedSources = resolveDomainSources(
    diagram.path,
    diagram.domainSources,
    index,
    { warnWhenNoValidSources: true }
  );

  return {
    diagram,
    domains: resolvedSources.domains,
    sourceSummaries: resolvedSources.sourceSummaries,
    conflicts: resolvedSources.conflicts,
    warnings: resolvedSources.warnings
  };
}

export function resolveDomainSources(
  ownerPath: string,
  sourceRefs: DomainSourceRef[],
  index: ModelingVaultIndex,
  options: { warnWhenNoValidSources?: boolean } = {}
): {
  domains: DomainEntry[];
  sourceSummaries: DomainDiagramSourceSummary[];
  conflicts: DomainMergeConflict[];
  warnings: ValidationWarning[];
} {
  const warnings: ValidationWarning[] = [];
  const sourceSummaries: DomainDiagramSourceSummary[] = [];
  const validSources: Array<{ source: DomainsModel; ref: string }> = [];

  for (const sourceRef of sourceRefs) {
    const resolved = findModelByReference(sourceRef.ref, index);
    if (!resolved) {
      sourceSummaries.push({
        ref: sourceRef,
        status: "unresolved",
        domainCount: 0
      });
      warnings.push(createSourceWarning(
        ownerPath,
        sourceRef.rowIndex,
        formatDomainDiagramUnresolvedSourceMessage(sourceRef.ref),
        "unresolved-reference",
        "warning"
      ));
      continue;
    }

    if (resolved.fileType !== "domains") {
      sourceSummaries.push({
        ref: sourceRef,
        resolvedPath: resolved.path,
        status: "invalid-type",
        domainCount: 0
      });
      warnings.push(createSourceWarning(
        ownerPath,
        sourceRef.rowIndex,
        formatDomainDiagramInvalidSourceTypeMessage(sourceRef.ref, resolved.fileType),
        "invalid-structure",
        "warning"
      ));
      continue;
    }

    sourceSummaries.push({
      ref: sourceRef,
      resolvedPath: resolved.path,
      resolvedId: resolved.id,
      status: resolved.domains.length > 0 ? "ok" : "empty",
      domainCount: resolved.domains.length
    });
    validSources.push({ source: resolved, ref: sourceRef.ref });

    if (resolved.domains.length === 0) {
      warnings.push(createSourceWarning(
        ownerPath,
        sourceRef.rowIndex,
        formatDomainDiagramEmptySourceMessage(sourceRef.ref),
        "invalid-structure",
        "warning"
      ));
    }
  }

  if (validSources.length === 0 && options.warnWhenNoValidSources) {
    warnings.push({
      code: "invalid-structure",
      message: formatDomainDiagramNoValidSourcesMessage(),
      severity: "warning",
      path: ownerPath,
      field: "Domain Sources"
    });
  }

  const mergeResult = mergeDomainDiagramSources(validSources, ownerPath);
  warnings.push(...mergeResult.warnings);

  return {
    domains: mergeResult.domains,
    sourceSummaries,
    conflicts: mergeResult.conflicts,
    warnings
  };
}

export function mergeDomainDiagramSources(
  sources: Array<{ source: DomainsModel; ref?: string }>,
  diagramPath = ""
): {
  domains: DomainEntry[];
  conflicts: DomainMergeConflict[];
  warnings: ValidationWarning[];
} {
  const effectiveById = new Map<
    string,
    { domain: DomainEntry; sourcePath: string }
  >();
  const order: string[] = [];
  const conflicts: DomainMergeConflict[] = [];
  const warnings: ValidationWarning[] = [];

  for (const entry of sources) {
    for (const domain of entry.source.domains) {
      const previous = effectiveById.get(domain.id);
      if (!previous) {
        order.push(domain.id);
        effectiveById.set(domain.id, {
          domain: { ...domain },
          sourcePath: entry.source.path
        });
        continue;
      }

      const duplicateConflict = createConflict(
        domain.id,
        "duplicate",
        previous.sourcePath,
        entry.source.path,
        undefined,
        undefined,
        "error"
      );
      conflicts.push(duplicateConflict);
      warnings.push(createMergeWarning(
        diagramPath || entry.source.path,
        formatDomainDiagramDuplicateDomainMessage(
          domain.id,
          previous.sourcePath,
          entry.source.path
        ),
        duplicateConflict.severity
      ));

      for (const field of DOMAIN_CONFLICT_FIELDS) {
        const previousValue = previous.domain[field]?.trim() ?? "";
        const nextValue = domain[field]?.trim() ?? "";
        if (previousValue === nextValue) {
          continue;
        }

        const severity = field === "name" ? "warning" : "error";
        const conflict = createConflict(
          domain.id,
          field,
          previous.sourcePath,
          entry.source.path,
          previousValue,
          nextValue,
          severity
        );
        conflicts.push(conflict);
        warnings.push(createMergeWarning(
          diagramPath || entry.source.path,
          formatDomainDiagramFieldConflictMessage(
            domain.id,
            field,
            previous.sourcePath,
            entry.source.path
          ),
          severity
        ));
      }

      effectiveById.set(domain.id, {
        domain: { ...domain },
        sourcePath: entry.source.path
      });
    }
  }

  return {
    domains: order
      .map((id) => effectiveById.get(id)?.domain)
      .filter((domain): domain is DomainEntry => Boolean(domain)),
    conflicts,
    warnings
  };
}

function createConflict(
  domainId: string,
  field: DomainMergeConflict["field"],
  earlierSourcePath: string,
  laterSourcePath: string,
  earlierValue: string | undefined,
  laterValue: string | undefined,
  severity: DomainMergeConflict["severity"]
): DomainMergeConflict {
  return {
    domainId,
    field,
    earlierSourcePath,
    laterSourcePath,
    earlierValue,
    laterValue,
    effectiveSourcePath: laterSourcePath,
    severity
  };
}

function createSourceWarning(
  path: string,
  rowIndex: number,
  message: string,
  code: ValidationWarning["code"],
  severity: ValidationWarning["severity"]
): ValidationWarning {
  return {
    code,
    message,
    severity,
    path,
    field: "Domain Sources.ref",
    context: { rowIndex: rowIndex + 1 }
  };
}

function createMergeWarning(
  path: string,
  message: string,
  severity: ValidationWarning["severity"]
): ValidationWarning {
  return {
    code: "invalid-structure",
    message,
    severity,
    path,
    field: "Domain Sources"
  };
}
