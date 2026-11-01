// Claude wrapper used by the pipeline and the Ask Athena route.
// Every call returns zod-validated JSON via structured outputs. Static system
// prompts are marked for caching, daily lesson writing can go through the
// Message Batches API (50% cheaper), and a token budget stops runaway spend.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { MODELS, effortFor, llmPolicy, modelFor, type LlmTask } from '@athena/config/models';

export interface JsonCall<S extends z.ZodType> {
  id: string; // stable key; batch results come back in any order
  task: LlmTask;
  system: string; // static instructions: cached, keep byte-identical across calls
  user: string; // per-call content
  schema: S;
  maxTokens?: number;
}

export interface UsageRecord {
  task: LlmTask;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  batch: boolean;
}

export class BudgetExceededError extends Error {}

// Offline mode (LLM_MODE=offline): no API calls. Each request is written to
// out/llm/<id>.request.md; whoever answers it (a person, or Claude in another
// tool) saves the JSON as out/llm/<id>.json, and the next run picks it up and
// validates it exactly like a live response. Lets the whole pipeline run free.
export class OfflinePendingError extends Error {}
export const isOffline = () => process.env.LLM_MODE === 'offline';
const OFFLINE_DIR = new URL('../../../out/llm/', import.meta.url);

function offlineJson<S extends z.ZodType>(call: JsonCall<S>): z.infer<S> {
  mkdirSync(OFFLINE_DIR, { recursive: true });
  const response = new URL(`${call.id}.json`, OFFLINE_DIR);
  if (!existsSync(response)) {
    const schema = JSON.stringify(outputFormat(call.schema).schema, null, 2);
    writeFileSync(
      new URL(`${call.id}.request.md`, OFFLINE_DIR),
      `# System\n\n${call.system}\n\n# User\n\n${call.user}\n\n# Output\n\nReply with JSON only, saved as ${call.id}.json, matching:\n\n\`\`\`json\n${schema}\n\`\`\`\n`,
    );
    throw new OfflinePendingError(`waiting for out/llm/${call.id}.json`);
  }
  const parsed = call.schema.safeParse(JSON.parse(readFileSync(response, 'utf8')));
  if (!parsed.success) throw new Error(`out/llm/${call.id}.json: ${parsed.error.message}`);
  return parsed.data;
}

const MAX_TOKENS = 16_000;
const BATCH_POLL_MS = 30_000;

let client: Anthropic | undefined;
const getClient = () => (client ??= new Anthropic());

// Tokens spent today. The pipeline seeds `spent` from the llm_usage table and
// drains `pending` into it after each step.
export const usage = {
  spent: 0,
  budget: llmPolicy.dailyTokenBudget,
  pending: [] as UsageRecord[],
};

function record(task: LlmTask, model: string, u: Anthropic.Usage, batch: boolean) {
  const cachedTokens = u.cache_read_input_tokens ?? 0;
  const inputTokens = u.input_tokens + (u.cache_creation_input_tokens ?? 0) + cachedTokens;
  usage.spent += inputTokens + u.output_tokens;
  usage.pending.push({ task, model, inputTokens, outputTokens: u.output_tokens, cachedTokens, batch });
}

function assertBudget() {
  if (usage.spent >= usage.budget) {
    throw new BudgetExceededError(`Daily token budget reached (${usage.spent}/${usage.budget}).`);
  }
}

function params<S extends z.ZodType>(call: JsonCall<S>, model: string) {
  return {
    model,
    max_tokens: call.maxTokens ?? MAX_TOKENS,
    system: [
      {
        type: 'text' as const,
        text: call.system,
        ...(llmPolicy.usePromptCaching ? { cache_control: { type: 'ephemeral' as const } } : {}),
      },
    ],
    messages: [{ role: 'user' as const, content: call.user }],
    output_config: { effort: effortFor[call.task], format: outputFormat(call.schema) },
  };
}

// The SDK's converter only keeps a subset of JSON Schema and moves the rest
// into descriptions, dropping `enum` and `const` although structured outputs
// support both. Walk the original schema alongside and restore them, so
// visual types and levels are enforced by the API, not just checked after.
export function outputFormat<S extends z.ZodType>(schema: S) {
  const format = zodOutputFormat(schema);
  restoreConstraints(z.toJSONSchema(schema, { reused: 'ref' }), format.schema);
  return format;
}

type Json = Record<string, unknown>;
function restoreConstraints(original: unknown, strict: unknown) {
  if (!original || !strict || typeof original !== 'object' || typeof strict !== 'object') return;
  const [o, s] = [original as Json, strict as Json];
  if ('enum' in o) s.enum = o.enum;
  if ('const' in o) s.const = o.const;
  for (const key of ['properties', '$defs'] as const) {
    const [oChildren, sChildren] = [o[key] as Json | undefined, s[key] as Json | undefined];
    if (oChildren && sChildren) for (const name of Object.keys(sChildren)) restoreConstraints(oChildren[name], sChildren[name]);
  }
  restoreConstraints(o.items, s.items);
  const [oUnion, sUnion] = [(o.anyOf ?? o.oneOf) as unknown[] | undefined, s.anyOf as unknown[] | undefined];
  oUnion?.forEach((variant, i) => restoreConstraints(variant, sUnion?.[i]));
}

/** One synchronous call, retried on invalid output, optionally escalated to the strong model. */
export async function callJson<S extends z.ZodType>(call: JsonCall<S>): Promise<z.infer<S>> {
  if (isOffline()) return offlineJson(call);
  const models = [modelFor[call.task]];
  if (llmPolicy.escalateToStrong && models[0] !== MODELS.strong) models.push(MODELS.strong);

  let lastError: unknown;
  for (const model of models) {
    for (let attempt = 0; attempt <= llmPolicy.maxRetries; attempt++) {
      assertBudget();
      try {
        const response = await getClient().messages.parse(params(call, model));
        record(call.task, model, response.usage, false);
        if (response.stop_reason === 'refusal') throw new Error(`Refused (${response.stop_details?.category ?? 'unknown'})`);
        if (response.stop_reason === 'max_tokens') throw new Error('Output truncated at max_tokens');
        if (!response.parsed_output) throw new Error('No parsed output');
        return response.parsed_output as z.infer<S>;
      } catch (error) {
        // Bad output is worth a retry; API errors (auth, rate limits after SDK retries) are not.
        if (error instanceof Anthropic.APIError) throw error;
        lastError = error;
      }
    }
  }
  throw lastError;
}

/**
 * Many calls through the Message Batches API at half price. Results are keyed by
 * call id; failed items come back as Errors so the caller can retry them with callJson.
 */
export async function batchJson<S extends z.ZodType>(
  calls: JsonCall<S>[],
  onProgress?: (msg: string) => void,
): Promise<Map<string, z.infer<S> | Error>> {
  const out = new Map<string, z.infer<S> | Error>();
  if (calls.length === 0) return out;
  if (isOffline()) {
    for (const c of calls) out.set(c.id, await callJson(c).catch((e: Error) => e));
    return out;
  }
  assertBudget();

  const byId = new Map(calls.map((c) => [c.id, c]));
  const batch = await getClient().messages.batches.create({
    requests: calls.map((c) => {
      const p = params(c, modelFor[c.task]);
      // Batches don't auto-parse: send the plain JSON schema and validate the text ourselves.
      const { type, schema } = p.output_config.format;
      return { custom_id: c.id, params: { ...p, output_config: { ...p.output_config, format: { type, schema } } } };
    }),
  });
  onProgress?.(`batch ${batch.id} submitted (${calls.length} requests)`);

  let status = batch;
  while (status.processing_status !== 'ended') {
    await new Promise((r) => setTimeout(r, BATCH_POLL_MS));
    status = await getClient().messages.batches.retrieve(batch.id);
    const c = status.request_counts;
    onProgress?.(`batch ${batch.id}: ${c.succeeded} done, ${c.processing} processing, ${c.errored} errored`);
  }

  for await (const item of await getClient().messages.batches.results(batch.id)) {
    const call = byId.get(item.custom_id)!;
    const result = item.result;
    if (result.type !== 'succeeded') {
      out.set(item.custom_id, new Error(`Batch item ${result.type}`));
      continue;
    }
    const message = result.message;
    record(call.task, message.model, message.usage, true);
    const text = message.content.find((b) => b.type === 'text')?.text;
    if (message.stop_reason !== 'end_turn' || !text) {
      out.set(item.custom_id, new Error(`Batch item stopped: ${message.stop_reason}`));
      continue;
    }
    try {
      const parsed = call.schema.safeParse(JSON.parse(text));
      out.set(item.custom_id, parsed.success ? parsed.data : new Error(parsed.error.message));
    } catch (error) {
      out.set(item.custom_id, error as Error);
    }
  }
  return out;
}
