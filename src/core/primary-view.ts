export type PrimaryViewMode = "model" | "weave-map";

export interface PrimaryViewAvailability {
  modelViewAvailable: boolean;
  weaveMapAvailable: boolean;
}

export interface PrimaryViewMermaidAvailability {
  modelMermaidAvailable: boolean;
  weaveMapAvailable: boolean;
}

export function getAvailablePrimaryViewModes(
  availability: PrimaryViewAvailability
): PrimaryViewMode[] {
  const modes: PrimaryViewMode[] = [];
  if (availability.modelViewAvailable) {
    modes.push("model");
  }
  if (availability.weaveMapAvailable) {
    modes.push("weave-map");
  }
  return modes;
}

export function resolvePrimaryViewMode(
  availability: PrimaryViewAvailability,
  currentMode?: PrimaryViewMode | null
): PrimaryViewMode | null {
  const available = getAvailablePrimaryViewModes(availability);
  if (currentMode && available.includes(currentMode)) {
    return currentMode;
  }
  return available[0] ?? null;
}

export function getPrimaryViewColorSchemeTargets(
  mode: PrimaryViewMode | null,
  modelTargets: string[]
): string[] {
  return mode === "weave-map" ? ["weave_map"] : modelTargets;
}

export function hasMermaidCapablePrimaryView(
  availability: PrimaryViewMermaidAvailability
): boolean {
  return availability.modelMermaidAvailable || availability.weaveMapAvailable;
}
