export interface ZoomToolbarElements {
  root: HTMLElement;
  zoomOutButton: HTMLButtonElement;
  fitButton: HTMLButtonElement;
  zoomLabel: HTMLSpanElement;
  zoomInButton: HTMLButtonElement;
  resetButton: HTMLButtonElement;
}

export function createZoomToolbar(helpText: string): ZoomToolbarElements {
  const toolbar = document.createElement("div");
  toolbar.style.display = "flex";
  toolbar.style.justifyContent = "space-between";
  toolbar.style.alignItems = "center";
  toolbar.style.gap = "12px";
  toolbar.style.margin = "8px 0 10px";

  const help = document.createElement("div");
  help.style.fontSize = "12px";
  help.style.color = "var(--text-muted)";
  help.textContent = helpText;

  const controls = document.createElement("div");
  controls.style.display = "flex";
  controls.style.alignItems = "center";
  controls.style.gap = "6px";

  const zoomOutButton = createToolbarButton("−");
  const fitButton = createToolbarButton("Fit");
  const zoomLabel = document.createElement("span");
  zoomLabel.style.fontSize = "12px";
  zoomLabel.style.minWidth = "52px";
  zoomLabel.style.textAlign = "center";
  zoomLabel.textContent = "100%";
  const zoomInButton = createToolbarButton("+");
  const resetButton = createToolbarButton("100%");

  controls.append(
    zoomOutButton,
    fitButton,
    zoomLabel,
    zoomInButton,
    resetButton
  );
  toolbar.append(help, controls);

  return {
    root: toolbar,
    zoomOutButton,
    fitButton,
    zoomLabel,
    zoomInButton,
    resetButton
  };
}

function createToolbarButton(label: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.style.border = "1px solid var(--background-modifier-border)";
  button.style.borderRadius = "6px";
  button.style.background = "var(--background-primary)";
  button.style.padding = "2px 8px";
  button.style.cursor = "pointer";
  button.style.fontSize = "11px";
  return button;
}
