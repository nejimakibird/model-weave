export interface FocusTargetCandidate<T> {
  view: T;
  filePath: string | null;
}

export function resolveFocusTarget<T>(input: {
  activePreviewView: T | null;
  activeFilePath: string | null;
  candidates: FocusTargetCandidate<T>[];
}): T | null {
  if (input.activePreviewView) {
    return input.activePreviewView;
  }

  if (input.activeFilePath) {
    const matches = input.candidates.filter((candidate) => candidate.filePath === input.activeFilePath);
    if (matches.length === 1) {
      return matches[0].view;
    }
    if (matches.length > 1) {
      return null;
    }
  }

  return input.candidates.length === 1 ? input.candidates[0].view : null;
}
