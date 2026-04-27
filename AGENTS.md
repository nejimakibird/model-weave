# AGENTS.md

## Project

Model Weave is an Obsidian plugin for text-first modeling.

Markdown model files are the source of truth. Diagrams, previews, diagnostics, and exports are derived views.

The project goal is to keep design assets readable by humans, manageable in Git, and usable as structured context for AI-assisted implementation and testing.

## Working rules

- Keep changes small and scoped.
- Prefer focused implementation tickets over broad refactors.
- Do not rewrite unrelated code.
- Do not change model format specifications unless explicitly requested.
- Preserve existing behavior unless the task says otherwise.
- Prefer compatibility with existing sample files and test data.
- Avoid adding new dependencies unless clearly necessary.
- Do not implement future roadmap items unless they are explicitly part of the task.

## Specification references

Project overview:

- `README_JP.md`

Format specifications should be stored under:

- `docs/formats/`

When a task touches a specific model format, read only the relevant format spec files.

Examples:

- Class work: read `docs/formats/class.md` and/or `docs/formats/class-diagram.md`
- ER work: read `docs/formats/er-entity.md` and/or `docs/formats/er-diagram.md`
- DFD work: read `docs/formats/dfd-object.md` and/or `docs/formats/dfd-diagram.md`
- Screen work: read `docs/formats/screen.md`
- App process work: read `docs/formats/app-process.md`
- Rule, codeset, or mapping work: read only the relevant spec files

Do not read all format specs unless explicitly requested.

Do not modify format specifications unless the task explicitly asks for a spec change.

## Current product direction

The current stable direction is:

- Text files are the canonical design assets.
- Diagrams are generated views, not the source of truth.
- ER and Class are core structural formats.
- DFD and data_object support data flow modeling.
- Screen, app_process, rule, codeset, mapping, and message are expansion areas.
- Business Flow is a later phase unless explicitly requested.

## Implementation style

- Keep parsing logic tolerant where existing files may vary.
- Prefer clear diagnostics over hard failures when the input is understandable.
- Keep Notes / Warnings / Errors behavior consistent across viewers.
- Keep UI changes visually consistent with existing ER and Class viewers.
- Keep generated diagram/export behavior deterministic where practical.
- Avoid large architectural rewrites in small feature tasks.

## Validation and diagnostics

Use this severity guidance unless the task says otherwise:

- Error: the model cannot be resolved or rendered correctly.
- Warning: the model is likely inconsistent, deprecated, ambiguous, or risky.
- Note: useful information, fallback behavior, or non-blocking compatibility notice.

Do not introduce strict validation that would break existing valid samples unless explicitly requested.

## Verification

Run relevant checks before finishing when practical:

- `npm test`
- `npm run build`

If a command is unavailable or fails for an environment reason, report it clearly.

For UI or viewer changes, also report the manual scenario that should be checked in Obsidian.

## Expected final report

When finishing a task, report:

- Changed files
- What changed
- Why it changed
- Verification commands and results
- Any remaining risks or follow-up items

Keep the report concise.

## Out of scope by default

Unless explicitly requested, do not:

- Redesign the whole plugin architecture
- Rename the project
- Change existing public format semantics
- Add mobile-specific support
- Add server-side or external network behavior
- Add telemetry or analytics
- Replace the text-first design principle with GUI-first editing