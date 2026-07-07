import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import { attachmentPathFromSrc, isSupabaseAttachment, storageBucketId, supabase } from '../lib/supabase';

type MarkdownViewProps = {
  content: string;
};

export function MarkdownView({ content }: MarkdownViewProps) {
  return (
    <article className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          a: ({ href, children }) => (
            <a href={normalizeContentUrl(href)} target={href?.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="table-scroll" tabIndex={0}>
              <table>{children}</table>
            </div>
          ),
          pre: ({ children }) => <pre tabIndex={0}>{children}</pre>,
          input: (props) => (
            <input
              {...props}
              aria-label={props.type === 'checkbox' ? '체크리스트 항목' : props['aria-label']}
            />
          ),
          img: ({ alt, src }) => <MarkdownImage alt={alt ?? ''} src={src ?? ''} />
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}

function MarkdownImage({ alt, src }: { alt: string; src: string }) {
  const [resolvedSrc, setResolvedSrc] = useState(() => normalizeContentUrl(src));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      if (!isSupabaseAttachment(src)) {
        setResolvedSrc(normalizeContentUrl(src));
        return;
      }

      const objectPath = attachmentPathFromSrc(src);
      const { data, error } = await supabase.storage.from(storageBucketId).createSignedUrl(objectPath, 60 * 60);

      if (cancelled) {
        return;
      }

      if (error || !data?.signedUrl) {
        setFailed(true);
        return;
      }

      setResolvedSrc(data.signedUrl);
    }

    void resolve();
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (failed) {
    return <span className="image-fallback">{alt || '이미지를 불러올 수 없습니다.'}</span>;
  }

  return <img alt={alt} src={resolvedSrc} loading="lazy" />;
}

function normalizeContentUrl(url?: string): string | undefined {
  if (!url) {
    return url;
  }

  if (isSupabaseAttachment(url) || /^(https?:|mailto:|tel:|data:|blob:|#)/.test(url)) {
    return url;
  }

  const base = import.meta.env.BASE_URL;

  if (url.startsWith(base)) {
    return url;
  }

  if (url.startsWith('/')) {
    return `${base}${url.slice(1)}`;
  }

  return url;
}
