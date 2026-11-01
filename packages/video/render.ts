// Node-side rendering. src/index.ts is the browser entry Remotion bundles;
// this file is what the pipeline imports.
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { openBrowser, renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { VIDEO } from '@athena/shared';
import type { LessonVideoProps } from './src/types';

export type { LessonVideoProps, SceneMedia, VisualData } from './src/types';

const entry = fileURLToPath(new URL('./src/index.ts', import.meta.url));
const bundles = new Map<string, Promise<string>>();

// One headless Chrome shared by every render in the run. Letting each call
// launch its own leaks browsers, and later launches time out.
let browser: ReturnType<typeof openBrowser> | undefined;
const getBrowser = () => (browser ??= openBrowser('chrome'));

export async function closeRenderer() {
  if (!browser) return;
  const b = await browser;
  browser = undefined;
  await b.close({ silent: true });
}

/** Bundles once per public dir (where the narration files live) and reuses it. */
function getBundle(publicDir: string) {
  if (!bundles.has(publicDir)) bundles.set(publicDir, bundle({ entryPoint: entry, publicDir }));
  return bundles.get(publicDir)!;
}

export async function renderLesson(opts: {
  props: LessonVideoProps;
  publicDir: string;
  outFile: string;
  thumbFile: string;
  onProgress?: (p: number) => void;
}) {
  const serveUrl = await getBundle(opts.publicDir);
  const puppeteerInstance = await getBrowser();
  const composition = await selectComposition({ serveUrl, id: 'Lesson', inputProps: opts.props, puppeteerInstance });
  await renderMedia({
    serveUrl,
    puppeteerInstance,
    composition,
    inputProps: opts.props,
    codec: 'h264',
    crf: VIDEO.crf,
    outputLocation: opts.outFile,
    onProgress: ({ progress }) => opts.onProgress?.(progress),
  });
  // Thumbnail: a frame from the first scene once its animation has settled.
  await renderStill({ serveUrl, puppeteerInstance, composition, inputProps: opts.props, frame: Math.min(45, composition.durationInFrames - 1), output: opts.thumbFile, imageFormat: 'jpeg', jpegQuality: 80 });
  return { durationSec: composition.durationInFrames / composition.fps };
}
