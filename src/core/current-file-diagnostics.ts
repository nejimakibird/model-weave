import {
  extractModelReferenceCandidates,
  parseQualifiedRef,
  parseReferenceValue,
  resolveQualifiedMemberReference,
  resolveReferenceIdentity,
  resolveErEntityReference,
  resolveObjectModelReference
} from "./reference-resolver";
import type { ModelingVaultIndex } from "./vault-index";
import type { ResolvedObjectContext } from "./object-context-resolver";
import { splitMarkdownTableRow } from "../parsers/markdown-table";
import type {
  ParsedFileModel,
  AppProcessModel,
  CodeSetModel,
  ColorSchemeModel,
  DataObjectModel,
  DomainsModel,
  ErEntity,
  DfdObjectModel,
  MessageModel,
  MappingModel,
  ObjectModel,
  ResolvedDiagram,
  RuleModel,
  ScreenModel,
  ValidationWarning
} from "../types/models";
import { isJapaneseLanguage } from "../i18n/language";
import {
  attachDiagnosticModelContext,
  resolveDiagnosticSectionGuidance
} from "./diagnostic-section-guidance";

export { resolveModelWeaveLanguage } from "../i18n/language";

const CLASS_RELATION_KINDS = new Set([
  "association",
  "dependency",
  "inheritance",
  "implementation",
  "aggregation",
  "composition"
]);

export function buildCurrentObjectDiagnostics(
  model: ObjectModel | ErEntity | DfdObjectModel | DataObjectModel | AppProcessModel | ScreenModel | CodeSetModel | MessageModel | RuleModel | MappingModel | DomainsModel | ColorSchemeModel,
  index: ModelingVaultIndex,
  context: ResolvedObjectContext | null,
  warnings: ValidationWarning[]
): ValidationWarning[] {
  const diagnostics = warnings.map((warning: ValidationWarning) =>
    normalizeDiagnosticSeverity(attachDiagnosticModelContext(warning, model.fileType))
  );
  const missingIdDiagnostic = createMissingFrontmatterIdDiagnostic(model, diagnostics);
  if (missingIdDiagnostic) {
    diagnostics.push(missingIdDiagnostic);
  }
  diagnostics.push(...buildCommonSectionDiagnostics(model));

  if (model.fileType === "object") {
    diagnostics.push(...buildClassDiagnostics(model, index));
  } else if (model.fileType === "app-process") {
    diagnostics.push(...buildAppProcessDiagnostics(model, index));
  } else if (model.fileType === "screen") {
    diagnostics.push(...buildScreenDiagnostics(model, index));
  } else if (model.fileType === "codeset") {
    diagnostics.push(...buildCodeSetDiagnostics(model));
  } else if (model.fileType === "message") {
    diagnostics.push(...buildMessageDiagnostics(model));
  } else if (model.fileType === "rule") {
    diagnostics.push(...buildRuleDiagnostics(model, index));
  } else if (model.fileType === "mapping") {
    diagnostics.push(...buildMappingDiagnostics(model, index));
  } else if (model.fileType === "dfd-object") {
    diagnostics.push(...buildDfdObjectDiagnostics(model));
  } else if (model.fileType === "data-object") {
    diagnostics.push(...buildDataObjectDiagnostics(model, index));
  } else if (model.fileType === "color-scheme") {
    // Color Scheme row diagnostics are produced by the parser.
  } else if (model.fileType === "domains") {
    // Standalone Domain diagnostics are produced by the parser.
  } else {
    diagnostics.push(...buildErEntityDiagnostics(model, index));
  }

  if (context) {
    diagnostics.push(
      ...context.warnings.map((warning) =>
        normalizeDiagnosticSeverity(attachDiagnosticModelContext(warning, model.fileType))
      )
    );
  }

  return finalizeCurrentDiagnostics(addModelContextToDiagnostics(diagnostics, model));
}

function addModelContextToDiagnostics(
  diagnostics: ValidationWarning[],
  model: ParsedFileModel
): ValidationWarning[] {
  return diagnostics.map((diagnostic) => attachDiagnosticModelContext(diagnostic, model.fileType));
}

function createMissingFrontmatterIdDiagnostic(
  model: { path: string; frontmatter?: Record<string, unknown> },
  existingDiagnostics: ValidationWarning[]
): ValidationWarning | null {
  const frontmatter = model.frontmatter;
  if (!frontmatter || !hasFrontmatterString(frontmatter, "type") || !hasFrontmatterString(frontmatter, "name")) {
    return null;
  }
  if (hasFrontmatterString(frontmatter, "id")) {
    return null;
  }
  if (existingDiagnostics.some((diagnostic) =>
    diagnostic.field === "id" &&
    (/required frontmatter "id" is missing/i.test(diagnostic.message) || /frontmatter "id" is missing/i.test(diagnostic.message))
  )) {
    return null;
  }
  return {
    code: "invalid-structure",
    message: 'frontmatter "id" is missing; id is used as the stable model identifier.',
    severity: "error",
    path: model.path,
    field: "id",
    context: {
      section: "frontmatter",
      frontmatterKey: "id",
      type: typeof frontmatter.type === "string" ? frontmatter.type : undefined
    }
  };
}

function hasFrontmatterString(frontmatter: Record<string, unknown>, key: string): boolean {
  const value = frontmatter[key];
  return typeof value === "string" && value.trim().length > 0;
}

function buildCommonSectionDiagnostics(model: ParsedFileModel): ValidationWarning[] {
  return [
    ...buildSourceLinksTableDiagnostics(model)
  ];
}

function buildSourceLinksTableDiagnostics(model: ParsedFileModel): ValidationWarning[] {
  if (model.fileType === "markdown") {
    return [];
  }
  const sourceLinks = model.sections?.["Source Links"];
  if (!sourceLinks) {
    return [];
  }
  const tableLines = sourceLinks
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|"));
  if (tableLines.length === 0) {
    return [];
  }
  const headers = splitMarkdownTableRow(tableLines[0])?.map((header) => header.trim()) ?? [];
  if (sameStringList(headers, ["path", "notes"])) {
    return [];
  }
  return [{
    code: "invalid-table-column",
    message: 'table columns in section "Source Links" do not match expected headers',
    severity: "error",
    path: model.path,
    field: "Source Links",
    context: {
      section: "Source Links"
    }
  }];
}

function sameStringList(actual: string[], expected: string[]): boolean {
  return actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

function buildCodeSetDiagnostics(model: CodeSetModel): ValidationWarning[] {
  const diagnostics: ValidationWarning[] = [];
  const codes = new Set<string>();
  const sortOrders = new Set<string>();

  if (!model.kind?.trim()) {
    diagnostics.push(createSectionWarning(model.path, "kind", "kind is empty"));
  }

  if (model.values.length === 0) {
    diagnostics.push(createSectionWarning(model.path, "Values", "values are empty"));
    return diagnostics;
  }

  for (const value of model.values) {
    const code = value.code?.trim();
    if (!code) {
      diagnostics.push(createSectionError(model.path, "Values", "values.code is empty"));
    } else {
      if (codes.has(code)) {
        diagnostics.push(createSectionError(model.path, "Values", `duplicate code "${code}"`));
      }
      codes.add(code);
    }

    if (!value.label?.trim()) {
      diagnostics.push(createSectionWarning(model.path, "Values", `label is empty for code "${code ?? "(blank)"}"`));
    }

    const active = value.active?.trim();
    if (!active) {
      diagnostics.push(createSectionWarning(model.path, "Values", `active is empty for code "${code ?? "(blank)"}"`));
    } else if (active !== "Y" && active !== "N") {
      diagnostics.push(createSectionWarning(model.path, "Values", `active must be Y or N for code "${code ?? "(blank)"}"`));
    } else if (active === "N") {
      diagnostics.push(createSectionInfo(model.path, "Values", `inactive code "${code ?? "(blank)"}" is defined`));
    }

    const sortOrder = value.sortOrder?.trim();
    if (sortOrder) {
      if (!/^-?\d+(\.\d+)?$/.test(sortOrder)) {
        diagnostics.push(createSectionWarning(model.path, "Values", `sort_order is not numeric for code "${code ?? "(blank)"}"`));
      }
      if (sortOrders.has(sortOrder)) {
        diagnostics.push(createSectionWarning(model.path, "Values", `duplicate sort_order "${sortOrder}"`));
      }
      sortOrders.add(sortOrder);
    } else {
      diagnostics.push(createSectionInfo(model.path, "Values", `sort_order is empty for code "${code ?? "(blank)"}"`));
    }

    if (!value.notes?.trim()) {
      diagnostics.push(createSectionInfo(model.path, "Values", `notes are empty for code "${code ?? "(blank)"}"`));
    }
  }

  return diagnostics;
}

function buildMessageDiagnostics(model: MessageModel): ValidationWarning[] {
  const diagnostics: ValidationWarning[] = [];
  const messageIds = new Set<string>();

  if (!model.kind?.trim()) {
    diagnostics.push(createSectionWarning(model.path, "kind", "kind is empty"));
  }

  if (model.messages.length === 0) {
    diagnostics.push(createSectionWarning(model.path, "Messages", "messages are empty"));
    return diagnostics;
  }

  for (const entry of model.messages) {
    const messageId = entry.messageId?.trim();
    if (!messageId) {
      diagnostics.push(createSectionError(model.path, "Messages", "messages.message_id is empty"));
    } else {
      if (messageIds.has(messageId)) {
        diagnostics.push(createSectionError(model.path, "Messages", `duplicate message_id "${messageId}"`));
      }
      messageIds.add(messageId);
    }

    if (!entry.text?.trim()) {
      diagnostics.push(createSectionError(model.path, "Messages", `text is empty for message_id "${messageId ?? "(blank)"}"`));
    }

    const severity = entry.severity?.trim();
    if (!severity) {
      diagnostics.push(createSectionWarning(model.path, "Messages", `severity is empty for message_id "${messageId ?? "(blank)"}"`));
    } else if (!["info", "success", "warning", "error", "confirm", "other"].includes(severity)) {
      diagnostics.push(createSectionWarning(model.path, "Messages", `severity is invalid for message_id "${messageId ?? "(blank)"}"`));
    }

    if (!entry.timing?.trim()) {
      diagnostics.push(createSectionWarning(model.path, "Messages", `timing is empty for message_id "${messageId ?? "(blank)"}"`));
    }
    if (!entry.audience?.trim()) {
      diagnostics.push(createSectionWarning(model.path, "Messages", `audience is empty for message_id "${messageId ?? "(blank)"}"`));
    }

    const active = entry.active?.trim();
    if (!active) {
      diagnostics.push(createSectionWarning(model.path, "Messages", `active is empty for message_id "${messageId ?? "(blank)"}"`));
    } else if (active !== "Y" && active !== "N") {
      diagnostics.push(createSectionWarning(model.path, "Messages", `active must be Y or N for message_id "${messageId ?? "(blank)"}"`));
    } else if (active === "N") {
      diagnostics.push(createSectionInfo(model.path, "Messages", `inactive message "${messageId ?? "(blank)"}" is defined`));
    }

    if (!entry.notes?.trim()) {
      diagnostics.push(createSectionInfo(model.path, "Messages", `notes are empty for message_id "${messageId ?? "(blank)"}"`));
    }
  }

  return diagnostics;
}

function buildRuleDiagnostics(
  model: RuleModel,
  index: ModelingVaultIndex
): ValidationWarning[] {
  const diagnostics: ValidationWarning[] = [];
  const inputIds = new Set<string>();

  if (!model.summary?.trim()) {
    diagnostics.push(createSectionWarning(model.path, "Summary", "summary is empty"));
  }
  if (model.inputs.length === 0) {
    diagnostics.push(createSectionWarning(model.path, "Inputs", "inputs are empty"));
  }
  if (!(model.sections.Conditions ?? []).some((line) => line.trim())) {
    diagnostics.push(createSectionWarning(model.path, "Conditions", "conditions are empty"));
  }

  for (const input of model.inputs) {
    const id = input.id?.trim();
    if (id) {
      if (inputIds.has(id)) {
        diagnostics.push(createSectionWarning(model.path, "Inputs", `duplicate input id "${id}"`));
      }
      inputIds.add(id);
    }

    diagnostics.push(
      ...buildReferenceWarnings(model.path, "Inputs", input.data, index, "unresolved rule input data reference"),
      ...buildReferenceWarnings(model.path, "Inputs", input.source, index, "unresolved rule input source reference")
    );
  }

  for (const reference of model.references) {
    diagnostics.push(
      ...buildReferenceWarnings(model.path, "References", reference.ref, index, "unresolved rule reference")
    );
  }

  for (const message of model.messages) {
    diagnostics.push(
      ...buildReferenceWarnings(model.path, "Messages", message.message, index, "unresolved message reference")
    );
  }

  return diagnostics;
}

function buildMappingDiagnostics(
  model: MappingModel,
  index: ModelingVaultIndex
): ValidationWarning[] {
  const diagnostics: ValidationWarning[] = [];
  const mappingRows = new Set<string>();
  const targetMemberRows = new Map<string, { display: string; rowKeys: Set<string>; warned: boolean }>();

  for (const scope of model.scope) {
    diagnostics.push(
      ...buildReferenceWarnings(model.path, "Scope", scope.ref, index, "unresolved scope reference")
    );
  }

  for (const row of model.mappings) {
    const targetRef = row.targetRef?.trim();
    const sourceRef = row.sourceRef?.trim();
    const transform = row.transform?.trim();
    const required = row.required?.trim();
    const rule = row.rule?.trim();

    if (!targetRef) {
      diagnostics.push(createSectionWarning(model.path, "Mappings", "target_ref is empty"));
    }

    if (sourceRef && targetRef) {
      const duplicateKey = buildMappingRowDuplicateKey(sourceRef, targetRef, transform, rule);
      if (mappingRows.has(duplicateKey)) {
        diagnostics.push(
          createSectionWarning(
            model.path,
            "Mappings",
            `duplicate mapping row "${formatMappingReferenceForMessage(sourceRef)} -> ${formatMappingReferenceForMessage(targetRef)}"`
          )
        );
      }
      mappingRows.add(duplicateKey);
    }

    if (targetRef) {
      const targetMember = getMappingTargetMemberReference(targetRef);
      if (targetMember) {
        const rowKey = buildMappingRowDuplicateKey(sourceRef, targetRef, transform, rule);
        const existing = targetMemberRows.get(targetMember.key) ?? {
          display: targetMember.display,
          rowKeys: new Set<string>(),
          warned: false
        };
        existing.rowKeys.add(rowKey);
        if (!existing.warned && existing.rowKeys.size > 1) {
          diagnostics.push(createDuplicateMappingTargetMemberWarning(model.path, targetMember.display));
          existing.warned = true;
        }
        targetMemberRows.set(targetMember.key, existing);
      }
    }

    if (!sourceRef && !transform) {
      diagnostics.push(createSectionWarning(model.path, "Mappings", "source_ref is empty and transform is also empty"));
    }

    if (sourceRef) {
      diagnostics.push(
        ...buildReferenceWarnings(model.path, "Mappings", sourceRef, index, "unresolved mapping source_ref")
      );
    }
    if (targetRef) {
      diagnostics.push(
        ...buildReferenceWarnings(model.path, "Mappings", targetRef, index, "unresolved mapping target_ref")
      );
    }
    if (rule) {
      diagnostics.push(
        ...buildReferenceWarnings(model.path, "Mappings", rule, index, "unresolved mapping rule reference")
      );
    }
    if (required && required !== "Y" && required !== "N") {
      diagnostics.push(createSectionWarning(model.path, "Mappings", `required must be Y or N for target_ref "${targetRef ?? "(blank)"}"`));
    }
  }

  return diagnostics;
}

function buildMappingRowDuplicateKey(
  sourceRef: string | undefined,
  targetRef: string | undefined,
  transform: string | undefined,
  rule: string | undefined
): string {
  return [
    normalizeMappingReferenceKey(sourceRef),
    normalizeMappingReferenceKey(targetRef),
    normalizeMappingFreeTextKey(transform),
    normalizeMappingReferenceKey(rule)
  ].join("\t");
}

function getMappingTargetMemberReference(reference: string): { key: string; display: string } | null {
  const qualified = parseQualifiedRef(reference);
  if (!qualified?.hasMemberRef || !qualified.memberRef) {
    return null;
  }

  const display = formatMappingReferenceForMessage(reference);
  return {
    key: normalizeMappingReferenceKey(reference),
    display
  };
}

function createDuplicateMappingTargetMemberWarning(path: string, display: string): ValidationWarning {
  return {
    code: "duplicate-mapping-target-member",
    message: `mapping target member "${display}" is mapped from multiple sources.`,
    severity: "warning",
    path,
    field: "Mappings",
    context: { section: "Mappings", reference: display }
  };
}

function normalizeMappingReferenceKey(reference: string | undefined): string {
  return formatMappingReferenceForMessage(reference).toLowerCase();
}

function normalizeMappingFreeTextKey(value: string | undefined): string {
  return value?.trim().replace(/\s+/g, " ").toLowerCase() ?? "";
}

function formatMappingReferenceForMessage(reference: string | undefined): string {
  const trimmed = reference?.trim();
  if (!trimmed) {
    return "";
  }

  const qualified = parseQualifiedRef(trimmed);
  if (qualified) {
    const parsedBase = parseReferenceValue(qualified.baseRefRaw);
    const base = parsedBase?.target?.trim() || qualified.baseRefRaw.trim();
    return qualified.memberRef ? `${base}.${qualified.memberRef}` : base;
  }

  const parsed = parseReferenceValue(trimmed);
  return parsed?.target?.trim() || trimmed;
}

function buildAppProcessDiagnostics(
  model: AppProcessModel,
  index: ModelingVaultIndex
): ValidationWarning[] {
  const diagnostics: ValidationWarning[] = [];
  const inputIds = new Set<string>();
  const outputIds = new Set<string>();

  for (const input of model.inputs) {
    const id = input.id?.trim();
    if (id) {
      if (inputIds.has(id)) {
        diagnostics.push(createSectionWarning(model.path, "Inputs", `duplicate input id "${id}"`));
      }
      inputIds.add(id);
    }

    diagnostics.push(
      ...buildReferenceWarnings(model.path, "Inputs", input.data, index, "unresolved input data reference"),
      ...buildReferenceWarnings(model.path, "Inputs", input.source, index, "unresolved input source reference")
    );
  }

  for (const output of model.outputs) {
    const id = output.id?.trim();
    if (id) {
      if (outputIds.has(id)) {
        diagnostics.push(createSectionWarning(model.path, "Outputs", `duplicate output id "${id}"`));
      }
      outputIds.add(id);
    }

    diagnostics.push(
      ...buildReferenceWarnings(model.path, "Outputs", output.data, index, "unresolved output data reference"),
      ...buildReferenceWarnings(model.path, "Outputs", output.target, index, "unresolved output target reference")
    );
  }

  for (const trigger of model.triggers) {
    diagnostics.push(
      ...buildReferenceWarnings(model.path, "Triggers", trigger.source, index, "unresolved trigger source reference")
    );
  }

  for (const transition of model.transitions) {
    diagnostics.push(
      ...buildReferenceWarnings(
        model.path,
        "Transitions",
        transition.to,
        index,
        "transition target reference",
        undefined,
        { useCouldNotResolveMessage: true }
      )
    );
  }

  return diagnostics;
}

function buildScreenDiagnostics(
  model: ScreenModel,
  index: ModelingVaultIndex
): ValidationWarning[] {
  const diagnostics: ValidationWarning[] = [];
  const layoutIds = new Set<string>();
  const fieldIds = new Set<string>();
  const actionIds = new Set<string>();

  for (const layout of model.layouts) {
    const id = layout.id?.trim();
    if (!id) {
      continue;
    }
    if (layoutIds.has(id)) {
      diagnostics.push(createSectionError(model.path, "Layout", `duplicate layout id "${id}"`));
    }
    layoutIds.add(id);
  }

  for (const field of model.fields) {
    const id = field.id?.trim();
    if (!id) {
      diagnostics.push({
        code: "invalid-structure",
        message: "field id is empty",
        severity: "error",
        path: model.path,
        field: "Fields",
        line: field.rowLine,
        context: { section: "Fields" }
      });
    } else {
      if (fieldIds.has(id)) {
        diagnostics.push(createSectionWarning(model.path, "Fields", `duplicate field id "${id}"`));
      }
      fieldIds.add(id);
    }

    const layoutId = field.layout?.trim();
    if (layoutId && layoutIds.size > 0 && !layoutIds.has(layoutId)) {
      diagnostics.push(createSectionWarning(model.path, "Fields", `field layout "${layoutId}" does not match any Layout.id`));
    } else if (!layoutId && layoutIds.size > 0) {
      diagnostics.push(createSectionWarning(model.path, "Fields", `layout is empty for field "${id || field.label || "(field)"}"`));
    }

    diagnostics.push(
      ...buildReferenceWarnings(model.path, "Fields", field.ref, index, "unresolved field ref"),
      ...buildReferenceWarnings(model.path, "Fields", field.rule, index, "unresolved field rule reference")
    );
  }

  const actionSignatures = new Set<string>();
  let hasTransitionAction = false;
  for (const action of model.actions) {
    const id = action.id?.trim();
    if (id) {
      if (actionIds.has(id)) {
        diagnostics.push(createSectionWarning(model.path, "Actions", `duplicate action id "${id}"`));
      }
      actionIds.add(id);
    }

    const target = action.target?.trim();
    const isScreenEvent = action.kind?.trim() === "screen_event";
    if (!target && isScreenEvent) {
      diagnostics.push(createSectionInfo(model.path, "Actions", "action target is empty for screen_event"));
    } else if (target && !fieldIds.has(target)) {
      diagnostics.push(createSectionWarning(model.path, "Actions", `action target "${target}" does not match any Fields.id`));
    }

    const actionSignature = buildScreenActionDuplicateSignature(action);
    if (actionSignature) {
      if (actionSignatures.has(actionSignature)) {
        diagnostics.push({
          code: "invalid-structure",
          message: `duplicate action definition "${target ?? ""}" + "${action.event?.trim() ?? ""}"`,
          severity: "warning",
          path: model.path,
          field: "Actions",
          context: { section: "Actions" }
        });
      }
      actionSignatures.add(actionSignature);
    }

    const localProcessTarget = resolveScreenLocalProcessTarget(action.invoke, model);
    if (localProcessTarget.kind === "resolved") {
      // Resolved same-screen Local Process invoke; no external warning needed.
    } else if (localProcessTarget.kind === "unresolved-local") {
      diagnostics.push(
        createSectionWarning(
          model.path,
          "Actions",
          `unresolved local process invoke reference "${action.invoke?.trim() ?? ""}"`
        )
      );
    } else {
      diagnostics.push(
        ...buildReferenceWarnings(
          model.path,
          "Actions",
          action.invoke,
          index,
          "unresolved action invoke reference",
          "app-process"
        )
        );
      }

      const transition = action.transition?.trim();
      if (transition) {
        hasTransitionAction = true;
        if (!action.label?.trim()) {
          diagnostics.push(
            createSectionInfo(
              model.path,
              "Actions",
              "transition preview label uses fallback because action label is empty"
            )
          );
        }
        const resolvedTransition = resolveReferenceIdentity(transition, index);
        if (
          resolvedTransition.resolvedModel?.fileType === "screen" &&
          resolvedTransition.resolvedModel.path === model.path
        ) {
          diagnostics.push(
            createSectionWarning(
              model.path,
              "Actions",
              `action transition "${transition}" points to the current screen`
            )
          );
        }
      }

      diagnostics.push(
      ...buildReferenceWarnings(model.path, "Actions", action.transition, index, "unresolved action transition reference", "screen"),
        ...buildReferenceWarnings(model.path, "Actions", action.rule, index, "unresolved action rule reference")
      );
  }

  for (const message of model.messages) {
    diagnostics.push(
      ...buildReferenceWarnings(model.path, "Messages", message.text, index, "unresolved screen message reference")
    );
  }

  if (!hasTransitionAction) {
    diagnostics.push(
      createSectionInfo(
        model.path,
        "Actions",
        "no actions.transition defined for this screen"
      )
    );
  }

  return diagnostics;
}

function buildScreenActionDuplicateSignature(action: ScreenModel["actions"][number]): string | null {
  const target = action.target?.trim();
  const event = action.event?.trim();
  if (!target || !event) {
    return null;
  }

  return [
    target,
    event,
    action.condition?.trim() ?? "",
    action.kind?.trim() ?? "",
    action.invoke?.trim() ?? "",
    action.transition?.trim() ?? "",
    action.rule?.trim() ?? ""
  ].join("\u0000");
}

function resolveLocalHeadingTarget(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = parseReferenceValue(trimmed);
  if (!parsed?.target?.startsWith("#")) {
    return null;
  }

  const heading = parsed.target.slice(1).trim();
  return heading || null;
}

function resolveScreenLocalProcessTarget(
  value: string | undefined,
  model: ScreenModel
): { kind: "resolved" | "unresolved-local" | "not-local"; processId?: string } {
  const trimmed = value?.trim();
  if (!trimmed) {
    return { kind: "not-local" };
  }

  const localHeadingTarget = resolveLocalHeadingTarget(trimmed);
  if (localHeadingTarget) {
    const exists = model.localProcesses.some(
      (process) => normalizeLocalProcessId(process.id) === normalizeLocalProcessId(localHeadingTarget)
    );
    return exists
      ? { kind: "resolved", processId: localHeadingTarget }
      : { kind: "unresolved-local", processId: localHeadingTarget };
  }

  const plainId = normalizeLocalProcessId(trimmed);
  if (!plainId) {
    return { kind: "not-local" };
  }

  const plainExists = model.localProcesses.some(
    (process) => normalizeLocalProcessId(process.id) === plainId
  );
  if (plainExists) {
    return { kind: "resolved", processId: trimmed };
  }

  const looksLocalProcessId = /^PROC[-_A-Z0-9]+$/i.test(trimmed);
  if (looksLocalProcessId) {
    return { kind: "unresolved-local", processId: trimmed };
  }

  return { kind: "not-local" };
}

function normalizeLocalProcessId(value: string | undefined): string {
  return value?.trim().replace(/^#+/, "").trim().toUpperCase() ?? "";
}

function buildReferenceWarnings(
  path: string,
  section: string,
  ref: string | undefined,
  index: ModelingVaultIndex,
  messagePrefix: string,
  expectedFileType?: "screen" | "app-process",
  options: { useCouldNotResolveMessage?: boolean } = {}
): ValidationWarning[] {
  const value = ref?.trim();
  if (!value) {
    return [];
  }

  const candidates = extractModelReferenceCandidates(value);
  if (candidates.length === 0) {
    return [];
  }
  if (candidates.length > 1 || candidates[0] !== value) {
    return candidates.flatMap((candidate) =>
      buildSingleReferenceWarnings(
        path,
        section,
        candidate,
        index,
        messagePrefix,
        expectedFileType,
        options
      )
    );
  }

  return buildSingleReferenceWarnings(
    path,
    section,
    value,
    index,
    messagePrefix,
    expectedFileType,
    options
  );
}

function buildSingleReferenceWarnings(
  path: string,
  section: string,
  value: string,
  index: ModelingVaultIndex,
  messagePrefix: string,
  expectedFileType?: "screen" | "app-process",
  options: { useCouldNotResolveMessage?: boolean } = {}
): ValidationWarning[] {
  const qualified = parseQualifiedRef(value);
  if (qualified?.hasMemberRef) {
    const resolved = resolveQualifiedMemberReference(value, index);
    if (!resolved.baseIdentity.resolvedModel) {
      return [createSectionWarning(path, section, formatReferenceWarningMessage(messagePrefix, value, options))];
    }
    if (expectedFileType && resolved.baseIdentity.resolvedModel.fileType !== expectedFileType) {
      return [createSectionWarning(path, section, formatReferenceWarningMessage(messagePrefix, value, options))];
    }
    if (resolved.memberResolution === "deferred") {
      return [];
    }
    if (!resolved.member) {
      return [
        createSectionWarning(
          path,
          section,
          `unresolved member ref: ${qualified.memberRef} in ${resolved.baseIdentity.resolvedId ?? qualified.baseRefRaw}`
        )
      ];
    }
    return [];
  }

  const parsed = parseReferenceValue(value);
  if (parsed?.isExternal || parsed?.kind === "raw") {
    return [];
  }

  const resolved = resolveReferenceIdentity(value, index);
  if (!resolved.resolvedModel) {
    return [createSectionWarning(path, section, formatReferenceWarningMessage(messagePrefix, value, options))];
  }
  if (expectedFileType && resolved.resolvedModel.fileType !== expectedFileType) {
    return [createSectionWarning(path, section, formatReferenceWarningMessage(messagePrefix, value, options))];
  }

  return [];
}

function formatReferenceWarningMessage(
  messagePrefix: string,
  value: string,
  options: { useCouldNotResolveMessage?: boolean }
): string {
  return options.useCouldNotResolveMessage
    ? `${messagePrefix} "${value}" could not be resolved. Check the ID or file name.`
    : `${messagePrefix} "${value}"`;
}

function createSectionWarning(
  path: string,
  section: string,
  message: string
): ValidationWarning {
  return {
    code: "invalid-structure",
    message,
    severity: "warning",
    path,
    field: section,
    context: { section }
  };
}

function createSectionInfo(
  path: string,
  section: string,
  message: string
): ValidationWarning {
  return {
    code: "invalid-structure",
    message,
    severity: "info",
    path,
    field: section,
    context: { section }
  };
}

function createSectionError(
  path: string,
  section: string,
  message: string
): ValidationWarning {
  return {
    code: "invalid-structure",
    message,
    severity: "error",
    path,
    field: section,
    context: { section }
  };
}

function buildDfdObjectDiagnostics(model: DfdObjectModel): ValidationWarning[] {
  const diagnostics: ValidationWarning[] = [];

  if (!model.id) {
    diagnostics.push({
      code: "invalid-structure",
      message: 'required frontmatter "id" is missing',
      severity: "error",
      path: model.path,
      field: "id",
      context: {
        section: "frontmatter"
      }
    });
  }

  return diagnostics;
}

function buildDataObjectDiagnostics(
  model: DataObjectModel,
  index: ModelingVaultIndex
): ValidationWarning[] {
  const diagnostics: ValidationWarning[] = [];
  const fieldNameOccurrences = new Map<string, number>();
  const fieldNumbersByRecordType = new Map<string, Set<string>>();
  const fieldPositionsByRecordType = new Map<string, Set<string>>();
  const recordTypes = new Set<string>();

  if (!model.dataFormat?.trim()) {
    diagnostics.push(createSectionWarning(model.path, "data_format", "data_format is empty"));
  }
  if (!model.kind?.trim()) {
    diagnostics.push(createSectionWarning(model.path, "kind", "kind is empty"));
  }
  if (model.dataFormat?.trim() === "fixed" && !model.recordLength?.trim()) {
    diagnostics.push(createSectionError(model.path, "record_length", "record_length is required when data_format is fixed"));
  }
  if (
    ["csv", "tsv", "delimited"].includes(model.dataFormat?.trim() ?? "") &&
    !model.delimiter?.trim()
  ) {
    diagnostics.push(createSectionWarning(model.path, "delimiter", "delimiter is empty for delimited data_format"));
  }

  for (const record of model.records) {
    const recordType = record.recordType?.trim();
    if (!recordType) {
      continue;
    }
    if (recordTypes.has(recordType)) {
      diagnostics.push(createSectionError(model.path, "Records", `duplicate record_type "${recordType}"`));
    }
    recordTypes.add(recordType);
  }

  for (const field of model.fields) {
    const fieldName = field.name?.trim();
    if (!fieldName) {
      diagnostics.push({
        code: "invalid-structure",
        message: "field name is empty",
        severity: "error",
        path: model.path,
        field: "Fields",
        line: field.rowLine,
        context: {
          section: "Fields"
        }
      });
      continue;
    }

    if (!field.label?.trim()) {
      diagnostics.push(createFieldWarning(model.path, field.rowLine, `label is empty for field "${fieldName}"`));
    }
    if (!field.type?.trim()) {
      diagnostics.push(createFieldWarning(model.path, field.rowLine, `type is empty for field "${fieldName}"`));
    }
    if (field.required?.trim() && !["Y", "N"].includes(field.required.trim())) {
      diagnostics.push(createFieldWarning(model.path, field.rowLine, `required must be Y or N for field "${fieldName}"`));
    }
    if (field.length?.trim() && !/^\d+$/.test(field.length.trim())) {
      diagnostics.push(createFieldWarning(model.path, field.rowLine, `length is not numeric for field "${fieldName}"`));
    }

    fieldNameOccurrences.set(fieldName, (fieldNameOccurrences.get(fieldName) ?? 0) + 1);

    if (model.fieldMode === "file_layout") {
      const recordType = field.recordType?.trim();
      if (model.records.length > 0 && recordType && !recordTypes.has(recordType)) {
        diagnostics.push(createFieldError(model.path, field.rowLine, `record_type "${recordType}" is not defined in Records`));
      }
      if (model.dataFormat?.trim() === "fixed" && !field.position?.trim()) {
        diagnostics.push(createFieldError(model.path, field.rowLine, `position is required for fixed format field "${fieldName}"`));
      }

      const noKey = recordType || "__default__";
      if (field.no?.trim()) {
        if (!fieldNumbersByRecordType.has(noKey)) {
          fieldNumbersByRecordType.set(noKey, new Set());
        }
        const numbers = fieldNumbersByRecordType.get(noKey)!;
        if (numbers.has(field.no.trim())) {
          diagnostics.push(createFieldWarning(model.path, field.rowLine, `duplicate no "${field.no.trim()}" in record_type "${recordType || "(default)"}"`));
        }
        numbers.add(field.no.trim());
      }
      if (field.position?.trim()) {
        if (!fieldPositionsByRecordType.has(noKey)) {
          fieldPositionsByRecordType.set(noKey, new Set());
        }
        const positions = fieldPositionsByRecordType.get(noKey)!;
        if (positions.has(field.position.trim())) {
          diagnostics.push(createFieldWarning(model.path, field.rowLine, `duplicate position "${field.position.trim()}" in record_type "${recordType || "(default)"}"`));
        }
        positions.add(field.position.trim());
      }
    }

    const ref = field.ref?.trim();
    if (!ref) {
      continue;
    }

    const qualified = parseQualifiedRef(ref);
    if (qualified?.hasMemberRef) {
      const resolved = resolveQualifiedMemberReference(ref, index);
      if (!resolved.baseIdentity.resolvedModel) {
        diagnostics.push({
          code: "unresolved-reference",
          message: `unresolved field reference "${ref}"`,
          severity: "warning",
          path: model.path,
          field: "Fields",
          line: field.rowLine,
          context: {
            section: "Fields"
          }
        });
        continue;
      }

      if (resolved.memberResolution === "deferred") {
        continue;
      }
      if (!resolved.member) {
        diagnostics.push({
          code: "unresolved-reference",
          message: `unresolved member ref: ${qualified.memberRef} in ${resolved.baseIdentity.resolvedId ?? resolved.baseIdentity.resolvedFile ?? qualified.baseRefRaw}`,
          severity: "warning",
          path: model.path,
          field: "Fields",
          line: field.rowLine,
          context: {
            section: "Fields"
          }
        });
      }
      continue;
    }

    const parsed = parseReferenceValue(ref);
    if (parsed?.isExternal || parsed?.kind === "raw") {
      continue;
    }

    const resolved = resolveReferenceIdentity(ref, index);
    if (resolved.resolvedModel) {
      continue;
    }

    diagnostics.push({
      code: "unresolved-reference",
      message: `unresolved field reference "${ref}"`,
      severity: "warning",
      path: model.path,
      field: "Fields",
      line: field.rowLine,
      context: {
        section: "Fields"
      }
    });
  }

  for (const [fieldName, count] of fieldNameOccurrences.entries()) {
    if (count > 1) {
      diagnostics.push(createSectionWarning(model.path, "Fields", `duplicate field name "${fieldName}"`));
    }
  }

  return diagnostics;
}

function createFieldWarning(
  path: string,
  line: number | undefined,
  message: string
): ValidationWarning {
  return {
    code: "invalid-structure",
    message,
    severity: "warning",
    path,
    field: "Fields",
    line,
    context: { section: "Fields" }
  };
}

function createFieldError(
  path: string,
  line: number | undefined,
  message: string
): ValidationWarning {
  return {
    code: "invalid-structure",
    message,
    severity: "error",
    path,
    field: "Fields",
    line,
    context: { section: "Fields" }
  };
}

export function buildCurrentDiagramDiagnostics(
  diagram: ResolvedDiagram,
  warnings: ValidationWarning[]
): ValidationWarning[] {
  const diagnostics = warnings.map((warning) =>
    normalizeDiagnosticSeverity(attachDiagnosticModelContext(warning, diagram.diagram.fileType))
  );
  const missingIdDiagnostic = createMissingFrontmatterIdDiagnostic(diagram.diagram, diagnostics);
  if (missingIdDiagnostic) {
    diagnostics.push(missingIdDiagnostic);
  }
  diagnostics.push(...buildCommonSectionDiagnostics(diagram.diagram));
  return finalizeCurrentDiagnostics(addModelContextToDiagnostics(diagnostics, diagram.diagram));
}

function buildClassDiagnostics(
  model: ObjectModel,
  index: ModelingVaultIndex
): ValidationWarning[] {
  const diagnostics: ValidationWarning[] = [];

  for (const relation of model.relations) {
    const targetObject = resolveObjectModelReference(relation.targetClass, index);
    const targetIdentity = targetObject
      ? undefined
      : resolveReferenceIdentity(relation.targetClass, index);

    if (!targetObject && !targetIdentity?.resolvedModel) {
      diagnostics.push({
        code: "unresolved-reference",
        message: `unresolved class relation target "${relation.targetClass}"`,
        severity: "warning",
        path: model.path,
        field: "Relations",
        context: {
          relatedId: relation.id,
          section: "Relations"
        }
      });
    } else if (!targetObject && targetIdentity?.resolvedModel) {
      diagnostics.push({
        code: "class-relation-target-not-diagram-compatible",
        message: formatClassRelationTargetNotDiagramCompatibleMessage(
          getReferenceDiagnosticLabel(relation.targetClass, targetIdentity)
        ),
        severity: "warning",
        path: model.path,
        field: "Relations",
        context: {
          relatedId: relation.id,
          section: "Relations"
        }
      });
    }

    if (!CLASS_RELATION_KINDS.has(relation.kind)) {
      diagnostics.push({
        code: "invalid-kind",
        message: `invalid class relation kind "${relation.kind}"`,
        severity: "warning",
        path: model.path,
        field: "Relations",
        context: {
          relatedId: relation.id,
          section: "Relations"
        }
      });
    }
  }

  return diagnostics;
}

function getReferenceDiagnosticLabel(
  reference: string,
  identity?: ReturnType<typeof resolveReferenceIdentity>
): string {
  return (
    identity?.resolvedId ??
    identity?.target ??
    parseReferenceValue(reference)?.target ??
    reference.trim()
  );
}

function formatClassRelationTargetNotDiagramCompatibleMessage(target: string): string {
  return `class relation target "${target}" exists, but is not compatible with Class Diagram rendering and was excluded. Consider representing non-structural cross-model relationships with Mapping.`;
}


function buildErEntityDiagnostics(
  entity: ErEntity,
  index: ModelingVaultIndex
): ValidationWarning[] {
  const diagnostics: ValidationWarning[] = [];
  const localColumnNames = new Set(entity.columns.map((column) => column.physicalName));
  const relationIds = new Set<string>();

  if (entity.relationBlocks.length === 0) {
    diagnostics.push({
      code: "section-missing",
      message: 'No relations are defined in "## Relations".',
      severity: "info",
      path: entity.path,
      field: "Relations",
      context: {
        section: "Relations"
      }
    });
  }

  for (const relationBlock of entity.relationBlocks) {
    const relationId = relationBlock.id?.trim() ?? "";
    if (!relationId) {
      diagnostics.push(createSectionError(entity.path, "Relations", "invalid ER relation id: (empty)"));
    } else {
      if (isIncompleteErRelationId(relationId)) {
        diagnostics.push(createSectionError(entity.path, "Relations", `ER relation id looks incomplete: ${relationId}`));
      }
      if (relationIds.has(relationId)) {
        diagnostics.push(createSectionError(entity.path, "Relations", `duplicate ER relation id: ${relationId}`));
      } else {
        relationIds.add(relationId);
      }
    }

    if (!relationBlock.cardinality) {
      diagnostics.push({
        code: "section-missing",
        message: `relation "${relationBlock.id}" does not specify cardinality`,
        severity: "info",
        path: entity.path,
        field: "Relations",
        context: {
          relatedId: relationBlock.id,
          section: "Relations"
        }
      });
    }

    if (!relationBlock.targetTable) {
      diagnostics.push({
        code: "unresolved-reference",
        message: `relation "${relationBlock.id}" does not resolve target_table`,
        severity: "warning",
        path: entity.path,
        field: "Relations",
        context: {
          relatedId: relationBlock.id,
          section: "Relations"
        }
      });
      continue;
    }

    const targetEntity = resolveErEntityReference(relationBlock.targetTable, index);
    if (!targetEntity) {
      diagnostics.push({
        code: "unresolved-reference",
        message: `relation "${relationBlock.id}" target_table "${relationBlock.targetTable}" could not be resolved`,
        severity: "warning",
        path: entity.path,
        field: "Relations",
        context: {
          relatedId: relationBlock.id,
          section: "Relations"
        }
      });
      continue;
    }

    const targetColumnNames = new Set(
      targetEntity.columns.map((column) => column.physicalName)
    );

    for (const mapping of relationBlock.mappings) {
      if (mapping.localColumn && !localColumnNames.has(mapping.localColumn)) {
        diagnostics.push({
          code: "unresolved-reference",
          message: `relation "${relationBlock.id}" local column "${mapping.localColumn}" does not exist in the current entity`,
          severity: "warning",
          path: entity.path,
          field: "Relations",
          context: {
            relatedId: relationBlock.id,
            section: "Relations"
          }
        });
      }

      if (mapping.targetColumn && !targetColumnNames.has(mapping.targetColumn)) {
        diagnostics.push({
          code: "unresolved-reference",
          message: `relation "${relationBlock.id}" target column "${mapping.targetColumn}" does not exist in "${targetEntity.physicalName}"`,
          severity: "warning",
          path: entity.path,
          field: "Relations",
          context: {
            relatedId: relationBlock.id,
            section: "Relations"
          }
        });
      }
    }
  }

  return diagnostics;
}

function isIncompleteErRelationId(id: string): boolean {
  const normalized = id.trim().toUpperCase();
  return (
    !normalized ||
    normalized === "REL" ||
    normalized === "REL-" ||
    normalized === "REL--" ||
    normalized === "REL-NEW" ||
    normalized === "REL-TODO"
  );
}

function normalizeDiagnosticSeverity(warning: ValidationWarning): ValidationWarning {
  if (warning.severity === "info" || warning.severity === "error") {
    return warning;
  }

  if (
    warning.code === "frontmatter-parse-error" ||
    warning.code === "unknown-schema" ||
    warning.code === "invalid-table-row" ||
    warning.code === "missing-name" ||
    warning.code === "missing-kind"
  ) {
    return { ...warning, severity: "error" };
  }

  if (warning.code === "invalid-table-column") {
    const guidance = resolveDiagnosticSectionGuidance(warning);
    return guidance?.supported === false ? warning : { ...warning, severity: "error" };
  }

  if (
    warning.code === "invalid-structure" &&
    typeof warning.field === "string" &&
    ["type", "id", "name", "logical_name", "physical_name", "kind"].includes(warning.field)
  ) {
    return { ...warning, severity: "error" };
  }

  return warning;
}

export function localizeDiagnosticMessage(message: string, language?: string): string {
  if (!isJapaneseLanguage(language)) {
    return message;
  }

  const replacements: Array<[RegExp, string | ((...matches: string[]) => string)]> = [
    [/^Mermaid overview: no outbound relations to display\.$/, "Mermaid概要: 表示する外向きの関係はありません。"],
    [/^kind is empty$/, "kind が空です。"],
    [/^summary is empty$/, "Summary が空です。"],
    [/^values are empty$/, "Values が空です。"],
    [/^messages are empty$/, "Messages が空です。"],
    [/^inputs are empty$/, "Inputs が空です。"],
    [/^conditions are empty$/, "Conditions が空です。"],
    [/^target_ref is empty$/, "target_ref が空です。"],
    [/^source_ref is empty and transform is also empty$/, "source_ref と transform の両方が空です。どちらかを指定してください。"],
    [/^field id is empty$/, "Fields の id が空です。"],
    [/^field name is empty$/, "Fields の name が空です。"],
    [/^values\.code is empty$/, "Values の code が空です。"],
    [/^messages\.message_id is empty$/, "Messages の message_id が空です。"],
    [/^data_format is empty$/, "data_format が空です。"],
    [/^delimiter is empty for delimited data_format$/, "delimited 系の data_format では delimiter を指定してください。"],
    [/^record_length is required when data_format is fixed$/, "data_format が fixed の場合、record_length が必要です。"],
    [/^required frontmatter "([^"]+)" is missing$/, (_match, field) => `frontmatter の "${field}" がありません。`],
    [/^frontmatter "id" is missing; id is used as the stable model identifier\.$/, "frontmatter の \"id\" がありません。id はモデルの安定した識別子として使用されます。"],
    [/^expected type "([^"]+)"$/, (_match, type) => `type は "${type}" である必要があります。`],
    [/^unresolved DFD flow source ""$/, "DFD flow の source が未指定です。"],
    [/^unresolved DFD flow target ""$/, "DFD flow の target が未指定です。"],
    [/^unresolved DFD flow source "([^"]+)"$/, (_match, source) => `DFD flow の source "${source}" が解決できません。`],
    [/^unresolved DFD flow target "([^"]+)"$/, (_match, target) => `DFD flow の target "${target}" が解決できません。`],
    [/^unresolved DFD object ref "([^"]+)"$/, (_match, ref) => `DFDオブジェクトの参照 "${ref}" の参照先が見つかりません。IDまたはファイル名を確認してください。`],
    [/^DFD flow data reference "([^"]+)" could not be resolved\. Check the data\/model id or file name\.$/, (_match, ref) => `DFD flow data reference "${ref}" の参照先が見つかりません。data/model の id またはファイル名を確認してください。`],
    [/^Flow Diagram flow data reference "([^"]+)" could not be resolved\. Check the data\/model id or file name\.$/, (_match, ref) => `Flow Diagram flow data reference "${ref}" の参照先が見つかりません。data/model の id またはファイル名を確認してください。`],
    [/^DFD object ref "([^"]+)" could not be resolved\. Check the ID or file name\.$/, (_match, ref) => `DFDオブジェクトの参照 "${ref}" の参照先が見つかりません。IDまたはファイル名を確認してください。`],
    [/^frontmatter parse error: unexpected list item "([^"]+)"$/, (_match, value) => `frontmatter の解析に失敗しました。予期しないリスト項目です: "${value}"`],
    [/^frontmatter parse error: malformed line "([^"]+)"$/, (_match, value) => `frontmatter の解析に失敗しました。行の形式を確認してください: "${value}"`],
    [/^table in section "([^"]+)" is incomplete$/, (_match, section) => `"${section}" セクションのテーブルが未完成です。ヘッダー行と区切り行を確認してください。`],
    [/^table columns in section "([^"]+)" do not match expected screen field headers$/, (_match, section) => `"${section}" セクションのテーブル列が期待される screen field ヘッダーと一致しません。`],
    [/^table columns in section "([^"]+)" do not match expected legacy headers$/, (_match, section) => `"${section}" セクションのテーブル列が期待される legacy ヘッダーと一致しません。`],
    [/^table columns in section "([^"]+)" do not match supported DFD object headers$/, (_match, section) => `"${section}" セクションのテーブル列がサポートされている DFD object ヘッダーと一致しません。`],
    [/^table columns in section "([^"]+)" do not match supported class relation headers$/, (_match, section) => `"${section}" セクションのテーブル列がサポートされている class relation ヘッダーと一致しません。`],
    [/^table columns in section "([^"]+)" do not match supported app_process Domain Sources headers$/, (_match, section) => `"${section}" セクションのテーブル列がサポートされている app_process Domain Sources ヘッダーと一致しません。`],
    [/^table columns in section "([^"]+)" do not match expected headers$/, (_match, section) => `"${section}" セクションのテーブル列が期待されるヘッダーと一致しません。`],
    [/^table row in section "([^"]+)" has (\d+) columns, expected (\d+)$/, (_match, section, actual, expected) => `"${section}" セクションのテーブル行の列数が ${actual} です。期待値は ${expected} です。`],
    [/^table row in section "([^"]+)" is missing required values$/, (_match, section) => `"${section}" セクションのテーブル行に必須値がありません。`],
    [/^Format table should use: key \| value \| notes$/, "Format テーブルは key | value | notes を使ってください。"],
    [/^Records table should use: record_type \| name \| occurrence \| notes$/, "Records テーブルは record_type | name | occurrence | notes を使ってください。"],
    [/^Fields table mixes standard and file layout columns; parsed as file_layout$/, "Fields テーブルに standard 形式と file_layout 形式の列が混在しています。file_layout として解析しました。"],
    [/^duplicate field name "([^"]+)"$/, (_match, name) => `フィールド名 "${name}" が重複しています。`],
    [/^duplicate field id "([^"]+)"$/, (_match, id) => `Fields.id "${id}" が重複しています。`],
    [/^duplicate mapping row "([^"]+)"$/, (_match, value) => `mapping row "${value}" が重複しています。`],
    [/^mapping target member "([^"]+)" is mapped from multiple sources\.$/, (_match, value) => `mapping target member "${value}" が複数の source_ref から対応付けられています。`],
    [/^duplicate (.+) "([^"]+)"$/, (_match, target, value) => `${target} "${value}" が重複しています。`],
    [/^duplicate (ER relation id): (.+)$/, (_match, target, value) => `${target}: ${value} が重複しています。`],
    [/^duplicate id detected: "([^"]+)"$/, (_match, id) => `id "${id}" が重複しています。`],
    [/^duplicate model id detected: "([^"]+)" in (.+)$/, (_match, id, paths) => `model id "${id}" が重複しています: ${paths}`],
    [/^filename and id mismatch: "([^"]+)" != "([^"]+)"$/, (_match, filename, id) => `ファイル名と id が一致していません: "${filename}" != "${id}"`],
    [/^label is empty for (.+) "([^"]+)"$/, (_match, target, value) => `${target} "${value}" の label が空です。`],
    [/^type is empty for field "([^"]+)"$/, (_match, field) => `field "${field}" の type が空です。`],
    [/^required must be Y or N for (.+) "([^"]+)"$/, (_match, target, value) => `${target} "${value}" の required は Y または N にしてください。`],
    [/^active must be Y or N for (.+) "([^"]+)"$/, (_match, target, value) => `${target} "${value}" の active は Y または N にしてください。`],
    [/^active is empty for (.+) "([^"]+)"$/, (_match, target, value) => `${target} "${value}" の active が空です。`],
    [/^severity is empty for message_id "([^"]+)"$/, (_match, id) => `message_id "${id}" の severity が空です。`],
    [/^severity is invalid for message_id "([^"]+)"$/, (_match, id) => `message_id "${id}" の severity が正しくありません。`],
    [/^timing is empty for message_id "([^"]+)"$/, (_match, id) => `message_id "${id}" の timing が空です。`],
    [/^audience is empty for message_id "([^"]+)"$/, (_match, id) => `message_id "${id}" の audience が空です。`],
    [/^text is empty for message_id "([^"]+)"$/, (_match, id) => `message_id "${id}" の text が空です。`],
    [/^notes are empty for (.+) "([^"]+)"$/, (_match, target, value) => `${target} "${value}" の notes が空です。`],
    [/^sort_order is empty for code "([^"]+)"$/, (_match, code) => `code "${code}" の sort_order が空です。`],
    [/^sort_order is not numeric for code "([^"]+)"$/, (_match, code) => `code "${code}" の sort_order が数値ではありません。`],
    [/^inactive (code|message) "([^"]+)" is defined$/, (_match, target, value) => `${target} "${value}" は inactive として定義されています。`],
    [/^length is not numeric for field "([^"]+)"$/, (_match, field) => `field "${field}" の length が数値ではありません。`],
    [/^position is required for fixed format field "([^"]+)"$/, (_match, field) => `fixed 形式の field "${field}" には position が必要です。`],
    [/^record_type "([^"]+)" is not defined in Records$/, (_match, recordType) => `record_type "${recordType}" が Records に定義されていません。`],
    [/^duplicate no "([^"]+)" in record_type "([^"]+)"$/, (_match, no, recordType) => `record_type "${recordType}" 内で no "${no}" が重複しています。`],
    [/^duplicate position "([^"]+)" in record_type "([^"]+)"$/, (_match, position, recordType) => `record_type "${recordType}" 内で position "${position}" が重複しています。`],
    [/^field layout "([^"]+)" does not match any Layout\.id$/, (_match, layout) => `field layout "${layout}" に一致する Layout.id がありません。`],
    [/^layout is empty for field "([^"]+)"$/, (_match, field) => `field "${field}" の layout が空です。`],
    [/^action target is empty for screen_event$/, "screen_event の action target が空です。"],
    [/^action target "([^"]+)" does not match any Fields\.id$/, (_match, target) => `action target "${target}" に一致する Fields.id がありません。`],
    [/^duplicate action definition "([^"]+)" \+ "([^"]+)"$/, (_match, target, event) => `action 定義 "${target}" + "${event}" が重複しています。`],
    [/^duplicate action target\/event pair "([^"]+)" \+ "([^"]+)"$/, (_match, target, event) => `action target/event の組み合わせ "${target}" + "${event}" が重複しています。`],
    [/^transition preview label uses fallback because action label is empty$/, "action label が空のため、transition プレビューでは代替ラベルを使います。"],
    [/^action transition "([^"]+)" points to the current screen$/, (_match, transition) => `action transition "${transition}" が現在の screen を指しています。`],
    [/^no actions\.transition defined for this screen$/, "この screen には actions.transition が定義されていません。"],
    [/^legacy "Transitions" section detected; migrate to Actions\.transition$/, '旧形式の "Transitions" セクションがあります。Actions.transition への移行を検討してください。'],
    [/^app_process Flow\.(from|to) references missing step "([^"]+)"$/, (_match, endpoint, step) => `app_process Flow.${endpoint} が存在しない step "${step}" を参照しています。`],
    [/^app_process Flow\.(from|to) is missing a step id$/, (_match, endpoint) => `app_process Flow.${endpoint} の step id がありません。`],
    [/^Step "([^"]+)" has both domain and lane\. domain is used and lane is ignored\.$/, (_match, step) => `Step "${step}" には domain と lane の両方があります。domain が使われ、lane は無視されます。`],
    [/^app_process Step "([^"]+)" references unknown Domain "([^"]+)"\.$/, (_match, step, domain) => `app_process Step "${step}" が未定義の Domain "${domain}" を参照しています。`],
    [/^app_process Step "([^"]+)" references unknown local Domain "([^"]+)"\.$/, (_match, step, domain) => `app_process Step "${step}" が未定義のローカル Domain "${domain}" を参照しています。`],
    [/^app_process local Domain "([^"]+)" overrides external Domain (name|kind|parent)\.$/, (_match, domain, field) => `app_process ローカル Domain "${domain}" が外部 Domain の ${field} を上書きしています。`],
    [/^(.+) "([^"]+)" could not be resolved\. Check the ID or file name\.$/, (_match, target, value) => `${target} "${value}" の参照先が見つかりません。IDまたはファイル名を確認してください。`],
    [/^unresolved (.+) "([^"]+)"$/, (_match, target, value) => `${target} "${value}" の参照先が見つかりません。IDまたはファイル名を確認してください。`],
    [/^unresolved member ref: (.+) in (.+)$/, (_match, member, owner) => `member ref "${member}" が "${owner}" 内で見つかりません。`],
    [/^relation "([^"]+)" target_table "([^"]+)" could not be resolved$/, (_match, relation, target) => `relation "${relation}" の target_table "${target}" が解決できません。`],
    [/^relation "([^"]+)" does not resolve target_table$/, (_match, relation) => `relation "${relation}" の target_table が解決できません。`],
    [/^relation "([^"]+)" does not specify cardinality$/, (_match, relation) => `relation "${relation}" に cardinality が指定されていません。`],
    [/^relation "([^"]+)" local column "([^"]+)" does not exist in the current entity$/, (_match, relation, column) => `relation "${relation}" の local column "${column}" は現在の entity に存在しません。`],
    [/^relation "([^"]+)" target column "([^"]+)" does not exist in "([^"]+)"$/, (_match, relation, column, entity) => `relation "${relation}" の target column "${column}" は "${entity}" に存在しません。`],
    [/^No relations are defined in "## Relations"\.$/, '## Relations に relation が定義されていません。'],
    [/^invalid ER relation id: \(empty\)$/, "ER relation id が空です。"],
    [/^ER relation id looks incomplete: (.+)$/, (_match, id) => `ER relation id が未完成のようです: ${id}`],
    [/^class relation target "([^"]+)" exists, but is not compatible with Class Diagram rendering and was excluded\. Consider representing non-structural cross-model relationships with Mapping\.$/, (_match, target) => `class relation target "${target}" は存在しますが、Class Diagram の描画対象ではないため除外されました。クラス図の構造関係ではない対応は Mapping での表現を検討してください。`],
    [/^invalid class relation kind "([^"]+)"$/, (_match, kind) => `class relation kind "${kind}" が正しくありません。`],
    [/^reserved kind used: "([^"]+)"$/, (_match, kind) => `予約済み kind "${kind}" が使われています。`],
    [/^(.+) renderer is not supported for (.+)\. Using the format default renderer\.$/, (_match, renderer, format) => `${format} では ${renderer} renderer はサポートされていません。format の既定 renderer を使います。`],
    [/^Unknown render_mode value "([^"]+)"\. Using the format default renderer\.$/, (_match, value) => `render_mode "${value}" は不明です。format の既定 renderer を使います。`],
    [/^unknown flow_view; expected "detail" or "screen"$/, 'flow_view は "detail" または "screen" を指定してください。'],
    [/^DFD flow shape "([^"]+)" may be unusual$/, (_match, shape) => `DFD flow shape "${shape}" は通常と異なる可能性があります。`],
    [/^DFD flow "([^"]+)" is a self-loop$/, (_match, flow) => `DFD flow "${flow}" は自己ループです。`],
    [/^Domain id is required\.$/, "Domain の id が必要です。"],
    [/^duplicate Domain id "([^"]+)"$/, (_match, id) => `Domain id "${id}" が重複しています。`],
    [/^Domain parent "([^"]+)" is not defined\.$/, (_match, parent) => `Domain parent "${parent}" が定義されていません。`],
    [/^Domain "([^"]+)" cannot use itself as parent\.$/, (_match, domain) => `Domain "${domain}" は自分自身を parent にできません。`],
    [/^Domain parent cycle detected: (.+)$/, (_match, chain) => `Domain の parent が循環しています: ${chain}`],
    [/^Domain "([^"]+)" is defined in multiple Domains files\.$/, (_match, domain) => `Domain "${domain}" が複数の Domains ファイルで定義されています。`],
    [/^Domain "([^"]+)" has conflicting (name|kind|parent) values across Domains files\.$/, (_match, domain, field) => `Domain "${domain}" の ${field} が複数の Domains ファイルで一致していません。`],
    [/^Color Scheme kind is required\.$/, "Color Scheme の kind が必要です。"],
    [/^Color Scheme (fill|stroke|text) "([^"]+)" is not a supported hex color\.$/, (_match, field, value) => `Color Scheme の ${field} "${value}" はサポートされている hex color ではありません。`],
    [/^duplicate Color Scheme entry for target "([^"]+)" and kind "([^"]+)"$/, (_match, target, kind) => `target "${target}" と kind "${kind}" の Color Scheme entry が重複しています。`],
    [/^Default Color Scheme ref "([^"]+)" could not be resolved\. Built-in colors will be used\.$/, (_match, ref) => `既定の Color Scheme ref "${ref}" の参照先が見つかりません。組み込み色を使います。`],
    [/^Default Color Scheme ref "([^"]+)" resolves to type "([^"]+)", but expected type "color_scheme"\. Built-in colors will be used\.$/, (_match, ref, fileType) => `既定の Color Scheme ref "${ref}" は type "${fileType}" に解決されましたが、type "color_scheme" が必要です。組み込み色を使います。`],
    [/^Domain Source ref is required\.$/, "Domain Source の ref が必要です。"],
    [/^Domain Source ref "([^"]+)" could not be resolved\. Check the ID or file name\.$/, (_match, ref) => `Domain Source ref "${ref}" の参照先が見つかりません。IDまたはファイル名を確認してください。`],
    [/^Domain Source ref "([^"]+)" resolves to type "([^"]+)", but expected type "domains"\.$/, (_match, ref, fileType) => `Domain Source ref "${ref}" は type "${fileType}" に解決されましたが、type "domains" が必要です。`],
    [/^Domain Diagram has no valid Domain Sources\.$/, "Domain Diagram に有効な Domain Sources がありません。"],
    [/^Domain Source ref "([^"]+)" has no Domain rows\.$/, (_match, ref) => `Domain Source ref "${ref}" に Domain 行がありません。`],
    [/^Domain "([^"]+)" is defined by multiple Domain Diagram sources: "([^"]+)" and "([^"]+)"\.$/, (_match, domain, earlier, later) => `Domain "${domain}" が複数の Domain Diagram source で定義されています: "${earlier}" と "${later}"。`],
    [/^Domain "([^"]+)" has conflicting (name|kind|parent) values between Domain Diagram sources "([^"]+)" and "([^"]+)"\.$/, (_match, domain, field, earlier, later) => `Domain "${domain}" の ${field} が Domain Diagram source "${earlier}" と "${later}" で一致していません。`],
    [/^DFD-local Domain "([^"]+)" is not defined in shared Domains\.$/, (_match, domain) => `DFD内の Domain "${domain}" は共通 Domains に定義されていません。`],
    [/^DFD-local Domain "([^"]+)" has (name|kind|parent) "([^"]*)", but shared Domains define \2 "([^"]*)"\.$/, (_match, domain, field, local, shared) => `DFD内の Domain "${domain}" の ${field} は "${local}" ですが、共通 Domains では "${shared}" と定義されています。`],
    [/^DFD-local Domain "([^"]+)" overrides Domain Source (name|kind|parent) "([^"]*)" with "([^"]*)"\.$/, (_match, domain, field, source, local) => `DFD内の Domain "${domain}" は Domain Source の ${field} "${source}" を "${local}" で上書きしています。`],
    [/^DFD object "([^"]+)" references unknown local Domain "([^"]+)"\.$/, (_match, object, domain) => `DFD object "${object}" が未定義のローカル Domain "${domain}" を参照しています。`],
    [/^DFD object "([^"]+)" references unknown Domain "([^"]+)"\.$/, (_match, object, domain) => `DFD object "${object}" が未定義の Domain "${domain}" を参照しています。`],
    [/^Flow Diagram local Domain "([^"]+)" overrides Domain Source (name|kind|parent) "([^"]*)" with "([^"]*)"\.$/, (_match, domain, field, source, local) => `Flow Diagram ローカル Domain "${domain}" は Domain Source の ${field} "${source}" を "${local}" で上書きしています。`],
    [/^Flow Diagram object "([^"]+)" references unknown local Domain "([^"]+)"\.$/, (_match, object, domain) => `Flow Diagram object "${object}" が未定義のローカル Domain "${domain}" を参照しています。`],
    [/^Flow Diagram object "([^"]+)" references unknown Domain "([^"]+)"\.$/, (_match, object, domain) => `Flow Diagram object "${object}" が未定義の Domain "${domain}" を参照しています。`],
    [/^DFD object "([^"]+)" references Domain "([^"]+)", but this DFD has no local Domains\.$/, (_match, object, domain) => `DFD object "${object}" が Domain "${domain}" を参照していますが、この DFD にはローカル Domains が定義されていません。`],
    [/^DFD local object "([^"]+)" is treated as an inline object without ref\.$/, (_match, object) => `DFD local object "${object}" は ref なしの図内定義として扱われます。`],
    [/^DFD object "([^"]+)" has no kind, and it could not be inferred from ref\.$/, (_match, object) => `DFD object "${object}" の kind がなく、ref からも推定できません。`],
    [/^(.+) resolves to a dfd_object but is not listed in "Objects"$/, (_match, value) => `${value} は dfd_object に解決できますが、Objects に listed されていません。`],
    [/^(.+) is not listed in "Objects"$/, (_match, value) => `${value} は Objects に listed されていません。`],
    [/^Duplicate object refs were merged: (.+)$/, (_match, summary) => `重複した object ref を統合しました: ${summary}`],
    [/^relation "([^"]+)" is outside diagram scope$/, (_match, relation) => `relation "${relation}" は diagram の対象範囲外です。`],
    [/^diagram relations are empty; using auto-collected class relations from "Objects"$/, 'diagram relations が空のため、Objects から自動収集した class relations を使います。'],
    [/^diagram parser expected type "([^"]+)" or "([^"]+)" but received type "([^"]+)"$/, (_match, left, right, actual) => `diagram parser は type "${left}" または "${right}" を期待しましたが、実際は "${actual}" でした。`],
    [/^relations parser expected schema "([^"]+)" but received "([^"]+)"$/, (_match, expected, actual) => `relations parser は schema "${expected}" を期待しましたが、実際は "${actual}" でした。`],
    [/^object parser expected schema "([^"]+)" or type "([^"]+)" but received schema "([^"]+)" \/ type "([^"]+)"$/, (_match, schema, type, actualSchema, actualType) => `object parser は schema "${schema}" または type "${type}" を期待しましたが、実際は schema "${actualSchema}" / type "${actualType}" でした。`],
    [/^invalid kind "([^"]+)"$/, (_match, kind) => `kind "${kind}" が正しくありません。`],
    [/^invalid dfd_object kind "([^"]+)"$/, (_match, kind) => `dfd_object kind "${kind}" が正しくありません。`],
    [/^malformed relation record: missing (.+)$/, (_match, fields) => `relation record の形式が正しくありません。不足: ${fields}`],
    [/^Relations row is missing required values: (.+)$/, (_match, row) => `Relations 行に必須値がありません: ${row}`],
    [/^failed to parse numeric value "([^"]+)" for "([^"]+)"$/, (_match, value, field) => `"${field}" の数値 "${value}" を解析できません。`],
    [/^missing required field "([^"]+)"$/, (_match, field) => `必須フィールド "${field}" がありません。`],
    [/^relation block "([^"]+)" missing required field "([^"]+)"$/, (_match, block, field) => `relation block "${block}" に必須フィールド "${field}" がありません。`]
  ];

  for (const [pattern, replacement] of replacements) {
    const matched = message.match(pattern);
    if (!matched) {
      continue;
    }
    if (typeof replacement === "string") {
      return replacement;
    }
    return replacement(...matched);
  }

  return message;
}

function finalizeCurrentDiagnostics(warnings: ValidationWarning[]): ValidationWarning[] {
  return dedupeDiagnostics(suppressDiagnosticsAfterInvalidSectionHeader(warnings));
}

function suppressDiagnosticsAfterInvalidSectionHeader(warnings: ValidationWarning[]): ValidationWarning[] {
  const invalidHeaderSections = new Set<string>();
  for (const warning of warnings) {
    if (isInvalidSectionHeaderDiagnostic(warning)) {
      const key = getDiagnosticSectionKey(warning);
      if (key) {
        invalidHeaderSections.add(key);
      }
    }
  }
  if (invalidHeaderSections.size === 0) {
    return warnings;
  }
  return warnings.filter((warning) => {
    if (isInvalidSectionHeaderDiagnostic(warning)) {
      return true;
    }
    const key = getDiagnosticSectionKey(warning);
    if (!key || !invalidHeaderSections.has(key)) {
      return true;
    }
    return !isLikelyCascadingRowDiagnostic(warning);
  });
}

function isInvalidSectionHeaderDiagnostic(warning: ValidationWarning): boolean {
  return warning.code === "invalid-table-column" ||
    /table columns in section/i.test(warning.message) ||
    /table should use:/i.test(warning.message) ||
    /do not match expected .*headers/i.test(warning.message) ||
    /do not match supported .*headers/i.test(warning.message);
}

function isLikelyCascadingRowDiagnostic(warning: ValidationWarning): boolean {
  if (warning.code === "invalid-table-row") {
    return true;
  }
  if (warning.code !== "invalid-structure" && warning.code !== "invalid-object-ref" && warning.code !== "unresolved-reference") {
    return false;
  }
  return /duplicate .*(?:entry|id|key|row|target|kind)/i.test(warning.message) ||
    /table row in section/i.test(warning.message) ||
    /missing required values/i.test(warning.message) ||
    /missing "(?:id|ref|from|to|source|target)"/i.test(warning.message) ||
    /(?:id|ref|from|to|source|target|kind|name|data|message_id) is empty/i.test(warning.message) ||
    /is missing a step id/i.test(warning.message) ||
    /must have "id" or "ref"/i.test(warning.message) ||
    /unresolved .+ ""/i.test(warning.message) ||
    /has no kind, and it could not be inferred/i.test(warning.message);
}

function getDiagnosticSectionKey(warning: ValidationWarning): string | null {
  const section = getDiagnosticSectionNameForSuppression(warning);
  if (!section) {
    return null;
  }
  const path = warning.path ?? warning.filePath ?? "";
  const fileType = typeof warning.context?.fileType === "string" ? warning.context.fileType : "";
  return [path, fileType, section.trim().toLowerCase()].join("\u0000");
}

function getDiagnosticSectionNameForSuppression(warning: ValidationWarning): string | null {
  const contextSection = typeof warning.context?.section === "string" ? getSectionNameFromField(warning.context.section) : "";
  if (contextSection) {
    return contextSection;
  }
  const quoted = warning.message.match(/section "([^"]+)"/i)?.[1];
  if (quoted) {
    return quoted;
  }
  return getSectionNameFromField(warning.field);
}

function getSectionNameFromField(field: string | undefined): string | null {
  const section = field?.split(".")[0]?.split(":")[0]?.trim();
  return section || null;
}

function dedupeDiagnostics(warnings: ValidationWarning[]): ValidationWarning[] {
  return warnings.filter((warning, index) =>
    warnings.findIndex((entry) =>
      entry.code === warning.code &&
      entry.message === warning.message &&
      entry.severity === warning.severity &&
      entry.path === warning.path &&
      entry.field === warning.field
    ) === index
  );
}
