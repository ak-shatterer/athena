import { categoryById, type Category } from '@athena/config/categories';
import { ideasFor } from '@athena/config/curriculum';
import { loadPrompt } from '@athena/config/prompts';
import { callJson, OfflinePendingError } from '@athena/llm';
import { PlanResult, type Level } from '@athena/shared';
import { and, concepts, createDb, desc, eq, isNotNull, lessons, ne, stories, userPrefs, type Db } from '@athena/db';
import { learnerContext } from '../learner';
import { withUsage } from '../usage';
import { today } from '../dates';

const CANDIDATES = 8;

export async function plan(args: Record<string, string>) {
  const db = await createDb();
  const date = args.date ?? today();
  const system = loadPrompt('planner');

  const prefs = await learnerPrefs(db, args.category);

  await withUsage(db, date, async () => {
    for (const categoryId of prefs.categories) {
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

      console.log(`\n${category.emoji} ${category.name}`);
      const bookSlug = await planBookLesson(db, category, date, prefs.level);
      await planNewsLessons(db, category, date, prefs.level, system, args, bookSlug);
    }
  });
}

// One idea a day from the category's reading list (no LLM call needed to pick it).
async function planBookLesson(db: Db, category: Category, date: string, level: Level) {
  const ideas = ideasFor(category.id);
  if (ideas.length === 0) return undefined;
  const taught = await db
    .selectDistinct({ slug: lessons.conceptSlug })
    .from(lessons)
    .where(and(eq(lessons.category, category.id), eq(lessons.kind, 'concept'), isNotNull(lessons.conceptSlug), ne(lessons.status, 'failed')));
  const done = new Set(taught.map((t) => t.slug));
  const idea = ideas.find((i) => !done.has(i.slug));
  if (!idea) {
    console.log(`  📚 reading list finished: add more books in config/curriculum.ts`);
    return undefined;
  }

  await db.insert(concepts).values({ slug: idea.slug, name: idea.name, category: category.id, prerequisites: [] }).onConflictDoNothing();
  await db.insert(lessons).values({ date, category: category.id, kind: 'concept', conceptSlug: idea.slug, level, why: idea.hint });
  console.log(`  📚 ${idea.name} ← ${idea.book.title} (${idea.book.author})`);
  return idea.slug;
}

async function planNewsLessons(
  db: Db,
  category: Category,
  date: string,
  level: Level,
  system: string,
  args: Record<string, string>,
  bookSlug?: string,
) {
  if (category.lessonsPerDay === 0) return;
  const candidates = await db
    .select()
    .from(stories)
    .where(and(eq(stories.date, date), eq(stories.category, category.id)))
    .orderBy(desc(stories.score))
    .limit(CANDIDATES);
  if (candidates.length === 0) {
    console.log(`  no stories (run rank first)`);
    return;
  }

  const learner = await learnerContext(db, category.id, date);
  if (bookSlug) learner.recentSlugs.add(bookSlug);
  const shortIds = new Map(candidates.map((s, i) => [`s${i + 1}`, s]));
  const user = [
    `Category: ${category.name}`,
    `Learner level: ${level}`,
    `Pick at most ${category.lessonsPerDay} stories.`,
    `\nConcepts the learner knows:\n${learner.knownText}`,
    `\nConcepts taught in the last 14 days (do not repeat):\n${learner.recentText}${bookSlug ? `\n- ${bookSlug}` : ''}`,
    `\nToday's stories:`,
    ...[...shortIds].map(([id, s]) => `[${id}] ${s.headline}\n    ${s.summary.slice(0, 300)}`),
  ].join('\n');

  if (args['dry-run']) {
    console.log(`\n--- plan prompt: ${category.name} (~${Math.round((system.length + user.length) / 4)} tokens) ---\n${user}`);
    return;
  }

  const result = await callJson({ id: `${date}-plan-${category.id}`, task: 'plan', system, user, schema: PlanResult, maxTokens: 4000 }).catch(
    (e: unknown) => {
      if (!(e instanceof OfflinePendingError)) throw e;
      console.log(`  ${e.message}`);
    },
  );
  if (!result) return;

  for (const pick of validPicks(result, shortIds, learner, category.lessonsPerDay)) {
    await db
      .insert(concepts)
      .values({ ...pick.concept, category: category.id })
      .onConflictDoNothing();
    await db.insert(lessons).values({
      date,
      category: category.id,
      storyId: pick.story.id,
      conceptSlug: pick.concept.slug,
      level,
      why: pick.why,
    });
    console.log(`  📰 ${pick.concept.name} ← ${pick.story.headline}\n     ${pick.why}`);
  }
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

async function learnerPrefs(db: Db, only?: string): Promise<{ categories: string[]; level: Level }> {
  // The web app edits this row; until then use the schema's defaults.
  await db.insert(userPrefs).values({}).onConflictDoNothing();
  const [prefs] = await db.select().from(userPrefs).limit(1);
  if (only) {
    if (!categoryById[only]) throw new Error(`Unknown category "${only}"`);
    return { categories: [only], level: prefs.level };
  }
  return { categories: prefs.categories.filter((c) => categoryById[c]), level: prefs.level };
}
