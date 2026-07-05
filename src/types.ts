export type RouteKey = 'dashboard' | 'materials' | 'presentations' | 'operations';

export type MemberRole = 'owner' | 'admin' | 'facilitator' | 'member';
export type SessionStatus = 'planned' | 'upcoming' | 'current' | 'done';
export type DocumentKind = 'material' | 'presentation';
export type ProgressStatus = 'planned' | 'active' | 'done';
export type PenaltyStatus = 'open' | 'settled';

export type StudyMember = {
  id: string;
  profileId: string | null;
  memberUid: string;
  displayName: string;
  inviteEmail: string | null;
  githubUsername: string | null;
  role: MemberRole;
  roleLabel: string;
  color: string;
  active: boolean;
  materialRoot: string;
  presentationRoot: string;
  createdAt: string;
  updatedAt: string;
};

export type StudySession = {
  id: number;
  title: string;
  week: number;
  status: SessionStatus;
  startsOn: string;
  endsOn: string;
  presentationOn: string;
  startTime: string;
  endTime: string;
  location: string;
  goal: string;
  facilitatorMemberId: string | null;
  presenterMemberIds: string[];
  agenda: string[];
  resources: string[];
  progressLabel: string;
  progressCurrent: number;
  progressTarget: number;
  progressUnit: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DocumentFolder = {
  id: string;
  kind: DocumentKind;
  path: string;
  name: string;
  parentPath: string | null;
  ownerMemberId: string | null;
  sessionId: number | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StudyDocument = {
  id: string;
  kind: DocumentKind;
  path: string;
  title: string;
  summary: string;
  ownerMemberId: string | null;
  sessionId: number | null;
  tags: string[];
  body: string;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProgressTopic = {
  id: string;
  slug: string;
  name: string;
  ownerMemberId: string | null;
  current: number;
  target: number;
  unit: string;
  status: ProgressStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type Penalty = {
  id: string;
  slug: string;
  memberId: string;
  sessionId: number | null;
  type: string;
  reason: string;
  amount: number;
  status: PenaltyStatus;
  dueDate: string;
  settledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ActivityEvent = {
  id: string;
  actorMemberId: string | null;
  eventType: string;
  entityTable: string;
  entityId: string | null;
  summary: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type Attachment = {
  id: string;
  documentId: string;
  bucketId: string;
  objectPath: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedBy: string | null;
  createdAt: string;
};

export type StudyData = {
  members: StudyMember[];
  sessions: StudySession[];
  folders: DocumentFolder[];
  documents: StudyDocument[];
  progressTopics: ProgressTopic[];
  penalties: Penalty[];
  activityEvents: ActivityEvent[];
  attachments: Attachment[];
  currentMember: StudyMember | null;
  bootstrapOpen: boolean;
};

export type DocumentDraft = {
  id?: string;
  kind: DocumentKind;
  title: string;
  summary: string;
  ownerMemberId: string | null;
  sessionId: number | null;
  path: string;
  tags: string[];
  body: string;
};

export type FolderDraft = {
  kind: DocumentKind;
  path: string;
  name: string;
  parentPath: string | null;
  ownerMemberId: string | null;
  sessionId: number | null;
};

export type MemberDraft = {
  memberUid: string;
  displayName: string;
  inviteEmail: string;
  githubUsername: string;
  role: MemberRole;
  roleLabel: string;
  color: string;
};

export type SessionDraft = {
  id?: number;
  title: string;
  week: number;
  status: SessionStatus;
  startsOn: string;
  endsOn: string;
  presentationOn: string;
  startTime: string;
  endTime: string;
  location: string;
  goal: string;
  facilitatorMemberId: string | null;
  agenda: string[];
};

export type MarkdownFrontmatter = {
  title?: string;
  owner?: string;
  session?: number;
  createdAt?: string;
  updatedAt?: string;
  tags?: string[];
  summary?: string;
};
