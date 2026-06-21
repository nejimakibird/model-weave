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
  const hoverIntervalMs = options.hoverIntervalMs ?? 350;
  const source = options.source ?? "model-weave";
  const nodeSelector = options.nodeSelector ?? "g.node";
  const interactions = buildMermaidNodeInteractions(svg, options.targets, nodeSelector, options.findNodeElements);
  let pointerStart: { x: number; y: number; mermaidId: string } | null = null;
  let pendingOpen: PendingMermaidOpen | null = null;
  let lastPointerupOpen: { mermaidId: string; at: number } | null = null;
  let lastHoverMermaidId = "";
  let lastHoverAt = 0;

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
      lastHoverMermaidId = "";
      return;
    }

    const shouldTrigger =
      interaction.target.mermaidId !== lastHoverMermaidId ||
      event.timeStamp - lastHoverAt >= hoverIntervalMs;
    if (!shouldTrigger) {
      return;
    }

    lastHoverMermaidId = interaction.target.mermaidId;
    lastHoverAt = event.timeStamp;
    triggerMermaidNodeHoverPreview(options, source, interaction.nodeEl, interaction.target, event);
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

  return () => controller.abort();
}

export function attachGraphElementHoverPreview(
  options: AttachGraphElementHoverPreviewOptions
): () => void {
  const fallback = options.rootEl ?? getElementHoverFallback(options.targetEl);
  if (!fallback || !options.target.linktext || !options.target.sourcePath) {
    return () => undefined;
  }

  const controller = new AbortController();
  const source = options.source ?? "model-weave";
  const hoverIntervalMs = options.hoverIntervalMs ?? 350;
  let lastHoverAt = 0;

  options.targetEl.addEventListener("pointermove", (event) => {
    if (event.timeStamp - lastHoverAt < hoverIntervalMs) {
      return;
    }

    lastHoverAt = event.timeStamp;
    triggerGraphInteractionHoverPreview(
      options.app,
      source,
      getGraphHoverParent(options.hoverParent, options.targetEl, fallback),
      options.targetEl,
      options.target,
      event as MouseEvent
    );
  }, { signal: controller.signal });

  return () => controller.abort();
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

function setMermaidNodeTitle(
  nodeEl: SVGElement,
  target: GraphInteractionTarget,
  formatTitle: AttachMermaidNodeInteractionsOptions["formatTitle"]
): void {
  const titleText = formatTitle?.(target) ?? target.label ?? target.linktext;
  if (!titleText) {
    return;
  }

  const doc = nodeEl.ownerDocument;
  const title = nodeEl.querySelector("title") ?? doc.createElementNS("http://www.w3.org/2000/svg", "title");
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
  event: MouseEvent
): void {
  if (!target.linktext || !target.sourcePath) {
    return;
  }

  const hoverParent = getGraphHoverParent(options.hoverParent, targetEl, options.rootEl);

  triggerGraphInteractionHoverPreview(
    options.app,
    source,
    hoverParent,
    targetEl,
    target,
    event
  );
}

function triggerGraphInteractionHoverPreview(
  app: App,
  source: string,
  hoverParent: HTMLElement,
  targetEl: HTMLElement | SVGElement,
  target: GraphInteractionTarget,
  event: MouseEvent
): void {
  if (!target.linktext || !target.sourcePath) {
    return;
  }

  try {
    app.workspace.trigger("hover-link", {
      event,
      source,
      hoverParent,
      targetEl,
      linktext: target.linktext,
      sourcePath: target.sourcePath
    });
  } catch {
    // Page Preview can be disabled; hover-link should remain best-effort.
  }
}

function getGraphHoverParent(
  hoverParent:
    | AttachMermaidNodeInteractionsOptions["hoverParent"]
    | AttachGraphElementHoverPreviewOptions["hoverParent"],
  targetEl: HTMLElement | SVGElement,
  fallback: HTMLElement
): HTMLElement {
  return typeof hoverParent === "function"
    ? hoverParent(targetEl, fallback)
    : hoverParent ?? fallback;
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
