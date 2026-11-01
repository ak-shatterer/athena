'use client';
import { useState, useTransition } from 'react';
import { Check, X } from 'lucide-react';
import type { FeedItem } from '../lib/queries';
import { answerQuiz } from '../lib/actions';
import { Sheet } from './Sheet';

export function QuizSheet({ item, onClose, onNext }: { item: FeedItem; onClose: () => void; onNext: () => void }) {
  const { quiz } = item;
  const [chosen, setChosen] = useState<number | null>(item.answer?.chosen ?? null);
  const [pending, startTransition] = useTransition();
  const done = chosen !== null;
  const correct = done && chosen === quiz.answerIndex;

  const choose = (i: number) => {
    if (done || pending) return;
    setChosen(i);
    startTransition(async () => void (await answerQuiz(item.lessonId, i)));
  };

  return (
    <Sheet title="Quick check" onClose={onClose}>
      <p className="text-lg font-bold leading-snug">{quiz.question}</p>
      <div className="mt-4 flex flex-col gap-2.5">
        {quiz.options.map((option, i) => {
          const isAnswer = i === quiz.answerIndex;
          const state = !done ? 'idle' : isAnswer ? 'right' : i === chosen ? 'wrong' : 'dim';
          return (
            <button
              key={i}
              onClick={() => choose(i)}
              disabled={done}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left font-semibold transition ${
                state === 'right' ? 'border-emerald-400 bg-emerald-400/15'
                : state === 'wrong' ? 'border-rose-400 bg-rose-400/15'
                : state === 'dim' ? 'border-white/10 opacity-50'
                : 'border-white/15 bg-white/5 hover:bg-white/10'
              }`}
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-extrabold">
                {state === 'right' ? <Check size={16} /> : state === 'wrong' ? <X size={16} /> : 'ABCD'[i]}
              </span>
              {option}
            </button>
          );
        })}
      </div>

      {done && (
        <div className="mt-5 space-y-3">
          <p className={`font-extrabold ${correct ? 'text-emerald-400' : 'text-rose-400'}`}>{correct ? 'Nice, that’s right!' : 'Not quite.'}</p>
          <p className="text-white/80">{quiz.explanation}</p>
          <div className="rounded-2xl bg-white/5 p-4">
            <div className="text-xs font-extrabold uppercase tracking-widest text-white/50">Remember</div>
            <p className="mt-1 font-semibold">{item.takeaway}</p>
          </div>
          <button onClick={onNext} className="w-full rounded-full bg-white py-3 font-extrabold text-black">Next lesson ↓</button>
        </div>
      )}
    </Sheet>
  );
}
