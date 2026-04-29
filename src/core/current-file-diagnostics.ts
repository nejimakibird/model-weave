import {
  parseQualifiedRef,
  parseReferenceValue,
  resolveQualifiedMemberReference,
  resolveReferenceIdentity,
  resolveErEntityReference,
  resolveObjectModelReference
} from "./reference-resolver";
import type { ModelingVaultIndex } from "./vault-index";
import type { ResolvedObjectContext } from "./object-context-resolver";
import type {
  AppProcessModel,
  CodeSetModel,
  DataObjectModel,
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

const CLASS_RELATION_KINDS = new Set([
  "association",
  "dependency",
  "inheritance",
  "implementation",
  "aggregation",
  "composition"
]);

export function buildCurrentObjectDiagnostics(
  model: ObjectModel | ErEntity | DfdObjectModel | DataObjectModel | AppProcessModel | ScreenModel | CodeSetModel | MessageModel | RuleModel | MappingModel,
  index: ModelingVaultIndex,
  context: ResolvedObjectContext | null,
  warnings: ValidationWarning[]
): ValidationWarning[] {
  const diagnostics = warnings.map((warning: ValidationWarning) =>
    normalizeDiagnosticSeverity(warning)
  );

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
  } else {
    diagnostics.push(...buildErEntityDiagnostics(model, index));
  }

  if (context) {
    diagnostics.push(...context.warnings.map((warning) => normalizeDiagnosticSeverity(warning)));
  }

  return dedupeDiagnostics(diagnostics);
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
  const targetRefs = new Set<string>();

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

    if (!targetRef) {
      diagnostics.push(createSectionWarning(model.path, "Mappings", "target_ref is empty"));
    } else {
      if (targetRefs.has(targetRef)) {
        diagnostics.push(createSectionWarning(model.path, "Mappings", `duplicate target_ref "${targetRef}"`));
      }
      targetRefs.add(targetRef);
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
    if (row.rule?.trim()) {
      diagnostics.push(
        ...buildReferenceWarnings(model.path, "Mappings", row.rule, index, "unresolved mapping rule reference")
      );
    }
    if (required && required !== "Y" && required !== "N") {
      diagnostics.push(createSectionWarning(model.path, "Mappings", `required must be Y or N for target_ref "${targetRef ?? "(blank)"}"`));
    }
  }

  return diagnostics;
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
      ...buildReferenceWarnings(model.path, "Transitions", transition.to, index, "unresolved transition target reference", "screen")
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

  const targetEventPairs = new Set<string>();
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

    const pair = `${target ?? ""}|${action.event?.trim() ?? ""}`;
    if (target && action.event?.trim()) {
      if (targetEventPairs.has(pair)) {
        diagnostics.push({
          code: "invalid-structure",
          message: `duplicate action target/event pair "${target}" + "${action.event}"`,
          severity: "warning",
          path: model.path,
          field: "Actions",
          context: { section: "Actions" }
        });
      }
      targetEventPairs.add(pair);
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

  if (model.legacyTransitions.length > 0 || model.sections.Transitions) {
    diagnostics.push(
      createSectionWarning(
        model.path,
        "Transitions",
        'legacy "Transitions" section detected; migrate to Actions.transition'
      )
    );
  }

  return diagnostics;
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
  expectedFileType?: "screen" | "app-process"
): ValidationWarning[] {
  const value = ref?.trim();
  if (!value) {
    return [];
  }

  const qualified = parseQualifiedRef(value);
  if (qualified?.hasMemberRef) {
    const resolved = resolveQualifiedMemberReference(value, index);
    if (!resolved.baseIdentity.resolvedModel) {
      return [createSectionWarning(path, section, `${messagePrefix} "${value}"`)];
    }
    if (expectedFileType && resolved.baseIdentity.resolvedModel.fileType !== expectedFileType) {
      return [createSectionWarning(path, section, `${messagePrefix} "${value}"`)];
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
    return [createSectionWarning(path, section, `${messagePrefix} "${value}"`)];
  }
  if (expectedFileType && resolved.resolvedModel.fileType !== expectedFileType) {
    return [createSectionWarning(path, section, `${messagePrefix} "${value}"`)];
  }

  return [];
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
  return dedupeDiagnostics(warnings.map((warning) => normalizeDiagnosticSeverity(warning)));
}

function buildClassDiagnostics(
  model: ObjectModel,
  index: ModelingVaultIndex
): ValidationWarning[] {
  const diagnostics: ValidationWarning[] = [];

  for (const relation of model.relations) {
    if (!resolveObjectModelReference(relation.targetClass, index)) {
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
    warning.code === "invalid-table-column" ||
    warning.code === "invalid-table-row" ||
    warning.code === "missing-name" ||
    warning.code === "missing-kind"
  ) {
    return { ...warning, severity: "error" };
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
