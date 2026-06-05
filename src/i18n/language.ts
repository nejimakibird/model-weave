import { getLanguage } from "obsidian";

export type ModelWeaveResolvedLanguage = "en" | "ja";

export function resolveModelWeaveLanguage(
  language: string | null | undefined
): ModelWeaveResolvedLanguage {
  return language?.toLowerCase().startsWith("ja") ? "ja" : "en";
}

export function getModelWeaveLanguage(): ModelWeaveResolvedLanguage {
  try {
    return resolveModelWeaveLanguage(getLanguage());
  } catch {
    return "en";
  }
}

export function isJapaneseLanguage(language?: string | null): boolean {
  return resolveModelWeaveLanguage(language ?? getModelWeaveLanguage()) === "ja";
}

export function modelWeaveText(
  en: string,
  ja: string,
  language?: string | null
): string {
  return isJapaneseLanguage(language) ? ja : en;
}
