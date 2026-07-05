import { CalendarPlus, Check, Dice5, Save, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { MemberDraft, SessionDraft, StudyData, StudyMember, StudySession } from '../types';
import { todayIso } from '../utils/dates';

type OperationsProps = {
  data: StudyData;
  canManage: boolean;
  onAddMember: (draft: MemberDraft) => Promise<void>;
  onChoosePresenters: (sessionId: number, presenterIds: string[]) => Promise<void>;
  onEndSession: (sessionId: number) => Promise<void>;
  onSaveSession: (draft: SessionDraft) => Promise<void>;
  onStartSession: (draft: SessionDraft) => Promise<void>;
};

export function Operations({
  data,
  canManage,
  onAddMember,
  onChoosePresenters,
  onEndSession,
  onSaveSession,
  onStartSession
}: OperationsProps) {
  const currentSession = getCurrentSession(data.sessions);
  const [status, setStatus] = useState('');
  const [selectedCandidateIds, setSelectedCandidateIds] = useState(() => data.members.filter((member) => member.active).map((member) => member.id));
  const [winnerIds, setWinnerIds] = useState<string[]>(currentSession.presenterMemberIds);
  const [selectedSessionId, setSelectedSessionId] = useState(currentSession.id);
  const selectedSession = data.sessions.find((session) => session.id === selectedSessionId) ?? currentSession;
  const [sessionDraft, setSessionDraft] = useState<SessionDraft>(() => toSessionDraft(selectedSession));
  const [memberDraft, setMemberDraft] = useState<MemberDraft>({
    memberUid: '',
    displayName: '',
    inviteEmail: '',
    githubUsername: '',
    role: 'member',
    roleLabel: '스터디원',
    color: '#0f766e'
  });

  useEffect(() => {
    setSessionDraft(toSessionDraft(selectedSession));
    setWinnerIds(selectedSession.presenterMemberIds);
  }, [selectedSession]);

  const activeMembers = data.members.filter((member) => member.active);
  const nextWeek = Math.max(...data.sessions.map((session) => session.week), 0) + 1;
  const presenterNames = winnerIds.map((id) => memberName(data.members, id)).join(', ') || '당일 추첨 전';

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
    await run('발표자를 저장했습니다.', () => onChoosePresenters(selectedSession.id, winnerIds));
  }

  async function addMember() {
    await run('참여자를 추가했습니다.', async () => {
      await onAddMember(memberDraft);
      setMemberDraft({
        memberUid: '',
        displayName: '',
        inviteEmail: '',
        githubUsername: '',
        role: 'member',
        roleLabel: '스터디원',
        color: '#0f766e'
      });
    });
  }

  async function saveSession() {
    await run('회차를 저장했습니다.', () => onSaveSession(sessionDraft));
  }

  async function endSession() {
    await run('회차를 종료했습니다.', () => onEndSession(selectedSession.id));
  }

  async function startNextSession() {
    const baseDate = todayIso();
    await run('새 회차를 시작했습니다.', () => onStartSession({
      ...sessionDraft,
      id: undefined,
      title: `${nextWeek}회차`,
      week: nextWeek,
      status: 'current',
      startsOn: baseDate,
      endsOn: baseDate,
      presentationOn: baseDate,
      agenda: ['진도 점검', '당일 발표자 추첨', '발표', '다음 액션 정리']
    }));
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
          <p className="lead">참여자, 발표자 추첨, 회차 기간과 발표일을 Supabase에 직접 반영합니다.</p>
        </div>
        <StatusBox canManage={canManage} />
      </section>

      <div className="tool-grid">
        <section className="tool-panel" aria-labelledby="health-title">
          <div className="section-heading">
            <Check size={18} aria-hidden="true" />
            <h2 id="health-title">데이터 상태</h2>
          </div>
          <div className="compact-health">
            <b>Supabase 연결</b>
            <span>참여자 {activeMembers.length}명 · 회차 {data.sessions.length}개 · 문서 {data.documents.length}개</span>
          </div>
        </section>

        <section className="tool-panel" aria-labelledby="member-title">
          <div className="section-heading">
            <UserPlus size={18} aria-hidden="true" />
            <h2 id="member-title">참여자 추가</h2>
          </div>
          <div className="form-grid">
            <label>
              멤버 ID
              <input value={memberDraft.memberUid} onChange={(event) => setMemberDraft({ ...memberDraft, memberUid: event.target.value })} disabled={!canManage} />
            </label>
            <label>
              이름
              <input value={memberDraft.displayName} onChange={(event) => setMemberDraft({ ...memberDraft, displayName: event.target.value })} disabled={!canManage} />
            </label>
          </div>
          <div className="form-grid">
            <label>
              초대 이메일
              <input value={memberDraft.inviteEmail} onChange={(event) => setMemberDraft({ ...memberDraft, inviteEmail: event.target.value })} type="email" disabled={!canManage} />
            </label>
            <label>
              GitHub ID
              <input value={memberDraft.githubUsername} onChange={(event) => setMemberDraft({ ...memberDraft, githubUsername: event.target.value })} disabled={!canManage} />
            </label>
          </div>
          <div className="form-grid">
            <label>
              권한
              <select value={memberDraft.role} onChange={(event) => setMemberDraft({ ...memberDraft, role: event.target.value as MemberDraft['role'] })} disabled={!canManage}>
                <option value="member">스터디원</option>
                <option value="facilitator">진행자</option>
                <option value="admin">관리자</option>
                <option value="owner">운영자</option>
              </select>
            </label>
            <label>
              색상
              <input value={memberDraft.color} onChange={(event) => setMemberDraft({ ...memberDraft, color: event.target.value })} type="color" disabled={!canManage} />
            </label>
          </div>
          <button className="primary-button" type="button" onClick={() => void addMember()} disabled={!canManage || !memberDraft.memberUid.trim() || !memberDraft.displayName.trim()}>
            <UserPlus size={18} aria-hidden="true" />
            참여자 추가
          </button>
        </section>

        <section className="tool-panel" aria-labelledby="draw-title">
          <div className="section-heading">
            <Dice5 size={18} aria-hidden="true" />
            <h2 id="draw-title">발표자 뽑기</h2>
          </div>
          <label>
            대상 회차
            <select value={selectedSessionId} onChange={(event) => setSelectedSessionId(Number(event.target.value))}>
              {data.sessions.map((session) => (
                <option key={session.id} value={session.id}>{session.week}회차 · {session.title}</option>
              ))}
            </select>
          </label>
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
        </section>

        <section className="tool-panel tool-panel--wide" aria-labelledby="session-title">
          <div className="section-heading">
            <CalendarPlus size={18} aria-hidden="true" />
            <h2 id="session-title">회차 관리</h2>
          </div>
          <label>
            회차 선택
            <select value={selectedSessionId} onChange={(event) => setSelectedSessionId(Number(event.target.value))}>
              {data.sessions.map((session) => (
                <option key={session.id} value={session.id}>{session.week}회차 · {session.title}</option>
              ))}
            </select>
          </label>
          <div className="form-grid">
            <label>
              제목
              <input value={sessionDraft.title} onChange={(event) => setSessionDraft({ ...sessionDraft, title: event.target.value })} disabled={!canManage} />
            </label>
            <label>
              상태
              <select value={sessionDraft.status} onChange={(event) => setSessionDraft({ ...sessionDraft, status: event.target.value as StudySession['status'] })} disabled={!canManage}>
                <option value="planned">계획</option>
                <option value="upcoming">예정</option>
                <option value="current">진행 중</option>
                <option value="done">종료</option>
              </select>
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
          <div className="tool-actions">
            <button className="primary-button" type="button" onClick={() => void saveSession()} disabled={!canManage}>
              <Save size={18} aria-hidden="true" />
              회차 저장
            </button>
            <button className="secondary-button" type="button" onClick={() => void startNextSession()} disabled={!canManage}>
              <CalendarPlus size={18} aria-hidden="true" />
              새 회차 시작
            </button>
            <button className="danger-button" type="button" onClick={() => void endSession()} disabled={!canManage || selectedSession.status === 'done'}>
              회차 종료
            </button>
          </div>
        </section>
      </div>

      {status ? <p className="form-status">{status}</p> : null}
    </div>
  );
}

function StatusBox({ canManage }: { canManage: boolean }) {
  return <span className={canManage ? 'permission-badge permission-badge--ok' : 'permission-badge'}>{canManage ? '운영 가능' : '보기 전용'}</span>;
}

function getCurrentSession(sessions: StudySession[]): StudySession {
  return sessions.find((session) => session.status === 'current') ??
    sessions.find((session) => session.status === 'upcoming') ??
    sessions[0];
}

function toSessionDraft(session: StudySession): SessionDraft {
  return {
    id: session.id,
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
    agenda: session.agenda
  };
}

function memberName(members: StudyMember[], memberId: string): string {
  return members.find((member) => member.id === memberId)?.displayName ?? memberId;
}

