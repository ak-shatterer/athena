// `pnpm pipeline doctor`: checks configuration and connectivity before a deploy.
// Read-only apart from a tiny test file it uploads to and deletes from storage.
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { categories } from '@athena/config/categories';
import { createDb, sql } from '@athena/db';
import { isOffline } from '@athena/llm';
import { createStorage } from '@athena/storage';
import { fetchSource } from '../sources';

type Result = 'ok' | 'warn' | 'fail';
const icon: Record<Result, string> = { ok: '✅', warn: '⚠️ ', fail: '❌' };
let failed = false;

function report(result: Result, name: string, detail: string) {
  if (result === 'fail') failed = true;
  console.log(`${icon[result]} ${name}: ${detail}`);
}

export async function doctor() {
  const env = process.env;

  try {
    const db = await createDb();
    await db.execute(sql`select 1`);
    report('ok', 'Database', env.DATABASE_URL ? `connected to ${new URL(env.DATABASE_URL).hostname}` : 'local PGlite (.data/) — fine locally, set DATABASE_URL to deploy');
  } catch (e) {
    report('fail', 'Database', (e as Error).message);
  }

  if (isOffline()) report('warn', 'Claude', 'LLM_MODE=offline — lessons need hand-written responses in out/llm/');
  else if (env.ANTHROPIC_API_KEY) report('ok', 'Claude', 'API key set (not called, so no cost)');
  else report('warn', 'Claude', 'no ANTHROPIC_API_KEY — plan/write will fail; use LLM_MODE=offline to test free');

  try {
    const storage = createStorage();
    const file = join(tmpdir(), 'athena-doctor.txt');
    writeFileSync(file, 'athena storage check');
    const url = await storage.put('doctor/check.txt', file, 'text/plain');
    if (storage.driver !== 'local') {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`uploaded, but ${url} returned HTTP ${res.status} — is the bucket public?`);
      await storage.remove(['doctor/check.txt']);
    }
    report(storage.driver === 'local' ? 'warn' : 'ok', 'Storage', storage.driver === 'local' ? 'local (out/) — set STORAGE_DRIVER to deploy' : `${storage.driver}: upload, public read and delete work`);
  } catch (e) {
    report('fail', 'Storage', (e as Error).message);
  }

  const sources = categories.flatMap((c) => c.sources);
  const results = await Promise.allSettled(sources.map(fetchSource));
  const broken = results.flatMap((r, i) => (r.status === 'rejected' ? [`${sources[i].publisher} (${(r.reason as Error).message})`] : []));
  report(broken.length ? 'warn' : 'ok', 'News feeds', `${sources.length - broken.length}/${sources.length} reachable${broken.length ? ` — failing: ${broken.join(', ')}` : ''}`);

  report(env.ATHENA_PASSCODE ? 'ok' : 'warn', 'Web login', env.ATHENA_PASSCODE ? 'passcode set (also set it in Vercel)' : 'no ATHENA_PASSCODE — the deployed app would be open to anyone');

  if (failed) process.exitCode = 1;
}
