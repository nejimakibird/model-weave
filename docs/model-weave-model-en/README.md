# Model Weave Model

This folder is a public sample vault / showcase model for Model Weave. It uses Model Weave Markdown model files to demonstrate representative file types, previews, diagnostics, Color Scheme behavior, and PNG export.

## Summary

**Important:**

*   The files in this folder are not the formal Model Weave specification.
*   The formal Model Weave specification is defined by the files in `docs/formats/` and the root `README.md` of the repository.
*   This sample vault acts as a set of examples for Model Weave previews and behavior checks.
*   Refer to the formal specification when checking exact implementation or format rules.

## Feature Showcase

This sample vault demonstrates the core features of Model Weave, including Domain-aware modeling for `app_process` and DFD diagrams, hierarchical Domain rendering, and the Color Scheme system. These examples reflect the refinements and features established in version 0.1.13.

For a detailed list of changes in this version, see the v0.1.13 Release Notes.

*   Color Scheme: `color_scheme/COLOR-SCHEME-DEFAULT.md`
    *   Set `defaultColorSchemeRef` to `[[COLOR-SCHEME-DEFAULT]]` to check colors in Domains, Domain Diagram, DFD, and Business Flow previews.
    *   Includes empty-target global rows plus target-specific rows for `domain`, `dfd`, and `app_process`.
*   Domains: `domains/DOMAINS-COMPANY.md`, `domains/DOMAINS-MODEL-WEAVE.md`
    *   Useful for checking standalone `type: domains` Mindmap, Area, and Tree views.
*   Domain Diagram: `domain_diagram/DOMAIN-DIAGRAM-MODEL-WEAVE.md`
    *   Useful for checking `type: domain_diagram` Mindmap, Area, and Tree views with multiple merged Domains files.
    *   `Domain Sources.ref` values match sample file names and frontmatter `id` casing, such as `[[DOMAINS-COMPANY]]`.
*   DFD: `dfd_diagram/DFD-MODEL-WEAVE-OVERVIEW.md`
    *   Includes DFD local Domains, Domain Sources, and `Objects.domain` examples for checking merged Domain groups and DFD object domain colors.
*   app_process: `app_process/PROC-MODEL-WEAVE-PREVIEW-FLOW.md`
    *   Useful for checking `Steps.domain` placement, Domain hierarchy, Domain group colors, and Business Flow colors from `Steps.kind`.

### app_process / Business Flow

*   `app_process/PROC-MODEL-WEAVE-PREVIEW-FLOW.md`
    *   Shows the Model Weave preview process as a Business Flow.
    *   Uses `Steps.domain` for Domain placement and `Steps.kind` so `target=app_process` Color Scheme rows are applied to step nodes.

Each diagram preview can be used to check PNG export for representative diagrams and the Applied Color Scheme section.
