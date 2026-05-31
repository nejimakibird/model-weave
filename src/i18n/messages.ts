import { EN_MESSAGES } from "./en";
import { JA_MESSAGES } from "./ja";

export type ModelWeaveUiLanguage = "auto" | "en" | "ja";
export type ModelWeaveMessageDictionary = Record<string, string>;
export type ModelWeaveMessageParams = Record<string, string | number>;
export type ModelWeaveTranslator = (
  key: string,
  params?: ModelWeaveMessageParams
) => string;

const DICTIONARIES: Record<Exclude<ModelWeaveUiLanguage, "auto">, ModelWeaveMessageDictionary> = {
  en: EN_MESSAGES,
  ja: JA_MESSAGES
};

export function createModelWeaveTranslator(
  language: ModelWeaveUiLanguage
): ModelWeaveTranslator {
  const dictionary = DICTIONARIES[resolveModelWeaveUiLanguage(language)];
  return (key, params) => {
    const template = dictionary[key] ?? EN_MESSAGES[key] ?? key;
    return interpolateMessage(template, params);
  };
}

export function resolveModelWeaveUiLanguage(
  language: ModelWeaveUiLanguage
): Exclude<ModelWeaveUiLanguage, "auto"> {
  // TODO: Detect Obsidian or system language when a stable API is available.
  return language === "ja" ? "ja" : "en";
}

function interpolateMessage(
  template: string,
  params: ModelWeaveMessageParams | undefined
): string {
  if (!params) {
    return template;
  }
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (match, key) => {
    const value = params[key];
    return value === undefined ? match : String(value);
  });
}
