import { pgTable, text, integer, real, boolean, timestamp, jsonb, date, uuid, uniqueIndex } from 'drizzle-orm/pg-core';
import type { Lesson, LessonStatus } from '@athena/shared';

export const articles = pgTable(
  'articles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    url: text('url').notNull(),
    category: text('category').notNull(),
    publisher: text('publisher').notNull(),
    title: text('title').notNull(),
    summary: text('summary'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).defaultNow().notNull(),
    storyId: uuid('story_id'),
  },
  (t) => [uniqueIndex('articles_url_idx').on(t.url)],
);

// A story is a cluster of articles about the same event.
export const stories = pgTable('stories', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: date('date').notNull(),
  category: text('category').notNull(),
  headline: text('headline').notNull(),
  summary: text('summary').notNull(),
  score: real('score').notNull(),
  articleCount: integer('article_count').notNull(),
});

export const concepts = pgTable('concepts', {
  slug: text('slug').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  prerequisites: text('prerequisites').array().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const lessons = pgTable('lessons', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: date('date').notNull(),
  category: text('category').notNull(),
  kind: text('kind').$type<'daily' | 'review' | 'recap'>().notNull().default('daily'),
  storyId: uuid('story_id').references(() => stories.id),
  conceptSlug: text('concept_slug').references(() => concepts.slug),
  status: text('status').$type<LessonStatus>().notNull().default('planned'),
  level: text('level').$type<'beginner' | 'intermediate'>().notNull().default('beginner'),
  why: text('why'), // planner's reason for this pick
  script: jsonb('script').$type<Lesson>(),
  // Narration per scene: path under out/media/ and spoken length.
  media: jsonb('media').$type<{ audio: string; durationSec: number }[]>(),
  model: text('model'),
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const videos = pgTable('videos', {
  id: uuid('id').primaryKey().defaultRandom(),
  lessonId: uuid('lesson_id').references(() => lessons.id).notNull(),
  storageKey: text('storage_key').notNull(), // path under out/ and in the bucket
  thumbKey: text('thumb_key'),
  url: text('url'), // set by publish; where viewers load the video from
  thumbUrl: text('thumb_url'),
  durationSec: real('duration_sec').notNull(),
  bytes: integer('bytes'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Single-user app: one row of preferences.
export const userPrefs = pgTable('user_prefs', {
  id: integer('id').primaryKey().default(1),
  categories: text('categories').array().notNull().default(['ai', 'stocks', 'football', 'politics']),
  level: text('level').$type<'beginner' | 'intermediate'>().notNull().default('beginner'),
});

export const views = pgTable('views', {
  videoId: uuid('video_id').primaryKey().references(() => videos.id),
  watchedPct: real('watched_pct').notNull().default(0),
  liked: boolean('liked').notNull().default(false),
  saved: boolean('saved').notNull().default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const quizAttempts = pgTable('quiz_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  lessonId: uuid('lesson_id').references(() => lessons.id).notNull(),
  chosenIndex: integer('chosen_index').notNull(),
  correct: boolean('correct').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 0 = new, 1 = seen, 2 = quiz correct, 3 = reviewed.
export const conceptMastery = pgTable('concept_mastery', {
  conceptSlug: text('concept_slug').primaryKey().references(() => concepts.slug),
  level: integer('level').notNull().default(0),
  reviews: integer('reviews').notNull().default(0),
  nextReviewAt: timestamp('next_review_at', { withTimezone: true }),
});

export const llmUsage = pgTable('llm_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: date('date').notNull(),
  task: text('task').notNull(),
  model: text('model').notNull(),
  inputTokens: integer('input_tokens').notNull(),
  outputTokens: integer('output_tokens').notNull(),
  cachedTokens: integer('cached_tokens').notNull().default(0),
});
