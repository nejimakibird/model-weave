import type {
  DataObjectModel,
  ParsedReferenceValue,
  ParsedFileModel,
  DfdObjectModel,
  ErEntity,
  ObjectModel,
  QualifiedMemberCandidate
} from "../types/models";
import type { ModelingVaultIndex } from "./vault-index";

export interface ResolvedReferenceIdentity {
  raw: string;
  parsed: ParsedReferenceValue | null;
  target?: string;
  displayLabel?: string;
  resolvedFile?: string;
  resolvedId?: string;
  resolvedModelType?: ParsedFileModel["fileType"];
  resolvedModel?: ParsedFileModel | null;
}

export interface ParsedQualifiedRef {
  raw: string;
  baseRefRaw: string;
  memberRef?: string;
  hasMemberRef: boolean;
}

export interface ResolvedQualifiedRef {
  qualified: ParsedQualifiedRef;
  baseIdentity: ResolvedReferenceIdentity;
  member?: QualifiedMemberCandidate | null;
}

export function normalizeReferenceTarget(reference: string): string {
  const parsed = parseReferenceValue(reference);
  const target = parsed?.target?.trim();
  if (target) {
    return target;
  }

  return reference.trim().replace(/\.md$/i, "").replace(/\\/g, "/");
}

export function parseReferenceValue(reference: string): ParsedReferenceValue | null {
  const trimmed = reference.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("[[") && trimmed.endsWith("]]")) {
    const inner = trimmed.slice(2, -2).trim();
    const [targetPart, aliasPart] = splitWikilinkParts(inner);
    return {
      raw: trimmed,
      kind: "wikilink",
      target: normalizeLinkTarget(unescapeWikilinkTarget(targetPart ?? "")),
      display: unescapeReferenceLabel(aliasPart?.trim() || "") || undefined
    };
  }

  const markdownLinkMatch = trimmed.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
  if (markdownLinkMatch) {
    const [, label, target] = markdownLinkMatch;
    return {
      raw: trimmed,
      kind: "markdown_link",
      target: isExternalLinkTarget(target) ? undefined : normalizeLinkTarget(target),
      display: label.trim() || undefined,
      isExternal: isExternalLinkTarget(target)
    };
  }

  return {
    raw: trimmed,
    kind: "raw",
    target: normalizeLinkTarget(trimmed)
  };
}

export function parseQualifiedRef(reference: string): ParsedQualifiedRef | null {
  const trimmed = reference.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("[[")) {
    const closeIndex = trimmed.indexOf("]]");
    if (closeIndex >= 0) {
      const baseRefRaw = trimmed.slice(0, closeIndex + 2);
      const remainder = trimmed.slice(closeIndex + 2);
      const memberRef = parseQualifiedMemberSuffix(remainder);
      return {
        raw: trimmed,
        baseRefRaw,
        memberRef: memberRef || undefined,
        hasMemberRef: Boolean(memberRef)
      };
    }
  }

  const markdownLinkMatch = trimmed.match(/^\[[^\]]+\]\([^)]+\)/);
  if (markdownLinkMatch) {
    const baseRefRaw = markdownLinkMatch[0];
    const remainder = trimmed.slice(baseRefRaw.length);
    const memberRef = parseQualifiedMemberSuffix(remainder);
    return {
      raw: trimmed,
      baseRefRaw,
      memberRef: memberRef || undefined,
      hasMemberRef: Boolean(memberRef)
    };
  }

  const rawMatch = trimmed.match(/^(.+)\.([A-Za-z0-9_-]+)$/);
  if (rawMatch && !isExternalLinkTarget(trimmed)) {
    return {
      raw: trimmed,
      baseRefRaw: rawMatch[1].trim(),
      memberRef: rawMatch[2],
      hasMemberRef: true
    };
  }

  return {
    raw: trimmed,
    baseRefRaw: trimmed,
    memberRef: undefined,
    hasMemberRef: false
  };
}

export function buildReferenceCandidates(reference: string): string[] {
  const normalized = normalizeReferenceTarget(reference);
  if (!normalized) {
    return [];
  }

  const basename = getBasename(normalized);
  return Array.from(
    new Set(
      [reference.trim(), normalized, basename].filter(
        (value): value is string => Boolean(value && value.trim())
      )
    )
  );
}

export function resolveObjectModelReference(
  reference: string,
  index: ModelingVaultIndex
): ObjectModel | null {
  for (const candidate of buildReferenceCandidates(reference)) {
    const direct = index.objectsById[candidate];
    if (direct) {
      return direct;
    }
  }

  const model = findModelByReference(reference, index);
  return model?.fileType === "object" ? model : null;
}

export function resolveErEntityReference(
  reference: string,
  index: ModelingVaultIndex
): ErEntity | null {
  for (const candidate of buildReferenceCandidates(reference)) {
    const byId = index.erEntitiesById[candidate];
    if (byId) {
      return byId;
    }

    const byPhysicalName = index.erEntitiesByPhysicalName[candidate];
    if (byPhysicalName) {
      return byPhysicalName;
    }
  }

  const model = findModelByReference(reference, index);
  return model?.fileType === "er-entity" ? model : null;
}

export function resolveDfdObjectReference(
  reference: string,
  index: ModelingVaultIndex
): DfdObjectModel | null {
  for (const candidate of buildReferenceCandidates(reference)) {
    const direct = index.dfdObjectsById[candidate];
    if (direct) {
      return direct;
    }
  }

  const model = findModelByReference(reference, index);
  return model?.fileType === "dfd-object" ? model : null;
}

export function resolveDataObjectReference(
  reference: string,
  index: ModelingVaultIndex
): DataObjectModel | null {
  for (const candidate of buildReferenceCandidates(reference)) {
    const direct = index.dataObjectsById[candidate];
    if (direct) {
      return direct;
    }
  }

  const model = findModelByReference(reference, index);
  return model?.fileType === "data-object" ? model : null;
}

export function findModelByReference(
  reference: string,
  index: ModelingVaultIndex
): ParsedFileModel | null {
  const candidates = buildReferenceCandidates(reference);

  for (const candidate of candidates) {
    const directPath = index.modelsByFilePath[candidate];
    if (directPath) {
      return directPath;
    }

    const markdownPath = `${candidate}.md`;
    if (index.modelsByFilePath[markdownPath]) {
      return index.modelsByFilePath[markdownPath];
    }
  }

  for (const candidate of candidates) {
    const byId =
      index.objectsById[candidate] ??
      index.appProcessesById[candidate] ??
      index.screensById[candidate] ??
      index.codesetsById[candidate] ??
      index.messagesById[candidate] ??
      index.rulesById[candidate] ??
      index.mappingsById[candidate] ??
      index.dataObjectsById[candidate] ??
      index.dfdObjectsById[candidate] ??
      index.erEntitiesById[candidate] ??
      index.erEntitiesByPhysicalName[candidate] ??
      index.relationsFilesById[candidate] ??
      index.diagramsById[candidate];

    if (byId) {
      return byId;
    }
  }

  for (const candidate of candidates) {
    const normalizedCandidate = candidate.replace(/\\/g, "/");
    const withExtension = normalizedCandidate.endsWith(".md")
      ? normalizedCandidate
      : `${normalizedCandidate}.md`;

    for (const [path, model] of Object.entries(index.modelsByFilePath)) {
      const normalizedPath = path.replace(/\\/g, "/");
      if (
        normalizedPath === withExtension ||
        normalizedPath.endsWith(`/${withExtension}`) ||
        getBasename(normalizedPath) === getBasename(normalizedCandidate)
      ) {
        return model;
      }
    }
  }

  return null;
}

export function resolveReferenceIdentity(
  reference: string,
  index: ModelingVaultIndex
): ResolvedReferenceIdentity {
  const parsed = parseReferenceValue(reference);
  const model = findModelByReference(reference, index);

  return {
    raw: reference.trim(),
    parsed,
    target: parsed?.target,
    displayLabel: parsed?.display,
    resolvedFile: model?.path,
    resolvedId: getResolvedModelId(model),
    resolvedModelType: model?.fileType,
    resolvedModel: model
  };
}

export function getQualifiedMemberCandidates(
  baseReference: string,
  index: ModelingVaultIndex
): QualifiedMemberCandidate[] {
  const identity = resolveReferenceIdentity(baseReference, index);
  const merged: QualifiedMemberCandidate[] = [];
  const seen = new Set<string>();

  const addCandidates = (candidates: QualifiedMemberCandidate[] | undefined): void => {
    for (const candidate of candidates ?? []) {
        const key = [
          candidate.ownerPath,
          candidate.memberKind,
          candidate.memberId,
          candidate.sourceSection,
          candidate.displayName ?? ""
        ].join("|");
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      merged.push(candidate);
    }
  };

  if (identity.resolvedId) {
    addCandidates(index.membersByOwnerId[identity.resolvedId]);
  }
  if (identity.resolvedFile) {
    addCandidates(index.membersByOwnerPath[identity.resolvedFile]);
  }

  return merged;
}

export function resolveQualifiedMemberReference(
  reference: string,
  index: ModelingVaultIndex
): ResolvedQualifiedRef {
  const qualified = parseQualifiedRef(reference) ?? {
    raw: reference.trim(),
    baseRefRaw: reference.trim(),
    memberRef: undefined,
    hasMemberRef: false
  };
  const baseIdentity = resolveReferenceIdentity(qualified.baseRefRaw, index);
  const member =
    qualified.memberRef && baseIdentity.resolvedModel
      ? getQualifiedMemberCandidates(qualified.baseRefRaw, index).find(
          (candidate) => candidate.memberId === qualified.memberRef
        ) ?? null
      : null;

  return {
    qualified,
    baseIdentity,
    member
  };
}

export function buildReferenceIdentityKeys(identity: ResolvedReferenceIdentity): string[] {
  const targetBasename = identity.target ? getBasename(identity.target) : undefined;
  const rawBasename = identity.raw ? getBasename(normalizeLinkTarget(identity.raw)) : undefined;

  return Array.from(
    new Set(
      [
        identity.resolvedFile ? `file:${identity.resolvedFile}` : null,
        identity.resolvedId ? `id:${identity.resolvedId}` : null,
        identity.target ? `target:${identity.target}` : null,
        identity.parsed?.target ? `target:${identity.parsed.target}` : null,
        targetBasename ? `basename:${targetBasename}` : null,
        identity.raw ? `raw:${normalizeLinkTarget(identity.raw)}` : null,
        rawBasename ? `basename:${rawBasename}` : null
      ].filter((value): value is string => Boolean(value))
    )
  );
}

export function referencesMatch(
  left: string,
  right: string,
  index: ModelingVaultIndex
): boolean {
  const leftKeys = new Set(buildReferenceIdentityKeys(resolveReferenceIdentity(left, index)));
  const rightKeys = buildReferenceIdentityKeys(resolveReferenceIdentity(right, index));
  return rightKeys.some((key) => leftKeys.has(key));
}

export function getReferenceDisplayName(
  reference: string,
  resolvedModel?: ParsedFileModel | null
): string {
  const parsed = parseReferenceValue(reference);
  if (parsed?.display) {
    return parsed.display;
  }

  if (resolvedModel) {
    return getReferencedModelDisplayName(resolvedModel);
  }

  if (parsed?.target) {
    return getBasename(parsed.target);
  }

  return parsed?.raw ?? reference.trim();
}

export function getReferencedModelDisplayName(model: ParsedFileModel): string {
  switch (model.fileType) {
    case "data-object":
    case "app-process":
    case "screen":
    case "codeset":
    case "message":
    case "rule":
    case "mapping":
    case "dfd-object":
    case "dfd-diagram":
    case "object":
      return model.name;
    case "er-entity":
      return model.logicalName || model.physicalName || model.id;
    case "diagram":
      return model.name;
    case "relations":
      return model.title ?? model.path;
    case "markdown":
    default:
      return (
        (typeof model.frontmatter.name === "string" && model.frontmatter.name) ||
        (typeof model.frontmatter.title === "string" && model.frontmatter.title) ||
        getBasename(model.path)
      );
  }
}

function getResolvedModelId(model: ParsedFileModel | null): string | undefined {
  if (!model) {
    return undefined;
  }

  switch (model.fileType) {
    case "object":
      return typeof model.frontmatter.id === "string" && model.frontmatter.id.trim()
        ? model.frontmatter.id.trim()
        : model.name;
    case "er-entity":
    case "dfd-object":
    case "dfd-diagram":
    case "data-object":
    case "app-process":
    case "screen":
    case "codeset":
    case "message":
    case "rule":
    case "mapping":
      return model.id;
    case "diagram":
      return model.name;
    case "relations":
      return typeof model.frontmatter.id === "string" && model.frontmatter.id.trim()
        ? model.frontmatter.id.trim()
        : model.title;
    case "markdown":
    default:
      return undefined;
  }
}

function getBasename(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const leaf = normalized.split("/").pop() ?? normalized;
  return leaf.replace(/\.md$/i, "");
}

function normalizeLinkTarget(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("#") || trimmed.startsWith("^")) {
    return trimmed;
  }

  const withoutHeading = trimmed.split("#", 1)[0].trim();
  const withoutBlock = withoutHeading.split("^", 1)[0].trim();
  return withoutBlock.replace(/\.md$/i, "").replace(/\\/g, "/");
}

function isExternalLinkTarget(value: string): boolean {
  const trimmed = value.trim();
  return /^[A-Za-z][A-Za-z0-9+.-]*:/.test(trimmed);
}

function parseQualifiedMemberSuffix(value: string): string | null {
  const match = value.match(/^\.\s*([A-Za-z0-9_-]+)\s*$/);
  return match?.[1] ?? null;
}

function splitWikilinkParts(value: string): [string, string?] {
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === "|") {
      return [value.slice(0, index), value.slice(index + 1)];
    }
    if (char === "\\" && value[index + 1] === "|") {
      return [value.slice(0, index), value.slice(index + 2)];
    }
  }

  return [value];
}

function unescapeReferenceLabel(value: string): string {
  return value.replace(/\\\|/g, "|").trim();
}

function unescapeWikilinkTarget(value: string): string {
  return value.replace(/\\\|/g, "|").trim();
}
