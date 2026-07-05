import YAML from 'yaml';
import type { MarkdownFrontmatter } from '../types';

export type ParsedMarkdown = {
  frontmatter: MarkdownFrontmatter;
  body: string;
};

const frontmatterPattern = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function parseFrontmatter(raw: string): ParsedMarkdown {
  const match = raw.match(frontmatterPattern);

  if (!match) {
    return {
      frontmatter: {},
      body: raw.trimStart()
    };
  }

  const [, yamlBlock] = match;
  const parsed = YAML.parse(yamlBlock) ?? {};

  return {
    frontmatter: normalizeFrontmatter(parsed as Record<string, unknown>),
    body: raw.slice(match[0].length).trimStart()
  };
}

function normalizeFrontmatter(input: Record<string, unknown>): MarkdownFrontmatter {
  return {
    title: asString(input.title),
    owner: asString(input.owner),
    session: asNumber(input.session),
    createdAt: asString(input.createdAt),
    updatedAt: asString(input.updatedAt),
    tags: asStringArray(input.tags),
    summary: asString(input.summary)
  };
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return value;
  }

  return undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.filter((item): item is string => typeof item === 'string');
}
