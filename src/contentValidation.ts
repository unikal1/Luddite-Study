import type { MarkdownDoc, StudySession, User } from './types';

export function validateContentDocs(docs: MarkdownDoc[], users: User[], sessions: StudySession[]): string[] {
  const errors: string[] = [];
  const userIds = new Set(users.map((user) => user.id));
  const sessionIds = new Set(sessions.map((session) => session.id));
  const docPaths = new Set<string>();

  docs.forEach((doc) => {
    if (docPaths.has(doc.path)) {
      errors.push(`${doc.path} is duplicated`);
    }

    docPaths.add(doc.path);
    validateRequiredFrontmatter(doc, errors);

    if (doc.ownerId !== 'shared' && !userIds.has(doc.ownerId)) {
      errors.push(`${doc.path} references missing owner ${doc.ownerId}`);
    }

    if (doc.kind === 'material') {
      const expectedOwner = doc.segments[1] === '공유' ? 'shared' : doc.segments[1];

      if (expectedOwner && doc.ownerId !== expectedOwner) {
        errors.push(`${doc.path} owner ${doc.ownerId} does not match path owner ${expectedOwner}`);
      }
    }

    if (doc.kind === 'presentation') {
      const expectedSession = Number.parseInt((doc.segments[1] ?? '').replace(/\D/g, ''), 10);
      const expectedOwner = doc.segments[2];

      if (doc.sessionId === undefined) {
        errors.push(`${doc.path} is missing presentation session`);
      } else if (!sessionIds.has(doc.sessionId)) {
        errors.push(`${doc.path} references missing session ${doc.sessionId}`);
      }

      if (!Number.isNaN(expectedSession) && doc.sessionId !== expectedSession) {
        errors.push(`${doc.path} session ${doc.sessionId ?? 'missing'} does not match path session ${expectedSession}`);
      }

      if (expectedOwner && doc.ownerId !== expectedOwner) {
        errors.push(`${doc.path} owner ${doc.ownerId} does not match path owner ${expectedOwner}`);
      }
    }

    validateDate(doc.createdAt, `${doc.path}.createdAt`, errors);
    validateDate(doc.updatedAt, `${doc.path}.updatedAt`, errors);
    validateImagePaths(doc, errors);
  });

  sessions.forEach((session) => {
    session.resources.forEach((resource) => {
      if (!docPaths.has(resource)) {
        errors.push(`sessions[${session.id}].resources references missing document ${resource}`);
      }
    });
  });

  return errors;
}

function validateRequiredFrontmatter(doc: MarkdownDoc, errors: string[]) {
  if (!doc.frontmatter.title) {
    errors.push(`${doc.path}.frontmatter.title is required`);
  }

  if (!doc.frontmatter.owner) {
    errors.push(`${doc.path}.frontmatter.owner is required`);
  }

  if (doc.kind === 'presentation' && doc.frontmatter.session === undefined) {
    errors.push(`${doc.path}.frontmatter.session is required for presentations`);
  }
}

function validateDate(value: string | undefined, label: string, errors: string[]) {
  if (!value) {
    return;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    errors.push(`${label} must use YYYY-MM-DD`);
  }
}

function validateImagePaths(doc: MarkdownDoc, errors: string[]) {
  const imagePattern = /!\[[^\]]*]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

  for (const match of doc.body.matchAll(imagePattern)) {
    const src = match[1];

    if (!src || isSupportedImageSource(src)) {
      continue;
    }

    errors.push(`${doc.path} uses unsupported relative image path ${src}; store static images under public/assets and reference /assets/...`);
  }
}

function isSupportedImageSource(src: string): boolean {
  return /^(https?:|data:|#|\/assets\/)/.test(src);
}
