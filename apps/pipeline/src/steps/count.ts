import { appendFileSync } from 'node:fs';
import { and, createDb, eq, lessons } from '@athena/db';
import type { LessonStatus } from '@athena/shared';
import { today } from '../dates';

/** Counts today's lessons in a status; with --output, also writes it as a GitHub Actions step output. */
export async function count(args: Record<string, string>) {
  const db = await createDb();
  const status = (args.status ?? 'scripted') as LessonStatus;
  const rows = await db
    .select({ id: lessons.id })
    .from(lessons)
    .where(and(eq(lessons.date, args.date ?? today()), eq(lessons.status, status)));
  console.log(`${rows.length} ${status} lessons`);
  if (args.output && process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${args.output}=${rows.length}\n`);
}
