'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { BookOpen, SlidersHorizontal } from 'lucide-react';
import type { FeedItem } from '../lib/queries';
import { VideoCard } from './VideoCard';

interface Chip { id: string; name: string; emoji: string; color: string }

export function Feed({ items, chips, active, startAt }: { items: FeedItem[]; chips: Chip[]; active?: string; startAt?: string }) {
  const scroller = useRef<HTMLDivElement>(null);
  // Autoplay with sound is blocked until the user interacts, so start muted
  // and remember the choice across cards once they unmute.
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    if (startAt) document.getElementById(`card-${startAt}`)?.scrollIntoView();
  }, [startAt]);

  const next = (index: number) =>
    scroller.current?.children[index + 1]?.scrollIntoView({ behavior: 'smooth' });

  return (
    <main className="mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden">
      <header className="shrink-0 pb-2 pt-[max(10px,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between px-4">
          <span className="text-sm font-extrabold tracking-[0.3em] text-white/90">ATHENA</span>
          <nav className="flex gap-1">
            <Link href="/library" aria-label="Library" className="rounded-full p-2 text-white/90 hover:bg-white/10"><BookOpen size={20} /></Link>
            <Link href="/onboarding" aria-label="Choose topics" className="rounded-full p-2 text-white/90 hover:bg-white/10"><SlidersHorizontal size={20} /></Link>
          </nav>
        </div>
        <div className="no-scrollbar mt-1 flex gap-2 overflow-x-auto px-4">
          <ChipLink href="/" label="All" selected={!active} />
          {chips.map((c) => (
            <ChipLink key={c.id} href={`/?c=${c.id}`} label={`${c.emoji} ${c.name}`} selected={active === c.id} color={c.color} />
          ))}
        </div>
      </header>

      {/* The video sits between the header and its own footer, never under them. */}
      <div ref={scroller} className="no-scrollbar min-h-0 flex-1 snap-y snap-mandatory overflow-y-scroll">
        {items.map((item, i) => (
          <VideoCard key={item.videoId} item={item} muted={muted} setMuted={setMuted} onNext={() => next(i)} />
        ))}
        <EndCard empty={items.length === 0} />
      </div>
    </main>
  );
}

function ChipLink({ href, label, selected, color }: { href: string; label: string; selected: boolean; color?: string }) {
  return (
    <Link
      href={href}
      replace
      className="shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold backdrop-blur transition"
      style={{
        borderColor: selected ? (color ?? '#fff') : 'rgba(255,255,255,0.25)',
        background: selected ? `${color ?? '#ffffff'}33` : 'rgba(0,0,0,0.3)',
      }}
    >
      {label}
    </Link>
  );
}

function EndCard({ empty }: { empty: boolean }) {
  return (
    <section className="flex h-full snap-start flex-col items-center justify-center gap-4 px-8 text-center">
      <div className="text-5xl">{empty ? '🌱' : '🎉'}</div>
      <h2 className="text-2xl font-extrabold">{empty ? 'No lessons yet' : "You're all caught up"}</h2>
      <p className="text-white/60">
        {empty
          ? 'New lessons appear every morning once the daily pipeline has run.'
          : 'New lessons arrive tomorrow morning. Review what you learned in your library.'}
      </p>
      <Link href="/library" className="mt-2 rounded-full bg-white px-5 py-2.5 font-bold text-black">Open library</Link>
    </section>
  );
}
