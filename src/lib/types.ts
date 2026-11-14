export type Course = {
  id: string; title_ru: string; title_kk: string; description_ru: string; description_kk: string;
  theme: 'yellow' | 'black' | 'white'; is_published: boolean; position: number;
};
export type Module = { id: string; course_id: string; title_ru: string; title_kk: string; position: number };
export type Lesson = {
  id: string; module_id: string; course_id: string; title_ru: string; title_kk: string;
  video_url: string | null; video_path: string | null; content_ru: string; content_kk: string;
  assignment_ru: string; assignment_kk: string; duration_min: number | null; position: number;
};
export type LessonFile = { id: string; lesson_id: string; name: string; path: string; size: number | null };
export type QuizQuestion = {
  id: string; lesson_id: string; question_ru: string; question_kk: string;
  options_ru: string[]; options_kk: string[]; position: number;
};
export type Submission = {
  id: string; user_id: string; lesson_id: string; body: string; file_path: string | null;
  status: 'submitted' | 'accepted' | 'needs_work'; feedback: string; updated_at: string; ai_feedback?: string;
};
