export function formatDate(date?: string): string {
  if (!date) {
    return '미정';
  }

  const parsed = new Date(`${date}T00:00:00+09:00`);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    weekday: 'short'
  }).format(parsed);
}

export function formatDateTime(date?: string, startTime?: string, endTime?: string): string {
  const dateLabel = formatDate(date);

  if (!startTime) {
    return dateLabel;
  }

  return `${dateLabel} ${startTime}${endTime ? `-${endTime}` : ''}`;
}

export function todayIso(timeZone = 'Asia/Seoul', now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now);
  const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';

  return `${year}-${month}-${day}`;
}
