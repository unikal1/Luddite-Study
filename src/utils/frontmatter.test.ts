import { parseFrontmatter } from './frontmatter';

describe('parseFrontmatter', () => {
  it('parses yaml frontmatter and keeps markdown body', () => {
    const parsed = parseFrontmatter(`---
title: 문서
owner: alice
session: 2
tags:
  - react
---

# Body`);

    expect(parsed.frontmatter).toMatchObject({
      title: '문서',
      owner: 'alice',
      session: 2,
      tags: ['react']
    });
    expect(parsed.body).toBe('# Body');
  });

  it('handles markdown without frontmatter', () => {
    const parsed = parseFrontmatter('# Plain');

    expect(parsed.frontmatter).toEqual({});
    expect(parsed.body).toBe('# Plain');
  });

  it('keeps session strict to numeric yaml values', () => {
    const parsed = parseFrontmatter(`---
title: 발표
owner: alice
session: "1회차"
---

# Body`);

    expect(parsed.frontmatter.session).toBeUndefined();
  });
});
