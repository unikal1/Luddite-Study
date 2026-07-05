import type { MarkdownDoc } from './types';
import { sessions, users } from './data';
import { validateContentDocs } from './contentValidation';
import { parseFrontmatter } from './utils/frontmatter';
import { stripLeadingSlash, titleFromPath } from './utils/path';

const materialFiles = import.meta.glob<string>('/자료/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true
});

const presentationFiles = import.meta.glob<string>('/발표/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true
});

export const materialDocs = Object.entries(materialFiles)
  .map(([path, raw]) => createMaterialDoc(path, raw))
  .sort(sortByUpdatedDesc);

export const presentationDocs = Object.entries(presentationFiles)
  .map(([path, raw]) => createPresentationDoc(path, raw))
  .sort(sortByUpdatedDesc);

export const allDocs = [...materialDocs, ...presentationDocs].sort(sortByUpdatedDesc);

const contentErrors = validateContentDocs(allDocs, users, sessions);

if (contentErrors.length > 0) {
  throw new Error(`Content validation failed:\n- ${contentErrors.join('\n- ')}`);
}

function createMaterialDoc(modulePath: string, raw: string): MarkdownDoc {
  const parsed = parseFrontmatter(raw);
  const path = stripLeadingSlash(modulePath);
  const segments = path.split('/');
  const ownerSegment = segments[1] ?? 'shared';
  const ownerId = parsed.frontmatter.owner ?? (ownerSegment === '공유' ? 'shared' : ownerSegment);

  return {
    id: path,
    kind: 'material',
    path,
    segments,
    title: parsed.frontmatter.title ?? titleFromPath(path),
    summary: parsed.frontmatter.summary ?? '',
    ownerId,
    tags: parsed.frontmatter.tags ?? [],
    createdAt: parsed.frontmatter.createdAt,
    updatedAt: parsed.frontmatter.updatedAt,
    body: parsed.body,
    frontmatter: parsed.frontmatter,
    readingMinutes: estimateReadingMinutes(parsed.body)
  };
}

function createPresentationDoc(modulePath: string, raw: string): MarkdownDoc {
  const parsed = parseFrontmatter(raw);
  const path = stripLeadingSlash(modulePath);
  const segments = path.split('/');
  const sessionLabel = segments[1] ?? '';
  const inferredSession = Number.parseInt(sessionLabel.replace(/\D/g, ''), 10);
  const ownerId = parsed.frontmatter.owner ?? segments[2] ?? 'unknown';

  return {
    id: path,
    kind: 'presentation',
    path,
    segments,
    title: parsed.frontmatter.title ?? titleFromPath(path),
    summary: parsed.frontmatter.summary ?? '',
    ownerId,
    sessionId: parsed.frontmatter.session ?? (Number.isNaN(inferredSession) ? undefined : inferredSession),
    tags: parsed.frontmatter.tags ?? [],
    createdAt: parsed.frontmatter.createdAt,
    updatedAt: parsed.frontmatter.updatedAt,
    body: parsed.body,
    frontmatter: parsed.frontmatter,
    readingMinutes: estimateReadingMinutes(parsed.body)
  };
}

function estimateReadingMinutes(markdown: string): number {
  const words = markdown
    .replace(/```[\s\S]*?```/g, '')
    .split(/\s+/)
    .filter(Boolean).length;

  return Math.max(1, Math.ceil(words / 220));
}

function sortByUpdatedDesc(left: MarkdownDoc, right: MarkdownDoc): number {
  return (right.updatedAt ?? right.createdAt ?? '').localeCompare(left.updatedAt ?? left.createdAt ?? '');
}
