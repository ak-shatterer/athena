import { createStorage } from '@athena/storage';
import { and, createDb, eq, inArray, isNotNull, lessons, lt, videos, views, type Db } from '@athena/db';
import { OUT } from '../paths';
import { shard } from '../shard';
import { today } from '../dates';

const DEFAULT_RETENTION_DAYS = 14;

export async function publish(args: Record<string, string>) {
  const db = await createDb();
  const storage = createStorage();
  const date = args.date ?? today();
  const retentionDays = Number(process.env.RETENTION_DAYS || DEFAULT_RETENTION_DAYS);

  const rows = shard(
    await db
      .select({ id: lessons.id, script: lessons.script, video: videos })
      .from(lessons)
      .innerJoin(videos, eq(videos.lessonId, lessons.id))
      .where(and(eq(lessons.date, date), eq(lessons.status, 'rendered'))),
    args.shard,
  );

  for (const { id, script, video } of rows) {
    try {
      const url = await storage.put(video.storageKey, `${OUT}${video.storageKey}`, 'video/mp4');
      const thumbUrl = video.thumbKey ? await storage.put(video.thumbKey, `${OUT}${video.thumbKey}`, 'image/jpeg') : null;
      const expiresAt = new Date(Date.now() + retentionDays * 86400_000);
      await db.update(videos).set({ url, thumbUrl, expiresAt }).where(eq(videos.id, video.id));
      await db.update(lessons).set({ status: 'ready' }).where(eq(lessons.id, id));
      console.log(`  ☁️  ${script?.title} → ${storage.driver}`);
    } catch (e) {
      // Stays 'rendered', so the next publish run retries the upload.
      console.warn(`  ✗ ${script?.title}: ${(e as Error).message}`);
    }
  }

  // Only one shard needs to clean up.
  if (!args.shard || args.shard.startsWith('0/')) await expireOld(db, storage);
}

/** Deletes videos past their retention date unless they were saved. Lessons stay for the concept history. */
async function expireOld(db: Db, storage: ReturnType<typeof createStorage>) {
  const expired = await db
    .select({ video: videos, saved: views.saved })
    .from(videos)
    .leftJoin(views, eq(views.videoId, videos.id))
    .where(and(isNotNull(videos.expiresAt), lt(videos.expiresAt, new Date())));
  const doomed = expired.filter((e) => !e.saved).map((e) => e.video);
  if (doomed.length === 0) return;

  await storage.remove(doomed.flatMap((v) => [v.storageKey, ...(v.thumbKey ? [v.thumbKey] : [])]));
  const ids = doomed.map((v) => v.id);
  await db.delete(views).where(inArray(views.videoId, ids));
  await db.delete(videos).where(inArray(videos.id, ids));
  await db.update(lessons).set({ status: 'expired' }).where(inArray(lessons.id, doomed.map((v) => v.lessonId)));
  console.log(`  🧹 removed ${doomed.length} expired videos`);
}
