import type { Session } from '@supabase/supabase-js';
import { storageBucketId, supabase } from './supabase';
import type {
  ActivityEvent,
  Attachment,
  DocumentDraft,
  DocumentFolder,
  FolderDraft,
  MemberDraft,
  MemberRole,
  Penalty,
  ProgressTopic,
  SessionDraft,
  StudyData,
  StudyDocument,
  StudyMember,
  StudySession
} from '../types';
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

type DbSession = {
  id: number;
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

export async function loadStudyData(authSession: Session | null): Promise<StudyData> {
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
  const currentMember = mappedMembers.find((member) => member.profileId === authSession?.user.id) ?? null;

  return {
    members: mappedMembers,
    sessions: sessions.map(mapSession),
    folders: folders.map(mapFolder),
    documents: documents.map(mapDocument),
    progressTopics: progressTopics.map(mapProgress),
    penalties: penalties.map(mapPenalty),
    activityEvents: activityEvents.map(mapEvent),
    attachments: attachments.map(mapAttachment),
    currentMember,
    bootstrapOpen: !mappedMembers.some((member) => member.active && member.profileId && (member.role === 'owner' || member.role === 'admin'))
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

export async function saveSession(draft: SessionDraft, currentMemberId: string): Promise<StudySession> {
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
    agenda: draft.agenda.filter(Boolean)
  };

  const query = draft.id
    ? supabase.from('study_sessions').update(payload).eq('id', draft.id).select('*').single()
    : supabase.from('study_sessions').insert({ ...payload, created_by: currentMemberId }).select('*').single();
  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return mapSession(data as DbSession);
}

export async function markSessionDone(sessionId: number): Promise<void> {
  await assertMutation(supabase.from('study_sessions').update({ status: 'done' }).eq('id', sessionId));
}

export async function chooseSessionPresenters(sessionId: number, presenterIds: string[]): Promise<void> {
  await assertMutation(supabase.from('study_sessions').update({ presenter_member_ids: presenterIds }).eq('id', sessionId));
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

function mapSession(row: DbSession): StudySession {
  return {
    id: row.id,
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
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
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

function roleLabel(role: MemberRole): string {
  if (role === 'owner') return '운영자';
  if (role === 'admin') return '관리자';
  if (role === 'facilitator') return '진행자';
  return '스터디원';
}
