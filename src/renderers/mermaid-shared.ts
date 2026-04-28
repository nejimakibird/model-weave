import { loadMermaid } from "obsidian";
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
  root.className = options.className;
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.flex = "1 1 auto";
  root.style.minHeight = "0";

  if (options.title) {
    const title = document.createElement("h2");
    title.textContent = options.title;
    title.style.flex = "0 0 auto";
    root.appendChild(title);
  }

  const canvas = document.createElement("div");
  canvas.style.position = "relative";
  canvas.style.overflow = "hidden";
  canvas.style.padding = "0";
  canvas.style.border = "1px solid var(--background-modifier-border)";
  canvas.style.borderRadius = "8px";
  canvas.style.background = "#ffffff";
  canvas.style.flex = "1 1 auto";
  if (!options.forExport) {
    canvas.style.minHeight = "420px";
  }
  canvas.style.cursor = "grab";

  const toolbar = options.forExport
    ? null
    : createZoomToolbar("Wheel: zoom / Drag background: pan");
  if (toolbar) {
    root.appendChild(toolbar.root);
  }

  const viewport = document.createElement("div");
  viewport.style.position = "relative";
  viewport.style.width = "100%";
  viewport.style.height = "100%";
  viewport.style.minHeight = "0";
  viewport.style.overflow = "hidden";

  const surface = document.createElement("div");
  surface.dataset.modelWeaveExportSurface = "true";
  surface.style.position = "absolute";
  surface.style.left = "0";
  surface.style.top = "0";
  surface.style.transformOrigin = "0 0";
  surface.style.willChange = "transform";
  surface.style.background = "#ffffff";

  viewport.appendChild(surface);
  canvas.appendChild(viewport);
  root.appendChild(canvas);

  return { root, canvas, surface, toolbar };
}

export async function renderMermaidSourceIntoShell(
  shell: MermaidShellElements,
  options: MermaidRenderOptions
): Promise<void> {
  const mermaid = await loadMermaid();
  const renderId = `${options.renderIdPrefix}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const rendered = await mermaid.render(renderId, options.source);
  const { canvas, surface, toolbar } = shell;

  surface.empty();
  surface.innerHTML = rendered.svg;
  surface.style.background = "#ffffff";
  surface.style.display = "block";
  surface.dataset.modelWeaveRenderer = "mermaid";

  const svg = surface.querySelector<SVGSVGElement>("svg");
  if (!svg) {
    throw new Error("Mermaid SVG was not generated.");
  }

  if (typeof rendered.bindFunctions === "function") {
    rendered.bindFunctions(surface);
  }

  const sceneSize = readMermaidSceneSize(svg);
  if (!sceneSize) {
    throw new Error("Mermaid SVG has no measurable bounds.");
  }

  surface.dataset.modelWeaveSceneWidth = `${sceneSize.width}`;
  surface.dataset.modelWeaveSceneHeight = `${sceneSize.height}`;
  surface.style.width = `${sceneSize.width}px`;
  surface.style.height = `${sceneSize.height}px`;
  svg.setAttribute("width", `${sceneSize.width}`);
  svg.setAttribute("height", `${sceneSize.height}`);
  svg.style.width = `${sceneSize.width}px`;
  svg.style.height = `${sceneSize.height}px`;
  svg.style.display = "block";

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
  notice.style.margin = "0 0 10px";
  notice.style.padding = "8px 10px";
  notice.style.borderRadius = "8px";
  notice.style.border = "1px solid var(--color-orange)";
  notice.style.background = "var(--background-primary-alt)";
  notice.style.color = "var(--text-normal)";
  notice.style.fontSize = "12px";
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
