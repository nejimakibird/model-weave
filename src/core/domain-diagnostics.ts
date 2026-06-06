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
