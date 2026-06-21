import type { App } from "obsidian";
import type {
  AttributeModel,
  DiagramEdge,
  ErColumn,
  ErEntity,
  ErRelationEdge,
  MethodModel,
  ObjectModel,
  ResolvedDiagram
} from "../types/models";
import {
  classDiagramEdgeToInternalEdge,
  erDiagramEdgeToInternalEdge
} from "../core/internal-edge-adapters";
import { modelWeaveText } from "../i18n/language";
import {
  ensureUniqueMermaidId,
  escapeMermaidEdgeLabel,
  escapeMermaidLabel,
  formatMermaidMember,
  sanitizeMermaidId
} from "./mermaid-helpers";
import {
  buildModelWeaveMermaidClassDef,
  createMermaidFallbackNotice,
  createMermaidShell,
  getModelWeaveMermaidPalette,
  renderMermaidSourceIntoShell,
  setMermaidRenderReadyPromise
} from "./mermaid-shared";
import { renderClassDiagram } from "./class-renderer";
import { renderErDiagram } from "./er-renderer";
import { attachMermaidNodeInteractions, type GraphInteractionTarget, type MermaidNodeElementMatch } from "../views/mermaid-node-interactions";
import type {
  GraphFitVerticalAlign,
  GraphViewportState
} from "./graph-view-shared";

interface MermaidRendererOptions {
  hideTitle?: boolean;
  hideDetails?: boolean;
  forExport?: boolean;
  fitVerticalAlign?: GraphFitVerticalAlign;
  viewportState?: GraphViewportState;
  onViewportStateChange?: (state: GraphViewportState) => void;
  sourcePanelContainer?: HTMLElement;
  sourcePanelPlacement?: "append" | "prepend";
  sourcePanelTitle?: string;
  sourcePanelCopyLabel?: string;
  showMermaidRenderDebug?: boolean;
  onExportPng?: () => void | Promise<void>;
  onExportAndOpenPng?: () => void | Promise<void>;
  exportPngLabel?: string;
  exportPngTitle?: string;
  exportAndOpenPngLabel?: string;
  exportAndOpenPngTitle?: string;
  app?: App;
  interactionSourcePath?: string;
}

const CLASS_NODE_CLASS = "mwClass";
const ER_NODE_CLASS = "mwEntity";
const MERMAID_CLASS_ATTRIBUTE_LIMIT = 5;
const MERMAID_CLASS_METHOD_LIMIT = 5;
const ER_MERMAID_READABLE_STYLE_ID = "model-weave-er-mermaid-readable-style";
const ER_DETAIL_INTERACTION_NODE_SELECTOR = "g.node, g.entityBox";

export function renderClassMermaidDiagram(
  diagram: ResolvedDiagram,
  options?: MermaidRendererOptions
): HTMLElement {
  return renderReducedMermaidDiagram({
    className: "mdspec-diagram mdspec-diagram--class",
    title: options?.hideTitle ? undefined : `${diagram.diagram.name} (class / mermaid)`,
    renderIdPrefix: "model_weave_class",
    source: buildClassOverviewMermaidSource(diagram),
    interactionTargets: buildClassOverviewInteractionTargets(
      diagram,
      options?.interactionSourcePath ?? diagram.diagram.path
    ),
    options,
    fallback: () => renderClassDiagram(diagram, options),
    fallbackMessage: modelWeaveText(
      "Mermaid class overview could not be rendered. Falling back to the custom class renderer.",
      "Mermaid の class overview を描画できませんでした。custom class renderer に切り替えます。"
    )
  });
}

export function renderClassMermaidDetailDiagram(
  diagram: ResolvedDiagram,
  options?: MermaidRendererOptions
): HTMLElement {
  return renderReducedMermaidDiagram({
    className: "mdspec-diagram mdspec-diagram--class",
    title: options?.hideTitle
      ? undefined
      : `${diagram.diagram.name} (class / mermaid detail)`,
    renderIdPrefix: "model_weave_class_detail",
    source: buildClassDetailMermaidSource(diagram),
    interactionTargets: buildClassDetailInteractionTargets(
      diagram,
      options?.interactionSourcePath ?? diagram.diagram.path
    ),
    options,
    fallback: () => renderClassDiagram(diagram, options),
    fallbackMessage: modelWeaveText(
      "Mermaid Detail class overview could not be rendered. Falling back to the custom class renderer.",
      "Mermaid Detail の class overview を描画できませんでした。custom class renderer に切り替えます。"
    )
  });
}

export function renderErMermaidDiagram(
  diagram: ResolvedDiagram,
  options?: MermaidRendererOptions
): HTMLElement {
  return renderReducedMermaidDiagram({
    className: "mdspec-diagram mdspec-diagram--er",
    title: options?.hideTitle ? undefined : `${diagram.diagram.name} (er / mermaid)`,
    renderIdPrefix: "model_weave_er",
    source: buildErOverviewMermaidSource(diagram),
    interactionTargets: buildErOverviewInteractionTargets(
      diagram,
      options?.interactionSourcePath ?? diagram.diagram.path
    ),
    options,
    fallback: () => renderErDiagram(diagram, options),
    fallbackMessage: modelWeaveText(
      "Mermaid ER overview could not be rendered. Falling back to the custom ER renderer.",
      "Mermaid の ER overview を描画できませんでした。custom ER renderer に切り替えます。"
    )
  });
}

export function renderErMermaidDetailDiagram(
  diagram: ResolvedDiagram,
  options?: MermaidRendererOptions
): HTMLElement {
  return renderReducedMermaidDiagram({
    className: "mdspec-diagram mdspec-diagram--er mdspec-diagram--er-detail",
    title: options?.hideTitle ? undefined : `${diagram.diagram.name} (er / mermaid detail)`,
    renderIdPrefix: "model_weave_er_detail",
    source: buildErDetailMermaidSource(diagram),
    interactionTargets: buildErDetailInteractionTargets(
      diagram,
      options?.interactionSourcePath ?? diagram.diagram.path
    ),
    interactionNodeSelector: ER_DETAIL_INTERACTION_NODE_SELECTOR,
    interactionFindNodeElements: findErDetailMermaidInteractionNodes,
    interactionDebugName: "ER detail",
    options,
    fallback: () => renderErDiagram(diagram, options),
    afterRenderSvg: applyErMermaidReadableSvgStyle,
    fallbackMessage: modelWeaveText(
      "Mermaid Detail ER overview could not be rendered. Falling back to the custom ER renderer.",
      "Mermaid Detail の ER overview を描画できませんでした。custom ER renderer に切り替えます。"
    )
  });
}

export function renderClassMermaidObject(
  object: ObjectModel,
  options?: MermaidRendererOptions
): HTMLElement {
  return renderReducedMermaidDiagram({
    className: "mdspec-diagram mdspec-diagram--class",
    title: options?.hideTitle ? undefined : `${object.name} (class / mermaid)`,
    renderIdPrefix: "model_weave_class_object",
    source: buildSingleClassMermaidSource(object),
    interactionTargets: [buildSingleClassInteractionTarget(object, options?.interactionSourcePath ?? object.path)],
    options,
    fallback: () =>
      createFallbackObjectNotice(modelWeaveText(
        "Class Mermaid overview could not be rendered.",
        "Class Mermaid overview を描画できませんでした。"
      )),
    fallbackMessage: modelWeaveText(
      "Mermaid class overview could not be rendered for this object.",
      "この object の Mermaid class overview を描画できませんでした。"
    )
  });
}

export function renderErMermaidObject(
  entity: ErEntity,
  options?: MermaidRendererOptions
): HTMLElement {
  return renderReducedMermaidDiagram({
    className: "mdspec-diagram mdspec-diagram--er",
    title: options?.hideTitle ? undefined : `${entity.logicalName} (er / mermaid)`,
    renderIdPrefix: "model_weave_er_object",
    source: buildSingleErMermaidSource(entity),
    interactionTargets: [buildSingleErInteractionTarget(entity, options?.interactionSourcePath ?? entity.path)],
    options,
    fallback: () =>
      createFallbackObjectNotice(modelWeaveText(
        "ER Mermaid overview could not be rendered.",
        "ER Mermaid overview を描画できませんでした。"
      )),
    fallbackMessage: modelWeaveText(
      "Mermaid ER overview could not be rendered for this entity.",
      "この entity の Mermaid ER overview を描画できませんでした。"
    )
  });
}

function renderReducedMermaidDiagram(config: {
  className: string;
  title?: string;
  renderIdPrefix: string;
  source: string;
  interactionTargets?: GraphInteractionTarget[];
  interactionNodeSelector?: string;
  interactionFindNodeElements?: (svg: SVGElement, targets: GraphInteractionTarget[]) => MermaidNodeElementMatch[];
  interactionDebugName?: string;
  options?: MermaidRendererOptions;
  fallback: () => HTMLElement;
  afterRenderSvg?: (svg: SVGSVGElement) => void;
  fallbackMessage: string;
}): HTMLElement {
  const shell = createMermaidShell({
    className: config.className,
    title: config.title,
    forExport: config.options?.forExport,
    onExportPng: config.options?.onExportPng,
    onExportAndOpenPng: config.options?.onExportAndOpenPng,
    exportPngLabel: config.options?.exportPngLabel,
    exportPngTitle: config.options?.exportPngTitle,
    exportAndOpenPngLabel: config.options?.exportAndOpenPngLabel,
    exportAndOpenPngTitle: config.options?.exportAndOpenPngTitle
  });

  const ready = renderMermaidSourceIntoShell(shell, {
    source: config.source,
    renderIdPrefix: config.renderIdPrefix,
    nodeSelector: ".node, g.node, foreignObject",
    fitVerticalAlign: config.options?.fitVerticalAlign,
    viewportState: config.options?.viewportState,
    onViewportStateChange: config.options?.onViewportStateChange,
    showSourcePanel: !config.options?.forExport,
    sourcePanelContainer: config.options?.sourcePanelContainer,
    sourcePanelPlacement: config.options?.sourcePanelPlacement,
    sourcePanelTitle: config.options?.sourcePanelTitle,
    sourcePanelCopyLabel: config.options?.sourcePanelCopyLabel,
    showRenderDebug:
      !config.options?.forExport &&
      config.options?.showMermaidRenderDebug === true
  }).then(() => {
    const svg = shell.surface.querySelector("svg");
    if (svg?.instanceOf(SVGSVGElement)) {
      config.afterRenderSvg?.(svg);
    }
    const interactionSelector = config.interactionNodeSelector ?? "g.node";
    if (
      !config.options?.forExport &&
      config.options?.showMermaidRenderDebug === true &&
      config.interactionDebugName
    ) {
      logMermaidInteractionDebug(
        config.interactionDebugName,
        svg ?? null,
        config.interactionTargets ?? [],
        interactionSelector,
        config.interactionFindNodeElements,
        Boolean(config.options?.app)
      );
    }
    if (
      !config.options?.forExport &&
      config.options?.app &&
      (config.interactionTargets?.length ?? 0) > 0
    ) {
      attachMermaidNodeInteractions({
        app: config.options.app,
        rootEl: shell.surface,
        targets: config.interactionTargets ?? [],
        source: "model-weave",
        nodeClassName: "model-weave-mermaid-interactive-node",
        nodeSelector: interactionSelector,
        findNodeElements: config.interactionFindNodeElements,
        dragThreshold: 6,
        isDebugEnabled: () => config.options?.showMermaidRenderDebug === true && Boolean(config.interactionDebugName),
        debugName: config.interactionDebugName,
        hoverParent: (nodeEl, fallback) =>
          nodeEl.closest<HTMLElement>(
            ".model-weave-view-only-stage, .mdspec-diagram--class, .mdspec-diagram--er, .model-weave-mermaid-shell"
          ) ?? fallback,
        formatTitle: (target) => target.label
          ? `${target.label} (${target.targetType ?? "model"})`
          : target.linktext
      });
    }
  }).catch(() => {
    const fallback = config.fallback();
    const notice = createMermaidFallbackNotice(config.fallbackMessage);
    shell.root.replaceChildren(notice, ...Array.from(fallback.childNodes));
  });

  setMermaidRenderReadyPromise(shell.root, ready);
  return shell.root;
}

function logMermaidInteractionDebug(
  debugName: string,
  svg: SVGElement | null,
  targets: GraphInteractionTarget[],
  selector: string,
  findNodeElements: ((svg: SVGElement, targets: GraphInteractionTarget[]) => MermaidNodeElementMatch[]) | undefined,
  hasApp: boolean
): void {
  const matches = svg
    ? findNodeElements?.(svg, targets) ?? Array.from(svg.querySelectorAll<SVGElement>(selector)).map((element) => ({
      element,
      target: targets.find((candidate) => element.id === candidate.mermaidId)
    })).filter((match): match is MermaidNodeElementMatch => Boolean(match.target))
    : [];
  const targetIds = targets.map((target) => target.mermaidId);
  const matchedTargetIds = new Set(matches.map((match) => match.target.mermaidId));
  const unmatchedTargetIds = targetIds.filter((targetId) => !matchedTargetIds.has(targetId));

  console.debug("Model Weave ER detail interaction debug", {
    debugName,
    hasSvg: Boolean(svg),
    hasApp,
    attachEligible: Boolean(svg && hasApp && targets.length > 0),
    targetCount: targets.length,
    targetIds,
    matchedCount: matches.length,
    selector: findNodeElements ? undefined : selector,
    resolver: findNodeElements ? "er-detail-svg-id" : undefined,
    matchedIds: matches.map((match) => ({
      targetId: match.target.mermaidId,
      elementId: match.element.id,
      tagName: match.element.tagName,
      className: match.element.getAttribute("class")
    })),
    unmatchedTargetIds
  });
}

function findErDetailMermaidInteractionNodes(
  svg: SVGElement,
  targets: GraphInteractionTarget[]
): MermaidNodeElementMatch[] {
  const entityGroups = getErDetailEntityGroupElements(svg);
  const matches: MermaidNodeElementMatch[] = [];
  const matchedElements = new Set<SVGElement>();

  for (const target of targets) {
    const match = entityGroups.find((element) =>
      !matchedElements.has(element) && isErDetailEntityElementForTarget(element, target.mermaidId)
    );
    if (!match) {
      continue;
    }

    matchedElements.add(match);
    matches.push({
      element: match,
      target
    });
  }

  return matches;
}

function getErDetailEntityGroupElements(svg: SVGElement): SVGElement[] {
  return Array.from(svg.querySelectorAll<SVGElement>(
    "g[id^=\"entity-\"], g[id^=\"er-entity-\"]"
  ));
}

function isErDetailEntityElementForTarget(element: SVGElement, targetId: string): boolean {
  const targetCanonicalId = canonicalizeErDetailEntityId(targetId);
  const candidates = getErDetailSvgIdCandidates(element.id);
  const matched = candidates.some((candidate) =>
    canonicalizeErDetailEntityId(candidate) === targetCanonicalId
  );
  if (!matched) {
    return false;
  }

  return getErDetailSvgElementExclusionReason(element) === null;
}

function getErDetailSvgElementExclusionReason(element: SVGElement): string | null {
  const className = element.getAttribute("class") ?? "";
  const identity = `${element.id} ${className}`.toLowerCase();
  if (/edge|relationship|cardinality|label|attr|attribute|marker|style/.test(identity)) {
    return "edge/relationship/cardinality/label/attribute/marker/style";
  }
  if (element.id.toLowerCase().includes("-attr-")) {
    return "attribute row";
  }
  if (element.tagName.toLowerCase() !== "g") {
    return "not entity group";
  }
  if (!/entity|er/.test(identity)) {
    return "missing entity/er id or class hint";
  }
  return null;
}

function getErDetailSvgIdCandidates(id: string): string[] {
  const stripped = stripErDetailEntitySvgId(id);
  const candidates = new Set<string>();
  candidates.add(id);
  candidates.add(stripped);
  candidates.add(canonicalizeErDetailEntityId(stripped));
  return Array.from(candidates).filter((candidate) => candidate.length > 0);
}

function stripErDetailEntitySvgId(value: string): string {
  return value
    .replace(/^text-entity-/, "")
    .replace(/^er-entity-/, "")
    .replace(/^entity-/, "")
    .replace(/^er-/, "")
    .replace(
      /-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?:-.+)?$/i,
      ""
    );
}

function canonicalizeErDetailEntityId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function buildClassOverviewInteractionTargets(
  diagram: ResolvedDiagram,
  sourcePath: string
): GraphInteractionTarget[] {
  return buildDiagramNodeInteractionTargets(
    diagram,
    sourcePath,
    (node, usedIds) => ensureUniqueMermaidId(sanitizeMermaidId(node.id), usedIds),
    "class"
  );
}

function buildClassDetailInteractionTargets(
  diagram: ResolvedDiagram,
  sourcePath: string
): GraphInteractionTarget[] {
  return buildDiagramNodeInteractionTargets(
    diagram,
    sourcePath,
    (node, usedIds) => ensureUniqueMermaidId(sanitizeMermaidId(node.id), usedIds),
    "class"
  );
}

function buildErOverviewInteractionTargets(
  diagram: ResolvedDiagram,
  sourcePath: string
): GraphInteractionTarget[] {
  return buildDiagramNodeInteractionTargets(
    diagram,
    sourcePath,
    (node, usedIds) => ensureUniqueMermaidId(sanitizeMermaidId(node.id), usedIds),
    "er"
  );
}

function buildErDetailInteractionTargets(
  diagram: ResolvedDiagram,
  sourcePath: string
): GraphInteractionTarget[] {
  return buildDiagramNodeInteractionTargets(
    diagram,
    sourcePath,
    (node, usedIds) => {
      const entity = node.object && node.object.fileType === "er-entity" ? node.object : undefined;
      return ensureUniqueMermaidId(
        sanitizeMermaidId(entity?.physicalName || entity?.id || node.id),
        usedIds
      );
    },
    "er"
  );
}

function buildDiagramNodeInteractionTargets(
  diagram: ResolvedDiagram,
  sourcePath: string,
  getMermaidId: (
    node: ResolvedDiagram["nodes"][number],
    usedIds: Set<string>
  ) => string,
  mode: "class" | "er"
): GraphInteractionTarget[] {
  const usedIds = new Set<string>();
  return diagram.nodes
    .map((node) => {
      const mermaidId = getMermaidId(node, usedIds);
      return mode === "class"
        ? buildClassNodeInteractionTarget(node, mermaidId, sourcePath)
        : buildErNodeInteractionTarget(node, mermaidId, sourcePath);
    })
    .filter((target): target is GraphInteractionTarget => Boolean(target));
}

function buildClassNodeInteractionTarget(
  node: ResolvedDiagram["nodes"][number],
  mermaidId: string,
  sourcePath: string
): GraphInteractionTarget | null {
  const object = node.object && node.object.fileType === "object" ? node.object : undefined;
  if (!object?.path) {
    return null;
  }

  const label = node.label ?? object.name ?? node.id;
  return {
    mermaidId,
    linktext: object.path,
    sourcePath,
    label,
    kind: object.path === sourcePath ? "class-current" : "class-node",
    targetType: "class",
    filePath: object.path,
    modelId: getClassObjectId(object) ?? node.id,
    modelType: object.fileType
  };
}

function buildErNodeInteractionTarget(
  node: ResolvedDiagram["nodes"][number],
  mermaidId: string,
  sourcePath: string
): GraphInteractionTarget | null {
  const entity = node.object && node.object.fileType === "er-entity" ? node.object : undefined;
  if (!entity?.path) {
    return null;
  }

  const label = node.label ?? entity.logicalName ?? entity.physicalName ?? node.id;
  return {
    mermaidId,
    linktext: entity.path,
    sourcePath,
    label,
    kind: entity.path === sourcePath ? "er-current" : "er-entity-node",
    targetType: "er_entity",
    filePath: entity.path,
    modelId: entity.id || node.id,
    modelType: entity.fileType
  };
}

function buildSingleClassInteractionTarget(
  object: ObjectModel,
  sourcePath: string
): GraphInteractionTarget {
  const fallbackId = object.frontmatter.id?.toString() || object.name;
  return {
    mermaidId: sanitizeMermaidId(fallbackId),
    linktext: object.path,
    sourcePath,
    label: object.name || fallbackId,
    kind: "class-current",
    targetType: "class",
    filePath: object.path,
    modelId: getClassObjectId(object) ?? fallbackId,
    modelType: object.fileType
  };
}

function buildSingleErInteractionTarget(
  entity: ErEntity,
  sourcePath: string
): GraphInteractionTarget {
  return {
    mermaidId: sanitizeMermaidId(entity.id || entity.logicalName),
    linktext: entity.path,
    sourcePath,
    label: entity.logicalName || entity.physicalName || entity.id,
    kind: "er-current",
    targetType: "er_entity",
    filePath: entity.path,
    modelId: entity.id,
    modelType: entity.fileType
  };
}

function buildClassOverviewMermaidSource(diagram: ResolvedDiagram): string {
  const palette = getModelWeaveMermaidPalette();
  const lines: string[] = [
    "flowchart LR",
    `  ${buildModelWeaveMermaidClassDef(CLASS_NODE_CLASS, palette.classFill, palette.classBorder)}`
  ];

  const nodeIds = new Map<string, string>();
  const usedNodeIds = new Set<string>();
  for (const node of diagram.nodes) {
    const object = node.object && node.object.fileType === "object" ? node.object : undefined;
    const mermaidId = ensureUniqueMermaidId(sanitizeMermaidId(node.id), usedNodeIds);
    nodeIds.set(node.id, mermaidId);
    lines.push(`  ${mermaidId}["${buildClassOverviewNodeLabel(node.label, object, node.id)}"]:::${CLASS_NODE_CLASS}`);
  }

  for (const edge of diagram.edges) {
    const from = nodeIds.get(edge.source);
    const to = nodeIds.get(edge.target);
    if (!from || !to) {
      continue;
    }
    const label = sanitizeEdgeLabel(buildClassEdgeLabel(edge));
    lines.push(label ? `  ${from} -->|${label}| ${to}` : `  ${from} --> ${to}`);
  }

  return lines.join("\n");
}

function buildClassDetailMermaidSource(diagram: ResolvedDiagram): string {
  const lines = ["classDiagram"];
  const nodeIds = new Map<string, string>();
  const usedNodeIds = new Set<string>();

  for (const node of diagram.nodes) {
    const object = node.object && node.object.fileType === "object" ? node.object : undefined;
    const mermaidId = ensureUniqueMermaidId(sanitizeMermaidId(node.id), usedNodeIds);
    nodeIds.set(node.id, mermaidId);
    lines.push(...buildClassDetailDeclaration(mermaidId, node.label, object, node.id));
  }

  for (const edge of diagram.edges) {
    const from = nodeIds.get(edge.source);
    const to = nodeIds.get(edge.target);
    if (!from || !to) {
      continue;
    }
    lines.push(buildClassDetailRelation(edge, from, to));
  }

  return lines.join("\n");
}

function buildErOverviewMermaidSource(diagram: ResolvedDiagram): string {
  const palette = getModelWeaveMermaidPalette();
  const lines: string[] = [
    "flowchart LR",
    `  ${buildModelWeaveMermaidClassDef(ER_NODE_CLASS, palette.erFill, palette.erBorder)}`
  ];

  const nodeIds = new Map<string, string>();
  const usedNodeIds = new Set<string>();
  for (const node of diagram.nodes) {
    const entity = node.object && node.object.fileType === "er-entity" ? node.object : undefined;
    const mermaidId = ensureUniqueMermaidId(sanitizeMermaidId(node.id), usedNodeIds);
    nodeIds.set(node.id, mermaidId);
    lines.push(`  ${mermaidId}["${buildErNodeLabel(node.label, entity, node.id)}"]:::${ER_NODE_CLASS}`);
  }

  for (const edge of diagram.edges) {
    const from = nodeIds.get(edge.source);
    const to = nodeIds.get(edge.target);
    if (!from || !to) {
      continue;
    }
    const label = sanitizeEdgeLabel(buildErEdgeLabel(edge));
    lines.push(label ? `  ${from} -->|${label}| ${to}` : `  ${from} --> ${to}`);
  }

  return lines.join("\n");
}

function buildErDetailMermaidSource(diagram: ResolvedDiagram): string {
  const lines = ["erDiagram"];
  const nodeIds = new Map<string, string>();
  const usedNodeIds = new Set<string>();

  for (const node of diagram.nodes) {
    const entity = node.object && node.object.fileType === "er-entity" ? node.object : undefined;
    const mermaidId = ensureUniqueMermaidId(
      sanitizeMermaidId(entity?.physicalName || entity?.id || node.id),
      usedNodeIds
    );
    nodeIds.set(node.id, mermaidId);
    lines.push(...buildErDetailDeclaration(mermaidId, entity));
  }

  for (const edge of diagram.edges) {
    const from = nodeIds.get(edge.source);
    const to = nodeIds.get(edge.target);
    if (!from || !to) {
      continue;
    }
    lines.push(buildErDetailRelation(edge, from, to));
  }

  // Mermaid erDiagram styling support is less consistent in Obsidian than classDiagram,
  // so ER Detail keeps notation-only output until that syntax is proven safe.
  return lines.join("\n");
}

function applyErMermaidReadableSvgStyle(svg: SVGSVGElement): void {
  if (svg.querySelector(`#${ER_MERMAID_READABLE_STYLE_ID}`)) {
    return;
  }

  const style = svg.ownerDocument.createElementNS(
    "http://www.w3.org/2000/svg",
    "style"
  );
  style.setAttribute("id", ER_MERMAID_READABLE_STYLE_ID);
  style.textContent = buildErMermaidReadableSvgStyle();
  svg.prepend(style);
}

export function buildErMermaidReadableSvgStyle(): string {
  return [
    ".er.entityBox,.entityBox,.er.attributeBoxOdd,.attributeBoxOdd,.er.attributeBoxEven,.attributeBoxEven{fill:#f8fafc!important;stroke:#64748b!important;}",
    ".er.relationshipLabelBox,.relationshipLabelBox{fill:#f8fafc!important;stroke:#cbd5e1!important;}",
    ".er.entityLabel,.entityLabel,.er.attribute-type,.attribute-type,.er.attribute-name,.attribute-name,.er.attribute-key,.attribute-key,.er.relationshipLabel,.relationshipLabel{fill:#111827!important;color:#111827!important;}",
    "text,tspan{fill:#111827!important;color:#111827!important;}"
  ].join("\n");
}

function buildSingleClassMermaidSource(object: ObjectModel): string {
  const palette = getModelWeaveMermaidPalette();
  const lines: string[] = [
    "flowchart LR",
    `  ${buildModelWeaveMermaidClassDef(CLASS_NODE_CLASS, palette.classFill, palette.classBorder)}`
  ];
  const fallbackId = object.frontmatter.id?.toString() || object.name;
  const id = sanitizeMermaidId(fallbackId);
  lines.push(`  ${id}["${buildClassOverviewNodeLabel(undefined, object, fallbackId)}"]:::${CLASS_NODE_CLASS}`);
  return lines.join("\n");
}

function buildSingleErMermaidSource(entity: ErEntity): string {
  const palette = getModelWeaveMermaidPalette();
  const lines: string[] = [
    "flowchart LR",
    `  ${buildModelWeaveMermaidClassDef(ER_NODE_CLASS, palette.erFill, palette.erBorder)}`
  ];
  const id = sanitizeMermaidId(entity.id || entity.logicalName);
  lines.push(`  ${id}["${buildErNodeLabel(undefined, entity, entity.id)}"]:::${ER_NODE_CLASS}`);
  return lines.join("\n");
}

function buildClassOverviewNodeLabel(
  explicitLabel: string | undefined,
  object: ObjectModel | undefined,
  fallbackId: string
): string {
  return escapeMermaidLabel(explicitLabel?.trim() || object?.name || fallbackId);
}

function buildErNodeLabel(
  explicitLabel: string | undefined,
  entity: ErEntity | undefined,
  fallbackId: string
): string {
  if (!entity) {
    return escapeMermaidLabel(explicitLabel?.trim() || fallbackId);
  }

  const lines = [entity.logicalName || explicitLabel?.trim() || fallbackId];
  if (entity.physicalName) {
    lines.push(entity.physicalName);
  }
  return escapeMermaidLabel(lines.join("\n"));
}

function buildClassEdgeLabel(edge: DiagramEdge): string | null {
  const internal = classDiagramEdgeToInternalEdge(edge);
  const base = internal.label?.trim() || internal.kind || null;
  const multiplicity =
    internal.fromMultiplicity || internal.toMultiplicity
      ? `${internal.fromMultiplicity ?? "-"}→${internal.toMultiplicity ?? "-"}`
      : null;
  if (base && multiplicity) {
    return `${base} (${multiplicity})`;
  }
  return base ?? multiplicity;
}

function buildErEdgeLabel(edge: DiagramEdge): string | null {
  const internal = erDiagramEdgeToInternalEdge(edge);
  return (
    internal.cardinality?.trim() ||
    internal.label?.trim() ||
    internal.id?.trim() ||
    internal.kind?.trim() ||
    null
  );
}

function sanitizeEdgeLabel(value: string | null): string | null {
  if (!value) {
    return null;
  }
  return escapeMermaidEdgeLabel(value);
}

function buildErDetailDeclaration(
  mermaidId: string,
  entity: ErEntity | undefined
): string[] {
  const columns = entity ? buildErColumnLines(entity) : [];
  if (columns.length === 0) {
    return [`  ${mermaidId} {`, "  }"];
  }

  return [
    `  ${mermaidId} {`,
    ...columns.map((column) => `    ${column}`),
    "  }"
  ];
}

function buildErColumnLines(entity: ErEntity): string[] {
  const fkColumns = getErForeignKeyColumns(entity);
  const columns = entity.columns
    .slice(0, MERMAID_CLASS_ATTRIBUTE_LIMIT)
    .map((column) => formatErColumn(column, fkColumns))
    .filter((column): column is string => Boolean(column));

  if (entity.columns.length > MERMAID_CLASS_ATTRIBUTE_LIMIT) {
    columns.push("string more_columns");
  }

  return columns;
}

function formatErColumn(
  column: ErColumn,
  fkColumns: Set<string>
): string | null {
  const name = formatErIdentifierToken(column.physicalName || column.logicalName);
  if (!name) {
    return null;
  }

  const type = formatErTypeToken(column.dataType || "string");
  const keys = [
    column.pk ? "PK" : null,
    isErForeignKeyColumn(column, fkColumns) ? "FK" : null
  ].filter((key): key is string => Boolean(key));
  return `${type} ${name}${keys.length > 0 ? ` ${keys.join(",")}` : ""}`;
}

function getErForeignKeyColumns(entity: ErEntity): Set<string> {
  const columns = new Set<string>();
  for (const relation of entity.outboundRelations) {
    for (const mapping of relation.mappings) {
      if (mapping.localColumn.trim()) {
        columns.add(mapping.localColumn.trim());
      }
    }
  }
  return columns;
}

function isErForeignKeyColumn(
  column: ErColumn,
  fkColumns: Set<string>
): boolean {
  return fkColumns.has(column.physicalName) || fkColumns.has(column.logicalName);
}

function buildErDetailRelation(
  edge: DiagramEdge,
  from: string,
  to: string
): string {
  const internal = erDiagramEdgeToInternalEdge(edge);
  const markers = getErRelationshipMarkers(internal);
  const label = sanitizeEdgeLabel(
    internal.label?.trim() || internal.id?.trim() || internal.kind?.trim() || null
  ) ?? "relates";
  return `  ${from} ${markers.left}--${markers.right} ${to} : ${label}`;
}

function getErRelationshipMarkers(edge: ErRelationEdge): {
  left: string;
  right: string;
} {
  const cardinality = edge.cardinality?.trim();
  if (cardinality) {
    const normalized = cardinality.toLowerCase().replace(/\s+/g, "");
    switch (normalized) {
      case "many-to-one":
      case "manytoone":
      case "n-1":
      case "*-1":
        return { left: "}o", right: "||" };
      case "one-to-many":
      case "onetomany":
      case "1-n":
      case "1-*":
        return { left: "||", right: "o{" };
      case "one-to-one":
      case "onetoone":
      case "1-1":
        return { left: "||", right: "||" };
      default:
        break;
    }

    const split = normalized.match(/^(.+?)(?:-|:|to)(.+)$/);
    if (split) {
      return {
        left: getLeftErCardinalityMarker(split[1]),
        right: getRightErCardinalityMarker(split[2])
      };
    }
  }

  return { left: "||", right: "o{" };
}

function getLeftErCardinalityMarker(value: string | undefined): string {
  switch (normalizeErCardinalityPart(value)) {
    case "zero-or-one":
      return "o|";
    case "one-or-more":
      return "}|";
    case "many":
    case "zero-or-more":
      return "}o";
    case "one":
    default:
      return "||";
  }
}

function getRightErCardinalityMarker(value: string | undefined): string {
  switch (normalizeErCardinalityPart(value)) {
    case "zero-or-one":
      return "|o";
    case "one-or-more":
      return "|{";
    case "many":
    case "zero-or-more":
      return "o{";
    case "one":
    default:
      return "||";
  }
}

function normalizeErCardinalityPart(value: string | undefined): string {
  const normalized = value?.trim().toLowerCase() ?? "";
  switch (normalized) {
    case "1":
    case "one":
    case "single":
      return "one";
    case "0..1":
    case "0..one":
    case "zero-or-one":
    case "optional":
      return "zero-or-one";
    case "1..*":
    case "1..n":
    case "one-or-more":
      return "one-or-more";
    case "*":
    case "n":
    case "many":
      return "many";
    case "0..*":
    case "0..n":
    case "zero-or-more":
    default:
      return normalized.includes("many") || normalized === "*" || normalized === "n"
        ? "many"
        : normalized.includes("0") && (normalized.includes("*") || normalized.includes("n"))
          ? "zero-or-more"
          : normalized.includes("1")
            ? "one"
            : "many";
  }
}

function formatErIdentifierToken(value: string): string {
  return sanitizeMermaidId(formatMermaidMember(value));
}

function formatErTypeToken(value: string): string {
  const formatted = formatMermaidMember(value) || "string";
  const token = formatted.replace(/[^A-Za-z0-9_]/g, "_").replace(/^_+|_+$/g, "");
  if (!token) {
    return "string";
  }
  return /^[A-Za-z]/.test(token) ? token : `T_${token}`;
}

function buildClassDetailDeclaration(
  mermaidId: string,
  explicitLabel: string | undefined,
  object: ObjectModel | undefined,
  fallbackId: string
): string[] {
  const displayName = explicitLabel?.trim() || object?.name || fallbackId;
  const label = escapeMermaidClassText(displayName);
  const members = object ? buildClassDetailMemberLines(object, displayName) : [];
  if (members.length === 0) {
    return [`  class ${mermaidId}["${label}"]`];
  }

  return [
    `  class ${mermaidId}["${label}"] {`,
    ...members.map((member) => `    ${member}`),
    "  }"
  ];
}

function buildClassDetailMemberLines(
  object: ObjectModel,
  displayName: string
): string[] {
  const lines: string[] = [];
  const objectId = getClassObjectId(object);
  if (objectId && objectId !== displayName) {
    lines.push(`id: ${formatMermaidMember(objectId)}`);
  }

  lines.push(...buildClassMemberLines(object));
  return lines;
}

function buildClassDetailRelation(
  edge: DiagramEdge,
  from: string,
  to: string
): string {
  const internal = classDiagramEdgeToInternalEdge(edge);
  const arrow = getClassDiagramArrow(internal.kind);
  const fromMultiplicity = formatClassMultiplicity(internal.fromMultiplicity);
  const toMultiplicity = formatClassMultiplicity(internal.toMultiplicity);
  const label = sanitizeEdgeLabel(buildClassEdgeLabel(edge));
  const multiplicities =
    fromMultiplicity || toMultiplicity
      ? ` "${fromMultiplicity ?? ""}" ${arrow} "${toMultiplicity ?? ""}" `
      : ` ${arrow} `;
  return label
    ? `  ${from}${multiplicities}${to} : ${label}`
    : `  ${from}${multiplicities}${to}`;
}

function getClassDiagramArrow(kind: string | undefined): string {
  switch (kind) {
    case "inheritance":
      return "--|>";
    case "implementation":
      return "..|>";
    case "dependency":
      return "..>";
    case "composition":
      return "*--";
    case "aggregation":
      return "o--";
    case "association":
    case "reference":
    case "flow":
    default:
      return "-->";
  }
}

function formatClassMultiplicity(value: string | undefined): string | null {
  if (!value?.trim()) {
    return null;
  }
  return escapeMermaidClassText(value);
}

function getClassObjectId(object: ObjectModel): string | null {
  const rawId = object.frontmatter.id;
  if (typeof rawId !== "string") {
    return null;
  }

  const id = rawId.trim();
  return id || null;
}

function buildClassMemberLines(object: ObjectModel): string[] {
  const lines = object.attributes
    .slice(0, MERMAID_CLASS_ATTRIBUTE_LIMIT)
    .map(formatClassAttribute)
    .filter((line): line is string => Boolean(line));

  if (object.attributes.length > MERMAID_CLASS_ATTRIBUTE_LIMIT) {
    lines.push("...");
  }

  lines.push(
    ...object.methods
      .slice(0, MERMAID_CLASS_METHOD_LIMIT)
      .map(formatClassMethod)
      .filter((line): line is string => Boolean(line))
  );

  if (object.methods.length > MERMAID_CLASS_METHOD_LIMIT) {
    lines.push("...");
  }

  return lines;
}

function formatClassAttribute(attribute: AttributeModel): string | null {
  const name = formatMermaidMember(attribute.name);
  if (!name) {
    return null;
  }

  const visibility = formatVisibility(attribute.visibility);
  const type = attribute.type ? `: ${formatMermaidMember(attribute.type)}` : "";
  const required = attribute.required === true ? " required" : "";
  const multiplicity = attribute.multiplicity
    ? ` ${formatMermaidMember(attribute.multiplicity)}`
    : "";
  return `${visibility}${name}${type}${multiplicity}${required}`;
}

function formatClassMethod(method: MethodModel): string | null {
  const name = formatMermaidMember(method.name);
  if (!name) {
    return null;
  }

  const visibility = formatVisibility(method.visibility);
  const parameters = method.parameters
    .map((parameter) => {
      const parameterName = formatMermaidMember(parameter.name);
      if (!parameterName) {
        return null;
      }
      const type = parameter.type ? `: ${formatMermaidMember(parameter.type)}` : "";
      return `${parameterName}${type}`;
    })
    .filter((parameter): parameter is string => Boolean(parameter))
    .join(", ");
  const returnType = method.returnType
    ? `: ${formatMermaidMember(method.returnType)}`
    : "";

  return `${visibility}${name}(${parameters})${returnType}`;
}

function formatVisibility(
  visibility: AttributeModel["visibility"]
): string {
  switch (visibility) {
    case "public":
      return "+ ";
    case "protected":
      return "# ";
    case "private":
      return "- ";
    case "package":
      return "~ ";
    default:
      return "";
  }
}

function escapeMermaidClassText(value: string): string {
  return escapeMermaidLabel(value).replace(/<br\/>/g, " ");
}

function createFallbackObjectNotice(message: string): HTMLElement {
  const root = activeDocument.createElement("section");
  root.addClass("model-weave-mermaid-shell");
  root.addClass("model-weave-mermaid-fallback-shell");
  root.appendChild(createMermaidFallbackNotice(message));
  return root;
}
