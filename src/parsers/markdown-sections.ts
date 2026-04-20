import type { SectionMap } from "../types/models";

export const SUPPORTED_SECTION_NAMES = [
  "Summary",
  "Overview",
  "Attributes",
  "Methods",
  "Notes",
  "Relations",
  "Objects",
  "Columns",
  "Indexes"
] as const;

const SECTION_HEADINGS: Record<string, string> = {
  "# Summary": "Summary",
  "## Overview": "Overview",
  "## Attributes": "Attributes",
  "## Methods": "Methods",
  "## Notes": "Notes",
  "## Relations": "Relations",
  "## Objects": "Objects",
  "## Columns": "Columns",
  "## Indexes": "Indexes"
};

export function extractMarkdownSections(body: string): SectionMap {
  const normalized = body.replace(/\r\n/g, "\n");
  const sections: SectionMap = {};
  let currentSection: string | null = null;

  for (const line of normalized.split("\n")) {
    const trimmed = line.trim();
    const nextSection = SECTION_HEADINGS[trimmed];

    if (nextSection) {
      currentSection = nextSection;
      sections[currentSection] = [];
      continue;
    }

    if (/^#{1,6}\s+/.test(trimmed)) {
      currentSection = null;
      continue;
    }

    if (currentSection) {
      sections[currentSection].push(line);
    }
  }

  return sections;
}
