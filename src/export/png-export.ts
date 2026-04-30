import { App, TFile } from "obsidian";
import { getMermaidRenderReadyPromise } from "../renderers/mermaid-shared";

const EXPORT_FOLDER = "exports";
const EXPORT_PADDING = 32;
const EXPORT_SCALE = 2;
const OFFSCREEN_ROOT_ID = "model-weave-export-root";

export class DiagramExportError extends Error {
  constructor(
    message: string,
    readonly code:
      | "target-not-found"
      | "bounds-invalid"
      | "render-failed"
      | "encode-failed"
      | "save-failed"
  ) {
    super(message);
    this.name = "DiagramExportError";
  }
}

export interface DiagramExportSnapshot {
  filePath: string;
  surface: HTMLElement;
  sceneWidth: number;
  sceneHeight: number;
  renderer?: string;
}

export interface DiagramExportRenderable {
  filePath: string;
  render: () => HTMLElement;
}

export async function exportDiagramRenderableAsPng(
  app: App,
  renderable: DiagramExportRenderable
): Promise<string> {
  const rendered = await Promise.resolve(renderable.render());
  const mounted = mountOffscreenExportRoot(rendered);
  try {
    const mermaidReady = getMermaidRenderReadyPromise(rendered);
    if (mermaidReady) {
      await mermaidReady;
    }
    await waitForAnimationFrame();
    const snapshot = buildDomDiagramExportSnapshot(mounted.mount, renderable.filePath);
    if (!snapshot) {
      throw new DiagramExportError(
        "The current diagram has no measurable export bounds.",
        "bounds-invalid"
      );
    }

    return exportDiagramSnapshotAsPng(app, snapshot);
  } finally {
    mounted.dispose();
  }
}

export function buildDomDiagramExportSnapshot(
  container: HTMLElement,
  filePath: string
): DiagramExportSnapshot | null {
  const surface = container.querySelector<HTMLElement>(
    '[data-model-weave-export-surface="true"]'
  );
  if (!surface) {
    return null;
  }

  const sceneWidth = readSceneSize(surface.dataset.modelWeaveSceneWidth, surface.style.width);
  const sceneHeight = readSceneSize(
    surface.dataset.modelWeaveSceneHeight,
    surface.style.height
  );
  if (!sceneWidth || !sceneHeight) {
    return null;
  }

  return {
    filePath,
    surface,
    sceneWidth,
    sceneHeight,
    renderer: surface.dataset.modelWeaveRenderer
  };
}

export async function exportDiagramSnapshotAsPng(
  app: App,
  snapshot: DiagramExportSnapshot
): Promise<string> {
  const arrayBuffer = await renderSnapshotToPng(snapshot);
  try {
    await ensureFolder(app, EXPORT_FOLDER);

    const exportPath = `${EXPORT_FOLDER}/${toExportFileName(snapshot.filePath)}.png`;
    const existing = app.vault.getAbstractFileByPath(exportPath);
    if (existing instanceof TFile) {
      await app.vault.modifyBinary(existing, arrayBuffer);
    } else {
      await app.vault.createBinary(exportPath, arrayBuffer);
    }

    return exportPath;
  } catch (error) {
    throw new DiagramExportError("Failed to save PNG export.", "save-failed");
  }
}

async function renderSnapshotToPng(
  snapshot: DiagramExportSnapshot
): Promise<ArrayBuffer> {
  if (snapshot.renderer === "mermaid") {
    return renderMermaidSnapshotToPng(snapshot);
  }

  const exportWidth = snapshot.sceneWidth + EXPORT_PADDING * 2;
  const exportHeight = snapshot.sceneHeight + EXPORT_PADDING * 2;
  if (
    !Number.isFinite(exportWidth) ||
    !Number.isFinite(exportHeight) ||
    exportWidth <= 0 ||
    exportHeight <= 0
  ) {
    throw new DiagramExportError(
      "The current diagram has no measurable export bounds.",
      "bounds-invalid"
    );
  }

  const wrapper = document.createElement("div");
  wrapper.style.width = `${exportWidth}px`;
  wrapper.style.height = `${exportHeight}px`;
  wrapper.style.background = "#ffffff";
  wrapper.style.position = "relative";
  wrapper.style.overflow = "hidden";
  wrapper.style.fontFamily =
    "Inter, Segoe UI, Helvetica Neue, Arial, sans-serif";

  const clone = snapshot.surface.cloneNode(true) as HTMLElement;
  prepareSurfaceClone(clone, snapshot, exportWidth, exportHeight);
  wrapper.appendChild(clone);

  const svg = buildExportSvg(wrapper, exportWidth, exportHeight);
  const serialized = new XMLSerializer().serializeToString(svg);
  const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;

  try {
    const image = await loadImage(svgUrl);
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(exportWidth * EXPORT_SCALE);
    canvas.height = Math.ceil(exportHeight * EXPORT_SCALE);
    const context = canvas.getContext("2d");
    if (!context) {
      throw new DiagramExportError(
        "Canvas rendering context is not available.",
        "render-failed"
      );
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(EXPORT_SCALE, 0, 0, EXPORT_SCALE, 0, 0);
    context.drawImage(image, 0, 0, exportWidth, exportHeight);

    const pngBlob = await canvasToBlob(canvas);
    const arrayBuffer = await pngBlob.arrayBuffer();
    if (arrayBuffer.byteLength <= 0) {
      throw new DiagramExportError("Failed to encode PNG image.", "encode-failed");
    }

    return arrayBuffer;
  } catch (error) {
    if (error instanceof DiagramExportError) {
      throw error;
    }
    throw new DiagramExportError("Failed to render diagram PNG.", "render-failed");
  }
}

async function renderMermaidSnapshotToPng(
  snapshot: DiagramExportSnapshot
): Promise<ArrayBuffer> {
  const svg = snapshot.surface.querySelector<SVGSVGElement>("svg");
  if (!svg) {
    throw new DiagramExportError("Mermaid SVG export source was not found.", "render-failed");
  }

  const contentBounds = measureMermaidContentBounds(svg);
  if (!contentBounds) {
    return renderSnapshotToPng({
      ...snapshot,
      renderer: "custom"
    });
  }

  const exportWidth = contentBounds.width + EXPORT_PADDING * 2;
  const exportHeight = contentBounds.height + EXPORT_PADDING * 2;
  const viewBoxX = contentBounds.x - EXPORT_PADDING;
  const viewBoxY = contentBounds.y - EXPORT_PADDING;

  const clone = svg.cloneNode(true) as SVGSVGElement;
  inlineSvgStyles(svg, clone);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  clone.setAttribute("width", `${exportWidth}`);
  clone.setAttribute("height", `${exportHeight}`);
  clone.setAttribute(
    "viewBox",
    `${viewBoxX} ${viewBoxY} ${exportWidth} ${exportHeight}`
  );
  clone.style.width = `${exportWidth}px`;
  clone.style.height = `${exportHeight}px`;
  clone.style.display = "block";

  const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  background.setAttribute("x", String(viewBoxX));
  background.setAttribute("y", String(viewBoxY));
  background.setAttribute("width", String(exportWidth));
  background.setAttribute("height", String(exportHeight));
  background.setAttribute("fill", "#ffffff");
  clone.insertBefore(background, clone.firstChild);

  const serialized = new XMLSerializer().serializeToString(clone);
  const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;

  try {
    const image = await loadImage(svgUrl);
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(exportWidth * EXPORT_SCALE);
    canvas.height = Math.ceil(exportHeight * EXPORT_SCALE);
    const context = canvas.getContext("2d");
    if (!context) {
      throw new DiagramExportError(
        "Canvas rendering context is not available.",
        "render-failed"
      );
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(EXPORT_SCALE, 0, 0, EXPORT_SCALE, 0, 0);
    context.drawImage(image, 0, 0, exportWidth, exportHeight);

    const pngBlob = await canvasToBlob(canvas);
    const arrayBuffer = await pngBlob.arrayBuffer();
    if (arrayBuffer.byteLength <= 0) {
      throw new DiagramExportError("Failed to encode PNG image.", "encode-failed");
    }

    return arrayBuffer;
  } catch (error) {
    if (error instanceof DiagramExportError) {
      throw error;
    }
    throw new DiagramExportError("Failed to render Mermaid diagram PNG.", "render-failed");
  }
}

function mountOffscreenExportRoot(root: HTMLElement): {
  mount: HTMLElement;
  dispose: () => void;
} {
  const host = document.createElement("div");
  host.id = OFFSCREEN_ROOT_ID;
  host.style.position = "fixed";
  host.style.left = "-100000px";
  host.style.top = "0";
  host.style.width = "1px";
  host.style.height = "1px";
  host.style.overflow = "hidden";
  host.style.pointerEvents = "none";
  host.style.opacity = "1";
  host.style.zIndex = "-1";
  host.style.background = "#ffffff";
  host.appendChild(root);
  document.body.appendChild(host);

  return {
    mount: host,
    dispose: () => host.remove()
  };
}

function prepareSurfaceClone(
  clone: HTMLElement,
  snapshot: DiagramExportSnapshot,
  exportWidth: number,
  exportHeight: number
): void {
  inlineComputedStyles(snapshot.surface, clone);
  clone.style.transform = "none";
  clone.style.left = `${EXPORT_PADDING}px`;
  clone.style.top = `${EXPORT_PADDING}px`;
  clone.style.position = "absolute";
  clone.style.margin = "0";
  clone.style.willChange = "auto";
  clone.style.display = "block";
  clone.style.width = `${snapshot.sceneWidth}px`;
  clone.style.height = `${snapshot.sceneHeight}px`;
  clone.style.minWidth = `${snapshot.sceneWidth}px`;
  clone.style.minHeight = `${snapshot.sceneHeight}px`;

  for (const toolbar of Array.from(clone.querySelectorAll(".mdspec-zoom-toolbar"))) {
    toolbar.remove();
  }
  for (const details of Array.from(
    clone.querySelectorAll(
      ".mdspec-related-list, .mdspec-connections, .mdspec-relations-table"
    )
  )) {
    details.remove();
  }

  const root = clone.closest("section");
  if (root instanceof HTMLElement) {
    root.style.background = "#ffffff";
  }

  const svgs = Array.from(clone.querySelectorAll("svg"));
  for (const svg of svgs) {
    svg.setAttribute("width", `${exportWidth}`);
    svg.setAttribute("height", `${exportHeight}`);
  }
}

function buildExportSvg(
  wrapper: HTMLElement,
  exportWidth: number,
  exportHeight: number
): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  svg.setAttribute("width", `${exportWidth}`);
  svg.setAttribute("height", `${exportHeight}`);
  svg.setAttribute("viewBox", `0 0 ${exportWidth} ${exportHeight}`);

  const foreignObject = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "foreignObject"
  );
  foreignObject.setAttribute("x", "0");
  foreignObject.setAttribute("y", "0");
  foreignObject.setAttribute("width", `${exportWidth}`);
  foreignObject.setAttribute("height", `${exportHeight}`);
  foreignObject.appendChild(wrapper);
  svg.appendChild(foreignObject);
  return svg;
}

function readSceneSize(datasetValue: string | undefined, styleValue: string): number | null {
  const preferred = Number.parseFloat(datasetValue ?? "");
  if (Number.isFinite(preferred) && preferred > 0) {
    return preferred;
  }

  const fallback = Number.parseFloat(styleValue);
  return Number.isFinite(fallback) && fallback > 0 ? fallback : null;
}

function measureMermaidContentBounds(
  svg: SVGSVGElement
): { x: number; y: number; width: number; height: number } | null {
  const candidates = [
    svg.querySelector<SVGGElement>("g.output"),
    svg.querySelector<SVGGElement>("g.root"),
    svg.querySelector<SVGGElement>("g.flowchart"),
    svg.querySelector<SVGGElement>("svg > g"),
    svg.querySelector<SVGGElement>("g")
  ].filter((value): value is SVGGElement => Boolean(value));

  for (const candidate of candidates) {
    const bbox = safeGetBBox(candidate);
    if (bbox) {
      return bbox;
    }
  }

  const svgBox = safeGetBBox(svg);
  if (svgBox) {
    return svgBox;
  }

  const rect = svg.getBoundingClientRect();
  if (
    Number.isFinite(rect.width) &&
    Number.isFinite(rect.height) &&
    rect.width > 0 &&
    rect.height > 0
  ) {
    return {
      x: 0,
      y: 0,
      width: rect.width,
      height: rect.height
    };
  }

  return null;
}

function safeGetBBox(
  element: SVGGraphicsElement
): { x: number; y: number; width: number; height: number } | null {
  try {
    const bbox = element.getBBox();
    if (
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
  } catch (error) {
  }

  return null;
}

async function ensureFolder(app: App, folderPath: string): Promise<void> {
  const existing = app.vault.getAbstractFileByPath(folderPath);
  if (existing) {
    return;
  }

  await app.vault.createFolder(folderPath);
}

function toExportFileName(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  const basename = normalized.split("/").pop() ?? normalized;
  return basename.replace(/\.md$/i, "") || "diagram";
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new DiagramExportError("Failed to render diagram image.", "render-failed"));
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new DiagramExportError("Failed to encode PNG image.", "encode-failed"));
    }, "image/png");
  });
}

function inlineComputedStyles(source: HTMLElement, target: HTMLElement): void {
  const computed = window.getComputedStyle(source);
  applyComputedStyle(target.style, computed);

  const sourceChildren = Array.from(source.children);
  const targetChildren = Array.from(target.children);
  for (let index = 0; index < sourceChildren.length; index += 1) {
    const sourceChild = sourceChildren[index];
    const targetChild = targetChildren[index];
    if (sourceChild instanceof HTMLElement && targetChild instanceof HTMLElement) {
      inlineComputedStyles(sourceChild, targetChild);
      continue;
    }

    if (
      sourceChild instanceof SVGElement &&
      targetChild instanceof SVGElement
    ) {
      inlineSvgStyles(sourceChild, targetChild);
    }
  }
}

function inlineSvgStyles(source: SVGElement, target: SVGElement): void {
  const computed = window.getComputedStyle(source);
  applyComputedStyle(target.style, computed);

  const sourceChildren = Array.from(source.children);
  const targetChildren = Array.from(target.children);
  for (let index = 0; index < sourceChildren.length; index += 1) {
    const sourceChild = sourceChildren[index];
    const targetChild = targetChildren[index];
    if (
      sourceChild instanceof SVGElement &&
      targetChild instanceof SVGElement
    ) {
      inlineSvgStyles(sourceChild, targetChild);
    } else if (
      sourceChild instanceof HTMLElement &&
      targetChild instanceof HTMLElement
    ) {
      inlineComputedStyles(sourceChild, targetChild);
    }
  }
}

function applyComputedStyle(
  style: CSSStyleDeclaration,
  computed: CSSStyleDeclaration
): void {
  for (let index = 0; index < computed.length; index += 1) {
    const property = computed.item(index);
    const value = computed.getPropertyValue(property);
    const priority = computed.getPropertyPriority(property);
    if (value) {
      style.setProperty(property, value, priority);
    }
  }
}

function waitForAnimationFrame(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}
