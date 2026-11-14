'use client';
import { useTransition } from 'react';
import { toggleLessonDone } from '@/app/actions';
import { IconCheck } from './Icons';

export function DoneButton({ lessonId, done, labels }: { lessonId: string; done: boolean; labels: { mark: string; done: string } }) {
  const [pending, start] = useTransition();
  return (
    <button disabled={pending} onClick={() => start(() => toggleLessonDone(lessonId, !done))}
      className={done ? 'btn-brand' : 'btn-dark'}>
      <IconCheck className="h-4 w-4" /> {done ? labels.done : labels.mark}
    </button>
  );
}
