import { getLang } from './i18n';

/** Язык админки: L('рус', 'қаз') и T(объект с title_ru/title_kk). */
export async function adminLang() {
  const kk = (await getLang()) === 'kk';
  const L = (ru: string, kz: string) => (kk ? kz : ru);
  const T = (o: { title_ru?: string | null; title_kk?: string | null } | null | undefined) =>
    (kk && o?.title_kk ? o.title_kk : o?.title_ru) ?? '';
  return { kk, L, T };
}

/** То же для клиентских компонентов (язык передаётся пропом). */
export const tr = (kk: boolean | undefined) => (ru: string, kz: string) => (kk ? kz : ru);
