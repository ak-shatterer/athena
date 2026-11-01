import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { colors, fonts, layout, themeFor } from '../theme';
import { rise, useEnter } from './motion';

export const Background = ({ accent }: { accent: string }) => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 90) * 60;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at ${50 + drift / 10}% ${30 + drift / 20}%, ${accent}40 0%, transparent 55%),
                     radial-gradient(circle at 80% 95%, ${accent}22 0%, transparent 45%), ${colors.bg}`,
      }}
    />
  );
};

export const Header = ({ category }: { category: string }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const { accent, emoji, name } = themeFor(category);
  const progress = interpolate(frame, [0, durationInFrames - 1], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 8, background: 'rgba(255,255,255,0.1)' }}>
        <div style={{ width: `${progress * 100}%`, height: '100%', background: accent }} />
      </div>
      <div
        style={{
          position: 'absolute',
          top: 44,
          left: layout.pad,
          right: layout.pad,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: fonts.sans,
        }}
      >
        <div style={{ background: `${accent}33`, border: `2px solid ${accent}`, color: colors.text, borderRadius: 999, padding: '8px 20px', fontSize: 24, fontWeight: 700 }}>
          {emoji} {name}
        </div>
        <div style={{ color: colors.muted, fontSize: 24, fontWeight: 800, letterSpacing: 6 }}>ATHENA</div>
      </div>
    </>
  );
};

export const OnScreenText = ({ text, accent }: { text?: string; accent: string }) => {
  const t = useEnter(4);
  if (!text) return null;
  return (
    <div style={{ position: 'absolute', top: layout.textTop, left: layout.pad, right: layout.pad, fontFamily: fonts.sans, ...rise(t, 24) }}>
      <div style={{ fontSize: 54, fontWeight: 800, lineHeight: 1.1, color: colors.text }}>{text}</div>
      <div style={{ marginTop: 18, width: 90, height: 8, borderRadius: 4, background: accent }} />
    </div>
  );
};
