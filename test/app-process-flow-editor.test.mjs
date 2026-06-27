import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const outputFile = "dist/test-app-process-flow-editor.mjs";

await build({
  stdin: {
    contents: "export { addAppProcessFlow } from \"./src/core/app-process-flow-editor\";",
    resolveDir: ".",
    sourcefile: "test-app-process-flow-editor-entry.ts",
    loader: "ts"
  },
  bundle: true,
  format: "esm",
  platform: "browser",
  outfile: outputFile,
  logLevel: "silent"
});

const { addAppProcessFlow } = await import("../" + outputFile + "?t=" + Date.now());

function baseWithFlows() {
  return `---
type: app_process
id: PROC-SAMPLE
name: Sample
---
# Sample

## Steps

| id | domain | label | kind | input | output | rule | invoke | screen | notes |
|---|---|---|---|---|---|---|---|---|---|
| start | | Start | start | | | | | | |
| validate | | Validate | decision | | | | | | |
| end | | End | end | | | | | | |

## Flows

| from | to | condition | label | notes |
|---|---|---|---|---|
| start | validate | ready | Go | Existing note |
`;
}

test("addAppProcessFlow appends to existing Flows table", () => {
  const result = addAppProcessFlow(baseWithFlows(), { from: "validate", to: "end" });

  assert.equal(result.status, "added");
  assert.equal(result.changed, true);
  assert.match(result.updatedMarkdown, /\| validate \| end \|  \|  \|  \|\n$/);
});

test("addAppProcessFlow creates Flows after Steps when missing", () => {
  const markdown = `# Sample

## Summary

Text.

## Steps

| id | label |
|---|---|
| start | Start |
| end | End |

## Notes

Later section.
`;
  const result = addAppProcessFlow(markdown, { from: "start", to: "end" });

  assert.equal(result.status, "added");
  assert.match(result.updatedMarkdown, /## Steps[\s\S]*\n## Flows\n\n\| from \| to \| condition \| label \| notes \|\n\|---\|---\|---\|---\|---\|\n\| start \| end \|  \|  \|  \|\n\n## Notes/);
});

test("addAppProcessFlow does not duplicate existing from-to rows", () => {
  const result = addAppProcessFlow(baseWithFlows(), { from: "start", to: "validate" });

  assert.equal(result.status, "duplicate");
  assert.equal(result.changed, false);
  assert.equal(result.updatedMarkdown, baseWithFlows());
});

test("addAppProcessFlow preserves existing condition label and notes rows", () => {
  const result = addAppProcessFlow(baseWithFlows(), { from: "validate", to: "end" });

  assert.match(result.updatedMarkdown, /\| start \| validate \| ready \| Go \| Existing note \|/);
  assert.match(result.updatedMarkdown, /\| validate \| end \|  \|  \|  \|/);
});

test("addAppProcessFlow preserves CRLF newlines", () => {
  const markdown = baseWithFlows().replace(/\n/g, "\r\n");
  const result = addAppProcessFlow(markdown, { from: "validate", to: "end" });

  assert.equal(result.status, "added");
  assert.match(result.updatedMarkdown, /\r\n\| validate \| end \|  \|  \|  \|\r\n$/);
  assert.equal(/(^|[^\r])\n/.test(result.updatedMarkdown), false);
});

test("addAppProcessFlow returns no change when Steps section is missing", () => {
  const markdown = `# Sample

## Summary

No steps.
`;
  const result = addAppProcessFlow(markdown, { from: "start", to: "end" });

  assert.equal(result.status, "missing-steps");
  assert.equal(result.changed, false);
  assert.equal(result.updatedMarkdown, markdown);
});
