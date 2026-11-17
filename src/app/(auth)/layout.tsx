import { Logo } from '@/components/Logo';
import { LangSwitch } from '@/components/LangSwitch';
import { getDict } from '@/lib/i18n';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { lang, t } = await getDict();
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-brand p-14 lg:flex lg:flex-col">
        <Logo name={t.appName} />
        <div className="mt-auto max-w-md">
          <h1 className="text-5xl font-extrabold leading-[1.05]">{t.loginSub}</h1>
          <p className="mt-5 text-base font-medium text-ink/70">
            {lang === 'kk'
              ? 'ChatGPT, Claude, Gemini — нөлден бастап кәсіби қолдануға дейін.'
              : 'ChatGPT, Claude, Gemini — от первых шагов до профессиональной работы.'}
          </p>
        </div>
        <div className="absolute -right-24 top-24 h-80 w-80 rotate-45 rounded-[3rem] bg-ink" />
        <div className="absolute right-24 top-64 h-24 w-24 rotate-45 rounded-2xl bg-white" />
      </div>
      <div className="flex flex-col p-6 md:p-14">
        <div className="flex items-center justify-between">
          <div className="lg:invisible"><Logo name={t.appName} /></div>
          <LangSwitch lang={lang} />
        </div>
        <div className="mx-auto my-auto w-full max-w-sm py-10">{children}</div>
      </div>
    </div>
  );
}
