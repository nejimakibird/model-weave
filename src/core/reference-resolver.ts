import type { ParsedFileModel, ErEntity, ObjectModel } from "../types/models";
import type { ModelingVaultIndex } from "./vault-index";

export function normalizeReferenceTarget(reference: string): string {
  const trimmed = reference.trim();
  const inner = trimmed.startsWith("[[") && trimmed.endsWith("]]")
    ? trimmed.slice(2, -2).trim()
    : trimmed;
  const linkTarget = inner.split("|", 1)[0].trim();
  const withoutHeading = linkTarget.split("#", 1)[0].trim();
  const withoutBlock = withoutHeading.split("^", 1)[0].trim();
  return withoutBlock.replace(/\.md$/i, "").replace(/\\/g, "/");
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

function getBasename(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const leaf = normalized.split("/").pop() ?? normalized;
  return leaf.replace(/\.md$/i, "");
}
