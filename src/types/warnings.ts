export const VALIDATION_WARNING_SEVERITIES = [
  "info",
  "warning"
] as const;

export const VALIDATION_WARNING_CODES = [
  "missing-schema",
  "unknown-schema",
  "missing-kind",
  "unknown-kind",
  "missing-name",
  "invalid-structure",
  "unresolved-reference",
  "frontmatter-parse-error",
  "section-missing",
  "reserved-kind-used",
  "reserved-diagram-kind-used",
  "reserved-relation-kind-used",
  "invalid-kind",
  "invalid-diagram-kind",
  "invalid-relation-kind",
  "invalid-attribute-line",
  "invalid-method-line",
  "invalid-relation-record",
  "invalid-object-ref"
] as const;

export type ValidationWarningSeverity =
  (typeof VALIDATION_WARNING_SEVERITIES)[number];

export type ValidationWarningCode =
  (typeof VALIDATION_WARNING_CODES)[number];
