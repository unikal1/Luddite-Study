import { describe, expect, it } from 'vitest';
import type { SessionDraft } from '../types';
import { normalizeSessionDraftForSave, updateSessionDraftDate } from './sessionDraft';

const baseDraft: SessionDraft = {
  id: 3,
  projectId: 0,
  title: '3회차',
  week: 3,
  status: 'current',
  startsOn: '2026-07-07',
  endsOn: '2026-07-07',
  presentationOn: '2026-07-07',
  startTime: '20:00',
  endTime: '21:30',
  location: 'Discord',
  goal: '',
  facilitatorMemberId: null,
  agenda: [],
  projectProgress: 0
};

describe('session draft normalization', () => {
  it('expands the session range when the presentation date moves after the end date', () => {
    const updated = updateSessionDraftDate(baseDraft, 'presentationOn', '2026-07-24');

    expect(updated.presentationOn).toBe('2026-07-24');
    expect(updated.endsOn).toBe('2026-07-24');
    expect(updated.startsOn).toBe('2026-07-07');
  });

  it('keeps the presentation date inside the saved session date range', () => {
    const normalized = normalizeSessionDraftForSave({
      ...baseDraft,
      presentationOn: '2026-07-24'
    });

    expect(normalized.endsOn).toBe('2026-07-24');
  });
});
