import {
  extractModelReferenceCandidates,
  getReferencedModelDisplayName,
  getReferenceDisplayName,
  parseQualifiedRef,
  referencesMatch,
  resolveQualifiedMemberReference,
  resolveReferenceIdentity
} from "./reference-resolver";
import type { ModelingVaultIndex } from "./vault-index";
import type { ParsedQualifiedRef } from "./reference-resolver";
import type {
  ImpactReference,
  ImpactRelationship,
  ImpactSourceLink,
  ImpactSummary,
  ImpactValueUsage,
  ParsedFileModel,
  SourceLink
} from "../types/models";

interface CollectedReference {
  raw: string;
  relationKind: string;
  section?: string;
  field?: string;
  sourceContext?: string;
  notes?: string;
}

export function buildImpactSummary(
  model: ParsedFileModel,
  index: ModelingVaultIndex
): ImpactSummary {
  const outboundReferences = collectModelReferences(model).map((reference) =>
    createImpactReference(model, reference, "outbound", index)
  );
  const resolvedOutbound = outboundReferences.filter((reference) =>
    Boolean(reference.targetPath)
  );
  const unresolvedOutbound = outboundReferences.filter(
    (reference) => !reference.targetPath && isExternalModelReference(reference.targetRaw)
  );
  const inboundReferences: ImpactReference[] = [];

  for (const candidate of Object.values(index.modelsByFilePath)) {
    if (candidate.path === model.path || candidate.fileType === "markdown") {
      continue;
    }

    for (const reference of collectModelReferences(candidate)) {
      if (referenceTargetsModel(reference.raw, model, index)) {
        inboundReferences.push(createImpactReference(candidate, reference, "inbound", index));
      }
    }
  }

  const relatedSourceLinks = collectRelatedSourceLinks(
    model,
    resolvedOutbound,
    inboundReferences,
    index
  );

  return {
    modelPath: model.path,
    modelId: getModelId(model),
    modelType: model.fileType,
    modelLabel: getReferencedModelDisplayName(model),
    outboundRelationships: groupOutboundRelationships(resolvedOutbound, index),
    inboundRelationships: groupInboundRelationships(inboundReferences, index),
    valueUsages:
      model.fileType === "codeset"
        ? groupValueUsages(model, inboundReferences, index)
        : [],
    unresolvedOutbound,
    relatedSourceLinks
  };
}

export function formatImpactSummaryAsMarkdown(summary: ImpactSummary): string {
  const title = summary.modelId ?? summary.modelLabel;
  return [
    `# Relationship summary: ${title}`,
    "",
    `Model: ${summary.modelLabel}`,
    `Type: ${summary.modelType}`,
    ...(summary.modelId ? [`ID: ${summary.modelId}`] : []),
    "",
    formatCategorizedRelationshipSection("## Used by", summary.inboundRelationships),
    "",
    formatCategorizedRelationshipSection("## References", summary.outboundRelationships),
    "",
    ...(summary.modelType === "codeset"
      ? [formatValueUsageSection("## Value usage", summary.valueUsages), ""]
      : []),
    formatUnresolvedSection("## Unresolved", summary.unresolvedOutbound),
    "",
    formatSourceLinkCountSection("## Source links", summary.relatedSourceLinks)
  ].join("\n");
}

export type ImpactRelationshipCategoryKey =
  | "screens"
  | "processes"
  | "rules"
  | "mappings"
  | "diagrams"
  | "classes"
  | "dataEr"
  | "other";

export const IMPACT_RELATIONSHIP_CATEGORY_ORDER: ImpactRelationshipCategoryKey[] = [
  "screens",
  "processes",
  "rules",
  "mappings",
  "diagrams",
  "classes",
  "dataEr",
  "other"
];

export function getImpactRelationshipCategoryKey(
  relationship: Pick<ImpactRelationship, "modelType" | "modelId">
): ImpactRelationshipCategoryKey {
  const type = relationship.modelType.replace(/_/g, "-");
  if (type === "screen") {
    return "screens";
  }
  if (type === "app-process" || type === "process") {
    return "processes";
  }
  if (type === "rule") {
    return "rules";
  }
  if (type === "mapping") {
    return "mappings";
  }
  if (["dfd-diagram", "flow-diagram", "er-diagram", "class-diagram", "domain-diagram", "diagram"].includes(type)) {
    return "diagrams";
  }
  if (type === "class" || type === "object") {
    return "classes";
  }
  if (type === "data-object" || type === "er-entity") {
    return "dataEr";
  }

  const id = relationship.modelId?.toUpperCase() ?? "";
  if (id.startsWith("SCR-")) {
    return "screens";
  }
  if (id.startsWith("PROC-")) {
    return "processes";
  }
  if (id.startsWith("RULE-")) {
    return "rules";
  }
  if (id.startsWith("MAP-")) {
    return "mappings";
  }
  if (id.startsWith("DFD-") || id.startsWith("ERD-") || id.startsWith("CLD-") || id.startsWith("DOMAIN-DIAGRAM-")) {
    return "diagrams";
  }
  if (id.startsWith("CLS-")) {
    return "classes";
  }
  if (id.startsWith("DATA-") || id.startsWith("ENT-")) {
    return "dataEr";
  }
  return "other";
}

function collectModelReferences(model: ParsedFileModel): CollectedReference[] {
  const references: CollectedReference[] = [];
  const add = (
    raw: string | null | undefined,
    relationKind: string,
    section?: string,
    field?: string,
    notes?: string | null,
    sourceContext?: string | null
  ): void => {
    const trimmed = raw?.trim();
    if (!trimmed) {
      return;
    }
    for (const candidate of extractModelReferenceCandidates(trimmed)) {
      references.push({
        raw: candidate,
        relationKind,
        section,
        field,
        sourceContext: sourceContext?.trim() || undefined,
        notes: notes?.trim() || undefined
      });
    }
  };

  switch (model.fileType) {
    case "object":
      for (const relation of model.relations) {
        add(relation.targetClass, relation.kind || "class relation", "Relations", "targetClass", relation.notes);
      }
      break;
    case "er-entity":
      for (const relation of model.outboundRelations) {
        add(relation.targetEntity, relation.kind || "er relation", "Relations", "targetEntity", relation.notes);
      }
      break;
    case "diagram":
      for (const ref of model.objectRefs) {
        add(ref, "diagram object", "Objects", "objectRefs");
      }
      for (const node of model.nodes) {
        add(node.ref, "diagram node", "Nodes", "ref");
      }
      for (const edge of model.edges) {
        add(edge.source, edge.kind || "diagram edge", "Edges", "source");
        add(edge.target, edge.kind || "diagram edge", "Edges", "target");
      }
      break;
    case "dfd-diagram":
    case "flow-diagram": {
      const relationPrefix = model.fileType === "flow-diagram" ? "flow diagram" : "dfd";
      for (const ref of model.objectRefs) {
        add(ref, `${relationPrefix} object`, "Objects", "objectRefs");
      }
      for (const object of model.objectEntries) {
        add(object.ref, `${relationPrefix} object`, "Objects", "ref", object.notes);
      }
      for (const flow of model.flows) {
        add(flow.from, `${relationPrefix} flow`, "Flows", "from", flow.notes);
        add(flow.to, `${relationPrefix} flow`, "Flows", "to", flow.notes);
        add(flow.data, `${relationPrefix} data`, "Flows", "data", flow.notes);
      }
      break;
    }
    case "domains":
      break;
    case "data-object":
      for (const field of model.fields) {
        add(field.ref, "data field reference", "Fields", "ref", field.notes);
      }
      break;
    case "app-process":
      for (const input of model.inputs) {
        add(input.data, "process input", "Inputs", "data", input.notes);
        add(input.source, "process input source", "Inputs", "source", input.notes);
      }
      for (const output of model.outputs) {
        add(output.data, "process output", "Outputs", "data", output.notes);
        add(output.target, "process output target", "Outputs", "target", output.notes);
      }
      for (const trigger of model.triggers) {
        add(trigger.source, "process trigger", "Triggers", "source", trigger.notes);
      }
      for (const transition of model.transitions) {
        add(transition.to, "process transition", "Transitions", "to", transition.notes);
      }
      for (const flow of model.flows ?? []) {
        if (parseStructuredQualifiedReference(flow.condition)) {
          add(
            flow.condition,
            "process flow condition",
            "Flows",
            "condition",
            flow.notes,
            [flow.from, flow.to].filter(Boolean).join(" -> ")
          );
        }
      }
      for (const step of model.steps ?? []) {
        add(step.input, "process step input", "Steps", "input", step.notes);
        add(step.output, "process step output", "Steps", "output", step.notes);
        add(step.rule, "process step rule", "Steps", "rule", step.notes);
        add(step.invoke, "process step invoke", "Steps", "invoke", step.notes);
        add(step.screen, "process step screen", "Steps", "screen", step.notes);
      }
      break;
    case "screen":
      for (const field of model.fields) {
        add(field.ref, "screen field reference", "Fields", "ref", field.notes);
        add(field.rule, "screen field rule", "Fields", "rule", field.notes);
        if (parseStructuredQualifiedReference(field.condition)) {
          add(
            field.condition,
            "screen field condition",
            "Fields",
            "condition",
            field.notes,
            formatScreenFieldContext(field)
          );
        }
      }
      for (const action of model.actions) {
        add(action.invoke, "screen action invoke", "Actions", "invoke", action.notes);
        add(action.transition, "screen action transition", "Actions", "transition", action.notes);
        add(action.rule, "screen action rule", "Actions", "rule", action.notes);
        if (parseStructuredQualifiedReference(action.condition)) {
          add(
            action.condition,
            "screen action condition",
            "Actions",
            "condition",
            action.notes,
            formatScreenActionContext(action)
          );
        }
      }
      for (const message of model.messages) {
        if (parseStructuredQualifiedReference(message.condition)) {
          add(
            message.condition,
            "screen message condition",
            "Messages",
            "condition",
            message.notes,
            formatScreenMessageContext(message)
          );
        }
      }
      for (const localProcess of model.localProcesses) {
        for (const step of localProcess.steps ?? []) {
          if (parseStructuredQualifiedReference(step.condition)) {
            add(
              step.condition,
              "screen local process step condition",
              "Local Processes",
              "Steps.condition",
              step.notes,
              formatScreenLocalProcessRowContext(localProcess.id, step)
            );
          }
        }
        for (const error of localProcess.errors ?? []) {
          if (parseStructuredQualifiedReference(error.condition)) {
            add(
              error.condition,
              "screen local process error condition",
              "Local Processes",
              "Errors.condition",
              error.notes,
              formatScreenLocalProcessRowContext(localProcess.id, error)
            );
          }
        }
      }
      for (const transition of model.legacyTransitions) {
        add(transition.to, "screen transition", "Transitions", "to", transition.notes);
      }
      break;
    case "rule":
      for (const input of model.inputs) {
        add(input.data, "rule input", "Inputs", "data", input.notes);
        add(input.source, "rule input source", "Inputs", "source", input.notes);
      }
      for (const reference of model.references) {
        add(reference.ref, "rule reference", "References", "ref", reference.notes);
      }
      for (const message of model.messages) {
        add(message.message, "rule message", "Messages", "message", message.notes);
      }
      break;
    case "mapping":
      add(model.source, "mapping source", "Overview", "source");
      add(model.target, "mapping target", "Overview", "target");
      for (const scope of model.scope) {
        add(scope.ref, "mapping scope", "Scope", "ref", scope.notes);
      }
      for (const row of model.mappings) {
        add(row.sourceRef, "mapping source field", "Mappings", "sourceRef", row.notes);
        add(row.targetRef, "mapping target field", "Mappings", "targetRef", row.notes);
        add(row.rule, "mapping rule", "Mappings", "rule", row.notes);
      }
      break;
    default:
      break;
  }

  return references;
}

function createImpactReference(
  sourceModel: ParsedFileModel,
  reference: CollectedReference,
  direction: ImpactReference["direction"],
  index: ModelingVaultIndex
): ImpactReference {
  const rawIdentity = resolveReferenceIdentity(reference.raw, index);
  const qualified = resolveQualifiedMemberReference(reference.raw, index);
  const identity =
    rawIdentity.resolvedModel || !qualified.qualified.hasMemberRef
      ? rawIdentity
      : qualified.baseIdentity;
  return {
    direction,
    sourcePath: sourceModel.path,
    sourceId: getModelId(sourceModel),
    sourceType: sourceModel.fileType,
    sourceLabel: getReferencedModelDisplayName(sourceModel),
    targetRaw: reference.raw,
    targetPath: identity.resolvedFile,
    targetId: identity.resolvedId,
    targetType: identity.resolvedModelType,
    targetLabel: getReferenceDisplayName(
      qualified.qualified.hasMemberRef ? qualified.qualified.baseRefRaw : reference.raw,
      identity.resolvedModel
    ),
    relationKind: reference.relationKind,
    section: reference.section,
    field: reference.field,
    sourceContext: reference.sourceContext,
    notes: reference.notes
  };
}

function groupOutboundRelationships(
  references: ImpactReference[],
  index: ModelingVaultIndex
): ImpactRelationship[] {
  return groupRelationships(references, (reference) => {
    const model = reference.targetPath
      ? index.modelsByFilePath[reference.targetPath]
      : null;
    if (!model) {
      return null;
    }
    return { model, relationKind: "outbound" as const };
  });
}

function groupInboundRelationships(
  references: ImpactReference[],
  index: ModelingVaultIndex
): ImpactRelationship[] {
  return groupRelationships(references, (reference) => {
    const model = index.modelsByFilePath[reference.sourcePath];
    if (!model) {
      return null;
    }
    return { model, relationKind: "inbound" as const };
  });
}

function groupRelationships(
  references: ImpactReference[],
  getGroupModel: (
    reference: ImpactReference
  ) => { model: ParsedFileModel; relationKind: ImpactSourceLink["relationKind"] } | null
): ImpactRelationship[] {
  const groups = new Map<string, ImpactRelationship>();
  for (const reference of references) {
    const groupModel = getGroupModel(reference);
    if (!groupModel) {
      continue;
    }
    const { model, relationKind } = groupModel;
    const key = model.path;
    const existing = groups.get(key);
    if (existing) {
      existing.usages.push(reference);
      existing.usageCount += 1;
      continue;
    }
    groups.set(key, {
      direction: reference.direction,
      modelPath: model.path,
      modelId: getModelId(model),
      modelType: model.fileType,
      modelLabel: getReferencedModelDisplayName(model),
      usageCount: 1,
      usages: [reference],
      sourceLinks: groupImpactSourceLinks(
        (model.sourceLinks ?? []).map((link) =>
          createImpactSourceLink(model, link, relationKind)
        )
      )
    });
  }

  return [...groups.values()].sort((left, right) =>
    left.modelLabel.localeCompare(right.modelLabel)
  );
}

function referenceTargetsModel(
  rawReference: string,
  model: ParsedFileModel,
  index: ModelingVaultIndex
): boolean {
  if (referencesMatch(rawReference, model.path, index)) {
    return true;
  }
  const modelId = getModelId(model);
  if (modelId && referencesMatch(rawReference, modelId, index)) {
    return true;
  }
  if (model.fileType !== "codeset") {
    return false;
  }

  const qualified = resolveQualifiedMemberReference(rawReference, index);
  if (!qualified.qualified.hasMemberRef) {
    return false;
  }
  if (referencesMatch(qualified.qualified.baseRefRaw, model.path, index)) {
    return true;
  }
  return Boolean(modelId && referencesMatch(qualified.qualified.baseRefRaw, modelId, index));
}

function groupValueUsages(
  model: ParsedFileModel,
  inboundReferences: ImpactReference[],
  index: ModelingVaultIndex
): ImpactValueUsage[] {
  if (model.fileType !== "codeset") {
    return [];
  }

  const byMember = new Map<
    string,
    { memberLabel?: string; references: ImpactReference[] }
  >();
  for (const reference of inboundReferences) {
    if (!isCodesetValueUsageSource(reference)) {
      continue;
    }
    const structuredQualified = parseStructuredQualifiedReference(reference.targetRaw);
    if (!structuredQualified) {
      continue;
    }
    const qualified = resolveQualifiedMemberReference(reference.targetRaw, index);
    if (
      !structuredQualified.memberRef ||
      !referenceTargetsModel(qualified.qualified.baseRefRaw, model, index)
    ) {
      continue;
    }
    const entry = byMember.get(structuredQualified.memberRef) ?? {
      memberLabel: qualified.member?.displayName,
      references: []
    };
    if (!entry.memberLabel && qualified.member?.displayName) {
      entry.memberLabel = qualified.member.displayName;
    }
    entry.references.push(reference);
    byMember.set(structuredQualified.memberRef, entry);
  }

  return [...byMember.entries()]
    .map(([member, entry]) => ({
      member,
      memberLabel: entry.memberLabel,
      relationships: groupInboundRelationships(entry.references, index)
    }))
    .sort((left, right) => left.member.localeCompare(right.member));
}

function isCodesetValueUsageSource(reference: ImpactReference): boolean {
  return (
    (reference.sourceType === "data-object" &&
      reference.section === "Fields" &&
      reference.field === "ref") ||
    (reference.sourceType === "screen" &&
      reference.section === "Fields" &&
      reference.field === "ref") ||
    (reference.sourceType === "screen" &&
      (reference.section === "Fields" ||
        reference.section === "Actions" ||
        reference.section === "Messages") &&
      reference.field === "condition") ||
    (reference.sourceType === "screen" &&
      reference.section === "Local Processes" &&
      (reference.field === "Steps.condition" ||
        reference.field === "Errors.condition")) ||
    (reference.sourceType === "app-process" &&
      (reference.section === "Inputs" || reference.section === "Outputs") &&
      reference.field === "data") ||
    (reference.sourceType === "app-process" &&
      reference.section === "Flows" &&
      reference.field === "condition") ||
    (reference.sourceType === "rule" &&
      reference.section === "References" &&
      reference.field === "ref") ||
    (reference.sourceType === "mapping" &&
      ((reference.section === "Scope" && reference.field === "ref") ||
        (reference.section === "Mappings" && reference.field === "rule")))
  );
}

function parseStructuredQualifiedReference(
  reference: string | null | undefined
): ParsedQualifiedRef | null {
  const trimmed = reference?.trim();
  if (!trimmed) {
    return null;
  }
  const qualified = parseQualifiedRef(trimmed);
  if (!qualified?.hasMemberRef || !qualified.memberRef) {
    return null;
  }
  return isExternalModelReference(qualified.baseRefRaw) ? qualified : null;
}

function formatScreenFieldContext(field: { id?: string; label?: string }): string {
  return [field.id, field.label].filter(Boolean).join(" / ");
}

function formatScreenActionContext(action: {
  id?: string;
  label?: string;
  target?: string;
  event?: string;
}): string {
  const identity = [action.id, action.label].filter(Boolean).join(" / ");
  const trigger = [action.target, action.event].filter(Boolean).join(" / ");
  return [identity, trigger].filter(Boolean).join("; ");
}

function formatScreenMessageContext(message: {
  id?: string;
  timing?: string;
}): string {
  return [message.id, message.timing].filter(Boolean).join(" / ");
}

function formatScreenLocalProcessRowContext(
  processId: string,
  row: { id?: string }
): string {
  return [processId, row.id].filter(Boolean).join(" / ");
}

function collectRelatedSourceLinks(
  model: ParsedFileModel,
  outbound: ImpactReference[],
  inbound: ImpactReference[],
  index: ModelingVaultIndex
): ImpactSourceLink[] {
  const links: ImpactSourceLink[] = [];
  const addLinks = (
    owner: ParsedFileModel | null | undefined,
    relationKind: ImpactSourceLink["relationKind"]
  ): void => {
    if (!owner) {
      return;
    }
    for (const link of owner.sourceLinks ?? []) {
      links.push(createImpactSourceLink(owner, link, relationKind));
    }
  };

  addLinks(model, "self");
  for (const reference of outbound) {
    addLinks(reference.targetPath ? index.modelsByFilePath[reference.targetPath] : null, "outbound");
  }
  for (const reference of inbound) {
    addLinks(index.modelsByFilePath[reference.sourcePath], "inbound");
  }
  return groupImpactSourceLinks(links);
}

function createImpactSourceLink(
  owner: ParsedFileModel,
  link: SourceLink,
  relationKind: ImpactSourceLink["relationKind"]
): ImpactSourceLink {
  return {
    ownerPath: owner.path,
    ownerId: getModelId(owner),
    ownerType: owner.fileType,
    ownerLabel: getReferencedModelDisplayName(owner),
    path: link.path,
    label: link.label,
    notes: link.notes?.trim() ? [link.notes.trim()] : [],
    relationKind
  };
}

function groupImpactSourceLinks(sourceLinks: ImpactSourceLink[]): ImpactSourceLink[] {
  const groups = new Map<string, ImpactSourceLink>();
  for (const link of sourceLinks) {
    const key = [
      link.relationKind,
      link.ownerLabel,
      link.path
    ].join("::");
    const existing = groups.get(key);
    if (existing) {
      if (!existing.label && link.label) {
        existing.label = link.label;
      }
      for (const note of link.notes) {
        if (note && !existing.notes.includes(note)) {
          existing.notes.push(note);
        }
      }
      continue;
    }
    groups.set(key, {
      ...link,
      notes: [...new Set(link.notes.filter(Boolean))]
    });
  }

  return [...groups.values()].sort((left, right) =>
    [left.relationKind, left.ownerLabel, left.path]
      .join("|")
      .localeCompare([right.relationKind, right.ownerLabel, right.path].join("|"))
  );
}

function isExternalModelReference(reference: string): boolean {
  return extractModelReferenceCandidates(reference).length > 0;
}

function formatCategorizedRelationshipSection(
  title: string,
  relationships: ImpactRelationship[]
): string {
  if (relationships.length === 0) {
    return `${title}\n- none`;
  }

  const lines = [title];
  const groups = groupImpactRelationshipsByCategory(relationships);
  for (const key of IMPACT_RELATIONSHIP_CATEGORY_ORDER) {
    const group = groups.get(key) ?? [];
    if (group.length === 0) {
      continue;
    }
    lines.push("", `### ${getImpactRelationshipCategoryMarkdownLabel(key)}`);
    for (const relationship of dedupeImpactRelationships(group)) {
      const usageText = relationship.usageCount === 1
        ? "1 usage"
        : `${relationship.usageCount} usages`;
      const idText = relationship.modelId && relationship.modelId !== relationship.modelLabel
        ? ` (${relationship.modelId})`
        : "";
      lines.push(`- ${relationship.modelLabel}${idText} — ${usageText}`);
    }
  }
  return lines.join("\n");
}

function groupImpactRelationshipsByCategory(
  relationships: ImpactRelationship[]
): Map<ImpactRelationshipCategoryKey, ImpactRelationship[]> {
  const groups = new Map<ImpactRelationshipCategoryKey, ImpactRelationship[]>();
  for (const relationship of relationships) {
    const key = getImpactRelationshipCategoryKey(relationship);
    const group = groups.get(key) ?? [];
    group.push(relationship);
    groups.set(key, group);
  }
  return groups;
}

function dedupeImpactRelationships(relationships: ImpactRelationship[]): ImpactRelationship[] {
  const seen = new Set<string>();
  const deduped: ImpactRelationship[] = [];
  for (const relationship of relationships) {
    const key = relationship.modelPath || relationship.modelId || `${relationship.modelType}:${relationship.modelLabel}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(relationship);
  }
  return deduped;
}

function getImpactRelationshipCategoryMarkdownLabel(
  key: ImpactRelationshipCategoryKey
): string {
  switch (key) {
    case "screens":
      return "Screens";
    case "processes":
      return "Processes";
    case "rules":
      return "Rules";
    case "mappings":
      return "Mappings";
    case "diagrams":
      return "Diagrams";
    case "classes":
      return "Classes";
    case "dataEr":
      return "Data / ER";
    case "other":
    default:
      return "Other models";
  }
}

function formatValueUsageSection(
  title: string,
  valueUsages: ImpactValueUsage[]
): string {
  if (valueUsages.length === 0) {
    return `${title}\n- none`;
  }

  const lines = [title];
  for (const valueUsage of valueUsages) {
    lines.push(`- ${valueUsage.member}:`);
    if (valueUsage.relationships.length === 0) {
      lines.push("  - none");
      continue;
    }
    for (const relationship of valueUsage.relationships) {
      for (const usage of relationship.usages) {
        const context = formatValueUsageContext(usage);
        lines.push(
          `  - ${relationship.modelLabel} (${relationship.modelType}; 1 usage${context ? `; ${context}` : ""})`
        );
      }
    }
  }
  return lines.join("\n");
}

function formatValueUsageContext(reference: ImpactReference): string {
  return [formatReferenceLocation(reference), reference.sourceContext]
    .filter(Boolean)
    .join("; ");
}

function formatReferenceLocation(reference: ImpactReference): string {
  return [reference.section, reference.field].filter(Boolean).join(".");
}

function formatUnresolvedSection(title: string, references: ImpactReference[]): string {
  if (references.length === 0) {
    return `${title}\n- none`;
  }

  return [
    title,
    ...references.map((reference) => {
      const location = [reference.section, reference.field].filter(Boolean).join("/");
      return `- ${reference.targetRaw} (${[reference.relationKind, location].filter(Boolean).join("; ")})`;
    })
  ].join("\n");
}

function formatSourceLinkCountSection(title: string, sourceLinks: ImpactSourceLink[]): string {
  return [
    title,
    `- total: ${sourceLinks.length}`
  ].join("\n");
}

function getModelId(model: ParsedFileModel): string | undefined {
  switch (model.fileType) {
    case "object":
      return typeof model.frontmatter.id === "string" && model.frontmatter.id.trim()
        ? model.frontmatter.id.trim()
        : model.name;
    case "er-entity":
    case "dfd-object":
    case "dfd-diagram":
    case "flow-diagram":
    case "data-object":
    case "app-process":
    case "screen":
    case "codeset":
    case "message":
    case "rule":
    case "mapping":
    case "domains":
      return model.id;
    case "diagram":
      return model.name;
    case "relations":
      return typeof model.frontmatter.id === "string" && model.frontmatter.id.trim()
        ? model.frontmatter.id.trim()
        : undefined;
    case "markdown":
    default:
      return undefined;
  }
}
