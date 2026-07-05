import type { Penalty, ProgressTopic, StudySession, User } from '../types';

const sessionStatuses = new Set(['planned', 'upcoming', 'current', 'done']);
const progressStatuses = new Set(['planned', 'active', 'done']);
const penaltyStatuses = new Set(['open', 'settled']);

type RawStudyData = {
  users: unknown;
  sessions: unknown;
  penalties: unknown;
  progressTopics: unknown;
};

export function validateStudyData(raw: RawStudyData): {
  users: User[];
  sessions: StudySession[];
  penalties: Penalty[];
  progressTopics: ProgressTopic[];
} {
  const errors: string[] = [];
  const users = readArray(raw.users, 'users', errors);
  const sessions = readArray(raw.sessions, 'sessions', errors);
  const penalties = readArray(raw.penalties, 'penalties', errors);
  const progressTopics = readArray(raw.progressTopics, 'progress', errors);

  const userIds = validateUsers(users, errors);
  const sessionIds = validateSessions(sessions, userIds, errors);
  validateProgress(progressTopics, userIds, errors);
  validatePenalties(penalties, userIds, sessionIds, errors);

  if (errors.length > 0) {
    throw new Error(`Study data validation failed:\n- ${errors.join('\n- ')}`);
  }

  return {
    users: users as User[],
    sessions: sessions as StudySession[],
    penalties: penalties as Penalty[],
    progressTopics: progressTopics as ProgressTopic[]
  };
}

function validateUsers(users: unknown[], errors: string[]): Set<string> {
  const ids = new Set<string>();

  users.forEach((user, index) => {
    const prefix = `users[${index}]`;

    if (!isRecord(user)) {
      errors.push(`${prefix} must be an object`);
      return;
    }

    const id = requiredString(user.id, `${prefix}.id`, errors);
    requiredString(user.name, `${prefix}.name`, errors);
    requiredString(user.role, `${prefix}.role`, errors);
    requiredString(user.color, `${prefix}.color`, errors);
    const materialPath = requiredString(user.materialPath, `${prefix}.materialPath`, errors);
    const presentationPath = requiredString(user.presentationPath, `${prefix}.presentationPath`, errors);

    if (typeof user.active !== 'boolean') {
      errors.push(`${prefix}.active must be boolean`);
    }

    if (id) {
      if (ids.has(id)) {
        errors.push(`${prefix}.id duplicates ${id}`);
      }

      if (materialPath && materialPath !== `자료/${id}`) {
        errors.push(`${prefix}.materialPath must be 자료/${id}`);
      }

      if (presentationPath && presentationPath !== `발표/*/${id}`) {
        errors.push(`${prefix}.presentationPath must be 발표/*/${id}`);
      }

      ids.add(id);
    }
  });

  if (ids.size === 0) {
    errors.push('users must contain at least one user');
  }

  return ids;
}

function validateSessions(sessions: unknown[], userIds: Set<string>, errors: string[]): Set<number> {
  const ids = new Set<number>();
  let currentCount = 0;

  sessions.forEach((session, index) => {
    const prefix = `sessions[${index}]`;

    if (!isRecord(session)) {
      errors.push(`${prefix} must be an object`);
      return;
    }

    const id = requiredNumber(session.id, `${prefix}.id`, errors);
    requiredString(session.title, `${prefix}.title`, errors);
    requiredNumber(session.week, `${prefix}.week`, errors);
    requiredString(session.date, `${prefix}.date`, errors, isIsoDate);
    requiredString(session.startTime, `${prefix}.startTime`, errors, isTime);
    requiredString(session.endTime, `${prefix}.endTime`, errors, isTime);
    requiredString(session.location, `${prefix}.location`, errors);
    requiredString(session.goal, `${prefix}.goal`, errors);

    const status = requiredString(session.status, `${prefix}.status`, errors);
    if (status && !sessionStatuses.has(status)) {
      errors.push(`${prefix}.status is invalid: ${status}`);
    }

    if (status === 'current') {
      currentCount += 1;
    }

    if (id !== undefined) {
      if (ids.has(id)) {
        errors.push(`${prefix}.id duplicates ${id}`);
      }

      ids.add(id);
    }

    validateStringArray(session.presenterIds, `${prefix}.presenterIds`, errors, userIds);
    const facilitatorId = requiredString(session.facilitatorId, `${prefix}.facilitatorId`, errors);
    if (facilitatorId && !userIds.has(facilitatorId)) {
      errors.push(`${prefix}.facilitatorId references missing user ${facilitatorId}`);
    }

    validateStringArray(session.agenda, `${prefix}.agenda`, errors);
    validateStringArray(session.resources, `${prefix}.resources`, errors);

    if (!isRecord(session.progress)) {
      errors.push(`${prefix}.progress must be an object`);
      return;
    }

    requiredString(session.progress.label, `${prefix}.progress.label`, errors);
    const current = requiredNumber(session.progress.current, `${prefix}.progress.current`, errors, (value) => value >= 0);
    const target = requiredNumber(session.progress.target, `${prefix}.progress.target`, errors, (value) => value > 0);
    requiredString(session.progress.unit, `${prefix}.progress.unit`, errors);

    if (current !== undefined && target !== undefined && current > target) {
      errors.push(`${prefix}.progress.current must not exceed target`);
    }
  });

  if (ids.size === 0) {
    errors.push('sessions must contain at least one session');
  }

  if (currentCount > 1) {
    errors.push('sessions must not contain more than one current session');
  }

  return ids;
}

function validateProgress(progressTopics: unknown[], userIds: Set<string>, errors: string[]): void {
  const ids = new Set<string>();

  progressTopics.forEach((topic, index) => {
    const prefix = `progress[${index}]`;

    if (!isRecord(topic)) {
      errors.push(`${prefix} must be an object`);
      return;
    }

    const id = requiredString(topic.id, `${prefix}.id`, errors);
    requiredString(topic.name, `${prefix}.name`, errors);
    const ownerId = requiredString(topic.ownerId, `${prefix}.ownerId`, errors);
    const current = requiredNumber(topic.current, `${prefix}.current`, errors, (value) => value >= 0);
    const target = requiredNumber(topic.target, `${prefix}.target`, errors, (value) => value > 0);
    requiredString(topic.unit, `${prefix}.unit`, errors);
    requiredString(topic.notes, `${prefix}.notes`, errors);

    const status = requiredString(topic.status, `${prefix}.status`, errors);
    if (status && !progressStatuses.has(status)) {
      errors.push(`${prefix}.status is invalid: ${status}`);
    }

    if (ownerId && !userIds.has(ownerId)) {
      errors.push(`${prefix}.ownerId references missing user ${ownerId}`);
    }

    if (current !== undefined && target !== undefined && current > target) {
      errors.push(`${prefix}.current must not exceed target`);
    }

    if (id) {
      if (ids.has(id)) {
        errors.push(`${prefix}.id duplicates ${id}`);
      }

      ids.add(id);
    }
  });
}

function validatePenalties(
  penalties: unknown[],
  userIds: Set<string>,
  sessionIds: Set<number>,
  errors: string[]
): void {
  const ids = new Set<string>();

  penalties.forEach((penalty, index) => {
    const prefix = `penalties[${index}]`;

    if (!isRecord(penalty)) {
      errors.push(`${prefix} must be an object`);
      return;
    }

    const id = requiredString(penalty.id, `${prefix}.id`, errors);
    const userId = requiredString(penalty.userId, `${prefix}.userId`, errors);
    const sessionId = requiredNumber(penalty.sessionId, `${prefix}.sessionId`, errors);
    requiredString(penalty.type, `${prefix}.type`, errors);
    requiredString(penalty.reason, `${prefix}.reason`, errors);
    requiredNumber(penalty.amount, `${prefix}.amount`, errors, (value) => value >= 0);
    requiredString(penalty.dueDate, `${prefix}.dueDate`, errors, isIsoDate);

    const status = requiredString(penalty.status, `${prefix}.status`, errors);
    if (status && !penaltyStatuses.has(status)) {
      errors.push(`${prefix}.status is invalid: ${status}`);
    }

    if (userId && !userIds.has(userId)) {
      errors.push(`${prefix}.userId references missing user ${userId}`);
    }

    if (sessionId !== undefined && !sessionIds.has(sessionId)) {
      errors.push(`${prefix}.sessionId references missing session ${sessionId}`);
    }

    if (id) {
      if (ids.has(id)) {
        errors.push(`${prefix}.id duplicates ${id}`);
      }

      ids.add(id);
    }
  });
}

function readArray(value: unknown, name: string, errors: string[]): unknown[] {
  if (!Array.isArray(value)) {
    errors.push(`${name} must be an array`);
    return [];
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(
  value: unknown,
  path: string,
  errors: string[],
  predicate?: (value: string) => boolean
): string | undefined {
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${path} must be a non-empty string`);
    return undefined;
  }

  if (predicate && !predicate(value)) {
    errors.push(`${path} has invalid value ${value}`);
  }

  return value;
}

function requiredNumber(
  value: unknown,
  path: string,
  errors: string[],
  predicate?: (value: number) => boolean
): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    errors.push(`${path} must be a finite number`);
    return undefined;
  }

  if (predicate && !predicate(value)) {
    errors.push(`${path} has invalid value ${value}`);
  }

  return value;
}

function validateStringArray(
  value: unknown,
  path: string,
  errors: string[],
  references?: Set<string>
): void {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array`);
    return;
  }

  value.forEach((item, index) => {
    if (typeof item !== 'string' || item.trim() === '') {
      errors.push(`${path}[${index}] must be a non-empty string`);
      return;
    }

    if (references && !references.has(item)) {
      errors.push(`${path}[${index}] references missing user ${item}`);
    }
  });
}

function isIsoDate(value: string): boolean {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return false;
  }

  const [, year, month, day] = match.map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day;
}

function isTime(value: string): boolean {
  const match = value.match(/^(\d{2}):(\d{2})$/);

  if (!match) {
    return false;
  }

  const [, hour, minute] = match.map(Number);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}
