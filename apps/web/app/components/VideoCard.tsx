'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import { Bookmark, Heart, ListChecks, Newspaper, Play, Volume2, VolumeX } from 'lucide-react';
import { categoryById } from '@athena/config/categories';
import type { FeedItem } from '../lib/queries';
import { recordWatch, setFlag } from '../lib/actions';
import { QuizSheet } from './QuizSheet';
import { SourcesSheet } from './SourcesSheet';

const WATCH_MARKS = [0.25, 0.5, 0.8, 1];

export function VideoCard(p: { item: FeedItem; muted: boolean; setMuted: (m: boolean) => void; onNext: () => void }) {
  const { item } = p;
  const video = useRef<HTMLVideoElement>(null);
  const card = useRef<HTMLElement>(null);
  const reported = useRef(0);
  const [paused, setPaused] = useState(true);
  const [progress, setProgress] = useState(0);
  const [liked, setLiked] = useState(item.liked);
  const [saved, setSaved] = useState(item.saved);
  const [sheet, setSheet] = useState<'quiz' | 'sources' | null>(null);
  const [, startTransition] = useTransition();
  const category = categoryById[item.category];

  // Play when at least 70% of the card is on screen, pause otherwise.
  useEffect(() => {
    const el = card.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const v = video.current;
        if (!v) return;
        if (entry.intersectionRatio >= 0.7) v.play().catch(() => setPaused(true));
        else v.pause();
      },
      { threshold: [0, 0.7] },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Answering a quiz or reading sources shouldn't compete with the narration.
  useEffect(() => {
    if (sheet) video.current?.pause();
  }, [sheet]);

  const onTime = () => {
    const v = video.current!;
    const pct = v.duration ? v.currentTime / v.duration : 0;
    setProgress(pct);
    const mark = WATCH_MARKS.filter((m) => pct >= m).at(-1) ?? 0;
    if (mark > reported.current) {
      reported.current = mark;
      startTransition(() => recordWatch(item.videoId, item.lessonId, mark));
    }
  };

  const toggle = (flag: 'liked' | 'saved', value: boolean, set: (v: boolean) => void) => {
    set(value);
    startTransition(() => setFlag(item.videoId, flag, value));
  };

  return (
    <section ref={card} id={`card-${item.videoId}`} className="relative flex h-full snap-start snap-always flex-col">
      <div className="relative min-h-0 flex-1">
        <video
          ref={video}
          src={item.videoUrl}
          poster={item.thumbUrl ?? undefined}
          muted={p.muted}
          playsInline
          preload="metadata"
          className="h-full w-full object-contain"
          onClick={() => (video.current!.paused ? video.current!.play() : video.current!.pause())}
          onPlay={() => setPaused(false)}
          onPause={() => setPaused(true)}
          onTimeUpdate={onTime}
          onEnded={() => !item.answer && setSheet('quiz')}
        />
        {paused && (
          <button aria-label="Play" onClick={() => video.current?.play()} className="absolute inset-0 m-auto flex size-20 items-center justify-center rounded-full bg-black/50 backdrop-blur">
            <Play size={36} fill="white" />
          </button>
        )}
      </div>

      <footer className="shrink-0 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/15">
          <div className="h-full" style={{ width: `${progress * 100}%`, background: category?.color ?? '#fff' }} />
        </div>
        <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ background: `${category?.color}40` }}>
          {category?.emoji} {item.concept}
        </div>
        <h2 className="mt-1 truncate text-base font-extrabold">{item.title}</h2>
        <div className="mt-2 flex justify-between">
          <ActionButton label={p.muted ? 'Sound off' : 'Sound on'} onClick={() => p.setMuted(!p.muted)}>
            {p.muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </ActionButton>
          <ActionButton label="Like" active={liked} onClick={() => toggle('liked', !liked, setLiked)}>
            <Heart size={20} fill={liked ? 'currentColor' : 'none'} />
          </ActionButton>
          <ActionButton label="Save" active={saved} onClick={() => toggle('saved', !saved, setSaved)}>
            <Bookmark size={20} fill={saved ? 'currentColor' : 'none'} />
          </ActionButton>
          <ActionButton label={item.answer ? (item.answer.correct ? 'Quiz ✓' : 'Quiz') : 'Quiz'} onClick={() => setSheet('quiz')}>
            <ListChecks size={20} />
          </ActionButton>
          <ActionButton label="Sources" onClick={() => setSheet('sources')}>
            <Newspaper size={20} />
          </ActionButton>
        </div>
      </footer>

      {sheet === 'quiz' && <QuizSheet item={item} onClose={() => setSheet(null)} onNext={() => { setSheet(null); p.onNext(); }} />}
      {sheet === 'sources' && <SourcesSheet sources={item.sources} onClose={() => setSheet(null)} />}
    </section>
  );
}

function ActionButton({ label, active, onClick, children }: { label: string; active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button aria-label={label} onClick={onClick} className={`flex w-14 flex-col items-center gap-0.5 text-[11px] font-semibold ${active ? 'text-rose-400' : 'text-white/85'}`}>
      <span className="flex size-9 items-center justify-center rounded-full bg-white/8">{children}</span>
      {label}
    </button>
  );
}
