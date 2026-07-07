import type { SessionDraft } from '../types';
import { todayIso } from './dates';

export type SessionDateField = 'startsOn' | 'endsOn' | 'presentationOn';

export function normalizeSessionDraftForSave(draft: SessionDraft, fallbackDate = todayIso()): SessionDraft {
  let startsOn = normalizeDateInput(draft.startsOn, fallbackDate);
  let endsOn = normalizeDateInput(draft.endsOn, startsOn);
  const presentationOn = normalizeDateInput(draft.presentationOn, startsOn);

  if (endsOn < startsOn) {
    endsOn = startsOn;
  }

  if (presentationOn < startsOn) {
    startsOn = presentationOn;
  }

  if (presentationOn > endsOn) {
    endsOn = presentationOn;
  }

  return withSafeSessionScalars({
    ...draft,
    startsOn,
    endsOn,
    presentationOn
  });
}

export function updateSessionDraftDate(draft: SessionDraft, field: SessionDateField, value: string): SessionDraft {
  const fallbackDate = normalizeDateInput(draft.presentationOn, normalizeDateInput(draft.startsOn, todayIso()));

  if (field === 'presentationOn') {
    return normalizeSessionDraftForSave({ ...draft, presentationOn: value }, fallbackDate);
  }

  if (field === 'startsOn') {
    const startsOn = normalizeDateInput(value, fallbackDate);
    let endsOn = normalizeDateInput(draft.endsOn, startsOn);
    let presentationOn = normalizeDateInput(draft.presentationOn, startsOn);

    if (endsOn < startsOn) {
      endsOn = startsOn;
    }

    if (presentationOn < startsOn) {
      presentationOn = startsOn;
    }

    if (presentationOn > endsOn) {
      endsOn = presentationOn;
    }

    return withSafeSessionScalars({ ...draft, startsOn, endsOn, presentationOn });
  }

  const endsOn = normalizeDateInput(value, fallbackDate);
  let startsOn = normalizeDateInput(draft.startsOn, endsOn);
  let presentationOn = normalizeDateInput(draft.presentationOn, endsOn);

  if (startsOn > endsOn) {
    startsOn = endsOn;
  }

  if (presentationOn > endsOn) {
    presentationOn = endsOn;
  }

  if (presentationOn < startsOn) {
    startsOn = presentationOn;
  }

  return withSafeSessionScalars({ ...draft, startsOn, endsOn, presentationOn });
}

function withSafeSessionScalars(draft: SessionDraft): SessionDraft {
  return {
    ...draft,
    startTime: draft.startTime || '20:00',
    endTime: draft.endTime || draft.startTime || '21:30',
    projectProgress: Number.isFinite(draft.projectProgress) ? Math.max(0, draft.projectProgress) : 0
  };
}

function normalizeDateInput(value: string, fallbackDate: string): string {
  return isIsoDate(value) ? value : fallbackDate;
}

function isIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
}
