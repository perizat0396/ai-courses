import { stripDraft } from '@/lib/draft';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CopyPre } from './CopyPre';
import { Slides } from './Slides';
import { Game } from './Game';
import { Stepper } from './Stepper';

/* Строка «::step» делит урок на шаги микрокурса (один экран — одна мысль, кнопка «Далее»). */
const STEP_RE = /^::step[ \t]*$/m;

/* Строка «::slides /slides/имя.html» в тексте урока встраивает HTML-презентацию. */
const SLIDES_RE = /^::(slides|game)\s+(\/slides\/[\w.-]+\.html)\s*$/gm;

function Md({ children, big }: { children: string; big?: boolean }) {
  return (
    <div className={`${big ? 'md:prose-lg prose-img:mx-auto prose-img:shadow-card ' : ''}prose prose-neutral max-w-none prose-headings:font-bold prose-a:decoration-brand prose-a:decoration-2 prose-blockquote:border-brand prose-blockquote:bg-brand-soft prose-blockquote:py-1 prose-blockquote:not-italic prose-img:rounded-2xl prose-h2:clear-both prose-blockquote:overflow-hidden prose-pre:overflow-auto`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
        pre: ({ node: _n, ...p }) => <CopyPre {...p} />,
        // ![подпись](картинка.png "side") — иллюстрация сбоку от текста
        img: ({ node: _n, title, alt, ...p }) =>
          title === 'side' || title === 'side-wide'
            // eslint-disable-next-line @next/next/no-img-element
            ? <img {...p} alt={alt ?? ''} className={`mx-auto !my-2 block rounded-none sm:float-right sm:ml-8 ${title === 'side-wide' ? 'w-80 sm:w-96' : 'w-60 sm:w-64'}`} />
            // eslint-disable-next-line @next/next/no-img-element
            : <img {...p} alt={alt ?? ''} title={title} />,
      }}>{children}</ReactMarkdown>
    </div>
  );
}

export function Markdown({ children: raw, lang, stepKey }: { children: string; lang?: string; stepKey?: string }) {
  const children = stripDraft(raw);
  if (STEP_RE.test(children)) {
    const steps = children.split(/^::step[ \t]*$/m).map((s) => s.trim()).filter(Boolean);
    const kk = lang ? lang === 'kk' : /[әғқңөұүһі]/i.test(children);
    let h = 0;
    for (const ch of children.slice(0, 400)) h = (h * 31 + ch.charCodeAt(0)) | 0;
    return <Stepper kk={kk} storeKey={`step:${stepKey ?? h}`} steps={steps.map((s, i) => <Body key={i} text={s} big />)} />;
  }
  return <Body text={children} />;
}

function Body({ text: children, big }: { text: string; big?: boolean }) {
  const parts: { kind: 'md' | 'slides' | 'game'; value: string }[] = [];
  let last = 0;
  for (const m of children.matchAll(SLIDES_RE)) {
    if (m.index! > last) parts.push({ kind: 'md', value: children.slice(last, m.index) });
    parts.push({ kind: m[1] as 'slides' | 'game', value: m[2] });
    last = m.index! + m[0].length;
  }
  if (last < children.length) parts.push({ kind: 'md', value: children.slice(last) });
  return (
    <div className="space-y-8">
      {parts.map((p, i) => (p.kind === 'slides' ? <Slides key={i} src={p.value} /> : p.kind === 'game' ? <Game key={i} src={p.value} /> : p.value.trim() ? <Md key={i} big={big}>{p.value}</Md> : null))}
    </div>
  );
}
