import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  Coins,
  FileText,
  Flag,
  Presentation,
  TrendingUp,
  Users
} from 'lucide-react';
import { getUserName, penalties, sessions, users } from '../data';
import type { MarkdownDoc, RouteKey, StudySession } from '../types';
import { formatDate, formatDateTime } from '../utils/dates';
import { githubEditUrl } from '../utils/githubLinks';
import { StatusBadge } from './StatusBadge';

type DashboardProps = {
  currentSession: StudySession;
  recentDocs: MarkdownDoc[];
  onNavigate: (route: RouteKey) => void;
};

export function Dashboard({ currentSession, recentDocs, onNavigate }: DashboardProps) {
  const openPenalties = penalties.filter((penalty) => penalty.status === 'open');
  const currentPresenters = currentSession.presenterIds.map(getUserName).join(', ');
  const totalPenaltyAmount = openPenalties.reduce((sum, penalty) => sum + penalty.amount, 0);
  const nextSession = sessions.find((session) => session.status === 'upcoming');
  const progressPercent = Math.min(100, Math.round((currentSession.progress.current / currentSession.progress.target) * 100));

  return (
    <div className="dashboard">
      <section className="dashboard-top" aria-labelledby="dashboard-title">
        <div>
          <p className="eyebrow">현재 회차</p>
          <h1 id="dashboard-title">{currentSession.title}</h1>
          <p className="lead">{currentSession.goal}</p>
          <div className="meta-row">
            <span>
              <CalendarDays size={16} aria-hidden="true" />
              {formatDateTime(currentSession.date, currentSession.startTime, currentSession.endTime)}
            </span>
            <span>
              <Presentation size={16} aria-hidden="true" />
              발표자 {currentPresenters}
            </span>
          </div>
        </div>
        <div className="dashboard-actions" aria-label="주요 이동">
          <button className="primary-button" type="button" onClick={() => onNavigate('compose')}>
            <FileText size={18} aria-hidden="true" />
            자료 작성
          </button>
          <button className="secondary-button" type="button" onClick={() => onNavigate('tools')}>
            <ClipboardList size={18} aria-hidden="true" />
            운영 도구
          </button>
        </div>
      </section>

      <section className="summary-strip" aria-label="핵심 상태">
        <SummaryItem icon={<Flag size={18} />} label="회차" value={`${currentSession.id}회차`} />
        <SummaryItem icon={<Users size={18} />} label="인원" value={`${users.filter((user) => user.active).length}명`} />
        <SummaryItem icon={<TrendingUp size={18} />} label="진도" value={`${progressPercent}%`} />
        <SummaryItem icon={<Coins size={18} />} label="벌칙" value={`${openPenalties.length}건`} />
      </section>

      <div className="dashboard-focus">
        <section className="panel" aria-labelledby="agenda-title">
          <div className="section-heading">
            <ClipboardList size={18} aria-hidden="true" />
            <h2 id="agenda-title">오늘 볼 것</h2>
          </div>
          <ol className="agenda-list">
            {currentSession.agenda.slice(0, 4).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
          <div className="resource-list">
            {currentSession.resources.map((resource) => (
              <a key={resource} href={githubEditUrl(resource)} target="_blank" rel="noreferrer">
                {resource}
              </a>
            ))}
          </div>
        </section>

        <section className="panel" aria-labelledby="status-title">
          <div className="section-heading">
            <TrendingUp size={18} aria-hidden="true" />
            <h2 id="status-title">운영 상태</h2>
          </div>
          <div className="status-list">
            <div className="status-row">
              <span>진도</span>
              <strong>{currentSession.progress.current}/{currentSession.progress.target} {currentSession.progress.unit}</strong>
            </div>
            <div
              className="progress-track"
              role="progressbar"
              aria-label={`${currentSession.progress.label} ${progressPercent}%`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercent}
            >
              <span style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="status-row">
              <span>미정산 벌칙</span>
              <strong>{openPenalties.length}건 · {totalPenaltyAmount.toLocaleString('ko-KR')}원</strong>
            </div>
            <div className="status-row">
              <span>다음 일정</span>
              <strong>{nextSession ? `${formatDate(nextSession.date)} · ${nextSession.title}` : '미정'}</strong>
            </div>
          </div>
        </section>
      </div>

      <section className="panel wide-panel" aria-labelledby="recent-title">
        <div className="section-heading">
          <BookOpen size={18} aria-hidden="true" />
          <h2 id="recent-title">최근 변경 자료</h2>
        </div>
        <div className="recent-grid">
          {recentDocs.slice(0, 3).map((doc) => (
            <article className="doc-card" key={doc.id}>
              <div className="split-line">
                <StatusBadge label={doc.kind === 'material' ? '자료' : '발표'} />
                <span>{doc.updatedAt ?? doc.createdAt}</span>
              </div>
              <h3>{doc.title}</h3>
              <p>{doc.summary || doc.path}</p>
              <span className="path-chip">{doc.path}</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function SummaryItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <article className="summary-item">
      <span aria-hidden="true">{icon}</span>
      <b>{value}</b>
      <small>{label}</small>
    </article>
  );
}
