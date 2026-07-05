import { defaultBranch, repository } from './githubLinks';

type GitHubContent = {
  sha: string;
  path: string;
  html_url?: string;
};

type GitHubCommitResponse = {
  commit?: {
    sha?: string;
    html_url?: string;
  };
  content?: GitHubContent;
};

type WriteMode = 'create' | 'update';

const apiBase = 'https://api.github.com';

export async function getRepositoryFile(path: string, credential: string): Promise<GitHubContent | undefined> {
  const response = await fetch(contentUrl(path), {
    headers: apiHeaders(credential)
  });

  if (response.status === 404) {
    return undefined;
  }

  if (!response.ok) {
    throw new Error(await readGitHubError(response, '파일 조회에 실패했습니다.'));
  }

  const data = await response.json() as GitHubContent | GitHubContent[];

  if (Array.isArray(data)) {
    throw new Error('폴더 경로는 직접 저장할 수 없습니다.');
  }

  return data;
}

export async function writeRepositoryFile({
  path,
  content,
  credential,
  mode,
  message
}: {
  path: string;
  content: string;
  credential: string;
  mode: WriteMode;
  message: string;
}): Promise<GitHubCommitResponse> {
  const existing = await getRepositoryFile(path, credential);

  if (mode === 'create' && existing) {
    throw new Error('이미 같은 경로의 파일이 있습니다. 수정 모드를 사용하세요.');
  }

  if (mode === 'update' && !existing) {
    throw new Error('수정할 파일을 찾지 못했습니다. 새 문서로 저장하세요.');
  }

  const response = await fetch(contentUrl(path), {
    method: 'PUT',
    headers: apiHeaders(credential),
    body: JSON.stringify({
      message,
      content: encodeBase64Content(content),
      branch: defaultBranch,
      ...(existing ? { sha: existing.sha } : {})
    })
  });

  if (!response.ok) {
    throw new Error(await readGitHubError(response, '파일 저장에 실패했습니다.'));
  }

  return response.json() as Promise<GitHubCommitResponse>;
}

export async function deleteRepositoryFile({
  path,
  credential,
  message
}: {
  path: string;
  credential: string;
  message: string;
}): Promise<GitHubCommitResponse> {
  const existing = await getRepositoryFile(path, credential);

  if (!existing) {
    throw new Error('삭제할 파일을 찾지 못했습니다.');
  }

  const response = await fetch(contentUrl(path), {
    method: 'DELETE',
    headers: apiHeaders(credential),
    body: JSON.stringify({
      message,
      sha: existing.sha,
      branch: defaultBranch
    })
  });

  if (!response.ok) {
    throw new Error(await readGitHubError(response, '파일 삭제에 실패했습니다.'));
  }

  return response.json() as Promise<GitHubCommitResponse>;
}

export function encodeBase64Content(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}

function contentUrl(path: string): string {
  return `${apiBase}/repos/${repository}/contents/${path.split('/').map(encodeURIComponent).join('/')}`;
}

function apiHeaders(credential: string): HeadersInit {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${credential}`,
    'X-GitHub-Api-Version': '2022-11-28'
  };
}

async function readGitHubError(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json() as { message?: string };
    return data.message ? `${fallback} ${data.message}` : fallback;
  } catch {
    return fallback;
  }
}
