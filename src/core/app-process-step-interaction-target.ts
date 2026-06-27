import type {
  AppProcessInput,
  AppProcessModel,
  AppProcessOutput,
  AppProcessStep,
  ParsedFileModel
} from '../types/models';
import type { ModelingVaultIndex } from './vault-index';
import {
  parseReferenceValue,
  resolveReferenceIdentity,
  type ResolvedReferenceIdentity
} from './reference-resolver';

export type AppProcessStepInteractionSource =
  | 'screen'
  | 'invoke'
  | 'rule'
  | 'input'
  | 'output'
  | 'fallback';

export interface AppProcessStepInteractionTarget {
  stepId: string;
  source: AppProcessStepInteractionSource;
  rawValue: string;
  targetRef?: string;
  targetPath?: string;
  targetId?: string;
  targetModelType?: ParsedFileModel['fileType'];
}

export interface AppProcessStepInteractionContext {
  index?: ModelingVaultIndex | null;
  sourcePath: string;
}

type AppProcessStepTargetModel = Pick<AppProcessModel, 'inputs' | 'outputs'>;
type CandidateSource = Exclude<AppProcessStepInteractionSource, 'fallback'>;

export function resolveAppProcessStepInteractionTarget(
  model: AppProcessStepTargetModel,
  step: AppProcessStep,
  context: AppProcessStepInteractionContext
): AppProcessStepInteractionTarget {
  const index = context.index ?? null;
  if (index) {
    for (const source of getStepReferencePriority(step.kind)) {
      const resolved = resolveStepCandidate(model, step, source, index);
      if (resolved) {
        return resolved;
      }
    }
  }

  return {
    stepId: step.id,
    source: 'fallback',
    rawValue: context.sourcePath,
    targetRef: context.sourcePath,
    targetPath: context.sourcePath,
    targetModelType: 'app-process'
  };
}

function resolveStepCandidate(
  model: AppProcessStepTargetModel,
  step: AppProcessStep,
  source: CandidateSource,
  index: ModelingVaultIndex
): AppProcessStepInteractionTarget | null {
  switch (source) {
    case 'screen':
      return resolveDirectCandidate(step, source, step.screen, index);
    case 'invoke':
      return resolveDirectCandidate(step, source, step.invoke, index);
    case 'rule':
      return resolveDirectCandidate(step, source, step.rule, index);
    case 'input':
      return resolveInputCandidate(model.inputs, step, index);
    case 'output':
      return resolveOutputCandidate(model.outputs, step, index);
  }
}

function resolveInputCandidate(
  inputs: AppProcessInput[],
  step: AppProcessStep,
  index: ModelingVaultIndex
): AppProcessStepInteractionTarget | null {
  const raw = step.input?.trim();
  if (!raw) {
    return null;
  }

  const direct = resolveCandidateReference(raw, index);
  if (direct) {
    return toInteractionTarget(step, 'input', raw, direct);
  }
  if (isDirectReferenceSyntax(raw)) {
    return null;
  }

  const input = inputs.find((entry) => entry.id.trim() === raw);
  if (!input) {
    return null;
  }

  const data = resolveOptionalReference(input.data, index);
  if (data) {
    return toInteractionTarget(step, 'input', data.raw, data.resolved);
  }

  const source = resolveOptionalReference(input.source, index);
  return source ? toInteractionTarget(step, 'input', source.raw, source.resolved) : null;
}

function resolveOutputCandidate(
  outputs: AppProcessOutput[],
  step: AppProcessStep,
  index: ModelingVaultIndex
): AppProcessStepInteractionTarget | null {
  const raw = step.output?.trim();
  if (!raw) {
    return null;
  }

  const direct = resolveCandidateReference(raw, index);
  if (direct) {
    return toInteractionTarget(step, 'output', raw, direct);
  }
  if (isDirectReferenceSyntax(raw)) {
    return null;
  }

  const output = outputs.find((entry) => entry.id.trim() === raw);
  if (!output) {
    return null;
  }

  const data = resolveOptionalReference(output.data, index);
  if (data) {
    return toInteractionTarget(step, 'output', data.raw, data.resolved);
  }

  const target = resolveOptionalReference(output.target, index);
  return target ? toInteractionTarget(step, 'output', target.raw, target.resolved) : null;
}

function resolveDirectCandidate(
  step: AppProcessStep,
  source: CandidateSource,
  rawValue: string | undefined,
  index: ModelingVaultIndex
): AppProcessStepInteractionTarget | null {
  const raw = rawValue?.trim();
  if (!raw) {
    return null;
  }

  const resolved = resolveCandidateReference(raw, index);
  return resolved ? toInteractionTarget(step, source, raw, resolved) : null;
}

function resolveOptionalReference(
  rawValue: string | undefined,
  index: ModelingVaultIndex
): { raw: string; resolved: ResolvedReferenceIdentity } | null {
  const raw = rawValue?.trim();
  if (!raw) {
    return null;
  }

  const resolved = resolveCandidateReference(raw, index);
  return resolved ? { raw, resolved } : null;
}

function resolveCandidateReference(
  raw: string,
  index: ModelingVaultIndex
): ResolvedReferenceIdentity | null {
  const resolved = resolveReferenceIdentity(raw, index);
  return resolved.resolvedFile ? resolved : null;
}

function toInteractionTarget(
  step: AppProcessStep,
  source: CandidateSource,
  rawValue: string,
  resolved: ResolvedReferenceIdentity
): AppProcessStepInteractionTarget {
  return {
    stepId: step.id,
    source,
    rawValue,
    targetRef: resolved.target ?? rawValue,
    targetPath: resolved.resolvedFile,
    targetId: resolved.resolvedId,
    targetModelType: resolved.resolvedModelType
  };
}

function isDirectReferenceSyntax(raw: string): boolean {
  const parsed = parseReferenceValue(raw);
  return Boolean(parsed && parsed.kind !== 'raw');
}

function getStepReferencePriority(kind: string | undefined): CandidateSource[] {
  switch (normalizeStepKindForPriority(kind)) {
    case 'screen':
      return ['screen', 'output', 'input', 'rule', 'invoke'];
    case 'subflow':
    case 'flow':
      return ['invoke', 'screen', 'rule', 'input', 'output'];
    case 'decision':
      return ['rule', 'input', 'output', 'screen', 'invoke'];
    case 'input':
    case 'event':
      return ['input', 'screen', 'rule', 'invoke', 'output'];
    case 'data':
      return ['input', 'output', 'screen', 'rule', 'invoke'];
    case 'store':
      return ['output', 'input', 'screen', 'rule', 'invoke'];
    case 'api':
    case 'batch':
    case 'message':
    case 'external':
      return ['invoke', 'screen', 'input', 'output', 'rule'];
    case 'error':
    case 'end':
      return ['output', 'screen', 'rule', 'input', 'invoke'];
    case 'wait':
    case 'connector':
      return ['invoke', 'screen', 'rule', 'input', 'output'];
    case 'process':
    default:
      return ['invoke', 'screen', 'rule', 'input', 'output'];
  }
}

function normalizeStepKindForPriority(kind: string | undefined): string {
  const normalized = kind?.trim().toLowerCase();
  switch (normalized) {
    case 'screen':
    case 'subflow':
    case 'flow':
    case 'decision':
    case 'input':
    case 'event':
    case 'data':
    case 'store':
    case 'api':
    case 'batch':
    case 'message':
    case 'external':
    case 'error':
    case 'end':
    case 'wait':
    case 'connector':
    case 'process':
      return normalized;
    default:
      return 'process';
  }
}
