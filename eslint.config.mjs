import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import tseslint from "typescript-eslint";

const obsidianWarningRules = Object.fromEntries(
  Object.keys(obsidianmd.rules).map((ruleName) => [`obsidianmd/${ruleName}`, "warn"]),
);

function withWarningSeverity(ruleConfig) {
  if (Array.isArray(ruleConfig)) {
    return ["warn", ...ruleConfig.slice(1)];
  }

  return "warn";
}

const typescriptWarningRules = Object.fromEntries(
  tseslint.configs.recommendedTypeChecked
    .flatMap((config) => Object.entries(config.rules ?? {}))
    .filter(([ruleName]) => ruleName.startsWith("@typescript-eslint/"))
    .map(([ruleName, ruleConfig]) => [ruleName, withWarningSeverity(ruleConfig)]),
);

export default defineConfig([
  {
    ignores: ["dist/**", "build/**", "node_modules/**", "main.js"],
  },
  ...obsidianmd.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      ...obsidianWarningRules,
      ...typescriptWarningRules,
      // Locale dictionaries intentionally preserve product, command, and format names.
      "obsidianmd/ui/sentence-case-locale-module": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn",
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-return": "warn",
      "@typescript-eslint/no-require-imports": "warn",
    },
  },
]);
