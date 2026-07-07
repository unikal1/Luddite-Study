import { BookOpen, CalendarDays, ClipboardList, Presentation, Users } from 'lucide-react';
import type { RouteKey, StudyData, StudyMember, StudyProject, StudySession } from '../types';
import { formatDate, formatDateRange, formatTimeRange } from '../utils/dates';
import { StatusBadge } from './StatusBadge';

type DashboardProps = {
  data: StudyData;
  onNavigate: (route: RouteKey) => void;
};

export function Dashboard({ data, onNavigate }: DashboardProps) {
  const currentSession = getCurrentSession(data.sessions);
  const currentProject = data.projects.find((project) => project.status === 'current') ??
    data.projects.find((project) => project.id === currentSession.projectId) ??
    data.projects[0] ??
    null;
  const projectSessions = currentProject ? data.sessions.filter((session) => session.projectId === currentProject.id) : [];
  const projectProgressValue = currentProject ? projectProgress(currentProject, projectSessions) : null;
  const activeMembers = data.members.filter((member) => member.active);
  const presenters = currentSession.presenterMemberIds
    .map((id) => findMember(data.members, id)?.displayName)
    .filter(Boolean);

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

      <section className="session-facts" aria-label="핵심 상태">
        <div>
          <span>프로젝트</span>
          <strong>{currentProject?.title ?? '미지정'}</strong>
        </div>
        <div>
          <span>범위</span>
          <strong>{formatDateRange(currentSession.startsOn, currentSession.endsOn)}</strong>
        </div>
        <div>
          <span>발표일</span>
          <strong>{formatDate(currentSession.presentationOn)}</strong>
        </div>
        <div>
          <span>참여자</span>
          <strong>{activeMembers.length}명</strong>
        </div>
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

      <section className="panel wide-panel project-dashboard-panel" aria-labelledby="progress-title">
        <div className="section-heading">
          <Users size={18} aria-hidden="true" />
          <h2 id="progress-title">프로젝트 진도</h2>
        </div>
        {currentProject && projectProgressValue ? (
          <>
            <div className="project-dashboard-summary">
              {currentProject.imageUrl ? <img src={currentProject.imageUrl} alt="" /> : null}
              <div>
                <div className="status-row">
                  <span>{projectTypeLabel(currentProject)}</span>
                  <strong>{projectProgressValue.label}</strong>
                </div>
                <p>{currentProject.goal}</p>
                <div className="progress-track" role="progressbar" aria-label={`프로젝트 진도 ${projectProgressValue.percent}%`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={projectProgressValue.percent}>
                  <span style={{ width: `${projectProgressValue.percent}%` }} />
                </div>
              </div>
            </div>
            <div className="tag-row">
              {projectSessions.map((session) => (
                <StatusBadge key={session.id} label={`${session.week}회차 ${sessionProjectProgressLabel(currentProject, session.projectProgress)}`} tone={session.status === 'current' ? 'current' : session.status === 'done' ? 'done' : undefined} />
              ))}
            </div>
          </>
        ) : (
          <p className="empty-state">진행 중인 프로젝트가 없습니다.</p>
        )}
      </section>
    </div>
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

function projectProgress(project: StudyProject, sessions: StudySession[]) {
  const current = sessions.reduce((sum, session) => sum + session.projectProgress, 0);
  const target = project.type === 'book' ? project.totalPages : 100;
  const safeTarget = Math.max(1, target);
  const percent = Math.min(100, Math.round((current / safeTarget) * 100));
  const label = project.type === 'book' ? `${Math.min(current, safeTarget)}/${safeTarget}p` : `${Math.min(current, 100)}%`;

  return { percent, label };
}

function projectTypeLabel(project: StudyProject): string {
  return project.type === 'book' ? `책 · ${project.title}` : `자율 · ${project.title}`;
}

function sessionProjectProgressLabel(project: StudyProject, value: number): string {
  return project.type === 'book' ? `${value}p` : `${value}%`;
}
