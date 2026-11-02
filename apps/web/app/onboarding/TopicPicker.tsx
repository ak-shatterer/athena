'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Check } from 'lucide-react';
import type { Level } from '@athena/shared';
import { savePrefs } from '../lib/actions';

interface Option { id: string; name: string; emoji: string; color: string; perDay: number }

const LEVELS: { id: Level; label: string; hint: string }[] = [
  { id: 'beginner', label: 'New to most of this', hint: 'Define the jargon as we go' },
  { id: 'intermediate', label: 'I follow the news', hint: 'Skip the basics, go into how things work' },
  { id: 'advanced', label: 'I know these fields well', hint: 'Debates, second-order effects, edge cases' },
];

export function TopicPicker({ options, initial, initialLevel }: { options: Option[]; initial: string[]; initialLevel: Level }) {
  const router = useRouter();
  const [selected, setSelected] = useState(new Set(initial));
  const [level, setLevel] = useState<Level>(initialLevel);
  const [pending, startTransition] = useTransition();
  const perDay = options.filter((o) => selected.has(o.id)).reduce((n, o) => n + o.perDay, 0);

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const save = () =>
    startTransition(async () => {
      await savePrefs([...selected], level);
      router.push('/');
    });

  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 pb-32 pt-[max(24px,env(safe-area-inset-top))]">
      <p className="text-sm font-extrabold tracking-[0.3em] text-white/60">ATHENA</p>
      <h1 className="mt-6 text-3xl font-extrabold leading-tight">What do you want to understand?</h1>
      <p className="mt-2 text-white/60">Every morning Athena explains the ideas behind the top stories in these topics, plus one big idea from a classic book.</p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {options.map((o) => {
          const on = selected.has(o.id);
          return (
            <button
              key={o.id}
              onClick={() => toggle(o.id)}
              aria-pressed={on}
              className="relative flex h-28 flex-col justify-between rounded-2xl border-2 p-4 text-left transition"
              style={{ borderColor: on ? o.color : 'rgba(255,255,255,0.12)', background: on ? `${o.color}26` : 'rgba(255,255,255,0.04)' }}
            >
              <span className="text-3xl">{o.emoji}</span>
              <span className="font-bold leading-tight">{o.name}</span>
              {on && (
                <span className="absolute right-3 top-3 flex size-6 items-center justify-center rounded-full" style={{ background: o.color }}>
                  <Check size={14} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <h2 className="mt-8 font-extrabold">Where are you starting from?</h2>
      <div className="mt-3 flex flex-col gap-2.5">
        {LEVELS.map((l) => (
          <button
            key={l.id}
            onClick={() => setLevel(l.id)}
            aria-pressed={level === l.id}
            className={`rounded-2xl border-2 p-4 text-left transition ${level === l.id ? 'border-white bg-white/10' : 'border-white/12 bg-white/4'}`}
          >
            <div className="font-bold">{l.label}</div>
            <div className="text-sm text-white/60">{l.hint}</div>
          </button>
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink to-transparent px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-8">
        <div className="mx-auto max-w-md">
          <button
            onClick={save}
            disabled={selected.size === 0 || pending}
            className="w-full rounded-full bg-white py-3.5 font-extrabold text-black disabled:opacity-40"
          >
            {pending ? 'Saving…' : selected.size === 0 ? 'Pick at least one topic' : `Start learning · about ${perDay} lessons a day`}
          </button>
        </div>
      </div>
    </main>
  );
}
