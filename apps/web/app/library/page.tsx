import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { categoryById } from '@athena/config/categories';
import { getLibrary } from '../lib/queries';

export const dynamic = 'force-dynamic';

const MASTERY = ['New', 'Seen', 'Understood', 'Reviewed'];

export default async function Library() {
  const { saved, learned, watchedDays } = await getLibrary();
  const understood = learned.filter((c) => c.level >= 2).length;

  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 pb-16 pt-[max(20px,env(safe-area-inset-top))]">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/70 hover:text-white">
        <ArrowLeft size={16} /> Back to feed
      </Link>
      <h1 className="mt-4 text-3xl font-extrabold">Your library</h1>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <Stat value={learned.length} label="Concepts met" />
        <Stat value={understood} label="Understood" />
        <Stat value={watchedDays} label="Days learning" />
      </div>

      <h2 className="mt-8 font-extrabold">Concepts</h2>
      {learned.length === 0 ? (
        <p className="mt-2 text-white/60">Watch a lesson to the end and answer its quiz to start building your map of ideas.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {learned.map((c) => {
            const cat = categoryById[c.category];
            return (
              <li key={c.slug} className="flex items-center gap-3 rounded-2xl bg-white/5 p-3.5">
                <span className="text-xl">{cat?.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{c.name}</div>
                  <div className="text-xs text-white/50">{MASTERY[c.level] ?? 'New'}</div>
                </div>
                <div className="flex gap-1" aria-label={`Mastery ${c.level} of 3`}>
                  {[1, 2, 3].map((n) => (
                    <span key={n} className="size-2.5 rounded-full" style={{ background: n <= c.level ? cat?.color : 'rgba(255,255,255,0.15)' }} />
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="mt-8 font-extrabold">Saved lessons</h2>
      {saved.length === 0 ? (
        <p className="mt-2 text-white/60">Tap the bookmark on any lesson to keep it here.</p>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {saved.map((s) => (
            <Link key={s.videoId} href={`/?c=${s.category}&v=${s.videoId}`} className="group relative aspect-[9/16] overflow-hidden rounded-xl bg-white/5">
              {s.thumbUrl && <img src={s.thumbUrl} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2 text-xs font-bold leading-tight">{s.title}</div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl bg-white/5 p-3 text-center">
      <div className="text-2xl font-extrabold">{value}</div>
      <div className="text-xs text-white/60">{label}</div>
    </div>
  );
}
