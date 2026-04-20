import builtins from "builtin-modules";
import esbuild from "esbuild";
import process from "node:process";

const production = process.argv.includes("production");

const context = await esbuild.context({
  bundle: true,
  entryPoints: ["src/main.ts"],
  external: ["obsidian", "electron", "@codemirror/autocomplete", "@codemirror/collab", "@codemirror/commands", "@codemirror/language", "@codemirror/lint", "@codemirror/search", "@codemirror/state", "@codemirror/view", ...builtins],
  format: "cjs",
  logLevel: "info",
  outfile: "main.js",
  platform: "browser",
  sourcemap: production ? false : "inline",
  target: "es2020"
});

if (production) {
  await context.rebuild();
  await context.dispose();
} else {
  await context.watch();
}
