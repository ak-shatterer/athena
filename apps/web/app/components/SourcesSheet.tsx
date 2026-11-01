'use client';
import { ExternalLink } from 'lucide-react';
import type { FeedItem } from '../lib/queries';
import { Sheet } from './Sheet';

export function SourcesSheet({ sources, onClose }: { sources: FeedItem['sources']; onClose: () => void }) {
  return (
    <Sheet title="Sources" onClose={onClose}>
      <ul className="flex flex-col gap-2.5">
        {sources.map((s) => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noreferrer" className="flex items-start gap-3 rounded-2xl bg-white/5 p-4 hover:bg-white/10">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-extrabold uppercase tracking-widest text-white/50">{s.publisher}</div>
                <div className="mt-0.5 font-semibold leading-snug">{s.title}</div>
              </div>
              <ExternalLink size={18} className="mt-1 shrink-0 text-white/50" />
            </a>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
