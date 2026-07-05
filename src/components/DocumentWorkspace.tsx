import { Check, FilePlus2, FolderPlus, ImagePlus, Pencil, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type DragEvent, type RefObject } from 'react';
import type { DocumentDraft, DocumentFolder, DocumentKind, FolderDraft, StudyData, StudyDocument, StudyMember, StudySession } from '../types';
import { formatDate } from '../utils/dates';
import { slugifyFileName } from '../utils/path';
import { MarkdownView } from './MarkdownView';
import { StatusBadge } from './StatusBadge';

type DocumentWorkspaceProps = {
  kind: DocumentKind;
  data: StudyData;
  currentMember: StudyMember | null;
  canWrite: boolean;
  onSaveDocument: (draft: DocumentDraft) => Promise<StudyDocument>;
  onDeleteDocument: (documentId: string) => Promise<void>;
  onCreateFolder: (draft: FolderDraft) => Promise<DocumentFolder>;
  onUploadImage: (documentId: string, file: File) => Promise<string>;
};

const emptyBody = '# 새 문서\n\n';

export function DocumentWorkspace({
  kind,
  data,
  currentMember,
  canWrite,
  onSaveDocument,
  onDeleteDocument,
  onCreateFolder,
  onUploadImage
}: DocumentWorkspaceProps) {
  const sessions = data.sessions.slice().sort((left, right) => left.week - right.week);
  const defaultSessionId = sessions.find((session) => session.status === 'current')?.id ?? sessions.at(-1)?.id ?? null;
  const [sessionId, setSessionId] = useState<number | null>(kind === 'presentation' ? defaultSessionId : null);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState('');
  const [folderDraft, setFolderDraft] = useState('');
  const [parentPath, setParentPath] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const visibleDocs = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return data.documents
      .filter((doc) => doc.kind === kind)
      .filter((doc) => kind === 'material' || doc.sessionId === sessionId)
      .filter((doc) => {
        if (!normalized) return true;
        return `${doc.title} ${doc.summary} ${doc.path} ${doc.tags.join(' ')}`.toLowerCase().includes(normalized);
      })
      .sort((left, right) => left.path.localeCompare(right.path, 'ko-KR'));
  }, [data.documents, kind, query, sessionId]);

  const visibleFolders = useMemo(() => {
    return data.folders
      .filter((folder) => folder.kind === kind)
      .filter((folder) => kind === 'material' || folder.sessionId === sessionId)
      .sort((left, right) => left.path.localeCompare(right.path, 'ko-KR'));
  }, [data.folders, kind, sessionId]);

  const selected = visibleDocs.find((doc) => doc.id === selectedId) ?? visibleDocs[0] ?? null;
  const [draft, setDraft] = useState<DocumentDraft>(() => createDraft(kind, currentMember, sessions.find((session) => session.id === defaultSessionId) ?? null));

  useEffect(() => {
    if (visibleDocs.length === 0) {
      setSelectedId('');
      return;
    }

    if (!visibleDocs.some((doc) => doc.id === selectedId)) {
      setSelectedId(visibleDocs[0].id);
    }
  }, [selectedId, visibleDocs]);

  useEffect(() => {
    if (!editing || !selected) {
      return;
    }

    setDraft(fromDocument(selected));
  }, [editing, selected]);

  function startNewDocument(ownerMemberId?: string | null, basePath?: string) {
    const session = sessions.find((item) => item.id === sessionId) ?? sessions.at(-1) ?? null;
    const nextDraft = createDraft(kind, currentMember, session, ownerMemberId, basePath);
    setDraft(nextDraft);
    setEditing(true);
    setStatus('');
  }

  function startEditDocument(doc: StudyDocument) {
    setSelectedId(doc.id);
    setDraft(fromDocument(doc));
    setEditing(true);
    setStatus('');
  }

  async function save() {
    setStatus('저장 중입니다.');

    try {
      const saved = await onSaveDocument(draft);
      setSelectedId(saved.id);
      setDraft(fromDocument(saved));
      setEditing(false);
      setStatus('저장됐습니다.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '저장에 실패했습니다.');
    }
  }

  async function removeSelected() {
    if (!selected) return;
    setStatus('삭제 중입니다.');

    try {
      await onDeleteDocument(selected.id);
      setSelectedId('');
      setEditing(false);
      setStatus('삭제됐습니다.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '삭제에 실패했습니다.');
    }
  }

  async function createFolder() {
    const cleanName = slugifyFileName(folderDraft);
    const base = parentPath || defaultFolderBase(kind, currentMember, sessions.find((session) => session.id === sessionId) ?? null);
    const path = `${base}/${cleanName}`.replace(/\/+/g, '/');
    const session = sessions.find((item) => item.id === sessionId) ?? null;

    setStatus('폴더를 만드는 중입니다.');

    try {
      await onCreateFolder({
        kind,
        path,
        name: cleanName,
        parentPath: base,
        ownerMemberId: kind === 'material' ? currentMember?.id ?? null : draft.ownerMemberId ?? currentMember?.id ?? null,
        sessionId: kind === 'presentation' ? session?.id ?? null : null
      });
      setFolderDraft('');
      setParentPath(path);
      setStatus('폴더가 만들어졌습니다.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '폴더 생성에 실패했습니다.');
    }
  }

  async function handleDrop(event: DragEvent<HTMLTextAreaElement>) {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith('image/'));

    if (files.length === 0) {
      return;
    }

    if (!draft.id) {
      setStatus('이미지는 문서를 한 번 저장한 뒤 첨부할 수 있습니다.');
      return;
    }

    setStatus('이미지를 업로드하는 중입니다.');

    try {
      const snippets: string[] = [];
      for (const file of files) {
        const src = await onUploadImage(draft.id, file);
        snippets.push(`![${file.name}](${src})`);
      }
      insertMarkdown(snippets.join('\n\n'));
      setStatus('이미지가 첨부됐습니다.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '이미지 업로드에 실패했습니다.');
    }
  }

  function insertMarkdown(snippet: string) {
    const textarea = textareaRef.current;

    if (!textarea) {
      setDraft((current) => ({ ...current, body: `${current.body.trim()}\n\n${snippet}\n` }));
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = draft.body.slice(0, start);
    const after = draft.body.slice(end);
    const next = `${before}${before.endsWith('\n') ? '' : '\n'}${snippet}${after.startsWith('\n') ? '' : '\n'}${after}`;
    setDraft((current) => ({ ...current, body: next }));
  }

  const title = kind === 'material' ? '자료' : '발표';
  const selectedSession = sessions.find((session) => session.id === sessionId) ?? null;

  return (
    <div className="workspace-page">
      <aside className="workspace-rail" aria-label={`${title} 디렉토리`}>
        <div className="rail-header">
          <div>
            <p className="eyebrow">{title}</p>
            <h1>{kind === 'material' ? '자료실' : '발표실'}</h1>
          </div>
          {canWrite ? (
            <button className="icon-button" type="button" onClick={() => startNewDocument()} aria-label={`${title} 작성`}>
              <FilePlus2 size={18} aria-hidden="true" />
            </button>
          ) : null}
        </div>

        {kind === 'presentation' ? (
          <label className="compact-label">
            회차
            <select value={sessionId ?? ''} onChange={(event) => setSessionId(Number(event.target.value))}>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.week}회차 · {formatDate(session.presentationOn)}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="search-box rail-search">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">검색</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="제목, 태그, 경로" />
        </label>

        {canWrite ? (
          <div className="folder-create">
            <label>
              새 폴더
              <input value={folderDraft} onChange={(event) => setFolderDraft(event.target.value)} placeholder="folder-name" />
            </label>
            <label>
              부모 경로
              <select value={parentPath} onChange={(event) => setParentPath(event.target.value)}>
                <option value="">{defaultFolderBase(kind, currentMember, selectedSession)}</option>
                {visibleFolders.map((folder) => (
                  <option key={folder.id} value={folder.path}>{folder.path}</option>
                ))}
              </select>
            </label>
            <button className="secondary-button" type="button" onClick={() => void createFolder()} disabled={!folderDraft.trim()}>
              <FolderPlus size={18} aria-hidden="true" />
              추가
            </button>
          </div>
        ) : null}

        <div className="tree-list workspace-tree">
          {buildGroups(kind, data.members, visibleFolders, visibleDocs, selectedSession).map((group) => (
            <div className="tree-group" key={group.label}>
              <h2>{group.label}</h2>
              {group.items.map((item) => (
                item.type === 'folder' ? (
                  <button className="tree-item tree-item--folder" key={`folder-${item.path}`} type="button" onClick={() => {
                    setParentPath(item.path);
                    startNewDocument(item.ownerMemberId, item.path);
                  }}>
                    <span>{indent(item.depth)}폴더 · {item.name}</span>
                    <small>{item.path}</small>
                  </button>
                ) : (
                  <button className={item.doc.id === selected?.id ? 'tree-item tree-item--active' : 'tree-item'} key={item.doc.id} type="button" onClick={() => {
                    setSelectedId(item.doc.id);
                    setEditing(false);
                  }}>
                    <span>{indent(item.depth)}{item.doc.title}</span>
                    <small>{item.doc.path}</small>
                  </button>
                )
              ))}
            </div>
          ))}
        </div>
      </aside>

      <div className="workspace-main">
        <section className="reader-panel workspace-reader" aria-labelledby="reader-title">
          {editing ? (
            <DocumentEditor
              canWrite={canWrite}
              currentMember={currentMember}
              data={data}
              draft={draft}
              kind={kind}
              selectedSession={selectedSession}
              status={status}
              textareaRef={textareaRef}
              onCancel={() => {
                setEditing(false);
                setStatus('');
              }}
              onDraftChange={setDraft}
              onDrop={(event) => void handleDrop(event)}
              onSave={() => void save()}
            />
          ) : selected ? (
            <DocumentReader
              canWrite={canWrite}
              doc={selected}
              member={data.members.find((member) => member.id === selected.ownerMemberId) ?? null}
              session={data.sessions.find((session) => session.id === selected.sessionId) ?? null}
              status={status}
              onDelete={() => void removeSelected()}
              onEdit={() => startEditDocument(selected)}
            />
          ) : (
            <div className="empty-state">
              <h2 id="reader-title">문서 없음</h2>
              <p>왼쪽에서 문서를 선택하거나 새 문서를 만드세요.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function DocumentReader({
  canWrite,
  doc,
  member,
  session,
  status,
  onDelete,
  onEdit
}: {
  canWrite: boolean;
  doc: StudyDocument;
  member: StudyMember | null;
  session: StudySession | null;
  status: string;
  onDelete: () => void;
  onEdit: () => void;
}) {
  return (
    <>
      <div className="reader-toolbar">
        <div>
          <div className="breadcrumb">{doc.path}</div>
          <h2 id="reader-title">{doc.title}</h2>
          <div className="meta-row">
            <span>{member?.displayName ?? '공유'}</span>
            {session ? <span>{session.week}회차</span> : null}
            <span>수정 {formatDate(doc.updatedAt)}</span>
          </div>
        </div>
        {canWrite ? (
          <div className="toolbar-actions">
            <button className="icon-button" type="button" onClick={onEdit} aria-label="문서 수정">
              <Pencil size={18} aria-hidden="true" />
            </button>
            <button className="icon-button danger-icon" type="button" onClick={onDelete} aria-label="문서 삭제">
              <Trash2 size={18} aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>
      {doc.summary ? <p className="doc-summary">{doc.summary}</p> : null}
      <div className="tag-row">
        {doc.tags.map((tag) => <StatusBadge key={tag} label={`#${tag}`} />)}
      </div>
      <MarkdownView content={doc.body} />
      {status ? <p className="form-status">{status}</p> : null}
    </>
  );
}

function DocumentEditor({
  canWrite,
  currentMember,
  data,
  draft,
  kind,
  selectedSession,
  status,
  textareaRef,
  onCancel,
  onDraftChange,
  onDrop,
  onSave
}: {
  canWrite: boolean;
  currentMember: StudyMember | null;
  data: StudyData;
  draft: DocumentDraft;
  kind: DocumentKind;
  selectedSession: StudySession | null;
  status: string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onCancel: () => void;
  onDraftChange: (draft: DocumentDraft) => void;
  onDrop: (event: DragEvent<HTMLTextAreaElement>) => void;
  onSave: () => void;
}) {
  return (
    <div className="editor-panel inline-editor">
      <div className="split-line">
        <div>
          <p className="eyebrow">{draft.id ? '문서 수정' : '새 문서'}</p>
          <h2 id="reader-title">{kind === 'material' ? '자료 작성' : `${selectedSession?.week ?? ''}회차 발표 작성`}</h2>
        </div>
        <div className="toolbar-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>취소</button>
          <button className="primary-button" type="button" onClick={onSave} disabled={!canWrite}>
            <Check size={18} aria-hidden="true" />
            저장
          </button>
        </div>
      </div>

      <div className="form-grid">
        <label>
          제목
          <input value={draft.title} onChange={(event) => onDraftChange({ ...draft, title: event.target.value })} />
        </label>
        <label>
          저자
          <select value={draft.ownerMemberId ?? ''} onChange={(event) => onDraftChange({ ...draft, ownerMemberId: event.target.value || null })}>
            {kind === 'material' ? <option value="">공유</option> : null}
            {data.members.filter((member) => member.active).map((member) => (
              <option key={member.id} value={member.id}>{member.displayName}</option>
            ))}
          </select>
        </label>
      </div>

      <label>
        요약
        <input value={draft.summary} onChange={(event) => onDraftChange({ ...draft, summary: event.target.value })} />
      </label>
      <label>
        경로
        <input value={draft.path} onChange={(event) => onDraftChange({ ...draft, path: event.target.value })} />
      </label>
      <label>
        태그
        <input value={draft.tags.join(', ')} onChange={(event) => onDraftChange({ ...draft, tags: event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) })} />
      </label>
      <label>
        Markdown
        <textarea
          ref={textareaRef}
          value={draft.body}
          onChange={(event) => onDraftChange({ ...draft, body: event.target.value })}
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDrop}
          rows={18}
        />
      </label>
      <p className="helper-text">
        <ImagePlus size={16} aria-hidden="true" />
        저장된 문서의 Markdown 입력칸에 이미지를 드래그하면 Supabase Storage에 첨부됩니다.
      </p>
      <div className="preview-panel editor-preview">
        <h3>미리보기</h3>
        <MarkdownView content={draft.body} />
      </div>
      {status ? <p className="form-status">{status}</p> : null}
      {!currentMember ? <p className="form-status form-status--error">활성 멤버로 연결된 계정만 저장할 수 있습니다.</p> : null}
    </div>
  );
}

type TreeItem =
  | { type: 'folder'; path: string; name: string; depth: number; ownerMemberId: string | null }
  | { type: 'doc'; doc: StudyDocument; depth: number };

function buildGroups(
  kind: DocumentKind,
  members: StudyMember[],
  folders: DocumentFolder[],
  docs: StudyDocument[],
  selectedSession: StudySession | null
): Array<{ label: string; items: TreeItem[] }> {
  if (kind === 'presentation') {
    return members.filter((member) => member.active).map((member) => {
      const memberDocs = docs.filter((doc) => doc.ownerMemberId === member.id);
      const memberFolders = folders.filter((folder) => folder.ownerMemberId === member.id);
      return {
        label: `${selectedSession?.week ?? ''}회차 / ${member.displayName}`,
        items: [...folderItems(memberFolders), ...memberDocs.map((doc) => ({ type: 'doc' as const, doc, depth: depthFromPath(doc.path) - 2 }))]
          .sort(sortTreeItem)
      };
    }).filter((group) => group.items.length > 0);
  }

  const sharedDocs = docs.filter((doc) => doc.ownerMemberId === null);
  const sharedFolders = folders.filter((folder) => folder.path.startsWith('자료/공유'));
  const groups = [{
    label: '공유',
    items: [...folderItems(sharedFolders), ...sharedDocs.map((doc) => ({ type: 'doc' as const, doc, depth: depthFromPath(doc.path) - 1 }))]
      .sort(sortTreeItem)
  }];

  members.filter((member) => member.active).forEach((member) => {
    const memberDocs = docs.filter((doc) => doc.ownerMemberId === member.id);
    const memberFolders = folders.filter((folder) => folder.ownerMemberId === member.id);
    groups.push({
      label: member.displayName,
      items: [...folderItems(memberFolders), ...memberDocs.map((doc) => ({ type: 'doc' as const, doc, depth: depthFromPath(doc.path) - 1 }))]
        .sort(sortTreeItem)
    });
  });

  return groups.filter((group) => group.items.length > 0);
}

function folderItems(folders: DocumentFolder[]): TreeItem[] {
  return folders
    .filter((folder) => folder.path.split('/').length > 1)
    .map((folder) => ({
      type: 'folder' as const,
      path: folder.path,
      name: folder.name,
      ownerMemberId: folder.ownerMemberId,
      depth: depthFromPath(folder.path) - 1
    }));
}

function sortTreeItem(left: TreeItem, right: TreeItem): number {
  const leftPath = left.type === 'folder' ? left.path : left.doc.path;
  const rightPath = right.type === 'folder' ? right.path : right.doc.path;
  return leftPath.localeCompare(rightPath, 'ko-KR');
}

function depthFromPath(path: string): number {
  return path.split('/').length;
}

function indent(depth: number): string {
  return depth > 0 ? `${'· '.repeat(Math.max(0, depth - 1))}` : '';
}

function createDraft(
  kind: DocumentKind,
  currentMember: StudyMember | null,
  session: StudySession | null,
  ownerMemberId = currentMember?.id ?? null,
  basePath?: string
): DocumentDraft {
  const memberSegment = currentMember?.memberUid ?? 'shared';
  const folder = basePath ?? defaultFolderBase(kind, currentMember, session);
  const fileName = kind === 'presentation' ? 'new-presentation' : 'new-note';

  return {
    kind,
    title: kind === 'presentation' ? '새 발표 자료' : '새 자료',
    summary: '',
    ownerMemberId,
    sessionId: kind === 'presentation' ? session?.id ?? null : null,
    path: `${folder || `자료/${memberSegment}`}/${fileName}.md`,
    tags: ['study'],
    body: emptyBody
  };
}

function defaultFolderBase(kind: DocumentKind, currentMember: StudyMember | null, session: StudySession | null): string {
  if (kind === 'presentation') {
    const week = session?.week ?? 1;
    return `발표/${week}회차/${currentMember?.memberUid ?? 'shared'}`;
  }

  return currentMember ? `자료/${currentMember.memberUid}` : '자료/공유';
}

function fromDocument(doc: StudyDocument): DocumentDraft {
  return {
    id: doc.id,
    kind: doc.kind,
    title: doc.title,
    summary: doc.summary,
    ownerMemberId: doc.ownerMemberId,
    sessionId: doc.sessionId,
    path: doc.path,
    tags: doc.tags,
    body: doc.body
  };
}



