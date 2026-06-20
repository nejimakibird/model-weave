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
  hoverParent?: HTMLElement | ((nodeEl: SVGElement, fallback: HTMLElement) => HTMLElement);
  dragThreshold?: number;
  hoverIntervalMs?: number;
  nodeClassName?: string;
  formatTitle?: (target: GraphInteractionTarget) => string | undefined;
  openLinkText?: (target: GraphInteractionTarget, event: MouseEvent) => void | Promise<void>;
  isDebugEnabled?: () => boolean;
}

interface MermaidNodeInteraction {
  nodeEl: SVGElement;
  target: GraphInteractionTarget;
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
  let pointerStart: { x: number; y: number; mermaidId: string } | null = null;
  let lastHoverMermaidId = "";
  let lastHoverAt = 0;

  for (const target of options.targets) {
    const nodeEl = findMermaidSvgNode(svg, target.mermaidId);
    if (!nodeEl) {
      continue;
    }

    if (options.nodeClassName) {
      nodeEl.classList.add(options.nodeClassName);
    }
    setMermaidNodeTitle(nodeEl, target, options.formatTitle);
  }

  options.rootEl.addEventListener("pointerdown", (event) => {
    const interaction = getMermaidNodeInteractionFromEvent(event, options.targets);
    pointerStart = interaction
      ? {
          x: event.clientX,
          y: event.clientY,
          mermaidId: interaction.target.mermaidId
        }
      : null;
  }, { signal: controller.signal });

  options.rootEl.addEventListener("pointermove", (event) => {
    const interaction = getMermaidNodeInteractionFromEvent(event, options.targets);
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
    const interaction = getMermaidNodeInteractionFromEvent(event, options.targets);
    if (!interaction || !isMermaidNodeClick(pointerStart, event, interaction.target.mermaidId, dragThreshold)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    openMermaidNodeTarget(options, interaction.target, event);
  }, { signal: controller.signal });

  return () => controller.abort();
}

function findMermaidSvgNode(svg: SVGElement, mermaidId: string): SVGElement | null {
  const nodes = Array.from(svg.querySelectorAll<SVGElement>("g.node"));
  return nodes.find((node) => node.id.includes(mermaidId)) ?? null;
}

function getMermaidNodeInteractionFromEvent(
  event: Event,
  targets: GraphInteractionTarget[]
): MermaidNodeInteraction | null {
  const eventTarget = event.target;
  if (!(eventTarget instanceof Element)) {
    return null;
  }

  const nodeEl = eventTarget.closest<SVGElement>("g.node");
  if (!nodeEl) {
    return null;
  }

  const target = targets.find((candidate) => nodeEl.id.includes(candidate.mermaidId));
  return target ? { nodeEl, target } : null;
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

  const hoverParent = typeof options.hoverParent === "function"
    ? options.hoverParent(targetEl, options.rootEl)
    : options.hoverParent ?? options.rootEl;

  try {
    options.app.workspace.trigger("hover-link", {
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

  const distance = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
  return distance <= dragThreshold;
}

function openMermaidNodeTarget(
  options: AttachMermaidNodeInteractionsOptions,
  target: GraphInteractionTarget,
  event: MouseEvent
): void {
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
