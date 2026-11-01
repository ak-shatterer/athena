// Which Claude model each task uses. Haiku everywhere by default to keep cost
// minimal; Sonnet is only an opt-in fallback for lessons that fail validation.

export const MODELS = {
  cheap: 'claude-haiku-5-5',
  strong: 'claude-sonnet-5-5',
} as const;

export type LlmTask = 'rank' | 'plan' | 'write' | 'quiz' | 'ask' | 'recap';

export const modelFor: Record<LlmTask, string> = {
  rank: MODELS.cheap,
  plan: MODELS.cheap,
  write: MODELS.cheap,
  quiz: MODELS.cheap,
  ask: MODELS.cheap,
  recap: MODELS.cheap,
};

// Haiku 5.5 thinks adaptively by default; effort caps how much. Planning is a
// simple pick-from-list job, lesson writing needs a bit more care.
export const effortFor: Record<LlmTask, 'low' | 'medium' | 'high'> = {
  rank: 'low',
  plan: 'low',
  write: 'medium',
  quiz: 'low',
  ask: 'low',
  recap: 'medium',
};

export const llmPolicy = {
  // Escalate a lesson to MODELS.strong after this many failed validations.
  // Off by default; flip on only if Haiku lesson quality isn't good enough.
  escalateToStrong: false,
  maxRetries: 1,
  // Daily lesson writing goes through the Message Batches API (~50% cheaper).
  useBatchApi: true,
  // Cache the long, static system prompts (writer rules, schema, style guide).
  usePromptCaching: true,
  // Hard ceiling per pipeline run; overridable with DAILY_TOKEN_BUDGET.
  dailyTokenBudget: Number(process.env.DAILY_TOKEN_BUDGET ?? 400_000),
  // Story summaries sent to the planner are trimmed to this many characters.
  maxSummaryChars: 600,
};

// USD per million tokens (input, output) from Anthropic's price list; batches cost half.
// Only used to print cost estimates, so a stale value is harmless.
export const PRICE_PER_MTOK: Record<string, { input: number; output: number }> = {
  [MODELS.cheap]: { input: 0.1, output: 0.5 },
  [MODELS.strong]: { input: 2, output: 10 },
};
