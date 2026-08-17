import { loadMermaidAdapter } from "../adapters/obsidian-mermaid";
import { modelWeaveText } from "../i18n/language";
import {
  formatMermaidRenderErrorMessage,
  formatMermaidRenderStatusMessage,
  formatMermaidSvgNotRenderedMessage,
  type MermaidRenderStatus
} from "../i18n/localized-messages";
import {
  attachGraphViewportInteractions,
  type GraphFitHorizontalAlign,
  type GraphFitMetrics,
  type GraphFitVerticalAlign,
  type GraphViewportState,
  type SceneBounds
} from "./graph-view-shared";
import {
  createZoomToolbar,
  type ZoomToolbarElements
} from "./zoom-toolbar";

const MODEL_WEAVE_MERMAID_RENDER_FLAG = "__modelWeaveRenderReady";
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.25;
const INITIAL_ZOOM = 1;

interface MermaidRenderableRoot extends HTMLElement {
  [MODEL_WEAVE_MERMAID_RENDER_FLAG]?: Promise<void>;
}

export interface MermaidShellElements {
  root: HTMLElement;
  canvas: HTMLElement;
  surface: HTMLElement;
  toolbar: ZoomToolbarElements | null;
}

export interface MermaidShellOptions {
  className: string;
  title?: string;
  forExport?: boolean;
  onExportPng?: () => void | Promise<void>;
  onExportAndOpenPng?: () => void | Promise<void>;
  exportPngLabel?: string;
  exportPngTitle?: string;
  exportAndOpenPngLabel?: string;
  exportAndOpenPngTitle?: string;
}

export interface MermaidRenderOptions {
  source: string;
  renderIdPrefix: string;
  nodeSelector?: string;
  fitHorizontalAlign?: GraphFitHorizontalAlign;
  fitVerticalAlign?: GraphFitVerticalAlign;
  minZoom?: number;
  maxZoom?: number;
  initialZoom?: number;
  minFitScale?: number;
  viewportState?: GraphViewportState;
  onViewportStateChange?: (state: GraphViewportState) => void;
  onFitMetrics?: (metrics: GraphFitMetrics) => void;
  staticRender?: boolean;
  showSourcePanel?: boolean;
  sourcePanelContainer?: HTMLElement | null;
  sourcePanelPlacement?: "append" | "prepend";
  sourcePanelTitle?: string;
  sourcePanelCopyLabel?: string;
  showRenderDebug?: boolean;
  renderDebugContainer?: HTMLElement | null;
  renderDebugPlacement?: "append" | "prepend";
}

export interface ModelWeaveMermaidPalette {
  background: string;
  nodeFill: string;
  nodeBorder: string;
  nodeText: string;
  line: string;
  labelBackground: string;
  subgraphFill: string;
  subgraphBorder: string;
  classFill: string;
  classBorder: string;
  erFill: string;
  erBorder: string;
  dfdExternalFill: string;
  dfdExternalBorder: string;
  dfdProcessFill: string;
  dfdProcessBorder: string;
  dfdDatastoreFill: string;
  dfdDatastoreBorder: string;
  dfdOtherFill: string;
  dfdOtherBorder: string;
}

export function createMermaidShell(
  options: MermaidShellOptions
): MermaidShellElements {
  const root = activeWindow.createEl("section");
  root.className = `${options.className} model-weave-mermaid-shell`;

  if (options.title) {
    const title = activeWindow.createEl("h2");
    title.textContent = options.title;
    title.title = options.title;
    title.addClass("model-weave-mermaid-title");
    root.appendChild(title);
  }

  const canvas = activeWindow.createDiv();
  canvas.addClass("model-weave-graph-canvas");
  if (!options.forExport) {
    canvas.addClass("model-weave-graph-canvas-interactive");
  }

  const toolbar = options.forExport
    ? null
    : createZoomToolbar("Ctrl/Meta + wheel: zoom / Drag background: pan", {
      onExportPng: options.onExportPng,
      onExportAndOpenPng: options.onExportAndOpenPng,
      exportPngLabel: options.exportPngLabel,
      exportPngTitle: options.exportPngTitle,
      exportAndOpenPngLabel: options.exportAndOpenPngLabel,
      exportAndOpenPngTitle: options.exportAndOpenPngTitle
    });
  if (toolbar) {
    root.appendChild(toolbar.root);
  }

  const viewport = activeWindow.createDiv();
  viewport.addClass("model-weave-graph-viewport");

  const surface = activeWindow.createDiv();
  surface.addClass("model-weave-graph-surface");
  surface.dataset.modelWeaveExportSurface = "true";

  viewport.appendChild(surface);
  canvas.appendChild(viewport);
  root.appendChild(canvas);

  return { root, canvas, surface, toolbar };
}

export async function renderMermaidSourceIntoShell(
  shell: MermaidShellElements,
  options: MermaidRenderOptions
): Promise<void> {
  if (options.showSourcePanel !== false) {
    appendMermaidSourcePanel(
      options.sourcePanelContainer ?? shell.root,
      options.source,
      options.sourcePanelPlacement,
      {
        title: options.sourcePanelTitle,
        copyLabel: options.sourcePanelCopyLabel
      }
    );
  }

  const debug = options.showRenderDebug
    ? appendMermaidRenderDebugPanel(
      options.renderDebugContainer ?? shell.root,
      options.renderDebugPlacement
    )
    : null;

  updateMermaidRenderDebug(debug, { status: "generated" });

  try {
    const mermaid = await loadMermaidAdapter();
    const renderId = `${options.renderIdPrefix}_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const rendered = await mermaid.render(
      renderId,
      withModelWeaveMermaidTheme(options.source)
    );
    const { canvas, surface, toolbar } = shell;

    surface.empty();
    const svg = appendRenderedSvg(surface, rendered.svg);
    surface.dataset.modelWeaveRenderer = "mermaid";

    if (typeof rendered.bindFunctions === "function") {
      rendered.bindFunctions(surface);
    }

    const sceneSize = readMermaidSceneSize(svg);
    if (!sceneSize) {
      throw new Error("Mermaid SVG has no measurable bounds.");
    }

    surface.dataset.modelWeaveSceneWidth = `${sceneSize.width}`;
    surface.dataset.modelWeaveSceneHeight = `${sceneSize.height}`;
    surface.setCssProps({
      "--mw-scene-width": `${sceneSize.width}px`,
      "--mw-scene-height": `${sceneSize.height}px`
    });
    svg.setAttribute("width", `${sceneSize.width}`);
    svg.setAttribute("height", `${sceneSize.height}`);
    svg.classList.add("model-weave-mermaid-svg");
    updateMermaidRenderDebug(debug, {
      status: "rendered",
      svg: readMermaidSvgInfo(surface)
    });

    if (options.staticRender) {
      canvas.addClass("model-weave-graph-canvas-static");
      surface.addClass("model-weave-graph-surface-static");
      svg.classList.add("model-weave-mermaid-svg-static");
      return;
    }

    if (toolbar) {
      attachGraphViewportInteractions(canvas, surface, toolbar, sceneSize, {
        minZoom: options.minZoom ?? MIN_ZOOM,
        maxZoom: options.maxZoom ?? MAX_ZOOM,
        initialZoom: options.initialZoom ?? INITIAL_ZOOM,
        minFitScale: options.minFitScale,
        nodeSelector: options.nodeSelector ?? ".node, g.node, foreignObject",
        fitHorizontalAlign: options.fitHorizontalAlign,
        fitVerticalAlign: options.fitVerticalAlign,
        viewportState: options.viewportState,
        onViewportStateChange: options.onViewportStateChange,
        onFitMetrics: (metrics) => {
          updateMermaidRenderDebug(debug, { fit: metrics });
          options.onFitMetrics?.(metrics);
        }
      });
    }
  } catch (error) {
    updateMermaidRenderDebug(debug, {
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
      svg: readMermaidSvgInfo(shell.surface)
    });
    throw error;
  }
}

export function appendMermaidSourcePanel(
  container: HTMLElement,
  source: string,
  placement: "append" | "prepend" = "append",
  labels?: {
    title?: string;
    copyLabel?: string;
  }
): void {
  const fencedSource = `\`\`\`mermaid\n${source}\n\`\`\``;
  const root = container.createEl("details");
  root.addClass("model-weave-preview-section");
  root.addClass("model-weave-mermaid-source-panel");

  const summary = container.createEl("summary");
  summary.textContent = labels?.title ?? modelWeaveText("Mermaid source", "Mermaid ソース");
  summary.addClass("model-weave-preview-section-title");
  root.appendChild(summary);

  const actions = container.createDiv();
  actions.addClass("model-weave-mermaid-source-actions");
  const copyButton = container.createEl("button");
  copyButton.type = "button";
  copyButton.textContent = labels?.copyLabel ?? modelWeaveText("Copy Mermaid", "Mermaid をコピー");
  copyButton.addClass("model-weave-secondary-button");
  copyButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    void navigator.clipboard?.writeText(fencedSource);
  });
  actions.appendChild(copyButton);
  root.appendChild(actions);

  const pre = container.createEl("pre");
  pre.addClass("model-weave-mermaid-source-code");
  const code = container.createEl("code");
  code.textContent = fencedSource;
  pre.appendChild(code);
  root.appendChild(pre);
  placePanel(container, root, placement);
}

interface MermaidRenderDebugElements {
  root: HTMLElement;
  status: HTMLElement;
  error: HTMLElement;
  svgInfo: HTMLElement;
  fitInfo: HTMLElement;
}

function appendMermaidRenderDebugPanel(
  container: HTMLElement,
  placement: "append" | "prepend" = "append"
): MermaidRenderDebugElements {
  const root = container.createEl("details");
  root.addClass("model-weave-preview-section");
  root.addClass("model-weave-mermaid-render-debug");

  const summary = container.createEl("summary");
  summary.textContent = modelWeaveText(
    "Mermaid render debug",
    "Mermaid render debug"
  );
  summary.addClass("model-weave-preview-section-title");
  root.appendChild(summary);

  const status = root.createEl("p", {
    text: formatMermaidRenderStatusMessage("generated"),
    cls: "model-weave-summary-muted"
  });
  const error = root.createEl("p", {
    text: formatMermaidRenderErrorMessage("-"),
    cls: "model-weave-summary-muted"
  });
  const svgInfo = root.createEl("p", {
    text: formatMermaidSvgNotRenderedMessage(),
    cls: "model-weave-summary-muted"
  });
  const fitInfo = root.createEl("p", {
    text: "Fit: not measured",
    cls: "model-weave-summary-muted"
  });

  placePanel(container, root, placement);
  return { root, status, error, svgInfo, fitInfo };
}

function placePanel(
  container: HTMLElement,
  panel: HTMLElement,
  placement: "append" | "prepend"
): void {
  if (placement === "prepend") {
    container.prepend(panel);
    return;
  }
  container.appendChild(panel);
}

function updateMermaidRenderDebug(
  debug: MermaidRenderDebugElements | null,
  update: {
    status?: MermaidRenderStatus;
    error?: string;
    svg?: MermaidSvgInfo;
    fit?: GraphFitMetrics;
  }
): void {
  if (!debug) {
    return;
  }
  if (update.status) {
    debug.status.textContent = formatMermaidRenderStatusMessage(update.status);
  }
  if (update.error) {
    debug.error.textContent = formatMermaidRenderErrorMessage(update.error);
  }
  if (update.svg) {
    debug.svgInfo.textContent = [
      `SVG exists: ${update.svg.exists ? "yes" : "no"}`,
      `width: ${update.svg.width || "-"}`,
      `height: ${update.svg.height || "-"}`,
      `viewBox: ${update.svg.viewBox || "-"}`,
      `child elements: ${update.svg.childElementCount}`
    ].join(" / ");
  }
  if (update.fit) {
    debug.fitInfo.textContent = [
      modelWeaveText(
        `Fit bounds source: ${update.fit.boundsSource}`,
        `fit bounds source: ${update.fit.boundsSource}`
      ),
      `viewport: ${formatFitNumber(update.fit.viewportWidth)}x${formatFitNumber(update.fit.viewportHeight)}`,
      `bounds: ${formatFitNumber(update.fit.boundsX)},${formatFitNumber(update.fit.boundsY)} ${formatFitNumber(update.fit.boundsWidth)}x${formatFitNumber(update.fit.boundsHeight)}`,
      `computed scale: ${formatFitPercent(update.fit.computedScale)}`,
      `applied scale: ${formatFitPercent(update.fit.appliedScale)}`,
      `pan: ${formatFitNumber(update.fit.panX)},${formatFitNumber(update.fit.panY)}`,
      update.fit.warning
        ? modelWeaveText(`warning: ${update.fit.warning}`, `警告: ${update.fit.warning}`)
        : null
    ].filter((part): part is string => Boolean(part)).join(" / ");
  }
}

interface MermaidSvgInfo {
  exists: boolean;
  width: string;
  height: string;
  viewBox: string;
  childElementCount: number;
}

function readMermaidSvgInfo(surface: HTMLElement): MermaidSvgInfo {
  const svg = surface.querySelector("svg");
  return {
    exists: Boolean(svg),
    width: svg?.getAttribute("width") ?? "",
    height: svg?.getAttribute("height") ?? "",
    viewBox: svg?.getAttribute("viewBox") ?? "",
    childElementCount: svg?.childElementCount ?? 0
  };
}

function formatFitNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return Math.round(value * 100) / 100 + "";
}

function formatFitPercent(value: number): string {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return `${Math.round(value * 1000) / 10}%`;
}

function appendRenderedSvg(
  surface: HTMLElement,
  svgMarkup: string
): SVGSVGElement {
  const parsedSvg = parseMermaidSvgMarkup(svgMarkup);
  if (!parsedSvg) {
    throw new Error("Mermaid SVG was not generated.");
  }

  scrubSvgElementTree(parsedSvg);
  const importedSvg = surface.ownerDocument.importNode(parsedSvg, true);
  if (!importedSvg.instanceOf(SVGSVGElement)) {
    throw new Error("Mermaid SVG import did not produce an SVG element.");
  }
  surface.appendChild(importedSvg);
  return importedSvg;
}

function parseMermaidSvgMarkup(svgMarkup: string): SVGSVGElement | null {
  const parser = new DOMParser();
  const svgDocument = parser.parseFromString(svgMarkup, "image/svg+xml");
  const svgParseError = svgDocument.querySelector("parsererror");
  if (!svgParseError) {
    const parsedSvg = svgDocument.documentElement;
    if (parsedSvg && parsedSvg.tagName.toLowerCase() === "svg") {
      return parsedSvg.instanceOf(SVGSVGElement) ? parsedSvg : null;
    }
  }

  const htmlDocument = parser.parseFromString(svgMarkup, "text/html");
  const htmlSvg = htmlDocument.body.querySelector("svg");
  if (!htmlSvg) {
    return null;
  }
  return htmlSvg.instanceOf(SVGSVGElement) ? htmlSvg : null;
}

function scrubSvgElementTree(root: Element): void {
  const elements = [root, ...Array.from(root.querySelectorAll("*"))];
  for (const element of elements) {
    if (element.tagName.toLowerCase() === "script") {
      element.remove();
      continue;
    }

    for (const attribute of Array.from(element.attributes)) {
      const attributeName = attribute.name.toLowerCase();
      const attributeValue = attribute.value.trim().toLowerCase();
      if (attributeName.startsWith("on")) {
        element.removeAttribute(attribute.name);
        continue;
      }

      if (
        (attributeName === "href" || attributeName === "xlink:href") &&
        attributeValue.startsWith("javascript:")
      ) {
        element.removeAttribute(attribute.name);
      }
    }
  }
}

export function setMermaidRenderReadyPromise(
  element: HTMLElement,
  ready: Promise<void>
): void {
  (element as MermaidRenderableRoot)[MODEL_WEAVE_MERMAID_RENDER_FLAG] = ready;
}

export function getMermaidRenderReadyPromise(
  element: HTMLElement
): Promise<void> | null {
  return (element as MermaidRenderableRoot)[MODEL_WEAVE_MERMAID_RENDER_FLAG] ?? null;
}

export function createMermaidFallbackNotice(message: string): HTMLElement {
  const notice = activeWindow.createDiv();
  notice.addClass("model-weave-mermaid-fallback");
  notice.textContent = message;
  return notice;
}

export function getModelWeaveMermaidPalette(): ModelWeaveMermaidPalette {
  const isDark = isModelWeaveDarkTheme();
  if (isDark) {
    return {
      background: "#1f2329",
      nodeFill: "#273241",
      nodeBorder: "#6f8fb8",
      nodeText: "#e6edf3",
      line: "#9aa7b8",
      labelBackground: "#2a3038",
      subgraphFill: "#242a33",
      subgraphBorder: "#5f6f82",
      classFill: "#273241",
      classBorder: "#6f8fb8",
      erFill: "#243629",
      erBorder: "#70a57d",
      dfdExternalFill: "#3a3325",
      dfdExternalBorder: "#b69a58",
      dfdProcessFill: "#253349",
      dfdProcessBorder: "#6f8fb8",
      dfdDatastoreFill: "#253728",
      dfdDatastoreBorder: "#78a984",
      dfdOtherFill: "#2b3038",
      dfdOtherBorder: "#7a8797"
    };
  }

  return {
    background: "#ffffff",
    nodeFill: "#f4f7fb",
    nodeBorder: "#7a8da8",
    nodeText: "#1f2937",
    line: "#64748b",
    labelBackground: "#f8fafc",
    subgraphFill: "#f5f7fa",
    subgraphBorder: "#c5ceda",
    classFill: "#eef4ff",
    classBorder: "#4a6fa3",
    erFill: "#eef8ef",
    erBorder: "#467454",
    dfdExternalFill: "#f8f1df",
    dfdExternalBorder: "#8b6a17",
    dfdProcessFill: "#e9f2ff",
    dfdProcessBorder: "#2f5b9a",
    dfdDatastoreFill: "#eef7ee",
    dfdDatastoreBorder: "#3b6b47",
    dfdOtherFill: "#f5f7fb",
    dfdOtherBorder: "#5f6b7a"
  };
}

export function buildModelWeaveMermaidClassDef(
  className: string,
  fill: string,
  stroke: string,
  options?: { text?: string; strokeWidth?: number; extra?: string }
): string {
  const palette = getModelWeaveMermaidPalette();
  const text = options?.text ?? palette.nodeText;
  const strokeWidth = options?.strokeWidth ?? 1.4;
  const extra = options?.extra ? `,${options.extra}` : "";
  return `classDef ${className} fill:${fill},stroke:${stroke},color:${text},stroke-width:${strokeWidth}px${extra}`;
}

function withModelWeaveMermaidTheme(source: string): string {
  if (/^\s*%%\{init:/u.test(source)) {
    return source;
  }
  return `${buildModelWeaveMermaidInitDirective()}\n${source}`;
}

function buildModelWeaveMermaidInitDirective(): string {
  const palette = getModelWeaveMermaidPalette();
  return `%%{init: ${JSON.stringify({
    theme: "base",
    themeVariables: {
      background: palette.background,
      mainBkg: palette.nodeFill,
      secondBkg: palette.subgraphFill,
      primaryColor: palette.nodeFill,
      primaryBorderColor: palette.nodeBorder,
      primaryTextColor: palette.nodeText,
      secondaryColor: palette.subgraphFill,
      secondaryBorderColor: palette.subgraphBorder,
      secondaryTextColor: palette.nodeText,
      tertiaryColor: palette.labelBackground,
      tertiaryBorderColor: palette.subgraphBorder,
      tertiaryTextColor: palette.nodeText,
      lineColor: palette.line,
      textColor: palette.nodeText,
      edgeLabelBackground: palette.labelBackground,
      clusterBkg: palette.subgraphFill,
      clusterBorder: palette.subgraphBorder,
      titleColor: palette.nodeText,
      nodeBorder: palette.nodeBorder
    }
  })}}%%`;
}

function isModelWeaveDarkTheme(): boolean {
  return activeDocument.body.classList.contains("theme-dark");
}

function readMermaidSceneSize(
  svg: SVGSVGElement
): SceneBounds | null {
  const viewBox = svg.viewBox?.baseVal;
  if (viewBox && Number.isFinite(viewBox.width) && Number.isFinite(viewBox.height)) {
    return {
      minX: viewBox.x,
      minY: viewBox.y,
      maxX: viewBox.x + Math.max(1, viewBox.width),
      maxY: viewBox.y + Math.max(1, viewBox.height),
      width: Math.max(1, viewBox.width),
      height: Math.max(1, viewBox.height),
      source: "viewBox"
    };
  }

  const bbox = safeReadSvgBBox(svg);
  if (bbox) {
    return {
      minX: bbox.x,
      minY: bbox.y,
      maxX: bbox.x + bbox.width,
      maxY: bbox.y + bbox.height,
      width: bbox.width,
      height: bbox.height,
      source: "getBBox"
    };
  }

  const width = parseFloat(svg.getAttribute("width") ?? "");
  const height = parseFloat(svg.getAttribute("height") ?? "");
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  return {
    minX: 0,
    minY: 0,
    maxX: width,
    maxY: height,
    width,
    height,
    source: "fallback"
  };
}

function safeReadSvgBBox(
  svg: SVGSVGElement
): { x: number; y: number; width: number; height: number } | null {
  try {
    const bbox = svg.getBBox();
    if (
      Number.isFinite(bbox.x) &&
      Number.isFinite(bbox.y) &&
      Number.isFinite(bbox.width) &&
      Number.isFinite(bbox.height) &&
      bbox.width > 0 &&
      bbox.height > 0
    ) {
      return {
        x: bbox.x,
        y: bbox.y,
        width: bbox.width,
        height: bbox.height
      };
    }
  } catch {
    return null;
  }

  return null;
}
