'use client';
import { X } from 'lucide-react';

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-30 flex items-end bg-black/50" onClick={onClose}>
      <div
        role="dialog"
        aria-label={title}
        className="max-h-[85%] w-full overflow-y-auto rounded-t-3xl bg-panel p-5 pb-[max(24px,env(safe-area-inset-bottom))] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-extrabold uppercase tracking-widest text-white/60">{title}</h3>
          <button aria-label="Close" onClick={onClose} className="rounded-full p-1.5 hover:bg-white/10"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
