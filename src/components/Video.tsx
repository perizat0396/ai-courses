export function embedUrl(url: string): { kind: 'iframe' | 'video'; src: string } {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') return { kind: 'iframe', src: `https://www.youtube.com/embed/${u.pathname.slice(1)}` };
    if (host.endsWith('youtube.com')) {
      const id = u.searchParams.get('v') || u.pathname.split('/').filter(Boolean).pop();
      return { kind: 'iframe', src: `https://www.youtube.com/embed/${id}` };
    }
    if (host === 'vimeo.com') return { kind: 'iframe', src: `https://player.vimeo.com/video/${u.pathname.split('/').filter(Boolean)[0]}` };
    if (host.includes('drive.google.com')) {
      const m = u.pathname.match(/\/d\/([^/]+)/);
      if (m) return { kind: 'iframe', src: `https://drive.google.com/file/d/${m[1]}/preview` };
    }
  } catch { /* невалидная ссылка */ }
  return { kind: 'video', src: url };
}

export function Video({ url }: { url: string }) {
  const e = embedUrl(url);
  return (
    <div className="aspect-video w-full overflow-hidden rounded-2xl bg-ink">
      {e.kind === 'iframe' ? (
        <iframe src={e.src} className="h-full w-full" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen />
      ) : (
        <video src={e.src} controls className="h-full w-full" controlsList="nodownload" />
      )}
    </div>
  );
}
