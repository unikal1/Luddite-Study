import { formatDate, todayIso } from './dates';

describe('todayIso', () => {
  it('uses the configured timezone instead of the viewer local date', () => {
    const utcLateNight = new Date('2026-07-04T16:00:00.000Z');

    expect(todayIso('Asia/Seoul', utcLateNight)).toBe('2026-07-05');
    expect(todayIso('UTC', utcLateNight)).toBe('2026-07-04');
  });
});

describe('formatDate', () => {
  it('renders study dates in Korea time even when the process timezone is UTC', () => {
    const originalTimezone = process.env.TZ;
    process.env.TZ = 'UTC';

    try {
      expect(formatDate('2026-06-29')).toMatch(/2026년 6월 29일/);
    } finally {
      if (originalTimezone === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = originalTimezone;
      }
    }
  });
});
