import { todayIso } from './dates';

describe('todayIso', () => {
  it('uses the configured timezone instead of the viewer local date', () => {
    const utcLateNight = new Date('2026-07-04T16:00:00.000Z');

    expect(todayIso('Asia/Seoul', utcLateNight)).toBe('2026-07-05');
    expect(todayIso('UTC', utcLateNight)).toBe('2026-07-04');
  });
});

