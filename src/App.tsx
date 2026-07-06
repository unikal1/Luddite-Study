import { BookOpen, ClipboardList, Gauge, LogOut, Presentation } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AuthPanel } from './components/AuthPanel';
import { BootstrapPanel } from './components/BootstrapPanel';
import { Dashboard } from './components/Dashboard';
import { DocumentWorkspace } from './components/DocumentWorkspace';
import { Operations } from './components/Operations';
import { createDemoData } from './lib/demoData';
import {
  chooseSessionPresenters,
  createBootstrapOwner,
  createFolder,
  deleteDocument,
  loadStudyData,
  markSessionDone,
  saveDocument,
  saveMember,
  saveSession,
  uploadDocumentImage
} from './lib/studyRepository';
import { supabase } from './lib/supabase';
import type { DocumentDraft, DocumentFolder, FolderDraft, MemberDraft, RouteKey, SessionDraft, StudyData, StudyDocument, StudyMember, StudySession } from './types';

const routes: Array<{ key: RouteKey; label: string; icon: React.ReactNode }> = [
  { key: 'dashboard', label: '대시보드', icon: <Gauge size={18} /> },
  { key: 'materials', label: '자료', icon: <BookOpen size={18} /> },
  { key: 'presentations', label: '발표', icon: <Presentation size={18} /> },
  { key: 'operations', label: '운영', icon: <ClipboardList size={18} /> }
];

export default function App() {
  const [route, setRoute] = useState<RouteKey>(() => readRoute());
  const [authSession, setAuthSession] = useState<Session | null>(null);
  const [data, setData] = useState<StudyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [demoMode, setDemoMode] = useState(() => new URLSearchParams(window.location.search).get('demo') === '1');

  const currentMember = data?.currentMember ?? null;
  const canManage = useMemo(() => (
    demoMode || currentMember?.role === 'owner' || currentMember?.role === 'admin' || currentMember?.role === 'facilitator'
  ), [currentMember?.role, demoMode]);
  const canWrite = Boolean(demoMode || currentMember);

  useEffect(() => {
    const onHashChange = () => setRoute(readRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (demoMode) {
      setData(createDemoData());
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data: sessionData }) => {
      if (!mounted) return;
      setAuthSession(sessionData.session);
      if (sessionData.session) {
        void refresh(sessionData.session);
      } else {
        setLoading(false);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setAuthSession(nextSession);
      if (nextSession) {
        void refresh(nextSession);
      } else {
        setData(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
    // The auth subscription owns session changes; re-subscribing on every refresh identity would duplicate listeners.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoMode]);

  async function refresh(session = authSession) {
    if (demoMode) {
      return;
    }

    if (!session) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError('');

    try {
      setData(await loadStudyData(session));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : '데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  function navigate(nextRoute: RouteKey) {
    window.location.hash = nextRoute;
    setRoute(nextRoute);
  }

  async function handleSignOut() {
    if (demoMode) {
      setDemoMode(false);
      window.history.replaceState(null, '', window.location.pathname);
      setData(null);
      return;
    }

    await supabase.auth.signOut();
  }

  async function handleCreateOwner(draft: MemberDraft) {
    if (!authSession) {
      throw new Error('로그인이 필요합니다.');
    }

    await createBootstrapOwner(authSession, draft);
    await refresh(authSession);
  }

  async function handleSaveDocument(draft: DocumentDraft): Promise<StudyDocument> {
    if (demoMode) {
      return mutateDemoDocument(draft);
    }

    if (!currentMember) {
      throw new Error('활성 멤버만 문서를 저장할 수 있습니다.');
    }

    const saved = await saveDocument(draft, currentMember.id);
    await refresh();
    return saved;
  }

  async function handleDeleteDocument(documentId: string): Promise<void> {
    if (demoMode) {
      setData((current) => current ? { ...current, documents: current.documents.filter((doc) => doc.id !== documentId) } : current);
      return;
    }

    await deleteDocument(documentId);
    await refresh();
  }

  async function handleCreateFolder(draft: FolderDraft): Promise<DocumentFolder> {
    if (demoMode) {
      return mutateDemoFolder(draft);
    }

    if (!currentMember) {
      throw new Error('활성 멤버만 폴더를 만들 수 있습니다.');
    }

    const folder = await createFolder(draft, currentMember.id);
    await refresh();
    return folder;
  }

  async function handleUploadImage(documentId: string, file: File): Promise<string> {
    if (demoMode) {
      return URL.createObjectURL(file);
    }

    if (!currentMember) {
      throw new Error('활성 멤버만 이미지를 첨부할 수 있습니다.');
    }

    return uploadDocumentImage(documentId, file, currentMember.id);
  }

  async function handleAddMember(draft: MemberDraft): Promise<void> {
    if (demoMode) {
      const id = crypto.randomUUID();
      setData((current) => current ? {
        ...current,
        members: [...current.members, {
          id,
          profileId: null,
          memberUid: draft.memberUid,
          displayName: draft.displayName,
          inviteEmail: draft.inviteEmail || null,
          githubUsername: draft.githubUsername || null,
          role: draft.role,
          roleLabel: draft.roleLabel,
          color: draft.color,
          active: true,
          materialRoot: `자료/${draft.memberUid}`,
          presentationRoot: `발표/*/${draft.memberUid}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }]
      } : current);
      return;
    }

    await saveMember(draft);
    await refresh();
  }

  async function handleSaveSession(draft: SessionDraft): Promise<void> {
    if (demoMode) {
      mutateDemoSession(draft);
      return;
    }

    if (!currentMember) {
      throw new Error('활성 멤버만 회차를 저장할 수 있습니다.');
    }

    await saveSession(draft, currentMember.id);
    await refresh();
  }

  async function handleStartSession(draft: SessionDraft): Promise<void> {
    if (demoMode) {
      setData((current) => current ? {
        ...current,
        sessions: [
          ...current.sessions.map((session) => session.status === 'current' ? { ...session, status: 'done' as const } : session),
          demoSessionFromDraft(draft, current.currentMember)
        ]
      } : current);
      return;
    }

    if (!currentMember || !data) {
      throw new Error('활성 멤버만 회차를 시작할 수 있습니다.');
    }

    const current = data.sessions.find((session) => session.status === 'current');
    if (current) {
      await markSessionDone(current.id);
    }
    await saveSession(draft, currentMember.id);
    await refresh();
  }

  async function handleEndSession(sessionId: number): Promise<void> {
    if (demoMode) {
      setData((current) => current ? {
        ...current,
        sessions: current.sessions.map((session) => session.id === sessionId ? { ...session, status: 'done' as const } : session)
      } : current);
      return;
    }

    await markSessionDone(sessionId);
    await refresh();
  }

  async function handleChoosePresenters(sessionId: number, presenterIds: string[]): Promise<void> {
    if (demoMode) {
      setData((current) => current ? {
        ...current,
        sessions: current.sessions.map((session) => session.id === sessionId ? { ...session, presenterMemberIds: presenterIds } : session)
      } : current);
      return;
    }

    await chooseSessionPresenters(sessionId, presenterIds);
    await refresh();
  }

  if (!demoMode && !authSession) {
    return <AuthPanel onDemo={isLocalHost() ? () => setDemoMode(true) : undefined} />;
  }

  if (loading) {
    return <main className="loading-page">데이터를 불러오는 중입니다.</main>;
  }

  if (loadError) {
    return (
      <main className="loading-page">
        <p>{loadError}</p>
        <button className="secondary-button" type="button" onClick={() => void refresh()}>다시 시도</button>
      </main>
    );
  }

  if (!data) {
    return <main className="loading-page">데이터가 없습니다.</main>;
  }

  if (!demoMode && authSession && data.bootstrapOpen && !data.currentMember) {
    return <BootstrapPanel session={authSession} onCreateOwner={handleCreateOwner} />;
  }

  if (!demoMode && authSession && !data.bootstrapOpen && !data.currentMember) {
    return <AccessDeniedPanel identifier={authSession.user.user_metadata?.user_name ?? authSession.user.email ?? '현재 GitHub 계정'} onSignOut={handleSignOut} />;
  }

  return (
    <div className="app-shell">
      <header className="top-nav">
        <div className="brand-block">
          <span className="brand-mark">LS</span>
          <div>
            <strong>Luddite Study</strong>
            <span>{demoMode ? 'Demo' : currentMember?.displayName ?? authSession?.user.email}</span>
          </div>
        </div>
        <nav className="top-nav-tabs" aria-label="주요 메뉴">
          {routes.map((item) => (
            <button
              className={route === item.key ? 'nav-item nav-item--active' : 'nav-item'}
              key={item.key}
              type="button"
              aria-current={route === item.key ? 'page' : undefined}
              onClick={() => navigate(item.key)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <button className="icon-button" type="button" onClick={() => void handleSignOut()} aria-label="로그아웃">
          <LogOut size={18} aria-hidden="true" />
        </button>
      </header>

      <main className="app-main">
        {route === 'dashboard' ? <Dashboard data={data} onNavigate={navigate} /> : null}
        {route === 'materials' ? (
          <DocumentWorkspace
            canWrite={canWrite}
            currentMember={currentMember}
            data={data}
            kind="material"
            onCreateFolder={handleCreateFolder}
            onDeleteDocument={handleDeleteDocument}
            onSaveDocument={handleSaveDocument}
            onUploadImage={handleUploadImage}
          />
        ) : null}
        {route === 'presentations' ? (
          <DocumentWorkspace
            canWrite={canWrite}
            currentMember={currentMember}
            data={data}
            kind="presentation"
            onCreateFolder={handleCreateFolder}
            onDeleteDocument={handleDeleteDocument}
            onSaveDocument={handleSaveDocument}
            onUploadImage={handleUploadImage}
          />
        ) : null}
        {route === 'operations' ? (
          <Operations
            canManage={canManage}
            data={data}
            onAddMember={handleAddMember}
            onChoosePresenters={handleChoosePresenters}
            onEndSession={handleEndSession}
            onSaveSession={handleSaveSession}
            onStartSession={handleStartSession}
          />
        ) : null}
      </main>
    </div>
  );

  function mutateDemoDocument(draft: DocumentDraft): StudyDocument {
    const now = new Date().toISOString();
    const saved: StudyDocument = {
      id: draft.id ?? crypto.randomUUID(),
      kind: draft.kind,
      path: draft.path.endsWith('.md') ? draft.path : `${draft.path}.md`,
      title: draft.title || '제목 없음',
      summary: draft.summary,
      ownerMemberId: draft.ownerMemberId,
      sessionId: draft.kind === 'presentation' ? draft.sessionId : null,
      tags: draft.tags,
      body: draft.body,
      createdBy: currentMember?.id ?? null,
      updatedBy: currentMember?.id ?? null,
      createdAt: draft.id ? data?.documents.find((doc) => doc.id === draft.id)?.createdAt ?? now : now,
      updatedAt: now
    };

    setData((current) => current ? {
      ...current,
      documents: draft.id
        ? current.documents.map((doc) => doc.id === draft.id ? saved : doc)
        : [...current.documents, saved]
    } : current);

    return saved;
  }

  function mutateDemoFolder(draft: FolderDraft): DocumentFolder {
    const now = new Date().toISOString();
    const folder: DocumentFolder = {
      id: crypto.randomUUID(),
      kind: draft.kind,
      path: draft.path,
      name: draft.name,
      parentPath: draft.parentPath,
      ownerMemberId: draft.ownerMemberId,
      sessionId: draft.sessionId,
      createdBy: currentMember?.id ?? null,
      createdAt: now,
      updatedAt: now
    };
    setData((current) => current ? { ...current, folders: [...current.folders, folder] } : current);
    return folder;
  }

  function mutateDemoSession(draft: SessionDraft) {
    setData((current) => current ? {
      ...current,
      sessions: current.sessions.map((session) => session.id === draft.id ? demoSessionFromDraft(draft, current.currentMember, session) : session)
    } : current);
  }
}

function AccessDeniedPanel({ identifier, onSignOut }: { identifier: string; onSignOut: () => Promise<void> }) {
  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby="access-denied-title">
        <div className="section-heading">
          <LogOut size={20} aria-hidden="true" />
          <h1 id="access-denied-title">승인된 멤버가 아닙니다</h1>
        </div>
        <p className="lead">
          {identifier} 계정은 아직 이 스터디 멤버로 등록되어 있지 않습니다.
          운영자가 GitHub 사용자명을 멤버 목록에 추가한 뒤 다시 로그인하세요.
        </p>
        <button className="primary-button auth-wide-button" type="button" onClick={() => void onSignOut()}>
          <LogOut size={18} aria-hidden="true" />
          로그아웃
        </button>
      </section>
    </main>
  );
}

function readRoute(): RouteKey {
  const hash = window.location.hash.replace('#', '') as RouteKey;
  return routes.some((route) => route.key === hash) ? hash : 'dashboard';
}

function isLocalHost(): boolean {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}

function demoSessionFromDraft(draft: SessionDraft, member: StudyMember | null, previous?: StudySession): StudySession {
  const now = new Date().toISOString();
  return {
    id: previous?.id ?? Math.floor(Date.now() / 1000),
    title: draft.title,
    week: draft.week,
    status: draft.status,
    startsOn: draft.startsOn,
    endsOn: draft.endsOn,
    presentationOn: draft.presentationOn,
    startTime: draft.startTime,
    endTime: draft.endTime,
    location: draft.location,
    goal: draft.goal,
    facilitatorMemberId: draft.facilitatorMemberId,
    presenterMemberIds: previous?.presenterMemberIds ?? [],
    agenda: draft.agenda,
    resources: previous?.resources ?? [],
    progressLabel: previous?.progressLabel ?? '진도',
    progressCurrent: previous?.progressCurrent ?? 0,
    progressTarget: previous?.progressTarget ?? 1,
    progressUnit: previous?.progressUnit ?? '개',
    createdBy: previous?.createdBy ?? member?.id ?? null,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now
  };
}


