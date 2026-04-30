import { loadMermaidAdapter } from "../adapters/obsidian-mermaid";
import {
  attachGraphViewportInteractions,
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
}

export interface MermaidRenderOptions {
  source: string;
  renderIdPrefix: string;
  nodeSelector?: string;
  viewportState?: GraphViewportState;
  onViewportStateChange?: (state: GraphViewportState) => void;
}

export function createMermaidShell(
  options: MermaidShellOptions
): MermaidShellElements {
  const root = document.createElement("section");
  root.className = `${options.className} model-weave-mermaid-shell`;

  if (options.title) {
    const title = document.createElement("h2");
    title.textContent = options.title;
    title.addClass("model-weave-mermaid-title");
    root.appendChild(title);
  }

  const canvas = document.createElement("div");
  canvas.addClass("model-weave-graph-canvas");
  if (!options.forExport) {
    canvas.addClass("model-weave-graph-canvas-interactive");
  }

  const toolbar = options.forExport
    ? null
    : createZoomToolbar("Wheel: zoom / Drag background: pan");
  if (toolbar) {
    root.appendChild(toolbar.root);
  }

  const viewport = document.createElement("div");
  viewport.addClass("model-weave-graph-viewport");

  const surface = document.createElement("div");
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
  const mermaid = await loadMermaidAdapter();
  const renderId = `${options.renderIdPrefix}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const rendered = await mermaid.render(renderId, options.source);
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
  surface.setCssStyles({
    width: `${sceneSize.width}px`,
    height: `${sceneSize.height}px`
  });
  svg.setAttribute("width", `${sceneSize.width}`);
  svg.setAttribute("height", `${sceneSize.height}`);
  svg.setCssStyles({
    width: `${sceneSize.width}px`,
    height: `${sceneSize.height}px`,
    display: "block"
  });

  if (toolbar) {
    attachGraphViewportInteractions(canvas, surface, toolbar, sceneSize, {
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      initialZoom: INITIAL_ZOOM,
      nodeSelector: options.nodeSelector ?? ".node, g.node, foreignObject",
      viewportState: options.viewportState,
      onViewportStateChange: options.onViewportStateChange
    });
  }
}

function appendRenderedSvg(
  surface: HTMLElement,
  svgMarkup: string
): SVGSVGElement {
  const parser = new DOMParser();
  const documentRoot = parser.parseFromString(svgMarkup, "image/svg+xml");
  const parseError = documentRoot.querySelector("parsererror");
  if (parseError) {
    throw new Error("Mermaid SVG could not be parsed.");
  }

  const parsedSvg = documentRoot.documentElement;
  if (!parsedSvg || parsedSvg.tagName.toLowerCase() !== "svg") {
    throw new Error("Mermaid SVG was not generated.");
  }

  scrubSvgElementTree(parsedSvg);
  const importedSvg = surface.ownerDocument.importNode(
    parsedSvg,
    true
  ) as unknown as SVGSVGElement;
  surface.appendChild(importedSvg);
  return importedSvg;
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
  const notice = document.createElement("div");
  notice.addClass("model-weave-mermaid-fallback");
  notice.textContent = message;
  return notice;
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
      height: Math.max(1, viewBox.height)
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
    height
  };
}
