import { mkdirSync, writeFileSync } from 'node:fs';
import { closeTts, narrate } from '@athena/tts';
import { and, createDb, eq, lessons } from '@athena/db';
import { MEDIA_DIR } from '../paths';
import { shard } from '../shard';
import { today } from '../dates';

export async function voice(args: Record<string, string>) {
  const db = await createDb();
  const date = args.date ?? today();
  const rows = shard(
    await db
      .select()
      .from(lessons)
      .where(and(eq(lessons.date, date), eq(lessons.status, 'scripted'), args.category ? eq(lessons.category, args.category) : undefined)),
    args.shard,
  );
  if (rows.length === 0) return console.log('No scripted lessons to voice (run write first).');

  for (const lesson of rows) {
    const script = lesson.script!;
    const started = Date.now();
    try {
      mkdirSync(`${MEDIA_DIR}/${lesson.id}`, { recursive: true });
      const media = [];
      for (const scene of script.scenes) {
        const { wav, durationSec } = await narrate(scene.narration);
        const audio = `${lesson.id}/${scene.id}.wav`;
        writeFileSync(`${MEDIA_DIR}/${audio}`, wav);
        media.push({ audio, durationSec });
      }
      await db.update(lessons).set({ status: 'voiced', media }).where(eq(lessons.id, lesson.id));
      const total = media.reduce((s, m) => s + m.durationSec, 0);
      console.log(`  🎙  ${script.title}: ${total.toFixed(0)}s of narration in ${((Date.now() - started) / 1000).toFixed(0)}s`);
    } catch (e) {
      await db.update(lessons).set({ status: 'failed', error: `voice: ${(e as Error).message}` }).where(eq(lessons.id, lesson.id));
      console.warn(`  ✗ ${script.title}: ${(e as Error).message}`);
    }
  }
  await closeTts();
}
