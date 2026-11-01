import { mkdirSync, statSync } from 'node:fs';
import { closeRenderer, renderLesson } from '@athena/video/render';
import { and, createDb, eq, lessons, videos, type Db } from '@athena/db';
import { fetchVisualData } from '../data';
import { MEDIA_DIR, OUT, VIDEO_DIR } from '../paths';
import { shard } from '../shard';
import { today } from '../dates';

type LessonRow = typeof lessons.$inferSelect;

export async function render(args: Record<string, string>) {
  const db = await createDb();
  const date = args.date ?? today();
  const rows = shard(
    await db
      .select()
      .from(lessons)
      .where(and(eq(lessons.date, date), eq(lessons.status, 'voiced'), args.category ? eq(lessons.category, args.category) : undefined)),
    args.shard,
  );
  if (rows.length === 0) return console.log('No voiced lessons to render (run voice first).');
  mkdirSync(`${VIDEO_DIR}/${date}`, { recursive: true });

  try {
    for (const lesson of rows) await renderOne(db, lesson, date);
  } finally {
    await closeRenderer();
  }
}

async function renderOne(db: Db, lesson: LessonRow, date: string) {
  const script = lesson.script!;
  const name = `${date}/${lesson.category}-${lesson.conceptSlug}`;
  const outFile = `${VIDEO_DIR}/${name}.mp4`;
  const thumbFile = `${VIDEO_DIR}/${name}.jpg`;
  const started = Date.now();
  let lastShown = -1;
  try {
    const data = await fetchVisualData(script);
    const { durationSec } = await renderLesson({
      props: { lesson: script, media: lesson.media!, data },
      publicDir: MEDIA_DIR,
      outFile,
      thumbFile,
      onProgress: (p) => {
        const pct = Math.floor(p * 4) * 25;
        if (pct !== lastShown) process.stdout.write(`\r  🎬 ${script.title}: ${(lastShown = pct)}%   `);
      },
    });
    const bytes = statSync(outFile).size;
    await db.insert(videos).values({
      lessonId: lesson.id,
      storageKey: outFile.slice(OUT.length),
      thumbKey: thumbFile.slice(OUT.length),
      durationSec,
      bytes,
    });
    await db.update(lessons).set({ status: 'rendered' }).where(eq(lessons.id, lesson.id));
    console.log(
      `\r  🎬 ${script.title}: ${durationSec.toFixed(0)}s video, ${(bytes / 1e6).toFixed(1)} MB, ` +
        `rendered in ${((Date.now() - started) / 1000).toFixed(0)}s`,
    );
  } catch (e) {
    await db.update(lessons).set({ status: 'failed', error: `render: ${(e as Error).message}` }).where(eq(lessons.id, lesson.id));
    console.warn(`\n  ✗ ${script.title}: ${(e as Error).message}`);
  }
}
