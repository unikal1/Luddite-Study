import { describe, expect, it } from 'vitest';
import { encodeBase64Content } from './githubApi';

describe('githubApi', () => {
  it('encodes markdown content with unicode safely', () => {
    const content = '한글 Markdown\n\n- check';
    const bytes = Uint8Array.from(atob(encodeBase64Content(content)), (char) => char.charCodeAt(0));

    expect(new TextDecoder().decode(bytes)).toBe(content);
  });
});
