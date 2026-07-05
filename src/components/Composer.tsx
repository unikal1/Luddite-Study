import { Check, Clipboard, Code2, Edit3, ExternalLink, FileImage, FilePlus2, KeyRound, ListChecks, RotateCcw, Save, Table2, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { allDocs } from '../content';
import { activeUsers, sessions } from '../data';
import type { MarkdownDoc } from '../types';
import { todayIso } from '../utils/dates';
import { parseFrontmatter } from '../utils/frontmatter';
import { deleteRepositoryFile, writeRepositoryFile } from '../utils/githubApi';
import { githubDevUrl, githubEditUrl, githubNewFileUrl } from '../utils/githubLinks';
import { slugifyFileName } from '../utils/path';
import { MarkdownView } from './MarkdownView';

type DraftAction = 'create' | 'edit' | 'delete';
type DraftKind = 'material' | 'shared' | 'presentation';
type StoredDraft = {
  kind: DraftKind;
  ownerId: string;
  sessionId: string;
  title: string;
  summary: string;
  tags: string;
  createdAt: string;
  folder: string;
  fileName: string;
  body: string;
};
type WriteStatus = {
  kind: 'idle' | 'pending' | 'success' | 'error';
  message: string;
  href?: string;
};

const defaultBody = `# 핵심 정리

- 

## 메모

`;
const draftStorageKey = 'luddite-study-composer-draft-v1';
const credentialStorageKey = 'luddite-study-github-write-credential-v1';

export function Composer() {
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [action, setAction] = useState<DraftAction>('create');
  const [selectedDocId, setSelectedDocId] = useState(allDocs[0]?.id ?? '');
  const [kind, setKind] = useState<DraftKind>('material');
  const [ownerId, setOwnerId] = useState(activeUsers[0]?.id ?? 'alice');
  const [sessionId, setSessionId] = useState(String(sessions.find((session) => session.status === 'current')?.id ?? 1));
  const [title, setTitle] = useState('새 스터디 노트');
  const [summary, setSummary] = useState('이번 회차에서 다룬 핵심 내용을 정리한다.');
  const [tags, setTags] = useState('study, note');
  const [createdAt, setCreatedAt] = useState(() => todayIso());
  const [folder, setFolder] = useState('');
  const [fileName, setFileName] = useState('new-note');
  const [body, setBody] = useState(defaultBody);
  const [copied, setCopied] = useState(false);
  const [credential, setCredential] = useState(() => (
    typeof window === 'undefined' ? '' : window.sessionStorage.getItem(credentialStorageKey) ?? ''
  ));
  const [rememberCredential, setRememberCredential] = useState(() => (
    typeof window === 'undefined' ? false : Boolean(window.sessionStorage.getItem(credentialStorageKey))
  ));
  const [writeStatus, setWriteStatus] = useState<WriteStatus>({ kind: 'idle', message: '' });
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const today = todayIso();
  const selectedDoc = useMemo(
    () => allDocs.find((doc) => doc.id === selectedDocId) ?? allDocs[0],
    [selectedDocId]
  );
  const isDeleteMode = action === 'delete';
  const isExistingMode = action !== 'create';

  const recommendedPath = useMemo(() => {
    if (action !== 'create' && selectedDoc) {
      return selectedDoc.path;
    }

    const safeFile = slugifyFileName(fileName || title);
    const folderPart = folder.trim() ? `${slugifyFileName(folder)}/` : '';

    if (kind === 'shared') {
      return `자료/공유/${folderPart}${safeFile}.md`;
    }

    if (kind === 'presentation') {
      return `발표/${sessionId}회차/${ownerId}/${folderPart}${safeFile}.md`;
    }

    return `자료/${ownerId}/${folderPart}${safeFile}.md`;
  }, [action, fileName, folder, kind, ownerId, selectedDoc, sessionId, title]);

  const markdown = useMemo(() => {
    const tagList = tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    const yamlTags = tagList.length > 0 ? tagList.map((tag) => `  - ${escapeYamlValue(tag)}`).join('\n') : '  - study';
    const owner = kind === 'shared' ? 'shared' : ownerId;
    const sessionLine = kind === 'presentation' ? `session: ${sessionId}\n` : '';

    return `---\ntitle: ${escapeYamlValue(title)}\nowner: ${owner}\n${sessionLine}createdAt: ${createdAt}\nupdatedAt: ${today}\ntags:\n${yamlTags}\nsummary: ${escapeYamlValue(summary)}\n---\n\n${body.trim()}\n`;
  }, [body, createdAt, kind, ownerId, sessionId, summary, tags, title, today]);
  const previewBody = useMemo(() => parseFrontmatter(markdown).body, [markdown]);
  const deleteChecklist = useMemo(() => createDeleteChecklist(selectedDoc), [selectedDoc]);
  const copyPayload = action === 'delete' ? deleteChecklist : markdown;

  useEffect(() => {
    if (rememberCredential && credential.trim()) {
      window.sessionStorage.setItem(credentialStorageKey, credential);
      return;
    }

    window.sessionStorage.removeItem(credentialStorageKey);
  }, [credential, rememberCredential]);

  useEffect(() => {
    setWriteStatus({ kind: 'idle', message: '' });
    setDeleteConfirmed(false);
  }, [action, markdown, recommendedPath]);

  useEffect(() => {
    if (draftLoaded) {
      return;
    }

    const raw = window.localStorage.getItem(draftStorageKey);

    if (!raw) {
      setDraftLoaded(true);
      return;
    }

    try {
      const stored = JSON.parse(raw) as Partial<StoredDraft>;
      if (isDraftKind(stored.kind)) {
        setKind(stored.kind);
      }
      if (typeof stored.ownerId === 'string') setOwnerId(stored.ownerId);
      if (typeof stored.sessionId === 'string') setSessionId(stored.sessionId);
      if (typeof stored.title === 'string') setTitle(stored.title);
      if (typeof stored.summary === 'string') setSummary(stored.summary);
      if (typeof stored.tags === 'string') setTags(stored.tags);
      if (typeof stored.createdAt === 'string') setCreatedAt(stored.createdAt);
      if (typeof stored.folder === 'string') setFolder(stored.folder);
      if (typeof stored.fileName === 'string') setFileName(stored.fileName);
      if (typeof stored.body === 'string') setBody(stored.body);
    } catch {
      window.localStorage.removeItem(draftStorageKey);
    } finally {
      setDraftLoaded(true);
    }
  }, [draftLoaded]);

  useEffect(() => {
    if (!draftLoaded || action !== 'create') {
      return;
    }

    const stored: StoredDraft = {
      kind,
      ownerId,
      sessionId,
      title,
      summary,
      tags,
      createdAt,
      folder,
      fileName,
      body
    };

    window.localStorage.setItem(draftStorageKey, JSON.stringify(stored));
  }, [action, body, createdAt, draftLoaded, fileName, folder, kind, ownerId, sessionId, summary, tags, title]);

  useEffect(() => {
    if (action === 'create' || !selectedDoc) {
      return;
    }

    setKind(selectedDoc.kind === 'presentation' ? 'presentation' : selectedDoc.ownerId === 'shared' ? 'shared' : 'material');
    setOwnerId(selectedDoc.ownerId === 'shared' ? activeUsers[0]?.id ?? 'alice' : selectedDoc.ownerId);
    setSessionId(String(selectedDoc.sessionId ?? sessions.find((session) => session.status === 'current')?.id ?? 1));
    setTitle(selectedDoc.title);
    setSummary(selectedDoc.summary);
    setTags(selectedDoc.tags.join(', '));
    setCreatedAt(selectedDoc.createdAt ?? today);
    setBody(selectedDoc.body);
    setFileName(selectedDoc.path.split('/').at(-1)?.replace(/\.md$/, '') ?? 'document');
    setFolder('');
  }, [action, selectedDoc, today]);

  async function copyMarkdown() {
    await navigator.clipboard.writeText(copyPayload);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function applyRepositoryWrite() {
    const trimmedCredential = credential.trim();

    if (!trimmedCredential) {
      setWriteStatus({ kind: 'error', message: '저장소에 쓸 수 있는 GitHub 인증값을 입력하세요.' });
      return;
    }

    if (action === 'delete' && !deleteConfirmed) {
      setWriteStatus({ kind: 'error', message: '삭제 전 확인 체크를 먼저 켜세요.' });
      return;
    }

    setWriteStatus({ kind: 'pending', message: 'GitHub 저장소에 반영하는 중입니다.' });

    try {
      const response = action === 'delete'
        ? await deleteRepositoryFile({
          path: recommendedPath,
          credential: trimmedCredential,
          message: `Delete study document: ${selectedDoc?.title ?? recommendedPath}`
        })
        : await writeRepositoryFile({
          path: recommendedPath,
          content: markdown,
          credential: trimmedCredential,
          mode: action === 'create' ? 'create' : 'update',
          message: `${action === 'create' ? 'Add' : 'Update'} study document: ${title}`
        });

      setWriteStatus({
        kind: 'success',
        message: '저장소에 반영됐습니다. GitHub Pages는 보통 1-2분 뒤 새 빌드로 갱신됩니다.',
        href: response.commit?.html_url ?? response.content?.html_url
      });
    } catch (error) {
      setWriteStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'GitHub 저장소 반영에 실패했습니다.'
      });
    }
  }

  function clearCredential() {
    setCredential('');
    setRememberCredential(false);
    window.sessionStorage.removeItem(credentialStorageKey);
  }

  function resetCreateDraft() {
    setAction('create');
    setKind('material');
    setOwnerId(activeUsers[0]?.id ?? 'alice');
    setSessionId(String(sessions.find((session) => session.status === 'current')?.id ?? 1));
    setTitle('새 스터디 노트');
    setSummary('이번 회차에서 다룬 핵심 내용을 정리한다.');
    setTags('study, note');
    setCreatedAt(today);
    setFolder('');
    setFileName('new-note');
    setBody(defaultBody);
    window.localStorage.removeItem(draftStorageKey);
  }

  function insertMarkdown(snippet: string) {
    const textarea = textareaRef.current;

    if (!textarea) {
      setBody((current) => appendBlock(current, snippet));
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = body.slice(0, start);
    const after = body.slice(end);
    const spacerBefore = before.trim() && !before.endsWith('\n\n') ? '\n\n' : '';
    const spacerAfter = after.trim() && !snippet.endsWith('\n\n') ? '\n\n' : '';
    const next = `${before}${spacerBefore}${snippet}${spacerAfter}${after}`;
    const nextCursor = before.length + spacerBefore.length + snippet.length;

    setBody(next);
    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(nextCursor, nextCursor);
    });
  }

  return (
    <div className="composer-page">
      <section className="composer-header">
        <div>
          <p className="eyebrow">서버 없는 작성 UX</p>
          <h1>Markdown 작성</h1>
          <p className="lead">초안을 작성하고 미리본 뒤, 추천 경로와 내용을 GitHub 파일로 반영한다.</p>
        </div>
        <div className="composer-links">
          <a className="secondary-button" href={githubDevUrl()} target="_blank" rel="noreferrer">
            <ExternalLink size={18} aria-hidden="true" />
            github.dev
          </a>
          <a
            className="primary-button"
            href={action === 'create' ? githubNewFileUrl(recommendedPath) : githubEditUrl(recommendedPath)}
            target="_blank"
            rel="noreferrer"
          >
            {action === 'create' ? <FilePlus2 size={18} aria-hidden="true" /> : <Edit3 size={18} aria-hidden="true" />}
            {action === 'create' ? 'GitHub에 만들기' : 'GitHub에서 열기'}
          </a>
        </div>
      </section>

      <div className="composer-grid">
        <form className="editor-panel" onSubmit={(event) => event.preventDefault()}>
          <fieldset className="segmented-control" aria-label="작업 종류">
            <button
              className={action === 'create' ? 'segment segment--active' : 'segment'}
              type="button"
              aria-pressed={action === 'create'}
              onClick={resetCreateDraft}
            >
              새 문서
            </button>
            <button
              className={action === 'edit' ? 'segment segment--active' : 'segment'}
              type="button"
              aria-pressed={action === 'edit'}
              onClick={() => setAction('edit')}
            >
              수정
            </button>
            <button
              className={action === 'delete' ? 'segment segment--active' : 'segment'}
              type="button"
              aria-pressed={action === 'delete'}
              onClick={() => setAction('delete')}
            >
              삭제 준비
            </button>
          </fieldset>

          {action !== 'create' ? (
            <label>
              기존 문서
              <select value={selectedDocId} onChange={(event) => setSelectedDocId(event.target.value)}>
                {allDocs.map((doc) => (
                  <option key={doc.id} value={doc.id}>{doc.path}</option>
                ))}
              </select>
            </label>
          ) : null}
          {action === 'create' ? (
            <div className="draft-helper">
              <span>새 문서 초안은 이 브라우저에 자동 저장됩니다.</span>
              <button className="text-button" type="button" onClick={resetCreateDraft}>
                <RotateCcw size={16} aria-hidden="true" />
                초안 초기화
              </button>
            </div>
          ) : null}
          {action === 'edit' ? (
            <div className="draft-helper">
              <span>수정 모드는 기존 파일 경로를 유지합니다. 문서 종류, 사용자, 회차, 파일명은 GitHub에서 파일 이동이 필요할 때만 별도로 변경하세요.</span>
            </div>
          ) : null}

          {isDeleteMode ? (
            <div className="draft-helper">
              <span>삭제 대상만 선택하면 오른쪽에 체크리스트가 만들어집니다.</span>
            </div>
          ) : (
            <>
              <fieldset className="segmented-control" aria-label="문서 종류">
                <button
                  className={kind === 'material' ? 'segment segment--active' : 'segment'}
                  type="button"
                  aria-pressed={kind === 'material'}
                  onClick={() => setKind('material')}
                  disabled={isExistingMode}
                >
                  개인 자료
                </button>
                <button
                  className={kind === 'shared' ? 'segment segment--active' : 'segment'}
                  type="button"
                  aria-pressed={kind === 'shared'}
                  onClick={() => setKind('shared')}
                  disabled={isExistingMode}
                >
                  공유 자료
                </button>
                <button
                  className={kind === 'presentation' ? 'segment segment--active' : 'segment'}
                  type="button"
                  aria-pressed={kind === 'presentation'}
                  onClick={() => setKind('presentation')}
                  disabled={isExistingMode}
                >
                  발표 자료
                </button>
              </fieldset>

              <div className="form-grid">
                <label>
                  사용자
                  <select value={ownerId} onChange={(event) => setOwnerId(event.target.value)} disabled={kind === 'shared' || isExistingMode}>
                    {activeUsers.map((user) => (
                      <option key={user.id} value={user.id}>{user.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  회차
                  <select value={sessionId} onChange={(event) => setSessionId(event.target.value)} disabled={kind !== 'presentation' || isExistingMode}>
                    {sessions.map((session) => (
                      <option key={session.id} value={session.id}>{session.id}회차 · {session.title}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label>
                제목
                <input value={title} onChange={(event) => setTitle(event.target.value)} />
              </label>
              <label>
                요약
                <input value={summary} onChange={(event) => setSummary(event.target.value)} />
              </label>
              <details className="form-details">
                <summary>세부 설정</summary>
                <div className="form-grid">
                  <label>
                    폴더
                    <input value={folder} onChange={(event) => setFolder(event.target.value)} placeholder="선택 사항" disabled={isExistingMode} />
                  </label>
                  <label>
                    파일명
                    <input value={fileName} onChange={(event) => setFileName(event.target.value)} disabled={isExistingMode} />
                  </label>
                </div>
                <label>
                  태그
                  <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="쉼표로 구분" />
                </label>
              </details>
              <div className="markdown-shortcuts" aria-label="Markdown 빠른 삽입">
                <button type="button" className="icon-button" onClick={() => insertMarkdown('- [ ] 확인할 일\n- [ ] 다음 액션')} aria-label="체크리스트 삽입" title="체크리스트">
                  <ListChecks size={18} aria-hidden="true" />
                </button>
                <button type="button" className="icon-button" onClick={() => insertMarkdown('| 항목 | 내용 |\n| --- | --- |\n|  |  |')} aria-label="표 삽입" title="표">
                  <Table2 size={18} aria-hidden="true" />
                </button>
                <button type="button" className="icon-button" onClick={() => insertMarkdown('```ts\n// code\n```')} aria-label="코드블록 삽입" title="코드블록">
                  <Code2 size={18} aria-hidden="true" />
                </button>
                <button type="button" className="icon-button" onClick={() => insertMarkdown('![이미지 설명](/assets/example.png)')} aria-label="이미지 문법 삽입" title="이미지">
                  <FileImage size={18} aria-hidden="true" />
                </button>
              </div>
              <label>
                Markdown
                <textarea ref={textareaRef} value={body} onChange={(event) => setBody(event.target.value)} rows={16} />
              </label>
            </>
          )}
        </form>

        <section className="preview-panel" aria-labelledby="preview-title">
          <div className="preview-toolbar">
            <div>
              <h2 id="preview-title">미리보기</h2>
              <code>{recommendedPath}</code>
            </div>
            <button className="secondary-button" type="button" onClick={copyMarkdown}>
              {copied ? <Check size={18} aria-hidden="true" /> : action === 'delete' ? <Trash2 size={18} aria-hidden="true" /> : <Clipboard size={18} aria-hidden="true" />}
              {copied ? '복사됨' : action === 'delete' ? '삭제 체크리스트 복사' : 'Markdown 복사'}
            </button>
          </div>
          {action === 'delete' ? (
            <div className="delete-preview">
              <p className="warning-text">삭제는 되돌리기 어렵습니다. 직접 반영을 쓰면 아래 경로의 파일이 GitHub 저장소에서 삭제됩니다.</p>
              <code>{recommendedPath}</code>
              <MarkdownView content={deleteChecklist} />
            </div>
          ) : (
            <MarkdownView content={previewBody} />
          )}
          <RepositoryWritePanel
            action={action}
            credential={credential}
            deleteConfirmed={deleteConfirmed}
            rememberCredential={rememberCredential}
            status={writeStatus}
            onClearCredential={clearCredential}
            onCredentialChange={setCredential}
            onDeleteConfirmedChange={setDeleteConfirmed}
            onRememberCredentialChange={setRememberCredential}
            onSubmit={() => void applyRepositoryWrite()}
          />
        </section>
      </div>
    </div>
  );
}

function RepositoryWritePanel({
  action,
  credential,
  deleteConfirmed,
  rememberCredential,
  status,
  onClearCredential,
  onCredentialChange,
  onDeleteConfirmedChange,
  onRememberCredentialChange,
  onSubmit
}: {
  action: DraftAction;
  credential: string;
  deleteConfirmed: boolean;
  rememberCredential: boolean;
  status: WriteStatus;
  onClearCredential: () => void;
  onCredentialChange: (value: string) => void;
  onDeleteConfirmedChange: (value: boolean) => void;
  onRememberCredentialChange: (value: boolean) => void;
  onSubmit: () => void;
}) {
  const isPending = status.kind === 'pending';
  const buttonLabel = action === 'create'
    ? '저장소에 저장'
    : action === 'edit'
      ? '수정 반영'
      : '저장소에서 삭제';

  return (
    <section className="repository-write-panel" aria-labelledby="repository-write-title">
      <div className="repository-write-heading">
        <KeyRound size={18} aria-hidden="true" />
        <div>
          <h3 id="repository-write-title">저장소에 직접 반영</h3>
          <p>초대되어 쓰기 권한이 있는 GitHub 사용자만 성공합니다. 입력값은 저장소나 코드에 남기지 않습니다.</p>
        </div>
      </div>

      <label>
        GitHub 쓰기 인증값
        <input
          value={credential}
          onChange={(event) => onCredentialChange(event.target.value)}
          placeholder="Contents write 권한이 있는 값"
          type="password"
          autoComplete="off"
          spellCheck={false}
        />
      </label>

      <div className="repository-write-controls">
        <label className="check-row repository-check">
          <input
            checked={rememberCredential}
            onChange={(event) => onRememberCredentialChange(event.target.checked)}
            type="checkbox"
          />
          <span>이 탭에만 보관</span>
        </label>
        <button className="text-button" type="button" onClick={onClearCredential}>
          인증값 지우기
        </button>
      </div>

      {action === 'delete' ? (
        <label className="check-row repository-check repository-check--danger">
          <input
            checked={deleteConfirmed}
            onChange={(event) => onDeleteConfirmedChange(event.target.checked)}
            type="checkbox"
          />
          <span>선택한 파일 삭제를 확인했습니다.</span>
        </label>
      ) : null}

      <button className={action === 'delete' ? 'danger-button' : 'primary-button'} type="button" onClick={onSubmit} disabled={isPending}>
        {action === 'delete' ? <Trash2 size={18} aria-hidden="true" /> : <Save size={18} aria-hidden="true" />}
        {isPending ? '반영 중' : buttonLabel}
      </button>

      {status.kind !== 'idle' ? (
        <p className={`repository-write-status repository-write-status--${status.kind}`}>
          {status.message}
          {status.href ? (
            <>
              {' '}
              <a href={status.href} target="_blank" rel="noreferrer">커밋 보기</a>
            </>
          ) : null}
        </p>
      ) : null}
    </section>
  );
}

function createDeleteChecklist(doc?: MarkdownDoc): string {
  if (!doc) {
    return '삭제할 문서를 선택하세요.';
  }

  return `# 삭제 준비

- [ ] GitHub에서 \`${doc.path}\` 파일을 삭제한다.
- [ ] 이 문서를 참조하는 \`data/sessions.json\`의 \`resources\` 항목이 있으면 같이 정리한다.
- [ ] 삭제 이유를 commit message 또는 PR 본문에 남긴다.
- [ ] 배포 후 자료/발표 탐색 화면에서 사라졌는지 확인한다.

삭제 대상: ${doc.title}
경로: ${doc.path}
`;
}

function appendBlock(current: string, snippet: string): string {
  const spacer = current.trim() && !current.endsWith('\n\n') ? '\n\n' : '';
  return `${current}${spacer}${snippet}`;
}

function escapeYamlValue(value: string): string {
  if (/[:#[\]{},&*!|>'"%@`]/.test(value)) {
    return JSON.stringify(value);
  }

  return value || '제목 없음';
}

function isDraftKind(value: unknown): value is DraftKind {
  return value === 'material' || value === 'shared' || value === 'presentation';
}
