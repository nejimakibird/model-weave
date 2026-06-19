export interface ZoomToolbarElements {
  root: HTMLElement;
  zoomOutButton: HTMLButtonElement;
  fitButton: HTMLButtonElement;
  zoomLabel: HTMLSpanElement;
  zoomInButton: HTMLButtonElement;
  resetButton: HTMLButtonElement;
  exportPngButton: HTMLButtonElement | null;
  exportAndOpenPngButton: HTMLButtonElement | null;
  leftGroup: HTMLElement;
  rightGroup: HTMLElement;
}

export interface ZoomToolbarOptions {
  onExportPng?: () => void | Promise<void>;
  onExportAndOpenPng?: () => void | Promise<void>;
  exportPngLabel?: string;
  exportPngTitle?: string;
  exportAndOpenPngLabel?: string;
  exportAndOpenPngTitle?: string;
}

export function createZoomToolbar(
  helpText: string,
  options: ZoomToolbarOptions = {}
): ZoomToolbarElements {
  const toolbar = activeDocument.createElement("div");
  toolbar.className = "mdspec-zoom-toolbar model-weave-zoom-toolbar";

  const leftGroup = activeDocument.createElement("div");
  leftGroup.addClass("model-weave-zoom-toolbar-left");

  const help = activeDocument.createElement("div");
  help.addClass("model-weave-zoom-toolbar-help");
  help.textContent = helpText;
  leftGroup.appendChild(help);

  const rightGroup = activeDocument.createElement("div");
  rightGroup.addClass("model-weave-zoom-toolbar-right");

  const controls = activeDocument.createElement("div");
  controls.addClass("model-weave-zoom-toolbar-controls");

  const zoomOutButton = createToolbarButton("−");
  const fitButton = createToolbarButton("Fit");
  fitButton.addClass("model-weave-zoom-toolbar-fit");
  const zoomLabel = activeDocument.createElement("span");
  zoomLabel.addClass("model-weave-zoom-toolbar-label");
  zoomLabel.textContent = "100%";
  const zoomInButton = createToolbarButton("+");
  const resetButton = createToolbarButton("100%");
  const exportPngButton = options.onExportPng ? createToolbarButton("PNG") : null;
  const exportAndOpenPngButton = options.onExportAndOpenPng
    ? createToolbarButton("PNG↗")
    : null;
  if (exportPngButton) {
    exportPngButton.addClass("model-weave-zoom-toolbar-export-png");
    exportPngButton.setAttribute("aria-label", options.exportPngLabel ?? "Export as PNG");
    exportPngButton.title = options.exportPngTitle ?? options.exportPngLabel ?? "Export as PNG";
    exportPngButton.addEventListener("click", (event) => {
      event.preventDefault();
      void options.onExportPng?.();
    });
  }
  if (exportAndOpenPngButton) {
    exportAndOpenPngButton.addClass("model-weave-zoom-toolbar-export-open-png");
    exportAndOpenPngButton.setAttribute(
      "aria-label",
      options.exportAndOpenPngLabel ?? "Export PNG and open"
    );
    exportAndOpenPngButton.title =
      options.exportAndOpenPngTitle ??
      options.exportAndOpenPngLabel ??
      "Export PNG and open";
    exportAndOpenPngButton.addEventListener("click", (event) => {
      event.preventDefault();
      void options.onExportAndOpenPng?.();
    });
  }

  controls.append(
    zoomOutButton,
    fitButton,
    zoomLabel,
    zoomInButton,
    resetButton,
    ...(exportPngButton ? [exportPngButton] : []),
    ...(exportAndOpenPngButton ? [exportAndOpenPngButton] : [])
  );
  rightGroup.appendChild(controls);
  toolbar.append(leftGroup, rightGroup);

  return {
    root: toolbar,
    zoomOutButton,
    fitButton,
    zoomLabel,
    zoomInButton,
    resetButton,
    exportPngButton,
    exportAndOpenPngButton,
    leftGroup,
    rightGroup
  };
}

function createToolbarButton(label: string): HTMLButtonElement {
  const button = activeDocument.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.addClass("model-weave-zoom-toolbar-button");
  return button;
}
