import {
  formatDomainParentUnknownMessage,
  formatAppProcessLocalDomainFieldOverrideMessage,
  formatAppProcessUnknownDomainMessage,
  formatAppProcessUnknownLocalDomainMessage
} from "./domain-diagnostics";
import { resolveDomainSources } from "./domain-diagram-resolver";
import type { ModelingVaultIndex } from "./vault-index";
import type {
  AppProcessModel,
  DomainEntry,
  DomainMergeConflict,
  ResolvedAppProcessDomainPlacement,
  ValidationWarning
} from "../types/models";

const APP_PROCESS_DOMAIN_CONFLICT_FIELDS = ["parent", "kind", "name"] as const;

export function resolveAppProcessDomainPlacement(
  process: AppProcessModel,
  index: ModelingVaultIndex
): ResolvedAppProcessDomainPlacement {
  const localDomains = process.domains ?? [];
  const hasLocalDomains = localDomains.length > 0;
  if (!hasLocalDomains && process.domainSources.length === 0) {
    return {
      process,
      domains: [],
      sourceSummaries: [],
      conflicts: [],
      placements: [],
      warnings: []
    };
  }

  const resolvedSources = process.domainSources.length > 0
    ? resolveDomainSources(process.path, process.domainSources, index)
    : {
        domains: [],
        sourceSummaries: [],
        conflicts: [],
        warnings: []
      };
  const mergeResult = mergeAppProcessDomains(
    resolvedSources.domains,
    localDomains,
    process.path
  );
  const domainsById = new Map(mergeResult.domains.map((domain) => [domain.id, domain]));
  const warnings: ValidationWarning[] = [
    ...resolvedSources.warnings,
    ...mergeResult.warnings,
    ...validateMergedAppProcessDomainParents(process.path, mergeResult.domains)
  ];
  const conflicts = [
    ...resolvedSources.conflicts,
    ...mergeResult.conflicts
  ];
  const placements = (process.steps ?? [])
    .map((step) => {
      const domainId = step.domain?.trim() ?? "";
      if (!domainId) {
        return null;
      }

      const domain = domainsById.get(domainId);
      if (!domain) {
        warnings.push({
          code: "unresolved-reference",
          message: hasLocalDomains && process.domainSources.length === 0
            ? formatAppProcessUnknownLocalDomainMessage(step.id, domainId)
            : formatAppProcessUnknownDomainMessage(step.id, domainId),
          severity: "warning",
          path: process.path,
          field: "Steps.domain",
          context: { stepId: step.id, domainId }
        });
      }

      return {
        stepId: step.id,
        stepLabel: step.label,
        domainId,
        lane: step.lane,
        status: domain ? "resolved" as const : "unresolved" as const,
        domain
      };
    })
    .filter((placement): placement is NonNullable<typeof placement> =>
      Boolean(placement)
    );

  return {
    process,
    domains: mergeResult.domains,
    sourceSummaries: resolvedSources.sourceSummaries,
    conflicts,
    placements,
    warnings
  };
}

function validateMergedAppProcessDomainParents(
  processPath: string,
  domains: DomainEntry[]
): ValidationWarning[] {
  const domainIds = new Set(domains.map((domain) => domain.id));
  const warnings: ValidationWarning[] = [];

  for (const domain of domains) {
    if (!domain.parent || domain.parent === domain.id || domainIds.has(domain.parent)) {
      continue;
    }

    warnings.push({
      code: "unresolved-reference",
      message: formatDomainParentUnknownMessage(domain.parent),
      severity: "warning",
      path: processPath,
      field: "Domains.parent",
      context: { rowIndex: domain.rowIndex + 1 }
    });
  }

  return warnings;
}

function mergeAppProcessDomains(
  externalDomains: DomainEntry[],
  localDomains: DomainEntry[],
  processPath: string
): {
  domains: DomainEntry[];
  conflicts: DomainMergeConflict[];
  warnings: ValidationWarning[];
} {
  const domainsById = new Map<string, DomainEntry>();
  const order: string[] = [];
  const conflicts: DomainMergeConflict[] = [];
  const warnings: ValidationWarning[] = [];

  for (const domain of externalDomains) {
    if (!domainsById.has(domain.id)) {
      order.push(domain.id);
    }
    domainsById.set(domain.id, { ...domain });
  }

  for (const localDomain of localDomains) {
    const externalDomain = domainsById.get(localDomain.id);
    if (!externalDomain) {
      order.push(localDomain.id);
      domainsById.set(localDomain.id, { ...localDomain });
      continue;
    }

    for (const field of APP_PROCESS_DOMAIN_CONFLICT_FIELDS) {
      const externalValue = externalDomain[field]?.trim() ?? "";
      const localValue = localDomain[field]?.trim() ?? "";
      if (externalValue === localValue) {
        continue;
      }

      conflicts.push({
        domainId: localDomain.id,
        field,
        earlierSourcePath: "Domain Sources",
        laterSourcePath: processPath,
        earlierValue: externalValue,
        laterValue: localValue,
        effectiveSourcePath: processPath,
        severity: "warning"
      });
      warnings.push({
        code: "invalid-structure",
        message: formatAppProcessLocalDomainFieldOverrideMessage(localDomain.id, field),
        severity: "warning",
        path: processPath,
        field: "Domains"
      });
    }

    domainsById.set(localDomain.id, { ...localDomain });
  }

  return {
    domains: order
      .map((id) => domainsById.get(id))
      .filter((domain): domain is DomainEntry => Boolean(domain)),
    conflicts,
    warnings
  };
}
