import { PRICE_PER_MTOK } from '@athena/config/models';
import { usage } from '@athena/llm';
import { eq, llmUsage, sql, type Db } from '@athena/db';

/** Seeds today's spend from the DB, runs fn, then saves new usage and prints a summary. */
export async function withUsage(db: Db, date: string, fn: () => Promise<void>) {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${llmUsage.inputTokens} + ${llmUsage.outputTokens}), 0)` })
    .from(llmUsage)
    .where(eq(llmUsage.date, date));
  usage.spent = Number(row.total);

  try {
    await fn();
  } finally {
    const records = usage.pending.splice(0);
    if (records.length > 0) {
      await db.insert(llmUsage).values(records.map(({ batch: _, ...r }) => ({ ...r, date })));
      const cost = records.reduce((sum, r) => {
        const price = PRICE_PER_MTOK[r.model] ?? PRICE_PER_MTOK['claude-haiku-5-5'];
        const usd = (r.inputTokens * price.input + r.outputTokens * price.output) / 1e6;
        return sum + (r.batch ? usd / 2 : usd);
      }, 0);
      const tokens = records.reduce((s, r) => s + r.inputTokens + r.outputTokens, 0);
      console.log(
        `\n💸 ${records.length} calls, ${tokens.toLocaleString()} tokens, ≈ $${cost.toFixed(4)} ` +
          `(today: ${usage.spent.toLocaleString()} / ${usage.budget.toLocaleString()} tokens)`,
      );
    }
  }
}
