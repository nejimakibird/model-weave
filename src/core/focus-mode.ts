export interface FocusModeTransition {
  focusEnabled: boolean;
  enableView: boolean;
}

export function resolveFocusModeTransition(
  currentFocusEnabled: boolean,
  viewEnabled: boolean,
  viewAvailable: boolean
): FocusModeTransition {
  const focusEnabled = !currentFocusEnabled;
  return {
    focusEnabled,
    enableView: focusEnabled && viewAvailable && !viewEnabled
  };
}

export function shouldHandleFocusModeEscape(event: {
  key: string;
  defaultPrevented?: boolean;
  target?: EventTarget | null;
}): boolean {
  if (event.key !== "Escape" || event.defaultPrevented) {
    return false;
  }
  const target = event.target;
  if (typeof HTMLElement === "undefined" || !(target instanceof HTMLElement)) {
    return true;
  }
  return !target.matches("input, textarea, select, [contenteditable='true']");
}
