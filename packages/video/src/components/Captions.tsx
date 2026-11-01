import { useCurrentFrame, useVideoConfig } from 'remotion';
import { colors, fonts, layout } from '../theme';
import { rise, useEnter } from './motion';

const WORDS_PER_CHUNK = 6;

// Short phrase captions, timed by each phrase's share of the narration's characters.
export const Captions = ({ text, speechSec }: { text: string; speechSec: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chunks = chunk(text);
  const total = chunks.reduce((n, c) => n + c.length, 0);

  let start = 0;
  const timed = chunks.map((c) => {
    const from = start;
    start += (c.length / total) * speechSec * fps;
    return { text: c, from };
  });
  const current = [...timed].reverse().find((c) => frame >= c.from) ?? timed[0];

  return (
    <div style={{ position: 'absolute', top: layout.captionTop, left: layout.pad, right: layout.pad, display: 'flex', justifyContent: 'center' }}>
      <Caption key={current.from} text={current.text} />
    </div>
  );
};

const Caption = ({ text }: { text: string }) => {
  const t = useEnter(0, 22);
  return (
    <div
      style={{
        ...rise(t, 14),
        fontFamily: fonts.sans,
        fontWeight: 800,
        fontSize: 40,
        lineHeight: 1.25,
        textAlign: 'center',
        color: colors.text,
        background: 'rgba(0,0,0,0.55)',
        padding: '14px 24px',
        borderRadius: 18,
      }}
    >
      {text}
    </div>
  );
};

function chunk(text: string): string[] {
  const out: string[] = [];
  for (const sentence of text.match(/[^.!?]+[.!?]*/g) ?? [text]) {
    const words = sentence.trim().split(/\s+/).filter(Boolean);
    for (let i = 0; i < words.length; i += WORDS_PER_CHUNK) {
      // Avoid a lonely last word: fold it into the previous chunk.
      const rest = words.length - (i + WORDS_PER_CHUNK);
      const take = rest > 0 && rest < 2 ? WORDS_PER_CHUNK + rest : WORDS_PER_CHUNK;
      out.push(words.slice(i, i + take).join(' '));
      i += take - WORDS_PER_CHUNK;
    }
  }
  return out;
}
