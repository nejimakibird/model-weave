import type {
  DfdDiagramModel,
  DomainEntry,
  DomainsModel
} from "../types/models";
import type { ModelingVaultIndex } from "./vault-index";

export interface DomainDefinitionReference {
  path: string;
}

export interface DfdLocalDomainReference {
  path: string;
}

export interface DfdObjectDomainReference {
  path: string;
  objectId: string;
  label?: string;
}

export interface DomainRelationshipSummary {
  domain: DomainEntry;
  parentId?: string;
  childIds: string[];
  definedIn: DomainDefinitionReference[];
  conflicts: Array<"name" | "kind" | "parent">;
  dfdLocalDomainReferences: DfdLocalDomainReference[];
  dfdObjectReferences: DfdObjectDomainReference[];
}

const CONFLICT_FIELDS = ["name", "kind", "parent"] as const;

export function buildDomainRelationshipSummaries(
  model: DomainsModel,
  index: ModelingVaultIndex
): DomainRelationshipSummary[] {
  const currentDomainsById = new Map(model.domains.map((domain) => [domain.id, domain]));
  const childrenByParent = new Map<string, string[]>();

  for (const domain of model.domains) {
    if (!domain.parent || !currentDomainsById.has(domain.parent)) {
      continue;
    }

    if (!childrenByParent.has(domain.parent)) {
      childrenByParent.set(domain.parent, []);
    }
    childrenByParent.get(domain.parent)!.push(domain.id);
  }

  const standaloneDefinitions = collectStandaloneDomainDefinitions(index);
  const dfdLocalReferences = collectDfdLocalDomainReferences(index);
  const dfdObjectReferences = collectDfdObjectDomainReferences(index);

  return model.domains.map((domain) => ({
    domain,
    parentId: domain.parent,
    childIds: [...(childrenByParent.get(domain.id) ?? [])].sort(compareText),
    definedIn: [...(standaloneDefinitions.get(domain.id) ?? [])].sort(compareByPath),
    conflicts: findConflictingFields(standaloneDefinitions.get(domain.id) ?? []),
    dfdLocalDomainReferences: [...(dfdLocalReferences.get(domain.id) ?? [])].sort(compareByPath),
    dfdObjectReferences: [...(dfdObjectReferences.get(domain.id) ?? [])].sort(
      compareDfdObjectReference
    )
  }));
}

function collectStandaloneDomainDefinitions(
  index: ModelingVaultIndex
): Map<string, Array<DomainDefinitionReference & { domain: DomainEntry }>> {
  const definitions = new Map<
    string,
    Array<DomainDefinitionReference & { domain: DomainEntry }>
  >();

  for (const model of Object.values(index.modelsByFilePath)) {
    if (model.fileType !== "domains") {
      continue;
    }

    for (const domain of model.domains) {
      pushMappedValue(definitions, domain.id, {
        path: model.path,
        domain
      });
    }
  }

  return definitions;
}

function collectDfdLocalDomainReferences(
  index: ModelingVaultIndex
): Map<string, DfdLocalDomainReference[]> {
  const references = new Map<string, DfdLocalDomainReference[]>();

  for (const diagram of getDfdDiagrams(index)) {
    for (const domain of diagram.domains ?? []) {
      pushMappedValue(references, domain.id, {
        path: diagram.path
      });
    }
  }

  return references;
}

function collectDfdObjectDomainReferences(
  index: ModelingVaultIndex
): Map<string, DfdObjectDomainReference[]> {
  const references = new Map<string, DfdObjectDomainReference[]>();

  for (const diagram of getDfdDiagrams(index)) {
    for (const entry of diagram.objectEntries) {
      const domain = entry.domain?.trim();
      if (!domain) {
        continue;
      }

      pushMappedValue(references, domain, {
        path: diagram.path,
        objectId: entry.id?.trim() || entry.ref?.trim() || String(entry.rowIndex + 1),
        label: entry.label?.trim() || undefined
      });
    }
  }

  return references;
}

function getDfdDiagrams(index: ModelingVaultIndex): DfdDiagramModel[] {
  return Object.values(index.modelsByFilePath).filter(
    (model): model is DfdDiagramModel => model.fileType === "dfd-diagram"
  );
}

function findConflictingFields(
  definitions: Array<DomainDefinitionReference & { domain: DomainEntry }>
): Array<"name" | "kind" | "parent"> {
  if (definitions.length < 2) {
    return [];
  }

  return CONFLICT_FIELDS.filter((field) => {
    const values = new Set(
      definitions.map((definition) => definition.domain[field]?.trim() ?? "")
    );
    return values.size > 1;
  });
}

function pushMappedValue<TKey, TValue>(
  map: Map<TKey, TValue[]>,
  key: TKey,
  value: TValue
): void {
  if (!map.has(key)) {
    map.set(key, []);
  }
  map.get(key)!.push(value);
}

function compareByPath(left: { path: string }, right: { path: string }): number {
  return compareText(left.path, right.path);
}

function compareDfdObjectReference(
  left: DfdObjectDomainReference,
  right: DfdObjectDomainReference
): number {
  return compareText(left.path, right.path) || compareText(left.objectId, right.objectId);
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right);
}
