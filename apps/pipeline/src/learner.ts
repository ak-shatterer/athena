import { and, conceptMastery, concepts, desc, eq, gte, lessons, type Db } from '@athena/db';

const RECENT_DAYS = 14;

/** What the learner already knows in a category, formatted for prompts. */
export async function learnerContext(db: Db, category: string, date: string) {
  const known = await db
    .select({ slug: concepts.slug, name: concepts.name, level: conceptMastery.level })
    .from(conceptMastery)
    .innerJoin(concepts, eq(concepts.slug, conceptMastery.conceptSlug))
    .where(and(eq(concepts.category, category), gte(conceptMastery.level, 1)));

  const since = new Date(new Date(date).getTime() - RECENT_DAYS * 86400_000).toISOString().slice(0, 10);
  const recent = await db
    .selectDistinct({ slug: lessons.conceptSlug })
    .from(lessons)
    .where(and(eq(lessons.category, category), gte(lessons.date, since)))
    .orderBy(desc(lessons.conceptSlug));

  return {
    knownSlugs: new Set(known.filter((k) => k.level >= 2).map((k) => k.slug)),
    recentSlugs: new Set(recent.map((r) => r.slug).filter((s): s is string => !!s)),
    knownText: known.length
      ? known.map((k) => `- ${k.slug} (${k.name}), mastery ${k.level}`).join('\n')
      : '(nothing tracked yet — go by the learner level)',
    recentText: recent.length ? recent.map((r) => `- ${r.slug}`).join('\n') : '(none)',
  };
}
