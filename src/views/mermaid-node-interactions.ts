import type { App } from "obsidian";

export interface GraphInteractionTarget {
  mermaidId: string;
  linktext: string;
  sourcePath: string;
  label?: string;
  kind?: string;
  targetType?: string;
  filePath?: string;
  modelId?: string;
  modelType?: string;
  nodeId?: string;
  status?: string;
  hoverTitle?: string;
  hoverRows?: GraphInteractionHoverRow[];
  hoverText?: string;
  previewLinktext?: string;
  nativeTooltip?: string;
}

export interface GraphInteractionHoverRow {
  label: string;
  value?: string;
}

export interface AttachMermaidNodeInteractionsOptions {
  app: App;
  rootEl: HTMLElement;
  svg?: SVGElement | null;
  targets: GraphInteractionTarget[];
  source?: string;
  hoverParent?: HTMLElement | ((nodeEl: HTMLElement | SVGElement, fallback: HTMLElement) => HTMLElement);
  dragThreshold?: number;
  hoverIntervalMs?: number;
  nodeSelector?: string;
  findNodeElements?: (svg: SVGElement, targets: GraphInteractionTarget[]) => MermaidNodeElementMatch[];
  nodeClassName?: string;
  formatTitle?: (target: GraphInteractionTarget) => string | undefined;
  openLinkText?: (target: GraphInteractionTarget, event: MouseEvent) => void | Promise<void>;
  isDebugEnabled?: () => boolean;
  debugName?: string;
}

export interface AttachGraphElementHoverPreviewOptions {
  app: App;
  targetEl: HTMLElement | SVGElement;
  target: GraphInteractionTarget;
  rootEl?: HTMLElement;
  source?: string;
  hoverParent?:
    | HTMLElement
    | ((targetEl: HTMLElement | SVGElement, fallback: HTMLElement) => HTMLElement);
  hoverIntervalMs?: number;
  isDebugEnabled?: () => boolean;
  debugName?: string;
}

export interface MermaidNodeElementMatch {
  element: SVGElement;
  target: GraphInteractionTarget;
}

interface MermaidNodeInteraction {
  nodeEl: SVGElement;
  target: GraphInteractionTarget;
}

interface PendingMermaidOpen {
  pointerId: number;
  startX: number;
  startY: number;
  target: GraphInteractionTarget;
  opened: boolean;
  canceled: boolean;
}

interface HoverPreviewDebugOptions {
  debugName?: string;
  isDebugEnabled?: () => boolean;
}

interface HoverPreviewDebugContext extends HoverStateDebugFields {
  originalTargetEl: HTMLElement | SVGElement;
  hoverLinkTargetEl: HTMLElement | SVGElement;
  hoverParent: HTMLElement;
  target: GraphInteractionTarget;
  originalEvent: MouseEvent;
  hoverLinkEvent: MouseEvent;
  safeCoordinateApplied: boolean;
  originalClientY: number;
  safeClientY: number;
  reusableAnchorTargetUsed: boolean;
}

interface HoverLinkTargetResolution {
  targetEl: HTMLElement | SVGElement;
  reusableAnchorTargetUsed: boolean;
}

interface GraphHoverState {
  activeHoverNode: HTMLElement | SVGElement | null;
  activeHoverLinktext: string;
  activeHoverSourcePath: string;
  activeHoverTargetEl: HTMLElement | SVGElement | null;
}

interface HoverStateDebugFields {
  activeHoverNodeId?: string;
  previousHoverNodeId?: string;
  hoverStateAction?: "enter" | "same-node-move" | "leave-node" | "blank-clear" | "switch-node" | "cleanup";
  anchorVisible?: boolean;
  staleHoverSuppressed?: boolean;
  hoverLinkTriggered?: boolean;
}

const HOVER_POPOVER_SELECTOR = ".hover-popover";
const FOCUS_MODE_OVERLAY_SELECTOR = ".model-weave-viewer-focus-mode";

export function attachMermaidNodeInteractions(
  options: AttachMermaidNodeInteractionsOptions
): () => void {
  if (options.targets.length === 0) {
    return () => undefined;
  }

  const svg = options.svg ?? options.rootEl.querySelector<SVGElement>("svg");
  if (!svg) {
    return () => undefined;
  }

  const controller = new AbortController();
  const dragThreshold = options.dragThreshold ?? 6;
  const source = options.source ?? "model-weave";
  const nodeSelector = options.nodeSelector ?? "g.node";
  const interactions = buildMermaidNodeInteractions(svg, options.targets, nodeSelector, options.findNodeElements);
  let pointerStart: { x: number; y: number; mermaidId: string } | null = null;
  let pendingOpen: PendingMermaidOpen | null = null;
  let lastPointerupOpen: { mermaidId: string; at: number } | null = null;
  const hoverState: GraphHoverState = createGraphHoverState();

  for (const interaction of interactions) {
    if (options.nodeClassName) {
      interaction.nodeEl.classList.add(options.nodeClassName);
    }
    setMermaidNodeTitle(interaction.nodeEl, interaction.target, options.formatTitle);
  }

  options.rootEl.addEventListener("pointerdown", (event) => {
    const interaction = getMermaidNodeInteractionFromEvent(event, interactions);
    pointerStart = interaction
      ? {
          x: event.clientX,
          y: event.clientY,
          mermaidId: interaction.target.mermaidId
        }
      : null;
    pendingOpen = interaction
      ? {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          target: interaction.target,
          opened: false,
          canceled: false
        }
      : null;
    logMermaidInteractionClickDebug(options, "pointerdown", event, interaction, undefined, false, Boolean(interaction), false);
  }, { signal: controller.signal });


  const documentEl = options.rootEl.ownerDocument;

  documentEl.addEventListener("pointermove", (event) => {
    if (!pendingOpen || pendingOpen.pointerId !== event.pointerId) {
      return;
    }

    const distance = getPendingMermaidOpenDistance(pendingOpen, event);
    if (distance > dragThreshold) {
      pendingOpen.canceled = true;
    }
  }, { signal: controller.signal });

  documentEl.addEventListener("pointerup", (event) => {
    const pending = pendingOpen;
    if (!pending || pending.pointerId !== event.pointerId) {
      return;
    }

    const distance = getPendingMermaidOpenDistance(pending, event);
    const isDrag = distance > dragThreshold;
    const willOpen = Boolean(!pending.canceled && !pending.opened && !isDrag);
    const interaction = findMermaidNodeInteractionByTarget(interactions, pending.target);
    logMermaidInteractionClickDebug(options, "pointerup", event, interaction, distance, isDrag, willOpen, pending.opened);
    if (willOpen) {
      event.preventDefault();
      event.stopPropagation();
      pending.opened = true;
      lastPointerupOpen = { mermaidId: pending.target.mermaidId, at: event.timeStamp };
      openMermaidNodeTarget(options, pending.target, event);
    }

    pendingOpen = null;
  }, { signal: controller.signal });

  documentEl.addEventListener("pointercancel", (event) => {
    if (!pendingOpen || pendingOpen.pointerId !== event.pointerId) {
      return;
    }

    pendingOpen.canceled = true;
    pendingOpen = null;
  }, { signal: controller.signal });

  options.rootEl.addEventListener("pointermove", (event) => {
    const interaction = getMermaidNodeInteractionFromEvent(event, interactions);
    if (!interaction) {
      clearGraphHoverState(hoverState, "blank-clear", {
        debugName: options.debugName,
        isDebugEnabled: options.isDebugEnabled
      }, options.rootEl, event, false, true);
      return;
    }

    const isSameNode = hoverState.activeHoverNode === interaction.nodeEl;
    const isSameLink =
      hoverState.activeHoverLinktext === interaction.target.linktext &&
      hoverState.activeHoverSourcePath === interaction.target.sourcePath;
    if (isSameNode && isSameLink) {
      logGraphHoverStateDebug(
        { debugName: options.debugName, isDebugEnabled: options.isDebugEnabled },
        hoverState,
        "same-node-move",
        event,
        false,
        false
      );
      return;
    }

    const action = hoverState.activeHoverNode ? "switch-node" : "enter";
    const previousHoverNodeId = getGraphHoverNodeId(hoverState.activeHoverNode);
    clearGraphHoverState(hoverState, action, {
      debugName: options.debugName,
      isDebugEnabled: options.isDebugEnabled
    }, options.rootEl, event, false);
    const hoverLinkTarget = triggerMermaidNodeHoverPreview(
      options,
      source,
      interaction.nodeEl,
      interaction.target,
      event,
      {
        activeHoverNodeId: getGraphHoverNodeId(interaction.nodeEl),
        previousHoverNodeId,
        hoverStateAction: action,
        anchorVisible: true,
        staleHoverSuppressed: false,
        hoverLinkTriggered: true
      }
    );
    setGraphHoverState(hoverState, interaction.nodeEl, interaction.target, hoverLinkTarget);
  }, { signal: controller.signal });

  options.rootEl.addEventListener("pointerleave", (event) => {
    clearGraphHoverState(hoverState, "leave-node", {
      debugName: options.debugName,
      isDebugEnabled: options.isDebugEnabled
    }, options.rootEl, event, false);
  }, { signal: controller.signal });

  options.rootEl.addEventListener("click", (event) => {
    const interaction = getMermaidNodeInteractionFromEvent(event, interactions);
    const dragDistance = getMermaidNodeDragDistance(pointerStart, event);
    const willOpen = Boolean(
      interaction && isMermaidNodeClick(pointerStart, event, interaction.target.mermaidId, dragThreshold)
    );
    const alreadyOpenedByPointerup = Boolean(
      interaction &&
      lastPointerupOpen?.mermaidId === interaction.target.mermaidId &&
      event.timeStamp - lastPointerupOpen.at < 1000
    );
    logMermaidInteractionClickDebug(
      options,
      "click",
      event,
      interaction,
      dragDistance,
      !willOpen && dragDistance !== undefined && dragDistance > dragThreshold,
      willOpen && !alreadyOpenedByPointerup,
      alreadyOpenedByPointerup || (pendingOpen?.opened ?? false)
    );
    if (!interaction || !willOpen || alreadyOpenedByPointerup) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    if (pendingOpen && pendingOpen.target === interaction.target) {
      if (pendingOpen.opened) {
        pendingOpen = null;
        return;
      }
      pendingOpen.opened = true;
    }
    openMermaidNodeTarget(options, interaction.target, event);
    pendingOpen = null;
  }, { signal: controller.signal });

  return () => {
    controller.abort();
    clearGraphHoverState(hoverState, "cleanup", {
      debugName: options.debugName,
      isDebugEnabled: options.isDebugEnabled
    }, options.rootEl, undefined, false);
  };
}

export function attachGraphElementHoverPreview(
  options: AttachGraphElementHoverPreviewOptions
): () => void {
  const fallback = options.rootEl ?? getElementHoverFallback(options.targetEl);
  if (!fallback || !canShowGraphInteractionHover(options.target)) {
    return () => undefined;
  }

  const controller = new AbortController();
  const source = options.source ?? "model-weave";
  const hoverState: GraphHoverState = createGraphHoverState();

  options.targetEl.addEventListener("pointermove", (event) => {
    const isSameNode = hoverState.activeHoverNode === options.targetEl;
    const isSameLink =
      hoverState.activeHoverLinktext === options.target.linktext &&
      hoverState.activeHoverSourcePath === options.target.sourcePath;
    if (isSameNode && isSameLink) {
      logGraphHoverStateDebug(
        { debugName: options.debugName, isDebugEnabled: options.isDebugEnabled },
        hoverState,
        "same-node-move",
        event,
        false,
        false
      );
      return;
    }

    const action = hoverState.activeHoverNode ? "switch-node" : "enter";
    const previousHoverNodeId = getGraphHoverNodeId(hoverState.activeHoverNode);
    clearGraphHoverState(hoverState, action, {
      debugName: options.debugName,
      isDebugEnabled: options.isDebugEnabled
    }, fallback, event, false);
    const hoverLinkTarget = triggerGraphInteractionHover(
      options.app,
      source,
      resolveGraphHoverParent(options.targetEl, fallback, options.hoverParent),
      options.targetEl,
      options.target,
      event as MouseEvent,
      {
        debugName: options.debugName,
        isDebugEnabled: options.isDebugEnabled
      },
      {
        activeHoverNodeId: getGraphHoverNodeId(options.targetEl),
        previousHoverNodeId,
        hoverStateAction: action,
        anchorVisible: true,
        staleHoverSuppressed: false,
        hoverLinkTriggered: true
      }
    );
    setGraphHoverState(hoverState, options.targetEl, options.target, hoverLinkTarget);
  }, { signal: controller.signal });

  options.targetEl.addEventListener("pointerleave", (event) => {
    clearGraphHoverState(hoverState, "leave-node", {
      debugName: options.debugName,
      isDebugEnabled: options.isDebugEnabled
    }, fallback, event, false);
  }, { signal: controller.signal });

  return () => {
    controller.abort();
    clearGraphHoverState(hoverState, "cleanup", {
      debugName: options.debugName,
      isDebugEnabled: options.isDebugEnabled
    }, fallback, undefined, false);
  };
}

function createGraphHoverState(): GraphHoverState {
  return {
    activeHoverNode: null,
    activeHoverLinktext: "",
    activeHoverSourcePath: "",
    activeHoverTargetEl: null
  };
}

function setGraphHoverState(
  state: GraphHoverState,
  node: HTMLElement | SVGElement,
  target: GraphInteractionTarget,
  hoverLinkTarget: HoverLinkTargetResolution | null
): void {
  state.activeHoverNode = node;
  state.activeHoverLinktext = target.linktext;
  state.activeHoverSourcePath = target.sourcePath;
  state.activeHoverTargetEl = hoverLinkTarget?.targetEl ?? null;
}

function clearGraphHoverState(
  state: GraphHoverState,
  action: NonNullable<HoverStateDebugFields["hoverStateAction"]>,
  debug: HoverPreviewDebugOptions,
  rootEl: HTMLElement,
  event: Event | undefined,
  suppressSyntheticLeave: boolean,
  staleHoverSuppressed = false
): void {
  const previousHoverNodeId = getGraphHoverNodeId(state.activeHoverNode);
  const activeHoverTargetEl = state.activeHoverTargetEl;
  const hadActiveNode = Boolean(state.activeHoverNode);
  state.activeHoverNode = null;
  state.activeHoverLinktext = "";
  state.activeHoverSourcePath = "";
  state.activeHoverTargetEl = null;

  if (activeHoverTargetEl && !suppressSyntheticLeave) {
    if (isGraphFallbackHoverCard(activeHoverTargetEl)) {
      activeHoverTargetEl.remove();
    } else {
      dispatchGraphHoverTargetLeave(activeHoverTargetEl);
    }
  } else if (hadActiveNode && !suppressSyntheticLeave) {
    dispatchGraphHoverTargetLeave(rootEl);
  }

  logGraphHoverStateDebug(
    debug,
    state,
    action,
    event,
    staleHoverSuppressed,
    false,
    previousHoverNodeId
  );
}

function logGraphHoverStateDebug(
  debug: HoverPreviewDebugOptions | undefined,
  state: GraphHoverState,
  action: NonNullable<HoverStateDebugFields["hoverStateAction"]>,
  event: Event | undefined,
  staleHoverSuppressed: boolean,
  hoverLinkTriggered: boolean,
  previousHoverNodeId?: string
): void {
  if (debug?.isDebugEnabled?.() !== true) {
    return;
  }

  const mouseEvent = event instanceof MouseEvent ? event : null;
  console.debug("Model Weave graph hover state debug", {
    debugName: debug.debugName,
    activeHoverNodeId: getGraphHoverNodeId(state.activeHoverNode),
    previousHoverNodeId,
    hoverStateAction: action,
    anchorVisible: Boolean(state.activeHoverTargetEl),
    staleHoverSuppressed,
    hoverLinkTriggered,
    clientX: mouseEvent?.clientX,
    clientY: mouseEvent?.clientY
  });
}

function getGraphHoverNodeId(node: HTMLElement | SVGElement | null): string | undefined {
  return node?.id || node?.getAttribute("data-id") || undefined;
}

function buildMermaidNodeInteractions(
  svg: SVGElement,
  targets: GraphInteractionTarget[],
  nodeSelector: string,
  findNodeElements: AttachMermaidNodeInteractionsOptions["findNodeElements"]
): MermaidNodeInteraction[] {
  if (findNodeElements) {
    return findNodeElements(svg, targets).map((match) => ({
      nodeEl: match.element,
      target: match.target
    }));
  }

  return targets
    .map((target) => {
      const nodeEl = findMermaidSvgNode(svg, target.mermaidId, nodeSelector);
      return nodeEl ? { nodeEl, target } : null;
    })
    .filter((interaction): interaction is MermaidNodeInteraction => Boolean(interaction));
}

function findMermaidSvgNode(
  svg: SVGElement,
  mermaidId: string,
  nodeSelector: string
): SVGElement | null {
  const nodes = Array.from(svg.querySelectorAll<SVGElement>(nodeSelector));
  return nodes.find((node) => node.id.includes(mermaidId)) ?? null;
}

function getMermaidNodeInteractionFromEvent(
  event: Event,
  interactions: MermaidNodeInteraction[]
): MermaidNodeInteraction | null {
  const eventTarget = event.target;
  if (!(eventTarget instanceof Element)) {
    return null;
  }

  return interactions.find((interaction) =>
    interaction.nodeEl === eventTarget || interaction.nodeEl.contains(eventTarget)
  ) ?? null;
}

function findMermaidNodeInteractionByTarget(
  interactions: MermaidNodeInteraction[],
  target: GraphInteractionTarget
): MermaidNodeInteraction | null {
  return interactions.find((interaction) => interaction.target === target) ?? null;
}

export function getGraphInteractionNativeTooltipText(
  target: GraphInteractionTarget,
  fallbackTitle?: string
): string | undefined {
  return target.nativeTooltip ?? fallbackTitle ?? target.label ?? target.linktext;
}

function setMermaidNodeTitle(
  nodeEl: SVGElement,
  target: GraphInteractionTarget,
  formatTitle: AttachMermaidNodeInteractionsOptions["formatTitle"]
): void {
  const existingTitle = nodeEl.querySelector("title");
  const titleText = getGraphInteractionNativeTooltipText(target, formatTitle?.(target));
  if (!titleText) {
    existingTitle?.remove();
    return;
  }

  const doc = nodeEl.ownerDocument;
  const title = existingTitle ?? doc.win.createSvg("title");
  title.textContent = titleText;
  if (!title.parentElement) {
    nodeEl.prepend(title);
  }
}

function triggerMermaidNodeHoverPreview(
  options: AttachMermaidNodeInteractionsOptions,
  source: string,
  targetEl: SVGElement,
  target: GraphInteractionTarget,
  event: MouseEvent,
  stateDebug?: HoverStateDebugFields
): HoverLinkTargetResolution | null {
  if (!canShowGraphInteractionHover(target)) {
    return null;
  }

  const hoverParent = resolveGraphHoverParent(targetEl, options.rootEl, options.hoverParent);

  return triggerGraphInteractionHover(
    options.app,
    source,
    hoverParent,
    targetEl,
    target,
    event,
    {
      debugName: options.debugName,
      isDebugEnabled: options.isDebugEnabled
    },
    stateDebug
  );
}

function canShowGraphInteractionHover(target: GraphInteractionTarget): boolean {
  return Boolean(
    (target.previewLinktext && target.sourcePath) ||
    (target.linktext && target.sourcePath && !target.hoverRows?.length) ||
    target.hoverRows?.length
  );
}

function triggerGraphInteractionHover(
  app: App,
  source: string,
  hoverParent: HTMLElement,
  targetEl: HTMLElement | SVGElement,
  target: GraphInteractionTarget,
  event: MouseEvent,
  debug?: HoverPreviewDebugOptions,
  stateDebug?: HoverStateDebugFields
): HoverLinkTargetResolution | null {
  const previewLinktext = getGraphInteractionPreviewLinktext(target);
  if (previewLinktext) {
    const previewTarget = { ...target, linktext: previewLinktext };
    return triggerGraphInteractionHoverPreview(
      app,
      source,
      hoverParent,
      targetEl,
      previewTarget,
      event,
      debug,
      stateDebug
    ) ?? triggerGraphInteractionFallbackHover(hoverParent, target, event);
  }

  return triggerGraphInteractionFallbackHover(hoverParent, target, event);
}

function getGraphInteractionPreviewLinktext(target: GraphInteractionTarget): string | null {
  const explicit = target.previewLinktext?.trim();
  if (explicit) {
    return explicit;
  }
  if (target.hoverRows?.length) {
    return null;
  }
  const linktext = target.linktext?.trim();
  return linktext && target.sourcePath ? linktext : null;
}

function triggerGraphInteractionFallbackHover(
  hoverParent: HTMLElement,
  target: GraphInteractionTarget,
  event: MouseEvent
): HoverLinkTargetResolution | null {
  if (!target.hoverRows?.length) {
    return null;
  }

  const card = createGraphFallbackHoverCard(hoverParent, target, event);
  return { targetEl: card, reusableAnchorTargetUsed: false };
}

function createGraphFallbackHoverCard(
  hoverParent: HTMLElement,
  target: GraphInteractionTarget,
  event: MouseEvent
): HTMLElement {
  const doc = hoverParent.ownerDocument;
  const existing = hoverParent.querySelectorAll<HTMLElement>(".model-weave-graph-hover-card");
  existing.forEach((element) => element.remove());

  const card = doc.win.createDiv();
  card.className = "model-weave-graph-hover-card";
  card.setAttribute("role", "tooltip");

  const title = doc.win.createDiv();
  title.className = "model-weave-graph-hover-card-title";
  title.textContent = target.hoverTitle ?? target.label ?? "Model Weave";
  card.appendChild(title);

  const rows = doc.win.createEl("dl");
  rows.className = "model-weave-graph-hover-card-rows";
  for (const row of target.hoverRows ?? []) {
    const term = doc.win.createEl("dt");
    term.textContent = row.label;
    const description = doc.win.createEl("dd");
    description.textContent = row.value?.trim() || "-";
    rows.appendChild(term);
    rows.appendChild(description);
  }
  card.appendChild(rows);

  hoverParent.appendChild(card);
  positionGraphFallbackHoverCard(card, hoverParent, event);
  return card;
}

function positionGraphFallbackHoverCard(
  card: HTMLElement,
  hoverParent: HTMLElement,
  event: MouseEvent
): void {
  const view = hoverParent.ownerDocument.defaultView;
  const viewportWidth = view?.innerWidth ?? event.clientX + 360;
  const x = Math.min(Math.max(12, event.clientX + 14), Math.max(12, viewportWidth - 380));
  const y = Math.max(12, event.clientY + 14);
  card.style.left = `${x}px`;
  card.style.top = `${y}px`;
}

function isGraphFallbackHoverCard(element: HTMLElement | SVGElement): element is HTMLElement {
  return element instanceof HTMLElement && element.classList.contains("model-weave-graph-hover-card");
}

function triggerGraphInteractionHoverPreview(
  app: App,
  source: string,
  hoverParent: HTMLElement,
  targetEl: HTMLElement | SVGElement,
  target: GraphInteractionTarget,
  event: MouseEvent,
  debug?: HoverPreviewDebugOptions,
  stateDebug?: HoverStateDebugFields
): HoverLinkTargetResolution | null {
  if (!target.linktext || !target.sourcePath) {
    return null;
  }

  const hoverLinkEvent = createHoverLinkEventWithSafeCoordinates(event, hoverParent);
  const hoverLinkTarget = resolveGraphHoverLinkTarget(targetEl, hoverParent);
  const debugContext: HoverPreviewDebugContext = {
    originalTargetEl: targetEl,
    hoverLinkTargetEl: hoverLinkTarget.targetEl,
    hoverParent,
    target,
    originalEvent: event,
    hoverLinkEvent: hoverLinkEvent.event,
    safeCoordinateApplied: hoverLinkEvent.safeCoordinateApplied,
    originalClientY: event.clientY,
    safeClientY: hoverLinkEvent.safeClientY,
    reusableAnchorTargetUsed: hoverLinkTarget.reusableAnchorTargetUsed,
    activeHoverNodeId: stateDebug?.activeHoverNodeId,
    previousHoverNodeId: stateDebug?.previousHoverNodeId,
    hoverStateAction: stateDebug?.hoverStateAction,
    anchorVisible: stateDebug?.anchorVisible ?? Boolean(hoverLinkTarget.targetEl),
    staleHoverSuppressed: stateDebug?.staleHoverSuppressed ?? false,
    hoverLinkTriggered: stateDebug?.hoverLinkTriggered ?? true
  };

  logGraphInteractionHoverDebug(debug, debugContext, "before-trigger");
  try {
    app.workspace.trigger("hover-link", {
      event: hoverLinkEvent.event,
      source,
      hoverParent,
      targetEl: hoverLinkTarget.targetEl,
      linktext: target.linktext,
      sourcePath: target.sourcePath
    });
    logGraphInteractionHoverDebug(debug, debugContext, "after-trigger");
    scheduleDelayedGraphInteractionHoverDebug(debug, debugContext);
    return hoverLinkTarget;
  } catch {
    // Page Preview can be disabled; hover-link should remain best-effort.
    logGraphInteractionHoverDebug(debug, debugContext, "trigger-error");
    return null;
  }
}

export function resolveGraphHoverLinkTargetElement(
  targetEl: HTMLElement | SVGElement,
  hoverParent: HTMLElement
): HTMLElement | SVGElement {
  return targetEl.closest<HTMLElement>(".model-weave-graph-canvas")
    ?? targetEl.closest<HTMLElement>(".model-weave-graph-viewport")
    ?? targetEl.closest<HTMLElement>(".model-weave-viewer-root")
    ?? hoverParent;
}

function resolveGraphHoverLinkTarget(
  targetEl: HTMLElement | SVGElement,
  hoverParent: HTMLElement
): HoverLinkTargetResolution {
  return {
    targetEl: resolveGraphHoverLinkTargetElement(targetEl, hoverParent),
    reusableAnchorTargetUsed: false
  };
}


export function resolveGraphHoverParent(
  targetEl: HTMLElement | SVGElement,
  fallback: HTMLElement,
  hoverParent:
    | AttachMermaidNodeInteractionsOptions["hoverParent"]
    | AttachGraphElementHoverPreviewOptions["hoverParent"] = undefined
): HTMLElement {
  const explicitHoverParent = typeof hoverParent === "function"
    ? hoverParent(targetEl, fallback)
    : hoverParent;
  if (explicitHoverParent) {
    return explicitHoverParent;
  }

  const viewOnlyStage = targetEl.closest<HTMLElement>(".model-weave-view-only-stage");
  if (viewOnlyStage) {
    return viewOnlyStage;
  }

  const viewerRoot = targetEl.closest<HTMLElement>(".model-weave-viewer-root");
  if (viewerRoot) {
    return viewerRoot;
  }

  const workspaceLeafContent = targetEl.closest<HTMLElement>(".workspace-leaf-content");
  if (workspaceLeafContent) {
    return workspaceLeafContent;
  }

  return fallback;
}

function getElementHoverFallback(targetEl: HTMLElement | SVGElement): HTMLElement | null {
  return targetEl instanceof HTMLElement
    ? targetEl
    : targetEl.ownerSVGElement?.parentElement ?? null;
}

function isMermaidNodeClick(
  pointerStart: { x: number; y: number; mermaidId: string } | null,
  event: MouseEvent,
  mermaidId: string | undefined,
  dragThreshold: number
): boolean {
  if (!pointerStart) {
    return true;
  }
  if (mermaidId && pointerStart.mermaidId !== mermaidId) {
    return false;
  }

  const distance = getMermaidNodeDragDistance(pointerStart, event);
  return distance === undefined || distance <= dragThreshold;
}

function getMermaidNodeDragDistance(
  pointerStart: { x: number; y: number; mermaidId: string } | null,
  event: MouseEvent
): number | undefined {
  if (!pointerStart) {
    return undefined;
  }

  return Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
}

function getPendingMermaidOpenDistance(
  pendingOpen: PendingMermaidOpen,
  event: PointerEvent
): number {
  return Math.hypot(event.clientX - pendingOpen.startX, event.clientY - pendingOpen.startY);
}

function openMermaidNodeTarget(
  options: AttachMermaidNodeInteractionsOptions,
  target: GraphInteractionTarget,
  event: MouseEvent
): void {
  logMermaidInteractionOpenDebug(options, target);
  if (options.openLinkText) {
    void options.openLinkText(target, event);
    return;
  }

  void options.app.workspace.openLinkText(
    target.linktext,
    target.sourcePath,
    event.ctrlKey || event.metaKey
  );
}


function logMermaidInteractionClickDebug(
  options: AttachMermaidNodeInteractionsOptions,
  phase: string,
  event: MouseEvent,
  interaction: MermaidNodeInteraction | null,
  dragDistance: number | undefined,
  isDrag: boolean,
  willOpen: boolean,
  opened = false
): void {
  if (options.isDebugEnabled?.() !== true) {
    return;
  }

  const eventTarget = event.target instanceof Element ? event.target : null;
  const currentTarget = event.currentTarget instanceof Element ? event.currentTarget : null;
  const target = interaction?.target;
  console.debug("Model Weave mermaid interaction click debug", {
    debugName: options.debugName,
    phase,
    eventTargetTag: eventTarget?.tagName,
    eventTargetId: eventTarget?.id,
    currentTargetTag: currentTarget?.tagName,
    currentTargetId: currentTarget?.id,
    resolvedTarget: target
      ? {
          mermaidId: target.mermaidId,
          linktext: target.linktext,
          sourcePath: target.sourcePath,
          filePath: target.filePath,
          kind: target.kind,
          targetType: target.targetType
        }
      : null,
    dragDistance,
    isDrag,
    willOpen,
    opened
  });
}

function logMermaidInteractionOpenDebug(
  options: AttachMermaidNodeInteractionsOptions,
  target: GraphInteractionTarget
): void {
  if (options.isDebugEnabled?.() !== true) {
    return;
  }

  console.debug("Model Weave mermaid interaction open link", {
    debugName: options.debugName,
    linktext: target.linktext,
    sourcePath: target.sourcePath,
    filePath: target.filePath
  });
}

function logGraphInteractionHoverDebug(
  debug: HoverPreviewDebugOptions | undefined,
  context: HoverPreviewDebugContext,
  phase: "before-trigger" | "after-trigger" | "after-300ms" | "after-1000ms" | "trigger-error"
): void {
  if (debug?.isDebugEnabled?.() !== true) {
    return;
  }

  const doc = context.originalTargetEl.ownerDocument;
  const shouldInspectPopovers =
    phase === "after-trigger" || phase === "after-300ms" || phase === "after-1000ms";
  const hoverPopovers = Array.from(doc.querySelectorAll<HTMLElement>(HOVER_POPOVER_SELECTOR));
  const focusOverlay = doc.querySelector<HTMLElement>(FOCUS_MODE_OVERLAY_SELECTOR);
  console.debug("Model Weave graph hover preview debug", {
    debugName: debug.debugName,
    phase,
    linktext: context.target.linktext,
    sourcePath: context.target.sourcePath,
    originalTargetEl: describeElement(context.originalTargetEl),
    hoverLinkTargetEl: describeElement(context.hoverLinkTargetEl),
    hoverParent: describeElement(context.hoverParent),
    activeHoverNodeId: context.activeHoverNodeId,
    previousHoverNodeId: context.previousHoverNodeId,
    hoverStateAction: context.hoverStateAction,
    anchorVisible: context.anchorVisible,
    staleHoverSuppressed: context.staleHoverSuppressed,
    hoverLinkTriggered: context.hoverLinkTriggered,
    reusableAnchorTargetUsed: context.reusableAnchorTargetUsed,
    clientX: context.hoverLinkEvent.clientX,
    clientY: context.hoverLinkEvent.clientY,
    originalClientY: context.originalClientY,
    safeClientY: context.safeClientY,
    safeCoordinateApplied: context.safeCoordinateApplied,
    targetRect: toDebugRect(context.originalTargetEl.getBoundingClientRect()),
    hoverLinkTargetRect: toDebugRect(context.hoverLinkTargetEl.getBoundingClientRect()),
    hoverParentRect: toDebugRect(context.hoverParent.getBoundingClientRect()),
    focusModeActive: Boolean(doc.body.classList.contains("model-weave-focus-mode-active")),
    viewOnlyModeActive: Boolean(context.originalTargetEl.closest(".model-weave-viewer-view-only")),
    hoverPopoverSelector: HOVER_POPOVER_SELECTOR,
    hoverPopoverCount: hoverPopovers.length,
    hoverPopoverDetails: shouldInspectPopovers
      ? hoverPopovers.map((element) => describeDebugElementDetails(element, HOVER_POPOVER_SELECTOR))
      : undefined,
    focusOverlaySelector: FOCUS_MODE_OVERLAY_SELECTOR,
    focusOverlayDetails: shouldInspectPopovers && focusOverlay
      ? describeDebugElementDetails(focusOverlay, FOCUS_MODE_OVERLAY_SELECTOR)
      : null
  });
}

function scheduleDelayedGraphInteractionHoverDebug(
  debug: HoverPreviewDebugOptions | undefined,
  context: HoverPreviewDebugContext
): void {
  if (debug?.isDebugEnabled?.() !== true) {
    return;
  }

  const view = context.originalTargetEl.ownerDocument.defaultView;
  view?.setTimeout(() => {
    logGraphInteractionHoverDebug(debug, context, "after-300ms");
  }, 300);
  view?.setTimeout(() => {
    logGraphInteractionHoverDebug(debug, context, "after-1000ms");
  }, 1000);
}

function dispatchGraphHoverTargetLeave(targetEl: HTMLElement | SVGElement): void {
  const view = targetEl.ownerDocument.defaultView;
  if (!view) {
    return;
  }

  targetEl.dispatchEvent(new view.MouseEvent("mouseout", { bubbles: true }));
  targetEl.dispatchEvent(new view.MouseEvent("mouseleave", { bubbles: false }));
}

function createHoverLinkEventWithSafeCoordinates(
  event: MouseEvent,
  hoverParent: HTMLElement
): {
  event: MouseEvent;
  safeCoordinateApplied: boolean;
  safeClientY: number;
} {
  const hoverParentRect = hoverParent.getBoundingClientRect();
  const safeTop = Math.max(hoverParentRect.top + 160, 160);
  const safeClientY = Math.max(event.clientY, safeTop);
  if (safeClientY === event.clientY) {
    return {
      event,
      safeCoordinateApplied: false,
      safeClientY
    };
  }

  const hoverLinkEvent = Object.create(event) as MouseEvent;
  Object.defineProperty(hoverLinkEvent, "clientY", {
    configurable: true,
    enumerable: true,
    value: safeClientY
  });
  return {
    event: hoverLinkEvent,
    safeCoordinateApplied: true,
    safeClientY
  };
}

function describeElement(element: Element): {
  tag: string;
  id?: string;
  className?: string;
} {
  const className = typeof element.className === "string"
    ? element.className
    : element.getAttribute("class") ?? undefined;
  return {
    tag: element.tagName,
    id: element.id || undefined,
    className: className || undefined
  };
}

function describeDebugElementDetails(
  element: HTMLElement,
  selectorMatched: string
): {
  selectorMatched: string;
  className?: string;
  boundingClientRect: ReturnType<typeof toDebugRect>;
  computedZIndex: string;
  computedPosition: string;
  computedDisplay: string;
  computedVisibility: string;
  computedOpacity: string;
  computedPointerEvents: string;
  computedTransform: string;
  computedOverflow: string;
} {
  const view = element.ownerDocument.defaultView;
  const style = view?.getComputedStyle(element);
  return {
    selectorMatched,
    className: element.className || undefined,
    boundingClientRect: toDebugRect(element.getBoundingClientRect()),
    computedZIndex: style?.zIndex ?? "",
    computedPosition: style?.position ?? "",
    computedDisplay: style?.display ?? "",
    computedVisibility: style?.visibility ?? "",
    computedOpacity: style?.opacity ?? "",
    computedPointerEvents: style?.pointerEvents ?? "",
    computedTransform: style?.transform ?? "",
    computedOverflow: style?.overflow ?? ""
  };
}

function toDebugRect(rect: DOMRect): {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
} {
  return {
    left: Math.round(rect.left),
    top: Math.round(rect.top),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    right: Math.round(rect.right),
    bottom: Math.round(rect.bottom)
  };
}
