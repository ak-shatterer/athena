import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { loadFont as loadFraunces } from '@remotion/google-fonts/Fraunces';
import { categoryById } from '@athena/config/categories';

const inter = loadInter('normal', { weights: ['500', '700', '800'], subsets: ['latin'] });
const fraunces = loadFraunces('normal', { weights: ['600'], subsets: ['latin'] });

export const fonts = { sans: inter.fontFamily, serif: fraunces.fontFamily };

export const colors = {
  bg: '#0B0B12',
  card: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(255,255,255,0.12)',
  text: '#FFFFFF',
  muted: 'rgba(255,255,255,0.65)',
};

// Vertical layout zones for 720×1280.
export const layout = { pad: 48, textTop: 150, visualTop: 330, visualHeight: 600, captionTop: 990 };

// Extra silence after each scene's narration, and the closing takeaway card.
export const SCENE_PAD_SEC = 0.35;
export const OUTRO_SEC = 3;

export function themeFor(category: string) {
  const c = categoryById[category];
  return { accent: c?.color ?? '#7C5CFF', emoji: c?.emoji ?? '✨', name: c?.name ?? category };
}
