'use server';
import { revalidatePath } from 'next/cache';
import { categoryById } from '@athena/config/categories';
import { REVIEW_INTERVALS_DAYS } from '@athena/shared';
import { conceptMastery, eq, lessons, quizAttempts, sql, userPrefs, views } from '@athena/db';
import { requireSession } from './guard';
import { getDb } from './db';

export async function savePrefs(categories: string[], level: 'beginner' | 'intermediate') {
  await requireSession();
  const db = await getDb();
  const valid = categories.filter((c) => categoryById[c]);
  await db
    .insert(userPrefs)
    .values({ id: 1, categories: valid, level })
    .onConflictDoUpdate({ target: userPrefs.id, set: { categories: valid, level } });
  revalidatePath('/');
}

export async function setFlag(videoId: string, flag: 'liked' | 'saved', value: boolean) {
  await requireSession();
  const db = await getDb();
  await db
    .insert(views)
    .values({ videoId, [flag]: value })
    .onConflictDoUpdate({ target: views.videoId, set: { [flag]: value, updatedAt: new Date() } });
  revalidatePath('/library');
}

/** Called as the video plays; watching most of a lesson marks its concept as seen. */
export async function recordWatch(videoId: string, lessonId: string, watchedPct: number) {
  await requireSession();
  const db = await getDb();
  await db
    .insert(views)
    .values({ videoId, watchedPct })
    .onConflictDoUpdate({
      target: views.videoId,
      set: { watchedPct: sql`greatest(${views.watchedPct}, ${watchedPct})`, updatedAt: new Date() },
    });
  if (watchedPct >= 0.8) await raiseMastery(lessonId, 1);
}

export async function answerQuiz(lessonId: string, chosenIndex: number) {
  await requireSession();
  const db = await getDb();
  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId));
  const correct = lesson.script!.quiz.answerIndex === chosenIndex;
  await db.insert(quizAttempts).values({ lessonId, chosenIndex, correct });
  await raiseMastery(lessonId, correct ? 2 : 1);
  return { correct, answerIndex: lesson.script!.quiz.answerIndex, explanation: lesson.script!.quiz.explanation };
}

// Mastery only goes up here. The first review is due a day later; spaced
// review (phase 7) pushes it out further after each successful recall.
async function raiseMastery(lessonId: string, level: number) {
  const db = await getDb();
  const [lesson] = await db.select({ slug: lessons.conceptSlug }).from(lessons).where(eq(lessons.id, lessonId));
  if (!lesson?.slug) return;
  const nextReviewAt = new Date(Date.now() + REVIEW_INTERVALS_DAYS[0] * 86400_000);
  await db
    .insert(conceptMastery)
    .values({ conceptSlug: lesson.slug, level, nextReviewAt })
    .onConflictDoUpdate({
      target: conceptMastery.conceptSlug,
      set: { level: sql`greatest(${conceptMastery.level}, ${level})` },
    });
}
