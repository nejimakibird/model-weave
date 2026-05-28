import type { DiagramEdge } from "../types/models";
import type { ZoomToolbarElements } from "./zoom-toolbar";

const DEFAULT_FIT_PADDING_PX = 16;

export interface RectLike {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ConnectionPoints {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  midX: number;
  midY: number;
}

export interface SceneBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  source?: string;
}

export interface GraphViewportState {
  zoom: number;
  panX: number;
  panY: number;
  viewMode: "fit" | "manual";
  hasAutoFitted: boolean;
  hasUserInteracted: boolean;
}

export type GraphFitVerticalAlign = "center" | "top";
export type GraphFitHorizontalAlign = "center" | "left";

export interface GraphFitContentBounds {
  top: number;
  bottom: number;
}

export interface GraphFitMetrics {
  viewportWidth: number;
  viewportHeight: number;
  boundsX: number;
  boundsY: number;
  boundsWidth: number;
  boundsHeight: number;
  fitPaddingPx: number;
  boundsSource: string;
  computedScale: number;
  appliedScale: number;
  panX: number;
  panY: number;
  warning?: string;
}

export function resetGraphViewportState(
  state: GraphViewportState,
  initialZoom = 1
): void {
  state.zoom = initialZoom;
  state.panX = 0;
  state.panY = 0;
  state.viewMode = "fit";
  state.hasAutoFitted = false;
  state.hasUserInteracted = false;
}

export function getConnectionPoints(
  source: RectLike,
  target: RectLike
): ConnectionPoints {
  const sourceCenterX = source.x + source.width / 2;
  const sourceCenterY = source.y + source.height / 2;
  const targetCenterX = target.x + target.width / 2;
  const targetCenterY = target.y + target.height / 2;

  const horizontal =
    Math.abs(targetCenterX - sourceCenterX) >=
    Math.abs(targetCenterY - sourceCenterY);

  const startX = horizontal
    ? sourceCenterX < targetCenterX
      ? source.x + source.width
      : source.x
    : sourceCenterX;
  const startY = horizontal
    ? sourceCenterY
    : sourceCenterY < targetCenterY
      ? source.y + source.height
      : source.y;
  const endX = horizontal
    ? sourceCenterX < targetCenterX
      ? target.x
      : target.x + target.width
    : targetCenterX;
  const endY = horizontal
    ? targetCenterY
    : sourceCenterY < targetCenterY
      ? target.y
      : target.y + target.height;

  return {
    startX,
    startY,
    endX,
    endY,
    midX: (startX + endX) / 2,
    midY: (startY + endY) / 2
  };
}

export function computeSceneBounds(
  nodes: RectLike[],
  labels: RectLike[],
  padding = 24
): SceneBounds {
  const allRects = [...nodes, ...labels];
  if (allRects.length === 0) {
    return {
      minX: 0,
      minY: 0,
      maxX: padding * 2,
      maxY: padding * 2,
      width: padding * 2,
      height: padding * 2
    };
  }

  const minX = Math.min(...allRects.map((rect) => rect.x)) - padding;
  const minY = Math.min(...allRects.map((rect) => rect.y)) - padding;
  const maxX = Math.max(...allRects.map((rect) => rect.x + rect.width)) + padding;
  const maxY = Math.max(...allRects.map((rect) => rect.y + rect.height)) + padding;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}

export function estimateBadgeBounds(
  centerX: number,
  centerY: number,
  value: string,
  options?: {
    charWidth?: number;
    minWidth?: number;
    height?: number;
  }
): RectLike {
  const charWidth = options?.charWidth ?? 8;
  const minWidth = options?.minWidth ?? 52;
  const height = options?.height ?? 20;
  const width = Math.max(minWidth, value.length * charWidth + 12);

  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height
  };
}

export function estimateEdgeLabelBounds<TLayout extends RectLike>(
  edges: DiagramEdge[],
  layoutById: Record<string, TLayout>,
  getLabel: (edge: DiagramEdge) => string | null,
  labelOffsetY = -8
): RectLike[] {
  const bounds: RectLike[] = [];

  for (const edge of edges) {
    const source = layoutById[edge.source];
    const target = layoutById[edge.target];
    if (!source || !target) {
      continue;
    }

    const label = getLabel(edge);
    if (!label) {
      continue;
    }

    const points = getConnectionPoints(source, target);
    bounds.push(estimateBadgeBounds(points.midX, points.midY + labelOffsetY, label));
  }

  return bounds;
}

export function attachGraphViewportInteractions(
  canvas: HTMLElement,
  surface: HTMLElement,
  toolbar: ZoomToolbarElements,
  scene: { minX?: number; minY?: number; width: number; height: number; source?: string },
  options?: {
    minZoom?: number;
    maxZoom?: number;
    initialZoom?: number;
    minFitScale?: number;
    fitPaddingPx?: number;
    nodeSelector?: string;
    fitHorizontalAlign?: GraphFitHorizontalAlign;
    fitVerticalAlign?: GraphFitVerticalAlign;
    fitContentBounds?: GraphFitContentBounds;
    viewportState?: GraphViewportState;
    onViewportStateChange?: (state: GraphViewportState) => void;
    onFitMetrics?: (metrics: GraphFitMetrics) => void;
  }
): void {
  const minZoom = options?.minZoom ?? 0.45;
  const maxZoom = options?.maxZoom ?? 2.4;
  const initialZoom = options?.initialZoom ?? 1;
  const minFitScale = options?.minFitScale ?? 0;
  const fitPaddingPx = Math.max(0, options?.fitPaddingPx ?? DEFAULT_FIT_PADDING_PX);
  const nodeSelector = options?.nodeSelector;
  const fitHorizontalAlign = options?.fitHorizontalAlign ?? "center";
  const fitVerticalAlign = options?.fitVerticalAlign ?? "center";
  const fitContentBounds = options?.fitContentBounds;

  const state =
    options?.viewportState ??
    {
      zoom: initialZoom,
      panX: 0,
      panY: 0,
      viewMode: "fit" as const,
      hasAutoFitted: false,
      hasUserInteracted: false
    };

  let isPanning = false;
  let pointerId: number | null = null;
  let startClientX = 0;
  let startClientY = 0;
  let startPanX = 0;
  let startPanY = 0;
  const applyTransform = (): void => {
    surface.setCssProps({
      "--mw-preview-transform": `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`
    });
    toolbar.zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;
  };
  const notifyViewportStateChange = (): void => {
    options?.onViewportStateChange?.(state);
  };

  const fitToView = (): boolean => {
    const viewportWidth = canvas.clientWidth;
    const viewportHeight = canvas.clientHeight;
    if (viewportWidth <= 0 || viewportHeight <= 0) {
      return false;
    }
    const boundsSource = scene.source ?? "scene";
    const boundsX = scene.minX ?? 0;
    const boundsY = scene.minY ?? 0;
    const boundsWidth = scene.width;
    const boundsHeight = scene.height;
    const effectiveViewportWidth = Math.max(1, viewportWidth - fitPaddingPx * 2);
    const effectiveViewportHeight = Math.max(1, viewportHeight - fitPaddingPx * 2);
    if (!isValidFitBounds(boundsWidth, boundsHeight)) {
      state.zoom = initialZoom;
      state.panX = 0;
      state.panY = 0;
      applyTransform();
      notifyViewportStateChange();
      options?.onFitMetrics?.({
        viewportWidth,
        viewportHeight,
        boundsX,
        boundsY,
        boundsWidth,
        boundsHeight,
        fitPaddingPx,
        boundsSource,
        computedScale: 0,
        appliedScale: state.zoom,
        panX: state.panX,
        panY: state.panY,
        warning: "fit skipped: invalid bounds"
      });
      return false;
    }
    const scaleX = effectiveViewportWidth / scene.width;
    const scaleY = effectiveViewportHeight / scene.height;
    const computedScale = Math.min(scaleX, scaleY);
    if (computedScale < minFitScale) {
      state.zoom = initialZoom;
      state.panX = 0;
      state.panY = 0;
      applyTransform();
      notifyViewportStateChange();
      options?.onFitMetrics?.({
        viewportWidth,
        viewportHeight,
        boundsX,
        boundsY,
        boundsWidth,
        boundsHeight,
        fitPaddingPx,
        boundsSource,
        computedScale,
        appliedScale: state.zoom,
        panX: state.panX,
        panY: state.panY,
        warning: "fit skipped: computed scale is below the safe threshold"
      });
      return false;
    }
    const nextZoom = clamp(computedScale, minZoom, maxZoom);

    state.zoom = nextZoom;
    state.panX =
      fitHorizontalAlign === "left"
        ? resolveLeftAlignedFitPan(viewportWidth, nextZoom, scene)
        : Math.max(0, (viewportWidth - scene.width * nextZoom) / 2);
    state.panY =
      fitVerticalAlign === "top"
        ? resolveTopAlignedFitPan(viewportHeight, nextZoom, scene, fitContentBounds)
        : Math.max(0, (viewportHeight - scene.height * nextZoom) / 2);
    state.viewMode = "fit";
    applyTransform();
    notifyViewportStateChange();
    options?.onFitMetrics?.({
      viewportWidth,
      viewportHeight,
      boundsX,
      boundsY,
      boundsWidth,
      boundsHeight,
      fitPaddingPx,
      boundsSource,
      computedScale,
      appliedScale: nextZoom,
      panX: state.panX,
      panY: state.panY
    });
    return true;
  };

  const autoFitToView = (): void => {
    if (state.hasUserInteracted) {
      return;
    }

    const didFit = fitToView();
    if (didFit) {
      state.hasAutoFitted = true;
    }
  };

  const zoomAtPoint = (nextZoom: number, clientX: number, clientY: number): void => {
    const clampedZoom = clamp(nextZoom, minZoom, maxZoom);
    const rect = canvas.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    const worldX = (localX - state.panX) / state.zoom;
    const worldY = (localY - state.panY) / state.zoom;

    state.zoom = clampedZoom;
    state.panX = localX - worldX * clampedZoom;
    state.panY = localY - worldY * clampedZoom;
    applyTransform();
    notifyViewportStateChange();
  };

  canvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      state.hasUserInteracted = true;
      state.hasAutoFitted = true;
      state.viewMode = "manual";
      const delta = event.deltaY < 0 ? 1.12 : 1 / 1.12;
      zoomAtPoint(state.zoom * delta, event.clientX, event.clientY);
    },
    { passive: false }
  );

  canvas.addEventListener("pointerdown", (event) => {
    const target = event.target;
    if (nodeSelector && target instanceof Element && target.closest(nodeSelector)) {
      return;
    }

    state.hasUserInteracted = true;
    state.hasAutoFitted = true;
    state.viewMode = "manual";
    isPanning = true;
    pointerId = event.pointerId;
    startClientX = event.clientX;
    startClientY = event.clientY;
    startPanX = state.panX;
    startPanY = state.panY;
    canvas.toggleClass("model-weave-is-grabbing", true);
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!isPanning || pointerId !== event.pointerId) {
      return;
    }

    const dx = event.clientX - startClientX;
    const dy = event.clientY - startClientY;
    state.panX = startPanX + dx;
    state.panY = startPanY + dy;
    applyTransform();
    notifyViewportStateChange();
  });

  const stopPanning = (event: PointerEvent): void => {
    if (!isPanning || pointerId !== event.pointerId) {
      return;
    }

    isPanning = false;
    pointerId = null;
    canvas.toggleClass("model-weave-is-grabbing", false);
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  };

  canvas.addEventListener("pointerup", stopPanning);
  canvas.addEventListener("pointercancel", stopPanning);
  canvas.addEventListener("pointerleave", (event) => {
    if (isPanning && pointerId === event.pointerId) {
      stopPanning(event);
    }
  });

  toolbar.zoomOutButton.addEventListener("click", () => {
    state.hasUserInteracted = true;
    state.hasAutoFitted = true;
    state.viewMode = "manual";
    state.zoom = clamp(state.zoom / 1.12, minZoom, maxZoom);
    applyTransform();
    notifyViewportStateChange();
  });
  toolbar.zoomInButton.addEventListener("click", () => {
    state.hasUserInteracted = true;
    state.hasAutoFitted = true;
    state.viewMode = "manual";
    state.zoom = clamp(state.zoom * 1.12, minZoom, maxZoom);
    applyTransform();
    notifyViewportStateChange();
  });
  toolbar.fitButton.addEventListener("click", () => {
    state.hasUserInteracted = false;
    if (fitToView()) {
      state.hasAutoFitted = true;
    }
  });
  toolbar.resetButton.addEventListener("click", () => {
    state.hasUserInteracted = true;
    state.hasAutoFitted = true;
    state.viewMode = "manual";
    state.zoom = initialZoom;
    state.panX = 0;
    state.panY = 0;
    applyTransform();
    notifyViewportStateChange();
  });

  requestAnimationFrame(() => {
    if (!state.hasAutoFitted) {
      autoFitToView();
    } else {
      applyTransform();
      notifyViewportStateChange();
    }
  });

  const resizeObserver = new ResizeObserver(() => {
    if (!state.hasAutoFitted || state.viewMode === "fit") {
      autoFitToView();
      return;
    }

    applyTransform();
    notifyViewportStateChange();
  });
  resizeObserver.observe(canvas);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isValidFitBounds(width: number, height: number): boolean {
  return (
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    width > 0 &&
    height > 0 &&
    width < 100000 &&
    height < 100000
  );
}

function resolveTopAlignedFitPan(
  viewportHeight: number,
  zoom: number,
  scene: { height: number },
  fitContentBounds?: GraphFitContentBounds
): number {
  const contentTop = fitContentBounds?.top ?? 0;
  const contentBottom = fitContentBounds?.bottom ?? scene.height;
  const contentHeight = Math.max(0, contentBottom - contentTop) * zoom;
  const spareHeight = viewportHeight - contentHeight;
  const topPadding = resolveAdaptiveEdgePadding(spareHeight);

  return topPadding - contentTop * zoom;
}

function resolveLeftAlignedFitPan(
  viewportWidth: number,
  zoom: number,
  scene: { width: number }
): number {
  const contentWidth = scene.width * zoom;
  const spareWidth = viewportWidth - contentWidth;
  const leftPadding = resolveAdaptiveEdgePadding(spareWidth);

  return leftPadding;
}

function resolveAdaptiveEdgePadding(spareSpace: number): number {
  if (spareSpace >= 56) {
    return 20;
  }
  if (spareSpace >= 16) {
    return 8;
  }
  return 4;
}
