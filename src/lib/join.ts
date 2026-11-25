import type { SupabaseClient } from '@supabase/supabase-js';

// QR-коды курсов: код → курс (ищется по названию)
const JOIN: Record<string, string> = {
  'kumis-ai': '%для начинающих%',
};

export async function courseByCode(admin: SupabaseClient, code: string): Promise<string | null> {
  const pattern = JOIN[code.toLowerCase().trim()];
  if (!pattern) return null;
  const { data } = await admin.from('courses').select('id').ilike('title_ru', pattern).order('position').limit(1).maybeSingle();
  return (data?.id as string) ?? null;
}

// Обратное: QR-код курса по его названию (для показа QR на странице курса)
export function codeForCourse(titleRu: string): string | null {
  const t = titleRu.toLowerCase();
  for (const [code, pattern] of Object.entries(JOIN)) {
    if (t.includes(pattern.replaceAll('%', '').toLowerCase())) return code;
  }
  return null;
}
