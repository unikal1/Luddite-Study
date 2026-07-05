export const repository = import.meta.env.VITE_GITHUB_REPOSITORY ?? 'unikal1/Luddite-Study';
export const defaultBranch = import.meta.env.VITE_GITHUB_BRANCH ?? 'main';

export function githubEditUrl(path: string): string {
  return `https://github.com/${repository}/edit/${defaultBranch}/${encodePath(path)}`;
}

export function githubNewFileUrl(path: string): string {
  const segments = path.split('/');
  const fileName = segments.pop() ?? 'untitled.md';
  const directory = segments.join('/');
  const params = new URLSearchParams({
    filename: fileName
  });
  const directoryPath = directory ? `/${encodePath(directory)}` : '';

  return `https://github.com/${repository}/new/${defaultBranch}${directoryPath}?${params.toString()}`;
}

export function githubDevUrl(path?: string): string {
  if (!path) {
    return `https://github.dev/${repository}`;
  }

  return `https://github.dev/${repository}/blob/${defaultBranch}/${encodePath(path)}`;
}

function encodePath(path: string): string {
  return path
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
}
