import {
  CalendarPlus,
  Check,
  Dice5,
  FileText,
  Link2,
  Pencil,
  Save,
  Trash2,
  UserPlus,
  Users
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type {
  MemberDraft,
  MemberRole,
  MemberUpdateDraft,
  SessionDraft,
  StudyData,
  StudyDocument,
  StudyMember,
  StudySession
} from '../types';
import { formatDate, formatDateRange, formatTimeRange, todayIso } from '../utils/dates';
import { slugifyFileName } from '../utils/path';
import { StatusBadge } from './StatusBadge';

type OperationsSection = 'connection' | 'members' | 'sessions';

type MemberFormDraft = {
  inviteEmail: string;
  displayName: string;
  role: MemberRole;
};

type OperationsProps = {
  data: StudyData;
  canManage: boolean;
  isDemo: boolean;
  onAddMember: (draft: MemberDraft) => Promise<void>;
  onChoosePresenters: (sessionId: number, presenterIds: string[]) => Promise<void>;
  onDeleteMember: (memberId: string) => Promise<void>;
  onDeleteSession: (sessionId: number) => Promise<void>;
  onEndSession: (sessionId: number) => Promise<void>;
  onSaveSession: (draft: SessionDraft) => Promise<void>;
  onStartSession: (draft: SessionDraft) => Promise<void>;
  onUpdateMember: (draft: MemberUpdateDraft) => Promise<void>;
};

const operationSections: Array<{ key: OperationsSection; label: string; icon: React.ReactNode }> = [
  { key: 'connection', label: '연결', icon: <Link2 size={18} aria-hidden="true" /> },
  { key: 'members', label: '참여자', icon: <Users size={18} aria-hidden="true" /> },
  { key: 'sessions', label: '회차 관리', icon: <CalendarPlus size={18} aria-hidden="true" /> }
];

const emptyMemberForm: MemberFormDraft = {
  inviteEmail: '',
  displayName: '',
  role: 'member'
};

export function Operations({
  data,
  canManage,
  isDemo,
  onAddMember,
  onChoosePresenters,
  onDeleteMember,
  onDeleteSession,
  onEndSession,
  onSaveSession,
  onStartSession,
  onUpdateMember
}: OperationsProps) {
  const currentSession = getCurrentSession(data.sessions);
  const orderedSessions = useMemo(() => data.sessions.slice().sort((left, right) => left.week - right.week), [data.sessions]);
  const activeMembers = data.members.filter((member) => member.active);
  const currentProject = data.projects.find((project) => project.status === 'current') ?? data.projects[0] ?? null;

  const [section, setSection] = useState<OperationsSection>('connection');
  const [status, setStatus] = useState('');
  const [selectedCandidateIds, setSelectedCandidateIds] = useState(() => activeMembers.map((member) => member.id));
  const [winnerIds, setWinnerIds] = useState<string[]>(currentSession?.presenterMemberIds ?? []);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(currentSession?.id ?? orderedSessions[0]?.id ?? null);
  const selectedSession = orderedSessions.find((session) => session.id === selectedSessionId) ?? currentSession ?? orderedSessions[0] ?? null;
  const [sessionDraft, setSessionDraft] = useState<SessionDraft>(() => selectedSession ? toSessionDraft(selectedSession) : createSessionDraft(1, currentProject?.id ?? null));
  const [memberForm, setMemberForm] = useState<MemberFormDraft>(emptyMemberForm);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [memberEditDraft, setMemberEditDraft] = useState<MemberUpdateDraft | null>(null);

  const isCurrentSessionSelected = Boolean(selectedSession && currentSession && selectedSession.id === currentSession.id);
  const nextWeek = Math.max(...data.sessions.map((session) => session.week), 0) + 1;
  const presenterNames = winnerIds.map((id) => memberName(data.members, id)).join(', ') || '당일 추첨 전';
  const selectedSessionPresenters = selectedSession?.presenterMemberIds.map((id) => memberName(data.members, id)).join(', ') || '당일 추첨 전';
  const selectedSessionPresentations = selectedSession ? presentationsForSession(data.documents, selectedSession) : [];
  const unmatchedResources = selectedSession ? selectedSession.resources.filter((path) => !selectedSessionPresentations.some((document) => document.path === path)) : [];
  const sessionProject = data.projects.find((project) => project.id === sessionDraft.projectId) ?? null;

  useEffect(() => {
    if (!selectedSession) {
      return;
    }

    setSessionDraft(toSessionDraft(selectedSession));
  }, [selectedSession]);

  useEffect(() => {
    setWinnerIds(currentSession?.presenterMemberIds ?? []);
  }, [currentSession]);

  useEffect(() => {
    const activeIds = new Set(data.members.filter((member) => member.active).map((member) => member.id));
    setSelectedCandidateIds((current) => {
      const retained = current.filter((id) => activeIds.has(id));
      return retained.length > 0 ? retained : [...activeIds];
    });
  }, [data.members]);

  useEffect(() => {
    if (selectedSessionId && orderedSessions.some((session) => session.id === selectedSessionId)) {
      return;
    }

    setSelectedSessionId(currentSession?.id ?? orderedSessions[0]?.id ?? null);
  }, [currentSession, orderedSessions, selectedSessionId]);

  function toggleCandidate(memberId: string) {
    setSelectedCandidateIds((current) => (
      current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId]
    ));
  }

  function drawPresenter() {
    if (selectedCandidateIds.length === 0) {
      setWinnerIds([]);
      return;
    }

    const random = crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
    const winner = selectedCandidateIds[Math.floor(random * selectedCandidateIds.length)];
    setWinnerIds([winner]);
  }

  async function savePresenters() {
    if (!currentSession) {
      setStatus('진행 중인 회차가 없습니다.');
      return;
    }

    await run('발표자를 저장했습니다.', () => onChoosePresenters(currentSession.id, winnerIds));
  }

  async function addMember() {
    const inviteEmail = memberForm.inviteEmail.trim();
    const displayName = memberForm.displayName.trim();
    const memberUid = uniqueMemberUid(inviteEmail, displayName, data.members);

    await run('참여자를 추가했습니다.', async () => {
      await onAddMember({
        memberUid,
        displayName,
        inviteEmail,
        githubUsername: '',
        role: memberForm.role,
        roleLabel: roleLabel(memberForm.role),
        color: '#0f766e'
      });
      setMemberForm(emptyMemberForm);
    });
  }

  function startEditingMember(member: StudyMember) {
    setEditingMemberId(member.id);
    setMemberEditDraft({
      id: member.id,
      displayName: member.displayName,
      role: member.role
    });
  }

  async function saveMemberEdit() {
    if (!memberEditDraft) {
      return;
    }

    await run('참여자를 수정했습니다.', async () => {
      await onUpdateMember(memberEditDraft);
      setEditingMemberId(null);
      setMemberEditDraft(null);
    });
  }

  async function removeMember(memberId: string) {
    await run('참여자를 삭제했습니다.', () => onDeleteMember(memberId));
  }

  async function saveSession() {
    await run(isCurrentSessionSelected ? '현재 회차를 저장했습니다.' : '회차를 수정했습니다.', () => onSaveSession(sessionDraft));
  }

  async function endSession() {
    if (!selectedSession) {
      return;
    }

    await run('회차를 종료했습니다.', () => onEndSession(selectedSession.id));
  }

  async function removeSession() {
    if (!selectedSession) {
      return;
    }

    await run('회차를 삭제했습니다.', async () => {
      await onDeleteSession(selectedSession.id);
      setSelectedSessionId(orderedSessions.find((session) => session.id !== selectedSession.id)?.id ?? null);
    });
  }

  async function startNextSession() {
    const baseDate = todayIso();
    const baseDraft = selectedSession ? sessionDraft : createSessionDraft(nextWeek, currentProject?.id ?? null);
    await run('새 회차를 시작했습니다.', async () => {
      await onStartSession({
        ...baseDraft,
        id: undefined,
        title: `${nextWeek}회차`,
        week: nextWeek,
        status: 'current',
        projectId: currentProject?.id ?? sessionDraft.projectId,
        projectProgress: 0,
        startsOn: baseDate,
        endsOn: baseDate,
        presentationOn: baseDate,
        agenda: ['진도 점검', '당일 발표자 추첨', '발표', '다음 액션 정리']
      });
      setSelectedSessionId(null);
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
    <div className="operations-page">
      <section className="operations-header">
        <div>
          <p className="eyebrow">운영</p>
          <h1>스터디 운영 보드</h1>
        </div>
        <StatusBox canManage={canManage} />
      </section>

      <div className="operations-layout">
        <aside className="operations-rail" aria-label="운영 메뉴">
          {operationSections.map((item) => (
            <button
              className={section === item.key ? 'operation-nav-item operation-nav-item--active' : 'operation-nav-item'}
              key={item.key}
              type="button"
              aria-current={section === item.key ? 'page' : undefined}
              onClick={() => setSection(item.key)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </aside>

        <div className="operations-content">
          {section === 'connection' ? (
            <section className="tool-panel" aria-labelledby="health-title">
              <div className="section-heading">
                <Check size={18} aria-hidden="true" />
                <h2 id="health-title">Supabase 연결 상태</h2>
              </div>
              <div className="connection-grid">
                <div className="connection-card">
                  <span>상태</span>
                  <strong>{isDemo ? '데모 데이터' : '연결됨'}</strong>
                </div>
                <div className="connection-card">
                  <span>현재 사용자</span>
                  <strong>{data.currentMember?.displayName ?? '인증 전'}</strong>
                </div>
                <div className="connection-card">
                  <span>참여자</span>
                  <strong>{activeMembers.length}명</strong>
                </div>
                <div className="connection-card">
                  <span>회차</span>
                  <strong>{data.sessions.length}개</strong>
                </div>
                <div className="connection-card">
                  <span>문서</span>
                  <strong>{data.documents.length}개</strong>
                </div>
                <div className="connection-card">
                  <span>권한</span>
                  <strong>{canManage ? '운영 가능' : '보기 전용'}</strong>
                </div>
              </div>
            </section>
          ) : null}

          {section === 'members' ? (
            <section className="tool-panel" aria-labelledby="member-title">
              <div className="section-heading">
                <UserPlus size={18} aria-hidden="true" />
                <h2 id="member-title">참여자</h2>
              </div>

              <div className="member-management-grid">
                <div className="member-form-panel" aria-label="참여자 추가">
                  <div className="form-grid">
                    <label>
                      GitHub 이메일
                      <input
                        value={memberForm.inviteEmail}
                        onChange={(event) => setMemberForm({ ...memberForm, inviteEmail: event.target.value })}
                        type="email"
                        disabled={!canManage}
                      />
                    </label>
                    <label>
                      표시 이름
                      <input
                        value={memberForm.displayName}
                        onChange={(event) => setMemberForm({ ...memberForm, displayName: event.target.value })}
                        disabled={!canManage}
                      />
                    </label>
                  </div>
                  <label>
                    권한
                    <select value={memberForm.role} onChange={(event) => setMemberForm({ ...memberForm, role: event.target.value as MemberRole })} disabled={!canManage}>
                      <option value="member">스터디원</option>
                      <option value="facilitator">진행자</option>
                      <option value="admin">관리자</option>
                      <option value="owner">운영자</option>
                    </select>
                  </label>
                  <button
                    className="primary-button fit-button"
                    type="button"
                    onClick={() => void addMember()}
                    disabled={!canManage || !memberForm.inviteEmail.trim() || !memberForm.displayName.trim()}
                  >
                    <UserPlus size={18} aria-hidden="true" />
                    참여자 추가
                  </button>
                </div>

                <div className="member-list" aria-label="참여자 목록">
                  {data.members.map((member) => {
                    const isEditing = editingMemberId === member.id && memberEditDraft;
                    const isSelf = data.currentMember?.id === member.id;

                    return (
                      <article className="member-row" key={member.id}>
                        {isEditing ? (
                          <>
                            <div className="member-edit-grid">
                              <label>
                                표시 이름
                                <input
                                  value={memberEditDraft.displayName}
                                  onChange={(event) => setMemberEditDraft({ ...memberEditDraft, displayName: event.target.value })}
                                  disabled={!canManage}
                                />
                              </label>
                              <label>
                                권한
                                <select
                                  value={memberEditDraft.role}
                                  onChange={(event) => setMemberEditDraft({ ...memberEditDraft, role: event.target.value as MemberRole })}
                                  disabled={!canManage}
                                >
                                  <option value="member">스터디원</option>
                                  <option value="facilitator">진행자</option>
                                  <option value="admin">관리자</option>
                                  <option value="owner">운영자</option>
                                </select>
                              </label>
                            </div>
                            <div className="member-actions">
                              <button className="primary-button" type="button" onClick={() => void saveMemberEdit()} disabled={!canManage || !memberEditDraft.displayName.trim()}>
                                <Save size={18} aria-hidden="true" />
                                저장
                              </button>
                              <button className="secondary-button" type="button" onClick={() => { setEditingMemberId(null); setMemberEditDraft(null); }}>
                                취소
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="member-summary">
                              <strong>{member.displayName}</strong>
                              <span>{member.inviteEmail ?? '이메일 없음'}</span>
                              <div className="tag-row">
                                <StatusBadge label={roleLabel(member.role)} tone={member.active ? 'neutral' : 'danger'} />
                                {member.githubUsername ? <span className="status-badge">{member.githubUsername}</span> : null}
                              </div>
                            </div>
                            <div className="member-actions">
                              <button className="secondary-button" type="button" onClick={() => startEditingMember(member)} disabled={!canManage}>
                                <Pencil size={18} aria-hidden="true" />
                                수정
                              </button>
                              <button className="danger-button" type="button" onClick={() => void removeMember(member.id)} disabled={!canManage || isSelf}>
                                <Trash2 size={18} aria-hidden="true" />
                                삭제
                              </button>
                            </div>
                          </>
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>
          ) : null}

          {section === 'sessions' ? (
            <section className="tool-panel" aria-labelledby="session-title">
              <div className="section-heading">
                <CalendarPlus size={18} aria-hidden="true" />
                <h2 id="session-title">회차 관리</h2>
              </div>

              <div className="session-management-layout">
                <div className="session-list" aria-label="회차 목록">
                  {orderedSessions.map((session) => (
                    <button
                      className={selectedSession?.id === session.id ? 'session-list-item session-list-item--active' : 'session-list-item'}
                      key={session.id}
                      type="button"
                      onClick={() => setSelectedSessionId(session.id)}
                    >
                      <span>{session.week}회차</span>
                      <strong>{session.title}</strong>
                      <small>{statusLabel(session.status)} · {formatDate(session.presentationOn)}</small>
                    </button>
                  ))}
                </div>

                {selectedSession ? (
                  <div className="session-detail">
                    <div className="session-detail-head">
                      <div>
                        <p className="eyebrow">{isCurrentSessionSelected ? '현재 회차' : `${selectedSession.week}회차`}</p>
                        <h3>{selectedSession.title}</h3>
                        <span>{formatDateRange(selectedSession.startsOn, selectedSession.endsOn)} · {formatTimeRange(selectedSession.startTime, selectedSession.endTime)}</span>
                      </div>
                      <StatusBadge label={statusLabel(selectedSession.status)} tone={selectedSession.status === 'current' ? 'current' : selectedSession.status === 'done' ? 'done' : undefined} />
                    </div>

                    {isCurrentSessionSelected ? (
                      <div className="presenter-draw-panel" aria-labelledby="draw-title">
                        <div className="section-heading">
                          <Dice5 size={18} aria-hidden="true" />
                          <h3 id="draw-title">발표자 뽑기</h3>
                        </div>
                        <div className="checkbox-grid">
                          {activeMembers.map((member) => (
                            <label className="check-row" key={member.id}>
                              <input type="checkbox" checked={selectedCandidateIds.includes(member.id)} onChange={() => toggleCandidate(member.id)} />
                              <span>{member.displayName}</span>
                            </label>
                          ))}
                        </div>
                        <div className="tool-actions">
                          <button className="primary-button" type="button" onClick={drawPresenter}>
                            <Dice5 size={18} aria-hidden="true" />
                            뽑기
                          </button>
                          <button className="secondary-button" type="button" onClick={() => void savePresenters()} disabled={!canManage}>
                            <Save size={18} aria-hidden="true" />
                            결과 저장
                          </button>
                        </div>
                        <p className="winner-box">{presenterNames}</p>
                      </div>
                    ) : (
                      <div className="status-row">
                        <span>발표자</span>
                        <strong>{selectedSessionPresenters}</strong>
                      </div>
                    )}

                    <div className="form-grid">
                      <label>
                        프로젝트
                        <select value={sessionDraft.projectId ?? ''} onChange={(event) => setSessionDraft({ ...sessionDraft, projectId: event.target.value ? Number(event.target.value) : null })} disabled={!canManage}>
                          <option value="">미지정</option>
                          {data.projects.map((project) => (
                            <option key={project.id} value={project.id}>{project.title}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        제목
                        <input value={sessionDraft.title} onChange={(event) => setSessionDraft({ ...sessionDraft, title: event.target.value })} disabled={!canManage} />
                      </label>
                    </div>
                    <div className="form-grid">
                      <label>
                        상태
                        <select value={sessionDraft.status} onChange={(event) => setSessionDraft({ ...sessionDraft, status: event.target.value as StudySession['status'] })} disabled={!canManage}>
                          <option value="planned">계획</option>
                          <option value="upcoming">예정</option>
                          <option value="current">진행 중</option>
                          <option value="done">종료</option>
                        </select>
                      </label>
                      <label>
                        {sessionProject?.type === 'free' ? '프로젝트 진척도 (%)' : '진행 페이지 수'}
                        <input value={sessionDraft.projectProgress} onChange={(event) => setSessionDraft({ ...sessionDraft, projectProgress: Number(event.target.value) })} type="number" min={0} max={sessionProject?.type === 'free' ? 100 : undefined} disabled={!canManage} />
                      </label>
                    </div>
                    <div className="form-grid">
                      <label>
                        시작일
                        <input value={sessionDraft.startsOn} onChange={(event) => setSessionDraft({ ...sessionDraft, startsOn: event.target.value })} type="date" disabled={!canManage} />
                      </label>
                      <label>
                        종료일
                        <input value={sessionDraft.endsOn} onChange={(event) => setSessionDraft({ ...sessionDraft, endsOn: event.target.value })} type="date" disabled={!canManage} />
                      </label>
                    </div>
                    <div className="form-grid">
                      <label>
                        발표일
                        <input value={sessionDraft.presentationOn} onChange={(event) => setSessionDraft({ ...sessionDraft, presentationOn: event.target.value })} type="date" disabled={!canManage} />
                      </label>
                      <label>
                        진행자
                        <select value={sessionDraft.facilitatorMemberId ?? ''} onChange={(event) => setSessionDraft({ ...sessionDraft, facilitatorMemberId: event.target.value || null })} disabled={!canManage}>
                          <option value="">미정</option>
                          {activeMembers.map((member) => (
                            <option key={member.id} value={member.id}>{member.displayName}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="form-grid">
                      <label>
                        시작 시간
                        <input value={sessionDraft.startTime} onChange={(event) => setSessionDraft({ ...sessionDraft, startTime: event.target.value })} type="time" disabled={!canManage} />
                      </label>
                      <label>
                        종료 시간
                        <input value={sessionDraft.endTime} onChange={(event) => setSessionDraft({ ...sessionDraft, endTime: event.target.value })} type="time" disabled={!canManage} />
                      </label>
                    </div>
                    <label>
                      장소
                      <input value={sessionDraft.location} onChange={(event) => setSessionDraft({ ...sessionDraft, location: event.target.value })} disabled={!canManage} />
                    </label>
                    <label>
                      목표
                      <textarea value={sessionDraft.goal} onChange={(event) => setSessionDraft({ ...sessionDraft, goal: event.target.value })} rows={3} disabled={!canManage} />
                    </label>
                    <label>
                      안건
                      <textarea value={sessionDraft.agenda.join('\n')} onChange={(event) => setSessionDraft({ ...sessionDraft, agenda: event.target.value.split('\n').map((line) => line.trim()).filter(Boolean) })} rows={4} disabled={!canManage} />
                    </label>

                    <section className="presentation-list-panel" aria-labelledby="presentation-materials-title">
                      <div className="section-heading">
                        <FileText size={18} aria-hidden="true" />
                        <h3 id="presentation-materials-title">발표 자료</h3>
                      </div>
                      <div className="presentation-list">
                        {selectedSessionPresentations.map((document) => (
                          <article className="presentation-item" key={document.id}>
                            <strong>{document.title}</strong>
                            <span>{memberName(data.members, document.ownerMemberId)} · {formatDate(document.updatedAt.slice(0, 10))}</span>
                            {document.summary ? <p>{document.summary}</p> : null}
                            <code>{document.path}</code>
                          </article>
                        ))}
                        {unmatchedResources.map((path) => (
                          <article className="presentation-item" key={path}>
                            <strong>{path.split('/').at(-1)?.replace(/\.md$/, '') ?? path}</strong>
                            <span>회차 리소스</span>
                            <code>{path}</code>
                          </article>
                        ))}
                        {selectedSessionPresentations.length === 0 && unmatchedResources.length === 0 ? (
                          <p className="empty-state">발표 자료가 없습니다.</p>
                        ) : null}
                      </div>
                    </section>

                    <div className="tool-actions">
                      <button className="primary-button" type="button" onClick={() => void saveSession()} disabled={!canManage}>
                        <Save size={18} aria-hidden="true" />
                        {isCurrentSessionSelected ? '회차 저장' : '수정'}
                      </button>
                      <button className="secondary-button" type="button" onClick={() => void startNextSession()} disabled={!canManage}>
                        <CalendarPlus size={18} aria-hidden="true" />
                        새 회차 시작
                      </button>
                      <button className="secondary-button" type="button" onClick={() => void endSession()} disabled={!canManage || selectedSession.status === 'done'}>
                        종료
                      </button>
                      <button className="danger-button" type="button" onClick={() => void removeSession()} disabled={!canManage}>
                        <Trash2 size={18} aria-hidden="true" />
                        삭제
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="empty-action-panel">
                    <p className="empty-state">회차가 없습니다.</p>
                    <button className="primary-button fit-button" type="button" onClick={() => void startNextSession()} disabled={!canManage}>
                      <CalendarPlus size={18} aria-hidden="true" />
                      새 회차 시작
                    </button>
                  </div>
                )}
              </div>
            </section>
          ) : null}

          {status ? <p className="form-status">{status}</p> : null}
        </div>
      </div>
    </div>
  );
}

function StatusBox({ canManage }: { canManage: boolean }) {
  return <span className={canManage ? 'permission-badge permission-badge--ok' : 'permission-badge'}>{canManage ? '운영 가능' : '보기 전용'}</span>;
}

function getCurrentSession(sessions: StudySession[]): StudySession | null {
  return sessions.find((session) => session.status === 'current') ??
    sessions.find((session) => session.status === 'upcoming') ??
    sessions[0] ??
    null;
}

function toSessionDraft(session: StudySession): SessionDraft {
  return {
    id: session.id,
    projectId: session.projectId,
    title: session.title,
    week: session.week,
    status: session.status,
    startsOn: session.startsOn,
    endsOn: session.endsOn,
    presentationOn: session.presentationOn,
    startTime: session.startTime,
    endTime: session.endTime,
    location: session.location,
    goal: session.goal,
    facilitatorMemberId: session.facilitatorMemberId,
    agenda: session.agenda,
    projectProgress: session.projectProgress
  };
}

function createSessionDraft(week: number, projectId: number | null): SessionDraft {
  const today = todayIso();

  return {
    projectId,
    title: `${week}회차`,
    week,
    status: 'planned',
    startsOn: today,
    endsOn: today,
    presentationOn: today,
    startTime: '20:00',
    endTime: '21:30',
    location: 'Discord',
    goal: '',
    facilitatorMemberId: null,
    agenda: [],
    projectProgress: 0
  };
}

function memberName(members: StudyMember[], memberId?: string | null): string {
  if (!memberId) {
    return '공유';
  }

  return members.find((member) => member.id === memberId)?.displayName ?? memberId;
}

function presentationsForSession(documents: StudyDocument[], session: StudySession): StudyDocument[] {
  return documents
    .filter((document) => document.kind === 'presentation' && document.sessionId === session.id)
    .sort((left, right) => left.title.localeCompare(right.title));
}

function uniqueMemberUid(inviteEmail: string, displayName: string, members: StudyMember[]): string {
  const source = inviteEmail.split('@')[0] || displayName || 'member';
  const base = slugifyFileName(source).replace(/[^a-z0-9_-]/g, '') || 'member';
  const existing = new Set(members.map((member) => member.memberUid));

  if (!existing.has(base)) {
    return base;
  }

  let index = 2;
  while (existing.has(`${base}-${index}`)) {
    index += 1;
  }

  return `${base}-${index}`;
}

function roleLabel(role: MemberRole): string {
  if (role === 'owner') return '운영자';
  if (role === 'admin') return '관리자';
  if (role === 'facilitator') return '진행자';
  return '스터디원';
}

function statusLabel(status: StudySession['status']): string {
  if (status === 'current') return '진행 중';
  if (status === 'done') return '종료';
  if (status === 'upcoming') return '예정';
  return '계획';
}
