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
