export interface ZoomToolbarElements {
  root: HTMLElement;
  zoomOutButton: HTMLButtonElement;
  fitButton: HTMLButtonElement;
  zoomLabel: HTMLSpanElement;
  zoomInButton: HTMLButtonElement;
  resetButton: HTMLButtonElement;
}

export function createZoomToolbar(helpText: string): ZoomToolbarElements {
  const toolbar = activeDocument.createElement("div");
  toolbar.className = "mdspec-zoom-toolbar model-weave-zoom-toolbar";

  const help = activeDocument.createElement("div");
  help.addClass("model-weave-zoom-toolbar-help");
  help.textContent = helpText;

  const controls = activeDocument.createElement("div");
  controls.addClass("model-weave-zoom-toolbar-controls");

  const zoomOutButton = createToolbarButton("−");
  const fitButton = createToolbarButton("Fit");
  const zoomLabel = activeDocument.createElement("span");
  zoomLabel.addClass("model-weave-zoom-toolbar-label");
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
  const button = activeDocument.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.addClass("model-weave-zoom-toolbar-button");
  return button;
}
