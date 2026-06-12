import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const outputFile = "dist/test-localization-language.mjs";

await build({
  stdin: {
    contents: `
      export {
        buildCurrentDiagramDiagnostics,
        buildCurrentObjectDiagnostics,
        localizeDiagnosticMessage,
        resolveModelWeaveLanguage
      } from "./src/core/current-file-diagnostics";
      export {
        formatMermaidRenderFailedMessage,
        formatNoSourceLinksFoundMessage
      } from "./src/i18n/localized-messages";
      export { createModelWeaveTranslator } from "./src/i18n/messages";
    `,
    resolveDir: ".",
    sourcefile: "test-localization-entry.ts",
    loader: "ts"
  },
  bundle: true,
  format: "esm",
  platform: "browser",
  plugins: [
    {
      name: "stub-obsidian",
      setup(buildApi) {
        buildApi.onResolve({ filter: /^obsidian$/ }, () => ({
          path: "obsidian",
          namespace: "stub"
        }));
        buildApi.onLoad({ filter: /^obsidian$/, namespace: "stub" }, () => ({
          contents: "export const getLanguage = () => 'en';",
          loader: "js"
        }));
      }
    }
  ],
  outfile: outputFile,
  logLevel: "silent"
});

const {
  buildCurrentDiagramDiagnostics,
  buildCurrentObjectDiagnostics,
  createModelWeaveTranslator,
  formatMermaidRenderFailedMessage,
  formatNoSourceLinksFoundMessage,
  localizeDiagnosticMessage,
  resolveModelWeaveLanguage
} = await import(`../${outputFile}?t=${Date.now()}`);

test("localization language resolution falls back to English", () => {
  assert.equal(resolveModelWeaveLanguage("en"), "en");
  assert.equal(resolveModelWeaveLanguage("ja"), "ja");
  assert.equal(resolveModelWeaveLanguage("ja-JP"), "ja");
  assert.equal(resolveModelWeaveLanguage("fr"), "en");
  assert.equal(resolveModelWeaveLanguage(undefined), "en");
});

test("diagnostic formatting respects language", () => {
  const rowMessage = 'table row in section "Objects" has 2 columns, expected 5';
  const screenHeadersMessage = 'table columns in section "Fields" do not match expected screen field headers';
  const dfdMessage = 'unresolved DFD flow source "MD_FILES"';
  const dfdTargetMessage = 'unresolved DFD flow target "STORE"';
  const dfdEmptySourceMessage = 'unresolved DFD flow source ""';
  const dfdEmptyTargetMessage = 'unresolved DFD flow target ""';
  const dfdObjectRefMessage = 'unresolved DFD object ref "[[DFD-PROC-SAMPLE]]"';
  const dfdObjectRefResolvedMessage = 'DFD object ref "[[DFD-PROC-SAMPLE]]" could not be resolved. Check the ID or file name.';
  const dfdInlineObjectMessage = 'DFD local object "receive_order" is treated as an inline object without ref.';
  const dfdMissingKindMessage = 'DFD object "pick_items" has no kind, and it could not be inferred from ref.';
  const transitionTargetMessage = 'transition target reference "[[PROC-SAMPLE-ORDER-ENTRY-FLOW]]" could not be resolved. Check the ID or file name.';
  const duplicateFieldMessage = 'duplicate field name "record_type"';
  const layoutMessage = 'layout is empty for field "window"';
  const actionTargetMessage = 'action target "back_button" does not match any Fields.id';
  const fieldIdMessage = "field id is empty";
  const mermaidOverviewMessage = "Mermaid overview: no outbound relations to display.";

  assert.equal(localizeDiagnosticMessage(rowMessage, "en"), rowMessage);
  assert.equal(
    localizeDiagnosticMessage(screenHeadersMessage, "en"),
    screenHeadersMessage
  );
  assert.equal(
    localizeDiagnosticMessage(duplicateFieldMessage, "en"),
    duplicateFieldMessage
  );
  assert.equal(
    localizeDiagnosticMessage(rowMessage, "ja"),
    '"Objects" セクションのテーブル行の列数が 2 です。期待値は 5 です。'
  );
  assert.equal(
    localizeDiagnosticMessage(screenHeadersMessage, "ja"),
    '"Fields" セクションのテーブル列が期待される screen field ヘッダーと一致しません。'
  );
  assert.equal(
    localizeDiagnosticMessage(duplicateFieldMessage, "ja"),
    'フィールド名 "record_type" が重複しています。'
  );
  assert.equal(
    localizeDiagnosticMessage(layoutMessage, "ja"),
    'field "window" の layout が空です。'
  );
  assert.equal(
    localizeDiagnosticMessage(actionTargetMessage, "ja"),
    'action target "back_button" に一致する Fields.id がありません。'
  );
  assert.equal(
    localizeDiagnosticMessage(fieldIdMessage, "ja"),
    "Fields の id が空です。"
  );
  assert.equal(
    localizeDiagnosticMessage(mermaidOverviewMessage, "en"),
    mermaidOverviewMessage
  );
  assert.equal(
    localizeDiagnosticMessage(mermaidOverviewMessage, "ja"),
    "Mermaid概要: 表示する外向きの関係はありません。"
  );
  assert.equal(
    localizeDiagnosticMessage(dfdMessage, "ja-JP"),
    'DFD flow の source "MD_FILES" が解決できません。'
  );
  assert.equal(
    localizeDiagnosticMessage(dfdTargetMessage, "ja"),
    'DFD flow の target "STORE" が解決できません。'
  );
  assert.equal(
    localizeDiagnosticMessage(dfdEmptySourceMessage, "ja"),
    "DFD flow の source が未指定です。"
  );
  assert.equal(
    localizeDiagnosticMessage(dfdEmptyTargetMessage, "ja"),
    "DFD flow の target が未指定です。"
  );
  assert.equal(
    localizeDiagnosticMessage(dfdObjectRefMessage, "ja"),
    'DFDオブジェクトの参照 "[[DFD-PROC-SAMPLE]]" の参照先が見つかりません。IDまたはファイル名を確認してください。'
  );
  assert.equal(
    localizeDiagnosticMessage(dfdObjectRefResolvedMessage, "ja"),
    'DFDオブジェクトの参照 "[[DFD-PROC-SAMPLE]]" の参照先が見つかりません。IDまたはファイル名を確認してください。'
  );
  assert.equal(localizeDiagnosticMessage(dfdMessage, "unknown"), dfdMessage);
  assert.equal(localizeDiagnosticMessage(dfdTargetMessage, "en"), dfdTargetMessage);
  assert.equal(localizeDiagnosticMessage(dfdObjectRefMessage, "en"), dfdObjectRefMessage);
  assert.equal(localizeDiagnosticMessage(dfdInlineObjectMessage, "en"), dfdInlineObjectMessage);
  assert.equal(localizeDiagnosticMessage(dfdMissingKindMessage, "en"), dfdMissingKindMessage);
  assert.equal(localizeDiagnosticMessage(transitionTargetMessage, "en"), transitionTargetMessage);
  assert.equal(localizeDiagnosticMessage(dfdInlineObjectMessage), dfdInlineObjectMessage);
  assert.equal(
    localizeDiagnosticMessage(dfdInlineObjectMessage, "ja"),
    'DFD local object "receive_order" は ref なしの図内定義として扱われます。'
  );
  assert.equal(
    localizeDiagnosticMessage(dfdMissingKindMessage, "ja"),
    'DFD object "pick_items" の kind がなく、ref からも推定できません。'
  );
  assert.equal(
    localizeDiagnosticMessage(transitionTargetMessage, "ja"),
    'transition target reference "[[PROC-SAMPLE-ORDER-ENTRY-FLOW]]" の参照先が見つかりません。IDまたはファイル名を確認してください。'
  );
});

test("preview and related-view labels respect UI language dictionaries", () => {
  const en = createModelWeaveTranslator("en");
  const ja = createModelWeaveTranslator("ja");

  assert.equal(en("objectContext.connectionDetails"), "Connection details");
  assert.equal(en("objectContext.noDirectlyRelated"), "No directly related objects.");
  assert.equal(en("class.preview.displayedRelations"), "Displayed relations");
  assert.equal(
    en("class.preview.noRelationsUsed"),
    "No relations are currently used for rendering."
  );
  assert.equal(en("summary.counts"), "Counts");
  assert.equal(en("summary.count.localProcesses"), "Local processes");
  assert.equal(en("summary.count.invokedProcesses"), "Invoked processes");
  assert.equal(en("summary.count.outgoingScreens"), "Outgoing screens");
  assert.equal(en("summary.detectedSections"), "Detected sections");
  assert.equal(en("summary.noRows"), "No rows");
  assert.equal(en("summary.section.domainSourcesSummary"), "Domain Sources Summary");
  assert.equal(en("summary.section.domainsSummary"), "Domains Summary");
  assert.equal(en("summary.section.triggersSummary"), "Triggers Summary");
  assert.equal(en("summary.section.inputsSummary"), "Inputs Summary");
  assert.equal(en("summary.section.outputsSummary"), "Outputs Summary");
  assert.equal(en("summary.section.stepsSummary"), "Steps Summary");
  assert.equal(en("summary.section.flowsSummary"), "Flows Summary");
  assert.equal(en("summary.section.transitionsSummary"), "Transitions Summary");

  assert.equal(ja("objectContext.connectionDetails"), "接続詳細");
  assert.equal(
    ja("objectContext.noDirectlyRelated"),
    "直接関係するオブジェクトはありません。"
  );
  assert.equal(ja("class.preview.displayedRelations"), "表示中の関係");
  assert.equal(
    ja("class.preview.noRelationsUsed"),
    "描画に使われている関係はありません。"
  );
  assert.equal(ja("summary.counts"), "件数");
  assert.equal(ja("summary.count.localProcesses"), "ローカルプロセス");
  assert.equal(ja("summary.count.invokedProcesses"), "呼び出し先プロセス");
  assert.equal(ja("summary.count.outgoingScreens"), "遷移先画面");
  assert.equal(ja("summary.detectedSections"), "検出されたセクション");
  assert.equal(ja("summary.noRows"), "行はありません");
  assert.equal(ja("summary.section.domainSourcesSummary"), "ドメインソース概要");
  assert.equal(ja("summary.section.domainsSummary"), "ドメイン概要");
  assert.equal(ja("summary.section.triggersSummary"), "トリガー概要");
  assert.equal(ja("summary.section.inputsSummary"), "入力概要");
  assert.equal(ja("summary.section.outputsSummary"), "出力概要");
  assert.equal(ja("summary.section.stepsSummary"), "ステップ概要");
  assert.equal(ja("summary.section.flowsSummary"), "フロー概要");
  assert.equal(ja("summary.section.transitionsSummary"), "遷移概要");
});

test("diagnostic normalization keeps canonical English messages", () => {
  const message = 'DFD object "pick_items" has no kind, and it could not be inferred from ref.';
  const diagnostics = buildCurrentDiagramDiagnostics(
    {
      diagram: {
        fileType: "dfd-diagram",
        schema: "dfd_diagram",
        path: "DFD-SAMPLE.md",
        title: "DFD sample",
        frontmatter: {},
        sections: {},
        sourceLinks: [],
        id: "DFD-SAMPLE",
        name: "DFD sample",
        kind: "dfd",
        objectRefs: [],
        objectEntries: [],
        nodes: [],
        edges: [],
        flows: []
      },
      nodes: [],
      edges: [],
      missingObjects: [],
      warnings: []
    },
    [
      {
        code: "invalid-structure",
        message,
        severity: "warning",
        path: "DFD-SAMPLE.md",
        field: "Objects"
      }
    ]
  );

  assert.equal(diagnostics[0].message, message);
  assert.equal(localizeDiagnosticMessage(diagnostics[0].message, "en"), message);
  assert.equal(
    localizeDiagnosticMessage(diagnostics[0].message, "ja"),
    'DFD object "pick_items" の kind がなく、ref からも推定できません。'
  );
});

test("app process transition diagnostics keep canonical English messages", () => {
  const diagnostics = buildCurrentObjectDiagnostics(
    {
      fileType: "app-process",
      schema: "app_process",
      path: "PROC-SAMPLE.md",
      title: "Sample process",
      frontmatter: {},
      sections: {},
      sourceLinks: [],
      id: "PROC-SAMPLE",
      name: "Sample process",
      inputs: [],
      outputs: [],
      triggers: [],
      transitions: [
        {
          event: "submit",
          to: "[[PROC-SAMPLE-ORDER-ENTRY-FLOW]]",
          notes: undefined,
          rowLine: 1
        }
      ]
    },
    {
      sourceFilesByPath: {},
      objectsById: {},
      appProcessesById: {},
      screensById: {},
      codesetsById: {},
      messagesById: {},
      rulesById: {},
      mappingsById: {},
      domainsById: {},
      dataObjectsById: {},
      dfdObjectsById: {},
      erEntitiesById: {},
      erEntitiesByPhysicalName: {},
      relationsFilesById: {},
      diagramsById: {},
      modelsByFilePath: {},
      relationsById: {},
      relationsByObjectId: {},
      membersByOwnerId: {},
      membersByOwnerPath: {},
      warningsByFilePath: {},
      state: {
        relationLookupsBuilt: false,
        memberLookupsBuilt: false,
        vaultValidationBuilt: false,
        fullParsedFilePaths: {}
      }
    },
    null,
    []
  );
  const message = diagnostics[0].message;

  assert.equal(
    message,
    'transition target reference "[[PROC-SAMPLE-ORDER-ENTRY-FLOW]]" could not be resolved. Check the ID or file name.'
  );
  assert.equal(localizeDiagnosticMessage(message, "en"), message);
  assert.equal(
    localizeDiagnosticMessage(message, "ja"),
    'transition target reference "[[PROC-SAMPLE-ORDER-ENTRY-FLOW]]" の参照先が見つかりません。IDまたはファイル名を確認してください。'
  );
});

test("representative UI message helpers respect language", () => {
  assert.equal(formatMermaidRenderFailedMessage("en"), "Mermaid render failed.");
  assert.equal(
    formatMermaidRenderFailedMessage("ja"),
    "Mermaid の描画に失敗しました。"
  );
  assert.equal(formatNoSourceLinksFoundMessage("en"), "No source links found.");
  assert.equal(
    formatNoSourceLinksFoundMessage("ja-JP"),
    "Source Links が見つかりません。"
  );
  assert.equal(
    formatNoSourceLinksFoundMessage("unknown"),
    "No source links found."
  );
});
