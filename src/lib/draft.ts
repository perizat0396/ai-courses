// Скрытые от студентов уроки: в начале content_ru стоит строка «::draft».
// Так не нужна новая колонка в базе; админ видит всё, студент — только открытые уроки.
const RE = /^::draft[ \t]*\r?\n?/m;
export const isDraft = (l: { content_ru?: string | null }) => RE.test(l.content_ru ?? '');
export const stripDraft = (s: string) => s.replace(RE, '');
export const setDraft = (s: string, on: boolean) => (on ? '::draft\n' + stripDraft(s) : stripDraft(s));
