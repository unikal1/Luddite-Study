import type { Session } from '@supabase/supabase-js';
import { storageBucketId, supabase } from './supabase';
import type {
  ActivityEvent,
  Attachment,
  DocumentDraft,
  DocumentFolder,
  FolderDraft,
  FolderUpdateDraft,
  MemberDraft,
  MemberUpdateDraft,
  MemberRole,
  Penalty,
  ProjectDraft,
  ProjectStatus,
  ProjectType,
  ProgressTopic,
  SessionDraft,
  StudyData,
  StudyDocument,
  StudyMember,
  StudyProject,
  StudySession
} from '../types';
import { todayIso } from '../utils/dates';
import { slugifyFileName } from '../utils/path';

type DbMember = {
  id: string;
  profile_id: string | null;
  member_uid: string;
  display_name: string;
  invite_email: string | null;
  github_username: string | null;
  role: MemberRole;
  role_label: string;
  color: string;
  active: boolean;
  material_root: string;
  presentation_root: string;
  created_at: string;
  updated_at: string;
};

type DbProject = {
  id: number;
  title: string;
  type: ProjectType;
  status: ProjectStatus;
  total_pages: number;
  image_url: string;
  goal: string;
  starts_on: string;
  ends_on: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type DbSession = {
  id: number;
  project_id: number | null;
  title: string;
  week: number;
  status: StudySession['status'];
  starts_on: string;
  ends_on: string;
  presentation_on: string;
  start_time: string;
  end_time: string;
  location: string;
  goal: string;
  facilitator_member_id: string | null;
  presenter_member_ids: string[];
  agenda: string[];
  resources: string[];
  progress_label: string;
  progress_current: number;
  progress_target: number;
  progress_unit: string;
  project_progress: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type DbFolder = {
  id: string;
  kind: DocumentFolder['kind'];
  path: string;
  name: string;
  parent_path: string | null;
  owner_member_id: string | null;
  session_id: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type DbDocument = {
  id: string;
  kind: StudyDocument['kind'];
  path: string;
  title: string;
  summary: string;
  owner_member_id: string | null;
  session_id: number | null;
  tags: string[];
  body: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

type DbProgress = {
  id: string;
  slug: string;
  name: string;
  owner_member_id: string | null;
  current: number;
  target: number;
  unit: string;
  status: ProgressTopic['status'];
  notes: string;
  created_at: string;
  updated_at: string;
};

type DbPenalty = {
  id: string;
  slug: string;
  member_id: string;
  session_id: number | null;
  type: string;
  reason: string;
  amount: number;
  status: Penalty['status'];
  due_date: string;
  settled_at: string | null;
  created_at: string;
  updated_at: string;
};

type DbEvent = {
  id: string;
  actor_member_id: string | null;
  event_type: string;
  entity_table: string;
  entity_id: string | null;
  summary: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

type DbAttachment = {
  id: string;
  document_id: string;
  bucket_id: string;
  object_path: string;
  file_name: string;
  content_type: string;
  size_bytes: number;
  uploaded_by: string | null;
  created_at: string;
};

type AccessContext = {
  current_member_id: string | null;
  is_active_member: boolean;
  can_manage_study: boolean;
  bootstrap_open: boolean;
};

export async function loadStudyData(authSession: Session | null): Promise<StudyData> {
  if (authSession) {
    await claimStudyMember();
  }

  const accessContext = await getStudyAccessContext();

  if (!accessContext.is_active_member && !accessContext.bootstrap_open) {
    return emptyStudyData(false);
  }

  const [
    members,
    sessions,
    folders,
    documents,
    progressTopics,
    penalties,
    activityEvents,
    attachments
  ] = await Promise.all([
    selectRows<DbMember>('study_members', 'display_name'),
    selectRows<DbSession>('study_sessions', 'week'),
    selectRows<DbFolder>('document_folders', 'path'),
    selectRows<DbDocument>('documents', 'updated_at', false),
    selectRows<DbProgress>('progress_topics', 'name'),
    selectRows<DbPenalty>('penalties', 'due_date', false),
    selectRows<DbEvent>('activity_events', 'created_at', false, 50),
    selectRows<DbAttachment>('attachments', 'created_at', false)
  ]);

  const mappedMembers = members.map(mapMember);
  const mappedSessions = sessions.map(mapSession);
  const projects = await selectProjects(mappedSessions);
  const currentMember = mappedMembers.find((member) => member.id === accessContext.current_member_id)
    ?? mappedMembers.find((member) => member.profileId === authSession?.user.id)
    ?? null;

  return {
    projects,
    members: mappedMembers,
    sessions: attachFallbackProject(mappedSessions, projects),
    folders: folders.map(mapFolder),
    documents: documents.map(mapDocument),
    progressTopics: progressTopics.map(mapProgress),
    penalties: penalties.map(mapPenalty),
    activityEvents: activityEvents.map(mapEvent),
    attachments: attachments.map(mapAttachment),
    currentMember,
    bootstrapOpen: accessContext.bootstrap_open
  };
}

async function claimStudyMember(): Promise<void> {
  const { error } = await supabase.rpc('claim_study_member');

  if (error) {
    throw error;
  }
}

async function getStudyAccessContext(): Promise<AccessContext> {
  const { data, error } = await supabase.rpc('get_study_access_context').single();

  if (error) {
    throw error;
  }

  return data as AccessContext;
}

function emptyStudyData(bootstrapOpen: boolean): StudyData {
  return {
    projects: [],
    members: [],
    sessions: [],
    folders: [],
    documents: [],
    progressTopics: [],
    penalties: [],
    activityEvents: [],
    attachments: [],
    currentMember: null,
    bootstrapOpen
  };
}

export async function createBootstrapOwner(authSession: Session, draft: MemberDraft): Promise<void> {
  const profilePayload = {
    id: authSession.user.id,
    email: authSession.user.email ?? null,
    display_name: draft.displayName,
    github_username: draft.githubUsername || null,
    avatar_url: authSession.user.user_metadata?.avatar_url ?? null
  };

  await assertMutation(supabase.from('profiles').upsert(profilePayload));
  await assertMutation(supabase.from('study_members').insert({
    profile_id: authSession.user.id,
    member_uid: draft.memberUid,
    display_name: draft.displayName,
    invite_email: draft.inviteEmail || authSession.user.email || null,
    github_username: draft.githubUsername || null,
    role: 'owner',
    role_label: '운영자',
    color: draft.color,
    active: true,
    material_root: `자료/${draft.memberUid}`,
    presentation_root: `발표/*/${draft.memberUid}`
  }));
}

export async function saveDocument(draft: DocumentDraft, currentMemberId: string): Promise<StudyDocument> {
  const payload = {
    kind: draft.kind,
    path: normalizeDocumentPath(draft.path),
    title: draft.title.trim() || '제목 없음',
    summary: draft.summary.trim(),
    owner_member_id: draft.ownerMemberId,
    session_id: draft.kind === 'presentation' ? draft.sessionId : null,
    tags: draft.tags,
    body: draft.body,
    updated_by: currentMemberId
  };

  const query = draft.id
    ? supabase.from('documents').update(payload).eq('id', draft.id).select('*').single()
    : supabase.from('documents').insert({ ...payload, created_by: currentMemberId }).select('*').single();
  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return mapDocument(data as DbDocument);
}

export async function deleteDocument(documentId: string): Promise<void> {
  await assertMutation(supabase.from('documents').delete().eq('id', documentId));
}

export async function createFolder(draft: FolderDraft, currentMemberId: string): Promise<DocumentFolder> {
  const payload = {
    kind: draft.kind,
    path: normalizeFolderPath(draft.path),
    name: draft.name.trim() || draft.path.split('/').at(-1) || '새 폴더',
    parent_path: draft.parentPath,
    owner_member_id: draft.ownerMemberId,
    session_id: draft.kind === 'presentation' ? draft.sessionId : null,
    created_by: currentMemberId
  };
  const { data, error } = await supabase.from('document_folders').insert(payload).select('*').single();

  if (error) {
    throw error;
  }

  return mapFolder(data as DbFolder);
}

export async function updateFolder(
  draft: FolderUpdateDraft,
  currentMemberId: string,
  folders: DocumentFolder[],
  documents: StudyDocument[]
): Promise<DocumentFolder> {
  const nextPath = normalizeFolderPath(draft.path);
  const previousPath = normalizeFolderPath(draft.previousPath);
  const folderPayload = {
    path: nextPath,
    name: draft.name.trim() || draft.path.split('/').at(-1) || '새 폴더',
    parent_path: draft.parentPath,
    owner_member_id: draft.ownerMemberId,
    session_id: draft.kind === 'presentation' ? draft.sessionId : null
  };

  const { data, error } = await supabase.from('document_folders').update(folderPayload).eq('id', draft.id).select('*').single();

  if (error) {
    throw error;
  }

  const movedFolders = folders.filter((folder) => folder.id !== draft.id && isChildPath(folder.path, previousPath));
  const movedDocuments = documents.filter((document) => isChildPath(document.path, previousPath));

  await Promise.all([
    ...movedFolders.map((folder) => {
      const path = replacePathPrefix(folder.path, previousPath, nextPath);
      const parentPath = folder.parentPath ? replacePathPrefix(folder.parentPath, previousPath, nextPath) : null;

      return assertMutation(supabase.from('document_folders').update({ path, parent_path: parentPath }).eq('id', folder.id));
    }),
    ...movedDocuments.map((document) => assertMutation(supabase.from('documents').update({
      path: replacePathPrefix(document.path, previousPath, nextPath),
      updated_by: currentMemberId
    }).eq('id', document.id)))
  ]);

  return mapFolder(data as DbFolder);
}

export async function deleteFolder(folder: DocumentFolder, folders: DocumentFolder[], documents: StudyDocument[]): Promise<void> {
  const folderIds = folders
    .filter((item) => item.id === folder.id || isChildPath(item.path, folder.path))
    .map((item) => item.id);
  const documentIds = documents
    .filter((document) => document.path.startsWith(`${folder.path}/`))
    .map((document) => document.id);

  if (documentIds.length > 0) {
    await assertMutation(supabase.from('documents').delete().in('id', documentIds));
  }

  if (folderIds.length > 0) {
    await assertMutation(supabase.from('document_folders').delete().in('id', folderIds));
  }
}

export async function saveMember(draft: MemberDraft): Promise<StudyMember> {
  const memberUid = slugifyFileName(draft.memberUid);
  const payload = {
    member_uid: memberUid,
    display_name: draft.displayName.trim() || memberUid,
    invite_email: draft.inviteEmail.trim() || null,
    github_username: draft.githubUsername.trim() || null,
    role: draft.role,
    role_label: draft.roleLabel.trim() || roleLabel(draft.role),
    color: draft.color,
    active: true,
    material_root: `자료/${memberUid}`,
    presentation_root: `발표/*/${memberUid}`
  };
  const { data, error } = await supabase.from('study_members').insert(payload).select('*').single();

  if (error) {
    throw error;
  }

  return mapMember(data as DbMember);
}

export async function updateMember(draft: MemberUpdateDraft): Promise<StudyMember> {
  const { data, error } = await supabase.from('study_members').update({
    display_name: draft.displayName.trim(),
    role: draft.role,
    role_label: roleLabel(draft.role)
  }).eq('id', draft.id).select('*').single();

  if (error) {
    throw error;
  }

  return mapMember(data as DbMember);
}

export async function deleteMember(memberId: string): Promise<void> {
  await assertMutation(supabase.from('study_members').delete().eq('id', memberId));
}

export async function saveProject(draft: ProjectDraft, currentMemberId: string): Promise<StudyProject> {
  const payload = {
    title: draft.title.trim() || '새 프로젝트',
    type: draft.type,
    status: draft.status,
    total_pages: Math.max(1, draft.totalPages || 1),
    image_url: draft.imageUrl.trim(),
    goal: draft.goal.trim(),
    starts_on: draft.startsOn,
    ends_on: draft.endsOn || null
  };

  const query = draft.id
    ? supabase.from('study_projects').update(payload).eq('id', draft.id).select('*').single()
    : supabase.from('study_projects').insert({ ...payload, created_by: currentMemberId }).select('*').single();
  const { data, error } = await query;

  if (error) {
    if (isMissingProjectSchemaError(error)) {
      return saveProjectWithoutProjectSchema(draft, currentMemberId);
    }
    throw error;
  }

  return mapProject(data as DbProject);
}

async function saveProjectWithoutProjectSchema(draft: ProjectDraft, currentMemberId: string): Promise<StudyProject> {
  const sessions = await selectRows<DbSession>('study_sessions', 'week');

  if (sessions.length === 0) {
    throw new Error('프로젝트를 저장하려면 먼저 회차를 시작하세요.');
  }

  const title = draft.title.trim() || '스터디 프로젝트';
  const progressTarget = Math.max(
    1,
    draft.totalPages || 1,
    ...sessions.map((session) => session.progress_current ?? 0)
  );
  const progressUnit = draft.type === 'book' ? 'p' : '%';
  const { error: progressError } = await supabase
    .from('study_sessions')
    .update({
      progress_label: title,
      progress_target: progressTarget,
      progress_unit: progressUnit
    })
    .neq('id', -1);

  if (progressError) {
    throw progressError;
  }

  const currentSession = sessions.find((session) => session.status === 'current') ?? sessions.at(-1) ?? sessions[0];
  if (currentSession) {
    const { error: goalError } = await supabase
      .from('study_sessions')
      .update({ goal: draft.goal.trim() })
      .eq('id', currentSession.id);

    if (goalError) {
      throw goalError;
    }
  }

  const now = new Date().toISOString();
  const project = {
    id: 0,
    title,
    type: draft.type,
    status: draft.status,
    totalPages: progressTarget,
    imageUrl: draft.imageUrl.trim(),
    goal: draft.goal.trim(),
    startsOn: draft.startsOn,
    endsOn: draft.endsOn,
    createdBy: currentMemberId,
    createdAt: currentSession?.created_at ?? now,
    updatedAt: now
  };

  writeLegacyProjectSnapshot(project);
  return project;
}

export async function markProjectDone(projectId: number): Promise<void> {
  const { error } = await supabase.from('study_projects').update({ status: 'done', ends_on: todayIso() }).eq('id', projectId);

  if (error) {
    if (isMissingProjectSchemaError(error)) {
      throw new Error('Supabase 프로젝트 migration이 아직 적용되지 않았습니다.');
    }
    throw error;
  }
}

export async function deleteProject(projectId: number): Promise<void> {
  const { data, error } = await supabase.from('study_projects').delete().eq('id', projectId).select('id');

  if (error) {
    if (isMissingProjectSchemaError(error)) {
      throw new Error('Supabase 프로젝트 migration이 아직 적용되지 않았습니다.');
    }
    throw error;
  }

  if (!data?.length) {
    throw new Error('삭제할 프로젝트를 찾지 못했거나 삭제 권한이 없습니다.');
  }
}

export async function saveSession(draft: SessionDraft, currentMemberId: string): Promise<StudySession> {
  const payload = {
    project_id: draft.projectId,
    title: draft.title.trim() || `${draft.week}회차`,
    week: draft.week,
    status: draft.status,
    starts_on: draft.startsOn,
    ends_on: draft.endsOn,
    presentation_on: draft.presentationOn,
    start_time: draft.startTime,
    end_time: draft.endTime,
    location: draft.location.trim() || 'Discord',
    goal: draft.goal.trim(),
    facilitator_member_id: draft.facilitatorMemberId,
    agenda: draft.agenda.filter(Boolean),
    project_progress: Math.max(0, draft.projectProgress || 0)
  };

  const query = draft.id
    ? supabase.from('study_sessions').update(payload).eq('id', draft.id).select('*').single()
    : supabase.from('study_sessions').insert({ ...payload, created_by: currentMemberId }).select('*').single();
  const { data, error } = await query;

  if (error) {
    if (isMissingProjectSchemaError(error)) {
      return saveSessionWithoutProjectColumns(draft, currentMemberId);
    }
    throw error;
  }

  return mapSession(data as DbSession);
}

async function selectProjects(sessions: StudySession[]): Promise<StudyProject[]> {
  const { data, error } = await supabase.from('study_projects').select('*').order('starts_on', { ascending: false });

  if (error) {
    if (isMissingProjectSchemaError(error)) {
      return createFallbackProjects(sessions);
    }

    throw error;
  }

  return (data ?? []).map((row) => mapProject(row as DbProject));
}

function createFallbackProjects(sessions: StudySession[]): StudyProject[] {
  if (sessions.length === 0) {
    return [];
  }

  const ordered = sessions.slice().sort((left, right) => left.week - right.week);
  const current = sessions.find((session) => session.status === 'current') ?? ordered.at(-1) ?? ordered[0];
  const totalPages = Math.max(1, ...sessions.map((session) => Math.max(session.progressTarget, session.projectProgress)));
  const type = current.progressUnit === '%' ? 'free' : 'book';
  const saved = readLegacyProjectSnapshot();

  return [{
    id: 0,
    title: current.progressLabel || saved?.title || '스터디 프로젝트',
    type: saved?.type ?? type,
    status: 'current',
    totalPages: Math.max(1, saved?.totalPages ?? totalPages),
    imageUrl: saved?.imageUrl ?? '',
    goal: current.goal || saved?.goal || '',
    startsOn: saved?.startsOn || ordered[0].startsOn,
    endsOn: saved?.endsOn ?? null,
    createdBy: current.createdBy,
    createdAt: current.createdAt,
    updatedAt: current.updatedAt
  }];
}

function attachFallbackProject(sessions: StudySession[], projects: StudyProject[]): StudySession[] {
  const fallbackProject = projects.find((project) => project.id === 0);
  if (!fallbackProject) {
    return sessions;
  }

  return sessions.map((session) => ({
    ...session,
    projectId: session.projectId ?? fallbackProject.id,
    projectProgress: session.projectProgress || session.progressCurrent
  }));
}

export async function markSessionDone(sessionId: number): Promise<void> {
  await assertMutation(supabase.from('study_sessions').update({ status: 'done' }).eq('id', sessionId));
}

export async function deleteSession(sessionId: number): Promise<void> {
  const { data, error } = await supabase.from('study_sessions').delete().eq('id', sessionId).select('id');

  if (error) {
    throw error;
  }

  if (!data?.length) {
    throw new Error('삭제할 회차를 찾지 못했거나 삭제 권한이 없습니다.');
  }
}

export async function chooseSessionPresenters(sessionId: number, presenterIds: string[]): Promise<void> {
  await assertMutation(supabase.from('study_sessions').update({ presenter_member_ids: presenterIds }).eq('id', sessionId));
}

async function saveSessionWithoutProjectColumns(draft: SessionDraft, currentMemberId: string): Promise<StudySession> {
  let progressTarget = Math.max(1, draft.projectProgress || 0);
  if (draft.id) {
    const { data: existing, error: existingError } = await supabase
      .from('study_sessions')
      .select('progress_target')
      .eq('id', draft.id)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    progressTarget = Math.max(progressTarget, (existing as Pick<DbSession, 'progress_target'> | null)?.progress_target ?? 1);
  }

  const payload = {
    title: draft.title.trim() || `${draft.week}회차`,
    week: draft.week,
    status: draft.status,
    starts_on: draft.startsOn,
    ends_on: draft.endsOn,
    presentation_on: draft.presentationOn,
    start_time: draft.startTime,
    end_time: draft.endTime,
    location: draft.location.trim() || 'Discord',
    goal: draft.goal.trim(),
    facilitator_member_id: draft.facilitatorMemberId,
    agenda: draft.agenda.filter(Boolean),
    progress_current: Math.max(0, draft.projectProgress || 0),
    progress_target: progressTarget
  };

  const query = draft.id
    ? supabase.from('study_sessions').update(payload).eq('id', draft.id).select('*').single()
    : supabase.from('study_sessions').insert({ ...payload, created_by: currentMemberId }).select('*').single();
  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return {
    ...mapSession(data as DbSession),
    projectId: draft.projectId,
    projectProgress: draft.projectProgress
  };
}

export async function uploadDocumentImage(documentId: string, file: File, currentMemberId: string): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('이미지 파일만 첨부할 수 있습니다.');
  }

  const objectPath = `documents/${documentId}/${Date.now()}-${slugifyFileName(file.name)}`;
  const upload = await supabase.storage.from(storageBucketId).upload(objectPath, file, {
    contentType: file.type,
    upsert: false
  });

  if (upload.error) {
    throw upload.error;
  }

  await assertMutation(supabase.from('attachments').insert({
    document_id: documentId,
    bucket_id: storageBucketId,
    object_path: objectPath,
    file_name: file.name,
    content_type: file.type,
    size_bytes: file.size,
    uploaded_by: currentMemberId
  }));

  return `supabase://${storageBucketId}/${objectPath}`;
}

async function selectRows<T>(
  table: string,
  orderColumn: string,
  ascending = true,
  limit?: number
): Promise<T[]> {
  let query = supabase.from(table).select('*').order(orderColumn, { ascending });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []) as T[];
}

async function assertMutation<T>(promise: PromiseLike<{ error: Error | null; data?: T }>): Promise<void> {
  const { error } = await promise;

  if (error) {
    throw error;
  }
}

function mapMember(row: DbMember): StudyMember {
  return {
    id: row.id,
    profileId: row.profile_id,
    memberUid: row.member_uid,
    displayName: row.display_name,
    inviteEmail: row.invite_email,
    githubUsername: row.github_username,
    role: row.role,
    roleLabel: row.role_label,
    color: row.color,
    active: row.active,
    materialRoot: row.material_root,
    presentationRoot: row.presentation_root,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapProject(row: DbProject): StudyProject {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    status: row.status,
    totalPages: row.total_pages,
    imageUrl: row.image_url,
    goal: row.goal,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapSession(row: DbSession): StudySession {
  return {
    id: row.id,
    projectId: row.project_id ?? null,
    title: row.title,
    week: row.week,
    status: row.status,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    presentationOn: row.presentation_on,
    startTime: trimTime(row.start_time),
    endTime: trimTime(row.end_time),
    location: row.location,
    goal: row.goal,
    facilitatorMemberId: row.facilitator_member_id,
    presenterMemberIds: row.presenter_member_ids ?? [],
    agenda: row.agenda ?? [],
    resources: row.resources ?? [],
    progressLabel: row.progress_label,
    progressCurrent: row.progress_current,
    progressTarget: row.progress_target,
    progressUnit: row.progress_unit,
    projectProgress: row.project_progress ?? row.progress_current ?? 0,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function isMissingProjectSchemaError(error: unknown): boolean {
  const candidate = error as { code?: string; message?: string };
  const message = candidate.message ?? '';
  return candidate.code === '42P01' ||
    candidate.code === '42703' ||
    message.includes('study_projects') ||
    message.includes('project_id') ||
    message.includes('project_progress') ||
    message.includes('Could not find the') ||
    message.includes('schema cache');
}

const legacyProjectStorageKey = 'luddite-study:legacy-project';

type LegacyProjectSnapshot = Pick<StudyProject, 'title' | 'type' | 'totalPages' | 'imageUrl' | 'goal' | 'startsOn' | 'endsOn'>;

function readLegacyProjectSnapshot(): LegacyProjectSnapshot | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  try {
    const raw = localStorage.getItem(legacyProjectStorageKey);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<LegacyProjectSnapshot>;
    return {
      title: typeof parsed.title === 'string' ? parsed.title : '',
      type: parsed.type === 'free' ? 'free' : 'book',
      totalPages: typeof parsed.totalPages === 'number' && Number.isFinite(parsed.totalPages) ? parsed.totalPages : 1,
      imageUrl: typeof parsed.imageUrl === 'string' ? parsed.imageUrl : '',
      goal: typeof parsed.goal === 'string' ? parsed.goal : '',
      startsOn: typeof parsed.startsOn === 'string' ? parsed.startsOn : '',
      endsOn: typeof parsed.endsOn === 'string' ? parsed.endsOn : null
    };
  } catch {
    return null;
  }
}

function writeLegacyProjectSnapshot(project: LegacyProjectSnapshot): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(legacyProjectStorageKey, JSON.stringify(project));
  } catch {
    // localStorage is only a compatibility cache for pre-migration projects.
  }
}

function mapFolder(row: DbFolder): DocumentFolder {
  return {
    id: row.id,
    kind: row.kind,
    path: row.path,
    name: row.name,
    parentPath: row.parent_path,
    ownerMemberId: row.owner_member_id,
    sessionId: row.session_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapDocument(row: DbDocument): StudyDocument {
  return {
    id: row.id,
    kind: row.kind,
    path: row.path,
    title: row.title,
    summary: row.summary,
    ownerMemberId: row.owner_member_id,
    sessionId: row.session_id,
    tags: row.tags ?? [],
    body: row.body,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapProgress(row: DbProgress): ProgressTopic {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    ownerMemberId: row.owner_member_id,
    current: row.current,
    target: row.target,
    unit: row.unit,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapPenalty(row: DbPenalty): Penalty {
  return {
    id: row.id,
    slug: row.slug,
    memberId: row.member_id,
    sessionId: row.session_id,
    type: row.type,
    reason: row.reason,
    amount: row.amount,
    status: row.status,
    dueDate: row.due_date,
    settledAt: row.settled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapEvent(row: DbEvent): ActivityEvent {
  return {
    id: row.id,
    actorMemberId: row.actor_member_id,
    eventType: row.event_type,
    entityTable: row.entity_table,
    entityId: row.entity_id,
    summary: row.summary,
    metadata: row.metadata ?? {},
    createdAt: row.created_at
  };
}

function mapAttachment(row: DbAttachment): Attachment {
  return {
    id: row.id,
    documentId: row.document_id,
    bucketId: row.bucket_id,
    objectPath: row.object_path,
    fileName: row.file_name,
    contentType: row.content_type,
    sizeBytes: row.size_bytes,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at
  };
}

function trimTime(value: string): string {
  return value.slice(0, 5);
}

function normalizeDocumentPath(path: string): string {
  const cleaned = path.trim().replace(/^\/+/, '').replace(/\/+/g, '/');
  return cleaned.endsWith('.md') ? cleaned : `${cleaned}.md`;
}

function normalizeFolderPath(path: string): string {
  return path.trim().replace(/^\/+/, '').replace(/\/+$/g, '').replace(/\/+/g, '/');
}

function isChildPath(path: string, parentPath: string): boolean {
  return path.startsWith(`${parentPath}/`);
}

function replacePathPrefix(path: string, previousPrefix: string, nextPrefix: string): string {
  if (path === previousPrefix) {
    return nextPrefix;
  }

  return path.startsWith(`${previousPrefix}/`) ? `${nextPrefix}${path.slice(previousPrefix.length)}` : path;
}

function roleLabel(role: MemberRole): string {
  if (role === 'owner') return '운영자';
  if (role === 'admin') return '관리자';
  if (role === 'facilitator') return '진행자';
  return '스터디원';
}
