// The Lesson script is the contract between the LLM writer, the TTS step and
// the Remotion renderer. Everything the video shows comes from this JSON.
import { z } from 'zod';

// How much the viewer already knows. "intermediate" is the default: an
// informed adult who doesn't need everyday terms defined.
export const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export type Level = (typeof LEVELS)[number];

const Icon = z.string().describe('Lucide icon name, e.g. "landmark"');

export const Visual = z.discriminatedUnion('type', [
  z.object({ type: z.literal('title'), heading: z.string(), sub: z.string().optional() }),
  z.object({ type: z.literal('kinetic'), lines: z.array(z.string()).min(1).max(4) }),
  z.object({
    type: z.literal('analogy'),
    left: z.object({ icon: Icon, label: z.string() }),
    right: z.object({ icon: Icon, label: z.string() }),
    relation: z.string(),
  }),
  z.object({
    type: z.literal('flow'),
    nodes: z.array(z.object({ id: z.string(), label: z.string(), icon: Icon.optional() })).min(2).max(6),
    edges: z.array(z.object({ from: z.string(), to: z.string(), label: z.string().optional() })),
  }),
  z.object({
    type: z.literal('chart'),
    series: z.string().regex(/^(yahoo|fred):[A-Za-z0-9._^=-]+$/),
    range: z.enum(['1m', '6m', '1y', '5y', '20y']),
    annotate: z.string().optional(),
  }),
  z.object({ type: z.literal('map'), countries: z.array(z.string().length(3)).min(1), caption: z.string() }),
  z.object({ type: z.literal('table'), kind: z.enum(['league', 'scoreline']), ref: z.string() }),
  z.object({
    type: z.literal('timeline'),
    events: z.array(z.object({ date: z.string(), label: z.string() })).min(2).max(6),
  }),
  z.object({ type: z.literal('headline'), publisher: z.string(), text: z.string() }),
  z.object({ type: z.literal('quiz') }),
]);
export type Visual = z.infer<typeof Visual>;

export const Scene = z.object({
  id: z.string(),
  narration: z.string().min(10),
  onScreenText: z.string().max(60).optional(),
  visual: Visual,
});
export type Scene = z.infer<typeof Scene>;

export const Concept = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  prerequisites: z.array(z.string()),
});
export type Concept = z.infer<typeof Concept>;

export const Lesson = z.object({
  id: z.string(),
  date: z.string(),
  category: z.string(),
  title: z.string(),
  level: z.enum(LEVELS),
  kind: z.enum(['daily', 'concept', 'review', 'recap']).default('daily'),
  concept: Concept,
  story: z.object({
    headline: z.string(),
    summary: z.string(),
    sources: z.array(z.object({ title: z.string(), url: z.string().url(), publisher: z.string() })).min(1),
  }),
  scenes: z.array(Scene).min(6).max(14),
  quiz: z.object({
    question: z.string(),
    options: z.array(z.string()).length(4),
    answerIndex: z.number().int().min(0).max(3),
    explanation: z.string(),
  }),
  takeaway: z.string(),
});
export type Lesson = z.infer<typeof Lesson>;

// What Claude writes. Everything factual about provenance (id, date, category,
// concept, source links) is filled in from the database, never generated.
export const LessonDraft = z.object({
  title: z.string(),
  level: Lesson.shape.level,
  story: z.object({ headline: z.string(), summary: z.string() }),
  scenes: Lesson.shape.scenes,
  quiz: Lesson.shape.quiz,
  takeaway: z.string(),
});
export type LessonDraft = z.infer<typeof LessonDraft>;

export const PlanResult = z.object({
  picks: z.array(
    z.object({
      storyId: z.string().describe('The id shown next to the story, e.g. "s3"'),
      concept: Concept,
      why: z.string(),
    }),
  ),
});
export type PlanResult = z.infer<typeof PlanResult>;
