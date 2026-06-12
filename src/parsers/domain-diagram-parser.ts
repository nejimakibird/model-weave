import { extractMarkdownSections } from "./markdown-sections";
import { parseFrontmatter } from "./frontmatter-parser";
import { parseSourceLinks } from "./source-links-parser";
import { parseDomainSourcesTable } from "./domain-sources-parser";
import {
  formatDomainDiagramNoValidSourcesMessage
} from "../core/domain-diagnostics";
import type {
  DomainDiagramModel,
  ValidationWarning
} from "../types/models";

export function parseDomainDiagramFile(
  markdown: string,
  path: string
): {
  file: DomainDiagramModel | null;
  warnings: ValidationWarning[];
} {
  const frontmatterResult = parseFrontmatter(markdown);
  const frontmatter = frontmatterResult.file.frontmatter ?? {};
  const sections = extractMarkdownSections(frontmatterResult.file.body);
  const warnings: ValidationWarning[] = frontmatterResult.warnings.map((warning) => ({
    ...warning,
    path: warning.path ?? path
  }));

  const id = typeof frontmatter.id === "string" ? frontmatter.id.trim() : "";
  const name = typeof frontmatter.name === "string" ? frontmatter.name.trim() : "";
  const title = typeof frontmatter.title === "string" ? frontmatter.title.trim() : "";

  if (frontmatter.type !== "domain_diagram") {
    warnings.push(createWarning(path, "type", 'expected type "domain_diagram"'));
  }
  if (!id) {
    warnings.push(createWarning(path, "id", 'required frontmatter "id" is missing'));
  }

  const sourcesTable = parseDomainSourcesTable(sections["Domain Sources"], path);
  warnings.push(...sourcesTable.warnings);
  const domainSources = sourcesTable.rows;

  if (domainSources.length === 0) {
    warnings.push({
      code: "invalid-structure",
      message: formatDomainDiagramNoValidSourcesMessage(),
      severity: "warning",
      path,
      field: "Domain Sources"
    });
  }

  const fallbackTitle = name || title || id || getFileStem(path) || "Untitled Domain Diagram";

  return {
    file: {
      fileType: "domain-diagram",
      schema: "domain_diagram",
      path,
      title: fallbackTitle,
      frontmatter,
      sections,
      sourceLinks: parseSourceLinks(sections["Source Links"]),
      id,
      name: name || title || fallbackTitle,
      domainSources
    },
    warnings
  };
}

function createWarning(
  path: string,
  field: string,
  message: string
): ValidationWarning {
  return {
    code: "invalid-structure",
    message,
    severity: "warning",
    path,
    field
  };
}

function getFileStem(path: string): string {
  return path.replace(/\\/g, "/").split("/").pop()?.replace(/\.md$/i, "") ?? "";
}
