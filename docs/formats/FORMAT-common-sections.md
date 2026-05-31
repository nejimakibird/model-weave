# Common Sections

Japanese Version: [日本語版](../ja/formats/FORMAT-common-sections.md)

This document describes optional common sections that may be used across Model Weave model files.

Common sections are not tied to a single model format. They are intended to add cross-cutting information such as implementation references, notes, or external references without changing the core structure of each format.

## Source Links

`## Source Links` connects a model element to related external files.

Typical targets include:

* source code
* test files
* configuration files
* SQL / DDL / migration files
* sample data
* external specification files
* generated or reverse-engineered reference files

This section is especially useful when model files are generated or assisted by AI from an existing codebase. It allows the generated model to preserve a navigable map back to the implementation files.

## Source Links table syntax

`## Source Links` is written as a Markdown table.

Recommended columns:

| column  | required | meaning                                            |
| ------- | -------: | -------------------------------------------------- |
| `path`  |      yes | Source link path written in the model file.        |
| `notes` |       no | Human-readable note about why the file is related. |

Recommended syntax:

```markdown
## Source Links

| path | notes |
|---|---|
| src/main.ts | Plugin entry point |
| src/views/modeling-preview-view.ts | Preview view implementation |
| src/renderers/object-context-renderer.ts | Object detail and context rendering |
```

The `path` value may be relative or absolute.

## Minimal example

```markdown
---
type: class
id: CLS-MODEL-WEAVE-PLUGIN
name: Model Weave Plugin
---

# Model Weave Plugin

## Summary

- Load Model Weave settings
- Register preview commands
- Render model previews

## Source Links

| path | notes |
|---|---|
| src/main.ts | Plugin entry point |
```

## Multiple related files example

```markdown
## Source Links

| path | notes |
|---|---|
| src/views/modeling-preview-view.ts | Preview view and toolbar |
| src/renderers/graph-view-shared.ts | Shared fit, zoom, and pan behavior |
| src/renderers/object-context-renderer.ts | Connection details and object context UI |
| src/styles.css | Preview and Source Links styling |
```

## Windows path example

```markdown
## Source Links

| path | notes |
|---|---|
| C:\Users\example\projects\model-weave\src\main.ts | Local checkout path |
```

## Windows UNC / WSL path example

```markdown
## Source Links

| path | notes |
|---|---|
| \\wsl.localhost\Ubuntu\home\user\projects\model-weave\src\main.ts | WSL checkout path from Windows |
| //wsl.localhost/Ubuntu/home/user/projects/model-weave/src/views/modeling-preview-view.ts | Slash-style WSL UNC path |
```

Slash-style UNC paths may be normalized to Windows UNC form.

```text
//wsl.localhost/Ubuntu/home/user/projects/model-weave/src/main.ts
```

may be resolved as:

```text
\\wsl.localhost\Ubuntu\home\user\projects\model-weave\src\main.ts
```

## macOS / Linux path example

```markdown
## Source Links

| path | notes |
|---|---|
| /home/user/projects/model-weave/src/main.ts | Linux checkout path |
| /Users/user/projects/model-weave/src/main.ts | macOS checkout path |
```

On macOS and Linux, POSIX-style paths keep `/` separators.

## Path resolution

Source Links may be written as relative paths or absolute paths.

### Relative path

```markdown
## Source Links

| path | notes |
|---|---|
| src/main.ts | Plugin entry point |
```

When `Local source root` is configured, Model Weave resolves the path by combining:

```text
Local source root + path
```

Example:

```text
Local source root:
C:\Users\example\projects\model-weave

path:
src/main.ts

Resolved Path:
C:\Users\example\projects\model-weave\src\main.ts
```

### Absolute path

```markdown
## Source Links

| path | notes |
|---|---|
| C:\Users\example\projects\model-weave\src\main.ts | Local checkout path |
```

When the path is already absolute, `Local source root` is not required. The path itself is treated as the `Resolved Path`.

## Preview columns

When Source Links are shown in the preview, the following fields may be displayed.

| column          | meaning                                   |
| --------------- | ----------------------------------------- |
| `Path`          | The path written in the model file.       |
| `Status`        | Resolution or availability status.        |
| `Resolved Path` | The path used by `Copy Path` and `Open`.  |
| `Notes`         | Notes written with the source link.       |
| `Actions`       | Operations such as `Copy Path` or `Open`. |

## Status

`Status` indicates whether the `Resolved Path` can be checked or found.

Typical statuses include:

| status                       | meaning                                                           |
| ---------------------------- | ----------------------------------------------------------------- |
| `available`                  | The `Resolved Path` exists.                                       |
| `missing`                    | The `Resolved Path` was created, but the file was not found.      |
| `unresolved`                 | The path could not be resolved or checked.                        |
| `source root not configured` | A relative path is used without a configured `Local source root`. |

Missing or unresolved Source Links are not model diagnostics errors. They indicate that the local environment may not contain the referenced source files.

This is expected in cases such as public documentation repositories where the model files are published separately from the source repository.

## Actions

### Copy Path

`Copy Path` copies the `Resolved Path` to the clipboard.

This is the most reliable operation. Users can paste the path into:

* Explorer / Finder / file manager
* VS Code / Cursor / editor
* terminal
* issue trackers
* AI tools

### Open

`Open` attempts to open the `Resolved Path` using the operating system or the default associated application.

`Open` is best-effort. It may fail depending on:

* OS file associations
* file type associations
* permissions
* UNC / WSL support
* editor or application availability
* network path availability

`Open` failure is not a model diagnostics error. The resolved path remains visible and copyable.

## Local source root

`Local source root` is a Model Weave setting used to resolve relative Source Links.

It is intended for cases where the Obsidian vault and the source repository are managed separately.

Example structure:

```text
Obsidian vault:
C:\Users\example\Documents\ModelDocs

Source repository:
C:\Users\example\projects\model-weave
```

Model file:

```markdown
## Source Links

| path | notes |
|---|---|
| src/main.ts | Plugin entry point |
```

Setting:

```text
Local source root = C:\Users\example\projects\model-weave
```

Resolved Path:

```text
C:\Users\example\projects\model-weave\src\main.ts
```

## Design notes

Source Links are references, not embedded source files.

Model Weave does not require source files to be stored inside the vault. This keeps documentation and implementation repositories separate while still allowing model elements to point back to relevant implementation files.

Source Links are also useful for AI-assisted reverse engineering. A generated model can preserve references to the source files used to infer each model element, making later human review easier.

## AI generation notes

When generating Model Weave files with AI, include `## Source Links` for the files used as evidence or source material.

This is especially useful when generating models from:

* source code
* SQL / DDL / migration files
* UI code
* API specifications
* interface specifications
* existing design documents
* architecture notes

Source Links make generated models easier to review later.

Guidelines:

* Use paths that other project members can reproduce.
* Prefer relative paths when possible.
* Avoid personal-machine-specific absolute paths in public repositories.
* Use `Local source root` when the Obsidian vault and source repository are separate.
* Treat Source Links as design references, not as a place to copy implementation content.
