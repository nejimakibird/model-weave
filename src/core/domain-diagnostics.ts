export function formatDomainIdRequiredMessage(): string {
  return "Domain id is required.";
}

export function formatDuplicateDomainIdMessage(id: string): string {
  return `duplicate Domain id "${id}"`;
}

export function formatDomainParentUnknownMessage(parent: string): string {
  return `Domain parent "${parent}" is not defined.`;
}

export function formatDomainSelfParentMessage(id: string): string {
  return `Domain "${id}" cannot use itself as parent.`;
}

export function formatDomainParentCycleMessage(chain: string[]): string {
  return `Domain parent cycle detected: ${chain.join(" -> ")}`;
}

export function formatDfdLocalDomainMissingSharedMessage(id: string): string {
  return `DFD-local Domain "${id}" is not defined in shared Domains.`;
}

export function formatDfdLocalDomainFieldMismatchMessage(
  id: string,
  field: "name" | "kind" | "parent",
  localValue: string,
  sharedValue: string
): string {
  return `DFD-local Domain "${id}" has ${field} "${localValue}", but shared Domains define ${field} "${sharedValue}".`;
}

export function formatDfdLocalDomainOverridesSourceMessage(
  id: string,
  field: "name" | "kind" | "parent",
  localValue: string,
  sourceValue: string
): string {
  return `DFD-local Domain "${id}" overrides Domain Source ${field} "${sourceValue}" with "${localValue}".`;
}

export function formatDfdObjectUnknownLocalDomainMessage(
  objectId: string,
  domainId: string
): string {
  return `DFD object "${objectId}" references unknown local Domain "${domainId}".`;
}

export function formatDfdObjectUnknownDomainMessage(
  objectId: string,
  domainId: string
): string {
  return `DFD object "${objectId}" references unknown Domain "${domainId}".`;
}

export function formatDfdObjectDomainWithoutLocalDomainsMessage(
  objectId: string,
  domainId: string
): string {
  return `DFD object "${objectId}" references Domain "${domainId}", but this DFD has no local Domains.`;
}

export function formatStandaloneDomainDuplicateMessage(id: string): string {
  return `Domain "${id}" is defined in multiple Domains files.`;
}

export function formatStandaloneDomainFieldConflictMessage(
  id: string,
  field: "name" | "kind" | "parent"
): string {
  return `Domain "${id}" has conflicting ${field} values across Domains files.`;
}

export function formatDomainDiagramMissingRefMessage(): string {
  return "Domain Source ref is required.";
}

export function formatDomainDiagramUnresolvedSourceMessage(ref: string): string {
  return `Domain Source ref "${ref}" could not be resolved. Check the ID or file name.`;
}

export function formatDomainDiagramInvalidSourceTypeMessage(
  ref: string,
  fileType: string
): string {
  return `Domain Source ref "${ref}" resolves to type "${fileType}", but expected type "domains".`;
}

export function formatDomainDiagramNoValidSourcesMessage(): string {
  return "Domain Diagram has no valid Domain Sources.";
}

export function formatDomainDiagramEmptySourceMessage(ref: string): string {
  return `Domain Source ref "${ref}" has no Domain rows.`;
}

export function formatDomainDiagramDuplicateDomainMessage(
  id: string,
  earlierSource: string,
  laterSource: string
): string {
  return `Domain "${id}" is defined by multiple Domain Diagram sources: "${earlierSource}" and "${laterSource}".`;
}

export function formatDomainDiagramFieldConflictMessage(
  id: string,
  field: "name" | "kind" | "parent",
  earlierSource: string,
  laterSource: string
): string {
  return `Domain "${id}" has conflicting ${field} values between Domain Diagram sources "${earlierSource}" and "${laterSource}".`;
}

export function formatAppProcessUnknownDomainMessage(
  stepId: string,
  domainId: string
): string {
  return `app_process Step "${stepId}" references unknown Domain "${domainId}".`;
}

export function formatAppProcessUnknownLocalDomainMessage(
  stepId: string,
  domainId: string
): string {
  return `app_process Step "${stepId}" references unknown local Domain "${domainId}".`;
}

export function formatAppProcessLocalDomainFieldOverrideMessage(
  id: string,
  field: "name" | "kind" | "parent"
): string {
  return `app_process local Domain "${id}" overrides external Domain ${field}.`;
}
