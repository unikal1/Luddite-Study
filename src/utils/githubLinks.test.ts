import { githubDevUrl, githubEditUrl, githubNewFileUrl } from './githubLinks';

describe('githubNewFileUrl', () => {
  it('keeps draft content out of the URL and preserves the target path', () => {
    const url = githubNewFileUrl('자료/alice/browser-check.md');

    expect(url).toBe('https://github.com/unikal1/Luddite-Study/new/main/%EC%9E%90%EB%A3%8C/alice?filename=browser-check.md');
    expect(url).not.toContain('value=');
  });

  it('links meeting note drafts to the encoded parent directory', () => {
    const url = githubNewFileUrl('자료/공유/회의록/3회차-운영-기록.md');

    expect(url).toBe(
      'https://github.com/unikal1/Luddite-Study/new/main/%EC%9E%90%EB%A3%8C/%EA%B3%B5%EC%9C%A0/%ED%9A%8C%EC%9D%98%EB%A1%9D?filename=3%ED%9A%8C%EC%B0%A8-%EC%9A%B4%EC%98%81-%EA%B8%B0%EB%A1%9D.md'
    );
  });
});

describe('githubEditUrl', () => {
  it('encodes repository paths for Korean Markdown files', () => {
    expect(githubEditUrl('자료/공유/스터디-운영-규칙.md')).toBe(
      'https://github.com/unikal1/Luddite-Study/edit/main/%EC%9E%90%EB%A3%8C/%EA%B3%B5%EC%9C%A0/%EC%8A%A4%ED%84%B0%EB%94%94-%EC%9A%B4%EC%98%81-%EA%B7%9C%EC%B9%99.md'
    );
  });
});

describe('githubDevUrl', () => {
  it('opens the repository or a concrete file in github.dev', () => {
    expect(githubDevUrl()).toBe('https://github.dev/unikal1/Luddite-Study');
    expect(githubDevUrl('발표/3회차/chris/devtools-performance.md')).toBe(
      'https://github.dev/unikal1/Luddite-Study/blob/main/%EB%B0%9C%ED%91%9C/3%ED%9A%8C%EC%B0%A8/chris/devtools-performance.md'
    );
  });
});
