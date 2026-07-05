export type User = {
  id: string;
  name: string;
  github?: string;
  role: string;
  active: boolean;
  color: string;
  materialPath: string;
  presentationPath: string;
};

export type SessionStatus = 'planned' | 'upcoming' | 'current' | 'done';

export type StudySession = {
  id: number;
  title: string;
  week: number;
  status: SessionStatus;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  goal: string;
  presenterIds: string[];
  facilitatorId: string;
  agenda: string[];
  resources: string[];
  progress: {
    label: string;
    current: number;
    target: number;
    unit: string;
  };
};

export type Penalty = {
  id: string;
  userId: string;
  sessionId: number;
  type: string;
  reason: string;
  amount: number;
  status: 'open' | 'settled';
  dueDate: string;
  settledAt?: string;
};

export type ProgressTopic = {
  id: string;
  name: string;
  ownerId: string;
  current: number;
  target: number;
  unit: string;
  status: 'planned' | 'active' | 'done';
  notes: string;
};

export type ContentKind = 'material' | 'presentation';

export type MarkdownFrontmatter = {
  title?: string;
  owner?: string;
  session?: number;
  createdAt?: string;
  updatedAt?: string;
  tags?: string[];
  summary?: string;
};

export type MarkdownDoc = {
  id: string;
  kind: ContentKind;
  path: string;
  segments: string[];
  title: string;
  summary: string;
  ownerId: string;
  sessionId?: number;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
  body: string;
  frontmatter: MarkdownFrontmatter;
  readingMinutes: number;
};

export type RouteKey = 'dashboard' | 'materials' | 'presentations' | 'compose' | 'tools';

