import { Check, FilePlus2, FolderPlus, ImagePlus, Pencil, Search, Trash2 } from 'lucide-react';
import { FileText, Folder } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent, type RefObject } from 'react';
import type { DocumentDraft, DocumentFolder, DocumentKind, FolderDraft, FolderUpdateDraft, StudyData, StudyDocument, StudyMember, StudySession } from '../types';
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
  onUpdateFolder: (draft: FolderUpdateDraft) => Promise<DocumentFolder>;
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
  onUpdateFolder,
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
  const [parentPath, setParentPath] = useState('');
  const [renamingFolderPath, setRenamingFolderPath] = useState('');
  const [folderNameDraft, setFolderNameDraft] = useState('');
  const [draggedItem, setDraggedItem] = useState<DragTreeItem | null>(null);
  const [dropTargetPath, setDropTargetPath] = useState<string | null>(null);
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
    setRenamingFolderPath('');
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
    const folderName = '새로운 폴더';
    const cleanName = uniqueFolderSegment('새로운-폴더', parentPath || defaultFolderBase(kind, currentMember, sessions.find((session) => session.id === sessionId) ?? null), visibleFolders);
    const base = parentPath || defaultFolderBase(kind, currentMember, sessions.find((session) => session.id === sessionId) ?? null);
    const path = `${base}/${cleanName}`.replace(/\/+/g, '/');
    const session = sessions.find((item) => item.id === sessionId) ?? null;

    setStatus('폴더를 만드는 중입니다.');

    try {
      const created = await onCreateFolder({
        kind,
        path,
        name: folderName,
        parentPath: base,
        ownerMemberId: kind === 'material' ? currentMember?.id ?? null : draft.ownerMemberId ?? currentMember?.id ?? null,
        sessionId: kind === 'presentation' ? session?.id ?? null : null
      });
      setParentPath(created.path);
      setSelectedFolderPath(created.path);
      setRenamingFolderPath(created.path);
      setFolderNameDraft(created.name);
      setStatus('폴더가 만들어졌습니다.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '폴더 생성에 실패했습니다.');
    }
  }

  async function renameFolder(folderPath: string, nextName: string) {
    const folder = visibleFolders.find((item) => item.path === folderPath);
    const trimmed = nextName.trim();

    if (!folder || !trimmed) {
      setRenamingFolderPath('');
      return;
    }

    const base = folder.parentPath ?? folder.path.split('/').slice(0, -1).join('/');
    const nextSegment = uniqueFolderSegment(slugifyFileName(trimmed), base, visibleFolders, folder.id);
    const nextPath = `${base}/${nextSegment}`.replace(/\/+/g, '/');

    if (folder.name === trimmed && folder.path === nextPath) {
      setRenamingFolderPath('');
      return;
    }

    setStatus('폴더 이름을 바꾸는 중입니다.');

    try {
      const updated = await onUpdateFolder({
        id: folder.id,
        previousPath: folder.path,
        kind: folder.kind,
        path: nextPath,
        name: trimmed,
        parentPath: base,
        ownerMemberId: folder.ownerMemberId,
        sessionId: folder.sessionId
      });
      setParentPath(updated.path);
      setSelectedFolderPath(updated.path);
      setRenamingFolderPath('');
      setStatus('폴더 이름을 바꿨습니다.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '폴더 이름 변경에 실패했습니다.');
    }
  }

  function startRenameFolder(folder: FolderTreeItem) {
    setRenamingFolderPath(folder.path);
    setFolderNameDraft(folder.name);
    setSelectedFolderPath(folder.path);
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

  function handleTreeItemKeyDown(event: KeyboardEvent, action: () => void) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  }

  function handleTreeDragStart(event: DragEvent<HTMLElement>, item: DragTreeItem) {
    setDraggedItem(item);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/x-luddite-tree-item', JSON.stringify(item));
  }

  function handleTreeDragEnd() {
    setDraggedItem(null);
    setDropTargetPath(null);
  }

  function allowTreeDrop(event: DragEvent<HTMLElement>, targetPath: string) {
    if (!canWrite) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDropTargetPath(targetPath);
  }

  async function dropTreeItem(event: DragEvent<HTMLElement>, targetPath: string) {
    event.preventDefault();
    event.stopPropagation();

    const item = draggedItem ?? parseDraggedItem(event);
    setDraggedItem(null);
    setDropTargetPath(null);

    if (!item || !canWrite) {
      return;
    }

    if (item.type === 'doc') {
      const doc = visibleDocs.find((document) => document.id === item.id);
      if (doc) {
        await moveDocumentToFolder(doc, targetPath);
      }
      return;
    }

    await moveFolderToFolder(item.path, targetPath);
  }

  async function moveDocumentToFolder(doc: StudyDocument, targetPath: string) {
    const base = targetPath || defaultFolderBase(kind, currentMember, sessions.find((session) => session.id === sessionId) ?? null);
    const fileName = doc.path.split('/').at(-1) ?? `${slugifyFileName(doc.title)}.md`;
    const nextPath = uniqueDocumentPath(`${base}/${fileName}`, data.documents.filter((item) => item.id !== doc.id));

    if (nextPath === doc.path) {
      return;
    }

    setStatus('문서를 이동하는 중입니다.');

    try {
      const saved = await onSaveDocument({ ...fromDocument(doc), path: nextPath });
      setSelectedId(saved.id);
      setSelectedFolderPath('');
      setParentPath(base);
      setStatus('문서를 이동했습니다.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '문서 이동에 실패했습니다.');
    }
  }

  async function moveFolderToFolder(sourcePath: string, targetPath: string) {
    const folder = visibleFolders.find((item) => item.path === sourcePath);

    if (!folder) {
      return;
    }

    const base = targetPath || defaultFolderBase(kind, currentMember, sessions.find((session) => session.id === sessionId) ?? null);

    if (base === folder.path || base.startsWith(`${folder.path}/`) || base === folder.parentPath) {
      return;
    }

    const nextSegment = uniqueFolderSegment(slugifyFileName(folder.name), base, visibleFolders, folder.id);
    const nextPath = `${base}/${nextSegment}`.replace(/\/+/g, '/');

    setStatus('폴더를 이동하는 중입니다.');

    try {
      const updated = await onUpdateFolder({
        id: folder.id,
        previousPath: folder.path,
        kind: folder.kind,
        path: nextPath,
        name: folder.name,
        parentPath: base,
        ownerMemberId: folder.ownerMemberId,
        sessionId: folder.sessionId
      });
      setSelectedFolderPath(updated.path);
      setParentPath(updated.path);
      setStatus('폴더를 이동했습니다.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '폴더 이동에 실패했습니다.');
    }
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
            <div className="rail-actions">
              <button className="icon-button rail-add-button" type="button" onClick={() => startNewDocument(undefined, parentPath || undefined)} aria-label={`${title} 파일 추가`}>
                <FilePlus2 size={18} aria-hidden="true" />
              </button>
              <button className="icon-button rail-add-button" type="button" onClick={() => void createFolder()} aria-label={`${title} 폴더 추가`}>
                <FolderPlus size={18} aria-hidden="true" />
              </button>
            </div>
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
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="제목, 태그" />
        </label>

        <div
          className={dropTargetPath === '' ? 'tree-list workspace-tree workspace-tree--drop-target' : 'tree-list workspace-tree'}
          onDragOver={(event) => allowTreeDrop(event, '')}
          onDrop={(event) => void dropTreeItem(event, '')}
          onDragLeave={() => setDropTargetPath(null)}
        >
          {buildTreeItems(kind, visibleFolders, visibleDocs).map((item) => (
            item.type === 'folder' ? (
              <div
                aria-label={item.name}
                className={[
                  'tree-item',
                  'tree-item--folder',
                  item.path === selectedFolderPath ? 'tree-item--active' : '',
                  dropTargetPath === item.path ? 'tree-item--drop-target' : ''
                ].filter(Boolean).join(' ')}
                draggable={canWrite}
                key={`folder-${item.path}`}
                role="button"
                tabIndex={0}
                title={item.name}
                onClick={() => {
                  setParentPath(item.path);
                  setSelectedFolderPath(item.path);
                  setSelectedId('');
                  setEditing(false);
                }}
                onDoubleClick={() => startRenameFolder(item)}
                onDragEnd={handleTreeDragEnd}
                onDragOver={(event) => allowTreeDrop(event, item.path)}
                onDragStart={(event) => handleTreeDragStart(event, { type: 'folder', path: item.path })}
                onDrop={(event) => void dropTreeItem(event, item.path)}
                onKeyDown={(event) => {
                  if (event.key === 'F2') {
                    event.preventDefault();
                    startRenameFolder(item);
                    return;
                  }

                  handleTreeItemKeyDown(event, () => {
                    setParentPath(item.path);
                    setSelectedFolderPath(item.path);
                    setSelectedId('');
                    setEditing(false);
                  });
                }}
              >
                <Folder className="tree-item-icon" size={16} aria-hidden="true" style={{ marginLeft: `${item.depth * 14}px` }} />
                {renamingFolderPath === item.path ? (
                  <input
                    className="tree-rename-input"
                    value={folderNameDraft}
                    autoFocus
                    onBlur={() => void renameFolder(item.path, folderNameDraft)}
                    onChange={(event) => setFolderNameDraft(event.target.value)}
                    onClick={(event) => event.stopPropagation()}
                    onDoubleClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        event.currentTarget.blur();
                      }

                      if (event.key === 'Escape') {
                        event.preventDefault();
                        setRenamingFolderPath('');
                      }
                    }}
                  />
                ) : (
                  <span className="tree-item-title">{item.name}</span>
                )}
              </div>
            ) : (
              <div
                aria-label={item.doc.title}
                className={item.doc.id === selected?.id ? 'tree-item tree-item--active' : 'tree-item'}
                draggable={canWrite}
                key={item.doc.id}
                role="button"
                tabIndex={0}
                title={item.doc.title}
                onClick={() => {
                  setSelectedId(item.doc.id);
                  setSelectedFolderPath('');
                  setEditing(false);
                }}
                onDragEnd={handleTreeDragEnd}
                onDragStart={(event) => handleTreeDragStart(event, { type: 'doc', id: item.doc.id })}
                onKeyDown={(event) => handleTreeItemKeyDown(event, () => {
                  setSelectedId(item.doc.id);
                  setSelectedFolderPath('');
                  setEditing(false);
                })}
              >
                <FileText className="tree-item-icon" size={16} aria-hidden="true" style={{ marginLeft: `${item.depth * 14}px` }} />
                <span className="tree-item-title">{item.doc.title}</span>
              </div>
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
              member={data.members.find((member) => member.id === selected.ownerMemberId) ?? null}
              session={data.sessions.find((session) => session.id === selected.sessionId) ?? null}
              status={status}
              onDelete={() => void removeSelected()}
              onEdit={() => startEditDocument(selected)}
            />
          ) : (
            <div className="empty-state">
              <h2 id="reader-title">{selectedFolderPath ? '폴더 선택됨' : '문서 없음'}</h2>
              <p>{selectedFolderPath ? '상단의 + 버튼에서 이 폴더에 문서를 만들 수 있습니다.' : '왼쪽에서 문서를 선택하거나 새 문서를 만드세요.'}</p>
              {status ? <p className="form-status">{status}</p> : null}
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
          <div className="breadcrumb">{doc.kind === 'presentation' && session ? `${session.week}회차 발표` : '자료'}</div>
          <div className="reader-author">작성자 {member?.displayName ?? '공유'}</div>
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
type DragTreeItem =
  | { type: 'folder'; path: string }
  | { type: 'doc'; id: string };

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
        name: folder.name || parts.at(-1) || '폴더',
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

function parseDraggedItem(event: DragEvent<HTMLElement>): DragTreeItem | null {
  const raw = event.dataTransfer.getData('application/x-luddite-tree-item');

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as DragTreeItem;
    if (parsed.type === 'folder' || parsed.type === 'doc') {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
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

function uniqueFolderSegment(segment: string, parentPath: string, folders: DocumentFolder[], ignoreId?: string): string {
  const normalized = slugifyFileName(segment);
  let candidate = normalized;
  let index = 2;

  while (folders.some((folder) => folder.id !== ignoreId && folder.path === `${parentPath}/${candidate}`.replace(/\/+/g, '/'))) {
    candidate = `${normalized}-${index}`;
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



