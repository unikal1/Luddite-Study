import { BookOpen, CheckCircle2, Save, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ProjectDraft, StudyData, StudyProject } from '../types';
import { formatDate, formatDateRange, todayIso } from '../utils/dates';
import { StatusBadge } from './StatusBadge';

type ProjectsProps = {
  data: StudyData;
  canManage: boolean;
  onDeleteProject: (projectId: number) => Promise<void>;
  onEndProject: (projectId: number) => Promise<void>;
  onSaveProject: (draft: ProjectDraft) => Promise<void>;
};

export function Projects({ data, canManage, onDeleteProject, onEndProject, onSaveProject }: ProjectsProps) {
  const orderedProjects = useMemo(() => data.projects.slice().sort((left, right) => {
    if (left.status === 'current') return -1;
    if (right.status === 'current') return 1;
    return right.startsOn.localeCompare(left.startsOn);
  }), [data.projects]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | 'new'>(orderedProjects[0]?.id ?? 'new');
  const selectedProject = selectedProjectId === 'new' ? null : orderedProjects.find((project) => project.id === selectedProjectId) ?? null;
  const [draft, setDraft] = useState<ProjectDraft>(() => selectedProject ? toProjectDraft(selectedProject) : newProjectDraft());
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (selectedProject) {
      setDraft(toProjectDraft(selectedProject));
      return;
    }

    setDraft(newProjectDraft());
  }, [selectedProject]);

  const projectSessions = selectedProject
    ? data.sessions.filter((session) => session.projectId === selectedProject.id).sort((left, right) => left.week - right.week)
    : [];
  const progress = selectedProject ? projectProgress(selectedProject, projectSessions) : null;

  async function save() {
    await run(selectedProject ? '프로젝트를 저장했습니다.' : '프로젝트를 만들었습니다.', () => onSaveProject(draft));
  }

  async function endProject() {
    if (!selectedProject) {
      return;
    }

    await run('프로젝트를 종료했습니다.', () => onEndProject(selectedProject.id));
  }

  async function removeProject() {
    if (!selectedProject) {
      return;
    }

    await run('프로젝트를 삭제했습니다.', async () => {
      await onDeleteProject(selectedProject.id);
      setSelectedProjectId(orderedProjects.find((project) => project.id !== selectedProject.id)?.id ?? 'new');
    });
  }

  async function run(successMessage: string, action: () => Promise<void>) {
    if (!canManage) {
      setStatus('운영 권한이 있는 멤버만 저장할 수 있습니다.');
      return;
    }

    setStatus('저장 중입니다.');

    try {
      await action();
      setStatus(successMessage);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '저장에 실패했습니다.');
    }
  }

  return (
    <div className="projects-page">
      <section className="projects-header">
        <div>
          <p className="eyebrow">프로젝트</p>
          <h1>프로젝트와 회차</h1>
        </div>
        <button className="primary-button" type="button" onClick={() => setSelectedProjectId('new')} disabled={!canManage}>
          <BookOpen size={18} aria-hidden="true" />
          새 프로젝트
        </button>
      </section>

      <div className="projects-layout">
        <aside className="project-list" aria-label="프로젝트 목록">
          {orderedProjects.map((project) => {
            const itemProgress = projectProgress(project, data.sessions.filter((session) => session.projectId === project.id));
            return (
              <button
                className={selectedProjectId === project.id ? 'project-list-item project-list-item--active' : 'project-list-item'}
                key={project.id}
                type="button"
                onClick={() => setSelectedProjectId(project.id)}
              >
                <span>{projectTypeLabel(project.type)}</span>
                <strong>{project.title}</strong>
                <small>{statusLabel(project.status)} · {itemProgress.label}</small>
              </button>
            );
          })}
        </aside>

        <section className="project-detail" aria-labelledby="project-detail-title">
          <div className="project-detail-top">
            <div>
              <p className="eyebrow">{selectedProject ? projectTypeLabel(selectedProject.type) : '새 프로젝트'}</p>
              <h2 id="project-detail-title">{draft.title || '프로젝트 이름'}</h2>
              {selectedProject ? <span>{formatDateRange(selectedProject.startsOn, selectedProject.endsOn ?? undefined)}</span> : null}
            </div>
            {selectedProject ? <StatusBadge label={statusLabel(selectedProject.status)} tone={selectedProject.status === 'current' ? 'current' : selectedProject.status === 'done' ? 'done' : undefined} /> : null}
          </div>

          {selectedProject && progress ? (
            <div className="project-progress-card">
              {selectedProject.imageUrl ? <img src={selectedProject.imageUrl} alt="" /> : <div className="project-image-placeholder"><BookOpen size={26} aria-hidden="true" /></div>}
              <div>
                <span>프로젝트 진도</span>
                <strong>{progress.label}</strong>
                <div className="progress-track" role="progressbar" aria-label={`프로젝트 진도 ${progress.percent}%`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent}>
                  <span style={{ width: `${progress.percent}%` }} />
                </div>
              </div>
            </div>
          ) : null}

          <div className="form-grid">
            <label>
              타입
              <select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as ProjectDraft['type'], totalPages: event.target.value === 'free' ? 100 : draft.totalPages })} disabled={!canManage}>
                <option value="book">책</option>
                <option value="free">자율</option>
              </select>
            </label>
            <label>
              상태
              <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as ProjectDraft['status'] })} disabled={!canManage}>
                <option value="planned">계획</option>
                <option value="current">진행 중</option>
                <option value="done">종료</option>
              </select>
            </label>
          </div>
          <label>
            {draft.type === 'book' ? '책 이름' : '프로젝트 이름'}
            <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} disabled={!canManage} />
          </label>
          {draft.type === 'book' ? (
            <label>
              전체 페이지 수
              <input value={draft.totalPages} onChange={(event) => setDraft({ ...draft, totalPages: Number(event.target.value) })} type="number" min={1} disabled={!canManage} />
            </label>
          ) : null}
          <div className="form-grid">
            <label>
              시작일
              <input value={draft.startsOn} onChange={(event) => setDraft({ ...draft, startsOn: event.target.value })} type="date" disabled={!canManage} />
            </label>
            <label>
              종료일
              <input value={draft.endsOn ?? ''} onChange={(event) => setDraft({ ...draft, endsOn: event.target.value || null })} type="date" disabled={!canManage} />
            </label>
          </div>
          <label>
            이미지 URL
            <input value={draft.imageUrl} onChange={(event) => setDraft({ ...draft, imageUrl: event.target.value })} disabled={!canManage} />
          </label>
          <label>
            목표
            <textarea value={draft.goal} onChange={(event) => setDraft({ ...draft, goal: event.target.value })} rows={3} disabled={!canManage} />
          </label>

          {selectedProject ? (
            <section className="project-session-panel" aria-labelledby="project-sessions-title">
              <div className="section-heading">
                <CheckCircle2 size={18} aria-hidden="true" />
                <h3 id="project-sessions-title">연결된 회차</h3>
              </div>
              <div className="project-session-list">
                {projectSessions.map((session) => (
                  <div className="project-session-row" key={session.id}>
                    <div>
                      <strong>{session.week}회차 · {session.title}</strong>
                      <span>{formatDate(session.presentationOn)}</span>
                    </div>
                    <b>{selectedProject.type === 'book' ? `${session.projectProgress}p` : `${session.projectProgress}%`}</b>
                  </div>
                ))}
                {projectSessions.length === 0 ? <p className="empty-state">연결된 회차가 없습니다.</p> : null}
              </div>
            </section>
          ) : null}

          <div className="tool-actions">
            <button className="primary-button" type="button" onClick={() => void save()} disabled={!canManage || !draft.title.trim()}>
              <Save size={18} aria-hidden="true" />
              저장
            </button>
            {selectedProject ? (
              <>
                <button className="secondary-button" type="button" onClick={() => void endProject()} disabled={!canManage || selectedProject.status === 'done'}>
                  종료
                </button>
                <button className="danger-button" type="button" onClick={() => void removeProject()} disabled={!canManage}>
                  <Trash2 size={18} aria-hidden="true" />
                  삭제
                </button>
              </>
            ) : null}
          </div>
          {status ? <p className="form-status">{status}</p> : null}
        </section>
      </div>
    </div>
  );
}

function newProjectDraft(): ProjectDraft {
  const today = todayIso();
  return {
    title: '',
    type: 'book',
    status: 'current',
    totalPages: 1,
    imageUrl: '',
    goal: '',
    startsOn: today,
    endsOn: null
  };
}

function toProjectDraft(project: StudyProject): ProjectDraft {
  return {
    id: project.id,
    title: project.title,
    type: project.type,
    status: project.status,
    totalPages: project.totalPages,
    imageUrl: project.imageUrl,
    goal: project.goal,
    startsOn: project.startsOn,
    endsOn: project.endsOn
  };
}

function projectProgress(project: StudyProject, sessions: StudyData['sessions'][number][]) {
  const current = sessions.reduce((sum, session) => sum + session.projectProgress, 0);
  const target = project.type === 'book' ? project.totalPages : 100;
  const safeTarget = Math.max(1, target);
  const percent = Math.min(100, Math.round((current / safeTarget) * 100));
  const label = project.type === 'book' ? `${Math.min(current, safeTarget)}/${safeTarget}p` : `${Math.min(current, 100)}%`;

  return { current, target: safeTarget, percent, label };
}

function projectTypeLabel(type: StudyProject['type']): string {
  return type === 'book' ? '책' : '자율';
}

function statusLabel(status: StudyProject['status']): string {
  if (status === 'current') return '진행 중';
  if (status === 'done') return '종료';
  return '계획';
}
