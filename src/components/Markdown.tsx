import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CopyPre } from './CopyPre';

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose prose-neutral max-w-none prose-headings:font-bold prose-a:decoration-brand prose-a:decoration-2 prose-blockquote:border-brand prose-blockquote:bg-brand-soft prose-blockquote:py-1 prose-blockquote:not-italic prose-img:rounded-2xl">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ pre: ({ node: _n, ...p }) => <CopyPre {...p} /> }}>{children}</ReactMarkdown>
    </div>
  );
}
