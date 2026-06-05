import { modelWeaveText } from "./language";

export type MermaidRenderStatus = "generated" | "rendered" | "failed";

export function formatMermaidRenderFailedMessage(
  language?: string | null
): string {
  return modelWeaveText(
    "Mermaid render failed.",
    "Mermaid の描画に失敗しました。",
    language
  );
}

export function formatMermaidRenderStatusMessage(
  status: MermaidRenderStatus,
  language?: string | null
): string {
  const statusText = modelWeaveText(
    status,
    status === "generated"
      ? "生成済み"
      : status === "rendered"
        ? "描画済み"
        : "失敗",
    language
  );
  return modelWeaveText(
    `Render status: ${statusText}`,
    `描画ステータス: ${statusText}`,
    language
  );
}

export function formatMermaidRenderErrorMessage(
  error: string,
  language?: string | null
): string {
  return modelWeaveText(
    `Render error: ${error}`,
    `描画エラー: ${error}`,
    language
  );
}

export function formatMermaidSvgNotRenderedMessage(
  language?: string | null
): string {
  return modelWeaveText("SVG: not rendered", "SVG: 未描画", language);
}

export function formatNoSourceLinksFoundMessage(
  language?: string | null
): string {
  return modelWeaveText(
    "No source links found.",
    "Source Links が見つかりません。",
    language
  );
}
