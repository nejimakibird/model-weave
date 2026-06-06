import {
  formatDomainIdRequiredMessage,
  formatDomainParentCycleMessage,
  formatDomainParentUnknownMessage,
  formatDomainSelfParentMessage,
  formatDuplicateDomainIdMessage
} from "../core/domain-diagnostics";
import { extractMarkdownSections } from "./markdown-sections";
import { parseFrontmatter } from "./frontmatter-parser";
import { parseMarkdownTable } from "./markdown-table";
import { parseSourceLinks } from "./source-links-parser";
import type { DomainEntry, DomainsModel, ValidationWarning } from "../types/models";

const DOMAIN_HEADERS = ["id", "name", "kind", "parent", "description"];

export function parseDomainsFile(
  markdown: string,
  path: string
): {
  file: DomainsModel | null;
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
  const description =
    typeof frontmatter.description === "string" ? frontmatter.description.trim() : "";

  if (frontmatter.type !== "domains") {
    warnings.push(createWarning(path, "type", 'expected type "domains"'));
  }
  if (!id) {
    warnings.push(createWarning(path, "id", 'required frontmatter "id" is missing'));
  }

  const domainsTable = parseDomainEntries(sections.Domains, path);
  warnings.push(...domainsTable.warnings);
  warnings.push(...validateDomainEntries(path, domainsTable.rows));

  const fallbackTitle = name || id || getFileStem(path) || "Untitled Domains";

  return {
    file: {
      fileType: "domains",
      schema: "domains",
      path,
      title: fallbackTitle,
      frontmatter,
      sections,
      sourceLinks: parseSourceLinks(sections["Source Links"]),
      id,
      name: fallbackTitle,
      description: description || undefined,
      domains: domainsTable.rows
    },
    warnings
  };
}

export function parseDomainEntries(
  lines: string[] | undefined,
  path: string
): {
  rows: DomainEntry[];
  warnings: ValidationWarning[];
} {
  const table = parseMarkdownTable(lines, DOMAIN_HEADERS, path, "Domains");
  const warnings = [...table.warnings];
  const rows: DomainEntry[] = [];
  const seenIds = new Set<string>();

  table.rows.forEach((row, rowIndex) => {
    const id = row.id?.trim() ?? "";
    const name = row.name?.trim() ?? "";
    const kind = row.kind?.trim() ?? "";
    const parent = row.parent?.trim() ?? "";
    const description = row.description?.trim() ?? "";

    if (!id) {
      warnings.push({
        code: "invalid-structure",
        message: formatDomainIdRequiredMessage(),
        severity: "error",
        path,
        field: "Domains.id",
        context: { rowIndex: rowIndex + 1 }
      });
      return;
    }

    if (seenIds.has(id)) {
      warnings.push({
        code: "invalid-structure",
        message: formatDuplicateDomainIdMessage(id),
        severity: "error",
        path,
        field: "Domains.id",
        context: { rowIndex: rowIndex + 1 }
      });
      return;
    }

    seenIds.add(id);
    rows.push({
      id,
      name: name || undefined,
      kind: kind || undefined,
      parent: parent || undefined,
      description: description || undefined,
      rowIndex
    });
  });

  return { rows, warnings };
}

export function validateDomainEntries(
  path: string,
  domains: DomainEntry[]
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const domainIds = new Set(domains.map((domain) => domain.id));

  for (const domain of domains) {
    if (!domain.parent) {
      continue;
    }

    if (domain.parent === domain.id) {
      warnings.push({
        code: "invalid-structure",
        message: formatDomainSelfParentMessage(domain.id),
        severity: "error",
        path,
        field: "Domains.parent",
        context: { rowIndex: domain.rowIndex + 1 }
      });
      continue;
    }

    if (!domainIds.has(domain.parent)) {
      warnings.push({
        code: "unresolved-reference",
        message: formatDomainParentUnknownMessage(domain.parent),
        severity: "warning",
        path,
        field: "Domains.parent",
        context: { rowIndex: domain.rowIndex + 1 }
      });
    }
  }

  warnings.push(...validateDomainCycles(path, domains));
  return warnings;
}

function validateDomainCycles(
  path: string,
  domains: DomainEntry[]
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const byId = new Map(domains.map((domain) => [domain.id, domain]));
  const reported = new Set<string>();

  for (const domain of domains) {
    if (domain.parent === domain.id) {
      continue;
    }

    const chain: string[] = [];
    const seen = new Set<string>();
    let current: DomainEntry | undefined = domain;

    while (current?.parent) {
      chain.push(current.id);
      if (seen.has(current.parent)) {
        const cycleStart = chain.indexOf(current.parent);
        const cycleIds = cycleStart >= 0
          ? chain.slice(cycleStart)
          : [current.parent, current.id];
        const cycleKey = [...new Set(cycleIds)].sort().join(">");
        if (!reported.has(cycleKey)) {
          reported.add(cycleKey);
          warnings.push({
            code: "invalid-structure",
            message: formatDomainParentCycleMessage([...cycleIds, current.parent]),
            severity: "error",
            path,
            field: "Domains.parent",
            context: { rowIndex: domain.rowIndex + 1 }
          });
        }
        break;
      }

      seen.add(current.id);
      current = byId.get(current.parent);
    }
  }

  return warnings;
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
