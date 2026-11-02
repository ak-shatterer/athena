import 'server-only';
import { categories } from '@athena/config/categories';
import type { Lesson } from '@athena/shared';
import {
  and, asc, concepts, conceptMastery, desc, eq, inArray, lessons, quizAttempts, userPrefs, videos, views,
} from '@athena/db';
import { getDb } from './db';

export interface FeedItem {
  videoId: string;
  lessonId: string;
  date: string;
  category: string;
  kind: Lesson['kind'];
  title: string;
  concept: string;
  takeaway: string;
  quiz: Lesson['quiz'];
  sources: Lesson['story']['sources'];
  videoUrl: string;
  thumbUrl: string | null;
  liked: boolean;
  saved: boolean;
  answer: { chosen: number; correct: boolean } | null;
}

const PLAYABLE = ['rendered', 'ready'] as const;
const FEED_LIMIT = 60;
// Published videos have a storage URL; before publishing, serve them from out/.
const mediaUrl = (url: string | null, key: string) => url ?? `/api/media/${key}`;

export async function getPrefs() {
  const db = await getDb();
  await db.insert(userPrefs).values({}).onConflictDoNothing();
  const [prefs] = await db.select().from(userPrefs).limit(1);
  return prefs;
}

/** Newest lessons first. Defaults to the categories chosen in onboarding. */
export async function getFeed(only?: string | string[]): Promise<FeedItem[]> {
  const db = await getDb();
  const selected = only ? [only].flat() : (await getPrefs()).categories;
  if (selected.length === 0) return [];

  const rows = await db
    .select({ video: videos, lesson: lessons, view: views })
    .from(videos)
    .innerJoin(lessons, eq(lessons.id, videos.lessonId))
    .leftJoin(views, eq(views.videoId, videos.id))
    .where(and(inArray(lessons.category, selected), inArray(lessons.status, [...PLAYABLE])))
    .orderBy(desc(lessons.date), asc(lessons.createdAt))
    .limit(FEED_LIMIT);

  const answers = await latestAnswers(rows.map((r) => r.lesson.id));
  const order = new Map(categories.map((c, i) => [c.id, i]));
  return rows
    .sort((a, b) => b.lesson.date.localeCompare(a.lesson.date) || order.get(a.lesson.category)! - order.get(b.lesson.category)!)
    .map(({ video, lesson, view }) => ({
      videoId: video.id,
      lessonId: lesson.id,
      date: lesson.date,
      category: lesson.category,
      kind: lesson.kind,
      title: lesson.script!.title,
      concept: lesson.script!.concept.name,
      takeaway: lesson.script!.takeaway,
      quiz: lesson.script!.quiz,
      sources: lesson.script!.story.sources,
      videoUrl: mediaUrl(video.url, video.storageKey),
      thumbUrl: video.thumbKey ? mediaUrl(video.thumbUrl, video.thumbKey) : null,
      liked: view?.liked ?? false,
      saved: view?.saved ?? false,
      answer: answers.get(lesson.id) ?? null,
    }));
}

async function latestAnswers(lessonIds: string[]) {
  if (lessonIds.length === 0) return new Map<string, { chosen: number; correct: boolean }>();
  const db = await getDb();
  const rows = await db
    .select()
    .from(quizAttempts)
    .where(inArray(quizAttempts.lessonId, lessonIds))
    .orderBy(asc(quizAttempts.createdAt));
  return new Map(rows.map((r) => [r.lessonId, { chosen: r.chosenIndex, correct: r.correct }]));
}

export async function getLibrary() {
  const db = await getDb();
  // Saved videos from every category, not just the ones currently selected.
  const saved = (await getFeed(categories.map((c) => c.id))).filter((i) => i.saved);
  const learned = await db
    .select({ slug: concepts.slug, name: concepts.name, category: concepts.category, level: conceptMastery.level, nextReviewAt: conceptMastery.nextReviewAt })
    .from(conceptMastery)
    .innerJoin(concepts, eq(concepts.slug, conceptMastery.conceptSlug))
    .orderBy(desc(conceptMastery.level), asc(concepts.name));
  const watchedDays = await db
    .selectDistinct({ day: lessons.date })
    .from(views)
    .innerJoin(videos, eq(videos.id, views.videoId))
    .innerJoin(lessons, eq(lessons.id, videos.lessonId));
  return { saved, learned, watchedDays: watchedDays.length };
}
