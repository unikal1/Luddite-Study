export function fileNameFromPath(path: string): string {
  return path.split('/').at(-1)?.replace(/\.md$/, '') ?? path;
}

export function titleFromPath(path: string): string {
  return fileNameFromPath(path)
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function slugifyFileName(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\\/:*?"<>|#]+/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  return normalized || 'untitled';
}

export function stripLeadingSlash(path: string): string {
  return path.replace(/^\/+/, '');
}

