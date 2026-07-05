import type { MarkdownDoc, StudySession, User } from './types';
import { validateContentDocs } from './contentValidation';

const users = [{ id: 'alice', name: 'Alice' }] as User[];
const sessions = [{ id: 1, resources: ['발표/1회차/alice/demo.md'] }] as StudySession[];

const baseDoc = {
  id: '발표/1회차/alice/demo.md',
  kind: 'presentation',
  path: '발표/1회차/alice/demo.md',
  segments: ['발표', '1회차', 'alice', 'demo.md'],
  title: 'Demo',
  summary: '',
  ownerId: 'alice',
  sessionId: 1,
  tags: [],
  createdAt: '2026-07-05',
  updatedAt: '2026-07-05',
  body: '# Demo',
  frontmatter: {
    title: 'Demo',
    owner: 'alice',
    session: 1
  },
  readingMinutes: 1
} as MarkdownDoc;

describe('validateContentDocs', () => {
  it('accepts valid content references', () => {
    expect(validateContentDocs([baseDoc], users, sessions)).toEqual([]);
  });

  it('reports missing owners and missing session resources', () => {
    const errors = validateContentDocs([
      { ...baseDoc, ownerId: 'missing', path: '발표/1회차/missing/demo.md' }
    ], users, sessions);

    expect(errors).toContain('발표/1회차/missing/demo.md references missing owner missing');
    expect(errors).toContain('sessions[1].resources references missing document 발표/1회차/alice/demo.md');
  });

  it('reports frontmatter values that disagree with the path', () => {
    const errors = validateContentDocs([
      { ...baseDoc, ownerId: 'alice', sessionId: 2 }
    ], users, [...sessions, { ...sessions[0], id: 2, resources: [] }]);

    expect(errors).toContain('발표/1회차/alice/demo.md session 2 does not match path session 1');
  });

  it('requires canonical frontmatter fields', () => {
    const errors = validateContentDocs([
      {
        ...baseDoc,
        frontmatter: {},
        createdAt: undefined,
        updatedAt: undefined
      }
    ], users, sessions);

    expect(errors).toContain('발표/1회차/alice/demo.md.frontmatter.title is required');
    expect(errors).toContain('발표/1회차/alice/demo.md.frontmatter.owner is required');
    expect(errors).toContain('발표/1회차/alice/demo.md.frontmatter.session is required for presentations');
  });

  it('rejects document-relative image paths that will not be emitted by the static build', () => {
    const errors = validateContentDocs([
      { ...baseDoc, body: '![diagram](./diagram.png)\n\n![ok](/assets/study-board.svg)' }
    ], users, sessions);

    expect(errors).toContain(
      '발표/1회차/alice/demo.md uses unsupported relative image path ./diagram.png; store static images under public/assets and reference /assets/...'
    );
  });
});
