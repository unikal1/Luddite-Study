import { validateStudyData } from './validate';

const validData = {
  users: [
    {
      id: 'alice',
      name: 'Alice',
      role: '진행자',
      active: true,
      color: '#0f766e',
      materialPath: '자료/alice',
      presentationPath: '발표/*/alice'
    }
  ],
  sessions: [
    {
      id: 1,
      title: '1회차',
      week: 1,
      status: 'current',
      date: '2026-07-05',
      startTime: '20:00',
      endTime: '21:30',
      location: 'Discord',
      goal: '목표',
      presenterIds: ['alice'],
      facilitatorId: 'alice',
      agenda: ['발표'],
      resources: ['발표/1회차/alice/demo.md'],
      progress: {
        label: '진도',
        current: 1,
        target: 2,
        unit: '챕터'
      }
    }
  ],
  penalties: [
    {
      id: 'penalty-1',
      userId: 'alice',
      sessionId: 1,
      type: '지각',
      reason: '10분 지각',
      amount: 1000,
      status: 'open',
      dueDate: '2026-07-12'
    }
  ],
  progressTopics: [
    {
      id: 'topic-1',
      name: '진도',
      ownerId: 'alice',
      current: 1,
      target: 2,
      unit: '챕터',
      status: 'active',
      notes: '메모'
    }
  ]
};

describe('validateStudyData', () => {
  it('accepts valid study data', () => {
    expect(validateStudyData(validData).users[0].id).toBe('alice');
  });

  it('rejects missing references and invalid progress targets', () => {
    expect(() => validateStudyData({
      ...validData,
      sessions: [
        {
          ...validData.sessions[0],
          presenterIds: ['missing'],
          progress: { ...validData.sessions[0].progress, target: 0 }
        }
      ]
    })).toThrow(/references missing user missing/);
  });

  it('rejects progress current values above target', () => {
    expect(() => validateStudyData({
      ...validData,
      progressTopics: [
        {
          ...validData.progressTopics[0],
          current: 3,
          target: 2
        }
      ]
    })).toThrow(/progress\[0\]\.current must not exceed target/);
  });

  it('rejects user paths that do not match the user id', () => {
    expect(() => validateStudyData({
      ...validData,
      users: [
        {
          ...validData.users[0],
          materialPath: '자료/bob',
          presentationPath: '발표/*/bob'
        }
      ]
    })).toThrow(/users\[0\]\.materialPath must be 자료\/alice/);
  });

  it('rejects malformed session times', () => {
    expect(() => validateStudyData({
      ...validData,
      sessions: [
        {
          ...validData.sessions[0],
          startTime: '8pm'
        }
      ]
    })).toThrow(/sessions\[0\]\.startTime has invalid value 8pm/);
  });

  it('rejects impossible dates and time ranges', () => {
    expect(() => validateStudyData({
      ...validData,
      sessions: [
        {
          ...validData.sessions[0],
          date: '2026-99-99',
          endTime: '29:99'
        }
      ]
    })).toThrow(/sessions\[0\]\.date has invalid value 2026-99-99/);
  });
});
