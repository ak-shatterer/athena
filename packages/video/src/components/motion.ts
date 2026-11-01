import { spring, useCurrentFrame, useVideoConfig } from 'remotion';

/** 0 → 1 spring that starts `delay` frames into the current sequence. */
export function useEnter(delay = 0, damping = 18) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping } });
}

export const rise = (t: number, distance = 40) => ({
  opacity: t,
  transform: `translateY(${(1 - t) * distance}px)`,
});
