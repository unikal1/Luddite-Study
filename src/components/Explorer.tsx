import { Check, Clipboard, Edit3, ExternalLink, FileText, Folder, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getUserName, sessions } from '../data';
import type { ContentKind, MarkdownDoc } from '../types';
import { formatDate } from '../utils/dates';
import { githubDevUrl, githubEditUrl } from '../utils/githubLinks';
import { MarkdownView } from './MarkdownView';
import { StatusBadge } from './StatusBadge';

type ExplorerProps = {
  kind: ContentKind;
  docs: MarkdownDoc[];
};

export function Explorer({ kind, docs }: ExplorerProps) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(docs[0]?.id ?? '');
  const [copiedPath, setCopiedPath] = useState('');

  const filteredDocs = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return docs;
    }

    return docs.filter((doc) => {
      const haystack = `${doc.title} ${doc.summary} ${doc.path} ${doc.tags.join(' ')}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [docs, query]);
  const selected = filteredDocs.find((doc) => doc.id === selectedId) ?? filteredDocs[0];

  const grouped = useMemo(() => groupDocuments(kind, filteredDocs), [filteredDocs, kind]);

  useEffect(() => {
    if (filteredDocs.length === 0) {
      setSelectedId('');
      return;
    }

    if (!filteredDocs.some((doc) => doc.id === selectedId)) {
      setSelectedId(filteredDocs[0].id);
    }
  }, [filteredDocs, selectedId]);

  async function copyPath(path: string) {
    await navigator.clipboard.writeText(path);
    setCopiedPath(path);
    window.setTimeout(() => setCopiedPath(''), 1800);
  }

  return (
    <div className="explorer-page">
      <section className="explorer-header">
        <div>
          <p className="eyebrow">{kind === 'material' ? 'Markdown 자료' : '발표 자료'}</p>
          <h1>{kind === 'material' ? '자료 탐색' : '발표 탐색'}</h1>
          <p className="lead">
            {kind === 'material'
              ? '개인 자료와 공유 자료를 디렉토리 구조 그대로 탐색한다.'
              : '회차와 사용자 기준으로 발표 Markdown을 확인한다.'}
          </p>
        </div>
        <label className="search-box">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">검색</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="제목, 태그, 경로 검색" />
        </label>
      </section>

      <div className="explorer-layout">
        <aside className="library-rail" aria-label="문서 목록">
          {grouped.map((group) => (
            <div className="tree-group" key={group.label}>
              <h2>
                <Folder size={16} aria-hidden="true" />
                {group.label}
              </h2>
              <div className="tree-list">
                {group.docs.map((doc) => (
                  <button
                    className={doc.id === selected?.id ? 'tree-item tree-item--active' : 'tree-item'}
                    key={doc.id}
                    type="button"
                    aria-pressed={doc.id === selected?.id}
                    onClick={() => setSelectedId(doc.id)}
                  >
                    <FileText size={16} aria-hidden="true" />
                    <span>{doc.title}</span>
                    <small>{doc.path}</small>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        {selected ? (
          <section className="reader-panel" aria-labelledby="reader-title">
            <div className="reader-toolbar">
              <div>
                <div className="breadcrumb">{selected.segments.join(' / ')}</div>
                <h2 id="reader-title">{selected.title}</h2>
                <div className="meta-row">
                  <span>{selected.ownerId === 'shared' ? '공유' : getUserName(selected.ownerId)}</span>
                  {selected.sessionId ? <span>{selected.sessionId}회차</span> : null}
                  <span>{selected.readingMinutes}분 읽기</span>
                  <span>수정 {formatDate(selected.updatedAt ?? selected.createdAt)}</span>
                </div>
              </div>
              <div className="toolbar-actions">
                <button
                  className="icon-button"
                  type="button"
                  onClick={() => copyPath(selected.path)}
                  aria-label={copiedPath === selected.path ? '문서 경로 복사됨' : '문서 경로 복사'}
                  title={copiedPath === selected.path ? '복사됨' : '경로 복사'}
                >
                  {copiedPath === selected.path ? <Check size={18} aria-hidden="true" /> : <Clipboard size={18} aria-hidden="true" />}
                </button>
                <a className="icon-button" href={githubEditUrl(selected.path)} target="_blank" rel="noreferrer" aria-label="GitHub에서 수정">
                  <Edit3 size={18} aria-hidden="true" />
                </a>
                <a className="icon-button" href={githubDevUrl(selected.path)} target="_blank" rel="noreferrer" aria-label="github.dev에서 열기">
                  <ExternalLink size={18} aria-hidden="true" />
                </a>
              </div>
            </div>

            {selected.summary ? <p className="doc-summary">{selected.summary}</p> : null}
            <div className="tag-row">
              {selected.tags.map((tag) => (
                <StatusBadge key={tag} label={`#${tag}`} />
              ))}
            </div>
            <MarkdownView content={selected.body} />
          </section>
        ) : (
          <section className="reader-panel empty-state" aria-label="검색 결과 없음">검색 결과가 없습니다.</section>
        )}
      </div>
    </div>
  );
}

function groupDocuments(kind: ContentKind, docs: MarkdownDoc[]): Array<{ label: string; docs: MarkdownDoc[] }> {
  const groups = new Map<string, MarkdownDoc[]>();

  if (kind === 'presentation') {
    docs.forEach((doc) => {
      const session = sessions.find((item) => item.id === doc.sessionId);
      const sessionLabel = session ? `${doc.segments[1]} · ${session.title}` : doc.segments[1] ?? '회차 없음';
      const label = `발표 / ${sessionLabel} / ${getUserName(doc.ownerId)}`;
      groups.set(label, [...(groups.get(label) ?? []), doc]);
    });

    return Array.from(groups, ([label, groupDocs]) => ({ label, docs: groupDocs }))
      .sort((left, right) => (right.docs[0]?.sessionId ?? 0) - (left.docs[0]?.sessionId ?? 0));
  }

  docs.forEach((doc) => {
    const ownerLabel = doc.ownerId === 'shared' ? '공유' : getUserName(doc.ownerId);
    const nested = doc.segments.slice(2, -1);
    const label = ['자료', ownerLabel, ...nested].join(' / ');
    groups.set(label, [...(groups.get(label) ?? []), doc]);
  });

  return Array.from(groups, ([label, groupDocs]) => ({ label, docs: groupDocs }))
    .sort((left, right) => left.label.localeCompare(right.label, 'ko-KR'));
}
