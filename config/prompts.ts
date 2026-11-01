import { readFileSync } from 'node:fs';

export type PromptName = 'planner' | 'lesson-writer' | 'ask-athena' | 'recap';

export function loadPrompt(name: PromptName): string {
  return readFileSync(new URL(`./prompts/${name}.md`, import.meta.url), 'utf8').trim();
}
