import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const ignoredDirectories = new Set(["node_modules", "dist", "build"]);
const displayContentsPattern = /\bdisplay\s*:\s*contents\b/i;
const findings = [];

async function scanDirectory(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        await scanDirectory(path.join(directory, entry.name));
      }
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith(".css")) {
      continue;
    }

    const filePath = path.join(directory, entry.name);
    const source = await readFile(filePath, "utf8");
    const lines = source.split(/\r?\n/);

    lines.forEach((line, index) => {
      if (displayContentsPattern.test(line)) {
        findings.push({
          filePath: path.relative(root, filePath),
          line: index + 1,
          text: line.trim(),
        });
      }
    });
  }
}

await scanDirectory(root);

if (findings.length > 0) {
  console.error("CSS compatibility check failed: avoid `display: contents` in active CSS.");
  for (const finding of findings) {
    console.error(`${finding.filePath}:${finding.line}: ${finding.text}`);
  }
  process.exitCode = 1;
} else {
  console.log("CSS compatibility check passed: no active `display: contents` usage found.");
}
