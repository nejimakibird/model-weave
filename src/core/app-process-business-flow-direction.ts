export type AppProcessBusinessFlowDirection = "LR" | "TD";

export interface ResolveAppProcessBusinessFlowDirectionInput {
  toolbarOverride?: unknown;
  frontmatterDirection?: unknown;
  settingsDefaultDirection?: unknown;
}

export function normalizeAppProcessBusinessFlowDirection(
  value: unknown
): AppProcessBusinessFlowDirection | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();
  return normalized === "LR" || normalized === "TD"
    ? normalized
    : undefined;
}

export function normalizeAppProcessBusinessFlowDirectionWithFallback(
  value: unknown
): AppProcessBusinessFlowDirection {
  return normalizeAppProcessBusinessFlowDirection(value) ?? "LR";
}

export function resolveAppProcessBusinessFlowDirection(
  input: ResolveAppProcessBusinessFlowDirectionInput
): AppProcessBusinessFlowDirection {
  return (
    normalizeAppProcessBusinessFlowDirection(input.toolbarOverride) ??
    normalizeAppProcessBusinessFlowDirection(input.frontmatterDirection) ??
    normalizeAppProcessBusinessFlowDirection(input.settingsDefaultDirection) ??
    "LR"
  );
}