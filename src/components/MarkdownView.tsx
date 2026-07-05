import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type MarkdownViewProps = {
  content: string;
};

export function MarkdownView({ content }: MarkdownViewProps) {
  return (
    <article className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
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
          img: ({ alt, src }) => <img alt={alt ?? ''} src={normalizeContentUrl(src)} loading="lazy" />
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}

function normalizeContentUrl(url?: string): string | undefined {
  if (!url) {
    return url;
  }

  if (/^(https?:|mailto:|tel:|data:|#)/.test(url)) {
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
