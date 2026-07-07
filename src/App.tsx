import { BookOpen, ClipboardList, Gauge, LogOut, Presentation } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AuthPanel } from './components/AuthPanel';
import { BootstrapPanel } from './components/BootstrapPanel';
import { Dashboard } from './components/Dashboard';
import { DocumentWorkspace } from './components/DocumentWorkspace';
import { Operations } from './components/Operations';
import { Projects } from './components/Projects';
import { createDemoData } from './lib/demoData';
import {
  chooseSessionPresenters,
  createBootstrapOwner,
  createFolder,
  deleteDocument,
  deleteFolder,
  deleteMember,
  deleteProject,
  deleteSession,
  loadStudyData,
  markProjectDone,
  markSessionDone,
  saveDocument,
  saveMember,
  saveProject,
  saveSession,
  updateMember,
  updateFolder,
  uploadDocumentImage
} from './lib/studyRepository';
import { supabase } from './lib/supabase';
import type { DocumentDraft, DocumentFolder, FolderDraft, FolderUpdateDraft, MemberDraft, MemberUpdateDraft, ProjectDraft, RouteKey, SessionDraft, StudyData, StudyDocument, StudyMember, StudyProject, StudySession } from './types';

const routes: Array<{ key: RouteKey; label: string; icon: React.ReactNode }> = [
  { key: 'dashboard', label: '대시보드', icon: <Gauge size={18} /> },
  { key: 'projects', label: '프로젝트', icon: <BookOpen size={18} /> },
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

  async function refresh(session = authSession, options: { showLoader?: boolean } = {}) {
    if (demoMode) {
      return;
    }

    if (!session) {
      setData(null);
      if (options.showLoader ?? true) {
        setLoading(false);
      }
      return;
    }

    const showLoader = options.showLoader ?? true;
    if (showLoader) {
      setLoading(true);
    }
    setLoadError('');

    try {
      setData(await loadStudyData(session));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : '데이터를 불러오지 못했습니다.');
    } finally {
      if (showLoader) {
        setLoading(false);
      }
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

  async function handleUpdateFolder(draft: FolderUpdateDraft): Promise<DocumentFolder> {
    if (demoMode) {
      return mutateDemoFolderUpdate(draft);
    }

    if (!currentMember || !data) {
      throw new Error('활성 멤버만 폴더를 수정할 수 있습니다.');
    }

    const folder = await updateFolder(draft, currentMember.id, data.folders, data.documents);
    await refresh();
    return folder;
  }

  async function handleDeleteFolder(folder: DocumentFolder): Promise<void> {
    if (demoMode) {
      setData((current) => current ? {
        ...current,
        folders: current.folders.filter((item) => item.id !== folder.id && !item.path.startsWith(`${folder.path}/`)),
        documents: current.documents.filter((document) => !document.path.startsWith(`${folder.path}/`))
      } : current);
      return;
    }

    if (!data) {
      throw new Error('삭제할 폴더 정보를 찾을 수 없습니다.');
    }

    await deleteFolder(folder, data.folders, data.documents);
    await refresh();
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

  async function handleUpdateMember(draft: MemberUpdateDraft): Promise<void> {
    if (demoMode) {
      const now = new Date().toISOString();
      setData((current) => current ? {
        ...current,
        members: current.members.map((member) => member.id === draft.id ? {
          ...member,
          displayName: draft.displayName,
          role: draft.role,
          roleLabel: roleLabel(draft.role),
          updatedAt: now
        } : member)
      } : current);
      return;
    }

    await updateMember(draft);
    await refresh();
  }

  async function handleDeleteMember(memberId: string): Promise<void> {
    if (demoMode) {
      setData((current) => current ? {
        ...current,
        members: current.members.filter((member) => member.id !== memberId),
        sessions: current.sessions.map((session) => ({
          ...session,
          facilitatorMemberId: session.facilitatorMemberId === memberId ? null : session.facilitatorMemberId,
          presenterMemberIds: session.presenterMemberIds.filter((id) => id !== memberId)
        })),
        folders: current.folders.map((folder) => folder.ownerMemberId === memberId ? { ...folder, ownerMemberId: null } : folder),
        documents: current.documents.map((document) => document.ownerMemberId === memberId ? { ...document, ownerMemberId: null } : document)
      } : current);
      return;
    }

    await deleteMember(memberId);
    await refresh();
  }

  async function handleSaveProject(draft: ProjectDraft): Promise<void> {
    if (demoMode) {
      mutateDemoProject(draft);
      return;
    }

    if (!currentMember || !data) {
      throw new Error('활성 멤버만 프로젝트를 저장할 수 있습니다.');
    }

    if (draft.status === 'current') {
      const currentProject = data.projects.find((project) => project.status === 'current' && project.id !== draft.id);
      if (currentProject && currentProject.id !== 0) {
        await markProjectDone(currentProject.id);
      }
    }

    await saveProject(draft, currentMember.id);
    await refresh();
  }

  async function handleEndProject(projectId: number): Promise<void> {
    if (demoMode) {
      const today = new Date().toISOString().slice(0, 10);
      setData((current) => current ? {
        ...current,
        projects: current.projects.map((project) => project.id === projectId ? { ...project, status: 'done' as const, endsOn: today, updatedAt: new Date().toISOString() } : project)
      } : current);
      return;
    }

    await markProjectDone(projectId);
    await refresh();
  }

  async function handleDeleteProject(projectId: number): Promise<void> {
    if (demoMode) {
      removeProjectFromState(projectId);
      return;
    }

    if (projectId === 0) {
      removeProjectFromState(projectId);
      return;
    }

    await deleteProject(projectId);
    removeProjectFromState(projectId);
    await refresh(authSession, { showLoader: false });
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

  async function handleDeleteSession(sessionId: number): Promise<void> {
    if (demoMode) {
      removeSessionFromState(sessionId);
      return;
    }

    await deleteSession(sessionId);
    removeSessionFromState(sessionId);
    await refresh(authSession, { showLoader: false });
  }

  function removeProjectFromState(projectId: number) {
    setData((current) => current ? {
      ...current,
      projects: current.projects.filter((project) => project.id !== projectId),
      sessions: current.sessions.map((session) => session.projectId === projectId ? { ...session, projectId: null, projectProgress: 0 } : session)
    } : current);
  }

  function removeSessionFromState(sessionId: number) {
    setData((current) => current ? {
      ...current,
      sessions: current.sessions.filter((session) => session.id !== sessionId),
      folders: current.folders.filter((folder) => folder.sessionId !== sessionId),
      documents: current.documents.map((document) => document.sessionId === sessionId ? { ...document, sessionId: null } : document),
      penalties: current.penalties.map((penalty) => penalty.sessionId === sessionId ? { ...penalty, sessionId: null } : penalty)
    } : current);
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
        {route === 'projects' ? (
          <Projects
            canManage={canManage}
            data={data}
            onDeleteProject={handleDeleteProject}
            onEndProject={handleEndProject}
            onSaveProject={handleSaveProject}
          />
        ) : null}
        {route === 'materials' ? (
          <DocumentWorkspace
            canWrite={canWrite}
            currentMember={currentMember}
            data={data}
            kind="material"
            onCreateFolder={handleCreateFolder}
            onDeleteDocument={handleDeleteDocument}
            onDeleteFolder={handleDeleteFolder}
            onUpdateFolder={handleUpdateFolder}
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
            onDeleteFolder={handleDeleteFolder}
            onUpdateFolder={handleUpdateFolder}
            onSaveDocument={handleSaveDocument}
            onUploadImage={handleUploadImage}
          />
        ) : null}
        {route === 'operations' ? (
          <Operations
            canManage={canManage}
            data={data}
            isDemo={demoMode}
            onAddMember={handleAddMember}
            onChoosePresenters={handleChoosePresenters}
            onDeleteMember={handleDeleteMember}
            onDeleteSession={handleDeleteSession}
            onEndSession={handleEndSession}
            onSaveSession={handleSaveSession}
            onStartSession={handleStartSession}
            onUpdateMember={handleUpdateMember}
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

  function mutateDemoFolderUpdate(draft: FolderUpdateDraft): DocumentFolder {
    const now = new Date().toISOString();
    const folder: DocumentFolder = {
      id: draft.id,
      kind: draft.kind,
      path: draft.path,
      name: draft.name,
      parentPath: draft.parentPath,
      ownerMemberId: draft.ownerMemberId,
      sessionId: draft.sessionId,
      createdBy: currentMember?.id ?? null,
      createdAt: data?.folders.find((item) => item.id === draft.id)?.createdAt ?? now,
      updatedAt: now
    };
    const previousPrefix = `${draft.previousPath}/`;

    setData((current) => current ? {
      ...current,
      folders: current.folders.map((item) => {
        if (item.id === draft.id) {
          return folder;
        }

        if (!item.path.startsWith(previousPrefix)) {
          return item;
        }

        return {
          ...item,
          path: `${draft.path}${item.path.slice(draft.previousPath.length)}`,
          parentPath: item.parentPath === draft.previousPath
            ? draft.path
            : item.parentPath?.startsWith(previousPrefix)
              ? `${draft.path}${item.parentPath.slice(draft.previousPath.length)}`
              : item.parentPath,
          updatedAt: now
        };
      }),
      documents: current.documents.map((item) => item.path.startsWith(previousPrefix) ? {
        ...item,
        path: `${draft.path}${item.path.slice(draft.previousPath.length)}`,
        updatedAt: now
      } : item)
    } : current);

    return folder;
  }

  function mutateDemoSession(draft: SessionDraft) {
    setData((current) => current ? {
      ...current,
      sessions: current.sessions.map((session) => session.id === draft.id ? demoSessionFromDraft(draft, current.currentMember, session) : session)
    } : current);
  }

  function mutateDemoProject(draft: ProjectDraft) {
    const now = new Date().toISOString();
    setData((current) => {
      if (!current) {
        return current;
      }

      const saved: StudyProject = {
        id: draft.id ?? Math.floor(Date.now() / 1000),
        title: draft.title || '새 프로젝트',
        type: draft.type,
        status: draft.status,
        totalPages: Math.max(1, draft.totalPages || 1),
        imageUrl: draft.imageUrl,
        goal: draft.goal,
        startsOn: draft.startsOn,
        endsOn: draft.endsOn,
        createdBy: current.currentMember?.id ?? null,
        createdAt: draft.id ? current.projects.find((project) => project.id === draft.id)?.createdAt ?? now : now,
        updatedAt: now
      };

      const projects = draft.id
        ? current.projects.map((project) => project.id === draft.id ? saved : project)
        : [...current.projects, saved];

      return {
        ...current,
        projects: saved.status === 'current'
          ? projects.map((project) => project.id === saved.id ? project : project.status === 'current' ? { ...project, status: 'done' as const, endsOn: saved.startsOn, updatedAt: now } : project)
          : projects
      };
    });
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
    projectId: draft.projectId,
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
    projectProgress: draft.projectProgress,
    createdBy: previous?.createdBy ?? member?.id ?? null,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now
  };
}

function roleLabel(role: StudyMember['role']): string {
  if (role === 'owner') return '운영자';
  if (role === 'admin') return '관리자';
  if (role === 'facilitator') return '진행자';
  return '스터디원';
}


