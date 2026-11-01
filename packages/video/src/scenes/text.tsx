// Text-led visuals: title, kinetic lines, headline card, quiz card.
import { useVideoConfig } from 'remotion';
import type { Lesson, Visual } from '@athena/shared';
import { colors, fonts } from '../theme';
import { rise, useEnter } from '../components/motion';

type V<T extends Visual['type']> = Extract<Visual, { type: T }>;

export const Title = ({ visual, accent }: { visual: V<'title'>; accent: string }) => {
  const t = useEnter(6);
  return (
    <div style={{ ...rise(t), textAlign: 'center', fontFamily: fonts.sans }}>
      <div style={{ fontSize: 72, fontWeight: 800, color: colors.text, lineHeight: 1.05 }}>{visual.heading}</div>
      {visual.sub && <div style={{ marginTop: 24, fontSize: 34, color: accent, fontWeight: 700 }}>{visual.sub}</div>}
    </div>
  );
};

export const Kinetic = ({ visual, accent, sceneFrames }: { visual: V<'kinetic'>; accent: string; sceneFrames: number }) => {
  // Spread the lines across the first ~60% of the scene so they land with the narration.
  const step = (sceneFrames * 0.6) / visual.lines.length;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26, width: '100%' }}>
      {visual.lines.map((line, i) => (
        <KineticLine key={i} text={line} delay={Math.round(i * step) + 4} highlight={i === visual.lines.length - 1} accent={accent} />
      ))}
    </div>
  );
};

const KineticLine = ({ text, delay, highlight, accent }: { text: string; delay: number; highlight: boolean; accent: string }) => {
  const t = useEnter(delay, 14);
  return (
    <div
      style={{
        opacity: t,
        transform: `translateX(${(1 - t) * -60}px) scale(${0.9 + t * 0.1})`,
        fontFamily: fonts.sans,
        fontSize: 62,
        fontWeight: 800,
        lineHeight: 1.1,
        color: highlight ? accent : colors.text,
      }}
    >
      {text}
    </div>
  );
};

export const Headline = ({ visual, accent }: { visual: V<'headline'>; accent: string }) => {
  const t = useEnter(4);
  return (
    <div
      style={{
        ...rise(t, 80),
        width: '100%',
        background: '#F7F4EC',
        color: '#111',
        borderRadius: 28,
        padding: '40px 44px',
        boxShadow: `0 30px 80px ${accent}55`,
        transform: `${rise(t, 80).transform} rotate(${(1 - t) * -3}deg)`,
      }}
    >
      <div style={{ fontFamily: fonts.sans, fontSize: 24, fontWeight: 800, letterSpacing: 3, textTransform: 'uppercase', color: accent }}>
        {visual.publisher}
      </div>
      <div style={{ marginTop: 18, fontFamily: fonts.serif, fontSize: 46, fontWeight: 600, lineHeight: 1.15 }}>{visual.text}</div>
    </div>
  );
};

export const Quiz = ({ quiz, accent }: { quiz: Lesson['quiz']; accent: string }) => {
  const { fps } = useVideoConfig();
  const head = useEnter(2);
  return (
    <div style={{ width: '100%', fontFamily: fonts.sans }}>
      <div style={{ ...rise(head), fontSize: 26, fontWeight: 800, letterSpacing: 4, color: accent }}>QUICK CHECK</div>
      <div style={{ ...rise(head), marginTop: 12, fontSize: 38, fontWeight: 700, color: colors.text, lineHeight: 1.2 }}>{quiz.question}</div>
      <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {quiz.options.map((option, i) => (
          <QuizOption key={i} letter={'ABCD'[i]} text={option} delay={Math.round(fps * 0.4 + i * fps * 0.25)} accent={accent} />
        ))}
      </div>
      <div style={{ ...rise(head), marginTop: 26, fontSize: 26, color: colors.muted, fontWeight: 600 }}>Answer it in the app ↓</div>
    </div>
  );
};

const QuizOption = ({ letter, text, delay, accent }: { letter: string; text: string; delay: number; accent: string }) => {
  const t = useEnter(delay);
  return (
    <div
      style={{
        ...rise(t, 20),
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        background: colors.card,
        border: `2px solid ${colors.cardBorder}`,
        borderRadius: 18,
        padding: '16px 20px',
      }}
    >
      <div style={{ flexShrink: 0, width: 46, height: 46, borderRadius: 23, background: accent, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 24, color: '#fff' }}>
        {letter}
      </div>
      <div style={{ fontSize: 28, fontWeight: 600, color: colors.text, lineHeight: 1.2 }}>{text}</div>
    </div>
  );
};
