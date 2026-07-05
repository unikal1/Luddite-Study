import penaltiesJson from '../../data/penalties.json';
import progressJson from '../../data/progress.json';
import sessionsJson from '../../data/sessions.json';
import usersJson from '../../data/users.json';
import type { StudySession } from '../types';
import { validateStudyData } from './validate';

const validated = validateStudyData({
  users: usersJson,
  sessions: sessionsJson,
  penalties: penaltiesJson,
  progressTopics: progressJson
});

export const { users, sessions, penalties, progressTopics } = validated;

export const activeUsers = users.filter((user) => user.active);

export function getUserName(userId: string): string {
  return users.find((user) => user.id === userId)?.name ?? userId;
}

export function getCurrentSession(): StudySession {
  return (
    sessions.find((session) => session.status === 'current') ??
    sessions.find((session) => session.status === 'upcoming') ??
    sessions[0]
  );
}
