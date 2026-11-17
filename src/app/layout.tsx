import type { Metadata } from 'next';
import './globals.css';
import { getLang } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const kk = (await getLang()) === 'kk';
  const icons = { icon: [{ url: '/icon.svg', type: 'image/svg+xml' }], apple: '/icon.svg' };
  return kk
    ? { title: 'ЖИ курстары', description: 'Жасанды интеллект бойынша курстар платформасы', icons }
    : { title: 'AI Курсы', description: 'Платформа курсов по искусственному интеллекту', icons };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang === 'kk' ? 'kk' : 'ru'}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
