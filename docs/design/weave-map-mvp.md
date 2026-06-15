# Weave Map MVP Design Note

## Purpose

Weave Map is a visualization mode for the existing Impact / Relationship View.

It is not a new source-of-truth Markdown format. Model Weave should not introduce
`type: weave_map` for this MVP. Existing Markdown model files remain the source
of truth, and Weave Map is a derived view over relationship data that Model Weave
already resolves.

## MVP Scope

The first Weave Map should focus on one model at a time.

The focus model is placed at the center of the map. The view should make it easy
to inspect:

* inbound references
* outbound references
* unresolved references
* Source Links

The MVP priority is visual discovery, not correctness judgment. It should help
users notice broken links, isolated models, unresolved references, and missing
connections more easily than a text-only relationship summary.

## Rendering Direction

The initial rendering target is Mermaid `flowchart LR`.

Mermaid is the MVP renderer because it is already part of Model Weave's rendering
surface and is suitable for lightweight graph visualization. A Custom Renderer
may be considered later if interaction, layout control, filtering, or richer
node styling becomes important.

## Internal Model Direction

Introduce a renderer-independent intermediate model such as `WeaveMapModel`.

The intermediate model should describe graph meaning without committing to
Mermaid-specific syntax. It should be able to represent:

* the focus model
* related model nodes
* inbound and outbound edges
* unresolved reference nodes or markers
* Source Link nodes or groups
* relationship categories needed by the renderer

Mermaid output should be generated from this intermediate model rather than
directly from Impact / Relationship View data structures.

## Out of Scope for the First Version

The MVP should not attempt to perform strong semantic analysis.

The following are out of scope for the first version:

* state transition correctness checks
* sequence correctness checks
* strong consistency judgments
* deciding whether a model relationship is semantically right or wrong
* adding a new Markdown format
* adding a new parser
* adding a new source-of-truth file type
* building a Custom Renderer

## Design Principle

Weave Map should start as a readable visual layer over existing relationship
information.

The first goal is not to say "this design is correct" or "this design is wrong."
The first goal is to make disconnections, isolation, unresolved references, and
unexpected relationship shapes easier to see.

## Phase 1 Confirmation Notes

The following internal pieces have been added in Phase 1:

* `WeaveMapModel` and related renderer-independent types
* `buildWeaveMapModel(summary)`
* `getWeaveMapLayerForModelType(modelType)`
* `buildWeaveMapMermaidSource(model)`
* minimal tests for the internal model conversion and Mermaid source generation

The following items are still intentionally not implemented in Phase 1:

* Preview UI integration
* Map display in the Relationship View
* click interactions
* filters
* Custom Renderer support
* state transition checks
* sequence checks
* strong consistency judgments

Phase 1 is verified with these commands:

```bash
/usr/bin/node --test test/*.test.mjs
/usr/bin/node ./node_modules/typescript/bin/tsc --noEmit --skipLibCheck
/usr/bin/node esbuild.config.mjs production
```

In the current WSL environment, `npm run build` can pick up the Windows-side
`npm`, which is not reliable for this workspace. The direct Linux Node commands
above are used as the verification path instead.

## Phase 2 Integration Plan

Phase 2 should add a Map display mode to the existing Impact / Relationship
View.

Weave Map should remain a derived view:

```text
ImpactSummary -> WeaveMapModel -> Mermaid source
```

It should not introduce a new Markdown format, parser, or source-of-truth file
type.

### Current Integration Findings

`buildImpactSummary(model, index)` is called from `src/main.ts` inside
`buildImpactPreviewProps`. That helper is guarded by `enableRelationshipView`,
requires the vault index, skips plain Markdown and `relations` files, and returns
the `impactSummary`, copy handler, and open-model handler used by the preview.

`formatImpactSummaryAsMarkdown(summary)` is only used by the copy action in
`copyImpactSummary`. It is the right place for clipboard Markdown formatting,
but it should not become the primary Weave Map rendering integration point.

`ImpactSummary` is passed into `ModelingPreviewView` through preview state. The
same optional `impactSummary`, `onCopyImpactSummary`, and `onOpenImpactModel`
props appear on object, DFD object, diagram, and summary preview modes.

The rendered Impact / Relationship panel is centralized in
`renderImpactSummarySection` in `src/views/modeling-preview-view.ts`. That method
renders the count card, outbound/inbound usage sections, unresolved references,
and related Source Links.

Existing Mermaid preview rendering can reuse the shared Mermaid shell path in
`src/renderers/mermaid-shared.ts`, especially `createMermaidShell` and
`renderMermaidSourceIntoShell`. Existing preview code already passes localized
Mermaid source labels through `getMermaidSourceLabels`.

### Recommended Integration Point

Candidate A is the safest first integration point:

* extend `buildImpactPreviewProps` to also prepare Weave Map data for preview
* keep `ImpactSummary` as the source input
* derive `WeaveMapModel` and Mermaid source before passing props into
  `ModelingPreviewView`
* keep display changes isolated to `renderImpactSummarySection`

This keeps the relationship data boundary in `main.ts`, avoids recomputing the
same derived map in several preview modes, and preserves `ModelingPreviewView`
as the renderer of already-prepared preview state.

Candidate B is workable but slightly less tidy. Building the map inside
`ModelingPreviewView` would avoid changing preview props at first, but it would
put relationship derivation logic into a view class that is already responsible
for many unrelated preview details.

Candidate C is not recommended for the main display path. The Markdown formatter
is currently clipboard-oriented, and generating Mermaid source there would couple
the visual map to copied relationship text rather than to preview state. It may
still be useful later if copied summaries should optionally include a Mermaid
block.

### Phase 2 Tasks

* Task 2-1: investigate integration points and update this design note
* Task 2-2: add Weave Map Mermaid source to Impact preview props, but do not
  display it yet
* Task 2-3: add a Map display block to the Impact / Relationship View
* Task 2-4: add a setting or lightweight toggle for List / Map display
* Task 2-5: verify the display with dogfood models

### Still Out of Scope

The following remain out of scope for Phase 2 unless explicitly requested:

* Custom Renderer support
* click interactions
* node filters
* state transition checks
* sequence checks
* strong consistency judgments
* Source Links Explorer behavior
* a new Markdown format
* a new parser

## Phase 2 Implementation Notes

The following Phase 2 pieces have been implemented:

* the `ImpactSummary -> WeaveMapModel -> Mermaid source` flow is now prepared
  as preview state
* the Impact / Relationship View includes a `Weave Map` details block
* Weave Map coexists with the existing Impact Summary list view
* Weave Map uses `createMermaidShell` and `renderMermaidSourceIntoShell` for
  pan and zoom rendering
* the Weave Map Mermaid source details are rendered below the graph container
* normal wheel scrolling is left to the page, while Ctrl/Meta + wheel zooms the
  graph

### Findings

There does not appear to be an Obsidian View limitation that prevents multiple
graphics from being shown in one view.

The issue was layout-specific to Model Weave's graph shell. Existing main
diagrams are rendered inside fixed-height panes created by `createViewerSplitShell`,
so their height calculations are stable. Weave Map is rendered inside a details
block in the scrollable Impact / Relationship lower pane. In that placement,
parents with auto height can leave `.model-weave-graph-canvas` without a usable
height, which can make the graph appear blank even when Mermaid source is valid.

The Weave Map container therefore needs explicit `height`, `minHeight`, and flex
layout. The Mermaid shell root and canvas also need to be constrained inside
that container so they do not overlap sibling details sections.

### Layout Notes

Weave Map graph layout should follow these rules:

* the graph container reserves height in normal document flow
* only the graph shell is placed inside the graph container
* Mermaid source details are placed outside and below the graph container
* inbound, outbound, unresolved, and Source Links details remain sibling
  sections below the Weave Map block
* any graph shell embedded inside a details block must have an explicit parent
  height

### Not Implemented Yet

The following are still intentionally out of scope:

* List / Map display switching
* Weave Map node clicks
* Weave Map filtering
* PNG export button
* opening exported files with the default application
* Custom Renderer support
* shared design cleanup for multiple graph shell instances

### Future Graph Shell Direction

If Weave Map or other auxiliary graphs become common, each graph shell instance
should be managed independently. A future shared abstraction may need to track:

* `rootEl`
* `canvasEl`
* `svgEl`
* `viewportState`
* `resizeObserver`
* `fit()`
* `destroy()`

For this phase, `src/renderers/mermaid-shared.ts` was left unchanged. The fix
was kept local to Weave Map placement and height management.
