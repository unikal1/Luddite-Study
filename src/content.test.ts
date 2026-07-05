import { allDocs, materialDocs, presentationDocs } from './content';

describe('content registry', () => {
  it('loads sample material and presentation markdown files', () => {
    expect(materialDocs.length).toBeGreaterThanOrEqual(4);
    expect(presentationDocs.length).toBeGreaterThanOrEqual(3);
    expect(allDocs.some((doc) => doc.path === '자료/공유/스터디-운영-규칙.md')).toBe(true);
  });

  it('infers presentation session and owner from path/frontmatter', () => {
    const doc = presentationDocs.find((item) => item.path.includes('typescript-data-model'));

    expect(doc).toMatchObject({
      ownerId: 'bob',
      sessionId: 2,
      kind: 'presentation'
    });
  });
});

