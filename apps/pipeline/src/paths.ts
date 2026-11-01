import { fileURLToPath } from 'node:url';

// Everything the pipeline produces lives under out/ at the repo root (gitignored).
export const OUT = fileURLToPath(new URL('../../../out/', import.meta.url));
export const MEDIA_DIR = `${OUT}media`; // narration wavs; the render's public dir
export const VIDEO_DIR = `${OUT}videos`;
