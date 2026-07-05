import { BookOpen, CalendarDays, ClipboardList, Presentation, Users } from 'lucide-react';
import type { RouteKey, StudyData, StudyMember, StudySession } from '../types';
import { formatDate, formatDateRange, formatTimeRange } from '../utils/dates';
import { StatusBadge } from './StatusBadge';

type DashboardProps = {
  data: StudyData;
  onNavigate: (route: RouteKey) => void;
};

export function Dashboard({ data, onNavigate }: DashboardProps) {
  const currentSession = getCurrentSession(data.sessions);
  const activeMembers = data.members.filter((member) => member.active);
  const presenters = currentSession.presenterMemberIds
    .map((id) => findMember(data.members, id)?.displayName)
    .filter(Boolean);
  const progressPercent = Math.min(100, Math.round((currentSession.progressCurrent / currentSession.progressTarget) * 100));

  return (
    <div className="dashboard">
      <section className="dashboard-top" aria-labelledby="dashboard-title">
        <div>
          <p className="eyebrow">현재 회차</p>
          <h1 id="dashboard-title">{currentSession.week}회차 · {currentSession.title}</h1>
          <p className="lead">{currentSession.goal}</p>
          <div className="meta-row">
            <span>
              <CalendarDays size={16} aria-hidden="true" />
              {formatDateRange(currentSession.startsOn, currentSession.endsOn)}
            </span>
            <span>
              <Presentation size={16} aria-hidden="true" />
              발표 {formatDate(currentSession.presentationOn)} {formatTimeRange(currentSession.startTime, currentSession.endTime)}
            </span>
          </div>
        </div>
        <div className="dashboard-actions" aria-label="주요 이동">
          <button className="primary-button" type="button" onClick={() => onNavigate('materials')}>
            <BookOpen size={18} aria-hidden="true" />
            자료 보기
          </button>
          <button className="secondary-button" type="button" onClick={() => onNavigate('operations')}>
            <ClipboardList size={18} aria-hidden="true" />
            운영
          </button>
        </div>
      </section>

      <section className="summary-strip" aria-label="핵심 상태">
        <SummaryItem label="회차" value={`${currentSession.week}회차`} />
        <SummaryItem label="범위" value={formatDateRange(currentSession.startsOn, currentSession.endsOn)} />
        <SummaryItem label="발표일" value={formatDate(currentSession.presentationOn)} />
        <SummaryItem label="참여자" value={`${activeMembers.length}명`} />
      </section>

      <div className="dashboard-focus">
        <section className="panel" aria-labelledby="today-title">
          <div className="section-heading">
            <ClipboardList size={18} aria-hidden="true" />
            <h2 id="today-title">오늘 진행</h2>
          </div>
          <ol className="agenda-list">
            {currentSession.agenda.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </section>

        <section className="panel" aria-labelledby="presentation-title">
          <div className="section-heading">
            <Presentation size={18} aria-hidden="true" />
            <h2 id="presentation-title">발표 상태</h2>
          </div>
          <div className="status-list">
            <div className="status-row">
              <span>발표자</span>
              <strong>{presenters.length > 0 ? presenters.join(', ') : '당일 추첨 전'}</strong>
            </div>
            <div className="status-row">
              <span>진행자</span>
              <strong>{findMember(data.members, currentSession.facilitatorMemberId)?.displayName ?? '미정'}</strong>
            </div>
            <div className="status-row">
              <span>장소</span>
              <strong>{currentSession.location}</strong>
            </div>
            <button className="secondary-button fit-button" type="button" onClick={() => onNavigate('operations')}>
              발표자 뽑기
            </button>
          </div>
        </section>
      </div>

      <section className="panel wide-panel" aria-labelledby="progress-title">
        <div className="section-heading">
          <Users size={18} aria-hidden="true" />
          <h2 id="progress-title">회차 진도</h2>
        </div>
        <div className="status-row">
          <span>{currentSession.progressLabel}</span>
          <strong>{currentSession.progressCurrent}/{currentSession.progressTarget} {currentSession.progressUnit}</strong>
        </div>
        <div className="progress-track" role="progressbar" aria-label={`${currentSession.progressLabel} ${progressPercent}%`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent}>
          <span style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="tag-row">
          {data.sessions.map((session) => (
            <StatusBadge key={session.id} label={`${session.week}회차 ${statusLabel(session.status)}`} tone={session.status === 'current' ? 'current' : session.status === 'done' ? 'done' : undefined} />
          ))}
        </div>
      </section>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <article className="summary-item">
      <b>{value}</b>
      <small>{label}</small>
    </article>
  );
}

function getCurrentSession(sessions: StudySession[]): StudySession {
  return sessions.find((session) => session.status === 'current') ??
    sessions.find((session) => session.status === 'upcoming') ??
    sessions[0];
}

function findMember(members: StudyMember[], memberId?: string | null): StudyMember | undefined {
  if (!memberId) {
    return undefined;
  }

  return members.find((member) => member.id === memberId);
}

function statusLabel(status: StudySession['status']): string {
  if (status === 'current') return '진행 중';
  if (status === 'done') return '종료';
  if (status === 'upcoming') return '예정';
  return '계획';
}
