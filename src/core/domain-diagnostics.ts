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

export function formatStandaloneDomainDuplicateMessage(id: string): string {
  return `Domain "${id}" is defined in multiple Domains files.`;
}

export function formatStandaloneDomainFieldConflictMessage(
  id: string,
  field: "name" | "kind" | "parent"
): string {
  return `Domain "${id}" has conflicting ${field} values across Domains files.`;
}
