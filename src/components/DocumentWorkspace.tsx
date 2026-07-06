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
  const [selectedFolderPath, setSelectedFolderPath] = useState('');
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState('');
  const [folderDraft, setFolderDraft] = useState('');
  const [parentPath, setParentPath] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
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

  const selected = visibleDocs.find((doc) => doc.id === selectedId) ?? null;
  const [draft, setDraft] = useState<DocumentDraft>(() => createDraft(kind, currentMember, sessions.find((session) => session.id === defaultSessionId) ?? null));

  useEffect(() => {
    if (visibleDocs.length === 0) {
      setSelectedId('');
      return;
    }

    if (selectedFolderPath) {
      return;
    }

    if (!visibleDocs.some((doc) => doc.id === selectedId)) {
      setSelectedId(visibleDocs[0].id);
    }
  }, [selectedFolderPath, selectedId, visibleDocs]);

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
    setCreateOpen(false);
    setCreatingFolder(false);
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
      const saved = await onSaveDocument(prepareDraftForSave(draft, data.documents));
      setSelectedId(saved.id);
      setSelectedFolderPath('');
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
      setSelectedFolderPath(path);
      setCreateOpen(false);
      setCreatingFolder(false);
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
            <button className="icon-button rail-add-button" type="button" onClick={() => {
              setCreateOpen((open) => !open);
              setCreatingFolder(false);
            }} aria-label={`${title} 만들기`} aria-expanded={createOpen}>
              +
            </button>
          ) : null}
        </div>

        {canWrite && createOpen ? (
          <div className="create-menu">
            <div className="create-menu-row">
              <button className="create-option" type="button" onClick={() => startNewDocument(undefined, parentPath || undefined)}>
                <FilePlus2 size={16} aria-hidden="true" />
                문서
              </button>
              <button className={creatingFolder ? 'create-option create-option--active' : 'create-option'} type="button" onClick={() => setCreatingFolder((open) => !open)}>
                <FolderPlus size={16} aria-hidden="true" />
                폴더
              </button>
            </div>
            {creatingFolder ? (
              <div className="folder-inline">
                <input value={folderDraft} onChange={(event) => setFolderDraft(event.target.value)} placeholder="새 폴더" aria-label="새 폴더 이름" />
                <button className="icon-button" type="button" onClick={() => void createFolder()} disabled={!folderDraft.trim()} aria-label="폴더 만들기">
                  <Check size={18} aria-hidden="true" />
                </button>
                <select value={parentPath} onChange={(event) => setParentPath(event.target.value)} aria-label="부모 경로">
                  <option value="">{defaultFolderLabel(kind)}</option>
                  {folderItems(kind, visibleFolders).map((folder) => (
                    <option key={folder.path} value={folder.path}>{folder.label}</option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
        ) : null}

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
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="제목, 태그" />
        </label>

        <div className="tree-list workspace-tree">
          {buildTreeItems(kind, visibleFolders, visibleDocs).map((item) => (
            item.type === 'folder' ? (
              <button className={item.path === selectedFolderPath ? 'tree-item tree-item--folder tree-item--active' : 'tree-item tree-item--folder'} key={`folder-${item.path}`} type="button" title={item.name} onClick={() => {
                setParentPath(item.path);
                setSelectedFolderPath(item.path);
                setSelectedId('');
                setEditing(false);
                setCreateOpen(true);
                setCreatingFolder(false);
              }}>
                <span className="tree-item-title" style={{ paddingLeft: `${item.depth * 14}px` }}>{item.name}</span>
              </button>
            ) : (
              <button className={item.doc.id === selected?.id ? 'tree-item tree-item--active' : 'tree-item'} key={item.doc.id} type="button" title={item.doc.title} onClick={() => {
                setSelectedId(item.doc.id);
                setSelectedFolderPath('');
                setEditing(false);
              }}>
                <span className="tree-item-title" style={{ paddingLeft: `${item.depth * 14}px` }}>{item.doc.title}</span>
              </button>
            )
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
              session={data.sessions.find((session) => session.id === selected.sessionId) ?? null}
              status={status}
              onDelete={() => void removeSelected()}
              onEdit={() => startEditDocument(selected)}
            />
          ) : (
            <div className="empty-state">
              <h2 id="reader-title">{selectedFolderPath ? '폴더 선택됨' : '문서 없음'}</h2>
              <p>{selectedFolderPath ? '상단의 + 버튼에서 이 폴더에 문서를 만들 수 있습니다.' : '왼쪽에서 문서를 선택하거나 새 문서를 만드세요.'}</p>
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
  session,
  status,
  onDelete,
  onEdit
}: {
  canWrite: boolean;
  doc: StudyDocument;
  session: StudySession | null;
  status: string;
  onDelete: () => void;
  onEdit: () => void;
}) {
  return (
    <>
      <div className="reader-toolbar">
        <div>
          <div className="breadcrumb">{doc.kind === 'presentation' && session ? `${session.week}회차 발표` : '자료'}</div>
          <h2 id="reader-title">{doc.title}</h2>
          <div className="meta-row">
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

type FolderTreeItem = { type: 'folder'; path: string; name: string; label: string; depth: number };
type TreeItem = FolderTreeItem | { type: 'doc'; doc: StudyDocument; depth: number };

function buildTreeItems(
  kind: DocumentKind,
  folders: DocumentFolder[],
  docs: StudyDocument[]
): TreeItem[] {
  return [
    ...folderItems(kind, folders),
    ...docs.map((doc) => ({
      type: 'doc' as const,
      doc,
      depth: Math.max(0, visiblePathParts(kind, doc.path).length - 1)
    }))
  ].sort(sortTreeItem);
}

function folderItems(kind: DocumentKind, folders: DocumentFolder[]): FolderTreeItem[] {
  return folders
    .map((folder) => {
      const parts = visiblePathParts(kind, folder.path);

      if (parts.length === 0) {
        return null;
      }

      return {
        type: 'folder' as const,
        path: folder.path,
        name: parts.at(-1) ?? folder.name,
        label: parts.join(' / '),
        depth: Math.max(0, parts.length - 1)
      };
    })
    .filter((folder): folder is FolderTreeItem => folder !== null);
}

function sortTreeItem(left: TreeItem, right: TreeItem): number {
  const leftPath = left.type === 'folder' ? left.path : left.doc.path;
  const rightPath = right.type === 'folder' ? right.path : right.doc.path;
  return leftPath.localeCompare(rightPath, 'ko-KR');
}

function visiblePathParts(kind: DocumentKind, path: string): string[] {
  const parts = path.split('/').filter(Boolean);
  const hiddenPrefixLength = kind === 'presentation' ? 3 : 2;
  return parts.slice(hiddenPrefixLength);
}

function defaultFolderLabel(kind: DocumentKind): string {
  return kind === 'presentation' ? '현재 회차' : '내 자료';
}

function prepareDraftForSave(draft: DocumentDraft, documents: StudyDocument[]): DocumentDraft {
  if (draft.id) {
    return draft;
  }

  const folder = draft.path.split('/').slice(0, -1).join('/');
  const fallback = draft.kind === 'presentation' ? 'new-presentation' : 'new-note';
  const fileName = slugifyFileName(draft.title) || fallback;
  const path = uniqueDocumentPath(`${folder}/${fileName}.md`, documents);

  return { ...draft, path };
}

function uniqueDocumentPath(path: string, documents: StudyDocument[]): string {
  const normalized = path.replace(/\/+/g, '/');
  const extension = normalized.endsWith('.md') ? '.md' : '';
  const withoutExtension = extension ? normalized.slice(0, -extension.length) : normalized;
  let candidate = extension ? normalized : `${normalized}.md`;
  let index = 2;

  while (documents.some((doc) => doc.path === candidate)) {
    candidate = `${withoutExtension}-${index}.md`;
    index += 1;
  }

  return candidate;
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



