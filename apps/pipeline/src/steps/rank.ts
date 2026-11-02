import { and, articles, createDb, eq, gte, inArray, isNotNull, lessons, sql, stories, type Db } from '@athena/db';
import type { Category } from '@athena/config/categories';
import { clusterAndScore } from '../rank/cluster';
import { isNoise } from '../sources';
import { selectCategories } from './ingest';
import { today } from '../dates';

const WINDOW_HOURS = 36;
const STORIES_PER_CATEGORY = 10;
const SHOW_TOP = 5;

export async function rank(args: Record<string, string>) {
  const db = await createDb();
  const date = args.date ?? today();
  const since = new Date(Date.now() - WINDOW_HOURS * 3600_000);

  for (const category of selectCategories(args.category)) {
    if (category.sources.length === 0) continue; // book-only category
    await clearUnusedStories(db, date, category.id);

    const rows = (
      await db
        .select()
        .from(articles)
        .where(
          and(eq(articles.category, category.id), gte(sql`coalesce(${articles.publishedAt}, ${articles.fetchedAt})`, since.toISOString())),
        )
    ).filter((a) => !isNoise(a.title));
    if (rows.length === 0) {
      console.log(`${category.emoji} ${category.name}: no recent articles (run ingest first)`);
      continue;
    }

    const clusters = clusterAndScore(
      rows.map((a) => ({
        id: a.id,
        title: a.title,
        summary: a.summary,
        publisher: a.publisher,
        publishedAt: a.publishedAt ?? a.fetchedAt,
        weight: weightOf(category, a.publisher),
      })),
    ).slice(0, STORIES_PER_CATEGORY);

    console.log(`\n${category.emoji} ${category.name}: ${rows.length} articles → ${clusters.length} stories`);
    for (const [i, c] of clusters.entries()) {
      const [story] = await db
        .insert(stories)
        .values({
          date,
          category: category.id,
          headline: c.lead.title,
          summary: c.lead.summary ?? c.lead.title,
          score: c.score,
          articleCount: c.articles.length,
        })
        .returning({ id: stories.id });
      await db.update(articles).set({ storyId: story.id }).where(inArray(articles.id, c.articles.map((a) => a.id)));

      if (i < SHOW_TOP) {
        const publishers = [...new Set(c.articles.map((a) => a.publisher))].join(', ');
        console.log(`  ${i + 1}. [${c.score.toFixed(2)}] ${c.lead.title}  (${c.articles.length} · ${publishers})`);
      }
    }
  }
}

// Re-running rank replaces the day's stories, except ones a lesson already uses.
async function clearUnusedStories(db: Db, date: string, category: string) {
  const existing = await db
    .select({ id: stories.id })
    .from(stories)
    .where(and(eq(stories.date, date), eq(stories.category, category)));
  if (existing.length === 0) return;

  const used = await db
    .select({ id: lessons.storyId })
    .from(lessons)
    .where(and(isNotNull(lessons.storyId), inArray(lessons.storyId, existing.map((s) => s.id))));
  const usedIds = new Set(used.map((u) => u.id));
  const unused = existing.map((s) => s.id).filter((id) => !usedIds.has(id));
  if (unused.length === 0) return;

  await db.update(articles).set({ storyId: null }).where(inArray(articles.storyId, unused));
  await db.delete(stories).where(inArray(stories.id, unused));
}

function weightOf(category: Category, publisher: string): number {
  return category.sources.find((s) => s.publisher === publisher)?.weight ?? 0.5;
}
