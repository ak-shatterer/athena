import { categories, categoryById, type Category } from '@athena/config/categories';
import { articles, createDb } from '@athena/db';
import { fetchSource, type RawArticle } from '../sources';

const MAX_AGE_HOURS = 48;

export async function ingest(args: Record<string, string>) {
  const db = await createDb();
  const cutoff = Date.now() - MAX_AGE_HOURS * 3600_000;

  for (const category of selectCategories(args.category)) {
    const results = await Promise.allSettled(category.sources.map(fetchSource));
    const fresh: RawArticle[] = [];
    results.forEach((r, i) => {
      const source = category.sources[i];
      if (r.status === 'rejected') {
        console.warn(`  ✗ ${category.id} · ${source.publisher}: ${(r.reason as Error).message}`);
        return;
      }
      const recent = r.value.filter((a) => !a.publishedAt || a.publishedAt.getTime() >= cutoff);
      console.log(`  ✓ ${category.id} · ${source.publisher}: ${recent.length}/${r.value.length} recent`);
      fresh.push(...recent);
    });

    const unique = [...new Map(fresh.map((a) => [a.url, a])).values()];
    if (unique.length === 0) continue;
    const inserted = await db
      .insert(articles)
      .values(unique.map((a) => ({ ...a, category: category.id, summary: a.summary ?? null })))
      .onConflictDoNothing()
      .returning({ id: articles.id });
    console.log(`${category.emoji} ${category.name}: ${inserted.length} new articles`);
  }
}

export function selectCategories(id?: string): Category[] {
  if (!id) return categories;
  const category = categoryById[id];
  if (!category) throw new Error(`Unknown category "${id}". Options: ${categories.map((c) => c.id).join(', ')}`);
  return [category];
}
