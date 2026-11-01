import { categoryById } from '@athena/config/categories';
import { loadPrompt } from '@athena/config/prompts';
import { callJson, OfflinePendingError } from '@athena/llm';
import { PlanResult } from '@athena/shared';
import { and, concepts, createDb, desc, eq, lessons, stories, userPrefs, type Db } from '@athena/db';
import { learnerContext } from '../learner';
import { withUsage } from '../usage';
import { today } from '../dates';

const CANDIDATES = 8;

export async function plan(args: Record<string, string>) {
  const db = await createDb();
  const date = args.date ?? today();
  const system = loadPrompt('planner');

  await withUsage(db, date, async () => {
    for (const categoryId of await selectedCategories(db, args.category)) {
      const category = categoryById[categoryId];
      const existing = await db
        .select({ id: lessons.id, status: lessons.status })
        .from(lessons)
        .where(and(eq(lessons.date, date), eq(lessons.category, categoryId)));
      if (existing.length > 0 && !args.force) {
        console.log(`${category.emoji} ${category.name}: already planned (${existing.length} lessons; --force to redo)`);
        continue;
      }
      if (args.force) await db.delete(lessons).where(and(eq(lessons.date, date), eq(lessons.category, categoryId), eq(lessons.status, 'planned')));

      const candidates = await db
        .select()
        .from(stories)
        .where(and(eq(stories.date, date), eq(stories.category, categoryId)))
        .orderBy(desc(stories.score))
        .limit(CANDIDATES);
      if (candidates.length === 0) {
        console.log(`${category.emoji} ${category.name}: no stories (run rank first)`);
        continue;
      }

      const learner = await learnerContext(db, categoryId, date);
      const shortIds = new Map(candidates.map((s, i) => [`s${i + 1}`, s]));
      const user = [
        `Category: ${category.name}`,
        `Pick at most ${category.lessonsPerDay} stories.`,
        `\nConcepts the learner knows:\n${learner.knownText}`,
        `\nConcepts taught in the last 14 days (do not repeat):\n${learner.recentText}`,
        `\nToday's stories:`,
        ...[...shortIds].map(([id, s]) => `[${id}] ${s.headline}\n    ${s.summary.slice(0, 300)}`),
      ].join('\n');

      if (args['dry-run']) {
        console.log(`\n--- plan prompt: ${category.name} (~${Math.round((system.length + user.length) / 4)} tokens) ---\n${user}`);
        continue;
      }

      const result = await callJson({ id: `${date}-plan-${categoryId}`, task: 'plan', system, user, schema: PlanResult, maxTokens: 4000 }).catch(
        (e: unknown) => {
          if (!(e instanceof OfflinePendingError)) throw e;
          console.log(`${category.emoji} ${category.name}: ${e.message}`);
        },
      );
      if (!result) continue;
      const picks = validPicks(result, shortIds, learner, category.lessonsPerDay);

      console.log(`\n${category.emoji} ${category.name}: ${picks.length} lessons planned`);
      for (const pick of picks) {
        await db
          .insert(concepts)
          .values({ ...pick.concept, category: categoryId })
          .onConflictDoNothing();
        await db.insert(lessons).values({
          date,
          category: categoryId,
          storyId: pick.story.id,
          conceptSlug: pick.concept.slug,
          level: pick.level,
          why: pick.why,
        });
        console.log(`  • ${pick.concept.name} ← ${pick.story.headline}\n    ${pick.why}`);
      }
    }
  });
}

function validPicks(
  result: PlanResult,
  shortIds: Map<string, typeof stories.$inferSelect>,
  learner: { knownSlugs: Set<string>; recentSlugs: Set<string> },
  max: number,
) {
  const seen = new Set<string>();
  return result.picks
    .flatMap((p) => {
      const story = shortIds.get(p.storyId);
      const slug = p.concept.slug;
      if (!story || seen.has(slug) || learner.knownSlugs.has(slug) || learner.recentSlugs.has(slug)) return [];
      seen.add(slug);
      return [{ ...p, story }];
    })
    .slice(0, max);
}

async function selectedCategories(db: Db, only?: string): Promise<string[]> {
  if (only) {
    if (!categoryById[only]) throw new Error(`Unknown category "${only}"`);
    return [only];
  }
  // The web app edits this row; until then use the schema's default selection.
  await db.insert(userPrefs).values({}).onConflictDoNothing();
  const [prefs] = await db.select().from(userPrefs).limit(1);
  return prefs.categories.filter((c) => categoryById[c]);
}
