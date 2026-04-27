import type { SectionMap } from "../types/models";

export const SUPPORTED_SECTION_NAMES = [
  "Summary",
  "Overview",
  "Attributes",
  "Methods",
  "Layout",
  "Fields",
  "Actions",
  "Messages",
  "Format",
  "Records",
  "References",
  "Conditions",
  "Values",
  "Scope",
  "Mappings",
  "Rules",
  "Triggers",
  "Inputs",
  "Steps",
  "Outputs",
  "Transitions",
  "Errors",
  "Local Processes",
  "Notes",
  "Relations",
  "Flows",
  "Objects",
  "Columns",
  "Indexes"
] as const;

const SECTION_HEADINGS: Record<string, string> = {
  "# Summary": "Summary",
  "## Summary": "Summary",
  "## Overview": "Overview",
  "## Attributes": "Attributes",
  "## Methods": "Methods",
  "## Layout": "Layout",
  "## Fields": "Fields",
  "## Actions": "Actions",
  "## Messages": "Messages",
  "## Format": "Format",
  "## Records": "Records",
  "## References": "References",
  "## Conditions": "Conditions",
  "## Values": "Values",
  "## Scope": "Scope",
  "## Mappings": "Mappings",
  "## Rules": "Rules",
  "## Triggers": "Triggers",
  "## Inputs": "Inputs",
  "## Steps": "Steps",
  "## Outputs": "Outputs",
  "## Transitions": "Transitions",
  "## Errors": "Errors",
  "## Local Processes": "Local Processes",
  "## Notes": "Notes",
  "## Relations": "Relations",
  "## Flows": "Flows",
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
