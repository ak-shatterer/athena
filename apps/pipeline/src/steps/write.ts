import { mkdirSync, writeFileSync } from 'node:fs';
import { categoryById } from '@athena/config/categories';
import { ideaBySlug, type Idea } from '@athena/config/curriculum';
import { llmPolicy } from '@athena/config/models';
import { loadPrompt } from '@athena/config/prompts';
import { batchJson, callJson, OfflinePendingError, type JsonCall } from '@athena/llm';
import { Lesson, LessonDraft } from '@athena/shared';
import { and, articles, concepts, createDb, desc, eq, lessons, stories, type Db } from '@athena/db';
import { learnerContext } from '../learner';
import { withUsage } from '../usage';
import { today } from '../dates';

const MAX_SOURCES = 4;
const OUT_DIR = new URL('../../../../out/lessons/', import.meta.url);

type Row = Awaited<ReturnType<typeof plannedLessons>>[number];

export async function write(args: Record<string, string>) {
  const db = await createDb();
  const date = args.date ?? today();
  const system = loadPrompt('lesson-writer');
  const rows = await plannedLessons(db, date, args.category);
  if (rows.length === 0) {
    console.log('No planned lessons to write (run plan first).');
    return;
  }

  const calls: JsonCall<typeof LessonDraft>[] = [];
  const sourcesById = new Map<string, { title: string; url: string; publisher: string }[]>();
  for (const row of rows) {
    const idea = row.lesson.kind === 'concept' ? ideaBySlug(row.lesson.category, row.concept.slug) : undefined;
    if (idea || !row.story) {
      if (!idea) {
        await db.update(lessons).set({ status: 'failed', error: 'idea not found in curriculum' }).where(eq(lessons.id, row.lesson.id));
        continue;
      }
      sourcesById.set(row.lesson.id, [bookSource(idea)]);
      calls.push({ id: row.lesson.id, task: 'write', system, user: await bookPrompt(db, row, idea, date), schema: LessonDraft });
      continue;
    }
    const story = row.story;
    const sources = await db
      .select({ title: articles.title, url: articles.url, publisher: articles.publisher, summary: articles.summary })
      .from(articles)
      .where(eq(articles.storyId, story.id))
      .orderBy(desc(articles.publishedAt))
      .limit(MAX_SOURCES);
    sourcesById.set(row.lesson.id, sources.map(({ summary: _, ...s }) => s));
    calls.push({
      id: row.lesson.id,
      task: 'write',
      system,
      user: await newsPrompt(db, row, story, sources, date),
      schema: LessonDraft,
    });
  }

  if (calls.length === 0) return;
  if (args['dry-run']) {
    const tokens = calls.reduce((s, c) => s + (c.system.length + c.user.length) / 4, 0);
    console.log(`${calls.length} lessons, ~${Math.round(tokens).toLocaleString()} input tokens.\n\n--- first prompt ---\n${calls[0].user}`);
    return;
  }

  await withUsage(db, date, async () => {
    const useBatch = llmPolicy.useBatchApi && !args.sync && calls.length > 1;
    const results = useBatch
      ? await batchJson(calls, (m) => console.log(`  ${m}`))
      : new Map(await Promise.all(calls.map(async (c) => [c.id, await callJson(c).catch((e: Error) => e)] as const)));

    for (const row of rows) {
      let draft = results.get(row.lesson.id);
      if (draft instanceof OfflinePendingError) {
        console.log(`  … ${row.concept.name}: ${draft.message}`);
        continue;
      }
      if (draft instanceof Error && useBatch) {
        console.warn(`  ↻ retrying ${row.concept.slug}: ${draft.message}`);
        draft = await callJson(calls.find((c) => c.id === row.lesson.id)!).catch((e: Error) => e);
      }
      await save(db, row, draft, sourcesById.get(row.lesson.id)!, date);
    }
  });
}

async function plannedLessons(db: Db, date: string, category?: string) {
  return db
    .select({ lesson: lessons, story: stories, concept: concepts })
    .from(lessons)
    .leftJoin(stories, eq(stories.id, lessons.storyId))
    .innerJoin(concepts, eq(concepts.slug, lessons.conceptSlug))
    .where(
      and(eq(lessons.date, date), eq(lessons.status, 'planned'), category ? eq(lessons.category, category) : undefined),
    );
}

async function newsPrompt(
  db: Db,
  { lesson, concept }: Row,
  story: typeof stories.$inferSelect,
  sources: { title: string; publisher: string; summary: string | null }[],
  date: string,
) {
  const category = categoryById[lesson.category];
  const learner = await learnerContext(db, lesson.category, date);
  return [
    `Lesson type: NEWS`,
    `Category: ${category.name}. Visuals that work well here: ${category.preferredVisuals.join(', ')}.`,
    `Today is ${date}.`,
    `\nTeach this concept: ${concept.name} (slug: ${concept.slug})`,
    `Prerequisites: ${concept.prerequisites.join(', ') || 'none'}`,
    `Level: ${lesson.level}`,
    lesson.why ? `Why this story teaches it: ${lesson.why}` : '',
    `\nThe learner already knows:\n${learner.knownText}`,
    `\nToday's story: ${story.headline}`,
    `\nSources (the only facts you may state about the news):`,
    ...sources.map((s, i) => `[${i + 1}] ${s.publisher}: ${s.title}\n    ${s.summary ?? ''}`),
  ]
    .filter(Boolean)
    .join('\n');
}

async function bookPrompt(db: Db, { lesson, concept }: Row, idea: Idea, date: string) {
  const category = categoryById[lesson.category];
  const learner = await learnerContext(db, lesson.category, date);
  return [
    `Lesson type: BOOK`,
    `Category: ${category.name}. Visuals that work well here: ${category.preferredVisuals.join(', ')}.`,
    `Today is ${date}.`,
    `\nTeach this idea: ${concept.name} (slug: ${concept.slug})`,
    `What it's about: ${idea.hint}`,
    `From: "${idea.book.title}" by ${idea.book.author}`,
    `Level: ${lesson.level}`,
    `\nThe learner already knows:\n${learner.knownText}`,
  ].join('\n');
}

// Books link to an Open Library search, so the source is real without guessing a URL.
function bookSource(idea: Idea) {
  const q = encodeURIComponent(`${idea.book.title} ${idea.book.author}`);
  return { title: idea.book.title, url: `https://openlibrary.org/search?q=${q}`, publisher: idea.book.author };
}

async function save(db: Db, { lesson, concept }: Row, draft: LessonDraft | Error | undefined, sources: Lesson['story']['sources'], date: string) {
  const parsed =
    draft && !(draft instanceof Error)
      ? Lesson.safeParse({
          ...draft,
          id: lesson.id,
          date,
          category: lesson.category,
          kind: lesson.kind,
          concept: { slug: concept.slug, name: concept.name, prerequisites: concept.prerequisites },
          story:
            lesson.kind === 'concept'
              ? { headline: `${sources[0].title} — ${sources[0].publisher}`, summary: lesson.why ?? concept.name, sources }
              : { ...draft.story, sources },
        })
      : undefined;

  if (!parsed?.success) {
    const error = draft instanceof Error ? draft.message : (parsed?.error.message ?? 'no result');
    await db.update(lessons).set({ status: 'failed', error }).where(eq(lessons.id, lesson.id));
    console.warn(`  ✗ ${concept.name}: ${error.slice(0, 200)}`);
    return;
  }

  const script = parsed.data;
  await db.update(lessons).set({ status: 'scripted', script, error: null }).where(eq(lessons.id, lesson.id));
  const dir = new URL(`${date}/`, OUT_DIR);
  mkdirSync(dir, { recursive: true });
  writeFileSync(new URL(`${lesson.category}-${concept.slug}.json`, dir), JSON.stringify(script, null, 2));
  const words = script.scenes.reduce((n, s) => n + s.narration.split(/\s+/).length, 0);
  console.log(`  ✓ ${script.title}  (${script.scenes.length} scenes, ${words} words)`);
}
