import { Check, Clipboard, Database, Dice5, ExternalLink, FileText, Plus, RotateCcw, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { materialDocs, presentationDocs } from '../content';
import { activeUsers, getCurrentSession, getUserName, penalties, progressTopics, sessions } from '../data';
import { todayIso } from '../utils/dates';
import { githubEditUrl, githubNewFileUrl } from '../utils/githubLinks';
import { slugifyFileName } from '../utils/path';

type DraftTool = 'schedule' | 'progress' | 'penalty' | 'meeting';

export function Operations() {
  const currentSession = getCurrentSession();
  const [selectedUsers, setSelectedUsers] = useState<string[]>(activeUsers.map((user) => user.id));
  const [winner, setWinner] = useState<string>('');
  const [activeDraft, setActiveDraft] = useState<DraftTool>('schedule');
  const [nextDate, setNextDate] = useState(() => addDays(currentSession.date, 7));
  const [nextTime, setNextTime] = useState('20:00');
  const [nextGoal, setNextGoal] = useState('다음 회차 목표를 입력한다.');
  const [progressId, setProgressId] = useState(progressTopics[0]?.id ?? '');
  const [progressCurrent, setProgressCurrent] = useState(progressTopics[0]?.current ?? 0);
  const [penaltyUser, setPenaltyUser] = useState(activeUsers[0]?.id ?? '');
  const [penaltyReason, setPenaltyReason] = useState('지각');
  const [penaltyAmount, setPenaltyAmount] = useState(1000);
  const [copiedKey, setCopiedKey] = useState('');
  const selectedProgressTopic = progressTopics.find((item) => item.id === progressId) ?? progressTopics[0];
  const meetingNotePath = `자료/공유/회의록/${currentSession.id}회차-운영-기록.md`;
  const normalizedNextDate = isIsoDate(nextDate) ? nextDate : addDays(currentSession.date, 7);
  const normalizedNextTime = isTime(nextTime) ? nextTime : '20:00';
  const normalizedNextGoal = nextGoal.trim() || '다음 회차 목표를 입력한다.';
  const normalizedProgressCurrent = clampNumber(progressCurrent, 0, selectedProgressTopic?.target ?? 0);
  const normalizedPenaltyReason = penaltyReason.trim() || '운영 사유';
  const normalizedPenaltyAmount = clampNumber(penaltyAmount, 0, 1_000_000);
  const draftTabs: Array<{ key: DraftTool; label: string }> = [
    { key: 'schedule', label: '일정' },
    { key: 'progress', label: '진도' },
    { key: 'penalty', label: '벌칙' },
    { key: 'meeting', label: '회의록' }
  ];

  const nextSessionDraft = useMemo(() => {
    const nextId = Math.max(...sessions.map((session) => session.id)) + 1;
    return JSON.stringify({
      id: nextId,
      title: `${nextId}회차`,
      week: nextId,
      status: 'upcoming',
      date: normalizedNextDate,
      startTime: normalizedNextTime,
      endTime: '21:30',
      location: 'Discord',
      goal: normalizedNextGoal,
      presenterIds: winner ? [winner] : [],
      facilitatorId: currentSession.facilitatorId,
      agenda: ['진도 점검', '발표', '다음 일정 확정'],
      resources: [],
      progress: {
        label: currentSession.progress.label,
        current: currentSession.progress.current,
        target: currentSession.progress.target,
        unit: currentSession.progress.unit
      }
    }, null, 2);
  }, [currentSession, normalizedNextDate, normalizedNextGoal, normalizedNextTime, winner]);

  const progressDraft = useMemo(() => {
    return JSON.stringify({
      ...selectedProgressTopic,
      current: normalizedProgressCurrent,
      notes: `${todayIso()} 기준 업데이트`
    }, null, 2);
  }, [normalizedProgressCurrent, selectedProgressTopic]);

  useEffect(() => {
    const topic = progressTopics.find((item) => item.id === progressId);
    setProgressCurrent(topic?.current ?? 0);
  }, [progressId]);

  const penaltyDraft = useMemo(() => JSON.stringify({
    id: `penalty-${todayIso()}-${penaltyUser}-${slugifyFileName(normalizedPenaltyReason)}`,
    userId: penaltyUser,
    sessionId: currentSession.id,
    type: normalizedPenaltyReason,
    reason: normalizedPenaltyReason,
    amount: normalizedPenaltyAmount,
    status: 'open',
    dueDate: normalizedNextDate
  }, null, 2), [currentSession.id, normalizedNextDate, normalizedPenaltyAmount, normalizedPenaltyReason, penaltyUser]);
  const meetingNoteDraft = useMemo(() => {
    const openPenalties = penalties.filter((penalty) => penalty.status === 'open');

    return `# ${currentSession.id}회차 운영 기록

- 일시: ${currentSession.date} ${currentSession.startTime}-${currentSession.endTime}
- 장소: ${currentSession.location}
- 진행자: ${getUserName(currentSession.facilitatorId)}
- 발표자: ${currentSession.presenterIds.map(getUserName).join(', ') || '미정'}

## 목표

${currentSession.goal}

## 안건

${currentSession.agenda.map((item) => `- ${item}`).join('\n')}

## 진도

- ${currentSession.progress.label}: ${currentSession.progress.current}/${currentSession.progress.target} ${currentSession.progress.unit}

## 벌칙

${openPenalties.length > 0
  ? openPenalties.map((penalty) => `- ${getUserName(penalty.userId)}: ${penalty.reason} (${penalty.amount.toLocaleString('ko-KR')}원)`).join('\n')
  : '- 미정산 벌칙 없음'}

## 다음 액션

- [ ] 다음 일정 확정
- [ ] 다음 발표자 반영
- [ ] 자료/발표 문서 업데이트 확인
`;
  }, [currentSession]);

  function toggleUser(userId: string) {
    setSelectedUsers((current) => (
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]
    ));
  }

  function drawPresenter() {
    if (selectedUsers.length === 0) {
      setWinner('');
      return;
    }

    const random = crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
    const index = Math.floor(random * selectedUsers.length);
    setWinner(selectedUsers[index]);
  }

  async function copy(key: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(''), 1800);
  }

  return (
    <div className="operations-page">
      <section className="operations-header">
        <div>
          <p className="eyebrow">운영 도구</p>
          <h1>회차 진행 보드</h1>
          <p className="lead">추첨과 변경 초안을 만들고, 저장소 파일에 반영할 JSON 조각을 복사한다.</p>
        </div>
        <a className="secondary-button" href={githubEditUrl('data/sessions.json')} target="_blank" rel="noreferrer">
          data 수정
        </a>
      </section>

      <div className="tool-grid">
        <section className="tool-panel" aria-labelledby="data-health-title">
          <div className="section-heading">
            <ShieldCheck size={18} aria-hidden="true" />
            <h2 id="data-health-title">데이터 상태</h2>
          </div>
          <div className="compact-health">
            <b>검증 통과</b>
            <span>사용자 {activeUsers.length}명 · 회차 {sessions.length}개 · 문서 {materialDocs.length + presentationDocs.length}개</span>
          </div>
          <div className="resource-list">
            <a href={githubEditUrl('data/users.json')} target="_blank" rel="noreferrer">
              <Database size={14} aria-hidden="true" />
              data/users.json
            </a>
            <a href={githubEditUrl('docs/DATA_MODEL.md')} target="_blank" rel="noreferrer">
              <FileText size={14} aria-hidden="true" />
              DATA_MODEL.md
            </a>
          </div>
        </section>

        <section className="tool-panel" aria-labelledby="draw-title">
          <div className="section-heading">
            <Dice5 size={18} aria-hidden="true" />
            <h2 id="draw-title">발표자 뽑기</h2>
          </div>
          <div className="checkbox-grid">
            {activeUsers.map((user) => (
              <label className="check-row" key={user.id}>
                <input type="checkbox" checked={selectedUsers.includes(user.id)} onChange={() => toggleUser(user.id)} />
                <span>{user.name}</span>
              </label>
            ))}
          </div>
          <div className="tool-actions">
            <button className="primary-button" type="button" onClick={drawPresenter}>
              <Dice5 size={18} aria-hidden="true" />
              뽑기
            </button>
            <button className="icon-button" type="button" onClick={() => setWinner('')} aria-label="추첨 초기화">
              <RotateCcw size={18} aria-hidden="true" />
            </button>
          </div>
          <p className="winner-box">{winner ? `${getUserName(winner)} 발표` : '후보를 선택하고 뽑기를 실행하세요.'}</p>
        </section>

        <section className="tool-panel tool-panel--wide" aria-labelledby="draft-tool-title">
          <div className="section-heading">
            <Plus size={18} aria-hidden="true" />
            <h2 id="draft-tool-title">변경 초안</h2>
          </div>
          <div className="tool-tabs" aria-label="초안 종류">
            {draftTabs.map((tab) => (
              <button
                className={activeDraft === tab.key ? 'tool-tab tool-tab--active' : 'tool-tab'}
                key={tab.key}
                type="button"
                aria-pressed={activeDraft === tab.key}
                onClick={() => setActiveDraft(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeDraft === 'schedule' ? (
            <div className="draft-section">
              <div className="form-grid">
                <label>
                  날짜
                  <input type="date" value={nextDate} onChange={(event) => setNextDate(event.target.value)} />
                </label>
                <label>
                  시작
                  <input type="time" value={nextTime} onChange={(event) => setNextTime(event.target.value)} />
                </label>
              </div>
              <label>
                목표
                <textarea value={nextGoal} onChange={(event) => setNextGoal(event.target.value)} rows={3} />
              </label>
              <ValidationNotice
                items={[
                  !isIsoDate(nextDate) ? `날짜는 ${normalizedNextDate}로 보정됩니다.` : '',
                  !isTime(nextTime) ? `시작 시간은 ${normalizedNextTime}로 보정됩니다.` : '',
                  !nextGoal.trim() ? '목표가 비어 있어 기본 목표 문구로 보정됩니다.' : ''
                ]}
              />
              <p className="helper-text">발표 자료 파일을 먼저 추가한 뒤 `resources`에 실제 Markdown 경로를 넣어야 빌드 검증을 통과합니다.</p>
              <Snippet
                title="sessions.json 추가 항목"
                value={nextSessionDraft}
                copied={copiedKey === 'session'}
                targetPath="data/sessions.json"
                actionHref={githubEditUrl('data/sessions.json')}
                actionLabel="sessions 열기"
                onCopy={() => copy('session', nextSessionDraft)}
              />
            </div>
          ) : null}

          {activeDraft === 'progress' ? (
            <div className="draft-section">
              <div className="form-grid">
                <label>
                  주제
                  <select value={progressId} onChange={(event) => setProgressId(event.target.value)}>
                    {progressTopics.map((topic) => (
                      <option key={topic.id} value={topic.id}>{topic.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  현재 진도
                  <input
                    type="number"
                    min="0"
                    max={selectedProgressTopic?.target}
                    value={progressCurrent}
                    onChange={(event) => {
                      const nextValue = Number(event.target.value);
                      setProgressCurrent(clampNumber(nextValue, 0, selectedProgressTopic?.target ?? 0));
                    }}
                  />
                </label>
              </div>
              <ValidationNotice
                items={[
                  progressCurrent !== normalizedProgressCurrent
                    ? `진도는 0-${selectedProgressTopic?.target ?? 0} 범위로 보정됩니다.`
                    : ''
                ]}
              />
              <Snippet
                title="progress.json 교체 항목"
                value={progressDraft}
                copied={copiedKey === 'progress'}
                targetPath="data/progress.json"
                actionHref={githubEditUrl('data/progress.json')}
                actionLabel="progress 열기"
                onCopy={() => copy('progress', progressDraft)}
              />
            </div>
          ) : null}

          {activeDraft === 'penalty' ? (
            <div className="draft-section">
              <div className="form-grid">
                <label>
                  사용자
                  <select value={penaltyUser} onChange={(event) => setPenaltyUser(event.target.value)}>
                    {activeUsers.map((user) => (
                      <option key={user.id} value={user.id}>{user.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  금액
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={penaltyAmount}
                    onChange={(event) => setPenaltyAmount(clampNumber(Number(event.target.value), 0, 1_000_000))}
                  />
                </label>
              </div>
              <label>
                사유
                <input value={penaltyReason} onChange={(event) => setPenaltyReason(event.target.value)} />
              </label>
              <ValidationNotice
                items={[
                  !penaltyReason.trim() ? '사유가 비어 있어 기본 사유로 보정됩니다.' : '',
                  penaltyAmount !== normalizedPenaltyAmount ? '금액은 0원 이상 1,000,000원 이하로 보정됩니다.' : ''
                ]}
              />
              <Snippet
                title="penalties.json 추가 항목"
                value={penaltyDraft}
                copied={copiedKey === 'penalty'}
                targetPath="data/penalties.json"
                actionHref={githubEditUrl('data/penalties.json')}
                actionLabel="penalties 열기"
                onCopy={() => copy('penalty', penaltyDraft)}
              />
            </div>
          ) : null}

          {activeDraft === 'meeting' ? (
            <div className="draft-section">
              <p className="helper-text">현재 회차 상태를 Markdown 운영 기록으로 복사해 추천 경로에 새 파일로 저장할 수 있습니다.</p>
              <Snippet
                title="운영 기록 Markdown"
                value={meetingNoteDraft}
                copied={copiedKey === 'meeting'}
                targetPath={meetingNotePath}
                actionHref={githubNewFileUrl(meetingNotePath)}
                actionLabel="회의록 만들기"
                onCopy={() => copy('meeting', meetingNoteDraft)}
              />
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function ValidationNotice({ items }: { items: string[] }) {
  const visibleItems = items.filter(Boolean);

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <div className="validation-notice" role="status">
      {visibleItems.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </div>
  );
}

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);

  if (!year || !month || !day) {
    return todayIso();
  }

  const parsed = new Date(Date.UTC(year, month - 1, day + days));
  return parsed.toISOString().slice(0, 10);
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
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

function Snippet({
  title,
  value,
  copied,
  targetPath,
  actionHref,
  actionLabel,
  onCopy
}: {
  title: string;
  value: string;
  copied: boolean;
  targetPath: string;
  actionHref: string;
  actionLabel: string;
  onCopy: () => void;
}) {
  return (
    <div className="snippet">
      <div className="split-line snippet-header">
        <strong>{title}</strong>
        <div className="toolbar-actions">
          <a className="icon-button" href={actionHref} target="_blank" rel="noreferrer" aria-label={`${actionLabel}: ${targetPath}`}>
            <ExternalLink size={18} aria-hidden="true" />
          </a>
          <button
            className="icon-button"
            type="button"
            onClick={onCopy}
            aria-label={copied ? `${title} 복사됨` : `${title} 복사`}
            title={copied ? '복사됨' : '복사'}
          >
            {copied ? <Check size={18} aria-hidden="true" /> : <Clipboard size={18} aria-hidden="true" />}
          </button>
        </div>
      </div>
      <div className="snippet-target">
        <span>반영 위치</span>
        <code>{targetPath}</code>
      </div>
      <details className="snippet-details">
        <summary>초안 보기</summary>
        <pre tabIndex={0}><code>{value}</code></pre>
      </details>
    </div>
  );
}
