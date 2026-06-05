# Obsidian lint baseline 0.1.12

This baseline introduces local lint visibility for Obsidian community plugin compatibility review concerns. The goal for 0.1.12 is to surface warning groups before release, not to fix every existing warning in this task.

## Warning groups

- Popout compatibility: replace direct `document` access with Obsidian active document/window APIs where appropriate, prefer window-scoped timers for `requestAnimationFrame`, and avoid `instanceof HTMLElement` checks that can fail across popout windows.
- Unsafe TypeScript values: review `any` usage and type-aware unsafe assignment, calls, member access, arguments, and returns reported by `@typescript-eslint`.
- `require()` style import: replace CommonJS-style imports with ES module imports where practical.
- Filesystem, vault enumeration, and clipboard behavior: review warnings around broad vault iteration, filesystem-style access patterns, and clipboard or DOM interactions against Obsidian plugin review expectations.
- CSS compatibility: `scripts/check-css-compat.mjs` guards active CSS against `display: contents`; the current codebase passes this check.

## Follow-up

Treat these warning groups as cleanup candidates for focused implementation tickets. Do not change model syntax, renderer behavior, or release version files as part of the lint baseline itself.
