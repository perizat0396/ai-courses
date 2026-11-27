import type { SupabaseClient } from '@supabase/supabase-js';
import type { Course, Lesson, Module } from './types';
import { isDraft } from './draft';

export type ModuleWithLessons = Module & { lessons: Lesson[] };

export async function getCourseTree(supabase: SupabaseClient, courseId: string, hideDrafts = false) {
  const [{ data: course }, { data: modules }, { data: lessons }] = await Promise.all([
    supabase.from('courses').select('*').eq('id', courseId).maybeSingle(),
    supabase.from('modules').select('*').eq('course_id', courseId).order('position'),
    supabase.from('lessons').select('*').eq('course_id', courseId).order('position'),
  ]);
  const tree: ModuleWithLessons[] = (modules ?? []).map((m) => ({
    ...(m as Module),
    lessons: ((lessons ?? []) as Lesson[]).filter((l) => l.module_id === m.id && !(hideDrafts && isDraft(l))),
  }));
  const flat = tree.flatMap((m) => m.lessons);
  return { course: course as Course | null, tree, flat };
}

export async function getDoneSet(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase.from('lesson_progress').select('lesson_id').eq('user_id', userId);
  return new Set((data ?? []).map((r) => r.lesson_id as string));
}

export const themeClasses = {
  yellow: { card: 'bg-brand text-ink', bar: 'bg-ink', track: 'bg-ink/15', sub: 'text-ink/70', btn: 'btn-dark' },
  black: { card: 'bg-ink text-white', bar: 'bg-brand', track: 'bg-white/20', sub: 'text-white/60', btn: 'btn-brand' },
  white: { card: 'bg-white text-ink border border-line shadow-card', bar: 'bg-brand', track: 'bg-line', sub: 'text-ink-mute', btn: 'btn-dark' },
} as const;
