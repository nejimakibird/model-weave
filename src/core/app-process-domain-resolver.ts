import {
  formatAppProcessUnknownDomainMessage,
  formatAppProcessUnknownLocalDomainMessage
} from "./domain-diagnostics";
import { resolveDomainSources } from "./domain-diagram-resolver";
import type { ModelingVaultIndex } from "./vault-index";
import type {
  AppProcessModel,
  ResolvedAppProcessDomainPlacement,
  ValidationWarning
} from "../types/models";

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
  const domainsById = new Map(localDomains.map((domain) => [domain.id, domain]));
  for (const domain of resolvedSources.domains) {
    if (!domainsById.has(domain.id)) {
      domainsById.set(domain.id, domain);
    }
  }
  const warnings: ValidationWarning[] = [...resolvedSources.warnings];
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
          message: hasLocalDomains
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
    domains: [...domainsById.values()],
    sourceSummaries: resolvedSources.sourceSummaries,
    conflicts: resolvedSources.conflicts,
    placements,
    warnings
  };
}
