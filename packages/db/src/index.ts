import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { drizzle as drizzlePostgres, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { migrate as migratePostgres } from 'drizzle-orm/postgres-js/migrator';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import { PGlite } from '@electric-sql/pglite';
import postgres from 'postgres';
import * as schema from './schema';

export * from './schema';
// Re-exported so apps share this package's single drizzle-orm instance.
export { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lt, lte, ne, or, sql } from 'drizzle-orm';

// Both drivers expose the same query builder; we type everything as the Postgres one.
export type Db = PostgresJsDatabase<typeof schema>;

// Located from the working directory, not import.meta.url, because bundlers
// (Next.js) move this file. Every app runs from somewhere inside the repo.
export function repoRoot(from = process.cwd()): string {
  for (let dir = from; ; dir = dirname(dir)) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir;
    if (dirname(dir) === dir) throw new Error(`Not inside the athena repo: ${from}`);
  }
}
const migrationsFolder = () => join(repoRoot(), 'packages/db/migrations');
const localDir = () => join(repoRoot(), '.data/pglite');

// With DATABASE_URL (Supabase) we use real Postgres. Without it we fall back to
// PGlite, an embedded Postgres stored in .data/, so local dev needs no account.
// Pending migrations are applied on connect either way.
const closers: (() => Promise<void>)[] = [];

/** Closes every connection opened by createDb, so the process can exit on its own. */
export async function closeDbs() {
  await Promise.all(closers.splice(0).map((close) => close()));
}

// `migrate: false` is for hosts without the repo on disk (the web app on
// Vercel); the daily pipeline applies migrations to the shared database.
export async function createDb(url = process.env.DATABASE_URL, { migrate = true } = {}): Promise<Db> {
  if (url) {
    // prepare: false is required for Supabase's transaction pooler.
    const client = postgres(url, { prepare: false, onnotice: () => {} });
    closers.push(() => client.end());
    const db = drizzlePostgres(client, { schema });
    if (migrate) await migratePostgres(db, { migrationsFolder: migrationsFolder() });
    return db;
  }
  mkdirSync(localDir(), { recursive: true });
  const client = new PGlite(localDir());
  closers.push(() => client.close());
  const db = drizzlePglite(client, { schema });
  await migratePglite(db, { migrationsFolder: migrationsFolder() });
  return db as unknown as Db;
}
